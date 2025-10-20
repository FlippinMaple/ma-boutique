// jobs/abandonedCartJob.js
import {
  sendEmail,
  getFrontendUrl,
  getSenderName
} from '../services/emailService.js';
import { makeUnsubToken } from '../services/unsubscribeToken.js';

const RELANCE_INTERVAL_MIN = Number(process.env.RELANCE_INTERVAL_MIN || 15);
const PROMO_LABEL = process.env.PROMO_LABEL || 'une petite remise';
const PROMO_CODE = process.env.PROMO_CODE || 'WELCOME10';
const PROMO_EXPIRY = process.env.PROMO_EXPIRY || 'bientôt';

async function hasExpressConsent(email, req) {
  const db = req.app.locals.db;

  const [r] = await db.query(
    `SELECT 1
       FROM consents
      WHERE (email = ? OR customer_id IN (SELECT id FROM customers WHERE email = ?))
        AND purpose='marketing_email' AND basis='express' AND revoked_at IS NULL
      LIMIT 1`,
    [email, email]
  );
  return r.length > 0;
}
async function isSuppressed(email, req) {
  const db = req.app.locals.db;

  const [r] = await db.query(
    `SELECT 1 FROM (
       SELECT email FROM unsubscribes WHERE email = ?
       UNION
       SELECT email FROM email_events WHERE email = ? AND type IN ('bounce','complaint')
     ) t LIMIT 1`,
    [email, email]
  );
  return r.length > 0;
}
async function hasOrder(email, sessionId, req) {
  const db = req.app.locals.db;

  const [r] = await db.query(
    `SELECT id FROM orders
      WHERE (email = ? OR (checkout_session_id IS NOT NULL AND checkout_session_id = ?))
      LIMIT 1`,
    [email, sessionId || null]
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

async function pickTransactional(limit = 200, req) {
  const db = req.app.locals.db;

  const [rows] = await db.query(
    `SELECT ac.*
       FROM abandoned_carts ac
  LEFT JOIN orders o ON (o.checkout_session_id = ac.checkout_session_id OR o.email = ac.customer_email)
      WHERE ac.is_recovered = 0
        AND o.id IS NULL
        AND ac.created_at >= UTC_TIMESTAMP() - INTERVAL 24 HOUR
        AND (ac.last_email_sent_at IS NULL)
   ORDER BY ac.created_at DESC
      LIMIT ?`,
    [limit]
  );
  return rows;
}
async function pickMarketing(limit = 200, req) {
  const db = req.app.locals.db;

  const [rows] = await db.query(
    `SELECT ac.*
       FROM abandoned_carts ac
       JOIN consents c
         ON c.email = ac.customer_email
        AND c.purpose='marketing_email'
        AND c.basis='express'
        AND c.revoked_at IS NULL
  LEFT JOIN orders o ON (o.checkout_session_id = ac.checkout_session_id OR o.email = ac.customer_email)
  LEFT JOIN unsubscribes u ON u.email = ac.customer_email
      WHERE ac.is_recovered = 0
        AND o.id IS NULL
        AND u.email IS NULL
        AND ac.created_at < UTC_TIMESTAMP() - INTERVAL 24 HOUR
        AND (ac.last_email_sent_at IS NULL OR ac.last_email_sent_at < UTC_TIMESTAMP() - INTERVAL 24 HOUR)
   ORDER BY ac.created_at DESC
      LIMIT ?`,
    [limit]
  );
  return rows;
}

async function sendTransactional(ac, req) {
  const db = req.app.locals.db;

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

async function sendMarketing(ac, req) {
  const db = req.app.locals.db;

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
  setInterval(async () => {
    try {
      const tx = await pickTransactional(200);
      for (const ac of tx) await sendTransactional(ac);
      const mk = await pickMarketing(200);
      for (const ac of mk) await sendMarketing(ac);
    } catch (e) {
      console.error('[cron] abandoned carts error', e);
    }
  }, every);
}
