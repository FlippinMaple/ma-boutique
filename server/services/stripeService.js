import stripeModule from 'stripe';

const stripe = stripeModule(process.env.STRIPE_SECRET_KEY);

export const createStripeCheckoutSession = async ({
  line_items,
  customer_email,
  shipping
}) => {
  return await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items,
    mode: 'payment',
    customer_email,
    metadata: {
      customer_email,
      shipping_country: shipping?.country,
      shipping_state: shipping?.state,
      shipping_postal: shipping?.zip
    },
    success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/checkout`
  });
};
