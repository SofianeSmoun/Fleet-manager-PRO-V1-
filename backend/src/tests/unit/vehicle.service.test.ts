/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/explicit-function-return-type */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VehicleStatus, Role } from '@prisma/client';

const { mockFindFirst, mockTx } = vi.hoisted(() => {
  const mockTx = {
    statusHistory: { create: vi.fn().mockResolvedValue({ id: 'sh-1' }) },
    rental: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    maintenance: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    vehicle: { update: vi.fn() },
  };
  const mockFindFirst = vi.fn();
  return { mockFindFirst, mockTx };
});

vi.mock('../../lib/prisma', () => ({
  prisma: {
    vehicle: { findFirst: mockFindFirst },
    $transaction: (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx),
  },
}));

import { changeVehicleStatus } from '../../services/vehicleService';

function makeVehicle(statut: VehicleStatus) {
  return {
    id: 'v-1',
    immatriculation: '16\u00B72341\u00B7ALG',
    vin: null,
    marque: 'Fiat',
    modele: 'Ducato',
    annee: 2023,
    km: 50000,
    statut,
    carburant: 'DIESEL' as const,
    couleur: null,
    notes: null,
    clientId: 'c-1',
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('changeVehicleStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTx.vehicle.update.mockImplementation(
      ({ data }: { data: { statut: VehicleStatus } }) =>
        Promise.resolve({ ...makeVehicle(data.statut), statut: data.statut }),
    );
  });

  // ── Valid transitions ──────────────────────────────────────────────

  it('DISPONIBLE → LOUE : creates StatusHistory and updates vehicle', async () => {
    mockFindFirst.mockResolvedValue(makeVehicle(VehicleStatus.DISPONIBLE));
    const result = await changeVehicleStatus('v-1', VehicleStatus.LOUE, 'Location client Cosider', 'u-1', Role.GESTIONNAIRE);
    expect(result.statut).toBe(VehicleStatus.LOUE);
    expect(mockTx.statusHistory.create).toHaveBeenCalledOnce();
    expect(mockTx.statusHistory.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ fromStatus: 'DISPONIBLE', toStatus: 'LOUE', reason: 'Location client Cosider' }),
    }));
  });

  it('DISPONIBLE → MAINTENANCE : creates StatusHistory', async () => {
    mockFindFirst.mockResolvedValue(makeVehicle(VehicleStatus.DISPONIBLE));
    const result = await changeVehicleStatus('v-1', VehicleStatus.MAINTENANCE, 'Révision préventive', 'u-1', Role.GESTIONNAIRE);
    expect(result.statut).toBe(VehicleStatus.MAINTENANCE);
    expect(mockTx.statusHistory.create).toHaveBeenCalledOnce();
  });

  it('DISPONIBLE → HORS_SERVICE (ADMIN) : creates StatusHistory', async () => {
    mockFindFirst.mockResolvedValue(makeVehicle(VehicleStatus.DISPONIBLE));
    const result = await changeVehicleStatus('v-1', VehicleStatus.HORS_SERVICE, 'Véhicule accidenté', 'u-1', Role.ADMIN);
    expect(result.statut).toBe(VehicleStatus.HORS_SERVICE);
    expect(mockTx.statusHistory.create).toHaveBeenCalledOnce();
  });

  it('LOUE → DISPONIBLE : closes active rental + StatusHistory', async () => {
    mockFindFirst.mockResolvedValue(makeVehicle(VehicleStatus.LOUE));
    const result = await changeVehicleStatus('v-1', VehicleStatus.DISPONIBLE, 'Fin de location', 'u-1', Role.GESTIONNAIRE);
    expect(result.statut).toBe(VehicleStatus.DISPONIBLE);
    expect(mockTx.rental.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { vehicleId: 'v-1', statut: 'EN_COURS' },
        data: expect.objectContaining({ statut: 'TERMINEE' }),
      }),
    );
    expect(mockTx.statusHistory.create).toHaveBeenCalledOnce();
  });

  it('LOUE → MAINTENANCE : creates StatusHistory, rental unchanged', async () => {
    mockFindFirst.mockResolvedValue(makeVehicle(VehicleStatus.LOUE));
    const result = await changeVehicleStatus('v-1', VehicleStatus.MAINTENANCE, 'Panne urgente', 'u-1', Role.GESTIONNAIRE);
    expect(result.statut).toBe(VehicleStatus.MAINTENANCE);
    expect(mockTx.rental.updateMany).not.toHaveBeenCalled();
    expect(mockTx.statusHistory.create).toHaveBeenCalledOnce();
  });

  it('MAINTENANCE → DISPONIBLE : closes active maintenance + StatusHistory', async () => {
    mockFindFirst.mockResolvedValue(makeVehicle(VehicleStatus.MAINTENANCE));
    const result = await changeVehicleStatus('v-1', VehicleStatus.DISPONIBLE, 'Réparation terminée', 'u-1', Role.GESTIONNAIRE);
    expect(result.statut).toBe(VehicleStatus.DISPONIBLE);
    expect(mockTx.maintenance.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { vehicleId: 'v-1', statut: { in: ['EN_ATTENTE', 'EN_COURS'] } },
        data: expect.objectContaining({ statut: 'TERMINEE' }),
      }),
    );
    expect(mockTx.statusHistory.create).toHaveBeenCalledOnce();
  });

  it('MAINTENANCE → HORS_SERVICE : creates StatusHistory', async () => {
    mockFindFirst.mockResolvedValue(makeVehicle(VehicleStatus.MAINTENANCE));
    const result = await changeVehicleStatus('v-1', VehicleStatus.HORS_SERVICE, 'Irréparable', 'u-1', Role.GESTIONNAIRE);
    expect(result.statut).toBe(VehicleStatus.HORS_SERVICE);
    expect(mockTx.statusHistory.create).toHaveBeenCalledOnce();
  });

  it('HORS_SERVICE → DISPONIBLE (ADMIN) : creates StatusHistory', async () => {
    mockFindFirst.mockResolvedValue(makeVehicle(VehicleStatus.HORS_SERVICE));
    const result = await changeVehicleStatus('v-1', VehicleStatus.DISPONIBLE, 'Véhicule réhabilité', 'u-1', Role.ADMIN);
    expect(result.statut).toBe(VehicleStatus.DISPONIBLE);
    expect(mockTx.statusHistory.create).toHaveBeenCalledOnce();
  });

  // ── Invalid transitions → 400 ─────────────────────────────────────

  it('DISPONIBLE → DISPONIBLE → 400', async () => {
    mockFindFirst.mockResolvedValue(makeVehicle(VehicleStatus.DISPONIBLE));
    await expect(changeVehicleStatus('v-1', VehicleStatus.DISPONIBLE, 'test', 'u-1', Role.ADMIN))
      .rejects.toMatchObject({ message: expect.stringContaining('Transition invalide'), statusCode: 400 });
  });

  it('LOUE → LOUE → 400', async () => {
    mockFindFirst.mockResolvedValue(makeVehicle(VehicleStatus.LOUE));
    await expect(changeVehicleStatus('v-1', VehicleStatus.LOUE, 'test', 'u-1', Role.ADMIN))
      .rejects.toMatchObject({ message: expect.stringContaining('Transition invalide'), statusCode: 400 });
  });

  it('MAINTENANCE → LOUE → 400', async () => {
    mockFindFirst.mockResolvedValue(makeVehicle(VehicleStatus.MAINTENANCE));
    await expect(changeVehicleStatus('v-1', VehicleStatus.LOUE, 'test', 'u-1', Role.ADMIN))
      .rejects.toMatchObject({ message: expect.stringContaining('Transition invalide'), statusCode: 400 });
  });

  it('MAINTENANCE → MAINTENANCE → 400', async () => {
    mockFindFirst.mockResolvedValue(makeVehicle(VehicleStatus.MAINTENANCE));
    await expect(changeVehicleStatus('v-1', VehicleStatus.MAINTENANCE, 'test', 'u-1', Role.ADMIN))
      .rejects.toMatchObject({ message: expect.stringContaining('Transition invalide'), statusCode: 400 });
  });

  it('HORS_SERVICE → LOUE → 400', async () => {
    mockFindFirst.mockResolvedValue(makeVehicle(VehicleStatus.HORS_SERVICE));
    await expect(changeVehicleStatus('v-1', VehicleStatus.LOUE, 'test', 'u-1', Role.ADMIN))
      .rejects.toMatchObject({ message: expect.stringContaining('Transition invalide'), statusCode: 400 });
  });

  it('HORS_SERVICE → MAINTENANCE → 400', async () => {
    mockFindFirst.mockResolvedValue(makeVehicle(VehicleStatus.HORS_SERVICE));
    await expect(changeVehicleStatus('v-1', VehicleStatus.MAINTENANCE, 'test', 'u-1', Role.ADMIN))
      .rejects.toMatchObject({ message: expect.stringContaining('Transition invalide'), statusCode: 400 });
  });

  // ── Business rules ─────────────────────────────────────────────────

  it('empty comment → 422', async () => {
    await expect(changeVehicleStatus('v-1', VehicleStatus.LOUE, '  ', 'u-1', Role.ADMIN))
      .rejects.toMatchObject({ statusCode: 422 });
  });

  it('HORS_SERVICE → DISPONIBLE by GESTIONNAIRE → 403', async () => {
    mockFindFirst.mockResolvedValue(makeVehicle(VehicleStatus.HORS_SERVICE));
    await expect(changeVehicleStatus('v-1', VehicleStatus.DISPONIBLE, 'Réhabilitation', 'u-1', Role.GESTIONNAIRE))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  it('unknown vehicleId → 404', async () => {
    mockFindFirst.mockResolvedValue(null);
    await expect(changeVehicleStatus('unknown', VehicleStatus.LOUE, 'test', 'u-1', Role.ADMIN))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('every valid transition creates a StatusHistory entry', async () => {
    mockFindFirst.mockResolvedValue(makeVehicle(VehicleStatus.DISPONIBLE));
    await changeVehicleStatus('v-1', VehicleStatus.LOUE, 'Check SH', 'u-1', Role.GESTIONNAIRE);
    expect(mockTx.statusHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          vehicleId: 'v-1',
          changedById: 'u-1',
        }),
      }),
    );
  });
});
