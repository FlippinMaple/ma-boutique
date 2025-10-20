// server/server.js
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charge .env racine puis server/.env (si présent)
dotenv.config({ path: join(__dirname, '..', '.env') });
dotenv.config({ path: join(__dirname, '.env') });

process.on('unhandledRejection', (r) => {
  console.error('❌ UnhandledRejection:', r);
});
process.on('uncaughtException', (e) => {
  console.error('❌ UncaughtException:', e);
});

import app from './app.js';
import { getDb } from './utils/db.js';
import { createLogger } from './utils/logger.js';
import { ensureLogsTable } from './bootstrap/createLogsTable.js';
import { startCronJobs } from './jobs/index.js';

const PORT = Number(process.env.PORT) || 4242;
const HOST = process.env.HOST || '0.0.0.0';

(async () => {
  console.log('🚀 Démarrage du serveur…');

  let db = null;
  try {
    db = await getDb();
    await ensureLogsTable(db);
    console.log('✅ Connexion DB établie');
  } catch (err) {
    console.warn('⚠️ DB indisponible, fallback fichier/console pour les logs');
    if (process.env.NODE_ENV !== 'production') {
      console.warn(err?.message || err);
    }
  }

  // Injection DB pour les contrôleurs (Option A)
  if (db) app.locals.db = db;

  const logger = createLogger(db);

  // Cron jobs
  try {
    startCronJobs();
    console.log('🕒 Cron jobs initialisés');
  } catch (e) {
    console.warn('⚠️ Échec init cron jobs:', e?.message || e);
  }

  app.listen(PORT, HOST, () => {
    logger.info(`✅ Serveur actif sur http://localhost:${PORT}`);
    console.log(`✅ Serveur actif sur http://localhost:${PORT}`);
  });
})();
