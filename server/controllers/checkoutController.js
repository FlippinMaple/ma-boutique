// server/controllers/checkoutController.js
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

// 🔒 INVARIANTS CRITIQUES CHECKOUT – NE PAS CASSER 🔒
//
// Ordre de ce contrôleur = ordre légal/business du shop. Toute modification
// doit respecter TOUT ce qui suit:
//
// 1. On crée d'abord la commande en DB (table `orders`) avec status='pending',
//    en stockant des SNAPSHOTS IMMUTABLES:
//      - email_snapshot (email utilisé pour acheter)
//      - shipping_name_snapshot
//      - shipping_address_snapshot (adresse d'expédition normalisée au moment du checkout)
//    + les montants en cents (subtotal_cents, shipping_cents, total_cents).
//    Ces snapshots ne doivent jamais être modifiés après coup,
//    même si le user change son profil ou son adresse.
//
// 2. On écrit immédiatement toutes les lignes `order_items` pour cette commande,
//    avec pour chaque item:
//      - variant_id (ID interne boutique, pas l'ID Printful!)
//      - printful_variant_id (ID réel de production chez Printful)
//      - quantity
//      - price_at_purchase (prix payé en dollars au moment T)
//      - unit_price_cents (le même prix mais en cents exacts)
//      - meta (taille/couleur/etc.)
//    Ces valeurs représentent le contrat de vente. On NE LES RÉÉCRIT JAMAIS.
//
// 3. On insère une ligne initiale dans `order_status_history`
//    (old_status='pending', new_status='pending', changed_at=NOW())
//    pour commencer la traçabilité légale de cette commande.
//
// 4. On crée ensuite la session Stripe (checkout.sessions.create) et
//    on met à jour `orders.stripe_session_id` avec l'ID retourné par Stripe.
//    Ça permet au webhook Stripe de retrouver la commande plus tard.
//
// 5. On "verrouille" le panier associé (`carts`):
//      UPDATE carts SET status='ordered' WHERE id = <cartId> AND status='open';
//    Ça garantit l'unicité métier "un seul panier 'open' par user"
//    (contrainte uq_user_open). Sans ça, un même user pourrait checkout
//    plusieurs fois le même panier.
//
// Toute modification qui saute une de ces étapes, ou qui change cet ordre,
// casse la traçabilité légale, ouvre la porte à des litiges Stripe,
// ou brise l'unicité du panier actif.
// 🔒 Fin des invariants critiques 🔒

export const createCheckoutSession = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({
        error: 'STRIPE_SECRET_KEY manquant dans server/.env',
        code: 'STRIPE_KEY_MISSING'
      });
    }

    // 1. Auth utilisateur / refresh silencieux
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
    const cartId = raw.cartId || raw.cart_id || null; // <-- IMPORTANT : on récupère le panier courant

    if (!Array.isArray(cart) || cart.length === 0) {
      return res
        .status(400)
        .json({ error: 'Panier vide.', code: 'EMPTY_CART' });
    }

    // 2. Génération des line_items Stripe
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

    // 3. Préparation des snapshots et du total
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

    // snapshot adresse
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

    // 4. Création de la commande "pending" + insertion des order_items
    const pool = await getPool();
    let orderId = null;

    // on insère la commande avec snapshots
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

    // snapshot des articles vendus, pour traçabilité légale
    if (orderId) {
      // 1. Construire la liste des identifiants de variantes fournis par le front
      // On accepte deux cas:
      // - it.variant_id / it.variantId = ID métier interne (souvent product_variants.variant_id)
      // - it.db_variant_id (si un jour le front nous envoie directement la PK DB)
      //
      // Objectif : mapper vers la vraie PK product_variants.id pour respecter la FK.
      const requestedVariantRefs = [];
      for (const it of cart) {
        const frontVariant =
          it.db_variant_id || // si jamais on l’a déjà
          it.variant_id ||
          it.variantId ||
          null;
        if (frontVariant != null) {
          requestedVariantRefs.push(Number(frontVariant));
        }
      }

      // 2. Récupérer les infos variantes depuis la DB
      // On essaie d'être assez tolérant: soit le front nous a déjà donné la PK DB,
      // soit il nous a donné variant_id (l’ID métier), donc on doit matcher les deux colonnes.
      //
      // NOTE: Hostinger ne nous laisse pas faire de vues propres, donc on fait un SELECT manuel.
      let variantMap = new Map(); // key= "front ref" -> { dbId, printfulId }
      if (requestedVariantRefs.length > 0) {
        // enlever doublons pour un IN plus propre
        const uniqueRefs = [...new Set(requestedVariantRefs)];

        // On va chercher à la fois par product_variants.id ET par product_variants.variant_id
        // parce qu’on ne sait pas ce que le front nous a vraiment envoyé.
        const placeholders = uniqueRefs.map(() => '?').join(',');

        const [variantRows] = await pool.query(
          `
        SELECT
          id                AS db_id,
          variant_id        AS biz_id,
          printful_variant_id AS pf_id
        FROM product_variants
        WHERE id IN (${placeholders})
           OR variant_id IN (${placeholders})
      `,
          [...uniqueRefs, ...uniqueRefs]
        );

        // Construire le mapping
        for (const row of variantRows) {
          // On mappe à la fois db_id et biz_id comme clés possibles
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

      // 3. Insérer chaque ligne order_items en utilisant la vraie clé primaire DB
      for (const it of cart) {
        const qty = Math.max(1, Number(it.quantity ?? it.qty ?? 1) || 1);

        // prix payé pour CETTE variante, maintenant (gelé pour l’historique)
        const unitPriceCents = toCents(
          it.unit_price ??
            it.unitPrice ??
            it.price ??
            it.amount ??
            it.subtotal_per_unit ??
            0
        );

        // identifiant "variante" tel que reçu du front
        const rawVariantRef =
          it.db_variant_id || it.variant_id || it.variantId || null;

        const mapEntry =
          rawVariantRef != null ? variantMap.get(Number(rawVariantRef)) : null;

        // dbVariantId = la vraie FK vers product_variants.id
        const dbVariantId = mapEntry?.dbId || null;

        // printful_variant_id:
        // - priorité: valeur figée qu’on a dans le cart item (source d’or au moment T)
        // - fallback: ce qu’on a en DB pour cette variante
        const effectivePrintfulId =
          it.printful_variant_id ||
          it.printfulVariantId ||
          mapEntry?.pfId ||
          null;

        if (!dbVariantId) {
          console.warn(
            '[checkout] variant FK manquante pour item:',
            it,
            '(pas trouvé dans product_variants)'
          );
          // Si on n'a pas de variante valide en DB, c’est grave:
          // on empêche la commande bancale d'aller plus loin.
          throw new Error(
            'VARIANT_NOT_FOUND_FOR_ORDER_ITEM_FK: ' + JSON.stringify(it)
          );
        }

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
            dbVariantId, // <-- FK propre vers product_variants.id
            effectivePrintfulId,
            qty,
            (unitPriceCents / 100).toFixed(2),
            unitPriceCents,
            it.meta ? JSON.stringify(it.meta) : null
          ]
        );
      }

      // 4. init historique de statut
      await pool.query(
        `INSERT INTO order_status_history
       (order_id, old_status, new_status, changed_at)
     VALUES (?, ?, ?, NOW())`,
        [orderId, 'pending', 'pending']
      );
    }

    // 5. Stripe customer enrichi
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

      if (orderId) {
        await pool.query(
          `UPDATE orders
             SET stripe_customer_id = ?
           WHERE id = ?`,
          [stripeCustomerId, orderId]
        );
      }
    } catch (e) {
      console.warn('[checkout] stripe customer upsert skipped:', e?.message);
    }

    // 6. Création de la session Stripe
    // 6. Création de la session Stripe
    // On prépare les metadata sérialisables pour le webhook Stripe
    const metadataCartItems = cart.map((it) => ({
      id: it.variant_id || it.variantId || null, // ID interne boutique
      printful_variant_id:
        it.printful_variant_id || it.printfulVariantId || null, // ID Printful
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
      client_reference_id: orderId ? String(orderId) : undefined,
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
        order_id: orderId ? String(orderId) : '',
        cart_id: cartId ? String(cartId) : '',
        shipping_rate: JSON.stringify(raw.shipping_rate || {}),
        shipping: JSON.stringify(metadataShipping),
        cart_items: JSON.stringify(metadataCartItems)
      }
    });

    // 7. Lier la session Stripe à la commande, et marquer le panier "ordered"
    if (orderId) {
      await pool.query(
        `UPDATE orders
           SET stripe_session_id = ?
         WHERE id = ?`,
        [session.id, orderId]
      );
    }

    if (cartId) {
      // passe le panier en ordered pour libérer le verrou uq_user_open
      try {
        await pool.query(
          `UPDATE carts
             SET status = 'ordered',
                 updated_at = NOW()
           WHERE id = ?
             AND status = 'open'`,
          [cartId]
        );
      } catch (e) {
        console.warn('[checkout] cart status update skipped:', e?.message);
      }
    }

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
