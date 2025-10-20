// server/services/abandonedCartService.js

/**
 * Marque le dernier abandon (dans une fenêtre de X heures) comme récupéré
 * pour cet email, et stocke l'ID de session Stripe.
 */
export async function markRecoveredByEmail(
  email,
  checkoutSessionId,
  lookbackHours = 48,
  req
) {
  const db = req.app.locals.db;

  if (!email) return;

  const hours = Number(lookbackHours) || 48; // évite l'injection, force un entier
  const sql = `
    UPDATE abandoned_carts
       SET is_recovered = 1,
           recovered_at = NOW(),
           checkout_session_id = ?
     WHERE customer_email = ?
       AND is_recovered = 0
       AND created_at >= (NOW() - INTERVAL ${hours} HOUR)
     ORDER BY created_at DESC
     LIMIT 1
  `;

  await db.query(sql, [checkoutSessionId || null, email]);
}
