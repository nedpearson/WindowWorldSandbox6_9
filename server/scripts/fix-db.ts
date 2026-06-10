import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Finding duplicates...');
  
  // Find duplicate Openings
  const openings = await prisma.opening.findMany();
  const seen = new Set();
  const duplicates = [];
  
  for (const o of openings) {
    const key = `${o.appointmentId}-${o.openingNumber}`;
    if (seen.has(key)) {
      duplicates.push(o.id);
    } else {
      seen.add(key);
    }
  }
  
  if (duplicates.length > 0) {
    console.log(`Deleting ${duplicates.length} duplicate Openings...`);
    await prisma.opening.deleteMany({
      where: { id: { in: duplicates } }
    });
  }

  // Find duplicate SketchMarkers
  const markers = await prisma.sketchMarker.findMany();
  const seenMarkers = new Set();
  const dupMarkers = [];
  
  for (const m of markers) {
    const key = `${m.sketchId}-${m.elevation}-${m.markerType}-${m.markerNumber}`;
    if (seenMarkers.has(key)) {
      dupMarkers.push(m.id);
    } else {
      seenMarkers.add(key);
    }
  }

  if (dupMarkers.length > 0) {
    console.log(`Deleting ${dupMarkers.length} duplicate SketchMarkers...`);
    await prisma.sketchMarker.deleteMany({
      where: { id: { in: dupMarkers } }
    });
  }

  // Find duplicate SketchMarkerLinks
  const links = await prisma.sketchMarkerLink.findMany();
  const seenMarkerId = new Set();
  const seenOpeningId = new Set();
  const dupLinks = [];

  for (const l of links) {
    let isDup = false;
    if (seenMarkerId.has(l.markerId)) isDup = true;
    else seenMarkerId.add(l.markerId);

    if (l.openingId) {
      if (seenOpeningId.has(l.openingId)) isDup = true;
      else seenOpeningId.add(l.openingId);
    }

    if (isDup) {
      dupLinks.push(l.id);
    }
  }

  if (dupLinks.length > 0) {
    console.log(`Deleting ${dupLinks.length} duplicate SketchMarkerLinks...`);
    await prisma.sketchMarkerLink.deleteMany({
      where: { id: { in: dupLinks } }
    });
  }

  console.log('Done fixing duplicates.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
