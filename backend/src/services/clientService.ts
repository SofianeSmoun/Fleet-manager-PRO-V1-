import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type { CreateClientInput, UpdateClientInput, ClientFilters } from '../schemas/client.schema';

function makeError(message: string, statusCode: number): Error {
  return Object.assign(new Error(message), { statusCode });
}

export async function getClients(filters: ClientFilters): Promise<{
  data: (Prisma.ClientGetPayload<object> & { _count: { vehicles: number } })[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const { page, limit, sortBy, order, wilaya, secteur, q } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.ClientWhereInput = { deletedAt: null };
  if (wilaya) where.wilaya = wilaya;
  if (secteur) where.secteur = secteur;
  if (q) {
    where.OR = [
      { nom: { contains: q, mode: 'insensitive' } },
      { contactNom: { contains: q, mode: 'insensitive' } },
      { contactEmail: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.client.findMany({
      where,
      include: {
        _count: {
          select: { vehicles: { where: { deletedAt: null } } },
        },
      },
      orderBy: { [sortBy]: order },
      skip,
      take: limit,
    }),
    prisma.client.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getClientById(id: string | undefined): Promise<Prisma.ClientGetPayload<object> | null> {
  if (!id) return null;
  return prisma.client.findFirst({
    where: { id, deletedAt: null },
  });
}

export async function createClient(data: CreateClientInput): Promise<Prisma.ClientGetPayload<object>> {
  const createData: Prisma.ClientCreateInput = {
    nom: data.nom,
    secteur: data.secteur,
    contactNom: data.contactNom,
    contactEmail: data.contactEmail,
    contactTel: data.contactTel,
    couleur: data.couleur,
  };
  if (data.adresse !== undefined) createData.adresse = data.adresse;
  if (data.wilaya !== undefined) createData.wilaya = data.wilaya;
  if (data.notes !== undefined) createData.notes = data.notes;

  return prisma.client.create({ data: createData });
}

export async function updateClient(
  id: string | undefined,
  data: UpdateClientInput,
): Promise<Prisma.ClientGetPayload<object>> {
  if (!id) throw makeError('ID requis', 400);

  const client = await prisma.client.findFirst({ where: { id, deletedAt: null } });
  if (!client) throw makeError('Client introuvable', 404);

  const updateData: Prisma.ClientUpdateInput = {};
  if (data.nom !== undefined) updateData.nom = data.nom;
  if (data.secteur !== undefined) updateData.secteur = data.secteur;
  if (data.adresse !== undefined) updateData.adresse = data.adresse;
  if (data.wilaya !== undefined) updateData.wilaya = data.wilaya;
  if (data.contactNom !== undefined) updateData.contactNom = data.contactNom;
  if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail;
  if (data.contactTel !== undefined) updateData.contactTel = data.contactTel;
  if (data.couleur !== undefined) updateData.couleur = data.couleur;
  if (data.notes !== undefined) updateData.notes = data.notes;

  return prisma.client.update({ where: { id }, data: updateData });
}

export async function softDeleteClient(id: string | undefined): Promise<void> {
  if (!id) throw makeError('ID requis', 400);

  const client = await prisma.client.findFirst({ where: { id, deletedAt: null } });
  if (!client) throw makeError('Client introuvable', 404);

  // Block deletion if active vehicles
  const activeVehicles = await prisma.vehicle.count({
    where: { clientId: id, deletedAt: null },
  });
  if (activeVehicles > 0) {
    throw makeError('Suppression impossible : véhicules actifs liés à ce client', 400);
  }

  await prisma.client.update({ where: { id }, data: { deletedAt: new Date() } });
}
