import { logInfo, logError } from '../utils/logger.js';
export async function logAbandonedCart(req, res, next) {
  const db = req.app.locals.db;

  try {
    const { customer_email, cart_contents } = req.body || {};
    if (!customer_email || !cart_contents) {
      return res
        .status(400)
        .json({ error: 'customer_email et cart_contents requis' });
    }

    const email = String(customer_email).trim().toLowerCase();
    const cartJson =
      typeof cart_contents === 'string'
        ? cart_contents
        : JSON.stringify(cart_contents);

    // On cherche un enregistrement "ouvert" (non récupéré) récent pour cet email
    const [rows] = await db.query(
      `SELECT id
         FROM abandoned_carts
        WHERE customer_email = ?
          AND COALESCE(is_recovered, 0) = 0
        ORDER BY abandoned_at DESC
        LIMIT 1`,
      [email]
    );

    if (rows.length) {
      const id = rows[0].id;
      await db.execute(
        `UPDATE abandoned_carts
            SET cart_contents = ?,
                last_activity = NOW(),
                updated_at = NOW()
          WHERE id = ?`,
        [cartJson, id]
      );
      await logInfo(
        `📝 Abandoned cart mis à jour (id ${id}) pour ${email}`,
        'abandoned'
      );
      return res.json({ ok: true, id, updated: true });
    }

    // Sinon: nouveau log
    const [ins] = await db.execute(
      `INSERT INTO abandoned_carts
         (customer_email, cart_contents, abandoned_at, last_activity, notified, is_recovered, created_at, updated_at)
       VALUES (?, ?, NOW(), NOW(), 0, 0, NOW(), NOW())`,
      [email, cartJson]
    );

    await logInfo(
      `📝 Abandoned cart créé (id ${ins.insertId}) pour ${email}`,
      'abandoned'
    );
    return res.json({ ok: true, id: ins.insertId, created: true });
  } catch (err) {
    await logError(`abandoned_cart: ${err.message}`, 'abandoned');
    next(err);
  }
}
