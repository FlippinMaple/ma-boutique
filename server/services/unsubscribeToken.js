// services/unsubscribeToken.js
import crypto from 'crypto';

const PRIMARY_HMAC_SECRET = String(process.env.UNSUB_HMAC_SECRET || '').trim();
if (!PRIMARY_HMAC_SECRET) {
  throw new Error('UNSUB_HMAC_SECRET is required');
}

function hmacMac(message, secret) {
  return crypto.createHmac('sha256', secret).update(message).digest('base64url');
}

export function makeUnsubToken(email) {
  const e = String(email || '')
    .trim()
    .toLowerCase();
  const v = 1;
  const mac = hmacMac(`${e}::v${v}`, PRIMARY_HMAC_SECRET);
  return Buffer.from(JSON.stringify({ e, v, mac })).toString('base64url');
}

export function parseUnsubToken(token) {
  const payload = JSON.parse(
    Buffer.from(String(token), 'base64url').toString('utf8')
  );
  const expect = hmacMac(
    `${payload.e.toLowerCase()}::v${payload.v}`,
    PRIMARY_HMAC_SECRET
  );
  if (expect !== payload.mac) throw new Error('bad token');
  return payload.e.toLowerCase();
}
