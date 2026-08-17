// server/routes/abandonedCartRoutes.js
import { Router } from 'express';
import express from 'express';

const router = Router();

// text/plain: sendBeacon Blob. application/json: already parsed globally in app.js.
router.post('/log-abandoned-cart', express.text({ type: 'text/plain', limit: '100kb' }), async (req, res) => {
  try {
    const db = req.app.locals.db; // ✅ comme avant: la DB passe via Express
    if (!db) return res.status(500).json({ error: 'db db not available' });

    // Body: email + panier
    let payload = req.body || {};
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch {
        return res.sendStatus(204);
      }
    }
    if (
      payload == null ||
      typeof payload !== 'object' ||
      Array.isArray(payload)
    ) {
      return res.sendStatus(204);
    }

    const email = String(payload.customer_email || payload.email || '')
      .trim()
      .toLowerCase();
    const snapshot = payload.cart_contents ?? payload.cart_snapshot ?? null;
    const sourceRaw = String(payload.reason || payload.source || 'beforeunload')
      .trim()
      .toLowerCase();
    const source = ['beforeunload', 'manual', 'inactivity'].includes(sourceRaw)
      ? sourceRaw
      : 'beforeunload';

    if (!email || snapshot == null) return res.sendStatus(204);
    if (Array.isArray(snapshot) && snapshot.length === 0)
      return res.sendStatus(204);

    const cartJson =
      typeof snapshot === 'string' ? snapshot : JSON.stringify(snapshot);

    // (Optionnel) anti-doublon très simple (10 minutes)
    const [recent] = await db.query(
      `SELECT id
         FROM abandoned_carts
        WHERE customer_email = ?
          AND created_at >= NOW() - INTERVAL 10 MINUTE
        ORDER BY created_at DESC
        LIMIT 1`,
      [email]
    );
    if (recent.length) return res.sendStatus(204);

    // ✅ IMPORTANT: ta BDD a cart_contents NOT NULL → on remplit les 2 colonnes
    await db.query(
      `INSERT INTO abandoned_carts
         (customer_email, cart_snapshot, cart_contents, source)
       VALUES (?, ?, ?, ?)`,
      [email, cartJson, cartJson, source]
    );

    return res.status(201).json({ ok: true });
  } catch (e) {
    console.error('log-abandoned-cart error', e);
    // En dev, tu peux renvoyer le détail SQL si tu veux:
    if (process.env.NODE_ENV !== 'production') {
      return res.status(500).json({
        error: 'log abandoned failed',
        code: e.code,
        errno: e.errno,
        sqlState: e.sqlState,
        sqlMessage: e.sqlMessage,
        sql: e.sql
      });
    }
    return res.status(500).json({ error: 'log abandoned failed' });
  }
});

export default router;
