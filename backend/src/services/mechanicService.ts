import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type { GarageFilters } from '../schemas/garage.schema';

interface MechanicWithWorkload {
  id: string;
  nom: string;
  adresse: string;
  ville: string;
  telephone: string;
  email: string | null;
  specialite: string | null;
  statut: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  activeMaintenances: number;
  maintenances: {
    id: string;
    nature: string;
    statut: string;
    vehicle: { immatriculation: string; marque: string; modele: string };
  }[];
}

export async function getMechanicsWithWorkload(filters: GarageFilters): Promise<{
  data: MechanicWithWorkload[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
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

  const [garages, total] = await Promise.all([
    prisma.garage.findMany({
      where,
      include: {
        maintenances: {
          where: { statut: { in: ['EN_ATTENTE', 'EN_COURS'] } },
          select: {
            id: true,
            nature: true,
            statut: true,
            vehicle: { select: { immatriculation: true, marque: true, modele: true } },
          },
        },
      },
      orderBy: { [sortBy]: order },
      skip,
      take: limit,
    }),
    prisma.garage.count({ where }),
  ]);

  const data: MechanicWithWorkload[] = garages.map((g) => ({
    id: g.id,
    nom: g.nom,
    adresse: g.adresse,
    ville: g.ville,
    telephone: g.telephone,
    email: g.email,
    specialite: g.specialite,
    statut: g.statut,
    notes: g.notes,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
    activeMaintenances: g.maintenances.length,
    maintenances: g.maintenances,
  }));

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getWorkload(
  id: string | undefined,
): Promise<MechanicWithWorkload | null> {
  if (!id) return null;
  const garage = await prisma.garage.findFirst({
    where: { id, deletedAt: null },
    include: {
      maintenances: {
        where: { statut: { in: ['EN_ATTENTE', 'EN_COURS'] } },
        select: {
          id: true,
          nature: true,
          statut: true,
          vehicle: { select: { immatriculation: true, marque: true, modele: true } },
        },
      },
    },
  });
  if (!garage) return null;

  return {
    id: garage.id,
    nom: garage.nom,
    adresse: garage.adresse,
    ville: garage.ville,
    telephone: garage.telephone,
    email: garage.email,
    specialite: garage.specialite,
    statut: garage.statut,
    notes: garage.notes,
    createdAt: garage.createdAt,
    updatedAt: garage.updatedAt,
    activeMaintenances: garage.maintenances.length,
    maintenances: garage.maintenances,
  };
}
