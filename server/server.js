require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// 🎯 Stripe Checkout
app.post('/create-checkout-session', async (req, res) => {
  const { items } = req.body;

  const lineItems = items.map((item) => ({
    price_data: {
      currency: 'cad',
      product_data: {
        name: item.name
      },
      unit_amount: Math.round(item.price * 100)
    },
    quantity: item.quantity
  }));

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      success_url: 'http://localhost:5173/success',
      cancel_url: 'http://localhost:5173/cancel'
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🚀 Route optimisée avec recherche par préfixe
app.get('/store/full-products', async (req, res) => {
  try {
    const searchQuery = req.query.q?.toLowerCase(); // 🔍 Paramètre de recherche (optionnel)
    // console.log('🔍 searchQuery :', searchQuery);

    // Étape 1 : récupérer tous les produits synchronisés
    const productsResponse = await axios.get(
      'https://api.printful.com/store/products',
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
          'X-PF-Store-Id': process.env.PRINTFUL_STORE_ID
        }
      }
    );

    const rawProducts = productsResponse.data.result;
    // console.log('📦 Produits initiaux :', rawProducts);

    // Étape 2 : récupérer les prix du premier variant pour chaque produit
    const detailedProducts = await Promise.all(
      rawProducts.map(async (product) => {
        try {
          const detailRes = await axios.get(
            `https://api.printful.com/store/products/${product.id}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
                'X-PF-Store-Id': process.env.PRINTFUL_STORE_ID
              }
            }
          );

          const firstVariant = detailRes.data.result.sync_variants[0];

          return {
            id: product.id,
            external_id: product.external_id,
            name: product.name,
            image: product.thumbnail_url,
            price: parseFloat(firstVariant.retail_price)
          };
        } catch (err) {
          console.error(`Erreur pour ${product.name}:`, err.message);
          return null;
        }
      })
    );

    // console.log('🛍️ Produits détaillés :', detailedProducts);

    // Étape 3 : filtrer par préfixe si `q` est présent
    const filteredProducts = searchQuery
      ? detailedProducts.filter((p) => p && p.name.toLowerCase(searchQuery))
      : detailedProducts;

    // console.log('🎯 Produits filtrés :', filteredProducts);

    // Étape 4 : retourner les produits filtrés
    res.json({ code: 200, result: filteredProducts });
  } catch (error) {
    console.error(
      'Erreur générale Printful:',
      error.response?.data || error.message
    );
    res
      .status(500)
      .json({ error: 'Erreur lors du chargement complet des produits.' });
  }
});

app.listen(4242, () =>
  console.log('✅ Serveur actif sur http://localhost:4242')
);
