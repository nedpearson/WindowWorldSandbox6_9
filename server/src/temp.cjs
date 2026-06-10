const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const v = await prisma.pricingVersion.findFirst({
    where: { status: 'published' },
    orderBy: { publishedAt: 'desc' },
    include: { items: true }
  });
  console.log(JSON.stringify(v.items.filter(i => i.productCategory === 'double_hung' || i.price === 369 || i.price === 89 || i.price === 454), null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());
