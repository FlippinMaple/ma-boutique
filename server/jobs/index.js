// jobs/index.js
import { schedulePrintfulSync } from './printfulSync.js';
import { scheduleLogsPurge } from './purgeLogs.js';
import { startAbandonedCartCron } from './abandonedCartJob.js';

export function startCronJobs() {
  schedulePrintfulSync();
  scheduleLogsPurge();
  if (process.env.ENABLE_ABANDON_CRON === 'true') {
    startAbandonedCartCron();
  }
}
