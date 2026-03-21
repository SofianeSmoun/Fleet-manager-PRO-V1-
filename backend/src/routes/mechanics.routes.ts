import { Router, type IRouter } from 'express';
import { authenticate } from '../middleware/auth';
import * as mechanicController from '../controllers/mechanic.controller';

const router: IRouter = Router();

router.use((req, res, next) => {
  void authenticate(req, res, next);
});

/**
 * @openapi
 * /mechanics:
 *   get:
 *     summary: Liste des mécaniciens avec charge de travail
 *     tags: [Mécaniciens]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: statut
 *         schema: { type: string, enum: [DISPONIBLE, OCCUPE, INDISPONIBLE] }
 *       - in: query
 *         name: specialite
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 15 }
 *     responses:
 *       200:
 *         description: Liste paginée des mécaniciens avec interventions actives
 */
router.get('/', (req, res, next) => {
  void mechanicController.getMechanics(req, res, next);
});

/**
 * @openapi
 * /mechanics/{id}:
 *   get:
 *     summary: Détail mécanicien avec charge de travail
 *     tags: [Mécaniciens]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Mécanicien avec interventions actives
 *       404:
 *         description: Mécanicien introuvable
 */
router.get('/:id', (req, res, next) => {
  void mechanicController.getMechanicWorkload(req, res, next);
});

export const mechanicsRouter: IRouter = router;
