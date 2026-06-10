/**
 * manualLibraryPart3.ts
 * Dashboard, Appointments, Quick Quote, Sketch, Field App articles.
 *
 * ENCODING: ASCII only. No emoji literals. No curly quotes. No em/en-dash literals.
 */

import type { ManualChapter } from './manualContent';

export const manualLibraryPart3Chapters: ManualChapter[] = [

  // ============================================================
  // DASHBOARD AND WORKFLOW
  // ============================================================

  {
    id: 'lib-dashboard',
    title: 'The Dashboard -- Your Daily Command Center',
    subtitle: 'What the Today/Dashboard screen shows and how to act on it every morning',
    category: 'Dashboard and Workflow',
    roles: ['sales_rep', 'manager'],
    tags: ['dashboard', 'today', 'pipeline', 'overdue', 'daily workflow', 'home screen'],
    sections: [
      {
        id: 'lib-dash-overview',
        title: 'What the Dashboard Shows',
        body: 'The Dashboard is the first screen you see when you log into the desktop app. It shows a live summary of your sales pipeline: today\'s appointments, new leads, overdue follow-ups, unsigned quotes, open auditor issues, and recent activity. Think of it as your morning briefing -- everything that needs your attention is surfaced here so you do not have to hunt for it across the app.',
        tips: [
          'Start every workday on the Dashboard before doing anything else.',
          'Overdue follow-up count in the top tiles shows how many opportunities are at risk of going cold.',
          'Unsigned quotes older than 7 days are a signal that follow-up is needed urgently.',
          'New leads assigned to you show as a count badge -- contact them within 5 minutes for best conversion.'
        ],
      },
      {
        id: 'lib-dash-tiles',
        title: 'Understanding the Dashboard Tiles',
        body: 'The Dashboard displays key metrics as color-coded tiles. Each tile is a clickable link that takes you directly to the filtered list of records that make up that number. Red tiles indicate urgent issues. Yellow tiles are warnings. Green tiles show healthy metrics.',
        examples: [
          'Today\'s Appointments tile: shows how many appointments are scheduled for today. Click to open appointments filtered to today.',
          'Overdue Follow-Ups tile: shows follow-ups past their due date. Click to see the list and take action.',
          'Unsigned Quotes tile: shows quotes sent to customers that have not been signed. Click to follow up.',
          'Open Issues tile: shows jobs with active auditor flags. Click to see which jobs need attention.'
        ],
        steps: [
          'Open the Dashboard on login.',
          'Read the tile counts -- any red tiles need immediate action.',
          'Click each red tile and work through the records listed.',
          'Click the Overdue Follow-Ups tile and schedule callbacks for each.',
          'Click the New Leads tile and contact each new lead.',
          'After clearing urgent items, proceed to your scheduled appointments.'
        ],
      },
      {
        id: 'lib-dash-pipeline',
        title: 'Pipeline Widget',
        body: 'The pipeline widget shows your current sales funnel: how many jobs are at each status stage (New, Contacted, Quoted, Signed, Submitted, In Production). A healthy pipeline has a steady flow at each stage. If many jobs are stuck in Quoted, your follow-up rate is low. If many jobs are stuck in New, your lead response time is too slow.',
        tips: [
          'A large number of Quoted jobs relative to Signed jobs means follow-up is the bottleneck.',
          'Review your pipeline on Monday morning and plan follow-up calls for every Quoted job.',
          'Jobs in the Submitted or In Production stage are out of your hands -- focus on the stages you can move.'
        ],
      },
    ],
  },

  {
    id: 'lib-appointments-page',
    title: 'Appointments Page',
    subtitle: 'Managing your full list of leads and appointments',
    category: 'Dashboard and Workflow',
    roles: ['sales_rep', 'manager'],
    tags: ['appointments', 'leads', 'list', 'filter', 'status', 'create', 'search'],
    sections: [
      {
        id: 'lib-ap-overview',
        title: 'What the Appointments Page Is',
        body: 'The Appointments page (/appointments) shows all of your leads and appointments in a list or card view. Each card shows the customer name, address, status, appointment date, and any auditor flags. This is your main workspace for managing your book of business. From here you can create new leads, open existing jobs, filter by status, and search by customer name or address.',
        steps: [
          'Click Appointments in the sidebar to open the page.',
          'Use the search bar to find a customer by name or address.',
          'Use the status filter to narrow the list to a specific stage.',
          'Click any appointment card to open the Appointment Detail page.',
          'Click the + New button to create a new lead or appointment.'
        ],
      },
      {
        id: 'lib-ap-statuses',
        title: 'Appointment Status Flow',
        body: 'Every appointment moves through a defined set of statuses as it progresses through the sales and production workflow. Understanding each status helps you and your manager track where jobs stand at a glance.',
        examples: [
          'New: Lead just assigned, no contact made yet.',
          'Contacted: Rep has made first contact. Appointment being scheduled.',
          'Scheduled: Appointment date is set.',
          'In Progress: Rep is on-site or actively measuring.',
          'Quoted: Quote has been presented. Waiting for customer decision.',
          'Sold / Signed: Customer has signed the contract.',
          'Submitted: Job packet submitted to production.',
          'In Production: Windows/doors ordered and in manufacturing.',
          'Installed: Installation complete.',
          'Needs Remeasure: Issues found, rep must return to the home.',
          'Lost: Customer did not proceed.',
          'Archived: Job closed out, no further action needed.'
        ],
        rules: [
          'Never mark a job as Lost without a lost reason selected.',
          'Sold status requires a signed contract in the system.',
          'Submitted status requires all auditor flags resolved.',
          'Needs Remeasure puts the job back in the rep\'s active queue.'
        ],
        chargebackRisks: [
          'Moving a job to Submitted before all auditor flags are resolved can allow an incomplete job packet to reach production.',
          'Marking a job as Lost by mistake cannot always be reversed -- confirm before changing status.'
        ],
      },
      {
        id: 'lib-ap-create',
        title: 'Creating a New Appointment',
        body: 'To create a new lead or appointment, click the + New button on the Appointments page. Enter the customer name, service address, phone number, and email. Select the lead source. Assign to yourself (or to another rep if you are a manager). Set an appointment date if one is scheduled. Save to create the record and begin the workflow.',
        steps: [
          'Click + New on the Appointments page.',
          'Enter customer full name.',
          'Enter service address (use autocomplete for verified addresses).',
          'Enter phone number and email.',
          'Select lead source (e.g., Web Inquiry, Referral, Door Knock, Canvass).',
          'Set appointment date and time if known.',
          'Assign rep (defaults to yourself).',
          'Save -- the appointment card appears in your list.'
        ],
        checklist: [
          'Customer full name entered.',
          'Service address verified (not a PO Box).',
          'Phone number entered.',
          'Email entered.',
          'Lead source selected.',
          'Appointment date set if scheduled.'
        ],
        warnings: [
          'A service address that cannot be geocoded will cause mapping and aerial imagery to fail in Quick Quote.',
          'A missing email means the customer cannot receive contract copies or scheduling notifications.'
        ],
      },
    ],
  },

  {
    id: 'lib-appointment-detail',
    title: 'Appointment Detail Page',
    subtitle: 'The central hub for everything about a single job',
    category: 'Dashboard and Workflow',
    roles: ['sales_rep', 'manager', 'auditor'],
    tags: ['appointment detail', 'job', 'openings', 'customer info', 'tabs', 'workflow'],
    sections: [
      {
        id: 'lib-ad-overview',
        title: 'What the Appointment Detail Page Shows',
        body: 'The Appointment Detail page (/appointments/:id) is the main workspace for a single job. It has multiple tabs: Overview (customer info, notes, status), Openings (all windows/doors/siding), Pricing (quote summary), Proposal (documents), and Review (auditor flags). From this page you can access every part of the job workflow, open the field app, open the sketch canvas, and manage the full lifecycle of the job.',
        steps: [
          'Open from Appointments page by clicking any appointment card.',
          'Review customer info in the Overview tab.',
          'Navigate to Openings tab to see/add/edit all openings.',
          'Navigate to Pricing tab to review the quote.',
          'Navigate to Review tab to see any auditor flags.',
          'Navigate to Proposal tab to generate and view documents.',
          'Click Open in Field App to hand off to mobile device.'
        ],
      },
      {
        id: 'lib-ad-tabs',
        title: 'Tab-by-Tab Guide',
        body: 'Each tab on the Appointment Detail page has a specific purpose. Understanding what lives in each tab prevents confusion and helps you navigate efficiently.',
        examples: [
          'Overview tab: customer name, address, phone, email, appointment notes, status selector, timeline, and assignment.',
          'Openings tab: full list of all windows, doors, and siding items. Each opening card shows type, size, options, and price. Add, edit, or delete openings from here.',
          'Pricing tab: the full quote summary. Line items, totals, option charges, discounts, and finance options. This is where you see the complete price before presenting to the customer.',
          'Review tab: all active auditor flags organized by severity. Required fixes are listed first. Each flag has a Fix button or direct link to the relevant section.',
          'Proposal tab: generated proposal document, order form, contract, and signing status. Generate documents, send to customer, or open signing mode from here.'
        ],
      },
      {
        id: 'lib-ad-field-app',
        title: 'Opening the Field App from Appointment Detail',
        body: 'The Appointment Detail page has an "Open in Field App" button that generates a QR code linking to the mobile field app for this specific appointment. Scan the QR with your phone camera to open the appointment directly in the mobile app. This is the recommended way to hand off from desktop planning to in-home measurement.',
        steps: [
          'Open the Appointment Detail page on the desktop.',
          'Click "Open in Field App" or "Open on Phone" button.',
          'A QR code modal appears.',
          'Scan the QR code with your phone camera.',
          'The field app opens directly to this appointment on your phone.',
          'Proceed with measurement in the field.'
        ],
        tips: [
          'The QR code stays valid as long as you are logged in on both devices.',
          'If you are already on your phone, you can navigate directly to /mobile/field/:id without the QR.',
          'The desktop and mobile app are in sync -- changes made on mobile appear on desktop immediately.'
        ],
      },
    ],
  },

  {
    id: 'lib-customers-page',
    title: 'Customers Page',
    subtitle: 'Managing customer records and contact history',
    category: 'Dashboard and Workflow',
    roles: ['sales_rep', 'manager'],
    tags: ['customers', 'contact', 'history', 'search', 'CRM'],
    sections: [
      {
        id: 'lib-cust-overview',
        title: 'What the Customers Page Does',
        body: 'The Customers page (/customers) gives you a searchable list of all customers in your company\'s CRM. Each customer record shows their name, address, phone, email, and a history of all appointments associated with them. Use the Customers page to look up past jobs, find a returning customer, or check if a lead is already in the system before creating a duplicate.',
        steps: [
          'Click Customers in the sidebar.',
          'Use the search bar to find by name, phone, or address.',
          'Click a customer card to open their detail view.',
          'Customer detail shows all past appointments linked to this customer.',
          'Click any appointment to open it directly.'
        ],
        tips: [
          'Always search the Customers page before creating a new lead -- the customer may already be in the system.',
          'Duplicate customers cause commission disputes and audit issues.',
          'The system auto-deduplicates based on phone and address, but manual checking helps catch edge cases.'
        ],
        chargebackRisks: [
          'Creating a duplicate customer for an existing contact splits their appointment history and may cause commission attribution issues.'
        ],
      },
    ],
  },

  // ============================================================
  // QUICK QUOTE / QUICK ESTIMATE
  // ============================================================

  {
    id: 'lib-quick-quote',
    title: 'Quick Quote / Quick Estimate',
    subtitle: 'Get a ballpark estimate before visiting the home using aerial imagery and AI',
    category: 'Quick Estimate',
    roles: ['sales_rep', 'manager'],
    tags: ['quick quote', 'quick estimate', 'aerial', 'mapbox', 'AI', 'ballpark', 'estimate'],
    sections: [
      {
        id: 'lib-qq-what',
        title: 'What Quick Quote Is',
        body: 'Quick Quote (/quick-quote) lets you generate a rough estimate for a customer before visiting their home. You enter the address, the system pulls aerial and street-level imagery of the property, and an AI assistant counts visible windows to give you a statistical estimate of scope and price. This is useful for giving a customer a ballpark number during a phone call, qualifying a lead before scheduling, or preparing for an appointment by knowing the likely scope in advance.',
        whatToChoose: 'Use Quick Quote when a customer calls asking for a rough price, when you want to prepare before an appointment, or when a manager asks for a ballpark on a large project.',
        whatNotToChoose: 'Do NOT use Quick Quote as a substitute for an in-home measurement. It is an estimate only. The actual appointment measurement is always required for a contract.',
        tips: [
          'Present Quick Quote estimates as ballparks: "Based on the aerial view, this looks like a 10-12 window job in the $X-$Y range -- we would confirm exact pricing when I come out."',
          'Quick Quote is a conversation starter, not a binding quote.',
          'Use it to pre-qualify leads: if the aerial shows only 4 windows and the customer wants a whole-house quote, set that expectation early.'
        ],
      },
      {
        id: 'lib-qq-address',
        title: 'Entering the Address and Loading the Property',
        body: 'Type the full service address in the address field. The system uses geocoding to find the property and load its location in the mapping view. Once the address is verified, aerial imagery loads automatically. If the address cannot be geocoded, you will see an error -- try adding the zip code or spelling out any abbreviations.',
        steps: [
          'Navigate to Quick Quote in the sidebar.',
          'Type the full service address including city, state, and zip.',
          'Wait for the address to geocode and the map to load.',
          'The aerial view of the property appears centered on the address.',
          'If the map does not load, try a different address format or ask the customer to confirm the exact address.'
        ],
        tips: [
          'Full addresses work better than partial addresses -- include house number, street, city, state, and zip.',
          'PO Box addresses will not geocode to a property location.',
          'If the customer is in a new subdivision not yet in the mapping database, the aerial may be blank -- note this and proceed with the in-home visit.'
        ],
      },
      {
        id: 'lib-qq-aerial',
        title: 'Reading Aerial and Property Imagery',
        body: 'The aerial view shows a bird\'s-eye satellite or map view of the property. You can switch between aerial (satellite) and street view to see the home from different angles. Use the aerial view to count elevations, estimate the number of visible windows, and identify the exterior material (brick, siding, stucco). This gives you a head start on understanding the scope before you arrive.',
        steps: [
          'Switch between aerial (top-down) and street view using the view toggle.',
          'Count the visible windows on each side of the house.',
          'Note the exterior material from the aerial and street view.',
          'Estimate the number of stories (affects clear story charges for siding).',
          'Look for any large or specialty windows (picture windows, bays, shape windows).',
          'Note any visible issues: rotten trim, missing caulk, obvious storm damage.'
        ],
        tips: [
          'Aerial imagery may be 1-3 years old -- it does not show recent renovations or additions.',
          'Street view may not be available for all addresses, especially rural properties.',
          'Use aerial imagery as a starting point, not a final measurement tool.'
        ],
      },
      {
        id: 'lib-qq-ai',
        title: 'AI Window Count and Statistical Estimate',
        body: 'When available, the AI assistant analyzes the property imagery to estimate the number of windows visible and provides a statistical estimate of project cost. The AI uses pattern recognition on the aerial image to identify window openings. When AI analysis is unavailable (imagery too low resolution, new construction, etc.), the system falls back to a statistical estimate based on home size and type.',
        examples: [
          'AI estimate: "Based on the aerial view, this appears to be a 2,400 sq ft single-story home with approximately 12 windows visible. Estimated project range: $X,XXX to $X,XXX."',
          'Statistical fallback: "Aerial AI analysis is unavailable for this property. Based on 2,400 sq ft single-story homes in this area, the typical window replacement scope is 10-14 windows. Estimated range: $X,XXX to $X,XXX."'
        ],
        tips: [
          'AI estimates count VISIBLE windows -- interior windows, skylights, and windows on non-visible elevations are missed.',
          'Always tell the customer the estimate is based on aerial imagery and will be confirmed at the appointment.',
          'AI is more accurate on single-story homes with clear aerial visibility than on multi-story homes.'
        ],
        warnings: [
          'Never present an AI estimate as a firm price. Always include a disclaimer.',
          'If the AI count seems wrong (e.g., 4 windows on a 3,000 sq ft home), the imagery may be obstructed by trees. Note this and proceed with the in-home visit.'
        ],
      },
      {
        id: 'lib-qq-convert',
        title: 'Converting Quick Quote to an Appointment',
        body: 'After reviewing the Quick Quote estimate with the customer, you can convert it to a formal appointment directly from the Quick Quote page. This creates an appointment record pre-populated with the customer address and estimated scope, which you can then schedule for an in-home visit.',
        steps: [
          'Review the estimate with the customer.',
          'If they want to proceed, click "Schedule Appointment" or "Convert to Appointment."',
          'Enter the customer name, phone, and email.',
          'Select an appointment date and time.',
          'The appointment is created in your list with the address and estimated scope pre-filled.',
          'Proceed with the standard appointment workflow from there.'
        ],
      },
    ],
  },

  // ============================================================
  // SKETCH CANVAS AND HOUSE OUTLINE
  // ============================================================

  {
    id: 'lib-sketch-overview',
    title: 'Sketch Canvas -- Overview',
    subtitle: 'How to use the house sketch to document every opening before measuring',
    category: 'Sketch and House Outline',
    roles: ['sales_rep', 'auditor'],
    tags: ['sketch', 'canvas', 'house outline', 'elevations', 'markers', 'opening map'],
    sections: [
      {
        id: 'lib-sk-what',
        title: 'What the Sketch Canvas Is',
        body: 'The Sketch Canvas (/appointments/:id/sketch) is a digital house outline tool where you map every window, door, and siding area on the home before and during measurement. It gives the installer and production team a visual floor plan of the job. You place markers on a top-down or elevation view of the house, and each marker is linked to an opening record in the system. The sketch becomes part of the order form and gives the installer a visual guide on installation day.',
        rules: [
          'Every opening in the system must have a corresponding marker on the sketch.',
          'The Measurement Auditor checks that marker count matches opening count.',
          'Missing or unlinked markers trigger a Level 2 Warning.',
          'Mull/joined units must be connected using the Mull/Join tool -- separate markers are not sufficient.'
        ],
        tips: [
          'Open the sketch canvas BEFORE measuring -- sketch the house first, then measure each opening as you go.',
          'Label each marker with the room name (e.g., "LR-1", "Kitchen") so the installer knows exactly where each window goes.',
          'Use the Fit All button to see the full house outline at once.',
          'Save the sketch frequently -- the app auto-saves, but tapping Save ensures your work is not lost.'
        ],
        videos: [
          {
            title: 'How to Measure and Document Windows for Replacement',
            url: 'https://www.youtube.com/watch?v=UA4sn9trVMk',
            attribution: 'YouTube',
            sourceType: 'youtube',
          },
          {
            title: 'Window Replacement Job Layout Tips',
            url: 'https://www.youtube.com/watch?v=7bJvW1RcEeQ',
            attribution: 'YouTube',
            sourceType: 'youtube',
          },
        ],
      },
      {
        id: 'lib-sk-elevations',
        title: 'Setting Up Elevations',
        body: 'The house outline is divided into elevations: Front, Left, Right, Rear, Garage, and Other. Each elevation represents a wall of the home. Before placing any markers, identify which elevation each window is on. This information is critical for the installer -- it tells them which wall to work on first and how to sequence the installation.',
        steps: [
          'Open the Sketch Canvas from the Appointment Detail page.',
          'Look at the house outline -- it shows a top-down view of the structure.',
          'Identify which part of the outline corresponds to the Front, Left, Right, and Rear walls.',
          'Tap on an elevation label to select it before placing markers for that wall.',
          'Place all markers for the front wall on the Front elevation, then move to each subsequent elevation.',
          'Use the Garage elevation for any windows on the garage wall.',
          'Use the Other elevation for outbuildings, sunrooms, or non-standard additions.'
        ],
        tips: [
          'Walk around the outside of the home first to confirm which wall is Front, Left, Right, and Rear before opening the sketch.',
          'Front is typically the street-facing wall -- confirm with the customer if the home is a corner lot.',
          'For townhomes or attached homes, note which walls are exterior (can have windows) vs. shared (cannot).'
        ],
      },
      {
        id: 'lib-sk-markers',
        title: 'Placing Window, Door, and Siding Markers',
        body: 'Each opening on the sketch is represented by a marker -- a visual symbol on the house outline. There are three marker types: window markers (rectangle symbols), door markers (arc symbols), and siding markers (area fills). Tap on an elevation to place a marker. After placing, tap the marker to link it to an opening record or create a new opening from the marker.',
        steps: [
          'Select the marker type: window, door, or siding.',
          'Tap on the elevation where the opening is located.',
          'A marker appears at the tap point.',
          'Drag to position the marker accurately on the wall.',
          'Tap the marker to open its detail sheet.',
          'Link the marker to an existing opening or create a new opening.',
          'Enter the opening ID (room label) so the marker is labeled.',
          'Repeat for every opening on every elevation.'
        ],
        checklist: [
          'Every window has a marker on the correct elevation.',
          'Every door has a marker on the correct elevation.',
          'Every siding area is marked on the correct elevation.',
          'Every marker is labeled with the room/location.',
          'Marker count matches opening count in the measurement list.',
          'Mull/joined units are connected with the mull tool, not placed as separate markers.'
        ],
        warnings: [
          'A marker that is not linked to an opening will show as "No Opening" and trigger an auditor warning.',
          'An opening that has no marker will trigger an auditor warning and may block the order form from generating.',
          'Do not place a marker on the wrong elevation -- the installer uses the sketch to navigate the home.'
        ],
        chargebackRisks: [
          'Marker placed on wrong elevation -- installer installs on wrong wall.',
          'Two openings linked to the same marker -- duplicate opening in production packet.',
          'Mull units not connected -- factory manufactures individual units instead of mulled assembly.'
        ],
      },
      {
        id: 'lib-sk-mull',
        title: 'Mull and Join Workflow',
        body: 'When two or more window units are joined side-by-side in a single opening (mulled units), you must connect their markers using the Mull/Join tool. This tells the factory to manufacture the units as a joined assembly. Placing two separate window markers next to each other without using the Mull tool will result in two individually framed windows instead of one mulled assembly -- a chargeback and installation problem.',
        steps: [
          'Place individual markers for each unit in the mulled assembly.',
          'Select both markers by tapping and holding the first, then tapping the second.',
          'Tap the Mull/Join tool in the toolbar.',
          'The markers are connected with a visual link showing they are a joined unit.',
          'Open the marker detail to confirm the mull configuration (horizontal vs. vertical).',
          'Enter total opening width and each individual unit width.'
        ],
        chargebackRisks: [
          'Mulled unit not connected -- factory ships individual windows, installers cannot join them properly.',
          'Wrong mull orientation -- horizontal mull noted when it should be vertical, or vice versa.',
          'Individual unit widths do not add up to total opening width -- manufacturing error.'
        ],
        warnings: [
          'The Measurement Auditor specifically checks for mulled units that are not properly joined in the sketch.',
          'If you are unsure whether a unit is mulled or separate, photograph the existing installation and ask your manager.'
        ],
      },
      {
        id: 'lib-sk-export',
        title: 'Sketch Export and Order Form',
        body: 'When you generate the order form or proposal, the sketch canvas image is automatically embedded as a visual reference. The installer receives the sketch with the order form so they can see exactly where each window goes before arriving at the home. A clean, complete sketch with correctly labeled markers is one of the most useful things you can provide to the installation crew.',
        tips: [
          'Before finalizing the sketch, use the Fit All button to zoom out and verify all markers are placed and labeled.',
          'The sketch image is included in the generated PDF order form automatically -- no action needed.',
          'If you made changes to the sketch after generating documents, regenerate the documents to update the sketch image.'
        ],
        installerNotes: [
          'Installer uses the sketch to plan their installation sequence.',
          'Labeled markers help installers stage materials at the correct location before starting.',
          'A sketch with missing or unlabeled markers requires the installer to call the rep for clarification -- delays the job.'
        ],
      },
    ],
  },

  // ============================================================
  // FIELD APP
  // ============================================================

  {
    id: 'lib-mobile-home',
    title: 'Field App Home Screen',
    subtitle: 'The mobile app home -- today\'s appointments, navigation, and quick access',
    category: 'Field App Workflow',
    roles: ['sales_rep'],
    tags: ['mobile', 'field app', 'home screen', 'appointments', 'phone', 'tablet'],
    sections: [
      {
        id: 'lib-mh-overview',
        title: 'What the Field App Home Screen Shows',
        body: 'The Field App Home screen (/mobile) is the starting point on your phone or tablet. It shows a card-based list of today\'s appointments, upcoming appointments, and recent activity. Tap any appointment card to open the full field workflow for that job. The home screen also has quick access to the navigation button (drives to customer address), the call button (calls customer), and the text button (texts customer).',
        steps: [
          'Open the field app on your phone at /mobile.',
          'The home screen shows today\'s appointment cards.',
          'Swipe left on an appointment card to reveal action buttons (Call, Text, Navigate).',
          'Tap a card to open the full field workflow for that appointment.',
          'Scroll down to see upcoming appointments beyond today.',
          'Tap the + button to create a new appointment from the field if needed.'
        ],
        tips: [
          'If you do not see today\'s appointments, pull down to refresh the list.',
          'The app works offline -- appointments cached during your last sync are available without internet.',
          'If an appointment is missing, check that it was assigned to you and that the date is correct on the desktop.'
        ],
      },
      {
        id: 'lib-mh-actions',
        title: 'Call, Text, and Navigate Actions',
        body: 'Each appointment card has three action buttons: Call (dials the customer\'s phone), Text (opens a pre-filled SMS to the customer), and Navigate (opens Apple Maps or Google Maps with the customer address). Use these to communicate and navigate directly from the app without switching to your contacts.',
        steps: [
          'Swipe left on the appointment card to reveal action buttons.',
          'Tap Call to dial the customer immediately.',
          'Tap Text to open SMS with a pre-filled message.',
          'Tap Navigate to open your phone\'s map app with the address loaded.',
          'Return to the field app after navigating -- your progress is saved.'
        ],
        tips: [
          'Use the Text button to send a "On my way, ETA 10 minutes" message to the customer before arriving.',
          'The Navigate button uses your phone\'s default maps app -- set this to Google Maps or Waze in your phone settings if preferred.'
        ],
      },
    ],
  },

  {
    id: 'lib-field-app-workflow',
    title: 'Field App Workflow -- The 6 Steps',
    subtitle: 'Walking through every tab of the mobile field app from Customer to Close',
    category: 'Field App Workflow',
    roles: ['sales_rep'],
    tags: ['field app', 'workflow', 'tabs', 'customer', 'measure', 'quote', 'proposal', 'close', 'mobile'],
    sections: [
      {
        id: 'lib-fw-overview',
        title: 'The Field App Workflow Structure',
        body: 'When you open an appointment in the field app (/mobile/field/:id), you see a tab-based workflow with 6 steps: Customer, Measure, Quote, Product, Review, and Proposal. Each tab must be completed in order. The bottom navigation bar shows your current step and completion status. A green checkmark on a tab means it is complete. A yellow dot means it is in progress. A red flag means there is an issue that must be resolved.',
        steps: [
          'Open the appointment from the home screen.',
          'Start at the Customer tab -- verify and complete customer information.',
          'Move to the Measure tab -- enter measurements for each opening.',
          'Move to the Quote tab -- review pricing and options.',
          'Move to the Product tab -- confirm all product selections.',
          'Move to the Review tab -- resolve any auditor flags.',
          'Move to the Proposal tab -- generate and present the proposal or contract.'
        ],
        tips: [
          'Complete each tab before moving to the next -- skipping steps creates auditor flags.',
          'You can go back and edit any tab at any time.',
          'The field app auto-saves -- there is no manual save button for individual fields.',
          'If you lose internet connection, the app works offline and syncs when you reconnect.'
        ],
      },
      {
        id: 'lib-fw-customer',
        title: 'Step 1 -- Customer Tab',
        body: 'The Customer tab is where you verify and complete the customer\'s contact information. Confirm the customer\'s full name, service address, phone number, and email. Add any notes about the customer\'s needs or the property. Confirm HOA requirements if applicable. The Customer tab is also where you review any prior notes from past appointments.',
        checklist: [
          'Customer full name confirmed.',
          'Service address verified.',
          'Phone number confirmed -- test-dial if uncertain.',
          'Email address confirmed.',
          'Customer notes entered (what they are interested in, any concerns).',
          'HOA noted if applicable.',
          'Prior appointment history reviewed if this is a returning customer.'
        ],
      },
      {
        id: 'lib-fw-measure',
        title: 'Step 2 -- Measure Tab',
        body: 'The Measure tab is where you enter all opening measurements and capture photos. Add each opening (window, door, or siding) and enter its measurements, exterior surface, and required options. Take inside and outside photos for each opening. Flag any tempered glass requirements. This is the most critical step -- accuracy here prevents chargebacks.',
        checklist: [
          'Every opening added (no openings missed).',
          'Width and height entered for every opening.',
          'Room/location label entered for every opening.',
          'Exterior surface type selected for every opening.',
          'Interior photo taken for every opening.',
          'Exterior photo taken for every opening.',
          'Tempered glass field completed for every bathroom, floor-level, and door-adjacent opening.',
          'Oriel top sash measured separately if applicable.',
          'Return depth noted for brick openings.',
          'Any rot or damage photographed and noted.'
        ],
        warnings: [
          'Never leave the home without completing the Measure tab -- you cannot take photos remotely.',
          'Measurement Auditor will block the job if photos are missing.',
          'If you discover rot or unusual conditions, photograph and note them before deciding the installation scope.'
        ],
      },
      {
        id: 'lib-fw-quote',
        title: 'Step 3 -- Quote Tab',
        body: 'The Quote tab shows the automatically calculated pricing based on your measurements and product selections. Review each line item to confirm all charges are present and correct. Look for any $0 charges on selected options -- this indicates a missing pricing rule. The total at the bottom is what you will present to the customer.',
        steps: [
          'Open the Quote tab after completing measurements.',
          'Review each window/door/siding line item.',
          'Verify that all selected options (grids, screens, tempered, energy package) have non-zero charges.',
          'Check for any clear story charges if siding wall heights are over 12 feet.',
          'Verify the total looks reasonable for the job scope.',
          'If any charge shows $0, do not submit -- contact manager.'
        ],
        chargebackRisks: [
          '$0 tempered charge -- tempered glass not included in pricing, wrong glass ships.',
          '$0 grid charge -- grid selected but not priced, wrong product ships.',
          'Missing clear story charge -- labor underpriced for high-wall siding job.'
        ],
      },
      {
        id: 'lib-fw-product',
        title: 'Step 4 -- Product Tab',
        body: 'The Product tab is where you confirm all product options and customize the order for the customer. Select glass packages, grid styles, screen types, colors (interior and exterior), and any special options. Every product decision made here feeds directly into the order form and the contract. An incomplete Product tab blocks submission.',
        checklist: [
          'Glass package selected for all applicable openings.',
          'Grid style and pattern selected (or No Grid confirmed) for all openings.',
          'Screen type selected for all openings (No Screen on picture windows).',
          'Interior color selected.',
          'Exterior color selected.',
          'Hardware color selected for doors.',
          'Siding series and profile selected for siding jobs.',
          'Any special options (obscure glass, foam, header flashing) selected.'
        ],
      },
      {
        id: 'lib-fw-review',
        title: 'Step 5 -- Review Tab',
        body: 'The Review tab shows all active auditor flags for the job. Required fixes must be resolved before you can generate a proposal or contract. Recommended improvements are optional but encouraged. Each flag has a description of the issue and a Fix button or link that takes you directly to the relevant section. Work through all required fixes before moving to the Proposal tab.',
        steps: [
          'Open the Review tab.',
          'Read each flag -- note whether it is Required, Recommended, or Informational.',
          'Tap the Fix button on each Required flag.',
          'Resolve the issue (enter missing data, take missing photo, correct the field).',
          'Return to the Review tab to confirm the flag is cleared.',
          'Repeat until all Required flags are cleared.',
          'Move to the Proposal tab once all Required flags are resolved.'
        ],
        tips: [
          'Required flags with a red indicator block the proposal and contract.',
          'If you cannot resolve a flag in the field, take a photo and note it -- escalate to manager.',
          'Some flags auto-clear when you fix the underlying issue -- others require manual dismissal.'
        ],
        warnings: [
          'Do not try to bypass a Required flag by moving to another tab -- the system will bring you back.',
          'A Required flag that you cannot fix should be escalated to your manager before you leave the home.'
        ],
      },
      {
        id: 'lib-fw-proposal',
        title: 'Step 6 -- Proposal Tab',
        body: 'The Proposal tab is the final step where you generate the proposal document, present it to the customer, and if they agree, generate the contract for signature. The proposal shows a summary of all openings, options, pricing, and financing options. If the customer signs, the digital contract is captured and sent to their email automatically.',
        steps: [
          'Open the Proposal tab after all Required flags are cleared.',
          'Tap "Generate Proposal" to create the document.',
          'Review the proposal before presenting.',
          'Present the proposal to the customer -- walk through pricing, options, and financing.',
          'If they agree, tap "Generate Contract."',
          'The contract opens in tablet signing mode.',
          'Customer reviews and signs on the device.',
          'The signed contract is saved and emailed to the customer.'
        ],
        checklist: [
          'All required flags cleared.',
          'Proposal generated and reviewed.',
          'Pricing and options confirmed with customer.',
          'Contract generated.',
          'Customer signature captured.',
          'Customer email confirmed for contract copy.',
          'Follow-up scheduled (if not signing today).'
        ],
      },
    ],
  },

  {
    id: 'lib-qr-handoff',
    title: 'QR Sync and Mobile Handoff',
    subtitle: 'How to move seamlessly between desktop and phone for a single appointment',
    category: 'Field App Workflow',
    roles: ['sales_rep'],
    tags: ['QR', 'sync', 'mobile', 'handoff', 'phone', 'tablet', 'cross-device'],
    sections: [
      {
        id: 'lib-qr-what',
        title: 'What QR Sync Is',
        body: 'QR Sync is a feature that lets you open a specific appointment on your phone or tablet by scanning a QR code displayed on the desktop app. This eliminates the need to search for the appointment on your phone or type in a long URL. It is the fastest and most reliable way to hand off from your office desktop to your phone before leaving for an appointment.',
        steps: [
          'On the desktop, open the Appointment Detail page for the appointment.',
          'Click the "Open on Phone" or "QR Sync" button.',
          'A QR code appears in a modal dialog.',
          'Open your phone camera app.',
          'Point the camera at the QR code on the desktop screen.',
          'The phone automatically opens the field app to that specific appointment.',
          'You are now ready to measure in the field -- the appointment is pre-loaded.'
        ],
        tips: [
          'Make sure both your phone and desktop are connected to the same account (same login).',
          'The QR code expires if you log out -- generate it fresh before each appointment.',
          'You do not need to be on the same wifi network -- the QR opens a URL that works over any internet connection.'
        ],
      },
      {
        id: 'lib-qr-sync',
        title: 'Data Sync Between Desktop and Phone',
        body: 'All data entered in the field app on your phone syncs to the desktop app in real time when you have an internet connection. If you go offline during measurement, the app stores your data locally and syncs when you reconnect. You can resume from the desktop after measuring on your phone without any data transfer steps.',
        tips: [
          'After finishing an in-home measurement, wait for the sync indicator to show green before closing the app.',
          'If sync fails, the app stores your data safely -- reconnect to any network and the sync completes automatically.',
          'Do not force-close the app while a sync is in progress -- wait for it to complete.'
        ],
        warnings: [
          'Clearing the app cache or force-closing during a sync may lose unsaved measurements.',
          'If you see a sync error, do not re-enter measurements -- try reconnecting first, then tap Retry Sync.'
        ],
      },
    ],
  },

  {
    id: 'lib-pre-visit',
    title: 'Pre-Visit Intelligence',
    subtitle: 'How to prepare for an appointment before leaving the office',
    category: 'Field App Workflow',
    roles: ['sales_rep'],
    tags: ['pre-visit', 'preparation', 'appointment prep', 'property research'],
    sections: [
      {
        id: 'lib-pv-overview',
        title: 'What Pre-Visit Intelligence Is',
        body: 'The Pre-Visit page (/pre-visit) gives you a summary of everything relevant to an upcoming appointment before you leave the office. It shows the customer\'s contact info, prior appointment history if they are a returning customer, a quick aerial image of the property, estimated scope from Quick Quote if run, notes from the scheduling team, and any lead source details. Use this page to prepare talking points, confirm the address, and set expectations for the visit.',
        steps: [
          'Navigate to Pre-Visit in the sidebar.',
          'Select the upcoming appointment from the list.',
          'Review the customer information and confirm contact details.',
          'Review the aerial imagery to estimate scope.',
          'Read any existing notes from prior contacts.',
          'Note any special conditions: HOA, access issues, prior complaints.',
          'Prepare your product samples and materials accordingly.',
          'Set your navigation to the address before leaving.'
        ],
        tips: [
          'If the customer has called in before, prior call notes appear here -- read them.',
          'If the aerial shows a complex roof line or hidden rear elevation, plan extra time.',
          'Use the Quick Quote estimate from Pre-Visit to set a rough budget range with the customer early in the conversation.'
        ],
      },
    ],
  },

];
