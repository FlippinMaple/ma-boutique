// utils/logger.js
import { pool } from '../db.js';

/**
 * Insère un log dans la table cron_logs
 * @param {string} message - Message du log
 * @param {string} type - Type de log ('info', 'error', etc.)
 * @param {string} source - Source du log (ex: 'checkout', 'cron', 'wishlist'...)
 */
export async function logToDatabase(message, type = 'info', source = 'app') {
  try {
    await pool.execute(
      `INSERT INTO cron_logs (message, type, source, created_at) VALUES (?, ?, ?, NOW())`,
      [message, type, source]
    );
    console.log(`📥 [${type.toUpperCase()}] ${source} > ${message}`);
  } catch (err) {
    console.error('❌ Erreur lors de l’enregistrement du log en base :', err);
  }
}

/**
 * Purge les logs plus vieux que N jours
 * @param {number} days - Nombre de jours de rétention
 */
export async function purgeOldLogs(days = 7) {
  try {
    const [result] = await pool.query(
      `DELETE FROM cron_logs WHERE created_at < NOW() - INTERVAL ? DAY`,
      [days]
    );
    console.log(`🧹 ${result.affectedRows} anciens logs supprimés.`);
    await logToDatabase(
      `🧹 ${result.affectedRows} anciens logs supprimés`,
      'info'
    );
  } catch (err) {
    console.error('❌ Erreur purge des logs :', err);
  }
}

export const logInfo = (msg, source = 'app') =>
  logToDatabase(msg, 'info', source);

export const logWarn = (msg, source = 'app') =>
  logToDatabase(msg, 'warning', source);

export const logError = (msg, source = 'app') =>
  logToDatabase(msg, 'error', source);
