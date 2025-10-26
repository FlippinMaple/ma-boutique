// server/controllers/webhookController.js
import { getStripe } from '../services/stripeService.js';
import { logInfo, logWarn, logError } from '../utils/logger.js';
import {
  mapCartToPrintfulVariants,
  createPrintfulOrder
} from '../services/printfulService.js';
import { centsToFloat } from '../utils/currency.js';

/* ------------------------------------------------------------------ */
/*  Stripe events store: upgrade-safe (idempotence + full payload)     */
/* ------------------------------------------------------------------ */
async function ensureStripeEventsTable(req) {
  const db = req.app.locals.db;

  // 1) crée si absent (schéma complet)
  await db.query(`
    CREATE TABLE IF NOT EXISTS stripe_events (
      event_id   VARCHAR(255) PRIMARY KEY,
      event_type VARCHAR(64)  NOT NULL,
      created_at DATETIME     NOT NULL DEFAULT UTC_TIMESTAMP(),
      payload    LONGTEXT     NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // 2) si ancienne table minimale existe (id, received_at), on la migre "en douceur"
  try {
    await db.query(
      `ALTER TABLE stripe_events CHANGE COLUMN id event_id VARCHAR(255) NOT NULL`
    );
  } catch {
    /* existe déjà */
  }
  try {
    await db.query(
      `ALTER TABLE stripe_events ADD COLUMN event_type VARCHAR(64) NOT NULL`
    );
  } catch {
    /* existe déjà */
  }
  try {
    await db.query(
      `ALTER TABLE stripe_events ADD COLUMN created_at DATETIME NOT NULL DEFAULT UTC_TIMESTAMP()`
    );
  } catch {
    /* existe déjà */
  }
  try {
    await db.query(
      `ALTER TABLE stripe_events ADD COLUMN payload LONGTEXT NULL`
    );
  } catch {
    /* existe déjà */
  }
}

async function upsertStripeEvent(event, req) {
  const db = req.app.locals.db;

  try {
    await db.query(
      `INSERT INTO stripe_events (event_id, event_type, created_at, payload)
       VALUES (?, ?, UTC_TIMESTAMP(), ?)
       ON DUPLICATE KEY UPDATE event_type=VALUES(event_type), payload=VALUES(payload)`,
      [event.id, event.type, JSON.stringify(event)]
    );
  } catch (e) {
    // non bloquant
    await logWarn(
      `[stripe_events] upsert failed for ${event.id}: ${e?.message || e}`,
      'webhook',
      e
    );
  }
}

/* ------------------------------------------------------------------ */
/*  Mark abandoned cart recovered (by sessionId first, fallback email) */
/* ------------------------------------------------------------------ */
async function markAbandonedRecovered({ sessionId, email, req }) {
  const db = req.app.locals.db;

  await db.query(
    `UPDATE abandoned_carts
        SET is_recovered = 1,
            recovered_at = UTC_TIMESTAMP(),
            checkout_session_id = COALESCE(checkout_session_id, ?)
      WHERE is_recovered = 0
        AND (
              checkout_session_id = ?
           OR (customer_email = ? AND created_at >= UTC_TIMESTAMP() - INTERVAL 30 DAY)
            )
      ORDER BY created_at DESC
      LIMIT 1`,
    [sessionId, sessionId, email || null]
  );
}

/* ------------------------------------------------------------------ */
/*  Main handler                                                      */
/* ------------------------------------------------------------------ */
async function handleStripeWebhook(req, res) {
  const traceId = `wh_${Date.now()}`;

  // 1) Sanity checks
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    await logError(
      `❌ [${traceId}] STRIPE_SECRET_KEY ou STRIPE_WEBHOOK_SECRET manquant`,
      'webhook'
    );
    return res.status(500).send('Configuration Stripe incomplète');
  }

  let stripe;
  try {
    stripe = getStripe(); // ✅ instanciation au runtime, après chargement .env
  } catch (e) {
    await logError(
      `❌ [${traceId}] Stripe init error: ${e.message}`,
      'webhook',
      e
    );
    return res.status(500).send('Stripe non configuré');
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

  // 3) Idempotence (basée sur event_id)
  await ensureStripeEventsTable(req);
  try {
    const db = req.app.locals.db;

    const [ins] = await db.query(
      `INSERT IGNORE INTO stripe_events (event_id, event_type, created_at)
       VALUES (?, ?, UTC_TIMESTAMP())`,
      [event.id, event.type]
    );
    if (ins.affectedRows === 0) {
      // déjà reçu/traité
      logInfo(`ℹ️ [${traceId}] Event déjà reçu: ${event.id}`, 'webhook');
      return res.json({ received: true, duplicate: true });
    }
  } catch (e) {
    await logError(
      `❌ [${traceId}] Erreur idempotence stripe_events: ${e?.message || e}`,
      'webhook',
      e
    );
    // on continue quand même
  }

  // 4) Traitement des events utiles
  if (event.type === 'checkout.session.completed') {
    try {
      const session = event.data.object;

      if (!session.metadata || !session.metadata.cart_items) {
        await logWarn(
          `⚠️ [${traceId}] metadata.cart_items manquant; insertion order_items sautée.`,
          'webhook'
        );
      }

      // Parse metadata stricte
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

      // Validation stricte des items
      const invalid = (cart_items || []).find(
        (it) =>
          !Number.isFinite(Number(it?.printful_variant_id)) ||
          !Number.isFinite(Number(it?.id)) ||
          !Number.isFinite(Number(it?.quantity))
      );
      if (cart_items?.length && invalid) {
        await logError(
          `❌ [${traceId}] cart_items invalide: ${JSON.stringify(invalid)}`,
          'webhook',
          invalid
        );
        cart_items = [];
      }

      const orderIdFromStripe =
        session.client_reference_id || session.metadata?.order_id || null;

      const customer_email =
        (session.customer_details && session.customer_details.email) ||
        session.customer_email ||
        (shipping && shipping.email) ||
        null;

      const total = centsToFloat(session.amount_total ?? 0);

      // Shipping (Stripe) ou fallback metadata
      let shipping_cost = centsToFloat(
        session.total_details?.amount_shipping ?? 0
      );
      if (shipping_cost === 0 && session.metadata?.shipping_rate) {
        try {
          const sr = JSON.parse(session.metadata.shipping_rate);
          if (!isNaN(Number(sr?.rate))) shipping_cost = Number(sr.rate);
        } catch {
          /* empty */
        }
      }

      // --- Upsert / résolution de la commande ---
      let orderId = orderIdFromStripe;
      const db = req.app.locals.db;

      if (orderId) {
        // fallback coût livraison d’une commande existante si Stripe a rapporté 0
        try {
          const [[prevOrder]] = await db.query(
            'SELECT shipping_cost FROM orders WHERE id = ?',
            [orderId]
          );
          if (shipping_cost === 0 && prevOrder?.shipping_cost != null) {
            shipping_cost = Number(prevOrder.shipping_cost);
          }
        } catch {
          /* empty */
        }

        await db.execute(
          `UPDATE orders
             SET status = 'paid',
                 total = ?,
                 shipping_cost = ?,
                 paid_at = UTC_TIMESTAMP(),
                 updated_at = UTC_TIMESTAMP()
           WHERE id = ?`,
          [total, shipping_cost, orderId]
        );

        // ⚠️ pas de DELETE des order_items ici.
        // Les lignes créées par checkoutController sont légales et immuables.
      } else {
        // Essayer d'associer à la dernière pending du même email
        if (customer_email) {
          const [[existingOrder]] = await db.query(
            `SELECT id, shipping_cost FROM orders
             WHERE customer_email = ? AND status = 'pending'
             ORDER BY created_at DESC LIMIT 1`,
            [customer_email]
          );

          if (existingOrder) {
            orderId = existingOrder.id;

            if (shipping_cost === 0 && existingOrder.shipping_cost != null) {
              shipping_cost = Number(existingOrder.shipping_cost);
            }

            await db.execute(
              `UPDATE orders
                 SET status = 'paid',
                     total = ?,
                     shipping_cost = ?,
                     paid_at = UTC_TIMESTAMP(),
                     updated_at = UTC_TIMESTAMP()
               WHERE id = ?`,
              [total, shipping_cost, orderId]
            );

            // ⚠️ pas de DELETE des order_items ici non plus.
          }
        }

        // Sinon créer une nouvelle commande "dégradée"
        if (!orderId) {
          const [ins] = await db.execute(
            `INSERT INTO orders
               (customer_email,
                status,
                total,
                shipping_cost,
                paid_at,
                created_at,
                updated_at)
             VALUES (?, 'paid', ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
            [customer_email, total, shipping_cost]
          );
          orderId = ins.insertId;
        }
      }

      // --- Insérer des items UNIQUEMENT si la commande n'en avait pas déjà ---
      let shouldInsertItems = true;
      try {
        const [existingItems] = await db.query(
          `SELECT id FROM order_items WHERE order_id = ? LIMIT 1`,
          [orderId]
        );
        if (existingItems.length > 0) {
          shouldInsertItems = false;
          await logInfo(
            `ℹ️ [${traceId}] order_items déjà présents pour order #${orderId}, pas de réinsertion`,
            'webhook'
          );
        }
      } catch (e) {
        await logWarn(
          `⚠️ [${traceId}] Impossible de vérifier order_items existants: ${
            e?.message || e
          }`,
          'webhook',
          e
        );
      }

      if (shouldInsertItems && cart_items.length > 0) {
        for (const item of cart_items) {
          const localVariantId = Number(item.id);
          const pfVariantId = Number(item.printful_variant_id);
          const qty = Number(item.quantity);
          const priceNum = typeof item.price === 'number' ? item.price : 0; // dollars/unité
          const unitPriceCents = Math.round(priceNum * 100);

          if (
            !Number.isFinite(localVariantId) ||
            !Number.isFinite(pfVariantId) ||
            !Number.isFinite(qty)
          ) {
            await logWarn(
              `⚠️ [${traceId}] Item invalide, sauté: ${JSON.stringify(item)}`,
              'webhook',
              item
            );
            continue;
          }

          const metaPayload = {
            name: item.name ?? null,
            sku: item.sku ?? null,
            note: 'inserted from stripe webhook (fallback mode)'
          };

          await db.execute(
            `INSERT INTO order_items
               (order_id,
                variant_id,
                printful_variant_id,
                quantity,
                price_at_purchase,
                unit_price_cents,
                meta,
                created_at,
                updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
            [
              orderId,
              localVariantId,
              pfVariantId,
              qty,
              priceNum.toFixed(2), // ex "29.99"
              unitPriceCents, // ex 2999
              JSON.stringify(metaPayload)
            ]
          );
        }
      } else if (shouldInsertItems && cart_items.length === 0) {
        await logWarn(
          `⚠️ [${traceId}] Aucun item inséré (metadata.cart_items absent/invalide).`,
          'webhook'
        );
      }

      // --- Historique de statut
      try {
        await db.execute(
          `INSERT INTO order_status_history (order_id, old_status, new_status, changed_at)
           VALUES (?, ?, ?, UTC_TIMESTAMP())`,
          [orderId, 'pending', 'paid']
        );
      } catch (e) {
        await logWarn(
          `⚠️ [${traceId}] Historisation statut échouée: ${e.message}`,
          'webhook',
          e
        );
      }

      // --- Abandoned cart: marquer "recovered" via sessionId/email
      try {
        await markAbandonedRecovered({
          sessionId: session.id,
          email: customer_email
        });
      } catch (e) {
        await logWarn(
          `⚠️ [${traceId}] markAbandonedRecovered a échoué: ${e?.message || e}`,
          'webhook',
          e
        );
      }

      // --- Printful (optionnel)
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
              await db.execute(
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

      // 5) Log complet de l’event (payload)
      await upsertStripeEvent(event);

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

  // autres events → juste log + upsert
  await upsertStripeEvent(event);
  logInfo(`ℹ️ [${traceId}] Event ignoré: ${event.type}`, 'webhook');
  return res.json({ received: true });
}

export { handleStripeWebhook };
