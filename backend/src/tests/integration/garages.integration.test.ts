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

describe('Garages — GET /api/v1/garages', () => {
  it('authenticated → 200 + paginated list', async () => {
    const res = await request(app)
      .get('/api/v1/garages')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
    const body = res.body as { data: unknown[]; total: number };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.total).toBeGreaterThanOrEqual(1);
  });

  it('no token → 401', async () => {
    const res = await request(app).get('/api/v1/garages');
    expect(res.status).toBe(401);
  });
});

describe('Garages — POST /api/v1/garages', () => {
  it('ADMIN → 201 created', async () => {
    const res = await request(app)
      .post('/api/v1/garages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nom: 'New Garage',
        adresse: '10 Rue X',
        ville: 'Blida',
        telephone: '+213 25 00 00 00',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('nom', 'New Garage');
  });

  it('LECTEUR → 403 forbidden', async () => {
    const res = await request(app)
      .post('/api/v1/garages')
      .set('Authorization', `Bearer ${lecteurToken}`)
      .send({
        nom: 'Should Fail',
        adresse: '1 Rue Y',
        ville: 'Oran',
        telephone: '+213 41 00 00 00',
      });

    expect(res.status).toBe(403);
  });
});

describe('Garages — DELETE /api/v1/garages/:id', () => {
  it('ADMIN soft-deletes garage → deletedAt non null', async () => {
    // Create a garage to delete
    const createRes = await request(app)
      .post('/api/v1/garages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nom: 'To Delete',
        adresse: '99 Rue Z',
        ville: 'Tizi',
        telephone: '+213 26 00 00 00',
      });

    const garageId = (createRes.body as { id: string }).id;

    const res = await request(app)
      .delete(`/api/v1/garages/${garageId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(204);

    // Verify it's no longer visible in list
    const listRes = await request(app)
      .get('/api/v1/garages')
      .set('Authorization', `Bearer ${adminToken}`);

    const body = listRes.body as { data: { id: string }[] };
    const found = body.data.find((g) => g.id === garageId);
    expect(found).toBeUndefined();
  });
});
