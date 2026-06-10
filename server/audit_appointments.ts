import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const appts = await p.appointment.findMany({
    include: {
      customer: true,
      _count: { select: { openings: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log('=== ALL APPOINTMENTS ===');
  console.log('ID (short) | Customer | Openings | Status');
  console.log('─'.repeat(60));
  
  for (const a of appts) {
    const name = `${a.customer?.firstName || ''} ${a.customer?.lastName || ''}`.trim() || 'No customer';
    console.log(`${a.id.substring(0, 12)} | ${name.padEnd(20)} | ${String(a._count.openings).padStart(3)} openings | ${a.status || 'draft'}`);
  }

  // Check for any openings with null/missing fields that could break
  const openings = await p.opening.findMany({
    select: {
      id: true,
      openingNumber: true,
      appointmentId: true,
      productCategory: true,
      width: true,
      height: true,
      elevation: true,
      gridPattern: true,
      exteriorSurface: true,
    },
  });

  console.log(`\n=== OPENING FIELD AUDIT (${openings.length} total) ===`);
  let missingElevation = 0;
  let missingCategory = 0;
  let missingDimensions = 0;
  let nullOpeningNumber = 0;

  for (const o of openings) {
    if (!o.openingNumber) nullOpeningNumber++;
    if (!o.elevation) missingElevation++;
    if (!o.productCategory) missingCategory++;
    if (!o.width || !o.height) missingDimensions++;
  }

  console.log(`Total openings: ${openings.length}`);
  console.log(`Missing openingNumber: ${nullOpeningNumber}`);
  console.log(`Missing elevation: ${missingElevation}`);
  console.log(`Missing productCategory: ${missingCategory}`);
  console.log(`Missing width/height: ${missingDimensions}`);

  await p['$disconnect']();
}

main().catch(e => { console.error(e); process.exit(1); });
