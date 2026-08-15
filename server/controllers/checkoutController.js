import Stripe from 'stripe';
import axios from 'axios';
import { getPool } from '../db.js';
import jwt from 'jsonwebtoken';

function sanitizeBaseUrl(req) {
  const clean = (u) =>
    String(u)
      .trim()
      .replace(/^["']|["']$/g, '')
      .replace(/\/+$/, '');
  const valid = (u) => /^https?:\/\/\S+$/i.test(String(u || ''));

  let envRaw = process.env.FRONTEND_URL || '';
  if (envRaw.includes(',')) envRaw = envRaw.split(',')[0];
  const envClean = clean(envRaw);
  if (envClean && valid(envClean)) return envClean;

  const originClean = clean(req.headers?.origin || '');
  if (originClean && valid(originClean)) return originClean;

  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http')
    .split(',')[0]
    .trim();
  const host = (req.headers['x-forwarded-host'] || req.get('host') || '')
    .split(',')[0]
    .trim();
  const guess = clean(`${proto}://${host}`);
  if (valid(guess)) return guess;

  return 'http://localhost:3000';
}

function filterHttpImages(arr) {
  if (!Array.isArray(arr)) return [];
  const isHttp = (u) => /^https?:\/\/\S+$/i.test(String(u || ''));
  return arr.map(String).filter(isHttp).slice(0, 8);
}

const isProd = process.env.NODE_ENV === 'production';

function signAccess(payload) {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_TTL || '15m',
    algorithm: 'HS256'
  });
}

const cookieOptsAccess = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProd,
  maxAge: 1000 * 60 * 60,
  path: '/'
};

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SK || '';
const stripe = STRIPE_KEY ? new Stripe(STRIPE_KEY) : null;

/**
 * Entier positif strict (PK / quantité).
 * Refuse 12abc, 1.5, 0, négatifs, NaN, Infinity et les booléens.
 */
function parsePositiveSafeInteger(value) {
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

function officialPriceToCents(price) {
  if (price == null || price === '') return null;
  const n =
    typeof price === 'number'
      ? price
      : Number(String(price).replace(',', '.').trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  const cents = Math.round(n * 100);
  if (!Number.isSafeInteger(cents) || cents <= 0) return null;
  return cents;
}

function canAddCents(left, right) {
  if (!Number.isSafeInteger(left) || !Number.isSafeInteger(right)) return false;
  if (right > Number.MAX_SAFE_INTEGER - left) return false;
  return Number.isSafeInteger(left + right);
}

const MAX_SHIPPING_RATE_ID_LENGTH = 128;
const MAX_CART_LINES = 20;
const MAX_QUANTITY_PER_LINE = 20;
const MAX_EMAIL_LENGTH = 100;
const MAX_SHIPPING_NAME_LENGTH = 100;
const MAX_SHIPPING_ADDRESS1_LENGTH = 200;
const MAX_SHIPPING_CITY_LENGTH = 100;
const MAX_SHIPPING_STATE_LENGTH = 2;
const MAX_SHIPPING_COUNTRY_LENGTH = 2;
const MAX_SHIPPING_ZIP_LENGTH = 10;

function parseShippingRateId(rawShippingRate) {
  if (
    !rawShippingRate ||
    typeof rawShippingRate !== 'object' ||
    Array.isArray(rawShippingRate)
  ) {
    return null;
  }
  const value = rawShippingRate.id;
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const trimmed = String(value).trim();
  if (!trimmed || trimmed.length > MAX_SHIPPING_RATE_ID_LENGTH) return null;
  return trimmed;
}

function normalizeShippingField(value) {
  if (value == null) return '';
  return String(value).trim();
}

/** Montant Printful (dollars) → cents. Refuse 12abc, négatif, NaN, Infinity. */
function printfulRateToCents(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) return null;
    if (value > Number.MAX_SAFE_INTEGER / 100) return null;
    const cents = Math.round(value * 100);
    if (!Number.isSafeInteger(cents) || cents < 0) return null;
    return cents;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0) return null;
    if (n > Number.MAX_SAFE_INTEGER / 100) return null;
    const cents = Math.round(n * 100);
    if (!Number.isSafeInteger(cents) || cents < 0) return null;
    return cents;
  }
  return null;
}

function pickCart(raw) {
  if (!raw || typeof raw !== 'object') return [];
  if (Array.isArray(raw.cart)) return raw.cart;
  if (Array.isArray(raw.items)) return raw.items;
  if (Array.isArray(raw.lineItems)) return raw.lineItems;
  if (Array.isArray(raw.cartItems)) return raw.cartItems;
  if (raw.data && Array.isArray(raw.data.cart)) return raw.data.cart;
  return [];
}

const IDEMPOTENCY_KEY_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function parseIdempotencyKey(rawKey) {
  const key = String(rawKey ?? '')
    .trim()
    .toLowerCase();
  if (!IDEMPOTENCY_KEY_RE.test(key)) return null;
  return key;
}

function isMysqlDuplicateKey(err) {
  return err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062;
}

async function findExistingCheckoutAttempt(pool, idempotencyKey) {
  const [[row]] = await pool.query(
    `
    SELECT
      o.id,
      o.status,
      o.stripe_session_id,
      o.client_reference_id
    FROM checkout_idempotency ci
    JOIN orders o ON o.id = ci.order_id
    WHERE ci.idempotency_key = ?
    LIMIT 1
    `,
    [idempotencyKey]
  );
  return row || null;
}

async function respondWithExistingCheckoutAttempt({
  stripeClient,
  res,
  existing
}) {
  if (existing.status !== 'pending') {
    console.warn(
      `[checkout] idempotency reuse skipped: order #${existing.id} not pending`
    );
    return res.status(409).json({
      error: 'Cette tentative de paiement n’est plus ouverte.',
      code: 'CHECKOUT_NO_LONGER_OPEN'
    });
  }

  if (!existing.stripe_session_id) {
    res.set('Retry-After', '2');
    return res.status(409).json({
      error: 'Tentative de paiement en cours. Réessaie dans quelques instants.',
      code: 'CHECKOUT_IN_PROGRESS'
    });
  }

  try {
    const session = await stripeClient.checkout.sessions.retrieve(
      String(existing.stripe_session_id)
    );
    if (session?.status === 'open' && session.url) {
      return res.status(200).json({
        id: session.id,
        url: session.url,
        reused: true
      });
    }
    return res.status(409).json({
      error: 'Cette session de paiement n’est plus ouverte.',
      code: 'CHECKOUT_NO_LONGER_OPEN'
    });
  } catch (e) {
    console.warn(
      `[checkout] stripe session retrieve failed for order #${existing.id}:`,
      e?.message
    );
    return res.status(502).json({
      error: 'Impossible de récupérer la session de paiement.',
      code: 'CHECKOUT_SESSION_LOOKUP_FAILED'
    });
  }
}

/*
██████████████████████████████████████████████████████████████████████
INVARIANTS CRITIQUES CHECKOUT – NE PAS CASSER
----------------------------------------------------------------------

1. L'identité utilisateur vient EXCLUSIVEMENT des cookies httpOnly
   (`access` / `refresh`). On ignore tout "userId" envoyé par le front.

2. On crée la commande en DB AVANT Stripe (snapshots immuables + items).

3. On crée ENSUITE la session Stripe et on lie stripe_session_id à l'ordre.
   Pas de lock panier ici.

4. Le lock panier + passage à 'paid' est fait UNIQUEMENT par le webhook.

5. Ici: jamais de status 'paid' ni de paid_at.
██████████████████████████████████████████████████████████████████████
*/

export const createCheckoutSession = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({
        error: 'STRIPE_SECRET_KEY manquant dans server/.env',
        code: 'STRIPE_KEY_MISSING'
      });
    }

    // Auth optionnelle : un checkout invité continue avec userId = null.
    // Identité uniquement via cookies httpOnly (jamais via req.body).
    // Un JWT valide fournit seulement un candidat ; le compte est relu en DB.
    let userId = null;
    let candidateUserId = null;
    let identityFromRefresh = false;
    const access = req.cookies?.access;
    if (access) {
      try {
        const payload = jwt.verify(access, process.env.JWT_ACCESS_SECRET, {
          algorithms: ['HS256']
        });
        candidateUserId = payload?.sub ?? null;
      } catch {
        // access absent/expiré/invalide → tenter refresh si présent
      }
    }
    if (candidateUserId == null) {
      const refresh = req.cookies?.refresh;
      if (refresh) {
        try {
          const r = jwt.verify(refresh, process.env.JWT_REFRESH_SECRET, {
            algorithms: ['HS256']
          });
          candidateUserId = r?.sub ?? null;
          if (candidateUserId != null) {
            identityFromRefresh = true;
          }
        } catch {
          // refresh invalide → checkout invité
          candidateUserId = null;
        }
      }
    }

    const FRONTEND_URL = sanitizeBaseUrl(req);
    const raw = req.body || {};
    const idempotencyKey = parseIdempotencyKey(raw.idempotency_key);
    if (!idempotencyKey) {
      return res.status(400).json({
        error: 'Clé d’idempotence invalide.',
        code: 'INVALID_IDEMPOTENCY_KEY'
      });
    }

    const pool = await getPool();
    if (candidateUserId != null) {
      const [rows] = await pool.query(
        `SELECT id, email, role FROM customers WHERE id = ? LIMIT 1`,
        [candidateUserId]
      );
      if (rows.length) {
        userId = rows[0].id;
        if (identityFromRefresh) {
          const newAccess = signAccess({
            sub: rows[0].id,
            email: rows[0].email,
            role: rows[0].role
          });
          res.cookie('access', newAccess, cookieOptsAccess);
        }
      } else {
        userId = null;
      }
    }
    let existingAttempt;
    try {
      existingAttempt = await findExistingCheckoutAttempt(
        pool,
        idempotencyKey
      );
    } catch (e) {
      console.warn('[checkout] idempotency lookup failed:', e?.message);
      return res.status(500).json({
        error: 'Impossible de vérifier la tentative de paiement.',
        code: 'CHECKOUT_IDEMPOTENCY_LOOKUP_FAILED'
      });
    }
    if (existingAttempt) {
      return respondWithExistingCheckoutAttempt({
        stripeClient: stripe,
        res,
        existing: existingAttempt
      });
    }

    const cart = pickCart(raw);

    if (!Array.isArray(cart) || cart.length === 0) {
      return res
        .status(400)
        .json({ error: 'Panier vide.', code: 'EMPTY_CART' });
    }

    if (cart.length > MAX_CART_LINES) {
      return res.status(400).json({
        error: 'Le panier contient trop d’articles.',
        code: 'CART_TOO_LARGE'
      });
    }

    // 2) Normaliser / valider chaque ligne AVANT toute écriture (PK + quantité).
    //    Prix, Stripe Price ID et autres montants client sont ignorés.
    const parsedLines = [];
    const seenVariantPks = new Set();

    for (const it of cart) {
      if (!it || typeof it !== 'object' || Array.isArray(it)) {
        return res.status(400).json({
          error: 'Référence de variante invalide.',
          code: 'INVALID_VARIANT_REF'
        });
      }

      const dbVariantId = parsePositiveSafeInteger(
        it.db_variant_id ?? it.id
      );
      if (dbVariantId == null) {
        return res.status(400).json({
          error: 'Référence de variante invalide.',
          code: 'INVALID_VARIANT_REF'
        });
      }

      const quantity = parsePositiveSafeInteger(it.quantity ?? it.qty);
      if (quantity == null) {
        return res.status(400).json({
          error: 'Quantité invalide.',
          code: 'INVALID_QUANTITY'
        });
      }
      if (quantity > MAX_QUANTITY_PER_LINE) {
        return res.status(400).json({
          error: 'Quantité maximale dépassée pour un article.',
          code: 'QUANTITY_LIMIT_EXCEEDED'
        });
      }

      if (seenVariantPks.has(dbVariantId)) {
        return res.status(400).json({
          error: 'Variante dupliquée dans le panier.',
          code: 'DUPLICATE_VARIANT'
        });
      }
      seenVariantPks.add(dbVariantId);

      parsedLines.push({ dbVariantId, quantity });
    }

    const requestedIds = parsedLines.map((line) => line.dbVariantId);
    const placeholders = requestedIds.map(() => '?').join(',');
    const [variantRows] = await pool.query(
      `
      SELECT
        pv.id,
        pv.product_id,
        pv.variant_id,
        pv.printful_variant_id,
        pv.price,
        pv.is_active,
        pv.sku,
        pv.color,
        pv.size,
        pv.image,
        p.name AS product_name,
        p.is_visible
      FROM product_variants pv
      INNER JOIN products p ON p.id = pv.product_id
      WHERE pv.id IN (${placeholders})
      `,
      requestedIds
    );

    const variantById = new Map();
    for (const row of variantRows) {
      variantById.set(Number(row.id), row);
    }

    const normalizedLines = [];
    for (const parsed of parsedLines) {
      const row = variantById.get(parsed.dbVariantId);
      if (!row) {
        return res.status(400).json({
          error: 'Variante indisponible.',
          code: 'VARIANT_UNAVAILABLE'
        });
      }

      if (Number(row.is_active) !== 1 || Number(row.is_visible) !== 1) {
        return res.status(400).json({
          error: 'Variante indisponible.',
          code: 'VARIANT_UNAVAILABLE'
        });
      }

      const unitPriceCents = officialPriceToCents(row.price);
      if (unitPriceCents == null) {
        return res.status(400).json({
          error: 'Prix officiel invalide.',
          code: 'INVALID_OFFICIAL_PRICE'
        });
      }

      if (unitPriceCents > Number.MAX_SAFE_INTEGER / parsed.quantity) {
        return res.status(400).json({
          error: 'Montant hors limites.',
          code: 'AMOUNT_OVERFLOW'
        });
      }

      const lineCents = unitPriceCents * parsed.quantity;
      if (!Number.isSafeInteger(lineCents)) {
        return res.status(400).json({
          error: 'Montant hors limites.',
          code: 'AMOUNT_OVERFLOW'
        });
      }

      normalizedLines.push({
        dbVariantId: Number(row.id),
        bizVariantId: row.variant_id ?? null,
        printfulVariantId: row.printful_variant_id ?? null,
        officialPrice: Number((unitPriceCents / 100).toFixed(2)),
        unitPriceCents,
        quantity: parsed.quantity,
        lineCents,
        name: row.product_name || 'Article',
        sku: row.sku ?? null,
        color: row.color ?? null,
        size: row.size ?? null,
        image: row.image ?? null
      });
    }

    const currency = (process.env.CURRENCY || 'CAD').toUpperCase();
    const stripeCurrency = (process.env.CURRENCY || 'cad').toLowerCase();

    const line_items = normalizedLines.map((line) => {
      const imgs = filterHttpImages([line.image]);
      return {
        quantity: line.quantity,
        price_data: {
          currency: stripeCurrency,
          unit_amount: line.unitPriceCents,
          product_data: {
            name: line.name,
            ...(imgs.length ? { images: imgs } : {})
          }
        }
      };
    });

    let cartSubtotalCents = 0;
    for (const line of normalizedLines) {
      if (!canAddCents(cartSubtotalCents, line.lineCents)) {
        return res.status(400).json({
          error: 'Montant hors limites.',
          code: 'AMOUNT_OVERFLOW'
        });
      }
      cartSubtotalCents += line.lineCents;
    }

    const emailSnapshot = String(raw.customer_email ?? '')
      .trim()
      .toLowerCase();
    if (
      !emailSnapshot ||
      emailSnapshot.length > MAX_EMAIL_LENGTH ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailSnapshot)
    ) {
      return res.status(400).json({
        error: 'Adresse courriel invalide.',
        code: 'INVALID_EMAIL'
      });
    }

    const customerId = userId || null;

    const shippingNormalized = {
      name: normalizeShippingField(raw?.shipping?.name),
      address1: normalizeShippingField(raw?.shipping?.address1),
      city: normalizeShippingField(raw?.shipping?.city),
      state: normalizeShippingField(raw?.shipping?.state).toUpperCase(),
      country: normalizeShippingField(raw?.shipping?.country).toUpperCase(),
      zip: normalizeShippingField(raw?.shipping?.zip)
    };

    if (
      !shippingNormalized.name ||
      !shippingNormalized.address1 ||
      !shippingNormalized.city ||
      !shippingNormalized.state ||
      !shippingNormalized.country ||
      !shippingNormalized.zip
    ) {
      return res.status(400).json({
        error: 'Adresse de livraison incomplète.',
        code: 'INVALID_SHIPPING_ADDRESS'
      });
    }

    if (
      shippingNormalized.name.length > MAX_SHIPPING_NAME_LENGTH ||
      shippingNormalized.address1.length > MAX_SHIPPING_ADDRESS1_LENGTH ||
      shippingNormalized.city.length > MAX_SHIPPING_CITY_LENGTH ||
      shippingNormalized.state.length > MAX_SHIPPING_STATE_LENGTH ||
      shippingNormalized.country.length > MAX_SHIPPING_COUNTRY_LENGTH ||
      shippingNormalized.zip.length > MAX_SHIPPING_ZIP_LENGTH
    ) {
      return res.status(400).json({
        error: 'Un champ de l’adresse de livraison est trop long.',
        code: 'SHIPPING_FIELD_TOO_LONG'
      });
    }

    if (
      shippingNormalized.country !== 'CA' &&
      shippingNormalized.country !== 'US'
    ) {
      return res.status(400).json({
        error: 'Pays de livraison non pris en charge.',
        code: 'INVALID_SHIPPING_COUNTRY'
      });
    }

    if (shippingNormalized.state.length !== MAX_SHIPPING_STATE_LENGTH) {
      return res.status(400).json({
        error: 'Province ou État invalide.',
        code: 'INVALID_SHIPPING_STATE'
      });
    }

    const selectedShippingRateId = parseShippingRateId(raw.shipping_rate);
    if (!selectedShippingRateId) {
      return res.status(400).json({
        error: 'Tarif de livraison invalide.',
        code: 'INVALID_SHIPPING_RATE'
      });
    }

    const printfulItems = [];
    for (const line of normalizedLines) {
      const bizVariantId = parsePositiveSafeInteger(line.bizVariantId);
      if (bizVariantId == null) {
        return res.status(400).json({
          error: 'Variante Printful invalide.',
          code: 'INVALID_PRINTFUL_VARIANT'
        });
      }
      printfulItems.push({
        variant_id: bizVariantId,
        quantity: line.quantity
      });
    }

    if (!process.env.PRINTFUL_API_KEY || !process.env.PRINTFUL_STORE_ID) {
      return res.status(500).json({
        error: 'Configuration de livraison indisponible.',
        code: 'SHIPPING_CONFIG_MISSING'
      });
    }

    let printfulRates;
    try {
      const printfulResp = await axios.post(
        'https://api.printful.com/shipping/rates',
        {
          recipient: {
            name: shippingNormalized.name,
            address1: shippingNormalized.address1,
            city: shippingNormalized.city,
            state_code: shippingNormalized.state,
            country_code: shippingNormalized.country,
            zip: shippingNormalized.zip,
            email: emailSnapshot || ''
          },
          items: printfulItems
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
            'X-PF-Store-Id': process.env.PRINTFUL_STORE_ID
          }
        }
      );
      printfulRates = printfulResp.data?.result;
    } catch (e) {
      console.warn('[checkout] Printful shipping rates failed:', e?.message);
      return res.status(502).json({
        error: 'Impossible de valider le tarif de livraison.',
        code: 'SHIPPING_RATE_LOOKUP_FAILED'
      });
    }

    if (!Array.isArray(printfulRates)) {
      return res.status(502).json({
        error: 'Impossible de valider le tarif de livraison.',
        code: 'SHIPPING_RATE_LOOKUP_FAILED'
      });
    }

    const matchedRate = printfulRates.find(
      (rate) => rate && String(rate.id) === selectedShippingRateId
    );
    if (!matchedRate) {
      return res.status(400).json({
        error: 'Le tarif de livraison sélectionné n’est plus disponible.',
        code: 'SHIPPING_RATE_UNAVAILABLE'
      });
    }

    const shippingName =
      typeof matchedRate.name === 'string' ? matchedRate.name.trim() : '';
    if (!shippingName) {
      return res.status(502).json({
        error: 'Impossible de valider le tarif de livraison.',
        code: 'SHIPPING_RATE_LOOKUP_FAILED'
      });
    }

    const shippingCents = printfulRateToCents(matchedRate.rate);
    if (shippingCents == null) {
      return res.status(502).json({
        error: 'Impossible de valider le tarif de livraison.',
        code: 'SHIPPING_RATE_LOOKUP_FAILED'
      });
    }

    if (!canAddCents(cartSubtotalCents, shippingCents)) {
      return res.status(400).json({
        error: 'Montant hors limites.',
        code: 'AMOUNT_OVERFLOW'
      });
    }
    const totalCents = cartSubtotalCents + shippingCents;

    // 4) Commande pending + idempotency + items + history — transaction dédiée
    let orderId = null;
    let conn = null;
    let reuseExistingAttempt = false;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      const [ins] = await conn.query(
        `INSERT INTO orders
         (customer_email, customer_id, status,
          subtotal_cents, shipping_cents, total_cents,
          shipping_cost, total, currency,
          email_snapshot, shipping_name_snapshot, shipping_address_snapshot,
          created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          emailSnapshot || null,
          customerId,
          'pending',
          cartSubtotalCents,
          shippingCents,
          totalCents,
          (shippingCents / 100).toFixed(2),
          (totalCents / 100).toFixed(2),
          currency,
          emailSnapshot || null,
          shippingNormalized.name || null,
          JSON.stringify(shippingNormalized)
        ]
      );
      orderId = ins.insertId;
      if (!orderId) {
        throw new Error('ORDER_INIT_FAILED');
      }

      try {
        await conn.query(
          `INSERT INTO checkout_idempotency
                 (idempotency_key, order_id)
           VALUES (?, ?)`,
          [idempotencyKey, orderId]
        );
      } catch (e) {
        if (isMysqlDuplicateKey(e)) {
          reuseExistingAttempt = true;
        }
        throw e;
      }

      for (const line of normalizedLines) {
        const metaPayload = {
          name: line.name,
          sku: line.sku,
          color: line.color,
          size: line.size,
          image: line.image,
          source: 'checkoutController'
        };

        await conn.query(
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
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            orderId,
            line.dbVariantId,
            line.printfulVariantId,
            line.quantity,
            (line.unitPriceCents / 100).toFixed(2),
            line.unitPriceCents,
            JSON.stringify(metaPayload)
          ]
        );
      }

      await conn.query(
        `INSERT INTO order_status_history
         (order_id, old_status, new_status, changed_at)
         VALUES (?, ?, ?, NOW())`,
        [orderId, 'init', 'pending']
      );

      await conn.commit();
    } catch (e) {
      if (conn) {
        try {
          await conn.rollback();
        } catch (rollbackError) {
          console.warn(
            '[checkout] order init rollback failed:',
            rollbackError?.message
          );
        }
      }
      if (!reuseExistingAttempt) {
        console.warn('[checkout] order init transaction failed:', e?.message);
        return res.status(500).json({
          error:
            "Impossible de créer l'ordre 'pending' avec snapshots avant Stripe.",
          code: 'ORDER_INIT_FAILED'
        });
      }
    } finally {
      if (conn) {
        conn.release();
      }
    }

    if (reuseExistingAttempt) {
      let existingAfterConflict;
      try {
        existingAfterConflict = await findExistingCheckoutAttempt(
          pool,
          idempotencyKey
        );
      } catch (e) {
        console.warn('[checkout] idempotency lookup failed:', e?.message);
        return res.status(500).json({
          error: 'Impossible de vérifier la tentative de paiement.',
          code: 'CHECKOUT_IDEMPOTENCY_LOOKUP_FAILED'
        });
      }
      if (!existingAfterConflict) {
        res.set('Retry-After', '2');
        return res.status(409).json({
          error:
            'Tentative de paiement en cours. Réessaie dans quelques instants.',
          code: 'CHECKOUT_IN_PROGRESS'
        });
      }
      return respondWithExistingCheckoutAttempt({
        stripeClient: stripe,
        res,
        existing: existingAfterConflict
      });
    }

    // 5) Stripe customer enrichi
    let stripeCustomerId = null;
    try {
      const existing = emailSnapshot
        ? await stripe.customers.list({ email: emailSnapshot, limit: 1 })
        : { data: [] };

      if (existing.data.length) {
        stripeCustomerId = existing.data[0].id;
        await stripe.customers.update(stripeCustomerId, {
          name: shippingNormalized.name || undefined,
          address: {
            line1: shippingNormalized.address1 || undefined,
            city: shippingNormalized.city || undefined,
            state: shippingNormalized.state || undefined,
            postal_code: shippingNormalized.zip || undefined,
            country: shippingNormalized.country || undefined
          },
          shipping: {
            name: shippingNormalized.name || undefined,
            address: {
              line1: shippingNormalized.address1 || undefined,
              city: shippingNormalized.city || undefined,
              state: shippingNormalized.state || undefined,
              postal_code: shippingNormalized.zip || undefined,
              country: shippingNormalized.country || undefined
            }
          }
        });
      } else {
        const c = await stripe.customers.create({
          email: emailSnapshot || undefined,
          name: shippingNormalized.name || undefined,
          address: {
            line1: shippingNormalized.address1 || undefined,
            city: shippingNormalized.city || undefined,
            state: shippingNormalized.state || undefined,
            postal_code: shippingNormalized.zip || undefined,
            country: shippingNormalized.country || undefined
          },
          shipping: {
            name: shippingNormalized.name || undefined,
            address: {
              line1: shippingNormalized.address1 || undefined,
              city: shippingNormalized.city || undefined,
              state: shippingNormalized.state || undefined,
              postal_code: shippingNormalized.zip || undefined,
              country: shippingNormalized.country || undefined
            }
          }
        });
        stripeCustomerId = c.id;
      }

      await pool.query(
        `UPDATE orders
         SET stripe_customer_id = ?
         WHERE id = ?`,
        [stripeCustomerId, orderId]
      );
    } catch (e) {
      console.warn('[checkout] stripe customer upsert skipped:', e?.message);
    }

    // 6) Création de la session Stripe
    const metadataCartItems = normalizedLines.map((line) => ({
      id: line.dbVariantId,
      variant_id: line.bizVariantId,
      printful_variant_id: line.printfulVariantId,
      quantity: line.quantity,
      unit_price_cents: line.unitPriceCents,
      price: line.officialPrice,
      sku: line.sku,
      name: line.name
    }));

    const metadataShipping = {
      name: shippingNormalized.name || '',
      address1: shippingNormalized.address1 || '',
      city: shippingNormalized.city || '',
      state: shippingNormalized.state || '',
      country: shippingNormalized.country || '',
      zip: shippingNormalized.zip || '',
      email: emailSnapshot || ''
    };

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items,
        success_url: `${FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${FRONTEND_URL}/checkout/cancel`,
        shipping_address_collection: { allowed_countries: ['CA', 'US'] },
        customer: stripeCustomerId || undefined,
        customer_update: { address: 'auto', shipping: 'auto', name: 'auto' },
        client_reference_id: String(orderId),
        shipping_options:
          shippingCents > 0
            ? [
                {
                  shipping_rate_data: {
                    type: 'fixed_amount',
                    display_name: shippingName,
                    fixed_amount: {
                      amount: shippingCents,
                      currency: currency.toLowerCase()
                    }
                  }
                }
              ]
            : undefined,
        metadata: {
          source: 'flippin-maple',
          order_id: String(orderId),
          shipping_rate: JSON.stringify({
            id: selectedShippingRateId,
            name: shippingName,
            shipping_cents: shippingCents
          }),
          shipping: JSON.stringify(metadataShipping),
          cart_items: JSON.stringify(metadataCartItems)
        }
      },
      { idempotencyKey }
    );

    // 7) Lier la session Stripe à la commande (+ miroir client_reference_id)
    await pool.query(
      `UPDATE orders
       SET stripe_session_id = ?, client_reference_id = ?
       WHERE id = ?`,
      [session.id, String(orderId), orderId]
    );

    return res.status(200).json({ id: session.id, url: session.url });
  } catch (err) {
    console.error('[checkout] create session error:', {
      type: err?.type,
      message: err?.message,
      code: err?.code,
      param: err?.param,
      raw: err?.raw
    });
    const clientMessage =
      err?.raw?.message || err?.message || 'Erreur inconnue côté Stripe.';
    return res.status(500).json({
      error: 'Erreur lors de la création de la session.',
      code: 'STRIPE_CREATE_FAILED',
      stripe_message: clientMessage,
      stripe_type: err?.type || null,
      stripe_code: err?.code || null,
      stripe_param: err?.param || null
    });
  }
};
