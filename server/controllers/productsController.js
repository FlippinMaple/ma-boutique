// server/controllers/productsController.js
import { logError } from '../utils/logger.js';

// GET /api/products
export const getVisibleProducts = async (req, res) => {
  try {
    const db = req.app.locals.db; // injecté par server/server.js
    const [rows] = await db.execute(
      `SELECT p.id, p.name, p.description, p.image,
              v.id AS local_variant_id,
              v.variant_id,
              v.printful_variant_id,
              v.price, v.size, v.color, v.image AS variant_image
       FROM products p
       LEFT JOIN product_variants v ON v.product_id = p.id
       WHERE p.is_visible = 1
       ORDER BY p.id DESC`
    );

    const productsMap = {};
    for (const row of rows) {
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
          id: row.local_variant_id,
          variant_id: row.variant_id,
          printful_variant_id: row.printful_variant_id,
          price: row.price,
          size: row.size,
          color: row.color,
          image: row.variant_image
        });
      }
    }

    res.json(Object.values(productsMap));
  } catch (err) {
    await logError(`[GET /api/products] ${err?.message || err}`, 'products');
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// GET /api/products/:id
export const getProductDetails = async (req, res) => {
  const productId = Number(req.params.id);
  if (Number.isNaN(productId)) {
    return res.status(400).json({ error: 'ID de produit invalide' });
  }

  try {
    const db = req.app.locals.db;

    const [[product]] = await db.execute(
      'SELECT id, name, description, image FROM products WHERE id = ?',
      [productId]
    );
    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    const [variants] = await db.execute(
      `SELECT id, variant_id, printful_variant_id, color, size, price, image
       FROM product_variants
       WHERE product_id = ?`,
      [productId]
    );

    res.json({ ...product, variants: variants || [] });
  } catch (err) {
    await logError(
      `[GET /api/products/${productId}] ${err?.message || err}`,
      'products'
    );
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};
