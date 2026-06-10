import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const sandboxUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/windowworldsandbox?schema=public";

async function main() {
  console.log("Starting verification of sandbox database...");
  const client = new pg.Client({ connectionString: sandboxUrl });

  try {
    await client.connect();

    // Verify row counts of key tables
    const tables = ['User', 'Customer', 'Appointment', 'Opening', 'PricingVersion', 'PricingVersionItem', 'SketchExport'];
    console.log("\n--- Table Row Counts ---");
    for (const table of tables) {
      const res = await client.query(`SELECT COUNT(*) FROM "${table}";`);
      console.log(`${table}: ${res.rows[0].count} rows`);
    }

    // Verify User table sanitization
    console.log("\n--- User Table Sample Check ---");
    const usersRes = await client.query(`SELECT id, email, name FROM "User";`);
    for (const u of usersRes.rows) {
      console.log(`User ID: ${u.id}`);
      console.log(`  Name: ${u.name}`);
      console.log(`  Email: ${u.email}`);
      if (u.name.toLowerCase().includes('pearson') && u.email !== 'nedpearson@gmail.com') {
        console.error("  [WARNING] Possible unsanitized name or email found!");
      }
    }

    // Verify Customer table sanitization
    console.log("\n--- Customer Table Sample Check (First 3 rows) ---");
    const customersRes = await client.query(`SELECT id, "firstName", "lastName", email, phone, address FROM "Customer" LIMIT 3;`);
    for (const c of customersRes.rows) {
      console.log(`Customer ID: ${c.id}`);
      console.log(`  First Name: ${c.firstName}`);
      console.log(`  Last Name: ${c.lastName}`);
      console.log(`  Email: ${c.email}`);
      console.log(`  Phone: ${c.phone}`);
      console.log(`  Address: ${c.address}`);
      
      const containsPII = (val: string) => {
        if (!val) return false;
        // Simple heuristic to check if phone is not 555 or address is not Main St
        return !val.includes('Customer') && !val.includes('555') && !val.includes('Main St') && !val.includes('example.com');
      };
      
      if (containsPII(c.firstName) || containsPII(c.lastName) || containsPII(c.email) || containsPII(c.phone) || containsPII(c.address)) {
        console.error("  [WARNING] Unsanitized values may be present!");
      }
    }

    // Verify Appointment table sanitization
    console.log("\n--- Appointment Table Sample Check (First 3 rows) ---");
    const appointmentsRes = await client.query(`SELECT id, "jobAddress", "jobCity", "poNumber", "accountNumber" FROM "Appointment" LIMIT 3;`);
    for (const a of appointmentsRes.rows) {
      console.log(`Appointment ID: ${a.id}`);
      console.log(`  Job Address: ${a.jobAddress}`);
      console.log(`  Job City: ${a.jobCity}`);
      console.log(`  PO Number: ${a.poNumber}`);
      console.log(`  Account Number: ${a.accountNumber}`);
    }

    console.log("\nVerification complete!");

  } catch (e: any) {
    console.error("Verification error:", e.message);
  } finally {
    await client.end();
  }
}

main();
