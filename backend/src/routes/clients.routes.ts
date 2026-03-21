import { Router, type IRouter, type Request, type Response } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router: IRouter = Router();

// Toutes les routes nécessitent authentification
router.use((req, res, next) => {
  void authenticate(req, res, next);
});

/**
 * @openapi
 * /clients:
 *   get:
 *     summary: Liste des clients
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 15 }
 *     responses:
 *       200:
 *         description: Liste paginée des clients
 */
router.get('/', (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query['page']) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query['limit']) || 15));
  const skip = (page - 1) * limit;

  void Promise.all([
    prisma.client.findMany({
      where: { deletedAt: null },
      orderBy: { nom: 'asc' },
      skip,
      take: limit,
    }),
    prisma.client.count({ where: { deletedAt: null } }),
  ]).then(([data, total]) => {
    res.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  });
});

/**
 * @openapi
 * /clients/{id}:
 *   get:
 *     summary: Détail d'un client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Client trouvé
 *       404:
 *         description: Client introuvable
 */
router.get('/:id', (req: Request, res: Response) => {
  void prisma.client
    .findFirst({
      where: { id: req.params['id'], deletedAt: null },
    })
    .then((client) => {
      if (!client) {
        res.status(404).json({ message: 'Client introuvable' });
        return;
      }
      res.json(client);
    });
});

/**
 * @openapi
 * /clients/{id}/detail:
 *   get:
 *     summary: Détail complet d'un client (véhicules, locations, coûts maintenance)
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: period
 *         schema: { type: string, enum: [month, quarter, year] }
 *         description: Période pour filtrer les coûts maintenance
 *     responses:
 *       200:
 *         description: Client avec véhicules, locations et coûts maintenance
 *       404:
 *         description: Client introuvable
 */
router.get('/:id/detail', (req: Request, res: Response) => {
  const clientId = req.params['id'];
  const period = (req.query['period'] as string) ?? 'year';

  // Calculate date range for maintenance costs
  const now = new Date();
  const fromDate = new Date(now);
  if (period === 'month') {
    fromDate.setMonth(fromDate.getMonth() - 1);
  } else if (period === 'quarter') {
    fromDate.setMonth(fromDate.getMonth() - 3);
  } else {
    fromDate.setFullYear(fromDate.getFullYear() - 1);
  }

  void Promise.all([
    prisma.client.findFirst({
      where: { id: clientId, deletedAt: null },
    }),
    prisma.vehicle.findMany({
      where: { clientId, deletedAt: null },
      orderBy: { immatriculation: 'asc' },
    }),
    prisma.rental.findMany({
      where: { clientId, statut: { in: ['EN_COURS', 'EN_RETARD'] } },
      include: {
        vehicle: { select: { immatriculation: true, marque: true, modele: true } },
      },
      orderBy: { dateDebut: 'desc' },
    }),
    prisma.maintenance.findMany({
      where: {
        vehicle: { clientId, deletedAt: null },
        dateEntree: { gte: fromDate },
      },
      select: { coutEstime: true, coutReel: true },
    }),
  ]).then(([client, vehicles, activeRentals, maintenances]) => {
    if (!client) {
      res.status(404).json({ message: 'Client introuvable' });
      return;
    }

    const maintenanceCosts = {
      totalEstime: maintenances.reduce((sum, m) => sum + (m.coutEstime ?? 0), 0),
      totalReel: maintenances.reduce((sum, m) => sum + (m.coutReel ?? 0), 0),
      count: maintenances.length,
      period,
    };

    res.json({
      ...client,
      vehicles,
      activeRentals,
      maintenanceCosts,
    });
  });
});

export const clientsRouter: IRouter = router;
