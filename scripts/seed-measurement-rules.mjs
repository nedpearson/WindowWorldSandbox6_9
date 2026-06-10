// seed-measurement-rules.mjs — runs locally against the production Supabase DB
// via the DATABASE_URL in server/.env
// Usage: node scripts/seed-measurement-rules.mjs

import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../server/.env') });

const prisma = new PrismaClient();

const DEFAULT_RULES = [
  {
    name: 'Width Takeoff — Retrofit',
    notes: 'Measure width at narrowest point for retrofit (insert). Use full opening for full-frame replacement.',
    actionType: 'measure',
    requiresConfirmation: true,
    requiresPhoto: false,
    requiresNote: false,
    severity: 'required',
    active: true,
    status: 'active',
  },
  {
    name: 'Height Takeoff — Retrofit',
    notes: 'Measure height at shortest point. Deduct 1/4" per side for rough opening clearance.',
    actionType: 'measure',
    requiresConfirmation: true,
    requiresPhoto: false,
    requiresNote: false,
    severity: 'required',
    active: true,
    status: 'active',
  },
  {
    name: 'Window Type Selection',
    notes: 'Select product type before measuring. Window type determines rough opening deductions.',
    actionType: 'select',
    requiresConfirmation: true,
    requiresPhoto: false,
    requiresNote: false,
    severity: 'required',
    active: true,
    status: 'active',
  },
  {
    name: 'Exterior Surface Type',
    notes: 'Identify exterior surface: vinyl siding, wood, brick, stucco, Hardie. Affects install method and material.',
    actionType: 'select',
    requiresConfirmation: true,
    requiresPhoto: true,
    requiresNote: false,
    severity: 'required',
    active: true,
    status: 'active',
  },
  {
    name: 'Install Type',
    notes: 'Retrofit (insert) or full-frame replacement. Retrofit requires existing frame in good condition.',
    actionType: 'select',
    requiresConfirmation: true,
    requiresPhoto: false,
    requiresNote: false,
    severity: 'required',
    active: true,
    status: 'active',
  },
  {
    name: 'Status Confirmation',
    notes: 'Rep must confirm opening status: active, needs-verification, or flagged before proceeding.',
    actionType: 'confirm',
    requiresConfirmation: true,
    requiresPhoto: false,
    requiresNote: false,
    severity: 'required',
    active: true,
    status: 'active',
  },
  {
    name: 'Required Photo — Opening',
    notes: 'At least one photo required per opening. Interior and exterior photos preferred for QA.',
    actionType: 'photo',
    requiresConfirmation: false,
    requiresPhoto: true,
    requiresNote: false,
    severity: 'required',
    active: true,
    status: 'active',
  },
  {
    name: 'QA Review — Flagged Openings',
    notes: 'Openings flagged needsVerification must be reviewed by office before proposal generation.',
    actionType: 'review',
    requiresConfirmation: true,
    requiresPhoto: false,
    requiresNote: true,
    severity: 'warning',
    active: true,
    status: 'active',
  },
  {
    name: 'Brick Opening — 3-Point Measure',
    notes: 'For brick openings: measure width/height at 3 points (top/mid/bottom), use smallest. Min depth 3.25".',
    actionType: 'measure',
    requiresConfirmation: true,
    requiresPhoto: true,
    requiresNote: true,
    severity: 'required',
    active: true,
    status: 'active',
  },
];

async function seedRules() {
  console.log('Seeding 9 default measurement rules against production Supabase...\n');
  let created = 0;
  let skipped = 0;

  for (const rule of DEFAULT_RULES) {
    const existing = await prisma.measurementRule.findFirst({ where: { name: rule.name } });
    if (existing) {
      console.log(`  SKIP   "${rule.name}"`);
      skipped++;
    } else {
      await prisma.measurementRule.create({ data: rule });
      console.log(`  CREATE "${rule.name}"`);
      created++;
    }
  }

  console.log(`\n✅ Done. Created: ${created}, Skipped (already exist): ${skipped}`);
  await prisma.$disconnect();
}

seedRules().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
