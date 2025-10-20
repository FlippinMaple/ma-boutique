// services/emailService.js
import nodemailer from 'nodemailer';

const SENDER_EMAIL = process.env.EMAIL_FROM || 'no-reply@example.com';
const SENDER_NAME = process.env.EMAIL_FROM_NAME || 'Boutique';
const FRONTEND_URL = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');
const BACKEND_URL = (process.env.BACKEND_URL || '').replace(/\/+$/, '');

let transporter = null;
export async function getTransport() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({ jsonTransport: true }); // dev fallback
    return transporter;
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined
  });
  return transporter;
}

export async function sendEmail({ to, subject, html, text, headers }) {
  const t = await getTransport();
  const info = await t.sendMail({
    from: { name: SENDER_NAME, address: SENDER_EMAIL },
    to,
    subject,
    html,
    text,
    headers: headers || {}
  });
  try {
    const parsed =
      typeof info.message === 'string' ? JSON.parse(info.message) : null;
    return parsed?.messageId || info.messageId || null;
  } catch {
    return info.messageId || null;
  }
}

export async function markCustomerSubscribed(email, on, req) {
  const db = req.app.locals.db;

  await db.query(`UPDATE customers SET is_subscribed = ? WHERE email = ?`, [
    on ? 1 : 0,
    email
  ]);
}

export function getFrontendUrl() {
  return FRONTEND_URL || BACKEND_URL || '';
}
export function getSenderName() {
  return SENDER_NAME;
}
