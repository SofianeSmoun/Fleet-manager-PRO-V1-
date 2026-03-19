import { Router, type IRouter } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createRentalSchema, updateRentalSchema, closeRentalSchema } from '../schemas/rental.schema';
import {
  getRentals,
  getRentalById,
  createRental,
  updateRental,
  closeRental,
} from '../controllers/rental.controller';

const router: IRouter = Router();

// Toutes les routes nécessitent authentification
router.use((req, res, next) => {
  void authenticate(req, res, next);
});

/**
 * @openapi
 * /rentals:
 *   get:
 *     summary: Liste paginée des locations
 *     tags: [Locations]
 *     parameters:
 *       - in: query
 *         name: statut
 *         schema:
 *           type: string
 *           enum: [EN_COURS, TERMINEE, EN_RETARD, ANNULEE]
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: string
 *       - in: query
 *         name: vehicleId
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 15
 *     responses:
 *       200:
 *         description: Liste paginée
 *       401:
 *         description: Non authentifié
 */
router.get('/', (req, res, next) => {
  void getRentals(req, res, next);
});

/**
 * @openapi
 * /rentals/{id}:
 *   get:
 *     summary: Détail d'une location
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Location trouvée
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Location introuvable
 */
router.get('/:id', (req, res, next) => {
  void getRentalById(req, res, next);
});

/**
 * @openapi
 * /rentals:
 *   post:
 *     summary: Créer une location (véhicule passe LOUE automatiquement)
 *     tags: [Locations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vehicleId, clientId, dateDebut, dateFinPrevue]
 *             properties:
 *               vehicleId:
 *                 type: string
 *               clientId:
 *                 type: string
 *               dateDebut:
 *                 type: string
 *                 format: date-time
 *               dateFinPrevue:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Location créée
 *       400:
 *         description: Véhicule non disponible
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Rôle insuffisant
 *       422:
 *         description: Validation error
 */
router.post(
  '/',
  requireRole(Role.ADMIN, Role.GESTIONNAIRE),
  validate(createRentalSchema),
  (req, res, next) => {
    void createRental(req, res, next);
  },
);

/**
 * @openapi
 * /rentals/{id}:
 *   patch:
 *     summary: Modifier une location (dateFinPrevue, notes)
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Location modifiée
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Rôle insuffisant
 *       404:
 *         description: Location introuvable
 */
router.patch(
  '/:id',
  requireRole(Role.ADMIN, Role.GESTIONNAIRE),
  validate(updateRentalSchema),
  (req, res, next) => {
    void updateRental(req, res, next);
  },
);

/**
 * @openapi
 * /rentals/{id}/close:
 *   patch:
 *     summary: Clôturer une location (véhicule passe DISPONIBLE automatiquement)
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [dateFinReelle]
 *             properties:
 *               dateFinReelle:
 *                 type: string
 *                 format: date-time
 *               kmRetour:
 *                 type: integer
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Location clôturée
 *       400:
 *         description: Statut incompatible
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Rôle insuffisant
 */
router.patch(
  '/:id/close',
  requireRole(Role.ADMIN, Role.GESTIONNAIRE),
  validate(closeRentalSchema),
  (req, res, next) => {
    void closeRental(req, res, next);
  },
);

export { router as rentalsRouter };
