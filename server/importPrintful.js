// importPrintful.js
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

import { getDb } from './utils/db.js';
import { logError, logInfo } from './utils/logger.js';

const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
const STORE_ID = process.env.PRINTFUL_STORE_ID;

/**
 * Importe les produits et variantes depuis Printful.
 * - Met à jour ou insère les produits/variantes présents sur Printful.
 * - Désactive les produits/variantes absents de l’API (is_visible = 0, is_active = 0).
 */
export async function importProducts() {
  const db = await getDb();

  try {
    // Récupère la liste de tous les produits de la boutique
    const { data } = await axios.get(
      'https://api.printful.com/store/products',
      {
        headers: {
          Authorization: `Bearer ${PRINTFUL_API_KEY}`,
          'X-PF-Store-Id': STORE_ID
        }
      }
    );

    const importedExternalIds = [];
    const importedVariantIds = [];

    for (const product of data.result) {
      const external_id = product.id;
      importedExternalIds.push(external_id);

      // Détails (titre, description, variantes…)
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

      // Upsert du produit principal (is_visible à 1)
      await db.execute(
        `INSERT INTO products
          (name, description, image, external_id, created_at, updated_at, brand, category, is_featured, is_visible)
        VALUES (?, ?, ?, ?, NOW(), NOW(), ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          description = VALUES(description),
          image = VALUES(image),
          is_visible = 1,
          updated_at = NOW()`,
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

      // Récupère l’id interne du produit
      const [[productRow]] = await db.execute(
        'SELECT id FROM products WHERE external_id = ?',
        [external_id]
      );
      const product_id = productRow.id;

      // Traitement des variantes
      for (const variant of sync_variants) {
        const optionsJson = JSON.stringify(variant.options ?? []);
        const previewImage =
          variant.files?.find((f) => f.type === 'preview')?.preview_url || '';

        importedVariantIds.push(variant.id.toString());

        await db.execute(
          `INSERT INTO product_variants
            (product_id, sku, price, custom_price, discount_price, image, size, color, stock,
             is_active, created_at, options, printful_variant_id, variant_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            price = VALUES(price),
            custom_price = VALUES(custom_price),
            discount_price = VALUES(discount_price),
            image = VALUES(image),
            size = VALUES(size),
            color = VALUES(color),
            stock = VALUES(stock),
            is_active = 1,
            options = VALUES(options),
            printful_variant_id = VALUES(printful_variant_id),
            variant_id = VALUES(variant_id)`,
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
            1, // is_active
            optionsJson,
            variant.id?.toString() ?? null, // printful_variant_id
            variant.variant_id?.toString() ?? null // variant_id (court)
          ]
        );
      }
    }

    // Étape de nettoyage: rendre invisibles les produits et variants absents
    if (importedExternalIds.length > 0) {
      const placeholders = importedExternalIds.map(() => '?').join(',');
      await db.execute(
        `UPDATE products
            SET is_visible = 0
          WHERE external_id NOT IN (${placeholders})`,
        importedExternalIds
      );
    }
    if (importedVariantIds.length > 0) {
      const variantPlaceholders = importedVariantIds.map(() => '?').join(',');
      await db.execute(
        `UPDATE product_variants
            SET is_active = 0
          WHERE printful_variant_id NOT IN (${variantPlaceholders})`,
        importedVariantIds
      );
    }

    await logInfo('✅ Import produits Printful terminé', 'printful');
  } catch (err) {
    await logError('❌ Erreur import produits Printful', 'printful', err);
    throw err;
  }
}

// Si ce module est exécuté directement (node importPrintful.js)
if (process.argv[1] === import.meta.url || require.main === module) {
  importProducts().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
