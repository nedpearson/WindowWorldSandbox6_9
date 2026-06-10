#!/usr/bin/env node
// Cleanup orphaned FK rows before prisma db push
// Safe to run on every container startup — silently skips tables that don't exist yet
const { Client } = require('pg');

const client = new Client({ connectionString: process.env.DATABASE_URL });

const CLEANUPS = [
  `DELETE FROM "PropertyResearchSource" WHERE "companyId" NOT IN (SELECT id FROM "Company")`,
  `DELETE FROM "OpeningSuggestion" WHERE "companyId" NOT IN (SELECT id FROM "Company")`,
  `DELETE FROM "QuickQuoteResearchSession" WHERE "companyId" NOT IN (SELECT id FROM "Company")`,
  `DELETE FROM "PropertyResearchProfile" WHERE "companyId" NOT IN (SELECT id FROM "Company")`,
];

async function run() {
  try {
    await client.connect();
    for (const sql of CLEANUPS) {
      try {
        const result = await client.query(sql);
        if (result.rowCount > 0) {
          console.log(`[cleanup] Removed ${result.rowCount} orphaned row(s): ${sql.split('"')[1]}`);
        }
      } catch (_) {
        // Table may not exist yet — that's fine
      }
    }
  } catch (err) {
    console.warn('[cleanup] Could not connect to DB for pre-migration cleanup:', err.message);
  } finally {
    await client.end().catch(() => {});
  }
}

run();
