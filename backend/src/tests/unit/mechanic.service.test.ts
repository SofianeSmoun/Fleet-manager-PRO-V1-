/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/explicit-function-return-type */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GarageStatus, Specialty } from '@prisma/client';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const { mockGarage } = vi.hoisted(() => {
  const mockGarage = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
  };
  return { mockGarage };
});

vi.mock('../../lib/prisma', () => ({
  prisma: {
    garage: mockGarage,
  },
}));

import * as mechanicService from '../../services/mechanicService';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeGarageWithMaintenances(
  activeCount: number,
  overrides: Record<string, unknown> = {},
) {
  const maintenances = Array.from({ length: activeCount }, (_, i) => ({
    id: `m-${String(i + 1)}`,
    nature: `Intervention ${String(i + 1)}`,
    statut: i % 2 === 0 ? 'EN_ATTENTE' : 'EN_COURS',
    vehicle: {
      immatriculation: `16·${String(1000 + i)}·ALG`,
      marque: 'Fiat',
      modele: 'Ducato',
    },
  }));

  return {
    id: 'g-1',
    nom: 'Auto Service Belcourt',
    adresse: '12 Rue Belouizdad',
    ville: 'Alger',
    telephone: '+213 21 67 45 20',
    email: 'contact@belcourt.dz',
    specialite: Specialty.MECANIQUE_GENERALE,
    statut: GarageStatus.DISPONIBLE,
    notes: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    maintenances,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('mechanicService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMechanicsWithWorkload', () => {
    it('returns mechanics with active maintenance count', async () => {
      const garages = [
        makeGarageWithMaintenances(3),
        makeGarageWithMaintenances(0, { id: 'g-2', nom: 'Garage 2' }),
      ];
      mockGarage.findMany.mockResolvedValue(garages);
      mockGarage.count.mockResolvedValue(2);

      const result = await mechanicService.getMechanicsWithWorkload({
        page: 1,
        limit: 15,
        sortBy: 'nom',
        order: 'asc',
      });

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toHaveProperty('activeMaintenances', 3);
      expect(result.data[0]).toHaveProperty('maintenances');
      expect((result.data[0] as { maintenances: unknown[] }).maintenances).toHaveLength(3);
      expect(result.data[1]).toHaveProperty('activeMaintenances', 0);
    });

    it('filters by specialite', async () => {
      mockGarage.findMany.mockResolvedValue([]);
      mockGarage.count.mockResolvedValue(0);

      await mechanicService.getMechanicsWithWorkload({
        page: 1,
        limit: 15,
        sortBy: 'nom',
        order: 'asc',
        specialite: Specialty.CARROSSERIE,
      });

      expect(mockGarage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ specialite: Specialty.CARROSSERIE }),
        }),
      );
    });

    it('returns correct pagination', async () => {
      mockGarage.findMany.mockResolvedValue([]);
      mockGarage.count.mockResolvedValue(25);

      const result = await mechanicService.getMechanicsWithWorkload({
        page: 2,
        limit: 10,
        sortBy: 'nom',
        order: 'asc',
      });

      expect(result.totalPages).toBe(3);
      expect(result.page).toBe(2);
    });
  });

  describe('getWorkload', () => {
    it('returns mechanic with active interventions', async () => {
      const garage = makeGarageWithMaintenances(2);
      mockGarage.findFirst.mockResolvedValue(garage);

      const result = await mechanicService.getWorkload('g-1');

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('activeMaintenances', 2);
      expect(result).toHaveProperty('maintenances');
      const maintenances = (result as { maintenances: { vehicle: { immatriculation: string } }[] }).maintenances;
      expect(maintenances).toHaveLength(2);
      expect(maintenances[0]).toHaveProperty('vehicle');
      expect((maintenances[0] as { vehicle: { immatriculation: string } }).vehicle.immatriculation).toMatch(/ALG$/);
    });

    it('returns null when not found', async () => {
      mockGarage.findFirst.mockResolvedValue(null);

      const result = await mechanicService.getWorkload('nonexistent');
      expect(result).toBeNull();
    });

    it('returns null for undefined id', async () => {
      const result = await mechanicService.getWorkload(undefined);
      expect(result).toBeNull();
    });
  });
});
