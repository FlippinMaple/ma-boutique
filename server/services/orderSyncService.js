// server/services/orderSyncService.js
import axios from 'axios';
import { logToDatabase } from '../utils/logger.js';
import { updateOrderStatus } from './orderService.js';
import { logInfo, logWarn, logError } from '../utils/logger.js';

export function mapPrintfulToLocalStatus(printfulStatus) {
  switch (printfulStatus) {
    case 'draft':
      return 'pending';
    case 'pending':
      return 'in_production';
    case 'fulfilled':
      return 'shipped';
    case 'canceled':
      return 'canceled';
    default:
      return 'unknown';
  }
}

export async function fetchPrintfulOrderStatus(printfulOrderId) {
  const r = await axios.get(
    `https://api.printful.com/orders/@${printfulOrderId}`,
    {
      headers: { Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}` }
    }
  );
  return r.data?.result?.status || null;
}

// ⚙️ Orchestrateur: 1 commande → fetch status → map → compare → update + log
export async function syncPrintfulOrderStatus(orderId, printfulOrderId, req) {
  const db = req.app.locals.db;

  try {
    const printfulStatus = await fetchPrintfulOrderStatus(printfulOrderId);
    if (!printfulStatus) {
      const msg = `⚠️ Aucun statut reçu de Printful pour #${printfulOrderId}`;
      await logWarn(msg, 'orderSync');
      await logToDatabase(msg, 'warn');
      return;
    }

    const [[current]] = await db.query(
      'SELECT status FROM orders WHERE id = ?',
      [orderId]
    );
    if (!current) {
      const msg = `❌ Commande locale #${orderId} introuvable`;
      await logWarn(msg, 'orderSync');
      await logToDatabase(msg, 'error');
      return;
    }

    const newStatus = mapPrintfulToLocalStatus(printfulStatus);
    if (current.status === newStatus) {
      const msg = `ℹ️ Statut inchangé pour commande #${orderId} (${newStatus})`;
      await logInfo(msg, 'orderSync');
      await logToDatabase(msg, 'info');
      return;
    }

    await updateOrderStatus(orderId, newStatus); // gère history + update
    const msg = `✅ Statut synchronisé #${orderId} : ${current.status} → ${newStatus}`;
    await logInfo(msg, 'orderSync');
    await logToDatabase(msg, 'info');
  } catch (err) {
    const errorMsg = `❌ Erreur sync Printful #${printfulOrderId}: ${
      err.response?.data || err.message
    }`;
    await logError(errorMsg || 'Error', 'orderSync', err);
    await logToDatabase(errorMsg, 'error');
  }
}

export default syncPrintfulOrderStatus;
