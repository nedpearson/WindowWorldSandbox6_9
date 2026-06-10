/**
 * ═══════════════════════════════════════════════════════════════════════════
 * prod-check.ts  —  Window World Assistant Production Readiness Check
 *
 * Usage (from server/):
 *   npx ts-node --esm scripts/prod-check.ts
 *   -- or --
 *   npx tsx scripts/prod-check.ts
 *
 * Exit codes:
 *   0  All checks passed
 *   1  One or more CRITICAL issues found
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Colours for terminal output ────────────────────────────────────────────
const C = {
  reset : '\x1b[0m',
  bold  : '\x1b[1m',
  red   : '\x1b[31m',
  green : '\x1b[32m',
  yellow: '\x1b[33m',
  cyan  : '\x1b[36m',
  grey  : '\x1b[90m',
};

function ok(msg: string)   { console.log(`  ${C.green}✓${C.reset} ${msg}`); }
function warn(msg: string)  { console.log(`  ${C.yellow}⚠${C.reset} ${msg}`); }
function fail(msg: string)  { console.log(`  ${C.red}✗${C.reset} ${msg}`); }
function info(msg: string)  { console.log(`  ${C.grey}ℹ${C.reset} ${msg}`); }
function h1(msg: string)    { console.log(`\n${C.bold}${C.cyan}${msg}${C.reset}`); }
function h2(msg: string)    { console.log(`\n${C.bold}${msg}${C.reset}`); }
function rule()             { console.log('─'.repeat(60)); }

// ─── Issue tracking ──────────────────────────────────────────────────────────
interface Issue { severity: 'critical' | 'warning' | 'info'; message: string; }
const issues: Issue[] = [];

function addIssue(severity: Issue['severity'], message: string) {
  issues.push({ severity, message });
  if (severity === 'critical') fail(message);
  else if (severity === 'warning') warn(message);
  else info(message);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function rawCount(sql: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(sql);
  return Number(rows[0]?.count ?? 0);
}

// ═════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  Window World Assistant — Prod Readiness Check  ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════╝${C.reset}`);
  console.log(`  Run at: ${new Date().toISOString()}\n`);

  // ─── 1. Table record counts ────────────────────────────────────────────────
  h1('1. Key Table Counts');
  rule();

  const counts = {
    Company      : await prisma.company.count(),
    User         : await prisma.user.count(),
    Customer     : await prisma.customer.count(),
    Appointment  : await prisma.appointment.count(),
    Opening      : await prisma.opening.count(),
    FormSketch   : await prisma.formSketch.count(),
    SketchMarker : await prisma.sketchMarker.count(),
    SketchMarkerLink: await prisma.sketchMarkerLink.count(),
    PricingVersion: await prisma.pricingVersion.count(),
  };

  const TABLE_COL = 22;
  for (const [table, count] of Object.entries(counts)) {
    const pad = ' '.repeat(Math.max(1, TABLE_COL - table.length));
    const countStr = count.toLocaleString();
    info(`${table}${pad}${C.bold}${countStr}${C.reset}`);

    if (count === 0) {
      addIssue('warning', `Table "${table}" has 0 rows — expected some data in production`);
    }
  }

  // ─── 2. Required-field NULL violations ────────────────────────────────────
  h1('2. Required-Field NULL Violations');
  rule();

  // Opening — width or height NULL
  const openingsNoWidth = await rawCount(
    `SELECT COUNT(*) FROM "Opening" WHERE "width" IS NULL`
  );
  const openingsNoHeight = await rawCount(
    `SELECT COUNT(*) FROM "Opening" WHERE "height" IS NULL`
  );
  const openingsNullUI = await rawCount(
    `SELECT COUNT(*) FROM "Opening" WHERE "unitedInches" IS NULL AND "width" IS NOT NULL AND "height" IS NOT NULL`
  );

  if (openingsNoWidth > 0) {
    addIssue('critical', `${openingsNoWidth} Opening(s) have NULL width — will break pricing engine`);
  } else {
    ok(`All Openings have a width`);
  }

  if (openingsNoHeight > 0) {
    addIssue('critical', `${openingsNoHeight} Opening(s) have NULL height — will break pricing engine`);
  } else {
    ok(`All Openings have a height`);
  }

  if (openingsNullUI > 0) {
    addIssue('warning', `${openingsNullUI} Opening(s) have NULL unitedInches despite having width+height (run backfill)`);
  } else {
    ok(`All Openings with width+height have unitedInches`);
  }

  // Opening — screenOption NULL
  const openingsNoScreen = await rawCount(
    `SELECT COUNT(*) FROM "Opening" WHERE "screenOption" IS NULL`
  );
  if (openingsNoScreen > 0) {
    addIssue('warning', `${openingsNoScreen} Opening(s) have NULL screenOption (run backfill)`);
  } else {
    ok(`All Openings have a screenOption`);
  }

  // Opening — gridPattern NULL
  const openingsNoGrid = await rawCount(
    `SELECT COUNT(*) FROM "Opening" WHERE "gridPattern" IS NULL`
  );
  if (openingsNoGrid > 0) {
    addIssue('warning', `${openingsNoGrid} Opening(s) have NULL gridPattern (run backfill)`);
  } else {
    ok(`All Openings have a gridPattern`);
  }

  // Opening — glassPackage NULL
  const openingsNoGlass = await rawCount(
    `SELECT COUNT(*) FROM "Opening" WHERE "glassPackage" IS NULL`
  );
  if (openingsNoGlass > 0) {
    addIssue('warning', `${openingsNoGlass} Opening(s) have NULL glassPackage (should default to 'LEE')`);
  } else {
    ok(`All Openings have a glassPackage`);
  }

  // Appointment — status NULL
  const apptNoStatus = await rawCount(
    `SELECT COUNT(*) FROM "Appointment" WHERE "status" IS NULL`
  );
  if (apptNoStatus > 0) {
    addIssue('critical', `${apptNoStatus} Appointment(s) have NULL status`);
  } else {
    ok(`All Appointments have a status`);
  }

  // User — password NULL (should never happen)
  const usersNoPassword = await rawCount(
    `SELECT COUNT(*) FROM "User" WHERE "password" IS NULL OR "password" = ''`
  );
  if (usersNoPassword > 0) {
    addIssue('critical', `${usersNoPassword} User(s) have no password hash — authentication broken`);
  } else {
    ok(`All Users have a password hash`);
  }

  // ─── 3. Orphan records ────────────────────────────────────────────────────
  h1('3. Orphan Records');
  rule();

  // SketchMarkers whose sketch is gone
  const orphanMarkers = await rawCount(
    `SELECT COUNT(*) FROM "SketchMarker" sm
     WHERE NOT EXISTS (SELECT 1 FROM "FormSketch" fs WHERE fs.id = sm."sketchId")`
  );
  if (orphanMarkers > 0) {
    addIssue('critical', `${orphanMarkers} SketchMarker(s) are orphaned (no parent FormSketch)`);
  } else {
    ok(`No orphan SketchMarkers`);
  }

  // SketchMarkerLinks whose marker is gone
  const orphanLinks = await rawCount(
    `SELECT COUNT(*) FROM "SketchMarkerLink" sml
     WHERE NOT EXISTS (SELECT 1 FROM "SketchMarker" sm WHERE sm.id = sml."markerId")`
  );
  if (orphanLinks > 0) {
    addIssue('critical', `${orphanLinks} SketchMarkerLink(s) are orphaned (no parent SketchMarker)`);
  } else {
    ok(`No orphan SketchMarkerLinks`);
  }

  // FormSketches whose appointment is gone
  const orphanSketches = await rawCount(
    `SELECT COUNT(*) FROM "FormSketch" fs
     WHERE NOT EXISTS (SELECT 1 FROM "Appointment" a WHERE a.id = fs."appointmentId")`
  );
  if (orphanSketches > 0) {
    addIssue('critical', `${orphanSketches} FormSketch(es) are orphaned (no parent Appointment)`);
  } else {
    ok(`No orphan FormSketches`);
  }

  // Openings whose appointment is gone
  const orphanOpenings = await rawCount(
    `SELECT COUNT(*) FROM "Opening" o
     WHERE NOT EXISTS (SELECT 1 FROM "Appointment" a WHERE a.id = o."appointmentId")`
  );
  if (orphanOpenings > 0) {
    addIssue('critical', `${orphanOpenings} Opening(s) are orphaned (no parent Appointment)`);
  } else {
    ok(`No orphan Openings`);
  }

  // ─── 4. Duplicate guard ───────────────────────────────────────────────────
  h1('4. Duplicate Data');
  rule();

  // Duplicate SketchMarkers (same sketchId+elevation+markerType+markerNumber)
  const dupeMarkers = await rawCount(
    `SELECT COUNT(*) FROM (
       SELECT "sketchId", "elevation", "markerType", "markerNumber", COUNT(*) AS cnt
       FROM "SketchMarker"
       WHERE "markerNumber" IS NOT NULL
       GROUP BY "sketchId", "elevation", "markerType", "markerNumber"
       HAVING COUNT(*) > 1
     ) dups`
  );
  if (dupeMarkers > 0) {
    addIssue('critical', `${dupeMarkers} duplicate SketchMarker group(s) detected — run deduplication backfill`);
  } else {
    ok(`No duplicate SketchMarkers`);
  }

  // Duplicate Users (same email)
  const dupeUsers = await rawCount(
    `SELECT COUNT(*) FROM (
       SELECT email, COUNT(*) AS cnt FROM "User" GROUP BY email HAVING COUNT(*) > 1
     ) dups`
  );
  if (dupeUsers > 0) {
    addIssue('critical', `${dupeUsers} duplicate User email(s) found — integrity violation`);
  } else {
    ok(`No duplicate User emails`);
  }

  // ─── 5. Test / seed data in production ───────────────────────────────────
  h1('5. Test / Demo Data Presence');
  rule();

  const demoUsers = await rawCount(
    `SELECT COUNT(*) FROM "User" WHERE "email" ILIKE '%demo%' OR "email" ILIKE '%test%' OR "email" ILIKE '%seed%'`
  );
  if (demoUsers > 0) {
    addIssue('warning', `${demoUsers} demo/test User(s) found — remove before going fully live`);
  } else {
    ok(`No obvious demo/test users`);
  }

  const seedCustomers = await rawCount(
    `SELECT COUNT(*) FROM "Customer"
     WHERE "email" ILIKE '%@email.com'     -- seed data uses @email.com placeholder domain
        OR "lastName" IN ('Robertson', 'Mitchell', 'Thibodeaux', 'Guidry', 'Landry')
    `
  );
  if (seedCustomers > 0) {
    addIssue('warning', `${seedCustomers} seed Customer record(s) detected (placeholder emails / known seed names)`);
  } else {
    ok(`No obvious seed Customers`);
  }

  // ─── 6. PricingVersion published check ───────────────────────────────────
  h1('6. Pricing Readiness');
  rule();

  const publishedPV = await rawCount(
    `SELECT COUNT(*) FROM "PricingVersion" WHERE "status" = 'published'`
  );
  if (publishedPV === 0) {
    addIssue('critical', `No published PricingVersion found — pricing engine will fail`);
  } else {
    ok(`${publishedPV} published PricingVersion(s) found`);
  }

  const pvWithItems = await rawCount(
    `SELECT COUNT(DISTINCT pv.id)
     FROM "PricingVersion" pv
     JOIN "PricingVersionItem" pvi ON pvi."pricingVersionId" = pv.id
     WHERE pv.status = 'published'`
  );
  if (pvWithItems === 0 && publishedPV > 0) {
    addIssue('critical', `Published PricingVersion(s) have 0 items — pricing engine will produce $0 quotes`);
  } else if (pvWithItems > 0) {
    ok(`Published PricingVersion(s) have pricing items`);
  }

  // ─── 7. Summary ───────────────────────────────────────────────────────────
  h1('7. Summary');
  rule();

  const criticals = issues.filter(i => i.severity === 'critical');
  const warnings  = issues.filter(i => i.severity === 'warning');

  if (criticals.length === 0 && warnings.length === 0) {
    console.log(`\n  ${C.green}${C.bold}✅  All checks passed — system appears production-ready.${C.reset}\n`);
  } else {
    if (criticals.length > 0) {
      console.log(`\n  ${C.red}${C.bold}✗  ${criticals.length} CRITICAL issue(s):${C.reset}`);
      criticals.forEach(i => console.log(`     ${C.red}• ${i.message}${C.reset}`));
    }
    if (warnings.length > 0) {
      console.log(`\n  ${C.yellow}${C.bold}⚠  ${warnings.length} WARNING(s):${C.reset}`);
      warnings.forEach(i => console.log(`     ${C.yellow}• ${i.message}${C.reset}`));
    }
    console.log('');
  }

  process.exit(criticals.length > 0 ? 1 : 0);
}

// ─── Entry point ─────────────────────────────────────────────────────────────
main()
  .catch((err) => {
    console.error(`\n${C.red}FATAL:${C.reset}`, err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
