// server/controllers/webhookController.js
import Stripe from 'stripe';
import { pool } from '../db.js';
import {
  mapCartToPrintfulVariants,
  createPrintfulOrder
} from '../services/printfulService.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2022-11-15'
});

function centsToFloat(cents) {
  if (typeof cents !== 'number') return 0;
  return Math.round(cents) / 100;
}

async function ensureStripeEventsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stripe_events (
      id VARCHAR(255) PRIMARY KEY,
      received_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function handleStripeWebhook(req, res) {
  const traceId = `wh_${Date.now()}`;

  // 1) Sanity checks
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error(
      `❌ [${traceId}] STRIPE_SECRET_KEY ou STRIPE_WEBHOOK_SECRET manquant`
    );
    return res.status(500).send('Configuration Stripe incomplète');
  }

  // 2) Vérif de signature (raw body requis sur la route)
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`❌ [${traceId}] Webhook signature error:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 3) Idempotence
  await ensureStripeEventsTable();
  try {
    const [r] = await pool.query(
      'INSERT IGNORE INTO stripe_events (id) VALUES (?)',
      [event.id]
    );
    if (r.affectedRows === 0) {
      console.log(`ℹ️ [${traceId}] Event déjà reçu: ${event.id}`);
      return res.json({ received: true, duplicate: true });
    }
  } catch (e) {
    console.error(`❌ [${traceId}] Erreur idempotence stripe_events:`, e);
  }

  // 4) Événements utiles
  if (event.type === 'checkout.session.completed') {
    try {
      const session = event.data.object;

      // === STRICT MODE: on n'utilise QUE metadata fourni par ton checkout ===
      if (!session.metadata || !session.metadata.cart_items) {
        console.error(
          `❌ [${traceId}] metadata.cart_items manquant; abandon insertion order_items.`
        );
        // On met quand même la commande à paid si elle existe déjà (logique inchangée)
        // mais sans réinsérer les items.
      }

      // Parse metadata strict
      let shipping = null;
      if (session.metadata?.shipping) {
        try {
          shipping = JSON.parse(session.metadata.shipping);
        } catch {
          /* empty */
        }
      }

      let cart_items = [];
      if (session.metadata?.cart_items) {
        try {
          cart_items = JSON.parse(session.metadata.cart_items) || [];
        } catch {
          /* empty */
        }
      }

      // Validation stricte des items (printful_variant_id DOIT exister)
      const invalid = (cart_items || []).find(
        (it) =>
          !Number.isFinite(Number(it?.printful_variant_id)) ||
          !Number.isFinite(Number(it?.id)) ||
          !Number.isFinite(Number(it?.quantity))
      );
      if (cart_items?.length && invalid) {
        console.error(
          `❌ [${traceId}] cart_items invalide (id, printful_variant_id, quantity requis):`,
          invalid
        );
        // On n'insère pas d'items si invalides
        cart_items = [];
      }

      const orderIdFromStripe =
        session.client_reference_id || session.metadata?.order_id || null;

      const customer_email = session.customer_email || shipping?.email || null;

      const total = centsToFloat(session.amount_total ?? 0);

      // 1) shipping renvoyé par Stripe (sera >0 seulement si tu utilises Shipping Options)
      let shipping_cost = centsToFloat(
        session.total_details?.amount_shipping ?? 0
      );

      // 2) fallback #1: metadata.shipping_rate (si tu l'as ajoutée)
      if (shipping_cost === 0 && session.metadata?.shipping_rate) {
        try {
          const sr = JSON.parse(session.metadata.shipping_rate);
          if (!isNaN(Number(sr?.rate))) shipping_cost = Number(sr.rate);
        } catch {
          /* ignore */
        }
      }

      // 3) fallback #2: garder l'ancien si toujours 0
      try {
        const [[prevOrderForShip]] = await pool.query(
          `SELECT shipping_cost FROM orders WHERE id = ?`,
          [orderId]
        );
        if (shipping_cost === 0 && prevOrderForShip?.shipping_cost != null) {
          shipping_cost = Number(prevOrderForShip.shipping_cost);
        }
      } catch {
        /* ignore */
      }

      // --- Upsert de la commande (inchangé)
      let orderId = orderIdFromStripe;

      if (orderId) {
        await pool.execute(
          `UPDATE orders
             SET status = ?, total = ?, shipping_cost = ?, updated_at = NOW()
           WHERE id = ?`,
          ['paid', total, shipping_cost, orderId]
        );
        if (cart_items.length > 0) {
          await pool.execute(`DELETE FROM order_items WHERE order_id = ?`, [
            orderId
          ]);
        }
      } else {
        if (customer_email) {
          const [[existingOrder]] = await pool.query(
            `SELECT id FROM orders
              WHERE customer_email = ? AND status = 'pending'
              ORDER BY created_at DESC LIMIT 1`,
            [customer_email]
          );
          if (existingOrder) {
            orderId = existingOrder.id;
            await pool.execute(
              `UPDATE orders
                 SET status = ?, total = ?, shipping_cost = ?, updated_at = NOW()
               WHERE id = ?`,
              ['paid', total, shipping_cost, orderId]
            );
            if (cart_items.length > 0) {
              await pool.execute(`DELETE FROM order_items WHERE order_id = ?`, [
                orderId
              ]);
            }
          }
        }
        if (!orderId) {
          const [ins] = await pool.execute(
            `INSERT INTO orders
               (customer_email, status, total, shipping_cost, created_at, updated_at)
             VALUES (?, ?, ?, ?, NOW(), NOW())`,
            [customer_email, 'paid', total, shipping_cost]
          );
          orderId = ins.insertId;
        }
      }

      // --- Réinsertion des items (STRICT: exige printful_variant_id présent dans metadata)
      if (cart_items.length > 0) {
        for (const item of cart_items) {
          const localVariantId = Number(item.id);
          const pfVariantId = Number(item.printful_variant_id); // requis
          const qty = Number(item.quantity);
          const price = typeof item.price === 'number' ? item.price : 0;

          // Double vérif défensive (évite tout NULL/NaN)
          if (
            !Number.isFinite(localVariantId) ||
            !Number.isFinite(pfVariantId) ||
            !Number.isFinite(qty)
          ) {
            console.error(
              `❌ [${traceId}] Item invalide, insertion annulée:`,
              item
            );
            continue; // on saute l'item invalide
          }

          const metaPayload = {
            name: item.name ?? null,
            sku: item.sku ?? null,
            note: 'inserted from stripe webhook (strict metadata)'
          };

          await pool.execute(
            `INSERT INTO order_items
               (order_id, variant_id, printful_variant_id, quantity, price_at_purchase, meta, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
              orderId,
              localVariantId,
              pfVariantId,
              qty,
              price,
              JSON.stringify(metaPayload)
            ]
          );
        }
      } else {
        console.warn(
          `⚠️ [${traceId}] Aucun item inséré (metadata.cart_items absent ou invalide).`
        );
      }

      // --- Historique de statut
      try {
        const [[prev]] = await pool.query(
          `SELECT status FROM orders WHERE id = ?`,
          [orderId]
        );
        const oldStatus =
          prev?.status && prev.status !== 'paid' ? prev.status : 'pending';
        await pool.execute(
          `INSERT INTO order_status_history (order_id, old_status, new_status, changed_at)
           VALUES (?, ?, ?, NOW())`,
          [orderId, oldStatus, 'paid']
        );
      } catch (e) {
        console.warn(
          `⚠️ [${traceId}] Historisation statut échouée:`,
          e.message
        );
      }

      // --- Envoi Printful (optionnel, inchangé)
      if (
        process.env.PRINTFUL_AUTOMATIC_ORDER === 'true' &&
        cart_items.length > 0 &&
        shipping
      ) {
        try {
          const items = await mapCartToPrintfulVariants(cart_items);
          if (items && items.length > 0) {
            const recipient = {
              name: shipping.name,
              address1: shipping.address1,
              city: shipping.city,
              state_code: shipping.state,
              country_code: shipping.country,
              zip: shipping.zip,
              email: customer_email
            };
            const result = await createPrintfulOrder({
              recipient,
              items,
              confirm: false
            });
            if (result?.id) {
              await pool.execute(
                `UPDATE orders SET printful_order_id = ? WHERE id = ?`,
                [result.id, orderId]
              );
              console.log(`✅ [${traceId}] Printful order lié : ${result.id}`);
            } else {
              console.warn(`⚠️ [${traceId}] Réponse Printful sans id:`, result);
            }
          } else {
            console.warn(
              `⚠️ [${traceId}] mapCartToPrintfulVariants a retourné 0 item`
            );
          }
        } catch (err) {
          console.error(
            `❌ [${traceId}] Erreur envoi Printful:`,
            err.response?.data || err.message || err
          );
        }
      }

      console.log(
        `✅ [${traceId}] checkout.session.completed traité (order #${orderId})`
      );
      return res.json({ received: true, orderId });
    } catch (err) {
      console.error(
        `❌ [${traceId}] Erreur traitement checkout.session.completed:`,
        err
      );
      return res.status(500).send('Erreur interne webhook');
    }
  }

  // Autres events
  console.log(`ℹ️ [${traceId}] Event ignoré: ${event.type}`);
  return res.json({ received: true });
}

export { handleStripeWebhook };
