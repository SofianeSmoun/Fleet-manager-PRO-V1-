import type { Prisma, Rental, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { changeVehicleStatus } from './vehicleService';
import type { CreateRentalInput, CloseRentalInput, UpdateRentalInput, RentalsFilters } from '../schemas/rental.schema';

function makeError(message: string, statusCode: number): Error {
  return Object.assign(new Error(message), { statusCode });
}

interface RentalWithRelations {
  id: string;
  vehicleId: string;
  clientId: string;
  dateDebut: Date;
  dateFinPrevue: Date | null;
  dateFinReelle: Date | null;
  statut: string;
  montantMensuel: number | null;
  devise: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  vehicle: { immatriculation: string; marque: string; modele: string };
  client: { nom: string; couleur: string };
}

function computeRentalStatus(rental: RentalWithRelations): RentalWithRelations {
  // Open contracts (dateFinPrevue null) can never be overdue
  if (rental.statut === 'EN_COURS' && rental.dateFinPrevue && new Date(rental.dateFinPrevue) < new Date()) {
    return { ...rental, statut: 'EN_RETARD' };
  }
  return rental;
}

export async function getRentals(filters: RentalsFilters): Promise<{
  data: RentalWithRelations[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const where: Prisma.RentalWhereInput = {};

  // EN_RETARD is computed dynamically — filter EN_COURS and post-filter
  const filterOverdue = filters.statut === 'EN_RETARD';
  if (filters.statut && !filterOverdue) {
    where.statut = filters.statut;
  }
  if (filterOverdue) {
    where.statut = 'EN_COURS';
    where.dateFinPrevue = { lt: new Date() };
  }

  if (filters.clientId) where.clientId = filters.clientId;
  if (filters.vehicleId) where.vehicleId = filters.vehicleId;
  if (filters.from || filters.to) {
    where.dateDebut = {};
    if (filters.from) where.dateDebut.gte = new Date(filters.from);
    if (filters.to) where.dateDebut.lte = new Date(filters.to);
  }

  const skip = (filters.page - 1) * filters.limit;
  const orderBy: Prisma.RentalOrderByWithRelationInput = {
    [filters.sortBy]: filters.order,
  };

  const [rawData, total] = await Promise.all([
    prisma.rental.findMany({
      where,
      include: {
        vehicle: { select: { immatriculation: true, marque: true, modele: true } },
        client: { select: { nom: true, couleur: true } },
      },
      orderBy,
      skip,
      take: filters.limit,
    }),
    prisma.rental.count({ where }),
  ]);

  const data = rawData.map(computeRentalStatus);

  return {
    data,
    total,
    page: filters.page,
    limit: filters.limit,
    totalPages: Math.ceil(total / filters.limit),
  };
}

export async function getRentalById(id: string): Promise<RentalWithRelations | null> {
  const rental = await prisma.rental.findUnique({
    where: { id },
    include: {
      vehicle: { select: { immatriculation: true, marque: true, modele: true } },
      client: { select: { nom: true, couleur: true } },
    },
  });
  if (!rental) return null;
  return computeRentalStatus(rental);
}

export async function createRental(
  data: CreateRentalInput,
  userId: string,
  userRole: Role,
): Promise<Rental> {
  // Validate vehicle is DISPONIBLE
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: data.vehicleId, deletedAt: null },
  });
  if (!vehicle) {
    throw makeError('Véhicule introuvable', 404);
  }
  if (vehicle.statut !== 'DISPONIBLE') {
    throw makeError(
      `Le véhicule doit être DISPONIBLE pour créer une location (statut actuel : ${vehicle.statut})`,
      400,
    );
  }

  // Validate client exists
  const client = await prisma.client.findFirst({
    where: { id: data.clientId, deletedAt: null },
  });
  if (!client) {
    throw makeError('Client introuvable', 404);
  }

  // Create rental + transition vehicle to LOUE in a transaction
  const rentalData: {
    vehicleId: string;
    clientId: string;
    dateDebut: Date;
    dateFinPrevue?: Date;
    statut: 'EN_COURS';
    notes: string | null;
  } = {
    vehicleId: data.vehicleId,
    clientId: data.clientId,
    dateDebut: new Date(data.dateDebut),
    statut: 'EN_COURS',
    notes: data.notes ?? null,
  };
  if (data.dateFinPrevue !== undefined) {
    rentalData.dateFinPrevue = new Date(data.dateFinPrevue);
  }

  const rental = await prisma.rental.create({
    data: rentalData,
  });

  // Transition vehicle DISPONIBLE → LOUE
  await changeVehicleStatus(
    data.vehicleId,
    'LOUE',
    `Location créée (${rental.id})`,
    userId,
    userRole,
  );

  return rental;
}

export async function closeRental(
  id: string,
  data: CloseRentalInput,
  userId: string,
  userRole: Role,
): Promise<Rental> {
  const rental = await prisma.rental.findUnique({ where: { id } });
  if (!rental) {
    throw makeError('Location introuvable', 404);
  }
  if (rental.statut !== 'EN_COURS') {
    throw makeError(`Impossible de clôturer une location avec le statut ${rental.statut}`, 400);
  }

  // Update rental — build explicit payload for exactOptionalPropertyTypes
  const closeData: Prisma.RentalUpdateInput = {
    statut: 'TERMINEE',
    dateFinReelle: new Date(data.dateFinReelle),
  };
  if (data.notes !== undefined) closeData.notes = data.notes;

  const updated = await prisma.rental.update({
    where: { id },
    data: closeData,
  });

  // Update km if provided
  if (data.kmRetour !== undefined) {
    await prisma.vehicle.update({
      where: { id: rental.vehicleId },
      data: { km: data.kmRetour },
    });
  }

  // Transition vehicle LOUE → DISPONIBLE
  await changeVehicleStatus(
    rental.vehicleId,
    'DISPONIBLE',
    `Location clôturée (${rental.id})`,
    userId,
    userRole,
  );

  return updated;
}

export async function updateRental(id: string, data: UpdateRentalInput): Promise<Rental> {
  const rental = await prisma.rental.findUnique({ where: { id } });
  if (!rental) {
    throw makeError('Location introuvable', 404);
  }

  const updateData: Prisma.RentalUpdateInput = {};
  if (data.dateFinPrevue !== undefined) {
    updateData.dateFinPrevue = data.dateFinPrevue === null ? null : new Date(data.dateFinPrevue);
  }
  if (data.notes !== undefined) updateData.notes = data.notes;

  return prisma.rental.update({
    where: { id },
    data: updateData,
  });
}
