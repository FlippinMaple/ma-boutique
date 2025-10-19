// server/app.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

import { notFound, errorHandler } from './middlewares/errorHandler.js';

// ⚠️ On n'importe plus la DB ici, ni les cron.
// import { pool } from './db.js';
// import { startCronJobs } from './jobs/index.js';

import webhookRoutes from './routes/webhookRoutes.js';
import abandonedCartRoutes from './routes/abandonedCartRoutes.js';
import authRoutes from './routes/authRoutes.js';
import productsRoutes from './routes/productsRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import checkoutRoutes from './routes/checkoutRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import shippingRoutes from './routes/shippingRoutes.js';
import ordersRoutes from './routes/ordersRoutes.js';
import complianceEmailRoutes from './routes/complianceEmailRoutes.js';

const app = express();

// Sécu/Perf
app.use(helmet());
app.use(compression());

// CORS spécifique pour /api/log-abandoned-cart (sendBeacon)
app.use(
  '/api/log-abandoned-cart',
  cors({
    origin: process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',').map((s) => s.trim())
      : true,
    credentials: false,
    methods: ['POST'],
    allowedHeaders: ['Content-Type']
  })
);

// CORS global
const origins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((s) => s.trim())
  : '*';
app.use(cors({ origin: origins, credentials: true }));

// 🚩 Webhook AVANT json : on monte explicitement en RAW sur /webhook
import bodyParser from 'body-parser';
app.use(
  '/webhook',
  bodyParser.raw({ type: 'application/json' }),
  webhookRoutes
);

// Abandoned cart AVANT json global (si la route gère son propre parser)
app.use('/api', abandonedCartRoutes);

// JSON pour le reste
app.use(express.json());

// Health
app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/readiness', async (req, res) => {
  try {
    const db = req.app.locals.db ?? req.app.locals.pool ?? null;
    if (!db) return res.status(503).json({ ok: false, note: 'no db' });

    // mysql2/promise style:
    if (typeof db.execute === 'function') {
      await db.execute('SELECT 1');
      return res.json({ ok: true });
    }
    // knex style:
    if (typeof db.raw === 'function') {
      await db.raw('SELECT 1');
      return res.json({ ok: true });
    }
    // pool.query fallback
    if (typeof db.query === 'function') {
      await db.query('SELECT 1');
      return res.json({ ok: true });
    }

    return res.status(200).json({ ok: true, note: 'unknown db adapter' });
  } catch {
    res.status(503).json({ ok: false });
  }
});

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

// 404 & erreurs
app.use(notFound);
app.use(errorHandler);

// ❌ plus de startCronJobs() ici
// app.locals.pool = pool; // ❌ pas d’import direct ici

export { app };
export default app;
