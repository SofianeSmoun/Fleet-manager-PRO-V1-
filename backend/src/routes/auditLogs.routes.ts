import { Router, type IRouter, type Request, type Response, type NextFunction } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import type { Prisma } from '@prisma/client';

const router: IRouter = Router();

router.use((req: Request, res: Response, next: NextFunction) => {
  void authenticate(req, res, next);
});

/**
 * @openapi
 * /audit-logs:
 *   get:
 *     summary: Liste paginée des logs d'audit (ADMIN uniquement)
 *     tags: [Audit]
 *     parameters:
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Liste paginée des logs d'audit
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Rôle insuffisant
 */
router.get('/', requireRole(Role.ADMIN), (req: Request, res: Response, next: NextFunction) => {
  void (async (): Promise<void> => {
    try {
      const page = Math.max(1, Number(req.query['page']) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query['limit']) || 20));
      const skip = (page - 1) * limit;

      const where: Prisma.AuditLogWhereInput = {};

      if (req.query['entityType']) {
        where.entityType = String(req.query['entityType']);
      }
      if (req.query['entityId']) {
        where.entityId = String(req.query['entityId']);
      }
      if (req.query['userId']) {
        where.userId = String(req.query['userId']);
      }

      const fromParam = req.query['from'];
      const toParam = req.query['to'];
      if (fromParam || toParam) {
        where.timestamp = {};
        if (fromParam) {
          (where.timestamp as Prisma.DateTimeFilter).gte = new Date(String(fromParam));
        }
        if (toParam) {
          (where.timestamp as Prisma.DateTimeFilter).lte = new Date(String(toParam));
        }
      }

      const [data, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          skip,
          take: limit,
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        }),
        prisma.auditLog.count({ where }),
      ]);

      res.json({
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (err) {
      next(err);
    }
  })();
});

export { router as auditLogsRouter };
