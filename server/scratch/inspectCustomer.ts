import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('Searching for Customer "Fauseo Maldonado" or "Maldonado"...');
  
  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        { firstName: { contains: 'Fauseo', mode: 'insensitive' } },
        { lastName: { contains: 'Maldonado', mode: 'insensitive' } }
      ]
    },
    include: {
      appointments: {
        include: {
          openings: {
            where: { deletedAt: null },
            orderBy: { openingNumber: 'asc' }
          },
          lineItems: {
            orderBy: { sortOrder: 'asc' }
          },
          contracts: {
            orderBy: { version: 'desc' }
          }
        }
      }
    }
  });

  console.log(`Found ${customers.length} customer(s).`);

  for (const c of customers) {
    console.log(`\n========================================`);
    console.log(`Customer: ${c.firstName} ${c.lastName}`);
    console.log(`ID: ${c.id}`);
    console.log(`Address: ${c.address}, ${c.city}, ${c.state} ${c.zip}`);
    console.log(`Phone: ${c.phone}`);
    console.log(`Appointments count: ${c.appointments.length}`);
    
    for (const appt of c.appointments) {
      console.log(`\n  Appointment ID: ${appt.id}`);
      console.log(`  Subtotal: ${appt.subtotal}`);
      console.log(`  Total Amount: ${appt.totalAmount}`);
      console.log(`  Deposit: ${appt.depositAmount}`);
      console.log(`  Balance Due: ${appt.balanceDue}`);
      console.log(`  Openings count: ${appt.openings.length}`);
      
      console.log(`\n  Openings Details:`);
      for (const o of appt.openings) {
        console.log(`    Opening #${o.openingNumber} (Qty: ${o.quantity}):`);
        console.log(`      Product: ProductCategory=${o.productCategory}, ProductModel=${o.productModel}, SeriesModel=${o.seriesModel}`);
        console.log(`      Dimensions: ${o.width} x ${o.height} (UA: ${o.unitedInches})`);
        console.log(`      Colors: Int=${o.interiorColor}, Ext=${o.exteriorColor}`);
        console.log(`      Glass: Package=${o.glassPackage}, Tempered=${o.temperedGlass}, Obscure=${o.obscureGlass}, Argon=${o.argon}`);
        console.log(`      Options: Grid=${o.gridStyle}, Screen=${o.screenOption}, Oriel=${o.oriel}, NailFin=${o.nailFin}`);
        console.log(`      Siding/Trim/Install: ExtSurface=${o.exteriorSurface}, TrimType=${o.trimType}, RemovalType=${o.removalType}`);
        console.log(`      Mulls: MullGroup=${o.mullGroup}, InstallMullion=${o.installMullion}, StructuralMullion=${o.structuralMullion}`);
        console.log(`      Cutbacks: CutbackType=${o.cutbackType}, CutbackAmount=${o.cutbackAmount}, CutbackSelected=${o.cutbackSelected}`);
        console.log(`      Header: HeaderType=${o.headerType}, HeaderRequired=${o.headerRequired}, HeaderSelected=${o.headerSelected}, HeaderFlashingSelected=${o.headerFlashingSelected}`);
        console.log(`      Prices: Base=${o.basePrice}, Options=${o.optionsPrice}, Labor=${o.laborPrice}, Total=${o.totalPrice}`);
      }

      console.log(`\n  Line Items count: ${appt.lineItems.length}`);
      for (const item of appt.lineItems) {
        console.log(`    LineItem: label="${item.label}", category="${item.category}", qty=${item.quantity}, unitPrice=${item.unitPrice}, totalPrice=${item.totalPrice}, openingNumber=${item.openingNumber}`);
      }

      console.log(`\n  Contracts count: ${appt.contracts.length}`);
      for (const contract of appt.contracts) {
        console.log(`    Contract: ID=${contract.id}, version=${contract.version}, status=${contract.status}`);
        console.log(`    FormData: ${contract.formData ? contract.formData.substring(0, 500) + '...' : 'null'}`);
      }
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
