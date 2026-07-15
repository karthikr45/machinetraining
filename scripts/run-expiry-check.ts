/**
 * Standalone daily expiry check runner.
 * Use with an external scheduler (cron) or `npm run expiry:check`.
 * In production you can also POST /api/schedule/expiry-check with the x-cron-secret header.
 */
import { runDailyExpiryCheck } from '../lib/expiry-checker';
import { prisma } from '../lib/prisma';

async function main() {
  console.log(`[expiry-check] starting at ${new Date().toISOString()}`);
  const report = await runDailyExpiryCheck();
  console.log('[expiry-check] report:', JSON.stringify(report, null, 2));
}

main()
  .catch((e) => {
    console.error('[expiry-check] failed', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
