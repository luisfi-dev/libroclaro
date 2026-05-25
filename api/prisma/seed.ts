import { PrismaClient, SubscriptionPlan, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SUBJECTS = [
  'Español',
  'Matemáticas',
  'Ciencias Naturales',
  'Historia',
  'Geografía',
  'Formación Cívica y Ética',
  'Educación Física',
  'Educación Artística',
];

const GRADE_LEVELS = [
  { name: '1° Primaria', order: 1 },
  { name: '2° Primaria', order: 2 },
  { name: '3° Primaria', order: 3 },
  { name: '4° Primaria', order: 4 },
  { name: '5° Primaria', order: 5 },
  { name: '6° Primaria', order: 6 },
  { name: '1° Secundaria', order: 7 },
  { name: '2° Secundaria', order: 8 },
  { name: '3° Secundaria', order: 9 },
];

async function main(): Promise<void> {
  for (const name of SUBJECTS) {
    await prisma.subject.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const g of GRADE_LEVELS) {
    await prisma.gradeLevel.upsert({ where: { name: g.name }, update: { order: g.order }, create: g });
  }

  const editorEmail = 'editor@libroclaro.test';
  const existing = await prisma.user.findUnique({ where: { email: editorEmail } });
  if (!existing) {
    await prisma.user.create({
      data: {
        fullName: 'Editor Inicial',
        email: editorEmail,
        birthDate: new Date('1990-01-01'),
        passwordHash: await bcrypt.hash('editor1234', 10),
        role: UserRole.EDITOR,
        plan: SubscriptionPlan.PRO,
      },
    });
    console.log(`Editor inicial creado: ${editorEmail} / editor1234`);
  } else {
    console.log('Editor inicial ya existe, sin cambios.');
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
