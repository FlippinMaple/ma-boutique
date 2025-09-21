// app.js
import express from 'express';
import cors from 'cors';
import { notFound, errorHandler } from './middlewares/errorHandler.js';

// routes existantes
import webhookRoutes from './routes/webhookRoutes.js';
import authRoutes from './routes/authRoutes.js';
import productsRoutes from './routes/productsRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import checkoutRoutes from './routes/checkoutRoutes.js';

// ✅ nouvelles routes qu’on crée ci-dessous
import adminRoutes from './routes/adminRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import shippingRoutes from './routes/shippingRoutes.js';
import ordersRoutes from './routes/ordersRoutes.js';

import { startCronJobs } from './jobs/index.js';

export const app = express();
app.use(cors());

// Webhook d'abord (raw body dans webhookRoutes)
app.use('/', webhookRoutes);

// JSON pour le reste
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

// API
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/create-checkout-session', checkoutRoutes);

// Nouvelles routes
app.use('/api/inventory', inventoryRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', ordersRoutes);

// erreurs 404
app.use(notFound); // 404 propre
app.use(errorHandler); // handler erreurs

// cron
startCronJobs();
