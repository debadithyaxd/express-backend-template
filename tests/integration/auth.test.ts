import request from 'supertest';
import { createApp } from '@/app';
import { prisma } from '@/config/prisma';
import { redis } from '@/config/redis';

const app = createApp();

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany({ where: { email: 'jest@example.com' } });
  await prisma.$disconnect();
  await redis.quit();
});

describe('POST /api/v1/auth/register', () => {
  it('registers a new user and returns tokens', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Jest User',
      email: 'jest@example.com',
      password: 'Test@12345',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens).toHaveProperty('accessToken');
    expect(res.body.data.tokens).toHaveProperty('refreshToken');
  });

  it('returns 409 if email already exists', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Jest User',
      email: 'jest@example.com',
      password: 'Test@12345',
    });
    expect(res.status).toBe(409);
  });

  it('returns 422 on invalid payload', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'not-an-email',
      password: '123',
    });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/v1/auth/login', () => {
  it('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'jest@example.com',
      password: 'Test@12345',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.tokens).toHaveProperty('accessToken');
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'jest@example.com',
      password: 'WrongPass!',
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns user profile with valid token', async () => {
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'jest@example.com',
      password: 'Test@12345',
    });
    const { accessToken } = loginRes.body.data.tokens;

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('jest@example.com');
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('issues new token pair with valid refresh token', async () => {
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'jest@example.com',
      password: 'Test@12345',
    });
    const { refreshToken } = loginRes.body.data.tokens;

    const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data.tokens).toHaveProperty('accessToken');
  });

  it('returns 401 with invalid refresh token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'invalid.token.here' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('successfully logs out', async () => {
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'jest@example.com',
      password: 'Test@12345',
    });
    const { refreshToken } = loginRes.body.data.tokens;

    const res = await request(app).post('/api/v1/auth/logout').send({ refreshToken });
    expect(res.status).toBe(200);
  });
});

describe('GET /api/v1/health', () => {
  it('returns 200 ok', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
