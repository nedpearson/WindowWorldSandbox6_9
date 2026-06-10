import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.appointment.findFirst({
  where: { customer: { lastName: 'Maldonado' } },
  include: { openings: true }
}).then(appt => {
  if (appt) {
    appt.openings.forEach(o => {
      console.log(`Opening ${o.openingNumber}: glassPackage="${o.glassPackage}"`);
    });
  }
}).finally(() => prisma.$disconnect());
