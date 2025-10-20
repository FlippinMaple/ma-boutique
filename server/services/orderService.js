// server/services/orderService.js
import { logInfo, logError } from '../utils/logger.js';

export async function updateOrderStatus(orderId, newStatus, req) {
  try {
    const db = req.app.locals.db;

    const [[order]] = await db.query('SELECT status FROM orders WHERE id = ?', [
      orderId
    ]);
    if (!order) {
      await logError(`Commande ID ${orderId} non trouvée`, 'orders');
      return;
    }

    const oldStatus = order.status;

    // historiser même si pas de changement (traçabilité)
    await db.execute(
      `INSERT INTO order_status_history (order_id, old_status, new_status, changed_at)
       VALUES (?, ?, ?, NOW())`,
      [orderId, oldStatus, newStatus]
    );

    if (oldStatus !== newStatus) {
      await db.execute(
        'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
        [newStatus, orderId]
      );
      await logInfo(
        `Statut mis à jour : #${orderId} ${oldStatus} → ${newStatus}`,
        'orders'
      );
    } else {
      await logInfo(
        `Statut inchangé pour commande #${orderId} (${newStatus})`,
        'orders'
      );
    }
  } catch (e) {
    await logError(
      `❌ Erreur mise à jour statut pour #${orderId}`,
      'orders',
      e
    );
  }
}
