// scripts/run-migrations.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const dir = path.resolve(__dirname, '../db/migrations');
  if (!fs.existsSync(dir)) {
    console.error('No migrations directory:', dir);
    process.exit(1);
  }

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const f of files) {
    const full = path.join(dir, f);
    const sql = fs.readFileSync(full, 'utf8');
    console.log(`> running ${f}`);
    try {
      await pool.query(sql);
      console.log('  ok');
    } catch (e) {
      // On continue malgré les erreurs de type #1060/#1061 (colonne/index existe déjà)
      console.error(`  ! ${e.code || ''} ${e.message}`);
    }
  }

  await pool.end();
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
