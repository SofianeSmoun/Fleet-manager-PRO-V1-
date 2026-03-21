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

describe('Backup — GET /api/v1/admin/backup/status', () => {
  it('ADMIN → 200 + status info', async () => {
    const res = await request(app)
      .get('/api/v1/admin/backup/status')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('lastBackup');
    expect(res.body).toHaveProperty('history');
    expect(res.body).toHaveProperty('nextScheduled');
    expect(Array.isArray((res.body as { history: unknown[] }).history)).toBe(true);
  });

  it('LECTEUR → 403', async () => {
    const res = await request(app)
      .get('/api/v1/admin/backup/status')
      .set('Authorization', `Bearer ${lecteurToken}`);

    expect(res.status).toBe(403);
  });

  it('no token → 401', async () => {
    const res = await request(app).get('/api/v1/admin/backup/status');
    expect(res.status).toBe(401);
  });
});

describe('Backup — POST /api/v1/admin/backup/trigger', () => {
  it('ADMIN → 202', async () => {
    const res = await request(app)
      .post('/api/v1/admin/backup/trigger')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(202);
    expect(res.body).toHaveProperty('message', 'Backup démarré');
  });

  it('LECTEUR → 403', async () => {
    const res = await request(app)
      .post('/api/v1/admin/backup/trigger')
      .set('Authorization', `Bearer ${lecteurToken}`);

    expect(res.status).toBe(403);
  });
});
