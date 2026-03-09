import fs from 'fs';
import path from 'path';
import { logger } from './logger';

const BACKUP_DIR = process.env['BACKUP_LOCAL_DIR'] ?? '/var/backups/fleetmanager';

export function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

export function uploadBackup(
  filename: string,
  data: Buffer,
): { fileId: string; size: number } {
  ensureBackupDir();
  const destPath = path.join(BACKUP_DIR, filename);
  fs.writeFileSync(destPath, data);
  logger.info('Backup saved locally', { path: destPath, filename });
  return { fileId: destPath, size: data.length };
}

export function downloadBackup(fileId: string): Buffer {
  return fs.readFileSync(fileId);
}

export function listBackupFiles(): Array<{ id: string; name: string; createdTime: string }> {
  ensureBackupDir();
  return fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith('.enc'))
    .map((f) => {
      const fullPath = path.join(BACKUP_DIR, f);
      const stat = fs.statSync(fullPath);
      return {
        id: fullPath,
        name: f,
        createdTime: stat.birthtime.toISOString(),
      };
    })
    .sort((a, b) => b.createdTime.localeCompare(a.createdTime))
    .slice(0, 20);
}

export function deleteOldBackups(retentionDays: number): number {
  ensureBackupDir();
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.enc'));
  let deleted = 0;
  for (const f of files) {
    const fullPath = path.join(BACKUP_DIR, f);
    const stat = fs.statSync(fullPath);
    if (stat.birthtimeMs < cutoff) {
      fs.unlinkSync(fullPath);
      deleted++;
    }
  }
  return deleted;
}
