// server/utils/logger.js (ESM)

import fs from 'node:fs';
import path from 'node:path';

/**
 * createLogger: retourne un logger qui loggue vers la DB si disponible,
 * sinon vers un fichier local (ou console).
 * @param {object|null} db - Adapter (ex: knex ou mysql2 pool) OU null
 * @returns {object} logger { info, warn, error }
 */
export function createLogger(db) {
  // Chemin de secours (file)
  const logsDir = path.resolve(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
  const filePath = path.join(logsDir, 'app.log');

  const writeFallback = (level, msg) => {
    const line = `[${new Date().toISOString()}] ${level.toUpperCase()}: ${msg}\n`;
    try {
      fs.appendFileSync(filePath, line);
    } catch {
      /* si même ça échoue, on bascule console */ console[level]?.(line) ??
        console.log(line);
    }
  };

  const writeDb = async (level, msg) => {
    if (!db) return writeFallback(level, msg);
    try {
      // knex-style:
      if (typeof db.insert === 'function') {
        await db('logs').insert({
          level,
          message: msg,
          created_at: new Date()
        });
        return;
      }
      // mysql2/promise-style:
      if (typeof db.execute === 'function') {
        await db.execute(
          'INSERT INTO logs (level, message, created_at) VALUES (?, ?, ?)',
          [level, msg, new Date()]
        );
        return;
      }
      // inconnu → fallback
      writeFallback(level, msg);
    } catch (e) {
      // si la DB refuse (ECONNREFUSED etc.), fallback fichier
      writeFallback(
        level,
        `${msg}  (logger DB fallback: ${e?.code || e?.message || e})`
      );
    }
  };

  return {
    info: (m) => writeDb('info', m),
    warn: (m) => writeDb('warn', m),
    error: (m) => writeDb('error', m)
  };
}
/**
 * logError: compat pour l'ancien import { logError }.
 * - Accepte une Error ou une string.
 * - Préfixe optionnel avec un contexte ('server', 'api', etc.).
 * - Ne casse jamais si la DB est down (fallback fichier/console).
 */
export async function logError(errOrMsg, context = '') {
  // import dynamique pour éviter les imports circulaires
  let getDb;
  try {
    ({ getDb } = await import('./db.js'));
  } catch {
    /* pas de DB dispo → fallback plus bas */
  }

  let db = null;
  if (typeof getDb === 'function') {
    try {
      db = await getDb();
    } catch {
      /* noop: on tombera en fallback fichier/console via createLogger */
    }
  }

  // createLogger est défini dans ce même fichier
  const logger = createLogger(db);

  const base =
    typeof errOrMsg === 'string'
      ? errOrMsg
      : errOrMsg?.stack || errOrMsg?.message || String(errOrMsg);

  const msg = context ? `[${context}] ${base}` : base;

  try {
    await logger.error(`❌ ${msg}`);
  } catch {
    // ultime fallback si tout le reste échoue
    console.error(`❌ ${msg}`);
  }
}

/**
 * Compatibilité avec anciens imports (logInfo / logWarn / logError)
 * Ces fonctions appellent createLogger() automatiquement
 * et ne cassent pas si la DB est indisponible.
 */
export async function logInfo(msg, context = '') {
  let getDb;
  try {
    ({ getDb } = await import('./db.js'));
  } catch {
    /* empty */
  }
  let db = null;
  if (typeof getDb === 'function') {
    try {
      db = await getDb();
    } catch {
      /* empty */
    }
  }

  const logger = createLogger(db);
  const formatted = context ? `[${context}] ${msg}` : msg;

  try {
    await logger.info(`ℹ️ ${formatted}`);
  } catch {
    console.log(`ℹ️ ${formatted}`);
  }
}

export async function logWarn(msg, context = '') {
  let getDb;
  try {
    ({ getDb } = await import('./db.js'));
  } catch {
    /* empty */
  }
  let db = null;
  if (typeof getDb === 'function') {
    try {
      db = await getDb();
    } catch {
      /* empty */
    }
  }

  const logger = createLogger(db);
  const formatted = context ? `[${context}] ${msg}` : msg;

  try {
    await logger.warn(`⚠️ ${formatted}`);
  } catch {
    console.warn(`⚠️ ${formatted}`);
  }
}

/**
 * purgeOldLogs: supprime les logs plus vieux que N jours.
 * - Fonctionne avec knex ou mysql2.
 * - Ne jette pas si la table n’existe pas (safe).
 */
export async function purgeOldLogs(db, retentionDays = 7) {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  // knex-style
  if (db && typeof db.raw === 'function') {
    try {
      await db.raw('DELETE FROM logs WHERE created_at < ?', [cutoff]);
      return { ok: true, engine: 'knex' };
    } catch (e) {
      if (
        String(e?.message || '')
          .toLowerCase()
          .includes("doesn't exist") ||
        String(e?.message || '')
          .toLowerCase()
          .includes('no such table')
      ) {
        return { ok: true, engine: 'knex', note: 'table logs absente (noop)' };
      }
      return { ok: false, error: e };
    }
  }

  // mysql2/promise-style
  if (db && typeof db.execute === 'function') {
    try {
      await db.execute('DELETE FROM logs WHERE created_at < ?', [cutoff]);
      return { ok: true, engine: 'mysql2' };
    } catch (e) {
      if (
        String(e?.message || '')
          .toLowerCase()
          .includes("doesn't exist")
      ) {
        return {
          ok: true,
          engine: 'mysql2',
          note: 'table logs absente (noop)'
        };
      }
      return { ok: false, error: e };
    }
  }

  // Pas de DB disponible → on ne fait rien, mais on ne casse pas
  return { ok: true, engine: 'none', note: 'DB indisponible → purge noop' };
}
