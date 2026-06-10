// Rule Explainability Registry
// Maps every rule ID pattern to rich, human-readable explanations.

export interface RuleExplanation {
  whatIsWrong: string;
  whyItMatters: string;
  consequence: string;
  howToFix: string;
  sourceRule: string;
  sourceDocument?: string;
  sourcePage?: string;
  affectedField?: string;
  overrideAllowed: boolean;
  overrideRequires?: string;
}

// ── Explainability lookup by warning ID prefix ──────────────
const REGISTRY: Array<{ pattern: RegExp; build: (id: string, detail: string, opNum?: number) => RuleExplanation }> = [

  // ── SCREEN RULES ──────────────────────────────────────────
  { pattern: /SCR_PIC|screen.*picture/i, build: () => ({
    whatIsWrong: 'A full screen has been specified on a picture window.',
    whyItMatters: 'Picture windows are fixed (non-operable). Screens are only functional on windows that open for ventilation. Window World cannot manufacture a full screen for a picture window.',
    consequence: 'The order will be rejected by the factory. The window will ship without a screen regardless of what is entered.',
    howToFix: 'Remove the screen selection or change it to "No Screen." If ventilation is needed, consider changing the product type to a casement or double hung.',
    sourceRule: 'BTR Pricing Book — Screen Rules',
    sourcePage: 'Page 13',
    affectedField: 'screenOption',
    overrideAllowed: false,
  })},
  { pattern: /SCR_3L|screen.*3.?lite/i, build: () => ({
    whatIsWrong: 'A full screen has been specified on a 3-lite slider.',
    whyItMatters: '3-lite sliders have a fixed center panel that prevents full-width screen mounting. Only half screens can be installed on the operable panel(s).',
    consequence: 'Factory will reject the order or ship without the screen.',
    howToFix: 'Change screen to "Half Screen" or "No Screen."',
    sourceRule: 'BTR Pricing Book — Screen Rules',
    sourcePage: 'Page 13',
    affectedField: 'screenOption',
    overrideAllowed: false,
  })},
  { pattern: /SCR_ARCH|screen.*arch/i, build: () => ({
    whatIsWrong: 'A full screen has been specified on an arch-top window.',
    whyItMatters: 'Arch-top windows have a curved frame that cannot accept a rectangular screen.',
    consequence: 'Factory will reject the order.',
    howToFix: 'Remove the screen or change to "No Screen."',
    sourceRule: 'BTR Pricing Book — Screen Rules',
    sourcePage: 'Page 13',
    affectedField: 'screenOption',
    overrideAllowed: false,
  })},
  { pattern: /scr-missing|no screen/i, build: (_id, _d, n) => ({
    whatIsWrong: `Opening #${n ?? '?'} is an operable window with no screen selected.`,
    whyItMatters: 'Operable windows without screens allow insects to enter the home when opened. Most homeowners expect screens on all operable windows.',
    consequence: 'Customer dissatisfaction. May result in a callback or free screen add-on after installation.',
    howToFix: 'Select "Standard Screen" or "Full Screen" unless the customer explicitly declines.',
    sourceRule: 'Senior Estimator — Forgotten Screens',
    affectedField: 'screenOption',
    overrideAllowed: true,
    overrideRequires: 'Customer verbal confirmation that no screen is desired.',
  })},

  // ── GRID RULES ────────────────────────────────────────────
  { pattern: /GRD_EXT|grid.*exterior.*color/i, build: () => ({
    whatIsWrong: 'A non-B1 grid type has been selected on a window with exterior color.',
    whyItMatters: 'Exterior color windows require B1 contoured grids because the grid profile must match the exterior laminate color wrap. A1 flat grids cannot be color-matched.',
    consequence: 'Factory will reject the order or produce mismatched grids that look incorrect from the exterior.',
    howToFix: 'Change grid type to "B1 Contoured."',
    sourceRule: 'BTR Pricing Book — Grid Rules',
    sourcePage: 'Page 15',
    affectedField: 'gridType',
    overrideAllowed: false,
  })},
  { pattern: /GRD_L2K|grid.*L2000/i, build: () => ({
    whatIsWrong: 'L2000 series window has a non-B1 grid type.',
    whyItMatters: 'L2000 (Fusion) series only supports B1 contoured grids due to the frame profile design.',
    consequence: 'Factory will reject the order.',
    howToFix: 'Change grid type to "B1 Contoured."',
    sourceRule: 'BTR Pricing Book — Grid Rules',
    sourcePage: 'Page 13',
    affectedField: 'gridType',
    overrideAllowed: false,
  })},
  { pattern: /GRD_DIA|diamond/i, build: () => ({
    whatIsWrong: 'Diamond grid pattern is specified with a non-A1 grid type.',
    whyItMatters: 'Diamond grids must be A1 flat because the diagonal crossing pattern cannot be manufactured in the contoured B1 profile.',
    consequence: 'Factory will reject or substitute, causing delays.',
    howToFix: 'Change grid type to "A1 Flat."',
    sourceRule: 'BTR Pricing Book — Grid Rules',
    sourcePage: 'Page 15',
    affectedField: 'gridType',
    overrideAllowed: false,
  })},
  { pattern: /GRD_SDL/i, build: () => ({
    whatIsWrong: 'SDL (Simulated Divided Lite) grids are specified but the SDL bar size is missing.',
    whyItMatters: 'SDL grids come in two sizes: 7/8" and 1-1/4". The factory cannot produce the window without this specification.',
    consequence: 'Order will be held or returned. SDL grids also require a double-check paper stapled to the folder front.',
    howToFix: 'Specify SDL bar size: 7/8" or 1-1/4". Attach double-check paper to order folder.',
    sourceRule: 'BTR Pricing Book — SDL Rules',
    sourcePage: 'Page 61',
    affectedField: 'sdlSize',
    overrideAllowed: false,
  })},

  // ── TEMPERED / SAFETY GLAZING ─────────────────────────────
  { pattern: /temp.*bath|TMP_BATH|sg-bathroom|wiz-wet/i, build: (_id, _d, n) => ({
    whatIsWrong: `Opening #${n ?? '?'} is in a bathroom without tempered glass.`,
    whyItMatters: 'Louisiana building code (RS 40:1579) requires safety glazing in wet areas including bathrooms, showers, and areas near tubs. A slip-and-fall into non-tempered glass can cause fatal lacerations.',
    consequence: 'Building code violation. Liability exposure for Window World and the homeowner. Inspector may require replacement at company cost.',
    howToFix: 'Add tempered glass (full tempered). Document the bathroom location with a photo.',
    sourceRule: 'LA Safety Glazing Code / BTR Page 113-117',
    sourcePage: 'Page 113',
    affectedField: 'temperedGlass',
    overrideAllowed: false,
  })},
  { pattern: /temp.*door|TMP_DOOR|sg-.*door|wiz-door/i, build: (_id, _d, n) => ({
    whatIsWrong: `Opening #${n ?? '?'} is within 24" of a door with bottom edge below 60" from the floor, but has no tempered glass.`,
    whyItMatters: 'Glass adjacent to doors is in a high-impact zone. A person swinging a door open or stumbling through a doorway can fall into the glass. Building code requires safety glazing in this location.',
    consequence: 'Building code violation. Serious injury liability. Inspector will fail the installation.',
    howToFix: 'Add tempered glass. Measure and document the distance from the door edge to the glass edge.',
    sourceRule: 'BTR Tempered Glass Requirements',
    sourcePage: 'Page 114',
    affectedField: 'temperedGlass',
    overrideAllowed: false,
  })},
  { pattern: /temp.*large|TMP_LARGE|sg-large/i, build: (_id, _d, n) => ({
    whatIsWrong: `Opening #${n ?? '?'} is a large pane (>9 sq ft) with bottom edge less than 18" from the floor.`,
    whyItMatters: 'Large panes close to walking surfaces are a safety hazard. A person can walk into or fall through the glass. Building code formula: Width(rounded up) × Height(rounded up) / 144 > 9 sq ft.',
    consequence: 'Code violation. The glass must be tempered or the installation will fail inspection.',
    howToFix: 'Add tempered glass. Verify floor-to-bottom measurement is documented.',
    sourceRule: 'BTR Tempered Glass — Large Pane Rule',
    sourcePage: 'Page 115',
    affectedField: 'temperedGlass',
    overrideAllowed: false,
  })},
  { pattern: /temp.*stair|TMP_STAIR|sg-stair|wiz-stair/i, build: (_id, _d, n) => ({
    whatIsWrong: `Opening #${n ?? '?'} is adjacent to a stairway with bottom edge less than 36" from walking surface.`,
    whyItMatters: 'Stairways are high-fall-risk areas. A person losing balance on stairs can fall into adjacent glass. Building code requires safety glazing within 36" of the walking surface on stairways.',
    consequence: 'Building code violation. Serious injury liability.',
    howToFix: 'Add tempered glass. Document stairway proximity with photo.',
    sourceRule: 'BTR Tempered Glass — Stairway Rule',
    sourcePage: 'Page 117',
    affectedField: 'temperedGlass',
    overrideAllowed: false,
  })},
  { pattern: /temp.*patio|patio.*door.*tempered/i, build: (_id, _d, n) => ({
    whatIsWrong: `Patio door #${n ?? '?'} does not have tempered glass specified.`,
    whyItMatters: 'All patio/sliding glass doors require tempered glass by building code. The entire glass panel is a door surface subject to impact.',
    consequence: 'Factory should auto-temper, but if not specified the order may be incorrect. Code violation if non-tempered.',
    howToFix: 'Set tempered glass to "Full."',
    sourceRule: 'Building Code — Patio Door Tempered Requirement',
    affectedField: 'temperedGlass',
    overrideAllowed: false,
  })},

  // ── ORIEL / SPECIALTY ─────────────────────────────────────
  { pattern: /ORI_3K|oriel.*3000.*50/i, build: (_id, _d, n) => ({
    whatIsWrong: `Opening #${n ?? '?'}: 3000 Series double hung oriel exceeds the 50" maximum.`,
    whyItMatters: 'The 3000 Series double hung frame cannot structurally support an oriel sash taller than 50". The balance system is not rated for the additional weight above this threshold.',
    consequence: 'Factory will reject the order. If produced, the window will not operate correctly — the sash will be too heavy for the balance springs.',
    howToFix: 'Change to 03A0 Single Hung, which supports oriel sizes above 50". The oriel measurement for 3000 Series is from the top of the glass to the top of the meeting rail.',
    sourceRule: 'BTR Pricing Book — Oriel Rules',
    sourcePage: 'Page 17',
    affectedField: 'seriesModel',
    overrideAllowed: false,
  })},
  { pattern: /SS_DIM|special.*shape.*84/i, build: () => ({
    whatIsWrong: 'A special shape window has a dimension exceeding 84".',
    whyItMatters: 'Special shapes over 84" in any dimension require full max UI pricing plus a $150 adder. These units are NOT eligible for the standard 80% discount.',
    consequence: 'Underpricing the job. The factory will charge the full amount regardless of what the contract says.',
    howToFix: 'Apply full max UI price + $150 adder. Remove any discount on this unit.',
    sourceRule: 'BTR Pricing Book — Special Shape Oversize',
    sourcePage: 'Page 60',
    affectedField: 'totalPrice',
    overrideAllowed: false,
  })},
  { pattern: /SS_TRIM|special.*shape.*trim/i, build: () => ({
    whatIsWrong: 'A radius/arch special shape window has no trim specified.',
    whyItMatters: 'Radius and arch shapes (circle top, quarter arch, eyebrow, ellipse, full circle) require bent trim to finish the curved exterior. Without trim, the installation looks incomplete and is exposed to weather.',
    consequence: 'Installer callback. Customer complaint. Additional trip charge and material cost.',
    howToFix: 'Add special shape trim charge. Note: special shape trim cannot be discounted. Polygon shapes do NOT require bent trim.',
    sourceRule: 'BTR Pricing Book — Special Shape Trim',
    sourcePage: 'Page 60',
    affectedField: 'trimRequired',
    overrideAllowed: false,
  })},

  // ── COLOR RULES ───────────────────────────────────────────
  { pattern: /CLR_CLAY_EXT|clay.*exterior/i, build: () => ({
    whatIsWrong: 'Exterior color has been selected on a clay vinyl window.',
    whyItMatters: 'Clay vinyl windows already have a colored body. The exterior laminate color wrap process cannot be applied over clay vinyl — only white vinyl accepts exterior color lamination.',
    consequence: 'Factory will reject the order.',
    howToFix: 'Remove exterior color selection, or change vinyl color from Clay to White.',
    sourceRule: 'BTR Pricing Book — Color Availability',
    sourcePage: 'Page 70',
    affectedField: 'exteriorColor',
    overrideAllowed: false,
  })},
  { pattern: /SER_CLAY|clay.*not.*available/i, build: (_id, d) => ({
    whatIsWrong: `Clay vinyl is not available in this series.`,
    whyItMatters: 'Not all window series support clay vinyl extrusion. L2000/Fusion and 0700 series cannot be produced in clay.',
    consequence: 'Factory will reject the order.',
    howToFix: 'Change vinyl color to White, or switch to a series that supports clay (e.g., 3000 or 4000 Series).',
    sourceRule: 'BTR Pricing Book — Clay Availability',
    sourcePage: 'Page 70',
    affectedField: 'vinylColor',
    overrideAllowed: false,
  })},

  // ── SIZE / GEOMETRY ───────────────────────────────────────
  { pattern: /SZ_MIN|geo-small/i, build: (_id, d) => ({
    whatIsWrong: d || 'Window dimension is below the manufacturer minimum.',
    whyItMatters: 'The factory cannot produce a window below the minimum size for this model. The frame extrusion and glass unit have physical minimums.',
    consequence: 'Order will be rejected by the factory.',
    howToFix: 'Verify the measurement. If accurate, select a different model that supports smaller sizes, or consider a custom/special shape order.',
    sourceRule: 'Product Spec Sheet — Minimum Dimensions',
    affectedField: 'width',
    overrideAllowed: false,
  })},
  { pattern: /SZ_MAX|geo-big/i, build: (_id, d) => ({
    whatIsWrong: d || 'Window dimension exceeds the manufacturer maximum.',
    whyItMatters: 'Exceeding the maximum size creates structural risk — the frame or glass may not withstand wind load or its own weight.',
    consequence: 'Factory rejection. If somehow produced, potential glass failure or frame bowing in the field.',
    howToFix: 'Split the opening into two or more smaller windows, or select a model rated for larger sizes.',
    sourceRule: 'Product Spec Sheet — Maximum Dimensions',
    affectedField: 'width',
    overrideAllowed: false,
  })},
  { pattern: /SZ_UI|ui.*max/i, build: (_id, d) => ({
    whatIsWrong: d || 'Combined UI (width + height) exceeds the maximum for this model.',
    whyItMatters: 'UI (United Inches) is the primary size constraint for window manufacturing. Exceeding it means the glass or frame assembly is beyond engineering limits.',
    consequence: 'Factory will reject. No override possible — this is a physical manufacturing limit.',
    howToFix: 'Reduce width or height, or select a different model with a higher max UI rating.',
    sourceRule: 'Product Spec Sheet — Max UI',
    affectedField: 'width',
    overrideAllowed: false,
  })},
  { pattern: /geo-swap|slider.*taller|double.*hung.*wider/i, build: (_id, d, n) => ({
    whatIsWrong: d || `Opening #${n ?? '?'} appears to have width and height swapped.`,
    whyItMatters: 'Double hung windows are typically taller than wide. Sliders are typically wider than tall. Reversed dimensions suggest a measurement entry error.',
    consequence: 'Incorrect window will be manufactured. Costly remake and scheduling delay.',
    howToFix: 'Verify the field measurement. If the dimensions are correct, confirm with the customer that this unusual aspect ratio is intentional.',
    sourceRule: 'Senior Estimator — Geometry Check',
    affectedField: 'width',
    overrideAllowed: true,
    overrideRequires: 'Rep confirms dimensions were re-measured and are correct.',
  })},

  // ── BRICK / INSTALL ───────────────────────────────────────
  { pattern: /meas-depth|depth.*brick/i, build: (_id, _d, n) => ({
    whatIsWrong: `Opening #${n ?? '?'} is in a brick house but has no return depth measurement.`,
    whyItMatters: 'Brick openings have varying return depths (the distance from the exterior brick face to the interior wall). Without this measurement, installers cannot order the correct frame extension or determine if standard J-channel will work.',
    consequence: 'Installer arrives on-site without correct materials. Job delay, return trip, additional material cost.',
    howToFix: 'Measure the brick return depth from the exterior face of the brick to the interior drywall surface. Enter in the depth field.',
    sourceRule: 'Measurement Rules — Brick Depth',
    affectedField: 'openingDepth',
    overrideAllowed: false,
  })},

  // ── ORDER COMPLETENESS ────────────────────────────────────
  { pattern: /missing-width|missing-height/i, build: (_id, _d, n) => ({
    whatIsWrong: `Opening #${n ?? '?'} is missing width or height dimensions.`,
    whyItMatters: 'Dimensions are the most fundamental data point for any window order. Without them, no pricing, manufacturing, or installation can occur.',
    consequence: 'Order cannot be submitted. No price can be calculated.',
    howToFix: 'Enter the field-measured width and height in inches. Use fractions if needed (e.g., 35 3/8).',
    sourceRule: 'Order Completeness — Required Fields',
    affectedField: 'width',
    overrideAllowed: false,
  })},
  { pattern: /missing-productCategory/i, build: (_id, _d, n) => ({
    whatIsWrong: `Opening #${n ?? '?'} has no product type selected.`,
    whyItMatters: 'The product type (double hung, slider, casement, picture, etc.) determines the frame, hardware, screen type, and pricing structure.',
    consequence: 'Cannot generate a price or order line without knowing what type of window to manufacture.',
    howToFix: 'Select the correct product category from the dropdown. If unsure, "Double Hung" is the most common residential window type.',
    sourceRule: 'Order Completeness — Required Fields',
    affectedField: 'productCategory',
    overrideAllowed: false,
  })},
  { pattern: /missing-.*Color/i, build: (_id, _d, n) => ({
    whatIsWrong: `Opening #${n ?? '?'} is missing a color selection.`,
    whyItMatters: 'Interior and exterior colors must be specified for manufacturing. The factory needs to know which vinyl extrusion color and/or laminate wrap to use.',
    consequence: 'Order held at factory until color is confirmed. Production delay of 1-2 weeks.',
    howToFix: 'Select interior and exterior colors. White/White is the standard default.',
    sourceRule: 'Order Completeness — Required Fields',
    affectedField: 'interiorColor',
    overrideAllowed: false,
  })},

  // ── SKETCH SYNC ───────────────────────────────────────────
  { pattern: /sketch.*missing_front_door/i, build: () => ({
    whatIsWrong: 'No front door marker has been placed on the sketch.',
    whyItMatters: 'The front door establishes the home orientation (front/rear/left/right elevations). Without it, opening elevations cannot be accurately assigned, which affects installation crew routing.',
    consequence: 'Installers may go to the wrong side of the house first. Elevation assignments on the order form may be incorrect.',
    howToFix: 'Place the front door marker (🚪) on the sketch canvas at the main entry location.',
    sourceRule: 'Sketch Sync — Front Door Required',
    affectedField: 'sketchCanvas',
    overrideAllowed: true,
    overrideRequires: 'Rep manually assigns all elevations without sketch reference.',
  })},
  { pattern: /sketch.*missing_measurement/i, build: (_id, _d, n) => ({
    whatIsWrong: `Sketch marker #${n ?? '?'} has no measurements entered.`,
    whyItMatters: 'Each sketch marker must have corresponding width and height measurements to generate an order line. A marker without measurements is an incomplete opening.',
    consequence: 'Opening will show as incomplete. Cannot generate pricing or order line.',
    howToFix: 'Tap the marker on the sketch canvas, then enter width and height in the detail sheet.',
    sourceRule: 'Sketch Sync — Marker Measurements',
    affectedField: 'width',
    overrideAllowed: false,
  })},
  { pattern: /sketch.*marker_no_opening/i, build: (_id, _d, n) => ({
    whatIsWrong: `Sketch marker #${n ?? '?'} exists on the canvas but has no linked opening in the order.`,
    whyItMatters: 'Every sketch marker should create a corresponding opening record. An unlinked marker means data entered on the sketch is not flowing to the order form.',
    consequence: 'The window will be missing from the order, pricing, and proposal. Customer will not receive this window.',
    howToFix: 'Open the marker detail sheet and save it to create the linked opening. If the marker is a mistake, delete it.',
    sourceRule: 'Sketch Sync — Marker-Opening Link',
    affectedField: 'openings',
    overrideAllowed: false,
  })},

  // ── CONSISTENCY ───────────────────────────────────────────
  { pattern: /room-grid|mixed.*grid/i, build: (_id, d) => ({
    whatIsWrong: d || 'Windows in the same room have different grid styles.',
    whyItMatters: 'Mismatched grids in a single room look obviously wrong to the homeowner. All windows visible together should have a consistent appearance.',
    consequence: 'Customer complaint after installation. Costly remake of one or more windows to match.',
    howToFix: 'Verify with the customer which grid style they want for this room, then apply it to all openings in the room.',
    sourceRule: 'Senior Estimator — Room Consistency',
    affectedField: 'gridStyle',
    overrideAllowed: true,
    overrideRequires: 'Customer confirms they want different grids in the same room.',
  })},
  { pattern: /room-color|mixed.*color/i, build: (_id, d) => ({
    whatIsWrong: d || 'Windows in the same room have different interior colors.',
    whyItMatters: 'Different interior colors in one room are visually jarring. This is almost always a data entry error.',
    consequence: 'Customer will notice immediately. Remake required for the mismatched unit(s).',
    howToFix: 'Standardize the interior color for all openings in this room.',
    sourceRule: 'Senior Estimator — Room Consistency',
    affectedField: 'interiorColor',
    overrideAllowed: true,
    overrideRequires: 'Customer confirms mixed colors are intentional (e.g., accent window).',
  })},
  { pattern: /color-ext-outlier/i, build: (_id, d) => ({
    whatIsWrong: d || 'One opening has a different exterior color than all others on the job.',
    whyItMatters: 'A single window with a different exterior color stands out on the house facade. This is almost always a typo.',
    consequence: 'Visible mismatch from the curb. Customer will request a remake.',
    howToFix: 'Change the outlier opening to match the rest of the job, or confirm with the customer that the accent color is intentional.',
    sourceRule: 'Senior Estimator — Color Consistency',
    affectedField: 'exteriorColor',
    overrideAllowed: true,
    overrideRequires: 'Customer confirms accent color is intentional.',
  })},

  // ── PRICING ───────────────────────────────────────────────
  { pattern: /price-high|price.*3x.*above/i, build: (_id, d) => ({
    whatIsWrong: d || 'An opening has a price significantly higher than the job average.',
    whyItMatters: 'A price 3x+ above average usually indicates a data entry error (wrong model, wrong dimensions, duplicate add-ons).',
    consequence: 'Overcharging the customer. May lose the sale if the total looks unreasonable.',
    howToFix: 'Review the pricing breakdown for this opening. Check for duplicate charges, incorrect model selection, or measurement errors.',
    sourceRule: 'Senior Estimator — Pricing Anomaly',
    affectedField: 'totalPrice',
    overrideAllowed: true,
    overrideRequires: 'Rep confirms pricing is correct after review.',
  })},
  { pattern: /price-low|price.*3x.*below/i, build: (_id, d) => ({
    whatIsWrong: d || 'An opening has a price significantly lower than the job average.',
    whyItMatters: 'A price 3x+ below average usually indicates a missing add-on, wrong model, or incorrect discount.',
    consequence: 'Undercharging — the company absorbs the cost difference. May also indicate a missed tempered glass or screen charge.',
    howToFix: 'Review the pricing breakdown. Check that all add-ons (tempered, grids, exterior color) are included.',
    sourceRule: 'Senior Estimator — Pricing Anomaly',
    affectedField: 'totalPrice',
    overrideAllowed: true,
    overrideRequires: 'Rep confirms pricing after manual review.',
  })},

  // ── LOUISIANA BUILDING CODE RULES ─────────────────────────
  { pattern: /LA-EGR|egress.*clear.*opening|bedroom.*egress/i, build: (_id, _d, n) => ({
    whatIsWrong: `Opening #${n ?? '?'} in a bedroom may not meet Louisiana egress requirements.`,
    whyItMatters: 'Louisiana adopted the 2021 IRC requiring bedrooms to have emergency escape windows. Firefighters must be able to enter and occupants must escape during a fire.',
    consequence: 'Non-compliant egress window is a life-safety code violation. May fail inspection or create liability.',
    howToFix: 'Increase window size to meet minimums: 5.7 sq ft clear opening, 20" min width, 24" min height, sill ≤44". Or apply the replacement window exception (IRC R310.5).',
    sourceRule: 'IRC R310 — Emergency Escape and Rescue Openings',
    sourceDocument: '2021 IRC (adopted by Louisiana Jan 2023)',
    overrideAllowed: true,
    overrideRequires: 'Manager approval + replacement window exception documentation (IRC R310.5)',
  })},
  { pattern: /LA-TMP|tempered.*door|safety.*glazing.*door/i, build: (_id, _d, n) => ({
    whatIsWrong: `Opening #${n ?? '?'} likely requires safety glazing (tempered glass).`,
    whyItMatters: 'Louisiana requires tempered glass in hazardous locations per IRC R308: near doors, in bathrooms, near stairs, and for large low glass panels. Non-tempered glass shatters into dangerous shards.',
    consequence: 'Code violation. Injury liability. Failed inspection.',
    howToFix: 'Enable tempered glass option. For door-adjacent windows, verify distance is >24" from door edge.',
    sourceRule: 'IRC R308 — Safety Glazing',
    sourceDocument: '2021 IRC (adopted by Louisiana Jan 2023)',
    overrideAllowed: true,
    overrideRequires: 'Field measurement confirming glazing is not in a hazardous location',
  })},
  { pattern: /LA-NRG|energy.*U.factor|SHGC|IECC/i, build: (_id, _d, n) => ({
    whatIsWrong: `Opening #${n ?? '?'} may not meet Louisiana energy code requirements.`,
    whyItMatters: 'Louisiana is Climate Zone 2 under the 2021 IECC. Windows must meet U-factor ≤0.40 and SHGC ≤0.25. This reduces energy costs and is required for permits.',
    consequence: 'May not pass energy code inspection. Higher utility bills for homeowner.',
    howToFix: 'Recommend SolarZone or SolarZone Elite glass package with argon fill. These meet Louisiana energy requirements.',
    sourceRule: 'IECC Table R402.1.2 — Climate Zone 2',
    sourceDocument: '2021 IECC (adopted by Louisiana Jul 2023)',
    overrideAllowed: true,
  })},
  { pattern: /LA-INS|nail.*fin.*brick|brick.*outside/i, build: (_id, _d, n) => ({
    whatIsWrong: `Opening #${n ?? '?'} has an installation configuration issue.`,
    whyItMatters: 'Proper installation is critical for weather resistance and structural integrity. Brick homes require outside measurements and cannot use nail fin installation.',
    consequence: 'Water infiltration, structural damage, or improper fit requiring reinstallation.',
    howToFix: 'For brick: measure from outside, use smallest of 3 measurements, remove nail fin option.',
    sourceRule: 'Window World Field Standard — Installation',
    overrideAllowed: false,
  })},
  { pattern: /LA-RPL|replacement.*measurement|smallest.*measurement/i, build: (_id, _d, n) => ({
    whatIsWrong: `Opening #${n ?? '?'} may not be using the correct replacement window measurement.`,
    whyItMatters: 'Replacement windows must use the smallest of 3-point measurements because openings are rarely perfectly square. Using a larger measurement means the window won\'t fit.',
    consequence: 'Window too large for opening. Requires reorder, delays installation, increases cost.',
    howToFix: 'Take 3 width measurements (top/middle/bottom) and 3 height measurements (left/center/right). Use the smallest of each.',
    sourceRule: 'Window World Field Standard — Replacement Measurement',
    overrideAllowed: true,
    overrideRequires: 'Rep confirmation that smallest measurement was used',
  })},
];

// ── FALLBACK for unknown rules ──────────────────────────────
function buildFallback(id: string, detail: string, opNum?: number): RuleExplanation {
  return {
    whatIsWrong: detail || `A validation issue was detected on opening #${opNum ?? '?'}.`,
    whyItMatters: 'This issue may affect order accuracy, pricing, code compliance, or customer satisfaction.',
    consequence: 'The order may be rejected, mispriced, or result in a field issue after installation.',
    howToFix: 'Review the affected opening and correct the flagged field. Contact Window World management if unsure.',
    sourceRule: `Rule ID: ${id}`,
    affectedField: undefined,
    overrideAllowed: false,
  };
}

// ── PUBLIC API ──────────────────────────────────────────────
export function explainRule(warningId: string, detail: string, openingNumber?: number): RuleExplanation {
  for (const entry of REGISTRY) {
    if (entry.pattern.test(warningId) || entry.pattern.test(detail)) {
      return entry.build(warningId, detail, openingNumber);
    }
  }
  return buildFallback(warningId, detail, openingNumber);
}

export function hasExplanation(warningId: string, detail: string): boolean {
  return REGISTRY.some(e => e.pattern.test(warningId) || e.pattern.test(detail));
}
