import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const openings = await prisma.opening.findMany({
    where: { appointmentId: 'cmp9azh750006nmkk3s52z6i0' },
    select: { id: true, openingNumber: true, width: true, height: true }
  });
  console.log('Openings Count:', openings.length);
  console.log(openings);
}

check().finally(() => prisma.$disconnect());
