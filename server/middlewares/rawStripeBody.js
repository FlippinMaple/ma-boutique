import bodyParser from 'body-parser';

const rawStripeBody = bodyParser.raw({ type: 'application/json' });

export { rawStripeBody }; // ← export en bas (nommé)
// à utiliser uniquement sur la route de webhook Stripe !
// ex: app.post('/webhook', rawStripeBody, webhookHandler);
// sinon, bodyParser.json() doit être utilisé partout ailleurs
// car Stripe a besoin du corps brut pour vérifier la signature
// cf. https://stripe.com/docs/webhooks/signatures#verify-manually
