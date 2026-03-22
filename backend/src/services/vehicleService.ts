import type { Prisma, Vehicle, VehicleStatus } from '@prisma/client';
import { Role } from '@prisma/client';
import ExcelJS from 'exceljs';
import { prisma } from '../lib/prisma';
import type { CreateVehicleInput, UpdateVehicleInput, VehicleFilters } from '../schemas/vehicle.schema';

// ─── Automate d'états véhicule ────────────────────────────────────────────────
// Map exhaustive : clé = "FROM→TO", valeur = side-effect handler (ou null = simple log)
// DEV-8 : LOUE→HORS_SERVICE ajouté (cancel_rental).

const ALLOWED_TRANSITIONS: Record<string, 'simple' | 'admin_only' | 'create_rental' | 'create_maintenance' | 'close_rental' | 'close_maintenance' | 'cancel_rental'> = {
  'DISPONIBLE→LOUE': 'create_rental',
  'DISPONIBLE→MAINTENANCE': 'create_maintenance',
  'DISPONIBLE→HORS_SERVICE': 'admin_only',
  'LOUE→DISPONIBLE': 'close_rental',
  'LOUE→MAINTENANCE': 'simple',
  'LOUE→HORS_SERVICE': 'cancel_rental',
  'MAINTENANCE→DISPONIBLE': 'close_maintenance',
  'MAINTENANCE→HORS_SERVICE': 'simple',
  'HORS_SERVICE→DISPONIBLE': 'admin_only',
};

function makeError(message: string, statusCode: number): Error {
  return Object.assign(new Error(message), { statusCode });
}

export async function changeVehicleStatus(
  vehicleId: string,
  toStatus: VehicleStatus,
  comment: string,
  userId: string,
  userRole: Role,
): Promise<Vehicle> {
  if (!comment.trim()) {
    throw makeError('Le commentaire est obligatoire', 422);
  }

  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, deletedAt: null } });
  if (!vehicle) {
    throw makeError('Véhicule introuvable', 404);
  }

  const transitionKey = `${vehicle.statut}→${toStatus}`;
  const effect = ALLOWED_TRANSITIONS[transitionKey];

  if (!effect) {
    throw makeError(`Transition invalide : ${vehicle.statut} → ${toStatus}`, 400);
  }

  if ((effect === 'admin_only' || effect === 'cancel_rental') && userRole !== Role.ADMIN) {
    throw makeError('Seul un ADMIN peut effectuer cette transition', 403);
  }

  return prisma.$transaction(async (tx) => {
    // Create StatusHistory
    await tx.statusHistory.create({
      data: {
        vehicleId,
        fromStatus: vehicle.statut,
        toStatus,
        reason: comment,
        changedById: userId,
      },
    });

    // Side effects
    if (effect === 'close_rental') {
      // Close active rental
      await tx.rental.updateMany({
        where: { vehicleId, statut: 'EN_COURS' },
        data: { statut: 'TERMINEE', dateFinReelle: new Date() },
      });
    } else if (effect === 'cancel_rental') {
      // Cancel active rental (accident/panne grave)
      await tx.rental.updateMany({
        where: { vehicleId, statut: 'EN_COURS' },
        data: { statut: 'ANNULEE', dateFinReelle: new Date() },
      });
    } else if (effect === 'close_maintenance') {
      // Close active maintenance
      await tx.maintenance.updateMany({
        where: { vehicleId, statut: { in: ['EN_ATTENTE', 'EN_COURS'] } },
        data: { statut: 'TERMINEE', dateSortieReelle: new Date() },
      });
    }
    // NOTE: create_rental and create_maintenance side effects are NOT handled here.
    // DEV-10 (rentalService) and DEV-4 (maintenanceService) will handle creation
    // of Rental/Maintenance records and call changeVehicleStatus for the transition.
    // The transition itself only logs the StatusHistory.

    // Update vehicle status
    return tx.vehicle.update({
      where: { id: vehicleId },
      data: { statut: toStatus },
    });
  });
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function getVehicles(filters: VehicleFilters) {
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
      include: {
        client: { select: { nom: true, couleur: true, wilaya: true } },
        rentals: {
          where: { statut: 'EN_COURS' },
          select: { dateDebut: true, dateFinPrevue: true },
          take: 1,
          orderBy: { dateDebut: 'desc' },
        },
        maintenances: {
          where: { statut: { in: ['EN_ATTENTE', 'EN_COURS'] } },
          select: { nature: true, statut: true },
          take: 1,
          orderBy: { dateEntree: 'desc' },
        },
      },
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

export async function exportVehicleHistoryToExcel(
  id: string,
  immatriculation: string,
): Promise<Buffer> {
  const history = await prisma.statusHistory.findMany({
    where: { vehicleId: id },
    include: { changedBy: { select: { firstName: true, lastName: true } } },
    orderBy: { changedAt: 'desc' },
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Historique statuts');

  sheet.columns = [
    { header: 'Date', key: 'date', width: 20 },
    { header: 'De', key: 'from', width: 18 },
    { header: 'Vers', key: 'to', width: 18 },
    { header: 'Commentaire', key: 'reason', width: 40 },
    { header: 'Par', key: 'by', width: 22 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1B2A' } };

  for (let i = 0; i < history.length; i++) {
    const h = history[i];
    if (!h) continue;
    const row = sheet.addRow({
      date: new Date(h.changedAt).toLocaleString('fr-FR'),
      from: h.fromStatus || '—',
      to: h.toStatus,
      reason: h.reason,
      by: `${h.changedBy.firstName} ${h.changedBy.lastName}`,
    });
    if (i % 2 === 1) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6F9' } };
    }
  }

  // Auto-set filename hint via immatriculation
  void immatriculation;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

const STATUS_COLORS: Record<string, string> = {
  DISPONIBLE: 'FF0E7C59',
  LOUE: 'FF1D6FA4',
  MAINTENANCE: 'FFB45309',
  HORS_SERVICE: 'FF4A5568',
};

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
    include: { client: { select: { nom: true } } },
    orderBy: { [filters.sortBy]: filters.order },
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Flotte');

  sheet.columns = [
    { header: 'Immatriculation', key: 'immatriculation', width: 18 },
    { header: 'Marque', key: 'marque', width: 15 },
    { header: 'Modèle', key: 'modele', width: 15 },
    { header: 'Année', key: 'annee', width: 10 },
    { header: 'Km', key: 'km', width: 12 },
    { header: 'Statut', key: 'statut', width: 15 },
    { header: 'Client', key: 'client', width: 20 },
    { header: 'Carburant', key: 'carburant', width: 12 },
    { header: 'Couleur', key: 'couleur', width: 12 },
    { header: 'Notes', key: 'notes', width: 25 },
    { header: 'Date création', key: 'createdAt', width: 15 },
  ];

  // Style header — fond #0D1B2A, texte blanc, gras, hauteur 20
  const headerRow = sheet.getRow(1);
  headerRow.height = 20;
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1B2A' } };

  for (let i = 0; i < vehicles.length; i++) {
    const v = vehicles[i];
    if (!v) continue;
    const row = sheet.addRow({
      immatriculation: v.immatriculation,
      marque: v.marque,
      modele: v.modele,
      annee: v.annee,
      km: v.km,
      statut: v.statut,
      client: v.client.nom,
      carburant: v.carburant,
      couleur: v.couleur ?? '',
      notes: v.notes ?? '',
      createdAt: new Date(v.createdAt).toLocaleDateString('fr-FR'),
    });

    // Alternance lignes : blanc / #F4F6F9
    if (i % 2 === 1) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6F9' } };
    }

    // Couleur police statut
    const statusColor = STATUS_COLORS[v.statut];
    if (statusColor) {
      row.getCell('statut').font = { color: { argb: statusColor }, bold: true };
    }
  }

  // Auto-ajustement largeurs (min 10, max 30)
  for (const col of sheet.columns) {
    let maxLen = String(col.header ?? '').length;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? '').length;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.max(10, Math.min(30, maxLen + 2));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
