// server/server.js
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env BEFORE importing app (ESM imports are otherwise hoisted too early)
dotenv.config({ path: join(__dirname, '..', '.env') });
dotenv.config({ path: join(__dirname, '.env') });

process.on('unhandledRejection', (r) => {
  console.error('UnhandledRejection:', r);
});
process.on('uncaughtException', (e) => {
  console.error('UncaughtException:', e);
});

const { default: app } = await import('./app.js');
const { getDb } = await import('./utils/db.js');
const { createLogger } = await import('./utils/logger.js');
const { ensureLogsTable } = await import('./bootstrap/createLogsTable.js');
const { startCronJobs } = await import('./jobs/index.js');

const PORT = Number(process.env.PORT) || 4242;
const HOST = process.env.HOST || '0.0.0.0';

(async () => {
  console.log('Demarrage du serveur...');

  let db = null;
  try {
    db = await getDb();
    await ensureLogsTable(db);
    console.log('Connexion DB etablie');
  } catch (err) {
    console.warn('DB indisponible, fallback fichier/console pour les logs');
    if (process.env.NODE_ENV !== 'production') {
      console.warn(err?.message || err);
    }
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
