/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/explicit-function-return-type */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GarageStatus, Specialty } from '@prisma/client';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const { mockGarage, mockMaintenance } = vi.hoisted(() => {
  const mockGarage = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  const mockMaintenance = {
    count: vi.fn(),
  };
  return { mockGarage, mockMaintenance };
});

vi.mock('../../lib/prisma', () => ({
  prisma: {
    garage: mockGarage,
    maintenance: mockMaintenance,
  },
}));

import * as garageService from '../../services/garageService';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeGarage(overrides: Record<string, unknown> = {}) {
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
    _count: { maintenances: 0 },
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('garageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getGarages', () => {
    it('returns paginated garages', async () => {
      const garages = [makeGarage(), makeGarage({ id: 'g-2', nom: 'Garage 2' })];
      mockGarage.findMany.mockResolvedValue(garages);
      mockGarage.count.mockResolvedValue(2);

      const result = await garageService.getGarages({
        page: 1,
        limit: 15,
        sortBy: 'nom',
        order: 'asc',
      });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.totalPages).toBe(1);
    });

    it('filters by statut', async () => {
      mockGarage.findMany.mockResolvedValue([]);
      mockGarage.count.mockResolvedValue(0);

      await garageService.getGarages({
        page: 1,
        limit: 15,
        sortBy: 'nom',
        order: 'asc',
        statut: GarageStatus.OCCUPE,
      });

      expect(mockGarage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ statut: GarageStatus.OCCUPE }),
        }),
      );
    });
  });

  describe('getGarageById', () => {
    it('returns garage when found', async () => {
      const garage = makeGarage();
      mockGarage.findFirst.mockResolvedValue(garage);

      const result = await garageService.getGarageById('g-1');
      expect(result).toEqual(garage);
    });

    it('returns null when not found', async () => {
      mockGarage.findFirst.mockResolvedValue(null);

      const result = await garageService.getGarageById('nonexistent');
      expect(result).toBeNull();
    });

    it('returns null when id is undefined', async () => {
      const result = await garageService.getGarageById(undefined);
      expect(result).toBeNull();
    });
  });

  describe('createGarage', () => {
    it('creates garage with required fields', async () => {
      const garage = makeGarage();
      mockGarage.create.mockResolvedValue(garage);

      const result = await garageService.createGarage({
        nom: 'Auto Service Belcourt',
        adresse: '12 Rue Belouizdad',
        ville: 'Alger',
        telephone: '+213 21 67 45 20',
      });

      expect(result.nom).toBe('Auto Service Belcourt');
      expect(mockGarage.create).toHaveBeenCalledOnce();
    });
  });

  describe('updateGarage', () => {
    it('updates garage fields', async () => {
      mockGarage.findFirst.mockResolvedValue(makeGarage());
      const updated = makeGarage({ nom: 'Updated Name' });
      mockGarage.update.mockResolvedValue(updated);

      const result = await garageService.updateGarage('g-1', { nom: 'Updated Name' });
      expect(result.nom).toBe('Updated Name');
    });

    it('throws 404 when garage not found', async () => {
      mockGarage.findFirst.mockResolvedValue(null);

      await expect(
        garageService.updateGarage('nonexistent', { nom: 'X' }),
      ).rejects.toThrow('Garage introuvable');
    });

    it('throws 400 when id is undefined', async () => {
      await expect(
        garageService.updateGarage(undefined, { nom: 'X' }),
      ).rejects.toThrow('ID requis');
    });
  });

  describe('softDeleteGarage', () => {
    it('sets deletedAt when no active maintenances', async () => {
      mockGarage.findFirst.mockResolvedValue(makeGarage());
      mockMaintenance.count.mockResolvedValue(0);
      mockGarage.update.mockResolvedValue(makeGarage({ deletedAt: new Date() }));

      await garageService.softDeleteGarage('g-1');

      expect(mockGarage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'g-1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });

    it('blocks deletion with active maintenances', async () => {
      mockGarage.findFirst.mockResolvedValue(makeGarage());
      mockMaintenance.count.mockResolvedValue(2);

      await expect(garageService.softDeleteGarage('g-1')).rejects.toThrow(
        'Suppression impossible',
      );
    });

    it('throws 404 when garage not found', async () => {
      mockGarage.findFirst.mockResolvedValue(null);

      await expect(garageService.softDeleteGarage('nonexistent')).rejects.toThrow(
        'Garage introuvable',
      );
    });
  });
});
