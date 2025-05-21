// syncVariants.js
import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function syncVariants() {
  try {
    const printfulRes = await axios.get(
      'https://api.printful.com/store/products',
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
          'X-PF-Store-Id': process.env.PRINTFUL_STORE_ID
        }
      }
    );

    const products = printfulRes.data.result || [];

    for (const product of products) {
      const productDetails = await axios.get(
        `https://api.printful.com/store/products/${product.id}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
            'X-PF-Store-Id': process.env.PRINTFUL_STORE_ID
          }
        }
      );

      const { sync_product, sync_variants } = productDetails.data.result;

      // Update or insert product
      const [existingProducts] = await pool.query(
        'SELECT id FROM products WHERE name = ?',
        [sync_product.name]
      );
      let productId;
      if (existingProducts.length > 0) {
        productId = existingProducts[0].id;
        await pool.query(
          'UPDATE products SET description = ?, image = ?, is_visible = 1, updated_at = NOW() WHERE id = ?',
          [sync_product.name, sync_product.thumbnail_url, productId]
        );
      } else {
        const [result] = await pool.query(
          'INSERT INTO products (name, description, image, is_visible, created_at, updated_at) VALUES (?, ?, ?, 1, NOW(), NOW())',
          [sync_product.name, sync_product.name, sync_product.thumbnail_url]
        );
        productId = result.insertId;
      }

      for (const variant of sync_variants) {
        const [existingVariants] = await pool.query(
          'SELECT id FROM product_variants WHERE printful_variant_id = ?',
          [variant.id.toString()]
        );

        if (existingVariants.length > 0) {
          await pool.query(
            'UPDATE product_variants SET color = ?, size = ?, price = ?, image = ?, product_id = ?, updated_at = NOW() WHERE printful_variant_id = ?',
            [
              variant.color,
              variant.size,
              variant.retail_price,
              variant.files?.[0]?.preview_url || '',
              productId,
              variant.id.toString()
            ]
          );
        } else {
          await pool.query(
            'INSERT INTO product_variants (product_id, printful_variant_id, color, size, price, image, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
            [
              productId,
              variant.id.toString(),
              variant.color,
              variant.size,
              variant.retail_price,
              variant.files?.[0]?.preview_url || ''
            ]
          );
        }
      }
    }

    console.log('✅ Synchronisation avec Printful complétée');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur lors de la synchronisation Printful:', err);
    process.exit(1);
  }
}

syncVariants();
