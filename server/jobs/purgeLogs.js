// server/jobs/purgeLogs.js
import cron from 'node-cron';
import { purgeOldLogs, createLogger } from '../utils/logger.js';
import { getDb } from '../utils/db.js';

const RETENTION_DAYS = Number(process.env.LOG_RETENTION_DAYS || 7);
const CRON_PURGE_SCHEDULE = process.env.CRON_PURGE_SCHEDULE || '0 0 * * *'; // tous les jours à minuit

export async function runPurgeLogsJob() {
  const db = await getDb().catch(() => null);
  const logger = createLogger(db);
  await logger.info(
    `🧹 Lancement purge des logs (rétention=${RETENTION_DAYS} jours)`
  );

  const res = await purgeOldLogs(db, RETENTION_DAYS);
  if (res.ok && res.engine === 'none') {
    await logger.warn(
      `⚠️ Purge SKIPPED (engine=none${res.note ? `, note=${res.note}` : ''})`
    );
  } else if (res.ok) {
    await logger.info(
      `✅ Purge OK (engine=${res.engine}${
        res.note ? `, note=${res.note}` : ''
      })`
    );
  } else {
    await logger.warn(
      `⚠️ Purge partielle/échec: ${
        res.error?.code || res.error?.message || res.error
      }`
    );
  }
}

/** Planifie la purge quotidienne */
export function scheduleLogsPurge() {
  cron.schedule(CRON_PURGE_SCHEDULE, async () => {
    await runPurgeLogsJob();
  });
}
