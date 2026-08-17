// services/unsubscribeToken.js
import crypto from 'crypto';

const PRIMARY_HMAC_SECRET = String(process.env.UNSUB_HMAC_SECRET || '').trim();
if (!PRIMARY_HMAC_SECRET) {
  throw new Error('UNSUB_HMAC_SECRET is required');
}

const TOKEN_VERSION = 1;
const HMAC_SHA256_BYTES = 32;
const MAX_EMAIL_LENGTH = 100;
const MAX_TOKEN_LENGTH = 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;
const MAC_B64URL_RE = /^[A-Za-z0-9_-]{43}$/;

function badToken() {
  throw new Error('bad token');
}

function hmacDigest(message) {
  return crypto.createHmac('sha256', PRIMARY_HMAC_SECRET).update(message).digest();
}

function canonicalizeEmail(email) {
  if (typeof email !== 'string') badToken();
  return email.trim().toLowerCase();
}

function assertCanonicalEmail(e) {
  if (typeof e !== 'string' || !e || e.length > MAX_EMAIL_LENGTH) badToken();
  if (e !== e.trim().toLowerCase()) badToken();
  if (!EMAIL_RE.test(e)) badToken();
}

export function makeUnsubToken(email) {
  const e = canonicalizeEmail(email);
  assertCanonicalEmail(e);
  const v = TOKEN_VERSION;
  const mac = hmacDigest(`${e}::v${v}`).toString('base64url');
  return Buffer.from(JSON.stringify({ e, v, mac })).toString('base64url');
}

export function parseUnsubToken(token) {
  if (typeof token !== 'string' || !token || token.length > MAX_TOKEN_LENGTH) {
    badToken();
  }
  if (!BASE64URL_RE.test(token)) badToken();

  let payload;
  try {
    payload = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
  } catch {
    badToken();
  }

  if (
    payload === null ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {
    badToken();
  }

  if (typeof payload.e !== 'string') badToken();
  const e = payload.e.trim().toLowerCase();
  if (payload.e !== e) badToken();
  assertCanonicalEmail(e);

  if (payload.v !== TOKEN_VERSION) badToken();

  if (typeof payload.mac !== 'string' || !MAC_B64URL_RE.test(payload.mac)) {
    badToken();
  }
  const provided = Buffer.from(payload.mac, 'base64url');
  if (provided.length !== HMAC_SHA256_BYTES) badToken();

  const expected = hmacDigest(`${e}::v${TOKEN_VERSION}`);
  if (expected.length !== provided.length) badToken();
  if (!crypto.timingSafeEqual(expected, provided)) badToken();

  return e;
}
