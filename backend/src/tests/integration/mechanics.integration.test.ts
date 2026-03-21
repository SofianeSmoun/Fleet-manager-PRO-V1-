import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../helpers/testServer';
import { setupTestDb, loginAs } from '../helpers/testDb';

setupTestDb();

let adminToken: string;

beforeAll(async () => {
  const admin = await loginAs(app, 'admin@fleetmanager.dz', 'Admin2026!');
  adminToken = admin.token;
});

describe('Mechanics — GET /api/v1/mechanics', () => {
  it('authenticated → 200 + paginated list with workload', async () => {
    const res = await request(app)
      .get('/api/v1/mechanics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
    const body = res.body as {
      data: { activeMaintenances: number; maintenances: unknown[] }[];
    };
    expect(Array.isArray(body.data)).toBe(true);
    // Each mechanic should have workload fields
    if (body.data.length > 0) {
      expect(body.data[0]).toHaveProperty('activeMaintenances');
      expect(body.data[0]).toHaveProperty('maintenances');
    }
  });

  it('no token → 401', async () => {
    const res = await request(app).get('/api/v1/mechanics');
    expect(res.status).toBe(401);
  });
});

describe('Mechanics — GET /api/v1/mechanics/:id', () => {
  it('existing garage → 200 with workload', async () => {
    const res = await request(app)
      .get('/api/v1/mechanics/00000000-0000-0000-0000-000000000020')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const body = res.body as { nom: string; activeMaintenances: number };
    expect(body.nom).toBe('Garage Test');
    expect(body).toHaveProperty('activeMaintenances');
  });

  it('unknown id → 404', async () => {
    const res = await request(app)
      .get('/api/v1/mechanics/00000000-0000-0000-0000-999999999999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});
