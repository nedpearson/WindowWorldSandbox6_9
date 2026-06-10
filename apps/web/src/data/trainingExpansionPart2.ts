/**
 * trainingExpansionPart2.ts
 * Training Paths 11-15: Quick Estimate, Sketch, Proposal/Contract, Finance, Admin/Pricing.
 *
 * ENCODING: ASCII only. No emoji literals. No curly quotes. No em/en-dash literals.
 */

import type { TrainingPath, QuizQuestion } from './trainingExpansion';

// Suppress unused-import warning for QuizQuestion (used by imported type only)
type _QuizQuestion = QuizQuestion;

// -----------------------------------------------------------------
// PATH 11 -- Quick Estimate and Property Research
// -----------------------------------------------------------------

export const quickEstimatePath: TrainingPath = {
  id: 'path-quick-estimate',
  title: 'Quick Estimate and Property Research',
  roleTarget: 'sales_rep',
  required: false,
  iconEmoji: 'ESTIMATE',
  description: 'Use Quick Quote for pre-appointment research, ballpark estimates, and customer qualification using aerial imagery and AI window counting.',
  estimatedMinutes: 20,
  lessons: [
    {
      id: 'qe-l1',
      title: 'What Quick Quote Is and Is Not',
      type: 'article',
      summary: 'When and how to use Quick Quote appropriately.',
      durationMinutes: 5,
      bodyMarkdown: `
## Quick Quote: Pre-Appointment Intelligence

Quick Quote is a qualifying and scheduling tool, NOT a contract-generating tool. Use it to:
- Give a customer a ballpark range during a phone call
- Qualify a lead before scheduling (is the scope worth the drive?)
- Prepare for an appointment by understanding the property before arriving

## What Quick Quote Cannot Do
- Generate a binding quote or contract
- Measure windows accurately (aerial imagery is approximate)
- See hidden elevations, interior conditions, or frame condition

## The Right Language

Always say: "Based on the aerial view of your home, this looks like a 10-12 window project in the $X,XXX to $X,XXX range -- I would confirm the exact scope when I come out."

Never say: "Your quote is $12,000." That price anchor creates a barrier before you have seen the home.
`,
    },
    {
      id: 'qe-l2',
      title: 'Quick Quote Quiz',
      type: 'quiz',
      summary: 'Test your judgment on when and how to use Quick Quote.',
      durationMinutes: 8,
      quiz: [
        {
          id: 'q-qq-1',
          type: 'multiple_choice',
          question: 'A customer calls and says "I just want a rough number before I schedule." What is the correct approach?',
          options: [
            { id: 'a', text: 'Run Quick Quote and read the exact total as a confirmed price', isCorrect: false, explanation: 'Quick Quote is not a confirmed price. Presenting it as exact creates false expectations and potential disputes.' },
            { id: 'b', text: 'Run Quick Quote and give a range with a clear disclaimer', isCorrect: true, explanation: 'Correct. "Based on aerial imagery, this looks like $X,XXX to $X,XXX -- I would confirm at the appointment." This moves the lead forward without overcommitting.' },
            { id: 'c', text: 'Tell the customer you cannot give any number without measuring first', isCorrect: false, explanation: 'This loses the lead. Quick Quote exists for this exact situation.' },
            { id: 'd', text: 'Guess a number based on experience', isCorrect: false, explanation: 'Never guess. Use Quick Quote to ground your estimate in actual property data.' },
          ],
          explanation: 'Quick Quote provides informed ballparks to earn the in-home appointment -- not to close remotely.',
        },
        {
          id: 'q-qq-2',
          type: 'true_false',
          question: 'True or False: If the AI window count shows 8 windows, the final job will definitely have 8 windows.',
          options: [
            { id: 'a', text: 'True', isCorrect: false, explanation: 'AI window counting is approximate and misses interior windows, obscured elevations, and recent additions.' },
            { id: 'b', text: 'False -- AI counts are an estimate, not a confirmed count', isCorrect: true, explanation: 'AI counts windows visible in aerial imagery. Hidden elevations, interior windows, and new additions are missed.' },
          ],
          explanation: 'AI window counting is a starting point. Always physically count and measure at the appointment.',
        },
      ],
    },
  ],
};

// -----------------------------------------------------------------
// PATH 12 -- Sketch Canvas and House Outline
// -----------------------------------------------------------------

export const sketchPath: TrainingPath = {
  id: 'path-sketch',
  title: 'Sketch Canvas and House Outline',
  roleTarget: 'sales_rep',
  required: true,
  iconEmoji: 'SKETCH',
  description: 'Document every opening accurately using the sketch canvas, connect markers to openings, use the mull/join tool, and produce a sketch that serves as the installer map.',
  estimatedMinutes: 25,
  lessons: [
    {
      id: 'sk-l1',
      title: 'Why the Sketch Matters',
      type: 'article',
      summary: 'The sketch is the visual backbone of the production order packet.',
      durationMinutes: 5,
      bodyMarkdown: `
## The Sketch Is the Installer's Map

The sketch canvas is embedded in the order form. The installer uses it to:
- Know which wall each window is on before entering the home
- Plan material staging at the correct location
- Sequence the installation across multiple rooms
- Confirm mull unit configurations before the job begins

## Sketch Must Match the Opening List

The Measurement Auditor checks that marker count matches opening count. A mismatch triggers a Level 2 Warning:
- More markers than openings: orphaned unlinked markers
- More openings than markers: openings with no sketch position

Fix both before submitting.

## Best Practice

Create the sketch BEFORE measuring individual openings. Walk the property, place markers for every visible opening, then go back and fill in measurements. This prevents missed openings.
`,
    },
    {
      id: 'sk-l2',
      title: 'Sketch Quiz -- Markers, Elevation, and Mull Tools',
      type: 'quiz',
      summary: 'Test your knowledge of sketch canvas tools and rules.',
      durationMinutes: 10,
      quiz: [
        {
          id: 'q-sk-1',
          type: 'multiple_choice',
          question: 'The Measurement Auditor flags "Sketch has 8 markers, openings list has 7." What is the most likely cause?',
          options: [
            { id: 'a', text: 'The Auditor made an error', isCorrect: false, explanation: 'The Auditor counts are accurate -- do not dismiss this flag.' },
            { id: 'b', text: 'One sketch marker was placed but never linked to an opening record', isCorrect: true, explanation: 'An unlinked marker shows "No Opening" and is counted as a marker without an opening.' },
            { id: 'c', text: 'One opening was deleted but its marker was not removed', isCorrect: true, explanation: 'Also a valid cause -- deleting an opening leaves an orphan marker if the marker is not removed.' },
            { id: 'd', text: 'The Add Similar function created a duplicate', isCorrect: false, explanation: 'Add Similar creates an opening, not a sketch marker.' },
          ],
          explanation: 'Unlinked markers or markers for deleted openings cause count mismatches. Review the sketch for "No Opening" markers.',
        },
        {
          id: 'q-sk-2',
          type: 'multiple_choice',
          question: 'Two casement windows are installed side-by-side in a single frame opening. How do you represent this on the sketch?',
          options: [
            { id: 'a', text: 'Place two separate markers with no mull connection', isCorrect: false, explanation: 'Two separate markers tell the factory to ship two individually framed windows.' },
            { id: 'b', text: 'Place one marker and note "x2" in the label', isCorrect: false, explanation: 'Quantity means identical separate units. A mulled pair requires individual markers with the Mull tool.' },
            { id: 'c', text: 'Place two markers and use the Mull/Join tool to connect them', isCorrect: true, explanation: 'Two connected markers = a mulled assembly. The factory manufactures them as one joined unit.' },
            { id: 'd', text: 'Do not sketch mulled units -- note it in installer notes only', isCorrect: false, explanation: 'Mulled units must be shown in the sketch and connected with the mull tool.' },
          ],
          explanation: 'Mulled units: individual markers + Mull/Join connection = factory-made mulled assembly.',
        },
      ],
    },
    {
      id: 'sk-l3',
      title: 'Mull Unit Scenario',
      type: 'scenario',
      summary: 'Choose the correct sketch configuration for a three-unit mulled assembly.',
      durationMinutes: 7,
      scenario: {
        situation: 'A living room has a picture window flanked by a casement on each side, all mulled together in a single frame (CAS-PIC-CAS). Total opening is 96 inches wide.',
        question: 'What is the correct sketch configuration?',
        options: [
          { id: 'a', text: 'Place 3 separate markers (PIC, CAS, CAS) with no mull connection', isCorrect: false, explanation: 'Three separate markers = three individually framed units. Not a mulled assembly.' },
          { id: 'b', text: 'Place 3 markers (CAS, PIC, CAS) and use Mull/Join to connect all three', isCorrect: true, explanation: 'Three connected markers = three-unit mulled assembly (CAS-PIC-CAS). Total width = sum of all three order dimensions.' },
          { id: 'c', text: 'Place 1 marker with quantity 3', isCorrect: false, explanation: 'Quantity means 3 identical separate units. This is a CAS-PIC-CAS assembly, not identical units.' },
          { id: 'd', text: 'Label it "bay window"', isCorrect: false, explanation: 'Bay windows project outward at an angle. This is a flat mulled unit.' },
        ],
        correctAnswer: 'b',
        explanation: 'Place CAS + PIC + CAS markers, mull-join all three. Each unit has its own order dimension. The factory assembles as a single mulled unit.',
      },
    },
  ],
};

// -----------------------------------------------------------------
// PATH 13 -- Proposal, Contract, and Signing
// -----------------------------------------------------------------

export const proposalContractPath: TrainingPath = {
  id: 'path-proposal-contract',
  title: 'Proposal, Contract, and Signing',
  roleTarget: 'sales_rep',
  required: true,
  iconEmoji: 'CONTRACT',
  description: 'Master the full document workflow: generating the proposal, presenting pricing, creating the contract, and capturing a legally complete set of signatures.',
  estimatedMinutes: 25,
  lessons: [
    {
      id: 'pc-l1',
      title: 'Proposal vs. Contract',
      type: 'article',
      summary: 'Know the difference between proposal, contract, and order form.',
      durationMinutes: 6,
      bodyMarkdown: `
## The Proposal

Customer-facing presentation document. Shows scope, products, pricing, warranty. NOT legally binding. Can be regenerated if anything changes.

## The Contract

Legally binding agreement. Locks in scope, pricing, payment terms, and signatures. Changes after signing require a change order with manager approval and new customer signature.

## The Order Form

Internal production document. Goes to the factory. Contains order dimensions, product codes, options, tempered flags, mull configurations, installer notes, and sketch image.

## Always Generate in Order

1. Proposal (present and gain agreement)
2. Contract (customer confirms and signs)
3. Order form (generated automatically when contract is signed)

Never skip the proposal and jump to contract. The proposal is your pricing presentation tool.
`,
    },
    {
      id: 'pc-l2',
      title: 'Contract Completion Quiz',
      type: 'quiz',
      summary: 'Test your understanding of what makes a contract legally complete.',
      durationMinutes: 8,
      quiz: [
        {
          id: 'q-pc-1',
          type: 'multiple_choice',
          question: 'The Contract Auditor flags "Contract total ($11,900) does not match Quote total ($12,450)." What most likely happened?',
          options: [
            { id: 'a', text: 'The system made a calculation error', isCorrect: false, explanation: 'The system does not make calculation errors. The quote changed after the contract was generated.' },
            { id: 'b', text: 'A product or option was removed from the quote after the contract was generated', isCorrect: true, explanation: 'If the quote is modified after generating the contract, the contract becomes stale. Regenerate and get new signatures.' },
            { id: 'c', text: 'Finance fees were added to the quote', isCorrect: false, explanation: 'Finance fees would increase the quote total, not create a downward mismatch.' },
            { id: 'd', text: 'The discount was applied incorrectly', isCorrect: false, explanation: 'A discount already in the quote is reflected in both totals. A post-contract quote change is the most common cause.' },
          ],
          explanation: 'Quote/contract mismatch = quote was changed after contract generation. Regenerate the contract and get new signatures.',
        },
        {
          id: 'q-pc-2',
          type: 'multiple_choice',
          question: 'A customer says "I will sign it tonight and email it back." What should you do?',
          options: [
            { id: 'a', text: 'That is fine -- email works as a legal signature', isCorrect: false, explanation: 'An emailed unsigned contract is not a signed contract in the system.' },
            { id: 'b', text: 'Ask them to sign on your device now -- a signed contract today is more secure than a promise', isCorrect: true, explanation: 'Capture the signature while you are there. A customer who promises to sign later may reconsider or delay.' },
            { id: 'c', text: 'Mark the job as Sold and submit -- signature comes later', isCorrect: false, explanation: 'A contract without a signature is incomplete. The Contract Auditor blocks submission.' },
            { id: 'd', text: 'Leave and come back tomorrow', isCorrect: false, explanation: 'Every extra trip costs time and risk. Capture signatures at the appointment whenever possible.' },
          ],
          explanation: 'Always try to capture the signature before leaving the home.',
        },
        {
          id: 'q-pc-3',
          type: 'true_false',
          question: 'True or False: You can change the scope or price after signing without a change order.',
          options: [
            { id: 'a', text: 'True', isCorrect: false, explanation: 'Changing a signed contract without a change order violates the contract terms and creates legal risk.' },
            { id: 'b', text: 'False -- changes require a change order, manager approval, and new customer signature', isCorrect: true, explanation: 'Correct. A signed contract is locked. Changes require the full change order process.' },
          ],
          explanation: 'Signed contracts are legally binding. No unauthorized changes.',
        },
      ],
    },
  ],
};

// -----------------------------------------------------------------
// PATH 14 -- Finance and Commission
// -----------------------------------------------------------------

export const financeCommissionPath: TrainingPath = {
  id: 'path-finance-commission',
  title: 'Finance Options and Commission',
  roleTarget: 'sales_rep',
  required: false,
  iconEmoji: 'FINANCE',
  description: 'Present finance options that match customer budgets and understand how your commission is calculated.',
  estimatedMinutes: 20,
  lessons: [
    {
      id: 'fc-l1',
      title: 'The Monthly Payment Conversation',
      type: 'article',
      summary: 'Lead with monthly payments to overcome price objections.',
      durationMinutes: 6,
      bodyMarkdown: `
## The Price Is Not the Problem

When a customer says "that is too expensive," they are reacting to the total number. The solution is often not a discount -- it is a monthly payment reframe.

After presenting the total, say:

> "A lot of our customers prefer to finance. Would you like to see what this comes out to per month?"

Then show 2-3 plan options. Most customers respond better to "$189/month" than "$11,400."

## Rules

- Always use the actual plan calculator in the app -- never estimate monthly payments manually
- Never guarantee credit approval -- financing is subject to lender review
- Always disclose the interest rate and total financed cost
- The selected finance plan is noted on the contract with customer initials

## Discounts vs. Finance

Before discounting, always try financing. A 60-month plan often brings a high total into the customer's comfort zone without reducing your commission base.
`,
    },
    {
      id: 'fc-l2',
      title: 'Finance and Commission Quiz',
      type: 'quiz',
      summary: 'Test your understanding of finance presentation and commission impact.',
      durationMinutes: 8,
      quiz: [
        {
          id: 'q-fc-1',
          type: 'multiple_choice',
          question: 'A customer says "I cannot do more than $200 per month." The project total is $10,800. What do you do first?',
          options: [
            { id: 'a', text: 'Immediately discount the job to bring the total down', isCorrect: false, explanation: 'Try financing before discounting. A 60-month plan may solve the problem without reducing price.' },
            { id: 'b', text: 'Open Finance Options and show the 60-month monthly payment for $10,800', isCorrect: true, explanation: 'Correct. A 60-month plan on $10,800 may come to approximately $180-220/month. Price stays intact.' },
            { id: 'c', text: 'Tell them they cannot afford the job', isCorrect: false, explanation: 'Never tell a customer they cannot afford it. Always show options.' },
            { id: 'd', text: 'Remove the most expensive openings to lower the total', isCorrect: false, explanation: 'Do not reduce scope before exploring financing. That loses revenue unnecessarily.' },
          ],
          explanation: 'Explore financing before discounting. A 60-month plan often fits tight monthly budgets.',
        },
        {
          id: 'q-fc-2',
          type: 'true_false',
          question: 'True or False: A 15% discount on a $12,000 job reduces your commission base to $10,200.',
          options: [
            { id: 'a', text: 'True -- commission is calculated on net total after discounts', isCorrect: true, explanation: 'Correct. Commission is on the net total. A 15% discount reduces both the job revenue and your commission base.' },
            { id: 'b', text: 'False -- commission is always on the original total', isCorrect: false, explanation: 'Commission is on the net total. Discounts directly reduce your earnings.' },
          ],
          explanation: 'Protecting price = protecting your commission. Discounts reduce your commission base.',
        },
      ],
    },
  ],
};

// -----------------------------------------------------------------
// PATH 15 -- Admin and Pricing Maintenance
// -----------------------------------------------------------------

export const adminPricingPath: TrainingPath = {
  id: 'path-admin-pricing',
  title: 'Admin: Pricing and System Maintenance',
  roleTarget: 'manager',
  required: true,
  iconEmoji: 'ADMIN',
  description: 'For managers and admins: maintain pricing rules, respond to $0 charge reports, manage the rule engine, and import pricing updates.',
  estimatedMinutes: 30,
  lessons: [
    {
      id: 'ap-l1',
      title: 'Pricing Admin Overview',
      type: 'article',
      summary: 'What the Pricing Admin page controls and the most common admin task.',
      durationMinutes: 8,
      bodyMarkdown: `
## What Pricing Admin Manages

The Pricing Admin page (/pricing) controls:
1. Product catalog: window types, door types, siding products, and base prices
2. Option rules: charges for tempered glass, grids, screens, energy package, etc.
3. United inches tiers: price breaks that change the base price based on window size (UI = W + H)

Changes take effect immediately for all new quotes.

## Fixing a $0 Charge (Most Common Task)

When a rep reports a $0 line item:
1. Open Pricing Admin
2. Find the product type
3. Check option rules -- look for the missing option
4. Click "Add Option Rule"
5. Set the option type and per-unit charge
6. Save -- notify rep to refresh their quote

## United Inches Tiers

Large windows cost more. Pricing engine uses UI tiers:
- 0-84 UI: standard price
- 85-96 UI: mid-size upcharge
- 97-120 UI: large window upcharge
- 121+ UI: oversized -- custom pricing

Verify all size tiers are configured for every product type.
`,
    },
    {
      id: 'ap-l2',
      title: 'Admin Quiz -- Pricing and Rule Engine',
      type: 'quiz',
      summary: 'Diagnose and fix common pricing admin issues.',
      durationMinutes: 12,
      quiz: [
        {
          id: 'q-ap-1',
          type: 'multiple_choice',
          question: 'A rep reports: "Tempered glass is selected but the charge shows $0." What is the correct admin action?',
          options: [
            { id: 'a', text: 'Tell the rep to manually add a custom line item', isCorrect: false, explanation: 'Manual overrides bypass the pricing table and create audit issues. Fix the root cause.' },
            { id: 'b', text: 'Open Pricing Admin, find the product type, add a tempered option rule with the correct charge', isCorrect: true, explanation: 'Correct. The tempered glass option rule is missing. Add it in Pricing Admin.' },
            { id: 'c', text: 'Ignore it -- tempered is mandatory so the factory adds it anyway', isCorrect: false, explanation: 'The factory manufactures what is ordered. A missing tempered flag can cause the wrong glass to ship.' },
            { id: 'd', text: 'Deactivate the tempered option until the rule is fixed', isCorrect: false, explanation: 'Deactivating the option removes it from all quotes -- reps cannot meet safety code requirements.' },
          ],
          explanation: 'A $0 option charge = missing pricing rule. Fix it in Pricing Admin. No workarounds.',
        },
        {
          id: 'q-ap-2',
          type: 'multiple_choice',
          question: 'A 3-story siding job (wall height 28 feet) has no clear story charge. What do you check first?',
          options: [
            { id: 'a', text: 'Pricing Admin product catalog -- verify siding product exists', isCorrect: false, explanation: 'Clear story charges are in the Rule Engine, not the product catalog.' },
            { id: 'b', text: 'Rule Engine -- verify the clear story rule exists and height threshold is correct', isCorrect: true, explanation: 'Correct. The clear story charge is a Rule Engine rule. Check it is active and the height threshold (12 feet) is correct.' },
            { id: 'c', text: 'Tell the rep to add the charge manually', isCorrect: false, explanation: 'Fix the rule so it fires automatically. Manual charges bypass the audit system.' },
            { id: 'd', text: 'Measurement Rules Admin -- adjust the height deduction', isCorrect: false, explanation: 'Measurement Rules controls deduction calculations, not pricing surcharges.' },
          ],
          explanation: 'Clear story charges are Rule Engine rules. A missing charge means the rule is inactive or misconfigured.',
        },
        {
          id: 'q-ap-3',
          type: 'true_false',
          question: 'True or False: Changing the Cush Measure deduction in Measurement Rules Admin retroactively updates existing open quotes.',
          options: [
            { id: 'a', text: 'True', isCorrect: false, explanation: 'Existing quotes are not automatically recalculated. Only new opening entries use the new rule.' },
            { id: 'b', text: 'False -- existing quotes retain the deduction value at time of entry', isCorrect: true, explanation: 'Correct. Rule changes are forward-looking. Existing openings retain their original order dimensions.' },
          ],
          explanation: 'Measurement rule changes affect future calculations only. Coordinate changes with the factory.',
        },
      ],
    },
  ],
};
