export const insertAddress = async (customer_id, type, address, req) => {
  const db = req.app.locals.db;

  const { address1, address2 = '', city, zip, state, country } = address;

  const [result] = await db.query(
    `INSERT INTO addresses 
     (customer_id, type, address_line1, address_line2, city, postal_code, province, country)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      customer_id,
      type, // 'shipping' ou 'billing'
      address1,
      address2,
      city,
      zip,
      state,
      country
    ]
  );

  return result.insertId;
};
