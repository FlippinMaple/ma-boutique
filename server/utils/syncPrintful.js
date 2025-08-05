import axios from 'axios';
import { pool } from '../db.js';
import { logToDatabase } from './logger.js';

async function syncPrintfulOrderStatus(orderId, printfulOrderId) {
  try {
    const response = await axios.get(
      `https://api.printful.com/orders/@${printfulOrderId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`
        }
      }
    );

    const printfulStatus = response.data?.result?.status;

    if (!printfulStatus) {
      const msg = `⚠️ Aucun statut reçu de Printful pour #${printfulOrderId}`;
      console.warn(msg);
      await logToDatabase(msg, 'warn');
      return;
    }

    // Mapper les statuts Printful vers tes statuts locaux
    let mappedStatus;
    switch (printfulStatus) {
      case 'draft':
        mappedStatus = 'pending';
        break;
      case 'pending':
        mappedStatus = 'in_production';
        break;
      case 'fulfilled':
        mappedStatus = 'shipped';
        break;
      case 'canceled':
        mappedStatus = 'canceled';
        break;
      default:
        mappedStatus = 'unknown';
    }

    // Récupérer l'ancien statut
    const [[currentOrder]] = await pool.query(
      `SELECT status FROM orders WHERE id = ?`,
      [orderId]
    );

    if (!currentOrder) {
      const msg = `❌ Commande locale #${orderId} introuvable`;
      console.warn(msg);
      await logToDatabase(msg, 'error');
      return;
    }

    const oldStatus = currentOrder.status;

    if (oldStatus === mappedStatus) {
      const msg = `ℹ️ Statut inchangé pour commande #${orderId} (${mappedStatus})`;
      console.log(msg);
      await logToDatabase(msg, 'info');
      return;
    }

    // Mettre à jour le statut dans 'orders'
    await pool.execute(
      `UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?`,
      [mappedStatus, orderId]
    );

    // Historiser dans 'order_status_history'
    await pool.execute(
      `INSERT INTO order_status_history (order_id, old_status, new_status, changed_at)
       VALUES (?, ?, ?, NOW())`,
      [orderId, oldStatus, mappedStatus]
    );

    const msg = `✅ Statut synchronisé pour commande #${orderId} : ${oldStatus} → ${mappedStatus}`;
    console.log(msg);
    await logToDatabase(msg, 'info');
  } catch (err) {
    const errorMsg = `❌ Erreur sync Printful #${printfulOrderId}: ${
      err.response?.data || err.message
    }`;
    console.error(errorMsg);
    await logToDatabase(errorMsg, 'error');
  }
}

export default syncPrintfulOrderStatus;
