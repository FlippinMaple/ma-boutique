// jobs/index.js
import { schedulePrintfulSync } from './printfulSync.js';
import { scheduleLogsPurge } from './purgeLogs.js';

export function startCronJobs() {
  schedulePrintfulSync();
  scheduleLogsPurge();
}
