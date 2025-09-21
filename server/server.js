import dotenv from 'dotenv';
dotenv.config();
import { app } from './app.js';
// server/server.js
import { logInfo } from './utils/logger.js'; // ⬅️ ajoute ceci

const PORT = process.env.PORT ?? 4242;

app.listen(PORT, () => {
  // on log en base (et plus de console.*)
  logInfo(`✅ Serveur actif sur http://localhost:${PORT}`, 'bootstrap').catch(
    () => {}
  ); // on ignore si la persistance du log échoue
});
