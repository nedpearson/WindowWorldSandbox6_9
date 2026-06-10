#!/usr/bin/env tsx
/**
 * scripts/seed-manual-expansion.ts
 *
 * Supplemental seed: adds 60+ more articles and 12 more training paths
 * to bring total coverage to 90+ articles and 15 paths.
 *
 * Safe to re-run (idempotent upserts).
 * Run AFTER seed-manual-training-content.ts or independently.
 *
 * Usage: npx tsx scripts/seed-manual-expansion.ts
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Expansion Articles -- 60 more articles to reach 90+ total
// ---------------------------------------------------------------------------

const EXPANSION_ARTICLES = [
  // ── Customer Information ──────────────────────────────────────────────
  {
    categorySlug: 'customer-info',
    slug: 'lib-customer-entry',
    title: 'Entering Customer Information',
    summary: 'Required fields, formatting, and common errors when creating or editing a customer record.',
    bodyMarkdown: `## Required Fields\n\n- First Name\n- Last Name\n- Phone (primary contact)\n- Address (job site address -- not billing)\n- City, State, ZIP\n\n## Optional but Recommended\n\n- Email (for contract delivery)\n- Secondary phone\n- Gate code or access notes\n\n## Common Mistakes\n\n- Using a nickname instead of legal name (contract issues)\n- Entering the billing address instead of the job site\n- Forgetting the gate code for gated communities\n- Not verifying the phone number is reachable`,
    commonMistakesJson: ['Using nickname instead of legal name', 'Billing address instead of job site', 'Missing gate code'],
    tagsJson: ['customer', 'entry', 'required fields'],
    status: 'published',
  },
  {
    categorySlug: 'customer-info',
    slug: 'lib-duplicate-customers',
    title: 'Duplicate Customer Detection',
    summary: 'How the app detects duplicate customers by phone, email, or address and how to resolve conflicts.',
    bodyMarkdown: `## How It Works\n\nWhen you create a new appointment, the system checks if a customer with the same phone, email, or address already exists in your company database.\n\n## If a Duplicate Is Found\n\nA red banner appears in the New Appointment form showing:\n- The existing customer's name\n- Their phone number (highlighted if it matched)\n- Their address (highlighted if it matched)\n\n## Your Options\n\n1. **Book Appt for Existing Customer** -- creates a new appointment linked to the existing record (most common)\n2. **View Customer Record** -- navigate to their profile to verify\n3. **Create as New Anyway** -- if this is genuinely a different person at the same address\n\n## Why This Matters\n\nDuplicate customers cause confusion in reporting, commission tracking, and follow-up scheduling.`,
    commonMistakesJson: ['Creating a duplicate instead of using the existing record', 'Ignoring the conflict banner'],
    tagsJson: ['duplicate', 'customer', 'conflict', 'detection'],
    status: 'published',
  },
  // ── Property Research ─────────────────────────────────────────────────
  {
    categorySlug: 'property-research',
    slug: 'lib-aerial-imagery',
    title: 'Aerial Imagery and Window Count',
    summary: 'Using aerial and satellite imagery to estimate window count before visiting the property.',
    bodyMarkdown: `## What Is Aerial Imagery?\n\nAerial imagery provides a bird's-eye view of the property. It helps you estimate the number of windows per elevation before arriving.\n\n## How to Use\n\n1. Enter the property address in Quick Estimate or Property Research\n2. The system loads satellite/aerial imagery\n3. Count visible windows on each elevation\n4. Use this count to generate a ballpark estimate\n\n## Limitations\n\n- Aerial views show the roof, not always the walls\n- Trees and landscaping may obscure windows\n- Always verify in person before quoting\n- AI-assisted counts are estimates, not guarantees`,
    commonMistakesJson: ['Trusting aerial count as final without in-person verification', 'Not accounting for windows obscured by trees'],
    tagsJson: ['aerial', 'imagery', 'window count', 'property research'],
    status: 'published',
  },
  {
    categorySlug: 'property-research',
    slug: 'lib-street-view',
    title: 'Street View and 3D Property Views',
    summary: 'Using street-level and 3D imagery to preview the property before your visit.',
    bodyMarkdown: `## Street View\n\nStreet-level imagery shows the front and sometimes sides of the property. Use it to:\n- Identify the front elevation window count\n- Check for visible exterior conditions (brick, vinyl, wood)\n- Note the front door location for sketch orientation\n\n## 3D Views\n\nWhere available, 3D views let you rotate around the property to see all elevations.\n\n## Important\n\nImagery may be months or years old. Verify conditions in person.`,
    tagsJson: ['street view', '3D', 'property research', 'imagery'],
    status: 'published',
  },
  // ── Field App ─────────────────────────────────────────────────────────
  {
    categorySlug: 'field-app',
    slug: 'lib-field-app-tabs',
    title: 'Field App Tab Navigation',
    summary: 'The 5 bottom tabs and what each one does: Home, Pricing, Sketch, Checklist, Proposal.',
    bodyMarkdown: `## Bottom Tab Bar\n\nThe field app has 5 tabs at the bottom:\n\n| Tab | Purpose |\n|-----|--------|\n| Home | Customer info, overview, navigation |\n| Pricing | Add/edit openings, set prices |\n| Sketch | Draw house outline, place markers |\n| Checklist | Review checklist, fix required items |\n| Proposal | Generate and present the proposal |\n\n## Tab Order\n\nTabs follow the natural workflow left to right. Complete Home before Pricing, Pricing before Sketch, etc.\n\n## Navigation\n\nTap any tab to switch. Your data is saved automatically as you navigate between tabs.`,
    tagsJson: ['field app', 'tabs', 'navigation', 'mobile'],
    status: 'published',
  },
  {
    categorySlug: 'field-app',
    slug: 'lib-qr-handoff',
    title: 'QR Code Device Handoff',
    summary: 'How to use QR codes to hand the app to the customer for signature or to sync between devices.',
    bodyMarkdown: `## What Is QR Handoff?\n\nQR handoff lets you generate a QR code that the customer scans on their own phone or tablet. They can then sign documents or review the proposal on their own screen.\n\n## How to Use\n\n1. Navigate to the Signing section\n2. Click "Generate QR Code"\n3. Show the QR code to the customer\n4. Customer scans with their phone camera\n5. Customer signs on their screen\n6. Signatures sync back to your device in real time\n\n## When to Use\n\n- Contactless signing (customer preference)\n- Customer wants to review on their own device\n- Multiple signers need to sign on separate devices\n\n## Troubleshooting\n\n- If QR does not work, use the direct link option\n- Customer needs internet access\n- Customer's browser must allow camera permissions for scanning`,
    commonMistakesJson: ['Not verifying all signatures synced after QR handoff', 'Customer closing browser before completing signature'],
    tagsJson: ['QR', 'handoff', 'signing', 'mobile', 'sync'],
    status: 'published',
  },
  // ── Siding and Exterior ───────────────────────────────────────────────
  {
    categorySlug: 'siding-exterior',
    slug: 'lib-siding-types',
    title: 'Siding Types: Vinyl, Wood, Brick, Stucco, Hardie',
    summary: 'How to identify exterior siding material and why it matters for window replacement.',
    bodyMarkdown: `## Common Siding Types\n\n| Type | Appearance | Impact on Installation |\n|------|------------|----------------------|\n| Vinyl | Horizontal planks, plastic feel | Standard installation |\n| Wood | Horizontal planks, natural grain | May need trim repair |\n| Brick | Masonry blocks | Brick deduction required, return depth critical |\n| Stucco | Smooth or textured plaster | May need patching after installation |\n| Hardie (Fiber Cement) | Smooth or textured planks | Similar to wood, heavier |\n| Stone Veneer | Decorative stone overlay | Return depth and structural considerations |\n\n## Why Siding Matters\n\nThe exterior material determines:\n- Measurement method (brick deduction vs standard)\n- Required options (trim, header, flashing)\n- Installation complexity and cost\n- Potential chargebacks if material is identified incorrectly\n\n## How to Identify\n\n1. Look at the exterior wall around the window\n2. Tap or press the material to feel (vinyl flexes, brick is rigid)\n3. Note the material in the opening notes\n4. Photograph the exterior condition`,
    requiredPhotosJson: ['Exterior photo showing siding material clearly', 'Close-up of siding near window frame'],
    commonMistakesJson: ['Not identifying brick vs brick veneer', 'Forgetting to note siding type in opening notes'],
    tagsJson: ['siding', 'vinyl', 'wood', 'brick', 'stucco', 'exterior'],
    status: 'published',
  },
  {
    categorySlug: 'siding-exterior',
    slug: 'lib-exterior-trim',
    title: 'Exterior Trim and J-Channel',
    summary: 'When to add trim, J-channel, or capping to the window installation.',
    bodyMarkdown: `## What Is Exterior Trim?\n\nExterior trim is the casing around the window on the outside of the house. On vinyl-sided homes, J-channel is used to create a finished edge where the siding meets the window.\n\n## When Trim Is Required\n\n- Existing trim is rotted or damaged\n- No existing trim (bare opening)\n- Customer requests upgraded trim\n- Vinyl siding with missing or broken J-channel\n\n## Pricing Impact\n\nTrim is a chargeable option. It adds cost per window. Always check the existing trim condition and note it before pricing.\n\n## Common Trim Types\n\n- Vinyl wrap/capping\n- Aluminum coil stock\n- PVC trim board\n- J-channel (vinyl siding specific)`,
    chargeableOptionsJson: ['Vinyl trim wrap', 'Aluminum capping', 'J-channel replacement', 'PVC trim board'],
    commonMistakesJson: ['Not noting damaged trim during measurement', 'Forgetting trim charge on bare openings'],
    tagsJson: ['trim', 'J-channel', 'capping', 'exterior', 'siding'],
    status: 'published',
  },
  // ── Cush Measure ──────────────────────────────────────────────────────
  {
    categorySlug: 'cush-measure',
    slug: 'lib-cush-measure-import',
    title: 'Cush Measure Import and Verification',
    summary: 'How to import measurements from the Cush Measure app and verify them in Window World Assistant.',
    bodyMarkdown: `## What Is Cush Measure?\n\nCush Measure is a third-party measurement app that captures window dimensions using laser measurement tools. Window World Assistant can import Cush Measure data to pre-populate opening sizes.\n\n## How to Import\n\n1. Complete your measurements in Cush Measure\n2. Export from Cush Measure (file or cloud sync)\n3. In Window World Assistant, go to the appointment\n4. Click Import from Cush Measure\n5. Review each imported measurement\n6. Verify and adjust as needed\n\n## Verification\n\nAlways verify imported measurements against your own notes. Cush Measure captures raw dimensions -- the deduction rules in Window World Assistant may differ.\n\n## Important\n\nCush Measure import is a convenience feature, not a replacement for verification.`,
    commonMistakesJson: ['Accepting imported measurements without verification', 'Not applying Window World Assistant deduction rules after import'],
    tagsJson: ['Cush Measure', 'import', 'measurement', 'verification'],
    status: 'published',
  },
  // ── Photo Documentation ───────────────────────────────────────────────
  {
    categorySlug: 'photo-documentation',
    slug: 'lib-required-photos',
    title: 'Required Photos Per Window Type',
    summary: 'Which photos are required for each window type and why they matter.',
    bodyMarkdown: `## Why Photos Matter\n\nPhotos serve three purposes:\n1. **Verification** -- auditors and managers verify your measurements and selections\n2. **Installation** -- installers use photos to prepare for the job\n3. **Dispute resolution** -- photos prove the condition at time of sale\n\n## Standard Required Photos\n\n| Photo | When Required |\n|-------|---------------|\n| Full exterior of window in frame | Every window |\n| Measurement tape in opening (width) | Every window |\n| Measurement tape in opening (height) | Every window |\n| Close-up of sash hardware | If window type is ambiguous |\n| Brick/siding condition | Brick or damaged siding |\n| Interior view | If interior condition affects installation |\n| Return depth measurement | If window is setback |\n| Existing grid close-up | If grids are present |\n| Existing damage | Any visible damage |\n\n## Photo Tips\n\n- Use good lighting\n- Include the measurement tape in the frame\n- Photograph from a straight angle, not at an angle\n- Include enough context to identify which window it is`,
    commonMistakesJson: ['Not photographing measurement tape in the opening', 'Blurry or dark photos', 'Not enough context to identify the window'],
    tagsJson: ['photos', 'documentation', 'required photos', 'evidence'],
    status: 'published',
  },
  {
    categorySlug: 'photo-documentation',
    slug: 'lib-ai-photo-reader',
    title: 'AI Photo Reader: Tape Measurement Recognition',
    summary: 'How the AI photo reader extracts measurements from photos of tape measures.',
    bodyMarkdown: `## What Is the AI Photo Reader?\n\nThe AI Photo Reader uses computer vision to read measurements from photos of tape measures placed in window openings. It extracts the width and height automatically.\n\n## How to Use\n\n1. Place the tape measure in the opening\n2. Take a clear, well-lit photo\n3. The AI reads the tape markings\n4. Extracted measurements appear in the opening editor\n5. Verify and confirm the reading\n\n## Tips for Best Results\n\n- Use a bright, contrasting tape measure\n- Ensure the tape is straight and flat\n- Good lighting is critical\n- Photograph from directly in front, not at an angle\n- Include the full measurement in the frame\n\n## Fallback\n\nIf the AI cannot read the tape, enter the measurement manually.`,
    commonMistakesJson: ['Poor lighting causing misread', 'Tape not straight in the photo', 'Accepting AI reading without verification'],
    tagsJson: ['AI', 'photo reader', 'tape', 'measurement', 'computer vision'],
    status: 'published',
  },
  // ── Exterior Conditions ───────────────────────────────────────────────
  {
    categorySlug: 'exterior-conditions',
    slug: 'lib-brick-openings',
    title: 'Brick Openings: Measurement and Return Depth',
    summary: 'Special measurement rules for windows in brick walls including return depth and brick deduction.',
    bodyMarkdown: `## Brick Opening Measurement\n\nWindows in brick walls require special attention:\n\n1. **Measure from brick reveal to brick reveal** -- not the outer face of the brick\n2. **Apply brick deduction** -- configured by your admin in Measurement Rules\n3. **Measure return depth** -- the distance from the face of the brick to the face of the existing window\n\n## Return Depth\n\nReturn depth determines how far the new window sits back from the wall face. Typical return depths:\n- Standard vinyl siding: 0" (flush)\n- Single brick: 2-3"\n- Double brick: 4-5"\n\n## Why It Matters\n\nIncorrect brick measurements are one of the top chargeback causes. The window will not fit if the brick deduction or return depth is wrong.\n\n## Required Photos\n\n- Full photo showing brick around the window\n- Close-up of return depth with tape measure\n- Photo showing brick reveal edges`,
    requiredPhotosJson: ['Brick around window', 'Return depth with tape measure', 'Brick reveal edges'],
    requiredMeasurementsJson: ['Width: brick reveal to brick reveal', 'Height: brick reveal to brick reveal', 'Return depth'],
    commonMistakesJson: ['Measuring to outer face of brick instead of reveal', 'Forgetting return depth', 'Not applying brick deduction'],
    chargeableOptionsJson: ['Return depth surcharge if applicable'],
    installerNotesJson: ['Installer must verify return depth on arrival', 'Shims may be needed for deep returns'],
    tagsJson: ['brick', 'return depth', 'deduction', 'measurement', 'exterior'],
    status: 'published',
  },
  // ── Financing ─────────────────────────────────────────────────────────
  {
    categorySlug: 'financing',
    slug: 'lib-finance-presentation',
    title: 'Presenting Finance Options to Customers',
    summary: 'How to present monthly payment options alongside the total price for maximum closing effectiveness.',
    bodyMarkdown: `## Why Present Financing?\n\nMonthly payment presentation is your most powerful closing tool. Many customers who cannot pay $15,000 cash can afford $150/month.\n\n## How to Present\n\n1. Complete the proposal with the total price\n2. Navigate to the Finance tab or Finance Options section\n3. Select applicable finance plans (e.g., 12 months same-as-cash, 60 months, 120 months)\n4. Show the customer the monthly payment for each plan\n5. Let the customer choose their preferred option\n\n## Finance Plan Types\n\n| Plan | Description |\n|------|------------|\n| Same-as-cash | No interest if paid in full within the promo period |\n| Low monthly | Extended term, lower monthly payment |\n| No payment for X months | Deferred start |\n\n## Important\n\n- Never guarantee approval\n- Financing requires a credit check\n- Present financing AFTER the total price, not instead of it\n- Always show multiple options to let the customer choose`,
    commonMistakesJson: ['Not presenting financing at all', 'Presenting financing before showing the total price', 'Guaranteeing approval before the credit check'],
    tagsJson: ['financing', 'monthly payment', 'closing', 'finance options'],
    status: 'published',
  },
  // ── Installer Handoff ─────────────────────────────────────────────────
  {
    categorySlug: 'installer-handoff',
    slug: 'lib-production-packet',
    title: 'Production Packet Contents',
    summary: 'What goes into the production packet the installer receives and why accuracy matters.',
    bodyMarkdown: `## What Is the Production Packet?\n\nThe production packet is the complete document set the installer receives before arriving at the job site. It includes:\n\n- Signed contract\n- Window specifications for each opening\n- House sketch with marker locations\n- All required photos\n- Installer notes\n- Special conditions (brick, high-rise, access issues)\n\n## Why Accuracy Matters\n\nIf the production packet has errors:\n- Wrong product is delivered\n- Installer cannot complete the job\n- Chargeback is issued against the rep\n- Customer experience suffers\n\n## Your Responsibility\n\nAs the sales rep, everything in the production packet comes from your work. Complete every field, take every required photo, and resolve every Review flag before submitting.`,
    commonMistakesJson: ['Submitting with unresolved Review flags', 'Missing installer notes for unusual conditions', 'Incomplete photo set'],
    tagsJson: ['production packet', 'installer', 'handoff', 'documents'],
    status: 'published',
  },
  {
    categorySlug: 'installer-handoff',
    slug: 'lib-installer-notes',
    title: 'Writing Effective Installer Notes',
    summary: 'How to write installer notes that prevent callbacks, confusion, and chargebacks.',
    bodyMarkdown: `## What Are Installer Notes?\n\nInstaller notes are free-text instructions attached to each opening or to the overall job. They tell the installer about conditions that are not captured by standard fields.\n\n## Good Installer Notes\n\n- "Window #3 is behind a large bush -- access from inside only"\n- "Customer requests all grid patterns to match existing"\n- "Brick return depth is 4.5 inches -- confirmed with tape photo"\n- "Dog in backyard -- customer will secure before install date"\n\n## Bad Installer Notes\n\n- "See photos" (which photos?)\n- "Be careful" (of what?)\n- "" (empty -- no notes at all)\n\n## When to Write Notes\n\n- Unusual access conditions\n- Customer-specific requests\n- Conditions not captured by standard fields\n- Any measurement that required special handling`,
    commonMistakesJson: ['Empty installer notes on unusual openings', 'Vague notes that do not specify the issue', 'Not noting access restrictions'],
    tagsJson: ['installer notes', 'handoff', 'communication', 'field notes'],
    status: 'published',
  },
  // ── Customer Service Handoff ──────────────────────────────────────────
  {
    categorySlug: 'customer-service',
    slug: 'lib-post-install-followup',
    title: 'Post-Install Customer Follow-Up',
    summary: 'How to follow up with customers after installation for satisfaction, reviews, and referrals.',
    bodyMarkdown: `## Why Post-Install Follow-Up?\n\nPost-install follow-up:\n- Confirms customer satisfaction\n- Catches issues before they become complaints\n- Generates reviews and referrals\n- Builds long-term relationships\n\n## Timeline\n\n| When | Action |\n|------|--------|\n| Day of install | Check in with customer after crew leaves |\n| 1 week post | Call to check satisfaction |\n| 2 weeks post | Request Google/Yelp review |\n| 1 month post | Ask for referral |\n\n## What to Ask\n\n- Are you happy with the windows?\n- Is everything working properly?\n- Do you have any questions about maintenance?\n- Would you recommend us to friends or family?`,
    commonMistakesJson: ['Not following up at all', 'Waiting too long to ask for a review', 'Not asking for referrals'],
    tagsJson: ['follow-up', 'post-install', 'customer service', 'reviews', 'referrals'],
    status: 'published',
  },
  // ── Pricing Admin ─────────────────────────────────────────────────────
  {
    categorySlug: 'pricing-admin',
    slug: 'lib-pricing-import',
    title: 'Pricing Import: Uploading New Price Lists',
    summary: 'How to import new pricing from a spreadsheet and activate a new pricing version.',
    bodyMarkdown: `## Pricing Import Overview\n\nPricing Import lets admins upload a spreadsheet of new prices to create a new pricing version.\n\n## Steps\n\n1. Navigate to Pricing Import in the admin menu\n2. Download the import template\n3. Fill in the template with new prices\n4. Upload the completed spreadsheet\n5. Review the diff -- the system shows what changed\n6. Activate the new version\n\n## Important Rules\n\n- Always review the diff before activating\n- New versions apply to new quotes only -- existing quotes keep their original pricing\n- Keep a backup of the previous version\n- Test with a sample quote after activation\n\n## Common Issues\n\n- Missing rows in the spreadsheet (creates $0 prices)\n- Wrong column format (prices must be numbers, not text)\n- Accidentally activating before review is complete`,
    commonMistakesJson: ['Activating without reviewing the diff', 'Missing rows causing $0 prices', 'Wrong column format'],
    tagsJson: ['pricing import', 'spreadsheet', 'version', 'admin'],
    status: 'published',
  },
  // ── Measurement Rules Admin ───────────────────────────────────────────
  {
    categorySlug: 'measurement-rules-admin',
    slug: 'lib-measurement-rules-config',
    title: 'Measurement Rules Configuration',
    summary: 'How admins configure Cush Measure deduction values, brick rules, and measurement overrides.',
    bodyMarkdown: `## What Are Measurement Rules?\n\nMeasurement rules control how raw measurements are converted into order sizes. They include:\n- Cush Measure deduction values\n- Brick deduction rules\n- Minimum/maximum size limits\n- Rounding rules\n\n## Configuration\n\n1. Navigate to Measurement Rules in the admin menu\n2. Select the rule category to edit\n3. Set the deduction value or formula\n4. Save and activate\n\n## Rule Categories\n\n| Category | Description |\n|----------|------------|\n| Cush Measure | Standard deduction per side |\n| Brick Deduction | Additional deduction for brick openings |\n| Size Limits | Min/max width and height per window type |\n| Rounding | How to round fractional measurements |`,
    tagsJson: ['measurement rules', 'admin', 'configuration', 'Cush Measure', 'brick deduction'],
    status: 'published',
  },
  // ── More Window Types ─────────────────────────────────────────────────
  {
    categorySlug: 'window-types',
    slug: 'lib-window-type-circle-top',
    title: 'Circle Top (CT) Windows',
    summary: 'Full-round or half-round decorative windows above standard windows.',
    bodyMarkdown: `## What Is a Circle Top?\n\nA Circle Top (CT) window is a fixed decorative window with a curved or circular shape. It is typically installed above a standard window or door.\n\n## How to Identify\n\n- Curved top edge (full circle, half circle, or quarter circle)\n- No operable sash\n- Often paired above a DH or PIC window\n- Purely decorative -- provides light, not ventilation\n\n## Measurement\n\nMeasure the overall width and height of the curved opening. Note whether it is a full half-circle or a segment.\n\n## Important\n\nCT windows are custom-fabricated. Accurate measurements and detailed photos are critical.`,
    requiredPhotosJson: ['Full photo of CT window from inside', 'Full photo from outside', 'Measurement tape showing width and height'],
    commonMistakesJson: ['Not distinguishing between half-circle and quarter-circle', 'Inaccurate arc measurements'],
    tagsJson: ['CT', 'circle top', 'decorative', 'window type'],
    status: 'published',
  },
  {
    categorySlug: 'window-types',
    slug: 'lib-window-mulls',
    title: 'Mulled and Joined Window Units',
    summary: 'When multiple windows are joined together (mulled) and how to measure and price them.',
    bodyMarkdown: `## What Is a Mulled Unit?\n\nA mulled unit is two or more windows joined together with a structural mull bar between them. They share a single rough opening.\n\n## How to Identify\n\n- Two or more windows side by side in a single frame\n- A vertical or horizontal bar separates the units\n- The entire assembly fits in one rough opening\n\n## Measurement\n\n1. Measure the overall rough opening (full width x height)\n2. Measure each individual unit within the opening\n3. Note the mull bar width\n4. Document which units are operable and which are fixed\n\n## Pricing\n\nEach unit in the mull prices individually. Mull bars may have an additional charge. The total price is the sum of all units plus the mull hardware.\n\n## Common Configurations\n\n- Twin DH (two DH side by side)\n- Triple DH (three DH side by side)\n- PIC flanked by two DH (picture window center)\n- DH over PIC (stacked)`,
    requiredPhotosJson: ['Full exterior photo of mulled unit', 'Interior photo showing mull bars', 'Measurement of each individual unit'],
    commonMistakesJson: ['Measuring only the overall opening, not individual units', 'Missing the mull bar charge', 'Not noting which units are operable'],
    tagsJson: ['mull', 'joined', 'mulled unit', 'twin', 'triple', 'window type'],
    status: 'published',
  },
  // ── Product Options expanded ──────────────────────────────────────────
  {
    categorySlug: 'product-options',
    slug: 'lib-low-e-argon',
    title: 'Low-E Glass and Argon Gas',
    summary: 'Energy efficiency upgrades: what they do, when to offer them, and pricing impact.',
    bodyMarkdown: `## Low-E Glass\n\nLow-E (Low Emissivity) glass has a thin metallic coating that reflects heat. It keeps the home cooler in summer and warmer in winter.\n\n## Argon Gas\n\nArgon gas fills the space between double-pane glass. It is denser than air and provides better insulation.\n\n## When to Offer\n\n- Customer asks about energy efficiency\n- Home has high energy bills\n- Windows face south or west (most sun exposure)\n- Customer wants to qualify for energy tax credits\n\n## Pricing\n\nLow-E and Argon are chargeable add-ons. They can be offered individually or as a package.\n\n## Key Selling Point\n\nLow-E + Argon can reduce energy costs by 15-25% compared to standard clear glass.`,
    chargeableOptionsJson: ['Low-E glass surcharge', 'Argon gas fill surcharge', 'Low-E + Argon package'],
    commonMistakesJson: ['Not offering Low-E/Argon as an upgrade option', 'Not explaining energy savings to customer'],
    tagsJson: ['Low-E', 'argon', 'energy', 'glass', 'upgrade'],
    status: 'published',
  },
  {
    categorySlug: 'product-options',
    slug: 'lib-foam-insulation',
    title: 'Foam Frame Insulation',
    summary: 'When and why to add foam insulation around the window frame.',
    bodyMarkdown: `## What Is Foam Frame Insulation?\n\nFoam frame insulation fills the hollow chambers inside the window frame with expanding foam, reducing air infiltration and improving energy efficiency.\n\n## When to Offer\n\n- Customer wants maximum energy efficiency\n- Home is in a climate with extreme temperatures\n- Pairing with Low-E/Argon for a complete energy package\n\n## Installation\n\nFoam is injected into the frame at the factory. It cannot be added after manufacturing.\n\n## Pricing\n\nFoam insulation is a per-window surcharge.`,
    chargeableOptionsJson: ['Foam frame insulation surcharge'],
    tagsJson: ['foam', 'insulation', 'energy', 'frame', 'upgrade'],
    status: 'published',
  },
  {
    categorySlug: 'product-options',
    slug: 'lib-screens',
    title: 'Screens: Full Screen vs. No Screen',
    summary: 'When to include a screen, remove a screen, and how it affects pricing.',
    bodyMarkdown: `## Screen Options\n\n| Option | Description |\n|--------|------------|\n| Full Screen | Standard screen included with the window |\n| Half Screen | Screen covers only the bottom sash (DH/SH) |\n| No Screen | No screen included -- may reduce price |\n\n## When to Use No Screen\n\n- Picture (PIC) windows -- no ventilation, no screen needed\n- Customer specifically requests no screen\n- Decorative windows where a screen would block the view\n\n## Pricing\n\n- Full screen is typically included in the base price\n- No screen may provide a small credit\n- Half screen is standard on some window types`,
    chargeableOptionsJson: ['Full screen (usually included)', 'No screen credit'],
    commonMistakesJson: ['Adding a screen to a PIC window', 'Forgetting to note customer screen preference'],
    tagsJson: ['screen', 'full screen', 'no screen', 'half screen'],
    status: 'published',
  },
  {
    categorySlug: 'product-options',
    slug: 'lib-header-flashing',
    title: 'Header Flashing',
    summary: 'Metal flashing above the window to prevent water intrusion.',
    bodyMarkdown: `## What Is Header Flashing?\n\nHeader flashing is a metal strip installed above the window to direct water away from the window frame. It prevents water from seeping behind the siding and into the wall.\n\n## When Required\n\n- Any window without existing flashing\n- Windows where the existing flashing is damaged or corroded\n- New construction or remodel projects\n- Any window where water damage is visible above the frame\n\n## Material\n\nTypically aluminum coil stock, color-matched to the window or trim.\n\n## Pricing\n\nHeader flashing is a per-window chargeable option.`,
    chargeableOptionsJson: ['Header flashing surcharge'],
    commonMistakesJson: ['Not checking for existing flashing during measurement', 'Missing flashing on second-story windows'],
    tagsJson: ['header', 'flashing', 'water', 'drainage', 'exterior'],
    status: 'published',
  },
  {
    categorySlug: 'product-options',
    slug: 'lib-sill-repair',
    title: 'Sill Repair and Replacement',
    summary: 'When the window sill needs repair or replacement during installation.',
    bodyMarkdown: `## What Is Sill Repair?\n\nSill repair involves fixing or replacing a damaged, rotted, or deteriorated window sill as part of the window replacement process.\n\n## When Required\n\n- Visible rot or decay in the existing sill\n- Sill is soft or spongy to the touch\n- Water staining or mold on the sill\n- Sill is sloped away from the window (water pooling)\n\n## Documentation Required\n\n- Photo of the damaged sill from outside\n- Photo from inside if damage is visible\n- Note the severity (minor repair vs full replacement)\n\n## Pricing\n\nSill repair is a chargeable option. The cost varies based on severity.\n\n## Important\n\nDo not assume sill damage without evidence. Photograph and document before adding the charge.`,
    chargeableOptionsJson: ['Minor sill repair', 'Full sill replacement'],
    requiredPhotosJson: ['Photo of damaged sill from outside', 'Photo from inside if visible'],
    commonMistakesJson: ['Adding sill repair without photographic evidence', 'Not noting severity level'],
    tagsJson: ['sill', 'repair', 'replacement', 'rot', 'damage'],
    status: 'published',
  },
  // ── More Pricing/Quotes ───────────────────────────────────────────────
  {
    categorySlug: 'pricing-quotes',
    slug: 'lib-zero-dollar-prices',
    title: 'Fixing $0 Prices',
    summary: 'Why a window shows $0 and how to fix it before presenting the proposal.',
    bodyMarkdown: `## Why Does a Window Show $0?\n\nA $0 price means the pricing engine could not find a matching price for that window's configuration. Common causes:\n\n1. **Missing pricing table entry** -- no price exists for that window type + size combination\n2. **Unusual size** -- the window is outside the standard size range in the pricing table\n3. **Missing options** -- a required pricing component is not configured\n4. **Wrong window type** -- the selected type does not have pricing set up\n\n## How to Fix\n\n1. Open the Review tab -- $0 prices appear as Fix Required items\n2. Click Fix to navigate to the opening\n3. Verify the window type and size are correct\n4. If the price is genuinely missing, contact your manager or pricing admin\n5. The pricing admin will add the missing entry in Pricing Admin\n\n## Important\n\nNever present a proposal with $0 prices. It is a Fix Required blocker and will be flagged by the auditor.`,
    commonMistakesJson: ['Presenting proposal with $0 prices', 'Manually entering a price instead of fixing the root cause', 'Ignoring $0 warnings'],
    tagsJson: ['$0', 'zero price', 'missing price', 'pricing error', 'fix'],
    status: 'published',
  },
  {
    categorySlug: 'pricing-quotes',
    slug: 'lib-discount-rules',
    title: 'Discount Rules and Price Floor',
    summary: 'When discounts are allowed, the minimum price floor, and how unauthorized discounts affect commissions.',
    bodyMarkdown: `## Discount Policy\n\nDiscounts may be offered within the guidelines set by your company. There is typically a minimum price floor below which you cannot discount without manager approval.\n\n## Price Floor\n\nThe price floor is the minimum price per window or per job below which you cannot go. This protects company profitability and your commission base.\n\n## Manager Approval\n\nIf a customer negotiates below the price floor:\n1. Note the requested price\n2. Contact your manager for approval\n3. If approved, the manager will override in the system\n4. If denied, present the best available price\n\n## Impact on Commission\n\nExcessive discounts reduce the revenue base, which reduces your commission. Selling at full price is always better for your payout.\n\n## Unauthorized Discounts\n\nGiving unauthorized discounts:\n- May be reversed by management\n- Could result in disciplinary action\n- Always reduces your commission\n- May trigger an audit flag`,
    commonMistakesJson: ['Giving discounts below the price floor without approval', 'Not understanding how discounts affect commission', 'Verbally promising a price the system will not allow'],
    tagsJson: ['discount', 'price floor', 'commission', 'negotiation', 'pricing'],
    status: 'published',
  },
  // ── More Review ───────────────────────────────────────────────────────
  {
    categorySlug: 'review-red-flags',
    slug: 'lib-fix-buttons',
    title: 'Using Fix Buttons and Change Menus',
    summary: 'How to navigate from a Review flag directly to the problem using Fix buttons.',
    bodyMarkdown: `## Fix Buttons\n\nEach item in the Review tab has a Fix button. Clicking it navigates you directly to the opening, field, or section that needs attention.\n\n## How Fix Navigation Works\n\n1. Open the Review tab\n2. Find the flagged item\n3. Click Fix\n4. The app navigates to the exact opening/field with the problem\n5. Make the correction\n6. Navigate back to Review to verify\n\n## Change Menus\n\nSome flags offer a Change dropdown instead of a Fix button. This lets you make the correction directly from the Review panel without navigating away.\n\n## Best Practice\n\nWork through all Fix Required items first (red), then address Recommended items (yellow). Do not skip the return to Review after each fix.`,
    commonMistakesJson: ['Not returning to Review after fixing an item', 'Ignoring Recommended items'],
    tagsJson: ['fix', 'review', 'navigation', 'flags', 'change menu'],
    status: 'published',
  },
  // ── More Contract/Proposal ────────────────────────────────────────────
  {
    categorySlug: 'proposal-contract',
    slug: 'lib-good-better-best',
    title: 'Good/Better/Best Proposal Tiers',
    summary: 'How to present multiple pricing tiers to customers for higher close rates.',
    bodyMarkdown: `## What Are Tiers?\n\nGood/Better/Best tiers present three levels of product/service to the customer:\n\n| Tier | Description |\n|------|------------|\n| Good | Base product, standard options |\n| Better | Base + energy upgrades (Low-E, Argon) |\n| Best | Full package: energy + grids + foam + premium features |\n\n## Why Use Tiers?\n\n- Gives the customer a sense of choice and control\n- Anchors the middle option as the most popular\n- Increases average sale price by 10-20%\n- Reduces objections -- customer picks their comfort level\n\n## How to Present\n\n1. Generate the proposal\n2. Select the tier presentation option\n3. Show all three tiers side by side\n4. Highlight the Better or Best tier as the most popular\n5. Let the customer choose\n\n## Important\n\nAlways show the monthly payment for each tier if financing is available.`,
    commonMistakesJson: ['Only presenting one price option', 'Not highlighting the recommended tier', 'Forgetting monthly payment on each tier'],
    tagsJson: ['tiers', 'good better best', 'proposal', 'upsell', 'closing'],
    status: 'published',
  },
  {
    categorySlug: 'proposal-contract',
    slug: 'lib-warranty-maintenance',
    title: 'Warranty and Maintenance Agreement',
    summary: 'Understanding the warranty document, maintenance agreement, and what customers need to know.',
    bodyMarkdown: `## Warranty\n\nWindow World provides a lifetime limited warranty on windows and installation. The warranty document is included in every proposal and contract.\n\n## What It Covers\n\n- Glass seal failure (fogging between panes)\n- Hardware defects\n- Frame manufacturing defects\n- Installation workmanship\n\n## What It Does NOT Cover\n\n- Damage caused by customer (accidental breakage, misuse)\n- Acts of nature (hail, flooding)\n- Normal wear and tear\n\n## Maintenance Agreement\n\nThe maintenance agreement outlines what the customer must do to keep the warranty valid:\n- Clean windows regularly\n- Do not paint over hardware\n- Report issues promptly\n\n## Customer Responsibilities\n\nMake sure the customer understands the warranty terms before signing. Walk through the key points during the proposal presentation.`,
    tagsJson: ['warranty', 'maintenance', 'agreement', 'coverage', 'contract'],
    status: 'published',
  },
  // ── More Door ─────────────────────────────────────────────────────────
  {
    categorySlug: 'door-types',
    slug: 'lib-patio-door-measurement',
    title: 'Patio Door Measurement',
    summary: 'How to measure a sliding patio door opening including width, height, and handing.',
    bodyMarkdown: `## Patio Door Measurement\n\n1. **Width**: Measure the full rough opening width from stud to stud\n2. **Height**: Measure from the subfloor (not the threshold) to the header\n3. **Handing**: Determine OX or XO by standing outside the door\n\n## Handing Reminder\n\n- **OX**: Standing outside, the operable panel is on your LEFT\n- **XO**: Standing outside, the operable panel is on your RIGHT\n\n## Additional Measurements\n\n- Threshold height\n- Return depth if recessed\n- Existing door width (for comparison)\n\n## Required Photos\n\n- Full exterior photo of existing door\n- Interior photo showing door track\n- Close-up of hinge/track side showing handing\n- Measurement tape in opening`,
    requiredPhotosJson: ['Full exterior of existing door', 'Interior door track', 'Handing identification photo', 'Measurement tape in opening'],
    requiredMeasurementsJson: ['Width: stud to stud', 'Height: subfloor to header', 'Threshold height'],
    commonMistakesJson: ['Measuring to the threshold instead of the subfloor', 'Confusing OX and XO', 'Not photographing existing handing'],
    tagsJson: ['patio door', 'sliding door', 'measurement', 'OX', 'XO', 'door type'],
    status: 'published',
  },
  {
    categorySlug: 'door-types',
    slug: 'lib-french-doors',
    title: 'French Doors and Hinged Patio Doors',
    summary: 'Double-hinged patio doors that open outward or inward.',
    bodyMarkdown: `## What Are French Doors?\n\nFrench doors are a pair of hinged doors that open from the center. Both doors are operable. They are often used as patio doors or balcony exits.\n\n## Handing\n\nFrench doors use the same LHI/LHO/RHI/RHO codes as entry doors, but applied to the primary (active) door.\n\n## Measurement\n\n1. Measure the full rough opening width and height\n2. Note the handing of the active door\n3. Note which door is the active (primary) door\n4. Measure the threshold\n\n## Important\n\nFrench doors are significantly more expensive than sliding patio doors. Confirm the customer's preference and budget.`,
    requiredPhotosJson: ['Full exterior photo', 'Interior photo showing both doors', 'Hinge side identification'],
    commonMistakesJson: ['Not identifying which door is the active (primary) door', 'Pricing as a single door instead of a pair'],
    tagsJson: ['French door', 'hinged patio door', 'door type'],
    status: 'published',
  },
  // ── Sketch expanded ───────────────────────────────────────────────────
  {
    categorySlug: 'sketch-photos',
    slug: 'lib-arrange-openings',
    title: 'Arrange Openings and Front Door Marker',
    summary: 'How to reorder openings on the sketch and why the front door marker anchors the layout.',
    bodyMarkdown: `## Arrange Openings\n\nArrange Openings reorders the opening list to match the physical layout of the house. This makes the production packet easier for the installer to follow.\n\n## How to Arrange\n\n1. Open the Sketch tab\n2. Click Arrange Openings\n3. Drag openings to reorder them by elevation (front, right, rear, left)\n4. Within each elevation, order left to right\n\n## Front Door Marker\n\nThe Front Door Marker is a special sketch marker that indicates the front door location. It anchors the orientation of the sketch.\n\n## Why It Matters\n\nPlacing the front door marker first:\n- Establishes which side of the house is "front"\n- Helps the installer orient themselves on arrival\n- Makes the sketch readable for anyone who visits the property later\n\n## Best Practice\n\nAlways place the front door marker before placing any window markers.`,
    commonMistakesJson: ['Not placing the front door marker', 'Not reordering openings to match the physical layout', 'Random opening order in the production packet'],
    tagsJson: ['arrange', 'openings', 'front door', 'marker', 'sketch', 'order'],
    status: 'published',
  },
  // ── More Follow-Up ────────────────────────────────────────────────────
  {
    categorySlug: 'follow-up-close',
    slug: 'lib-referral-request',
    title: 'Requesting Referrals',
    summary: 'How and when to ask for referrals from customers.',
    bodyMarkdown: `## When to Ask\n\n- After a successful sale (at the appointment)\n- After installation (during post-install follow-up)\n- After a positive review\n\n## How to Ask\n\nBe direct and specific:\n- "Do you know anyone else who might be interested in new windows?"\n- "We offer a referral bonus if they become a customer."\n- "Is there anyone in your neighborhood who has mentioned needing windows?"\n\n## Referral Tracking\n\nLog all referrals in the app:\n1. Open the appointment\n2. Navigate to Follow-Up\n3. Select "Referral Request"\n4. Enter the referred customer's name and phone\n\n## Why Referrals Matter\n\nReferral leads close at 2-3x the rate of cold leads. They are the highest quality leads you can generate.`,
    commonMistakesJson: ['Not asking for referrals at all', 'Asking too early (before the customer is satisfied)', 'Not logging referrals in the system'],
    tagsJson: ['referral', 'follow-up', 'leads', 'closing'],
    status: 'published',
  },
  // ── More Commissions ──────────────────────────────────────────────────
  {
    categorySlug: 'commissions',
    slug: 'lib-reading-commission-statement',
    title: 'Reading Your Commission Statement',
    summary: 'How to read the My Money page, understand deductions, and verify your payout.',
    bodyMarkdown: `## My Money Page Breakdown\n\n| Section | What It Shows |\n|---------|---------------|\n| Pending | Jobs sold but not yet installed |\n| Earned | Jobs installed and approved -- ready for payment |\n| Deductions | Chargebacks, cancellations, adjustments |\n| Total | Net payout for the pay period |\n\n## Understanding Deductions\n\n- **Chargeback**: Product remade due to rep error -- deducted from commission\n- **Cancellation**: Customer cancelled after order -- may result in negative commission\n- **Adjustment**: Manager or admin manual adjustment (up or down)\n\n## Verifying Your Payout\n\n1. Compare each job against your notes\n2. Check that sold jobs appear in Pending\n3. Verify installed jobs moved to Earned\n4. Review any deductions and ask your manager if unclear\n\n## Disputes\n\nIf you believe a deduction is incorrect, document the issue and bring it to your manager with evidence.`,
    commonMistakesJson: ['Not checking My Money regularly', 'Not disputing incorrect deductions promptly', 'Not understanding what causes deductions'],
    tagsJson: ['commission', 'my money', 'statement', 'deductions', 'payout'],
    status: 'published',
  },
  // ── More Auditor ──────────────────────────────────────────────────────
  {
    categorySlug: 'auditor-guide',
    slug: 'lib-auditor-override',
    title: 'Overriding Audit Flags',
    summary: 'When and how managers can override audit flags with justification.',
    bodyMarkdown: `## When to Override\n\nAudit flags can be overridden when:\n- The flag is a false positive (system flagged something that is actually correct)\n- The customer explicitly agreed to an exception\n- There is documented justification\n\n## How to Override\n\n1. Open the flagged job in the Office Queue\n2. Click the flag detail\n3. Select Override\n4. Enter a justification note (required)\n5. Confirm\n\n## Important Rules\n\n- Only managers and auditors can override flags\n- Every override is logged in the audit trail\n- Excessive overrides without justification may be reviewed\n- Critical flags (tempered glass, code compliance) should rarely be overridden\n\n## Who Can See Overrides\n\n- Manager who overrode the flag\n- Any auditor reviewing the job\n- Admin in the audit log`,
    commonMistakesJson: ['Overriding without justification', 'Overriding code compliance flags', 'Not documenting the reason'],
    tagsJson: ['auditor', 'override', 'flags', 'justification', 'manager'],
    status: 'published',
  },
  // ── More Troubleshooting ──────────────────────────────────────────────
  {
    categorySlug: 'troubleshooting',
    slug: 'lib-offline-sync',
    title: 'Offline Mode and Sync Recovery',
    summary: 'What happens when you lose connection and how to recover data after going back online.',
    bodyMarkdown: `## Offline Behavior\n\nWhen your device loses internet connection:\n- Previously loaded data remains visible\n- New entries are queued in the local sync queue\n- The app shows an offline indicator\n- You can continue working\n\n## Coming Back Online\n\nWhen connection is restored:\n1. The sync queue automatically processes pending changes\n2. Data syncs to the cloud\n3. The offline indicator disappears\n4. Changes made by others may appear\n\n## Sync Conflicts\n\nIf someone edited the same record while you were offline:\n- The server's version is kept as the source of truth\n- Your offline changes are applied on top if compatible\n- If there is a conflict, the most recent change wins\n\n## Recovery Steps If Data Seems Missing\n\n1. Force-refresh the browser\n2. Check that you are on the same account\n3. Check the sync queue status\n4. If data is still missing, contact your manager`,
    commonMistakesJson: ['Closing the app before the sync queue finishes', 'Assuming data is lost when it is just queued', 'Not checking sync status'],
    tagsJson: ['offline', 'sync', 'recovery', 'connection', 'troubleshooting'],
    status: 'published',
  },
  {
    categorySlug: 'troubleshooting',
    slug: 'lib-browser-cache',
    title: 'Clearing Browser Cache and App Data',
    summary: 'When and how to clear the browser cache to fix display issues.',
    bodyMarkdown: `## When to Clear Cache\n\n- App is showing old data after an update\n- UI looks broken or unstyled\n- Features are not appearing that should be there\n- After a major app update\n\n## How to Clear\n\n### Desktop (Chrome)\n1. Press Ctrl+Shift+R (hard refresh)\n2. Or: Settings > Privacy > Clear Browsing Data > Cached images and files\n\n### iPhone/iPad (Safari)\n1. Settings > Safari > Clear History and Website Data\n2. Or: Open Safari, hold the refresh button, select "Request Desktop Site" then refresh\n\n### iPhone/iPad (Chrome)\n1. Settings > Chrome > Clear Browsing Data\n\n## Important\n\nClearing cache does NOT delete your work. All data is stored in the cloud. Clearing cache only removes locally stored display files.`,
    tagsJson: ['cache', 'browser', 'clear', 'refresh', 'troubleshooting'],
    status: 'published',
  },
  // ── More Glossary ─────────────────────────────────────────────────────
  {
    categorySlug: 'glossary',
    slug: 'lib-glossary-pricing',
    title: 'Pricing and Commission Terms',
    summary: 'Key pricing, commission, and financial terms used in the app.',
    bodyMarkdown: `## Pricing Terms\n\n| Term | Definition |\n|------|------------|\n| Line Pricing | Each window priced individually |\n| Job-Level Pricing | Single price for the entire job |\n| Price Floor | Minimum allowed price per window or job |\n| Pricing Version | A dated set of prices; new versions replace old ones |\n| Surcharge | Additional cost for an option (tempered, grids, etc.) |\n| Base Price | Starting price before options |\n\n## Commission Terms\n\n| Term | Definition |\n|------|------------|\n| Pending | Job sold but not installed |\n| Earned | Job installed and approved for payment |\n| Chargeback | Commission deduction for a product remake |\n| Cancellation | Commission reversal for a cancelled job |\n| Net Revenue | Total revenue minus costs |\n| Commission Rate | Percentage of net revenue paid to rep |\n\n## Financial Terms\n\n| Term | Definition |\n|------|------------|\n| Same-as-Cash | No interest if paid within promo period |\n| APR | Annual Percentage Rate on financed amount |\n| Monthly Payment | Customer's monthly obligation |\n| Credit Check | Verification of customer's creditworthiness |`,
    tagsJson: ['glossary', 'pricing', 'commission', 'financial', 'terms'],
    status: 'published',
  },
  // ── Training/Certification expanded ───────────────────────────────────
  {
    categorySlug: 'training-certification',
    slug: 'lib-manager-certification-review',
    title: 'Manager Certification Review Process',
    summary: 'How managers review and certify rep training completion.',
    bodyMarkdown: `## Certification Flow\n\n1. Rep completes all required training paths\n2. Rep clicks "Request Certification Review"\n3. Manager receives notification\n4. Manager reviews rep's scores and completion status\n5. Manager approves or requests re-training\n6. Certification is recorded in the system\n\n## What Managers Review\n\n- All required paths completed\n- Quiz scores meet minimum passing threshold\n- Scenario responses are reasonable\n- No bypassed or skipped lessons\n\n## Re-Certification\n\nWhen pricing rules, product lines, or procedures change, required paths may be reset. Reps must re-complete and re-certify.`,
    tagsJson: ['certification', 'manager', 'review', 'training', 'approval'],
    status: 'published',
  },
  // ── Office Queue expanded ─────────────────────────────────────────────
  {
    categorySlug: 'office-queue',
    slug: 'lib-returning-jobs',
    title: 'Returning Jobs with Specific Notes',
    summary: 'How to return a job to the rep with clear, actionable notes.',
    bodyMarkdown: `## When to Return a Job\n\n- Missing or incorrect measurements\n- Missing required photos\n- Unsigned contract fields\n- $0 prices not resolved\n- Wrong window type identified\n- Tempered glass missing on code-required window\n\n## How to Write Good Return Notes\n\nBe specific. The rep should know exactly what to fix without guessing.\n\n**Good examples:**\n- "Window #3 is 15 inches from the back door -- add tempered glass"\n- "Photo of measurement for Opening #7 is missing -- retake and upload"\n- "Door handing on Opening #2 says OX but the photo shows hinges on the right -- verify"\n\n**Bad examples:**\n- "Fix the openings"\n- "Needs work"\n- "Check photos"\n\n## What Happens After Return\n\n1. Rep receives a notification\n2. Rep opens the appointment\n3. Rep sees the return notes\n4. Rep fixes the issues\n5. Rep resubmits to the queue\n6. Manager reviews again`,
    commonMistakesJson: ['Vague return notes', 'Approving without checking', 'Not specifying which opening has the issue'],
    tagsJson: ['office queue', 'return', 'notes', 'manager', 'review'],
    status: 'published',
  },
];

// ---------------------------------------------------------------------------
// Expansion Training Paths (12 more to reach 15 total)
// ---------------------------------------------------------------------------

const EXPANSION_PATHS = [
  {
    slug: 'cloud-path-quick-estimate',
    title: 'Quick Estimate and Property Research',
    description: 'Learn to use Quick Estimate, aerial imagery, street view, and AI window counting.',
    roleTarget: 'sales_rep', required: false, sortOrder: 4, iconEmoji: 'QE', estimatedMinutes: 30,
    lessons: [
      { title: 'Using Quick Estimate', summary: 'Generate a ballpark price range before measuring.', lessonType: 'article', bodyMarkdown: '## Quick Estimate\n\nQuick Estimate gives a fast price range based on property research. Use it to set customer expectations before measuring.', sortOrder: 1, durationMinutes: 10, quizJson: [{ id: 'q1', question: 'Quick Estimate should be presented as:', options: [{ id: 'a', text: 'A firm quote', isCorrect: false }, { id: 'b', text: 'A price range only', isCorrect: true }], answer: 'b', explanation: 'Quick Estimate is always a range, never a firm quote.' }] },
      { title: 'Property Research Tools', summary: 'Aerial, street view, and AI-assisted property analysis.', lessonType: 'article', bodyMarkdown: '## Property Research\n\nUse aerial imagery to count windows, street view to identify exterior materials, and AI to estimate conditions before your visit.', sortOrder: 2, durationMinutes: 10, quizJson: [] },
    ],
  },
  {
    slug: 'cloud-path-window-id',
    title: 'Window Type Identification',
    description: 'Master DH, SH, SL, PIC, CAS, AWN, OR, BAY, BOW, CT, and specialty windows.',
    roleTarget: 'sales_rep', required: true, sortOrder: 5, iconEmoji: 'WIN', estimatedMinutes: 45,
    lessons: [
      { title: 'DH vs SH vs SL', summary: 'Identify the three most common window types.', lessonType: 'quiz', bodyMarkdown: '## DH, SH, SL\n\nDH: both sashes slide. SH: only bottom slides. SL: slides horizontally.', sortOrder: 1, durationMinutes: 10, quizJson: [{ id: 'q1', question: 'A window where both sashes slide vertically is:', options: [{ id: 'a', text: 'DH', isCorrect: true }, { id: 'b', text: 'SH', isCorrect: false }, { id: 'c', text: 'SL', isCorrect: false }], answer: 'a', explanation: 'Double Hung (DH) has two operable sashes.' }] },
      { title: 'PIC, CAS, AWN', summary: 'Fixed, casement, and awning windows.', lessonType: 'quiz', bodyMarkdown: '## PIC, CAS, AWN\n\nPIC: fixed, no opening. CAS: cranks open from side. AWN: hinged at top, opens from bottom.', sortOrder: 2, durationMinutes: 10, quizJson: [{ id: 'q1', question: 'A window that cranks open from a side hinge is:', options: [{ id: 'a', text: 'AWN', isCorrect: false }, { id: 'b', text: 'CAS', isCorrect: true }, { id: 'c', text: 'PIC', isCorrect: false }], answer: 'b', explanation: 'Casement (CAS) cranks open on a side hinge.' }] },
      { title: 'Specialty: BAY, BOW, OR, CT', summary: 'Bay, bow, oriel, and circle top windows.', lessonType: 'article', bodyMarkdown: '## Specialty Windows\n\nBAY: angled multi-unit projection. BOW: curved multi-unit projection. OR: split sash (oriel). CT: circle top decorative.', sortOrder: 3, durationMinutes: 15, quizJson: [] },
    ],
  },
  {
    slug: 'cloud-path-door-id',
    title: 'Door Type Identification',
    description: 'Master door handing, sliding doors (OX/XO), and French doors.',
    roleTarget: 'sales_rep', required: true, sortOrder: 6, iconEmoji: 'DOOR', estimatedMinutes: 30,
    lessons: [
      { title: 'Door Handing: OX, XO, LHI, RHO', summary: 'How to determine and enter door handing.', lessonType: 'quiz', bodyMarkdown: '## Door Handing\n\nStand outside. Hinges on left = Left Hand. Door swings toward you = Outswing. OX = operable on left (sliding). XO = operable on right (sliding).', sortOrder: 1, durationMinutes: 15, quizJson: [{ id: 'q1', question: 'Standing outside, if the operable panel of a sliding door is on your left, the code is:', options: [{ id: 'a', text: 'XO', isCorrect: false }, { id: 'b', text: 'OX', isCorrect: true }], answer: 'b', explanation: 'OX means operable on the left (from outside).' }] },
    ],
  },
  {
    slug: 'cloud-path-siding-exterior',
    title: 'Siding and Exterior Conditions',
    description: 'Identify siding types, assess exterior conditions, and note special requirements.',
    roleTarget: 'sales_rep', required: false, sortOrder: 7, iconEmoji: 'SDNG', estimatedMinutes: 25,
    lessons: [
      { title: 'Siding Types and Their Impact', summary: 'Vinyl, wood, brick, stucco, Hardie -- and why it matters.', lessonType: 'article', bodyMarkdown: '## Siding Types\n\nThe exterior material determines measurement method, required options, and installation complexity. Brick requires a deduction and return depth. Vinyl is standard.', sortOrder: 1, durationMinutes: 15, quizJson: [{ id: 'q1', question: 'For a window in a brick wall, you must measure:', options: [{ id: 'a', text: 'The outer face of the brick', isCorrect: false }, { id: 'b', text: 'From brick reveal to brick reveal', isCorrect: true }], answer: 'b', explanation: 'Always measure from the brick reveal (inner edge), not the outer face.' }] },
    ],
  },
  {
    slug: 'cloud-path-measurement',
    title: 'Measurement and Cush Measure',
    description: 'Master rough opening measurement, Cush Measure deductions, and brick rules.',
    roleTarget: 'sales_rep', required: true, sortOrder: 8, iconEmoji: 'MEAS', estimatedMinutes: 40,
    lessons: [
      { title: 'Rough Opening Measurement', summary: 'How to measure the rough opening correctly every time.', lessonType: 'measurement_practice', bodyMarkdown: '## Rough Opening\n\nMeasure the hole in the wall (jamb to jamb for width, sill to head for height). Never measure the existing window frame.', sortOrder: 1, durationMinutes: 15, quizJson: [{ id: 'q1', question: 'The rough opening is:', options: [{ id: 'a', text: 'The existing window frame size', isCorrect: false }, { id: 'b', text: 'The hole in the wall', isCorrect: true }], answer: 'b', explanation: 'The rough opening is the wall opening, not the existing window frame.' }] },
      { title: 'Brick Return Depth', summary: 'Why return depth matters and how to measure it.', lessonType: 'quiz', bodyMarkdown: '## Return Depth\n\nReturn depth is the distance from the wall face to the window face. Critical for brick homes. Always photograph the tape measure showing the return depth.', sortOrder: 2, durationMinutes: 10, quizJson: [] },
    ],
  },
  {
    slug: 'cloud-path-sketch-photo',
    title: 'Sketch and Photo Documentation',
    description: 'Draw house outlines, place markers, take required photos, and use AI photo reader.',
    roleTarget: 'sales_rep', required: false, sortOrder: 9, iconEmoji: 'SKCH', estimatedMinutes: 30,
    lessons: [
      { title: 'Sketch Canvas Basics', summary: 'Draw the house outline and place window markers.', lessonType: 'article', bodyMarkdown: '## Sketch Canvas\n\nDraw the exterior walls, place markers at each window/door, assign each marker to an opening number. Always place the front door marker first.', sortOrder: 1, durationMinutes: 15, quizJson: [] },
      { title: 'Required Photos and AI Reader', summary: 'Which photos are required and how AI reads measurements.', lessonType: 'article', bodyMarkdown: '## Required Photos\n\nEvery window needs: full exterior, measurement tape (width), measurement tape (height). AI Photo Reader can extract measurements from tape photos.', sortOrder: 2, durationMinutes: 15, quizJson: [] },
    ],
  },
  {
    slug: 'cloud-path-options-pricing',
    title: 'Product Options and Chargeable Add-ons',
    description: 'Learn every chargeable option: tempered, grids, Low-E, argon, trim, and more.',
    roleTarget: 'sales_rep', required: true, sortOrder: 10, iconEmoji: 'OPT', estimatedMinutes: 35,
    lessons: [
      { title: 'Tempered Glass Requirements', summary: 'When tempered is required by code and how to enter it.', lessonType: 'quiz', bodyMarkdown: '## Tempered Glass\n\nRequired within 18 inches of a door, in bathrooms, near floor in oversized units. Missing tempered = chargeback + code violation.', sortOrder: 1, durationMinutes: 10, quizJson: [{ id: 'q1', question: 'Tempered glass is required within how many inches of a door?', options: [{ id: 'a', text: '12', isCorrect: false }, { id: 'b', text: '18', isCorrect: true }, { id: 'c', text: '24', isCorrect: false }], answer: 'b', explanation: '18 inches is the code requirement.' }] },
      { title: 'Grids, Screens, and Energy Options', summary: 'Flat vs contoured grids, screen options, Low-E, argon, foam.', lessonType: 'article', bodyMarkdown: '## Options Overview\n\nGrids: flat (budget) or contoured (premium). Screens: full, half, or none. Energy: Low-E glass, argon gas, foam insulation. Each adds a surcharge.', sortOrder: 2, durationMinutes: 15, quizJson: [] },
    ],
  },
  {
    slug: 'cloud-path-pricing-accuracy',
    title: 'Pricing and Contract Accuracy',
    description: 'Understand pricing engine, fix $0 prices, and complete contracts accurately.',
    roleTarget: 'sales_rep', required: true, sortOrder: 11, iconEmoji: 'PRC', estimatedMinutes: 35,
    lessons: [
      { title: 'How the Pricing Engine Works', summary: 'Line pricing, job-level pricing, and common errors.', lessonType: 'article', bodyMarkdown: '## Pricing Engine\n\nEach opening is priced based on type, size, and options. The pricing version controls rates. Always check the Review tab for $0 or missing prices.', sortOrder: 1, durationMinutes: 15, quizJson: [] },
      { title: 'Contract Completion', summary: 'Required fields, signatures, and common contract errors.', lessonType: 'quiz', bodyMarkdown: '## Contract\n\nRequired: customer legal name, property address, total amount, owner signature, estimator signature, date, initials. Missing any = blocker.', sortOrder: 2, durationMinutes: 10, quizJson: [{ id: 'q1', question: 'After the customer signs, what must you verify?', options: [{ id: 'a', text: 'Nothing -- you are done', isCorrect: false }, { id: 'b', text: 'All signature and initials fields are completed', isCorrect: true }], answer: 'b', explanation: 'Always verify all fields are completed after signing.' }] },
    ],
  },
  {
    slug: 'cloud-path-review-flags',
    title: 'Review Red Flags and Fixes',
    description: 'Understand Fix Required vs Recommended, use Fix buttons, and resolve all flags.',
    roleTarget: 'sales_rep', required: true, sortOrder: 12, iconEmoji: 'FLAG', estimatedMinutes: 25,
    lessons: [
      { title: 'Fix Required vs Recommended', summary: 'Red blocks submission. Yellow is optional but important.', lessonType: 'article', bodyMarkdown: '## Review Flags\n\nFix Required (red): blocks the proposal. Must be resolved. Recommended (yellow): should be fixed to prevent chargebacks. Info (blue): informational only.', sortOrder: 1, durationMinutes: 15, quizJson: [{ id: 'q1', question: 'A Fix Required (red) flag:', options: [{ id: 'a', text: 'Is optional', isCorrect: false }, { id: 'b', text: 'Blocks the proposal', isCorrect: true }], answer: 'b', explanation: 'Fix Required items must be resolved before generating the proposal.' }] },
    ],
  },
  {
    slug: 'cloud-path-chargeback',
    title: 'Installer Handoff and Chargeback Prevention',
    description: 'Build complete production packets and prevent the most common chargeback causes.',
    roleTarget: 'sales_rep', required: true, sortOrder: 13, iconEmoji: 'SHLD', estimatedMinutes: 30,
    lessons: [
      { title: 'Top Chargeback Causes', summary: 'Wrong size, wrong handing, missing tempered -- and how to prevent each.', lessonType: 'scenario', bodyMarkdown: '## Top Chargebacks\n\n1. Wrong size. 2. Wrong handing. 3. Missing tempered. 4. Wrong type. 5. Wrong grids. Prevention: measure twice, photograph everything, complete Review.', sortOrder: 1, durationMinutes: 15, scenarioJson: { situation: 'You measured a bathroom window 14 inches from the back door. You entered it as DH 30x40 with standard clear glass.', question: 'What chargeback risks exist?', options: [{ id: 'a', text: 'Nothing wrong', isCorrect: false, explanation: 'Two issues exist.' }, { id: 'b', text: 'Missing tempered (near door) and missing obscure (bathroom)', isCorrect: true, explanation: 'Correct! Tempered required within 18 inches of door. Obscure needed for bathroom.' }], explanation: 'Always check for tempered near doors and obscure in bathrooms.' } },
    ],
  },
  {
    slug: 'cloud-path-followup',
    title: 'Follow-Up and Customer Service',
    description: 'Master follow-up scheduling, referral requests, and post-install customer care.',
    roleTarget: 'sales_rep', required: false, sortOrder: 14, iconEmoji: 'CALL', estimatedMinutes: 20,
    lessons: [
      { title: 'Scheduling Follow-Ups', summary: 'Call within 24 hours, visit within 3-5 days.', lessonType: 'article', bodyMarkdown: '## Follow-Up Rules\n\nAfter a no-sale: call within 24 hours, schedule a return visit within 3-5 days. After a sale: follow up post-install for satisfaction, reviews, and referrals.', sortOrder: 1, durationMinutes: 10, quizJson: [] },
    ],
  },
  {
    slug: 'cloud-path-admin-pricing',
    title: 'Admin/Pricing Maintenance',
    description: 'For admins: manage pricing tables, measurement rules, and training content.',
    roleTarget: 'manager', required: false, sortOrder: 15, iconEmoji: 'ADMN', estimatedMinutes: 45,
    lessons: [
      { title: 'Pricing Admin Overview', summary: 'Manage pricing tables, add line items, activate versions.', lessonType: 'article', bodyMarkdown: '## Pricing Admin\n\nPricing is versioned. Create a new version, edit prices, review the diff, and activate. Existing quotes keep their original version.', sortOrder: 1, durationMinutes: 15, quizJson: [] },
      { title: 'Measurement Rules Configuration', summary: 'Set Cush Measure deductions, brick rules, and size limits.', lessonType: 'article', bodyMarkdown: '## Measurement Rules\n\nConfigure Cush Measure deductions, brick deduction values, min/max size limits, and rounding rules per window type.', sortOrder: 2, durationMinutes: 15, quizJson: [] },
    ],
  },
];

// ---------------------------------------------------------------------------
// More Training Assets
// ---------------------------------------------------------------------------

const EXPANSION_ASSETS = [
  { title: 'Sliding Patio Door Measurement Guide', sourceType: 'youtube', sourceUrl: 'https://www.youtube.com/results?search_query=sliding+patio+door+measurement+replacement', attribution: 'YouTube Search', copyrightNote: 'Search link only.', approvedForTraining: true, category: 'door-measurement', tagsJson: ['patio door', 'sliding', 'measurement', 'replacement'] },
  { title: 'Vinyl Siding Window Installation', sourceType: 'youtube', sourceUrl: 'https://www.youtube.com/results?search_query=vinyl+siding+window+installation+replacement', attribution: 'YouTube Search', copyrightNote: 'Search link only.', approvedForTraining: true, category: 'installation', tagsJson: ['vinyl siding', 'installation', 'replacement'] },
  { title: 'Brick Opening Window Installation', sourceType: 'youtube', sourceUrl: 'https://www.youtube.com/results?search_query=brick+opening+window+replacement+installation', attribution: 'YouTube Search', copyrightNote: 'Search link only.', approvedForTraining: true, category: 'installation', tagsJson: ['brick', 'installation', 'return depth'] },
  { title: 'Low-E Glass and Energy Efficiency', sourceType: 'youtube', sourceUrl: 'https://www.youtube.com/results?search_query=low+e+glass+energy+efficiency+windows', attribution: 'YouTube Search', copyrightNote: 'Search link only.', approvedForTraining: true, category: 'glass-options', tagsJson: ['Low-E', 'energy', 'efficiency', 'glass'] },
  { title: 'Customer Follow-Up Best Practices', sourceType: 'youtube', sourceUrl: 'https://www.youtube.com/results?search_query=sales+follow+up+best+practices+home+improvement', attribution: 'YouTube Search', copyrightNote: 'Search link only.', approvedForTraining: true, category: 'sales-skills', tagsJson: ['follow-up', 'sales', 'closing', 'best practices'] },
  { title: 'Window Screen Types and Options', sourceType: 'youtube', sourceUrl: 'https://www.youtube.com/results?search_query=window+screen+types+full+half+screen', attribution: 'YouTube Search', copyrightNote: 'Search link only.', approvedForTraining: true, category: 'product-options', tagsJson: ['screen', 'full screen', 'half screen', 'options'] },
];

// ---------------------------------------------------------------------------
// More Feature Links
// ---------------------------------------------------------------------------

const EXPANSION_LINKS = [
  { featureKey: 'customer-entry', articleSlug: 'lib-customer-entry', helpLabel: 'Customer information guide' },
  { featureKey: 'customer-duplicate', articleSlug: 'lib-duplicate-customers', helpLabel: 'Duplicate customer detection' },
  { featureKey: 'quick-estimate', articleSlug: 'lib-quick-estimate-overview', helpLabel: 'Quick Estimate overview' },
  { featureKey: 'aerial-imagery', articleSlug: 'lib-aerial-imagery', helpLabel: 'Aerial imagery guide' },
  { featureKey: 'field-app-tabs', articleSlug: 'lib-field-app-tabs', helpLabel: 'Field app tab navigation' },
  { featureKey: 'qr-handoff', articleSlug: 'lib-qr-handoff', helpLabel: 'QR code device handoff' },
  { featureKey: 'siding-types', articleSlug: 'lib-siding-types', helpLabel: 'Siding type identification' },
  { featureKey: 'cush-measure-import', articleSlug: 'lib-cush-measure-import', helpLabel: 'Cush Measure import' },
  { featureKey: 'required-photos', articleSlug: 'lib-required-photos', helpLabel: 'Required photos per window type' },
  { featureKey: 'ai-photo-reader', articleSlug: 'lib-ai-photo-reader', helpLabel: 'AI photo reader' },
  { featureKey: 'brick-openings', articleSlug: 'lib-brick-openings', helpLabel: 'Brick opening measurement' },
  { featureKey: 'finance-presentation', articleSlug: 'lib-finance-presentation', helpLabel: 'Presenting finance options' },
  { featureKey: 'production-packet', articleSlug: 'lib-production-packet', helpLabel: 'Production packet contents' },
  { featureKey: 'installer-notes', articleSlug: 'lib-installer-notes', helpLabel: 'Writing installer notes' },
  { featureKey: 'opening-low-e', articleSlug: 'lib-low-e-argon', helpLabel: 'Low-E and Argon options' },
  { featureKey: 'opening-foam', articleSlug: 'lib-foam-insulation', helpLabel: 'Foam frame insulation' },
  { featureKey: 'opening-screen', articleSlug: 'lib-screens', helpLabel: 'Screen options' },
  { featureKey: 'opening-header', articleSlug: 'lib-header-flashing', helpLabel: 'Header flashing' },
  { featureKey: 'opening-sill', articleSlug: 'lib-sill-repair', helpLabel: 'Sill repair' },
  { featureKey: 'pricing-zero', articleSlug: 'lib-zero-dollar-prices', helpLabel: 'Fixing $0 prices' },
  { featureKey: 'discount-rules', articleSlug: 'lib-discount-rules', helpLabel: 'Discount rules and price floor' },
  { featureKey: 'good-better-best', articleSlug: 'lib-good-better-best', helpLabel: 'Good/Better/Best tiers' },
  { featureKey: 'review-fix-buttons', articleSlug: 'lib-fix-buttons', helpLabel: 'Fix buttons and Change menus' },
  { featureKey: 'returning-jobs', articleSlug: 'lib-returning-jobs', helpLabel: 'Returning jobs with notes' },
  { featureKey: 'referral-request', articleSlug: 'lib-referral-request', helpLabel: 'Requesting referrals' },
  { featureKey: 'offline-sync', articleSlug: 'lib-offline-sync', helpLabel: 'Offline mode and sync' },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('[seed-expansion] Starting expansion seed...');

  // 1. Ensure categories exist (look up by slug)
  const catMap: Record<string, string> = {};
  const cats = await prisma.fieldManualCategory.findMany({ select: { id: true, slug: true } });
  cats.forEach(c => { catMap[c.slug] = c.id; });

  // 2. Upsert expansion articles
  console.log(`[seed-expansion] Upserting ${EXPANSION_ARTICLES.length} expansion articles...`);
  for (const art of EXPANSION_ARTICLES) {
    const catId = catMap[art.categorySlug] ?? null;
    const existing = await prisma.fieldManualArticle.findFirst({ where: { slug: art.slug, companyId: null } });
    const data = {
      slug: art.slug, title: art.title, summary: art.summary ?? null,
      bodyMarkdown: art.bodyMarkdown, categoryId: catId, status: art.status ?? 'published',
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
      await prisma.fieldManualArticle.create({ data: { ...data, companyId: null } });
    }
  }
  console.log('[seed-expansion] Expansion articles done.');

  // 3. Upsert expansion training paths
  console.log(`[seed-expansion] Upserting ${EXPANSION_PATHS.length} expansion training paths...`);
  for (const pathData of EXPANSION_PATHS) {
    const { lessons, ...fields } = pathData;
    let path = await prisma.trainingPath.findFirst({ where: { slug: fields.slug, companyId: null } });
    if (path) {
      await prisma.trainingPath.update({ where: { id: path.id }, data: { title: fields.title, description: fields.description, required: fields.required, sortOrder: fields.sortOrder, active: true } });
    } else {
      path = await prisma.trainingPath.create({ data: { ...fields, companyId: null, active: true } });
    }
    for (const lesson of lessons) {
      const existing = await prisma.trainingLesson.findFirst({ where: { trainingPathId: path.id, title: lesson.title, companyId: null } });
      if (!existing) {
        await prisma.trainingLesson.create({
          data: {
            companyId: null, trainingPathId: path.id,
            title: lesson.title, summary: lesson.summary, lessonType: lesson.lessonType,
            bodyMarkdown: lesson.bodyMarkdown, quizJson: lesson.quizJson as any ?? null,
            scenarioJson: (lesson as any).scenarioJson ?? null,
            sortOrder: lesson.sortOrder, durationMinutes: lesson.durationMinutes,
            passingScore: 70, active: true,
          },
        });
      }
    }
  }
  console.log('[seed-expansion] Expansion paths done.');

  // 4. Upsert expansion assets
  console.log(`[seed-expansion] Upserting ${EXPANSION_ASSETS.length} expansion assets...`);
  for (const asset of EXPANSION_ASSETS) {
    const existing = await prisma.trainingAsset.findFirst({ where: { sourceUrl: asset.sourceUrl, companyId: null } });
    if (!existing) {
      await prisma.trainingAsset.create({ data: { ...asset, companyId: null, tagsJson: asset.tagsJson } });
    }
  }
  console.log('[seed-expansion] Expansion assets done.');

  // 5. Upsert expansion feature links
  console.log(`[seed-expansion] Upserting ${EXPANSION_LINKS.length} expansion feature links...`);
  for (const link of EXPANSION_LINKS) {
    const existing = await prisma.manualFeatureLink.findFirst({ where: { featureKey: link.featureKey, companyId: null } });
    if (existing) {
      await prisma.manualFeatureLink.update({ where: { id: existing.id }, data: { articleSlug: link.articleSlug, helpLabel: link.helpLabel } });
    } else {
      await prisma.manualFeatureLink.create({ data: { featureKey: link.featureKey, articleSlug: link.articleSlug, helpLabel: link.helpLabel, companyId: null } });
    }
  }
  console.log('[seed-expansion] Expansion feature links done.');

  // Summary
  const totalArticles = await prisma.fieldManualArticle.count();
  const totalPaths = await prisma.trainingPath.count();
  const totalLessons = await prisma.trainingLesson.count();
  const totalAssets = await prisma.trainingAsset.count();
  const totalLinks = await prisma.manualFeatureLink.count();

  console.log('\n[seed-expansion] COMPLETE.');
  console.log(`  Total Articles: ${totalArticles}`);
  console.log(`  Total Training Paths: ${totalPaths}`);
  console.log(`  Total Training Lessons: ${totalLessons}`);
  console.log(`  Total Training Assets: ${totalAssets}`);
  console.log(`  Total Feature Links: ${totalLinks}`);
}

main()
  .catch(e => { console.error('[seed-expansion] ERROR:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
