// server/server.js
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env BEFORE importing app (ESM imports are otherwise hoisted too early)
dotenv.config({ path: join(__dirname, '..', '.env') });
dotenv.config({ path: join(__dirname, '.env') });

function safeProcessErrorSummary(value) {
  if (value instanceof Error) {
    const summary = { name: value.name };
    if (value.code != null && value.code !== '') {
      summary.code = value.code;
    }
    if (process.env.NODE_ENV !== 'production') {
      summary.message = value.message;
    }
    return summary;
  }
  return { type: typeof value };
}

process.on('unhandledRejection', (r) => {
  console.error('UnhandledRejection:', safeProcessErrorSummary(r));
});
process.on('uncaughtException', (e) => {
  console.error('UncaughtException:', safeProcessErrorSummary(e));
});

const { default: app } = await import('./app.js');
const { getDb } = await import('./utils/db.js');
const { createLogger } = await import('./utils/logger.js');
const { startCronJobs } = await import('./jobs/index.js');

const PORT = Number(process.env.PORT) || 4242;
const HOST = process.env.HOST || '0.0.0.0';

(async () => {
  console.log('Demarrage du serveur...');

  let db = null;
  try {
    db = await getDb();
    console.log('Connexion DB etablie');
  } catch (err) {
    console.warn('DB indisponible, fallback fichier/console pour les logs');
    console.warn('DB error detail:', {
      name: err?.name || 'Error',
      code:
        err?.code != null && err.code !== '' ? err.code : 'DB_CONNECT_FAILED'
    });
  }

  if (db) app.locals.db = db;

  const logger = createLogger(db);

  try {
    startCronJobs();
    console.log('Cron jobs initialises');
  } catch (e) {
    console.warn('Echec init cron jobs:', e?.message || e);
  }

  app.listen(PORT, HOST, () => {
    logger.info(`Serveur actif sur http://localhost:${PORT}`);
    console.log(`Serveur actif sur http://localhost:${PORT}`);
  });
})();
