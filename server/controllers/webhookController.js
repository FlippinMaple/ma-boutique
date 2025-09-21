// server/controllers/webhookController.js
import Stripe from 'stripe';
import { logInfo, logWarn, logError } from '../utils/logger.js';
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
    await logError(
      `❌ [${traceId}] STRIPE_SECRET_KEY ou STRIPE_WEBHOOK_SECRET manquant`,
      'webhook'
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
    await logError(
      `❌ [${traceId}] Webhook signature error: ${err.message}`,
      'webhook',
      err
    );
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
      logInfo(`ℹ️ [${traceId}] Event déjà reçu: ${event.id}`, 'webhook');
      return res.json({ received: true, duplicate: true });
    }
  } catch (e) {
    await logError(
      `❌ [${traceId}] Erreur idempotence stripe_events: ${e?.message || e}`,
      'webhook',
      e
    );
  }

  // 4) Événements utiles
  if (event.type === 'checkout.session.completed') {
    try {
      const session = event.data.object;

      // === STRICT MODE: on n'utilise QUE metadata fourni par ton checkout ===
      if (!session.metadata || !session.metadata.cart_items) {
        await logError(
          `❌ [${traceId}] metadata.cart_items manquant; abandon insertion order_items.`,
          'webhook'
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
          /* ignore */
        }
      }

      let cart_items = [];
      if (session.metadata?.cart_items) {
        try {
          cart_items = JSON.parse(session.metadata.cart_items) || [];
        } catch {
          /* ignore */
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
        await logError(
          `❌ [${traceId}] cart_items invalide (id, printful_variant_id, quantity requis): ${JSON.stringify(
            invalid
          )}`,
          'webhook',
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

      // 2) fallback #1: metadata.shipping_rate (si tu l'as ajoutée côté checkout)
      if (shipping_cost === 0 && session.metadata?.shipping_rate) {
        try {
          const sr = JSON.parse(session.metadata.shipping_rate);
          if (!isNaN(Number(sr?.rate))) shipping_cost = Number(sr.rate);
        } catch {
          /* ignore */
        }
      }

      // --- Upsert de la commande ---
      let orderId = orderIdFromStripe;

      if (orderId) {
        // Fallback #2: si on a un orderId existant, on récupère SON shipping_cost avant l'update
        try {
          const [[prevOrder]] = await pool.query(
            'SELECT shipping_cost FROM orders WHERE id = ?',
            [orderId]
          );
          if (shipping_cost === 0 && prevOrder?.shipping_cost != null) {
            shipping_cost = Number(prevOrder.shipping_cost);
          }
        } catch {
          /* ignore */
        }

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
        // Essayer d'associer à la dernière pending du même email
        if (customer_email) {
          const [[existingOrder]] = await pool.query(
            `SELECT id, shipping_cost FROM orders
             WHERE customer_email = ? AND status = 'pending'
             ORDER BY created_at DESC LIMIT 1`,
            [customer_email]
          );
          if (existingOrder) {
            orderId = existingOrder.id;

            // Fallback #2: si zéro, reprendre l'ancien shipping_cost de cette commande
            if (shipping_cost === 0 && existingOrder.shipping_cost != null) {
              shipping_cost = Number(existingOrder.shipping_cost);
            }

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

        // Sinon créer une nouvelle commande
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
            await logWarn(
              `❌ [${traceId}] Item invalide, insertion annulée: ${JSON.stringify(
                item
              )}`,
              'webhook',
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
        await logWarn(
          `⚠️ [${traceId}] Aucun item inséré (metadata.cart_items absent ou invalide).`,
          'webhook'
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
        await logWarn(
          `⚠️ [${traceId}] Historisation statut échouée: ${e.message}`,
          'webhook',
          e
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
              logInfo(
                `✅ [${traceId}] Printful order lié : ${result.id}`,
                'webhook'
              );
            } else {
              await logWarn(
                `⚠️ [${traceId}] Réponse Printful sans id: ${JSON.stringify(
                  result
                )}`,
                'webhook',
                result
              );
            }
          } else {
            await logWarn(
              `⚠️ [${traceId}] mapCartToPrintfulVariants a retourné 0 item`,
              'webhook'
            );
          }
        } catch (err) {
          await logError(
            `❌ [${traceId}] Erreur envoi Printful: ${
              err?.response?.data || err?.message || String(err)
            }`,
            'webhook',
            err
          );
        }
      }

      logInfo(
        `✅ [${traceId}] checkout.session.completed traité (order #${orderId})`,
        'webhook'
      );
      return res.json({ received: true, orderId });
    } catch (err) {
      await logError(
        `❌ [${traceId}] Erreur traitement checkout.session.completed: ${
          err?.message || err
        }`,
        'webhook',
        err
      );
      return res.status(500).send('Erreur interne webhook');
    }
  }

  // Autres events
  logInfo(`ℹ️ [${traceId}] Event ignoré: ${event.type}`, 'webhook');
  return res.json({ received: true });
}

export { handleStripeWebhook };
