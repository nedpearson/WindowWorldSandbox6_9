/**
 * Training Mode Expansion
 * 10 Training Paths with structured lessons, quizzes, scenarios,
 * measurement practice, and chargeback simulations.
 */

export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'measurement' | 'photo_choice';
  question: string;
  options: QuizOption[];
  explanation: string;
  codeRef?: string;
}

export interface TrainingLesson {
  id: string;
  title: string;
  type: 'article' | 'quiz' | 'scenario' | 'measurement_practice' | 'chargeback_sim' | 'video';
  summary: string;
  bodyMarkdown?: string;
  videoUrl?: string;
  videoSource?: string;
  videoAttribution?: string;
  durationMinutes: number;
  quiz?: QuizQuestion[];
  scenario?: {
    situation: string;
    question: string;
    options: QuizOption[];
    correctAnswer: string;
    explanation: string;
  };
}

export interface TrainingPath {
  id: string;
  title: string;
  roleTarget: 'sales_rep' | 'manager' | 'auditor' | 'all';
  required: boolean;
  iconEmoji: string;
  description: string;
  estimatedMinutes: number;
  lessons: TrainingLesson[];
}

// ─────────────────────────────────────────────────────────────
// PATH 1 — New Sales Rep Bootcamp
// ─────────────────────────────────────────────────────────────

export const bootcampPath: TrainingPath = {
  id: 'path-bootcamp',
  title: 'New Sales Rep Bootcamp',
  roleTarget: 'sales_rep',
  required: true,
  iconEmoji: 'BOOTCAMP',
  description: 'Complete foundation for all new Window World Baton Rouge sales reps. Covers the full field process from lead to production handoff.',
  estimatedMinutes: 90,
  lessons: [
    {
      id: 'boot-l1',
      title: 'The Window World Sales System',
      type: 'article',
      summary: 'What this software does, why data accuracy matters, and what you own as a sales rep.',
      durationMinutes: 8,
      bodyMarkdown: `
## What You Own as a Sales Rep

From the moment you accept a lead until the signed job packet is submitted, **you own the job**. This includes:

- Lead acknowledgment and customer contact
- Appointment scheduling and confirmation
- Full property walk and sketch
- Every measurement (entered correctly with proper deduction rules)
- Every photo (interior and exterior for every opening)
- Product selection for every opening
- Quote accuracy and pricing
- Contract generation and signatures
- Follow-up scheduling
- Production handoff data quality

## Why Data Accuracy Matters

A simple measurement error in the field becomes a **$5,000+ mistake at the factory**. Wrong product = wrong window = return, remake, and re-install. The customer is unhappy. The company loses money. You lose credibility.

The software prevents these mistakes — **if you use it correctly**.

## The Auditor System

The system runs automated audits in the background. If you miss a tempered glass flag, forget a photo, or underprice a job, an Auditor will flag it and may **block your job from moving to production**. This protects everyone.

> "The auditor is not your enemy. It is your quality control partner."
`,
    },
    {
      id: 'boot-l2',
      title: 'The Daily Rep Workflow',
      type: 'article',
      summary: 'Morning prep, during appointment, and post-appointment procedures.',
      durationMinutes: 5,
      bodyMarkdown: `
## Morning Prep
1. Open dashboard — review today's appointments
2. Review new leads assigned to you
3. Review overdue follow-ups (these will hurt you at close)
4. Review any unsigned quotes
5. Review open auditor issues

## During the Appointment
1. Arrive on time — set expectations (90 min appointment)
2. Walk the FULL property before measuring anything
3. Create sketch — mark all openings and elevations
4. Measure each opening using correct deduction rule
5. Photograph: interior + exterior for every opening
6. Select products and options for every opening
7. Run the pricing review
8. Present the proposal
9. Generate contract if sold — capture signatures

## After the Appointment
1. Send quote recap to customer (use the Send Quote button)
2. Schedule follow-up task — REQUIRED before leaving
3. Mark lead status appropriately
4. Submit job packet or mark as unsold with a reason
`,
    },
    {
      id: 'boot-l3',
      title: 'Lead Management Basics',
      type: 'quiz',
      summary: 'Test your knowledge of lead handling rules.',
      durationMinutes: 5,
      quiz: [
        {
          id: 'q-lead-1',
          type: 'multiple_choice',
          question: 'What is the recommended time window to contact a new inbound lead for best conversion?',
          options: [
            { id: 'a', text: 'Within 5 minutes', isCorrect: true, explanation: 'Studies show conversion rates drop dramatically after 5 minutes for inbound leads.' },
            { id: 'b', text: 'Within 24 hours', isCorrect: false, explanation: 'Too slow — the lead may already be talking to a competitor.' },
            { id: 'c', text: 'Within 1 hour', isCorrect: false, explanation: 'Better than 24 hours, but still too slow for the best conversion rate.' },
            { id: 'd', text: 'Same day is fine', isCorrect: false, explanation: 'Same day may mean waiting 8 hours — lead will go cold.' },
          ],
          explanation: 'Inbound leads contacted within 5 minutes are 9× more likely to convert than leads contacted after 5 minutes.',
        },
        {
          id: 'q-lead-2',
          type: 'true_false',
          question: 'True or False: You can leave a lead in "New" status after the appointment date has passed without any consequences.',
          options: [
            { id: 'a', text: 'True', isCorrect: false, explanation: 'The Follow-Up Auditor will flag a stale lead status as a Level 2 Warning.' },
            { id: 'b', text: 'False', isCorrect: true, explanation: 'A lead left in New status after the appointment date triggers a Follow-Up Auditor warning.' },
          ],
          explanation: 'The Follow-Up Auditor monitors lead status changes and flags stale leads.',
        },
        {
          id: 'q-lead-3',
          type: 'multiple_choice',
          question: 'What must you do before leaving the quote screen after a customer says "I need to think about it"?',
          options: [
            { id: 'a', text: 'Mark the lead as Lost', isCorrect: false, explanation: 'It\'s not lost — the customer is still considering.' },
            { id: 'b', text: 'Set a specific follow-up date and task', isCorrect: true, explanation: 'The system requires a Next Action Date before the quote can be left in "Thinking" status.' },
            { id: 'c', text: 'Do nothing — just leave', isCorrect: false, explanation: 'Leaving with no next action is a Follow-Up Auditor Level 2 Warning.' },
            { id: 'd', text: 'Give a discount to seal the deal before leaving', isCorrect: false, explanation: 'Last-minute discounts on the way out destroy margin and credibility.' },
          ],
          explanation: 'Always schedule a specific follow-up before leaving — the system enforces this.',
        },
      ],
    },
    {
      id: 'boot-l4',
      title: 'Measurement Fundamentals Quiz',
      type: 'quiz',
      summary: 'Test your understanding of Cush Measure, brick rules, and photo requirements.',
      durationMinutes: 8,
      quiz: [
        {
          id: 'q-meas-1',
          type: 'multiple_choice',
          question: 'An existing window frame measures 36" wide × 48" tall (jamb to jamb). What dimensions do you enter into the app for a standard insert replacement?',
          options: [
            { id: 'a', text: '36" × 48" (actual measurements)', isCorrect: false, explanation: 'Entering actual measurements will produce a window too large to fit inside the frame.' },
            { id: 'b', text: '35-1/4" × 47-1/4" (Cush Measure applied)', isCorrect: true, explanation: 'Cush Measure: subtract 3/4" from width AND height → 35.25" × 47.25"' },
            { id: 'c', text: '35-1/2" × 47-1/2" (1/4" per side)', isCorrect: false, explanation: 'The deduction is 3/8" per side (3/4" total), not 1/4" per side.' },
            { id: 'd', text: '35" × 47" (round to nearest inch)', isCorrect: false, explanation: 'Never round to the nearest inch — work in 1/8" increments.' },
          ],
          explanation: 'Cush Measure: subtract 3/8" on each of the 4 sides = 3/4" total from width AND 3/4" total from height.',
        },
        {
          id: 'q-meas-2',
          type: 'multiple_choice',
          question: 'The exterior surface is brick. The brick-to-brick opening measures 38" wide × 52" tall. What dimensions do you enter?',
          options: [
            { id: 'a', text: '37-1/4" × 51-1/4" (Cush Measure)', isCorrect: false, explanation: 'Cush Measure is for wood-frame insert replacements, not brick openings.' },
            { id: 'b', text: '38" × 52" (actual brick opening)', isCorrect: false, explanation: 'Entering the full brick opening will produce a window too large to fit through masonry.' },
            { id: 'c', text: '37" × 51" (1/2" per side brick rule)', isCorrect: true, explanation: 'Brick rule: subtract 1/2" per side = 1" total from both width and height.' },
            { id: 'd', text: '36-1/2" × 50-1/2"', isCorrect: false, explanation: 'That would be 3/4" per side — incorrect for the brick rule.' },
          ],
          explanation: 'Brick openings: subtract 1/2" per side (1" total) from both width and height.',
        },
        {
          id: 'q-meas-3',
          type: 'true_false',
          question: 'True or False: You can skip the exterior photo for a window if you already have a clear interior photo.',
          options: [
            { id: 'a', text: 'True', isCorrect: false, explanation: 'Both interior and exterior photos are required. An interior photo alone does not show the exterior surface condition.' },
            { id: 'b', text: 'False', isCorrect: true, explanation: 'Both interior AND exterior photos are required for every opening. The Measurement Auditor will flag missing exterior photos.' },
          ],
          explanation: 'The Measurement Auditor checks for both interior and exterior photos on every opening.',
        },
        {
          id: 'q-meas-4',
          type: 'multiple_choice',
          question: 'You measure width at three points: top = 35-7/8", middle = 35-3/4", bottom = 35-5/8". Which measurement do you use?',
          options: [
            { id: 'a', text: '35-7/8" (largest)', isCorrect: false, explanation: 'Using the largest measurement will produce a window too large — it may not fit at the narrow point.' },
            { id: 'b', text: '35-3/4" (middle)', isCorrect: false, explanation: 'The middle measurement might be fine, but the industry standard is the smallest.' },
            { id: 'c', text: '35-5/8" (smallest)', isCorrect: true, explanation: 'Always use the smallest measurement to ensure the window fits at the tightest point of the opening.' },
            { id: 'd', text: 'Average all three', isCorrect: false, explanation: 'Averaging is not the Window World protocol. Use the smallest.' },
          ],
          explanation: 'Always measure at 3 points and use the smallest — this ensures the window fits through the tightest part of the opening.',
        },
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────
// PATH 2 — Window Identification
// ─────────────────────────────────────────────────────────────

export const windowIdPath: TrainingPath = {
  id: 'path-window-id',
  title: 'Window Type Identification',
  roleTarget: 'sales_rep',
  required: true,
  iconEmoji: 'WINDOW-ID',
  description: 'Learn to identify every Window World window type in the field — double hung, single hung, slider, picture, casement, bay/bow, oriel, mulled, and specialty shapes.',
  estimatedMinutes: 40,
  lessons: [
    {
      id: 'wid-l1',
      title: 'Double Hung vs Single Hung — The Critical Difference',
      type: 'quiz',
      summary: 'The most common mistake in the field: confusing single and double hung.',
      durationMinutes: 6,
      quiz: [
        {
          id: 'q-dh-1',
          type: 'multiple_choice',
          question: 'You are inside the home looking at a window. Both the top and bottom panes appear identical. The bottom sash slides up. How do you determine if it is single hung or double hung?',
          options: [
            { id: 'a', text: 'It is double hung if both panes are the same size', isCorrect: false, explanation: 'Size alone does not tell you the window type. Single hung windows can also have equal-sized panes.' },
            { id: 'b', text: 'Try to slide the top sash down or tilt it inward', isCorrect: true, explanation: 'A double hung window\'s top sash can be lowered or tilted inward. A single hung top sash is fixed and will not move.' },
            { id: 'c', text: 'Ask the homeowner', isCorrect: false, explanation: 'Homeowners often don\'t know. Always physically check the top sash yourself.' },
            { id: 'd', text: 'Assume double hung since they\'re more common', isCorrect: false, explanation: 'Assuming leads to ordering the wrong product. Always verify physically.' },
          ],
          explanation: 'Physically check if the top sash can be moved. Double hung = top AND bottom operate. Single hung = only bottom operates.',
        },
        {
          id: 'q-dh-2',
          type: 'true_false',
          question: 'True or False: A picture window can have a screen installed as an add-on option.',
          options: [
            { id: 'a', text: 'True', isCorrect: false, explanation: 'Picture windows are fixed units — they do not open and do not have screen hardware. Screens cannot be added.' },
            { id: 'b', text: 'False', isCorrect: true, explanation: 'Picture windows are fixed and ship WITHOUT screen hardware. No screen option exists — do not quote one.' },
          ],
          explanation: 'Picture windows do not open, therefore screens serve no purpose and are not available.',
        },
      ],
    },
    {
      id: 'wid-l2',
      title: 'Oriel (Top Sash) Measurement Simulator',
      type: 'measurement_practice',
      summary: 'Practice calculating oriel sash splits correctly.',
      durationMinutes: 8,
      scenario: {
        situation: 'You are measuring a 1/3-over-2/3 oriel double hung window. The actual opening is 36" wide × 60" tall. After applying Cush Measure, the revised dimensions are 35-1/4" wide × 59-1/4" tall.',
        question: 'Which of the following correctly represents the top sash height for a 1/3-over-2/3 oriel?',
        options: [
          { id: 'a', text: '≈ 19-3/4" top sash (59.25 × 0.333 = ~19.75")', isCorrect: true, explanation: 'Correct! Top sash = revised height × 1/3 fraction. 59.25 × 0.333 ≈ 19.75" ≈ 19-3/4"' },
          { id: 'b', text: '29-5/8" top sash (half the height)', isCorrect: false, explanation: 'That is a 50/50 split, not a 1/3 split.' },
          { id: 'c', text: '59-1/4" top sash (full height)', isCorrect: false, explanation: 'That is the total revised height, not the top sash alone.' },
          { id: 'd', text: '20" top sash (round to nearest inch)', isCorrect: false, explanation: 'Never round to the nearest inch — work in 1/8" increments and use the app\'s oriel calculator.' },
        ],
        correctAnswer: 'a',
        explanation: 'For a 1/3-over-2/3 oriel: Top sash = revised height × 0.333 ≈ 19-3/4". Bottom sash = revised height × 0.667 ≈ 39-1/2". Always use the app\'s Oriel Calculator — do not manually calculate in the field.',
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────
// PATH 3 — Tempered Glass and Safety Code
// ─────────────────────────────────────────────────────────────

export const temperedGlassPath: TrainingPath = {
  id: 'path-tempered',
  title: 'Tempered Glass and Safety Glazing (IRC R308.4)',
  roleTarget: 'sales_rep',
  required: true,
  iconEmoji: 'SAFETY',
  description: 'The single most critical safety compliance item in field sales. Master every R308.4 rule, know when to charge, and understand the liability of missing a tempered flag.',
  estimatedMinutes: 25,
  lessons: [
    {
      id: 'temp-l1',
      title: 'IRC R308.4 Tempered Glass Rules — Deep Dive',
      type: 'article',
      summary: 'Every rule that triggers a tempered glass requirement. Memorize these.',
      durationMinutes: 8,
      bodyMarkdown: `
## The 5 Tempered Glass Trigger Rules (IRC R308.4)

### R308.4.1 — Glass IN Doors
Any glazing in the panel of a swinging, sliding, or bifold door is **always tempered**.

### R308.4.2 — Glass Adjacent to Doors
Glass is tempered if ALL of these are true:
- Bottom exposed edge is **less than 60" from the floor**
- Glass is within **24" of a door** in the closed position

### R308.4.3 — Large Low Glass (Floor Hazard)
Glass is tempered if ALL three are true:
- Glass area **greater than 9 sq ft**
- Bottom edge **less than 18" from the floor**
- Top edge **greater than 36" above the floor**

### R308.4.5 — Wet Surfaces (Bathrooms/Showers)
Glass is tempered if:
- Bottom edge is **less than 60" above a standing surface**
- The glass is within **60" horizontally** of a tub, shower, spa, whirlpool, sauna, or steam room

### R308.4.7 — Stairways and Landings
Glass is tempered if it is adjacent to a stairway or landing.

---

## The Procedure in the Field

For EVERY window, ask yourself:
1. Is it IN a door? → Tempered
2. Is it within 24" of a door AND low? → Check R308.4.2
3. Is it a large picture window that starts near the floor? → Check R308.4.3 (9 sq ft + 18" rule)
4. Is there a tub, shower, spa, or sauna within 60" horizontally? → Check R308.4.5
5. Is it near stairs or a landing? → Check R308.4.7

> **Never guess. Measure the distance to the shower/tub and the distance to the floor before marking "not required."**
`,
    },
    {
      id: 'temp-l2',
      title: 'Tempered Glass — Field Scenarios Quiz',
      type: 'quiz',
      summary: '10 real-world scenarios — does it need tempered or not?',
      durationMinutes: 10,
      quiz: [
        {
          id: 'q-temp-1',
          type: 'multiple_choice',
          question: 'A bathroom window. Its sill is 42" above the floor. The closest edge of the shower enclosure is 48" away horizontally. Does it need tempered glass?',
          options: [
            { id: 'a', text: 'Yes — bathroom windows always need tempered', isCorrect: false, explanation: 'Tempered is not required just because it is a bathroom. The code requires proximity to a wet surface AND low glass height.' },
            { id: 'b', text: 'Yes — R308.4.5 applies: sill 42" < 60", shower 48" < 60"', isCorrect: true, explanation: 'The sill is below 60" from the floor AND the shower is within 60" horizontally → R308.4.5 triggers. Tempered REQUIRED.' },
            { id: 'c', text: 'No — the shower is not directly under the window', isCorrect: false, explanation: 'The code measures horizontal distance, not directly under. 48" < 60" triggers the rule.' },
            { id: 'd', text: 'No — the sill height is over 36"', isCorrect: false, explanation: '36" is not the relevant measurement here. The R308.4.5 threshold is 60" from the floor.' },
          ],
          explanation: 'R308.4.5: Glass within 60" horizontally of a tub/shower AND bottom edge < 60" from floor = TEMPERED REQUIRED.',
          codeRef: 'IRC R308.4.5',
        },
        {
          id: 'q-temp-2',
          type: 'multiple_choice',
          question: 'A large living room picture window. It is 8\'6" wide × 4\'0" tall. The bottom edge is 10" above the floor. Does it need tempered?',
          options: [
            { id: 'a', text: 'No — picture windows are exempted from tempered requirements', isCorrect: false, explanation: 'There is no exemption for picture windows in R308.4.3.' },
            { id: 'b', text: 'No — the glass area is under 9 sq ft', isCorrect: false, explanation: '8.5\' × 4\' = 34 sq ft — far over the 9 sq ft threshold.' },
            { id: 'c', text: 'Yes — all three R308.4.3 conditions are met', isCorrect: true, explanation: 'Glass area = 34 sq ft (>9), bottom edge 10" (<18"), top edge 58" (>36"). All three conditions met → TEMPERED REQUIRED.' },
            { id: 'd', text: 'Yes, but only if someone could trip and fall into it', isCorrect: false, explanation: 'The code is objective, not based on subjective hazard assessment. The math triggers it.' },
          ],
          explanation: 'R308.4.3 triggers when: area > 9 sq ft AND bottom < 18" from floor AND top > 36" from floor. This window meets all three.',
          codeRef: 'IRC R308.4.3',
        },
        {
          id: 'q-temp-3',
          type: 'multiple_choice',
          question: 'A sidelight window next to a front entry door. The sidelight\'s bottom edge is 6" from the floor. It is 18" from the door jamb. Does it need tempered?',
          options: [
            { id: 'a', text: 'Yes — it is within 24" of the door AND the bottom edge is below 60"', isCorrect: true, explanation: 'R308.4.2: glass within 24" of a door AND bottom < 60" from floor → TEMPERED REQUIRED.' },
            { id: 'b', text: 'No — sidelights are decorative and exempt', isCorrect: false, explanation: 'There is no exemption for sidelights. R308.4.2 explicitly applies to glazing adjacent to doors.' },
            { id: 'c', text: 'Only if the door is an outswing door', isCorrect: false, explanation: 'The door swing direction does not change the R308.4.2 proximity rule.' },
            { id: 'd', text: 'Yes, but only if the glass pane is over 9 sq ft', isCorrect: false, explanation: 'R308.4.2 does not have a 9 sq ft requirement — only R308.4.3 does.' },
          ],
          explanation: 'R308.4.2: Glass within 24" of a door AND bottom edge < 60" from floor = TEMPERED REQUIRED regardless of glass size.',
          codeRef: 'IRC R308.4.2',
        },
        {
          id: 'q-temp-4',
          type: 'true_false',
          question: 'True or False: If a customer says "We\'ve had this window for 20 years without tempered glass and it\'s fine" — you can skip the tempered requirement.',
          options: [
            { id: 'a', text: 'True', isCorrect: false, explanation: 'A new installation must meet current code regardless of the prior window\'s configuration.' },
            { id: 'b', text: 'False — a new installation must meet current code', isCorrect: true, explanation: 'When you install a new window, it must comply with the current adopted building code, regardless of what was there before.' },
          ],
          explanation: 'The new installation triggers code compliance — the prior window\'s configuration is irrelevant.',
        },
      ],
    },
    {
      id: 'temp-l3',
      title: 'Charging for Tempered Glass',
      type: 'scenario',
      summary: 'What to do when the tempered charge shows $0.',
      durationMinutes: 5,
      scenario: {
        situation: 'You have correctly selected "Full Tempered" on a large bathroom window. When you review the quote, the tempered glass line item shows $0.00. The total quote amount has not changed from the non-tempered price.',
        question: 'What is the correct action?',
        options: [
          { id: 'a', text: 'Submit the job — the software made the selection, so it must be correct', isCorrect: false, explanation: 'A $0 tempered charge means the pricing RULE is missing from the pricing table — the system selected the option but cannot price it.' },
          { id: 'b', text: 'Manually add the tempered charge as a custom line item', isCorrect: false, explanation: 'Manual overrides bypass the pricing table and can cause order form mismatches. This is not the correct fix.' },
          { id: 'c', text: 'Do not submit — contact your manager immediately and report the missing pricing rule', isCorrect: true, explanation: 'A $0 tempered charge indicates a missing pricing rule. The pricing admin must add the rule before this job can be correctly priced and submitted.' },
          { id: 'd', text: 'Deselect tempered and add a notes field saying "add tempered manually"', isCorrect: false, explanation: 'Deselecting tempered removes the safety requirement from the order. The factory will ship non-tempered glass.' },
        ],
        correctAnswer: 'c',
        explanation: 'A $0 tempered glass charge always means the pricing rule is missing. Do NOT submit. Contact manager immediately to get the pricing table updated.',
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────
// PATH 4 — Grids, Screens, and Obscure Glass
// ─────────────────────────────────────────────────────────────

export const glassOptionsPath: TrainingPath = {
  id: 'path-glass-options',
  title: 'Grids, Screens, and Obscure Glass',
  roleTarget: 'sales_rep',
  required: false,
  iconEmoji: 'GLASS',
  description: 'Master every glass and grid option — what each is, when to sell it, and how to charge correctly for all of them.',
  estimatedMinutes: 20,
  lessons: [
    {
      id: 'glass-l1',
      title: 'Grid Types Quiz',
      type: 'quiz',
      summary: 'Flat, contoured, and SDL grids — know the differences.',
      durationMinutes: 6,
      quiz: [
        {
          id: 'q-grid-1',
          type: 'multiple_choice',
          question: 'A customer says they want "grids that look like the original divided-light windows from the 1950s." Which grid type should you recommend?',
          options: [
            { id: 'a', text: 'Flat grid — Colonial pattern', isCorrect: false, explanation: 'Flat grids are inside the glass. They look simulated. A true 1950s-style look requires SDL.' },
            { id: 'b', text: 'Contoured grid — Prairie pattern', isCorrect: false, explanation: 'Contoured grids are still between the glass — more profile than flat but still simulated.' },
            { id: 'c', text: 'SDL (Simulated Divided Lights) — Colonial pattern', isCorrect: true, explanation: 'SDL uses individual glass panes separated by spacers — the most authentic reproduction of traditional divided-light windows.' },
            { id: 'd', text: 'No grid — clear glass is most authentic', isCorrect: false, explanation: 'The customer explicitly wants divided lights. Clear glass does not achieve this look.' },
          ],
          explanation: 'SDL is the most authentic reproduction of traditional divided-light windows and carries the premium price to match.',
        },
        {
          id: 'q-grid-2',
          type: 'true_false',
          question: 'True or False: A grid selected in the opening editor automatically generates a line item charge on the quote.',
          options: [
            { id: 'a', text: 'True', isCorrect: false, explanation: 'Not always — if the pricing rule for that grid type is missing, the line item will show $0. Always verify the charge appears.' },
            { id: 'b', text: 'False — you must verify the grid charge appears on the quote', isCorrect: true, explanation: 'The selection alone does not guarantee a charge. Always review the quote line items to confirm a non-zero grid charge.' },
          ],
          explanation: 'Always verify that the grid charge is non-zero on the quote. A $0 grid charge is a Pricing Auditor Level 2 Warning.',
        },
      ],
    },
    {
      id: 'glass-l2',
      title: 'Obscure Glass Scenarios',
      type: 'quiz',
      summary: 'When does obscure glass apply, and how do you charge for it?',
      durationMinutes: 5,
      quiz: [
        {
          id: 'q-obs-1',
          type: 'multiple_choice',
          question: 'A bathroom window requires BOTH tempered glass (R308.4.5 — shower within 5 feet) and privacy glass. What do you select in the app?',
          options: [
            { id: 'a', text: 'Full Tempered only — obscure is optional', isCorrect: false, explanation: 'Tempered is legally required. Obscure is a customer preference. If the customer wants obscure too, select both.' },
            { id: 'b', text: 'Full Obscure only — the privacy glass provides safety protection', isCorrect: false, explanation: 'Obscure glass alone does NOT meet the tempered/safety glazing standard. Both must be selected.' },
            { id: 'c', text: 'Full Tempered + Full Obscure — both options selected', isCorrect: true, explanation: 'When both conditions apply, select both options. They are separate upgrades that can be combined.' },
            { id: 'd', text: 'No selection needed — the factory defaults to this combination', isCorrect: false, explanation: 'There are no default combinations. You must explicitly select both options.' },
          ],
          explanation: 'Tempered and obscure are independent options that can be stacked. Always select both when both conditions apply.',
        },
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────
// PATH 5 — Door Sales and Measurement
// ─────────────────────────────────────────────────────────────

export const doorPath: TrainingPath = {
  id: 'path-doors',
  title: 'Doors — Entry, Patio, and Storm',
  roleTarget: 'sales_rep',
  required: true,
  iconEmoji: 'DOOR',
  description: 'Correct door handing, swing, measurement, and options — the #1 source of door order errors is wrong handing. Master it here.',
  estimatedMinutes: 25,
  lessons: [
    {
      id: 'door-l1',
      title: 'Door Handing — The #1 Error Source',
      type: 'quiz',
      summary: 'Always determine door handing from OUTSIDE. Test yourself here.',
      durationMinutes: 8,
      quiz: [
        {
          id: 'q-door-1',
          type: 'multiple_choice',
          question: 'You are standing OUTSIDE the front door, facing inward. The hinges are on your RIGHT side. The door swings toward you when opened. What is the correct handing?',
          options: [
            { id: 'a', text: 'Left Hand Inswing (LHI)', isCorrect: false, explanation: 'Hinges on your RIGHT from outside = RIGHT hand. The door swings IN (toward you) = inswing.' },
            { id: 'b', text: 'Right Hand Outswing (RHOS)', isCorrect: false, explanation: 'Hinges on the right is correct, but the door swings toward you from outside = inswing, not outswing.' },
            { id: 'c', text: 'Right Hand Inswing (RHI)', isCorrect: true, explanation: 'Standing outside: hinges on your RIGHT = Right Hand. Door swings toward you (into the home) = Inswing. → Right Hand Inswing (RHI).' },
            { id: 'd', text: 'Left Hand Outswing (LHOS)', isCorrect: false, explanation: 'Both handing and swing are wrong. Hinges on your right from outside = Right Hand.' },
          ],
          explanation: 'ALWAYS stand OUTSIDE. Hinges on your right from outside = Right Hand. Swings inward (toward you) = Inswing. Answer: RHI.',
        },
        {
          id: 'q-door-2',
          type: 'true_false',
          question: 'True or False: You can determine door handing by standing inside and noting which side the hinges are on.',
          options: [
            { id: 'a', text: 'True', isCorrect: false, explanation: 'Standing inside reverses the handing determination. You will get it backwards. Always stand OUTSIDE.' },
            { id: 'b', text: 'False — always stand OUTSIDE to determine handing', isCorrect: true, explanation: 'Handing is determined from outside looking in. Standing inside will give you the mirror image = wrong handing.' },
          ],
          explanation: 'Industry standard: stand outside the door facing inward. Hinge side = hand designation.',
        },
        {
          id: 'q-door-3',
          type: 'multiple_choice',
          question: 'A wrong door handing is discovered at installation. What typically happens?',
          options: [
            { id: 'a', text: 'The installer can flip the door on-site', isCorrect: false, explanation: 'Pre-hung doors cannot be "flipped" — the frame, hinges, and hardware are built in for the specific handing.' },
            { id: 'b', text: 'The door must be returned, a new door ordered, and the installation rescheduled', isCorrect: true, explanation: 'Wrong handing = the door cannot be installed. The unit must be returned, a new one ordered (2–4 weeks), and installation rescheduled. Customer is unhappy. Chargeback risk.' },
            { id: 'c', text: 'The installer can swap the hinges to the other side', isCorrect: false, explanation: 'Factory pre-hung doors have the hinge mortises, weatherstripping, and hardware prep set for a specific handing. This cannot be reversed.' },
            { id: 'd', text: 'Nothing — the installer will find a workaround', isCorrect: false, explanation: 'There is no workaround for wrong door handing. Full return and reorder.' },
          ],
          explanation: 'Wrong door handing = full return, new order, rescheduled installation, unhappy customer, chargeback risk. Verify handing carefully every time.',
        },
      ],
    },
    {
      id: 'door-l2',
      title: 'Storm Door Measurement Scenario',
      type: 'scenario',
      summary: 'What to measure for a storm door installation.',
      durationMinutes: 5,
      scenario: {
        situation: 'A customer wants to add a storm door over their existing front entry door. The door frame (jamb to jamb) measures 38" wide. The actual door face (the door slab itself) measures 36" wide. The trim/casing on the outside measures 42" wide.',
        question: 'What measurement do you enter for the storm door width?',
        options: [
          { id: 'a', text: '38" (frame jamb to jamb)', isCorrect: false, explanation: 'The frame measurement is for entry door replacements, not storm doors.' },
          { id: 'b', text: '36" (actual door face width)', isCorrect: true, explanation: 'Storm doors are ordered to fit the actual door face. 36" is the standard door face width.' },
          { id: 'c', text: '42" (trim to trim)', isCorrect: false, explanation: 'Measuring from trim to trim gives you the casing width, not the door face. The storm door would be too wide.' },
          { id: 'd', text: '37" (some other dimension)', isCorrect: false, explanation: 'Storm doors are manufactured in standard widths: 32", 34", and 36". Always measure the actual door face to determine the correct size.' },
        ],
        correctAnswer: 'b',
        explanation: 'Storm doors are measured by the DOOR FACE width — the actual slab, not the frame, not the trim. Standard widths: 32", 34", 36".',
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────
// PATH 6 — Chargeback Prevention
// ─────────────────────────────────────────────────────────────

export const chargebackPath: TrainingPath = {
  id: 'path-chargeback',
  title: 'Chargeback Prevention',
  roleTarget: 'sales_rep',
  required: true,
  iconEmoji: 'SHIELD',
  description: 'The most expensive mistakes in window sales happen because of undocumented conditions, wrong measurements, and missed charges. This path teaches you to protect yourself and the company.',
  estimatedMinutes: 25,
  lessons: [
    {
      id: 'cb-l1',
      title: 'Top 10 Chargeback Scenarios',
      type: 'article',
      summary: 'The most common and expensive field sales errors at Window World BTR.',
      durationMinutes: 10,
      bodyMarkdown: `
## The 10 Most Common Chargebacks at Window World BTR

### 1. Wrong Window Size
**Cause:** Using Cush Measure on a brick opening, or entering actual dimensions instead of revised.
**Cost:** Full return and remanufacture — 3–6 week delay, customer is furious.
**Fix:** Double-check exterior surface type before applying deduction rule.

### 2. Wrong Door Handing
**Cause:** Determining handing from inside the home.
**Cost:** Full door return, new order, rescheduled installation.
**Fix:** Always stand OUTSIDE. Hinges on your right from outside = Right Hand.

### 3. Missing Tempered Glass
**Cause:** Not checking R308.4.5 (shower proximity) or R308.4.3 (low-to-floor large pane).
**Cost:** Wrong product installed. Recall. Re-order. Customer communication nightmare.
**Fix:** Always measure shower-to-window distance and floor-to-bottom-edge distance.

### 4. Rotten Frame Not Documented
**Cause:** Rep chose an insert quote without probing the sill or jamb for rot.
**Cost:** Installer arrives, discovers the pocket is unusable. Job stops. Change order dispute.
**Fix:** Always probe the wood with a pen or key. Photograph any soft spots.

### 5. Missing Photo — Production Blocked
**Cause:** Rep forgot to photograph one or more openings.
**Cost:** Job is blocked at Final Lockdown Review. Rep has to go back to the home.
**Fix:** Take interior AND exterior photos for EVERY opening before leaving the home.

### 6. Access Issue Not Documented
**Cause:** Installer arrives to find a locked gate, aggressive dog, or no-access area.
**Cost:** Trip charge, rescheduled visit, customer conflict.
**Fix:** Always ask: "Is there anything that could affect the installer's access?" Document it.

### 7. Specialty Shape Not Priced Correctly
**Cause:** Rep priced an arch or circle at standard DH rates.
**Cost:** Underpriced job. Company loses margin. Auditor flag.
**Fix:** Use the Specialty Builder tool. Flag all specialty shapes for manager pricing review.

### 8. Product Promised Not in System
**Cause:** Rep verbally agreed to an upgrade (grids, hardware, color) but did not enter it.
**Cost:** Factory ships standard product. Customer disputes. Change order needed.
**Fix:** EVERYTHING promised must be in the app. No verbal-only agreements.

### 9. Wrong Exterior Surface Selected
**Cause:** Rep selected "wood" when it is actually brick — used Cush Measure instead of brick rule.
**Cost:** Window is 1" too large. Cannot fit through masonry. Full return and remeasure.
**Fix:** Always walk outside and visually confirm the exterior surface before selecting.

### 10. Job Submitted with $0 Tempered Charge
**Cause:** Tempered glass selected but the pricing rule is missing.
**Cost:** Non-tempered glass shipped. Safety violation. Recall.
**Fix:** Always verify tempered charge is non-zero on the quote before submitting.
`,
    },
    {
      id: 'cb-l2',
      title: 'Chargeback Simulation — Find the Errors',
      type: 'quiz',
      summary: 'You are reviewing a submitted job that got flagged. Find the errors.',
      durationMinutes: 10,
      quiz: [
        {
          id: 'q-cb-1',
          type: 'multiple_choice',
          question: 'A rep submitted a job with a 48×72 picture window in the living room. The bottom of the window is 8" from the floor. The glass area is 24 sq ft. The quote shows ZERO tempered glass charge. What is wrong?',
          options: [
            { id: 'a', text: 'Nothing is wrong — picture windows don\'t need tempered', isCorrect: false, explanation: 'Picture windows are not exempt from tempered requirements.' },
            { id: 'b', text: 'The rep forgot to check R308.4.3: 24 sq ft > 9 sq ft AND bottom 8" < 18" from floor', isCorrect: true, explanation: 'R308.4.3 requires tempered when glass area > 9 sq ft AND bottom edge < 18" from floor AND top > 36". All conditions met. Tempered required AND charge must appear.' },
            { id: 'c', text: 'The charge should be there but the system deleted it', isCorrect: false, explanation: 'The system does not delete charges. The tempered glass was never selected.' },
            { id: 'd', text: 'The picture window should have a screen, not tempered glass', isCorrect: false, explanation: 'Picture windows have no screen. The tempered glass issue is completely separate.' },
          ],
          explanation: 'Missed R308.4.3: glass area > 9 sq ft AND bottom < 18" from floor = tempered required. The charge is $0 because the option was never selected.',
        },
        {
          id: 'q-cb-2',
          type: 'multiple_choice',
          question: 'An installer calls from the job site. He says the patio door\'s right panel is fixed but the order shows it should be operating. The customer wanted OX (operating on right). The order was submitted as XO (operating on left). Who made this error and what is the financial consequence?',
          options: [
            { id: 'a', text: 'The factory made the error — they should fix it for free', isCorrect: false, explanation: 'The factory manufactured what was ordered. If the order was wrong, the sales rep is responsible.' },
            { id: 'b', text: 'The sales rep entered the wrong OX/XO designation — full return and reorder at rep\'s commission impact', isCorrect: true, explanation: 'The rep selected XO instead of OX. Full return, reorder, rescheduled installation. The rep\'s performance metrics are impacted.' },
            { id: 'c', text: 'The installer installed it wrong and should fix it', isCorrect: false, explanation: 'The installer installed what was ordered. The order itself was wrong.' },
            { id: 'd', text: 'Nobody — it is a minor issue that can be adjusted on-site', isCorrect: false, explanation: 'Patio door panel configuration cannot be reversed on-site. It is a factory-configured product.' },
          ],
          explanation: 'Patio door panel configuration (OX vs XO) must be verified in the home before submitting. Wrong configuration = full return and reorder.',
        },
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────
// PATH 7 — Manager Training: Auditor Review
// ─────────────────────────────────────────────────────────────

export const managerAuditorPath: TrainingPath = {
  id: 'path-manager-auditor',
  title: 'Manager: Auditor Review and Rep Coaching',
  roleTarget: 'manager',
  required: true,
  iconEmoji: 'AUDIT',
  description: 'For sales managers and auditors: how to review flagged jobs, understand each auditor level, coach reps on common issues, and use the Manager Dashboard effectively.',
  estimatedMinutes: 30,
  lessons: [
    {
      id: 'mgr-l1',
      title: 'The 4 Auditor Severity Levels',
      type: 'article',
      summary: 'What each level means, what action it requires, and what blocks production.',
      durationMinutes: 10,
      bodyMarkdown: `
## The 4 Severity Levels

### Level 1 — Minor
- Examples: Optional note missing, photo label missing, minor data quality issue
- Action: Notify rep, add to issue list, workflow continues
- Blocks Production: No

### Level 2 — Warning
- Examples: Missing room label, quote has no next action, abnormal measurement, incomplete product option
- Action: Rep must correct or provide explanation — warning visible on dashboard
- Blocks Production: No (but cannot finalize if required fields affected)

### Level 3 — Critical
- Examples: Missing signature, missing required measurement, missing tempered glass answer, quote/contract total mismatch
- Action: Block submission, notify rep AND manager, require correction before moving forward
- Blocks Production: YES

### Level 4 — Business Risk
- Examples: Job submitted with incomplete measurements, contract legally incomplete, underpriced below margin, safety glass requirement ignored, production packet incomplete
- Action: Lock job from production, escalate to Admin/GM, require documented resolution
- Blocks Production: YES — until resolved AND approved

---

## Manager Actions by Level

| Level | Manager Role |
|-------|-------------|
| 1 | Monitor in dashboard, coach rep at weekly review |
| 2 | Assign correction task, follow up within 24 hours |
| 3 | Review within 4 hours, provide resolution path |
| 4 | Immediate escalation — do not allow job to move forward |
`,
    },
    {
      id: 'mgr-l2',
      title: 'Manager Dashboard KPIs Quiz',
      type: 'quiz',
      summary: 'Test your knowledge of manager-level dashboard metrics.',
      durationMinutes: 8,
      quiz: [
        {
          id: 'q-mgr-1',
          type: 'multiple_choice',
          question: 'Rep A has submitted 8 jobs this month. 6 have been flagged with Level 3 Critical issues (mostly missing photos and tempered flags). As their manager, what is the correct action?',
          options: [
            { id: 'a', text: 'Resolve the issues yourself to keep jobs moving', isCorrect: false, explanation: 'Resolving issues for the rep prevents learning and creates dependency. The rep must learn to do this correctly.' },
            { id: 'b', text: 'Schedule a ride-along focused on photo capture and glass safety rules', isCorrect: true, explanation: 'A pattern of the same errors (photos, tempered) points to a training gap. A targeted ride-along directly addresses the specific failure mode.' },
            { id: 'c', text: 'Wait and see if it improves next month', isCorrect: false, explanation: 'Waiting allows the pattern to continue. These issues cost money and may represent safety liability.' },
            { id: 'd', text: 'Send the rep a list of all the rules and tell them to re-read the manual', isCorrect: false, explanation: 'Rep has likely read the manual. Field reinforcement is needed — a ride-along shows the rep what correct looks like in the real home.' },
          ],
          explanation: 'Repeated Level 3 issues with the same root cause require targeted field coaching, not just documentation review.',
        },
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────
// PATH 8 — Siding and Exterior Conditions
// ─────────────────────────────────────────────────────────────

export const sidingPath: TrainingPath = {
  id: 'path-siding',
  title: 'Siding, Elevations, and Exterior Conditions',
  roleTarget: 'sales_rep',
  required: false,
  iconEmoji: 'SIDING',
  description: 'Siding measurement, elevation documentation, clear story charges, and exterior surface condition identification.',
  estimatedMinutes: 20,
  lessons: [
    {
      id: 'sid-l1',
      title: 'Siding Elevation Quiz',
      type: 'quiz',
      summary: 'Calculate gross, deductions, and net square footage per elevation.',
      durationMinutes: 8,
      quiz: [
        {
          id: 'q-sid-1',
          type: 'multiple_choice',
          question: 'The rear elevation of a home is 45\' wide and 12\' tall. There are two windows (each 3\'×4\') and one door (3\'×7\'). What is the NET square footage after deductions?',
          options: [
            { id: 'a', text: '540 sq ft (gross only, no deductions)', isCorrect: false, explanation: 'Always deduct openings from the gross area.' },
            { id: 'b', text: '507 sq ft (gross 540, deduct two 12 sq ft windows = 24, deduct one 21 sq ft door = 21, net = 495)', isCorrect: false, explanation: 'Close — but 540 - 24 - 21 = 495, not 507.' },
            { id: 'c', text: '495 sq ft (gross 540, deduct 24 sq ft windows, deduct 21 sq ft door)', isCorrect: true, explanation: 'Gross = 45 × 12 = 540. Window deductions: 2 × (3×4) = 24 sq ft. Door deduction: 3×7 = 21 sq ft. Net = 540 - 24 - 21 = 495 sq ft.' },
            { id: 'd', text: '540 sq ft plus 10% waste = 594 sq ft', isCorrect: false, explanation: 'Waste is added AFTER deductions, not before. And you must deduct first.' },
          ],
          explanation: 'Net SF = (width × height) - Σ(opening area). Then add 10% waste factor. 540 - 45 = 495 net, then 495 × 1.10 = 544.5 sq ft with waste.',
        },
        {
          id: 'q-sid-2',
          type: 'true_false',
          question: 'True or False: If a customer only wants siding on two sides of the house, you only need to document those two elevations.',
          options: [
            { id: 'a', text: 'True', isCorrect: false, explanation: 'While only two sides are being quoted, it is best practice to document all four elevations so future work and full-house quotes are easier. Also, installers need accurate context.' },
            { id: 'b', text: 'False — document all four elevations for full context', isCorrect: true, explanation: 'Even for partial siding jobs, documenting all four elevations gives installers complete context and makes future quotes faster.' },
          ],
          explanation: 'Document all four elevations even for partial jobs — it takes two minutes extra and saves hours of confusion later.',
        },
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────
// PATH 9 — Contract Accuracy and Production Handoff
// ─────────────────────────────────────────────────────────────

export const contractAccuracyPath: TrainingPath = {
  id: 'path-contract',
  title: 'Contract Accuracy and Production Handoff',
  roleTarget: 'sales_rep',
  required: true,
  iconEmoji: 'CONTRACT',
  description: 'The contract must match the quote. The production packet must be complete. Learn the exact steps for a clean, unblocked production handoff.',
  estimatedMinutes: 20,
  lessons: [
    {
      id: 'ct-l1',
      title: 'Quote vs Contract Mismatch — Prevention',
      type: 'quiz',
      summary: 'Understanding why totals must match and what happens when they don\'t.',
      durationMinutes: 8,
      quiz: [
        {
          id: 'q-ct-1',
          type: 'multiple_choice',
          question: 'A rep generates a contract from a quote for $12,450. The customer then negotiates a $200 discount. The rep accepts and verbally agrees. The signed contract still shows $12,450. What is the correct action?',
          options: [
            { id: 'a', text: 'Write "$200 discount agreed verbally" in the contract notes', isCorrect: false, explanation: 'Handwritten notes on a signed contract are legally questionable and operationally untrackable.' },
            { id: 'b', text: 'Revise the quote to $12,250, generate a NEW contract document, and have the customer re-sign', isCorrect: true, explanation: 'Any price change requires a quote revision, a new contract document generated from the revised quote, and new customer signatures.' },
            { id: 'c', text: 'Nothing — the customer agreed verbally, which is enough', isCorrect: false, explanation: 'Verbal agreements for price changes are unenforceable and create disputes during installation and payment.' },
            { id: 'd', text: 'Create a discount line item in the existing contract', isCorrect: false, explanation: 'You cannot modify a signed contract after signing. A new document is required.' },
          ],
          explanation: 'Any price change requires: revise the quote → generate new contract → new signatures. Quote total and contract total must match exactly.',
        },
      ],
    },
    {
      id: 'ct-l2',
      title: 'Final Lockdown Review Checklist',
      type: 'article',
      summary: 'The exact pre-submission checklist for every sold job.',
      durationMinutes: 8,
      bodyMarkdown: `
## Final Lockdown Review — Complete Checklist

Run this before hitting "Submit to Production" on any sold job.

### Sketch and Measurements
- [ ] All openings are numbered and labeled on the sketch
- [ ] Every opening has a room/location label
- [ ] Measurement deduction rule was applied correctly (Cush or Brick)
- [ ] Specialty units use the Specialty Builder tool
- [ ] Mulled units are joined in the sketch
- [ ] All elevations labeled (Front/Left/Right/Rear)

### Photos
- [ ] Interior photo for EVERY opening
- [ ] Exterior photo for EVERY opening
- [ ] Any rot, damage, or special condition is photographed
- [ ] Specialty shape: front-facing photo exists

### Product Selections
- [ ] Product type selected for every opening
- [ ] Color selected (interior and exterior where applicable)
- [ ] Grid type and pattern documented (if selected)
- [ ] Glass type correct (tempered, obscure, Low-E, clear)
- [ ] Screen type confirmed (or "No Screen" for picture windows)

### Pricing
- [ ] All chargeable options have non-zero charges
- [ ] Tempered glass line item shows correct amount (NOT $0)
- [ ] Quote total matches contract total exactly

### Contract
- [ ] Customer legal name complete and correct
- [ ] Job address confirmed
- [ ] Payment terms filled in
- [ ] Customer signature(s) captured
- [ ] Any required disclosures initialed
- [ ] Contract copy sent to customer

### Install Notes
- [ ] Access issues documented
- [ ] Special conditions noted (rot, obstructions, difficult access)
- [ ] Customer contact info current
`,
    },
  ],
};

// ─────────────────────────────────────────────────────────────
// PATH 10 — Advanced: Field Simulation Bootcamp
// ─────────────────────────────────────────────────────────────

export const advancedSimPath: TrainingPath = {
  id: 'path-advanced-sim',
  title: 'Advanced Field Simulation',
  roleTarget: 'all',
  required: false,
  iconEmoji: 'ADVANCED',
  description: 'Full end-to-end simulated appointments. Test your knowledge under realistic field conditions — complex jobs, multiple product types, tricky glass conditions, and difficult customers.',
  estimatedMinutes: 45,
  lessons: [
    {
      id: 'sim-l1',
      title: 'Complex Job Simulation — 12 Windows + Door + Siding',
      type: 'scenario',
      summary: 'A full appointment simulation with multiple product types and special conditions.',
      durationMinutes: 15,
      scenario: {
        situation: 'You arrive at a 2-story brick home. The customer wants: 8 double hung windows (floors 1 and 2), 1 bathroom double hung (12" from shower), 1 large picture window in living room (bottom edge 6" from floor, 36 sq ft), 1 front entry door (hinges on the right from outside, swings inward), and rear siding. The 2nd floor rear siding wall is 22\' tall.',
        question: 'Which of the following represents the COMPLETE set of special conditions and charges that must be applied?',
        options: [
          {
            id: 'a',
            text: 'No special conditions — all standard units',
            isCorrect: false,
            explanation: 'This job has multiple special conditions that must all be correctly identified and charged.',
          },
          {
            id: 'b',
            text: 'Tempered on bathroom window + tempered on picture window + RHI door handing + brick measure + clear story siding charge',
            isCorrect: true,
            explanation: 'Bathroom window: R308.4.5 (within 60" of shower). Picture window: R308.4.3 (36 sq ft > 9, bottom 6" < 18" from floor). Door: hinges on right from outside, swings in = RHI. All windows: brick measure with 1/2" per side. Rear siding 22\' wall: clear story charge triggers. All five conditions correctly identified.',
          },
          {
            id: 'c',
            text: 'Tempered on bathroom window only — picture windows are exempt',
            isCorrect: false,
            explanation: 'Picture windows are NOT exempt from R308.4.3. A 36 sq ft picture window with its bottom 6" from the floor absolutely requires tempered glass.',
          },
          {
            id: 'd',
            text: 'Cush measure on all windows + RHI door',
            isCorrect: false,
            explanation: 'The exterior is brick. Brick openings use the 1/2" per side brick rule, NOT Cush Measure. Using Cush Measure on brick openings produces windows 1/4" too large.',
          },
        ],
        correctAnswer: 'b',
        explanation: 'A complete complex job requires identifying: safety glazing triggers (bathroom R308.4.5, picture R308.4.3), door handing (RHI from outside), measurement rule (brick = 1/2" per side), and labor charges (clear story at 22\' wall height).',
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────
// MASTER EXPORT
// ─────────────────────────────────────────────────────────────

export const allTrainingPaths: TrainingPath[] = [
  bootcampPath,
  windowIdPath,
  temperedGlassPath,
  glassOptionsPath,
  doorPath,
  chargebackPath,
  managerAuditorPath,
  sidingPath,
  contractAccuracyPath,
  advancedSimPath,
];


export const trainingResourceLinks = [
  {
    title: 'How to Measure Replacement Windows',
    category: 'Measurement',
    sourceType: 'external',
    url: 'https://www.windowworld.com/resources',
    attribution: 'Window World Inc.',
    note: 'Official Window World measuring guidance. Verify URL is still active.',
  },
  {
    title: 'IRC R308 Safety Glazing Requirements (2021)',
    category: 'Code Compliance',
    sourceType: 'code_reference',
    url: 'https://codes.iccsafe.org/content/IRC2021P2/chapter-3-building-planning',
    attribution: 'International Code Council (ICC)',
    note: 'Public access to the 2021 IRC code text.',
  },
  {
    title: 'Double Hung vs Single Hung Windows Explained',
    category: 'Window Types',
    sourceType: 'educational',
    url: 'https://www.thisoldhouse.com/windows/reviews/double-hung-vs-single-hung',
    attribution: 'This Old House',
    note: 'Clear comparison guide. Use for rep training on window type identification.',
  },
  {
    title: 'How to Determine Door Handing',
    category: 'Doors',
    sourceType: 'educational',
    url: 'https://www.diy.com/ideas/door-handing',
    attribution: 'DIY / Educational Resource',
    note: 'Visual guide to handing determination. Confirm link is active before sharing.',
  },
];


