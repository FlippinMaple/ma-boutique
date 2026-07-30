// server/controllers/productsController.js
import { logError } from '../utils/logger.js';

// GET /api/products
export const getVisibleProducts = async (req, res) => {
  try {
    const db = req.app.locals.db; // injecté par server/server.js
    const q = String(req.query.q || '').trim();
    const requestedSort = String(req.query.sort || '').trim();
    const defaultSort = q ? 'relevance' : 'newest';
    const sort = requestedSort || defaultSort;

    const allowedSorts = new Set([
      'relevance',
      'price_asc',
      'price_desc',
      'newest',
      'name_asc'
    ]);

    if (q.length > 100) {
      return res.status(400).json({ error: 'Recherche trop longue.' });
    }

    if (!allowedSorts.has(sort)) {
      return res.status(400).json({ error: 'Tri invalide.' });
    }

    const MAX_SEARCH_TERMS = 8;

    const relevanceWeights = {
      exactName: 1000,
      namePrefix: 600,
      namePhrase: 400,
      nameTerm: 40,
      categoryPhrase: 200,
      categoryTerm: 20,
      brandPhrase: 160,
      brandTerm: 16,
      colorPhrase: 120,
      colorTerm: 12,
      sizePhrase: 100,
      sizeTerm: 10,
      descriptionPhrase: 60,
      descriptionTerm: 6
    };

    const searchTerms = [];
    const seenTerms = new Set();

    for (const term of q.split(/\s+/).filter(Boolean)) {
      const normalizedTerm = term.toLocaleLowerCase('fr-CA');

      if (seenTerms.has(normalizedTerm)) {
        continue;
      }

      seenTerms.add(normalizedTerm);
      searchTerms.push(term);

      if (searchTerms.length === MAX_SEARCH_TERMS) {
        break;
      }
    }

    const effectiveSort = sort === 'relevance' && !q ? 'newest' : sort;

    const orderBySqlBySort = {
      relevance:
        'relevance_score DESC, p.updated_at DESC, p.id DESC, v.id ASC',
      newest: 'p.updated_at DESC, p.id DESC, v.id ASC',
      name_asc: 'p.name ASC, p.id DESC, v.id ASC',
      price_asc:
        '(min_price IS NULL) ASC, min_price ASC, p.name ASC, p.id DESC, v.id ASC',
      price_desc:
        '(min_price IS NULL) ASC, min_price DESC, p.name ASC, p.id DESC, v.id ASC'
    };

    const orderBySql = orderBySqlBySort[effectiveSort];

    const fullPhrasePattern = `%${q}%`;
    const prefixPattern = `${q}%`;

    const relevanceScoreParts = [];
    const relevanceParams = [];

    const addRelevanceScore = (sql, value) => {
      relevanceScoreParts.push(sql);
      relevanceParams.push(value);
    };

    if (q) {
      addRelevanceScore(
        `CASE
           WHEN LOWER(TRIM(COALESCE(p.name, ''))) = LOWER(?)
           THEN ${relevanceWeights.exactName}
           ELSE 0
         END`,
        q
      );

      addRelevanceScore(
        `CASE
           WHEN LOWER(COALESCE(p.name, '')) LIKE LOWER(?)
           THEN ${relevanceWeights.namePrefix}
           ELSE 0
         END`,
        prefixPattern
      );

      addRelevanceScore(
        `CASE
           WHEN LOWER(COALESCE(p.name, '')) LIKE LOWER(?)
           THEN ${relevanceWeights.namePhrase}
           ELSE 0
         END`,
        fullPhrasePattern
      );

      addRelevanceScore(
        `CASE
           WHEN LOWER(COALESCE(p.category, '')) LIKE LOWER(?)
           THEN ${relevanceWeights.categoryPhrase}
           ELSE 0
         END`,
        fullPhrasePattern
      );

      addRelevanceScore(
        `CASE
           WHEN LOWER(COALESCE(p.brand, '')) LIKE LOWER(?)
           THEN ${relevanceWeights.brandPhrase}
           ELSE 0
         END`,
        fullPhrasePattern
      );

      addRelevanceScore(
        `CASE
           WHEN EXISTS (
             SELECT 1
             FROM product_variants rv
             WHERE rv.product_id = p.id
               AND rv.is_active = 1
               AND LOWER(COALESCE(rv.color, '')) LIKE LOWER(?)
           )
           THEN ${relevanceWeights.colorPhrase}
           ELSE 0
         END`,
        fullPhrasePattern
      );

      addRelevanceScore(
        `CASE
           WHEN EXISTS (
             SELECT 1
             FROM product_variants rv
             WHERE rv.product_id = p.id
               AND rv.is_active = 1
               AND LOWER(COALESCE(rv.size, '')) LIKE LOWER(?)
           )
           THEN ${relevanceWeights.sizePhrase}
           ELSE 0
         END`,
        fullPhrasePattern
      );

      addRelevanceScore(
        `CASE
           WHEN LOWER(COALESCE(p.description, '')) LIKE LOWER(?)
           THEN ${relevanceWeights.descriptionPhrase}
           ELSE 0
         END`,
        fullPhrasePattern
      );

      for (const term of searchTerms) {
        const termPattern = `%${term}%`;

        addRelevanceScore(
          `CASE
             WHEN LOWER(COALESCE(p.name, '')) LIKE LOWER(?)
             THEN ${relevanceWeights.nameTerm}
             ELSE 0
           END`,
          termPattern
        );

        addRelevanceScore(
          `CASE
             WHEN LOWER(COALESCE(p.category, '')) LIKE LOWER(?)
             THEN ${relevanceWeights.categoryTerm}
             ELSE 0
           END`,
          termPattern
        );

        addRelevanceScore(
          `CASE
             WHEN LOWER(COALESCE(p.brand, '')) LIKE LOWER(?)
             THEN ${relevanceWeights.brandTerm}
             ELSE 0
           END`,
          termPattern
        );

        addRelevanceScore(
          `CASE
             WHEN EXISTS (
               SELECT 1
               FROM product_variants rv
               WHERE rv.product_id = p.id
                 AND rv.is_active = 1
                 AND LOWER(COALESCE(rv.color, '')) LIKE LOWER(?)
             )
             THEN ${relevanceWeights.colorTerm}
             ELSE 0
           END`,
          termPattern
        );

        addRelevanceScore(
          `CASE
             WHEN EXISTS (
               SELECT 1
               FROM product_variants rv
               WHERE rv.product_id = p.id
                 AND rv.is_active = 1
                 AND LOWER(COALESCE(rv.size, '')) LIKE LOWER(?)
             )
             THEN ${relevanceWeights.sizeTerm}
             ELSE 0
           END`,
          termPattern
        );

        addRelevanceScore(
          `CASE
             WHEN LOWER(COALESCE(p.description, '')) LIKE LOWER(?)
             THEN ${relevanceWeights.descriptionTerm}
             ELSE 0
           END`,
          termPattern
        );
      }
    }

    const relevanceScoreSql = q
      ? `(${relevanceScoreParts.join(' + ')})`
      : '0';

    const searchPatternSql = `(
      LOWER(COALESCE(p.name, '')) LIKE LOWER(?)
      OR LOWER(COALESCE(p.description, '')) LIKE LOWER(?)
      OR LOWER(COALESCE(p.brand, '')) LIKE LOWER(?)
      OR LOWER(COALESCE(p.category, '')) LIKE LOWER(?)
      OR EXISTS (
        SELECT 1
        FROM product_variants sv
        WHERE sv.product_id = p.id
          AND sv.is_active = 1
          AND (
            LOWER(COALESCE(sv.color, '')) LIKE LOWER(?)
            OR LOWER(COALESCE(sv.size, '')) LIKE LOWER(?)
          )
      )
    )`;

    const searchPatterns = q
      ? [
          fullPhrasePattern,
          ...searchTerms
            .filter(
              term =>
                term.toLocaleLowerCase('fr-CA') !==
                q.toLocaleLowerCase('fr-CA')
            )
            .map(term => `%${term}%`)
        ]
      : [];

    const searchSql = q
      ? `AND (${searchPatterns
          .map(() => searchPatternSql)
          .join(' OR ')})`
      : '';

    const searchParams = searchPatterns.flatMap(pattern => [
      pattern,
      pattern,
      pattern,
      pattern,
      pattern,
      pattern
    ]);

    const params = [...relevanceParams, ...searchParams];
    const [rows] = await db.execute(
      `SELECT p.id, p.name, p.description, p.image,
              ${relevanceScoreSql} AS relevance_score,
              (
                SELECT MIN(pv.price)
                FROM product_variants pv
                WHERE pv.product_id = p.id
                  AND pv.is_active = 1
                  AND pv.price IS NOT NULL
              ) AS min_price,
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
       ORDER BY ${orderBySql}`,
      params
    );

    const productsMap = new Map();
    for (const row of rows) {
      if (!productsMap.has(row.id)) {
        productsMap.set(row.id, {
          id: row.id,
          name: row.name,
          description: row.description,
          image: row.image,
          min_price: row.min_price,
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
