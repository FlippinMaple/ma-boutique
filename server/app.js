// app.js
import express from 'express';
import cors from 'cors';
import { errorHandler } from './middlewares/errorHandler.js';

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

// API
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/create-checkout-session', checkoutRoutes);

// Nouvelles routes
app.use('/', adminRoutes); // expose /api/debug-orders
app.use('/', inventoryRoutes); // expose /api/printful-stock/:variantId
app.use('/', shippingRoutes); // expose /api/shipping-rates
app.use('/api', ordersRoutes); // /printful-order, /protected, /user-info

// erreurs
app.use(errorHandler);

// cron
startCronJobs();
