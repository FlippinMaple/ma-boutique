// jobs/abandonedCartJob.js
import {
  sendEmail,
  getFrontendUrl,
  getSenderName
} from '../services/emailService.js';
import { makeUnsubToken } from '../services/unsubscribeToken.js';
import { getDb } from '../utils/db.js';

const RELANCE_INTERVAL_MIN = Number(process.env.RELANCE_INTERVAL_MIN || 15);
const PROMO_LABEL = process.env.PROMO_LABEL || 'une petite remise';
const PROMO_CODE = process.env.PROMO_CODE || 'WELCOME10';
const PROMO_EXPIRY = process.env.PROMO_EXPIRY || 'bientôt';
const ABANDON_CRON_LOCK_NAME = 'flippinmaple:abandoned-cart-cron';

async function hasExpressConsent(email) {
  const db = await getDb();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return false;

  const [r] = await db.query(
    `SELECT 1
       FROM consents c
      WHERE c.purpose = 'marketing_email'
        AND c.basis = 'express'
        AND c.revoked_at IS NULL
        AND (c.expires_at IS NULL OR c.expires_at > UTC_TIMESTAMP())
        AND (
              BINARY LOWER(TRIM(IFNULL(c.email, ''))) = BINARY ?
           OR c.customer_id IN (
                SELECT cu.id
                  FROM customers cu
                 WHERE BINARY LOWER(TRIM(IFNULL(cu.email, ''))) = BINARY ?
              )
            )
        AND NOT EXISTS (
              SELECT 1
                FROM customers cu
               WHERE BINARY LOWER(TRIM(IFNULL(cu.email, ''))) = BINARY ?
                 AND COALESCE(cu.is_subscribed, 0) <> 1
            )
      LIMIT 1`,
    [normalizedEmail, normalizedEmail, normalizedEmail]
  );
  return r.length > 0;
}
async function isSuppressed(email) {
  const db = await getDb();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return false;

  const [r] = await db.query(
    `SELECT 1 FROM (
       SELECT email FROM unsubscribes WHERE email = ?
       UNION
       SELECT email FROM email_events WHERE email = ? AND type IN ('bounce','complaint')
     ) t LIMIT 1`,
    [normalizedEmail, normalizedEmail]
  );
  return r.length > 0;
}
async function hasOrder(email, sessionId) {
  const db = await getDb();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const sid = sessionId == null || sessionId === '' ? null : String(sessionId);

  const [r] = await db.query(
    `SELECT id FROM orders
      WHERE (
              (? IS NOT NULL AND stripe_session_id = ?)
           OR (? <> '' AND BINARY LOWER(TRIM(IFNULL(customer_email, ''))) = BINARY ?)
           OR (? <> '' AND BINARY LOWER(TRIM(IFNULL(email_snapshot, ''))) = BINARY ?)
            )
      LIMIT 1`,
    [sid, sid, normalizedEmail, normalizedEmail, normalizedEmail, normalizedEmail]
  );
  return r.length > 0;
}

function transactionalTemplate({ siteName, items, resumeUrl }) {
  const lines = (items || [])
    .map((i) => `• ${i.name} × ${i.quantity}`)
    .join('<br/>');
  const textLines = (items || [])
    .map((i) => `• ${i.name} × ${i.quantity}`)
    .join('\n');
  return {
    subject: `Vous pouvez reprendre votre commande`,
    html: `<div style="font-family:Arial"><p>Vous aviez commencé une commande sur <b>${siteName}</b>.</p><p>${lines}</p><p><a href="${resumeUrl}" style="background:#111;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none">Reprendre ma commande</a></p><hr/><p style="font-size:12px;color:#666">Message transactionnel.</p></div>`,
    text: `Reprendre votre commande\n${textLines}\n${resumeUrl}\n(Message transactionnel)`
  };
}
function marketingTemplate({ siteName, items, resumeUrl, email }) {
  const lines = (items || [])
    .map((i) => `• ${i.name} × ${i.quantity}`)
    .join('<br/>');
  const textLines = (items || [])
    .map((i) => `• ${i.name} × ${i.quantity}`)
    .join('\n');
  const unsubUrl = `${getFrontendUrl()}/unsubscribe?e=${encodeURIComponent(
    makeUnsubToken(email)
  )}`;
  return {
    subject: `Il ne manque plus qu’un clic — et voici ${PROMO_LABEL}`,
    html: `<div style="font-family:Arial"><p>Votre panier chez <b>${siteName}</b> est encore disponible.</p><p>Voici ${PROMO_LABEL} : <b>${PROMO_CODE}</b> (valide jusqu’au ${PROMO_EXPIRY}).</p><p>${lines}</p><p><a href="${resumeUrl}" style="background:#0a7;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none">Finaliser ma commande</a></p><hr/><p style="font-size:12px;color:#666"><a href="${unsubUrl}">Se désabonner</a></p></div>`,
    text: `Panier ${siteName}\n${textLines}\nCode ${PROMO_CODE} (jusqu’au ${PROMO_EXPIRY})\n${resumeUrl}\nUnsub: ${unsubUrl}`
  };
}

async function getItemsPreview(ac) {
  try {
    const json = ac.cart_contents || ac.cart_snapshot;
    const list = typeof json === 'string' ? JSON.parse(json) : json;
    return (list || []).map((x) => ({ name: x.name, quantity: x.quantity }));
  } catch {
    return [];
  }
}
async function resumeUrlFor(ac) {
  return `${getFrontendUrl()}/shop?resume=${encodeURIComponent(ac.id)}`;
}

async function pickTransactional(limit = 200) {
  const db = await getDb();

  const [rows] = await db.query(
    `SELECT ac.*
       FROM abandoned_carts ac
      WHERE ac.is_recovered = 0
        AND NOT EXISTS (
              SELECT 1
                FROM orders o
               WHERE (
                       (ac.checkout_session_id IS NOT NULL
                        AND ac.checkout_session_id <> ''
                        AND o.stripe_session_id = ac.checkout_session_id)
                    OR BINARY LOWER(TRIM(IFNULL(o.customer_email, '')))
                       = BINARY LOWER(TRIM(IFNULL(ac.customer_email, '')))
                    OR BINARY LOWER(TRIM(IFNULL(o.email_snapshot, '')))
                       = BINARY LOWER(TRIM(IFNULL(ac.customer_email, '')))
                     )
            )
        AND ac.created_at >= UTC_TIMESTAMP() - INTERVAL 24 HOUR
        AND (ac.last_email_sent_at IS NULL)
   ORDER BY ac.created_at DESC
      LIMIT ?`,
    [limit]
  );
  return rows;
}
async function pickMarketing(limit = 200) {
  const db = await getDb();

  const [rows] = await db.query(
    `SELECT ac.*
       FROM abandoned_carts ac
      WHERE ac.is_recovered = 0
        AND NOT EXISTS (
              SELECT 1
                FROM orders o
               WHERE (
                       (ac.checkout_session_id IS NOT NULL
                        AND ac.checkout_session_id <> ''
                        AND o.stripe_session_id = ac.checkout_session_id)
                    OR BINARY LOWER(TRIM(IFNULL(o.customer_email, '')))
                       = BINARY LOWER(TRIM(IFNULL(ac.customer_email, '')))
                    OR BINARY LOWER(TRIM(IFNULL(o.email_snapshot, '')))
                       = BINARY LOWER(TRIM(IFNULL(ac.customer_email, '')))
                     )
            )
        AND EXISTS (
              SELECT 1
                FROM consents c
               WHERE c.purpose = 'marketing_email'
                 AND c.basis = 'express'
                 AND c.revoked_at IS NULL
                 AND (c.expires_at IS NULL OR c.expires_at > UTC_TIMESTAMP())
                 AND (
                       BINARY LOWER(TRIM(IFNULL(c.email, '')))
                         = BINARY LOWER(TRIM(IFNULL(ac.customer_email, '')))
                    OR c.customer_id IN (
                         SELECT cu.id
                           FROM customers cu
                          WHERE BINARY LOWER(TRIM(IFNULL(cu.email, '')))
                              = BINARY LOWER(TRIM(IFNULL(ac.customer_email, '')))
                       )
                     )
            )
        AND NOT EXISTS (
              SELECT 1
                FROM unsubscribes u
               WHERE BINARY LOWER(TRIM(IFNULL(u.email, '')))
                   = BINARY LOWER(TRIM(IFNULL(ac.customer_email, '')))
            )
        AND NOT EXISTS (
              SELECT 1
                FROM customers cu
               WHERE BINARY LOWER(TRIM(IFNULL(cu.email, '')))
                   = BINARY LOWER(TRIM(IFNULL(ac.customer_email, '')))
                 AND COALESCE(cu.is_subscribed, 0) <> 1
            )
        AND ac.created_at < UTC_TIMESTAMP() - INTERVAL 24 HOUR
        AND (ac.last_email_sent_at IS NULL OR ac.last_email_sent_at < UTC_TIMESTAMP() - INTERVAL 24 HOUR)
   ORDER BY ac.created_at DESC
      LIMIT ?`,
    [limit]
  );
  return rows;
}

async function sendTransactional(ac) {
  const db = await getDb();

  const email = String(ac.customer_email || '').toLowerCase();
  if (!email) return false;
  if (await isSuppressed(email)) return false;
  if (await hasOrder(email, ac.checkout_session_id)) return false;
  const url = await resumeUrlFor(ac);
  const items = await getItemsPreview(ac);
  const tpl = transactionalTemplate({
    siteName: getSenderName(),
    items,
    resumeUrl: url
  });
  await sendEmail({
    to: email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    headers: { 'X-Campaign': 'ac-transactional' }
  });
  await db.query(
    `UPDATE abandoned_carts SET last_email_sent_at = UTC_TIMESTAMP() WHERE id = ?`,
    [ac.id]
  );
  return true;
}

async function sendMarketing(ac) {
  const db = await getDb();

  const email = String(ac.customer_email || '').toLowerCase();
  if (!email) return false;
  if (!(await hasExpressConsent(email))) return false;
  if (await isSuppressed(email)) return false;
  if (await hasOrder(email, ac.checkout_session_id)) return false;
  const url = await resumeUrlFor(ac);
  const items = await getItemsPreview(ac);
  const tpl = marketingTemplate({
    siteName: getSenderName(),
    items,
    resumeUrl: url,
    email
  });
  await sendEmail({
    to: email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    headers: { 'X-Campaign': 'ac-marketing' }
  });
  await db.query(
    `UPDATE abandoned_carts SET last_email_sent_at = UTC_TIMESTAMP(), campaign_id='ac-marketing' WHERE id = ?`,
    [ac.id]
  );
  return true;
}

export function startAbandonedCartCron() {
  const every = Math.max(5, RELANCE_INTERVAL_MIN) * 60 * 1000;
  let tickRunning = false;
  setInterval(async () => {
    if (tickRunning) return;
    tickRunning = true;

    let lockConnection = null;
    let lockAcquired = false;
    try {
      const db = await getDb();
      lockConnection = await db.getConnection();
      const [lockRows] = await lockConnection.query(
        'SELECT GET_LOCK(?, 0) AS acquired',
        [ABANDON_CRON_LOCK_NAME]
      );
      lockAcquired = Number(lockRows?.[0]?.acquired) === 1;
      if (!lockAcquired) return;

      const tx = await pickTransactional(200);
      for (const ac of tx) await sendTransactional(ac);
      const mk = await pickMarketing(200);
      for (const ac of mk) await sendMarketing(ac);
    } catch (e) {
      console.error('[cron] abandoned carts error', e);
    } finally {
      if (lockConnection && lockAcquired) {
        try {
          await lockConnection.query('SELECT RELEASE_LOCK(?) AS released', [
            ABANDON_CRON_LOCK_NAME
          ]);
        } catch {
          /* keep releasing the connection */
        }
      }
      if (lockConnection) {
        lockConnection.release();
      }
      tickRunning = false;
    }
  }, every);
}
