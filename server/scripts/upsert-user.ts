import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'cgreen@winworldinfo.com';
  const plainPassword = '1WindowWorld2';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  // Check for existing company to attach to, or create one
  let company = await prisma.company.findFirst();
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'Window World',
      }
    });
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: 'admin',
      companyId: company.id
    },
    create: {
      email,
      name: 'Christopher Green',
      password: hashedPassword,
      role: 'admin',
      companyId: company.id
    }
  });

  console.log('Upserted user:', user.email, 'with role:', user.role);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
