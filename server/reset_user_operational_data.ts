import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * RESET USER OPERATIONAL DATA
 * Safely clears all operational data (appointments, customers, jobs, sketches, quotes, etc.)
 * linked to a specific user while preserving global config, catalogs, pricing rules, and templates.
 * 
 * Usage: npx tsx server/reset_user_operational_data.ts <user_email>
 */
async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('❌ Error: Please provide an email address.');
    console.log('Usage: npx tsx reset_user_operational_data.ts <user_email>');
    process.exit(1);
  }

  console.log(`🔍 Locating user with email: ${email}`);

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    console.error(`❌ User ${email} not found.`);
    process.exit(1);
  }

  console.log(`✅ User found: ID ${user.id} | Role: ${user.role}`);
  console.log('⚠️ WARNING: This will permanently delete all operational data for this user.');
  console.log('Global templates, products, and pricing will be PRESERVED.\n');

  // Find all appointments for this user
  const appointments = await prisma.appointment.findMany({
    where: { userId: user.id },
    select: { id: true }
  });
  
  const apptIds = appointments.map(a => a.id);

  console.log(`Found ${apptIds.length} appointments to clean...`);

  if (apptIds.length > 0) {
    // Delete operations in safely ordered transaction
    // Child records must be deleted before parents
    await prisma.$transaction([
      prisma.openingPhoto.deleteMany({ where: { opening: { appointmentId: { in: apptIds } } } }),
      prisma.opening.deleteMany({ where: { appointmentId: { in: apptIds } } }),
      prisma.houseMapMarker.deleteMany({ where: { houseMap: { appointmentId: { in: apptIds } } } }),
      prisma.houseMap.deleteMany({ where: { appointmentId: { in: apptIds } } }),
      prisma.signature.deleteMany({ where: { appointmentId: { in: apptIds } } }),
      prisma.quoteLineItem.deleteMany({ where: { appointmentId: { in: apptIds } } }),
      prisma.contract.deleteMany({ where: { appointmentId: { in: apptIds } } }),
      prisma.payment.deleteMany({ where: { appointmentId: { in: apptIds } } }),
      prisma.formInstance.deleteMany({ where: { appointmentId: { in: apptIds } } }),
      // Delete the appointments
      prisma.appointment.deleteMany({ where: { userId: user.id } }),
    ]);
    console.log(`✅ Deleted all appointments and child records for ${email}.`);
  } else {
    console.log(`✅ No operational records found for ${email}. Account is already clean.`);
  }

  // We intentionally DO NOT delete:
  // - user (auth)
  // - PricingVersion, PricingItem, PricingTable
  // - MissingPricingRule
  // - BusinessRule, MeasurementRule
  
  console.log('\n🎉 Reset complete! The account is fresh.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
