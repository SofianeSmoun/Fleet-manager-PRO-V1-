/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/explicit-function-return-type */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Role, VehicleStatus } from '@prisma/client';

const {
  mockVehicleFindFirst,
  mockClientFindFirst,
  mockRentalCreate,
  mockRentalFindUnique,
  mockRentalFindMany,
  mockRentalCount,
  mockRentalUpdate,
  mockVehicleUpdate,
  mockChangeVehicleStatus,
} = vi.hoisted(() => ({
  mockVehicleFindFirst: vi.fn(),
  mockClientFindFirst: vi.fn(),
  mockRentalCreate: vi.fn(),
  mockRentalFindUnique: vi.fn(),
  mockRentalFindMany: vi.fn(),
  mockRentalCount: vi.fn(),
  mockRentalUpdate: vi.fn(),
  mockVehicleUpdate: vi.fn(),
  mockChangeVehicleStatus: vi.fn(),
}));

vi.mock('../../lib/prisma', () => ({
  prisma: {
    vehicle: { findFirst: mockVehicleFindFirst, update: mockVehicleUpdate },
    client: { findFirst: mockClientFindFirst },
    rental: {
      create: mockRentalCreate,
      findUnique: mockRentalFindUnique,
      findMany: mockRentalFindMany,
      count: mockRentalCount,
      update: mockRentalUpdate,
    },
  },
}));

vi.mock('../../services/vehicleService', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  changeVehicleStatus: (...args: unknown[]) => mockChangeVehicleStatus(...args),
}));

import { createRental, closeRental, getRentals, updateRental } from '../../services/rentalService';

function makeVehicle(statut: VehicleStatus) {
  return {
    id: 'v-1',
    immatriculation: '16\u00B72341\u00B7ALG',
    marque: 'Fiat',
    modele: 'Ducato',
    statut,
    deletedAt: null,
  };
}

function makeRental(statut: string, overrides: Record<string, unknown> = {}) {
  return {
    id: 'r-1',
    vehicleId: 'v-1',
    clientId: 'c-1',
    dateDebut: new Date('2026-01-01'),
    dateFinPrevue: new Date('2026-06-01'),
    dateFinReelle: null,
    statut,
    montantMensuel: null,
    devise: 'DA',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    vehicle: { immatriculation: '16\u00B72341\u00B7ALG', marque: 'Fiat', modele: 'Ducato' },
    client: { nom: 'Cosider', couleur: '#1D6FA4' },
    ...overrides,
  };
}

describe('createRental', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChangeVehicleStatus.mockResolvedValue(makeVehicle(VehicleStatus.LOUE));
  });

  it('vehicle DISPONIBLE + valid dates → rental created + vehicle → LOUE', async () => {
    mockVehicleFindFirst.mockResolvedValue(makeVehicle(VehicleStatus.DISPONIBLE));
    mockClientFindFirst.mockResolvedValue({ id: 'c-1', nom: 'Cosider', deletedAt: null });
    const created = { id: 'r-new', vehicleId: 'v-1', clientId: 'c-1', statut: 'EN_COURS' };
    mockRentalCreate.mockResolvedValue(created);

    const result = await createRental(
      { vehicleId: 'v-1', clientId: 'c-1', dateDebut: '2026-01-01T00:00:00.000Z', dateFinPrevue: '2026-06-01T00:00:00.000Z' },
      'u-1',
      Role.GESTIONNAIRE,
    );

    expect(result).toEqual(created);
    expect(mockRentalCreate).toHaveBeenCalledOnce();
    expect(mockChangeVehicleStatus).toHaveBeenCalledWith('v-1', 'LOUE', expect.any(String), 'u-1', Role.GESTIONNAIRE);
  });

  it('vehicle LOUE → AppError 400', async () => {
    mockVehicleFindFirst.mockResolvedValue(makeVehicle(VehicleStatus.LOUE));
    await expect(
      createRental(
        { vehicleId: 'v-1', clientId: 'c-1', dateDebut: '2026-01-01T00:00:00.000Z', dateFinPrevue: '2026-06-01T00:00:00.000Z' },
        'u-1',
        Role.GESTIONNAIRE,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('vehicle MAINTENANCE → AppError 400', async () => {
    mockVehicleFindFirst.mockResolvedValue(makeVehicle(VehicleStatus.MAINTENANCE));
    await expect(
      createRental(
        { vehicleId: 'v-1', clientId: 'c-1', dateDebut: '2026-01-01T00:00:00.000Z', dateFinPrevue: '2026-06-01T00:00:00.000Z' },
        'u-1',
        Role.GESTIONNAIRE,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('vehicleId not found → AppError 404', async () => {
    mockVehicleFindFirst.mockResolvedValue(null);
    await expect(
      createRental(
        { vehicleId: 'unknown', clientId: 'c-1', dateDebut: '2026-01-01T00:00:00.000Z', dateFinPrevue: '2026-06-01T00:00:00.000Z' },
        'u-1',
        Role.GESTIONNAIRE,
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('clientId not found → AppError 404', async () => {
    mockVehicleFindFirst.mockResolvedValue(makeVehicle(VehicleStatus.DISPONIBLE));
    mockClientFindFirst.mockResolvedValue(null);
    await expect(
      createRental(
        { vehicleId: 'v-1', clientId: 'unknown', dateDebut: '2026-01-01T00:00:00.000Z', dateFinPrevue: '2026-06-01T00:00:00.000Z' },
        'u-1',
        Role.GESTIONNAIRE,
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('closeRental', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChangeVehicleStatus.mockResolvedValue(makeVehicle(VehicleStatus.DISPONIBLE));
  });

  it('rental EN_COURS → TERMINEE + vehicle → DISPONIBLE', async () => {
    mockRentalFindUnique.mockResolvedValue(makeRental('EN_COURS'));
    const updated = makeRental('TERMINEE', { dateFinReelle: new Date('2026-03-15') });
    mockRentalUpdate.mockResolvedValue(updated);

    const result = await closeRental(
      'r-1',
      { dateFinReelle: '2026-03-15T00:00:00.000Z' },
      'u-1',
      Role.GESTIONNAIRE,
    );

    expect(result.statut).toBe('TERMINEE');
    expect(mockChangeVehicleStatus).toHaveBeenCalledWith('v-1', 'DISPONIBLE', expect.any(String), 'u-1', Role.GESTIONNAIRE);
  });

  it('rental TERMINEE → AppError 400', async () => {
    mockRentalFindUnique.mockResolvedValue(makeRental('TERMINEE'));
    await expect(
      closeRental('r-1', { dateFinReelle: '2026-03-15T00:00:00.000Z' }, 'u-1', Role.GESTIONNAIRE),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rental ANNULEE → AppError 400', async () => {
    mockRentalFindUnique.mockResolvedValue(makeRental('ANNULEE'));
    await expect(
      closeRental('r-1', { dateFinReelle: '2026-03-15T00:00:00.000Z' }, 'u-1', Role.GESTIONNAIRE),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rentalId not found → AppError 404', async () => {
    mockRentalFindUnique.mockResolvedValue(null);
    await expect(
      closeRental('unknown', { dateFinReelle: '2026-03-15T00:00:00.000Z' }, 'u-1', Role.GESTIONNAIRE),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('getRentals', () => {
  beforeEach(() => vi.clearAllMocks());

  it('no filters → returns paginated list', async () => {
    const rentals = [makeRental('EN_COURS'), makeRental('TERMINEE', { id: 'r-2' })];
    mockRentalFindMany.mockResolvedValue(rentals);
    mockRentalCount.mockResolvedValue(2);

    const result = await getRentals({ page: 1, limit: 15, sortBy: 'dateDebut', order: 'desc' });

    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it('filter statut=EN_COURS → only EN_COURS', async () => {
    mockRentalFindMany.mockResolvedValue([makeRental('EN_COURS')]);
    mockRentalCount.mockResolvedValue(1);

    await getRentals({ statut: 'EN_COURS', page: 1, limit: 15, sortBy: 'dateDebut', order: 'desc' });

    expect(mockRentalFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ statut: 'EN_COURS' }),
      }),
    );
  });

  it('dateFinPrevue in past + EN_COURS → computed EN_RETARD', async () => {
    const overdue = makeRental('EN_COURS', { dateFinPrevue: new Date('2025-01-01') });
    mockRentalFindMany.mockResolvedValue([overdue]);
    mockRentalCount.mockResolvedValue(1);

    const result = await getRentals({ page: 1, limit: 15, sortBy: 'dateDebut', order: 'desc' });

    expect(result.data[0]?.statut).toBe('EN_RETARD');
  });
});

describe('updateRental', () => {
  beforeEach(() => vi.clearAllMocks());

  it('valid dateFinPrevue → update OK', async () => {
    mockRentalFindUnique.mockResolvedValue(makeRental('EN_COURS'));
    const updated = makeRental('EN_COURS', { dateFinPrevue: new Date('2026-12-01') });
    mockRentalUpdate.mockResolvedValue(updated);

    const result = await updateRental('r-1', { dateFinPrevue: '2026-12-01T00:00:00.000Z' });

    expect(mockRentalUpdate).toHaveBeenCalledOnce();
    expect(result).toEqual(updated);
  });

  it('notes only → update OK', async () => {
    mockRentalFindUnique.mockResolvedValue(makeRental('EN_COURS'));
    const updated = makeRental('EN_COURS', { notes: 'test' });
    mockRentalUpdate.mockResolvedValue(updated);

    const result = await updateRental('r-1', { notes: 'test' });

    expect(result).toEqual(updated);
  });

  it('rentalId not found → AppError 404', async () => {
    mockRentalFindUnique.mockResolvedValue(null);
    await expect(updateRental('unknown', { notes: 'test' })).rejects.toMatchObject({ statusCode: 404 });
  });
});
