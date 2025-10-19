// server/services/stripeService.js
import Stripe from 'stripe';

let stripeClient = null;

export function getStripe() {
  if (stripeClient) return stripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY is missing. Ensure .env is loaded before importing services (see server/server.js).'
    );
  }
  stripeClient = new Stripe(key, { apiVersion: '2022-11-15' });
  return stripeClient;
}
/**
 * Stripe n'accepte que des chaînes pour `metadata`.
 * On convertit donc toute valeur non-string via JSON.stringify.
 */
function normalizeMetadata(obj = {}) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    out[k] = typeof v === 'string' ? v : JSON.stringify(v);
  }
  return out;
}

/**
 * Crée une session de paiement Stripe Checkout
 * @param {Object} params
 * @param {Array}  params.line_items - Items au format Stripe (price ou price_data + quantity)
 * @param {string} params.customer_email
 * @param {Object} params.shipping - { country, state, zip, ... }
 * @param {string|number} params.client_reference_id - ex: order_id (sera casté en string)
 * @param {Object} params.metadata - { order_id, cart_items, shipping, ... } (objets OK)
 */
export const createStripeCheckoutSession = async ({
  line_items,
  customer_email,
  shipping,
  client_reference_id,
  metadata
}) => {
  // Métadonnées "de base" utiles pour l’export / la conciliation
  const baseMeta = {
    customer_email,
    shipping_country: shipping?.country,
    shipping_state: shipping?.state,
    shipping_postal: shipping?.zip
  };

  // Merge + normalisation → toutes les valeurs deviennent des strings
  const mergedMetadata = normalizeMetadata({
    ...baseMeta,
    ...(metadata || {})
  });

  // Stripe préfère une string pour client_reference_id
  const clientRef =
    client_reference_id != null ? String(client_reference_id) : undefined;

  return await Stripe.checkout.sessions.create({
    mode: 'payment',

    // Tu peux garder payment_method_types si tu veux être strict,
    // sinon active la détection automatique :
    // automatic_payment_methods: { enabled: true },
    payment_method_types: ['card'],

    line_items,
    customer_email,
    client_reference_id: clientRef,
    metadata: mergedMetadata,

    success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/checkout`

    // (optionnel)
    // billing_address_collection: 'required',
    // shipping_address_collection: { allowed_countries: ['CA', 'US'] },
  });
};
