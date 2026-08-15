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

/**
 * Entier positif strict. Refuse 12abc, 1.5, 0, négatifs, NaN, Infinity, booléens.
 */
function parsePositiveSafeInteger(value) {
  if (typeof value === 'bigint') {
    if (value <= 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) return null;
    return Number(value);
  }
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value <= 0 || !Number.isSafeInteger(value)) {
      return null;
    }
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^[1-9]\d*$/.test(trimmed)) return null;
    const n = Number(trimmed);
    if (!Number.isSafeInteger(n) || n <= 0) return null;
    return n;
  }
  return null;
}

/** Entier sûr >= 0 (ex. orders.subtotal_cents). */
function parseNonNegativeSafeInteger(value) {
  if (typeof value === 'bigint') {
    if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) return null;
    return Number(value);
  }
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 0 || !Number.isSafeInteger(value)) {
      return null;
    }
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    const n = Number(trimmed);
    if (!Number.isSafeInteger(n) || n < 0) return null;
    return n;
  }
  return null;
}

function canAddCents(left, right) {
  if (!Number.isSafeInteger(left) || !Number.isSafeInteger(right)) return false;
  if (right > Number.MAX_SAFE_INTEGER - left) return false;
  return Number.isSafeInteger(left + right);
}

/**
 * Snapshot checkout (nouveau format serveur uniquement).
 * Aucun fallback vers price / unit_price / unitPrice / qty / identifiants ambiguës.
 */
function normalizeMetaCartItem(it) {
  if (!it || typeof it !== 'object' || Array.isArray(it)) {
    throw new Error('INVALID_META_CART_ITEM');
  }

  const dbVariantId = parsePositiveSafeInteger(it.id);
  const bizVariantId = parsePositiveSafeInteger(it.variant_id);
  const quantity = parsePositiveSafeInteger(it.quantity);
  const unitPriceCents = parsePositiveSafeInteger(it.unit_price_cents);

  if (
    dbVariantId == null ||
    bizVariantId == null ||
    quantity == null ||
    unitPriceCents == null
  ) {
    throw new Error('INVALID_META_CART_ITEM');
  }

  let printfulVariantId = null;
  const rawPrintfulId = it.printful_variant_id;
  const printfulProvided =
    rawPrintfulId != null &&
    !(typeof rawPrintfulId === 'string' && rawPrintfulId.trim() === '');
  if (printfulProvided) {
    printfulVariantId = parsePositiveSafeInteger(rawPrintfulId);
    if (printfulVariantId == null) {
      throw new Error('INVALID_META_CART_ITEM');
    }
  }

  return {
    dbVariantId,
    bizVariantId,
    printfulVariantId,
    quantity,
    unitPriceCents,
    name: it.name ?? null,
    sku: it.sku ?? null
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
  let normalizedItems;
  try {
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      throw new Error('EMPTY_OR_INVALID_CART_ITEMS');
    }

    normalizedItems = cartItems.map((it) => normalizeMetaCartItem(it));

    const seenPks = new Set();
    for (const item of normalizedItems) {
      if (seenPks.has(item.dbVariantId)) {
        throw new Error('DUPLICATE_VARIANT_PK');
      }
      seenPks.add(item.dbVariantId);
    }
  } catch (e) {
    await logError(
      `[${traceId}] Fallback insert order_items failed: ${e?.message || e}`,
      'webhook'
    );
    return false;
  }

  let conn = null;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    const [orderRows] = await conn.query(
      `SELECT subtotal_cents FROM orders WHERE id = ? FOR UPDATE`,
      [orderId]
    );
    if (!orderRows.length) {
      throw new Error('ORDER_NOT_FOUND_FOR_FALLBACK');
    }

    const orderSubtotalCents = parseNonNegativeSafeInteger(
      orderRows[0].subtotal_cents
    );
    if (orderSubtotalCents == null) {
      throw new Error('INVALID_ORDER_SUBTOTAL');
    }

    const [existingItems] = await conn.query(
      `SELECT id FROM order_items WHERE order_id = ? LIMIT 1`,
      [orderId]
    );
    if (existingItems.length > 0) {
      throw new Error('ORDER_ITEMS_ALREADY_EXIST');
    }

    const requestedIds = normalizedItems.map((item) => item.dbVariantId);
    const placeholders = requestedIds.map(() => '?').join(',');
    const [variantRows] = await conn.query(
      `
      SELECT id, variant_id, printful_variant_id
        FROM product_variants
       WHERE id IN (${placeholders})
      `,
      requestedIds
    );

    const variantById = new Map();
    for (const row of variantRows) {
      const pk = parsePositiveSafeInteger(row.id);
      if (pk == null) {
        throw new Error('INVALID_DB_VARIANT_PK');
      }
      variantById.set(pk, row);
    }

    let reconstructedSubtotal = 0;
    const preparedItems = [];

    for (const item of normalizedItems) {
      const row = variantById.get(item.dbVariantId);
      if (!row) {
        throw new Error('VARIANT_NOT_FOUND');
      }

      const rowPk = parsePositiveSafeInteger(row.id);
      if (rowPk == null || rowPk !== item.dbVariantId) {
        throw new Error('VARIANT_PK_MISMATCH');
      }

      const rowBizId = parsePositiveSafeInteger(row.variant_id);
      if (rowBizId == null || rowBizId !== item.bizVariantId) {
        throw new Error('VARIANT_BIZ_ID_MISMATCH');
      }

      if (item.printfulVariantId != null) {
        const rowPfId = parsePositiveSafeInteger(row.printful_variant_id);
        if (rowPfId == null || rowPfId !== item.printfulVariantId) {
          throw new Error('VARIANT_PRINTFUL_ID_MISMATCH');
        }
      }

      if (item.unitPriceCents > Number.MAX_SAFE_INTEGER / item.quantity) {
        throw new Error('AMOUNT_OVERFLOW');
      }
      const lineCents = item.unitPriceCents * item.quantity;
      if (!Number.isSafeInteger(lineCents)) {
        throw new Error('AMOUNT_OVERFLOW');
      }
      if (!canAddCents(reconstructedSubtotal, lineCents)) {
        throw new Error('AMOUNT_OVERFLOW');
      }
      reconstructedSubtotal += lineCents;

      preparedItems.push({
        dbVariantId: rowPk,
        printfulVariantId: row.printful_variant_id ?? null,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        priceAtPurchase: (item.unitPriceCents / 100).toFixed(2),
        name: item.name,
        sku: item.sku
      });
    }

    if (reconstructedSubtotal !== orderSubtotalCents) {
      throw new Error('SUBTOTAL_MISMATCH');
    }

    for (const line of preparedItems) {
      await conn.execute(
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
          line.dbVariantId,
          line.printfulVariantId,
          line.quantity,
          line.priceAtPurchase,
          line.unitPriceCents,
          JSON.stringify({
            name: line.name,
            sku: line.sku,
            note: 'inserted from stripe webhook (fallback mode)',
            source: 'webhookController.fallback'
          })
        ]
      );
    }

    await conn.commit();
    return true;
  } catch (e) {
    if (conn) {
      try {
        await conn.rollback();
      } catch {
        /* keep original error */
      }
    }
    await logError(
      `[${traceId}] Fallback insert order_items failed: ${e?.message || e}`,
      'webhook'
    );
    return false;
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

async function releaseEventIdempotence(db, eventId) {
  try {
    await db.query(`DELETE FROM stripe_events WHERE event_id = ?`, [eventId]);
  } catch {
    /* ignore */
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
 * Résoudre quelle commande peut passer à 'paid' à partir de la session Stripe.
 * Autorité : stripe_session_id exact, puis order_id corroboré. Jamais l'email.
 */
async function resolveOrderIdFromSession({ db, session }) {
  const sessionId = String(session.id);

  const [[byStripeSession]] = await db.query(
    `
    SELECT id, shipping_cost
      FROM orders
     WHERE stripe_session_id = ?
     LIMIT 1
    `,
    [sessionId]
  );

  if (byStripeSession) {
    return {
      orderId: byStripeSession.id,
      prevShippingCost: byStripeSession.shipping_cost
    };
  }

  const clientRefId = parsePositiveSafeInteger(session.client_reference_id);
  const metadataOrderId = parsePositiveSafeInteger(session.metadata?.order_id);

  if (session.client_reference_id != null && session.client_reference_id !== '') {
    if (clientRefId == null) {
      await logWarn(
        '[webhook] resolveOrderIdFromSession: client_reference_id invalide',
        'webhook'
      );
    }
  }
  if (
    session.metadata?.order_id != null &&
    session.metadata.order_id !== ''
  ) {
    if (metadataOrderId == null) {
      await logWarn(
        '[webhook] resolveOrderIdFromSession: metadata.order_id invalide',
        'webhook'
      );
    }
  }

  let candidateId = null;
  if (clientRefId != null && metadataOrderId != null) {
    if (clientRefId !== metadataOrderId) {
      await logError(
        '[webhook] resolveOrderIdFromSession: client_reference_id et metadata.order_id contradictoires',
        'webhook'
      );
      return { orderId: null, prevShippingCost: null };
    }
    candidateId = clientRefId;
  } else if (clientRefId != null) {
    candidateId = clientRefId;
  } else if (metadataOrderId != null) {
    candidateId = metadataOrderId;
  }

  if (candidateId == null) {
    return { orderId: null, prevShippingCost: null };
  }

  const [[byRef]] = await db.query(
    `
    SELECT id, shipping_cost
      FROM orders
     WHERE id = ?
       AND (stripe_session_id = ? OR stripe_session_id IS NULL)
     LIMIT 1
    `,
    [candidateId, sessionId]
  );

  if (byRef) {
    return {
      orderId: byRef.id,
      prevShippingCost: byRef.shipping_cost
    };
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

  // 3. Idempotence : réserve event_id dans stripe_events (table déjà provisionnée)
  // event_id déjà présent ≠ métier terminé ; les events métier peuvent rejouer.
  const isBusinessEvent =
    event.type === 'checkout.session.expired' ||
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded';

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
      await logInfo(
        `[${traceId}] Event id deja present: ${event.type}${
          isBusinessEvent ? ' (rejeu metier)' : ' (duplicate ignore)'
        }`,
        'webhook'
      );
      if (!isBusinessEvent) {
        return res.json({ received: true, duplicate: true });
      }
    }
  } catch (e) {
    await logError(
      `[${traceId}] Unable to assert idempotence: ${e?.message || e}`,
      'webhook'
    );
    return res.status(500).json({
      received: false,
      error: 'WEBHOOK_IDEMPOTENCE_UNAVAILABLE'
    });
  }

  // 4. checkout.session.expired → pending → cancelled (stripe_session_id exact only)
  if (event.type === 'checkout.session.expired') {
    const session = event.data.object;
    const db = req.app.locals.db;

    try {
      const sessionId = String(session.id);

      await logInfo(
        `[${traceId}] Webhook checkout.session.expired pour session ${sessionId}`,
        'webhook'
      );

      const [[order]] = await db.query(
        `
        SELECT id, status
          FROM orders
         WHERE stripe_session_id = ?
         LIMIT 1
        `,
        [sessionId]
      );

      if (!order) {
        await logInfo(
          `[${traceId}] checkout.session.expired: aucune commande reliée à session ${sessionId}`,
          'webhook'
        );
        await upsertStripeEvent(event, req, null);
        return res.json({
          received: true,
          note: 'expired_order_not_found'
        });
      }

      const orderId = order.id;

      const [resUpd] = await db.execute(
        `
        UPDATE orders
           SET status = 'cancelled',
               cancelled_at = UTC_TIMESTAMP(),
               updated_at = UTC_TIMESTAMP()
         WHERE id = ?
           AND status = 'pending'
        `,
        [orderId]
      );

      if (resUpd.affectedRows !== 1) {
        await logInfo(
          `[${traceId}] checkout.session.expired: transition skipped for order #${orderId} (status=${order.status})`,
          'webhook'
        );
        await upsertStripeEvent(event, req, orderId);
        return res.json({
          received: true,
          orderId,
          note: 'expired_transition_skipped'
        });
      }

      try {
        await db.execute(
          `
          INSERT INTO order_status_history
                 (order_id, old_status, new_status, changed_at)
          VALUES (?, 'pending', 'cancelled', UTC_TIMESTAMP())
          `,
          [orderId]
        );
      } catch (e) {
        await logWarn(
          `[${traceId}] Historisation statut echouee: ${e.message || e}`,
          'webhook'
        );
      }

      await upsertStripeEvent(event, req, orderId);
      await logInfo(
        `[${traceId}] checkout.session.expired → order #${orderId} marque CANCELLED`,
        'webhook'
      );
      return res.json({ received: true, orderId });
    } catch (e) {
      await logError(
        `[${traceId}] checkout.session.expired failed: ${e?.message || e}`,
        'webhook'
      );
      await releaseEventIdempotence(db, event.id);
      return res.status(500).json({
        received: false,
        note: 'expired_processing_failed'
      });
    }
  }

  // 4. On gère l'événement clé : checkout.session.completed
  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    const session = event.data.object;

    if (
      event.type === 'checkout.session.completed' &&
      session.payment_status !== 'paid'
    ) {
      await logInfo(
        `[${traceId}] ${event.type} session ${session.id} payment_status=${session.payment_status ?? 'null'} (pas encore paid)`,
        'webhook'
      );
      await upsertStripeEvent(event, req, null);
      return res.json({
        received: true,
        note: 'payment_not_yet_paid'
      });
    }

    await logInfo(
      `[${traceId}] Webhook ${event.type} pour session ${session.id} clientRef=${session.client_reference_id || 'null'}`,
      'webhook'
    );

    const db = req.app.locals.db;

    // A) Résoudre la commande à passer en 'paid'
    let resolvedOrderId;
    let prevShippingCost;
    try {
      const resolved = await resolveOrderIdFromSession({ db, session });
      resolvedOrderId = resolved.orderId;
      prevShippingCost = resolved.prevShippingCost;
    } catch (e) {
      await logError(
        `[${traceId}] resolveOrderIdFromSession failed: ${e?.message || e}`,
        'webhook'
      );
      return res.status(500).json({
        received: false,
        error: 'WEBHOOK_ORDER_RESOLUTION_FAILED'
      });
    }

    await logInfo(
      `[${traceId}] resolveOrderIdFromSession => ${resolvedOrderId || 'NONE'}`,
      'webhook'
    );

    // Si on ne trouve pas de commande, on NE crée PAS une commande magique
    if (!resolvedOrderId) {
      await logError(
        `[${traceId}] Aucune commande resolue pour session ${session.id}. clientRef=${session.client_reference_id || 'null'}`,
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

    // D) Vérifier des order_items avant tout passage a paid (P5: plus de fallback metadata)
    let cart_items = [];
    try {
      if (session.metadata?.cart_items) {
        cart_items = JSON.parse(session.metadata.cart_items) || [];
      }
    } catch {
      /* ignore */
    }

    let hasItems = false;
    const usedFallbackItems = false;
    try {
      hasItems = await orderHasItems(db, orderId);
    } catch (e) {
      await logError(
        `[${traceId}] order_items check failed for order #${orderId}: ${e?.message || e}`,
        'webhook'
      );
      return res.status(500).json({
        received: false,
        orderId,
        error: 'WEBHOOK_ORDER_ITEMS_CHECK_FAILED'
      });
    }

    if (!hasItems) {
      await logError(
        `[${traceId}] paid blocked: no order_items for order #${orderId} (session ${session.id}); automatic metadata reconstruction disabled by P5`,
        'webhook'
      );
      return res.status(500).json({
        received: false,
        orderId,
        error: 'WEBHOOK_ORDER_ITEMS_MISSING'
      });
    }

    // E) Noyau atomique pending → paid (connexion dédiée)
    const paymentIntentId = session.payment_intent
      ? String(session.payment_intent)
      : null;

    let conn = null;
    let transitioned = false;
    let lockedStatus = null;
    try {
      conn = await db.getConnection();
      await conn.beginTransaction();

      const [[locked]] = await conn.query(
        `
        SELECT id, status
          FROM orders
         WHERE id = ?
         FOR UPDATE
        `,
        [orderId]
      );

      if (!locked) {
        throw new Error('ORDER_NOT_FOUND_FOR_PAYMENT_TX');
      }

      lockedStatus = locked.status;

      if (locked.status === 'paid' || locked.status !== 'pending') {
        await conn.rollback();
      } else {
        const [itemRows] = await conn.query(
          `SELECT id FROM order_items WHERE order_id = ? LIMIT 1`,
          [orderId]
        );
        if (!itemRows.length) {
          throw new Error('PAID_BLOCKED_NO_ORDER_ITEMS_IN_TX');
        }

        const [resUpd] = await conn.execute(
          `
          UPDATE orders
             SET status = 'paid',
                 total = ?,
                 shipping_cost = ?,
                 paid_at = UTC_TIMESTAMP(),
                 updated_at = UTC_TIMESTAMP(),
                 customer_email = COALESCE(customer_email, ?),
                 stripe_payment_intent_id = COALESCE(?, stripe_payment_intent_id)
           WHERE id = ?
             AND status = 'pending'
          `,
          [
            totalFloat,
            shipping_cost,
            customer_email,
            paymentIntentId,
            orderId
          ]
        );

        if (resUpd.affectedRows !== 1) {
          throw new Error('PAID_UPDATE_AFFECTED_ROWS');
        }

        await conn.execute(
          `
          INSERT INTO order_status_history
                 (order_id, old_status, new_status, changed_at)
          VALUES (?, 'pending', 'paid', UTC_TIMESTAMP())
          `,
          [orderId]
        );

        await conn.commit();
        transitioned = true;
      }
    } catch (e) {
      if (conn) {
        try {
          await conn.rollback();
        } catch {
          /* keep original error */
        }
      }
      await logError(
        `[${traceId}] payment tx failed for order #${orderId}: ${e?.message || e}`,
        'webhook'
      );
      return res.status(500).json({
        received: false,
        orderId,
        error: 'WEBHOOK_PAYMENT_TX_FAILED'
      });
    } finally {
      if (conn) {
        conn.release();
      }
    }

    if (!transitioned) {
      if (lockedStatus === 'paid') {
        await upsertStripeEvent(event, req, orderId);
        await logInfo(
          `[${traceId}] order #${orderId} already paid; skip rewrite`,
          'webhook'
        );
        return res.json({ received: true, orderId });
      }
      await logWarn(
        `[${traceId}] paid transition skipped for order #${orderId} (not pending)`,
        'webhook'
      );
      await upsertStripeEvent(event, req, orderId);
      return res.json({ received: true, orderId });
    }

    if (paymentIntentId) {
      await reconcileStripeEvents({
        db,
        orderId,
        sessionId: session.id,
        paymentIntentId,
        traceId
      });
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
            variant_id: n.bizVariantId || undefined,
            printful_variant_id: n.printfulVariantId || undefined,
            quantity: n.quantity,
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
