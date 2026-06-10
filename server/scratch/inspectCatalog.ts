import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const version = await prisma.pricingVersion.findFirst({
    where: { status: 'published' },
    orderBy: { publishedAt: 'desc' },
    include: { items: true }
  });

  if (!version) {
    console.log('No published pricing version found.');
    return;
  }

  console.log(`Published Pricing Version: ${version.name} (ID: ${version.id})`);
  console.log(`Total items: ${version.items.length}`);

  for (const item of version.items) {
    console.log(`- ID=${item.id}, category=${item.category}, label="${item.label}", price=${item.price}, priceType=${item.priceType}, productCategory=${item.productCategory}, seriesModel=${item.seriesModel}, unitedInchesMin=${item.unitedInchesMin}, unitedInchesMax=${item.unitedInchesMax}`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
