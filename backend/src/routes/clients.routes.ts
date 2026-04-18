import { Router, type IRouter } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { auditLog } from '../middleware/auditLog';
import { createClientSchema, updateClientSchema } from '../schemas/client.schema';
import * as clientController from '../controllers/client.controller';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type { Request, Response } from 'express';

const router: IRouter = Router();

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
 *       - in: query
 *         name: wilaya
 *         schema: { type: string }
 *       - in: query
 *         name: secteur
 *         schema: { type: string }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Liste paginée des clients
 */
router.get('/', (req, res, next) => {
  void clientController.getClients(req, res, next);
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
router.get('/:id', (req, res, next) => {
  void clientController.getClientById(req, res, next);
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

/**
 * @openapi
 * /clients:
 *   post:
 *     summary: Créer un client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Client créé
 */
router.post(
  '/',
  requireRole(Role.ADMIN, Role.GESTIONNAIRE, Role.COMMERCIAL),
  validate(createClientSchema),
  auditLog('Client', 'CREATE'),
  (req, res, next) => {
    void clientController.createClient(req, res, next);
  },
);

/**
 * @openapi
 * /clients/{id}:
 *   patch:
 *     summary: Modifier un client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Client modifié
 */
router.patch(
  '/:id',
  requireRole(Role.ADMIN, Role.GESTIONNAIRE, Role.COMMERCIAL),
  validate(updateClientSchema),
  auditLog('Client', 'UPDATE'),
  (req, res, next) => {
    void clientController.updateClient(req, res, next);
  },
);

/**
 * @openapi
 * /clients/{id}:
 *   delete:
 *     summary: Supprimer un client (soft delete)
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Client supprimé
 */
router.delete(
  '/:id',
  requireRole(Role.ADMIN),
  auditLog('Client', 'DELETE'),
  (req, res, next) => {
    void clientController.softDeleteClient(req, res, next);
  },
);

export const clientsRouter: IRouter = router;
