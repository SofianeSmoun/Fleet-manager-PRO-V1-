import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../helpers/testServer';
import { setupTestDb, loginAs } from '../helpers/testDb';

setupTestDb();

let adminToken: string;
let lecteurToken: string;

beforeAll(async () => {
  const admin = await loginAs(app, 'admin@fleetmanager.dz', 'Admin2026!');
  adminToken = admin.token;
  const lecteur = await loginAs(app, 'lecteur@fleetmanager.dz', 'Read2026!');
  lecteurToken = lecteur.token;
});

describe('AuditLogs — GET /api/v1/audit-logs', () => {
  it('ADMIN → 200 + paginated list', async () => {
    const res = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page');
    expect(res.body).toHaveProperty('totalPages');
    expect(Array.isArray((res.body as { data: unknown[] }).data)).toBe(true);
  });

  it('LECTEUR → 403', async () => {
    const res = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${lecteurToken}`);

    expect(res.status).toBe(403);
  });

  it('no token → 401', async () => {
    const res = await request(app).get('/api/v1/audit-logs');
    expect(res.status).toBe(401);
  });
});
