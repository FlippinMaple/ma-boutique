import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import Stripe from 'stripe';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import syncPrintfulOrderStatus from './utils/syncPrintful.js';
import cron from 'node-cron';
import { logToDatabase, purgeOldLogs } from './utils/logger.js';
import { pool } from './db.js';
import { errorHandler } from './middlewares/errorHandler.js';

//Routes imports
import wishlistRoutes from './routes/wishlistRoutes.js';
import authRoutes from './routes/authRoutes.js';
import productsRoutes from './routes/productsRoutes.js';
import checkoutRoutes from './routes/checkoutRoutes.js';

const app = express();
app.use(cors());
app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2022-11-15'
});

//Auth routes
app.use('/api/auth', authRoutes);

//Products Route
app.use('/api/products', productsRoutes);

//Wishlist Route
app.use('/api/wishlist', wishlistRoutes);

//Checkout Route
app.use('/api/create-checkout-session', checkoutRoutes);

// === Stripe Webhook ===
app.post(
  '/webhook',
  bodyParser.raw({ type: 'application/json' }),
  async (req, res) => {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('⚠️ Webhook signature error:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const shipping = session.metadata?.shipping
        ? JSON.parse(session.metadata.shipping)
        : null;
      console.log(
        '📦 session.metadata.cart_items brut:',
        session.metadata.cart_items
      );

      const cart_items = session.metadata?.cart_items
        ? JSON.parse(session.metadata.cart_items)
        : [];

      const total = session.amount_total / 100;
      const shipping_cost = session.total_details?.amount_shipping
        ? session.total_details.amount_shipping / 100
        : 0;
      const customer_email =
        session.customer_email || (shipping && shipping.email);

      const [[existingOrder]] = await pool.query(
        `SELECT id FROM orders WHERE customer_email = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1`,
        [customer_email]
      );

      let orderId;
      if (existingOrder) {
        orderId = existingOrder.id;
        await pool.execute(
          `UPDATE orders SET status = ?, total = ?, shipping_cost = ?, updated_at = NOW() WHERE id = ?`,
          ['paid', total, shipping_cost, orderId]
        );
      } else {
        const [orderResult] = await pool.execute(
          `INSERT INTO orders (customer_email, status, total, shipping_cost, created_at, updated_at)
           VALUES (?, ?, ?, ?, NOW(), NOW())`,
          [customer_email, 'paid', total, shipping_cost]
        );
        orderId = orderResult.insertId;
      }

      if (!orderId) {
        console.error('❌ Aucun orderId généré, insertion annulée.');
        return res.status(500).json({ error: 'Erreur création commande.' });
      }

      await pool.execute(`DELETE FROM order_items WHERE order_id = ?`, [
        orderId
      ]);

      for (const item of cart_items) {
        if (!item.id || !item.quantity || !item.price) {
          console.warn(`⚠️ Données manquantes pour item:`, item);
          continue;
        }
        await pool.execute(
          `INSERT INTO order_items (order_id, product_variant_id, quantity, price_at_purchase)
           VALUES (?, ?, ?, ?)`,
          [orderId, item.id, item.quantity, item.price]
        );
      }

      await pool.execute(
        `INSERT INTO order_status_history (order_id, old_status, new_status, changed_at)
         VALUES (?, ?, ?, NOW())`,
        [orderId, 'pending', 'paid']
      );

      if (process.env.PRINTFUL_AUTOMATIC_ORDER === 'true') {
        try {
          const printfulItems = await mapCartToPrintfulVariants(cart_items);
          const response = await axios.post(
            'https://api.printful.com/orders',
            {
              recipient: {
                name: shipping?.name,
                address1: shipping?.address1,
                city: shipping?.city,
                state_code: shipping?.state,
                country_code: shipping?.country,
                zip: shipping?.zip,
                email: customer_email
              },
              items: printfulItems,
              confirm: false
            },
            {
              headers: {
                Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`
              }
            }
          );
          const printfulOrderId = response.data.result.id;
          await pool.execute(
            `UPDATE orders SET printful_order_id = ? WHERE id = ?`,
            [printfulOrderId, orderId]
          );
          console.log(`✅ Printful order lié : ${printfulOrderId}`);
        } catch (err) {
          console.error('❌ Erreur envoi Printful:', err.response?.data || err);
        }
      } else {
        console.log(
          '⚠️ (DEV/TEST) -- PAS de commande réelle envoyée à Printful.'
        );
      }
    }

    res.json({ received: true });
  }
);

// === Debug route ===
app.get('/api/debug-orders', async (req, res) => {
  try {
    const [orders] = await pool.query(
      'SELECT * FROM orders ORDER BY id DESC LIMIT 10'
    );
    const [items] = await pool.query(
      'SELECT * FROM order_items ORDER BY id DESC LIMIT 10'
    );
    const [statuses] = await pool.query(
      'SELECT * FROM order_status_history ORDER BY id DESC LIMIT 10'
    );
    res.json({
      orders,
      order_items: items,
      order_status_history: statuses
    });
  } catch (err) {
    console.error('❌ Erreur récupération debug:', err);
    res.status(500).json({ error: 'Erreur debug.' });
  }
});

// ====================
// AuthProtect Middleware
const authProtect = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader)
    return res.status(403).json({ message: 'Authorization manquant' });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(403).json({ message: 'Token manquant' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalide ou expiré' });
  }
};

// ====================
// ROUTE: Register
// app.post('/api/register', async (req, res) => {
//   let { first_name, last_name, email, password, is_subscribed } = req.body;

//   // 🧼 Normalisation → tout en minuscules
//   first_name = first_name.trim().toLowerCase();
//   last_name = last_name.trim().toLowerCase();
//   email = email.trim().toLowerCase();

//   if (!first_name || !last_name || !email || !password) {
//     return res.status(400).json({ error: 'Tous les champs sont requis.' });
//   }

//   try {
//     const [existing] = await pool.execute(
//       'SELECT id FROM customers WHERE email = ?',
//       [email]
//     );

//     if (existing.length > 0) {
//       return res.status(400).json({ error: 'Ce courriel est déjà utilisé.' });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     await pool.execute(
//       `INSERT INTO customers (
//         first_name,
//         last_name,
//         email,
//         password_hash,
//         is_subscribed,
//         created_at,
//         updated_at
//       )
//       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
//       [first_name, last_name, email, hashedPassword, !!is_subscribed]
//     );

//     return res
//       .status(200)
//       .json({ success: true, message: 'Compte créé avec succès.' });
//   } catch (err) {
//     console.error('❌ Erreur serveur lors de l’inscription :', err);
//     return res
//       .status(500)
//       .json({ error: 'Erreur serveur lors de l’inscription.' });
//   }
// });

// ====================
// ROUTE: Login
// app.post('/api/login', async (req, res) => {
//   const { email, password } = req.body;

//   if (!email || !password) {
//     return res.status(400).json({ error: 'Champs requis manquants.' });
//   }

//   const normalizedEmail = email.trim().toLowerCase();

//   try {
//     const [rows] = await pool.execute(
//       'SELECT id, first_name, last_name, password_hash FROM customers WHERE email = ?',
//       [normalizedEmail]
//     );

//     if (rows.length === 0) {
//       return res.status(401).json({ error: 'Identifiants invalides.' });
//     }

//     const user = rows[0];
//     const isMatch = await bcrypt.compare(password, user.password_hash);

//     if (!isMatch) {
//       return res.status(401).json({ error: 'Identifiants invalides.' });
//     }

//     const accessToken = jwt.sign(
//       {
//         id: user.id,
//         email: normalizedEmail,
//         first_name: user.first_name,
//         last_name: user.last_name
//       },
//       process.env.JWT_SECRET,
//       { expiresIn: '2h' }
//     );

//     const refreshToken = jwt.sign(
//       { id: user.id, email: normalizedEmail },
//       process.env.JWT_REFRESH_SECRET,
//       { expiresIn: '7d' }
//     );

//     await pool.execute(
//       `REPLACE INTO refresh_tokens (user_id, refresh_token, expires_at)
//        VALUES (?, ?, ?)`,
//       [user.id, refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
//     );

//     res.json({
//       accessToken,
//       refreshToken,
//       user: {
//         id: user.id,
//         email: normalizedEmail,
//         first_name: user.first_name,
//         last_name: user.last_name
//       }
//     });
//   } catch (err) {
//     console.error('❌ Erreur serveur :', err);
//     res.status(500).json({ error: 'Erreur lors de la connexion.' });
//   }
// });

// ====================
// ROUTE: Refresh Token
// app.post('/api/refresh-token', async (req, res) => {
//   const { refreshToken } = req.body;
//   if (!refreshToken) {
//     return res.status(403).json({ message: 'Refresh token manquant' });
//   }
//   try {
//     const [rows] = await pool.execute(
//       'SELECT * FROM refresh_tokens WHERE refresh_token = ?',
//       [refreshToken]
//     );
//     if (rows.length === 0) {
//       return res.status(403).json({ message: 'Refresh token invalide' });
//     }
//     const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
//     const { user_id } = rows[0];
//     const newAccessToken = jwt.sign(
//       { id: user_id, email: decoded.email },
//       process.env.JWT_SECRET,
//       { expiresIn: '2h' }
//     );
//     res.json({ accessToken: newAccessToken });
//   } catch (err) {
//     console.error('❌ Erreur lors du rafraîchissement du token :', err);
//     res.status(403).json({ message: 'Refresh token invalide ou expiré' });
//   }
// });

// ====================
// ROUTE: Logout
// app.post('/api/logout', async (req, res) => {
//   const { refreshToken } = req.body;
//   if (!refreshToken) {
//     return res.status(400).json({ message: 'Refresh token manquant' });
//   }
//   try {
//     await pool.execute('DELETE FROM refresh_tokens WHERE refresh_token = ?', [
//       refreshToken
//     ]);
//     res.json({ message: 'Déconnexion réussie' });
//   } catch (err) {
//     console.error('❌ Erreur lors de la déconnexion :', err);
//     res.status(500).json({ message: 'Erreur lors de la déconnexion' });
//   }
// });

// ====================
// ROUTE: Produits pour Shop.jsx (produits + variantes)
// app.get('/api/products', async (req, res) => {
//   try {
//     const [rows] = await pool.execute(
//       `SELECT p.id, p.name, p.description, p.image,
//        v.id as local_variant_id,
//        v.variant_id, -- 👈 court ID utilisé par Printful
//        v.printful_variant_id, -- 👈 long ID (optionnel mais utile)
//        v.price, v.size, v.color, v.image as variant_image
// FROM products p
// LEFT JOIN product_variants v ON v.product_id = p.id
// WHERE p.is_visible = 1
// ORDER BY p.id DESC
// `
//     );

//     const productsMap = {};
//     rows.forEach((row) => {
//       if (!productsMap[row.id]) {
//         productsMap[row.id] = {
//           id: row.id,
//           name: row.name,
//           description: row.description,
//           image: row.image,
//           variants: []
//         };
//       }
//       if (row.local_variant_id) {
//         productsMap[row.id].variants.push({
//           id: row.local_variant_id, // ton ID local pour la DB
//           variant_id: row.variant_id, // le court ID Printful ⚠️
//           printful_variant_id: row.printful_variant_id, // long ID si tu veux
//           price: row.price,
//           size: row.size,
//           color: row.color,
//           image: row.variant_image
//         });
//       }
//     });
//     const products = Object.values(productsMap);
//     res.json(products);
//   } catch (err) {
//     console.error('❌ Erreur SQL /api/products:', err);
//     res.status(500).json({ error: 'Erreur serveur.' });
//   }
// });

// ====================
// ROUTE: Détail d’un produit avec variantes (pour page de détail)
// app.get('/api/products/:id', async (req, res) => {
//   const productId = req.params.id;
//   try {
//     // Récupère le produit
//     const [[product]] = await pool.query(
//       `SELECT id, name, description, image FROM products WHERE id = ?`,
//       [productId]
//     );
//     if (!product) {
//       return res.status(404).json({ error: 'Produit non trouvé' });
//     }

//     // Récupère les variantes de ce produit
//     const [variants] = await pool.query(
//       `SELECT id, variant_id, printful_variant_id, color, size, price, image FROM product_variants WHERE product_id = ?`,
//       [productId]
//     );

//     // Renvoie le produit + variantes
//     res.json({
//       ...product,
//       variants: variants || []
//     });
//   } catch (err) {
//     console.error('❌ Erreur SQL /api/products/:id:', err);
//     res.status(500).json({ error: 'Erreur serveur.' });
//   }
// });

// ====================
// ROUTE: Stripe Checkout Session
// app.post('/create-checkout-session', async (req, res) => {
//   const { items, customer_email, shipping, billing, shipping_rate } = req.body;

//   try {
//     const line_items = [];

//     for (const item of items) {
//       const { printful_variant_id, price, name, image, quantity } = item;

//       if (!printful_variant_id || isNaN(Number(printful_variant_id))) {
//         console.warn(
//           `❌ variant_id manquant ou invalide pour l’item ${item.id}`
//         );
//         continue;
//       }

//       // ✅ Vérifie la dispo via /sync/variant/
//       const response = await axios.get(
//         `https://api.printful.com/sync/variant/${printful_variant_id}`,
//         {
//           headers: {
//             Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
//             'X-PF-Store-Id': process.env.PRINTFUL_STORE_ID
//           }
//         }
//       );

//       const status = response.data?.result?.sync_variant?.availability_status;
//       if (status !== 'active') {
//         console.warn(
//           `⚠️ Produit indisponible (ID ${printful_variant_id}) : ${status}`
//         );
//         return res.status(400).json({
//           error: `Le produit "${
//             item.name || `#${item.id}`
//           }" n'est plus disponible.`
//         });
//       }

//       // ✅ Ajoute le produit à Stripe
//       line_items.push({
//         price_data: {
//           currency: 'cad',
//           product_data: {
//             name:
//               typeof name === 'string' && name.trim() !== ''
//                 ? name.trim()
//                 : `Produit #${item.id}`,
//             images: image ? [image] : []
//           },
//           unit_amount: !isNaN(Number(price))
//             ? Math.round(Number(price) * 100)
//             : 1000
//         },
//         quantity: quantity || 1
//       });
//     }

//     // ✅ Ajoute la livraison si sélectionnée
//     if (
//       shipping_rate &&
//       typeof shipping_rate.name === 'string' &&
//       shipping_rate.name.trim() !== '' &&
//       !isNaN(Number(shipping_rate.rate))
//     ) {
//       line_items.push({
//         price_data: {
//           currency: 'cad',
//           product_data: {
//             name: `Livraison (${shipping_rate.name.trim()})`
//           },
//           unit_amount: Math.round(Number(shipping_rate.rate) * 100)
//         },
//         quantity: 1
//       });
//     }

//     // ✅ Création de la session Stripe
//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ['card'],
//       line_items,
//       mode: 'payment',
//       customer_email,
//       metadata: {
//         customer_email,
//         shipping_country: shipping?.country,
//         shipping_state: shipping?.state,
//         shipping_postal: shipping?.zip
//       },
//       success_url: process.env.FRONTEND_URL + '/success',
//       cancel_url: process.env.FRONTEND_URL + '/checkout'
//     });

//     // ✅ Sauvegarde immédiate de la commande avant redirection
//     const orderTotal = line_items.reduce(
//       (sum, item) => sum + (item.price_data.unit_amount * item.quantity) / 100,
//       0
//     );

//     const shippingCost = shipping_rate ? parseFloat(shipping_rate.rate) : 0;

//     const [orderResult] = await pool.execute(
//       `INSERT INTO orders (customer_email, status, total, shipping_cost, created_at, updated_at)
//    VALUES (?, ?, ?, ?, NOW(), NOW())`,
//       [customer_email, 'pending', orderTotal, shippingCost]
//     );

//     const orderId = orderResult.insertId;
//     console.log('✅ Commande pré-enregistrée avec ID:', orderId);

//     // Ajoute chaque item du panier à la table order_items
//     for (const item of items) {
//       const {
//         variant_id,
//         printful_variant_id,
//         quantity,
//         price,
//         color,
//         size,
//         ...rest
//       } = item;

//       // Construit le champ meta JSON
//       const meta = {
//         ...(color && { color }),
//         ...(size && { size }),
//         ...rest
//       };

//       await pool.execute(
//         `INSERT INTO order_items (order_id, variant_id, printful_variant_id, quantity, price_at_purchase, meta)
//      VALUES (?, ?, ?, ?, ?, ?)`,
//         [
//           orderId,
//           parseInt(variant_id),
//           parseInt(printful_variant_id),
//           parseInt(quantity),
//           parseFloat(price),
//           JSON.stringify(meta)
//         ]
//       );
//     }

//     res.json({ url: session.url });
//   } catch (error) {
//     console.error('Erreur Stripe:', error?.response?.data || error.message);
//     res
//       .status(500)
//       .json({ error: 'Erreur lors de la création de la session.' });
//   }
// });

// === Fonction pour mapper cart vers Printful ===
async function mapCartToPrintfulVariants(cart_items) {
  if (!cart_items) return [];
  const variantIds = cart_items.map((item) => item.id);
  const [variants] = await pool.query(
    `SELECT id, printful_variant_id FROM product_variants WHERE id IN (${variantIds
      .map(() => '?')
      .join(',')})`,
    variantIds
  );
  return cart_items.map((item) => {
    const v = variants.find((row) => row.id === item.id);
    if (!v) throw new Error(`Aucune variante trouvée pour l'id ${item.id}`);
    return {
      variant_id: v.printful_variant_id,
      quantity: item.quantity
    };
  });
}

// ====================
// ROUTE: Commande automatique chez Printful
app.post('/api/printful-order', async (req, res) => {
  try {
    const { customer_email, shipping, cart_items } = req.body;
    if (!cart_items || cart_items.length === 0) {
      return res.status(400).json({ error: 'Panier vide.' });
    }
    // Récupère les printful_variant_id
    const variantIds = cart_items.map((item) => item.id);
    const [variants] = await pool.query(
      `SELECT id, printful_variant_id FROM product_variants WHERE id IN (${variantIds
        .map(() => '?')
        .join(',')})`,
      variantIds
    );
    const printfulItems = cart_items.map((item) => {
      const v = variants.find((row) => row.id === item.id);
      if (!v) throw new Error(`Aucune variante trouvée pour l'id ${item.id}`);
      return {
        variant_id: v.printful_variant_id,
        quantity: item.quantity
      };
    });
    const payload = {
      recipient: {
        name: shipping.name,
        address1: shipping.address1,
        city: shipping.city,
        state_code: shipping.state,
        country_code: shipping.country,
        zip: shipping.zip,
        email: customer_email
      },
      items: printfulItems
    };
    const response = await axios.post(
      'https://api.printful.com/orders',
      payload,
      { headers: { Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}` } }
    );
    res.json({ success: true, printfulOrder: response.data.result });
  } catch (error) {
    console.error(
      'Erreur création commande Printful:',
      error.response?.data || error.message
    );
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

// ====================
// Protected Example
app.get('/api/protected', authProtect, (req, res) => {
  res.json({
    message: 'Accès autorisé',
    user: req.user
  });
});

app.get('/api/user-info', authProtect, (req, res) => {
  res.json({
    message: 'Informations utilisateur récupérées avec succès',
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email
    }
  });
});

// ✅ Mise à jour de la route « /api/printful-stock/:variantId » pour retourner la quantité disponible
app.get('/api/printful-stock/:variantId', async (req, res) => {
  const { variantId } = req.params;
  try {
    const response = await axios.get(
      `https://api.printful.com/sync/variant/${variantId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
          'X-PF-Store-Id': process.env.PRINTFUL_STORE_ID
        }
      }
    );

    const status =
      response.data?.result?.sync_variant?.availability_status || 'unknown';

    const isAvailable = status === 'active' || status === 'not_synced';
    const availableQuantity = isAvailable ? 999 : 0;

    res.json({
      status: isAvailable ? 'in_stock' : 'unavailable',
      rawStatus: status,
      available: availableQuantity
    });
  } catch (error) {
    console.error(
      '❌ Erreur Printful stock:',
      error.response?.data || error.message
    );
    res
      .status(500)
      .json({ error: 'Erreur lors de la vérification de stock Printful.' });
  }
});

app.post('/api/shipping-rates', async (req, res) => {
  const { recipient, items } = req.body;
  if (!recipient || !items || items.length === 0) {
    return res.status(400).json({ error: 'Données incomplètes.' });
  }

  try {
    const ids = items.map((item) => item.variant_id);
    const [variantRows] = await pool.query(
      `SELECT variant_id FROM product_variants WHERE variant_id IN (${ids
        .map(() => '?')
        .join(',')})`,
      ids
    );

    const printfulItems = items.map((item) => {
      const found = variantRows.find((v) => v.variant_id == item.variant_id);
      if (!found) throw new Error(`Variante introuvable: ${item.variant_id}`);
      return {
        variant_id: item.variant_id,
        quantity: item.quantity
      };
    });

    const transformedRecipient = {
      name: recipient.name,
      address1: recipient.address1,
      city: recipient.city,
      state_code: recipient.state,
      country_code: recipient.country,
      zip: recipient.zip,
      email: recipient.email || ''
    };

    const response = await axios.post(
      'https://api.printful.com/shipping/rates',
      {
        recipient: transformedRecipient,
        items: printfulItems
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
          'X-PF-Store-Id': process.env.PRINTFUL_STORE_ID
        }
      }
    );

    res.json(response.data.result);
  } catch (error) {
    console.error(
      '❌ Erreur récupération shipping rates:',
      error.response?.data || error.message
    );
    res
      .status(500)
      .json({ error: 'Impossible d’obtenir les options de livraison.' });
  }
});

app.use(errorHandler);

// === Fonction utilitaire pour mettre à jour le statut ===
async function updateOrderStatus(orderId, newStatus) {
  try {
    const [[order]] = await pool.query(
      'SELECT status FROM orders WHERE id = ?',
      [orderId]
    );
    if (!order) {
      console.warn(`⚠️ Commande ID ${orderId} non trouvée.`);
      return;
    }

    const oldStatus = order.status;

    // Historise toujours, même si pas de changement
    await pool.execute(
      `INSERT INTO order_status_history (order_id, old_status, new_status, changed_at)
       VALUES (?, ?, ?, NOW())`,
      [orderId, oldStatus, newStatus]
    );

    if (oldStatus === newStatus) {
      console.log(
        `ℹ️ Statut inchangé pour commande #${orderId} (${newStatus})`
      );
      return;
    }

    await pool.execute(
      'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, orderId]
    );

    console.log(
      `✅ Statut mis à jour : #${orderId} ${oldStatus} → ${newStatus}`
    );
  } catch (err) {
    console.error(`❌ Erreur mise à jour statut pour #${orderId}:`, err);
  }
}

// === CRON Printful sync ===
const CRON_STATUS_SCHEDULE = process.env.CRON_STATUS_SCHEDULE || '0 2 * * *'; // par défaut à 2h du matin
const CRON_PURGE_LOG_SCHEDULE =
  process.env.CRON_PURGE_LOG_SCHEDULE || '0 0 * * *'; // par défaut à minuit
const LOG_RETENTION_DAYS = parseInt(process.env.LOG_RETENTION_DAYS, 10) || 7; // par défaut garde 7 jours
cron.schedule(CRON_STATUS_SCHEDULE, async () => {
  console.log('⏰ Début du cron de synchronisation des statuts Printful');
  await logToDatabase('⏰ Début du cron Printful', 'info');

  try {
    const [orders] = await pool.query(
      `SELECT id, printful_order_id, status FROM orders WHERE printful_order_id IS NOT NULL AND status NOT IN ('shipped', 'canceled')`
    );

    for (const order of orders) {
      const response = await axios.get(
        `https://api.printful.com/orders/@${order.printful_order_id}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`
          }
        }
      );

      const printfulStatus = response.data?.result?.status;
      if (!printfulStatus) {
        console.warn(`⚠️ Aucun statut Printful reçu pour #${order.id}`);
        continue;
      }

      let mappedStatus;
      switch (printfulStatus) {
        case 'draft':
          mappedStatus = 'pending';
          break;
        case 'pending':
          mappedStatus = 'in_production';
          break;
        case 'fulfilled':
          mappedStatus = 'shipped';
          break;
        case 'canceled':
          mappedStatus = 'canceled';
          break;
        default:
          mappedStatus = 'unknown';
      }

      if (order.status !== mappedStatus) {
        await updateOrderStatus(order.id, mappedStatus);
        await logToDatabase(
          `✅ Statut maj commande ${order.id}: ${order.status} → ${mappedStatus}`,
          'info'
        );
      } else {
        await logToDatabase(
          `ℹ️ Pas de changement commande ${order.id} (statut: ${order.status})`,
          'info'
        );
      }
    }

    console.log('✅ Cron terminé : statuts synchronisés');
    await logToDatabase('✅ Cron terminé : statuts synchronisés', 'info');
  } catch (err) {
    console.error('❌ Erreur dans le cron:', err);
    await logToDatabase(`❌ Erreur cron: ${err.message}`, 'error');
  }
});

// 🧹 Cron pour purge des anciens logs
cron.schedule(CRON_PURGE_LOG_SCHEDULE, async () => {
  console.log('🧹 Cron minuit : purge des anciens logs');
  await logToDatabase('🧹 Cron minuit : purge des anciens logs', 'info');
  await purgeOldLogs(LOG_RETENTION_DAYS);
});

app.listen(4242, () => {
  console.log('✅ Serveur actif sur http://localhost:4242');
});
