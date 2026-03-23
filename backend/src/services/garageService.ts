import type { Prisma, MaintenanceStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type { CreateGarageInput, UpdateGarageInput, GarageFilters } from '../schemas/garage.schema';

const ACTIVE_STATUSES: MaintenanceStatus[] = ['EN_ATTENTE', 'EN_COURS'];

const garageInclude = {
  _count: {
    select: {
      maintenances: {
        where: { statut: { in: ACTIVE_STATUSES } },
      },
    },
  },
  maintenances: {
    where: { statut: { in: ACTIVE_STATUSES } },
    select: {
      id: true,
      nature: true,
      statut: true,
      vehicle: { select: { immatriculation: true, marque: true, modele: true } },
    },
  },
} as const;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function getGarages(filters: GarageFilters) {
  const { page, limit, sortBy, order, statut, specialite, q } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.GarageWhereInput = { deletedAt: null };
  if (statut) where.statut = statut;
  if (specialite) where.specialite = specialite;
  if (q) {
    where.OR = [
      { nom: { contains: q, mode: 'insensitive' } },
      { ville: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.garage.findMany({
      where,
      include: garageInclude,
      orderBy: { [sortBy]: order },
      skip,
      take: limit,
    }),
    prisma.garage.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function getGarageById(id: string | undefined) {
  if (!id) return null;
  return prisma.garage.findFirst({
    where: { id, deletedAt: null },
    include: garageInclude,
  });
}

export async function createGarage(
  data: CreateGarageInput,
): Promise<Prisma.GarageGetPayload<object>> {
  const createData: Prisma.GarageCreateInput = {
    nom: data.nom,
    adresse: data.adresse,
    ville: data.ville,
    telephone: data.telephone,
  };
  if (data.wilaya !== undefined) createData.wilaya = data.wilaya;
  if (data.email !== undefined) createData.email = data.email;
  if (data.specialite !== undefined) createData.specialite = data.specialite;
  if (data.notes !== undefined) createData.notes = data.notes;

  return prisma.garage.create({ data: createData });
}

export async function updateGarage(
  id: string | undefined,
  data: UpdateGarageInput,
): Promise<Prisma.GarageGetPayload<object>> {
  if (!id) throw Object.assign(new Error('ID requis'), { statusCode: 400 });

  const garage = await prisma.garage.findFirst({ where: { id, deletedAt: null } });
  if (!garage) throw Object.assign(new Error('Garage introuvable'), { statusCode: 404 });

  const updateData: Prisma.GarageUpdateInput = {};
  if (data.nom !== undefined) updateData.nom = data.nom;
  if (data.adresse !== undefined) updateData.adresse = data.adresse;
  if (data.ville !== undefined) updateData.ville = data.ville;
  if (data.wilaya !== undefined) updateData.wilaya = data.wilaya;
  if (data.telephone !== undefined) updateData.telephone = data.telephone;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.specialite !== undefined) updateData.specialite = data.specialite;
  if (data.statut !== undefined) updateData.statut = data.statut;
  if (data.notes !== undefined) updateData.notes = data.notes;

  return prisma.garage.update({ where: { id }, data: updateData });
}

export async function softDeleteGarage(id: string | undefined): Promise<void> {
  if (!id) throw Object.assign(new Error('ID requis'), { statusCode: 400 });

  const garage = await prisma.garage.findFirst({ where: { id, deletedAt: null } });
  if (!garage) throw Object.assign(new Error('Garage introuvable'), { statusCode: 404 });

  // Block deletion if active maintenances
  const activeMaintenances = await prisma.maintenance.count({
    where: { garageId: id, statut: { in: ACTIVE_STATUSES } },
  });
  if (activeMaintenances > 0) {
    throw Object.assign(
      new Error('Suppression impossible : interventions actives liées à ce garage'),
      { statusCode: 400 },
    );
  }

  await prisma.garage.update({ where: { id }, data: { deletedAt: new Date() } });
}
