import type { Request, Response, NextFunction } from 'express';
import { garageFiltersSchema } from '../schemas/garage.schema';
import type { CreateGarageInput, UpdateGarageInput } from '../schemas/garage.schema';
import * as garageService from '../services/garageService';

export async function getGarages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = garageFiltersSchema.parse(req.query);
    const result = await garageService.getGarages(filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getGarageById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const garage = await garageService.getGarageById(req.params['id']);
    if (!garage) {
      res.status(404).json({ message: 'Garage introuvable' });
      return;
    }
    res.json(garage);
  } catch (err) {
    next(err);
  }
}

export async function createGarage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = req.body as CreateGarageInput;
    const garage = await garageService.createGarage(data);
    res.status(201).json(garage);
  } catch (err) {
    next(err);
  }
}

export async function updateGarage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = req.body as UpdateGarageInput;
    const garage = await garageService.updateGarage(req.params['id'], data);
    res.json(garage);
  } catch (err) {
    next(err);
  }
}

export async function softDeleteGarage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await garageService.softDeleteGarage(req.params['id']);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
