import type { VehicleStatus, Fuel, RentalStatus, MaintenanceStatus, InsuranceStatus } from './index';

export interface Client {
  id: string;
  nom: string;
  secteur: string;
  adresse?: string;
  contactNom: string;
  contactEmail: string;
  contactTel: string;
  couleur: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  immatriculation: string;
  vin?: string;
  marque: string;
  modele: string;
  annee: number;
  km: number;
  statut: VehicleStatus;
  carburant: Fuel;
  couleur?: string;
  notes?: string;
  clientId: string;
  createdAt: string;
  updatedAt: string;
  client: { nom: string; couleur: string; wilaya?: string | null | undefined };
  rentals?: { dateDebut: string; dateFinPrevue: string | null }[] | undefined;
  maintenances?: { nature: string; statut: string }[] | undefined;
}

export interface VehicleDetail extends Vehicle {
  client: Client;
  rentals: Rental[];
  maintenances: Maintenance[];
  insurances: InsurancePolicy[];
}

export interface Rental {
  id: string;
  vehicleId: string;
  clientId: string;
  dateDebut: string;
  dateFinPrevue: string | null;
  dateFinReelle?: string;
  statut: RentalStatus;
  montantMensuel?: number;
  devise: string;
  notes?: string;
  createdAt: string;
}

export interface Maintenance {
  id: string;
  vehicleId: string;
  garageId: string;
  type: string;
  nature: string;
  dateEntree: string;
  dateSortiePrevue: string;
  dateSortieReelle?: string;
  statut: MaintenanceStatus;
  coutEstime?: number;
  coutReel?: number;
  rapport?: string;
  createdAt: string;
}

export interface InsurancePolicy {
  id: string;
  vehicleId: string;
  compagnie: string;
  numeroPolice: string;
  typeCouverture: string;
  adresseAgence?: string | null | undefined;
  dateDebut: string;
  dateEcheance: string;
  primeMontant: number;
  statut: InsuranceStatus;
  notes?: string;
  createdAt: string;
}

export interface StatusHistoryEntry {
  id: string;
  vehicleId: string;
  fromStatus: string;
  toStatus: string;
  reason: string;
  changedAt: string;
  changedBy: { firstName: string; lastName: string };
}

export interface VehicleFilters {
  statut?: VehicleStatus | undefined;
  clientId?: string | undefined;
  marque?: string | undefined;
  wilaya?: string | undefined;
  maintenance?: 'OUI' | 'NON' | undefined;
  from?: string | undefined;
  to?: string | undefined;
  q?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
  sortBy?: string | undefined;
  order?: 'asc' | 'desc' | undefined;
}
