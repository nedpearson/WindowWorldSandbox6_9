export interface IssueSeverity {
  id: string;
  name: string;
  description: string;
  examples: string[];
  requiredAction: string;
  notificationBehavior: string;
  managerApprovalRequired: boolean;
  canMoveForward: string;
}

export const issueSeverities: IssueSeverity[] = [
  {
    id: "level-1",
    name: "LEVEL 1 — MINOR",
    description: "A small data quality or documentation issue that should be corrected but does not usually stop the rep from continuing.",
    examples: [
      "Optional note missing",
      "Photo label missing",
      "Follow-up less than 24 hours overdue",
      "Minor customer detail incomplete"
    ],
    requiredAction: "Notify rep, add to issue list, allow workflow to continue",
    notificationBehavior: "Visible in dashboard and issue list",
    managerApprovalRequired: false,
    canMoveForward: "Yes, unless combined with other unresolved issues"
  },
  {
    id: "level-2",
    name: "LEVEL 2 — WARNING",
    description: "A meaningful issue that could create confusion, poor follow-up, or operational friction if not corrected.",
    examples: [
      "Missing room label",
      "Quote has no next action",
      "Measurement looks abnormal",
      "Product option incomplete",
      "Customer communication incomplete"
    ],
    requiredAction: "Rep must correct or provide explanation, warning visible on dashboard",
    notificationBehavior: "Warning icon on job, task created for rep",
    managerApprovalRequired: false,
    canMoveForward: "Usually yes, but not final submission if required fields are affected"
  },
  {
    id: "level-3",
    name: "LEVEL 3 — CRITICAL",
    description: "A serious issue that can create a contract, pricing, production, installation, or customer problem.",
    examples: [
      "Missing signature",
      "Missing required measurement",
      "Missing tempered glass answer",
      "Quote total does not match contract total",
      "Product selection incomplete",
      "Address mismatch",
      "Missing payment terms"
    ],
    requiredAction: "Block submission, notify rep and manager, require correction before job can move forward",
    notificationBehavior: "Email/Push to manager, critical alert to rep",
    managerApprovalRequired: true,
    canMoveForward: "No, unless resolved or manager override is approved"
  },
  {
    id: "level-4",
    name: "LEVEL 4 — BUSINESS RISK",
    description: "A high-risk issue that could create legal exposure, revenue loss, failed installation, customer dispute, or operational failure.",
    examples: [
      "Job submitted with incomplete measurements",
      "Contract legally incomplete",
      "Underpriced job below margin threshold",
      "Safety glass requirement ignored",
      "Change order not approved",
      "Production packet incomplete",
      "Major quote/contract mismatch"
    ],
    requiredAction: "Lock job from production, escalate to manager/admin, require audit approval, require documented resolution",
    notificationBehavior: "Immediate escalation to Admin/GM",
    managerApprovalRequired: true,
    canMoveForward: "No, until resolved and approved"
  }
];

export interface AuditorDefinition {
  id: string;
  name: string;
  purpose: string;
  checks: string[];
  commonIssues: string[];
  severityLevels: string[];
  owner: string;
  blocksSubmission: boolean;
  softwareResolution: string;
  exampleScenarios: string[];
  correctiveActions: string[];
  relatedModules: string[];
  relatedMetrics: string[];
}

export const auditors: AuditorDefinition[] = [
  {
    id: "measurement-auditor",
    name: "Measurement Auditor",
    purpose: "Ensures all physical measurements and field documentation are complete before pricing and production.",
    checks: [
      "Missing width", "Missing height", "Abnormal dimensions", "Missing photo", "Missing room/location", "Duplicate opening", "Missing unit type", "Missing siding elevation", "Missing door swing/handing", "Missing mull/join relationship", "Tempered glass condition not answered"
    ],
    commonIssues: [
      "Window 7 has no photo",
      "Bathroom window has no tempered glass answer",
      "Door has no handing selected",
      "Siding rear elevation has no height",
      "Opening count in sketch does not match measurement list"
    ],
    severityLevels: ["LEVEL 2 — WARNING", "LEVEL 3 — CRITICAL"],
    owner: "Sales Rep",
    blocksSubmission: true,
    softwareResolution: "Validates inputs during sketch/measurement phase, blocks quote generation until critical gaps are filled.",
    exampleScenarios: ["Rep forgets to photograph exterior damage on opening 4."],
    correctiveActions: ["Return to Measurement Tool to add missing values/photos."],
    relatedModules: ["Measurement Tool", "Sketch Canvas"],
    relatedMetrics: ["Measurement errors per job", "Missing photo rate"]
  },
  {
    id: "contract-auditor",
    name: "Contract Auditor",
    purpose: "Ensures legal and financial obligations are correctly bound and signed.",
    checks: [
      "Missing signature", "Missing initials", "Missing customer name", "Address mismatch", "Missing product selections", "Missing payment terms", "Quote total does not match contract total", "Scope of work incomplete", "Missing required disclosures", "Contract generated from stale quote"
    ],
    commonIssues: [
      "Contract missing customer signature",
      "Quote says 12 windows, contract says 11",
      "Payment terms blank",
      "Customer address differs from lead address"
    ],
    severityLevels: ["LEVEL 3 — CRITICAL", "LEVEL 4 — BUSINESS RISK"],
    owner: "Sales Rep / Manager",
    blocksSubmission: true,
    softwareResolution: "Forces digital signature capture, auto-syncs quote totals, and validates address matching.",
    exampleScenarios: ["Rep generates contract, but customer forgets to initial payment terms."],
    correctiveActions: ["Re-send contract for digital signature or correct mismatched data."],
    relatedModules: ["Contract Builder", "Leads"],
    relatedMetrics: ["Contract errors per rep", "Time to signature"]
  },
  {
    id: "pricing-auditor",
    name: "Pricing Auditor",
    purpose: "Protects margins and ensures accurate quoting.",
    checks: [
      "Missing add-ons", "Missing specialty charges", "Missing labor", "Missing clear story charge", "Missing tempered glass charge", "Incorrect discount", "Margin below threshold", "Tax/fee mismatch", "Manual override without reason", "Product price missing or zero"
    ],
    commonIssues: [
      "Clear story not charged",
      "Discount over allowed threshold",
      "Picture window priced with screen incorrectly",
      "Specialty arch missing custom charge"
    ],
    severityLevels: ["LEVEL 2 — WARNING", "LEVEL 3 — CRITICAL", "LEVEL 4 — BUSINESS RISK"],
    owner: "Sales Manager",
    blocksSubmission: true,
    softwareResolution: "Automates clear story and specialty upcharges based on measurements.",
    exampleScenarios: ["Rep applies 25% discount without manager approval code."],
    correctiveActions: ["Adjust discount or request manager override."],
    relatedModules: ["Quote Builder", "Pricing Admin"],
    relatedMetrics: ["Average margin", "Discount percentage", "Revenue leakage alerts"]
  },
  {
    id: "follow-up-auditor",
    name: "Follow-Up Auditor",
    purpose: "Prevents leads and open quotes from going cold.",
    checks: [
      "No next action", "Overdue follow-up", "Quote aging", "Hot lead not contacted", "Missed callback", "No lost reason", "Appointment completed but no outcome", "Lead status stale"
    ],
    commonIssues: [
      "Quote sent 5 days ago with no follow-up",
      "Customer asked for callback tomorrow but no task exists",
      "Lead is still New after appointment date passed"
    ],
    severityLevels: ["LEVEL 1 — MINOR", "LEVEL 2 — WARNING"],
    owner: "Sales Rep",
    blocksSubmission: false,
    softwareResolution: "Auto-creates follow-up tasks upon quote generation.",
    exampleScenarios: ["Rep sends $15k quote but forgets to set a callback reminder."],
    correctiveActions: ["Add task in Follow-Up module."],
    relatedModules: ["Follow-Up Tasks", "Dashboard"],
    relatedMetrics: ["Follow-up compliance rate", "Stalled pipeline value"]
  },
  {
    id: "production-readiness-auditor",
    name: "Production Readiness Auditor",
    purpose: "Ensures the factory/installers have 100% of the data needed to build and install.",
    checks: [
      "Job packet completeness", "Measurements complete", "Photos attached", "Product selections complete", "Contract complete", "Payment terms complete", "Install notes added", "Special conditions flagged", "Change orders approved", "Manager blockers resolved"
    ],
    commonIssues: [
      "Job submitted with missing exterior photos",
      "Product selected but no color",
      "Install notes missing for difficult access",
      "Change order not approved"
    ],
    severityLevels: ["LEVEL 3 — CRITICAL", "LEVEL 4 — BUSINESS RISK"],
    owner: "Production Manager",
    blocksSubmission: true,
    softwareResolution: "Gatekeeps the 'Send to Production' button until 100% data compliance is met.",
    exampleScenarios: ["Rep sells job, but leaves grid type blank."],
    correctiveActions: ["Complete missing product selections."],
    relatedModules: ["Production Handoff", "Final Lockdown Review"],
    relatedMetrics: ["Jobs production-ready", "Rework risk rate"]
  },
  {
    id: "customer-communication-auditor",
    name: "Customer Communication Auditor",
    purpose: "Ensures professional, timely communication with the homeowner.",
    checks: [
      "Appointment confirmation sent", "Quote sent", "Contract copy sent", "Follow-up sent", "Customer questions unanswered", "Communication log complete", "Install prep message sent if applicable"
    ],
    commonIssues: [
      "Quote created but not sent",
      "Customer emailed question with no reply",
      "Contract signed but copy not sent"
    ],
    severityLevels: ["LEVEL 1 — MINOR", "LEVEL 2 — WARNING"],
    owner: "Sales Rep / Office",
    blocksSubmission: false,
    softwareResolution: "Tracks outgoing SMS/Email and flags unread incoming messages.",
    exampleScenarios: ["Customer texts a question about financing, rep hasn't replied in 24 hours."],
    correctiveActions: ["Reply via communication log."],
    relatedModules: ["Leads", "Appointments"],
    relatedMetrics: ["Average response time", "Customer communication score"]
  },
  {
    id: "manager-performance-auditor",
    name: "Manager Performance Auditor",
    purpose: "Aggregates rep metrics to highlight training opportunities.",
    checks: [
      "Rep conversion rate", "Rep close rate", "Average ticket", "Lead response time", "Follow-up compliance", "Measurement issue rate", "Contract issue rate", "Revenue by rep", "Revenue by source", "Stalled pipeline"
    ],
    commonIssues: [
      "Rep has high quote volume but low close rate",
      "Rep has repeated contract errors",
      "Rep has overdue follow-ups over threshold"
    ],
    severityLevels: ["LEVEL 2 — WARNING", "LEVEL 3 — CRITICAL"],
    owner: "Sales Manager / GM",
    blocksSubmission: false,
    softwareResolution: "Rolls up individual errors into manager dashboard trends.",
    exampleScenarios: ["Rep A submits 5 jobs this week, 4 are blocked due to missing photos."],
    correctiveActions: ["Manager initiates ride-along training on photo capture."],
    relatedModules: ["Manager Dashboard", "Reports"],
    relatedMetrics: ["Close rate", "Issue rate per job"]
  },
  {
    id: "data-integrity-auditor",
    name: "Data Integrity Auditor",
    purpose: "Maintains a clean CRM database.",
    checks: [
      "Lead/customer duplication", "Missing foreign-key relationships", "Quote not linked to customer", "Contract not linked to quote", "Job not linked to contract", "Issue not linked to owning record", "Broken status transitions", "Missing timestamps", "Missing owner/user IDs"
    ],
    commonIssues: [
      "Contract exists without quote ID",
      "Customer has duplicate records",
      "Issue is not assigned to a rep",
      "Job status says production-ready but contract incomplete"
    ],
    severityLevels: ["LEVEL 3 — CRITICAL", "LEVEL 4 — BUSINESS RISK"],
    owner: "System Admin",
    blocksSubmission: true,
    softwareResolution: "Enforces database constraints and merges duplicate leads.",
    exampleScenarios: ["Two leads enter for 'John Smith' at the same address."],
    correctiveActions: ["Merge duplicate customer records."],
    relatedModules: ["Admin", "System"],
    relatedMetrics: ["Duplicate count", "Orphaned records"]
  },
  {
    id: "mobile-field-usage-auditor",
    name: "Mobile Field Usage Auditor",
    purpose: "Ensures reps are actually using the tool on-site, not guessing later.",
    checks: [
      "Rep used mobile app during appointment", "Measurements captured in field", "Photos captured from device", "Offline sync completed", "Sketch saved", "GPS/address confirmation if app supports it", "Required field data entered before leaving job"
    ],
    commonIssues: [
      "Appointment completed with no mobile photos",
      "Measurements entered after appointment with no field timestamp",
      "Offline sync failed",
      "Sketch not saved"
    ],
    severityLevels: ["LEVEL 2 — WARNING", "LEVEL 3 — CRITICAL"],
    owner: "Sales Manager",
    blocksSubmission: false,
    softwareResolution: "Time-stamps mobile actions and tracks offline sync status.",
    exampleScenarios: ["Rep enters measurements 4 hours after leaving the house, increasing error risk."],
    correctiveActions: ["Train rep on in-home data entry."],
    relatedModules: ["Mobile App", "Sync Logs"],
    relatedMetrics: ["Mobile adoption rate", "Field vs Office entry ratio"]
  },
  {
    id: "revenue-leakage-auditor",
    name: "Revenue Leakage Auditor",
    purpose: "Catches unbilled work, freebies, and margin erosion.",
    checks: [
      "Missing charges", "Unapproved discounts", "Quote below margin", "Missing add-ons", "Missing change order", "Free work not documented", "Lost job reason trends", "High-value quote with no follow-up"
    ],
    commonIssues: [
      "Rep discounted job below margin",
      "Add-on was selected but not charged",
      "Change order performed but not approved",
      "$15,000 quote has no follow-up task"
    ],
    severityLevels: ["LEVEL 3 — CRITICAL", "LEVEL 4 — BUSINESS RISK"],
    owner: "GM / Owner",
    blocksSubmission: true,
    softwareResolution: "Triggers margin checks on every quote save.",
    exampleScenarios: ["Rep promises free grid upgrade but doesn't log the cost reduction."],
    correctiveActions: ["Require GM approval for negative margin items."],
    relatedModules: ["Quote Builder", "Profitability"],
    relatedMetrics: ["Revenue protected", "Margin erosion rate"]
  }
];

export interface BusinessProblem {
  category: string;
  problem: string;
  example: string;
  impact: string;
  solution: string;
  repAction: string;
  managerAction: string;
  relatedAuditor: string;
  relatedModules: string;
}

export const businessProblems: BusinessProblem[] = [
  {
    category: "Measurement Problems",
    problem: "Missing tempered glass flag",
    example: "A bathroom window near a tub is quoted without tempered glass.",
    impact: "Product may be ordered incorrectly, creating safety, code, cost, and customer dispute risk.",
    solution: "The measurement flow asks bathroom/tub/shower proximity questions and triggers a critical warning when the condition is unresolved.",
    repAction: "Answer the safety glass questions and confirm tempered selection.",
    managerAction: "Review unresolved tempered warnings before production.",
    relatedAuditor: "Measurement Auditor",
    relatedModules: "Measurement Tool, Quote Builder, Contract Builder"
  },
  {
    category: "Contract Problems",
    problem: "Quote vs Contract Mismatch",
    example: "Rep quotes 10 windows, but the contract says 9.",
    impact: "Legal liability, lost revenue, and confused installers.",
    solution: "Contract Builder pulls directly from the approved Quote ID; modifications require a Quote revision.",
    repAction: "Ensure quote is final before generating contract.",
    managerAction: "Audit mismatched jobs in the Contract Auditor.",
    relatedAuditor: "Contract Auditor",
    relatedModules: "Contract Builder, Quote Builder"
  },
  {
    category: "Pricing Problems",
    problem: "Unapproved Discounts",
    example: "Rep gives a 30% discount to win the job, pushing margin below cost.",
    impact: "The company loses money on the job.",
    solution: "Rule Engine caps standard discounts at 15%. Anything higher requires Manager Override PIN.",
    repAction: "Request manager approval for high discounts.",
    managerAction: "Review and approve/deny override requests.",
    relatedAuditor: "Pricing Auditor",
    relatedModules: "Quote Builder, Rule Engine Admin"
  },
  {
    category: "Follow-Up Problems",
    problem: "Dead Leads",
    example: "A $20,000 quote is sent, but the rep forgets to call back.",
    impact: "Lost sales and wasted marketing spend.",
    solution: "System forces a 'Next Action Date' before allowing a quote to be marked 'Sent'.",
    repAction: "Complete follow-up tasks daily.",
    managerAction: "Monitor the 'Overdue Follow-ups' dashboard.",
    relatedAuditor: "Follow-Up Auditor",
    relatedModules: "Follow-Up Tasks, Dashboard"
  },
  {
    category: "Lead Management Problems",
    problem: "Duplicate Leads",
    example: "Customer fills out form twice, two reps are assigned.",
    impact: "Poor customer experience and internal commission disputes.",
    solution: "Automatic deduplication based on address and phone number.",
    repAction: "Verify lead history before calling.",
    managerAction: "Merge duplicates manually if auto-merge fails.",
    relatedAuditor: "Data Integrity Auditor",
    relatedModules: "Leads"
  },
  {
    category: "Customer Communication Problems",
    problem: "Missed Appointment Expectations",
    example: "Customer doesn't know the rep needs 90 minutes for measurement.",
    impact: "Customer rushes the rep, leading to errors.",
    solution: "Automated SMS confirmation sets clear expectations.",
    repAction: "Confirm appointment details on arrival.",
    managerAction: "Ensure SMS templates are active.",
    relatedAuditor: "Customer Communication Auditor",
    relatedModules: "Appointments"
  },
  {
    category: "Production Handoff Problems",
    problem: "Missing Siding Elevations",
    example: "Siding job sold, but rep didn't note the wall height for the rear.",
    impact: "Materials ordered short; job stalled mid-install.",
    solution: "Siding wizard requires Height and Width for all 4 elevations.",
    repAction: "Enter all elevation dimensions in the field.",
    managerAction: "Block production until elevations are complete.",
    relatedAuditor: "Production Readiness Auditor",
    relatedModules: "Measurement Tool, Production Handoff"
  },
  {
    category: "Installation Preparation Problems",
    problem: "Unknown Obstructions",
    example: "A hot tub is blocking a large picture window, requiring extra labor.",
    impact: "Installers arrive unprepared, job gets delayed.",
    solution: "Rep must check 'Obstructions present' and add a photo.",
    repAction: "Take photos of all exterior access points.",
    managerAction: "Review installation notes before dispatch.",
    relatedAuditor: "Measurement Auditor",
    relatedModules: "Sketch Canvas"
  },
  {
    category: "Manager Visibility Problems",
    problem: "Hidden Rep Failures",
    example: "A rep has a 10% close rate but blames leads.",
    impact: "Manager doesn't know the rep is failing to measure properly.",
    solution: "Manager Dashboard aggregates measurement errors by rep.",
    repAction: "Follow the manual.",
    managerAction: "Use metrics to schedule targeted ride-alongs.",
    relatedAuditor: "Manager Performance Auditor",
    relatedModules: "Analytics, Dashboard"
  },
  {
    category: "Revenue Leakage Problems",
    problem: "Missing Clear Story Charges",
    example: "Rep quotes a second-story window without the $225 scaffolding charge.",
    impact: "$225 lost margin per high window.",
    solution: "Pricing engine auto-adds charge if height > 120 inches.",
    repAction: "Enter correct field height.",
    managerAction: "Audit overridden specialty charges.",
    relatedAuditor: "Revenue Leakage Auditor",
    relatedModules: "Quote Builder, Pricing Admin"
  },
  {
    category: "Data Integrity Problems",
    problem: "Missing Signatures",
    example: "Job goes to production, but contract signature failed to sync.",
    impact: "Legal inability to collect payment.",
    solution: "Production Handoff is locked if contract status !== 'Signed'.",
    repAction: "Ensure customer signs on the tablet.",
    managerAction: "Review contract status before ordering.",
    relatedAuditor: "Contract Auditor",
    relatedModules: "Contract Builder, Signing App"
  },
  {
    category: "Mobile Field Execution Problems",
    problem: "Memory-based Quoting",
    example: "Rep measures on paper, goes to car, and guesses grid patterns.",
    impact: "Wrong windows ordered.",
    solution: "Mobile app requires photo + data entry per opening before leaving.",
    repAction: "Use the mobile app in the house.",
    managerAction: "Check 'Mobile Usage Rate' metrics.",
    relatedAuditor: "Mobile Field Usage Auditor",
    relatedModules: "Mobile App"
  }
];

/**
 * A video resource card for embedding in manual articles.
 * sourceType = 'youtube' uses YouTubeEmbedCard.
 * sourceType = 'link' renders an external link card.
 */
export interface ManualVideo {
  title: string;
  url: string;          // watch URL or search URL
  embedUrl?: string;    // explicit embed URL if known
  attribution?: string; // channel / source name
  sourceType: 'youtube' | 'link';
}

export interface ManualSection {
  id: string;
  title: string;
  body: string;
  steps?: string[];
  checklist?: string[];
  examples?: string[];
  warnings?: string[];
  relatedLinks?: { label: string; to: string }[];
  // Rich content fields
  tips?: string[];           // Pro tip boxes (green)
  rules?: string[];          // Code / business rules (blue)
  installerNotes?: string[]; // What installers need to know (orange)
  chargebackRisks?: string[]; // Financial risk scenarios (red)
  whatToChoose?: string;     // Explicit "Choose this when..." guidance
  whatNotToChoose?: string;  // Explicit "Do NOT choose when..." guidance
  videos?: ManualVideo[];    // YouTube embeds / link cards
  // Scenario quiz
  scenario?: {
    situation: string;
    question: string;
    options: Array<{ id: string; text: string; isCorrect: boolean; explanation?: string }>;
    correctAnswer: string;
    explanation: string;
  };
}

export interface ManualChapter {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  roles: string[];
  sections: ManualSection[];
  tags?: string[];           // Searchable tags
}

export const manualChapters: ManualChapter[] = [
  {
    id: "ch1-introduction",
    title: "CHAPTER 1 — Introduction to the Sales System",
    subtitle: "What this system is and why it matters",
    category: "Getting Started",
    roles: ["Sales Rep", "Manager", "Auditor"],
    sections: [
      {
        id: "ch1-what",
        title: "What this system is",
        body: "This software connects leads, appointments, measurements, quotes, contracts, follow-ups, issues, production, and reporting into a single source of truth. It replaces paper forms, disconnected spreadsheets, and memory-based quoting.",
        relatedLinks: [{ label: "Go to Dashboard", to: "/" }]
      },
      {
        id: "ch1-why",
        title: "Why the system matters",
        body: "Accurate data protects the company from lost revenue and installation problems. Every missing photo, wrong measurement, or uncharged add-on directly impacts the bottom line and the installer's ability to complete the job.",
        warnings: ["A simple mistake in the field becomes a $5,000 mistake in the factory."]
      },
      {
        id: "ch1-rep-owns",
        title: "What a sales rep owns",
        body: "You own the job from the moment you accept the lead until the final job packet is submitted and approved. You are responsible for the accuracy of every measurement, photo, and price."
      },
      {
        id: "ch1-auditors",
        title: "How the auditor system works",
        body: "The system runs continuous automated audits on your data. If you miss a tempered glass flag, forget a photo, or underprice a job, an Auditor will flag it and potentially block your job from moving to production."
      }
    ]
  },
  {
    id: "ch2-responsibilities",
    title: "CHAPTER 2 — Sales Rep Responsibilities",
    subtitle: "Owning the field process",
    category: "Sales Workflow",
    roles: ["Sales Rep"],
    sections: [
      {
        id: "ch2-overview",
        title: "Full Process Ownership",
        body: "The sales rep owns the full field process from lead review through job submission.",
        checklist: [
          "Lead reviewed",
          "Customer contacted",
          "Appointment confirmed",
          "Address verified",
          "Product interest reviewed",
          "Photos captured",
          "Measurements complete",
          "Quote complete",
          "Contract complete",
          "Follow-up complete",
          "Job packet submitted"
        ],
        relatedLinks: [{ label: "Appointments", to: "/appointments" }]
      }
    ]
  },
  {
    id: "ch3-daily-workflow",
    title: "CHAPTER 3 — Daily Rep Workflow",
    subtitle: "Breaking down the day",
    category: "Sales Workflow",
    roles: ["Sales Rep"],
    sections: [
      {
        id: "ch3-morning",
        title: "Morning Prep",
        body: "Start your day by reviewing what needs to happen.",
        steps: [
          "Open dashboard",
          "Review today's appointments",
          "Review new leads",
          "Review overdue follow-ups",
          "Review unsigned quotes",
          "Review open issues",
          "Confirm route/navigation"
        ],
        relatedLinks: [{ label: "Dashboard", to: "/" }]
      },
      {
        id: "ch3-during",
        title: "During Appointment",
        body: "In the home, use the mobile app to capture everything.",
        steps: [
          "Greet customer & confirm scope",
          "Walk property & take photos",
          "Create sketch & mark openings",
          "Measure each unit",
          "Identify tempered glass requirements",
          "Choose products/options",
          "Build quote & review quote",
          "Present proposal",
          "Generate contract if sold"
        ]
      },
      {
        id: "ch3-after",
        title: "After Appointment",
        body: "Close the loop on the job.",
        steps: [
          "Send quote recap",
          "Schedule follow-up",
          "Mark lead status",
          "Submit job packet or mark unsold"
        ]
      }
    ]
  },
  {
    id: "ch4-lead-management",
    title: "CHAPTER 4 — Lead Management",
    category: "Lead Management",
    roles: ["Sales Rep", "Manager"],
    sections: [
      {
        id: "ch4-handling",
        title: "Handling Leads",
        body: "Leads enter the system and are assigned. Duplicate leads are auto-flagged. You must contact leads promptly to avoid aging and dead leads.",
        examples: ["A lead from HomeAdvisor requires contact within 5 minutes for highest conversion."],
        warnings: ["Leads with no next action will trigger a Follow-up Auditor warning."]
      }
    ]
  },
  {
    id: "ch5-appointment-prep",
    title: "CHAPTER 5 — Appointment Preparation",
    category: "Field Measurement",
    roles: ["Sales Rep"],
    sections: [
      {
        id: "ch5-prep",
        title: "Preparing for the visit",
        body: "Check prior notes, photos, and product interest before arriving.",
        checklist: [
          "Customer information confirmed",
          "Address verified",
          "Product interest confirmed",
          "Mobile app synced",
          "Battery charged"
        ]
      }
    ]
  },
  {
    id: "ch6-field-measurement",
    title: "CHAPTER 6 — Field Measurement Process",
    category: "Field Measurement",
    roles: ["Sales Rep"],
    sections: [
      {
        id: "ch6-rules",
        title: "Measurement Principles",
        body: "Walk the whole property first. Create a logical order. Never quote from memory.",
        steps: [
          "Measure width and height",
          "Confirm unit type",
          "Add room/location label",
          "Capture photo per opening",
          "Flag abnormal conditions",
          "Verify final count before quote"
        ],
        warnings: ["Never skip photos. Missing photos will block production."]
      }
    ]
  },
  {
    id: "ch7-sketch",
    title: "CHAPTER 7 — Sketch and Photo Documentation",
    category: "Sketch and Photos",
    roles: ["Sales Rep", "Auditor"],
    sections: [
      {
        id: "ch7-sketching",
        title: "Documenting the House",
        body: "Every opening must have a label. Mark front, left, right, rear elevations. Mull units must be joined visually.",
        warnings: ["Exterior issues must be photographed."]
      }
    ]
  },
  {
    id: "ch8-window-rules",
    title: "CHAPTER 8 — Window Measurement Rules",
    category: "Field Measurement",
    roles: ["Sales Rep", "Auditor"],
    sections: [
      {
        id: "ch8-windows",
        title: "Window Data",
        body: "Ensure all window attributes are captured.",
        checklist: [
          "Width", "Height", "Location label", "Window type", "Quantity", "Grid option", "Glass option", "Color", "Tempered glass review"
        ],
        examples: ["Common Mistake: Reversing width and height.", "Common Mistake: Forgetting picture windows do not come with screens."]
      }
    ]
  },
  {
    id: "ch9-door-rules",
    title: "CHAPTER 9 — Door Measurement Rules",
    category: "Field Measurement",
    roles: ["Sales Rep", "Auditor"],
    sections: [
      {
        id: "ch9-doors",
        title: "Door Data",
        body: "Doors require specific hardware and handing information.",
        checklist: [
          "Door type", "Width", "Height", "Swing", "Handing", "Color", "Hardware", "Sill/threshold notes"
        ],
        examples: ["Common Mistake: Wrong handing selected."]
      }
    ]
  },
  {
    id: "ch10-siding-rules",
    title: "CHAPTER 10 — Siding Measurement Rules",
    category: "Field Measurement",
    roles: ["Sales Rep"],
    sections: [
      {
        id: "ch10-siding",
        title: "Siding Data",
        body: "Measure all elevations. Clear story pricing ($225 + $75 per extra) applies automatically based on height.",
        checklist: [
          "Elevation breakdown (Front/Left/Right/Rear)", "Wall height", "Wall width", "Openings deducted", "Material type"
        ]
      }
    ]
  },
  {
    id: "ch11-specialty",
    title: "CHAPTER 11 — Specialty Units and Mull Units",
    category: "Field Measurement",
    roles: ["Sales Rep"],
    sections: [
      {
        id: "ch11-mull",
        title: "Specialty Rules",
        body: "Mull units must be linked visually and in the data model. Large/custom units should trigger pricing review.",
        relatedLinks: [{ label: "Specialty Builder", to: "/specialty" }]
      }
    ]
  },
  {
    id: "ch12-tempered",
    title: "CHAPTER 12 — Tempered Glass Rules",
    category: "Field Measurement",
    roles: ["Sales Rep", "Auditor"],
    sections: [
      {
        id: "ch12-glass",
        title: "Safety Rules",
        body: "Tempered glass is required near tubs/showers, low to floor, or in doors. The software will trigger warnings if dimensions suggest it.",
        warnings: ["Ignoring a tempered glass warning creates massive liability and will block submission."]
      }
    ]
  },
  {
    id: "ch13-products",
    title: "CHAPTER 13 — Product Selection",
    category: "Product Selection",
    roles: ["Sales Rep"],
    sections: [
      {
        id: "ch13-options",
        title: "Selections",
        body: "Select type, style, color, glass, grids, and screens. Product mismatch between quote and contract will trigger a Contract Auditor error."
      }
    ]
  },
  {
    id: "ch14-pricing",
    title: "CHAPTER 14 — Pricing and Quote Creation",
    category: "Pricing and Quotes",
    roles: ["Sales Rep", "Manager"],
    sections: [
      {
        id: "ch14-quotes",
        title: "Building Quotes",
        body: "Quotes are generated from measurements and products. Manager approval is required for extreme discounts.",
        examples: ["Missing clear story charge will trigger Revenue Leakage Auditor."],
        relatedLinks: [{ label: "Quick Quote", to: "/quick-quote" }]
      }
    ]
  },
  {
    id: "ch15-contracts",
    title: "CHAPTER 15 — Contract Completion",
    category: "Contracts",
    roles: ["Sales Rep"],
    sections: [
      {
        id: "ch15-signing",
        title: "Generating Contracts",
        body: "Contract total must match quote total. Signatures are required.",
        checklist: [
          "Customer legal name complete",
          "Scope of work clear",
          "Price matches quote",
          "Signatures complete",
          "Customer copy sent"
        ]
      }
    ]
  },
  {
    id: "ch16-communication",
    title: "CHAPTER 16 — Customer Communication",
    category: "Follow-Up",
    roles: ["Sales Rep"],
    sections: [
      {
        id: "ch16-log",
        title: "Communication Log",
        body: "Keep all communication in the system so the office knows what was promised."
      }
    ]
  },
  {
    id: "ch17-follow-up",
    title: "CHAPTER 17 — Follow-Up System",
    category: "Follow-Up",
    roles: ["Sales Rep"],
    sections: [
      {
        id: "ch17-tasks",
        title: "Next Actions",
        body: "Every unsold quote must have a next action. Follow-up date is required."
      }
    ]
  },
  {
    id: "ch18-reporting",
    title: "CHAPTER 18 — Reporting and Business Intelligence",
    category: "Reporting",
    roles: ["Manager", "Auditor"],
    sections: [
      {
        id: "ch18-sales-metrics",
        title: "Sales Metrics",
        body: "Key metrics including Total leads, New leads, Appointments booked, Quotes sent, Close rate, Average ticket, Revenue sold, Reason lost, and Quote aging.",
        relatedLinks: [{ label: "Analytics", to: "/analytics" }]
      },
      {
        id: "ch18-ops-metrics",
        title: "Operations Metrics",
        body: "Key metrics including Jobs production-ready, Measurement errors, Contract errors, Change orders, and Rework risk."
      },
      {
        id: "ch18-rep-metrics",
        title: "Rep Quality Metrics",
        body: "Key metrics including Follow-up compliance, Quote accuracy, Average response time, Critical issue count, and Repeated issue categories."
      },
      {
        id: "ch18-auditor-metrics",
        title: "Auditor Metrics",
        body: "Key metrics including Number of audits run, Issues found, Average resolution time, Revenue protected, and Most common missing fields."
      }
    ]
  },
  {
    id: "ch19-dashboards",
    title: "CHAPTER 19 — Dashboard Definitions",
    category: "Reporting",
    roles: ["Manager", "Sales Rep", "Auditor"],
    sections: [
      {
        id: "ch19-sales-dash",
        title: "Sales Rep Dashboard",
        body: "Shows today's appointments, new assigned leads, follow-ups due, hot opportunities, issues assigned to you, and your close rate.",
        relatedLinks: [{ label: "Dashboard", to: "/" }]
      },
      {
        id: "ch19-manager-dash",
        title: "Manager Dashboard",
        body: "Shows leads by rep, quote-to-close rate, open issues, follow-up compliance, pipeline value, and blocked jobs."
      },
      {
        id: "ch19-auditor-dash",
        title: "Auditor Dashboard",
        body: "Shows total issues, issues by severity, issues by category, average resolution time, and revenue leakage alerts."
      },
      {
        id: "ch19-production-dash",
        title: "Production Dashboard",
        body: "Shows jobs ready for order, blocked jobs, missing job packet items, install notes, and change orders.",
        relatedLinks: [{ label: "Office Queue", to: "/office" }]
      }
    ]
  },
  {
    id: "ch20-auditors",
    title: "CHAPTER 20 — Auditor System",
    category: "Auditors",
    roles: ["Sales Rep", "Manager", "Auditor"],
    sections: [
      {
        id: "ch20-intro",
        title: "The Quality Control Layer",
        body: "Auditors are software checks that inspect rep work, data completeness, pricing accuracy, contract readiness, customer communication, production readiness, and business risk. See the Auditors vs Issues framework for details."
      }
    ]
  },
  {
    id: "ch21-final-checklist",
    title: "FINAL JOB SUBMISSION CHECKLIST",
    category: "Production Handoff",
    roles: ["Sales Rep", "Manager"],
    sections: [
      {
        id: "ch21-final",
        title: "Before Sending to Production",
        body: "Review this before submitting.",
        checklist: [
          "Customer information complete",
          "All windows/doors/siding measured",
          "Sketch completed",
          "Photos attached to required openings",
          "Tempered glass rules checked",
          "Quote matches contract",
          "Signatures complete",
          "Install notes complete",
          "Open blockers resolved"
        ]
      }
    ]
  },
  {
    id: "ch22-objection-handling",
    title: "CHAPTER 22 — Objection Handling & Sales Battlecards",
    subtitle: "How to successfully overcome homeowner concerns in the home",
    category: "Best Practices",
    roles: ["Sales Rep"],
    sections: [
      {
        id: "ch22-overview",
        title: "Overview of Objection Handling",
        body: "Objections are not rejections. They are requests for more information or clarification. In-home sales reps must respond with calm confidence, validation, and a focus on long-term value.",
        checklist: [
          "Validate their concern before answering",
          "Isolate the objection to make sure there are no other hidden hesitations",
          "Focus on the lifetime value and Good Housekeeping Seal backing"
        ]
      },
      {
        id: "ch22-price-objection",
        title: "Handling Price Objections",
        body: "Use the 'Feel, Felt, Found' technique. Address the homeowner's concern about the initial investment by showing long-term energy savings and protection under our transferrable lifetime warranty.",
        checklist: [
          "Feel: 'I completely understand how you feel about the price. It is a significant investment.'",
          "Felt: 'Many of our other homeowners felt the exact same way at first, looking at the initial cost.'",
          "Found: 'However, what they found after installing our Energy Star windows is that their heating/cooling bills dropped by 25-30%, and the lifetime warranty meant they never had to spend another dollar on window maintenance.'"
        ]
      },
      {
        id: "ch22-delay-objection",
        title: "Handling Delay Objections ('I need to think about it')",
        body: "Homeowners often delay out of fear or unresolved questions. Bring the focus back to their active problems (rotting wood, drafts, security concerns) and ask open-ended questions to discover the real hesitation.",
        examples: [
          "Rep: 'I understand wanting to take your time. Usually, when people say they want to think about it, it means they are either not comfortable with the price, not sure about the company, or not fully convinced about the product. Which of those is it for you?'"
        ]
      },
      {
        id: "ch22-competitor-objection",
        title: "Handling Competitor Objections (Andersen, Pella, etc.)",
        body: "Never badmouth competitors. Instead, highlight the unique Window World advantages: 1) Unbeatable lifetime warranty (parts, labor, glass breakage). 2) Good Housekeeping Seal protection. 3) Our high volume national pricing allows premium materials without inflated retail margins.",
        steps: [
          "Acknowledge: 'Pella and Andersen make fine products. They are good companies.'",
          "Differentiate: 'However, what differentiates Window World is our true lifetime warranty, including glass breakage, which most competitors charge extra for.'",
          "Compare Value: Ask the homeowner: 'Can you show me what specific package the other company quoted so we can verify if you are getting comparable insulation values for that price?'"
        ]
      }
    ]
  }
];

export const manualCategories = [
  "Getting Started",
  "Sales Workflow",
  "Lead Management",
  "Field Measurement",
  "Sketch and Photos",
  "Product Selection",
  "Pricing and Quotes",
  "Contracts",
  "Follow-Up",
  "Auditors",
  "Issues and Escalations",
  "Manager Oversight",
  "Production Handoff",
  "Reporting",
  "Best Practices"
];

export const manualRoles = [
  "Sales Rep",
  "Manager",
  "Admin",
  "Auditor",
  "Installer",
  "Office Staff"
];
