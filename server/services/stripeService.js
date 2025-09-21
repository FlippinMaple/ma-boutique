import stripeModule from 'stripe';

const stripe = stripeModule(process.env.STRIPE_SECRET_KEY);

export const createStripeCheckoutSession = async ({
  line_items,
  customer_email,
  shipping,
  client_reference_id, // ✅ nouveau
  metadata // ✅ nouveau (doit contenir cart_items + order_id)
}) => {
  // On fusionne une metadata "de base" (utile pour tes logs/exports Stripe)
  // avec la metadata critique passée par le controller (cart_items, order_id, etc.)
  // L’ordre est important: la metadata du controller a la priorité.
  const mergedMetadata = {
    customer_email,
    shipping_country: shipping?.country,
    shipping_state: shipping?.state,
    shipping_postal: shipping?.zip,
    ...(metadata || {}) // ✅ cart_items / order_id / shipping (JSON) prennent le dessus
  };

  return await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items,
    mode: 'payment',
    customer_email,
    client_reference_id, // ✅ passe l’orderId (String) pour lien direct dans le webhook
    metadata: mergedMetadata, // ✅ contient cart_items pour le webhook
    success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/checkout`
  });
};
