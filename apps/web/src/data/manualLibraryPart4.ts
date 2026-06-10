/**
 * manualLibraryPart4.ts
 * Openings, Pricing, and Review articles.
 *
 * ENCODING: ASCII only. No emoji literals. No curly quotes. No em/en-dash literals.
 */

import type { ManualChapter } from './manualContent';

export const manualLibraryPart4Chapters: ManualChapter[] = [

  // ============================================================
  // OPENING WIZARD
  // ============================================================

  {
    id: 'lib-opening-wizard-window',
    title: 'Opening Wizard -- Adding a Window',
    subtitle: 'Step-by-step guide to entering a new window opening correctly',
    category: 'Openings and Measurements',
    roles: ['sales_rep'],
    tags: ['opening', 'wizard', 'window', 'add opening', 'measurement entry', 'options'],
    sections: [
      {
        id: 'lib-oww-steps',
        title: 'How to Add a Window Opening',
        body: 'The Opening Wizard guides you through entering a new window. You select the window type, enter measurements, select options, and attach photos. Every field you fill in feeds directly into the quote and the order form. Incomplete openings are flagged by the Measurement Auditor and block submission.',
        steps: [
          'From the Measure tab or Openings list, tap "Add Opening."',
          'Select Window as the product type.',
          'Select the window type (DH, SH, SL, PIC, CAS, AWN, BAY, BOW, OR, Shape).',
          'Enter the width and height (use revised/Cush Measure dimensions, not raw measurements).',
          'Enter the room or location label (e.g., "Living Room", "BR-2 East").',
          'Select the exterior surface (wood/siding or brick).',
          'Select the glass option (standard, tempered, obscure, or both).',
          'Select the grid option (none, flat, contoured, SDL) and pattern if applicable.',
          'Select the screen option (half, full, no screen).',
          'Select the energy package if applicable.',
          'Take or attach interior and exterior photos.',
          'Tap Save to add the opening to the list.'
        ],
        checklist: [
          'Window type selected.',
          'Width entered (revised/order dimension).',
          'Height entered (revised/order dimension).',
          'Room/location label entered.',
          'Exterior surface type selected.',
          'Glass option answered.',
          'Grid option answered.',
          'Screen option answered.',
          'Interior photo attached.',
          'Exterior photo attached.'
        ],
        chargebackRisks: [
          'Entering raw measurements instead of revised measurements -- window too large to fit.',
          'Selecting wrong exterior surface -- wrong deduction rule applied.',
          'Leaving tempered glass blank -- non-tempered glass ships for a safety location.',
          'Selecting screen on a picture window -- screens are not available for fixed units.'
        ],
      },
      {
        id: 'lib-oww-quickadd',
        title: 'Quick Add vs Detailed Entry',
        body: 'Quick Add lets you enter just the type, width, height, and room label without going through the full wizard. Use Quick Add when you are in a hurry and want to log all openings first, then come back to fill in options. Detailed Entry walks you through every field step-by-step and is recommended for new reps or complex openings.',
        whatToChoose: 'Quick Add when you are in a fast-paced environment and know the product well. Detailed Entry when you are new, or when the opening has multiple special options.',
        whatNotToChoose: 'Do NOT use Quick Add and then forget to return to add options and photos. Quick Add openings without photos or options will trigger multiple auditor flags.',
        tips: [
          'Quick Add creates an opening with minimum required fields -- you must return to complete photos and options.',
          'Set a personal habit: measure all openings with Quick Add, then walk back through each one to add photos and options before leaving the home.',
          'The Measure tab shows a completion percentage for each opening -- use it to identify incomplete ones.'
        ],
      },
      {
        id: 'lib-oww-addsimilar',
        title: 'Add Similar Opening',
        body: '"Add Similar" creates a copy of an existing opening with all the same settings. Use it when you have multiple identical windows (e.g., five matching bedroom double hung windows). After adding similar, you only need to change the room label and measurements for each copy. This saves significant time on large jobs.',
        steps: [
          'Find the opening you want to copy in the openings list.',
          'Tap the opening card to open it.',
          'Tap the "Add Similar" button.',
          'A new opening is created with the same type, options, and glass selections.',
          'Edit the room label and dimensions for the new opening.',
          'Attach new photos specific to this opening.',
          'Save.'
        ],
        warnings: [
          'Do NOT use Add Similar and skip taking individual photos -- each opening needs its own photos.',
          'The Measurement Auditor counts openings without photos individually -- Add Similar does not copy photos.'
        ],
      },
    ],
  },

  {
    id: 'lib-opening-wizard-door',
    title: 'Opening Wizard -- Adding a Door',
    subtitle: 'Correctly entering an entry door or patio door with proper handing and swing',
    category: 'Openings and Measurements',
    roles: ['sales_rep'],
    tags: ['door', 'entry door', 'patio door', 'handing', 'swing', 'opening', 'wizard'],
    sections: [
      {
        id: 'lib-owd-entry',
        title: 'Adding an Entry Door',
        body: 'Entry doors require handing (which side the hinges are on from outside), swing direction (inswing or outswing), and sill/threshold condition. Getting handing wrong is the number-one door chargeback. Always determine handing from OUTSIDE the home, standing on the exterior facing inward.',
        steps: [
          'Tap "Add Opening" and select Door.',
          'Select the door type (Entry, Patio/Sliding, Storm).',
          'Stand OUTSIDE the door facing inward.',
          'Identify which side the hinges are on from your perspective: Left or Right.',
          'Identify swing direction: does the door swing toward you (inswing) or away (outswing)?',
          'Select handing: LHI, LHO, RHI, or RHO.',
          'Enter door width and height.',
          'Select color, hardware finish, glass insert if applicable.',
          'Note the sill and threshold condition.',
          'Take exterior photo showing full door and frame.',
          'Take interior photo showing the door and frame from inside.',
          'Save.'
        ],
        rules: [
          'LHI = Left Hand Inswing: hinges on left from outside, door swings inward.',
          'LHO = Left Hand Outswing: hinges on left from outside, door swings outward.',
          'RHI = Right Hand Inswing: hinges on right from outside, door swings inward.',
          'RHO = Right Hand Outswing: hinges on right from outside, door swings outward.',
          'ALWAYS stand OUTSIDE when determining handing -- inside reverses left and right.'
        ],
        chargebackRisks: [
          'Wrong handing = full return and reorder. 2-4 week delay. Customer escalation.',
          'Missing sill condition note = installer arrives unprepared for sill repair or replacement.'
        ],
        scenario: {
          situation: 'You are standing outside the front door facing inward. The hinges are on your left. The door swings away from you when opened (outward onto the porch).',
          question: 'What is the correct handing designation?',
          options: [
            { id: 'a', text: 'LHI (Left Hand Inswing)', isCorrect: false, explanation: 'Hinges on left is correct, but the door swings outward (away from you), not inward.' },
            { id: 'b', text: 'LHO (Left Hand Outswing)', isCorrect: true, explanation: 'Hinges on your left from outside = Left Hand. Door swings away from you = Outswing. Correct: LHO.' },
            { id: 'c', text: 'RHI (Right Hand Inswing)', isCorrect: false, explanation: 'The hinges are on your LEFT from outside, not right.' },
            { id: 'd', text: 'RHO (Right Hand Outswing)', isCorrect: false, explanation: 'Swing is correct (outswing) but handing is wrong -- hinges on your left = Left Hand.' },
          ],
          correctAnswer: 'b',
          explanation: 'Stand outside, face inward. Hinges on LEFT = Left Hand. Door swings away from you (outward) = Outswing. Result: LHO.',
        },
      },
      {
        id: 'lib-owd-patio',
        title: 'Adding a Patio/Sliding Glass Door',
        body: 'Patio/sliding glass doors require the panel configuration (which panel is fixed and which is operating) and the direction the operating panel slides. The configuration is expressed as XO or OX: X = fixed panel, O = operating panel, read from left to right as you stand INSIDE facing the door.',
        steps: [
          'Tap "Add Opening" and select Door, then Patio/Sliding.',
          'Stand INSIDE the home facing the door.',
          'Identify which panel slides: left or right (from your inside perspective).',
          'If the LEFT panel operates: configuration is OX.',
          'If the RIGHT panel operates: configuration is XO.',
          'Enter door width and height.',
          'Confirm tempered glass is selected (patio doors always require tempered).',
          'Note the sill condition.',
          'Take interior and exterior photos.',
          'Save.'
        ],
        rules: [
          'Patio doors always require tempered glass -- this is not optional.',
          'Configuration (OX vs XO) is read from INSIDE, left to right.',
          'The operating panel slides; the fixed panel does not.'
        ],
        chargebackRisks: [
          'Wrong panel configuration (OX vs XO) -- door operates on wrong side. Full return and reorder.',
          'Missing tempered glass on a patio door -- safety code violation. Full recall and replacement.'
        ],
      },
    ],
  },

  {
    id: 'lib-opening-wizard-siding',
    title: 'Opening Wizard -- Adding Siding',
    subtitle: 'Measuring and entering siding elevations for a complete siding job',
    category: 'Openings and Measurements',
    roles: ['sales_rep'],
    tags: ['siding', 'elevation', 'square footage', 'clear story', 'trim', 'J-channel'],
    sections: [
      {
        id: 'lib-ows-overview',
        title: 'How Siding Jobs Work in the App',
        body: 'Siding jobs require measuring each exterior wall elevation separately. You enter the height and width of each elevation (Front, Rear, Left, Right), and the app calculates the square footage. Openings (windows and doors) are deducted from the elevation area automatically. Any wall with a height over 12 feet triggers a clear story pricing charge. Siding jobs have their own pricing structure separate from windows -- they are priced per square foot or as a job-level total.',
        steps: [
          'From the Measure tab, tap "Add Opening" and select Siding.',
          'Select the elevation: Front, Rear, Left, Right, or Other.',
          'Enter the wall width (left edge to right edge in feet and inches).',
          'Enter the wall height (ground to roofline in feet and inches).',
          'Note any dormers, gables, or non-rectangular areas.',
          'Select the siding type (vinyl, hardie, wood, aluminum).',
          'Note any existing damage, rot, or moisture issues.',
          'Take exterior photos of the full elevation.',
          'Repeat for each elevation.',
          'Review the total square footage in the pricing summary.'
        ],
        checklist: [
          'All four elevations measured (Front, Rear, Left, Right).',
          'Width and height entered for each elevation.',
          'Any dormers or gables noted and measured separately.',
          'Siding type selected.',
          'Clear story flag confirmed if any wall height exceeds 12 feet.',
          'Exterior photos taken for each elevation.',
          'Any damage or rot photographed.'
        ],
        rules: [
          'Clear story charge applies automatically when wall height exceeds 12 feet -- verify this appears in the quote.',
          'Do not deduct openings manually -- the app calculates this automatically from linked window/door openings.',
          'Missing any elevation will prevent the full siding quote from generating.'
        ],
        chargebackRisks: [
          'Missing an elevation -- materials ordered short, job stalls mid-install.',
          'Wrong height on a tall wall -- clear story charge missing, labor underpriced.',
          'Not noting moisture damage -- installer discovers rot, stops job, change order dispute.'
        ],
        installerNotes: [
          'Installer needs elevation photos to plan staging and equipment.',
          'Any access constraints (fences, pools, landscaping) must be noted for each elevation.',
          'Siding elevation photos should show the full wall from ground level.'
        ],
      },
    ],
  },

  {
    id: 'lib-opening-editor',
    title: 'Opening Editor -- Editing an Existing Opening',
    subtitle: 'How to modify, correct, or update an opening after it has been created',
    category: 'Openings and Measurements',
    roles: ['sales_rep', 'manager'],
    tags: ['opening editor', 'edit', 'modify', 'correct', 'change type', 'measurement correction'],
    sections: [
      {
        id: 'lib-oe-overview',
        title: 'How to Edit an Opening',
        body: 'After creating an opening, you can edit any of its fields using the Opening Editor. Open the openings list, tap the opening you want to edit, and make your changes. Changes to dimensions, window type, or glass options automatically recalculate the pricing. Changes to photos simply replace the attached image.',
        steps: [
          'Open the Openings tab or Measure tab.',
          'Find the opening you want to edit and tap it.',
          'The Opening Editor opens showing all fields.',
          'Edit any field: dimensions, type, options, photos.',
          'Tap Save to apply changes.',
          'The quote automatically recalculates based on the new values.',
          'Review the Review tab to confirm any auditor flags were resolved.'
        ],
        tips: [
          'If you change a window type (e.g., from DH to SH), all option selections are reset -- re-select options after a type change.',
          'Dimension changes automatically apply the correct deduction rule based on the selected exterior surface.',
          'Changing from brick to siding (or vice versa) changes the deduction rule and updates the order dimensions.'
        ],
        warnings: [
          'Editing an opening after the proposal or contract has been generated marks those documents as stale. Regenerate before presenting.',
          'If a job has been submitted to production, contact your manager before editing any opening -- changes may require a change order.'
        ],
      },
      {
        id: 'lib-oe-sketch-link',
        title: 'Opening and Sketch Marker Link',
        body: 'Each opening in the list is linked to a marker on the sketch canvas. If you change the opening type or location label, the linked sketch marker updates automatically. If you delete an opening, the marker on the sketch becomes unlinked and shows as "No Opening" -- you must either delete the marker or link it to a new opening.',
        warnings: [
          'Deleting an opening without also removing or relinking its sketch marker leaves an orphaned marker that triggers an auditor warning.',
          'If the sketch shows a marker count different from the opening count, the Measurement Auditor will flag a Level 2 Warning.'
        ],
      },
    ],
  },

  // ============================================================
  // PRICING AND QUOTE
  // ============================================================

  {
    id: 'lib-pricing-overview',
    title: 'Pricing and Quote Overview',
    subtitle: 'How the app calculates your quote from measurements and product selections',
    category: 'Pricing and Quote',
    roles: ['sales_rep', 'manager'],
    tags: ['pricing', 'quote', 'line items', 'total', 'charges', 'options', 'recalculate'],
    sections: [
      {
        id: 'lib-pr-how',
        title: 'How Pricing Is Calculated',
        body: 'The pricing engine calculates the quote automatically based on four inputs: (1) the window/door type and dimensions (which determine the base price), (2) the united inches (width + height, which determines the pricing tier), (3) the selected options (tempered, grids, screens, energy package), and (4) the job-level charges (clear story, siding, specialty). Every time you save an opening, the quote recalculates. The total on the Quote tab is always current.',
        examples: [
          'A 36x48 double hung (84 united inches) falls in one pricing tier. A 48x60 double hung (108 united inches) falls in a higher tier. The base price is different.',
          'Adding tempered glass adds a per-unit charge on top of the base price. If the charge shows $0, the pricing rule is missing.',
          'A siding elevation with a wall height over 12 feet automatically adds the clear story charge per the rule engine settings.'
        ],
        tips: [
          'Always review the full quote before presenting -- look at every line item.',
          'Any $0 charge on a selected option is a red flag -- contact your manager before submitting.',
          'United inches = width + height. Higher united inches = higher tier price for the same window type.'
        ],
      },
      {
        id: 'lib-pr-clearstory',
        title: 'Clear Story and Specialty Charges',
        body: 'Clear story charges are automatically added when a siding wall height exceeds 12 feet (scaffold or lift required). The base clear story charge is $225 for the first story above 12 feet, plus $75 for each additional foot. These charges appear as separate line items on the quote. Always verify the clear story line item is present on multi-story or high-wall siding jobs.',
        rules: [
          'Clear story charge: $225 base when wall height exceeds 12 feet.',
          '$75 per additional foot above 12 feet.',
          'Applies per elevation -- a two-story home with high front and rear elevations gets two clear story charges.',
          'Clear story charges are set by the Rule Engine admin -- amounts may vary.'
        ],
        chargebackRisks: [
          'Missing clear story charge -- company loses labor cost margin on high-wall job.',
          'Installer arrives to a 20-foot wall with no lift equipment budgeted -- job delays and rescheduling cost.'
        ],
      },
      {
        id: 'lib-pr-override',
        title: 'Price Override and Manager Approval',
        body: 'If a customer is pushing back on price, you can apply a discount. Standard discounts up to 10% can be applied without manager approval. Discounts above 10% require a manager override PIN. Any job with a discount greater than 15% is flagged by the Revenue Leakage Auditor and may be blocked from submission. Always get approval before promising a discount you cannot enter.',
        steps: [
          'In the Quote tab, tap the Discount field.',
          'Enter the discount percentage.',
          'If under 10%: discount applies immediately.',
          'If over 10%: a manager override prompt appears.',
          'Call your manager or have them enter their PIN on your device.',
          'The discount is applied with the manager override logged.',
          'The Revenue Leakage Auditor flags jobs with discounts over 15% for admin review.'
        ],
        warnings: [
          'Never promise a discount you cannot enter in the system -- verbal-only discounts create disputes.',
          'Do not guess at a discount and plan to "fix it later" -- discounts affect contract total and are reviewed by auditors.'
        ],
        chargebackRisks: [
          'Discount applied beyond the allowed threshold without manager override -- job flagged, rep commission affected.',
          'Discount applied but not reflected in contract -- contract/quote mismatch triggers Contract Auditor.'
        ],
      },
      {
        id: 'lib-pr-missing',
        title: 'Missing Catalog Prices ($0 Line Items)',
        body: 'When the pricing catalog is missing a rule for a selected product or option, the line item appears on the quote as $0. This means the option is selected but NOT priced. The product will be ordered with that option, but the customer is not charged for it. This costs the company money and may also mean the wrong product is ordered.',
        steps: [
          'Identify any line item showing $0 for a selected option.',
          'Do NOT ignore or submit with $0 charges.',
          'Document which option is showing $0 and on which opening.',
          'Call or message your manager immediately.',
          'The Pricing Admin must add the missing rule before the job can be correctly priced.',
          'Do not submit the job until the pricing rule is added and the charge is non-zero.'
        ],
        chargebackRisks: [
          'Submitting with $0 tempered glass charge -- non-tempered glass ships, safety violation.',
          '$0 grid charge -- factory does not know to add grids, ships plain glass.',
          '$0 energy package charge -- company does not collect revenue for the upgrade.'
        ],
      },
    ],
  },

  // ============================================================
  // VALIDATION / REVIEW
  // ============================================================

  {
    id: 'lib-validation-overview',
    title: 'Validation Panel and Review Red Flags',
    subtitle: 'Understanding and resolving auditor flags before submitting a job',
    category: 'Review and Validation',
    roles: ['sales_rep', 'manager', 'auditor'],
    tags: ['validation', 'review', 'red flags', 'auditor', 'required fixes', 'submission', 'warnings'],
    sections: [
      {
        id: 'lib-vp-overview',
        title: 'What the Validation Panel Shows',
        body: 'The Validation Panel (visible on the Review tab in the field app and on the Appointment Detail page) is the automated quality control system. It continuously monitors your job data and surfaces any issues that need attention. Issues are sorted into four categories: Required Fixes (must resolve before submitting), Recommended Improvements (should resolve but not blocking), Informational (good to know), and Advanced Details (for managers and auditors).',
        rules: [
          'REQUIRED FIXES: Job cannot advance to submission until all are resolved.',
          'RECOMMENDED: Job can submit, but these should be resolved for quality.',
          'INFORMATIONAL: Notes for reference -- no action required.',
          'ADVANCED DETAILS: Manager-level flags showing risk metrics and audit scores.'
        ],
        tips: [
          'Work through Required Fixes first -- they block you from generating a contract.',
          'Recommended fixes are usually quick wins: missing a photo label, a note, or an optional field.',
          'If a Required Fix appears that you cannot resolve in the field, photograph the condition and contact your manager.',
          'The Validation Panel updates in real time -- fix an issue and the flag disappears immediately.'
        ],
      },
      {
        id: 'lib-vp-measurement-flags',
        title: 'Measurement Auditor Flags',
        body: 'The Measurement Auditor generates flags when opening data is incomplete or suspicious. Common measurement flags include: missing width or height, missing photo, missing room label, abnormal dimensions, and unresolved tempered glass condition. Each flag has a direct link or Fix button that takes you to the exact field that needs attention.',
        examples: [
          '"Window 3 is missing an exterior photo" -- tap Fix to open the photo capture for that opening.',
          '"Window 6 has no tempered glass answer (bathroom window detected)" -- tap Fix to answer the tempered glass question.',
          '"Opening 9 has an unusually large width (72"). Verify measurement." -- tap to confirm or correct the dimension.',
          '"Sketch has 8 markers but only 7 openings exist." -- one marker is unlinked or one opening has no marker.'
        ],
        steps: [
          'Open the Review tab.',
          'Find each Measurement Auditor flag.',
          'Tap the Fix button or the opening link.',
          'Correct the issue (enter missing data, take photo, answer question).',
          'Return to the Review tab to confirm the flag cleared.',
          'Repeat until all measurement flags are resolved.'
        ],
      },
      {
        id: 'lib-vp-contract-flags',
        title: 'Contract Auditor Flags',
        body: 'The Contract Auditor checks that the contract data is complete and legally sound. Common contract flags include: missing customer signature, quote/contract total mismatch, missing payment terms, and address mismatch between the lead and the contract.',
        examples: [
          '"Contract is missing the customer\'s signature." -- customer must sign before submission.',
          '"Quote total ($12,450) does not match contract total ($11,950)." -- a product was removed from the quote after the contract was generated.',
          '"Payment terms are blank." -- the finance plan or payment method is not selected.',
          '"Address on contract does not match the appointment address." -- verify address and update the contract.'
        ],
        chargebackRisks: [
          'Submitting a contract without a signature -- legally incomplete, company cannot collect payment.',
          'Quote/contract mismatch -- customer receives wrong total, creates dispute at billing.',
          'Wrong address on contract -- legal document is for wrong property.'
        ],
      },
      {
        id: 'lib-vp-pricing-flags',
        title: 'Pricing Auditor Flags',
        body: 'The Pricing Auditor watches for revenue leakage, unauthorized discounts, and missing charges. These flags protect the company\'s margins and ensure every product is correctly priced.',
        examples: [
          '"Tempered glass charge is $0 on Opening 4." -- pricing rule missing.',
          '"Discount of 18% exceeds the 15% threshold. Manager approval required." -- contact manager.',
          '"Clear story charge is missing for the front elevation (wall height = 18 feet)." -- rule engine should auto-add but did not.',
          '"Specialty window (Shape) has no specialty upcharge." -- shape windows require custom pricing.'
        ],
      },
      {
        id: 'lib-vp-fix-actions',
        title: 'Fix Button Behavior and Quick Fixes',
        body: 'Every flag in the Validation Panel has one of three fix actions: a Fix button that takes you directly to the problematic field, a Change menu that lets you update a selection inline, or an Open Section button that navigates to the relevant tab. Understanding which action each flag provides helps you resolve issues faster.',
        steps: [
          'Tap the Fix button -- you are taken directly to the field or opening that has the issue.',
          'Correct the field (enter the missing value, select the correct option, or take the missing photo).',
          'Return to the Review tab using the back button.',
          'Confirm the flag has cleared.',
          'Move to the next flag.'
        ],
        tips: [
          'The fastest way through Required Fixes is to work top-to-bottom -- higher severity flags first.',
          'Some flags require manager action (e.g., discount override) -- tap the flag description to see who can resolve it.',
          'If the same flag type appears on multiple openings, fix them in sequence using the Fix button for each.'
        ],
      },
    ],
  },

];
