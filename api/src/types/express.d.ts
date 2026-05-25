import { UserRole, SubscriptionPlan } from '@prisma/client';

declare global {
  namespace Express {
    interface AuthUser {
      id: string;
      email: string;
      role: UserRole;
      plan: SubscriptionPlan;
      institutionId: string | null;
    }
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
