import request from 'supertest';
import { SubscriptionPlan, UserRole } from '@prisma/client';
import { createApp } from '../../src/app';
import { createUser } from '../helpers/db';

const app = createApp();

const validCard = {
  cardNumber: '4111111111111111',
  cardHolder: 'Juan Perez',
  cardExpiry: '12/30',
  cardCvc: '123',
};

describe('GET /api/subscriptions/status', () => {
  it('devuelve el plan, precios y cuota del usuario', async () => {
    const docente = await createUser({ plan: SubscriptionPlan.GRATUITO });
    const res = await request(app)
      .get('/api/subscriptions/status')
      .set('Authorization', `Bearer ${docente.token}`);
    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('GRATUITO');
    expect(res.body.prices).toEqual({ GRATUITO: 0, PRO: 100, INSTITUCIONAL: 2500 });
    expect(res.body.quota.limit).toBe(20);
  });
});

describe('POST /api/subscriptions/subscribe', () => {
  it('checkout simulado Gratuito → Pro cambia el plan y genera factura', async () => {
    const docente = await createUser({ plan: SubscriptionPlan.GRATUITO });
    const res = await request(app)
      .post('/api/subscriptions/subscribe')
      .set('Authorization', `Bearer ${docente.token}`)
      .send({ plan: 'PRO', ...validCard });
    expect(res.status).toBe(200);
    expect(res.body.user.plan).toBe('PRO');
    expect(res.body.invoice).not.toBeNull();
    expect(res.body.invoice.amount).toBe('100');
    expect(res.body.invoice.paymentMethodLast4).toBe('1111');
  });

  it('rechaza plan de pago sin datos de tarjeta (400)', async () => {
    const docente = await createUser({ plan: SubscriptionPlan.GRATUITO });
    const res = await request(app)
      .post('/api/subscriptions/subscribe')
      .set('Authorization', `Bearer ${docente.token}`)
      .send({ plan: 'PRO' });
    expect(res.status).toBe(400);
  });

  it('plan Institucional crea institución y asigna ADMIN_INSTITUCION', async () => {
    const docente = await createUser({ plan: SubscriptionPlan.GRATUITO });
    const res = await request(app)
      .post('/api/subscriptions/subscribe')
      .set('Authorization', `Bearer ${docente.token}`)
      .send({ plan: 'INSTITUCIONAL', institutionName: 'Mi Escuela', ...validCard });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('ADMIN_INSTITUCION');
    expect(res.body.institution.name).toBe('Mi Escuela');
  });

  it('un editor no contrata suscripciones (403)', async () => {
    const editor = await createUser({ role: UserRole.EDITOR, plan: SubscriptionPlan.PRO });
    const res = await request(app)
      .post('/api/subscriptions/subscribe')
      .set('Authorization', `Bearer ${editor.token}`)
      .send({ plan: 'PRO', ...validCard });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/subscriptions/invoices', () => {
  it('lista el historial de facturas del usuario', async () => {
    const docente = await createUser({ plan: SubscriptionPlan.GRATUITO });
    await request(app)
      .post('/api/subscriptions/subscribe')
      .set('Authorization', `Bearer ${docente.token}`)
      .send({ plan: 'PRO', ...validCard });

    const res = await request(app)
      .get('/api/subscriptions/invoices')
      .set('Authorization', `Bearer ${docente.token}`);
    expect(res.status).toBe(200);
    expect(res.body.invoices.length).toBe(1);
    expect(res.body.invoices[0].plan).toBe('PRO');
  });
});
