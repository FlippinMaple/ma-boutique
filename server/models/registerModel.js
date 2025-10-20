export const findCustomerByEmail = async (email, req) => {
  const db = req.app.locals.db;

  const [rows] = await db.query('SELECT id FROM customers WHERE email = ?', [
    email
  ]);
  return rows.length > 0 ? rows[0] : null;
};

export const insertCustomer = async ({
  first_name,
  last_name,
  email,
  password_hash,
  is_subscribed,
  req
}) => {
  const db = req.app.locals.db;

  const [result] = await db.execute(
    `INSERT INTO customers (
      first_name,
      last_name,
      email,
      password_hash,
      is_subscribed,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
    [first_name, last_name, email, password_hash, !!is_subscribed]
  );
  return result.insertId;
};
