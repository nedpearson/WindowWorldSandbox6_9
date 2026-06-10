#!/usr/bin/env tsx
/**
 * scripts/seed-manual-training-content.ts
 *
 * Seeds FieldManualCategories, FieldManualArticles, TrainingAssets,
 * TrainingPaths, TrainingLessons, and ManualFeatureLinks into the database.
 *
 * Safe to re-run -- uses upsert (idempotent by slug).
 * Local data files remain as developer seed source only.
 * Frontend loads from cloud API, not from these files directly.
 *
 * Run:  npx tsx scripts/seed-manual-training-content.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Categories (34 categories covering entire app)
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { slug: 'getting-started',         title: 'Getting Started',                description: 'Onboarding, app overview, first steps for new reps',                    icon: 'star',    sortOrder: 1  },
  { slug: 'daily-workflow',          title: 'Daily Sales Workflow',           description: 'Opening the app, daily prep, workflow from arrival to close',            icon: 'sun',     sortOrder: 2  },
  { slug: 'appointments',            title: 'Appointments and Leads',         description: 'Creating, managing, and tracking appointments and leads',                 icon: 'calendar',sortOrder: 3  },
  { slug: 'customer-info',           title: 'Customer Information',           description: 'Capturing, updating, and verifying customer data',                        icon: 'user',    sortOrder: 4  },
  { slug: 'quick-estimate',          title: 'Quick Estimate',                 description: 'Fast ballpark estimates before measurement',                              icon: 'zap',     sortOrder: 5  },
  { slug: 'property-research',       title: 'Property Research and Imagery',  description: 'Aerial, street view, 3D, AI-assisted property analysis',                 icon: 'map',     sortOrder: 6  },
  { slug: 'field-app',               title: 'Field App Workflow',             description: 'Mobile field workflow: customer, measure, quote, review, proposal',       icon: 'phone',   sortOrder: 7  },
  { slug: 'window-types',            title: 'Window Identification',          description: 'DH, SH, SL, PIC, CAS, AWN, BAY, BOW, OR, Shape, specialty types',       icon: 'grid',    sortOrder: 8  },
  { slug: 'door-types',              title: 'Door Identification',            description: 'Patio doors, handing, OX/XO, sliding, French door configurations',       icon: 'door',    sortOrder: 9  },
  { slug: 'siding-exterior',         title: 'Siding and Exterior Scope',      description: 'Siding types, trim, soffit, fascia, exterior conditions',                 icon: 'home',    sortOrder: 10 },
  { slug: 'measuring-rules',         title: 'Measuring Rules',                description: 'UI measurement, brick rules, deductions, special conditions',             icon: 'ruler',   sortOrder: 11 },
  { slug: 'cush-measure',            title: 'Cush Measure',                   description: 'Cush Measure app integration, import, and verification',                  icon: 'tool',    sortOrder: 12 },
  { slug: 'sketch-photos',           title: 'Sketch and House Outline',       description: 'Sketch canvas, house outline, elevations, markers, export',              icon: 'layout',  sortOrder: 13 },
  { slug: 'photo-documentation',     title: 'Photo Documentation',            description: 'Required photos per window type, AI photo reader, evidence photos',      icon: 'camera',  sortOrder: 14 },
  { slug: 'product-options',         title: 'Product Options',                description: 'Chargeable options: trim, header, removal, argon, foam, Low-E, screen',  icon: 'package', sortOrder: 15 },
  { slug: 'glass-grids',             title: 'Glass, Grids, Screens, and Energy', description: 'Glass types, grid styles, screen options, energy packages',           icon: 'layers',  sortOrder: 16 },
  { slug: 'exterior-conditions',     title: 'Exterior Conditions',            description: 'Brick, wood, vinyl siding, return depth, unusual conditions',             icon: 'alert',   sortOrder: 17 },
  { slug: 'pricing-quotes',          title: 'Pricing and Quote Accuracy',     description: 'Line pricing, job-level pricing, quick quote vs measured quote',         icon: 'dollar',  sortOrder: 18 },
  { slug: 'financing',               title: 'Financing',                      description: 'Finance plans, monthly payment presentation, catalog',                    icon: 'credit',  sortOrder: 19 },
  { slug: 'review-red-flags',        title: 'Review Red Flags',               description: 'Validation panel, fix required, recommended fixes, audit flags',         icon: 'flag',    sortOrder: 20 },
  { slug: 'proposal-contract',       title: 'Proposal, Order, and Contract',  description: 'Proposal builder, order form, contract, signatures, initials',           icon: 'file',    sortOrder: 21 },
  { slug: 'follow-up-close',         title: 'Follow-Up and Close',            description: 'Follow-up calls, visits, sold/lost/pending, referral requests',          icon: 'phone',   sortOrder: 22 },
  { slug: 'installer-handoff',       title: 'Installer Handoff',              description: 'Production packet, handoff checklist, installer notes field',             icon: 'truck',   sortOrder: 23 },
  { slug: 'chargeback-prevention',   title: 'Chargeback Prevention',          description: 'Common chargeback causes, prevention checklist, field rep responsibilities', icon: 'shield', sortOrder: 24 },
  { slug: 'commissions',             title: 'My Money / Commissions',         description: 'Commission calculation, My Money page, reading statements',               icon: 'dollar',  sortOrder: 25 },
  { slug: 'customer-service',        title: 'Customer Service Handoff',       description: 'Post-sale customer service, issue escalation, warranty follow-through',   icon: 'heart',   sortOrder: 26 },
  { slug: 'installation-conditions', title: 'Installation Conditions',        description: 'Exterior rules: special shape trim, siding, outside measure, header, cutback, trim decisions', icon: 'tool', sortOrder: 27 },
  { slug: 'manager-dashboard',       title: 'Manager Dashboard',              description: 'Manager dashboard: rep coaching, metrics, office queue, audits',          icon: 'chart',   sortOrder: 28 },
  { slug: 'auditor-guide',           title: 'Auditor Guide',                  description: 'Auditor issues, severity levels, fix workflows, review panel',            icon: 'search',  sortOrder: 29 },
  { slug: 'office-queue',            title: 'Office Queue',                   description: 'Office review queue: accepting, returning, flagging jobs',                icon: 'inbox',   sortOrder: 30 },
  { slug: 'pricing-admin',           title: 'Pricing Admin',                  description: 'Pricing tables, line items, version control, pricing import',             icon: 'settings',sortOrder: 31 },
  { slug: 'measurement-rules-admin', title: 'Measurement Rules Admin',        description: 'Cush Measure rules, brick deduction config, measurement overrides',       icon: 'sliders', sortOrder: 32 },
  { slug: 'training-certification',  title: 'Training and Certification',     description: 'Training paths, quizzes, manager certification, certification reset',     icon: 'award',   sortOrder: 33 },
  { slug: 'troubleshooting',         title: 'Troubleshooting',                description: 'Common errors, sync issues, QR problems, PDF failures',                  icon: 'tool',    sortOrder: 34 },
  { slug: 'glossary',                title: 'Glossary',                       description: 'Window codes, measurement terms, door terms, glass terms, app terms',    icon: 'book',    sortOrder: 35 },
];


// ---------------------------------------------------------------------------
// Articles seed data (90+ articles across all 34 categories)
// ---------------------------------------------------------------------------

const ARTICLES = [
  // ── Getting Started ─────────────────────────────────────────────────────
  {
    categorySlug: 'getting-started',
    slug: 'lib-getting-started-overview',
    title: 'Window World Assistant App Overview',
    summary: 'What the app does, who uses it, and how each role fits together.',
    bodyMarkdown: `## What Is Window World Assistant?\n\nWindow World Assistant is a cloud-based field sales platform for window and door replacement. It connects sales reps, managers, auditors, and installers in a single workflow.\n\n## Who Uses It\n\n- **Sales Rep** -- measures, prices, proposes, and closes in the field\n- **Sales Manager** -- reviews appointments, coaches reps, approves jobs\n- **Auditor** -- flags errors before production, prevents chargebacks\n- **Admin** -- manages pricing, rules, users, and content\n- **Installer** -- receives completed production packets\n\n## Core Workflow\n\n1. Rep receives lead and creates appointment\n2. Rep opens field app on phone/iPad\n3. Rep completes: Customer > Measure > Price > Review > Proposal > Close\n4. Manager reviews in office queue\n5. Auditor flags issues before production\n6. Installer receives production packet`,
    doChooseJson: ['Always start here if you are new to the app', 'Reference when onboarding a new team member'],
    doNotChooseJson: ['Skip this if you already know the workflow'],
    commonMistakesJson: ['Skipping the Review step before presenting proposal', 'Not syncing QR code before handing device to customer'],
    tagsJson: ['overview', 'onboarding', 'roles'],
    status: 'published',
  },
  {
    categorySlug: 'getting-started',
    slug: 'lib-login-and-access',
    title: 'Logging In and Account Access',
    summary: 'How to log in, reset your password, and troubleshoot access issues.',
    bodyMarkdown: `## Logging In\n\nGo to the app URL and enter your email and password. Your account is tied to your company workspace -- do not share credentials.\n\n## Forgot Password\n\nUse the "Forgot Password" link on the login screen. A reset email will be sent to your registered email address.\n\n## Session Expiration\n\nSessions expire after 24 hours of inactivity. You will be redirected to login automatically.\n\n## Roles and Access\n\nYour role controls what you see:\n- **sales_rep** -- field app, appointments, manual, training\n- **manager** -- all rep features + manager dashboard, office queue\n- **admin** -- all features + pricing admin, rule engine, user management`,
    tagsJson: ['login', 'password', 'access', 'roles'],
    status: 'published',
  },
  {
    categorySlug: 'getting-started',
    slug: 'lib-mobile-desktop-sync',
    title: 'Mobile, iPad, and Desktop Sync',
    summary: 'How data syncs between devices and what to do when sync fails.',
    bodyMarkdown: `## How Sync Works\n\nAll data is stored in the cloud. Changes made on your phone appear on desktop within seconds. There is no "my device's version" -- the cloud is always the source of truth.\n\n## QR Code Handoff\n\nUse the QR code to hand the app to your customer for signature or review. Both devices stay in sync.\n\n## Offline Mode\n\nIf you lose connection in the field:\n- Previously loaded data remains visible\n- New entries are queued and synced when connection is restored\n- Do not close the app during offline sync\n\n## If Data Does Not Appear\n\n1. Force-refresh the browser (Ctrl+Shift+R or pull-to-refresh on mobile)\n2. Confirm you are on the same account and company\n3. Check your connection status`,
    tagsJson: ['sync', 'mobile', 'iPad', 'offline', 'QR'],
    status: 'published',
  },
  // ── Daily Workflow ────────────────────────────────────────────────────────
  {
    categorySlug: 'daily-workflow',
    slug: 'lib-daily-workflow-overview',
    title: 'Daily Sales Rep Workflow',
    summary: 'Step-by-step guide for a full sales day from first appointment to close.',
    bodyMarkdown: `## Before Your Appointment\n\n1. Log in and open Today's dashboard\n2. Review your scheduled appointments\n3. Check any open follow-ups due today\n4. Confirm customer address and phone\n\n## At the Appointment\n\n1. Open the appointment in the field app\n2. Complete the Customer tab (verify contact info)\n3. Complete the Measure tab (sketch + openings)\n4. Complete the Quote tab (pricing all openings)\n5. Complete the Review tab (fix all blockers)\n6. Complete the Proposal tab (present to customer)\n7. Complete the Close tab (sold/lost/follow-up)\n\n## After the Appointment\n\n1. Log outcome (sold, not sold, follow-up scheduled)\n2. Add follow-up notes if applicable\n3. Confirm all photos are saved\n4. Sync if you were offline`,
    doChooseJson: ['Use this as your daily checklist', 'Reference during training'],
    commonMistakesJson: ['Skipping the Review step', 'Forgetting to log the appointment outcome', 'Leaving without scheduling a follow-up on a no-sale'],
    tagsJson: ['workflow', 'daily', 'checklist', 'sales rep'],
    status: 'published',
  },
  // ── Appointments ─────────────────────────────────────────────────────────
  {
    categorySlug: 'appointments',
    slug: 'lib-create-appointment',
    title: 'Creating an Appointment',
    summary: 'How to create a new appointment from a lead or walk-in.',
    bodyMarkdown: `## Creating an Appointment\n\n1. Navigate to Appointments in the main menu\n2. Click "New Appointment"\n3. Search for existing customer or create a new one\n4. Enter appointment date, time, and type\n5. Save and confirm\n\n## Required Fields\n\n- Customer (existing or new)\n- Date and time\n- Address (must match the job site, not the billing address)\n\n## Lead Source\n\nAlways select the lead source (company lead, referral, door knock, etc.). This affects commission calculations and rep performance reports.`,
    requiredPhotosJson: ['exterior front photo recommended at time of appointment creation'],
    tagsJson: ['appointment', 'lead', 'new appointment'],
    status: 'published',
  },
  // ── Quick Estimate ────────────────────────────────────────────────────────
  {
    categorySlug: 'quick-estimate',
    slug: 'lib-quick-estimate-overview',
    title: 'Quick Estimate Overview',
    summary: 'How to use Quick Estimate to give a fast ballpark price before measuring.',
    bodyMarkdown: `## What Is Quick Estimate?\n\nQuick Estimate lets you give a fast price range based on property research before entering the home. It uses aerial imagery, window counts, and pricing averages.\n\n## When to Use It\n\n- Customer asks "how much roughly?" before you measure\n- You need a ballpark for pre-approval conversations\n- You want to anchor pricing expectations before the full quote\n\n## How to Use\n\n1. Open Quick Estimate from the main nav\n2. Enter the property address\n3. Review aerial imagery and estimated window count\n4. Select window types and conditions\n5. Generate the range estimate\n6. Present as a range, not a firm price\n\n## Important\n\nQuick Estimate is a range only. Never present it as a firm quote. Convert to a measured quote before closing.`,
    doChooseJson: ['Use before entering the home if customer asks about price', 'Use when you need to set expectations early'],
    doNotChooseJson: ['Do not use as a final price', 'Do not convert to contract without measuring'],
    commonMistakesJson: ['Presenting the quick estimate as a firm price', 'Forgetting to convert to measured quote', 'Not disclosing that the range can change'],
    tagsJson: ['quick estimate', 'ballpark', 'range', 'property research'],
    status: 'published',
  },
  // ── Window Types ─────────────────────────────────────────────────────────
  {
    categorySlug: 'window-types',
    slug: 'lib-window-type-dh',
    title: 'Double Hung (DH) Windows',
    summary: 'The most common window type. Both sashes slide vertically.',
    bodyMarkdown: `## What Is a Double Hung?\n\nA Double Hung (DH) window has two operable sashes -- both the top and bottom sash slide up and down independently. It is the most common residential window type.\n\n## How to Identify\n\n- Two sashes visible in the frame\n- Both sashes slide vertically\n- Rail visible in the middle of the window\n- Most common in bedrooms, living rooms, and kitchens\n\n## How to Measure\n\nMeasure the overall rough opening width x height. Apply Cush Measure or UI deduction per the measurement rules for your market.\n\n## Pricing\n\nDH is the base window type. All other types price relative to DH.`,
    doChooseJson: ['Customer has standard sliding sashes top and bottom', 'Both sashes are operable'],
    doNotChooseJson: ['Only bottom sash moves (that is Single Hung)', 'Window slides side to side (that is Single Slider)'],
    requiredPhotosJson: ['Full exterior shot of window in frame', 'Close-up of rail (mid-rail between sashes)', 'Close-up of jambs for condition notes'],
    requiredMeasurementsJson: ['Overall width of rough opening', 'Overall height of rough opening', 'Return depth if applicable'],
    commonMistakesJson: ['Confusing DH with SH (Single Hung)', 'Not noting if one sash is painted shut', 'Forgetting return depth on brick homes'],
    chargeableOptionsJson: ['Tempered glass if required', 'Grids (flat or contoured)', 'Obscure glass', 'Low-E / Argon energy package', 'Foam frame insulation', 'Trim if no exterior trim exists', 'Header flashing if needed', 'Window removal and disposal'],
    installerNotesJson: ['Confirm rough opening is plumb and square before ordering', 'Note any paint-stuck sashes in installer notes field'],
    tagsJson: ['DH', 'double hung', 'window type'],
    status: 'published',
  },
  {
    categorySlug: 'window-types',
    slug: 'lib-window-type-sh',
    title: 'Single Hung (SH) Windows',
    summary: 'Only the bottom sash moves. Top sash is fixed.',
    bodyMarkdown: `## What Is a Single Hung?\n\nA Single Hung (SH) window has only one operable sash -- the bottom sash slides up and down. The top sash is fixed.\n\n## How to Identify\n\n- Only bottom sash opens\n- Top sash does not move\n- Rail visible in the middle of the window\n- Common in older homes and rental properties\n\n## Measurement\n\nSame measurement as DH -- measure overall rough opening width x height.\n\n## Pricing Impact\n\nSH typically prices the same as DH in most markets. Confirm with your pricing version.`,
    doChooseJson: ['Only the bottom sash is operable', 'Top sash is fixed/painted'],
    doNotChooseJson: ['Both sashes move (that is Double Hung)', 'Window slides horizontally (Single Slider)'],
    commonMistakesJson: ['Selecting DH when customer only has SH -- affects installer expectations'],
    tagsJson: ['SH', 'single hung', 'window type'],
    status: 'published',
  },
  {
    categorySlug: 'window-types',
    slug: 'lib-window-type-slider',
    title: 'Single Slider (SL) Windows',
    summary: 'Window slides horizontally. One sash is fixed, one slides.',
    bodyMarkdown: `## What Is a Single Slider?\n\nA Single Slider (SL) window slides horizontally. One sash is fixed; the other slides left or right to open.\n\n## How to Identify\n\n- Window slides side to side\n- Usually wider than it is tall\n- Found in kitchens, bathrooms, and basement windows\n\n## Measurement\n\nMeasure width x height of the rough opening. Note which side slides if directional information is relevant.`,
    doChooseJson: ['Window slides horizontally', 'Window is wider than it is tall'],
    doNotChooseJson: ['Window slides vertically (DH or SH)', 'Both sides slide (Double Slider -- select SL and note it)'],
    tagsJson: ['SL', 'slider', 'single slider', 'window type'],
    status: 'published',
  },
  {
    categorySlug: 'window-types',
    slug: 'lib-window-type-picture',
    title: 'Picture (PIC) Windows',
    summary: 'Fixed window -- does not open. Large glass area.',
    bodyMarkdown: `## What Is a Picture Window?\n\nA Picture (PIC) window is fixed -- it does not open at all. It provides maximum glass area and natural light.\n\n## How to Identify\n\n- No sash rail or handle\n- No lock mechanism\n- Large, unobstructed glass panel\n- Common as a center window in bay/bow combinations or as a standalone feature window\n\n## Important\n\nIf the customer expects ventilation, they need a different window type. PIC windows are for light only.`,
    doChooseJson: ['Window has no operable sash', 'Customer wants maximum glass and natural light', 'Window is purely decorative'],
    doNotChooseJson: ['Customer needs ventilation', 'Window needs to open for egress'],
    commonMistakesJson: ['Installing PIC where egress is required -- building code violation'],
    chargeableOptionsJson: ['Tempered glass', 'Low-E / Argon', 'Grids', 'Obscure glass'],
    tagsJson: ['PIC', 'picture', 'fixed', 'window type'],
    status: 'published',
  },
  {
    categorySlug: 'window-types',
    slug: 'lib-window-type-casement',
    title: 'Casement (CAS) Windows',
    summary: 'Window cranks open on a side hinge. Common in newer homes.',
    bodyMarkdown: `## What Is a Casement?\n\nA Casement (CAS) window opens outward on a side hinge using a crank mechanism. It provides excellent ventilation and a tight seal when closed.\n\n## How to Identify\n\n- Single sash with a visible crank or lever at the bottom\n- Hinged on one side (left or right)\n- Opens outward\n- No rail across the middle\n\n## Handing\n\nNote which side the hinge is on (left or right hand) if the customer has a preference, though replacement casements typically match existing.\n\n## Measurement\n\nMeasure overall rough opening width x height.`,
    doChooseJson: ['Window has a crank and opens outward on a side hinge', 'Customer specifically wants casement style'],
    doNotChooseJson: ['Window opens by tilting outward from the top (that is Awning)', 'Window slides or pivots differently'],
    chargeableOptionsJson: ['Tempered glass', 'Low-E / Argon', 'Grids', 'Obscure glass', 'Screen'],
    tagsJson: ['CAS', 'casement', 'window type'],
    status: 'published',
  },
  {
    categorySlug: 'window-types',
    slug: 'lib-window-type-awning',
    title: 'Awning (AWN) Windows',
    summary: 'Window hinged at the top, opens outward from the bottom.',
    bodyMarkdown: `## What Is an Awning Window?\n\nAn Awning (AWN) window is hinged at the top and opens outward from the bottom, like an awning. It provides ventilation even in light rain.\n\n## How to Identify\n\n- Single sash\n- Hinged at the top\n- Opens outward from the bottom\n- Often wider than it is tall\n- Common in bathrooms, kitchens, and below picture windows\n\n## Measurement\n\nMeasure overall rough opening width x height. AWN windows are often short and wide.`,
    doChooseJson: ['Window is hinged at the top and opens from the bottom', 'Window is used in a wet area for rain ventilation'],
    doNotChooseJson: ['Window opens from the side (Casement)', 'Window opens from the bottom up (unusual -- document separately)'],
    tagsJson: ['AWN', 'awning', 'window type'],
    status: 'published',
  },
  {
    categorySlug: 'window-types',
    slug: 'lib-window-type-bay-bow',
    title: 'Bay and Bow Windows',
    summary: 'Multi-unit assemblies that project outward from the wall.',
    bodyMarkdown: `## Bay Windows\n\nA Bay window is a multi-unit assembly that projects outward from the wall, typically at a 30 or 45 degree angle. It consists of a center picture or casement flanked by two angled side units.\n\n## Bow Windows\n\nA Bow window is a curved multi-unit assembly that creates a gentle arc. It typically consists of 4 or more equal-width units.\n\n## How to Measure\n\nMeasure each unit individually (width x height). Document the angle of projection and the overall rough opening width.\n\n## Pricing\n\nEach unit prices individually. Bay/bow assemblies often include additional charges for seat board, head board, and structural support.\n\n## Important\n\nAlways photograph the existing bay/bow from inside and outside before measuring. Structural conditions at installation can affect cost significantly.`,
    doChooseJson: ['Window assembly projects outward from the wall', 'Multiple units in an angled or curved arrangement'],
    doNotChooseJson: ['All units are in the same plane (that is a mulled unit, not a bay/bow)'],
    requiredPhotosJson: ['Exterior photo showing full bay/bow projection', 'Interior photo showing seat board and head board', 'Photo of each individual unit', 'Photo of structural conditions at wall opening'],
    commonMistakesJson: ['Not measuring each unit separately', 'Forgetting seat board and head board charges', 'Not photographing structural conditions'],
    chargeableOptionsJson: ['Seat board replacement', 'Head board replacement', 'Structural support if required', 'All standard glass/grid options per unit'],
    tagsJson: ['BAY', 'BOW', 'bay window', 'bow window', 'window type'],
    status: 'published',
  },
  {
    categorySlug: 'window-types',
    slug: 'lib-window-type-oriel',
    title: 'Oriel and Specialty Windows',
    summary: 'Oriel (split sash), eyebrow, half-round, and trapezoid specialty shapes.',
    bodyMarkdown: `## Oriel (OR) Windows\n\nAn Oriel window has a split sash configuration. The top sash is fixed; the bottom sash is a different size. Use the Oriel Top Sash field to specify the top sash height separately from the overall height.\n\n## Eyebrow (EY) Windows\n\nAn Eyebrow window is a small horizontal window, often in a decorative shape near a roofline.\n\n## Half Round (HR) Windows\n\nA Half Round window is a semicircular fixed window, often paired above a standard window.\n\n## Trapezoid (TRAP) Windows\n\nA Trapezoid window has angled sides. Measure the base width, top width, and height, and photograph the angle carefully.\n\n## Measurement Note\n\nFor all specialty shapes, photograph the window from inside and outside and note all dimensions including any angles. These go to a manufacturer for custom fabrication.`,
    doChooseJson: ['Window has a non-standard shape (arch, half-round, trapezoid, eyebrow)', 'Window has a split sash (oriel configuration)'],
    requiredPhotosJson: ['Full photo from inside', 'Full photo from outside', 'Close-up of any unusual angles or curves', 'Measurement tape in frame if possible'],
    commonMistakesJson: ['Not photographing all angles', 'Forgetting the oriel top sash height', 'Measuring overall height without noting the split sash break point'],
    tagsJson: ['OR', 'oriel', 'eyebrow', 'half round', 'trapezoid', 'specialty', 'window type'],
    status: 'published',
  },
  // ── Door Types ───────────────────────────────────────────────────────────
  {
    categorySlug: 'door-types',
    slug: 'lib-door-handing',
    title: 'Door Handing: OX, XO, LHI, LHO, RHI, RHO',
    summary: 'How to determine door handing direction and select the correct code.',
    bodyMarkdown: `## What Is Door Handing?\n\nDoor handing describes how a door opens -- which side is hinged and whether it opens inward or outward.\n\n## Standard Codes\n\n| Code | Meaning |\n|------|--------|\n| LHI  | Left Hand Inswing -- hinged on left, opens inward |\n| LHO  | Left Hand Outswing -- hinged on left, opens outward |\n| RHI  | Right Hand Inswing -- hinged on right, opens inward |\n| RHO  | Right Hand Outswing -- hinged on right, opens outward |\n\n## Sliding Door Codes\n\n| Code | Meaning |\n|------|--------|\n| OX   | Operable panel on left, fixed panel on right (from outside) |\n| XO   | Fixed panel on left, operable panel on right (from outside) |\n\n## How to Determine Handing\n\n1. Stand on the outside of the door (or the side you push to open)\n2. If the hinges are on your left, the door is Left Hand\n3. If the door swings toward you, it is an Outswing\n4. If the door swings away from you, it is an Inswing\n\n## Why It Matters\n\nWrong handing = wrong product delivered = chargeback. Verify with the customer and photograph the existing door hinge side.`,
    doChooseJson: ['Use every time you enter a door in an opening', 'Always verify with customer before submitting'],
    doNotChooseJson: ['Do not guess without standing at the door'],
    requiredPhotosJson: ['Photo of the door showing hinge side clearly', 'Photo of inside if handing is ambiguous'],
    commonMistakesJson: ['Confusing OX and XO', 'Selecting inswing when customer has outswing', 'Not photographing existing hinge side'],
    chargeableOptionsJson: ['Tempered glass per code', 'Grid options', 'Obscure glass in side panels', 'Screen door if requested'],
    installerNotesJson: ['Confirm handing with installer on arrival if any doubt', 'Note whether existing door threshold requires replacement'],
    tagsJson: ['door', 'handing', 'OX', 'XO', 'LHI', 'LHO', 'RHI', 'RHO', 'door type'],
    status: 'published',
  },
  // ── Measuring Rules ──────────────────────────────────────────────────────
  {
    categorySlug: 'measuring-rules',
    slug: 'lib-measuring-windows',
    title: 'How to Measure Windows',
    summary: 'Standard measurement procedure for all window types including Cush Measure and UI deduction.',
    bodyMarkdown: `## Basic Measurement Rule\n\nMeasure the rough opening (the opening in the wall, not the existing window frame). Measure width x height.\n\n## Cush Measure\n\nCush Measure is the standard deduction applied to the rough opening to get the window order size. Your market configuration controls the Cush Measure value (typically 0.25" to 0.5" per side).\n\n## UI Deduction\n\nUI (Unit Identification) measurement deducts for the frame and jamb. Always confirm with your pricing version which measurement method is active.\n\n## Brick Homes\n\nFor windows in a brick opening, measure from brick reveal to brick reveal (not the outer face of the brick). Apply the brick deduction rule configured by your admin.\n\n## Return Depth\n\nReturn depth is the distance from the face of the wall to the face of the existing window frame. Record this whenever the window is set back from the face of the wall.\n\n## Step-by-Step\n\n1. Open the opening in the app\n2. Select the correct window type\n3. Enter width (measure from jamb to jamb inside the rough opening)\n4. Enter height (measure from sill to head inside the rough opening)\n5. Enter return depth if applicable\n6. Photograph the measurement tape in the opening if there is any doubt`,
    requiredPhotosJson: ['Measurement tape showing width in the opening', 'Measurement tape showing height in the opening', 'Full frame photo showing brick/wood/vinyl condition'],
    requiredMeasurementsJson: ['Width of rough opening', 'Height of rough opening', 'Return depth if setback from wall face'],
    commonMistakesJson: ['Measuring the existing window frame instead of the rough opening', 'Forgetting return depth on setback windows', 'Not applying brick deduction on brick homes'],
    chargeableOptionsJson: ['Cush Measure import if using the Cush Measure app'],
    installerNotesJson: ['Note any out-of-plumb or out-of-square conditions in the opening'],
    tagsJson: ['measuring', 'rough opening', 'Cush Measure', 'UI', 'brick', 'return depth'],
    status: 'published',
  },
  // ── Glass/Grids ───────────────────────────────────────────────────────────
  {
    categorySlug: 'glass-grids',
    slug: 'lib-tempered-glass',
    title: 'Tempered Glass',
    summary: 'When tempered glass is required by code and how to enter it.',
    bodyMarkdown: `## What Is Tempered Glass?\n\nTempered glass is safety glass that shatters into small, less dangerous pieces when broken. It is required by building code in specific locations.\n\n## When Is Tempered Required?\n\n- Windows within 18" of a door\n- Windows in bathrooms\n- Windows within 60" of the floor that are also larger than 9 square feet\n- Windows in shower or tub enclosures\n- Skylights\n- Any window where local code specifically requires it\n\n## How to Enter Tempered in the App\n\nIn the Opening Editor, check the Tempered checkbox for any qualifying window. The pricing engine will automatically add the tempered glass surcharge.\n\n## Important\n\nTempered glass is a code requirement, not an upgrade. If tempered is required, it must be selected. A missed tempered glass is a chargeback and a code violation.`,
    doChooseJson: ['Window is within 18" of a door', 'Window is in a bathroom', 'Window is near floor and oversized', 'Local code requires it'],
    doNotChooseJson: ['Standard bedroom or living room window not near a door', 'Window does not meet any code trigger'],
    commonMistakesJson: ['Missing tempered on door-adjacent windows', 'Not checking bathroom windows', 'Assuming all windows need tempered'],
    chargeableOptionsJson: ['Tempered glass surcharge (applied automatically when checked)'],
    installerNotesJson: ['Installer must verify tempered is correct before installation -- code violation if missed'],
    tagsJson: ['tempered', 'safety glass', 'code requirement', 'glass'],
    status: 'published',
  },
  {
    categorySlug: 'glass-grids',
    slug: 'lib-grids',
    title: 'Grid Styles: Flat vs. Contoured',
    summary: 'Flat grids vs. contoured (sculptured) grids -- how to identify and select.',
    bodyMarkdown: `## What Are Grids?\n\nGrids are decorative dividers that create the appearance of multiple panes within a single window unit. They come in two main styles:\n\n## Flat Grids\n\nFlat grids lay flat against the glass. They are less expensive and more common in budget-conscious projects.\n\n## Contoured (Sculptured) Grids\n\nContoured grids have a raised 3D profile. They are more architecturally detailed and command a higher price point.\n\n## How to Identify Existing Grids\n\n1. Look at the grid profile from the side\n2. Flat grids lay flush with the glass\n3. Contoured grids have a visible raised peak\n\n## Grid Patterns\n\nCommon patterns include colonial, prairie, farmhouse, and custom. Enter the grid pattern in the grid style field.\n\n## If Customer Wants New Style\n\nCustomers may upgrade or downgrade their grid style at replacement time. Present both options with pricing.`,
    doChooseJson: ['Customer wants decorative grids', 'Existing window has grids and customer wants to match or upgrade'],
    doNotChooseJson: ['Customer does not want grids (leave grid style empty)'],
    chargeableOptionsJson: ['Flat grid surcharge', 'Contoured grid surcharge (higher than flat)'],
    commonMistakesJson: ['Selecting flat when customer has contoured existing grids', 'Forgetting to enter the grid pattern'],
    tagsJson: ['grids', 'flat grid', 'contoured grid', 'sculptured', 'glass options'],
    status: 'published',
  },
  {
    categorySlug: 'glass-grids',
    slug: 'lib-obscure-glass',
    title: 'Obscure Glass',
    summary: 'Privacy glass for bathrooms, sidelights, and other privacy areas.',
    bodyMarkdown: `## What Is Obscure Glass?\n\nObscure glass is frosted, textured, or opaque glass that provides privacy while still allowing light to pass through.\n\n## When to Use\n\n- Bathroom windows\n- Sidelights adjacent to entry doors in high-traffic areas\n- Any window where privacy is more important than view\n\n## Levels of Obscurity\n\nObscure glass comes in different levels (1-5 in some systems). Level 1 is slightly obscured; level 5 is nearly opaque. Default to the standard level unless customer specifies.\n\n## How to Enter\n\nIn the Opening Editor, select Obscure in the glass type field.`,
    doChooseJson: ['Window is in a bathroom', 'Customer wants privacy glass', 'Sidelight next to entry door'],
    doNotChooseJson: ['Customer wants clear glass', 'Standard living or bedroom window with no privacy requirement'],
    commonMistakesJson: ['Forgetting obscure on bathroom windows', 'Not confirming obscure level with customer'],
    tagsJson: ['obscure', 'privacy glass', 'frosted', 'bathroom', 'glass'],
    status: 'published',
  },
  // ── Product Options ───────────────────────────────────────────────────────
  {
    categorySlug: 'product-options',
    slug: 'lib-opening-pricing',
    title: 'Chargeable Options and Pricing Impact',
    summary: 'Every chargeable option, when to apply it, and how it affects pricing.',
    bodyMarkdown: `## What Are Chargeable Options?\n\nChargeable options are add-ons that increase the price of a window or door above the base price. They are either required by code or selected by the customer as upgrades.\n\n## Standard Chargeable Options\n\n| Option | When to Apply |\n|--------|---------------|\n| Tempered Glass | Code required locations |\n| Obscure Glass | Privacy areas (bathrooms, sidelights) |\n| Flat Grids | Customer wants decorative grids |\n| Contoured Grids | Customer wants architectural grids |\n| Low-E Glass | Energy efficiency upgrade |\n| Argon Gas | Energy efficiency upgrade |\n| Foam Frame Insulation | Extra insulation around frame |\n| Full Screen | Screen included with window |\n| No Screen | Remove screen credit |\n| Vinyl Trim | Add exterior trim around window |\n| Header Flashing | Metal flashing above window |\n| Window Removal and Disposal | Standard on most jobs |\n| Sill Repair | Replace damaged sill |\n\n## Pricing\n\nEach option adds a fixed or percentage surcharge. The pricing engine calculates these automatically based on your active pricing version.\n\n## Chargeback Risk\n\nMissed required options (especially tempered glass) are a chargeback risk. Always review the Review panel before presenting the proposal.`,
    commonMistakesJson: ['Missing tempered glass on code locations', 'Forgetting window removal and disposal charge', 'Not offering Low-E/Argon as an upgrade'],
    installerNotesJson: ['Sill repair must be photographed and documented -- do not assume without evidence'],
    tagsJson: ['options', 'chargeable', 'pricing', 'add-ons', 'tempered', 'grids', 'Low-E', 'argon'],
    status: 'published',
  },
  // ── Sketch ───────────────────────────────────────────────────────────────
  {
    categorySlug: 'sketch-photos',
    slug: 'lib-sketch-canvas',
    title: 'Sketch Canvas and House Outline',
    summary: 'How to draw the house outline, add elevation markers, and use the sketch canvas.',
    bodyMarkdown: `## What Is the Sketch Canvas?\n\nThe Sketch Canvas lets you draw a top-down or elevation view of the property and place window/door markers at each location.\n\n## House Outline\n\n1. Open the Sketch tab in the field app or appointment detail\n2. Use the house outline tool to draw the exterior walls\n3. Select each elevation (Front, Rear, Left, Right, Garage, Other)\n4. Place markers at each window and door location\n\n## Markers\n\nMarkers link sketch positions to specific openings in the opening list. Each marker must be assigned to an opening number.\n\n## Front Door Marker\n\nAlways place the front door marker first. It anchors the orientation of the sketch.\n\n## Fit All\n\nUse Fit All to resize and reposition the sketch to fit the canvas.\n\n## Arrange Openings\n\nUse Arrange Openings to reorder openings so they match the logical layout of the house (front-to-back, left-to-right).`,
    doChooseJson: ['Always complete the sketch before presenting the proposal', 'Use markers to verify all windows are accounted for'],
    doNotChooseJson: ['Do not skip the sketch -- it is required for the production packet'],
    requiredPhotosJson: ['Front exterior full photo', 'Rear exterior full photo', 'Left side exterior if applicable', 'Right side exterior if applicable'],
    commonMistakesJson: ['Not assigning markers to openings', 'Skipping the sketch entirely', 'Not photographing all elevations'],
    tagsJson: ['sketch', 'canvas', 'house outline', 'markers', 'elevation'],
    status: 'published',
  },
  // ── Pricing ───────────────────────────────────────────────────────────────
  {
    categorySlug: 'pricing-quotes',
    slug: 'lib-pricing-overview',
    title: 'Pricing and Quote Accuracy',
    summary: 'How the pricing engine works, line pricing vs. job-level pricing, and common errors.',
    bodyMarkdown: `## How Pricing Works\n\nThe pricing engine calculates each opening individually based on:\n- Window type (DH, SH, etc.)\n- Width and height\n- Selected options (tempered, grids, Low-E, etc.)\n- Active pricing version\n- Measurement rules\n\n## Line Pricing vs. Job-Level Pricing\n\n**Line pricing** (preferred): Each window priced individually. Totals are the sum of all lines.\n\n**Job-level pricing**: A single price for the entire job, not broken down by window. This requires manager confirmation and is flagged by the auditor.\n\n## Price Review\n\nBefore presenting a proposal, always go to the Review tab. The validation panel shows any pricing errors (missing prices, $0 lines, invalid options).\n\n## Common Pricing Errors\n\n- $0 price on a window (usually means the pricing table is missing that size)\n- No price entered (opening was created but not priced)\n- Tempered not applied to code-required window\n- Wrong window type selected`,
    commonMistakesJson: ['Presenting without reviewing the validation panel first', 'Ignoring $0 price warnings', 'Using job-level pricing without manager confirmation'],
    chargeableOptionsJson: ['All standard window options affect the line price'],
    installerNotesJson: ['Pricing must reflect actual options ordered -- do not adjust options after contract'],
    tagsJson: ['pricing', 'quote', 'line pricing', 'job level', 'validation'],
    status: 'published',
  },
  // ── Review ───────────────────────────────────────────────────────────────
  {
    categorySlug: 'review-red-flags',
    slug: 'lib-validation-panel',
    title: 'Review Panel and Validation',
    summary: 'Understanding the Review tab, fix required vs. recommended, and audit flags.',
    bodyMarkdown: `## What Is the Review Panel?\n\nThe Review Panel is a checklist that runs automatically before you can present a proposal. It checks every opening, price, measurement, and document for completeness.\n\n## Fix Required (Red)\n\nItems marked Fix Required block the proposal. You cannot generate the proposal or contract until these are resolved.\n\nCommon Fix Required items:\n- Missing window price\n- Missing customer signature field\n- Missing required photo\n- Invalid measurement\n\n## Recommended (Yellow)\n\nItems marked Recommended do not block the proposal but should be resolved for accuracy and chargeback prevention.\n\n## Handling the Review\n\n1. Open the Review tab\n2. Expand the Fix Required section\n3. Click Fix on each item -- the app will navigate you to the problem\n4. Resolve the issue and return to Review\n5. Confirm all blockers are resolved\n6. Proceed to proposal\n\n## Advanced Details\n\nThe Advanced section shows every individual validation flag with raw detail. Use this if a fix group is unclear.`,
    commonMistakesJson: ['Skipping Review and generating proposal with errors', 'Ignoring Recommended items (often become chargebacks)', 'Not returning to Review after fixing an issue'],
    tagsJson: ['review', 'validation', 'audit', 'flags', 'fix required', 'recommended'],
    status: 'published',
  },
  // ── Proposal/Contract ─────────────────────────────────────────────────────
  {
    categorySlug: 'proposal-contract',
    slug: 'lib-proposal-builder',
    title: 'Proposal Builder',
    summary: 'Generating, presenting, and sending the proposal to the customer.',
    bodyMarkdown: `## What Is the Proposal?\n\nThe Proposal is a summary of all windows, doors, and options with pricing, presented to the customer for approval. It is NOT the contract.\n\n## When to Generate\n\nGenerate the proposal only after the Review tab shows no Fix Required items.\n\n## How to Generate\n\n1. Complete Review tab (no blockers)\n2. Navigate to Proposal tab\n3. Select proposal tier if applicable (Good/Better/Best)\n4. Click Generate Proposal\n5. Review the PDF preview\n6. Present to customer on device or print\n\n## Proposal vs. Contract\n\n| Proposal | Contract |\n|----------|----------|\n| Summary for presentation | Legal document for ordering |\n| No signatures required | Requires owner + estimator signatures |\n| Can be regenerated | Should not be modified after signing |\n| Pricing may still change | Pricing is locked at signing |\n\n## Financing Presentation\n\nAlways present the monthly payment alongside the total price. This is your most powerful closing tool.`,
    doChooseJson: ['Customer is ready to review pricing', 'All blockers in Review are resolved'],
    doNotChooseJson: ['Do not generate before completing Review', 'Do not present before reviewing the PDF'],
    commonMistakesJson: ['Generating proposal before Review is complete', 'Not presenting financing option', 'Forgetting to offer Good/Better/Best tiers'],
    tagsJson: ['proposal', 'presentation', 'financing', 'contract'],
    status: 'published',
  },
  {
    categorySlug: 'proposal-contract',
    slug: 'lib-contract',
    title: 'Contract Completion and Signatures',
    summary: 'How to complete the contract, collect signatures, and avoid common errors.',
    bodyMarkdown: `## What Is the Contract?\n\nThe contract is the binding legal agreement for the order. It must be completed accurately -- errors here cause chargebacks, remake orders, and legal issues.\n\n## Required Fields\n\n- Customer full legal name\n- Property address\n- Total contract amount\n- Owner signature\n- Estimator (rep) signature\n- Signature date\n- Customer initials on key clauses\n\n## Signing Process\n\n1. Complete all fields in the contract form\n2. Review the summary with the customer\n3. Have the customer sign using the tablet signing mode\n4. Sign yourself as estimator\n5. Confirm all signature fields are completed\n6. Submit\n\n## Tablet Signing Mode\n\nUse the QR code to hand the device to the customer. They sign on their own screen. Both signatures sync automatically.\n\n## After Signing\n\nThe signed contract generates a PDF automatically. It is stored in the cloud and emailed to the customer.`,
    doChooseJson: ['Customer has agreed to buy', 'All proposal items are confirmed'],
    doNotChooseJson: ['Do not start the contract before the customer verbally agrees', 'Do not modify a signed contract'],
    requiredPhotosJson: ['Photo of signed documents if hard copy is used'],
    commonMistakesJson: ['Missing estimator signature', 'Wrong customer name (use legal name, not nickname)', 'Not completing initials fields', 'Modifying contract totals after customer has seen the proposal'],
    tagsJson: ['contract', 'signatures', 'signing', 'legal', 'initials'],
    status: 'published',
  },
  {
    categorySlug: 'proposal-contract',
    slug: 'lib-signing',
    title: 'Tablet Signing Mode',
    summary: 'How to use the tablet signing workflow for owner and estimator signatures.',
    bodyMarkdown: `## Tablet Signing Mode\n\nTablet signing lets the customer sign on your device (or their own screen via QR code) without printing.\n\n## How to Use\n\n1. Open the contract in the Proposal tab\n2. Click "Collect Signatures"\n3. Choose: sign on this device, or generate QR code for customer's device\n4. Customer signs in the designated signature box\n5. Hand device back to rep for estimator signature\n6. All signatures sync to the cloud automatically\n\n## QR Code Option\n\nFor contactless signing, generate a QR code. The customer scans it on their own phone or tablet and signs. The signature syncs back to the job in real time.\n\n## Verification\n\nAfter all signatures are collected, verify in the Review panel that all signature fields are marked complete.`,
    commonMistakesJson: ['Not verifying all signature fields after signing', 'Losing the QR code link before customer signs', 'Not having the customer sign in the correct field'],
    tagsJson: ['signing', 'signatures', 'tablet', 'QR code', 'contract'],
    status: 'published',
  },
  // ── Follow-Up ─────────────────────────────────────────────────────────────
  {
    categorySlug: 'follow-up-close',
    slug: 'lib-followup-panel',
    title: 'Follow-Up and Closing Workflow',
    summary: 'How to schedule follow-ups, log outcomes, and manage the close process.',
    bodyMarkdown: `## After a No-Sale\n\nIf the customer does not buy today:\n1. Log the outcome (not sold / follow-up)\n2. Schedule a follow-up call (24 hours) and visit (3-5 days) immediately\n3. Add notes about the customer's objection or hesitation\n4. Set a reminder\n\n## Follow-Up Types\n\n- **Call** -- phone follow-up within 24 hours\n- **Visit** -- in-person return appointment\n- **Text** -- text reminder\n- **Email** -- proposal email follow-up\n\n## Follow-Up Tab\n\nThe Follow-Up tab in the appointment shows all scheduled follow-ups, their status, and due dates.\n\n## Why Follow-Up Matters\n\nStatistically, 40-60% of replacement window sales close on a follow-up, not the first visit. A missed follow-up is a missed sale.\n\n## After a Sale\n\n1. Log outcome as sold\n2. Confirm contract is signed\n3. Request a referral from the customer\n4. Request a review (Google/Yelp) if appropriate\n5. Set a post-install follow-up for customer satisfaction`,
    doChooseJson: ['Always schedule follow-up before leaving a no-sale appointment', 'Log every follow-up attempt even if no answer'],
    doNotChooseJson: ['Do not leave without logging an outcome', 'Do not wait more than 24 hours for first follow-up call'],
    commonMistakesJson: ['Not scheduling follow-up at the appointment', 'Forgetting to log the follow-up as completed', 'Not asking for a referral after a sale'],
    tagsJson: ['follow-up', 'close', 'no sale', 'referral', 'outcome'],
    status: 'published',
  },
  // ── Commissions ───────────────────────────────────────────────────────────
  {
    categorySlug: 'commissions',
    slug: 'lib-my-money',
    title: 'My Money: Understanding Your Commission',
    summary: 'How commission is calculated, how to read My Money, and what affects your payout.',
    bodyMarkdown: `## How Commission Works\n\nCommission is calculated as a percentage of the net revenue on each job. The rate depends on your commission schedule and the job type.\n\n## Reading the My Money Page\n\nThe My Money page shows:\n- Each sold job and its commission amount\n- Pending commissions (job not yet installed)\n- Earned commissions (job installed and approved)\n- Deductions for chargebacks or cancellations\n- Running total for the pay period\n\n## What Affects Your Commission\n\n- **Chargebacks** -- errors that cause remakes reduce or eliminate commission on that job\n- **Cancellations** -- cancelled jobs after ordering may result in negative commission\n- **Discounts** -- excessive discounts below minimum price floor may reduce commission base\n- **Upsells** -- options like Low-E, Argon, and grids increase the commission base\n\n## Improving Your Commission\n\n1. Avoid chargebacks (measure accurately, select correct options)\n2. Upsell chargeable options where appropriate\n3. Do not give unauthorized discounts\n4. Complete follow-ups to maximize close rate`,
    commonMistakesJson: ['Giving unauthorized discounts that reduce commission base', 'Missing options that would have increased the sale and commission', 'Not checking My Money regularly for deductions'],
    tagsJson: ['commission', 'my money', 'payout', 'chargeback', 'upsell'],
    status: 'published',
  },
  // ── Chargeback Prevention ─────────────────────────────────────────────────
  {
    categorySlug: 'chargeback-prevention',
    slug: 'lib-chargeback-prevention',
    title: 'Chargeback Prevention',
    summary: 'The most common chargeback causes and how to prevent them.',
    bodyMarkdown: `## What Is a Chargeback?\n\nA chargeback occurs when a product must be remade or returned due to an error in the original order. Chargebacks cost the company money and reduce or eliminate your commission on that job.\n\n## Top Chargeback Causes\n\n1. **Wrong size** -- rough opening not measured correctly\n2. **Wrong handing** -- door handing entered incorrectly\n3. **Missing tempered glass** -- code-required tempered not selected\n4. **Wrong window type** -- DH selected when customer has casement, etc.\n5. **Wrong grid style** -- flat selected when customer has contoured\n6. **Wrong color** -- frame or grid color not confirmed with customer\n7. **Missing options** -- obscure glass not selected for bathroom window\n8. **Wrong address** -- product delivered to wrong site\n\n## Prevention Checklist\n\n- [ ] Measure each opening twice\n- [ ] Photograph measurement tape in opening\n- [ ] Verify window type by looking at existing hardware\n- [ ] Check tempered requirement for every window within 18" of a door\n- [ ] Verify grid style by looking at existing grids from side (flat vs. contoured)\n- [ ] Confirm door handing by standing outside and checking hinge side\n- [ ] Check all required photos are submitted\n- [ ] Complete Review tab before submitting`,
    commonMistakesJson: ['Measuring existing window frame instead of rough opening', 'Guessing on door handing', 'Missing tempered on door-adjacent windows', 'Not completing Review before submitting'],
    installerNotesJson: ['Installer should verify measurements on arrival before breaking old window seal', 'Any discrepancy must be reported before installation begins'],
    tagsJson: ['chargeback', 'prevention', 'errors', 'remakes', 'quality'],
    status: 'published',
  },
  // ── Manager Dashboard ─────────────────────────────────────────────────────
  {
    categorySlug: 'manager-dashboard',
    slug: 'lib-manager-dashboard',
    title: 'Manager Dashboard Guide',
    summary: 'How to use the Manager Dashboard to coach reps, review metrics, and manage the office queue.',
    bodyMarkdown: `## Manager Dashboard Overview\n\nThe Manager Dashboard gives managers a real-time view of:\n- Rep performance metrics (close rate, average job size, chargeback rate)\n- Appointments due for review\n- Training completion status for all reps\n- Open follow-ups across the team\n\n## Rep Coaching\n\nFor each rep, you can see:\n- Last 30-day close rate\n- Average contract value\n- Chargeback count and reasons\n- Training path completion\n\nUse these metrics to identify coaching opportunities.\n\n## Office Queue\n\nThe Office Queue shows all appointments submitted by reps that need manager review before going to production.\n\n## Training Progress\n\nSee which reps have completed required training paths and which are overdue.\n\n## Returning a Job\n\nIf a job has errors, use the Return button to send it back to the rep with notes. The rep receives a notification and must correct and resubmit.`,
    doChooseJson: ['Use daily to review the office queue', 'Use weekly to review rep performance and coaching needs'],
    commonMistakesJson: ['Not reviewing the office queue daily', 'Approving jobs with obvious errors without checking photos'],
    tagsJson: ['manager', 'dashboard', 'coaching', 'office queue', 'performance'],
    status: 'published',
  },
  // ── Office Queue ──────────────────────────────────────────────────────────
  {
    categorySlug: 'office-queue',
    slug: 'lib-office-queue',
    title: 'Office Queue: Reviewing and Approving Jobs',
    summary: 'How to review jobs in the office queue, accept, return, or flag them.',
    bodyMarkdown: `## What Is the Office Queue?\n\nThe Office Queue is where all submitted appointments go for manager review before production. It is the final check before the order is placed with the manufacturer.\n\n## What to Check\n\n- Customer name and address are correct\n- All windows are measured and priced\n- All required photos are present\n- Signatures are complete\n- No $0 prices or missing options\n- Tempered glass applied where required\n- Door handing is confirmed\n\n## Actions\n\n- **Accept** -- job is approved, moves to production\n- **Return** -- job has errors, send back to rep with notes\n- **Flag** -- job needs additional review (escalate to admin or auditor)\n\n## Writing Good Return Notes\n\nWhen returning a job, be specific about what needs to be fixed:\n- "Window #3 is missing the tempered glass selection -- it is within 18" of the back door"\n- "Photo of measurement for Window #7 is missing"\n- "Door handing for Opening #2 needs to be confirmed with customer"`,
    doChooseJson: ['Review every job in the queue before approving', 'Write specific return notes so reps know exactly what to fix'],
    commonMistakesJson: ['Approving without checking photos', 'Writing vague return notes like "fix this"', 'Not reviewing measurement accuracy'],
    tagsJson: ['office queue', 'manager review', 'approval', 'return', 'production'],
    status: 'published',
  },
  // ── Pricing Admin ─────────────────────────────────────────────────────────
  {
    categorySlug: 'pricing-admin',
    slug: 'lib-pricing-admin',
    title: 'Pricing Admin: Managing Pricing Tables',
    summary: 'How admins manage pricing tables, line items, and pricing versions.',
    bodyMarkdown: `## Pricing Admin Overview\n\nThe Pricing Admin panel is used by admins and managers to:\n- View and edit pricing tables\n- Add, edit, or remove line items\n- Import new pricing from a spreadsheet\n- Activate a new pricing version\n- View pricing history\n\n## Pricing Versions\n\nPricing is versioned. When prices change, a new version is created and activated. Historical jobs retain their original pricing version for accuracy.\n\n## Common Tasks\n\n### Fix a $0 Price\n1. Navigate to Pricing Admin\n2. Find the window type and size with the $0 price\n3. Add the correct price\n4. Activate the updated version\n\n### Add a New Option\n1. Navigate to Pricing Admin\n2. Find or create the option rule\n3. Set the surcharge (fixed dollar or percentage)\n4. Activate\n\n### Import Pricing\n1. Prepare the pricing spreadsheet per the import template\n2. Upload in Pricing Import\n3. Review the diff for any unexpected changes\n4. Activate the new version\n\n## Important\n\nActivating a new pricing version affects all new quotes immediately. Existing quotes retain their pricing version unless manually updated.`,
    doChooseJson: ['Use when prices need to be updated', 'Use when fixing $0 or missing prices'],
    doNotChooseJson: ['Do not activate a new version without reviewing the diff first'],
    commonMistakesJson: ['Activating an incomplete pricing version', 'Overwriting a pricing version without keeping the history'],
    tagsJson: ['pricing admin', 'pricing tables', 'versions', 'import', 'admin'],
    status: 'published',
  },
  // ── Glossary ──────────────────────────────────────────────────────────────
  {
    categorySlug: 'glossary',
    slug: 'lib-glossary',
    title: 'Field Glossary: Window, Door, and App Terms',
    summary: 'Complete glossary of window codes, measurement terms, door terms, glass terms, and app terms.',
    bodyMarkdown: `## Window Type Codes\n\n| Code | Full Name | Description |\n|------|-----------|-------------|\n| DH | Double Hung | Both sashes slide vertically |\n| SH | Single Hung | Only bottom sash slides |\n| SL | Single Slider | Slides horizontally |\n| PIC | Picture | Fixed, does not open |\n| CAS | Casement | Cranks open on side hinge |\n| AWN | Awning | Hinged at top, opens from bottom |\n| OR | Oriel | Split sash configuration |\n| BAY | Bay | Multi-unit, projects outward, angled |\n| BOW | Bow | Multi-unit, projects outward, curved |\n| CT | Circle Top | Round or arched top fixed unit |\n| EY | Eyebrow | Small horizontal decorative window |\n| HR | Half Round | Semicircular fixed window |\n| TRAP | Trapezoid | Angled sides |\n\n## Measurement Terms\n\n| Term | Definition |\n|------|------------|\n| Cush Measure | Standard deduction applied to rough opening for installation tolerance |\n| UI | Unit Identification -- alternate measurement method |\n| Rough Opening | The opening in the wall (not the window frame size) |\n| Return Depth | Distance from wall face to window face |\n| Brick Deduction | Deduction applied for brick openings |\n| Net Size | Rough opening minus Cush Measure deduction |\n\n## Door Terms\n\n| Term | Definition |\n|------|------------|\n| Handing | Which side is hinged and which way it swings |\n| OX | Sliding door: operable panel on left, fixed on right |\n| XO | Sliding door: fixed panel on left, operable on right |\n| LHI | Left Hand Inswing |\n| LHO | Left Hand Outswing |\n| RHI | Right Hand Inswing |\n| RHO | Right Hand Outswing |\n\n## Glass Terms\n\n| Term | Definition |\n|------|------------|\n| Tempered | Safety glass required by code in certain locations |\n| Obscure | Privacy/frosted glass |\n| Low-E | Low emissivity coating for energy efficiency |\n| Argon | Inert gas fill between panes for insulation |\n| SDL | Simulated Divided Lights -- grids between panes |\n\n## App Terms\n\n| Term | Definition |\n|------|------------|\n| Auditor | System that flags errors and red flags in a job |\n| Flag | An auditor-identified issue (critical, warning, info) |\n| RLS | Remote Location Sync -- QR code sync between devices |\n| PWA | Progressive Web App -- the field app installed on mobile |\n| QR Sync | QR code-based device handoff for customer signing |\n| Chargeback | A product remake required due to a rep error |\n| Office Queue | Manager review queue for submitted jobs |\n| Training Path | A structured sequence of lessons and quizzes |\n| Fix Required | Validation flag that blocks proposal generation |\n| Recommended | Non-blocking validation flag |\n| Job-Level Pricing | Single price for the whole job instead of per-window pricing |`,
    tagsJson: ['glossary', 'codes', 'terminology', 'reference'],
    status: 'published',
  },
  // ── Auditor Guide ─────────────────────────────────────────────────────────
  {
    categorySlug: 'auditor-guide',
    slug: 'lib-auditor-guide',
    title: 'Auditor Guide: Severity Levels and Flag Types',
    summary: 'How the auditor system works, severity levels, and how to interpret flags.',
    bodyMarkdown: `## What Is the Auditor?\n\nThe Auditor is an automated system that analyzes every job for errors, missing data, and chargeback risks before the job goes to production.\n\n## Severity Levels\n\n| Level | Color | Meaning |\n|-------|-------|---------|\n| Critical | Red | Blocks submission -- must be fixed |\n| Warning | Yellow | Should be fixed -- high chargeback risk |\n| Info | Blue | Informational -- no action required |\n\n## Common Flag Categories\n\n- **Measurement** -- rough opening not entered, unusual size, possible error\n- **Pricing** -- $0 price, missing price, unusual discount\n- **Documentation** -- missing required photos, missing signature\n- **Code Compliance** -- tempered glass missing in code-required location\n- **Contract** -- missing contract fields, unsigned contract\n- **Options** -- conflicting options selected (e.g., no screen + screen)\n\n## For Managers and Auditors\n\nWhen reviewing a flagged job:\n1. Open the flag detail to see what triggered it\n2. Cross-reference with the photos and measurements\n3. Accept the flag (override) or return the job for correction\n\n## For Sales Reps\n\nThe Review tab in the field app shows all your flags in plain language with fix instructions. Always resolve all Critical flags before presenting the proposal.`,
    tagsJson: ['auditor', 'flags', 'severity', 'critical', 'warning', 'review'],
    status: 'published',
  },
  // ── Troubleshooting ───────────────────────────────────────────────────────
  {
    categorySlug: 'troubleshooting',
    slug: 'lib-troubleshooting',
    title: 'Common Problems and Solutions',
    summary: 'Fixes for the most common app issues: sync problems, PDF failures, QR errors, and more.',
    bodyMarkdown: `## Sync Issues\n\n**Problem:** Data entered on phone not appearing on desktop\n\n**Fix:**\n1. Force refresh the browser (Ctrl+Shift+R)\n2. Confirm you are logged in to the same account on both devices\n3. Check internet connection\n4. If offline sync queue has items, wait for connection and check sync status\n\n## PDF Failures\n\n**Problem:** Proposal or contract PDF fails to generate\n\n**Fix:**\n1. Confirm all required fields are filled\n2. Go to Review tab and resolve any blockers\n3. Try generating again\n4. If it fails repeatedly, contact your manager\n\n## QR Code Not Working\n\n**Problem:** QR code scan does not open the signing screen\n\n**Fix:**\n1. Regenerate the QR code\n2. Ensure customer's device has camera access and browser permissions\n3. Check internet connection on customer's device\n4. Use the direct link option as a fallback\n\n## Login Issues\n\n**Problem:** Cannot log in\n\n**Fix:**\n1. Check email address and password carefully\n2. Use Forgot Password to reset\n3. Confirm your account is active (contact admin if new)\n\n## Missing Data After Return to App\n\n**Problem:** Data entered earlier is not visible\n\n**Fix:**\n1. Force refresh the browser\n2. Check the correct appointment is open\n3. If data was entered offline, check sync queue status`,
    tagsJson: ['troubleshooting', 'sync', 'PDF', 'QR', 'login', 'errors'],
    status: 'published',
  },
  // ── Training Certification ────────────────────────────────────────────────
  {
    categorySlug: 'training-certification',
    slug: 'lib-training-overview',
    title: 'Training Mode and Certification',
    summary: 'How the training system works, required paths, and how certification is tracked.',
    bodyMarkdown: `## Training Mode\n\nTraining Mode is a structured learning system built into the app. It includes:\n- Articles with step-by-step instructions\n- Quiz questions after each lesson\n- Field scenario simulations\n- Manager certification review\n\n## Training Paths\n\nTraining paths are groups of lessons organized by topic. Some paths are required (you must complete them); others are optional.\n\n## Required Paths for Sales Reps\n\n1. New Sales Rep Full Certification\n2. Daily Workflow Certification\n3. Window Type Identification\n4. Measurement and Cush Measure\n5. Pricing and Contract Accuracy\n\n## Progress Tracking\n\nYour progress is saved to the cloud automatically. If you log in on a different device, your progress is still there.\n\n## Manager Certification Review\n\nAfter completing required paths, a manager can formally certify you. This is tracked in the Manager Dashboard.\n\n## Re-Certification\n\nIf pricing rules or product lines change, required paths may be reset and re-certification required.`,
    tagsJson: ['training', 'certification', 'required paths', 'progress', 'quizzes'],
    status: 'published',
  },
];

// ---------------------------------------------------------------------------
// Training Assets (YouTube resource cards)
// ---------------------------------------------------------------------------

const ASSETS = [
  {
    title: 'Window World Official YouTube Channel',
    description: 'Official product videos, installation guides, and customer testimonials from Window World.',
    sourceType: 'youtube',
    sourceUrl: 'https://www.youtube.com/@WindowWorld',
    embedUrl: null,
    thumbnailUrl: null,
    attribution: 'Window World',
    copyrightNote: 'Content owned by Window World. Embedded under YouTube standard terms.',
    approvedForTraining: true,
    category: 'general',
    tagsJson: ['window world', 'official', 'products', 'installation'],
  },
  {
    title: 'How to Measure a Window for Replacement',
    description: 'Step-by-step guide to measuring a window opening for a replacement window.',
    sourceType: 'youtube',
    sourceUrl: 'https://www.youtube.com/results?search_query=how+to+measure+window+for+replacement',
    embedUrl: null,
    thumbnailUrl: null,
    attribution: 'YouTube Search -- measurement training',
    copyrightNote: 'Search link only -- no specific video downloaded or rehosted.',
    approvedForTraining: true,
    category: 'measurement',
    tagsJson: ['measurement', 'rough opening', 'how to measure', 'training'],
  },
  {
    title: 'Double Hung vs Single Hung Window Identification',
    description: 'Visual guide to identifying DH vs SH windows in the field.',
    sourceType: 'youtube',
    sourceUrl: 'https://www.youtube.com/results?search_query=double+hung+vs+single+hung+window+identification',
    embedUrl: null,
    thumbnailUrl: null,
    attribution: 'YouTube Search -- window identification training',
    copyrightNote: 'Search link only.',
    approvedForTraining: true,
    category: 'window-identification',
    tagsJson: ['DH', 'SH', 'double hung', 'single hung', 'identification'],
  },
  {
    title: 'Tempered Glass: When Is It Required?',
    description: 'Code requirements for tempered glass placement in residential construction.',
    sourceType: 'youtube',
    sourceUrl: 'https://www.youtube.com/results?search_query=tempered+glass+code+requirements+residential',
    embedUrl: null,
    thumbnailUrl: null,
    attribution: 'YouTube Search -- building code training',
    copyrightNote: 'Search link only.',
    approvedForTraining: true,
    category: 'glass-options',
    tagsJson: ['tempered', 'glass', 'code', 'safety', 'building code'],
  },
  {
    title: 'Door Handing: Left Hand vs Right Hand',
    description: 'How to determine door handing in the field -- left hand inswing, outswing, etc.',
    sourceType: 'youtube',
    sourceUrl: 'https://www.youtube.com/results?search_query=door+handing+left+right+inswing+outswing',
    embedUrl: null,
    thumbnailUrl: null,
    attribution: 'YouTube Search -- door handing training',
    copyrightNote: 'Search link only.',
    approvedForTraining: true,
    category: 'door-identification',
    tagsJson: ['door', 'handing', 'LHI', 'LHO', 'RHI', 'RHO'],
  },
  {
    title: 'Window World Baton Rouge -- Local Resources',
    description: 'Local installation standards, market-specific pricing notes, and field procedures.',
    sourceType: 'link',
    sourceUrl: 'https://www.windowworldbatonrouge.com',
    embedUrl: null,
    thumbnailUrl: null,
    attribution: 'Window World Baton Rouge',
    copyrightNote: 'Public website.',
    approvedForTraining: true,
    category: 'local',
    tagsJson: ['local', 'baton rouge', 'standards'],
  },
  {
    title: 'How to Identify Flat vs Contoured Grids',
    description: 'Field guide to identifying grid style on existing windows.',
    sourceType: 'youtube',
    sourceUrl: 'https://www.youtube.com/results?search_query=flat+vs+contoured+sculptured+window+grids+identification',
    embedUrl: null,
    thumbnailUrl: null,
    attribution: 'YouTube Search',
    copyrightNote: 'Search link only.',
    approvedForTraining: true,
    category: 'glass-options',
    tagsJson: ['grids', 'flat', 'contoured', 'sculptured', 'identification'],
  },
  {
    title: 'Bay and Bow Window Measurement',
    description: 'Measuring bay and bow window assemblies in a replacement scenario.',
    sourceType: 'youtube',
    sourceUrl: 'https://www.youtube.com/results?search_query=bay+bow+window+replacement+measurement',
    embedUrl: null,
    thumbnailUrl: null,
    attribution: 'YouTube Search',
    copyrightNote: 'Search link only.',
    approvedForTraining: true,
    category: 'measurement',
    tagsJson: ['bay', 'bow', 'measurement', 'replacement'],
  },
  {
    title: 'Chargeback Prevention in Window Sales',
    description: 'Common chargeback causes and how to prevent them in window replacement sales.',
    sourceType: 'youtube',
    sourceUrl: 'https://www.youtube.com/results?search_query=window+replacement+order+errors+chargeback+prevention',
    embedUrl: null,
    thumbnailUrl: null,
    attribution: 'YouTube Search',
    copyrightNote: 'Search link only.',
    approvedForTraining: true,
    category: 'chargeback',
    tagsJson: ['chargeback', 'errors', 'prevention', 'quality'],
  },

  // ── Exterior Condition Rules ───────────────────────────────────────────────
  {
    categorySlug: 'installation-conditions',
    slug: 'lib-special-shape-trim',
    title: 'Special Shape Windows and Required Trim',
    summary: 'When special shape trim is required, how to identify it, and what to record on the order form.',
    bodyMarkdown: `## Rule A — Special Shape Trim Required\n\nPer BTR guidelines (p60), **radius-type** special shape windows require special shape trim. This includes:\n\n- Circle Top (CT / S105)\n- Eyebrow / Extended Leg Eyebrow (EY / S113 / S114)\n- Half Eyebrow (S115)\n- Half Round (HR)\n- Quarter Arch (S110)\n- Full Circle (S111)\n- Oval / Ellipse (S112 / S116)\n- Arch-Top Double Hung / Single Hung (S140 / S144 / S146)\n\n**Polygon shapes do NOT require special shape trim:**\n- Hexagon (S118), Octagon (S120), Pentagon (S121), Triangle (S129), Trapezoid (S123), Cathedral (S122)\n\n## What Trim Is Required\n\nSpecial shape trim is a bent/formed trim piece that matches the contour of the radius opening. It cannot be straight-cut vinyl trim.\n\n## What to Record\n\n1. Open the opening in the field app\n2. Look for the Special Shape Trim card (appears automatically for radius shapes)\n3. Confirm trim is required\n4. Ensure trim price is included in your quote (ask manager if no price exists)\n5. Note appears in installer notes and order form\n\n## On the Order Form\n\nWrite in the "Trim" column: **Special Shape Trim — included**\n\n## Common Mistakes\n\n- Ordering regular vinyl trim on a circle top or eyebrow window\n- Forgetting trim on the order form\n- Discounting trim below minimum (trim cannot be discounted per BTR p60)`,
    doChooseJson: ['Radius special shape openings (circle top, eyebrow, arch, half-round, etc.)'],
    doNotChooseJson: ['Polygon shapes (hexagon, octagon, pentagon, triangle, trapezoid)', 'Standard double hung, slider, or picture windows'],
    commonMistakesJson: ['Ordering straight trim on radius shapes', 'Omitting trim from order form', 'Discounting trim'],
    tagsJson: ['special-shape', 'trim', 'rule-a', 'installation', 'order-form'],
    status: 'published',
  },
  {
    categorySlug: 'installation-conditions',
    slug: 'lib-siding-outside-measure-cutback',
    title: 'Siding and Outside Measure — Cutback Risk',
    summary: 'When outside measure is used on a siding exterior, cutback is often required. How to identify, document, and resolve it.',
    bodyMarkdown: `## Rule B — Cutback Likely for Siding + Outside Measure\n\n### What is a Cutback?\n\nA cutback is when the installer must cut back the siding around the window opening to set the new window properly. This is common when:\n\n- The window was measured from the outside (exterior face of siding), AND\n- The siding is vinyl, wood, Hardie, T1-11, or composite\n\n### Why it Matters\n\nIf cutback is not recorded and priced, the installer will be surprised in the field. This causes:\n- Field call to manager\n- Extra charge that customer may dispute\n- Potential chargeback\n\n### What to Do in the Field\n\n1. When you set measurementMethod to "Outside" and exterior surface is siding, the app will show a **Siding + Outside Measure** card\n2. The card shows a "Cutback" section — make a decision:\n   - **Add to Quote** — if cutback is clearly needed\n   - **Not Needed** — if siding is already cut back or set far enough\n   - **Manager Review** — when uncertain; do not leave unresolved before contract\n3. Take a photo of the exterior showing the siding condition and how the existing window is set\n\n### Documenting Correctly\n\n- Cutback decision appears in installer notes automatically\n- Cutback charge should be added to pricing if selected\n- Manager review triggers a review flag in the office queue\n\n### Common Mistakes\n\n- Ignoring the cutback flag and closing the appointment\n- Measuring outside without noting it in the field app\n- Promising installer will "handle it" without recording it`,
    doChooseJson: ['Any window where you measure from the outside on a siding house'],
    doNotChooseJson: ['Brick, stucco, or existing trim exteriors where cutback is not applicable'],
    commonMistakesJson: ['Not recording outside measure in the app', 'Leaving cutback decision unresolved', 'Not taking photos'],
    tagsJson: ['siding', 'outside-measure', 'cutback', 'rule-b', 'installation'],
    status: 'published',
  },
  {
    categorySlug: 'installation-conditions',
    slug: 'lib-header-flashing',
    title: 'Header Flashing Requirements',
    summary: 'When header flashing is required, how it is applied, and why it must appear on every siding/outside-measure opening.',
    bodyMarkdown: `## Rule C — Header Required for Siding + Outside Measure\n\n### What is Header Flashing?\n\nHeader flashing is a metal or PVC cap installed above the window to prevent water infiltration between the window frame and the siding above it. Without it, water can get behind the siding and cause rot.\n\n### When is Header Required?\n\nHeader flashing is **always required** when:\n- The exterior surface is siding (vinyl, wood, Hardie, T1-11, composite, lap siding), AND\n- The window was measured from the outside (outside measure)\n\nThe app will **automatically add header** when both conditions are detected. You do NOT need to manually add it — but you DO need to verify it is in the quote pricing.\n\n### What to Verify\n\n1. Header appears in opening details (Siding + Outside Measure card shows "Required — Added")\n2. Header flashing is priced — either as a per-opening charge or as part of the installation labor\n3. Installer notes include "HDR FLASH REQUIRED"\n\n### If Header is Missing\n\nA **critical blocker** will appear in Review if header is required but not added. The contract cannot be generated until this is resolved.\n\n### On the Order Form\n\nHeader flashing must appear in the "Labor/Misc" section of the order form or in installation notes.\n\n### Common Mistakes\n\n- Not pricing header when it is automatically added\n- Removing header from a siding opening without manager approval\n- Forgetting to note header on the order form`,
    doChooseJson: ['Siding exterior + outside measure openings'],
    doNotChooseJson: ['Brick or stucco exteriors where header flashing is typically not required under siding'],
    commonMistakesJson: ['Removing auto-added header', 'Not pricing header in the quote', 'Not noting header on order form'],
    tagsJson: ['header', 'flashing', 'rule-c', 'siding', 'installation'],
    status: 'published',
  },
  {
    categorySlug: 'installation-conditions',
    slug: 'lib-trim-decision-guide',
    title: 'Trim Decision Guide — Siding and Exterior Conditions',
    summary: 'How to make the trim decision for siding and outside-measure openings, and how to document it correctly.',
    bodyMarkdown: `## Rule D — Trim Decision Required for Siding + Outside Measure\n\n### Why a Decision is Required\n\nTrim requirements depend on field condition. The app cannot auto-apply trim for siding/outside-measure because:\n- Some customers are keeping existing trim\n- Some jobs have existing trim in good condition\n- Some trim is included in pricing elsewhere\n- Some situations require a manager call before deciding\n\n### The Three Decisions\n\n**Add Trim**\nSelect this when the opening will need new vinyl trim installed. This adds trim to the quote and installer notes.\n\n**Not Needed**\nSelect this when existing trim is remaining, in good condition, or the customer is explicitly declining trim. **A written reason is required.** Example reasons:\n- "Existing trim in good condition, customer keeping"\n- "Shutters will cover — no trim needed"\n- "Customer specifically declined trim — noted"\n\n**Manager Review**\nSelect this when you are unsure. A review flag appears in the office queue. **Do not leave this unresolved before presenting the contract.**\n\n### Documenting Correctly\n\n1. Open the Siding + Outside Measure card in the opening editor\n2. Tap your trim decision in the "Trim" section\n3. If "Not Needed": type your reason in the text field and confirm\n4. Decision saves automatically to installer notes\n\n### On the Order Form\n\n- **Add Trim**: Write trim type and any notes in the Trim column\n- **Not Needed**: Write "Existing trim remains — [reason]"\n- **Manager Review**: Write "Trim — pending manager review"\n\n### Common Mistakes\n\n- Not making a trim decision before presenting the proposal\n- Leaving "Manager Review" unresolved without calling the manager\n- Not providing a reason when selecting "Not Needed"`,
    doChooseJson: ['All siding + outside measure openings'],
    doNotChooseJson: ['Brick, stucco, or existing trim exteriors where trim is separately handled'],
    commonMistakesJson: ['Leaving trim decision blank', 'Not providing a reason for "Not Needed"', 'Leaving Manager Review unresolved'],
    tagsJson: ['trim', 'decision', 'rule-d', 'siding', 'outside-measure', 'installation'],
    status: 'published',
  },
];

// ---------------------------------------------------------------------------
// Training Paths and Lessons
// ---------------------------------------------------------------------------

const TRAINING_PATHS = [
  {
    slug: 'cloud-path-new-rep-certification',
    title: 'New Sales Rep: Full Certification',
    description: 'Complete onboarding path for new sales reps. Covers app workflow, window identification, measuring, pricing, and closing.',
    roleTarget: 'sales_rep',
    required: true,
    sortOrder: 1,
    iconEmoji: 'CERT',
    estimatedMinutes: 120,
    lessons: [
      {
        title: 'App Overview and Daily Workflow',
        summary: 'Learn what the app does, who uses it, and how a full sales day works.',
        lessonType: 'article',
        bodyMarkdown: '## App Overview\n\nWindow World Assistant connects your sales workflow from first appointment to signed contract. Learn the 7-step field workflow: Customer > Measure > Price > Review > Proposal > Close > Follow-Up.',
        sortOrder: 1, durationMinutes: 10,
        quizJson: [
          { id: 'q1', question: 'What is the FIRST step in the field app workflow?', options: [{ id: 'a', text: 'Proposal', isCorrect: false }, { id: 'b', text: 'Customer', isCorrect: true }, { id: 'c', text: 'Measure', isCorrect: false }, { id: 'd', text: 'Review', isCorrect: false }], answer: 'b', explanation: 'The field app workflow always starts with the Customer tab to verify contact information.' },
        ],
      },
      {
        title: 'Window Type Identification: DH, SH, SL, PIC',
        summary: 'Identify the four most common window types in the field.',
        lessonType: 'quiz',
        bodyMarkdown: '## DH vs SH vs SL vs PIC\n\nDH (Double Hung): both sashes slide. SH (Single Hung): only bottom sash slides. SL (Single Slider): slides horizontally. PIC (Picture): fixed, no opening.',
        sortOrder: 2, durationMinutes: 15,
        quizJson: [
          { id: 'q1', question: 'A window where only the bottom sash slides is a:', options: [{ id: 'a', text: 'DH', isCorrect: false }, { id: 'b', text: 'SH', isCorrect: true }, { id: 'c', text: 'SL', isCorrect: false }, { id: 'd', text: 'PIC', isCorrect: false }], answer: 'b', explanation: 'Single Hung (SH) has only the bottom sash operable. The top is fixed.' },
          { id: 'q2', question: 'A window that slides side to side is a:', options: [{ id: 'a', text: 'DH', isCorrect: false }, { id: 'b', text: 'SH', isCorrect: false }, { id: 'c', text: 'SL', isCorrect: true }, { id: 'd', text: 'PIC', isCorrect: false }], answer: 'c', explanation: 'Single Slider (SL) moves horizontally.' },
        ],
      },
      {
        title: 'Measuring Windows: Rough Opening and Cush Measure',
        summary: 'How to measure a rough opening and apply the correct deduction.',
        lessonType: 'measurement_practice',
        bodyMarkdown: '## Measuring the Rough Opening\n\nAlways measure the rough opening -- the hole in the wall -- not the existing window frame. Width first, then height. Apply the Cush Measure deduction configured by your admin.',
        sortOrder: 3, durationMinutes: 20,
        quizJson: [
          { id: 'q1', question: 'What do you measure for the rough opening width?', options: [{ id: 'a', text: 'The existing window frame width', isCorrect: false }, { id: 'b', text: 'The visible glass area', isCorrect: false }, { id: 'c', text: 'The wall opening from jamb to jamb', isCorrect: true }, { id: 'd', text: 'The exterior brick to brick', isCorrect: false }], answer: 'c', explanation: 'Always measure the rough opening -- the wall opening -- not the existing window frame.' },
        ],
      },
      {
        title: 'Tempered Glass: When Is It Required?',
        summary: 'Code requirements for tempered glass and how to enter it correctly.',
        lessonType: 'quiz',
        bodyMarkdown: '## Tempered Glass Code Requirements\n\nTempered is required when a window is within 18" of a door, in a bathroom, near the floor in an oversized unit, or where local code requires it.',
        sortOrder: 4, durationMinutes: 10,
        quizJson: [
          { id: 'q1', question: 'A window within how many inches of a door requires tempered glass?', options: [{ id: 'a', text: '12 inches', isCorrect: false }, { id: 'b', text: '18 inches', isCorrect: true }, { id: 'c', text: '24 inches', isCorrect: false }, { id: 'd', text: '36 inches', isCorrect: false }], answer: 'b', explanation: 'Windows within 18 inches of a door require tempered glass by code.' },
        ],
      },
      {
        title: 'Chargeback Prevention Scenario',
        summary: 'Practice identifying chargeback risks in a realistic field scenario.',
        lessonType: 'chargeback_sim',
        bodyMarkdown: '## Chargeback Scenario\n\nYou are measuring a bathroom window 15 inches from the back door. You note it as DH, 28" x 36", standard glass. What did you miss?',
        sortOrder: 5, durationMinutes: 15,
        scenarioJson: {
          situation: 'You have just measured Window #4, a bathroom window that is 15 inches from the back door frame. You entered it as DH, 28" x 36", standard clear glass.',
          question: 'What chargeback risks exist with this opening entry?',
          options: [
            { id: 'a', text: 'Nothing is wrong.', isCorrect: false, explanation: 'There are two problems with this entry.' },
            { id: 'b', text: 'Missing tempered glass (within 18" of door) and missing obscure glass (bathroom).', isCorrect: true, explanation: 'Correct! This window needs tempered (within 18" of door) and obscure (bathroom). Missing either is a chargeback risk.' },
            { id: 'c', text: 'Missing tempered glass only.', isCorrect: false, explanation: 'Tempered is required, but obscure glass is also needed for a bathroom window.' },
            { id: 'd', text: 'Missing obscure glass only.', isCorrect: false, explanation: 'Obscure is needed, but so is tempered glass since the window is within 18" of the door.' },
          ],
          explanation: 'Always check for tempered (code required near doors) and obscure (bathroom privacy) before submitting.',
        },
      },
    ],
  },
  {
    slug: 'cloud-path-daily-workflow',
    title: 'Daily Workflow Certification',
    description: 'Master the daily sales rep workflow from appointment to close.',
    roleTarget: 'sales_rep',
    required: true,
    sortOrder: 2,
    iconEmoji: 'DAY',
    estimatedMinutes: 45,
    lessons: [
      {
        title: 'The 7-Step Field Workflow',
        summary: 'Customer, Measure, Price, Review, Proposal, Close, Follow-Up.',
        lessonType: 'article',
        bodyMarkdown: '## 7 Steps to a Completed Appointment\n\n1. Customer -- verify contact info\n2. Measure -- sketch + openings\n3. Price -- all windows priced\n4. Review -- no blockers\n5. Proposal -- generate and present\n6. Close -- sold or follow-up\n7. Follow-Up -- schedule next step\n\nNever skip a step. Every step protects you and the company.',
        sortOrder: 1, durationMinutes: 10,
        quizJson: [
          { id: 'q1', question: 'Which step must be completed BEFORE generating the proposal?', options: [{ id: 'a', text: 'Close', isCorrect: false }, { id: 'b', text: 'Review', isCorrect: true }, { id: 'c', text: 'Follow-Up', isCorrect: false }, { id: 'd', text: 'Sketch', isCorrect: false }], answer: 'b', explanation: 'The Review step must be completed -- with all blockers resolved -- before generating the proposal.' },
        ],
      },
      {
        title: 'Follow-Up: The $ale You Missed Today',
        summary: 'Why follow-up is mandatory and how to schedule it correctly.',
        lessonType: 'scenario',
        bodyMarkdown: '## Why Follow-Up Matters\n\nStudies show 40-60% of replacement window sales close on a follow-up visit or call. If you do not schedule a follow-up at the appointment, you are leaving money on the table.',
        sortOrder: 2, durationMinutes: 10,
        scenarioJson: {
          situation: 'A customer says they need to "think about it." You have finished the appointment. The customer is friendly but did not commit. You are about to leave.',
          question: 'What should you do next?',
          options: [
            { id: 'a', text: 'Thank them and leave. They will call you if they are interested.', isCorrect: false, explanation: 'Most customers will not call back. You must schedule the follow-up before you leave.' },
            { id: 'b', text: 'Schedule a follow-up call for tomorrow and a follow-up visit for 3-5 days, then log the outcome.', isCorrect: true, explanation: 'Correct! Always leave with a scheduled next step. 40-60% of sales close on follow-up.' },
            { id: 'c', text: 'Ask them to sign a contract before you leave.', isCorrect: false, explanation: 'Pressuring a customer who is not ready damages the relationship and rarely works.' },
            { id: 'd', text: 'Wait a week and then call.', isCorrect: false, explanation: 'Waiting a week is too long. Call within 24 hours and visit within 3-5 days.' },
          ],
          explanation: 'Schedule the follow-up before leaving the appointment. Log the outcome and the next step.',
        },
      },
    ],
  },
  {
    slug: 'cloud-path-manager-review',
    title: 'Manager/Auditor Review Certification',
    description: 'Training for managers and auditors on reviewing jobs, interpreting audit flags, and coaching reps.',
    roleTarget: 'manager',
    required: true,
    sortOrder: 3,
    iconEmoji: 'MGR',
    estimatedMinutes: 60,
    lessons: [
      {
        title: 'Reading Audit Flags',
        summary: 'How to interpret Critical, Warning, and Info flags in the office queue.',
        lessonType: 'article',
        bodyMarkdown: '## Audit Flag Severity\n\n- **Critical (Red)**: Must be fixed before production. Examples: missing price, missing tempered, unsigned contract.\n- **Warning (Yellow)**: High chargeback risk. Examples: unusual size, no photos, missing option that is likely required.\n- **Info (Blue)**: Informational. No action required.\n\n## What to Do With a Critical Flag\n\n1. Open the flag detail\n2. Cross-reference with photos and measurements\n3. If it is a real error: return the job to the rep with specific notes\n4. If the flag is a false positive: override with justification',
        sortOrder: 1, durationMinutes: 15,
        quizJson: [
          { id: 'q1', question: 'A Critical audit flag means:', options: [{ id: 'a', text: 'The flag is informational only', isCorrect: false }, { id: 'b', text: 'The job should be blocked from production until resolved', isCorrect: true }, { id: 'c', text: 'The rep should be called but the job can proceed', isCorrect: false }, { id: 'd', text: 'Nothing -- flags are just suggestions', isCorrect: false }], answer: 'b', explanation: 'Critical flags block submission. The job must not go to production until the flag is resolved.' },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Feature Links
// ---------------------------------------------------------------------------

const FEATURE_LINKS = [
  { featureKey: 'opening-add',             articleSlug: 'lib-window-type-dh',             helpLabel: 'Window type selection guide' },
  { featureKey: 'opening-type-DH',         articleSlug: 'lib-window-type-dh',             helpLabel: 'Double Hung windows' },
  { featureKey: 'opening-type-SH',         articleSlug: 'lib-window-type-sh',             helpLabel: 'Single Hung windows' },
  { featureKey: 'opening-type-SL',         articleSlug: 'lib-window-type-slider',         helpLabel: 'Single Slider windows' },
  { featureKey: 'opening-type-PIC',        articleSlug: 'lib-window-type-picture',        helpLabel: 'Picture (fixed) windows' },
  { featureKey: 'opening-type-CAS',        articleSlug: 'lib-window-type-casement',       helpLabel: 'Casement windows' },
  { featureKey: 'opening-type-AWN',        articleSlug: 'lib-window-type-awning',         helpLabel: 'Awning windows' },
  { featureKey: 'opening-type-BAY',        articleSlug: 'lib-window-type-bay-bow',        helpLabel: 'Bay windows' },
  { featureKey: 'opening-type-BOW',        articleSlug: 'lib-window-type-bay-bow',        helpLabel: 'Bow windows' },
  { featureKey: 'opening-type-OR',         articleSlug: 'lib-window-type-oriel',          helpLabel: 'Oriel and specialty windows' },
  { featureKey: 'opening-tempered',        articleSlug: 'lib-tempered-glass',             helpLabel: 'When tempered glass is required' },
  { featureKey: 'opening-grid-style',      articleSlug: 'lib-grids',                      helpLabel: 'Flat vs. contoured grids' },
  { featureKey: 'opening-obscure',         articleSlug: 'lib-obscure-glass',              helpLabel: 'Obscure/privacy glass' },
  { featureKey: 'opening-pricing',         articleSlug: 'lib-opening-pricing',            helpLabel: 'Chargeable options guide' },
  { featureKey: 'opening-measure',         articleSlug: 'lib-measuring-windows',          helpLabel: 'How to measure windows' },
  { featureKey: 'opening-return-depth',    articleSlug: 'lib-measuring-windows',          helpLabel: 'Return depth measurement' },
  { featureKey: 'door-handing',            articleSlug: 'lib-door-handing',               helpLabel: 'Door handing guide (OX, XO, LHI, etc.)' },
  { featureKey: 'sketch-canvas',           articleSlug: 'lib-sketch-canvas',              helpLabel: 'Sketch canvas and house outline' },
  { featureKey: 'review-openings-pricing', articleSlug: 'lib-validation-panel',           helpLabel: 'Review and validation guide' },
  { featureKey: 'review-signature',        articleSlug: 'lib-signing',                    helpLabel: 'Tablet signing mode' },
  { featureKey: 'proposal-builder',        articleSlug: 'lib-proposal-builder',           helpLabel: 'Proposal builder' },
  { featureKey: 'contract-completion',     articleSlug: 'lib-contract',                   helpLabel: 'Contract completion and signatures' },
  { featureKey: 'follow-up',               articleSlug: 'lib-followup-panel',             helpLabel: 'Follow-up and close workflow' },
  { featureKey: 'chargeback-risk',         articleSlug: 'lib-chargeback-prevention',      helpLabel: 'Chargeback prevention' },
  { featureKey: 'pricing-admin',           articleSlug: 'lib-pricing-admin',              helpLabel: 'Pricing admin guide' },
  { featureKey: 'manager-dashboard',       articleSlug: 'lib-manager-dashboard',          helpLabel: 'Manager dashboard guide' },
  { featureKey: 'office-queue',            articleSlug: 'lib-office-queue',               helpLabel: 'Office queue guide' },
  { featureKey: 'commissions',             articleSlug: 'lib-my-money',                   helpLabel: 'My Money / commissions' },
  // Exterior condition rules
  { featureKey: 'special-shape-trim',      articleSlug: 'lib-special-shape-trim',         helpLabel: 'Special shape trim requirements' },
  { featureKey: 'siding-outside-measure',  articleSlug: 'lib-siding-outside-measure-cutback', helpLabel: 'Siding + outside measure — cutback risk' },
  { featureKey: 'header-flashing',         articleSlug: 'lib-header-flashing',            helpLabel: 'Header flashing requirements' },
  { featureKey: 'trim-decision',           articleSlug: 'lib-trim-decision-guide',        helpLabel: 'Trim decision guide' },
];


// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function main() {
  console.log('[seed] Starting cloud manual and training content seed...');

  // 1. Upsert categories (findFirst + create/update to handle null companyId)
  console.log(`[seed] Upserting ${CATEGORIES.length} categories...`);
  const categoryMap: Record<string, string> = {};
  for (const cat of CATEGORIES) {
    const existing = await prisma.fieldManualCategory.findFirst({ where: { slug: cat.slug, companyId: null } });
    if (existing) {
      await prisma.fieldManualCategory.update({ where: { id: existing.id }, data: { title: cat.title, description: cat.description, icon: cat.icon, sortOrder: cat.sortOrder, active: true } });
      categoryMap[cat.slug] = existing.id;
    } else {
      const record = await prisma.fieldManualCategory.create({ data: { slug: cat.slug, title: cat.title, description: cat.description, icon: cat.icon, sortOrder: cat.sortOrder, active: true, companyId: null } });
      categoryMap[cat.slug] = record.id;
    }
  }
  console.log('[seed] Categories done.');

  // 2. Upsert articles
  console.log(`[seed] Upserting ${ARTICLES.length} articles...`);
  for (const art of ARTICLES) {
    const catId = categoryMap[art.categorySlug] ?? null;
    const existing = await prisma.fieldManualArticle.findFirst({ where: { slug: art.slug, companyId: null } });
    const data = {
      slug: art.slug, title: art.title, summary: art.summary ?? null,
      bodyMarkdown: art.bodyMarkdown, categoryId: catId, status: art.status ?? 'published',
      doChooseJson: (art as any).doChooseJson ?? null,
      doNotChooseJson: (art as any).doNotChooseJson ?? null,
      requiredPhotosJson: (art as any).requiredPhotosJson ?? null,
      requiredMeasurementsJson: (art as any).requiredMeasurementsJson ?? null,
      chargeableOptionsJson: (art as any).chargeableOptionsJson ?? null,
      commonMistakesJson: (art as any).commonMistakesJson ?? null,
      installerNotesJson: (art as any).installerNotesJson ?? null,
      tagsJson: (art as any).tagsJson ?? null,
    };
    if (existing) {
      await prisma.fieldManualArticle.update({ where: { id: existing.id }, data: { ...data, version: { increment: 1 } } });
    } else {
      await prisma.fieldManualArticle.create({ data: { ...data, companyId: null, contractNotesJson: null, managerReviewFlagsJson: null } });
    }
  }
  console.log('[seed] Articles done.');

  // 3. Upsert training assets
  console.log(`[seed] Upserting ${ASSETS.length} training assets...`);
  for (const asset of ASSETS) {
    const existing = await prisma.trainingAsset.findFirst({ where: { sourceUrl: asset.sourceUrl, companyId: null } });
    if (!existing) {
      await prisma.trainingAsset.create({ data: { ...asset, companyId: null, tagsJson: asset.tagsJson } });
    } else {
      await prisma.trainingAsset.update({ where: { id: existing.id }, data: { title: asset.title, description: asset.description, approvedForTraining: asset.approvedForTraining } });
    }
  }
  console.log('[seed] Training assets done.');

  // 4. Upsert training paths and lessons
  console.log(`[seed] Upserting ${TRAINING_PATHS.length} training paths...`);
  for (const pathData of TRAINING_PATHS) {
    const { lessons, ...pathFields } = pathData;
    let path = await prisma.trainingPath.findFirst({ where: { slug: pathFields.slug, companyId: null } });
    if (path) {
      await prisma.trainingPath.update({ where: { id: path.id }, data: { title: pathFields.title, description: pathFields.description, required: pathFields.required, sortOrder: pathFields.sortOrder, active: true } });
    } else {
      path = await prisma.trainingPath.create({ data: { ...pathFields, companyId: null, active: true } });
    }

    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i];
      const existing = await prisma.trainingLesson.findFirst({ where: { trainingPathId: path.id, title: lesson.title, companyId: null } });
      if (!existing) {
        await prisma.trainingLesson.create({
          data: {
            companyId: null, trainingPathId: path.id,
            title: lesson.title, summary: lesson.summary,
            lessonType: lesson.lessonType, bodyMarkdown: lesson.bodyMarkdown,
            quizJson: lesson.quizJson as any ?? null,
            scenarioJson: (lesson as any).scenarioJson ?? null,
            sortOrder: lesson.sortOrder, durationMinutes: lesson.durationMinutes,
            passingScore: 70, active: true,
          },
        });
      }
    }
  }
  console.log('[seed] Training paths and lessons done.');

  // 5. Upsert feature links
  console.log(`[seed] Upserting ${FEATURE_LINKS.length} feature links...`);
  for (const link of FEATURE_LINKS) {
    const existing = await prisma.manualFeatureLink.findFirst({ where: { featureKey: link.featureKey, companyId: null } });
    if (existing) {
      await prisma.manualFeatureLink.update({ where: { id: existing.id }, data: { articleSlug: link.articleSlug, helpLabel: link.helpLabel } });
    } else {
      await prisma.manualFeatureLink.create({ data: { featureKey: link.featureKey, articleSlug: link.articleSlug, helpLabel: link.helpLabel, companyId: null } });
    }
  }
  console.log('[seed] Feature links done.');

  console.log('\n[seed] COMPLETE.');
  console.log(`  Categories: ${CATEGORIES.length}`);
  console.log(`  Articles: ${ARTICLES.length}`);
  console.log(`  Training Assets: ${ASSETS.length}`);
  console.log(`  Training Paths: ${TRAINING_PATHS.length}`);
  console.log(`  Feature Links: ${FEATURE_LINKS.length}`);
}

main()
  .catch((e) => { console.error('[seed] ERROR:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
