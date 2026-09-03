// server/app.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { notFound, errorHandler } from './middlewares/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, '..', 'dist');
const distIndex = path.join(distDir, 'index.html');
const hasDist = fs.existsSync(distIndex);

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

/* Temporary site-wide Basic Auth. /health, /readiness and /webhook* stay open. */
function timingSafeEqualString(left, right) {
  const a = Buffer.from(String(left), 'utf8');
  const b = Buffer.from(String(right), 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function isBasicAuthExemptPath(pathname) {
  return (
    pathname === '/health' ||
    pathname === '/readiness' ||
    pathname === '/webhook' ||
    pathname.startsWith('/webhook/')
  );
}

app.use((req, res, next) => {
  const enabled =
    String(process.env.SITE_BASIC_AUTH_ENABLED || '')
      .trim()
      .toLowerCase() === 'true';
  if (!enabled) return next();

  const pathname = req.path || '';
  if (isBasicAuthExemptPath(pathname)) return next();

  const username = String(process.env.SITE_BASIC_AUTH_USERNAME || '');
  const password = String(process.env.SITE_BASIC_AUTH_PASSWORD || '');
  if (!username || !password) {
    console.error('[site-basic-auth] enabled but credentials are missing');
    return res.status(503).type('text/plain').send('Service unavailable');
  }

  const header = req.get('authorization') || '';
  const match = /^Basic\s+(\S+)$/i.exec(header.trim());
  if (!match) {
    res.set('WWW-Authenticate', 'Basic realm="Flippin Maple Private"');
    return res.status(401).type('text/plain').send('Authentication required');
  }

  let decoded = '';
  try {
    decoded = Buffer.from(match[1], 'base64').toString('utf8');
  } catch {
    res.set('WWW-Authenticate', 'Basic realm="Flippin Maple Private"');
    return res.status(401).type('text/plain').send('Authentication required');
  }

  const colon = decoded.indexOf(':');
  if (colon < 0) {
    res.set('WWW-Authenticate', 'Basic realm="Flippin Maple Private"');
    return res.status(401).type('text/plain').send('Authentication required');
  }

  const providedUser = decoded.slice(0, colon);
  const providedPass = decoded.slice(colon + 1);
  const userOk = timingSafeEqualString(providedUser, username);
  const passOk = timingSafeEqualString(providedPass, password);
  if (!userOk || !passOk) {
    res.set('WWW-Authenticate', 'Basic realm="Flippin Maple Private"');
    return res.status(401).type('text/plain').send('Authentication required');
  }

  return next();
});

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
  'https://flippinmaple.com',
  'https://www.flippinmaple.com',
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
// JSON root only when frontend dist is not available (API-only / local backend)
if (!hasDist) {
  app.get('/', (_req, res) =>
    res.json({ ok: true, service: 'flippin-maple-api' })
  );
}
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
    res.status(503).json({ ok: false, error: 'service_unavailable' });
  }
});

/* ------- Routes (dynamiques) ------- */
const [
  { default: webhookRoutes },
  { default: abandonedCartRoutes },
  { default: authRoutes },
  { default: productsRoutes },
  { default: checkoutRoutes },
  { default: adminRoutes },
  { default: inventoryRoutes },
  { default: shippingRoutes },
  { default: ordersRoutes },
  { default: complianceEmailRoutes },
  { default: paymentsRoutes }
] = await Promise.all([
  import('./routes/webhookRoutes.js'),
  import('./routes/abandonedCartRoutes.js'),
  import('./routes/authRoutes.js'),
  import('./routes/productsRoutes.js'),
  import('./routes/checkoutRoutes.js'),
  import('./routes/adminRoutes.js'),
  import('./routes/inventoryRoutes.js'),
  import('./routes/shippingRoutes.js'),
  import('./routes/ordersRoutes.js'),
  import('./routes/complianceEmailRoutes.js'),
  import('./routes/paymentsRoutes.js')
]);

// Abandoned cart (si la route gère son propre parser, elle le fait en interne)
app.use('/api', abandonedCartRoutes);

// Webhook déjà « raw »
app.use('/webhook', webhookRoutes);

// API
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/create-checkout-session', checkoutRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', ordersRoutes);
app.use('/api', complianceEmailRoutes);
app.use('/api', paymentsRoutes);

/* ------- Frontend Vite (dist/) pour deploy meme domaine ------- */
if (hasDist) {
  app.use(express.static(distDir, { index: false, fallthrough: true }));

  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const p = req.path || '';
    if (
      p.startsWith('/api') ||
      p.startsWith('/webhook') ||
      p === '/health' ||
      p === '/readiness'
    ) {
      return next();
    }
    return res.sendFile(distIndex);
  });
}

/* ------- 404 & erreurs ------- */
app.use(notFound);
app.use(errorHandler);

export { app };
export default app;
