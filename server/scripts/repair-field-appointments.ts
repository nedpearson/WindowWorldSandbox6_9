import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const isApply = args.includes('--apply');

  console.log(`Starting Field Appointments Repair Script...`);
  console.log(`Mode: ${isApply ? 'APPLY (Modifying Database)' : 'DRY RUN (No changes)'}`);

  // Find Ned's user to skip it
  const ned = await prisma.user.findUnique({ where: { email: 'nedpearson@gmail.com' } });
  const nedUserId = ned?.id;

  const appointments = await prisma.appointment.findMany({
    include: { customer: true, user: true },
  });

  let missingCustomerLink = 0;
  let blankCustomerName = 0;
  let missingUser = 0;
  let missingCompanyId = 0;

  for (const appt of appointments) {
    // Skip Ned's data completely
    if (nedUserId && appt.userId === nedUserId) continue;

    let needsUpdate = false;
    let customerDataUpdate: any = {};
    let apptDataUpdate: any = {};

    if (!appt.customer) {
      console.log(`[Warning] Appointment ${appt.id} is missing a customer record.`);
      missingCustomerLink++;
    } else {
      if (!appt.customer.firstName || !appt.customer.lastName) {
        console.log(`[Warning] Appointment ${appt.id} customer ${appt.customerId} has blank first/last name.`);
        blankCustomerName++;
        if (isApply) {
          customerDataUpdate.firstName = appt.customer.firstName || 'Unknown';
          customerDataUpdate.lastName = appt.customer.lastName || 'Customer';
        }
      }
    }

    if (!appt.userId) {
      console.log(`[Warning] Appointment ${appt.id} is missing a userId.`);
      missingUser++;
    }

    if (!appt.companyId && appt.user?.companyId) {
      console.log(`[Warning] Appointment ${appt.id} is missing companyId but user has companyId.`);
      missingCompanyId++;
      if (isApply) {
        apptDataUpdate.companyId = appt.user.companyId;
      }
    }

    if (isApply) {
      if (Object.keys(customerDataUpdate).length > 0) {
        await prisma.customer.update({
          where: { id: appt.customerId },
          data: customerDataUpdate,
        });
        console.log(`  -> Fixed Customer ${appt.customerId}`);
      }
      if (Object.keys(apptDataUpdate).length > 0) {
        await prisma.appointment.update({
          where: { id: appt.id },
          data: apptDataUpdate,
        });
        console.log(`  -> Fixed Appointment ${appt.id}`);
      }
    }
  }

  console.log(`\nAudit Complete.`);
  console.log(`- Missing Customer Links: ${missingCustomerLink}`);
  console.log(`- Blank Customer Names: ${blankCustomerName}`);
  console.log(`- Missing User IDs: ${missingUser}`);
  console.log(`- Missing Company IDs: ${missingCompanyId}`);

  if (!isApply) {
    console.log(`\nRun with --apply to fix safely repairable records.`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
