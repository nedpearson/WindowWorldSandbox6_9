import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const appt = await prisma.appointment.findFirst({
    where: { customer: { lastName: { contains: 'Maldonad' } } },
    include: { customer: true }
  });
  console.dir(appt, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
