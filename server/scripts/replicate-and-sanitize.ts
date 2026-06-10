import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load env variables
dotenv.config();

const prodUrl = "postgresql://postgres.pwzrhpdfityxloacqxvz:aV6OJAM9%40lVlaun1@aws-1-us-west-2.pooler.supabase.com:5432/postgres";
const sandboxUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/windowworldsandbox?schema=public";

const BCRYPT_PASSWORD_HASH = "$2a$10$vI8aWBndcE.J2.g92L2uLePZpZO3g27KNu5p5j0zUe7uQeS9FpX2K"; // bcrypt hash for 'password'

async function main() {
  console.log("Starting replication and sanitization...");
  console.log("Production URL:", prodUrl.split('@')[1] || prodUrl);
  console.log("Sandbox URL:", sandboxUrl.split('@')[1] || sandboxUrl);

  const prodClient = new pg.Client({ connectionString: prodUrl });
  const sandboxClient = new pg.Client({ connectionString: sandboxUrl });

  try {
    await prodClient.connect();
    console.log("Connected to production database.");

    await sandboxClient.connect();
    console.log("Connected to sandbox database.");

    // Disable triggers and foreign keys in sandbox session for bulk copy
    await sandboxClient.query("SET session_replication_role = 'replica';");
    console.log("Bypassed foreign keys and triggers via 'replica' session role.");

    // Query all tables in public schema of production
    const tablesRes = await prodClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tables = tablesRes.rows.map(r => r.table_name);
    console.log(`Found ${tables.length} tables in production schema.`);

    // Truncate all tables at once at the beginning to avoid cascade delete issues during the loop
    const truncateTables = tables.filter(t => t !== '_prisma_migrations').map(t => `"${t}"`).join(', ');
    await sandboxClient.query(`TRUNCATE TABLE ${truncateTables} CASCADE;`);
    console.log("Truncated all sandbox tables.");

    for (const table of tables) {
      // Skip Prisma migrations table since migrations were already deployed
      if (table === '_prisma_migrations') {
        continue;
      }

      // Check if table has rows in production
      const countRes = await prodClient.query(`SELECT COUNT(*) FROM "${table}";`);
      const count = parseInt(countRes.rows[0].count, 10);
      if (count === 0) {
        continue;
      }

      console.log(`Replicating table "${table}" (${count} rows)...`);

      // Fetch all rows from production
      const rowsRes = await prodClient.query(`SELECT * FROM "${table}";`);
      const rows = rowsRes.rows;

      if (rows.length === 0) continue;

      // Sanitize rows if necessary
      const sanitizedRows = rows.map((row, idx) => {
        const sanitized = { ...row };

        if (table === 'User') {
          sanitized.name = `User ${idx + 1}`;
          sanitized.email = sanitized.email.toLowerCase().includes('nedpearson') 
            ? 'nedpearson@gmail.com' 
            : `user_${idx + 1}@example.com`;
          sanitized.password = BCRYPT_PASSWORD_HASH;
          sanitized.avatarUrl = null;
        } 
        else if (table === 'Customer') {
          sanitized.firstName = `CustomerFirstName_${idx + 1}`;
          sanitized.lastName = `CustomerLastName_${idx + 1}`;
          if (sanitized.email) {
            sanitized.email = `customer_${idx + 1}@example.com`;
          }
          if (sanitized.phone) {
            sanitized.phone = '555-0100';
          }
          if (sanitized.phone2) {
            sanitized.phone2 = '555-0101';
          }
          if (sanitized.address) {
            sanitized.address = '123 Main St';
          }
          if (sanitized.city) {
            sanitized.city = 'Baton Rouge';
          }
          if (sanitized.zip) {
            sanitized.zip = '70801';
          }
          if (sanitized.notes) {
            sanitized.notes = 'Sanitized notes';
          }
        } 
        else if (table === 'Appointment') {
          if (sanitized.jobAddress) {
            sanitized.jobAddress = '123 Main St';
          }
          if (sanitized.jobCity) {
            sanitized.jobCity = 'Baton Rouge';
          }
          if (sanitized.jobZip) {
            sanitized.jobZip = '70801';
          }
          if (sanitized.notes) {
            sanitized.notes = 'Sanitized notes';
          }
          if (sanitized.estimatorNotes) {
            sanitized.estimatorNotes = 'Sanitized estimator notes';
          }
          if (sanitized.installerNotes) {
            sanitized.installerNotes = 'Sanitized installer notes';
          }
          if (sanitized.officeNotes) {
            sanitized.officeNotes = 'Sanitized office notes';
          }
          if (sanitized.poNumber) {
            sanitized.poNumber = `PO-${idx + 1}`;
          }
          if (sanitized.accountNumber) {
            sanitized.accountNumber = `ACC-${idx + 1}`;
          }
        } 
        else if (table === 'PropertyImageCache') {
          sanitized.normalizedAddress = '123 Main St, Baton Rouge, LA 70801';
          sanitized.formattedAddress = '123 Main St, Baton Rouge, LA 70801';
          sanitized.lat = 30.4515;
          sanitized.lng = -91.1871;
          if (sanitized.imageUrl) {
            sanitized.imageUrl = 'https://via.placeholder.com/600x400?text=Sanitized+Map';
          }
        } 
        else if (table === 'GeneratedDocument') {
          if (sanitized.pdfUrl) {
            sanitized.pdfUrl = `https://example.com/sanitized-docs/doc_${idx + 1}.pdf`;
          }
        } 
        else if (table === 'AuditLog') {
          if (sanitized.details) {
            sanitized.details = 'Sanitized details';
          }
        }
        else if (table === 'OpeningPhoto') {
          if (sanitized.originalUrl) sanitized.originalUrl = 'https://via.placeholder.com/800x600?text=Sanitized+Opening+Photo';
          if (sanitized.annotatedUrl) sanitized.annotatedUrl = 'https://via.placeholder.com/800x600?text=Sanitized+Annotated+Photo';
          if (sanitized.thumbnailUrl) sanitized.thumbnailUrl = 'https://via.placeholder.com/150x150?text=Thumb';
          sanitized.notes = sanitized.notes ? 'Sanitized photo notes' : null;
        }
        else if (table === 'AppointmentPhoto') {
          if (sanitized.photoUrl) sanitized.photoUrl = 'https://via.placeholder.com/800x600?text=Sanitized+Appointment+Photo';
          sanitized.description = sanitized.description ? 'Sanitized description' : null;
        }

        return sanitized;
      });

      // Construct and execute insert statements for all rows
      const columns = Object.keys(sanitizedRows[0]);
      const colNames = columns.map(c => `"${c}"`).join(', ');
      
      for (const row of sanitizedRows) {
        const values = columns.map(col => row[col]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const insertQuery = `INSERT INTO "${table}" (${colNames}) VALUES (${placeholders});`;
        await sandboxClient.query(insertQuery, values);
      }
      
      console.log(`Successfully replicated and sanitized "${table}".`);
    }

    // Restore normal trigger and RLS behavior in sandbox
    await sandboxClient.query("SET session_replication_role = 'origin';");
    console.log("Restored 'origin' session role.");
    console.log("Replication and sanitization complete!");

  } catch (e: any) {
    console.error("Replication error:", e.message);
    try {
      await sandboxClient.query("SET session_replication_role = 'origin';");
    } catch (_) {}
  } finally {
    await prodClient.end();
    await sandboxClient.end();
  }
}

main();
