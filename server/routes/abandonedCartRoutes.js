// server/routes/abandonedCartRoutes.js
import { Router } from 'express';
import express from 'express';
import { abandonedCartLimiter } from '../middlewares/rateLimiters.js';

const router = Router();

// Aligné sur checkoutController.js — ne pas importer le contrôleur.
const MAX_CART_LINES = 20;
const MAX_QUANTITY_PER_LINE = 20;
const MAX_EMAIL_LENGTH = 100;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parsePositiveSafeInteger(value) {
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value <= 0 || !Number.isSafeInteger(value)) {
      return null;
    }
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^[1-9]\d*$/.test(trimmed)) return null;
    const n = Number(trimmed);
    if (!Number.isSafeInteger(n) || n <= 0) return null;
    return n;
  }
  return null;
}

function parseSnapshotPrice(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) return null;
    if (value > Number.MAX_SAFE_INTEGER / 100) return null;
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0) return null;
    if (n > Number.MAX_SAFE_INTEGER / 100) return null;
    return n;
  }
  return null;
}

function sanitizeAbandonedItem(it) {
  if (!it || typeof it !== 'object' || Array.isArray(it)) return null;

  const id = parsePositiveSafeInteger(it.id);
  if (id == null) return null;

  if (typeof it.name !== 'string') return null;
  const name = it.name.trim();
  if (!name) return null;

  const quantity = parsePositiveSafeInteger(it.quantity);
  if (quantity == null || quantity > MAX_QUANTITY_PER_LINE) return null;

  const price = parseSnapshotPrice(it.price);
  if (price == null) return null;

  let variant_id = null;
  if (it.variant_id != null) {
    variant_id = parsePositiveSafeInteger(it.variant_id);
    if (variant_id == null) return null;
  }

  let printful_variant_id = null;
  if (it.printful_variant_id != null) {
    printful_variant_id = parsePositiveSafeInteger(it.printful_variant_id);
    if (printful_variant_id == null) return null;
  }

  return { id, name, quantity, price, variant_id, printful_variant_id };
}

// text/plain: sendBeacon Blob. application/json: already parsed globally in app.js.
router.post('/log-abandoned-cart', abandonedCartLimiter, express.text({ type: 'text/plain', limit: '100kb' }), async (req, res) => {
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

    const rawEmail = payload.customer_email ?? payload.email;
    if (typeof rawEmail !== 'string') return res.sendStatus(204);
    const email = rawEmail.trim().toLowerCase();
    if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email)) {
      return res.sendStatus(204);
    }

    const snapshot = payload.cart_contents ?? payload.cart_snapshot ?? null;
    if (!Array.isArray(snapshot) || snapshot.length === 0) {
      return res.sendStatus(204);
    }
    if (snapshot.length > MAX_CART_LINES) return res.sendStatus(204);

    const sanitizedCart = [];
    for (const it of snapshot) {
      const item = sanitizeAbandonedItem(it);
      if (!item) return res.sendStatus(204);
      sanitizedCart.push(item);
    }

    const sourceRaw = String(payload.reason || payload.source || 'beforeunload')
      .trim()
      .toLowerCase();
    const source = ['beforeunload', 'manual', 'inactivity'].includes(sourceRaw)
      ? sourceRaw
      : 'beforeunload';

    const cartJson = JSON.stringify(sanitizedCart);

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
