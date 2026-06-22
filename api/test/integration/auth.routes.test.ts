import request from 'supertest';
import { createApp } from '../../src/app';
import { createUser, TEST_PASSWORD } from '../helpers/db';

const app = createApp();

function isoDateYearsAgo(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

describe('POST /api/auth/register', () => {
  const base = {
    fullName: 'Juan Pérez',
    email: 'juan@test.com',
    password: 'Password123',
    passwordConfirmation: 'Password123',
  };

  it('registra un usuario mayor de edad y devuelve token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...base, birthDate: isoDateYearsAgo(25) });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('juan@test.com');
    expect(res.body.user.role).toBe('DOCENTE');
    expect(res.body.user.plan).toBe('GRATUITO');
  });

  it('rechaza el registro de un menor de 18 años', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...base, birthDate: isoDateYearsAgo(16) });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/18 años/i);
  });

  it('rechaza cuando las contraseñas no coinciden (validación Zod 400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...base, passwordConfirmation: 'Otra1234', birthDate: isoDateYearsAgo(25) });
    expect(res.status).toBe(400);
  });

  it('rechaza email duplicado con 409', async () => {
    await createUser({ email: 'dup@test.com' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...base, email: 'dup@test.com', birthDate: isoDateYearsAgo(25) });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  it('inicia sesión con credenciales válidas', async () => {
    await createUser({ email: 'login@test.com', password: TEST_PASSWORD });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.com', password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('rechaza credenciales inválidas con 401', async () => {
    await createUser({ email: 'login2@test.com', password: TEST_PASSWORD });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login2@test.com', password: 'incorrecta' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('devuelve el usuario autenticado', async () => {
    const { token, user } = await createUser({ email: 'me@test.com' });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
  });

  it('rechaza sin token con 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
