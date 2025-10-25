// server/services/stripeService.js
import Stripe from 'stripe';

let stripeClient = globalThis.__stripeClient || null;

/** Permet d’enregistrer une instance initialisée ailleurs (bootstrap, etc.) */
export function registerStripeInstance(instance) {
  stripeClient = instance;
  globalThis.__stripeClient = instance;
}

/** Récupère l’instance Stripe (créée ici si besoin) */
export function getStripe() {
  if (stripeClient) return stripeClient;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY manquant (server/.env).');
  }
  stripeClient = new Stripe(key, { apiVersion: '2022-11-15' });
  globalThis.__stripeClient = stripeClient; // mémorise globalement
  return stripeClient;
}

// Ton helper existant – utilise toujours l’instance, peu importe d’où elle vient
function normalizeMetadata(obj = {}) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue;
    out[k] = typeof v === 'string' ? v : JSON.stringify(v);
  }
  return out;
}

export const createStripeCheckoutSession = async ({
  line_items,
  customer_email,
  shipping,
  client_reference_id,
  metadata
}) => {
  const baseMeta = {
    customer_email,
    shipping_country: shipping?.country,
    shipping_state: shipping?.state,
    shipping_postal: shipping?.zip
  };

  const mergedMetadata = normalizeMetadata({
    ...baseMeta,
    ...(metadata || {})
  });
  const clientRef =
    client_reference_id != null ? String(client_reference_id) : undefined;

  const stripe = getStripe(); // ✅ instance, qu’elle vienne d’ailleurs ou d’ici
  return await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items,
    customer_email,
    client_reference_id: clientRef,
    metadata: mergedMetadata,
    success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/checkout`
  });
};
