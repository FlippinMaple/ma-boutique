// server/models/wishlistModel.js
export async function getWishlist(userId, req) {
  const db = req.app.locals.db;
  const [rows] = await db.execute(
    `SELECT w.id, w.user_id, w.product_id, p.name, p.image
       FROM wishlist w
       JOIN products p ON p.id = w.product_id
      WHERE w.user_id = ?
      ORDER BY w.id DESC`,
    [userId]
  );
  return rows;
}

export async function addToWishlist(userId, productId, req) {
  const db = req.app.locals.db;
  const [res] = await db.execute(
    `INSERT INTO wishlist (user_id, product_id, created_at)
     VALUES (?, ?, NOW())`,
    [userId, productId]
  );
  return res.insertId;
}

export async function removeFromWishlist(userId, productId, req) {
  const db = req.app.locals.db;
  const [res] = await db.execute(
    `DELETE FROM wishlist
      WHERE user_id = ? AND product_id = ?`,
    [userId, productId]
  );
  return res.affectedRows ?? 0;
}

export async function isInWishlist(userId, productId, req) {
  const db = req.app.locals.db;
  const [rows] = await db.execute(
    `SELECT 1 FROM wishlist
      WHERE user_id = ? AND product_id = ?
      LIMIT 1`,
    [userId, productId]
  );
  return !!rows[0];
}
