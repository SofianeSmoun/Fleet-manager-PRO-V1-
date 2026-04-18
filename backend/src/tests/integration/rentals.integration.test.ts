import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../helpers/testServer';
import { setupTestDb, loginAs } from '../helpers/testDb';
import { prisma } from '../../lib/prisma';

setupTestDb();

let adminToken: string;
let lecteurToken: string;
const CLIENT_ID = '00000000-0000-0000-0000-000000000001';
// Use vehicle 12 for rentals to avoid state conflicts with vehicle tests
const VEHICLE_ID = '00000000-0000-0000-0000-000000000012';

beforeAll(async () => {
  const admin = await loginAs(app, 'admin@fleetmanager.dz', 'Admin2026!');
  adminToken = admin.token;
  const lecteur = await loginAs(app, 'lecteur@fleetmanager.dz', 'Read2026!');
  lecteurToken = lecteur.token;
});

describe('Rentals — GET /api/v1/rentals', () => {
  it('authenticated → 200 + paginated list', async () => {
    const res = await request(app)
      .get('/api/v1/rentals')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page');
  });

  it('no token → 401', async () => {
    const res = await request(app).get('/api/v1/rentals');
    expect(res.status).toBe(401);
  });
});

describe('Rentals — POST /api/v1/rentals + GET /:id + PATCH /:id/close', () => {
  let rentalId: string;

  it('ADMIN + valid data → 201 + vehicle becomes LOUE', async () => {
    // Ensure vehicle is DISPONIBLE
    const vehicle = await prisma.vehicle.findUnique({ where: { id: VEHICLE_ID } });
    expect(vehicle?.statut).toBe('DISPONIBLE');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const res = await request(app)
      .post('/api/v1/rentals')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        vehicleId: VEHICLE_ID,
        clientId: CLIENT_ID,
        dateDebut: tomorrow.toISOString(),
        dateFinPrevue: nextMonth.toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    rentalId = (res.body as { id: string }).id;

    // Vehicle should now be LOUE
    const updatedVehicle = await prisma.vehicle.findUnique({ where: { id: VEHICLE_ID } });
    expect(updatedVehicle?.statut).toBe('LOUE');
  });

  it('GET /api/v1/rentals/:id → 200', async () => {
    const res = await request(app)
      .get(`/api/v1/rentals/${rentalId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('vehicleId', VEHICLE_ID);
  });

  it('LECTEUR cannot create → 403', async () => {
    const res = await request(app)
      .post('/api/v1/rentals')
      .set('Authorization', `Bearer ${lecteurToken}`)
      .send({
        vehicleId: VEHICLE_ID,
        clientId: CLIENT_ID,
        dateDebut: new Date().toISOString(),
        dateFinPrevue: new Date(Date.now() + 86400000).toISOString(),
      });

    expect(res.status).toBe(403);
  });

  it('vehicle already LOUE → 400', async () => {
    const res = await request(app)
      .post('/api/v1/rentals')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        vehicleId: VEHICLE_ID,
        clientId: CLIENT_ID,
        dateDebut: new Date().toISOString(),
        dateFinPrevue: new Date(Date.now() + 86400000).toISOString(),
      });

    expect(res.status).toBe(400);
  });

  it('PATCH /:id/close → 200 + vehicle back to DISPONIBLE', async () => {
    const res = await request(app)
      .patch(`/api/v1/rentals/${rentalId}/close`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        dateFinReelle: new Date().toISOString(),
        kmRetour: 55000,
      });

    expect(res.status).toBe(200);

    // Vehicle should be DISPONIBLE again
    const vehicle = await prisma.vehicle.findUnique({ where: { id: VEHICLE_ID } });
    expect(vehicle?.statut).toBe('DISPONIBLE');

    // Cleanup
    await prisma.rental.deleteMany({ where: { id: rentalId } });
    // Clean status history entries created by the rental lifecycle
    await prisma.statusHistory.deleteMany({
      where: {
        vehicleId: VEHICLE_ID,
        reason: { contains: rentalId },
      },
    });
  });

  it('close already TERMINEE rental → 400', async () => {
    // Create and close a rental
    const tomorrow = new Date(Date.now() + 86400000);
    const nextMonth = new Date(Date.now() + 30 * 86400000);

    const createRes = await request(app)
      .post('/api/v1/rentals')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        vehicleId: VEHICLE_ID,
        clientId: CLIENT_ID,
        dateDebut: tomorrow.toISOString(),
        dateFinPrevue: nextMonth.toISOString(),
      });
    const id = (createRes.body as { id: string }).id;

    await request(app)
      .patch(`/api/v1/rentals/${id}/close`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ dateFinReelle: new Date().toISOString() });

    // Try to close again
    const res = await request(app)
      .patch(`/api/v1/rentals/${id}/close`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ dateFinReelle: new Date().toISOString() });

    expect(res.status).toBe(400);

    // Cleanup
    await prisma.rental.deleteMany({ where: { id } });
    await prisma.statusHistory.deleteMany({
      where: { vehicleId: VEHICLE_ID, reason: { contains: id } },
    });
  });

  it('unknown rental id → 404', async () => {
    const res = await request(app)
      .get('/api/v1/rentals/00000000-0000-0000-0000-999999999999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});
