/**
 * manualLibraryPart6.ts
 * Manager Dashboard, Auditor Guide, Admin tools, Troubleshooting, Glossary.
 *
 * ENCODING: ASCII only. No emoji literals. No curly quotes. No em/en-dash literals.
 */

import type { ManualChapter } from './manualContent';

export const manualLibraryPart6Chapters: ManualChapter[] = [

  // ============================================================
  // MANAGER TOOLS
  // ============================================================

  {
    id: 'lib-manager-dashboard',
    title: 'Manager Dashboard Guide',
    subtitle: 'How managers use the dashboard to monitor rep performance and pipeline health',
    category: 'Manager and Auditor Tools',
    roles: ['manager', 'admin'],
    tags: ['manager', 'dashboard', 'rep performance', 'pipeline', 'metrics', 'overview'],
    sections: [
      {
        id: 'lib-md-overview',
        title: 'What the Manager Dashboard Shows',
        body: 'The Manager Dashboard (/manager-dashboard) gives sales managers a real-time overview of team performance, pipeline health, and outstanding issues. It aggregates data across all reps and shows: total revenue by rep, conversion rates, open auditor issues by severity, overdue follow-ups, jobs blocked from production, and recent activity. Managers use this daily to identify coaching opportunities and business risks.',
        steps: [
          'Open the Manager Dashboard from the sidebar (admin/manager access only).',
          'Review the team revenue summary: total sold this month vs. last month vs. goal.',
          'Review the rep performance tiles: each rep\'s conversion rate, close rate, and open issues.',
          'Click any rep tile to drill into that rep\'s performance details.',
          'Review the Blocked from Production section -- any job here needs immediate attention.',
          'Review the Overdue Follow-Ups section -- assign coaching if multiple reps are behind.',
          'Review the Open Auditor Issues by Severity -- Level 3 and 4 issues need manager resolution.'
        ],
        tips: [
          'Sort the rep performance table by Open Issues to find reps who need the most support.',
          'Sort by Conversion Rate to identify training opportunities for reps with low close rates.',
          'A spike in missing-photo flags often means a new rep needs field coaching on the photo process.',
          'Set a daily habit of reviewing the Manager Dashboard first thing in the morning.'
        ],
      },
      {
        id: 'lib-md-rep-coaching',
        title: 'Using Metrics for Rep Coaching',
        body: 'The Manager Dashboard surfaces specific performance metrics that reveal coaching opportunities. Instead of vague feedback ("you need to close more"), use the data to give reps specific, actionable guidance.',
        examples: [
          'Rep A has 12 jobs in Quoted status with no follow-up tasks. Coaching: follow-up process and urgency.',
          'Rep B has 5 blocked-from-production jobs due to missing photos. Coaching: in-home photo capture routine.',
          'Rep C has a 15% discount rate vs the team average of 8%. Coaching: pricing presentation and objection handling.',
          'Rep D has 3 jobs with Contract Auditor flags (missing signatures). Coaching: tablet signing mode and contract completion.'
        ],
        tips: [
          'Use the data to identify patterns, not to micromanage individuals.',
          'Share specific metrics with reps during weekly 1-on-1s -- it makes coaching concrete.',
          'Track improvement over 30-day periods -- one bad week is noise, a trend is a problem.'
        ],
      },
    ],
  },

  {
    id: 'lib-office-queue',
    title: 'Office Queue Guide',
    subtitle: 'Reviewing and approving jobs before they go to production',
    category: 'Manager and Auditor Tools',
    roles: ['manager', 'auditor', 'admin'],
    tags: ['office queue', 'review', 'approval', 'production', 'submit', 'admin review'],
    sections: [
      {
        id: 'lib-oq-overview',
        title: 'What the Office Queue Is',
        body: 'The Office Queue (/office) is the final review station for jobs that have been submitted by the sales rep and are waiting for manager/auditor approval before going to production. Jobs appear in the queue when the rep marks them as Submitted. The office reviews the job packet for completeness, verifies auditor flags are resolved, approves pricing, and then releases the job to production.',
        steps: [
          'Open Office Queue from the sidebar.',
          'The queue shows all jobs submitted by reps pending review.',
          'Click a job to open the full review view.',
          'Review the job packet: customer info, all openings, measurements, photos, pricing.',
          'Check the auditor flag summary -- all Required flags must be resolved.',
          'If the job is complete: click Approve and Release to Production.',
          'If issues are found: click Return to Rep with notes explaining what needs to be corrected.',
          'The rep receives a notification and the job status changes to Needs Correction.'
        ],
        checklist: [
          'All openings present and complete.',
          'All measurements have order dimensions (not raw).',
          'All tempered glass requirements documented.',
          'All photos present (interior and exterior for each opening).',
          'Pricing reviewed -- no $0 charges on selected options.',
          'Contract is signed.',
          'Payment terms complete.',
          'Installer notes written.',
          'No Level 3 or Level 4 auditor flags active.',
          'Sketch is complete and markers match opening count.'
        ],
      },
      {
        id: 'lib-oq-return',
        title: 'Returning a Job to the Rep',
        body: 'If a job in the Office Queue has issues that prevent production, return it to the rep with specific, actionable notes. Vague returns waste time. Be specific about what is missing and where to find it in the app.',
        examples: [
          'Good: "Opening 4 (Kitchen) is missing the exterior photo. Please photograph the exterior and resubmit."',
          'Bad: "Some photos are missing."',
          'Good: "Tempered glass is not answered on Opening 7 (Master Bath). The shower is visible in the exterior photo -- this likely requires tempered glass. Please confirm and resubmit."',
          'Bad: "Check tempered glass."'
        ],
        tips: [
          'Specific return notes reduce the back-and-forth and get jobs to production faster.',
          'If a job has multiple issues, list them all in the return note -- do not return it twice for separate issues.',
          'For Level 4 Business Risk issues, escalate to the GM/owner before returning the job.'
        ],
      },
    ],
  },

  // ============================================================
  // ADMIN TOOLS
  // ============================================================

  {
    id: 'lib-pricing-admin',
    title: 'Pricing Admin Guide',
    subtitle: 'Managing the product catalog, pricing tiers, and pricing rules',
    category: 'Admin and Pricing',
    roles: ['admin', 'manager'],
    tags: ['pricing admin', 'catalog', 'product', 'pricing rules', 'add product', 'pricing tier'],
    sections: [
      {
        id: 'lib-pa-overview',
        title: 'What Pricing Admin Manages',
        body: 'The Pricing Admin page (/pricing) is the control panel for all product pricing in the system. Admins use it to add new products, update prices, set pricing tiers by united inches, and manage option charges (tempered, grids, screens, etc.). Changes made here affect every rep\'s quote calculation immediately. Incorrect pricing configurations are the root cause of $0 charges in quotes.',
        steps: [
          'Open Pricing Admin from the sidebar (admin access only).',
          'Browse the product list: windows, doors, siding, options.',
          'To add a new product: click "Add Product," enter product code, description, and base price.',
          'To update a price: click the product row and edit the price or pricing table.',
          'To add an option charge (e.g., tempered glass): click "Add Option Rule," select the option type, and enter the per-unit charge.',
          'Save changes -- updates apply to new quote calculations immediately.',
          'Existing quotes do not automatically recalculate after a pricing change.'
        ],
        warnings: [
          'Price changes take effect immediately for all new quotes -- double-check before saving.',
          'A missing option rule is the #1 cause of $0 charges appearing in rep quotes.',
          'Do not delete a product that is currently used in active quotes -- it will break those quotes.'
        ],
      },
      {
        id: 'lib-pa-missing-rule',
        title: 'What to Do When a Rep Reports a $0 Charge',
        body: 'When a rep reports that a selected option (tempered glass, grids, energy package, etc.) is showing $0 on their quote, this means the pricing rule for that option is missing from the catalog. This is a Pricing Admin task, not a rep error.',
        steps: [
          'Ask the rep what option is showing $0 and on what product type.',
          'Open Pricing Admin.',
          'Search for the product type (e.g., Double Hung).',
          'Check the option rules for that product -- look for the missing option.',
          'Click "Add Option Rule."',
          'Select the option type (e.g., Tempered Glass -- Full).',
          'Enter the per-unit charge amount.',
          'Save.',
          'Notify the rep to refresh the quote -- the charge should now appear.'
        ],
        rules: [
          'Every selectable option must have a pricing rule, or it will show $0.',
          'Option rules are per product type -- adding a tempered rule for DH windows does not apply to patio doors.',
          'After adding a rule, the rep must trigger a quote recalculation (open and save the opening) to see the updated charge.'
        ],
      },
    ],
  },

  {
    id: 'lib-pricing-import',
    title: 'Pricing Import Guide',
    subtitle: 'Importing pricing from a CSV file to update the catalog in bulk',
    category: 'Admin and Pricing',
    roles: ['admin'],
    tags: ['pricing import', 'CSV', 'bulk update', 'upload', 'catalog update'],
    sections: [
      {
        id: 'lib-pi-overview',
        title: 'When to Use Pricing Import',
        body: 'The Pricing Import page (/pricing-import) allows an admin to upload a CSV file containing product pricing updates. Use this when Window World provides an annual price list update, when adding a large number of new products, or when migrating pricing from another system. The import validates each row and shows any errors before applying changes.',
        steps: [
          'Prepare a CSV file with the required columns: product_code, product_name, base_price, and any option columns.',
          'Open Pricing Import from the sidebar.',
          'Upload the CSV file.',
          'The system validates each row and shows a preview with any errors highlighted.',
          'Review the preview -- correct any errors in the source CSV and re-upload if needed.',
          'When the preview shows no errors, click "Apply Import."',
          'Prices are updated in the catalog immediately.'
        ],
        warnings: [
          'Import replaces existing prices for matching product codes -- verify the CSV before applying.',
          'Product codes must match exactly -- a typo in the code creates a new product instead of updating the existing one.',
          'Back up the current pricing catalog before a large import by exporting it first.'
        ],
      },
    ],
  },

  {
    id: 'lib-rule-engine',
    title: 'Rule Engine Admin Guide',
    subtitle: 'Managing automatic pricing rules, discount caps, and auto-charges',
    category: 'Admin and Pricing',
    roles: ['admin'],
    tags: ['rule engine', 'auto-charge', 'discount cap', 'pricing rules', 'clear story', 'rules'],
    sections: [
      {
        id: 'lib-re-overview',
        title: 'What the Rule Engine Does',
        body: 'The Rule Engine Admin (/rules) manages the business logic that runs automatically when quotes are calculated. Rules control things like: when clear story charges apply, what the maximum allowed discount is before a manager override is required, and when specialty upcharges trigger. Rules run silently in the background -- reps do not see the rule logic, only the results in the quote.',
        examples: [
          'Clear Story Rule: if siding wall height > 12 feet, add $225 base + $75 per additional foot.',
          'Discount Cap Rule: if discount > 10%, require manager PIN. If discount > 15%, flag for GM review.',
          'Shape Window Rule: if window type is Shape (arch, circle, trapezoid), add $X specialty charge.',
          'Large Pane Rule: if united inches > 120, add a large glass handling charge.'
        ],
        steps: [
          'Open Rule Engine Admin from the sidebar.',
          'Browse the existing rules.',
          'To add a rule: click "Add Rule," select the rule type, configure the condition and charge.',
          'To modify a rule: click the rule row, edit the condition or amount, save.',
          'To disable a rule: toggle it to inactive (it remains but does not fire).',
          'Test rules by running a sample quote after changes.'
        ],
        warnings: [
          'Disabling the discount cap rule removes the guardrail on rep discounts -- do not disable without GM approval.',
          'Rule changes apply immediately to all new quotes -- test thoroughly before saving.',
          'If a rule fires incorrectly (charges where it should not), review the condition logic -- a typo in the condition formula can cause broad impact.'
        ],
      },
    ],
  },

  {
    id: 'lib-measurement-rules-admin',
    title: 'Measurement Rules Admin Guide',
    subtitle: 'Managing Cush Measure, brick deduction, and other measurement computation rules',
    category: 'Admin and Pricing',
    roles: ['admin'],
    tags: ['measurement rules', 'cush measure', 'brick rule', 'deduction', 'admin', 'calculation'],
    sections: [
      {
        id: 'lib-mra-overview',
        title: 'What Measurement Rules Admin Manages',
        body: 'The Measurement Rules Admin page (/measurement-rules) is where admins configure the calculation rules for converting raw field measurements into order dimensions. This includes the Cush Measure deduction (typically 3/4" total on each dimension for wood frame insert), the brick rule deduction (1/2" per side = 1" total), and any other surface-specific deduction rules. Changing these rules affects how all future measurements are converted -- it does not change already-submitted orders.',
        steps: [
          'Open Measurement Rules Admin from the sidebar.',
          'View the list of active deduction rules by surface type.',
          'Click a rule to see its configuration.',
          'To modify: edit the deduction value (in fractional inches) and save.',
          'To add a new surface type rule: click "Add Rule" and configure.',
          'Notify all reps of rule changes -- they affect quote generation.'
        ],
        rules: [
          'Cush Measure (wood/siding surface): standard is 3/8" per side = 3/4" total deduction from both width and height.',
          'Brick rule: standard is 1/2" per side = 1" total deduction from both width and height.',
          'These rules are set by the company -- do not change without GM approval and coordination with the factory.'
        ],
        warnings: [
          'Changing the Cush Measure deduction affects ALL future window sizing -- even a 1/8" change ripples across hundreds of orders.',
          'Coordinate any deduction rule change with the factory to ensure it aligns with their manufacturing tolerances.'
        ],
      },
    ],
  },

  {
    id: 'lib-roles-permissions',
    title: 'User Roles and Permissions',
    subtitle: 'What each role can see and do in the system',
    category: 'Admin and Pricing',
    roles: ['admin', 'manager'],
    tags: ['roles', 'permissions', 'access', 'sales_rep', 'manager', 'admin', 'RLS'],
    sections: [
      {
        id: 'lib-rp-overview',
        title: 'The Three Roles',
        body: 'The system has three primary roles: Sales Rep, Manager, and Admin. Each role has different access to data, features, and administrative functions. Role assignment is managed by the Admin and cannot be changed by reps or managers.',
        examples: [
          'Sales Rep: can view and edit their own appointments, openings, quotes, and proposals. Cannot see other reps\' jobs unless assigned. Cannot access Pricing Admin, Rule Engine, or Manager Dashboard.',
          'Manager: all Sales Rep access, plus Manager Dashboard, Office Queue, ManagerReviewPanel, and the ability to approve discounts and override certain auditor flags. Cannot change pricing or measurement rules.',
          'Admin: full access to all features including Pricing Admin, Pricing Import, Rule Engine, Measurement Rules Admin, User Management, and Finance Options Admin. Can see all reps\' data.'
        ],
        rules: [
          'Row-level security (RLS) enforces that reps can only see their own company\'s data.',
          'Cross-company data access is blocked at the database level -- no rep or manager can see another company\'s records.',
          'Role escalation (rep to manager, or manager to admin) requires an Admin to make the change.'
        ],
      },
    ],
  },

  // ============================================================
  // TROUBLESHOOTING
  // ============================================================

  {
    id: 'lib-troubleshooting',
    title: 'Troubleshooting Guide',
    subtitle: 'Fixing common app errors, sync issues, and performance problems',
    category: 'Troubleshooting',
    roles: ['sales_rep', 'manager', 'admin'],
    tags: ['troubleshooting', 'error', 'sync', 'offline', 'update', 'login', 'PWA', 'reset'],
    sections: [
      {
        id: 'lib-tr-sync',
        title: 'Sync Issues -- Data Not Appearing',
        body: 'If data entered on your phone is not showing up on the desktop (or vice versa), the most common causes are: lost internet connection during sync, app session expired, or a stale cached version of the app. Try these steps in order before escalating.',
        steps: [
          'Check your internet connection -- mobile data or wifi must be active.',
          'Pull down to refresh the list (pull down gesture on the appointments list).',
          'If data still does not appear, log out and log back in.',
          'If the problem persists on the mobile app, navigate to /update in your phone browser to force a PWA cache clear.',
          'After the cache clears, log in again and check if data appears.',
          'If the issue continues, note the specific appointment and contact your manager or IT support.'
        ],
        tips: [
          'The /update page is the emergency cache reset -- it unregisters the service worker and clears all cached files.',
          'After a cache reset, the app downloads fresh data on the next login.',
          'Data entered offline is stored locally and syncs when you reconnect -- it is NOT lost.'
        ],
      },
      {
        id: 'lib-tr-photos',
        title: 'Photo Upload Failures',
        body: 'If a photo fails to upload or appears as a broken image, it is usually a network issue during the upload, a file size problem, or a storage permission issue. Try these steps.',
        steps: [
          'Check your internet connection.',
          'Try capturing the photo again from within the app (do not use your phone\'s camera app separately).',
          'If the photo is very large (over 10MB), it may time out on slow connections -- retry on a stronger signal.',
          'If photos consistently fail, log out and log back in to refresh the storage token.',
          'If the problem continues on multiple photos, report to your manager -- there may be a Supabase storage issue.'
        ],
        warnings: [
          'Do not leave the home without confirming photos are uploaded -- the upload indicator shows status.',
          'If offline during photo capture, photos are queued locally and upload when you reconnect. Wait for the queue to clear before leaving.'
        ],
      },
      {
        id: 'lib-tr-login',
        title: 'Login Issues',
        body: 'If you cannot log in, common causes are: wrong email or password, expired session, or account deactivated. Steps to resolve.',
        steps: [
          'Verify you are using the correct email and password.',
          'Try the "Forgot Password" link to reset your password.',
          'If you see "Account not found," contact your admin -- your account may not be created yet.',
          'If you see "Access denied," your account may have been deactivated. Contact your manager.',
          'If login works on desktop but not on phone, try /update on your phone to clear cached credentials.'
        ],
      },
      {
        id: 'lib-tr-pwa',
        title: 'PWA Update and Stuck on Old Version',
        body: 'If the app appears stuck on an old version (a feature you know exists is missing, or the app looks different than expected), the Progressive Web App (PWA) may be serving a cached version. The /update URL forces a full cache reset.',
        steps: [
          'On your phone, open Safari (iOS) or Chrome (Android).',
          'Type the app URL followed by /update (e.g., https://yourapp.com/update).',
          'The screen briefly shows "Clearing cache and updating..."',
          'The app redirects to /mobile automatically.',
          'Log in -- you now have the fresh version.'
        ],
        tips: [
          'Bookmark /update on your phone for easy access when the app feels stale.',
          'If you installed the PWA as a home screen shortcut and it is stuck, use /update in Safari/Chrome, not the shortcut.'
        ],
      },
    ],
  },

  // ============================================================
  // GLOSSARY
  // ============================================================

  {
    id: 'lib-glossary',
    title: 'Glossary',
    subtitle: 'Definitions of every technical term used in this app and in window sales',
    category: 'Glossary',
    roles: ['sales_rep', 'manager', 'auditor', 'admin'],
    tags: ['glossary', 'terms', 'definitions', 'DH', 'SH', 'cush measure', 'united inches', 'handing', 'tempered'],
    sections: [
      {
        id: 'lib-gl-window-types',
        title: 'Window Type Codes',
        body: 'The app and order forms use standard Window World product codes for window types.',
        examples: [
          'DH = Double Hung: both sashes (top and bottom) are operable.',
          'SH = Single Hung: only the bottom sash is operable. Top is fixed.',
          'SL = Slider/Glider: sashes slide horizontally.',
          'PIC = Picture Window: fixed, non-opening. No screen available.',
          'CAS = Casement: hinged on one side, cranks open outward.',
          'AWN = Awning: hinged at the top, opens outward from the bottom.',
          'BAY = Bay Window: three-unit composite projecting outward. Requires manager review.',
          'BOW = Bow Window: curved multi-unit composite projecting outward.',
          'OR = Oriel: top sash has a different height fraction than the bottom (e.g., 1/3 top, 2/3 bottom).',
          'CT = Cottage: similar to DH but top sash is shorter than the bottom sash (not an oriel fraction).',
          'EY = Eyebrow: curved or semi-circular specialty shape.',
          'HR = Half Round: semicircular specialty window.',
          'TRAP = Trapezoid: four-sided specialty with non-parallel top and bottom.',
          'Shape = Any custom geometric specialty shape requiring a template.'
        ],
      },
      {
        id: 'lib-gl-measurements',
        title: 'Measurement Terms',
        body: 'Key measurement terminology used in the field and in the app.',
        examples: [
          'Actual Measurement: the raw measurement taken from the existing opening in the field.',
          'Order Dimension / Revised Dimension: the actual measurement minus the appropriate deduction (Cush Measure or brick rule). This is what you enter into the app.',
          'Cush Measure: the standard deduction for insert replacement in a wood or siding frame. Typically 3/4" total from both width and height (3/8" per side).',
          'Brick Rule: the deduction for openings in a brick exterior. Typically 1" total from both width and height (1/2" per side).',
          'United Inches (UI): width + height in inches. Used to determine the pricing tier. A 36x48 window = 84 UI.',
          'Return Depth: the distance from the face of the brick to the inner edge of the jamb. Important for sizing the window in a brick opening.',
          'Top Sash (Oriel): the upper portion of an oriel window. Its height is calculated as a fraction of the total window height (e.g., 1/3, 1/4, 1/2).',
          'Clear Story: a wall height that requires scaffolding or a lift because it is above reachable height from ground (typically over 12 feet). Triggers an automatic surcharge.'
        ],
      },
      {
        id: 'lib-gl-door-terms',
        title: 'Door Terms',
        body: 'Key door terminology used in measurement and ordering.',
        examples: [
          'Handing: which side the hinges are on, determined from OUTSIDE the door facing inward.',
          'LHI: Left Hand Inswing -- hinges on your left from outside, door swings into the home.',
          'LHO: Left Hand Outswing -- hinges on your left from outside, door swings outward.',
          'RHI: Right Hand Inswing -- hinges on your right from outside, door swings into the home.',
          'RHO: Right Hand Outswing -- hinges on your right from outside, door swings outward.',
          'Inswing: the door swings into the interior of the home when opened.',
          'Outswing: the door swings to the exterior (onto the porch or outside) when opened.',
          'OX: patio door panel configuration. Reading left-to-right from inside: O = operating panel, X = fixed panel. Left panel slides.',
          'XO: patio door panel configuration. Reading left-to-right from inside: X = fixed panel, O = operating panel. Right panel slides.',
          'Sidelight: a narrow fixed or operable window panel beside an entry door.',
          'Transom: a horizontal window above a door.',
          'Pre-hung door: a complete assembly including the door slab, frame, hinges, and weatherstripping -- cannot be re-handed after manufacture.'
        ],
      },
      {
        id: 'lib-gl-glass-terms',
        title: 'Glass and Option Terms',
        body: 'Key glass and option terminology used in product selection.',
        examples: [
          'Tempered Glass: safety-rated glass that, when broken, shatters into small rounded pieces instead of sharp shards. Required by IRC R308.4 in specific locations.',
          'Obscure Glass: glass with a textured or frosted surface that diffuses light and provides privacy. Common in bathrooms.',
          'Flat Grid: a grid profile installed between the glass panes. Profile is flat/thin.',
          'Contoured Grid: a grid profile installed between the glass panes. Profile has a raised, sculpted shape that gives more visual depth.',
          'SDL (Simulated Divided Light): individual glass panes separated by actual spacers on the face of the glass, replicating traditional divided-light windows. Most authentic look.',
          'Colonial Pattern: grid divided into equal rectangular sections (e.g., 2x3, 3x3).',
          'Prairie Pattern: grid with a large clear center pane and a border of small glass sections.',
          'Diamond Pattern: grid rotated 45 degrees, creating a diamond or cross-hatch pattern.',
          'Argon Gas: an inert gas filling the sealed airspace between panes. Improves insulation value (R-value) compared to air-filled units.',
          'Low-E Coating: a microscopic metallic coating on the glass that reflects infrared heat. Reduces heat gain in summer and heat loss in winter.',
          'Energy Package: the combination of argon gas and Low-E coating sold as a single upgrade.',
          'Foam Fill: expanding foam injected into the window frame cavity for additional thermal and acoustic insulation.',
          'IRC R308.4: the section of the International Residential Code that specifies where safety glazing (tempered glass) is required.'
        ],
      },
      {
        id: 'lib-gl-app-terms',
        title: 'App and System Terms',
        body: 'Key terms used in the app UI, auditor system, and documentation.',
        examples: [
          'Auditor: an automated quality check that monitors specific types of data for compliance, completeness, and accuracy.',
          'Flag: an auditor-generated issue that appears in the Validation Panel.',
          'Level 1 -- Minor: small data quality issue, workflow continues.',
          'Level 2 -- Warning: meaningful issue, rep should correct. Usually not blocking.',
          'Level 3 -- Critical: serious issue that blocks submission. Requires resolution.',
          'Level 4 -- Business Risk: high-risk issue. Blocks production, escalated to manager/admin.',
          'Chargeback: a cost incurred when a product must be returned, remade, or reinstalled due to an error. Typically impacts the responsible rep\'s commission or performance record.',
          'Insert Replacement: installing a new window unit inside the existing frame without removing the frame. Most common residential replacement.',
          'Full Frame Replacement: removing the entire frame and installing a new unit and frame. Used when the frame is rotten or the opening size needs to change.',
          'Cush Measure: see Measurement Terms above.',
          'United Inches (UI): see Measurement Terms above.',
          'PWA: Progressive Web App. The mobile/tablet version of the app that can be installed as a home screen shortcut and works partially offline.',
          'QR Sync: the feature that generates a QR code on the desktop allowing the same appointment to be opened instantly on a mobile device.',
          'Mull/Join: linking two or more adjacent window units so they are manufactured and installed as a single assembly.',
          'Production Packet: the complete set of documents (order form, signed contract, sketch, photos) submitted to the factory and installation crew.',
          'RLS: Row-Level Security. The Supabase database policy that ensures each company\'s data is isolated from other companies.'
        ],
      },
    ],
  },

];
