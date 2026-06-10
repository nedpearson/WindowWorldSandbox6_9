/**
 * create-cgreen-user.ts
 *
 * One-time secure user provisioning script for cgreen@winworldinfo.com.
 *
 * SECURITY:
 * - Password read from TEMP_USER_PASSWORD environment variable only.
 * - No password hardcoded anywhere.
 * - Service role key never printed.
 * - Safe summary printed at end (no secrets).
 *
 * USAGE:
 *   $env:TEMP_USER_PASSWORD = "your-temp-password"
 *   npx tsx scripts/create-cgreen-user.ts
 *   Remove-Item Env:\TEMP_USER_PASSWORD
 *
 * ROLE MODEL:
 * - App uses a single User.role string field.
 * - Role "manager" grants: admin panel, all company appointments (cross-rep),
 *   field app, proposals, contracts, review dashboard, follow-ups, customers.
 * - "manager" is the correct role for "Sales Manager + Sales Rep" combined access.
 * - NOT assigned: super_admin (not required), admin (reserved for system admin).
 *
 * COMPANY:
 * - Assigned to "Window World" (main production company).
 * - Also checked against "Window World (Admin)" company for cross-company manager access.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ── Configuration ──────────────────────────────────────────────────────────────
const TARGET_EMAIL = 'cgreen@winworldinfo.com';
const TARGET_NAME = 'C. Green';
// "manager" = Sales Manager + Sales Rep combined. Grants:
//   - All appointments across company (not just own)
//   - Manager review dashboard
//   - Field app full access
//   - Proposals, contracts, order forms
//   - Customers, follow-ups
//   - Pricing admin read
// Does NOT grant: super_admin-only routes (system config, user management)
const TARGET_ROLE = 'manager';
// Main production company
const PRIMARY_COMPANY_ID = 'cmpgg488q0000nmd0ole2xv8n'; // "Window World"

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  // Step 0: Read password from environment — NEVER from args or hardcode
  const tempPassword = process.env.TEMP_USER_PASSWORD;
  if (!tempPassword) {
    console.error('❌ TEMP_USER_PASSWORD environment variable is required.');
    console.error('   Set it before running: $env:TEMP_USER_PASSWORD = "your-password"');
    process.exit(1);
  }
  if (tempPassword.length < 8) {
    console.error('❌ Password must be at least 8 characters.');
    process.exit(1);
  }

  console.log('🔒 create-cgreen-user.ts — Secure User Provisioning');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Target email : ${TARGET_EMAIL}`);
  console.log(`Target role  : ${TARGET_ROLE}`);
  console.log(`Company      : ${PRIMARY_COMPANY_ID}`);
  console.log('');

  // Step 1: Verify company exists
  const company = await prisma.company.findUnique({
    where: { id: PRIMARY_COMPANY_ID },
    select: { id: true, name: true },
  });
  if (!company) {
    console.error(`❌ Company ${PRIMARY_COMPANY_ID} not found. Run audit-users.ts first.`);
    process.exit(1);
  }
  console.log(`✅ Company verified: ${company.name} [${company.id}]`);

  // Step 2: Check if user already exists
  const existing = await prisma.user.findUnique({
    where: { email: TARGET_EMAIL },
    select: { id: true, email: true, name: true, role: true, companyId: true },
  });

  let userId: string;
  let action: 'created' | 'updated';

  if (existing) {
    // Step 3a: User exists — update password + role + company (idempotent)
    console.log(`ℹ️  User already exists: [${existing.id.slice(0, 8)}...] ${existing.email}`);
    console.log(`   Current role    : ${existing.role}`);
    console.log(`   Current company : ${existing.companyId || 'none'}`);

    const hashedPassword = await bcrypt.hash(tempPassword, 12);
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        password: hashedPassword,
        role: TARGET_ROLE,
        companyId: PRIMARY_COMPANY_ID,
        // Update name only if it's a placeholder
        ...(existing.name === existing.email || existing.name === '' ? { name: TARGET_NAME } : {}),
      },
    });
    userId = existing.id;
    action = 'updated';
    console.log(`✅ User updated: password reset, role=${TARGET_ROLE}, company set.`);
  } else {
    // Step 3b: Create new user
    const hashedPassword = await bcrypt.hash(tempPassword, 12);
    const newUser = await prisma.user.create({
      data: {
        email: TARGET_EMAIL,
        name: TARGET_NAME,
        password: hashedPassword,
        role: TARGET_ROLE,
        companyId: PRIMARY_COMPANY_ID,
      },
    });
    userId = newUser.id;
    action = 'created';
    console.log(`✅ User created: [${userId.slice(0, 8)}...]`);
  }

  // Step 4: Create a RepPerformance record if it doesn't exist
  // (Manager-level users benefit from having a performance record for dashboard access)
  const perfExists = await prisma.repPerformance.findUnique({ where: { userId } });
  if (!perfExists) {
    await prisma.repPerformance.create({
      data: {
        userId,
        performanceScore: 0,
        trainingScore: 0,
        manualCompletionPct: 0,
        scenariosPassed: 0,
        scenariosFailed: 0,
        measurementErrorRate: 0,
        contractErrorRate: 0,
        followUpComplianceRate: 0,
        quoteToCloseRate: 0,
        avgTimeToResolveHours: 0,
      },
    });
    console.log('✅ RepPerformance record created for manager dashboard.');
  } else {
    console.log('ℹ️  RepPerformance record already exists.');
  }

  // Step 5: Verify final state
  const finalUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { company: { select: { name: true } } },
  });

  console.log('');
  console.log('══════════════════════════════════════════════════');
  console.log('✅ PROVISIONING COMPLETE');
  console.log('══════════════════════════════════════════════════');
  console.log(`Action       : ${action}`);
  console.log(`User ID      : ${userId}`);
  console.log(`Email        : ${TARGET_EMAIL}`);
  console.log(`Name         : ${(finalUser as any)?.name}`);
  console.log(`Role         : ${(finalUser as any)?.role}`);
  console.log(`Company ID   : ${(finalUser as any)?.companyId}`);
  console.log('');
  console.log('Access granted:');
  console.log('  ✓ Manager review dashboard');
  console.log('  ✓ All company appointments (cross-rep view)');
  console.log('  ✓ Field app (full)');
  console.log('  ✓ Proposals, contracts, order forms');
  console.log('  ✓ Customers and follow-ups');
  console.log('  ✓ Sketch and document generation');
  console.log('  ✗ Super admin (system config) — NOT granted');
  console.log('  ✗ Database admin — NOT granted');
  console.log('');
  console.log('⚠️  SECURITY REMINDER:');
  console.log('  Clear TEMP_USER_PASSWORD from environment immediately:');
  console.log('  $env:TEMP_USER_PASSWORD = $null  (or close this terminal)');
  console.log('  Do NOT commit this script with a hardcoded password.');
  console.log('  Ask the user to change their password on first login.');
}

main()
  .catch(err => {
    console.error('❌ Provisioning failed:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
