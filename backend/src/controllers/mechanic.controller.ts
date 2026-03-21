import type { Request, Response, NextFunction } from 'express';
import { garageFiltersSchema } from '../schemas/garage.schema';
import * as mechanicService from '../services/mechanicService';

export async function getMechanics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const filters = garageFiltersSchema.parse(req.query);
    const result = await mechanicService.getMechanicsWithWorkload(filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getMechanicWorkload(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const mechanic = await mechanicService.getWorkload(req.params['id']);
    if (!mechanic) {
      res.status(404).json({ message: 'Mécanicien introuvable' });
      return;
    }
    res.json(mechanic);
  } catch (err) {
    next(err);
  }
}
