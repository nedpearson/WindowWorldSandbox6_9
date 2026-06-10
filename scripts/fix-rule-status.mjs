// Update all measurement rules that have non-standard status values to 'verified'
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../server/.env') });

const prisma = new PrismaClient();

async function run() {
  // Fix any rule with 'active' status (the old seed used this) -> 'verified'
  const r1 = await prisma.measurementRule.updateMany({
    where: { status: 'active' },
    data: { status: 'verified' },
  });
  console.log(`Updated ${r1.count} rules: 'active' → 'verified'`);

  // Fix any rule with a completely unknown status -> 'verified'
  const known = ['verified', 'needs_verification', 'draft', 'inactive'];
  const all = await prisma.measurementRule.findMany({ select: { id: true, name: true, status: true } });
  const unknown = all.filter(r => !known.includes(r.status));
  for (const r of unknown) {
    await prisma.measurementRule.update({ where: { id: r.id }, data: { status: 'verified' } });
    console.log(`  Fixed "${r.name}" was "${r.status}" → "verified"`);
  }

  const final = await prisma.measurementRule.findMany({ select: { name: true, status: true }, orderBy: { createdAt: 'asc' } });
  console.log('\nFinal status of all rules:');
  for (const r of final) {
    console.log(`  ${r.status.padEnd(20)} ${r.name}`);
  }

  await prisma.$disconnect();
}

run().catch(err => { console.error(err.message); process.exit(1); });
