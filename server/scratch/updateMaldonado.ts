import { PrismaClient } from '@prisma/client';
import { recalculatePricing } from '../src/services/pricingEngine.js';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const appointmentId = 'cmq1486lt008ztn01hkpgwe7i';
  
  console.log('Updating openings for appointment:', appointmentId);

  // Update opening 1
  await prisma.opening.update({
    where: { appointmentId_openingNumber: { appointmentId, openingNumber: 1 } },
    data: {
      productCategory: 'oriel',
      oriel: true,
      width: 83,
      height: 35.75,
      glassPackage: 'SolarZone Low-E',
      removalType: 'ALUM',
      installMullion: true,
      structuralMullion: false,
      cutbackRequired: false,
      cutbackSelected: false,
      trimSelected: false,
      headerFlashingSelected: false,
      exteriorSurface: 'siding',
    }
  });

  // Update opening 2
  await prisma.opening.update({
    where: { appointmentId_openingNumber: { appointmentId, openingNumber: 2 } },
    data: {
      productCategory: 'oriel',
      oriel: true,
      width: 35.75,
      height: 82.625,
      glassPackage: 'SolarZone Low-E',
      removalType: 'ALUM',
      installMullion: true,
      structuralMullion: false,
      cutbackRequired: false,
      cutbackSelected: false,
      trimSelected: false,
      headerFlashingSelected: false,
      exteriorSurface: 'siding',
    }
  });

  // Update opening 3
  await prisma.opening.update({
    where: { appointmentId_openingNumber: { appointmentId, openingNumber: 3 } },
    data: {
      productCategory: 'oriel',
      oriel: true,
      width: 34.25,
      height: 34.625,
      glassPackage: 'SolarZone Low-E',
      removalType: 'ALUM',
      installMullion: false,
      structuralMullion: false,
      cutbackRequired: true,
      cutbackSelected: true,
      cutbackType: 'wood_trim_cutback',
      trimSelected: false,
      headerFlashingSelected: false,
      exteriorSurface: 'siding',
    }
  });

  // Update opening 4
  await prisma.opening.update({
    where: { appointmentId_openingNumber: { appointmentId, openingNumber: 4 } },
    data: {
      productCategory: 'oriel',
      oriel: true,
      width: 34.25,
      height: 34.625,
      glassPackage: 'SolarZone Low-E',
      removalType: 'ALUM',
      installMullion: false,
      structuralMullion: false,
      cutbackRequired: true,
      cutbackSelected: true,
      cutbackType: 'wood_trim_cutback',
      trimSelected: false,
      headerFlashingSelected: false,
      exteriorSurface: 'siding',
    }
  });

  // Update opening 5 (Tempered)
  await prisma.opening.update({
    where: { appointmentId_openingNumber: { appointmentId, openingNumber: 5 } },
    data: {
      productCategory: 'double_hung',
      seriesModel: '4000',
      productModel: '3001',
      oriel: false,
      width: 24.375,
      height: 34.625,
      glassPackage: 'SolarZone Low-E',
      temperedGlass: 'full',
      removalType: 'ALUM',
      installMullion: false,
      structuralMullion: false,
      cutbackRequired: false,
      cutbackSelected: false,
      trimSelected: false,
      headerFlashingSelected: true,
      exteriorSurface: 'siding',
    }
  });

  // Update opening 6
  await prisma.opening.update({
    where: { appointmentId_openingNumber: { appointmentId, openingNumber: 6 } },
    data: {
      productCategory: 'double_hung',
      seriesModel: '4000',
      productModel: '3001',
      oriel: false,
      width: 23.375,
      height: 35.125,
      glassPackage: 'SolarZone Low-E',
      temperedGlass: 'none',
      removalType: 'ALUM',
      installMullion: false,
      structuralMullion: false,
      cutbackRequired: false,
      cutbackSelected: false,
      trimSelected: false,
      headerFlashingSelected: true,
      exteriorSurface: 'siding',
    }
  });

  // Update opening 7
  await prisma.opening.update({
    where: { appointmentId_openingNumber: { appointmentId, openingNumber: 7 } },
    data: {
      productCategory: 'double_hung',
      seriesModel: '4000',
      productModel: '3001',
      oriel: false,
      width: 23.375,
      height: 35.125,
      glassPackage: 'SolarZone Low-E',
      temperedGlass: 'none',
      removalType: 'ALUM',
      installMullion: false,
      structuralMullion: false,
      cutbackRequired: false,
      cutbackSelected: false,
      trimSelected: false,
      headerFlashingSelected: true,
      exteriorSurface: 'siding',
    }
  });

  // Update opening 8
  await prisma.opening.update({
    where: { appointmentId_openingNumber: { appointmentId, openingNumber: 8 } },
    data: {
      productCategory: 'oriel',
      oriel: true,
      width: 35.375,
      height: 71.375,
      glassPackage: 'SolarZone Low-E',
      removalType: 'ALUM',
      installMullion: false,
      structuralMullion: false,
      cutbackRequired: false,
      cutbackSelected: false,
      trimSelected: true,
      trimType: 'Vinyl trim',
      headerFlashingSelected: false,
      exteriorSurface: 'siding',
    }
  });

  // Update opening 9
  await prisma.opening.update({
    where: { appointmentId_openingNumber: { appointmentId, openingNumber: 9 } },
    data: {
      productCategory: 'oriel',
      oriel: true,
      width: 35.375,
      height: 71,
      glassPackage: 'SolarZone Low-E',
      removalType: 'ALUM',
      installMullion: false,
      structuralMullion: false,
      cutbackRequired: false,
      cutbackSelected: false,
      trimSelected: true,
      trimType: 'Vinyl trim',
      headerFlashingSelected: false,
      exteriorSurface: 'siding',
    }
  });

  console.log('Openings updated successfully. Recalculating pricing...');
  
  const updatedAppt = await recalculatePricing(appointmentId);
  
  if (!updatedAppt) {
    console.error('Recalculation returned null');
    return;
  }

  console.log('\n========================================');
  console.log(`Appointment Recalculation Results:`);
  console.log(`Subtotal: ${updatedAppt.subtotal}`);
  console.log(`Total Amount: ${updatedAppt.totalAmount}`);
  console.log(`Deposit Amount: ${updatedAppt.depositAmount}`);
  console.log(`Balance Due: ${updatedAppt.balanceDue}`);
  console.log(`Openings count: ${updatedAppt.openings.length}`);
  
  console.log(`\nGenerated Line Items:`);
  const lineItems = await prisma.quoteLineItem.findMany({
    where: { appointmentId },
    orderBy: { sortOrder: 'asc' }
  });

  let sumTotal = 0;
  for (const item of lineItems) {
    console.log(`  [${item.category}] "${item.label}": Qty=${item.quantity}, UnitPrice=${item.unitPrice}, Total=${item.totalPrice}`);
    sumTotal += item.totalPrice;
  }
  console.log(`\nSum of all line items: ${sumTotal}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
