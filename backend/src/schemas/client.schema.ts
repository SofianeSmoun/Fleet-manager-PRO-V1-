import { z } from 'zod';

export const createClientSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  secteur: z.string().min(1, 'Le secteur est requis'),
  adresse: z.string().optional(),
  wilaya: z.string().optional(),
  contactNom: z.string().min(1, 'Le nom du contact est requis'),
  contactEmail: z.string().email('Email invalide'),
  contactTel: z.string().min(1, 'Le téléphone est requis'),
  couleur: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Couleur hex invalide'),
  notes: z.string().optional(),
});
export type CreateClientInput = z.infer<typeof createClientSchema>;

export const updateClientSchema = z.object({
  nom: z.string().min(1).optional(),
  secteur: z.string().min(1).optional(),
  adresse: z.string().optional(),
  wilaya: z.string().optional(),
  contactNom: z.string().min(1).optional(),
  contactEmail: z.string().email('Email invalide').optional(),
  contactTel: z.string().min(1).optional(),
  couleur: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Couleur hex invalide').optional(),
  notes: z.string().optional(),
});
export type UpdateClientInput = z.infer<typeof updateClientSchema>;

export const clientFiltersSchema = z.object({
  wilaya: z.string().optional(),
  secteur: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(15),
  sortBy: z.string().default('nom'),
  order: z.enum(['asc', 'desc']).default('asc'),
});
export type ClientFilters = z.infer<typeof clientFiltersSchema>;
