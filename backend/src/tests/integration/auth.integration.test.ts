import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../helpers/testServer';
import { setupTestDb, loginAs } from '../helpers/testDb';
import { prisma } from '../../lib/prisma';

setupTestDb();

interface AuthBody {
  access_token: string;
  token_type: string;
  user: { id: string; email: string; role: string };
}

describe('Auth — POST /api/v1/auth/login', () => {
  it('valid credentials → 200 + access_token + refresh cookie', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@fleetmanager.dz',
      password: 'Admin2026!',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('access_token');
    expect(res.body).toHaveProperty('token_type', 'Bearer');
    expect((res.body as AuthBody).user.role).toBe('ADMIN');

    const rawCookies: unknown = res.headers['set-cookie'];
    const cookies = Array.isArray(rawCookies) ? (rawCookies as string[]) : [];
    expect(cookies.some((c) => c.startsWith('refresh_token='))).toBe(true);
  });

  it('wrong password → 401', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@fleetmanager.dz',
      password: 'Wrong!',
    });
    expect(res.status).toBe(401);
  });

  it('unknown email → 401', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'unknown@test.com',
      password: 'Whatever1!',
    });
    expect(res.status).toBe(401);
  });

  it('missing email → 422', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      password: 'test',
    });
    expect(res.status).toBe(422);
  });
});

describe('Auth — POST /api/v1/auth/refresh', () => {
  it('valid refresh cookie → 200 + new tokens', async () => {
    const { refreshCookie } = await loginAs(app, 'admin@fleetmanager.dz', 'Admin2026!');

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('access_token');
  });

  it('no cookie → 401', async () => {
    const res = await request(app).post('/api/v1/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('invalid cookie → 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', 'refresh_token=invalid_token');
    expect(res.status).toBe(401);
  });
});

describe('Auth — POST /api/v1/auth/logout', () => {
  it('logout → 200 + clears cookie', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Déconnexion réussie');
  });
});

describe('Auth — POST /api/v1/auth/forgot-password', () => {
  it('existing email → 200 (always)', async () => {
    const res = await request(app).post('/api/v1/auth/forgot-password').send({
      email: 'admin@fleetmanager.dz',
    });
    expect(res.status).toBe(200);
  });

  it('unknown email → 200 (security: no leak)', async () => {
    const res = await request(app).post('/api/v1/auth/forgot-password').send({
      email: 'nonexistent@test.com',
    });
    expect(res.status).toBe(200);
  });
});

describe('Auth — POST /api/v1/auth/reset-password', () => {
  it('valid token → 200 + password changed', async () => {
    // Generate reset token
    await request(app).post('/api/v1/auth/forgot-password').send({
      email: 'gestionnaire@fleetmanager.dz',
    });

    const user = await prisma.user.findFirst({
      where: { email: 'gestionnaire@fleetmanager.dz' },
    });
    const resetToken = user?.resetToken;
    expect(resetToken).toBeTruthy();

    const res = await request(app).post('/api/v1/auth/reset-password').send({
      token: resetToken,
      newPassword: 'NewPass2026!',
    });
    expect(res.status).toBe(200);

    // Verify new password works
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'gestionnaire@fleetmanager.dz',
      password: 'NewPass2026!',
    });
    expect(loginRes.status).toBe(200);

    // Restore original password
    await request(app).post('/api/v1/auth/forgot-password').send({
      email: 'gestionnaire@fleetmanager.dz',
    });
    const user2 = await prisma.user.findFirst({
      where: { email: 'gestionnaire@fleetmanager.dz' },
    });
    await request(app).post('/api/v1/auth/reset-password').send({
      token: user2?.resetToken,
      newPassword: 'Gest2026!',
    });
  });

  it('invalid token → 401', async () => {
    const res = await request(app).post('/api/v1/auth/reset-password').send({
      token: 'invalid-uuid-token',
      newPassword: 'NewPass2026!',
    });
    expect(res.status).toBe(401);
  });
});
