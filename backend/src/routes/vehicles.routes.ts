import { Router, type IRouter } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createVehicleSchema, updateVehicleSchema, changeStatusSchema } from '../schemas/vehicle.schema';
import {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  softDeleteVehicle,
  getVehicleHistory,
  exportVehiclesToExcel,
  changeVehicleStatus,
} from '../controllers/vehicle.controller';

const router: IRouter = Router();

// Toutes les routes nécessitent authentification
router.use((req, res, next) => {
  void authenticate(req, res, next);
});

/**
 * @openapi
 * /vehicles/export/excel:
 *   get:
 *     summary: Export Excel de la flotte filtrée
 *     tags: [Véhicules]
 *     parameters:
 *       - in: query
 *         name: statut
 *         schema:
 *           type: string
 *           enum: [DISPONIBLE, LOUE, MAINTENANCE, HORS_SERVICE]
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: string
 *       - in: query
 *         name: marque
 *         schema:
 *           type: string
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Fichier Excel
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Non authentifié
 */
// ATTENTION : /export/excel AVANT /:id pour éviter le conflit de routing
router.get('/export/excel', requireRole(Role.ADMIN, Role.GESTIONNAIRE), (req, res, next) => {
  void exportVehiclesToExcel(req, res, next);
});

/**
 * @openapi
 * /vehicles:
 *   get:
 *     summary: Liste paginée des véhicules
 *     tags: [Véhicules]
 *     parameters:
 *       - in: query
 *         name: statut
 *         schema:
 *           type: string
 *           enum: [DISPONIBLE, LOUE, MAINTENANCE, HORS_SERVICE]
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: string
 *       - in: query
 *         name: marque
 *         schema:
 *           type: string
 *       - in: query
 *         name: q
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
  void getVehicles(req, res, next);
});

/**
 * @openapi
 * /vehicles/{id}:
 *   get:
 *     summary: Détail d'un véhicule
 *     tags: [Véhicules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Véhicule trouvé
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Véhicule introuvable
 */
router.get('/:id', (req, res, next) => {
  void getVehicleById(req, res, next);
});

/**
 * @openapi
 * /vehicles/{id}/history:
 *   get:
 *     summary: Historique des statuts d'un véhicule
 *     tags: [Véhicules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Liste des changements de statut
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Véhicule introuvable
 */
router.get('/:id/history', (req, res, next) => {
  void getVehicleHistory(req, res, next);
});

/**
 * @openapi
 * /vehicles/{id}/status:
 *   patch:
 *     summary: Changer le statut d'un véhicule (automate d'états)
 *     tags: [Véhicules]
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
 *             required: [toStatus, comment]
 *             properties:
 *               toStatus:
 *                 type: string
 *                 enum: [DISPONIBLE, LOUE, MAINTENANCE, HORS_SERVICE]
 *               comment:
 *                 type: string
 *                 minLength: 1
 *     responses:
 *       200:
 *         description: Statut mis à jour
 *       400:
 *         description: Transition invalide
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Rôle insuffisant
 *       422:
 *         description: Validation error
 */
router.patch(
  '/:id/status',
  requireRole(Role.ADMIN, Role.GESTIONNAIRE),
  validate(changeStatusSchema),
  (req, res, next) => {
    void changeVehicleStatus(req, res, next);
  },
);

/**
 * @openapi
 * /vehicles:
 *   post:
 *     summary: Créer un véhicule
 *     tags: [Véhicules]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [immatriculation, marque, modele, annee, km, clientId]
 *             properties:
 *               immatriculation:
 *                 type: string
 *               marque:
 *                 type: string
 *               modele:
 *                 type: string
 *               annee:
 *                 type: integer
 *               km:
 *                 type: integer
 *               clientId:
 *                 type: string
 *               carburant:
 *                 type: string
 *                 enum: [DIESEL, ESSENCE, GPL]
 *               vin:
 *                 type: string
 *               couleur:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Véhicule créé
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
  validate(createVehicleSchema),
  (req, res, next) => {
    void createVehicle(req, res, next);
  },
);

/**
 * @openapi
 * /vehicles/{id}:
 *   patch:
 *     summary: Modifier un véhicule
 *     tags: [Véhicules]
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
 *             properties:
 *               marque:
 *                 type: string
 *               modele:
 *                 type: string
 *               annee:
 *                 type: integer
 *               km:
 *                 type: integer
 *               couleur:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Véhicule modifié
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Rôle insuffisant
 *       404:
 *         description: Véhicule introuvable
 */
router.patch(
  '/:id',
  requireRole(Role.ADMIN, Role.GESTIONNAIRE),
  validate(updateVehicleSchema),
  (req, res, next) => {
    void updateVehicle(req, res, next);
  },
);

/**
 * @openapi
 * /vehicles/{id}:
 *   delete:
 *     summary: Supprimer un véhicule (soft delete, ADMIN only)
 *     tags: [Véhicules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Véhicule supprimé
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Rôle insuffisant
 *       404:
 *         description: Véhicule introuvable
 */
router.delete('/:id', requireRole(Role.ADMIN), (req, res, next) => {
  void softDeleteVehicle(req, res, next);
});

export { router as vehiclesRouter };
