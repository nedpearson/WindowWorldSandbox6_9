import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  const count = await prisma.appointment.count();
  console.log('Appts:', count);
  const recent = await prisma.appointment.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: true,
      _count: { select: { openings: true } }
    }
  });
  console.log('Recent:', recent.map(r => r.id));
}
test().catch(console.error).finally(() => prisma.$disconnect());
