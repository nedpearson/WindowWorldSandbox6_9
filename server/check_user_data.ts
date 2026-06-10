import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'nedpearson@gmail.com';
  
  // PHASE 1: IDENTIFY USER
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    console.log(`User ${email} not found.`);
    return;
  }

  console.log('=== USER IDENTIFIED ===');
  console.log(`ID: ${user.id}`);
  console.log(`Email: ${user.email}`);
  console.log(`Name: ${user.name}`);
  console.log(`Role: ${user.role}`);
  console.log('=======================\n');

  // PHASE 2: COUNT OPERATIONAL RECORDS
  const appointments = await prisma.appointment.count({ where: { userId: user.id } });
  
  // Customers linked to appointments by this user, or where user is owner (if applicable)
  // Let's check how many appointments exist
  const appts = await prisma.appointment.findMany({ where: { userId: user.id }, select: { id: true } });
  const apptIds = appts.map(a => a.id);

  const openings = await prisma.opening.count({ where: { appointmentId: { in: apptIds } } });
  const houseMaps = await prisma.houseMap.count({ where: { appointmentId: { in: apptIds } } });
  const signatures = await prisma.signature.count({ where: { appointmentId: { in: apptIds } } });
  const forms = await prisma.formInstance.count({ where: { appointmentId: { in: apptIds } } });

  console.log('=== OPERATIONAL DATA COUNTS ===');
  console.log(`Appointments: ${appointments}`);
  console.log(`Openings: ${openings}`);
  console.log(`HouseMaps: ${houseMaps}`);
  console.log(`Signatures: ${signatures}`);
  console.log(`Forms: ${forms}`);
  console.log('===============================');

}

main().catch(console.error).finally(() => prisma.$disconnect());
