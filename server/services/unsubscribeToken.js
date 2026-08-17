// services/unsubscribeToken.js
import crypto from 'crypto';

const LEGACY_HMAC_SECRET = 'change-me';
const PRIMARY_HMAC_SECRET = String(process.env.UNSUB_HMAC_SECRET || '').trim();

function hmacMac(message, secret) {
  return crypto.createHmac('sha256', secret).update(message).digest('base64url');
}

export function makeUnsubToken(email) {
  const e = String(email || '')
    .trim()
    .toLowerCase();
  const v = 1;
  const secret = PRIMARY_HMAC_SECRET || LEGACY_HMAC_SECRET;
  const mac = hmacMac(`${e}::v${v}`, secret);
  return Buffer.from(JSON.stringify({ e, v, mac })).toString('base64url');
}

export function parseUnsubToken(token) {
  const payload = JSON.parse(
    Buffer.from(String(token), 'base64url').toString('utf8')
  );
  const message = `${payload.e.toLowerCase()}::v${payload.v}`;
  const effectiveSecret = PRIMARY_HMAC_SECRET || LEGACY_HMAC_SECRET;
  const expect = hmacMac(message, effectiveSecret);
  if (expect === payload.mac) return payload.e.toLowerCase();

  if (PRIMARY_HMAC_SECRET) {
    const expectLegacy = hmacMac(message, LEGACY_HMAC_SECRET);
    if (expectLegacy === payload.mac) return payload.e.toLowerCase();
  }

  throw new Error('bad token');
}
