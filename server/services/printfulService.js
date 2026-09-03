// server/services/printfulService.js
import axios from 'axios';
import { logError } from '../utils/logger.js';

axios.defaults.timeout = 10000; // 10s

const PRINTFUL_AVAILABILITY_CACHE_TTL_MS = 60_000;
const PRINTFUL_AVAILABILITY_CACHE_MAX_ENTRIES = 500;

/** printful_variant_id → { status, cachedAt } */
const availabilityCache = new Map();
/** printful_variant_id → Promise en cours (dédup in-flight) */
const availabilityInflight = new Map();

function readCachedAvailability(key) {
  const cached = availabilityCache.get(key);
  if (!cached) return undefined;
  if (Date.now() - cached.cachedAt >= PRINTFUL_AVAILABILITY_CACHE_TTL_MS) {
    availabilityCache.delete(key);
    return undefined;
  }
  return cached;
}

function writeCachedAvailability(key, status) {
  if (
    !availabilityCache.has(key) &&
    availabilityCache.size >= PRINTFUL_AVAILABILITY_CACHE_MAX_ENTRIES
  ) {
    const oldestKey = availabilityCache.keys().next().value;
    if (oldestKey !== undefined) availabilityCache.delete(oldestKey);
  }
  availabilityCache.set(key, { status, cachedAt: Date.now() });
}

async function fetchPrintfulAvailability(key) {
  try {
    const response = await axios.get(
      `https://api.printful.com/sync/variant/${key}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
          'X-PF-Store-Id': process.env.PRINTFUL_STORE_ID
        }
      }
    );
    const status =
      response.data?.result?.sync_variant?.availability_status || null;
    writeCachedAvailability(key, status);
    return status;
  } catch (error) {
    const httpStatus = error?.response?.status;
    const axiosCode = error?.code;
    const detail = [
      'Printful availability request failed',
      Number.isInteger(httpStatus) && httpStatus >= 100 && httpStatus <= 599
        ? `status=${httpStatus}`
        : null,
      typeof axiosCode === 'string' && /^[A-Z0-9._-]{1,40}$/i.test(axiosCode)
        ? `code=${axiosCode}`
        : null
    ]
      .filter(Boolean)
      .join(' ');
    await logError(detail, 'printful');
    throw new Error('PRINTFUL_AVAILABILITY_FAILED');
  }
}

export const getPrintfulVariantAvailability = async (printful_variant_id) => {
  const key = String(printful_variant_id);

  const cached = readCachedAvailability(key);
  if (cached) return cached.status;

  const pending = availabilityInflight.get(key);
  if (pending) return pending;

  const request = fetchPrintfulAvailability(key).finally(() => {
    availabilityInflight.delete(key);
  });
  availabilityInflight.set(key, request);
  return request;
};
