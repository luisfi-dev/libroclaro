import { Prisma, SubscriptionPlan, UserRole } from '@prisma/client';
import { prisma } from '../../src/config/prisma';
import { mongoose } from '../../src/config/mongo';
import { SupplementaryMaterial } from '../../src/models/SupplementaryMaterial';
import { hashPassword, signToken } from '../../src/services/auth.service';

export { prisma, mongoose, SupplementaryMaterial };

export const TEST_PASSWORD = 'Password123';

/** Limpia el estado mutable entre pruebas, conservando el catálogo semilla (Subject/GradeLevel). */
export async function resetDb(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Invoice","AnnotationView","Annotation","Book","Institution","User" RESTART IDENTITY CASCADE',
  );
  await SupplementaryMaterial.deleteMany({});
}

/** Devuelve ids de una materia y un nivel escolar de la semilla. */
export async function seedRefs(): Promise<{ subjectId: string; gradeLevelId: string }> {
  const [subject, grade] = await Promise.all([
    prisma.subject.findFirst({ orderBy: { name: 'asc' } }),
    prisma.gradeLevel.findFirst({ orderBy: { order: 'asc' } }),
  ]);
  if (!subject || !grade) {
    throw new Error('Faltan datos semilla (Subject/GradeLevel). ¿Se ejecutó el seed?');
  }
  return { subjectId: subject.id, gradeLevelId: grade.id };
}

interface CreateUserOpts {
  email?: string;
  fullName?: string;
  role?: UserRole;
  plan?: SubscriptionPlan;
  institutionId?: string | null;
  birthDate?: Date;
  password?: string;
}

let userCounter = 0;

/** Plan por defecto coherente con la lógica del producto (editores=PRO, admins=INSTITUCIONAL). */
function defaultPlanFor(role: UserRole): SubscriptionPlan {
  if (role === UserRole.EDITOR) return SubscriptionPlan.PRO;
  if (role === UserRole.ADMIN_INSTITUCION) return SubscriptionPlan.INSTITUCIONAL;
  return SubscriptionPlan.GRATUITO;
}

/** Crea un usuario directamente en la BD y devuelve un token JWT válido para él. */
export async function createUser(opts: CreateUserOpts = {}) {
  userCounter += 1;
  const password = opts.password ?? TEST_PASSWORD;
  const role = opts.role ?? UserRole.DOCENTE;
  const user = await prisma.user.create({
    data: {
      fullName: opts.fullName ?? `Usuario ${userCounter}`,
      email: opts.email ?? `user${userCounter}@test.com`,
      passwordHash: await hashPassword(password),
      birthDate: opts.birthDate ?? new Date('1990-01-01'),
      role,
      plan: opts.plan ?? defaultPlanFor(role),
      institutionId: opts.institutionId ?? null,
    },
  });
  const token = signToken(user);
  return { user, token, password };
}

/** Crea un administrador de institución junto con su institución. */
export async function createInstitutionAdmin(institutionName = 'Escuela Test') {
  const { user: admin } = await createUser({
    role: UserRole.ADMIN_INSTITUCION,
    plan: SubscriptionPlan.INSTITUCIONAL,
  });
  const institution = await prisma.institution.create({
    data: { name: institutionName, adminId: admin.id },
  });
  const updated = await prisma.user.update({
    where: { id: admin.id },
    data: { institutionId: institution.id },
  });
  return { admin: updated, institution, token: signToken(updated) };
}

interface CreateBookOpts {
  createdById: string;
  hidden?: boolean;
  title?: string;
  schoolYear?: string;
  subjectId?: string;
  gradeLevelId?: string;
}

/** Crea un libro directamente en la BD (sin archivo real, suficiente para la mayoría de tests). */
export async function createBook(opts: CreateBookOpts) {
  const refs = await seedRefs();
  return prisma.book.create({
    data: {
      title: opts.title ?? 'Libro de prueba',
      description: 'Descripción de prueba',
      schoolYear: opts.schoolYear ?? '2023-2024',
      subjectId: opts.subjectId ?? refs.subjectId,
      gradeLevelId: opts.gradeLevelId ?? refs.gradeLevelId,
      createdById: opts.createdById,
      pdfPath: '/tmp/libroclaro-test-nonexistent.pdf',
      hidden: opts.hidden ?? false,
      pageCount: 10,
    },
  });
}

/** Crea una anotación en un libro. */
export async function createAnnotation(bookId: string, authorId: string, overrides: Partial<Prisma.AnnotationUncheckedCreateInput> = {}) {
  return prisma.annotation.create({
    data: {
      bookId,
      authorId,
      page: 1,
      kind: 'ERROR',
      x: 0.1,
      y: 0.1,
      width: 0.2,
      height: 0.05,
      content: '**Corrección de prueba**',
      ...overrides,
    },
  });
}
