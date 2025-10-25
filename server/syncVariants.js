import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import { logInfo, logError } from './utils/logger.js';
import { getDb } from './utils/db.js'; // ✅

async function syncVariants() {
  const db = await getDb(); // ✅ connexion sans req

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
      const [existingProducts] = await db.query(
        'SELECT id FROM products WHERE name = ?',
        [sync_product.name]
      );

      let productId;
      if (existingProducts.length > 0) {
        productId = existingProducts[0].id;
        await db.query(
          'UPDATE products SET description = ?, image = ?, is_visible = 1, updated_at = NOW() WHERE id = ?',
          [sync_product.name, sync_product.thumbnail_url, productId]
        );
      } else {
        const [result] = await db.query(
          'INSERT INTO products (name, description, image, is_visible, created_at, updated_at) VALUES (?, ?, ?, 1, NOW(), NOW())',
          [sync_product.name, sync_product.name, sync_product.thumbnail_url]
        );
        productId = result.insertId;
      }

      for (const variant of sync_variants) {
        await logInfo('🔍 VARIANT DEBUG', 'variants', {
          printful_variant_id: variant.id,
          variant_id: variant.variant_id,
          external_id: variant.external_id,
          size: variant.size,
          color: variant.color,
          retail_price: variant.retail_price
        });

        // ✅ On assume que toutes les variantes sont imprimables (POD)
        const stock = 1;

        const [existingVariants] = await db.query(
          'SELECT id FROM product_variants WHERE printful_variant_id = ?',
          [variant.id.toString()]
        );

        if (existingVariants.length > 0) {
          await db.query(
            'UPDATE product_variants SET variant_id = ?, color = ?, size = ?, price = ?, image = ?, stock = ?, product_id = ?, updated_at = NOW() WHERE printful_variant_id = ?',
            [
              variant.variant_id,
              variant.color,
              variant.size,
              variant.retail_price,
              variant.files?.[0]?.preview_url || '',
              stock,
              productId,
              variant.id.toString()
            ]
          );
        } else {
          await db.query(
            'INSERT INTO product_variants (product_id, printful_variant_id, variant_id, color, size, price, image, stock, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
            [
              productId,
              variant.id.toString(),
              variant.variant_id,
              variant.color,
              variant.size,
              variant.retail_price,
              variant.files?.[0]?.preview_url || '',
              stock
            ]
          );
        }
      }
    }

    await logInfo('✅ Synchronisation avec Printful complétée', 'variants');
  } catch (err) {
    await logError('❌ Erreur synchronisation Printful', 'variants', err);
  }
}

syncVariants().catch((err) => {
  console.error(err);
  process.exit(1);
});
