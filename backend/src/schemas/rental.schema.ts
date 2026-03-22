import { z } from 'zod';

export const createRentalSchema = z
  .object({
    vehicleId: z.string().uuid(),
    clientId: z.string().uuid(),
    dateDebut: z.string().datetime(),
    dateFinPrevue: z.string().datetime().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => !data.dateFinPrevue || new Date(data.dateFinPrevue) > new Date(data.dateDebut),
    {
      message: 'La date de fin prévue doit être postérieure à la date de début',
      path: ['dateFinPrevue'],
    },
  );
export type CreateRentalInput = z.infer<typeof createRentalSchema>;

export const closeRentalSchema = z.object({
  dateFinReelle: z.string().datetime(),
  kmRetour: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});
export type CloseRentalInput = z.infer<typeof closeRentalSchema>;

export const updateRentalSchema = z.object({
  dateFinPrevue: z.string().datetime().nullable().optional(),
  notes: z.string().optional(),
});
export type UpdateRentalInput = z.infer<typeof updateRentalSchema>;

export const rentalsFiltersSchema = z.object({
  statut: z.enum(['EN_COURS', 'TERMINEE', 'EN_RETARD', 'ANNULEE']).optional(),
  clientId: z.string().uuid().optional(),
  vehicleId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(15),
  sortBy: z.string().default('dateDebut'),
  order: z.enum(['asc', 'desc']).default('desc'),
});
export type RentalsFilters = z.infer<typeof rentalsFiltersSchema>;
