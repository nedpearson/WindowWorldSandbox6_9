// Audit script — read-only, prints existing companies and users
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function audit() {
  console.log('\n=== COMPANIES ===');
  const companies = await prisma.company.findMany({ 
    select: { id: true, name: true, tenantId: true, createdAt: true },
    orderBy: { createdAt: 'asc' }
  });
  companies.forEach(c => console.log(`  [${c.id}] ${c.name} (tenant: ${c.tenantId || 'none'})`));

  console.log('\n=== USERS (redacted passwords) ===');
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, companyId: true, createdAt: true },
    orderBy: { createdAt: 'asc' }
  });
  users.forEach(u => console.log(`  [${u.id.slice(0,8)}...] ${u.email} | role=${u.role} | company=${u.companyId || 'none'}`));

  console.log(`\nTotal companies: ${companies.length}`);
  console.log(`Total users: ${users.length}`);
  
  // Check if cgreen already exists
  const cgreen = await prisma.user.findUnique({ where: { email: 'cgreen@winworldinfo.com' } });
  console.log(`\ncgreen@winworldinfo.com exists: ${!!cgreen}`);
  if (cgreen) {
    console.log(`  id=${cgreen.id.slice(0,8)}... role=${cgreen.role} company=${cgreen.companyId}`);
  }

  await prisma.$disconnect();
}

audit().catch(e => { console.error(e); process.exit(1); });
