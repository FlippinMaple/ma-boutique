// server/jobs/purgeLogs.js
import cron from 'node-cron';
import { logToDatabase, purgeOldLogs } from '../utils/logger.js';

export function scheduleLogsPurge() {
  const SPEC = process.env.CRON_PURGE_LOG_SCHEDULE || '0 0 * * *';
  const DAYS = parseInt(process.env.LOG_RETENTION_DAYS, 10) || 7;

  cron.schedule(SPEC, async () => {
    await logToDatabase(
      '🧹 Cron minuit : purge des anciens logs',
      'info',
      'cron_purge'
    );
    await purgeOldLogs(DAYS);
  });
}
