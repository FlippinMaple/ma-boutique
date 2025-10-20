// server/db.js  (compat, lazy, sans lecture d'ENV à l'import)
import mysql from 'mysql2/promise';
import { resolveDbConfig } from './dbConfig.js';

const GLOBAL_KEY = '__APP_DB_POOL__';

/**
 * getPool: retourne le pool global (créé au 1er appel).
 * - Ne lit pas la config tant qu'on n'appelle pas la fonction.
 * - Suppose que dotenv.config() a déjà été fait par le point d'entrée.
 */
export async function getPool() {
  if (globalThis[GLOBAL_KEY]) return globalThis[GLOBAL_KEY];

  const cfg = resolveDbConfig(); // ← lit enfin les ENV (après dotenv)
  const pool = await mysql.createPool(cfg);

  // ping pour valider
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();

  globalThis[GLOBAL_KEY] = pool;
  return pool;
}

// ✅ export par défaut si tu en avais besoin quelque part
export default getPool;
