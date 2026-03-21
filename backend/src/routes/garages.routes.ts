import { Router, type IRouter } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { auditLog } from '../middleware/auditLog';
import { createGarageSchema, updateGarageSchema } from '../schemas/garage.schema';
import * as garageController from '../controllers/garage.controller';
import { Role } from '@prisma/client';

const router: IRouter = Router();

router.use((req, res, next) => {
  void authenticate(req, res, next);
});

/**
 * @openapi
 * /garages:
 *   get:
 *     summary: Liste des garages
 *     tags: [Garages]
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
 *         name: statut
 *         schema: { type: string, enum: [DISPONIBLE, OCCUPE, INDISPONIBLE] }
 *       - in: query
 *         name: specialite
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Liste paginée des garages
 */
router.get('/', (req, res, next) => {
  void garageController.getGarages(req, res, next);
});

/**
 * @openapi
 * /garages/{id}:
 *   get:
 *     summary: Détail d'un garage
 *     tags: [Garages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Garage trouvé
 *       404:
 *         description: Garage introuvable
 */
router.get('/:id', (req, res, next) => {
  void garageController.getGarageById(req, res, next);
});

/**
 * @openapi
 * /garages:
 *   post:
 *     summary: Créer un garage
 *     tags: [Garages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Garage créé
 */
router.post(
  '/',
  requireRole(Role.ADMIN, Role.GESTIONNAIRE),
  validate(createGarageSchema),
  auditLog('Garage', 'CREATE'),
  (req, res, next) => {
    void garageController.createGarage(req, res, next);
  },
);

/**
 * @openapi
 * /garages/{id}:
 *   patch:
 *     summary: Modifier un garage
 *     tags: [Garages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Garage modifié
 */
router.patch(
  '/:id',
  requireRole(Role.ADMIN, Role.GESTIONNAIRE),
  validate(updateGarageSchema),
  auditLog('Garage', 'UPDATE'),
  (req, res, next) => {
    void garageController.updateGarage(req, res, next);
  },
);

/**
 * @openapi
 * /garages/{id}:
 *   delete:
 *     summary: Supprimer un garage (soft delete)
 *     tags: [Garages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Garage supprimé
 */
router.delete(
  '/:id',
  requireRole(Role.ADMIN),
  auditLog('Garage', 'DELETE'),
  (req, res, next) => {
    void garageController.softDeleteGarage(req, res, next);
  },
);

export const garagesRouter: IRouter = router;
