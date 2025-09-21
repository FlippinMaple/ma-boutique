// server/jobs/printfulSync.js
import cron from 'node-cron';
import axios from 'axios';
import { pool } from '../db.js';
import { updateOrderStatus } from '../services/orderService.js';
import { logToDatabase } from '../utils/logger.js';

export function schedulePrintfulSync() {
  const CRON_STATUS_SCHEDULE = process.env.CRON_STATUS_SCHEDULE || '0 2 * * *';

  cron.schedule(CRON_STATUS_SCHEDULE, async () => {
    await logToDatabase('⏰ Début du cron Printful', 'info');

    try {
      const [orders] = await pool.query(
        `SELECT id, printful_order_id, status
           FROM orders
          WHERE printful_order_id IS NOT NULL
            AND status NOT IN ('shipped','canceled')`
      );

      for (const order of orders) {
        const r = await axios.get(
          `https://api.printful.com/orders/@${order.printful_order_id}`,
          {
            headers: { Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}` }
          }
        );

        const printfulStatus = r.data?.result?.status;
        if (!printfulStatus) {
          await logToDatabase(
            `⚠️ Aucun statut Printful reçu pour #${order.id}`,
            'warn'
          );
          continue;
        }

        const map = {
          draft: 'pending',
          pending: 'in_production',
          fulfilled: 'shipped',
          canceled: 'canceled'
        };
        const mappedStatus = map[printfulStatus] || 'unknown';

        if (order.status !== mappedStatus) {
          await updateOrderStatus(order.id, mappedStatus);
          await logToDatabase(
            `✅ Statut maj commande ${order.id}: ${order.status} → ${mappedStatus}`,
            'info'
          );
        } else {
          await logToDatabase(
            `ℹ️ Pas de changement commande ${order.id} (statut: ${order.status})`,
            'info'
          );
        }
      }

      await logToDatabase('✅ Cron terminé : statuts synchronisés', 'info');
    } catch (err) {
      await logToDatabase(`❌ Erreur dans le cron: ${err?.message}`, 'error');
    }
  });
}
