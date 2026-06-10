import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.opening.findMany({ where: { appointment: { customer: { lastName: 'Maldonado' } } } })
  .then(ops => console.log(ops.length + ' openings found. IDs: ' + ops.map(o => o.openingNumber).join(', ')))
  .finally(() => prisma.$disconnect());
