// server/controllers/checkoutController.js
import Stripe from 'stripe';
import { getPool } from '../db.js';
import jwt from 'jsonwebtoken';

function sanitizeBaseUrl(req) {
  const clean = (u) =>
    String(u)
      .trim()
      .replace(/^["']|["']$/g, '')
      .replace(/\/+$/, ''); // ⬅︎ retire 1+ slashs finaux
  const valid = (u) => /^https?:\/\/\S+$/i.test(String(u)); // ⬅︎ accepte 1+ caractères

  // 1) .env FRONTEND_URL peut contenir une liste "a, b" ou des guillemets
  let envRaw = process.env.FRONTEND_URL || '';
  if (envRaw.includes(',')) envRaw = envRaw.split(',')[0];
  const envClean = clean(envRaw);
  if (envClean && valid(envClean)) return envClean;

  // 2) Origin du navigateur (via proxy Vite)
  const originClean = clean(req.headers?.origin || '');
  if (originClean && valid(originClean)) return originClean;

  // 3) Repli: déduire depuis la requête (attention au proxy)
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http')
    .split(',')[0]
    .trim();
  const host = (req.headers['x-forwarded-host'] || req.get('host') || '')
    .split(',')[0]
    .trim();
  const guess = clean(`${proto}://${host}`);
  if (valid(guess)) return guess;

  // 4) Safe default dev
  return 'http://localhost:3000';
}

// Filtre les URLs valides http(s) et limite à 8 max

function filterHttpImages(arr) {
  if (!Array.isArray(arr)) return [];
  const isHttp = (u) => /^https?:\/\/\S+$/i.test(String(u || '')); // ⬅︎ 1+ caractères
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
  sameSite: 'lax', // via proxy Vite on est same-origin
  secure: isProd,
  maxAge: 1000 * 60 * 60,
  path: '/'
};

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SK || '';
const stripe = STRIPE_KEY ? new Stripe(STRIPE_KEY) : null;

function toCents(value) {
  if (value == null) return 0;
  // accepte "29.99" ou "29,99"
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

/**
 * POST /api/create-checkout-session
 * Reçoit { cart: [...] } (ou alias items/lineItems/cartItems)
 * Item accepté:
 *  - { priceId, quantity }
 *  - OU { name/title, price/unit_price, images/image, quantity }
 */
export const createCheckoutSession = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({
        error: 'STRIPE_SECRET_KEY manquant dans server/.env',
        code: 'STRIPE_KEY_MISSING'
      });
    }
    let userId = null;
    try {
      const access = req.cookies?.access;
      if (!access) throw new Error('NO_ACCESS');
      const payload = jwt.verify(access, process.env.JWT_ACCESS_SECRET);
      userId = payload?.sub ?? null;
    } catch (e) {
      // Access manquant/expiré → on tente le refresh silencieux
      const refresh = req.cookies?.refresh;
      const isExpired = e?.name === 'TokenExpiredError';
      if (!refresh || (!isExpired && e?.message !== 'NO_ACCESS')) {
        // jeton illisible (autre erreur) → on stoppe
        return res
          .status(401)
          .json({ message: 'Session expirée. Veuillez vous reconnecter.' });
      }
      try {
        const r = jwt.verify(refresh, process.env.JWT_REFRESH_SECRET);
        userId = r?.sub ?? null;
        // réémettre un nouvel access et poursuivre
        const newAccess = signAccess({ sub: userId });
        res.cookie('access', newAccess, cookieOptsAccess);
      } catch {
        return res
          .status(401)
          .json({ message: 'Session expirée. Veuillez vous reconnecter.' });
      }
    }

    const FRONTEND_URL = sanitizeBaseUrl(req);
    console.log('[checkout] FRONTEND_URL =', FRONTEND_URL);

    const raw = req.body || {};
    const cart = pickCart(raw);

    if (!Array.isArray(cart) || cart.length === 0) {
      return res
        .status(400)
        .json({ error: 'Panier vide.', code: 'EMPTY_CART' });
    }

    const errors = [];
    const line_items = cart.map((it, idx) => {
      const qty = Math.max(1, Number(it.quantity ?? it.qty ?? 1) || 1);

      // Cas A: prix Stripe déjà créé
      const priceId = it.priceId || it.stripePriceId || it.price_id;
      if (priceId) return { price: String(priceId), quantity: qty };

      // Cas B: price_data à la volée
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
        // on mettra un montant factice pour éviter une throw Stripe avant d’avoir un message clair
        return {
          quantity: qty,
          price_data: {
            currency: (process.env.CURRENCY || 'cad').toLowerCase(),
            unit_amount: 1, // placeholder; on retournera 400 juste après
            product_data: { name }
          }
        };
      }

      // ⚠️ Stripe n’accepte que des URLs absolues http(s) pour product_data.images
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
            ...(imgs.length ? { images: imgs } : {}) // on omet si vide
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

    // === PERSISTENCE : créer un draft d'ordre AVANT la redirection Stripe ===
    // === PERSISTENCE dans `orders` (draft) AVANT Stripe ===
    const currency = (process.env.CURRENCY || 'CAD').toUpperCase();

    // total en cents (cart + shipping_rate)
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

    // Normalise l’adresse pour snapshot
    const shippingNormalized = {
      name: raw?.shipping?.name || '',
      address1: raw?.shipping?.address1 || '',
      city: raw?.shipping?.city || '',
      state: raw?.shipping?.state || '',
      country: raw?.shipping?.country || '',
      zip: raw?.shipping?.zip || ''
    };

    // email & userId (si JWT dispo)
    const emailSnapshot = (raw.customer_email || '').toLowerCase();
    const customerId = userId || null;

    let orderId = null;
    try {
      const pool = await getPool();
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
          'pending', // statut draft/pending
          cartSubtotalCents,
          shippingCents,
          totalCents,
          (shippingCents / 100).toFixed(2), // shipping_cost DECIMAL(10,2)
          (totalCents / 100).toFixed(2), // total DECIMAL(10,2)
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
    // === Stripe Customer (upsert avec adresse pour préremplir le Checkout) ===
    let stripeCustomerId = null;
    try {
      // 1) on cherche par email
      const existing = emailSnapshot
        ? await stripe.customers.list({ email: emailSnapshot, limit: 1 })
        : { data: [] };

      if (existing.data.length) {
        stripeCustomerId = existing.data[0].id;
        // 2) on met à jour l'adresse si besoin
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
        // 3) on crée le customer avec l'adresse
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

      // 4) on colle l'id Stripe sur la ligne `orders`
      if (orderId) {
        const pool = await getPool();
        await pool.query(
          `UPDATE orders SET stripe_customer_id = ? WHERE id = ?`,
          [stripeCustomerId, orderId]
        );
      }
    } catch (e) {
      console.warn('[checkout] stripe customer upsert skipped:', e?.message);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/checkout/cancel`,
      // Affiche le formulaire d'adresse ET le pré-remplit depuis le customer
      shipping_address_collection: { allowed_countries: ['CA', 'US'] },
      customer: stripeCustomerId || undefined,
      customer_update: { address: 'auto', shipping: 'auto', name: 'auto' },
      client_reference_id: orderId ? String(orderId) : undefined,

      // Ajoute le shipping dans le total Stripe (depuis ce que tu as choisi côté front)
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
        order_id: orderId ? String(orderId) : ''
      }
    });

    return res.status(200).json({ id: session.id, url: session.url });
  } catch (err) {
    // Log serveur complet
    console.error('[checkout] create session error:', {
      type: err?.type,
      message: err?.message,
      code: err?.code,
      param: err?.param,
      raw: err?.raw
    });
    // Expose TOUJOURS le message Stripe côté client (temporaire le temps du debug)
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
