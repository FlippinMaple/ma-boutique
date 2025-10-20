// server/dbConfig.js
export function resolveDbConfig() {
  // Compat: accepte encore MYSQL_* mais cible DB_*
  const host = process.env.MYSQL_HOST || process.env.DB_HOST;
  const user = process.env.MYSQL_USER || process.env.DB_USER;
  const password = process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD;
  const database = process.env.MYSQL_DATABASE || process.env.DB_NAME;

  if (!host || !user || !password || !database) {
    // aide debug si ça re-casse
    console.error('DB VARS CHECK →', {
      host,
      userSet: !!user,
      pwdSet: !!password,
      dbSet: !!database
    });
    throw new Error('DB config missing (host/user/password/database)');
  }

  const port = Number(process.env.DB_PORT || 3306);
  const connectTimeout = Number(process.env.DB_CONNECT_TIMEOUT_MS || 8000);
  const sslFlag = (process.env.DB_SSL ?? 'true').toLowerCase() === 'true';

  const cfg = {
    host,
    port,
    user,
    password,
    database,
    connectTimeout,
    waitForConnections: true,
    connectionLimit: 8,
    queueLimit: 0,
    timezone: 'Z'
  };

  if (sslFlag) cfg.ssl = { rejectUnauthorized: true };
  return cfg;
}
