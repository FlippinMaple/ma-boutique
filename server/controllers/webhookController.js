// server/controllers/webhookController.js

import { getStripe } from '../services/stripeService.js';
import { logInfo, logWarn, logError } from '../utils/logger.js';
import {
  mapCartToPrintfulVariants,
  createPrintfulOrder
} from '../services/printfulService.js';
import { centsToFloat } from '../utils/currency.js';

/*
INVARIANTS CRITIQUES WEBHOOK STRIPE – NE PAS CASSER
---------------------------------------------------
1. Le webhook Stripe (signe) est la SEULE autorite qui peut:
   - passer une commande de 'pending' → 'paid'
   - ecrire paid_at
   - historiser pending→paid dans order_status_history

2. On NE MODIFIE PAS les snapshots ecrits par checkoutController :
   shipping_address_snapshot, email_snapshot, price_at_purchase, etc.

3. On NE SUPPRIME PAS / NE REECRIT PAS order_items si la commande existe deja.
   On insere des items uniquement en mode degrade (fallback metadata).

4. Jamais de status 'paid' sans au moins un order_item confirme.
*/

/** Dollars (ou string) → cents, aligne sur checkoutController.toCents */
function toCentsFromMeta(value) {
  if (value == null || value === '') return NaN;
  const n = Number(String(value).replace(',', '.').trim());
  if (!Number.isFinite(n) || n < 0) return NaN;
  return Math.round(n * 100);
}

/** Normalise un item metadata.cart_items (shape checkout + legacy) */
function normalizeMetaCartItem(it) {
  const qty = Number(it?.quantity ?? it?.qty ?? 0);
  const frontRaw = it?.id ?? it?.variant_id ?? it?.variantId ?? null;
  const pfRaw = it?.printful_variant_id ?? it?.printfulVariantId ?? null;
  const frontVariantId = Number(frontRaw);
  const pfVariantId = Number(pfRaw);

  let unitPriceCents = NaN;
  if (it?.unit_price_cents != null && it.unit_price_cents !== '') {
    const c = Number(it.unit_price_cents);
    if (Number.isFinite(c) && c >= 0) unitPriceCents = Math.round(c);
  }
  if (!Number.isFinite(unitPriceCents)) {
    unitPriceCents = toCentsFromMeta(
      it?.price ?? it?.unit_price ?? it?.unitPrice
    );
  }

  const hasFront = Number.isFinite(frontVariantId) && frontVariantId !== 0;
  const hasPf = Number.isFinite(pfVariantId) && pfVariantId !== 0;

  return {
    qty,
    frontVariantId: hasFront ? frontVariantId : 0,
    pfVariantId: hasPf ? pfVariantId : 0,
    unitPriceCents,
    name: it?.name ?? null,
    sku: it?.sku ?? null,
    valid:
      Number.isFinite(qty) &&
      qty > 0 &&
      (hasFront || hasPf) &&
      Number.isFinite(unitPriceCents) &&
      unitPriceCents >= 0
  };
}

async function orderHasItems(db, orderId) {
  const [rows] = await db.query(
    `SELECT id FROM order_items WHERE order_id = ? LIMIT 1`,
    [orderId]
  );
  return rows.length > 0;
}

async function insertOrderItemsFromMetadata(db, orderId, cartItems, traceId) {
  const validItems = (cartItems || [])
    .map(normalizeMetaCartItem)
    .filter((it) => it.valid);

  if (validItems.length === 0) return false;

  await db.query('START TRANSACTION');
  try {
    for (const item of validItems) {
      const [pvRows] = await db.query(
        `
        SELECT id, printful_variant_id
          FROM product_variants
         WHERE (variant_id = ? AND ? <> 0)
            OR (id = ? AND ? <> 0)
            OR (printful_variant_id = ? AND ? <> 0)
         LIMIT 1
        `,
        [
          item.frontVariantId,
          item.frontVariantId,
          item.frontVariantId,
          item.frontVariantId,
          item.pfVariantId,
          item.pfVariantId
        ]
      );

      if (!pvRows.length) {
        throw new Error(
          `Variant introuvable (front=${item.frontVariantId || null}, printful=${
            item.pfVariantId || null
          })`
        );
      }

      const dbVariantId = pvRows[0].id;
      const pfVariantId = pvRows[0].printful_variant_id;
      const priceAtPurchase = (item.unitPriceCents / 100).toFixed(2);

      await db.execute(
        `
        INSERT INTO order_items
               (order_id,
                variant_id,
                printful_variant_id,
                quantity,
                price_at_purchase,
                unit_price_cents,
                meta,
                created_at,
                updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
        `,
        [
          orderId,
          dbVariantId,
          pfVariantId,
          item.qty,
          priceAtPurchase,
          item.unitPriceCents,
          JSON.stringify({
            name: item.name,
            sku: item.sku,
            note: 'inserted from stripe webhook (fallback mode)'
          })
        ]
      );
    }
    await db.query('COMMIT');
    return true;
  } catch (e) {
    await db.query('ROLLBACK');
    await logError(
      `[${traceId}] Fallback insert order_items failed: ${e?.message || e}`,
      'webhook'
    );
    return false;
  }
}

async function releaseEventIdempotence(db, eventId) {
  try {
    await db.query(`DELETE FROM stripe_events WHERE event_id = ?`, [eventId]);
  } catch {
    /* ignore */
  }
}

/**
 * S'assure que la table stripe_events existe pour loguer les webhooks Stripe,
 * et tente d'ajouter order_id si pas présent.
 * En prod Hostinger on sait que ALTER TABLE peut échouer (erreur 1044),
 * donc on essaie et si ça plante, on continue tranquille.
 */
async function ensureStripeEventsTable(req) {
  const db = req.app.locals.db;

  await db.query(`
    CREATE TABLE IF NOT EXISTS stripe_events (
      event_id   VARCHAR(255) PRIMARY KEY,
      event_type VARCHAR(64)  NOT NULL,
      created_at DATETIME     NOT NULL DEFAULT UTC_TIMESTAMP(),
      payload    LONGTEXT     NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  try {
    // On essaie d'ajouter order_id si pas déjà là.
    await db.query(`ALTER TABLE stripe_events ADD COLUMN order_id INT NULL`);
  } catch {
    // silencieux
  }
}

/** Upsert d'un événement Stripe dans stripe_events, en tentant de résoudre order_id */
async function upsertStripeEvent(event, req, possibleOrderId = null) {
  const db = req.app.locals.db;
  const payloadJson = JSON.stringify(event);

  let resolvedOrderId = possibleOrderId;

  // Tentative de résolution si pas d’order passé en paramètre
  if (!resolvedOrderId) {
    try {
      const type = event.type || '';
      const obj = event.data?.object || {};

      // 1) checkout.session.* → via stripe_session_id
      if (type.startsWith('checkout.session') && obj.id) {
        const [[row]] = await db.query(
          `SELECT id FROM orders WHERE stripe_session_id = ? LIMIT 1`,
          [String(obj.id)]
        );
        if (row?.id) resolvedOrderId = row.id;
      }

      // 2) payment_intent.* → via stripe_payment_intent_id
      if (!resolvedOrderId && type.startsWith('payment_intent') && obj.id) {
        const [[row]] = await db.query(
          `SELECT id FROM orders WHERE stripe_payment_intent_id = ? LIMIT 1`,
          [String(obj.id)]
        );
        if (row?.id) resolvedOrderId = row.id;
      }

      // 3) charge.* → obj.payment_intent → via stripe_payment_intent_id
      if (!resolvedOrderId && type.startsWith('charge') && obj.payment_intent) {
        const [[row]] = await db.query(
          `SELECT id FROM orders WHERE stripe_payment_intent_id = ? LIMIT 1`,
          [String(obj.payment_intent)]
        );
        if (row?.id) resolvedOrderId = row.id;
      }
    } catch (e) {
      await logWarn(
        `[stripe_events] resolve orderId from payload failed: ${
          e?.message || e
        }`,
        'webhook'
      );
    }
  }

  const createdEpoch = Number(event?.created);
  const createdSql = Number.isFinite(createdEpoch) ? createdEpoch : null;

  // Upsert avec ou sans order_id selon capacité
  try {
    await db.query(
      `INSERT INTO stripe_events (event_id, event_type, created_at, payload, order_id)
       VALUES (?, ?, ${
         createdSql ? 'FROM_UNIXTIME(?)' : 'UTC_TIMESTAMP()'
       }, ?, ?)
       ON DUPLICATE KEY UPDATE
         event_type = VALUES(event_type),
         payload    = VALUES(payload),
         order_id   = VALUES(order_id)`,
      createdSql
        ? [
            event.id,
            event.type,
            createdSql,
            payloadJson,
            resolvedOrderId || null
          ]
        : [event.id, event.type, payloadJson, resolvedOrderId || null]
    );
    return;
  } catch {
    try {
      await db.query(
        `INSERT INTO stripe_events (event_id, event_type, created_at, payload)
         VALUES (?, ?, ${
           createdSql ? 'FROM_UNIXTIME(?)' : 'UTC_TIMESTAMP()'
         }, ?)
         ON DUPLICATE KEY UPDATE
           event_type = VALUES(event_type),
           payload    = VALUES(payload)`,
        createdSql
          ? [event.id, event.type, createdSql, payloadJson]
          : [event.id, event.type, payloadJson]
      );
    } catch (inner) {
      await logWarn(
        `[stripe_events] upsert failed for ${event.id}: ${
          inner?.message || inner
        }`,
        'webhook'
      );
    }
  }
}

/**
 * Marque un abandoned_cart comme récupéré si on peut le lier.
 */
async function markAbandonedRecovered({ sessionId, email, req }) {
  const db = req.app.locals.db;

  await db.query(
    `
    UPDATE abandoned_carts
       SET is_recovered = 1,
           recovered_at = UTC_TIMESTAMP(),
           checkout_session_id = COALESCE(checkout_session_id, ?)
     WHERE is_recovered = 0
       AND (
             checkout_session_id = ?
          OR (customer_email = ? AND created_at >= UTC_TIMESTAMP() - INTERVAL 30 DAY)
           )
     ORDER BY created_at DESC
     LIMIT 1
    `,
    [sessionId, sessionId, email || null]
  );
}

/**
 * PAY-006 : résoudre de façon robuste quelle commande doit passer à 'paid'
 * à partir de la session Stripe.
 */
async function resolveOrderIdFromSession({ db, session }) {
  // 1. via stripe_session_id
  try {
    const [[byStripeSession]] = await db.query(
      `
      SELECT id, shipping_cost
        FROM orders
       WHERE stripe_session_id = ?
       LIMIT 1
      `,
      [session.id]
    );

    if (byStripeSession) {
      return {
        orderId: byStripeSession.id,
        prevShippingCost: byStripeSession.shipping_cost
      };
    }
  } catch (e) {
    await logWarn(
      `[webhook] resolveOrderIdFromSession: lookup stripe_session_id failed ${
        e?.message || e
      }`,
      'webhook'
    );
  }

  // 2. via client_reference_id ou metadata.order_id
  let refId = null;
  if (session.client_reference_id) {
    refId = session.client_reference_id;
  } else if (session.metadata?.order_id) {
    refId = session.metadata.order_id;
  }

  if (refId) {
    try {
      const [[byClientRef]] = await db.query(
        `
        SELECT id, shipping_cost
          FROM orders
         WHERE id = ?
         LIMIT 1
        `,
        [refId]
      );

      if (byClientRef) {
        return {
          orderId: byClientRef.id,
          prevShippingCost: byClientRef.shipping_cost
        };
      }
    } catch (e) {
      await logWarn(
        `[webhook] resolveOrderIdFromSession: lookup client_reference_id/order_id failed ${
          e?.message || e
        }`,
        'webhook'
      );
    }
  }

  // 3. fallback: dernière pending pour le même email
  const customer_email =
    (session.customer_details && session.customer_details.email) ||
    session.customer_email ||
    (session.metadata && session.metadata.shipping
      ? (() => {
          try {
            const sh = JSON.parse(session.metadata.shipping);
            return sh.email || null;
          } catch {
            return null;
          }
        })()
      : null);

  if (customer_email) {
    try {
      const [[byEmail]] = await db.query(
        `
        SELECT id, shipping_cost
          FROM orders
         WHERE customer_email = ?
           AND status = 'pending'
         ORDER BY created_at DESC
         LIMIT 1
        `,
        [customer_email]
      );

      if (byEmail) {
        return {
          orderId: byEmail.id,
          prevShippingCost: byEmail.shipping_cost
        };
      }
    } catch (e) {
      await logWarn(
        `[webhook] resolveOrderIdFromSession: lookup fallback email failed ${
          e?.message || e
        }`,
        'webhook'
      );
    }
  }

  return { orderId: null, prevShippingCost: null };
}

// -- Reconciliation: remplir order_id pour les events déjà loggés
async function reconcileStripeEvents({
  db,
  orderId,
  sessionId,
  paymentIntentId,
  traceId
}) {
  try {
    // 1) payment_intent.*  → payload.data.object.id = PI
    if (paymentIntentId) {
      await db.execute(
        `
        UPDATE stripe_events
           SET order_id = ?
         WHERE order_id IS NULL
           AND event_type LIKE 'payment_intent.%'
           AND JSON_EXTRACT(payload, '$.data.object.id') = ?
        `,
        [orderId, String(paymentIntentId)]
      );

      // 2) charge.* → payload.data.object.payment_intent = PI
      await db.execute(
        `
        UPDATE stripe_events
           SET order_id = ?
         WHERE order_id IS NULL
           AND event_type LIKE 'charge.%'
           AND JSON_EXTRACT(payload, '$.data.object.payment_intent') = ?
        `,
        [orderId, String(paymentIntentId)]
      );
    }

    // 3) checkout.session.* → payload.data.object.id = sessionId
    if (sessionId) {
      await db.execute(
        `
        UPDATE stripe_events
           SET order_id = ?
         WHERE order_id IS NULL
           AND event_type LIKE 'checkout.session.%'
           AND JSON_EXTRACT(payload, '$.data.object.id') = ?
        `,
        [orderId, String(sessionId)]
      );
    }
  } catch (e) {
    await logWarn(
      `[${traceId}] reconcileStripeEvents failed: ${e?.message || e}`,
      'webhook'
    );
  }
}

/**
 * Contrôleur principal du webhook Stripe.
 * Reçoit le body brut (Buffer) grâce à app.js qui monte /webhook avec bodyParser.raw()
 */
async function handleStripeWebhook(req, res) {
  const traceId = `wh_${Date.now()}`;

  // 1. Sanity check Stripe config
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    await logError(`[${traceId}] STRIPE_WEBHOOK_SECRET manquant`, 'webhook');
    return res.status(500).send('Stripe non configuré');
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch (e) {
    await logError(
      `[${traceId}] Stripe init error: ${e?.message || e}`,
      'webhook'
    );
    return res.status(500).send('Stripe non configuré');
  }

  // 2. Vérification de la signature Stripe
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body, // Buffer brut (pas JSON parsé)
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    await logError(
      `[${traceId}] Webhook signature error: ${err?.message || err}`,
      'webhook'
    );
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 3. Idempotence + table stripe_events
  await ensureStripeEventsTable(req);

  // On tente d'insérer l'event_id; si déjà vu => on sort
  try {
    const db = req.app.locals.db;
    const [ins] = await db.query(
      `
      INSERT IGNORE INTO stripe_events (event_id, event_type, created_at)
      VALUES (?, ?, UTC_TIMESTAMP())
      `,
      [event.id, event.type]
    );

    if (ins.affectedRows === 0) {
      // Event déjà traité
      await logInfo(`[${traceId}] Event deja recu: ${event.id}`, 'webhook');
      return res.json({ received: true, duplicate: true });
    }
  } catch (e) {
    await logWarn(
      `[${traceId}] Unable to assert idempotence: ${e?.message || e}`,
      'webhook'
    );
    // pas bloquant, on poursuit quand même
  }

  // 4. On gère l'événement clé : checkout.session.completed
  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    const session = event.data.object;

    await logInfo(
      `[${traceId}] Webhook checkout.session.completed pour session ${session.id} clientRef=${session.client_reference_id || 'null'}`,
      'webhook'
    );

    const db = req.app.locals.db;

    // A) Résoudre la commande à passer en 'paid'
    const { orderId: resolvedOrderId, prevShippingCost } =
      await resolveOrderIdFromSession({ db, session });

    await logInfo(
      `[${traceId}] resolveOrderIdFromSession => ${resolvedOrderId || 'NONE'}`,
      'webhook'
    );

    // Si on ne trouve pas de commande, on NE crée PAS une commande magique
    if (!resolvedOrderId) {
      await logError(
        `[${traceId}] Aucune commande pending pour session ${session.id}. clientRef=${session.client_reference_id || 'null'} email=${session.customer_details?.email || session.customer_email || 'null'}`,
        'webhook'
      );

      await upsertStripeEvent(event, req, null);
      return res.json({
        received: true,
        note: 'order_not_found_no_fallback'
      });
    }

    const orderId = resolvedOrderId;

    // B) Montants venant de Stripe (en cents → float)
    const totalFloat = centsToFloat(session.amount_total ?? 0);

    // shipping_cost :
    // 1. si Stripe nous donne total_details.amount_shipping
    // 2. sinon metadata.shipping_rate.rate (valeur front)
    // 3. sinon garder prevShippingCost en DB
    let shipping_cost = centsToFloat(
      session.total_details?.amount_shipping ?? 0
    );

    if (shipping_cost === 0 && session.metadata?.shipping_rate) {
      try {
        const sr = JSON.parse(session.metadata.shipping_rate);
        if (!isNaN(Number(sr?.rate))) {
          shipping_cost = Number(sr.rate);
        }
      } catch {
        /* ignore parse error */
      }
    }
    if (shipping_cost === 0 && prevShippingCost != null) {
      shipping_cost = Number(prevShippingCost);
    }

    // shippingMeta pour Printful + email fallback
    let shippingMeta = null;
    try {
      if (session.metadata?.shipping) {
        shippingMeta = JSON.parse(session.metadata.shipping);
      }
    } catch {
      /* ignore parse error */
    }

    const customer_email =
      (session.customer_details && session.customer_details.email) ||
      session.customer_email ||
      (shippingMeta && shippingMeta.email) ||
      null;

    // C) Deja paid: pas de rewrite paid_at / history
    try {
      const [[curOrder]] = await db.query(
        `SELECT status FROM orders WHERE id = ? LIMIT 1`,
        [orderId]
      );
      if (curOrder?.status === 'paid') {
        await upsertStripeEvent(event, req, orderId);
        await logInfo(
          `[${traceId}] order #${orderId} already paid; skip rewrite`,
          'webhook'
        );
        return res.json({ received: true, orderId });
      }
    } catch (e) {
      await logWarn(
        `[${traceId}] status check failed: ${e?.message || e}`,
        'webhook'
      );
    }

    // D) Garantir des order_items avant tout passage a paid
    let cart_items = [];
    try {
      if (session.metadata?.cart_items) {
        cart_items = JSON.parse(session.metadata.cart_items) || [];
      }
    } catch {
      /* ignore */
    }

    let hasItems = false;
    let usedFallbackItems = false;
    try {
      hasItems = await orderHasItems(db, orderId);
    } catch (e) {
      await logWarn(
        `[${traceId}] Check order_items failed: ${e?.message || e}`,
        'webhook'
      );
    }

    if (!hasItems) {
      usedFallbackItems = await insertOrderItemsFromMetadata(
        db,
        orderId,
        cart_items,
        traceId
      );
      try {
        hasItems = await orderHasItems(db, orderId);
      } catch (e) {
        await logWarn(
          `[${traceId}] Re-check order_items failed: ${e?.message || e}`,
          'webhook'
        );
        hasItems = false;
      }
    }

    if (!hasItems) {
      await logError(
        `[${traceId}] paid blocked: no order_items for order #${orderId} (session ${session.id})`,
        'webhook'
      );
      await releaseEventIdempotence(db, event.id);
      return res.status(500).json({
        received: true,
        orderId,
        note: 'paid_blocked_no_order_items'
      });
    }

    // E) Transition pending → paid uniquement
    const [resUpd] = await db.execute(
      `
      UPDATE orders
         SET status = 'paid',
             total = ?,
             shipping_cost = ?,
             paid_at = UTC_TIMESTAMP(),
             updated_at = UTC_TIMESTAMP(),
             customer_email = COALESCE(customer_email, ?)
       WHERE id = ?
         AND status = 'pending'
      `,
      [totalFloat, shipping_cost, customer_email, orderId]
    );

    const transitioned = resUpd.affectedRows === 1;

    if (!transitioned) {
      try {
        const [[again]] = await db.query(
          `SELECT status FROM orders WHERE id = ? LIMIT 1`,
          [orderId]
        );
        if (again?.status === 'paid') {
          await upsertStripeEvent(event, req, orderId);
          await logInfo(
            `[${traceId}] order #${orderId} already paid after race; skip rewrite`,
            'webhook'
          );
          return res.json({ received: true, orderId });
        }
      } catch {
        /* ignore */
      }

      await logWarn(
        `[${traceId}] paid transition skipped for order #${orderId} (not pending)`,
        'webhook'
      );
      await upsertStripeEvent(event, req, orderId);
      return res.json({ received: true, orderId });
    }

    // F) payment_intent (apres transition reelle)
    try {
      const pi = session.payment_intent || null;
      if (pi) {
        await db.execute(
          `UPDATE orders
             SET stripe_payment_intent_id = ?
           WHERE id = ?`,
          [String(pi), orderId]
        );
        await reconcileStripeEvents({
          db,
          orderId,
          sessionId: session.id,
          paymentIntentId: session.payment_intent || null,
          traceId
        });
      }
    } catch (e) {
      await logWarn(
        `[${traceId}] PI save failed: ${e?.message || e}`,
        'webhook'
      );
    }

    // G) Historiser pending → paid (seulement si transition)
    try {
      await db.execute(
        `
        INSERT INTO order_status_history
               (order_id, old_status, new_status, changed_at)
        VALUES (?, 'pending', 'paid', UTC_TIMESTAMP())
        `,
        [orderId]
      );
    } catch (e) {
      await logWarn(
        `[${traceId}] Historisation statut echouee: ${e.message || e}`,
        'webhook'
      );
    }

    // H) Verrouiller le panier (seulement si transition)
    try {
      const cartIdFromStripe = session.metadata?.cart_id || null;
      if (cartIdFromStripe) {
        await db.execute(
          `
          UPDATE carts
             SET status = 'ordered',
                 updated_at = UTC_TIMESTAMP()
           WHERE id = ?
             AND status = 'open'
          `,
          [cartIdFromStripe]
        );
      }
    } catch (e) {
      await logWarn(
        `[${traceId}] Impossible de verrouiller le panier: ${e?.message || e}`,
        'webhook'
      );
    }

    // I) abandoned_carts recupere
    try {
      await markAbandonedRecovered({
        sessionId: session.id,
        email: customer_email,
        req
      });
    } catch (e) {
      await logWarn(
        `[${traceId}] markAbandonedRecovered a echoue: ${e?.message || e}`,
        'webhook'
      );
    }

    // J) Printful automatique (optionnel; meme perimetre qu'avant: apres fallback items)
    if (
      usedFallbackItems &&
      process.env.PRINTFUL_AUTOMATIC_ORDER === 'true' &&
      shippingMeta &&
      cart_items.length > 0
    ) {
      try {
        const pfSource = cart_items.map((it) => {
          const n = normalizeMetaCartItem(it);
          return {
            variant_id: n.frontVariantId || undefined,
            printful_variant_id: n.pfVariantId || undefined,
            quantity: n.qty,
            unit_price_cents: n.unitPriceCents
          };
        });
        const pfItems = await mapCartToPrintfulVariants(pfSource);
        if (pfItems && pfItems.length > 0) {
          const recipient = {
            name: shippingMeta.name,
            address1: shippingMeta.address1,
            city: shippingMeta.city,
            state_code: shippingMeta.state,
            country_code: shippingMeta.country,
            zip: shippingMeta.zip,
            email: customer_email
          };

          const result = await createPrintfulOrder({
            recipient,
            items: pfItems,
            confirm: false
          });

          if (result?.id) {
            await db.execute(
              `
              UPDATE orders
                 SET printful_order_id = ?
               WHERE id = ?
              `,
              [result.id, orderId]
            );
            await logInfo(
              `[${traceId}] Printful order lie: ${result.id}`,
              'webhook'
            );
          } else {
            await logWarn(
              `[${traceId}] Reponse Printful sans id: ${JSON.stringify(result)}`,
              'webhook'
            );
          }
        } else {
          await logWarn(
            `[${traceId}] mapCartToPrintfulVariants → 0 item`,
            'webhook'
          );
        }
      } catch (err) {
        await logError(
          `[${traceId}] Erreur envoi Printful: ${
            err?.response?.data || err?.message || String(err)
          }`,
          'webhook'
        );
      }
    }

    // K) Log final + upsert stripe_events
    await upsertStripeEvent(event, req, orderId);

    await logInfo(
      `[${traceId}] checkout.session.completed → order #${orderId} marque PAID`,
      'webhook'
    );

    return res.json({ received: true, orderId });
  }

  // 5. Tous les autres événements Stripe → on les loggue seulement
  await upsertStripeEvent(event, req, null);
  await logInfo(`[${traceId}] Event ignore: ${event.type}`, 'webhook');
  return res.json({ received: true });
}

export { handleStripeWebhook };
