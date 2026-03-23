import type { Request, Response, NextFunction } from 'express';
import { clientFiltersSchema } from '../schemas/client.schema';
import type { CreateClientInput, UpdateClientInput } from '../schemas/client.schema';
import * as clientService from '../services/clientService';

export async function getClients(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = clientFiltersSchema.parse(req.query);
    const result = await clientService.getClients(filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getClientById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const client = await clientService.getClientById(req.params['id']);
    if (!client) {
      res.status(404).json({ message: 'Client introuvable' });
      return;
    }
    res.json(client);
  } catch (err) {
    next(err);
  }
}

export async function createClient(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = req.body as CreateClientInput;
    const client = await clientService.createClient(data);
    res.status(201).json(client);
  } catch (err) {
    next(err);
  }
}

export async function updateClient(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = req.body as UpdateClientInput;
    const client = await clientService.updateClient(req.params['id'], data);
    res.json(client);
  } catch (err) {
    next(err);
  }
}

export async function softDeleteClient(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await clientService.softDeleteClient(req.params['id']);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
