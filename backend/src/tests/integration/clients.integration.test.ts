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

describe('Clients — GET /api/v1/clients', () => {
  it('authenticated → 200 + paginated list', async () => {
    const res = await request(app)
      .get('/api/v1/clients')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page');
    const body = res.body as { data: unknown[]; total: number };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.total).toBeGreaterThanOrEqual(1);
  });

  it('no token → 401', async () => {
    const res = await request(app).get('/api/v1/clients');
    expect(res.status).toBe(401);
  });
});

describe('Clients — GET /api/v1/clients/:id', () => {
  it('existing client → 200', async () => {
    const res = await request(app)
      .get('/api/v1/clients/00000000-0000-0000-0000-000000000001')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('nom', 'Cosider');
  });

  it('unknown id → 404', async () => {
    const res = await request(app)
      .get('/api/v1/clients/00000000-0000-0000-0000-999999999999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});
