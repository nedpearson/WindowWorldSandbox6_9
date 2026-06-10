/**
 * manualLibrary.ts -- Part 1
 * Getting Started, Window Types, and Measurement articles.
 *
 * ENCODING: ASCII only. No emoji literals. No curly quotes. No em/en-dash literals.
 * Use straight quotes and plain ASCII dashes only.
 */

import type { ManualChapter } from './manualContent';

export const manualLibraryPart1Chapters: ManualChapter[] = [

  // ============================================================
  // GETTING STARTED
  // ============================================================

  {
    id: 'lib-perfect-appointment',
    title: 'How to Run a Perfect Appointment',
    subtitle: 'The step-by-step flow every rep should follow on every visit',
    category: 'Getting Started',
    roles: ['sales_rep', 'manager'],
    tags: ['appointment', 'workflow', 'checklist', 'getting started'],
    sections: [
      {
        id: 'lib-pa-overview',
        title: 'What Makes a Perfect Appointment',
        body: 'A perfect appointment is one where you leave with a signed contract, all measurements recorded, all photos taken, all product choices confirmed, and the customer feeling confident and informed. The goal is not just to sell -- it is to gather everything production needs so the job ships correctly the first time. Reps who run structured appointments have fewer chargebacks, higher close rates, and better reviews.',
        tips: [
          'Arrive 5 minutes early. Customers notice.',
          'Confirm the appointment by text 1 hour before you arrive.',
          'Always have a printed quote sheet as a backup in case your phone dies.',
          'Measure every window even if you think you know the size -- assumptions cause chargebacks.'
        ],
      },
      {
        id: 'lib-pa-phase1',
        title: 'Phase 1: Greeting and Needs Discovery (10-15 min)',
        body: 'Start by introducing yourself and asking open-ended questions: "What made you reach out about windows?" and "Which rooms are most important to you?" Listen before you pitch. Tour the home with the customer. Let them show you the problem windows. Identify any special conditions: brick exterior, low windows near floors, bathroom windows, large panes, or doors. Document customer notes in the app before measuring.',
        steps: [
          'Greet customer, introduce yourself and your role.',
          'Ask what prompted the call or inquiry.',
          'Tour the home -- let the customer lead.',
          'Identify every window, door, or siding area to be quoted.',
          'Note any visible conditions: rot, brick, low windows, bathrooms.',
          'Open the field app and create or find the appointment.'
        ],
      },
      {
        id: 'lib-pa-phase2',
        title: 'Phase 2: Measuring and Data Entry (15-30 min)',
        body: 'Measure every opening. Width first, then height. Record in the app as you go -- never write on paper and transfer later. Enter the room/location label for every window. Photograph every window from inside and outside before you leave. Pay special attention to oriel windows, bathroom windows, and any window within 18 inches of the floor, 60 inches of water, or 36 inches of a stairway.',
        steps: [
          'Measure width x height for each opening.',
          'Enter each window in the app with room label and type.',
          'Select exterior surface condition for each window.',
          'Take inside photo and outside photo for each window.',
          'Flag any tempered glass locations in the app.',
          'Note any mulled or joined windows separately.'
        ],
        checklist: [
          'Every window has width and height entered.',
          'Every window has a room/location label.',
          'Every window has inside and outside photo.',
          'Tempered locations are flagged.',
          'Oriel top sash measurement taken if applicable.',
          'Return depth measured for brick openings.'
        ],
      },
      {
        id: 'lib-pa-phase3',
        title: 'Phase 3: Product Selection and Quote (10-15 min)',
        body: 'Walk the customer through product options: glass package (Low-E/Argon), grid style if desired, color (interior/exterior), screen choice, and any door or siding options. Build the quote in the app. Show the customer a summary. Explain what is included and what is not. Confirm financing options if applicable.',
        steps: [
          'Confirm window line (product series).',
          'Select glass package -- standard or energy upgrade.',
          'Ask about grids: flat, contoured, no grids.',
          'Select screen type for each window.',
          'Choose interior and exterior color.',
          'Review quote total with customer.',
          'Present financing options if price is a concern.'
        ],
        tips: [
          'Always present the energy package -- most customers take it when explained correctly.',
          'Do not skip grids -- ask directly: "Would you like grids or clear glass?"',
          'If customer wants different options per window, note it clearly on each line.'
        ],
      },
      {
        id: 'lib-pa-phase4',
        title: 'Phase 4: Contract and Close',
        body: 'If the customer is ready, complete the contract in the app. Confirm their full name, address, phone, and email. Review the contract together line by line. Obtain signature. If they are not ready, schedule a follow-up before you leave -- do not leave without a specific next step.',
        steps: [
          'Confirm customer contact information.',
          'Review contract line items together.',
          'Confirm total price and payment terms.',
          'Obtain customer signature.',
          'Provide customer with copy (email or print).',
          'If not signing today, schedule specific follow-up time.'
        ],
        warnings: [
          'Never leave without a follow-up scheduled if they do not sign.',
          'Never submit a contract without a signature.',
          'Never leave without confirming the customer has your contact information.'
        ],
      },
    ],
  },

  {
    id: 'lib-required-photos',
    title: 'Required Photos for Every Job',
    subtitle: 'What to photograph, why it matters, and how it protects you',
    category: 'Getting Started',
    roles: ['sales_rep', 'auditor'],
    tags: ['photos', 'checklist', 'documentation', 'required'],
    sections: [
      {
        id: 'lib-photos-why',
        title: 'Why Photos Are Required',
        body: 'Photos protect the rep, the company, and the customer. If a dispute arises about what was ordered, the pre-installation photos show exactly what was in place before we touched anything. Photos also allow the production team to verify the opening, check for conditions that affect installation, and catch measurement errors before the product is manufactured. Missing photos are a Level 2 auditor warning and can block job submission.',
        warnings: [
          'Missing required photos will trigger an auditor warning and may block submission.',
          'Do not delete photos from the app -- they are part of the job record.',
          'Blurry or unclear photos may be flagged and require a return visit.'
        ],
      },
      {
        id: 'lib-photos-exterior',
        title: 'Exterior Photos Required',
        body: 'For every window or door, take a clear exterior photo that shows the full opening in context with the surrounding wall. The photo should be close enough to see the existing trim and frame, but wide enough to show the exterior material (brick, siding, wood). Take one elevation photo per wall showing all windows on that side of the house. For siding jobs, take a full photo of each elevation being replaced.',
        checklist: [
          'Full exterior shot of each window opening (close up).',
          'Elevation shot showing all windows per wall (wide shot).',
          'Photo of existing trim/J-channel condition.',
          'Photo of any visible rot, damage, or special conditions.',
          'Photo of brick reveal with tape measure if applicable.',
          'Photo of return depth measurement for brick openings.'
        ],
      },
      {
        id: 'lib-photos-interior',
        title: 'Interior Photos Required',
        body: 'Take an interior photo of each window from inside the room showing the full window and its surrounding wall. For oriel windows, photograph the sash split line clearly. For windows near floors or water sources, photograph the proximity so the tempered glass requirement is documented.',
        checklist: [
          'Interior shot of each window showing full frame and surrounding wall.',
          'Close-up of oriel sash split line if applicable.',
          'Photo showing window proximity to water source (bathrooms).',
          'Photo showing window proximity to floor (within 18 inches).',
          'Photo of interior trim condition.',
          'Photo of any special interior conditions (stool, stool cap, blinds, etc.)'
        ],
      },
      {
        id: 'lib-photos-tips',
        title: 'Photo Quality and Organization Tips',
        body: 'Take photos in good lighting -- open blinds and turn on lights. Label photos in the app immediately after taking them, while you remember which window they belong to. If you are photographing multiple similar windows, photograph the room sign or a notecard with the room name in the first photo to help with identification later.',
        tips: [
          'Clean your phone camera lens before the appointment.',
          'Turn off HDR if photos are coming out blurry or overexposed.',
          'If a photo is blurry, retake it immediately -- you cannot retake it after you leave.',
          'Use the app photo attachment feature to tie photos directly to each window record.',
          'Take more photos than you think you need -- extras cost nothing.'
        ],
      },
    ],
  },

  {
    id: 'lib-customer-info',
    title: 'Customer Information Checklist',
    subtitle: 'What information must be collected and why it matters',
    category: 'Getting Started',
    roles: ['sales_rep'],
    tags: ['customer', 'information', 'checklist', 'contract'],
    sections: [
      {
        id: 'lib-ci-required',
        title: 'Required Customer Information',
        body: 'Every contract requires a complete customer record. Missing information causes delays in scheduling, problems with financing, and issues with permit applications. Collect all information before you start measuring so it is entered when you build the quote.',
        checklist: [
          'Full legal name of homeowner (as it appears on deed).',
          'Service address (where windows are installed -- may differ from mailing).',
          'Mailing/billing address if different from service address.',
          'Primary phone number.',
          'Secondary phone number if available.',
          'Email address (for contract copy, scheduling, and follow-up).',
          'Best time to reach customer.',
          'Name of spouse or co-owner if applicable.',
          'HOA or permit requirements if customer mentions them.'
        ],
        warnings: [
          'A contract without a valid phone and email cannot be processed for scheduling.',
          'If the service address is different from billing, note both clearly.',
          'If the customer is renting, note that -- we typically require homeowner signature.'
        ],
        chargebackRisks: [
          'Wrong service address causes delivery to wrong location.',
          'Missing email means customer cannot receive contract copy or scheduling notifications.'
        ],
      },
      {
        id: 'lib-ci-hoa',
        title: 'HOA and Permit Considerations',
        body: 'Some neighborhoods have homeowner association (HOA) rules about exterior changes including window color, grid pattern, and whether windows must match the neighborhood standard. Ask the customer directly: "Does your neighborhood have an HOA?" If yes, note it and advise the customer to check approval requirements before signing. Some municipalities require permits for replacement windows -- verify with your manager if local permit requirements apply.',
        tips: [
          'Ask about HOA before presenting color options -- some HOAs only allow specific exterior colors.',
          'Document HOA approval status in the customer notes field.',
          'Never promise a permit approval -- permits are the homeowner\'s responsibility.'
        ],
      },
    ],
  },

  // ============================================================
  // WINDOW TYPES
  // ============================================================

  {
    id: 'lib-double-hung',
    title: 'Double Hung Windows',
    subtitle: 'The most common replacement window type -- upper and lower sash both move',
    category: 'Window Types',
    roles: ['sales_rep', 'auditor'],
    tags: ['double hung', 'window type', 'sash', 'tilt'],
    sections: [
      {
        id: 'lib-dh-what',
        title: 'What a Double Hung Window Is',
        body: 'A double hung window has two sashes -- a top (upper) sash and a bottom (lower) sash -- that both slide vertically. Either sash can be opened. Most modern double hung windows tilt inward for easy cleaning without ladders. This is the most common replacement window type in residential homes and is the default choice for most standard openings.',
        whatToChoose: 'Customer has an existing double hung, single hung, or basic vertical sliding window. Opening is a standard rectangular shape with a typical width-to-height ratio. Customer wants tilt-in cleaning capability.',
        whatNotToChoose: 'Opening is horizontal (wider than tall -- use a slider instead). Opening is fixed/no ventilation needed (use picture window). Customer wants a crank-out window (use casement or awning).',
        videos: [
          {
            title: 'How Double Hung Windows Work',
            url: 'https://www.youtube.com/watch?v=vErWyPJQ974',
            attribution: 'This Old House / YouTube',
            sourceType: 'youtube',
          },
          {
            title: 'Double Hung vs Single Hung Windows Explained',
            url: 'https://www.youtube.com/watch?v=5NfeEDleM_o',
            attribution: 'YouTube',
            sourceType: 'youtube',
          },
        ],
      },
      {
        id: 'lib-dh-measure',
        title: 'Measuring a Double Hung Window',
        body: 'Measure the existing rough opening width and height inside the existing frame. For an insert replacement (standard), measure the width at three points (top, middle, bottom) and use the smallest measurement. Measure the height at three points (left, middle, right) and use the smallest measurement. Record actual measurements in the app -- the system applies the cush measure deduction to calculate the order size.',
        steps: [
          'Measure width at top of opening.',
          'Measure width at middle of opening.',
          'Measure width at bottom of opening.',
          'Record the smallest of the three width measurements.',
          'Measure height at left side.',
          'Measure height at center.',
          'Measure height at right side.',
          'Record the smallest of the three height measurements.',
          'Enter actual measurements in the app.'
        ],
        examples: [
          'Actual width: 27-3/4", 27-1/2", 27-5/8" -- use 27-1/2" as the smallest.',
          'Actual height: 53-1/4", 53-3/8", 53-1/4" -- use 53-1/4" as the smallest.',
          'Order size after deduction: 27" x 52-3/4" (example with cush measure applied).'
        ],
        chargebackRisks: [
          'Using the largest measurement instead of smallest causes window to be too big and not fit.',
          'Measuring to the outside brick mold instead of inside the frame.',
          'Transposing width and height (entering height as width).'
        ],
      },
      {
        id: 'lib-dh-photos',
        title: 'Required Photos for Double Hung Windows',
        body: 'Take a full interior photo showing the window open and closed. A closed photo helps verify the frame is square and in good condition. An open-sash photo shows whether tilt function is operating and gives the installer information about stop condition. Take the exterior shot showing the full window in context with surrounding trim.',
        checklist: [
          'Interior photo -- window closed, showing full frame.',
          'Interior photo -- lower sash open to show interior stop and parting bead.',
          'Exterior photo -- full window showing trim and surrounding wall.',
          'Close-up of any visible damage, rot, or unusual frame conditions.',
          'Tape measure in frame if return depth is relevant.'
        ],
      },
      {
        id: 'lib-dh-options',
        title: 'Common Options for Double Hung Windows',
        body: 'Double hung windows support a full range of options: glass package (standard, Low-E, or energy upgrade), grids (flat, contoured, or none), half or full screens, and interior/exterior color. Confirm each option with the customer and record it in the app before building the quote.',
        checklist: [
          'Glass package selected (standard or energy upgrade).',
          'Grid style confirmed (flat, contoured, none) and pattern if grids selected.',
          'Screen type selected (half screen standard, full screen upgrade, no screen).',
          'Interior color confirmed.',
          'Exterior color confirmed.',
          'Hardware color confirmed if applicable.'
        ],
      },
    ],
  },

  {
    id: 'lib-single-hung',
    title: 'Single Hung Windows',
    subtitle: 'Lower sash moves, upper sash is fixed',
    category: 'Window Types',
    roles: ['sales_rep'],
    tags: ['single hung', 'window type', 'fixed upper sash'],
    sections: [
      {
        id: 'lib-sh-what',
        title: 'What a Single Hung Window Is',
        body: 'A single hung window looks identical to a double hung from the outside, but only the lower sash moves. The upper sash is permanently fixed. Single hung windows are less common in new replacement projects but are sometimes specified for cost savings or when the customer does not need the upper sash to open. They are frequently found in older homes as the original window type.',
        whatToChoose: 'Customer specifically requests single hung for cost savings. Replacement of existing single hung where upper opening is not needed. Some builders specify single hung for certain applications.',
        whatNotToChoose: 'Customer has a double hung and expects both sashes to move after replacement. Opening is a 2-over-2 design where both sash movements are expected. Always confirm with the customer which they want.',
        tips: [
          'If the customer does not specifically ask for single hung, default to double hung.',
          'Some product lines price single hung and double hung identically -- verify with your pricing sheet.'
        ],
        chargebackRisks: [
          'Ordering single hung when customer expected double hung -- upper sash will not open, customer complaints likely.',
          'Not noting single hung explicitly on contract -- production may default to double hung.'
        ],
      },
    ],
  },

  {
    id: 'lib-slider',
    title: 'Slider Windows',
    subtitle: 'Horizontal sliding sash -- wider than tall',
    category: 'Window Types',
    roles: ['sales_rep'],
    tags: ['slider', 'sliding window', 'horizontal', 'window type'],
    sections: [
      {
        id: 'lib-sl-what',
        title: 'What a Slider Window Is',
        body: 'A slider window opens horizontally -- one or both sashes slide to the left or right rather than up and down. Sliders are typically used in openings that are wider than they are tall: wide bathroom windows, horizontal ranch-style openings, and windows over counters or sinks. The sashes can be "X-O" (left sash moves) or "O-X" (right sash moves) or "X-X" (both sashes move). Some sliders have a fixed center sash: X-O-X.',
        whatToChoose: 'Opening is horizontal -- wider than it is tall. Existing window is a horizontal slider. Opening is in a bathroom, kitchen, or utility area where a horizontal orientation is standard.',
        whatNotToChoose: 'Opening is taller than it is wide -- use double hung. Opening is large and customer wants maximum view -- consider picture window with operational sidelites.',
        examples: [
          'Ranch home bedroom: 48" wide x 36" tall -- good slider candidate.',
          'Bathroom over tub: 36" wide x 24" tall -- good slider candidate.',
          'Living room feature window: 60" wide x 54" tall -- may be better as picture with operator.'
        ],
        chargebackRisks: [
          'Ordering X-O when customer needed O-X because of furniture placement -- sash opens against a wall.',
          'Measuring a slider at three points and entering the wrong dimension as width vs height.'
        ],
      },
      {
        id: 'lib-sl-measure',
        title: 'Measuring a Slider',
        body: 'Measure width x height same as a double hung -- take three width measurements (top, middle, bottom) and use the smallest, take three height measurements (left, center, right) and use the smallest. The wider measurement is always width for a slider. Confirm the sash configuration: which side opens.',
        tips: [
          'Ask the customer which side they prefer to open before entering the configuration.',
          'Note in the app which sash is movable: "left sash opens" or "right sash opens".'
        ],
      },
    ],
  },

  {
    id: 'lib-picture-window',
    title: 'Picture Windows',
    subtitle: 'Fixed glass -- no ventilation, maximum view',
    category: 'Window Types',
    roles: ['sales_rep', 'auditor'],
    tags: ['picture window', 'fixed', 'large pane', 'no screen', 'tempered'],
    sections: [
      {
        id: 'lib-pw-what',
        title: 'What a Picture Window Is',
        body: 'A picture window is a single large pane of fixed (non-opening) glass. It provides maximum light and view but offers no ventilation. Because it does not open, it does not have a screen by default. Picture windows are common as center units in bay windows, as large feature windows in living rooms, and in any location where maximum view is the priority and ventilation is handled by adjacent windows.',
        whatToChoose: 'Opening is large and customer wants an unobstructed view. Existing window is a fixed picture window. Customer does not need ventilation at that specific location.',
        whatNotToChoose: 'Customer needs ventilation -- use casement or double hung instead. Opening is small -- a picture window in a small space is wasteful and costly. Customer wants to open the window.',
      },
      {
        id: 'lib-pw-screen',
        title: 'Picture Window Screen Rule',
        body: 'Picture windows do NOT receive a screen by default because the glass is fixed and does not open. There is no ventilation opening for a screen to cover. If you add a screen to a picture window order in error, the screen will arrive but will serve no purpose and cannot be properly mounted. This is a chargeback-risk item that auditors flag.',
        whatToChoose: 'Leave screen selection as "No Screen" for all fixed picture windows.',
        whatNotToChoose: 'Do NOT select any screen option for a pure fixed picture window unless the customer is adding an operational unit alongside it that needs a screen.',
        chargebackRisks: [
          'Ordering a screen for a fixed picture window -- screen arrives, cannot be installed, customer confused.',
          'Ordering "half screen" for a picture window -- same problem, wasted product.'
        ],
        warnings: [
          'Auditors will flag screen selected on a picture window as a Level 2 warning.',
          'If you are not sure whether the window is fixed or operational, photograph it and check with your manager.'
        ],
      },
      {
        id: 'lib-pw-tempered',
        title: 'Large Pane Safety Review for Picture Windows',
        body: 'Picture windows with a total area greater than 9 square feet may require tempered glass depending on their location (IRC R308.4). A single pane over 9 square feet near a walking surface (within 18 inches of floor), near a door (within 24 inches), or in a stairway (within 36 inches) requires tempered glass. Always flag large picture windows for manager/auditor review when they are near any of these conditions.',
        rules: [
          'IRC R308.4: glazing in hazardous locations must be safety glazing (tempered).',
          'Any glazing within 18 inches of the floor in a walking area requires tempered.',
          'Any single pane over 9 sq ft near a walking surface requires safety review.'
        ],
        checklist: [
          'Measure distance from bottom of glass to finished floor.',
          'If under 18 inches, flag as tempered required.',
          'Check if window is within 24 inches of a door edge.',
          'Check if window is within 36 inches of a stairway.',
          'If any condition applies, select tempered glass in the app.'
        ],
        chargebackRisks: [
          'Missing tempered flag on large picture window near floor -- fails code, must be reordered.',
          'Installing non-tempered large pane in hazardous location -- liability and code violation.'
        ],
      },
      {
        id: 'lib-pw-measure',
        title: 'Measuring a Picture Window',
        body: 'Measure width x height same as any other window -- use three-point measurements and take the smallest. For very large picture windows (over 60 inches wide or tall), take extra care to measure accurately at all three points as large openings are more likely to be out of square. Note the glass size area calculation in the app for any large pane safety review.',
        examples: [
          '48" wide x 60" tall = 20 sq ft -- triggers large pane safety review.',
          '36" wide x 36" tall = 9 sq ft -- right at the threshold, check location carefully.',
          '24" wide x 48" tall = 8 sq ft -- under threshold, no automatic review needed.'
        ],
      },
    ],
  },

  {
    id: 'lib-casement',
    title: 'Casement Windows',
    subtitle: 'Crank-out window that opens like a door',
    category: 'Window Types',
    roles: ['sales_rep'],
    tags: ['casement', 'crank', 'hinge', 'outswing', 'window type'],
    sections: [
      {
        id: 'lib-cas-what',
        title: 'What a Casement Window Is',
        body: 'A casement window is hinged on one side (left or right) and opens outward using a crank mechanism at the bottom of the frame. It swings outward like a door. Casements provide excellent ventilation because the entire glass area can be opened. They are common in kitchens (over sinks), bathrooms, and any location where an outswinging window is preferred over a sliding one. The screen on a casement is on the inside of the frame.',
        whatToChoose: 'Customer has an existing casement. Opening calls for maximum ventilation. Kitchen sink location -- casements are easy to open without reaching far. Opening is taller than wide with a narrow width.',
        whatNotToChoose: 'Opening is wider than tall -- use a slider. Outside of window will be obstructed by deck, porch, or plant material that a swinging sash would hit. Customer wants both sashes to open (see double hung).',
        tips: [
          'Ask about exterior obstructions -- a casement cannot open if a bush or deck railing is in the swing path.',
          'Note which side the hinge is on: left-hinged or right-hinged.',
          'Casement screens are interior -- note this for the customer so they do not expect an exterior screen.'
        ],
        chargebackRisks: [
          'Wrong hinge side -- left-hinged when customer needed right-hinged (cranks wrong direction).',
          'Casement ordered for a location with exterior obstruction in swing path.',
          'Interior screen ordered as exterior screen.'
        ],
        videos: [
          {
            title: 'Casement Windows Explained',
            url: 'https://www.youtube.com/watch?v=flCpUvmnS74',
            attribution: 'YouTube',
            sourceType: 'youtube',
          },
        ],
      },
    ],
  },

  {
    id: 'lib-awning',
    title: 'Awning Windows',
    subtitle: 'Top-hinged window that opens outward at the bottom',
    category: 'Window Types',
    roles: ['sales_rep'],
    tags: ['awning', 'crank', 'top hinge', 'window type'],
    sections: [
      {
        id: 'lib-aw-what',
        title: 'What an Awning Window Is',
        body: 'An awning window is hinged at the top and opens outward at the bottom, creating an awning-like overhang. It can remain open in light rain because the glass acts as a rain cover. Awning windows are commonly used in basements, bathrooms, and as upper transoms above other windows. They provide ventilation while providing some weather protection.',
        whatToChoose: 'Existing window is an awning type. Location is basement or low-profile opening. Window will be used as a transom above a picture or fixed window. Rain protection during ventilation is important.',
        whatNotToChoose: 'Opening is large -- awnings work best in smaller openings. Exterior obstruction below the window would block the awning swing.',
      },
    ],
  },

  {
    id: 'lib-bay-bow',
    title: 'Bay and Bow Windows',
    subtitle: 'Multi-unit windows that project outward from the wall',
    category: 'Window Types',
    roles: ['sales_rep', 'manager'],
    tags: ['bay', 'bow', 'projecting', 'multi-unit', 'window type'],
    sections: [
      {
        id: 'lib-bb-what',
        title: 'What Bay and Bow Windows Are',
        body: 'A bay window is a multi-unit assembly that projects outward from the exterior wall at an angle, creating a small interior alcove. A traditional bay has three units: a large center picture window flanked by two angled casements or double hungs. A bow window is a curved version with four or more equal-sized units arranged in a gentle arc. Both types are complex, high-value projects that require special structural consideration and precise measurement.',
        warnings: [
          'Bay and bow windows require manager approval before quoting in most cases.',
          'Never measure a bay or bow without photographing the full exterior projection.',
          'Structural support (knee brackets or cable support system) must be verified.',
          'Bay and bow pricing is significantly higher than standard replacement -- confirm with manager.'
        ],
        chargebackRisks: [
          'Measuring individual units without accounting for the projection angle.',
          'Omitting seat board or interior finish from the quote.',
          'Incorrect angle specification causing unit to not fit the projection.'
        ],
      },
      {
        id: 'lib-bb-measure',
        title: 'Measuring Bay and Bow Windows',
        body: 'Bay and bow window measurement is complex and should be reviewed with a manager before submitting. Measure each individual unit separately (width and height). Also measure the full face width of the bay, the depth of projection, and the angle of the side units. Photograph the exterior from multiple angles and the interior showing the seat board or window seat if present.',
        steps: [
          'Measure each individual unit (left, center, right) width x height.',
          'Measure total face width of the full bay.',
          'Measure depth of projection from wall to face of glass.',
          'Photograph full exterior from street-level showing full projection.',
          'Photograph interior showing seat board, stool, and side jambs.',
          'Note support system: knee brackets, cable, or steel support.',
          'Review all measurements with manager before submitting.'
        ],
        tips: [
          'Never guess the angle -- note it as 30-degree, 45-degree, or 60-degree based on existing unit.',
          'Take a ruler or angle gauge to confirm the projection angle if possible.'
        ],
      },
    ],
  },

  {
    id: 'lib-shape-window',
    title: 'Shape and Geometric Windows',
    subtitle: 'Non-rectangular specialty windows requiring precise templates',
    category: 'Window Types',
    roles: ['sales_rep', 'manager'],
    tags: ['shape', 'geometric', 'arch', 'round top', 'specialty', 'window type'],
    sections: [
      {
        id: 'lib-sw-what',
        title: 'What Shape Windows Are',
        body: 'Shape or geometric windows are non-rectangular: circles, ovals, half-rounds, quarter-rounds, triangles, pentagons, octagons, and custom arch tops. They are typically fixed (non-opening) glass and are used as decorative accent windows above entry doors, stairways, or as architectural features. Shape windows require precise templating because they cannot be manufactured from standard measurements alone.',
        warnings: [
          'NEVER measure a shape window without manager approval and a physical template.',
          'Standard width x height measurements are NOT sufficient for non-rectangular windows.',
          'A wrong template means a 100% reorder -- full cost of the window.',
          'Some shape windows require a factory template kit -- check with manager.'
        ],
        chargebackRisks: [
          'Ordering a shape window without a physical template -- wrong shape, full reorder.',
          'Measuring only width and height on a half-round and not noting the radius -- incorrect unit manufactured.'
        ],
      },
      {
        id: 'lib-sw-process',
        title: 'How to Handle Shape Windows',
        body: 'When you encounter a shape window, photograph it thoroughly from inside and outside. Measure the width and height of the overall opening. Note the shape type. Do NOT enter a final order without manager review. In most cases, a physical template must be created on site and submitted with the order. Ask your manager about the template process before promising an install date.',
        steps: [
          'Identify the shape type: half-round, quarter-round, full circle, arch, triangle, polygon.',
          'Photograph interior and exterior clearly.',
          'Measure overall width and height of the opening.',
          'Do NOT finalize the order without manager review.',
          'Request template kit from manager if required by product line.',
          'Note any special considerations: interior trim, exterior trim, tempered requirement.'
        ],
      },
    ],
  },

  {
    id: 'lib-oriel',
    title: 'Oriel Windows and Top Sash Measurement',
    subtitle: 'Specialty window where upper and lower sash have different widths',
    category: 'Window Types',
    roles: ['sales_rep', 'auditor'],
    tags: ['oriel', 'top sash', 'sash split', 'measurement', 'window type'],
    sections: [
      {
        id: 'lib-or-what',
        title: 'What an Oriel Window Is',
        body: 'An oriel window is a specialty window where the top sash (upper portion) has a different width or design than the bottom sash. The most common oriel design has a wider upper sash that overhangs the narrower lower sash -- similar to a projecting box effect. Oriel windows require an additional measurement that most reps miss: the TOP SASH WIDTH AND HEIGHT must be measured separately from the overall opening. Ordering without the top sash measurement is one of the most common chargebacks in replacement window work.',
        warnings: [
          'ALWAYS measure the top sash separately on an oriel window.',
          'If you are not sure if a window is an oriel, photograph it and ask your manager.',
          'Do NOT enter an oriel as a standard double hung -- it will be manufactured as the wrong size.'
        ],
        chargebackRisks: [
          'Missing top sash measurement -- window ordered as standard size, does not fit the oriel configuration.',
          'Entering oriel as a standard double hung -- wrong window manufactured, full reorder.',
          'Wrong top sash width -- sash does not match the oriel projection, expensive correction.'
        ],
      },
      {
        id: 'lib-or-identify',
        title: 'How to Identify an Oriel Window',
        body: 'Look at the window from the outside. If the upper portion of the window appears to project outward or is wider than the lower portion, it is likely an oriel. From the inside, look at where the upper and lower sashes meet -- if the top sash overlaps the side walls of the lower section, it is an oriel. The key visual cue is a sash split that does not run straight from top to bottom.',
        steps: [
          'Stand outside and look at the full window face.',
          'Check if the upper sash is wider than the lower sash.',
          'Stand inside and look at where the sashes meet in the middle.',
          'If the top sash extends further than the lower sash on either side, it is an oriel.',
          'Photograph the sash split line clearly from inside and outside.',
          'Measure the lower sash width and height separately from the top sash.'
        ],
        examples: [
          'Example: Overall opening = 36" wide x 60" tall. Lower sash = 36" wide x 36" tall. Top sash = 42" wide x 24" tall -- note the wider top sash.',
          'The top sash width (42") must be entered as a separate field in the app.'
        ],
      },
      {
        id: 'lib-or-measure',
        title: 'Measuring an Oriel Window',
        body: 'Measure the overall opening width and height as normal. Then specifically measure the top sash: its width (which may be wider than the main opening) and its height. Photograph your tape measure against the sash split to document the measurements. Enter all measurements in the app: overall width, overall height, AND top sash width, top sash height.',
        checklist: [
          'Overall opening width measured (three points, smallest).',
          'Overall opening height measured (three points, smallest).',
          'Top sash width measured separately.',
          'Top sash height measured separately.',
          'Photo of sash split with tape measure.',
          'Photo of exterior showing oriel projection.',
          'Window type selected as "Oriel" in the app (not double hung).'
        ],
        scenario: {
          situation: 'You are measuring a window in the living room. The existing window looks like a double hung from a distance, but when you look closely, you notice the upper sash appears wider than the lower sash. The overall opening is 36 inches wide and 60 inches tall.',
          question: 'What should you do?',
          options: [
            { id: 'a', text: 'Enter it as a standard double hung with 36" x 60" and move on.', isCorrect: false, explanation: 'This would result in a wrong order -- the oriel configuration would be missed.' },
            { id: 'b', text: 'Enter it as an oriel window, measure the top sash separately, photograph the sash split, and have the manager review.', isCorrect: true, explanation: 'Correct. Oriel windows require the top sash to be measured separately. Entering as double hung causes a chargeback.' },
            { id: 'c', text: 'Skip the window for now and come back later.', isCorrect: false, explanation: 'Never leave a window unmeasured -- missing data delays the job.' },
            { id: 'd', text: 'Estimate the top sash is about 40" and enter that without measuring.', isCorrect: false, explanation: 'Never estimate measurements. Precision is required for manufacturing.' },
          ],
          correctAnswer: 'b',
          explanation: 'Oriel windows must be identified and measured correctly with a separate top sash measurement. Missing this measurement is one of the top chargeback causes in window replacement.',
        },
        videos: [
          {
            title: 'How to Measure Replacement Windows',
            url: 'https://www.youtube.com/watch?v=3B45PBK_gjw',
            attribution: 'YouTube',
            sourceType: 'youtube',
          },
        ],
      },
    ],
  },

  {
    id: 'lib-mulled-windows',
    title: 'Mulled and Joined Windows',
    subtitle: 'Two or more window units attached together in a single opening',
    category: 'Window Types',
    roles: ['sales_rep', 'auditor'],
    tags: ['mulled', 'joined', 'mull', 'combination', 'window type'],
    sections: [
      {
        id: 'lib-mw-what',
        title: 'What Mulled Windows Are',
        body: 'A mulled window is two or more individual window units that are factory-joined (mulled) or field-joined side by side or stacked in a single rough opening. Common configurations include: picture window flanked by two double hungs, two sliders side by side, or a large picture window with awning units below. Mulled windows must be entered in the app as a combination unit -- not as individual separate windows -- so that the mull connection and total opening size are correctly calculated.',
        tips: [
          'Check if existing mulled units are factory-mulled or field-joined -- this affects how they are ordered.',
          'Photograph the full combination unit from inside and outside.',
          'Measure the full opening width and the width of each individual unit.',
          'Note the mull type: vertical mull (side by side) or horizontal mull (stacked).'
        ],
        chargebackRisks: [
          'Entering each unit separately without noting the mull relationship -- ordered as individual units, will not fit correctly.',
          'Wrong individual unit widths that do not add up to total opening width.',
          'Missing mull charge if field mull is required.'
        ],
      },
      {
        id: 'lib-mw-measure',
        title: 'Measuring Mulled Windows',
        body: 'First measure the TOTAL opening width and height. Then measure each individual unit within the combination. The individual unit widths should add up to the total opening width (minus mull bar width if applicable). Photograph each unit and the full assembly.',
        steps: [
          'Measure total rough opening width.',
          'Measure total rough opening height.',
          'Identify each individual unit in the combination.',
          'Measure each unit width.',
          'Verify unit widths sum to total opening (account for mull bar).',
          'Enter as combination/mulled unit in the app.',
          'Note mull orientation: horizontal or vertical.'
        ],
      },
    ],
  },

  // ============================================================
  // DOOR TYPES
  // ============================================================

  {
    id: 'lib-entry-door',
    title: 'Entry Doors',
    subtitle: 'Hinged exterior doors -- swing direction, frame, and finish matter',
    category: 'Door Types',
    roles: ['sales_rep', 'auditor'],
    tags: ['entry door', 'door', 'hinge', 'swing', 'threshold'],
    sections: [
      {
        id: 'lib-ed-what',
        title: 'What to Know About Entry Doors',
        body: 'An entry door is a hinged single or double door that serves as the main or secondary entry to the home. Key specifications include: handing (which direction it swings), material (steel, fiberglass, wood), glass options (sidelites, decorative glass inserts), and hardware. Entry doors require more detailed documentation than windows because the handing direction, threshold condition, and exterior trim situation all affect installation.',
        checklist: [
          'Door handing determined: inswing or outswing.',
          'Hinge side noted: left-hand or right-hand from exterior view.',
          'Rough opening measured: width x height.',
          'Threshold condition photographed.',
          'Exterior trim/brick mold condition photographed.',
          'Sidelites noted if present.',
          'Transom noted if present.',
          'Hardware finish selected.',
          'Glass insert option selected if applicable.'
        ],
        tips: [
          'Handing rule: stand outside facing the door. If hinges are on your left, it is left-hand swing. If hinges are on your right, it is right-hand swing.',
          'Always photograph the threshold -- rot or damage here affects installation scope.',
          'Note whether door has a screen door or storm door -- removal may be charged.'
        ],
        chargebackRisks: [
          'Wrong handing -- door swings wrong direction, must be reordered.',
          'Missing sidelite measurement.',
          'Threshold rot not noted -- installer surprises during installation.',
          'Wrong inswing/outswing designation.'
        ],
      },
    ],
  },

  {
    id: 'lib-patio-door',
    title: 'Patio and Sliding Glass Doors',
    subtitle: 'Horizontal sliding or swinging glass doors to patio or deck',
    category: 'Door Types',
    roles: ['sales_rep'],
    tags: ['patio door', 'sliding glass door', 'door', 'glass'],
    sections: [
      {
        id: 'lib-pd-what',
        title: 'What a Patio Door Is',
        body: 'A patio door is a large glass door that provides access to an outdoor patio, deck, or yard. The most common type is a sliding glass door (one panel is fixed, one slides). French patio doors have two panels hinged on the sides that swing outward or inward. Both types require full replacement of the door unit and must include measurement of the rough opening, operation configuration, glass options, and screen.',
        checklist: [
          'Confirm sliding vs. French patio door.',
          'Confirm which panel slides: left-hand or right-hand operation.',
          'Measure rough opening width x height.',
          'Note glass option: standard, Low-E, obscure, or grids.',
          'Screen type: standard sliding screen or retractable.',
          'Threshold and floor condition photographed.',
          'Exterior condition photographed.',
          'Interior trim and stops photographed.'
        ],
        rules: [
          'Patio door glass near a walking surface may require tempered glass per IRC R308.4.',
          'Patio doors within 24 inches of a door edge require safety glazing.'
        ],
        chargebackRisks: [
          'Wrong sliding configuration -- panel opens toward wall instead of open space.',
          'Missing tempered glass flag on large patio door glass panels.',
          'Measuring the door size including trim instead of rough opening.'
        ],
        videos: [
          {
            title: 'Sliding Patio Door Replacement',
            url: 'https://www.youtube.com/watch?v=DcWz9wFzHL8',
            attribution: 'This Old House / YouTube',
            sourceType: 'youtube',
          },
          {
            title: 'How to Measure for a Patio Door',
            url: 'https://www.youtube.com/watch?v=uZGvn-dekfQ',
            attribution: 'YouTube',
            sourceType: 'youtube',
          },
        ],
      },
    ],
  },

  // ============================================================
  // MEASUREMENT RULES
  // ============================================================

  {
    id: 'lib-tape-measure',
    title: 'How to Read a Tape Measure',
    subtitle: 'The foundation of accurate window and door measurement',
    category: 'Measurement Rules',
    roles: ['sales_rep'],
    tags: ['tape measure', 'measurement', 'fraction', 'reading', 'basics'],
    sections: [
      {
        id: 'lib-tm-fractions',
        title: 'Reading Tape Measure Fractions',
        body: 'Window measurements are recorded in inches and fractions of inches, typically to the nearest 1/8 inch or 1/16 inch. The tape measure has marks between the inch marks. The longest mark between inches is the 1/2" mark. The next longest marks on each side of the 1/2" mark are the 1/4" and 3/4" marks. The shortest marks are 1/8" increments. For window measurement, read to the nearest 1/8 inch. Never round to the nearest inch.',
        examples: [
          'The mark halfway between 27" and 28" = 27-1/2".',
          'The mark 1/4 of the way between 27" and 28" = 27-1/4".',
          'The mark 3/4 of the way between 27" and 28" = 27-3/4".',
          'A small mark halfway between 27" and 27-1/4" = 27-1/8".'
        ],
        tips: [
          'Always pull the tape flat and straight -- a bent tape gives a wrong reading.',
          'Read the tape at eye level, not at an angle (parallax error).',
          'Extend the tape fully before reading -- never read with a bent section.',
          'For windows, measure to the nearest 1/8 inch. Rounding causes poor fit.'
        ],
        videos: [
          {
            title: 'How to Read a Tape Measure -- Easy Tutorial',
            url: 'https://www.youtube.com/watch?v=OkZOyPJQ0a4',
            attribution: 'YouTube',
            sourceType: 'youtube',
          },
        ],
      },
      {
        id: 'lib-tm-width-height',
        title: 'Width and Height Convention',
        body: 'In the window industry, WIDTH is ALWAYS stated first, HEIGHT is stated second. This is universal. A "30 x 54" window is 30 inches wide and 54 inches tall. Never reverse this. Reversing width and height is a fast path to a chargeback because a window manufactured at the wrong orientation may not fit the opening and cannot be rotated.',
        rules: [
          'Industry standard: Width x Height. Always.',
          'A double hung 30 x 54 is 30 wide, 54 tall. A 54 x 30 would be a 54-inch wide, 30-inch tall horizontal unit.',
          'Document every measurement as Width x Height in the app.'
        ],
        examples: [
          'Living room window: 36" wide x 54" tall -- enters as 36 x 54.',
          'Bathroom window: 24" wide x 18" tall -- enters as 24 x 18 (a horizontal unit).',
          'Entering as 18 x 24 would manufacture a taller unit -- chargeback.'
        ],
        chargebackRisks: [
          'Transposing width and height -- window manufactured at wrong orientation.',
          'Entering height as 54 and width as 36 for a 36 x 54 unit -- the 54-wide version ships.'
        ],
      },
    ],
  },

  {
    id: 'lib-cush-measure',
    title: 'Cush Measure Rule',
    subtitle: 'How we reduce the actual measurement to get the order size',
    category: 'Measurement Rules',
    roles: ['sales_rep', 'auditor'],
    tags: ['cush measure', 'deduction', 'measurement', 'order size'],
    sections: [
      {
        id: 'lib-cm-what',
        title: 'What Cush Measure Means',
        body: 'The cush measure rule defines how much smaller than the actual rough opening we order a replacement window. We measure the actual opening, then subtract a deduction amount to give the window room to fit properly and be shimmed and sealed. The deduction amount is set by company policy and may vary by product line and exterior condition (insert vs. full-frame). Always use the app to calculate order size -- never manually subtract and enter the order size, as the app applies the correct rule automatically.',
        rules: [
          'Cush measure deduction is set by manager/admin configuration.',
          'Enter ACTUAL measurements into the app -- the app calculates the order size.',
          'Never manually enter a pre-deducted measurement unless manager instructs otherwise.',
          'Different exterior conditions (brick vs. siding) may have different deduction rules.'
        ],
        tips: [
          'If in doubt about which deduction rule applies, ask your manager before submitting.',
          'The order size shown in the app after you enter actuals is what gets manufactured -- confirm it looks correct.'
        ],
        chargebackRisks: [
          'Manually entering the deducted size instead of actuals -- double-deduction, window too small.',
          'Entering actuals for a brick opening using a siding deduction rule -- wrong order size.'
        ],
        examples: [
          'Actual opening: 36" x 54". Cush deduction: 1/4" per side. Order width = 35-1/2". Order height = 53-1/2".',
          'If rep manually subtracts and enters 35-1/2" as actual, app subtracts again = 35" -- too small.'
        ],
      },
      {
        id: 'lib-cm-brick',
        title: 'Brick Deduction Rule',
        body: 'Brick openings require a different deduction approach. The measurement is taken inside the brick mold, and the deduction accounts for the tight tolerance in brick versus the more flexible J-channel in siding. Brick deduction rules vary by market -- always verify the current brick deduction rule with your manager before entering a brick opening order.',
        warnings: [
          'Brick deduction rules differ from siding rules -- do not apply the same deduction.',
          'When in doubt on a brick opening, photograph and have manager verify before submitting.',
          'A window ordered too large for a brick opening cannot be trimmed -- full reorder.'
        ],
      },
    ],
  },

  {
    id: 'lib-united-inches',
    title: 'United Inches Explained',
    subtitle: 'How window size is used for pricing and product selection',
    category: 'Measurement Rules',
    roles: ['sales_rep'],
    tags: ['united inches', 'UI', 'measurement', 'pricing', 'size'],
    sections: [
      {
        id: 'lib-ui-what',
        title: 'What United Inches Are',
        body: 'United inches (UI) is the sum of a window\'s width and height. A window that is 30 inches wide and 54 inches tall has 84 united inches (30 + 54 = 84 UI). United inches are used by window manufacturers to classify windows into pricing tiers. Larger united inches = higher price. Some products have a maximum united inch limit -- windows larger than that limit require a special order or a different product line. The app calculates united inches automatically from the measurements you enter.',
        examples: [
          '24 x 36 window = 60 UI.',
          '30 x 54 window = 84 UI.',
          '36 x 60 window = 96 UI.',
          '48 x 72 window = 120 UI -- may require special order review.'
        ],
        rules: [
          'United inches = Width + Height.',
          'Maximum UI per product line varies -- check current product catalog.',
          'Windows over maximum UI require manager review before ordering.'
        ],
        tips: [
          'If a customer has very large windows, mention to your manager early in the process.',
          'United inches affect pricing tiers -- be aware that a measurement error can bump a window into a higher (or lower) price bracket.'
        ],
      },
    ],
  },

  {
    id: 'lib-return-depth',
    title: 'Return Depth Measurement',
    subtitle: 'The depth of the window opening from exterior face to existing window frame',
    category: 'Measurement Rules',
    roles: ['sales_rep', 'auditor'],
    tags: ['return depth', 'brick', 'measurement', 'depth', 'exterior'],
    sections: [
      {
        id: 'lib-rd-what',
        title: 'What Return Depth Is',
        body: 'Return depth is the measurement from the face of the exterior wall (or face of brick) to the face of the existing window frame. This dimension tells the installer how much space is available for the new window to seat into and how the exterior trim will be handled. A standard insert replacement in siding has a return depth of approximately 2-3 inches. Brick openings with deep returns (4 inches or more) may require special sill extension or custom exterior trim.',
        steps: [
          'Hold your tape measure at the face of the exterior brick or siding.',
          'Push the tape into the opening until it contacts the existing window frame.',
          'Read the measurement -- this is the return depth.',
          'Record the return depth in the app notes for this window.',
          'Photograph the tape measure in the opening to document the depth.'
        ],
        examples: [
          '2-inch return: standard, most insert products handle this.',
          '3-inch return: typical for older brick homes -- note in app.',
          '4-inch or deeper return: flag for manager review -- may need custom sill extension.'
        ],
        installerNotes: [
          'Return depth directly affects how the installer seats and flashes the window.',
          'Deep return depths require longer flashing and may require custom sill extension.',
          'Missing return depth documentation may cause installer to call rep for information on installation day.'
        ],
        chargebackRisks: [
          'Not noting deep return depth -- installer arrives without correct materials, delays installation.',
          'Assuming standard return depth on a brick home without measuring.'
        ],
      },
    ],
  },

];
