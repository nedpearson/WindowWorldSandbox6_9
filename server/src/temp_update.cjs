const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  await prisma.pricingVersionItem.updateMany({
    where: { label: { contains: '6100' } },
    data: { seriesModel: '6100 Series' }
  });
  console.log('Updated 6100 series');
}
run().catch(console.error).finally(() => prisma.$disconnect());
