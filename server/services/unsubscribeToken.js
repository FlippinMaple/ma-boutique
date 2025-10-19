// services/unsubscribeToken.js
import crypto from 'crypto';
const HMAC_SECRET = process.env.UNSUB_HMAC_SECRET || 'change-me';

export function makeUnsubToken(email) {
  const e = String(email || '')
    .trim()
    .toLowerCase();
  const v = 1;
  const mac = crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(`${e}::v${v}`)
    .digest('base64url');
  return Buffer.from(JSON.stringify({ e, v, mac })).toString('base64url');
}

export function parseUnsubToken(token) {
  const payload = JSON.parse(
    Buffer.from(String(token), 'base64url').toString('utf8')
  );
  const expect = crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(`${payload.e.toLowerCase()}::v${payload.v}`)
    .digest('base64url');
  if (expect !== payload.mac) throw new Error('bad token');
  return payload.e.toLowerCase();
}
