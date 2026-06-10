/**
 * Field Manual Expansion Pack
 * Window Types, Door Types, Siding, Measuring Rules, Glass/Safety,
 * Exterior Conditions, Chargeable Options, Installer Impact,
 * Chargeback Prevention, Customer Communication
 *
 * These chapters are merged with manualChapters in ManualPage.tsx
 */

import type { ManualChapter } from './manualContent';
import { allLibraryChapters } from './manualLibrary';

// ─────────────────────────────────────────────────────────────
// WINDOW TYPES
// ─────────────────────────────────────────────────────────────

export const windowTypeChapters: ManualChapter[] = [
  {
    id: 'wt1-double-hung',
    title: 'WINDOW TYPE 1 — Double Hung',
    subtitle: 'The most common Window World unit — know it cold',
    category: 'Window Types',
    roles: ['Sales Rep', 'Manager', 'Auditor'],
    sections: [
      {
        id: 'wt1-identify',
        title: 'How to Identify a Double Hung',
        body: 'A double hung window has two operable sashes — top and bottom both move. The most common window type in the US. Both sashes tilt inward for cleaning. Sold as a standard unit, oriel variant (sash split top/bottom), or clear story unit. Picture it: two panes stacked, each tilting in. If the top sash is fixed and cannot be raised, it is a Single Hung — different product, different price.',
        checklist: [
          'Both sashes move (top slides down, bottom slides up)',
          'Both sashes tilt inward for cleaning',
          'Verify customer\'s existing unit before ordering — single vs double hung look identical from inside',
          'Confirm rough opening width and height',
          'Note if it is an Oriel (unequal sash split) configuration',
        ],
        warnings: [
          'Never assume double hung without physically checking if the top sash moves.',
          'A single hung ordered instead of a double hung will not pass egress inspection in bedrooms.',
          'Width is always listed first — WIDTH x HEIGHT. Do NOT reverse.',
        ],
      },
      {
        id: 'wt1-measure',
        title: 'Measuring a Double Hung (Cush Measure)',
        body: 'Window World uses the CUSH MEASURE system. Always measure the actual opening from jamb to jamb (width) and sill to head jamb (height). Then apply the 3/8 inch deduction on ALL FOUR sides. Revised width = actual width minus 3/4 inch. Revised height = actual height minus 3/4 inch. This ensures the replacement unit fits inside the existing frame without binding.',
        steps: [
          'Measure width at 3 points: top, middle, bottom — use the smallest',
          'Measure height at 3 points: left, center, right — use the smallest',
          'Apply Cush Measure: subtract 3/4" from width AND height',
          'Record revised dimensions on the opening card',
          'Photograph measurement tape in position (interior + exterior)',
          'Note if frame is out of square (diagonal measurement check)',
        ],
        examples: [
          'Actual opening: 36" wide × 48" tall → Revised: 35-1/4" × 47-1/4"',
          'Actual opening: 32" wide × 60" tall → Revised: 31-1/4" × 59-1/4"',
        ],
        warnings: [
          'Do NOT enter the actual measurements — always enter the REVISED (Cush Measure) dimensions into the app.',
          'Brick openings: use brick-to-brick dimension with the 1/2" rule instead of Cush Measure.',
          'Never round up — always round to the nearest 1/8" downward.',
        ],
        relatedLinks: [{ label: 'Cush Measure Rules', to: '/manual' }],
      },
      {
        id: 'wt1-options',
        title: 'Chargeable Options for Double Hung',
        body: 'These options add to the unit price and MUST appear on the order form and contract. Every missed charge is a Revenue Leakage Auditor flag.',
        checklist: [
          'Tempered Glass (half or full) — charge based on glass area sq ft',
          'Obscure Glass (half or full) — privacy glass for bathrooms',
          'Grids (flat, contoured, SDL) — select type and pattern',
          'Full Screen (upgrade from standard half-screen)',
          'Removal Type (insert vs full-frame tear-out) — affects labor charge',
          'Exterior Surface (brick, siding, wood, stucco) — affects header/flashing',
          'Trim Color (interior and exterior)',
          'Low-E Glass / Argon — energy upgrade',
        ],
        warnings: [
          'Forgetting to charge for tempered glass is the #1 pricing error at Window World BTR.',
          'A grid selected but not charged is a pricing error detected by the Revenue Leakage Auditor.',
          'Full-frame removal costs significantly more labor than insert — always confirm before quoting.',
        ],
      },
    ],
  },
  {
    id: 'wt2-single-hung',
    title: 'WINDOW TYPE 2 — Single Hung',
    subtitle: 'One sash moves — the top is fixed',
    category: 'Window Types',
    roles: ['Sales Rep', 'Auditor'],
    sections: [
      {
        id: 'wt2-identify',
        title: 'How to Identify a Single Hung',
        body: 'A single hung window has ONE operable sash — the bottom slides up. The top sash is FIXED. Cheaper than a double hung by 10–30%. Common in lower-cost renovations, garages, or when the top pane is decorative. Measure same as double hung (Cush Measure applies).',
        checklist: [
          'Only the bottom sash moves — top is stationary',
          'Interior cleaning requires reaching outside if no tilt feature',
          'Verify if the existing unit was single or double hung before ordering',
          'Egress bedrooms: confirm code compliance — may require double hung',
        ],
        warnings: [
          'Do not up-sell a customer from single hung to double hung without documenting the price difference.',
          'Egress rooms (bedrooms) may require double hung for code — verify before quoting single hung.',
        ],
      },
    ],
  },
  {
    id: 'wt3-slider',
    title: 'WINDOW TYPE 3 — Slider / Glider',
    subtitle: 'Horizontal operation — left or right',
    category: 'Window Types',
    roles: ['Sales Rep', 'Auditor'],
    sections: [
      {
        id: 'wt3-identify',
        title: 'How to Identify a Slider',
        body: 'A slider (glider) moves HORIZONTALLY — left/right instead of up/down. Very common in basements, kitchens, and above counters where raising a sash is impractical. Two configurations: XO (left panel slides, right is fixed) or OX (right slides, left is fixed). Sliders almost always include a full screen. Common large sizes: 60" and 72" wide.',
        checklist: [
          'Confirm horizontal operation direction',
          'Confirm which sash is operating: XO or OX',
          'Note screen — sliders usually include full screen',
          'Measure carefully — sliders are wide (60"+)',
          'Structural review if the opening is being enlarged for a larger slider',
        ],
        examples: [
          'Over-the-sink slider: typically 36×24 or 48×24',
          'Living room slider: 72×36 or 72×48',
        ],
        warnings: [
          'Wide sliders (60"+) may require structural review if the opening is being enlarged.',
          'Do NOT order a single-hung for a slider opening — different rough opening and hardware.',
        ],
      },
    ],
  },
  {
    id: 'wt4-picture',
    title: 'WINDOW TYPE 4 — Picture Window',
    subtitle: 'Fixed, no screen — large glass area, highest tempered risk',
    category: 'Window Types',
    roles: ['Sales Rep', 'Auditor'],
    sections: [
      {
        id: 'wt4-rules',
        title: 'Picture Window Rules',
        body: 'A picture window is FIXED — it does not open or operate. NO SCREEN by default (and no screen hardware included). Very large glass area means ALWAYS check tempered glass rules: if the bottom edge is less than 18" from the floor AND the glass area exceeds 9 sq ft, tempered is required by IRC R308.4.3.',
        checklist: [
          'NO SCREEN — do not quote or order a screen for a picture window',
          'Check tempered: is the bottom edge less than 18" from floor?',
          'Check tempered: is the glass area over 9 square feet?',
          'Measure the FULL glass area (width × height in sq ft) for tempering check',
          'Document customer acknowledgment if they decline tempered on a questionable opening',
        ],
        examples: [
          '72×60 picture window = 30 sq ft → ALWAYS tempered if bottom edge < 18" from floor',
          '48×36 picture window = 12 sq ft → tempered if low to floor',
          '36×36 picture window = 9 sq ft exactly → tempered required at exactly 9 sq ft',
        ],
        warnings: [
          'NEVER quote a screen for a picture window — it ships without screen hardware and does not support one.',
          'The tempered risk on large picture windows is HIGH — a missed tempered flag is a Level 4 Business Risk.',
          'Low-to-floor picture windows are common in living rooms — visually check the distance before leaving.',
        ],
      },
    ],
  },
  {
    id: 'wt5-casement',
    title: 'WINDOW TYPE 5 — Casement',
    subtitle: 'Crank-operated, side-hinged, screen inside',
    category: 'Window Types',
    roles: ['Sales Rep'],
    sections: [
      {
        id: 'wt5-id',
        title: 'Casement Identification and Measuring',
        body: 'A casement window is hinged on the side and swings outward via a crank handle. Very common in kitchens (over counters) and living rooms. Screens install on the INTERIOR side. Single casement (one pane) or twin casement (two panes). When measuring, capture the rough opening — casements are often full-frame replacements.',
        checklist: [
          'Confirm handing: which side are the hinges on (left or right)?',
          'Measure rough opening accurately — casements are often full-frame',
          'Confirm crank hardware color (matches frame color typically)',
          'Note screens — screens mount INSIDE for casements',
          'Twin casements: document the center mull in the sketch',
        ],
        warnings: [
          'Narrow casements may not meet egress opening area — verify for bedrooms.',
          'Twin casements with a center mull must be documented as a mulled unit in the sketch.',
        ],
      },
    ],
  },
  {
    id: 'wt6-bay-bow',
    title: 'WINDOW TYPE 6 — Bay / Bow Window',
    subtitle: 'Projection units — always require manager review',
    category: 'Window Types',
    roles: ['Sales Rep', 'Manager', 'Auditor'],
    sections: [
      {
        id: 'wt6-id',
        title: 'Bay and Bow Units',
        body: 'Bay windows project OUT from the wall at an angle. A standard bay has 3 units: center picture/DH with two angled casements at 30° or 45°. A bow window uses 4–6 curved-profile units in a gentle arc. Both require custom labor, structural support review, and seat board/roof detail documentation.',
        checklist: [
          'Photograph existing projection from outside',
          'Note angle of side units (30° or 45°)',
          'Confirm number of sub-units',
          'Note seat board (window seat) condition',
          'Note roof flashing / exterior overhang condition',
          'Confirm if demo and reinstall of the projection is required',
        ],
        warnings: [
          'Never quote a bay or bow without manager review — margin and labor are complex.',
          'Seat board and roof detail repairs are EXTRA — document as separate line items.',
          'Bay/bow installations require two-person crew minimum — add labor note.',
        ],
      },
    ],
  },
  {
    id: 'wt7-oriel',
    title: 'WINDOW TYPE 7 — Oriel / Top Sash Split',
    subtitle: 'Sash-split DH — top/bottom are different fractions of total height',
    category: 'Window Types',
    roles: ['Sales Rep', 'Auditor'],
    sections: [
      {
        id: 'wt7-oriel',
        title: 'Oriel Split Measurement',
        body: 'An Oriel is a double hung with an UNEQUAL sash split. Instead of 50/50, the top and bottom sashes are split at 1/3 over 2/3 or 2/3 over 1/3. Each sash is measured independently based on the fraction of the total revised height. Use the Oriel calculator in the app — never guess the split.',
        steps: [
          'Record the total revised height first (after Cush Measure)',
          'Select the correct split ratio in the app: 1/3-2/3, 2/3-1/3, or 1/4-3/4',
          'The app calculates each sash height automatically',
          'Verify top sash formula has been applied',
          'Document which sash is the top (confirm visually in home)',
        ],
        examples: [
          '36" × 48" revised → 1/3 top split: top sash ≈ 16", bottom sash ≈ 32" (minus meeting rail)',
          '36" × 60" revised → 2/3 top split: top sash ≈ 40", bottom sash ≈ 20"',
        ],
        warnings: [
          'The Oriel top sash rule is a common source of wrong-size window orders.',
          'Do NOT enter the total height for both sashes — each sash gets its own measurement.',
          'The app has an Oriel calculator — use it, never do manual math in the field.',
        ],
      },
    ],
  },
  {
    id: 'wt8-mulled',
    title: 'WINDOW TYPE 8 — Mulled / Joined Units',
    subtitle: 'Multiple windows in one master frame — both dimensions required',
    category: 'Window Types',
    roles: ['Sales Rep', 'Auditor'],
    sections: [
      {
        id: 'wt8-mull',
        title: 'Mulled Unit Documentation',
        body: 'A mulled unit joins 2+ windows inside a single master frame. Common: Picture center + 2 flanking double hungs (3-lite). Measure the OVERALL master frame AND each individual sub-unit. In the sketch, sub-units must be joined using the Mull/Join tool — the Measurement Auditor checks for this.',
        checklist: [
          'Measure the OVERALL master frame (width × height)',
          'Measure each INDIVIDUAL sub-unit separately',
          'Join sub-units in sketch using the Mull tool',
          'Label master frame with total unit count',
          'Document factory-mulled vs site-mulled',
          'Photograph the full unit from exterior AND interior',
        ],
        warnings: [
          'Treating a mulled unit as separate windows is a Level 3 Critical error — breaks pricing and production.',
          'Site-mulled units require extra hardware and labor documentation.',
          'If Measurement Auditor flags "missing mull/join relationship" — return to sketch and join the units.',
        ],
      },
    ],
  },
  {
    id: 'wt9-specialty',
    title: 'WINDOW TYPE 9 — Specialty Shapes',
    subtitle: 'Arches, circles, octagons — always custom, always verify dimensions',
    category: 'Window Types',
    roles: ['Sales Rep', 'Manager'],
    sections: [
      {
        id: 'wt9-specialty',
        title: 'Specialty Shape Rules',
        body: 'Specialty shapes include eyebrow arches, half-rounds, full circles, quarter rounds, octagons, hexagons, and custom geometrics. ALL require: (1) a template taken from the existing opening, (2) a clear front-facing photograph, (3) custom pricing review via the Specialty Builder tool.',
        checklist: [
          'Use the Specialty Builder tool — not the standard opening editor',
          'Take a physical template card of the arch profile',
          'Photograph the shape from exactly front-on (perpendicular to the opening)',
          'Record: width, height, rise (for arches), radius, leg height',
          'Tag the opening as specialty in the sketch',
          'Flag for manager pricing review before quoting',
        ],
        warnings: [
          'Quoting standard DH pricing for a specialty shape is a Level 4 Business Risk.',
          'Custom shapes take longer to manufacture — inform the customer of extended lead time.',
          'Eyebrow arches MUST have rise and leg height documented or the factory cannot manufacture.',
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// DOOR TYPES
// ─────────────────────────────────────────────────────────────

export const doorTypeChapters: ManualChapter[] = [
  {
    id: 'dt1-entry-door',
    title: 'DOOR TYPE 1 — Entry / Front Door',
    subtitle: 'Most scrutinized door — handing, swing, lock prep must be perfect',
    category: 'Door Types',
    roles: ['Sales Rep', 'Auditor'],
    sections: [
      {
        id: 'dt1-handing',
        title: 'Door Handing and Swing',
        body: 'Door handing is the #1 source of door order errors. ALWAYS determine handing from the OUTSIDE, standing at the threshold looking IN. Hinges on your LEFT = LEFT-HAND. Hinges on your RIGHT = RIGHT-HAND. Swing: INSWING (door opens toward you, into the home) or OUTSWING (opens outward). Louisiana wind-rated applications typically require OUTSWING.',
        steps: [
          'Stand OUTSIDE the door facing inward',
          'Locate the hinges',
          'Hinges on your LEFT → Left Hand (LH)',
          'Hinges on your RIGHT → Right Hand (RH)',
          'Confirm swing: does the door open IN or OUT?',
          'Select: LH Inswing, LH Outswing, RH Inswing, or RH Outswing in the app',
        ],
        examples: [
          'Front door, hinges on your left from outside, opens inward → LEFT HAND INSWING (LHI)',
          'Rear door, hinges on your right from outside, opens outward → RIGHT HAND OUTSWING (RHOS)',
        ],
        warnings: [
          'NEVER determine handing from the inside — you will get it backwards every time.',
          'Wrong handing = door is installed backwards = chargeback + rescheduled install.',
          'A wrong handing discovered at installation costs 2× the original door price in service and rework.',
        ],
      },
      {
        id: 'dt1-options',
        title: 'Entry Door Options and Charges',
        body: 'Entry doors have significant upsell opportunity. All selected options must appear as line items.',
        checklist: [
          'Glass insert: no glass / half glass / full glass / decorative pattern',
          'Sidelites (left, right, or both) — separate unit, separate price',
          'Transom window above — separate opening, measure and photograph',
          'Deadbolt prep (pre-drilled vs no prep)',
          'Handle set / hardware (keyed, smart lock, lever, knob)',
          'Threshold / sill pan type (aluminum, composite, ADA)',
          'Storm door over entry door — separate unit',
          'Color: exterior vs interior (can differ)',
          'Nail fin vs insert replacement',
        ],
        warnings: [
          'Decorative glass sidelites with complex patterns are custom — extended lead time.',
          'ADA threshold required for single-level wheelchair access — document if requested.',
        ],
      },
    ],
  },
  {
    id: 'dt2-patio-door',
    title: 'DOOR TYPE 2 — Patio Sliding Door',
    subtitle: 'Wide units — sill pan condition is critical',
    category: 'Door Types',
    roles: ['Sales Rep', 'Auditor'],
    sections: [
      {
        id: 'dt2-id',
        title: 'Patio Door Rules',
        body: 'Patio sliding doors are wide (72", 80", or 96") and heavy. Note which panel slides and which is fixed: XO (operating on left) or OX (operating on right). Always ask about screen condition. Inspect and photograph the sill pan — patio doors frequently have rotted sill pans that are a chargeback risk if undocumented.',
        checklist: [
          'Confirm which panel slides (OX or XO)',
          'Measure from stud to stud if full-frame replacement',
          'Screen type: standard, retractable, none',
          'Photograph sill pan condition — rot is common here',
          'Blinds-between-glass: quote separately and get approval',
          'Hardware: note handle and lock set color',
        ],
        warnings: [
          'A rotted sill pan not documented is a chargeback — photograph every patio door sill.',
          'Blinds-between-glass adds significant cost — quote separately and get written approval.',
        ],
      },
    ],
  },
  {
    id: 'dt3-storm-door',
    title: 'DOOR TYPE 3 — Storm Door',
    subtitle: 'Installs over existing entry — measure the door face, not the frame',
    category: 'Door Types',
    roles: ['Sales Rep'],
    sections: [
      {
        id: 'dt3-storm',
        title: 'Storm Door Measurement',
        body: 'A storm door installs ON TOP of (in front of) an existing entry door. Measure the WIDTH of the actual DOOR FACE — not the frame, not the trim, not the rough opening. Standard widths: 32", 34", 36". Height is almost always 81". Handing: same rule as entry door — determine from outside.',
        checklist: [
          'Measure the actual door face width (not trim)',
          'Confirm standard height (81" in most cases)',
          'Determine handing from outside',
          'Note finish/color — match to entry door',
          'Select glass/screen insert type (full view, ventilating, storm)',
        ],
        warnings: [
          'Never measure from trim to trim — the storm door must fit the door face.',
          'Wrong size storm door cannot be installed — full return, full loss, customer conflict.',
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// SIDING
// ─────────────────────────────────────────────────────────────

export const sidingChapters: ManualChapter[] = [
  {
    id: 'sid1-vinyl-siding',
    title: 'SIDING — Vinyl Siding Types and Series',
    subtitle: 'Series 2000 / 4000 / 6000 — what each is and when to sell it',
    category: 'Siding',
    roles: ['Sales Rep', 'Manager'],
    sections: [
      {
        id: 'sid1-series',
        title: 'Window World Siding Series',
        body: 'Window World of Baton Rouge offers three primary vinyl siding series. Series 2000 is entry-level residential grade. Series 4000 is the popular mid-grade with better insulation backing options. Series 6000 is the premium grade with thicker profile and enhanced wind resistance. Always walk the customer through all three — the higher series sells itself when benefits are clearly explained.',
        checklist: [
          'Present all three series with side-by-side price comparison',
          'Note if insulated backing is requested (adds R-value and cost)',
          'Document siding profile: dutch lap, beaded, board-and-batten, etc.',
          'Confirm color selection — some colors are special order',
        ],
      },
      {
        id: 'sid1-measure',
        title: 'Measuring Siding — Elevations and Square Footage',
        body: 'Siding is measured in SQUARE FEET per elevation. Measure each of the four sides separately: Front, Left, Right, Rear. For each elevation: Width × Height = Gross SF. Deduct window and door areas. Net SF = Gross SF minus deductions. Add 10% waste. Document ALL four elevations even if the customer wants only partial siding.',
        steps: [
          'Walk each elevation: Front, Left, Right, Rear',
          'Measure wall width (ground-level, straight-line measurement)',
          'Measure wall height (grade to soffit/eave)',
          'Calculate Gross SF: Width × Height',
          'Deduct all window and door areas (W × H for each opening)',
          'Calculate Net SF = Gross SF minus deductions',
          'Add 10% waste factor',
          'Document total per elevation AND grand total',
        ],
        examples: [
          'Front: 40\' wide × 10\' tall = 400 SF gross. Two 36×48 windows = 24 SF deducted. Net = 376 SF.',
          'Rear with clear story: 40\' wide × 22\' tall = 880 SF. Clear story charge triggers at wall height > 12\'.',
        ],
        warnings: [
          'Forgetting to deduct openings overstates material — customer is overcharged and overstocked.',
          'Missing the REAR elevation on a full siding job is a Production Readiness Level 4 block.',
          'Always photograph each elevation with tape measure visible in frame.',
        ],
      },
      {
        id: 'sid1-clearstory',
        title: 'Clear Story / High Wall Labor Charge',
        body: 'When a wall height exceeds the standard reach (typically 12 feet), a CLEAR STORY charge applies automatically in the pricing engine. This covers scaffolding, extended equipment, and additional labor. Do NOT override this charge without manager approval.',
        checklist: [
          'Enter accurate wall height — do not round down',
          'Verify the app shows the clear story charge on the line item',
          'Document with a photo showing the height of the wall',
          'Inform customer: the charge is for necessary scaffolding, not markup',
        ],
        warnings: [
          'Entering a false shorter height to avoid the clear story charge is a Revenue Leakage Level 4 violation.',
          'Installers will flag incorrect height documentation — leads to job holds and customer disputes.',
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// MEASURING RULES
// ─────────────────────────────────────────────────────────────

export const measuringRulesChapters: ManualChapter[] = [
  {
    id: 'mr1-cush-measure',
    title: 'MEASURING RULES 1 — Cush Measure (3/8" Per Side)',
    subtitle: 'The standard deduction for all insert replacements',
    category: 'Measuring Rules',
    roles: ['Sales Rep', 'Auditor'],
    sections: [
      {
        id: 'mr1-rule',
        title: 'The Cush Measure Rule',
        body: 'Window World uses CUSH MEASURE for INSERT replacements (existing frame stays). The new window is built 3/8" smaller on each side than the actual opening so it fits inside the jamb without binding. Total deduction: 3/4" from width, 3/4" from height.',
        steps: [
          'Measure actual opening width at top, middle, bottom',
          'Use the SMALLEST width measurement',
          'Subtract 3/4" from the smallest width → REVISED WIDTH',
          'Measure actual opening height at left, center, right',
          'Use the SMALLEST height measurement',
          'Subtract 3/4" from the smallest height → REVISED HEIGHT',
          'Enter REVISED WIDTH × REVISED HEIGHT in the app',
          'NEVER enter the actual opening dimensions',
        ],
        examples: [
          'Actual: 36.0" × 48.0" → Revised: 35-1/4" × 47-1/4"',
          'Actual: 32.5" × 54.0" → Revised: 31-3/4" × 53-1/4"',
          'Actual: 35-7/8" wide → Revised = 35-1/8" wide',
        ],
        warnings: [
          'NEVER round up — always round to nearest 1/8" downward.',
          'Entering actual opening size will cause window to arrive too large and not fit.',
          'Unusual dimensions (very small or very large): verify with manager before entering.',
        ],
      },
      {
        id: 'mr1-squareness',
        title: 'Checking for Square',
        body: 'Before finalizing, check if the frame is square. Measure diagonally from top-left to bottom-right, then from top-right to bottom-left. If the two diagonal measurements differ by more than 1/4", the frame is OUT OF SQUARE and must be documented.',
        steps: [
          'Measure diagonal: top-left corner to bottom-right corner',
          'Measure diagonal: top-right corner to bottom-left corner',
          'If difference > 1/4": mark opening as "Out of Square"',
          'Photograph and add install notes',
          'Flag for manager review — additional shimming or full-frame may be required',
        ],
        warnings: [
          'Installing a square window in an out-of-square frame causes gaps, air infiltration, and warranty claims.',
          'Do not hide an out-of-square condition — document it and let management decide the fix.',
        ],
      },
    ],
  },
  {
    id: 'mr2-brick-measure',
    title: 'MEASURING RULES 2 — Brick / Masonry Openings (1/2" Rule)',
    subtitle: 'Masonry openings use a DIFFERENT deduction than wood frame',
    category: 'Measuring Rules',
    roles: ['Sales Rep', 'Auditor'],
    sections: [
      {
        id: 'mr2-brick',
        title: 'Measuring Brick / Masonry Openings',
        body: 'For BRICK or MASONRY exteriors, the replacement window installs within the masonry opening (brick-to-brick). The deduction is 1/2" per side (1" total width reduction, 1" total height reduction from the brick-to-brick measurement). Confirm the exact rule with your manager as it may vary by crew.',
        steps: [
          'Confirm exterior is brick/masonry from outside (not just brick veneer over wood)',
          'Measure from brick edge to brick edge (NOT jamb to jamb)',
          'Apply 1/2" deduction per side = 1" total each direction',
          'Enter revised dimensions — select "Brick/Masonry" as exterior surface in app',
          'Measure return depth (space from brick face to window jamb)',
        ],
        examples: [
          'Brick opening: 38" wide × 52" tall → Revised: 37" × 51"',
          'Return depth: 4.5" — note for installer (impacts jamb extension needs)',
        ],
        warnings: [
          'Using Cush Measure on a brick opening produces a window too large — will not fit through masonry.',
          'Brick veneer over wood frame looks identical from inside — always check the exterior.',
          'Missing return depth measurement causes installer delays — always measure it.',
        ],
      },
    ],
  },
  {
    id: 'mr3-return-depth',
    title: 'MEASURING RULES 3 — Return Depth / Jamb Depth',
    subtitle: 'Frame depth determines which product series will fit',
    category: 'Measuring Rules',
    roles: ['Sales Rep', 'Auditor'],
    sections: [
      {
        id: 'mr3-depth',
        title: 'Jamb Depth Requirements by Series',
        body: 'The JAMB DEPTH is measured on the side jamb from the interior face of the interior stop to the interior face of the exterior stop. Classic Series (4000/6000): minimum 3-1/4" required. Slim-Line 5000: minimum 2-7/8". Always measure — never guess.',
        checklist: [
          'Measure frame depth on the side jamb',
          'Classic 4000/6000 Series: minimum 3-1/4" required',
          'Slim-Line 5000 Series: minimum 2-7/8" (shallow pockets)',
          'Insufficient depth: flag for full-frame replacement or jamb extensions',
          'Document depth measurement in opening notes',
        ],
        warnings: [
          'Ordering Classic series into a shallow pocket prevents proper installation.',
          'Never guess frame depth — measure it. Wrong depth = weeks of delay.',
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// GLASS, CODE, AND SAFETY
// ─────────────────────────────────────────────────────────────

export const glassSafetyChapters: ManualChapter[] = [
  {
    id: 'gs1-tempered',
    title: 'GLASS 1 — Tempered Glass (Safety Glazing — IRC R308.4)',
    subtitle: 'The highest-risk missed item in field sales — memorize the exact rules',
    category: 'Glass and Safety',
    roles: ['Sales Rep', 'Manager', 'Auditor'],
    sections: [
      {
        id: 'gs1-when-required',
        title: 'When Tempered Glass Is Required (IRC 2021 R308.4)',
        body: 'Tempered glass (or other approved safety glazing) is legally required in specific hazardous locations. Failure to flag and charge for tempered glass exposes the company to liability and the customer to a code violation. Rules are based on location, proximity, and glass dimensions.',
        checklist: [
          'R308.4.1 — ANY glass IN a door panel (swinging, sliding, bifold)',
          'R308.4.2 — Glass within 24" of a door AND bottom edge < 60" from floor',
          'R308.4.3 — Glass area > 9 sq ft AND bottom edge < 18" from floor AND top edge > 36" from floor',
          'R308.4.5 — Glass within 60" of the edge of a tub, shower, spa, sauna, or steam room',
          'R308.4.7 — Glass adjacent to stairways or landings',
        ],
        examples: [
          'Bathroom window 12" from shower → TEMPERED required (R308.4.5)',
          'Living room picture window, bottom 10" from floor, 30 sq ft → TEMPERED (R308.4.3)',
          'Sidelight next to front door, within 24" of door plane → CHECK: TEMPERED if bottom < 60" from floor (R308.4.2)',
          'Bedroom window, bottom 36" from floor, 6 sq ft → NOT required (under 9 sq ft)',
        ],
        warnings: [
          'A missed tempered flag on a bathroom window is a Level 3 Critical — blocks production.',
          'A missed tempered flag that ships and installs is a Level 4 Business Risk — liability, recall, chargeback.',
          'Customer declining tempered: document it, get manager review, note the code reference in writing.',
        ],
      },
      {
        id: 'gs1-charge',
        title: 'Charging for Tempered Glass',
        body: 'Tempered glass is a CHARGEABLE option. Charge depends on glass area. Options: HALF tempered (one pane in a two-pane unit) vs FULL tempered (entire unit). The pricing engine calculates the charge based on your selection and the pricing table. If the charge shows as $0, a pricing rule is missing — flag it immediately.',
        checklist: [
          'Select "Half Tempered" or "Full Tempered" in the glass option dropdown',
          'Verify the pricing engine shows a tempered glass charge on the line item',
          'If charge is $0: flag it — pricing rule may be missing. Do NOT submit.',
          'Document which code rule applies in the opening notes',
        ],
        warnings: [
          'The #1 pricing error at Window World BTR: tempered is selected but charge is $0 because the rule is missing.',
          'If you see $0 tempered charge: contact manager immediately. Do NOT submit the job.',
        ],
      },
    ],
  },
  {
    id: 'gs2-obscure',
    title: 'GLASS 2 — Obscure Glass (Privacy)',
    subtitle: 'Bathrooms, closets, street-facing — half or full coverage',
    category: 'Glass and Safety',
    roles: ['Sales Rep'],
    sections: [
      {
        id: 'gs2-rules',
        title: 'When and How to Use Obscure Glass',
        body: 'Obscure glass is translucent — light passes through but the view is blocked. Common in bathrooms, closets, and privacy-sensitive windows. Available as HALF obscure (bottom pane only) or FULL obscure (entire unit). Can be combined with tempered glass when both conditions apply.',
        checklist: [
          'Ask the customer explicitly about obscure for any bathroom or privacy window',
          'Select "Half Obscure" (BSO) or "Full Obscure" in the glass dropdown',
          'Verify the obscure charge appears on the quote',
          'If combining with tempered: select BOTH options',
        ],
        warnings: [
          'Do not assume a bathroom window needs obscure without asking — some customers want clear glass.',
          'Do not confuse obscure with decorative frosted inserts — priced differently.',
        ],
      },
    ],
  },
  {
    id: 'gs3-lowe-energy',
    title: 'GLASS 3 — Low-E / Argon Energy Package',
    subtitle: 'Standard energy upgrade for Louisiana climate',
    category: 'Glass and Safety',
    roles: ['Sales Rep'],
    sections: [
      {
        id: 'gs3-energy',
        title: 'Low-E and Argon in Louisiana',
        body: 'Low-Emissivity (Low-E) glass has a metallic coating that reflects infrared heat. In Louisiana\'s hot, humid climate, Low-E is particularly valuable — it reduces solar heat gain and keeps the home cooler. Argon gas fill between panes adds insulating value. Present this as a comfort and energy savings upgrade with an ROI story.',
        checklist: [
          'Present Low-E as comfort + savings upgrade, not just a technical spec',
          'Confirm if Argon fill is included in the base price or is an add-on',
          'Calculate rough monthly savings estimate to illustrate ROI',
          'Note that Low-E and Argon are invisible — explain the performance, not the look',
        ],
      },
    ],
  },
  {
    id: 'gs4-grids',
    title: 'GLASS 4 — Grids: Flat, Contoured, and SDL',
    subtitle: 'Style option — selected grids MUST have a charge on the quote',
    category: 'Glass and Safety',
    roles: ['Sales Rep', 'Auditor'],
    sections: [
      {
        id: 'gs4-grid-types',
        title: 'Grid Types and Charges',
        body: 'Grids are decorative divider bars giving windows a traditional divided-light look. FLAT GRID: simulated divided lights inside the glass — flat bar, easy to clean, mid-price. CONTOURED GRID: inside the glass — sculpted profile, more traditional look. SDL (Simulated Divided Lights): individual glass panes with spacers — most authentic appearance, highest cost. ALL grid types are CHARGEABLE — $0 grid charge is a pricing error.',
        checklist: [
          'Ask about grid preference — show samples if available',
          'Select grid type: None / Flat / Contoured / SDL',
          'Select grid pattern: Colonial / Prairie / Diamond / Custom',
          'Verify the grid charge appears on the quote line item',
          'Document grid pattern in opening notes for the factory',
        ],
        examples: [
          'Flat grid Colonial pattern — most common, cleanest look, mid-price',
          'Contoured Colonial — step up in style, slightly more cost',
          'SDL Prairie pattern — premium, looks like true divided lights from outside',
        ],
        warnings: [
          'A grid selected with a $0 charge is a Pricing Auditor Level 2 Warning that must be resolved.',
          '"Like what we have now" is not a valid factory instruction — specify the exact pattern.',
          'SDL grids require specific framing — verify that the product series supports SDL before quoting.',
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// EXTERIOR CONDITIONS
// ─────────────────────────────────────────────────────────────

export const exteriorConditionChapters: ManualChapter[] = [
  {
    id: 'ext1-brick',
    title: 'EXTERIOR CONDITIONS 1 — Brick / Masonry',
    subtitle: 'Most common exterior in Baton Rouge — special measure and install rules',
    category: 'Exterior Conditions',
    roles: ['Sales Rep', 'Auditor'],
    sections: [
      {
        id: 'ext1-brick',
        title: 'Brick Exterior Protocol',
        body: 'Brick is the most common exterior surface in Baton Rouge. Key rules: Use brick-to-brick measurement with 1/2" per side deduction (NOT Cush Measure). Document return depth. Inspect for cracks, mortar failure, or lintel issues ABOVE the window — these must be photographed and noted for the installer.',
        checklist: [
          'Select "Brick/Masonry" as exterior surface in the opening editor',
          'Use brick-to-brick measurement with 1/2" per side deduction',
          'Measure return depth (space from brick face to jamb)',
          'Photograph any cracked brick, missing mortar, or lintel damage above the window',
          'Note if a soldier course (horizontal brick) is present — lintel check required',
          'Add installation note if extra masonry work will be needed',
        ],
        warnings: [
          'Cracked lintels above brick windows are a serious structural issue — photograph and flag, do NOT promise a simple swap.',
          'Missing return depth measurement causes installer delays — always measure it.',
          'Brick veneer over wood frame looks identical from inside — always confirm from outside.',
        ],
      },
    ],
  },
  {
    id: 'ext2-siding',
    title: 'EXTERIOR CONDITIONS 2 — Vinyl Siding',
    subtitle: 'Header flashing and J-channel are required — document the profile',
    category: 'Exterior Conditions',
    roles: ['Sales Rep'],
    sections: [
      {
        id: 'ext2-siding',
        title: 'Siding Exterior Window Installations',
        body: 'For vinyl siding exteriors: the window installation includes removing the J-channel around the window, properly flashing the new window, and reinstalling siding. Header flashing is required above every window to prevent water infiltration. Document the siding profile (dutch lap, beaded, board-and-batten) so the installer matches the J-channel profile.',
        checklist: [
          'Select "Vinyl Siding" as exterior surface in the opening editor',
          'Photograph the siding profile clearly from outside',
          'Note any damaged siding around the opening that needs repair',
          'Confirm new J-channel is included in the quote',
          'Header flashing charge should auto-apply — verify it appears on the quote',
          'Note if siding color is a standard match or specialty order',
        ],
        warnings: [
          'A window installed without proper header flashing will leak — the installer and company are liable.',
          'Damaged siding not documented becomes a change order dispute at installation.',
        ],
      },
    ],
  },
  {
    id: 'ext3-rotten-wood',
    title: 'EXTERIOR CONDITIONS 3 — Rotten / Damaged Frames',
    subtitle: 'When to escalate, when to do full-frame, when to stop and call manager',
    category: 'Exterior Conditions',
    roles: ['Sales Rep', 'Manager', 'Auditor'],
    sections: [
      {
        id: 'ext3-rotten',
        title: 'Rotten Frame Protocol',
        body: 'When you find rotten wood — at the sill, jamb, or header — document and escalate immediately. Minor surface rot: can often still do an insert with rot repair. Structural rot that compromises the rough opening: requires full-frame tear-out and replacement. Unknown scope: requires manager evaluation BEFORE quoting.',
        steps: [
          'Probe the wood with a key or pen — soft spongy wood = rot',
          'Photograph the rot clearly with something for scale',
          'Mark the opening as "Rot Present" in the app',
          'Estimate scope: surface rot vs structural rot',
          'Flag for manager review if structural',
          'Add install note: "Rot repair required — confirm scope before ordering"',
          'Do NOT promise an insert price for a full-frame situation',
        ],
        warnings: [
          'Quoting an insert on a rotted frame is a chargeback risk — the installer cannot install safely.',
          'Discovering rot AFTER the customer signed for an insert: notify manager immediately before ordering.',
          'Without a photo, the installer\'s inspection report is the only evidence — always photograph rot.',
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// CHARGEABLE OPTIONS MASTER REFERENCE
// ─────────────────────────────────────────────────────────────

export const chargeableOptionsChapter: ManualChapter = {
  id: 'chg1-all-options',
  title: 'CHARGEABLE OPTIONS — Complete Field Reference',
  subtitle: 'Every option that adds cost — must appear on quote AND contract',
  category: 'Chargeable Options',
  roles: ['Sales Rep', 'Manager', 'Auditor'],
  sections: [
    {
      id: 'chg1-master-list',
      title: 'Master Chargeable Options List',
      body: 'Any of these options selected for a window or door opening adds cost to the contract. All must appear as line items on the order form and quote. A selected option with a $0 charge is a Revenue Leakage Auditor flag that will block production.',
      checklist: [
        'TEMPERED GLASS (half or full) — charge per sq ft of glass area',
        'OBSCURE GLASS (half or full) — privacy glass for bathrooms',
        'FLAT GRID — interior flat-bar decorative grid (select pattern)',
        'CONTOURED GRID — sculpted interior grid (select pattern)',
        'SDL GRID — simulated divided light premium grid',
        'FULL SCREEN — full-length screen (instead of standard half screen)',
        'WINDOW REMOVAL — existing unit removal labor',
        'FULL-FRAME TEAR-OUT — significantly more labor than insert removal',
        'HEADER FLASHING — required for siding exteriors',
        'J-CHANNEL — siding trim reinstall around window',
        'CLEAR STORY LABOR — scaffolding charge for high walls (auto-applied at threshold)',
        'SPECIALTY SHAPE CHARGE — any non-rectangular unit (custom pricing)',
        'ORIEL TOP SASH — sash split variant',
        'LOW-E GLASS — energy coating upgrade',
        'ARGON GAS FILL — insulation gas upgrade',
        'CUSTOM COLOR — non-standard frame color',
        'JAMB EXTENSION — for deep frame installations',
        'TRIM KIT — interior window casing set',
        'BAY/BOW ASSEMBLY — seat board, roof detail, extra labor',
        'HARDWARE UPGRADE — custom handle, smart lock, etc.',
        'BLINDS-BETWEEN-GLASS — patio door upgrade',
        'STORM DOOR — separate door installation over entry door',
      ],
      warnings: [
        'Never submit a job with any option selected and a $0 charge — the Revenue Leakage Auditor will block it.',
        'The pricing engine auto-calculates most of these — verify each on the pricing summary before leaving.',
        'If a charge is missing, do not override it manually — report to pricing admin to update the pricing table.',
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────
// INSTALLER IMPACT AND CHARGEBACK PREVENTION
// ─────────────────────────────────────────────────────────────

export const installerImpactChapters: ManualChapter[] = [
  {
    id: 'inst1-installer-clarity',
    title: 'INSTALLER IMPACT — How Your Data Affects the Job Site',
    subtitle: 'What installers see, what causes delays, what causes chargebacks',
    category: 'Production Handoff',
    roles: ['Sales Rep', 'Manager'],
    sections: [
      {
        id: 'inst1-what-installers-see',
        title: 'What the Installation Team Sees',
        body: 'The installation crew works directly from the data you enter. They see the sketch, opening measurements, product selections, photos, and install notes. They do NOT know about verbal agreements. If you promised something and it is not in the system, it does not exist for the installer.',
        checklist: [
          'Sketch is complete — all openings labeled and numbered',
          'Each opening has photos (interior AND exterior)',
          'Each opening has a room/location label',
          'Product selections are complete for every opening',
          'Install notes filled in for any special conditions',
          'Access issues (locked gates, dogs, alarm codes) documented',
          'Customer contact info confirmed for day-of coordination',
        ],
        warnings: [
          '"The installer will handle it" without documentation = chargeback waiting to happen.',
          'An undocumented obstruction (tight access, buried sill, stucco over wood) causes an install stop and change order.',
          'A verbal grid upgrade promise not in the system = factory ships standard grids = customer dispute.',
        ],
      },
      {
        id: 'inst1-chargeback-prevention',
        title: 'Chargeback Prevention Checklist',
        body: 'The most common chargebacks at Window World BTR: wrong product size, wrong door handing, missing rot documentation, missed tempered flag, wrong exterior surface type, undocumented access issues. Run this checklist before leaving every sold job.',
        checklist: [
          'Every measurement entered using the correct rule (Cush Measure for insert, Brick rule for masonry)',
          'Door handing re-confirmed by standing outside',
          'Specialty units have templates and clear front-facing photos',
          'Every bathroom window and any low-to-floor unit has tempered flag answered',
          'Any rot, damage, or unusual condition is photographed and noted',
          'Exterior surface type is correct for every opening',
          'Install notes filled in for any condition the installer needs to know',
          'Final Lockdown Review completed before leaving',
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// CUSTOMER COMMUNICATION SCRIPTS
// ─────────────────────────────────────────────────────────────

export const customerScriptChapters: ManualChapter[] = [
  {
    id: 'cust1-presentation',
    title: 'CUSTOMER COMMUNICATION — Field Scripts and Objections',
    subtitle: 'What to say, when to say it, how to handle objections professionally',
    category: 'Follow-Up',
    roles: ['Sales Rep'],
    sections: [
      {
        id: 'cust1-arrival',
        title: 'Arrival and Expectation Setting',
        body: 'Set the expectation for the visit from the very first moments. A rep who controls the narrative early maintains credibility throughout the presentation.',
        steps: [
          '"Hi [Name], great to meet you! My name is [Rep] from Window World Baton Rouge."',
          '"I have about 90 minutes blocked for us today — I\'ll walk the property with you, get exact measurements for a custom price, and go over our options. Sound good?"',
          '"Before we start — what was the main reason you reached out to us today?"',
          'Listen fully. Do NOT interrupt. Repeat their concern back to them.',
          '"That\'s exactly what we\'re great at helping with. Let me show you what we do."',
        ],
        warnings: [
          'Do NOT say "I just need 15 minutes" — customers feel rushed and it undervalues the product.',
          'Do NOT start with a price range before seeing the home.',
          'Do NOT skip the property walk — you will miss openings, conditions, and upsell opportunities.',
        ],
      },
      {
        id: 'cust1-closing',
        title: 'Handling "I Need to Think About It"',
        body: 'The most common objection in window sales. Rushing here kills deals. Honoring the customer\'s pace builds trust and closes more deals.',
        steps: [
          '"Absolutely — that\'s a smart approach for an investment like this."',
          '"Can I ask — is there a specific part of the proposal you\'d like to think through more?"',
          'If price: "Let me see what options we have on the financing side — that might make it easier."',
          'If comparison shopping: "What companies are you comparing us to? I can help you make a fair comparison."',
          'If spouse not present: "Would it help to set up a quick call or visit when both of you are available?"',
          '"No pressure at all — I want you to feel great about this. When would be a good time to follow up?"',
          'Set a specific follow-up date in the app BEFORE leaving.',
        ],
        warnings: [
          'Do NOT offer a last-minute discount on your way out — it destroys credibility and margin.',
          'Do NOT leave without scheduling a follow-up date — the system requires a next action date.',
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// MERGED EXPORT
// ─────────────────────────────────────────────────────────────

export const expansionChapters: ManualChapter[] = [
  ...windowTypeChapters,
  ...doorTypeChapters,
  ...sidingChapters,
  ...measuringRulesChapters,
  ...glassSafetyChapters,
  ...exteriorConditionChapters,
  chargeableOptionsChapter,
  ...installerImpactChapters,
  ...customerScriptChapters,
  // Field Manual Library -- 32 detailed training articles
  ...allLibraryChapters,
];

export const expansionCategories = [
  'Window Types',
  'Door Types',
  'Siding',
  'Measuring Rules',
  'Glass and Safety',
  'Exterior Conditions',
  'Chargeable Options',
  'Getting Started',
  'Measurement Rules',
  'Contract and Close',
  'Sales and Follow-Up',
  // Parts 3-6 categories
  'Dashboard and Workflow',
  'Quick Estimate',
  'Sketch and House Outline',
  'Field App Workflow',
  'Openings and Measurements',
  'Pricing and Quote',
  'Review and Validation',
  'Proposals and Contracts',
  'Follow-Up and Close',
  'Finance and Commissions',
  'Manager and Auditor Tools',
  'Admin and Pricing',
  'Troubleshooting',
  'Glossary',
];

