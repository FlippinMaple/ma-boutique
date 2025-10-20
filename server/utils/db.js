// server/utils/db.js
import mysql from 'mysql2/promise';
import { resolveDbConfig } from '../dbConfig.js';

let pool;

/**
 * getDb: retourne un pool mysql2/promise unique (singleton global),
 * créé au premier appel, avec retry et ping.
 */
export async function getDb() {
  if (pool) return pool;

  // Partage le même pool entre tous les modules
  const GLOBAL_KEY = '__APP_DB_POOL__';
  if (globalThis[GLOBAL_KEY]) {
    pool = globalThis[GLOBAL_KEY];
    return pool;
  }

  const cfg = resolveDbConfig();

  // Retry court et progressif
  let attempt = 0;
  const maxAttempts = 5;

  while (true) {
    try {
      pool = await mysql.createPool(cfg);

      // ping pour valider la connectivité
      const conn = await pool.getConnection();
      await conn.ping();
      conn.release();

      globalThis[GLOBAL_KEY] = pool;
      return pool;
    } catch (e) {
      attempt += 1;
      if (attempt >= maxAttempts) {
        throw new Error(
          `DB connection failed after ${attempt} attempts: ${
            e?.code || e?.message || e
          }`
        );
      }
      const backoff = Math.min(500 * attempt, 2000);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
}
