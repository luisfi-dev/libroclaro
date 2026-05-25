import { SubscriptionPlan } from '@prisma/client';
import { prisma } from '../config/prisma';
import { HttpError } from '../utils/HttpError';

export const FREE_MONTHLY_ANNOTATION_LIMIT = 20;

function startOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export interface QuotaStatus {
  unlimited: boolean;
  used: number;
  limit: number;
  remaining: number;
}

export async function getAnnotationQuota(
  userId: string,
  plan: SubscriptionPlan,
): Promise<QuotaStatus> {
  if (plan !== SubscriptionPlan.GRATUITO) {
    return { unlimited: true, used: 0, limit: Infinity, remaining: Infinity };
  }
  const used = await prisma.annotationView.count({
    where: { userId, viewedAt: { gte: startOfMonth() } },
  });
  return {
    unlimited: false,
    used,
    limit: FREE_MONTHLY_ANNOTATION_LIMIT,
    remaining: Math.max(0, FREE_MONTHLY_ANNOTATION_LIMIT - used),
  };
}

/**
 * Registra una vista de anotación si el usuario está dentro de su cuota.
 * Si ya consumió la vista de esa anotación en el mes actual, no la vuelve a contar.
 */
export async function consumeAnnotationView(
  userId: string,
  annotationId: string,
  plan: SubscriptionPlan,
): Promise<QuotaStatus> {
  if (plan !== SubscriptionPlan.GRATUITO) {
    return { unlimited: true, used: 0, limit: Infinity, remaining: Infinity };
  }

  const monthStart = startOfMonth();
  const already = await prisma.annotationView.findFirst({
    where: { userId, annotationId, viewedAt: { gte: monthStart } },
  });

  if (!already) {
    const usedSoFar = await prisma.annotationView.count({
      where: { userId, viewedAt: { gte: monthStart } },
    });
    if (usedSoFar >= FREE_MONTHLY_ANNOTATION_LIMIT) {
      throw HttpError.payment(
        `Has alcanzado el límite de ${FREE_MONTHLY_ANNOTATION_LIMIT} correcciones del plan Gratuito este mes. Actualiza a Pro para consultas ilimitadas.`,
      );
    }
    await prisma.annotationView.create({ data: { userId, annotationId } });
  }

  return getAnnotationQuota(userId, plan);
}
