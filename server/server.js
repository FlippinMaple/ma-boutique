import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import Stripe from 'stripe';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import axios from 'axios';

const app = express();
app.use(cors());
app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2022-11-15'
});

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
      const shipping =
        session.metadata && session.metadata.shipping
          ? JSON.parse(session.metadata.shipping)
          : null;

      const cart_items =
        session.metadata && session.metadata.cart_items
          ? JSON.parse(session.metadata.cart_items)
          : [];

      const shipping_cost = session.total_details?.amount_shipping
        ? session.total_details.amount_shipping / 100
        : 0;
      console.log('📦 Shipping cost détecté :', shipping_cost);

      const total = cart_items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      const customer_email =
        session.customer_email || (shipping && shipping.email);

      // Insère dans 'orders'
      const [orderResult] = await pool.execute(
        `INSERT INTO orders (customer_email, status, total, shipping_cost, created_at, updated_at)
     VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [customer_email, 'paid', total + shipping_cost, shipping_cost]
      );

      const order_id = orderResult.insertId;

      // Insère chaque item
      for (const item of cart_items) {
        await pool.execute(
          `INSERT INTO order_items (order_id, product_variant_id, quantity, price_at_purchase)
             VALUES (?, ?, ?, ?)`,
          [order_id, item.id, item.quantity, item.price]
        );
      }

      // 🛑 NE PAS envoyer la commande réelle si tu es en prod sans vouloir envoyer chez Printful :
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
              confirm: false // Important: TEST uniquement!
            },
            {
              headers: {
                Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`
              }
            }
          );
          console.log('✅ Commande envoyée à Printful!', response.data);
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

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
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
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Champs requis manquants.' });
  }
  try {
    const [existing] = await pool.execute(
      'SELECT id FROM customers WHERE email = ?',
      [email]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Ce courriel est déjà utilisé.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.execute(
      `INSERT INTO customers (name, email, password_hash, created_at, updated_at)
       VALUES (?, ?, ?, NOW(), NOW())`,
      [name, email, hashedPassword]
    );
    res.json({ success: true, message: 'Compte créé avec succès.' });
  } catch (err) {
    console.error('❌ Erreur MySQL :', err);
    res.status(500).json({ error: 'Erreur lors de l’inscription.' });
  }
});

// ====================
// ROUTE: Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Champs requis manquants.' });
  }
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, password_hash FROM customers WHERE email = ?',
      [email]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Identifiants invalides.' });
    }
    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Identifiants invalides.' });
    }
    const accessToken = jwt.sign(
      { id: user.id, name: user.name, email },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );
    const refreshToken = jwt.sign(
      { id: user.id, email },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    await pool.execute(
      `REPLACE INTO refresh_tokens (user_id, refresh_token, expires_at)
       VALUES (?, ?, ?)`,
      [user.id, refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
    );
    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email }
    });
  } catch (err) {
    console.error('❌ Erreur serveur :', err);
    res.status(500).json({ error: 'Erreur lors de la connexion.' });
  }
});

// ====================
// ROUTE: Refresh Token
app.post('/api/refresh-token', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(403).json({ message: 'Refresh token manquant' });
  }
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM refresh_tokens WHERE refresh_token = ?',
      [refreshToken]
    );
    if (rows.length === 0) {
      return res.status(403).json({ message: 'Refresh token invalide' });
    }
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const { user_id } = rows[0];
    const newAccessToken = jwt.sign(
      { id: user_id, email: decoded.email },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );
    res.json({ accessToken: newAccessToken });
  } catch (err) {
    console.error('❌ Erreur lors du rafraîchissement du token :', err);
    res.status(403).json({ message: 'Refresh token invalide ou expiré' });
  }
});

// ====================
// ROUTE: Logout
app.post('/api/logout', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token manquant' });
  }
  try {
    await pool.execute('DELETE FROM refresh_tokens WHERE refresh_token = ?', [
      refreshToken
    ]);
    res.json({ message: 'Déconnexion réussie' });
  } catch (err) {
    console.error('❌ Erreur lors de la déconnexion :', err);
    res.status(500).json({ message: 'Erreur lors de la déconnexion' });
  }
});

// ====================
// ROUTE: Produits pour Shop.jsx (produits + variantes)
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT p.id, p.name, p.description, p.image,
       v.id as local_variant_id,
       v.variant_id, -- 👈 court ID utilisé par Printful
       v.printful_variant_id, -- 👈 long ID (optionnel mais utile)
       v.price, v.size, v.color, v.image as variant_image
FROM products p
LEFT JOIN product_variants v ON v.product_id = p.id
WHERE p.is_visible = 1
ORDER BY p.id DESC
`
    );

    const productsMap = {};
    rows.forEach((row) => {
      if (!productsMap[row.id]) {
        productsMap[row.id] = {
          id: row.id,
          name: row.name,
          description: row.description,
          image: row.image,
          variants: []
        };
      }
      if (row.local_variant_id) {
        productsMap[row.id].variants.push({
          id: row.local_variant_id, // ton ID local pour la DB
          variant_id: row.variant_id, // le court ID Printful ⚠️
          printful_variant_id: row.printful_variant_id, // long ID si tu veux
          price: row.price,
          size: row.size,
          color: row.color,
          image: row.variant_image
        });
      }
    });
    const products = Object.values(productsMap);
    res.json(products);
  } catch (err) {
    console.error('❌ Erreur SQL /api/products:', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ====================
// ROUTE: Détail d’un produit avec variantes (pour page de détail)
app.get('/api/products/:id', async (req, res) => {
  const productId = req.params.id;
  try {
    // Récupère le produit
    const [[product]] = await pool.query(
      `SELECT id, name, description, image FROM products WHERE id = ?`,
      [productId]
    );
    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    // Récupère les variantes de ce produit
    const [variants] = await pool.query(
      `SELECT id, variant_id, printful_variant_id, color, size, price, image FROM product_variants WHERE product_id = ?`,
      [productId]
    );

    // Renvoie le produit + variantes
    res.json({
      ...product,
      variants: variants || []
    });
  } catch (err) {
    console.error('❌ Erreur SQL /api/products/:id:', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ====================
// ROUTE: Stripe Checkout Session
app.post('/create-checkout-session', async (req, res) => {
  console.log('📦 Données reçues pour checkout :', {
    items,
    customer_email,
    shipping,
    billing
  });

  const { items, customer_email, shipping, billing } = req.body;
  try {
    // Vérifie la dispo de chaque item
    for (const item of items) {
      const { printful_variant_id } = item;
      if (!printful_variant_id) continue; // sécurité

      const response = await axios.get(
        `https://api.printful.com/products/variant/${printful_variant_id}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`
          }
        }
      );

      const status = response.data?.result?.availability_status;
      if (status !== 'in_stock') {
        return res.status(400).json({
          error: `Le produit "${item.name}" n'est plus disponible.`
        });
      }
    }

    const line_items = items.map((item) => ({
      price_data: {
        currency: 'cad',
        product_data: {
          name: item.name,
          images: [item.image]
        },
        unit_amount: Math.round(item.price * 100)
      },
      quantity: item.quantity
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      customer_email,
      metadata: {
        shipping: JSON.stringify(shipping),
        billing: billing ? JSON.stringify(billing) : JSON.stringify(shipping),
        cart_items: JSON.stringify(items)
      },
      success_url: process.env.FRONTEND_URL + '/success',
      cancel_url: process.env.FRONTEND_URL + '/checkout'
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Erreur Stripe:', error);
    res
      .status(500)
      .json({ error: 'Erreur lors de la création de la session.' });
  }
});

// === Fonction utilitaire pour matcher variantes locales et Printful ===
async function mapCartToPrintfulVariants(cart_items) {
  if (!cart_items) return [];
  const variantIds = cart_items.map((item) => item.id);
  // On suppose que tu stockes le printful_variant_id sur chaque ligne de product_variants
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

// ====================
// ROUTE: Vérification disponibilité Printful
app.get('/api/printful-stock/:variantId', async (req, res) => {
  const { variantId } = req.params;
  try {
    const response = await axios.get(
      `https://api.printful.com/sync/variant/${variantId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
          'X-PF-Store-Id': process.env.PRINTFUL_STORE_ID // si requis
        }
      }
    );

    const status =
      response.data?.result?.sync_variant?.availability_status || 'unknown';
    const isAvailable = status === 'active';

    res.json({
      status: isAvailable ? 'in_stock' : 'unavailable',
      rawStatus: status
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

    console.log('🔍 Payload envoyé à Printful:\n', {
      recipient: transformedRecipient,
      items: printfulItems
    });

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

app.listen(4242, () => {
  console.log('✅ Serveur actif sur http://localhost:4242');
});
