import { SubscriptionPlan } from '@prisma/client';

// Mock del cliente Prisma y del logger ANTES de importar el servicio.
jest.mock('../../src/config/prisma', () => ({
  prisma: {
    annotationView: {
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));
jest.mock('../../src/config/logger', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

import { prisma } from '../../src/config/prisma';
import {
  getAnnotationQuota,
  consumeAnnotationView,
  FREE_MONTHLY_ANNOTATION_LIMIT,
} from '../../src/services/quota.service';
import { HttpError } from '../../src/utils/HttpError';

const countMock = prisma.annotationView.count as jest.Mock;
const findFirstMock = prisma.annotationView.findFirst as jest.Mock;
const createMock = prisma.annotationView.create as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getAnnotationQuota', () => {
  it('plan PRO es ilimitado y no consulta la BD', async () => {
    const quota = await getAnnotationQuota('u1', SubscriptionPlan.PRO);
    expect(quota.unlimited).toBe(true);
    expect(quota.remaining).toBe(Infinity);
    expect(countMock).not.toHaveBeenCalled();
  });

  it('plan INSTITUCIONAL es ilimitado', async () => {
    const quota = await getAnnotationQuota('u1', SubscriptionPlan.INSTITUCIONAL);
    expect(quota.unlimited).toBe(true);
  });

  it('plan GRATUITO cuenta las vistas del mes y calcula el remanente', async () => {
    countMock.mockResolvedValue(5);
    const quota = await getAnnotationQuota('u1', SubscriptionPlan.GRATUITO);
    expect(quota).toEqual({
      unlimited: false,
      used: 5,
      limit: FREE_MONTHLY_ANNOTATION_LIMIT,
      remaining: 15,
    });
  });

  it('remanente nunca es negativo', async () => {
    countMock.mockResolvedValue(25);
    const quota = await getAnnotationQuota('u1', SubscriptionPlan.GRATUITO);
    expect(quota.remaining).toBe(0);
  });
});

describe('consumeAnnotationView', () => {
  it('plan PRO no registra vistas ni consulta la BD', async () => {
    const quota = await consumeAnnotationView('u1', 'a1', SubscriptionPlan.PRO);
    expect(quota.unlimited).toBe(true);
    expect(findFirstMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('plan GRATUITO: si ya consumió la anotación este mes, no crea una nueva vista', async () => {
    findFirstMock.mockResolvedValue({ id: 'view-existente' });
    countMock.mockResolvedValue(10);
    await consumeAnnotationView('u1', 'a1', SubscriptionPlan.GRATUITO);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('plan GRATUITO bajo el límite: registra la vista', async () => {
    findFirstMock.mockResolvedValue(null);
    countMock.mockResolvedValueOnce(3).mockResolvedValueOnce(4);
    createMock.mockResolvedValue({ id: 'nueva' });
    const quota = await consumeAnnotationView('u1', 'a1', SubscriptionPlan.GRATUITO);
    expect(createMock).toHaveBeenCalledWith({ data: { userId: 'u1', annotationId: 'a1' } });
    expect(quota.used).toBe(4);
  });

  it('plan GRATUITO en el límite (20): lanza HttpError 402 y no registra la vista', async () => {
    findFirstMock.mockResolvedValue(null);
    countMock.mockResolvedValue(FREE_MONTHLY_ANNOTATION_LIMIT);
    await expect(
      consumeAnnotationView('u1', 'a1', SubscriptionPlan.GRATUITO),
    ).rejects.toMatchObject({ status: 402 });
    await expect(
      consumeAnnotationView('u1', 'a1', SubscriptionPlan.GRATUITO),
    ).rejects.toBeInstanceOf(HttpError);
    expect(createMock).not.toHaveBeenCalled();
  });
});
