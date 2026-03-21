import type { VehicleStatus, RentalStatus } from './index';

export interface Client {
  id: string;
  nom: string;
  secteur: string;
  adresse: string | null;
  contactNom: string;
  contactEmail: string;
  contactTel: string;
  couleur: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientVehicle {
  id: string;
  immatriculation: string;
  marque: string;
  modele: string;
  annee: number;
  km: number;
  statut: VehicleStatus;
  carburant: string;
}

export interface ClientRental {
  id: string;
  vehicleId: string;
  dateDebut: string;
  dateFinPrevue: string;
  statut: RentalStatus;
  montantMensuel: number | null;
  vehicle: { immatriculation: string; marque: string; modele: string };
}

export interface MaintenanceCosts {
  totalEstime: number;
  totalReel: number;
  count: number;
  period: string;
}

export interface ClientDetail extends Client {
  vehicles: ClientVehicle[];
  activeRentals: ClientRental[];
  maintenanceCosts: MaintenanceCosts;
}
