import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
  const deleted = await prisma.opening.deleteMany({
    where: {
      appointmentId: 'cmp9azh750006nmkk3s52z6i0',
      openingNumber: { in: [1, 5, 6, 7] }
    }
  });
  console.log('Deleted openings:', deleted.count);
}

fix().finally(() => prisma.$disconnect());
