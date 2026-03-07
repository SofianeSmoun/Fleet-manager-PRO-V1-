// Types partagés frontend — générés depuis le schéma Prisma
// Seront enrichis au fur et à mesure des épics

export type Role = 'ADMIN' | 'GESTIONNAIRE' | 'COMMERCIAL' | 'LECTEUR';

export type VehicleStatus = 'DISPONIBLE' | 'LOUE' | 'MAINTENANCE' | 'HORS_SERVICE';

export type Fuel = 'DIESEL' | 'ESSENCE' | 'GPL';

export type RentalStatus = 'EN_COURS' | 'TERMINEE' | 'EN_RETARD' | 'ANNULEE';

export type MaintenanceType = 'CORRECTIVE' | 'PREVENTIVE' | 'ACCIDENTELLE';

export type MaintenanceStatus = 'EN_ATTENTE' | 'EN_COURS' | 'TERMINEE' | 'EN_RETARD';

export type GarageStatus = 'DISPONIBLE' | 'OCCUPE' | 'INDISPONIBLE';

export type StockMovementType = 'ENTREE' | 'SORTIE' | 'TRANSFERT';

export type InsuranceStatus = 'ACTIVE' | 'EXPIRANT_BIENTOT' | 'EXPIREE';

export interface ApiError {
  message: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
