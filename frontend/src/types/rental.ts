export type RentalStatus = 'EN_COURS' | 'TERMINEE' | 'EN_RETARD' | 'ANNULEE';

export interface Rental {
  id: string;
  vehicleId: string;
  clientId: string;
  dateDebut: string;
  dateFinPrevue: string;
  dateFinReelle: string | null;
  statut: RentalStatus;
  montantMensuel: number | null;
  devise: string;
  notes: string | null;
  createdAt: string;
  vehicle: { immatriculation: string; marque: string; modele: string };
  client: { nom: string; couleur: string };
}

export interface RentalsResponse {
  data: Rental[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RentalsFilters {
  statut?: RentalStatus | undefined;
  clientId?: string | undefined;
  vehicleId?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
  sortBy?: string | undefined;
  order?: 'asc' | 'desc' | undefined;
}
