import type { Prisma } from '@prisma/client';
import ExcelJS from 'exceljs';
import { prisma } from '../lib/prisma';
import type { CreateVehicleInput, UpdateVehicleInput, VehicleFilters } from '../schemas/vehicle.schema';

export async function getVehicles(filters: VehicleFilters): Promise<{
  data: Prisma.VehicleGetPayload<{ include: { client: { select: { nom: true; couleur: true } } } }>[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const where: Prisma.VehicleWhereInput = { deletedAt: null };

  if (filters.statut) where.statut = filters.statut;
  if (filters.clientId) where.clientId = filters.clientId;
  if (filters.marque) where.marque = filters.marque;
  if (filters.q) {
    where.OR = [
      { immatriculation: { contains: filters.q, mode: 'insensitive' } },
      { modele: { contains: filters.q, mode: 'insensitive' } },
      { marque: { contains: filters.q, mode: 'insensitive' } },
      { vin: { contains: filters.q, mode: 'insensitive' } },
    ];
  }

  const skip = (filters.page - 1) * filters.limit;
  const orderBy: Prisma.VehicleOrderByWithRelationInput = {
    [filters.sortBy]: filters.order,
  };

  const [data, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      include: { client: { select: { nom: true, couleur: true } } },
      orderBy,
      skip,
      take: filters.limit,
    }),
    prisma.vehicle.count({ where }),
  ]);

  return {
    data,
    total,
    page: filters.page,
    limit: filters.limit,
    totalPages: Math.ceil(total / filters.limit),
  };
}

export async function getVehicleById(id: string): Promise<Prisma.VehicleGetPayload<{
  include: {
    client: true;
    rentals: true;
    maintenances: true;
    insurances: true;
  };
}> | null> {
  return prisma.vehicle.findFirst({
    where: { id, deletedAt: null },
    include: {
      client: true,
      rentals: { orderBy: { createdAt: 'desc' }, take: 5 },
      maintenances: { orderBy: { createdAt: 'desc' }, take: 5 },
      insurances: { orderBy: [{ statut: 'asc' }, { dateEcheance: 'desc' }] },
    },
  });
}

export async function createVehicle(
  data: CreateVehicleInput,
  userId: string,
): Promise<Prisma.VehicleGetPayload<{ include: { client: { select: { nom: true } } } }>> {
  // Vérifier que le client existe
  const client = await prisma.client.findFirst({
    where: { id: data.clientId, deletedAt: null },
  });
  if (!client) {
    throw Object.assign(new Error('Client introuvable'), { statusCode: 404 });
  }

  return prisma.vehicle.create({
    data: {
      immatriculation: data.immatriculation,
      vin: data.vin ?? null,
      marque: data.marque,
      modele: data.modele,
      annee: data.annee,
      km: data.km,
      carburant: data.carburant,
      couleur: data.couleur ?? null,
      notes: data.notes ?? null,
      clientId: data.clientId,
      statut: 'DISPONIBLE',
      statusHistory: {
        create: {
          fromStatus: '',
          toStatus: 'DISPONIBLE',
          reason: 'Véhicule créé',
          changedById: userId,
        },
      },
    },
    include: { client: { select: { nom: true } } },
  });
}

export async function updateVehicle(
  id: string,
  data: UpdateVehicleInput,
): Promise<Prisma.VehicleGetPayload<{ include: { client: { select: { nom: true } } } }>> {
  const vehicle = await prisma.vehicle.findFirst({ where: { id, deletedAt: null } });
  if (!vehicle) {
    throw Object.assign(new Error('Véhicule introuvable'), { statusCode: 404 });
  }

  if (data.clientId) {
    const client = await prisma.client.findFirst({
      where: { id: data.clientId, deletedAt: null },
    });
    if (!client) {
      throw Object.assign(new Error('Client introuvable'), { statusCode: 404 });
    }
  }

  // Build explicit update payload to satisfy exactOptionalPropertyTypes
  const updateData: Prisma.VehicleUpdateInput = {};
  if (data.immatriculation !== undefined) updateData.immatriculation = data.immatriculation;
  if (data.vin !== undefined) updateData.vin = data.vin;
  if (data.marque !== undefined) updateData.marque = data.marque;
  if (data.modele !== undefined) updateData.modele = data.modele;
  if (data.annee !== undefined) updateData.annee = data.annee;
  if (data.km !== undefined) updateData.km = data.km;
  if (data.carburant !== undefined) updateData.carburant = data.carburant;
  if (data.couleur !== undefined) updateData.couleur = data.couleur;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.clientId !== undefined) updateData.client = { connect: { id: data.clientId } };

  return prisma.vehicle.update({
    where: { id },
    data: updateData,
    include: { client: { select: { nom: true } } },
  });
}

export async function softDeleteVehicle(id: string): Promise<void> {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id, deletedAt: null },
    include: { rentals: { where: { statut: 'EN_COURS' } } },
  });
  if (!vehicle) {
    throw Object.assign(new Error('Véhicule introuvable'), { statusCode: 404 });
  }
  if (vehicle.rentals.length > 0) {
    throw Object.assign(
      new Error('Impossible de supprimer un véhicule avec une location en cours'),
      { statusCode: 400 },
    );
  }

  await prisma.vehicle.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function getVehicleHistory(id: string): Promise<
  Prisma.StatusHistoryGetPayload<{ include: { changedBy: { select: { firstName: true; lastName: true } } } }>[]
> {
  const vehicle = await prisma.vehicle.findFirst({ where: { id, deletedAt: null } });
  if (!vehicle) {
    throw Object.assign(new Error('Véhicule introuvable'), { statusCode: 404 });
  }

  return prisma.statusHistory.findMany({
    where: { vehicleId: id },
    include: { changedBy: { select: { firstName: true, lastName: true } } },
    orderBy: { changedAt: 'desc' },
  });
}

export async function exportVehiclesToExcel(filters: VehicleFilters): Promise<Buffer> {
  // Récupérer tous les véhicules (sans pagination pour l'export)
  const where: Prisma.VehicleWhereInput = { deletedAt: null };
  if (filters.statut) where.statut = filters.statut;
  if (filters.clientId) where.clientId = filters.clientId;
  if (filters.marque) where.marque = filters.marque;
  if (filters.q) {
    where.OR = [
      { immatriculation: { contains: filters.q, mode: 'insensitive' } },
      { modele: { contains: filters.q, mode: 'insensitive' } },
      { marque: { contains: filters.q, mode: 'insensitive' } },
    ];
  }

  const vehicles = await prisma.vehicle.findMany({
    where,
    include: {
      client: { select: { nom: true } },
      maintenances: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { [filters.sortBy]: filters.order },
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Flotte');

  sheet.columns = [
    { header: 'Immatriculation', key: 'immatriculation', width: 18 },
    { header: 'Marque', key: 'marque', width: 15 },
    { header: 'Modèle', key: 'modele', width: 15 },
    { header: 'Année', key: 'annee', width: 8 },
    { header: 'Km', key: 'km', width: 12 },
    { header: 'Statut', key: 'statut', width: 15 },
    { header: 'Client', key: 'client', width: 20 },
    { header: 'Dernière maintenance', key: 'derniereMaintenance', width: 20 },
  ];

  // Style header
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0D1B2A' },
  };
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

  for (const v of vehicles) {
    const lastMaint = v.maintenances[0];
    sheet.addRow({
      immatriculation: v.immatriculation,
      marque: v.marque,
      modele: v.modele,
      annee: v.annee,
      km: v.km,
      statut: v.statut,
      client: v.client.nom,
      derniereMaintenance: lastMaint
        ? new Date(lastMaint.dateEntree).toLocaleDateString('fr-FR')
        : '—',
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
