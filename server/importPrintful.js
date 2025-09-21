// importPrintful.js
import axios from 'axios';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
import { pool } from './db.js';
import { logError } from './utils/logger.js';

const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
const STORE_ID = process.env.PRINTFUL_STORE_ID;

async function importProducts() {
  try {
    const { data } = await axios.get(
      'https://api.printful.com/store/products',
      {
        headers: {
          Authorization: `Bearer ${PRINTFUL_API_KEY}`,
          'X-PF-Store-Id': STORE_ID
        }
      }
    );

    for (const product of data.result) {
      const { id: external_id } = product;

      const { data: detailData } = await axios.get(
        `https://api.printful.com/store/products/${external_id}`,
        {
          headers: {
            Authorization: `Bearer ${PRINTFUL_API_KEY}`,
            'X-PF-Store-Id': STORE_ID
          }
        }
      );

      const { name, description, thumbnail_url, sync_product, sync_variants } =
        detailData.result;

      // INSERT / UPDATE produit principal
      await pool.execute(
        `INSERT INTO products
          (name, description, image, external_id, created_at, updated_at, brand, category, is_featured, is_visible)
        VALUES (?, ?, ?, ?, NOW(), NOW(), ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name), description = VALUES(description), image = VALUES(image), updated_at = NOW()`,
        [
          name ?? '',
          description ?? sync_product?.description ?? '',
          sync_product?.thumbnail_url ?? thumbnail_url ?? '',
          external_id ?? '',
          sync_product?.brand ?? null,
          sync_product?.category ?? null,
          0,
          1
        ]
      );

      const [[productRow]] = await pool.execute(
        'SELECT id FROM products WHERE external_id = ?',
        [external_id]
      );
      const product_id = productRow.id;

      for (const variant of sync_variants) {
        const optionsJson = JSON.stringify(variant.options ?? []);
        const previewImage =
          variant.files?.find((f) => f.type === 'preview')?.preview_url || '';

        await pool.execute(
          `INSERT INTO product_variants
            (product_id, sku, price, custom_price, discount_price, image, size, color, stock,
             is_active, created_at, options, printful_variant_id, variant_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            price = VALUES(price), custom_price = VALUES(custom_price), discount_price = VALUES(discount_price),
            image = VALUES(image), size = VALUES(size), color = VALUES(color), stock = VALUES(stock),
            is_active = VALUES(is_active), options = VALUES(options),
            printful_variant_id = VALUES(printful_variant_id), variant_id = VALUES(variant_id)`,
          [
            product_id,
            variant.sku ?? '',
            variant.retail_price ?? 0,
            null,
            null,
            previewImage,
            variant.size ?? null,
            variant.color ?? null,
            variant.stock ?? null,
            1,
            optionsJson,
            variant.id?.toString() ?? null, // ⬅️ printful_variant_id (long ID)
            variant.variant_id?.toString() ?? null // ⬅️ variant_id (court ID requis par Printful pour shipping)
          ]
        );

        const [[variantRow]] = await pool.execute(
          'SELECT id FROM product_variants WHERE sku = ?',
          [variant.sku]
        );
        const variant_id = variantRow.id;

        if (variant.files && variant.files.length) {
          for (const file of variant.files) {
            await pool.execute(
              `INSERT IGNORE INTO product_images
                (variant_id, type, url, filename, mime_type, width, height, dpi, status, created_at, preview_url, thumbnail_url)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
              [
                variant_id,
                file.type ?? null,
                file.url ?? null,
                file.filename ?? null,
                file.mime_type ?? null,
                file.width ?? null,
                file.height ?? null,
                file.dpi ?? null,
                file.status ?? null,
                file.preview_url ?? null,
                file.thumbnail_url ?? null
              ]
            );
          }
        }
      }
    }

    process.exit(0);
  } catch (err) {
    if (err.response) {
      await logError('Erreur import', 'import', {
        details: {
          url: err.config?.url,
          status: err.response.status,
          data: err.response.data,
          err
        }
      });
    } else {
      await logError('Erreur import', 'import', { details: err });
    }
    process.exit(1);
  }
}

importProducts();
