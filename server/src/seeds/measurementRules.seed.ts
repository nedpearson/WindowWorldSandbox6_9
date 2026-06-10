/**
 * Seed script — seeds the 9 global measurement rules from the hardcoded
 * measurementRules.ts source into the MeasurementRule table.
 *
 * Idempotent: skips rules that already exist (matched by name + windowType + exteriorType + installType).
 *
 * Run from the server directory:
 *   npx ts-node --esm src/seeds/measurementRules.seed.ts
 * OR via npm script:
 *   npm run seed:measurement-rules
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GLOBAL_RULES = [
  {
    name: 'Oriel — Top Sash Measurement',
    description:
      'Oriel windows must always be measured using the TOP SASH. No width/height deduction is applied — the top sash measurement IS the order measurement. This rule enforces top sash confirmation.',
    status: 'verified',
    windowType: 'oriel',
    exteriorType: null,
    installType: null,
    widthTakeoffDecimal: 0,
    heightTakeoffDecimal: 0,
    requiresConfirmation: true,
    requiresPhoto: true,
    requiresNote: true,
    severity: 'blocker',
    version: 1,
    notes: 'Oriel: always use top sash measurement as-is for the order form.',
  },
  {
    name: 'Insert Install / Brick — Standard Takeoff',
    description:
      'Standard insert into brick opening. Apply 1/4" takeoff to width and height. NEEDS_VERIFICATION — confirm with Window World installer guidelines.',
    status: 'needs_verification',
    windowType: null,
    exteriorType: 'brick',
    installType: 'INT',
    widthTakeoffFraction: '1/4',
    widthTakeoffDecimal: 0.25,
    heightTakeoffFraction: '1/4',
    heightTakeoffDecimal: 0.25,
    requiresConfirmation: true,
    requiresPhoto: false,
    requiresNote: false,
    severity: 'high',
    version: 1,
    notes: 'NEEDS_VERIFICATION: confirm brick insert takeoff with Window World.',
  },
  {
    name: 'Full Frame Install / Siding — No Deduction',
    description:
      'Full frame replacement in siding opening. Measure rough opening width and height. No takeoff applied — uses full RO. NEEDS_VERIFICATION.',
    status: 'needs_verification',
    windowType: null,
    exteriorType: 'siding',
    installType: 'EXT',
    widthTakeoffDecimal: 0,
    heightTakeoffDecimal: 0,
    requiresConfirmation: true,
    requiresPhoto: false,
    requiresNote: true,
    severity: 'medium',
    version: 1,
    notes: 'NEEDS_VERIFICATION: confirm full-frame siding takeoff rules.',
  },
  {
    name: 'EXT Install / Brick — No Takeoff',
    description:
      'EXT (exterior) install in brick. Measure from the existing frame. No standard deduction. NEEDS_VERIFICATION.',
    status: 'needs_verification',
    windowType: null,
    exteriorType: 'brick',
    installType: 'EXT',
    widthTakeoffDecimal: 0,
    heightTakeoffDecimal: 0,
    requiresConfirmation: true,
    requiresPhoto: false,
    requiresNote: true,
    severity: 'medium',
    version: 1,
    notes: 'NEEDS_VERIFICATION: confirm EXT brick measurement protocol.',
  },
  {
    name: 'Circle Top — Radius Measurement',
    description:
      'Circle top windows require width, leg height, and rise measurement. Radius is computed as (rise/2) + (width²/8·rise). No standard width/height takeoff.',
    status: 'verified',
    windowType: 'circle_top',
    exteriorType: null,
    installType: null,
    widthTakeoffDecimal: 0,
    heightTakeoffDecimal: 0,
    requiresConfirmation: true,
    requiresPhoto: true,
    requiresNote: false,
    severity: 'high',
    version: 1,
    notes: 'Circle top: collect width, leg height, rise. App computes radius.',
  },
  {
    name: 'Eyebrow Window — Width + Rise + Leg Height',
    description:
      'Eyebrow windows require width, rise (center height), and left/right leg heights. NEEDS_VERIFICATION.',
    status: 'needs_verification',
    windowType: 'eyebrow',
    exteriorType: null,
    installType: null,
    widthTakeoffDecimal: 0,
    heightTakeoffDecimal: 0,
    requiresConfirmation: true,
    requiresPhoto: true,
    requiresNote: true,
    severity: 'high',
    version: 1,
    notes: 'NEEDS_VERIFICATION: confirm eyebrow measurement set.',
  },
  {
    name: 'Arch / Half Round — Width + Height + Rise',
    description:
      'Full arch/half-round: measure overall width and height. Rise = height. NEEDS_VERIFICATION.',
    status: 'needs_verification',
    windowType: 'arch',
    exteriorType: null,
    installType: null,
    widthTakeoffDecimal: 0,
    heightTakeoffDecimal: 0,
    requiresConfirmation: true,
    requiresPhoto: true,
    requiresNote: false,
    severity: 'high',
    version: 1,
    notes: 'NEEDS_VERIFICATION: confirm arch measurement protocol.',
  },
  {
    name: 'Quarter Arch — Width + Height + Leg Heights',
    description:
      'Quarter arch: width, height, left leg height, right leg height required. NEEDS_VERIFICATION.',
    status: 'needs_verification',
    windowType: 'quarter_arch',
    exteriorType: null,
    installType: null,
    widthTakeoffDecimal: 0,
    heightTakeoffDecimal: 0,
    requiresConfirmation: true,
    requiresPhoto: true,
    requiresNote: true,
    severity: 'high',
    version: 1,
    notes: 'NEEDS_VERIFICATION: confirm quarter arch dimension requirements.',
  },
  {
    name: 'Patio Door — Rough Opening Measurement',
    description:
      'Patio doors: measure rough opening width and height. Confirm door swing direction and panel configuration. NEEDS_VERIFICATION for takeoff.',
    status: 'needs_verification',
    windowType: 'patio_door',
    exteriorType: null,
    installType: null,
    widthTakeoffDecimal: 0,
    heightTakeoffDecimal: 0,
    requiresConfirmation: true,
    requiresPhoto: false,
    requiresNote: true,
    severity: 'high',
    version: 1,
    notes: 'NEEDS_VERIFICATION: confirm patio door RO measurement protocol.',
  },
];

async function main() {
  console.log('🌱 Seeding global measurement rules...');
  let created = 0;
  let skipped = 0;

  for (const rule of GLOBAL_RULES) {
    const exists = await prisma.measurementRule.findFirst({
      where: {
        name: rule.name,
        companyId: null,
        windowType: rule.windowType ?? null,
        exteriorType: rule.exteriorType ?? null,
        installType: rule.installType ?? null,
      } as any,
    });

    if (exists) {
      console.log(`  ⏭  Skip (already exists): ${rule.name}`);
      skipped++;
    } else {
      await prisma.measurementRule.create({
        data: {
          ...rule,
          companyId: undefined, // global rule — leave null
          windowType: rule.windowType ?? null,
          exteriorType: rule.exteriorType ?? null,
          installType: rule.installType ?? null,
        } as any,
      });
      console.log(`  ✅ Created: ${rule.name}`);
      created++;
    }
  }

  console.log(`\n🌱 Seed complete — created: ${created}, skipped: ${skipped}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
