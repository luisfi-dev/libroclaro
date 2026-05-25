import { Request, Response } from 'express';
import { z } from 'zod';
import { SubscriptionPlan, UserRole } from '@prisma/client';
import { prisma } from '../config/prisma';
import { HttpError } from '../utils/HttpError';
import { serializeInstitution, serializeInvoice, serializeUser } from '../utils/serializers';
import { getAnnotationQuota } from '../services/quota.service';

const PLAN_PRICES: Record<SubscriptionPlan, number> = {
  GRATUITO: 0,
  PRO: 100,
  INSTITUCIONAL: 2500,
};

const subscribeSchema = z.object({
  plan: z.enum(['GRATUITO', 'PRO', 'INSTITUCIONAL']),
  institutionName: z.string().min(2).max(200).optional(),
  cardNumber: z.string().regex(/^\d{13,19}$/).optional(),
  cardHolder: z.string().min(2).max(120).optional(),
  cardExpiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/).optional(),
  cardCvc: z.string().regex(/^\d{3,4}$/).optional(),
});

export async function getStatus(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  const quota = await getAnnotationQuota(req.user.id, req.user.plan);
  res.json({
    plan: req.user.plan,
    role: req.user.role,
    institutionId: req.user.institutionId,
    prices: PLAN_PRICES,
    quota,
  });
}

export async function subscribe(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  const data = subscribeSchema.parse(req.body);
  const plan = data.plan as SubscriptionPlan;

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw HttpError.notFound('Usuario no encontrado');

  if (user.role === UserRole.EDITOR) {
    throw HttpError.forbidden('Los editores no contratan planes de suscripción');
  }

  // Validación de método de pago para planes de pago
  if (plan !== SubscriptionPlan.GRATUITO) {
    if (!data.cardNumber || !data.cardHolder || !data.cardExpiry || !data.cardCvc) {
      throw HttpError.badRequest('Datos de tarjeta incompletos');
    }
  }

  // Reglas por plan
  if (plan === SubscriptionPlan.INSTITUCIONAL) {
    if (user.institutionId) {
      throw HttpError.conflict('Ya perteneces a una institución');
    }
    if (!data.institutionName) {
      throw HttpError.badRequest('Debes proporcionar el nombre de la institución');
    }
  }

  if (plan === SubscriptionPlan.GRATUITO && user.institutionId) {
    throw HttpError.badRequest(
      'Los miembros de una institución no pueden bajar al plan Gratuito por sí mismos',
    );
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  const last4 = data.cardNumber?.slice(-4) ?? null;

  const result = await prisma.$transaction(async (tx) => {
    let updatedUser = user;
    let institution = null as Awaited<ReturnType<typeof tx.institution.findUnique>>;

    if (plan === SubscriptionPlan.INSTITUCIONAL) {
      institution = await tx.institution.create({
        data: { name: data.institutionName!, adminId: user.id },
      });
      updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          plan: SubscriptionPlan.INSTITUCIONAL,
          role: UserRole.ADMIN_INSTITUCION,
          institutionId: institution.id,
        },
      });
    } else if (plan === SubscriptionPlan.PRO) {
      updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { plan: SubscriptionPlan.PRO, role: UserRole.DOCENTE },
      });
    } else {
      // GRATUITO: si era admin de institución y se está cancelando, eliminamos institución
      if (user.role === UserRole.ADMIN_INSTITUCION) {
        const inst = await tx.institution.findUnique({ where: { adminId: user.id } });
        if (inst) {
          await tx.user.updateMany({
            where: { institutionId: inst.id, NOT: { id: user.id } },
            data: { plan: SubscriptionPlan.GRATUITO, institutionId: null },
          });
          await tx.institution.delete({ where: { id: inst.id } });
        }
      }
      updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { plan: SubscriptionPlan.GRATUITO, role: UserRole.DOCENTE },
      });
    }

    const invoice =
      plan === SubscriptionPlan.GRATUITO
        ? null
        : await tx.invoice.create({
            data: {
              userId: user.id,
              institutionId: institution?.id ?? null,
              plan,
              amount: PLAN_PRICES[plan],
              periodStart: now,
              periodEnd,
              paymentMethodLast4: last4,
            },
          });

    return { user: updatedUser, institution, invoice };
  });

  res.json({
    user: serializeUser(result.user),
    institution: result.institution ? serializeInstitution(result.institution) : null,
    invoice: result.invoice ? serializeInvoice(result.invoice) : null,
  });
}

export async function listInvoices(req: Request, res: Response): Promise<void> {
  if (!req.user) throw HttpError.unauthorized();
  const invoices = await prisma.invoice.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ invoices: invoices.map(serializeInvoice) });
}
