/**
 * Optional in-process scheduler using node-cron.
 * Runs the daily expiry/CAPA/notification check at 02:00 every day.
 * Start with: npx tsx scripts/scheduler.ts  (keep running as a worker/service)
 * On Vercel, prefer a Vercel Cron hitting POST /api/schedule/expiry-check instead.
 */
import cron from 'node-cron';
import { runDailyExpiryCheck } from '../lib/expiry-checker';

console.log('[scheduler] node-cron scheduler started. Daily expiry check at 02:00 IST.');

cron.schedule(
  '0 2 * * *',
  async () => {
    console.log(`[scheduler] running daily expiry check @ ${new Date().toISOString()}`);
    try {
      const report = await runDailyExpiryCheck();
      console.log('[scheduler] done:', report);
    } catch (e) {
      console.error('[scheduler] error', e);
    }
  },
  { timezone: 'Asia/Kolkata' }
);
