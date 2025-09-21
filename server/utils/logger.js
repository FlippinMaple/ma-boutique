// server/utils/logger.js
import { pool } from '../db.js';

let _ensured = false;
async function ensureLogsTable() {
  if (_ensured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      level ENUM('debug','info','warn','error') NOT NULL DEFAULT 'info',
      message TEXT NOT NULL,
      context VARCHAR(128) NULL,
      details LONGTEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_created_at (created_at),
      INDEX idx_level (level),
      INDEX idx_context (context)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  _ensured = true;
}

export async function logToDatabase(
  message,
  level = 'info',
  context = null,
  details = null
) {
  try {
    await ensureLogsTable();
    // on borne le message si jamais c’est énorme
    const msg = typeof message === 'string' ? message : JSON.stringify(message);
    const det =
      details == null
        ? null
        : typeof details === 'string'
        ? details
        : JSON.stringify(details);
    await pool.execute(
      `INSERT INTO logs (level, message, context, details) VALUES (?, ?, ?, ?)`,
      [level, msg.slice(0, 65535), context, det]
    );
  } catch (err) {
    // ne jamais faire planter l’app à cause du logger
    console.error('logger> insert failed:', err.message || err);
  }
}

// Helpers pratiques (tu les utilises déjà)
export const logDebug = (msg, ctx, det) =>
  logToDatabase(msg, 'debug', ctx, det);
export const logInfo = (msg, ctx, det) => logToDatabase(msg, 'info', ctx, det);
export const logWarn = (msg, ctx, det) => logToDatabase(msg, 'warn', ctx, det);
export const logError = (msg, ctx, det) =>
  logToDatabase(msg, 'error', ctx, det);

// Purge simple (utilisé par le cron)
export async function purgeOldLogs(retentionDays = 7) {
  try {
    await ensureLogsTable();
    await pool.execute(
      `DELETE FROM logs WHERE created_at < (NOW() - INTERVAL ? DAY)`,
      [Number(retentionDays) || 7]
    );
  } catch (err) {
    console.error('logger> purge failed:', err.message || err);
  }
}
