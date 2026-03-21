import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../helpers/testServer';
import { setupTestDb, loginAs } from '../helpers/testDb';
import { prisma } from '../../lib/prisma';

setupTestDb();

let adminToken: string;
let lecteurToken: string;
const CLIENT_ID = '00000000-0000-0000-0000-000000000001';
const VEHICLE_ID = '00000000-0000-0000-0000-000000000010';

// Track vehicles created in tests for cleanup
const createdVehicleIds: string[] = [];

beforeAll(async () => {
  const admin = await loginAs(app, 'admin@fleetmanager.dz', 'Admin2026!');
  adminToken = admin.token;
  const lecteur = await loginAs(app, 'lecteur@fleetmanager.dz', 'Read2026!');
  lecteurToken = lecteur.token;
});

afterEach(async () => {
  // Cleanup vehicles created during tests
  for (const id of createdVehicleIds) {
    await prisma.statusHistory.deleteMany({ where: { vehicleId: id } });
    await prisma.vehicle.deleteMany({ where: { id } });
  }
  createdVehicleIds.length = 0;
});

describe('Vehicles — GET /api/v1/vehicles', () => {
  it('authenticated → 200 + paginated list', async () => {
    const res = await request(app)
      .get('/api/v1/vehicles')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page');
    expect(Array.isArray((res.body as { data: unknown[] }).data)).toBe(true);
  });

  it('no token → 401', async () => {
    const res = await request(app).get('/api/v1/vehicles');
    expect(res.status).toBe(401);
  });

  it('filter by statut=DISPONIBLE', async () => {
    const res = await request(app)
      .get('/api/v1/vehicles?statut=DISPONIBLE')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const data = (res.body as { data: { statut: string }[] }).data;
    for (const v of data) {
      expect(v.statut).toBe('DISPONIBLE');
    }
  });
});

describe('Vehicles — GET /api/v1/vehicles/:id', () => {
  it('existing vehicle → 200', async () => {
    const res = await request(app)
      .get(`/api/v1/vehicles/${VEHICLE_ID}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('immatriculation');
  });

  it('unknown id → 404', async () => {
    const res = await request(app)
      .get('/api/v1/vehicles/00000000-0000-0000-0000-999999999999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

describe('Vehicles — POST /api/v1/vehicles', () => {
  it('ADMIN + valid data → 201', async () => {
    const res = await request(app)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        immatriculation: '16\u00B79999\u00B7ALG',
        marque: 'Fiat',
        modele: 'Fiorino',
        annee: 2024,
        km: 0,
        clientId: CLIENT_ID,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    createdVehicleIds.push((res.body as { id: string }).id);
  });

  it('LECTEUR → 403', async () => {
    const res = await request(app)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${lecteurToken}`)
      .send({
        immatriculation: '16\u00B79998\u00B7ALG',
        marque: 'Fiat',
        modele: 'Test',
        annee: 2024,
        km: 0,
        clientId: CLIENT_ID,
      });

    expect(res.status).toBe(403);
  });

  it('invalid data → 422', async () => {
    const res = await request(app)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ marque: 'Fiat' }); // missing required fields

    expect(res.status).toBe(422);
  });
});

describe('Vehicles — PATCH /api/v1/vehicles/:id', () => {
  it('ADMIN + valid update → 200', async () => {
    const res = await request(app)
      .patch(`/api/v1/vehicles/${VEHICLE_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Test update' });

    expect(res.status).toBe(200);

    // Cleanup notes
    await prisma.vehicle.update({
      where: { id: VEHICLE_ID },
      data: { notes: null },
    });
  });

  it('LECTEUR → 403', async () => {
    const res = await request(app)
      .patch(`/api/v1/vehicles/${VEHICLE_ID}`)
      .set('Authorization', `Bearer ${lecteurToken}`)
      .send({ notes: 'Blocked' });

    expect(res.status).toBe(403);
  });
});

describe('Vehicles — PATCH /api/v1/vehicles/:id/status', () => {
  it('DISPONIBLE → MAINTENANCE (valid) → 200', async () => {
    // Use vehicle 11 to avoid conflicts
    const vId = '00000000-0000-0000-0000-000000000011';
    const res = await request(app)
      .patch(`/api/v1/vehicles/${vId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ toStatus: 'MAINTENANCE', comment: 'Révision test' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('statut', 'MAINTENANCE');

    // Restore to DISPONIBLE
    await request(app)
      .patch(`/api/v1/vehicles/${vId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ toStatus: 'DISPONIBLE', comment: 'Restore test' });
  });

  it('invalid transition → 400', async () => {
    // DISPONIBLE → DISPONIBLE is invalid
    const res = await request(app)
      .patch(`/api/v1/vehicles/${VEHICLE_ID}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ toStatus: 'DISPONIBLE', comment: 'Invalid' });

    expect(res.status).toBe(400);
  });

  it('empty comment → 422', async () => {
    const res = await request(app)
      .patch(`/api/v1/vehicles/${VEHICLE_ID}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ toStatus: 'LOUE', comment: '' });

    expect(res.status).toBe(422);
  });
});

describe('Vehicles — DELETE /api/v1/vehicles/:id', () => {
  it('ADMIN → 204 (soft delete)', async () => {
    // Create a vehicle to delete
    const createRes = await request(app)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        immatriculation: '16\u00B77777\u00B7ALG',
        marque: 'Renault',
        modele: 'Kangoo',
        annee: 2023,
        km: 5000,
        clientId: CLIENT_ID,
      });
    const vehicleId = (createRes.body as { id: string }).id;

    const res = await request(app)
      .delete(`/api/v1/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(204);

    // Verify soft deleted (not visible in list)
    const getRes = await request(app)
      .get(`/api/v1/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getRes.status).toBe(404);

    // Cleanup
    await prisma.statusHistory.deleteMany({ where: { vehicleId } });
    await prisma.vehicle.deleteMany({ where: { id: vehicleId } });
  });

  it('LECTEUR → 403', async () => {
    const res = await request(app)
      .delete(`/api/v1/vehicles/${VEHICLE_ID}`)
      .set('Authorization', `Bearer ${lecteurToken}`);

    expect(res.status).toBe(403);
  });
});

describe('Vehicles — GET /api/v1/vehicles/export/excel', () => {
  it('ADMIN → 200 + xlsx content type', async () => {
    const res = await request(app)
      .get('/api/v1/vehicles/export/excel')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  });

  it('LECTEUR → 403', async () => {
    const res = await request(app)
      .get('/api/v1/vehicles/export/excel')
      .set('Authorization', `Bearer ${lecteurToken}`);

    expect(res.status).toBe(403);
  });
});
