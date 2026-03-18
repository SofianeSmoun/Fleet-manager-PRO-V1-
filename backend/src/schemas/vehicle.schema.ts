import { z } from 'zod';
import { VehicleStatus, Fuel } from '@prisma/client';

export const changeStatusSchema = z.object({
  toStatus: z.nativeEnum(VehicleStatus),
  comment: z.string().min(1, 'Le commentaire est obligatoire'),
});
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;

// Regex immatriculation algérienne : WW·NNNN·ALG (séparateur U+00B7)
const immatriculationRegex = /^\d{2}\u00B7\d{4}\u00B7ALG$/;

export const createVehicleSchema = z.object({
  immatriculation: z
    .string()
    .regex(immatriculationRegex, 'Format attendu : WW·NNNN·ALG (ex: 16·2341·ALG)'),
  vin: z.string().min(1).optional(),
  marque: z.string().min(1, 'Marque requise'),
  modele: z.string().min(1, 'Modèle requis'),
  annee: z.number().int().min(2000).max(2030),
  km: z.number().int().min(0, 'Le kilométrage doit être positif'),
  carburant: z.nativeEnum(Fuel).default(Fuel.DIESEL),
  couleur: z.string().optional(),
  clientId: z.string().uuid('clientId doit être un UUID valide'),
  notes: z.string().optional(),
});
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

export const updateVehicleSchema = z.object({
  immatriculation: z
    .string()
    .regex(immatriculationRegex, 'Format attendu : WW·NNNN·ALG (ex: 16·2341·ALG)')
    .optional(),
  vin: z.string().min(1).optional(),
  marque: z.string().min(1).optional(),
  modele: z.string().min(1).optional(),
  annee: z.number().int().min(2000).max(2030).optional(),
  km: z.number().int().min(0).optional(),
  carburant: z.nativeEnum(Fuel).optional(),
  couleur: z.string().optional(),
  clientId: z.string().uuid().optional(),
  notes: z.string().optional(),
});
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;

export const vehicleFiltersSchema = z.object({
  statut: z.nativeEnum(VehicleStatus).optional(),
  clientId: z.string().uuid().optional(),
  marque: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(15),
  sortBy: z.string().default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});
export type VehicleFilters = z.infer<typeof vehicleFiltersSchema>;
