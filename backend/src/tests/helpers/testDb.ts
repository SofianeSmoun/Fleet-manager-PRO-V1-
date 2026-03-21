import { beforeAll, afterAll } from 'vitest';
import type { Express } from 'express';
import { prisma } from '../../lib/prisma';
import bcrypt from 'bcrypt';

/**
 * Seed minimal for integration tests:
 * - 1 ADMIN user
 * - 1 GESTIONNAIRE user
 * - 1 LECTEUR user
 * - 1 Client
 * - 3 Vehicles (DISPONIBLE)
 * - 1 Garage
 */
async function seedMinimal(): Promise<void> {
  const hash = await bcrypt.hash('Admin2026!', 12);
  const gestHash = await bcrypt.hash('Gest2026!', 12);
  const lectHash = await bcrypt.hash('Read2026!', 12);

  await prisma.user.createMany({
    data: [
      {
        email: 'admin@fleetmanager.dz',
        passwordHash: hash,
        firstName: 'Admin',
        lastName: 'Test',
        role: 'ADMIN',
        isActive: true,
      },
      {
        email: 'gestionnaire@fleetmanager.dz',
        passwordHash: gestHash,
        firstName: 'Gestionnaire',
        lastName: 'Test',
        role: 'GESTIONNAIRE',
        isActive: true,
      },
      {
        email: 'lecteur@fleetmanager.dz',
        passwordHash: lectHash,
        firstName: 'Lecteur',
        lastName: 'Test',
        role: 'LECTEUR',
        isActive: true,
      },
    ],
    skipDuplicates: true,
  });

  const client = await prisma.client.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      nom: 'Cosider',
      secteur: 'BTP',
      contactNom: 'Ali Benmohamed',
      contactEmail: 'ali@cosider.dz',
      contactTel: '+213 555 000 001',
      couleur: '#1D6FA4',
    },
  });

  const admin = await prisma.user.findFirst({ where: { email: 'admin@fleetmanager.dz' } });

  await prisma.vehicle.createMany({
    data: [
      {
        id: '00000000-0000-0000-0000-000000000010',
        immatriculation: '16\u00B72341\u00B7ALG',
        marque: 'Fiat',
        modele: 'Ducato',
        annee: 2023,
        km: 50000,
        statut: 'DISPONIBLE',
        carburant: 'DIESEL',
        clientId: client.id,
      },
      {
        id: '00000000-0000-0000-0000-000000000011',
        immatriculation: '16\u00B72342\u00B7ALG',
        marque: 'Volkswagen',
        modele: 'Crafter',
        annee: 2022,
        km: 80000,
        statut: 'DISPONIBLE',
        carburant: 'DIESEL',
        clientId: client.id,
      },
      {
        id: '00000000-0000-0000-0000-000000000012',
        immatriculation: '16\u00B72343\u00B7ALG',
        marque: 'Renault',
        modele: 'Master',
        annee: 2024,
        km: 10000,
        statut: 'DISPONIBLE',
        carburant: 'DIESEL',
        clientId: client.id,
      },
    ],
    skipDuplicates: true,
  });

  // Garage for integration tests
  await prisma.garage.upsert({
    where: { id: '00000000-0000-0000-0000-000000000020' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000020',
      nom: 'Garage Test',
      adresse: '1 Rue Test',
      ville: 'Alger',
      telephone: '+213 21 00 00 00',
      email: 'test@garage.dz',
      specialite: 'MECANIQUE_GENERALE',
      statut: 'DISPONIBLE',
    },
  });

  // Create initial StatusHistory for each vehicle
  if (admin) {
    const vehicles = await prisma.vehicle.findMany();
    for (const v of vehicles) {
      const exists = await prisma.statusHistory.findFirst({ where: { vehicleId: v.id } });
      if (!exists) {
        await prisma.statusHistory.create({
          data: {
            vehicleId: v.id,
            fromStatus: '',
            toStatus: 'DISPONIBLE',
            reason: 'Véhicule créé (test seed)',
            changedById: admin.id,
          },
        });
      }
    }
  }
}

export function setupTestDb(): void {
  beforeAll(async () => {
    await seedMinimal();
  }, 30000);

  afterAll(async () => {
    await prisma.$disconnect();
  });
}

/** Login helper — returns access_token */
export async function loginAs(
  app: Express,
  email: string,
  password: string,
): Promise<{ token: string; refreshCookie: string }> {
  const supertest = await import('supertest');
  const res = await supertest.default(app).post('/api/v1/auth/login').send({ email, password });

  const body = res.body as { access_token: string };
  const rawCookies: unknown = res.headers['set-cookie'];
  const cookies = Array.isArray(rawCookies)
    ? (rawCookies as string[])
    : typeof rawCookies === 'string'
      ? [rawCookies]
      : [];
  const refreshCookie = cookies.find((c) => c.startsWith('refresh_token=')) ?? '';

  return { token: body.access_token, refreshCookie };
}
