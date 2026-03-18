import type { Request, Response, NextFunction } from 'express';
import { vehicleFiltersSchema } from '../schemas/vehicle.schema';
import type { CreateVehicleInput, UpdateVehicleInput, ChangeStatusInput } from '../schemas/vehicle.schema';
import * as vehicleService from '../services/vehicleService';

export async function getVehicles(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = vehicleFiltersSchema.parse(req.query);
    const result = await vehicleService.getVehicles(filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getVehicleById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const vehicle = await vehicleService.getVehicleById(req.params['id']);
    if (!vehicle) {
      res.status(404).json({ message: 'Véhicule introuvable' });
      return;
    }
    res.json(vehicle);
  } catch (err) {
    next(err);
  }
}

export async function createVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = req.body as CreateVehicleInput;
    const userId = req.user?.sub as string;
    const vehicle = await vehicleService.createVehicle(data, userId);
    res.status(201).json(vehicle);
  } catch (err) {
    next(err);
  }
}

export async function updateVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = req.body as UpdateVehicleInput;
    const vehicle = await vehicleService.updateVehicle(req.params['id'], data);
    res.json(vehicle);
  } catch (err) {
    next(err);
  }
}

export async function softDeleteVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await vehicleService.softDeleteVehicle(req.params['id']);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getVehicleHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const history = await vehicleService.getVehicleHistory(req.params['id']);
    res.json(history);
  } catch (err) {
    next(err);
  }
}

export async function changeVehicleStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { toStatus, comment } = req.body as ChangeStatusInput;
    const userId = req.user?.sub as string;
    const userRole = req.user?.role;
    if (!userRole) {
      res.status(401).json({ message: 'Non authentifié' });
      return;
    }
    const vehicle = await vehicleService.changeVehicleStatus(
      req.params['id'],
      toStatus,
      comment,
      userId,
      userRole,
    );
    res.json(vehicle);
  } catch (err) {
    next(err);
  }
}

export async function exportVehiclesToExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = vehicleFiltersSchema.parse(req.query);
    const buffer = await vehicleService.exportVehiclesToExcel(filters);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=flotte.xlsx');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}
