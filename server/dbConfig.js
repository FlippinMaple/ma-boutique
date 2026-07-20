// server/dbConfig.js

function normalizeEnvValue(value) {
  if (typeof value !== 'string') return value;

  let v = value.trim();

  // Strip common invisible / zero-width chars around pasted Hostinger values
  v = v.replace(/^[\u200B-\u200D\uFEFF\u00A0]+|[\u200B-\u200D\uFEFF\u00A0]+$/g, '');
  v = v.trim();

  // Outer wrappers only (do not touch quotes inside the value)
  const wrappers = [
    ['\\"', '\\"'], // escaped straight doubles: \"...\"
    ['"', '"'], // straight doubles
    ["'", "'"], // straight singles
    ['\u201C', '\u201D'], // curly doubles “...”
    ['\u00AB', '\u00BB'], // guillemets «...»
    ['\u2018', '\u2019'] // curly singles ‘...’
  ];

  for (const [open, close] of wrappers) {
    if (
      v.length >= open.length + close.length &&
      v.startsWith(open) &&
      v.endsWith(close)
    ) {
      v = v.slice(open.length, v.length - close.length).trim();
      break;
    }
  }

  return v;
}

function decodePasswordAscii(value) {
  return normalizeEnvValue(value)
    .split(',')
    .map((part) => String.fromCharCode(Number(part.trim())))
    .join('');
}

export function resolveDbConfig() {
  // Compat: accepte encore MYSQL_* mais cible DB_*
  const host = normalizeEnvValue(
    process.env.MYSQL_HOST || process.env.MYSQLHOST || process.env.DB_HOST
  );
  const user = normalizeEnvValue(
    process.env.MYSQL_USER || process.env.MYSQLUSER || process.env.DB_USER
  );
  let passwordSource = null;
  let rawPassword;

  if (process.env.DB_PASSWORD_ASCII) {
    passwordSource = 'DB_PASSWORD_ASCII';
    rawPassword = decodePasswordAscii(process.env.DB_PASSWORD_ASCII);
  } else if (process.env.DB_PASSWORD_B64) {
    passwordSource = 'DB_PASSWORD_B64';
    rawPassword = Buffer.from(
      normalizeEnvValue(process.env.DB_PASSWORD_B64),
      'base64'
    ).toString('utf8');
  } else if (process.env.DB_PASSWORD_OVERRIDE) {
    passwordSource = 'DB_PASSWORD_OVERRIDE';
    rawPassword = process.env.DB_PASSWORD_OVERRIDE;
  } else if (process.env.MYSQL_PASSWORD) {
    passwordSource = 'MYSQL_PASSWORD';
    rawPassword = process.env.MYSQL_PASSWORD;
  } else if (process.env.MYSQLPASSWORD) {
    passwordSource = 'MYSQLPASSWORD';
    rawPassword = process.env.MYSQLPASSWORD;
  } else if (process.env.DB_PASSWORD) {
    passwordSource = 'DB_PASSWORD';
    rawPassword = process.env.DB_PASSWORD;
  }

  const password = normalizeEnvValue(rawPassword);
  const database = normalizeEnvValue(
    process.env.MYSQL_DATABASE ||
      process.env.MYSQLDATABASE ||
      process.env.DB_NAME
  );

  console.warn('DB config selected:', {
    host,
    user,
    database,
    passwordSet: !!password,
    passwordLength: password ? password.length : 0,
    passwordFirstCode: password ? password.codePointAt(0) : null,
    passwordLastCode: password
      ? password.codePointAt(password.length - 1)
      : null,
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
      password: passwordSource
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
