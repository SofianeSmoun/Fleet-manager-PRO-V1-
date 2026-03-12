import { Router, type IRouter } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createVehicleSchema, updateVehicleSchema } from '../schemas/vehicle.schema';
import {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  softDeleteVehicle,
  getVehicleHistory,
  exportVehiclesToExcel,
} from '../controllers/vehicle.controller';

const router: IRouter = Router();

// Toutes les routes nécessitent authentification
router.use((req, res, next) => {
  void authenticate(req, res, next);
});

// ATTENTION : /export/excel AVANT /:id pour éviter le conflit de routing
router.get('/export/excel', (req, res, next) => {
  void exportVehiclesToExcel(req, res, next);
});

router.get('/', (req, res, next) => {
  void getVehicles(req, res, next);
});

router.get('/:id', (req, res, next) => {
  void getVehicleById(req, res, next);
});

router.get('/:id/history', (req, res, next) => {
  void getVehicleHistory(req, res, next);
});

router.post(
  '/',
  requireRole(Role.ADMIN, Role.GESTIONNAIRE),
  validate(createVehicleSchema),
  (req, res, next) => {
    void createVehicle(req, res, next);
  },
);

router.patch(
  '/:id',
  requireRole(Role.ADMIN, Role.GESTIONNAIRE),
  validate(updateVehicleSchema),
  (req, res, next) => {
    void updateVehicle(req, res, next);
  },
);

router.delete('/:id', requireRole(Role.ADMIN), (req, res, next) => {
  void softDeleteVehicle(req, res, next);
});

export { router as vehiclesRouter };
