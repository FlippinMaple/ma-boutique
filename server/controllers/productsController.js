import { pool } from '../db.js';

export const getVisibleProducts = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT p.id, p.name, p.description, p.image,
              v.id as local_variant_id,
              v.variant_id,
              v.printful_variant_id,
              v.price, v.size, v.color, v.image as variant_image
       FROM products p
       LEFT JOIN product_variants v ON v.product_id = p.id
       WHERE p.is_visible = 1
       ORDER BY p.id DESC`
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
          id: row.local_variant_id,
          variant_id: row.variant_id,
          printful_variant_id: row.printful_variant_id,
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
};

export const getProductDetails = async (req, res) => {
  const productId = Number(req.params.id);
  if (Number.isNaN(productId)) {
    return res.status(400).json({ error: 'ID de produit invalide' });
  }

  try {
    const [[product]] = await pool.query(
      `SELECT id, name, description, image FROM products WHERE id = ?`,
      [productId]
    );

    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    const [variants] = await pool.query(
      `SELECT id, variant_id, printful_variant_id, color, size, price, image
       FROM product_variants WHERE product_id = ?`,
      [productId]
    );

    res.json({
      ...product,
      variants: variants || []
    });
  } catch (err) {
    console.error('❌ Erreur SQL /api/products/:id:', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};
