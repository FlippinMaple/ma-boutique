// scripts/run-migrations.js
// Dedicated migration runner. Does not use the application pool.
// Does not create schema_migrations (baseline is P20-C).
// Does not wrap DDL in a fake rollback transaction.
import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { resolveDbConfig } from '../server/dbConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCK_TIMEOUT_SECONDS = 10;
const SCHEMA_MIGRATIONS_TABLE = 'schema_migrations';

function sha256Utf8(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function migrationLockName(database) {
  const raw = `flippinmaple_migrate:${database}`;
  return raw.length <= 64 ? raw : raw.slice(0, 64);
}

async function schemaMigrationsExists(conn) {
  const [rows] = await conn.query(
    `SELECT 1 AS ok
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
      LIMIT 1`,
    [SCHEMA_MIGRATIONS_TABLE]
  );
  return rows.length > 0;
}

async function main() {
  const dir = path.resolve(__dirname, '../db/migrations');
  if (!fs.existsSync(dir)) {
    console.error('No migrations directory:', dir);
    process.exitCode = 1;
    return;
  }

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let conn = null;
  let lockHeld = false;
  let lockName = null;

  try {
    const cfg = resolveDbConfig();
    lockName = migrationLockName(cfg.database);

    conn = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      connectTimeout: cfg.connectTimeout,
      timezone: cfg.timezone,
      ...(cfg.ssl ? { ssl: cfg.ssl } : {}),
      multipleStatements: true
    });

    const [lockRows] = await conn.query(
      'SELECT GET_LOCK(?, ?) AS got_lock',
      [lockName, LOCK_TIMEOUT_SECONDS]
    );
    const gotLock = lockRows[0]?.got_lock;
    if (gotLock !== 1) {
      console.error(
        `Could not obtain migration lock '${lockName}' within ${LOCK_TIMEOUT_SECONDS}s. Another migrate may be running. Aborting.`
      );
      process.exitCode = 1;
      return;
    }
    lockHeld = true;

    const exists = await schemaMigrationsExists(conn);
    if (!exists) {
      console.error(
        'Migration baseline missing: schema_migrations does not exist. Refusing to run migrations.'
      );
      process.exitCode = 1;
      return;
    }

    const [appliedRows] = await conn.query(
      `SELECT filename, checksum FROM \`${SCHEMA_MIGRATIONS_TABLE}\``
    );
    const applied = new Map(
      appliedRows.map((row) => [row.filename, String(row.checksum)])
    );

    const pending = [];

    for (const filename of files) {
      const full = path.join(dir, filename);
      const sql = fs.readFileSync(full, 'utf8');
      const checksum = sha256Utf8(sql);
      const recorded = applied.get(filename);

      if (recorded !== undefined) {
        if (recorded.toLowerCase() !== checksum) {
          console.error(
            `Migration checksum mismatch for ${filename}. Recorded=${recorded} current=${checksum}. Refusing to run migrations.`
          );
          process.exitCode = 1;
          return;
        }
        console.log(`already applied ${filename}`);
        continue;
      }

      pending.push({ filename, sql, checksum });
    }

    if (pending.length === 0) {
      console.log('No pending migrations.');
      return;
    }

    for (const { filename, sql, checksum } of pending) {
      console.log(`> running ${filename}`);
      await conn.query(sql);
      await conn.query(
        `INSERT INTO \`${SCHEMA_MIGRATIONS_TABLE}\` (filename, checksum) VALUES (?, ?)`,
        [filename, checksum]
      );
      console.log(`  applied ${filename}`);
    }

    console.log('Migrations complete.');
  } catch (err) {
    console.error(err?.message || err);
    if (err?.code) console.error(`MySQL code: ${err.code}`);
    process.exitCode = 1;
  } finally {
    if (conn) {
      if (lockHeld) {
        try {
          await conn.query('SELECT RELEASE_LOCK(?) AS released', [lockName]);
        } catch (releaseErr) {
          console.error('RELEASE_LOCK failed:', releaseErr.message);
        }
      }
      try {
        await conn.end();
      } catch (endErr) {
        console.error('Failed to close migration connection:', endErr.message);
      }
    }
  }
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exitCode = 1;
});
