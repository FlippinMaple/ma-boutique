// server/controllers/paymentsController.js

// GET /payments/verify?session_id=...
// Response: { paid, found?, orderId? }
export async function verifyPaymentStatus(req, res) {
  const db = req.app.locals.db;
  const sessionId = req.query.session_id || null;

  if (!sessionId) {
    return res.status(400).json({
      paid: false,
      error: 'missing_session_id'
    });
  }

  try {
    // Lookup order by Stripe session id
    const [[orderRow]] = await db.query(
      `SELECT id, status
         FROM orders
        WHERE stripe_session_id = ?
        LIMIT 1`,
      [sessionId]
    );

    // No matching order
    if (!orderRow) {
      return res.json({
        paid: false,
        found: false
      });
    }

    // paid when webhook already set status='paid'
    const isPaid = orderRow.status === 'paid';

    return res.json({
      paid: isPaid,
      found: true,
      orderId: orderRow.id
    });
  } catch (err) {
    console.error('[verifyPaymentStatus] db error', err?.message || err);
    return res.status(500).json({
      paid: false,
      error: 'db_error'
    });
  }
}
