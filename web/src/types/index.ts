export type UserRole = 'DOCENTE' | 'ADMIN_INSTITUCION' | 'EDITOR';
export type SubscriptionPlan = 'GRATUITO' | 'PRO' | 'INSTITUCIONAL';
export type AnnotationKind = 'ERROR' | 'ERROR_PARCIAL';
export type InvoiceStatus = 'PAGADA' | 'PENDIENTE' | 'FALLIDA' | 'REEMBOLSADA';

export interface User {
  id: string;
  fullName: string;
  email: string;
  birthDate: string;
  role: UserRole;
  plan: SubscriptionPlan;
  institutionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Institution {
  id: string;
  name: string;
  adminId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  name: string;
}

export interface GradeLevel {
  id: string;
  name: string;
  order: number;
}

export interface Book {
  id: string;
  title: string;
  description: string;
  schoolYear: string;
  subjectId: string;
  subject: string;
  gradeLevelId: string;
  gradeLevel: string;
  pageCount: number;
  hidden: boolean;
  coverUrl: string | null;
  pdfUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnnotationMeta {
  id: string;
  bookId: string;
  page: number;
  kind: AnnotationKind;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  hasContent?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Quota {
  unlimited: boolean;
  used: number;
  limit: number;
  remaining: number;
}

export interface SupplementaryMaterial {
  id: string;
  bookId: string;
  fromPage: number;
  toPage: number;
  title: string;
  content?: string;
  locked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  plan: SubscriptionPlan;
  amount: string;
  status: InvoiceStatus;
  periodStart: string;
  periodEnd: string;
  paymentMethodLast4: string | null;
  createdAt: string;
}

export interface SubscriptionStatus {
  plan: SubscriptionPlan;
  role: UserRole;
  institutionId: string | null;
  prices: Record<SubscriptionPlan, number>;
  quota: Quota;
}
