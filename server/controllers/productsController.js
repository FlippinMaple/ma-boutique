// server/controllers/productsController.js
import { logError } from '../utils/logger.js';

// GET /api/products
export const getVisibleProducts = async (req, res) => {
  try {
    const db = req.app.locals.db; // injecté par server/server.js
    const q = String(req.query.q || '').trim();

    if (q.length > 100) {
      return res.status(400).json({ error: 'Recherche trop longue.' });
    }

    const searchSql = q
      ? `AND (p.name LIKE ? OR p.description LIKE ?)`
      : '';
    const params = q ? [`%${q}%`, `%${q}%`] : [];
    const [rows] = await db.execute(
      `SELECT p.id, p.name, p.description, p.image,
              v.id AS local_variant_id,
              v.variant_id,
              v.printful_variant_id,
              v.price, v.size, v.color, v.image AS variant_image
       FROM products p
       LEFT JOIN product_variants v
         ON v.product_id = p.id
        AND v.is_active = 1
       WHERE p.is_visible = 1
       ${searchSql}
       ORDER BY p.id DESC`,
      params
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
  const rawProductId = String(req.params.id || '').trim();

  if (!/^\d+$/.test(rawProductId)) {
    return res.status(400).json({ error: 'ID de produit invalide' });
  }

  const productId = Number(rawProductId);

  if (!Number.isSafeInteger(productId) || productId <= 0) {
    return res.status(400).json({ error: 'ID de produit invalide' });
  }

  try {
    const db = req.app.locals.db;

    const [[product]] = await db.execute(
      'SELECT id, name, description, image FROM products WHERE id = ? AND is_visible = 1',
      [productId]
    );
    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    const [variants] = await db.execute(
      `SELECT id, variant_id, printful_variant_id, color, size, price, image
       FROM product_variants
       WHERE product_id = ?
         AND is_active = 1`,
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

// GET /api/products/featured
export const getFeaturedProducts = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const [rows] = await db.execute(
      `SELECT p.id, p.name, p.description, p.image,
              v.id AS local_variant_id,
              v.variant_id,
              v.printful_variant_id,
              v.price, v.size, v.color, v.image AS variant_image
       FROM (
         SELECT id, name, description, image, updated_at
         FROM products
         WHERE is_visible = 1
           AND is_featured = 1
           AND name IS NOT NULL
           AND TRIM(name) <> ''
         ORDER BY updated_at DESC, id DESC
         LIMIT 4
       ) p
       LEFT JOIN product_variants v
         ON v.product_id = p.id
        AND v.is_active = 1
       ORDER BY p.updated_at DESC, p.id DESC, v.id ASC`
    );

    const productsMap = new Map();
    for (const row of rows) {
      if (!productsMap.has(row.id)) {
        productsMap.set(row.id, {
          id: row.id,
          name: row.name,
          description: row.description,
          image: row.image,
          variants: []
        });
      }
      if (row.local_variant_id) {
        productsMap.get(row.id).variants.push({
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

    res.json([...productsMap.values()]);
  } catch (err) {
    await logError(
      `[GET /api/products/featured] ${err?.message || err}`,
      'products'
    );
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};
