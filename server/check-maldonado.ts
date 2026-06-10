import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const appts = await prisma.appointment.findMany({
    where: { customer: { lastName: 'Maldonado' } },
    include: {
      customer: true,
      openings: true,
      quoteGroups: { include: { openings: true } },
      combinedQuotes: { include: { quoteGroups: { include: { quoteGroup: { include: { openings: true } } } } } },
      formSketches: { include: { markerGroups: { include: { members: true } }, markers: { include: { links: true } } } }
    }
  });

  if (appts.length === 0) {
    console.log('Appt not found');
    return;
  }
  
  for (const appt of appts) {
    console.log(`\n================= APPOINTMENT ID: ${appt.id} =================`);
  
  console.log('Customer:', appt.customer?.firstName, appt.customer?.lastName);
  console.log('Total Openings:', appt.openings.length);
  console.log('Openings:');
  for (const o of appt.openings) {
    console.log(`- ID: ${o.id}, Num: ${o.openingNumber}, Model: ${o.productModel}, Cat: ${o.productCategory}, mullGroup: ${o.mullGroup}`);
  }
  
  console.log('\nQuote Groups:');
  for (const q of appt.quoteGroups) {
    console.log(`- ID: ${q.id}, Name: ${q.name}, Openings: ${q.openings.map(op => op.openingId).join(', ')}`);
  }
  
  console.log('\nCombined Quotes:');
  for (const c of appt.combinedQuotes) {
    console.log(`- ID: ${c.id}`);
  }

  console.log('\nMull Groups (from Sketch):');
  for (const sketch of appt.formSketches) {
    console.log(`\nSketch ID: ${sketch.id}, Name: ${sketch.name}, Created: ${sketch.createdAt}`);
    console.log('Markers:');
    for (const m of sketch.markers) {
      console.log(`  - Marker ID: ${m.id}, Num: ${m.markerNumber}, Type: ${m.markerType}, Linked Op: ${m.links?.[0]?.openingId}`);
    }
    for (const group of sketch.markerGroups) {
      const memberIds = group.members.map((m: any) => {
        const marker = sketch.markers.find((mk: any) => mk.id === m.markerId);
        const opId = marker?.links[0]?.openingId;
        const opNum = appt.openings.find((o: any) => o.id === opId)?.openingNumber;
        return opNum;
      });
      console.log(`- Group ${group.id} (Type: ${group.groupType}): Windows ${memberIds.join(', ')}`);
    }
  }
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
