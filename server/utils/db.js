// server/utils/db.js (ESM)

import mysql from 'mysql2/promise';

let pool;

/**
 * getDb: retourne un pool mysql2/promise prêt à l'emploi.
 * - Retry exponentiel (rapide) si la connexion échoue.
 * - SSL optionnel via env (utile en hébergement managé).
 */
export async function getDb() {
  if (pool) return pool;

  const {
    DB_HOST,
    DB_PORT = '3306',
    DB_USER,
    DB_PASSWORD,
    DB_NAME,
    DB_SSL = 'false',
    DB_CONNECT_TIMEOUT_MS = '8000'
  } = process.env;

  const config = {
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    // timeouts prudents
    connectTimeout: Number(DB_CONNECT_TIMEOUT_MS),
    waitForConnections: true,
    connectionLimit: 8,
    queueLimit: 0
  };

  if (DB_SSL === 'true') {
    config.ssl = { rejectUnauthorized: true };
  }

  let attempt = 0;
  const maxAttempts = 5;

  while (true) {
    try {
      pool = mysql.createPool(config);
      // ping rapide pour valider la connectivité
      const conn = await pool.getConnection();
      await conn.ping();
      conn.release();
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
      const backoff = Math.min(2000 * attempt, 6000);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
}
