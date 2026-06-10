/**
 * manualLibraryPart5.ts
 * Proposal, Contract, Document Signing, Follow-Up, Finance, Commissions.
 *
 * ENCODING: ASCII only. No emoji literals. No curly quotes. No em/en-dash literals.
 */

import type { ManualChapter } from './manualContent';

export const manualLibraryPart5Chapters: ManualChapter[] = [

  // ============================================================
  // PROPOSAL AND CONTRACT
  // ============================================================

  {
    id: 'lib-proposal-builder',
    title: 'Proposal Builder',
    subtitle: 'Generating and presenting the customer proposal document',
    category: 'Proposals and Contracts',
    roles: ['sales_rep'],
    tags: ['proposal', 'document', 'generate', 'present', 'pricing summary', 'financing'],
    sections: [
      {
        id: 'lib-pb-what',
        title: 'What the Proposal Builder Does',
        body: 'The Proposal Builder generates a professional customer-facing document that summarizes the full project scope, pricing, product selections, and financing options. It is the document you present to the customer when showing them the total price and options. The proposal is NOT the contract -- it is a presentation document. The contract is generated separately after the customer agrees.',
        steps: [
          'Complete all openings, options, and pricing in the Measure and Product tabs.',
          'Resolve all Required flags in the Review tab.',
          'Open the Proposal tab.',
          'Tap "Generate Proposal."',
          'The system builds the document from your current quote data.',
          'Review the generated proposal on screen before presenting.',
          'Present the proposal to the customer on your device or printed.',
          'Walk through each section: scope of work, product selections, pricing, financing options.',
          'If the customer agrees, tap "Generate Contract" to move to the signing step.'
        ],
        tips: [
          'Review the proposal yourself before presenting -- look for any numbers or selections that seem wrong.',
          'The proposal shows the financing monthly payment options automatically if finance options are configured.',
          'If you made any changes to the quote after generating the proposal, regenerate it before presenting.',
          'The proposal can be emailed to the customer directly from the app using the Share button.'
        ],
        warnings: [
          'The proposal is generated from the CURRENT quote state -- if you change a price after generating, regenerate the proposal.',
          'Do not present a stale proposal that does not match the current quote -- this creates customer confusion.'
        ],
      },
      {
        id: 'lib-pb-sections',
        title: 'Proposal Sections Explained',
        body: 'The generated proposal contains several sections that the customer reviews. Understanding each section helps you walk the customer through it confidently.',
        examples: [
          'Project Summary: lists each opening by room, window type, and dimensions. Customer can see exactly what they are getting.',
          'Product Options: shows the glass, grid, screen, and color selections for each opening.',
          'Investment Summary: the total project cost broken into: base product total, option charges, discounts, and net total.',
          'Financing Options: shows 3-4 monthly payment examples at different term lengths if financing is available.',
          'Warranty Information: summarizes the Window World lifetime warranty and any available maintenance agreement.',
          'Next Steps: instructions for the customer on what happens after they sign (order placement, lead time, installation scheduling).'
        ],
      },
    ],
  },

  {
    id: 'lib-order-form',
    title: 'Order Form and Production Packet',
    subtitle: 'Understanding the internal order form that goes to the factory',
    category: 'Proposals and Contracts',
    roles: ['sales_rep', 'manager', 'auditor'],
    tags: ['order form', 'production', 'factory', 'packet', 'sketch', 'installer notes'],
    sections: [
      {
        id: 'lib-of-what',
        title: 'What the Order Form Is',
        body: 'The order form is the internal production document that gets submitted to the Window World factory and installation crew. Unlike the customer proposal (which is customer-facing), the order form contains the exact technical specifications needed to manufacture and install the windows: order dimensions, product codes, options, tempered glass flags, mull configurations, installer notes, and a copy of the sketch canvas. This document must be 100% complete before a job can be submitted to production.',
        rules: [
          'Every opening must have an order dimension (not actual measurement) on the order form.',
          'Tempered glass flag must appear on every applicable opening.',
          'Mull/join configurations must be correctly represented.',
          'Installer notes field must document any access issues, special conditions, or HOA requirements.',
          'The sketch image is automatically embedded -- ensure the sketch is complete before generating.'
        ],
        installerNotes: [
          'Installers read the order form the day before the install to plan staging and equipment.',
          'Any unclear or missing information causes a call to the rep for clarification -- delays the job.',
          'Missing mull notation means the installer receives individual frames instead of a mulled assembly.',
          'Access notes (locked gate, aggressive dog, no-access day) prevent wasted trip charges.'
        ],
        checklist: [
          'All openings present on the order form.',
          'Order dimensions are revised/deducted dimensions, not raw measurements.',
          'Tempered glass flagged correctly on all required openings.',
          'Mull units noted with configuration.',
          'Installer notes written in clear, plain language.',
          'Sketch image embedded and shows all markers labeled.',
          'Customer signature appears on the order form.',
          'Contact information complete for installation day questions.'
        ],
      },
    ],
  },

  {
    id: 'lib-contract',
    title: 'Contract Generation and Completion',
    subtitle: 'Creating a legally complete contract that protects the customer and company',
    category: 'Proposals and Contracts',
    roles: ['sales_rep', 'manager'],
    tags: ['contract', 'generate', 'signature', 'legal', 'complete', 'payment terms', 'scope'],
    sections: [
      {
        id: 'lib-ct-generate',
        title: 'Generating the Contract',
        body: 'The contract is generated from the approved quote and proposal data. It is a legally binding document that defines the exact scope, price, and terms of the project. The contract is generated from the Proposal tab after the customer has reviewed and agreed to the proposal. Once generated, the contract locks the quote -- any changes after contract generation require a change order.',
        steps: [
          'Confirm the customer wants to proceed.',
          'Open the Proposal tab.',
          'Tap "Generate Contract."',
          'The contract is created from the current quote data.',
          'The tablet signing mode opens automatically.',
          'Walk the customer through the contract sections.',
          'Have the customer sign and initial in all required locations.',
          'Tap "Complete Signing."',
          'The signed contract is saved and emailed to the customer automatically.'
        ],
        checklist: [
          'Customer name and address are correct on the contract.',
          'All window/door line items appear on the contract.',
          'Pricing total matches the proposal.',
          'Payment terms are selected (cash, check, finance plan).',
          'Down payment amount is entered.',
          'Contract date is today\'s date.',
          'Customer has signed all required signature lines.',
          'Customer has initialed all required initial lines.',
          'Contract copy was sent to the customer\'s email.'
        ],
        chargebackRisks: [
          'Contract generated from a stale quote -- scope or price does not match what was presented.',
          'Missing payment terms -- company cannot collect payment, legal dispute risk.',
          'Missing customer signature -- legally incomplete, cannot enforce contract.',
          'Wrong customer address -- contract is for wrong property, legal dispute risk.'
        ],
      },
      {
        id: 'lib-ct-change-order',
        title: 'Change Orders After Contract Signing',
        body: 'Once a contract is signed, any change to the scope, products, or price requires a change order. Common reasons for change orders: customer calls back to add or remove a window, a condition discovered at installation changes the scope, or a pricing error needs to be corrected. Change orders must be approved by a manager and signed by the customer before the factory can update the order.',
        steps: [
          'Identify what needs to change.',
          'Contact your manager to initiate a change order.',
          'Manager approves the scope change and documents it.',
          'The change order document is generated and sent to the customer.',
          'Customer signs the change order.',
          'The production team receives the updated specifications.'
        ],
        warnings: [
          'Do not make verbal promises of scope changes without a documented change order -- verbal agreements are not enforceable.',
          'Do not edit a submitted job\'s openings without going through the change order process.'
        ],
      },
    ],
  },

  {
    id: 'lib-signing',
    title: 'Document Signing -- Tablet Signing Mode',
    subtitle: 'How to capture customer signatures in the field on your device',
    category: 'Proposals and Contracts',
    roles: ['sales_rep'],
    tags: ['signing', 'signature', 'tablet', 'contract', 'customer', 'digital', 'sign'],
    sections: [
      {
        id: 'lib-sg-overview',
        title: 'How Tablet Signing Mode Works',
        body: 'Tablet Signing Mode presents the full contract in a clean, customer-friendly view on your phone or tablet. The customer reads each section and taps to sign or initial at each required location. All signatures are time-stamped and stored in Supabase. When signing is complete, the system automatically emails the signed contract PDF to the customer\'s email address.',
        steps: [
          'After generating the contract, tablet signing mode opens automatically.',
          'Hand your device to the customer.',
          'The customer scrolls through the contract and reviews each section.',
          'At each signature line, the customer taps the "Sign Here" area.',
          'A signature pad appears -- the customer draws their signature with their finger.',
          'At each initial line, the customer taps and draws their initials.',
          'After all signatures and initials are complete, the customer taps "Complete."',
          'The signed document is saved and emailed to the customer.',
          'You receive a copy in the Proposal tab with the signed status.'
        ],
        checklist: [
          'Customer name at top of contract is correct.',
          'Customer reviews the full scope of work.',
          'All pricing totals are correct before customer signs.',
          'Payment terms are visible and agreed upon.',
          'Customer completes all signature lines.',
          'Customer completes all initial lines.',
          'Customer\'s email is confirmed for the contract copy.',
          'Signing is completed before you leave the home.'
        ],
        tips: [
          'Clean your device screen before handing it to the customer -- a dirty screen makes signing difficult.',
          'If the customer\'s signature does not look right (too small or too scratchy), tap Clear and have them try again.',
          'Do not leave without a fully signed contract -- partial signatures are not legally complete.'
        ],
        warnings: [
          'If the signing fails to save (network error), the signatures may be stored locally and will sync when reconnected. Wait for the sync to complete before leaving.',
          'A contract with missing signatures (missing even one) is flagged as incomplete by the Contract Auditor and will block production.'
        ],
      },
    ],
  },

  // ============================================================
  // FOLLOW-UP
  // ============================================================

  {
    id: 'lib-followup-panel',
    title: 'Follow-Up Panel and Scheduler',
    subtitle: 'How to schedule, manage, and complete customer follow-ups',
    category: 'Follow-Up and Close',
    roles: ['sales_rep'],
    tags: ['follow-up', 'scheduler', 'task', 'callback', 'reminder', 'close', 'overdue'],
    sections: [
      {
        id: 'lib-fu-why',
        title: 'Why Follow-Up Is Not Optional',
        body: 'The Follow-Up Auditor monitors every open quote and flags any job that does not have a scheduled next action. A quote without a follow-up task is a lead going cold. The system requires a Next Action Date before you can leave a quote in "Thinking" or "Pending" status. Industry research shows that most window replacement customers say yes between the 3rd and 5th contact -- reps who stop following up after one call lose those sales.',
        rules: [
          'Every open quote must have a follow-up task scheduled.',
          'A quote with no next action for 7 days is a Level 2 Warning from the Follow-Up Auditor.',
          'A quote with no next action for 14 days is escalated to your manager.',
          'Lost leads must have a lost reason selected before the status is changed to Lost.'
        ],
        tips: [
          'Schedule the follow-up while the customer is still in front of you -- "I will call you Tuesday at 2pm, does that work?"',
          'Confirm the follow-up date with the customer verbally, then enter it in the app.',
          'Even if a customer says "we\'re not interested" -- log the reason and close the follow-up loop properly.'
        ],
      },
      {
        id: 'lib-fu-schedule',
        title: 'Scheduling a Follow-Up',
        body: 'The Follow-Up Scheduler lets you create a task with a date, time, type (call, visit, email, text), and notes. After creating the task, it appears on the Dashboard under your Overdue or Upcoming follow-ups. The Follow-Up Auditor monitors these tasks and surfaces warnings when they are approaching or past due.',
        steps: [
          'From the Appointment Detail page or field app, open the Follow-Up section.',
          'Tap "Schedule Follow-Up."',
          'Select the follow-up type: Phone Call, In-Person Visit, Email, Text Message.',
          'Select the date and time.',
          'Enter notes about what you plan to discuss (e.g., "Address financing question, confirm color choice").',
          'Tap Save.',
          'The task appears in your Dashboard and in the appointment\'s follow-up history.'
        ],
        checklist: [
          'Follow-up type selected.',
          'Date and time selected.',
          'Notes entered explaining the purpose.',
          'Task saved and visible on Dashboard.'
        ],
      },
      {
        id: 'lib-fu-complete',
        title: 'Completing and Logging Follow-Ups',
        body: 'After completing a follow-up (making the call, sending the email, doing the visit), log the outcome in the app. Tap the task and select the result: Reached/Left Voicemail/No Answer/Meeting Done. Enter notes about the outcome. If the customer is still undecided, schedule the next follow-up before closing the task. If they agreed, move the appointment to Sold status.',
        steps: [
          'Open the Dashboard or appointment and find the due follow-up task.',
          'Tap "Log Outcome."',
          'Select the result: Reached, Left Voicemail, No Answer, Email Sent, Meeting Done.',
          'Enter outcome notes.',
          'If another follow-up is needed, schedule it before closing.',
          'Tap Complete to close the task.'
        ],
        tips: [
          'Always log the outcome even if the customer did not answer -- this creates a paper trail.',
          'If you leave a voicemail, note what you said in the outcome notes.',
          'The Follow-Up Auditor tracks follow-up compliance rate by rep -- consistent logging improves your performance metrics.'
        ],
      },
    ],
  },

  // ============================================================
  // FINANCE
  // ============================================================

  {
    id: 'lib-finance-options',
    title: 'Finance Options and Catalog',
    subtitle: 'How to understand, present, and use financing in your sales process',
    category: 'Finance and Commissions',
    roles: ['sales_rep', 'manager'],
    tags: ['finance', 'financing', 'monthly payment', 'lender', 'plan', 'catalog', 'options'],
    sections: [
      {
        id: 'lib-fo-overview',
        title: 'What the Finance Catalog Is',
        body: 'The Finance Options Catalog (/finance-options) contains all available financing plans from the company\'s approved lenders. Each plan shows the lender name, promotional terms (e.g., 12 months same as cash, 5-year fixed rate), interest rate structure, monthly payment calculation, and the credit criteria summary. As a sales rep, you use this catalog to show customers accurate monthly payment estimates on any project total.',
        tips: [
          'Customers who say "I can\'t afford that" are often responding to the total price. Show them a monthly payment instead.',
          '"Would you be comfortable with approximately $X per month?" -- then show the plan that matches.',
          'You do not need to be a finance expert -- the catalog explains each plan in plain language.',
          'Never guarantee credit approval -- financing is subject to lender approval.'
        ],
        warnings: [
          'Do not quote a monthly payment without using the actual plan calculation -- estimates are not binding.',
          'Do not promise a specific interest rate -- rates vary by creditworthiness and lender policy.',
          'If a customer has poor credit history, be transparent: "Approval is subject to lender review."'
        ],
      },
      {
        id: 'lib-fo-present',
        title: 'Presenting Financing to the Customer',
        body: 'When presenting financing, you want to lead with the monthly payment, not the total. Customers emotionally respond to monthly payments more easily than large totals. Show 2-3 plan options that match the project total, and let the customer choose the term that fits their budget.',
        steps: [
          'After reviewing the proposal total, ask: "Would you like to see some financing options?"',
          'Open the Finance Options section in the proposal or the Finance tab.',
          'Show the customer 2-3 plans with monthly payment amounts.',
          'Explain the promotional period if applicable (e.g., "Zero interest for 18 months").',
          'Let the customer select their preferred plan.',
          'The selected plan appears on the proposal and contract.',
          'The customer applies for credit through the lender link or card application (outside the app).'
        ],
        tips: [
          'Present the 18-month or 24-month plan first -- it shows a manageable monthly payment without long commitment.',
          'The 60-month plan has the lowest payment but the highest total cost -- present it if the customer needs the lowest possible monthly amount.',
          'If the customer is paying cash or check, skip the finance tab entirely.'
        ],
      },
    ],
  },

  // ============================================================
  // COMMISSIONS
  // ============================================================

  {
    id: 'lib-commissions',
    title: 'My Money / Commissions',
    subtitle: 'How to read your commission tracking page and understand what you will earn',
    category: 'Finance and Commissions',
    roles: ['sales_rep'],
    tags: ['commissions', 'my money', 'earnings', 'revenue', 'sold', 'paid', 'tracking'],
    sections: [
      {
        id: 'lib-cm-overview',
        title: 'What the Commissions Page Shows',
        body: 'The Commissions page (/commissions) shows your personal sales performance metrics: total revenue sold, expected commission earnings, paid commissions, and pending commissions. It is broken down by appointment and by time period. Use this page to track your earnings, identify which jobs have paid out, and verify commission amounts match what you expected.',
        steps: [
          'Click "My Money" or "Commissions" in the sidebar.',
          'Select the date range (this month, last month, this year, custom).',
          'View the summary tiles: Total Sold, Expected Commission, Paid Commission.',
          'Scroll through the job list to see each individual commission.',
          'Tap any job row to see the commission calculation breakdown.'
        ],
        tips: [
          'Your commission is typically calculated as a percentage of the job net total after discounts.',
          'Jobs in "Submitted" status show as expected commission -- they pay out when the installation is complete.',
          'If a commission amount looks wrong, check whether a discount was applied that you were not expecting.'
        ],
      },
      {
        id: 'lib-cm-calculation',
        title: 'How Commission Is Calculated',
        body: 'Commission is calculated on the net job total after discounts. The commission rate is set by your manager based on your rep tier and any current incentive programs. Standard commission rates and calculation details are shown in the Commission breakdown for each job. If your expected commission does not match what you calculated, review whether a discount was applied that changed the net total.',
        examples: [
          'Job total: $12,000. Discount applied: 5%. Net total: $11,400. Commission rate: 8%. Expected commission: $912.',
          'Job total: $8,500. No discount. Net total: $8,500. Commission rate: 8%. Expected commission: $680.',
          'Job with a manager override discount of 15% net total reduced by $1,275. This reduces your commission base accordingly.'
        ],
        tips: [
          'Large discounts reduce your commission base -- this is another reason to protect pricing.',
          'Commissions on finance jobs typically calculate on the full financed amount minus any dealer fee.',
          'Check with your manager if a commission rate differs from what you expected -- rates may have changed or a special program may apply.'
        ],
      },
    ],
  },

  // ============================================================
  // WARRANTY
  // ============================================================

  {
    id: 'lib-warranty',
    title: 'Warranty and Maintenance Agreement',
    subtitle: 'How to explain the Window World warranty and present the maintenance option',
    category: 'Proposals and Contracts',
    roles: ['sales_rep'],
    tags: ['warranty', 'maintenance', 'lifetime warranty', 'glass breakage', 'agreement'],
    sections: [
      {
        id: 'lib-wa-warranty',
        title: 'Window World Warranty Overview',
        body: 'Window World products carry a comprehensive lifetime limited warranty that covers defects in materials and workmanship on the frame, sash, and glass. The warranty is transferable to new homeowners for a defined period. When presenting to customers, emphasize that the warranty covers them for the life of the product -- this is one of Window World\'s key competitive advantages.',
        tips: [
          'Present the warranty early in the conversation -- it builds confidence before discussing price.',
          '"This window is covered for life -- if anything goes wrong with the frame, sash, or glass seal, Window World will repair or replace it."',
          'The transferable warranty adds value for customers who may sell their home -- it is a selling point.'
        ],
        warnings: [
          'Never promise warranty coverage for damage not covered by the warranty terms (hurricane damage, vandalism, improper customer modifications).',
          'If a customer asks detailed warranty questions, refer them to the official warranty document -- do not guess at coverage details.'
        ],
      },
    ],
  },

];
