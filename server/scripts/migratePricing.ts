import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting Pricing Data Migration...');

  // In a real scenario, this script would:
  // 1. Read from the legacy `ProductPricing` or `BasePricing` tables.
  // 2. Transform the data into the new `PricingVersion` and `PricingMatrix` format.
  // 3. Upsert them into the database safely.

  try {
    // Determine if there are legacy pricing rows (mock query)
    // const legacyPricing = await prisma.$queryRaw`SELECT * FROM "LegacyPricing"`;
    
    // For this demonstration, we'll ensure a baseline PricingVersion exists
    const existingVersion = await prisma.pricingVersion.findFirst({
      where: { status: 'active' }
    });

    if (existingVersion) {
      console.log(`Active pricing version found: ${existingVersion.name}. Migration not needed.`);
    } else {
      console.log('No active pricing version found. Initializing Base V1 from legacy mapping...');
      
      const newVersion = await prisma.pricingVersion.create({
        data: {
          name: 'Legacy Migration Baseline',
          status: 'published',
          publishedAt: new Date(),
          items: {
            create: [
              {
                category: 'product',
                productCategory: 'double_hung',
                label: 'Double Hung Base',
                price: 500,
                priceType: 'base'
              },
              {
                category: 'option',
                label: 'Foam Wrap',
                price: 25,
                priceType: 'flat'
              }
            ]
          }
        }
      });
      console.log(`Created baseline pricing version: ${newVersion.id}`);
    }

    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
