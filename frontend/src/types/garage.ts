import type { GarageStatus, Specialty } from './index';

export interface Garage {
  id: string;
  nom: string;
  adresse: string;
  ville: string;
  telephone: string;
  email: string | null;
  specialite: Specialty | null;
  statut: GarageStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { maintenances: number };
}

export interface GarageFilters {
  statut?: GarageStatus | undefined;
  specialite?: Specialty | undefined;
  q?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
  sortBy?: string | undefined;
  order?: 'asc' | 'desc' | undefined;
}

export interface MechanicMaintenance {
  id: string;
  nature: string;
  statut: string;
  vehicle: { immatriculation: string; marque: string; modele: string };
}

export interface MechanicWithWorkload {
  id: string;
  nom: string;
  adresse: string;
  ville: string;
  telephone: string;
  email: string | null;
  specialite: Specialty | null;
  statut: GarageStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  activeMaintenances: number;
  maintenances: MechanicMaintenance[];
}
