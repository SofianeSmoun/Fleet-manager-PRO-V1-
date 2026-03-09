import { execSync } from 'child_process';
import { encrypt, decrypt } from '../lib/encryption';
import { uploadBackup, downloadBackup } from '../lib/googleDrive';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

function getDatabaseUrl(): string {
  const url = process.env['DATABASE_URL'];
  if (!url) throw new Error('DATABASE_URL must be set');
  return url;
}

export async function runBackup(): Promise<{ id: string; filename: string }> {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const filename = `fleetmanager-backup-${timestamp}.sql.gz.enc`;

  // Create BackupLog entry
  const log = await prisma.backupLog.create({
    data: { filename, sizeBytes: 0, status: 'IN_PROGRESS' },
  });

  try {
    // pg_dump → gzip (in memory)
    const dumpBuffer = execSync(
      `pg_dump "${getDatabaseUrl()}" --no-owner --no-acl | gzip`,
      { maxBuffer: 200 * 1024 * 1024 }, // 200 MB max
    );

    // Encrypt
    const encrypted = encrypt(dumpBuffer);

    // Save locally
    const { fileId, size } = uploadBackup(filename, encrypted);

    // Update log
    await prisma.backupLog.update({
      where: { id: log.id },
      data: {
        status: 'SUCCESS',
        sizeBytes: size,
        driveFileId: fileId,
        completedAt: new Date(),
      },
    });

    logger.info('Backup completed successfully', { backupId: log.id, filename, sizeBytes: size });
    return { id: log.id, filename };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.backupLog.update({
      where: { id: log.id },
      data: {
        status: 'FAILED',
        errorMessage: message,
        completedAt: new Date(),
      },
    });

    logger.error('Backup failed', { backupId: log.id, error: message });
    throw err;
  }
}

export function restoreBackup(backupPath: string): void {
  logger.info('Starting restore from local backup', { backupPath });

  // Read encrypted backup
  const encrypted = downloadBackup(backupPath);

  // Decrypt
  const gzipped = decrypt(encrypted);

  // Restore: gunzip | psql
  execSync(
    `gunzip -c | psql "${getDatabaseUrl()}"`,
    { input: gzipped, maxBuffer: 200 * 1024 * 1024 },
  );

  logger.info('Restore completed successfully', { backupPath });
}
