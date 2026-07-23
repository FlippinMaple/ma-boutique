// server/controllers/adminController.js
import { logError } from '../utils/logger.js';

/** GET /api/admin/health/paid-without-items */
export async function healthPaidWithoutItems(req, res) {
  const db = req.app.locals.db;
  try {
    const [rows] = await db.query(`
      SELECT o.id, o.customer_email, o.total, o.currency, o.created_at
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status = 'paid'
      GROUP BY o.id
      HAVING COUNT(oi.id) = 0
      ORDER BY o.created_at DESC
      LIMIT 100
    `);
    return res.json(rows);
  } catch (err) {
    await logError(err, 'admin.healthPaidWithoutItems');
    return res.status(500).json({ error: 'Admin health failed' });
  }
}

/** GET /api/admin/orders?q=&status=&page=&pageSize= */
export async function listOrders(req, res) {
  const db = req.app.locals.db;
  try {
    const q = String(req.query.q || '').trim();
    const status = String(req.query.status || '').trim();
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(req.query.pageSize || 25))
    );
    const offset = (page - 1) * pageSize;

    const where = [];
    const params = [];
    if (status) {
      where.push(`o.status = ?`);
      params.push(status);
    }
    if (q) {
      where.push(`(o.customer_email LIKE ? OR o.id = ?)`);
      params.push(`%${q}%`, Number.isFinite(Number(q)) ? Number(q) : -1);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await db.query(
      `
      SELECT o.id, o.status, o.total, o.currency, o.customer_email, o.created_at,
             COUNT(oi.id) AS items_count
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      ${whereSql}
      GROUP BY o.id
      ORDER BY o.id DESC
      LIMIT ? OFFSET ?
      `,
      [...params, pageSize, offset]
    );

    const [[{ cnt }]] = await db.query(
      `SELECT COUNT(*) AS cnt FROM orders o ${whereSql}`,
      params
    );

    return res.json({ page, pageSize, total: cnt, results: rows });
  } catch (err) {
    await logError(err, 'admin.listOrders');
    return res.status(500).json({ error: 'Admin orders failed' });
  }
}

/** GET /api/admin/orders/:id */
export async function getOrderDetail(req, res) {
  const db = req.app.locals.db;
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Bad id' });

    const [[order]] = await db.query(`SELECT * FROM orders WHERE id = ?`, [id]);
    if (!order) return res.status(404).json({ error: 'Not found' });

    const [items] = await db.query(
      `
      SELECT
        oi.*,
        pv.variant_id AS variant_business_id
      FROM order_items oi
      LEFT JOIN product_variants pv ON pv.id = oi.variant_id
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC
      `,
      [id]
    );

    const [history] = await db.query(
      `SELECT old_status, new_status, changed_at FROM order_status_history WHERE order_id = ? ORDER BY changed_at ASC`,
      [id]
    );

    return res.json({ order, items, history });
  } catch (err) {
    await logError(err, 'admin.getOrderDetail');
    return res.status(500).json({ error: 'Admin order detail failed' });
  }
}

/** GET /api/admin/stripe-events?type=&q=&page=&pageSize= */
export async function listStripeEvents(req, res) {
  const db = req.app.locals.db;
  try {
    const type = String(req.query.type || '').trim();
    const q = String(req.query.q || '').trim();
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(req.query.pageSize || 25))
    );
    const offset = (page - 1) * pageSize;

    const where = [];
    const params = [];
    if (type) {
      where.push(`event_type = ?`);
      params.push(type);
    }
    if (q) {
      where.push(`(event_id = ? OR order_id = ?)`);
      params.push(q, Number.isFinite(Number(q)) ? Number(q) : -1);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await db.query(
      `
      SELECT event_id, event_type, created_at, order_id
      FROM stripe_events
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
      `,
      [...params, pageSize, offset]
    );

    const [[{ cnt }]] = await db.query(
      `SELECT COUNT(*) AS cnt FROM stripe_events ${whereSql}`,
      params
    );

    return res.json({ page, pageSize, total: cnt, results: rows });
  } catch (err) {
    await logError(err, 'admin.listStripeEvents');
    return res.status(500).json({ error: 'Admin stripe events failed' });
  }
}

/** GET /api/admin/products */
export async function listAdminProducts(req, res) {
  const db = req.app.locals.db;
  try {
    const [rows] = await db.query(
      `
      SELECT
        p.id,
        p.name,
        p.image,
        p.is_visible,
        p.is_featured,
        p.updated_at,
        (
          SELECT MIN(pv.price)
          FROM product_variants pv
          WHERE pv.product_id = p.id
            AND pv.is_active = 1
        ) AS price
      FROM products p
      WHERE p.name IS NOT NULL
        AND TRIM(p.name) <> ''
      ORDER BY p.is_featured DESC, p.updated_at DESC, p.id DESC
      `
    );

    return res.json({ maxFeatured: 4, results: rows });
  } catch (err) {
    await logError(err, 'admin.listAdminProducts');
    return res.status(500).json({ error: 'Admin products failed' });
  }
}

/** PATCH /api/admin/products/:id/featured */
export async function updateProductFeatured(req, res) {
  const db = req.app.locals.db;
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Bad id' });
    }

    const body = req.body || {};
    const { is_featured } = body;
    if (typeof is_featured !== 'boolean') {
      return res.status(400).json({ error: 'is_featured must be boolean' });
    }

    const [[product]] = await db.query(
      `
      SELECT id, name, image, is_visible, is_featured, updated_at
      FROM products
      WHERE id = ?
      `,
      [id]
    );
    if (!product) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (is_featured) {
      if (!product.is_visible) {
        return res
          .status(409)
          .json({ error: 'Invisible product cannot be featured' });
      }

      const name = product.name;
      if (name == null || String(name).trim() === '') {
        return res
          .status(409)
          .json({ error: 'Unnamed product cannot be featured' });
      }

      if (product.is_featured) {
        return res.json({ product, maxFeatured: 4 });
      }

      const [[{ cnt }]] = await db.query(
        `
        SELECT COUNT(*) AS cnt
        FROM products
        WHERE is_featured = 1
          AND is_visible = 1
          AND name IS NOT NULL
          AND TRIM(name) <> ''
          AND id <> ?
        `,
        [id]
      );

      if (cnt >= 4) {
        return res.status(409).json({
          error: 'Maximum featured products reached',
          maxFeatured: 4,
        });
      }
    }

    await db.query(`UPDATE products SET is_featured = ? WHERE id = ?`, [
      is_featured ? 1 : 0,
      id,
    ]);

    const [[updated]] = await db.query(
      `
      SELECT id, name, image, is_visible, is_featured, updated_at
      FROM products
      WHERE id = ?
      `,
      [id]
    );

    return res.json({ product: updated, maxFeatured: 4 });
  } catch (err) {
    await logError(err, 'admin.updateProductFeatured');
    return res.status(500).json({ error: 'Admin product update failed' });
  }
}
