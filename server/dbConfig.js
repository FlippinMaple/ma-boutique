// server/dbConfig.js
export function resolveDbConfig() {
  // Compat: accepte encore MYSQL_* mais cible DB_*
  const host = process.env.MYSQL_HOST || process.env.MYSQLHOST || process.env.DB_HOST;
  const user = process.env.MYSQL_USER || process.env.MYSQLUSER || process.env.DB_USER;
  const password = process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD || process.env.DB_PASSWORD;
  const database = process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || process.env.DB_NAME;

  console.warn('DB config selected:', {
    host,
    user,
    database,
    passwordSet: !!password,
    passwordLength: password ? password.length : 0,
    sources: {
      host: process.env.MYSQL_HOST
        ? 'MYSQL_HOST'
        : process.env.MYSQLHOST
          ? 'MYSQLHOST'
          : process.env.DB_HOST
            ? 'DB_HOST'
            : null,
      user: process.env.MYSQL_USER
        ? 'MYSQL_USER'
        : process.env.MYSQLUSER
          ? 'MYSQLUSER'
          : process.env.DB_USER
            ? 'DB_USER'
            : null,
      database: process.env.MYSQL_DATABASE
        ? 'MYSQL_DATABASE'
        : process.env.MYSQLDATABASE
          ? 'MYSQLDATABASE'
          : process.env.DB_NAME
            ? 'DB_NAME'
            : null,
      password: process.env.MYSQL_PASSWORD
        ? 'MYSQL_PASSWORD'
        : process.env.MYSQLPASSWORD
          ? 'MYSQLPASSWORD'
          : process.env.DB_PASSWORD
            ? 'DB_PASSWORD'
            : null
    }
  });

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
