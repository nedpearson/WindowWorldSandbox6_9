import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  const appt = await prisma.appointment.findFirst({
    where: { customer: { firstName: 'Marcus', lastName: 'Henderson' } },
    include: { openings: true }
  });
  
  if (!appt) {
    console.log('No appt');
    return;
  }
  
  console.log('Appt:', appt.id);
  console.log('Current Openings:', appt.openings.length);
  
  // mock openings
  const openings = [
    { appointmentId: appt.id, openingNumber: 1, quantity: 1, width: 30, height: 60, unitedInches: 90, productCategory: 'double_hung' },
    { appointmentId: appt.id, openingNumber: 5, quantity: 1, width: 30, height: 60, unitedInches: 90, productCategory: 'double_hung' },
    { appointmentId: appt.id, openingNumber: 6, quantity: 1, width: 30, height: 60, unitedInches: 90, productCategory: 'picture' },
    { appointmentId: appt.id, openingNumber: 7, quantity: 1, width: 30, height: 60, unitedInches: 90, productCategory: 'double_hung' }
  ];

  try {
    await prisma.$transaction(async (tx) => {
      const incomingNumbers = openings.map(o => o.openingNumber).filter(Boolean);
      
      if (incomingNumbers.length > 0) {
        await tx.opening.deleteMany({
          where: { appointmentId: appt.id, openingNumber: { notIn: incomingNumbers } }
        });
      }
      
      for (const opening of openings) {
        const { ...data } = opening;
        const existing = await tx.opening.findFirst({
          where: { appointmentId: appt.id, openingNumber: data.openingNumber }
        });
        
        if (existing) {
          await tx.opening.update({
            where: { id: existing.id },
            data
          });
        } else {
          await tx.opening.create({ data });
        }
      }
    });
    console.log('Transaction succeeded!');
    
    const finalCount = await prisma.opening.count({ where: { appointmentId: appt.id } });
    console.log('Final count:', finalCount);
  } catch (err: any) {
    console.error('Transaction failed:', err.message);
  }
}

test().catch(console.error).finally(() => prisma.$disconnect());
