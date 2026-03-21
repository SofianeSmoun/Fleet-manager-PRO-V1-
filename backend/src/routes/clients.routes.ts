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

export const clientsRouter: IRouter = router;
