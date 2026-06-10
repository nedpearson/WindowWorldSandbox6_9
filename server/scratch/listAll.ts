import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const customers = await prisma.customer.findMany({
    include: {
      appointments: true
    }
  });

  console.log(`Total customers: ${customers.length}`);
  for (const c of customers) {
    console.log(`Customer: ${c.firstName} ${c.lastName} (ID: ${c.id})`);
    for (const appt of c.appointments) {
      console.log(`  Appointment: ${appt.id} (Total: ${appt.totalAmount}, Subtotal: ${appt.subtotal})`);
    }
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
