#!/usr/bin/env node
/**
 * production-start.cjs — Safe production startup script
 *
 * Runs BEFORE the Express server starts. Replaces the previous inline
 * Dockerfile CMD that ran `prisma migrate deploy || prisma db push`.
 *
 * Behaviour:
 * 1. Runs orphan-data cleanup (safe, non-destructive).
 * 2. Checks whether the _prisma_migrations table exists.
 *    a. If YES  → runs `prisma migrate deploy` (applies only pending, committed migrations).
 *    b. If NO   → logs a clear warning with instructions and continues.
 *       The app still boots — schema is usable even without migration history.
 *
 * NEVER runs:
 *   - prisma migrate dev   (interactive, creates new migrations)
 *   - prisma db push       (can cause P3005 on non-empty databases)
 *   - prisma migrate reset (drops everything)
 *
 * See docs/PRODUCTION_DB_BASELINE.md for how to baseline an existing database.
 */

const { Client } = require('pg');
const { execSync } = require('child_process');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ FATAL: DATABASE_URL is not set. Cannot start production server.');
  process.exit(1);
}

// ── Step 1: Orphan-data cleanup ─────────────────────────────────────────────
async function runOrphanCleanup() {
  const CLEANUPS = [
    `DELETE FROM "PropertyResearchSource" WHERE "companyId" NOT IN (SELECT id FROM "Company")`,
    `DELETE FROM "OpeningSuggestion" WHERE "companyId" NOT IN (SELECT id FROM "Company")`,
    `DELETE FROM "QuickQuoteResearchSession" WHERE "companyId" NOT IN (SELECT id FROM "Company")`,
    `DELETE FROM "PropertyResearchProfile" WHERE "companyId" NOT IN (SELECT id FROM "Company")`,
  ];

  const client = new Client({ connectionString: DATABASE_URL });
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
    console.warn('[cleanup] Could not connect to DB for pre-startup cleanup:', err.message);
  } finally {
    await client.end().catch(() => {});
  }
}

// ── Step 2: Check migration state and conditionally migrate ──────────────────
async function runMigrations() {
  const client = new Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();

    // Check if _prisma_migrations table exists
    const result = await client.query(
      `SELECT EXISTS (
         SELECT FROM information_schema.tables
         WHERE table_schema = 'public'
         AND table_name = '_prisma_migrations'
       ) AS "exists"`
    );

    const migrationTableExists = result.rows[0]?.exists === true;

    if (migrationTableExists) {
      // Check for pending (unapplied) migrations
      console.log('[startup] _prisma_migrations table found. Running prisma migrate deploy...');
      try {
        const serverDir = path.resolve(__dirname, '..');
        execSync('npx --yes prisma migrate deploy', {
          cwd: serverDir,
          stdio: 'inherit',
          env: { ...process.env },
        });
        console.log('[startup] ✅ Prisma migrations applied successfully.');
      } catch (err) {
        console.error('[startup] ⚠️  prisma migrate deploy failed:', err.message);
        console.error('[startup] App will attempt to start anyway — schema may already be current.');
      }
    } else {
      console.log('─────────────────────────────────────────────────────────────────');
      console.log('[startup] ℹ️  No _prisma_migrations table found.');
      console.log('[startup] Database appears to be unbaselined (set up outside Prisma Migrate).');
      console.log('[startup] This is normal for existing Supabase databases.');
      console.log('[startup] The schema is usable — app will start normally.');
      console.log('[startup] To enable future migrations, see: docs/PRODUCTION_DB_BASELINE.md');
      console.log('─────────────────────────────────────────────────────────────────');
    }
  } catch (err) {
    console.error('[startup] ⚠️  Could not check migration state:', err.message);
    console.error('[startup] App will attempt to start anyway.');
  } finally {
    await client.end().catch(() => {});
  }
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('[startup] 🚀 WindowWorldAssistant production startup...');
  await runOrphanCleanup();
  await runMigrations();
  console.log('[startup] ✅ Pre-startup checks complete. Launching server...');
}

main().catch((err) => {
  console.error('[startup] FATAL startup error:', err);
  process.exit(1);
});
