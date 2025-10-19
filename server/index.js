// server/index.js
import express from 'express';
import dotenv from 'dotenv';
import { getDb } from './utils/db.js';
import { createLogger } from './utils/logger.js';
import { ensureLogsTable } from './bootstrap/createLogsTable.js';

// Charger les variables d'environnement
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4242;

async function bootstrap() {
  let db = null;

  try {
    db = await getDb();
    await ensureLogsTable(db);
    console.log('✅ Connexion DB établie');
  } catch (err) {
    console.warn('⚠️ Connexion DB échouée, fallback console');
    console.error(err);
  }

  const logger = createLogger(db);
  app.use(express.json());

  // Exemple de route
  app.get('/', (req, res) => res.send('🟢 Serveur en ligne'));

  app.listen(PORT, () => {
    logger.info(`✅ Serveur actif sur http://localhost:${PORT}`);
  });
}

bootstrap();
