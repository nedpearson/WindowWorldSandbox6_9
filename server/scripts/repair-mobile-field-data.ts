import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const isApply = args.includes('--apply');

  console.log(`Starting Mobile Field Data Repair Script...`);
  console.log(`Mode: ${isApply ? 'APPLY (Modifying Database)' : 'DRY RUN (No changes)'}`);

  const ned = await prisma.user.findUnique({ where: { email: 'nedpearson@gmail.com' } });
  const nedUserId = ned?.id;

  const appointments = await prisma.appointment.findMany({
    include: { customer: true, user: true },
  });

  let orphanAppointments = 0;
  let blankCustomerName = 0;
  let missingUser = 0;
  let missingCompanyId = 0;
  let missingApptDate = 0;
  let badStatusCount = 0;

  const validStatuses = ['draft', 'in_progress', 'quoted', 'sold', 'needs_remeasure', 'cancelled'];

  for (const appt of appointments) {
    if (nedUserId && appt.userId === nedUserId) continue;

    let customerDataUpdate: any = {};
    let apptDataUpdate: any = {};

    if (!appt.customer) {
      console.log(`[Warning] Appointment ${appt.id} is missing a customer record (Orphaned).`);
      orphanAppointments++;
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

    if (!appt.appointmentDate) {
      console.log(`[Warning] Appointment ${appt.id} is missing an appointmentDate.`);
      missingApptDate++;
      // Not safe to auto-apply a date unless we default to createdAt
      if (isApply) {
         apptDataUpdate.appointmentDate = appt.createdAt;
      }
    }

    if (!validStatuses.includes(appt.status)) {
      console.log(`[Warning] Appointment ${appt.id} has invalid status: ${appt.status}`);
      badStatusCount++;
      if (isApply) {
        apptDataUpdate.status = 'draft';
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
  console.log(`- Orphan Appointments (Missing Customer): ${orphanAppointments}`);
  console.log(`- Blank Customer Names: ${blankCustomerName}`);
  console.log(`- Missing User IDs: ${missingUser}`);
  console.log(`- Missing Company IDs: ${missingCompanyId}`);
  console.log(`- Missing Appointment Dates: ${missingApptDate}`);
  console.log(`- Bad Statuses: ${badStatusCount}`);

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
