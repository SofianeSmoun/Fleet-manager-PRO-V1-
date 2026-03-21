import type { Request, Response, NextFunction } from 'express';
import { rentalsFiltersSchema } from '../schemas/rental.schema';
import type { CreateRentalInput, CloseRentalInput, UpdateRentalInput } from '../schemas/rental.schema';
import * as rentalService from '../services/rentalService';

export async function getRentals(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = rentalsFiltersSchema.parse(req.query);
    const result = await rentalService.getRentals(filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getRentalById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rental = await rentalService.getRentalById(req.params['id']);
    if (!rental) {
      res.status(404).json({ message: 'Location introuvable' });
      return;
    }
    res.json(rental);
  } catch (err) {
    next(err);
  }
}

export async function createRental(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = req.body as CreateRentalInput;
    const userId = req.user?.sub as string;
    const userRole = req.user?.role;
    if (!userRole) {
      res.status(401).json({ message: 'Non authentifié' });
      return;
    }
    const rental = await rentalService.createRental(data, userId, userRole);
    res.status(201).json(rental);
  } catch (err) {
    next(err);
  }
}

export async function updateRental(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = req.body as UpdateRentalInput;
    const rental = await rentalService.updateRental(req.params['id'], data);
    res.json(rental);
  } catch (err) {
    next(err);
  }
}

export async function closeRental(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = req.body as CloseRentalInput;
    const userId = req.user?.sub as string;
    const userRole = req.user?.role;
    if (!userRole) {
      res.status(401).json({ message: 'Non authentifié' });
      return;
    }
    const rental = await rentalService.closeRental(req.params['id'], data, userId, userRole);
    res.json(rental);
  } catch (err) {
    next(err);
  }
}
