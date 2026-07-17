import Stripe from 'stripe';
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
    expiresIn: process.env.JWT_ACCESS_TTL || '15m'
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

function toCents(value) {
  if (value == null) return 0;
  const s = String(value).replace(',', '.').trim();
  const n = Number(s);
  if (!isFinite(n)) return 0;
  return Math.round(n * 100);
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

    // 1) Auth via cookies httpOnly
    let userId = null;
    try {
      const access = req.cookies?.access;
      if (!access) throw new Error('NO_ACCESS');
      const payload = jwt.verify(access, process.env.JWT_ACCESS_SECRET);
      userId = payload?.sub ?? null;
    } catch (e) {
      const refresh = req.cookies?.refresh;
      const isExpired = e?.name === 'TokenExpiredError';
      if (!refresh || (!isExpired && e?.message !== 'NO_ACCESS')) {
        return res
          .status(401)
          .json({ message: 'Session expirée. Veuillez vous reconnecter.' });
      }
      try {
        const r = jwt.verify(refresh, process.env.JWT_REFRESH_SECRET);
        userId = r?.sub ?? null;
        const newAccess = signAccess({ sub: userId });
        res.cookie('access', newAccess, cookieOptsAccess);
      } catch {
        return res
          .status(401)
          .json({ message: 'Session expirée. Veuillez vous reconnecter.' });
      }
    }

    const FRONTEND_URL = sanitizeBaseUrl(req);
    const raw = req.body || {};
    const cart = pickCart(raw);
    const cartId = raw.cartId || raw.cart_id || null;

    if (!Array.isArray(cart) || cart.length === 0) {
      return res
        .status(400)
        .json({ error: 'Panier vide.', code: 'EMPTY_CART' });
    }

    // 2) Construire les line_items Stripe + valider les prix
    const errors = [];
    const line_items = cart.map((it, idx) => {
      const qty = Math.max(1, Number(it.quantity ?? it.qty ?? 1) || 1);

      const priceId = it.priceId || it.stripePriceId || it.price_id;
      if (priceId) {
        return { price: String(priceId), quantity: qty };
      }

      const name =
        it.name || it.title || it.productName || `Article ${idx + 1}`;
      const unit_raw =
        it.unit_price ??
        it.unitPrice ??
        it.price ??
        it.amount ??
        it.subtotal_per_unit ??
        0;
      const unit_amount = toCents(unit_raw);

      if (!unit_amount || unit_amount < 0) {
        errors.push({ idx, name, reason: 'PRICE_INVALID', raw: unit_raw });
        return {
          quantity: qty,
          price_data: {
            currency: (process.env.CURRENCY || 'cad').toLowerCase(),
            unit_amount: 1,
            product_data: { name }
          }
        };
      }

      const imgs = filterHttpImages([
        it.image,
        ...(Array.isArray(it.images) ? it.images : [])
      ]);

      return {
        quantity: qty,
        price_data: {
          currency: (process.env.CURRENCY || 'cad').toLowerCase(),
          unit_amount,
          product_data: {
            name,
            ...(imgs.length ? { images: imgs } : {})
          }
        }
      };
    });

    if (errors.length) {
      return res.status(400).json({
        error: 'Certains articles ont un prix invalide.',
        code: 'BAD_LINE_ITEMS',
        details: errors
      });
    }

    // 3) Montants + snapshot adresse/email
    const currency = (process.env.CURRENCY || 'CAD').toUpperCase();

    const cartSubtotalCents = line_items.reduce((sum, li) => {
      if (li.price_data?.unit_amount && li.quantity) {
        return sum + Number(li.price_data.unit_amount) * Number(li.quantity);
      }
      return sum;
    }, 0);

    const shippingRateRaw = raw.shipping_rate?.rate ?? 0;
    const shippingCents = (() => {
      const s = String(shippingRateRaw).replace(',', '.');
      const n = Number(s);
      return Number.isFinite(n) ? Math.round(n * 100) : 0;
    })();

    const totalCents = cartSubtotalCents + shippingCents;

    const shippingNormalized = {
      name: raw?.shipping?.name || '',
      address1: raw?.shipping?.address1 || '',
      city: raw?.shipping?.city || '',
      state: raw?.shipping?.state || '',
      country: raw?.shipping?.country || '',
      zip: raw?.shipping?.zip || ''
    };

    const emailSnapshot = (raw.customer_email || '').toLowerCase();
    const customerId = userId || null;

    // 4) Créer la commande 'pending' (snapshots immuables)
    const pool = await getPool();
    let orderId = null;

    try {
      const [ins] = await pool.query(
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
    } catch (e) {
      console.warn('[checkout] orders insert skipped:', e?.message);
    }

    if (!orderId) {
      return res.status(500).json({
        error:
          "Impossible de créer l'ordre 'pending' avec snapshots avant Stripe.",
        code: 'ORDER_INIT_FAILED'
      });
    }

    // 4a) (Optionnel) Associer des IDs d'adresse si fournis
    const shippingAddressId =
      raw.shipping_address_id ?? raw.shippingAddressId ?? null;
    const billingAddressId =
      raw.billing_address_id ?? raw.billingAddressId ?? null;

    if (shippingAddressId != null || billingAddressId != null) {
      try {
        await pool.query(
          `
          UPDATE orders
             SET shipping_address_id = ?,
                 billing_address_id  = ?
           WHERE id = ?
          `,
          [shippingAddressId ?? null, billingAddressId ?? null, orderId]
        );
      } catch (e) {
        console.warn('[checkout] orders address IDs skipped:', e?.message);
      }
    }

    // 4b) Insérer les lignes order_items avec résolution de la vraie PK DB
    const requestedVariantRefs = [];
    for (const it of cart) {
      const frontVariant =
        it.db_variant_id || it.variant_id || it.variantId || null;
      if (frontVariant != null) {
        requestedVariantRefs.push(Number(frontVariant));
      }
    }

    const variantMap = new Map();
    if (requestedVariantRefs.length > 0) {
      const uniqueRefs = [...new Set(requestedVariantRefs)];
      const placeholders = uniqueRefs.map(() => '?').join(',');

      const [variantRows] = await pool.query(
        `
        SELECT
          id                  AS db_id,
          variant_id          AS biz_id,
          printful_variant_id AS pf_id
        FROM product_variants
        WHERE id IN (${placeholders})
           OR variant_id IN (${placeholders})
      `,
        [...uniqueRefs, ...uniqueRefs]
      );

      for (const row of variantRows) {
        if (row.db_id != null) {
          variantMap.set(Number(row.db_id), {
            dbId: row.db_id,
            pfId: row.pf_id
          });
        }
        if (row.biz_id != null) {
          variantMap.set(Number(row.biz_id), {
            dbId: row.db_id,
            pfId: row.pf_id
          });
        }
      }
    }

    for (const it of cart) {
      const qty = Math.max(1, Number(it.quantity ?? it.qty ?? 1) || 1);

      const unitPriceCents = toCents(
        it.unit_price ??
          it.unitPrice ??
          it.price ??
          it.amount ??
          it.subtotal_per_unit ??
          0
      );

      const rawVariantRef =
        it.db_variant_id || it.variant_id || it.variantId || null;

      const mapEntry =
        rawVariantRef != null ? variantMap.get(Number(rawVariantRef)) : null;

      const dbVariantId = mapEntry?.dbId || null;

      const effectivePrintfulId =
        it.printful_variant_id ||
        it.printfulVariantId ||
        mapEntry?.pfId ||
        null;

      if (!dbVariantId) {
        return res.status(400).json({
          error:
            'Variante introuvable en base pour un article du panier. Transaction stoppée.',
          code: 'VARIANT_NOT_FOUND_FOR_ORDER_ITEM_FK',
          item: it
        });
      }

      // Storefront metadata snapshot
      const metaPayload = {
        name: it.name ?? it.title ?? it.productName ?? null,
        sku: it.sku ?? null,
        color: it.color ?? it.colour ?? null,
        size: it.size ?? null,
        image: it.image ?? null,
        images: Array.isArray(it.images) ? it.images.slice(0, 8) : undefined,
        options: it.options ?? undefined, // ex. { print_side:"front", … }
        notes: it.notes ?? undefined,
        source: 'checkoutController' // trace d’origine
      };

      await pool.query(
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
          dbVariantId,
          effectivePrintfulId,
          qty,
          (unitPriceCents / 100).toFixed(2),
          unitPriceCents,
          JSON.stringify(metaPayload)
        ]
      );
    }

    // 4c) Historique initial (init → pending)
    await pool.query(
      `INSERT INTO order_status_history
       (order_id, old_status, new_status, changed_at)
       VALUES (?, ?, ?, NOW())`,
      [orderId, 'init', 'pending']
    );

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
    const metadataCartItems = cart.map((it) => ({
      id: it.variant_id || it.variantId || null,
      printful_variant_id:
        it.printful_variant_id || it.printfulVariantId || null,
      quantity: it.quantity ?? it.qty ?? 1,
      price: Number(
        it.unit_price ??
          it.unitPrice ??
          it.price ??
          it.amount ??
          it.subtotal_per_unit ??
          0
      ),
      sku: it.sku || null,
      name: it.name || it.title || it.productName || null
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

    const session = await stripe.checkout.sessions.create({
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
                  display_name: raw.shipping_rate?.name || 'Livraison',
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
        cart_id: cartId ? String(cartId) : '',
        shipping_rate: JSON.stringify(raw.shipping_rate || {}),
        shipping: JSON.stringify(metadataShipping),
        cart_items: JSON.stringify(metadataCartItems)
      }
    });

    // 7) Lier la session Stripe à la commande (+ miroir client_reference_id)
    await pool.query(
      `UPDATE orders
       SET stripe_session_id = ?, client_reference_id = ?
       WHERE id = ?`,
      [session.id, String(orderId), orderId]
    );

    // 8) Journaliser le panier "abandon potentiel"
    try {
      if (cartId) {
        await pool.query(
          `INSERT INTO abandoned_carts
           (cart_id,
            user_id,
            anonymous_token,
            customer_email,
            cart_snapshot,
            source,
            abandoned_at,
            cart_contents,
            last_activity,
            is_recovered,
            recovered_at,
            last_email_sent_at,
            checkout_session_id,
            campaign_id,
            created_at,
            updated_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), 0, NULL, NULL, ?, NULL, NOW(), NOW())`,
          [
            cartId,
            customerId || null,
            null,
            emailSnapshot || null,
            JSON.stringify({
              shipping: shippingNormalized,
              totals: {
                subtotal_cents: cartSubtotalCents,
                shipping_cents: shippingCents,
                total_cents: totalCents,
                currency
              }
            }),
            'checkout_init',
            JSON.stringify(cart || []),
            session.id
          ]
        );
      }
    } catch (e) {
      console.warn(
        '[checkout] abandoned_carts insert skipped:',
        e?.message || e
      );
    }

    // Panier laissé 'open' ici. Le webhook le verrouille après paiement.
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
