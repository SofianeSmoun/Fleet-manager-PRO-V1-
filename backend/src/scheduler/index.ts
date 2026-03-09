import cron from 'node-cron';
import { runBackup } from '../services/backupService';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

const MAX_RETRIES = 3;

async function shouldRetry(): Promise<boolean> {
  // Check if last backup failed and we haven't exceeded retry limit
  const recentBackups = await prisma.backupLog.findMany({
    orderBy: { startedAt: 'desc' },
    take: MAX_RETRIES,
  });

  if (recentBackups.length === 0) return false;

  const lastSuccess = recentBackups.find((b) => b.status === 'SUCCESS');
  if (lastSuccess) return false;

  // All recent backups failed — check if we've hit retry limit
  const consecutiveFails = recentBackups.filter((b) => b.status === 'FAILED').length;
  return consecutiveFails < MAX_RETRIES;
}

export function startBackupScheduler(): void {
  // Weekly backup: Sunday 02:00 Africa/Algiers
  cron.schedule('0 2 * * 0', () => {
    logger.info('Scheduled weekly backup starting');
    void runBackup().catch((err: unknown) => {
      logger.error('Scheduled backup failed', { error: err instanceof Error ? err.message : String(err) });
    });
  }, { timezone: 'Africa/Algiers' });

  // Daily retry at 03:00 if last backup failed
  cron.schedule('0 3 * * *', () => {
    void (async () => {
      const retry = await shouldRetry();
      if (!retry) return;

      logger.info('Retry backup starting (previous backup failed)');
      try {
        await runBackup();
      } catch (err) {
        logger.error('Retry backup failed', { error: err instanceof Error ? err.message : String(err) });
      }
    })();
  }, { timezone: 'Africa/Algiers' });

  logger.info('Backup scheduler started — weekly Sunday 02:00, daily retry 03:00 (Africa/Algiers)');
}
