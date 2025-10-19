// server/jobs/printfulSync.js
import cron from 'node-cron';
import axios from 'axios';
import { getDb } from '../utils/db.js';
import { updateOrderStatus } from '../services/orderService.js';
import { logInfo, logWarn, logError } from '../utils/logger.js';

export function schedulePrintfulSync() {
  const CRON_STATUS_SCHEDULE = process.env.CRON_STATUS_SCHEDULE || '0 2 * * *';

  // client axios avec timeout + auth
  const api = axios.create({
    baseURL: 'https://api.printful.com',
    timeout: 10000,
    headers: {
      Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`
    }
    // pas de transform ici; on lit r.data directement
  });

  // petit helper retry (max 3 tentatives) pour 429/5xx/erreurs réseau
  async function fetchPrintfulOrder(printfulOrderId, attempt = 1) {
    try {
      return await api.get(`/orders/@${printfulOrderId}`);
    } catch (err) {
      const status = err?.response?.status;
      const retriable =
        status === 429 ||
        (status >= 500 && status <= 599) ||
        ['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN'].includes(err?.code);

      if (retriable && attempt < 3) {
        const backoff = 500 * attempt; // 500ms, 1000ms
        await new Promise((r) => setTimeout(r, backoff));
        return fetchPrintfulOrder(printfulOrderId, attempt + 1);
      }
      throw err;
    }
  }

  cron.schedule(CRON_STATUS_SCHEDULE, async () => {
    await logInfo('⏰ Début du cron Printful', 'printful');

    let db = null;
    try {
      db = await getDb();
    } catch {
      // On log et on stoppe le run si DB KO (inutile de frapper l’API)
      await logError(
        'DB indisponible: arrêt du cron Printful pour ce cycle',
        'printful'
      );
      return;
    }

    try {
      // mysql2/promise
      const [orders] = await db.execute(
        `SELECT id, printful_order_id, status
           FROM orders
          WHERE printful_order_id IS NOT NULL
            AND status NOT IN ('shipped','canceled')`
      );

      if (!orders || orders.length === 0) {
        await logInfo('Aucune commande à synchroniser', 'printful');
      }

      const map = {
        draft: 'pending',
        pending: 'in_production',
        fulfilled: 'shipped',
        canceled: 'canceled'
      };

      for (const order of orders) {
        try {
          const r = await fetchPrintfulOrder(order.printful_order_id);
          const printfulStatus = r.data?.result?.status;

          if (!printfulStatus) {
            await logWarn(
              `Aucun statut Printful reçu pour #${order.id}`,
              'printful'
            );
            continue;
          }

          const mappedStatus = map[printfulStatus] || 'unknown';

          if (mappedStatus === 'unknown') {
            await logWarn(
              `Statut Printful inconnu "${printfulStatus}" pour #${order.id}`,
              'printful'
            );
            continue;
          }

          if (order.status !== mappedStatus) {
            await updateOrderStatus(order.id, mappedStatus);
            await logInfo(
              `Statut mis à jour commande ${order.id}: ${order.status} → ${mappedStatus}`,
              'printful'
            );
          } else {
            await logInfo(
              `Pas de changement commande ${order.id} (statut: ${order.status})`,
              'printful'
            );
          }
        } catch (err) {
          await logError(
            `Erreur lors de la sync commande ${order.id}: ${
              err?.response?.status || err?.code || err?.message
            }`,
            'printful'
          );
        }
      }

      await logInfo('✅ Cron terminé : statuts synchronisés', 'printful');
    } catch (err) {
      await logError(`❌ Erreur globale du cron: ${err?.message}`, 'printful');
    }
  });
}
