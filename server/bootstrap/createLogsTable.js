// server/bootstrap/createLogsTable.js (ESM)

export async function ensureLogsTable(db) {
  if (!db) return; // si pas de DB → on ne casse pas

  // mysql2/promise
  if (typeof db.execute === 'function') {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS logs (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        level VARCHAR(16) NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    return;
  }

  // knex
  if (typeof db.schema?.hasTable === 'function') {
    const exists = await db.schema.hasTable('logs');
    if (!exists) {
      await db.schema.createTable('logs', (t) => {
        t.bigIncrements('id').primary();
        t.string('level', 16).notNullable();
        t.text('message').notNullable();
        t.dateTime('created_at').notNullable();
      });
    }
  }
}
