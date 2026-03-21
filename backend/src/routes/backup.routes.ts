import { Router, type IRouter, type Request, type Response, type NextFunction } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { runBackup } from '../services/backupService';
import { logger } from '../lib/logger';

const router: IRouter = Router();

router.use((req: Request, res: Response, next: NextFunction) => {
  void authenticate(req, res, next);
});

function getNextSunday2AM(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const daysUntilSunday = day === 0 ? 7 : 7 - day;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntilSunday);
  next.setHours(2, 0, 0, 0);
  return next.toISOString();
}

/**
 * @openapi
 * /admin/backup/status:
 *   get:
 *     summary: Statut et historique des backups (ADMIN)
 *     tags: [Backup]
 *     responses:
 *       200:
 *         description: Statut backup
 *       403:
 *         description: Rôle insuffisant
 */
router.get('/status', requireRole(Role.ADMIN), (_req: Request, res: Response, next: NextFunction) => {
  void (async (): Promise<void> => {
    try {
      const history = await prisma.backupLog.findMany({
        orderBy: { startedAt: 'desc' },
        take: 10,
      });

      const lastBackup = history.length > 0 ? history[0] : null;
      let lastBackupInfo: {
        status: string;
        startedAt: Date;
        size: number;
        duration: number | null;
      } | null = null;

      if (lastBackup) {
        const duration =
          lastBackup.completedAt && lastBackup.startedAt
            ? lastBackup.completedAt.getTime() - lastBackup.startedAt.getTime()
            : null;
        lastBackupInfo = {
          status: lastBackup.status,
          startedAt: lastBackup.startedAt,
          size: lastBackup.sizeBytes,
          duration,
        };
      }

      res.json({
        lastBackup: lastBackupInfo,
        history,
        nextScheduled: getNextSunday2AM(),
      });
    } catch (err) {
      next(err);
    }
  })();
});

/**
 * @openapi
 * /admin/backup/trigger:
 *   post:
 *     summary: Déclencher un backup manuel (ADMIN)
 *     tags: [Backup]
 *     responses:
 *       202:
 *         description: Backup démarré
 *       403:
 *         description: Rôle insuffisant
 */
router.post('/trigger', requireRole(Role.ADMIN), (_req: Request, res: Response) => {
  res.status(202).json({ message: 'Backup démarré' });

  // Fire and forget
  void runBackup().catch((err: unknown) => {
    logger.error('Manual backup failed', { error: err instanceof Error ? err.message : String(err) });
  });
});

export { router as backupRouter };
