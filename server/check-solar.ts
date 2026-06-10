import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.pricingVersionItem.findMany({ where: { label: { contains: 'solar', mode: 'insensitive' } } })
  .then(items => console.dir(items, { depth: null }))
  .finally(() => prisma.$disconnect());
