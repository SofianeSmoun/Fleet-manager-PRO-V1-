import { z } from 'zod';
import { GarageStatus, Specialty } from '@prisma/client';

export const createGarageSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  adresse: z.string().min(1, "L'adresse est requise"),
  ville: z.string().min(1, 'La ville est requise'),
  wilaya: z.string().optional(),
  telephone: z.string().min(1, 'Le téléphone est requis'),
  email: z.string().email('Email invalide').optional(),
  specialite: z.nativeEnum(Specialty).optional(),
  notes: z.string().optional(),
});
export type CreateGarageInput = z.infer<typeof createGarageSchema>;

export const updateGarageSchema = z.object({
  nom: z.string().min(1).optional(),
  adresse: z.string().min(1).optional(),
  ville: z.string().min(1).optional(),
  wilaya: z.string().optional(),
  telephone: z.string().min(1).optional(),
  email: z.string().email('Email invalide').optional(),
  specialite: z.nativeEnum(Specialty).optional(),
  statut: z.nativeEnum(GarageStatus).optional(),
  notes: z.string().optional(),
});
export type UpdateGarageInput = z.infer<typeof updateGarageSchema>;

export const garageFiltersSchema = z.object({
  statut: z.nativeEnum(GarageStatus).optional(),
  specialite: z.nativeEnum(Specialty).optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(15),
  sortBy: z.string().default('nom'),
  order: z.enum(['asc', 'desc']).default('asc'),
});
export type GarageFilters = z.infer<typeof garageFiltersSchema>;
