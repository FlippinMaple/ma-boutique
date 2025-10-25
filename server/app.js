// server/app.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';

import { notFound, errorHandler } from './middlewares/errorHandler.js';

const app = express();

/* ------- Sécu/Perf global ------- */
const isProd = process.env.NODE_ENV === 'production';
const behindProxy = isProd && process.env.TRUST_PROXY !== 'false';
const TRUST_PROXY_HOPS = Number(process.env.TRUST_PROXY_HOPS || 1);

// En local: false. En prod: 1 (ou la valeur fournie)
app.set('trust proxy', behindProxy ? TRUST_PROXY_HOPS : false);

// Helmet (désactive CSP par défaut en dev pour éviter des surprises)
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);
app.use(compression());

/* ------- Hook de debug (TLA en ESM Node ≥ 20) ------- */
if (!isProd) {
  try {
    await import('./dev/route-debug.js');
  } catch (e) {
    console.warn('[route-debug] non chargé :', e?.message);
  }
}

/* ------- CORS / parsers ------- */

// Derive allowed origins
const envOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  ...envOrigins
];

// CORS strict pour le endpoint "abandoned cart" (POST only, sans credentials)
app.use(
  '/api/log-abandoned-cart',
  cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.includes(origin))
        return cb(null, origin || true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: false,
    methods: ['POST'],
    allowedHeaders: ['Content-Type']
  })
);

// Stripe/Autres webhooks : raw body AVANT json
app.use('/webhook', bodyParser.raw({ type: 'application/json' }));

// cookies + json global
app.use(cookieParser());
app.use(express.json());

// CORS général pour le reste de l’API (avec credentials + origin strict)
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.includes(origin))
        return cb(null, origin || true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);

/* ------- Health ------- */
app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/readiness', async (req, res) => {
  try {
    const db = req.app.locals.db ?? req.app.locals.pool ?? null;
    if (!db) return res.status(503).json({ ok: false, note: 'no db' });
    if (typeof db.execute === 'function') await db.execute('SELECT 1');
    else if (typeof db.raw === 'function') await db.raw('SELECT 1');
    else if (typeof db.query === 'function') await db.query('SELECT 1');
    return res.json({ ok: true });
  } catch (e) {
    res.status(503).json({ ok: false, error: e?.message ?? true });
  }
});

/* ------- Routes (dynamiques) ------- */
const [
  { default: webhookRoutes },
  { default: abandonedCartRoutes },
  { default: authRoutes },
  { default: productsRoutes },
  { default: wishlistRoutes },
  { default: checkoutRoutes },
  { default: adminRoutes },
  { default: inventoryRoutes },
  { default: shippingRoutes },
  { default: ordersRoutes },
  { default: complianceEmailRoutes }
] = await Promise.all([
  import('./routes/webhookRoutes.js'),
  import('./routes/abandonedCartRoutes.js'),
  import('./routes/authRoutes.js'),
  import('./routes/productsRoutes.js'),
  import('./routes/wishlistRoutes.js'),
  import('./routes/checkoutRoutes.js'),
  import('./routes/adminRoutes.js'),
  import('./routes/inventoryRoutes.js'),
  import('./routes/shippingRoutes.js'),
  import('./routes/ordersRoutes.js'),
  import('./routes/complianceEmailRoutes.js')
]);

// Abandoned cart (si la route gère son propre parser, elle le fait en interne)
app.use('/api', abandonedCartRoutes);

// Webhook déjà « raw »
app.use('/webhook', webhookRoutes);

// API
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/create-checkout-session', checkoutRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', ordersRoutes);
app.use('/api', complianceEmailRoutes);

/* ------- 404 & erreurs ------- */
app.use(notFound);
app.use(errorHandler);

export { app };
export default app;
