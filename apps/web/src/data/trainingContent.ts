export interface TrainingStep {
  id: string;
  title: string;
  instruction: string;
  expectedAction: string;
  commonMistakes: string[];
  auditorWarnings: string[];
  points: number;
}

export interface TrainingScenario {
  id: string;
  title: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "Manager" | "Production" | "Error Analysis";
  description: string;
  customerName: string;
  projectScope: string;
  steps: TrainingStep[];
  passScore: number;
}

export const trainingScenarios: TrainingScenario[] = [
  {
    id: "scenario-beginner",
    title: "The Standard Window Replacement",
    difficulty: "Beginner",
    description: "A straightforward 5-window replacement job on a single-story home. Perfect for your first practice run.",
    customerName: "John & Mary Smith",
    projectScope: "Replace 5 existing double-hung windows with new Series 4000 vinyl replacements.",
    passScore: 50,
    steps: [
      {
        id: "b1",
        title: "Lead Review",
        instruction: "Open the new lead for John Smith. Confirm the address and product interest.",
        expectedAction: "Click 'Acknowledge Lead', dial the number, and confirm the 2:00 PM appointment.",
        commonMistakes: ["Showing up without calling first.", "Not checking the lead source."],
        auditorWarnings: ["Follow-Up Auditor: No next action if left unacknowledged."],
        points: 10
      },
      {
        id: "b2",
        title: "Property Walk & Sketch",
        instruction: "Walk around the house. Sketch the footprint and mark the 5 windows.",
        expectedAction: "Draw a simple rectangle. Add 2 windows to Front Elevation, 1 Left, 1 Right, 1 Rear.",
        commonMistakes: ["Skipping the sketch.", "Forgetting to label elevations."],
        auditorWarnings: ["Measurement Auditor: Opening count in sketch does not match measurement list."],
        points: 10
      },
      {
        id: "b3",
        title: "Measurement & Photos",
        instruction: "Measure each of the 5 double-hung windows. Take one interior and one exterior photo of each.",
        expectedAction: "Enter Width and Height for all 5. Attach 2 photos per opening. Label rooms (e.g., Living Room, Bedroom).",
        commonMistakes: ["Reversing width and height.", "Taking blurry photos.", "Not taking exterior photos."],
        auditorWarnings: ["Measurement Auditor: Missing photo.", "Measurement Auditor: Missing room/location."],
        points: 10
      },
      {
        id: "b4",
        title: "Product Selection & Quote",
        instruction: "Select the Double Hung style, White color, and Low-E glass. Generate the quote.",
        expectedAction: "Apply selections to all 5 windows. Add default trim. Review total price.",
        commonMistakes: ["Forgetting to select grid options (or no grids).", "Not applying selections to all openings."],
        auditorWarnings: ["Pricing Auditor: Product price missing or zero.", "Contract Auditor: Missing product selections."],
        points: 10
      },
      {
        id: "b5",
        title: "Contract & Signature",
        instruction: "The customer agreed to the price. Generate the contract, complete payment terms, and capture signatures.",
        expectedAction: "Select 'Credit Card' payment, collect 50% deposit info, capture digital signature.",
        commonMistakes: ["Leaving payment terms blank.", "Not having both homeowners sign if required."],
        auditorWarnings: ["Contract Auditor: Missing payment terms.", "Contract Auditor: Missing signature."],
        points: 10
      }
    ]
  },
  {
    id: "scenario-intermediate",
    title: "Doors, Siding, and Tempered Glass",
    difficulty: "Intermediate",
    description: "A mixed job involving entry doors, partial siding replacement, and a bathroom window near a tub.",
    customerName: "David Miller",
    projectScope: "1 Front Door, 1 Bathroom Window, and Rear Elevation Siding.",
    passScore: 60,
    steps: [
      {
        id: "i1",
        title: "Safety Identification",
        instruction: "The bathroom window is 12 inches from the edge of the shower.",
        expectedAction: "Answer 'Yes' to the tub/shower proximity question and flag the window for Tempered Glass.",
        commonMistakes: ["Ignoring the tub proximity.", "Assuming standard glass is fine for small windows."],
        auditorWarnings: ["Measurement Auditor: Tempered glass condition not answered."],
        points: 10
      },
      {
        id: "i2",
        title: "Door Handing & Swing",
        instruction: "Measure the front entry door. It swings inward and the hinges are on the left from the outside.",
        expectedAction: "Select 'Left Hand Inswing'. Measure Rough Opening if full frame tear-out.",
        commonMistakes: ["Selecting Right Hand.", "Missing hardware options (deadbolt prep)."],
        auditorWarnings: ["Measurement Auditor: Missing door swing/handing."],
        points: 10
      },
      {
        id: "i3",
        title: "Siding Elevations",
        instruction: "Measure the rear wall for new vinyl siding.",
        expectedAction: "Select 'Rear Elevation'. Enter Wall Height (10 ft) and Wall Width (40 ft). Deduct door/window square footage.",
        commonMistakes: ["Forgetting to deduct openings.", "Not noting existing material (e.g., asbestos/stucco) requiring extra labor."],
        auditorWarnings: ["Measurement Auditor: Missing siding elevation.", "Production Readiness: Install notes missing."],
        points: 10
      },
      {
        id: "i4",
        title: "Pricing Adjustments",
        instruction: "Add the custom hardware charge for the door and the tempered glass upcharge.",
        expectedAction: "Verify that the Pricing Engine automatically added the $150 tempered glass fee and $250 custom hardware fee.",
        commonMistakes: ["Manually overriding the price incorrectly.", "Forgetting the door hardware charge."],
        auditorWarnings: ["Pricing Auditor: Missing specialty charges.", "Pricing Auditor: Missing tempered glass charge."],
        points: 10
      },
      {
        id: "i5",
        title: "Follow-Up Scheduling",
        instruction: "The customer needs 3 days to think about it before signing.",
        expectedAction: "Leave quote unsigned. Create a Follow-Up Task for 3 days from now. Mark status as 'Warm'.",
        commonMistakes: ["Leaving the lead in 'Appt Complete' with no next action."],
        auditorWarnings: ["Follow-Up Auditor: No next action."],
        points: 10
      },
      {
        id: "i6",
        title: "Communication Log",
        instruction: "Send an email recap of the quote to the customer.",
        expectedAction: "Use the 'Send Quote' button to generate the automated email template.",
        commonMistakes: ["Sending it from a personal email not tracked in the CRM."],
        auditorWarnings: ["Customer Communication Auditor: Quote created but not sent."],
        points: 10
      }
    ]
  },
  {
    id: "scenario-advanced",
    title: "Mull Units & Clear Story Siding",
    difficulty: "Advanced",
    description: "A large, complex job with joined specialty windows, high-wall siding, and deep discounting negotiations.",
    customerName: "Sarah Jenkins",
    projectScope: "3-lite Mulled Window (Picture + 2 Double Hungs), Arch specialty, and 2nd Story Siding.",
    passScore: 70,
    steps: [
      {
        id: "a1",
        title: "Mulled Unit Measurement",
        instruction: "Measure the large front living room window, which consists of a center picture window and two flanking double hungs inside one master frame.",
        expectedAction: "Measure the overall Master Frame. Then measure the 3 individual sub-units. Use the 'Join/Mull' tool to link them in the sketch.",
        commonMistakes: ["Measuring it as 3 entirely separate windows.", "Only measuring the master frame and guessing sub-unit sizes."],
        auditorWarnings: ["Measurement Auditor: Missing mull/join relationship."],
        points: 10
      },
      {
        id: "a2",
        title: "Specialty Shape",
        instruction: "Measure the Half-Round Arch window above the front door.",
        expectedAction: "Select 'Specialty Shape -> Arch'. Capture exact radius measurements. Take a template if required.",
        commonMistakes: ["Quoting standard rectangular pricing for an arch.", "Not taking a clear front-facing photo for the factory."],
        auditorWarnings: ["Pricing Auditor: Specialty arch missing custom charge."],
        points: 10
      },
      {
        id: "a3",
        title: "Clear Story Siding",
        instruction: "Measure the right elevation siding, which extends 25 feet high.",
        expectedAction: "Enter Wall Height: 25 ft. The system should automatically apply a Clear Story charge (e.g., scaffolding fee).",
        commonMistakes: ["Failing to log the height accurately, causing the company to eat the scaffolding cost."],
        auditorWarnings: ["Revenue Leakage Auditor: Missing clear story charge."],
        points: 10
      },
      {
        id: "a4",
        title: "Discount Override Request",
        instruction: "Customer demands a 20% discount. Your standard authority is 10%.",
        expectedAction: "Apply 20% discount in the builder. The system flags it. Send 'Manager Override Request' with justification.",
        commonMistakes: ["Promising the discount without system approval.", "Lowering individual window prices to hide the discount."],
        auditorWarnings: ["Pricing Auditor: Discount over allowed threshold.", "Pricing Auditor: Manual override without reason."],
        points: 10
      },
      {
        id: "a5",
        title: "Installation Notes",
        instruction: "The right elevation has thick bushes blocking ladder access.",
        expectedAction: "Check 'Obstructions Present', photograph the bushes, and write 'Landscaping blocks right wall, needs clearing or extra labor' in Install Notes.",
        commonMistakes: ["Leaving Install Notes blank."],
        auditorWarnings: ["Production Readiness Auditor: Install notes missing for difficult access."],
        points: 10
      },
      {
        id: "a6",
        title: "Contract Revision",
        instruction: "The manager approved 15%, not 20%. The customer agrees.",
        expectedAction: "Revise the quote to 15%, save, generate a NEW contract document, and capture signatures.",
        commonMistakes: ["Having them sign the old contract and writing '-15%' in pen."],
        auditorWarnings: ["Contract Auditor: Quote total does not match contract total.", "Contract Auditor: Contract generated from stale quote."],
        points: 10
      },
      {
        id: "a7",
        title: "Submit Job Packet",
        instruction: "Finalize the deal and send it to production.",
        expectedAction: "Run the Final Lockdown Review. Fix any last warnings. Click 'Submit to Production'.",
        commonMistakes: ["Leaving the job in 'Signed' status without pushing to production."],
        auditorWarnings: ["Data Integrity Auditor: Job status says production-ready but contract incomplete."],
        points: 10
      }
    ]
  },
  {
    id: "scenario-failed",
    title: "Find The Errors (Audit Practice)",
    difficulty: "Error Analysis",
    description: "A rep just submitted a job, but it was blocked. You are playing the role of the Auditor. Find all the fatal mistakes.",
    customerName: "Robert Vance",
    projectScope: "Submitted job: 8 Windows. Status: BLOCKED.",
    passScore: 40,
    steps: [
      {
        id: "f1",
        title: "Review Missing Signatures",
        instruction: "The job packet was submitted, but the contract is invalid.",
        expectedAction: "Identify that the customer initials are missing on the 'Right to Cancel' page.",
        commonMistakes: ["Approving the job without checking the PDF output."],
        auditorWarnings: ["Contract Auditor: Missing initials."],
        points: 10
      },
      {
        id: "f2",
        title: "Review Mismatched Totals",
        instruction: "Look at the Quote Total ($8,500) and the Contract Total ($8,000).",
        expectedAction: "Flag the job for 'Quote/Contract Mismatch'. The rep likely altered the quote after generating the contract.",
        commonMistakes: ["Assuming the lower price is correct without documentation."],
        auditorWarnings: ["Contract Auditor: Quote total does not match contract total."],
        points: 10
      },
      {
        id: "f3",
        title: "Review Missing Photos",
        instruction: "Check the photo attachments for Window 3 (Bathroom).",
        expectedAction: "Identify that there is no interior photo showing the tub proximity.",
        commonMistakes: ["Trusting the rep's word that it's 'not near the tub' without photographic proof."],
        auditorWarnings: ["Measurement Auditor: Tempered glass condition not answered / Missing photo."],
        points: 10
      },
      {
        id: "f4",
        title: "Reject to Rep",
        instruction: "Send the job back to the rep for correction.",
        expectedAction: "Add comments for the 3 fatal errors and click 'Reject to Rep'.",
        commonMistakes: ["Fixing the errors for the rep, which prevents them from learning."],
        auditorWarnings: ["Manager Performance Auditor: Rep has repeated contract errors."],
        points: 10
      }
    ]
  }
];

export const certificationChecklist = [
  "I understand how to claim, call, and disposition leads.",
  "I understand that every opening must have width, height, and room label.",
  "I understand that every opening requires exterior and interior photos.",
  "I understand how to identify and flag tempered glass requirements.",
  "I understand that mull units must be linked in the software.",
  "I understand that siding jobs require dimensions for all relevant elevations.",
  "I understand that standard discounts cannot exceed the limit without manager approval.",
  "I understand that the Quote Total and Contract Total must match perfectly.",
  "I understand that every unsold quote requires a Follow-Up Task.",
  "I understand that all Auditor Warnings must be resolved before Production Handoff."
];
