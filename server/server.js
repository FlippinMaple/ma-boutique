// server/server.js
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// charge .env racine puis server/.env (si tu en as un)
dotenv.config({ path: join(__dirname, '..', '.env') });
dotenv.config({ path: join(__dirname, '.env') });

import app from './app.js';
import { getDb } from './utils/db.js';
import { createLogger } from './utils/logger.js';
import { ensureLogsTable } from './bootstrap/createLogsTable.js';
import { startCronJobs } from './jobs/index.js';

const PORT = process.env.PORT ?? 4242;

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

  // Injecte la DB (ou pool) dans app.locals pour les routes
  if (db) app.locals.db = db;

  const logger = createLogger(db);

  // Démarre les cron jobs (printful, purge, etc.)
  try {
    startCronJobs();
    console.log('🕒 Cron jobs initialisés');
  } catch (e) {
    console.warn('⚠️ Échec init cron jobs:', e?.message || e);
  }

  // Trust proxy (utile si reverse proxy)
  if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
  }

  app.listen(PORT, () => {
    logger.info(`✅ Serveur actif sur http://localhost:${PORT}`);
    console.log(`✅ Serveur actif sur http://localhost:${PORT}`); // banner console
  });
})();
