// controllers/complianceEmailController.js
import { parseUnsubToken } from '../services/unsubscribeToken.js';
import { markCustomerSubscribed } from '../services/emailService.js';
import { getPool } from '../db.js';

async function revokeMarketingForEmail(email) {
  const pool = await getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO unsubscribes (email, reason, created_at)
       VALUES (?, 'user_click', UTC_TIMESTAMP())
       ON DUPLICATE KEY UPDATE created_at = UTC_TIMESTAMP(), reason='user_click'`,
      [email]
    );

    await connection.query(
      `UPDATE customers SET is_subscribed = 0 WHERE email = ?`,
      [email]
    );

    await connection.query(
      `UPDATE consents
          SET revoked_at = UTC_TIMESTAMP()
        WHERE email = ?
          AND purpose = 'marketing_email'
          AND revoked_at IS NULL`,
      [email]
    );

    await connection.commit();
  } catch (err) {
    try {
      await connection.rollback();
    } catch {
      /* keep original error */
    }
    throw err;
  } finally {
    connection.release();
  }
}

export async function recordConsent(req, res) {
  const db = req.app.locals.db;

  try {
    const body = req.body || {};
    const {
      subject_type = 'email',
      email,
      customer_id = null,
      purpose = 'marketing_email',
      basis = 'express',
      method = 'checkbox',
      text_snapshot,
      locale = 'fr-CA',
      source = 'checkout',
      ip,
      user_agent
    } = body;

    const e = String(email || '')
      .trim()
      .toLowerCase();
    if (!e || !text_snapshot)
      return res
        .status(400)
        .json({ error: 'email and text_snapshot required' });

    await db.query(
      `INSERT INTO consents
       (customer_id, subject_type, subject_id, email, purpose, basis, method, text_snapshot, locale, source, ip, user_agent, granted_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP())`,
      [
        customer_id,
        subject_type,
        null,
        e,
        purpose,
        basis,
        method,
        text_snapshot,
        locale,
        source,
        ip || null,
        user_agent || null
      ]
    );

    await markCustomerSubscribed(e, true);
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('recordConsent error', err);
    res.status(500).json({ error: 'consent failed' });
  }
}

export async function unsubscribePost(req, res) {
  try {
    const token = req.body?.token || req.query?.e;
    const email = parseUnsubToken(token);
    await revokeMarketingForEmail(email);
    res.json({ ok: true });
  } catch (err) {
    console.error('unsubscribePost error', err);
    res.status(400).json({ error: 'invalid token' });
  }
}

export async function emailWebhook(req, res) {
  const db = req.app.locals.db;

  try {
    const provider = (req.params.provider || '').toLowerCase();
    const body = req.body || {};
    let events = [];

    if (provider === 'sendgrid') {
      events = Array.isArray(body) ? body : [];
      events = events.map((ev) => ({
        email: String(ev.email || '').toLowerCase(),
        type:
          ev.event === 'spamreport'
            ? 'complaint'
            : ev.event === 'dropped'
            ? 'reject'
            : ev.event,
        occurred_at: new Date((ev.timestamp || Date.now()) * 1000),
        meta: ev
      }));
    } else if (provider === 'mailgun') {
      const ev = body?.event?.event || body?.event;
      const email = body?.event?.recipient || body?.recipient;
      events = [
        {
          email: String(email || '').toLowerCase(),
          type: ev,
          occurred_at: new Date(),
          meta: body
        }
      ];
    } else if (provider === 'ses') {
      const m = body?.Message ? JSON.parse(body.Message) : body;
      const mail = m?.mail;
      const rec =
        m?.bounce?.bouncedRecipients?.[0]?.emailAddress ||
        m?.complaint?.complainedRecipients?.[0]?.emailAddress ||
        mail?.destination?.[0];
      const type = m?.notificationType?.toLowerCase();
      events = rec
        ? [
            {
              email: String(rec).toLowerCase(),
              type,
              occurred_at: new Date(),
              meta: m
            }
          ]
        : [];
    }

    for (const ev of events) {
      if (!ev.email || !ev.type) continue;
      await db.query(
        `INSERT INTO email_events (email, type, occurred_at, meta) VALUES (?,?,?,?)`,
        [ev.email, ev.type, ev.occurred_at, JSON.stringify(ev.meta || {})]
      );
      if (['bounce', 'complaint', 'reject'].includes(ev.type)) {
        await db.query(
          `INSERT INTO unsubscribes (email, reason, created_at)
           VALUES (?, 'provider_${ev.type}', UTC_TIMESTAMP())
           ON DUPLICATE KEY UPDATE reason=VALUES(reason), created_at=UTC_TIMESTAMP()`,
          [ev.email]
        );
        await markCustomerSubscribed(ev.email, false);
      }
    }

    res.json({ ok: true, count: events.length });
  } catch (err) {
    console.error('emailWebhook error', err);
    res.status(500).json({ error: 'webhook failed' });
  }
}
