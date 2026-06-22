import 'dotenv/config';
import { PrismaClient, SubscriptionPlan, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const hash = await bcrypt.hash('docente1234', 10);
  let creados = 0;

  for (let i = 1; i <= 100; i++) {
    const num = String(i).padStart(2, '0');
    const email = `docente${num}@libroclaro.test`;

    const existe = await prisma.user.findUnique({ where: { email } });
    if (!existe) {
      await prisma.user.create({
        data: {
          fullName: `Docente de Prueba ${num}`,
          email,
          birthDate: new Date('1990-06-15'),
          passwordHash: hash,
          role: UserRole.DOCENTE,
          plan: SubscriptionPlan.GRATUITO,
        },
      });
      creados++;
    }
  }

  console.log(`Usuarios creados: ${creados} / 100`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
