import { PrismaClient } from '@prisma/client';
import { normalizeSketchForDocumentExport } from './src/services/printSafeSketchRenderer.js';
const prisma = new PrismaClient();

async function run() {
  const appt = await prisma.appointment.findFirst({
    where: { customer: { lastName: 'Maldonado' } },
    include: {
      customer: true,
      openings: true,
    }
  });

  const sketch = await prisma.formSketch.findFirst({
    where: { appointmentId: appt.id },
    include: {
      markers: { include: { links: { include: { opening: true } } } },
      markerGroups: { include: { members: true } }
    }
  });

  const { openings: normalizedOpenings } = normalizeSketchForDocumentExport(appt, sketch, appt.openings);
  
  const openingToGroupId = new Map<string, string>();
  if (sketch?.markerGroups) {
    for (const group of sketch.markerGroups) {
      for (const member of group.members) {
        const marker = sketch.markers?.find((m: any) => m.id === member.markerId);
        if (marker && marker.links) {
          for (const link of marker.links) {
            if (link.openingId) {
              openingToGroupId.set(link.openingId, group.id);
            }
          }
        }
      }
    }
  }

  const processedOpeningIds = new Set<string>();
  let currentRowOffset = 0;

  for (let i = 0; i < normalizedOpenings.length && currentRowOffset < 24; i++) {
    const opening = normalizedOpenings[i];
    if (opening.id && processedOpeningIds.has(opening.id)) continue;

    const groupId = openingToGroupId.get(opening.id);
    if (groupId) {
        const groupOpenings = normalizedOpenings.filter(o => openingToGroupId.get(o.id) === groupId);
        groupOpenings.forEach(o => { if (o.id) processedOpeningIds.add(o.id); });

        console.log(`Line ${currentRowOffset + 1}: Mull Header (Group ${groupId})`);
        currentRowOffset++;
        
        for (const go of groupOpenings) {
          console.log(`Line ${currentRowOffset + 1}: Child - Marker ${go.openingNumber} (Opening ID: ${go.id})`);
          currentRowOffset++;
        }
        continue;
    }

    if (opening.id) processedOpeningIds.add(opening.id);
    console.log(`Line ${currentRowOffset + 1}: Normal - Marker ${opening.openingNumber} (Opening ID: ${opening.id})`);
    currentRowOffset++;
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
