// ═══════════════════════════════════════════════════════════════
// Window World — Louisiana Safety Glazing / Tempered Glass Rules
// Configurable rule engine for flagging hazardous glazing locations.
//
// IMPORTANT DISCLAIMER:
// This tool assists the sales rep in identifying LIKELY safety-glazing
// situations per Louisiana law and general code guidance. It does NOT
// constitute legal or code compliance verification. Final determination
// must be made by Window World management, local code officials, or the
// Louisiana State Fire Marshal. Rules are admin-configurable.
// ═══════════════════════════════════════════════════════════════

export type SafetyGlazingSource = 'manual' | 'voice' | 'text' | 'ai' | 'rule' | 'wizard_question';
export type TemperedDecision = 'yes' | 'no' | 'unsure' | 'not_reviewed';
export type SafetyReviewStatus = 'not_started' | 'reviewed' | 'unsure' | 'override' | 'flagged';

export interface SafetyGlazingRule {
  id: string;
  name: string;
  category: SafetyGlazingCategory;
  description: string;
  isActive: boolean;
  jurisdiction: string; // e.g. 'LA', 'ALL'
  severity: 'high' | 'medium' | 'low';
  /** Returns true when this rule should fire for the given opening */
  triggerFn: (opening: any, notes?: string) => boolean;
  /** Human-readable explanation shown to the rep */
  flagReason: string;
  /** Keywords this rule listens for in voice/text */
  voiceKeywords: string[];
  requiresPhoto: boolean;
  photoHint?: string;
  legalNote: string;
}

export type SafetyGlazingCategory =
  | 'door_adjacent'
  | 'wet_area'
  | 'low_to_floor'
  | 'stair_landing'
  | 'large_panel'
  | 'impact_risk'
  | 'manual_flag';

export interface SafetyGlazingFlag {
  ruleId: string;
  ruleName: string;
  category: SafetyGlazingCategory;
  severity: 'high' | 'medium' | 'low';
  flagReason: string;
  sourceType: SafetyGlazingSource;
  sourcePhrase?: string;
  confidence: number; // 0-1
  requiresPhoto: boolean;
  photoHint?: string;
}

export interface OpeningSafetyReview {
  openingId?: string;
  openingNumber: number;
  safetyReviewStatus: SafetyReviewStatus;
  temperedRequired: TemperedDecision;
  temperedFull: boolean;
  temperedHalf: boolean;
  flaggedReasons: string[];
  flags: SafetyGlazingFlag[];
  sourceType: SafetyGlazingSource;
  sourcePhrase?: string;
  confidenceScore: number;
  overrideReason?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  metadata?: Record<string, any>;
  // Wizard questions answers
  wizardAnswers?: WizardSafetyAnswers;
}

export interface WizardSafetyAnswers {
  isInOrPartOfDoor?: boolean;
  isNextToDoor?: boolean;
  isInWetArea?: boolean;
  isCloseToFloor?: boolean;
  isNearStairs?: boolean;
  isLargeFixedPanel?: boolean;
  isHighTrafficArea?: boolean;
  unsureAboutTempered?: boolean;
  childArea?: boolean;
  impactRisk?: boolean;
  codeReviewNeeded?: boolean;
}

// ─── LOUISIANA SAFETY GLAZING RULES (CONFIGURABLE) ──────────
// These are seeded from DB in production; this is the local/fallback config.
export const LA_SAFETY_GLAZING_RULES: SafetyGlazingRule[] = [

  // ── CATEGORY 1: DOOR / DOOR-ADJACENT ────────────────────
  {
    id: 'sg-sliding-glass-door',
    name: 'Sliding Glass Door',
    category: 'door_adjacent',
    description: 'Sliding glass doors require safety glazing under Louisiana law.',
    isActive: true,
    jurisdiction: 'LA',
    severity: 'high',
    triggerFn: (op) => {
      const cat = norm(op.productCategory, op.model);
      const room = norm(op.roomLocation);
      const notes = norm(op.installNotes, op.customerNotes);
      return cat.includes('sliding') || cat.includes('slider') ||
        cat.includes('patio') || cat.includes('patio_door') ||
        room.includes('sliding') ||
        notes.includes('sliding door') || notes.includes('patio door');
    },
    flagReason: 'Sliding glass door — safety glazing required by Louisiana law.',
    voiceKeywords: ['sliding door', 'sliding glass door', 'patio door', 'patio'],
    requiresPhoto: true,
    photoHint: 'Take photo showing full door/panel and track area.',
    legalNote: 'LA RS 40:1579 / State Uniform Construction Code: Safety glazing required in sliding doors.',
  },

  {
    id: 'sg-entrance-door',
    name: 'Entrance / Storm Door',
    category: 'door_adjacent',
    description: 'Glass entrance doors and storm doors require safety glazing.',
    isActive: true,
    jurisdiction: 'LA',
    severity: 'high',
    triggerFn: (op) => {
      const cat = norm(op.productCategory, op.model);
      const room = norm(op.roomLocation);
      const notes = norm(op.installNotes, op.customerNotes);
      return cat.includes('door') || cat.includes('entrance') || cat.includes('storm door') ||
        room.includes('entry') || room.includes('entrance') || room.includes('foyer') ||
        notes.includes('entrance door') || notes.includes('storm door') || notes.includes('front door');
    },
    flagReason: 'Glass entrance/storm door — safety glazing required.',
    voiceKeywords: ['entrance door', 'storm door', 'front door', 'entry door', 'glass door'],
    requiresPhoto: true,
    photoHint: 'Take photo showing door and surrounding frame.',
    legalNote: 'Safety glazing required in glass entrance doors and storm doors.',
  },

  {
    id: 'sg-sidelight-near-door',
    name: 'Sidelight / Glass Adjacent to Door',
    category: 'door_adjacent',
    description: 'Fixed/operable glass panel within 24" of a door requires safety glazing review.',
    isActive: true,
    jurisdiction: 'LA',
    severity: 'high',
    triggerFn: (op) => {
      const room = norm(op.roomLocation);
      const notes = norm(op.installNotes, op.customerNotes);
      return room.includes('sidelight') || room.includes('side light') ||
        notes.includes('sidelight') || notes.includes('next to door') ||
        notes.includes('beside door') || notes.includes('adjacent to door') ||
        notes.includes('next to entry') || notes.includes('door adjacent');
    },
    flagReason: 'Sidelight or glass adjacent to a door — may require safety glazing.',
    voiceKeywords: ['sidelight', 'side light', 'next to door', 'beside door', 'door adjacent', 'adjacent to door'],
    requiresPhoto: true,
    photoHint: 'Take photo showing glass proximity to door.',
    legalNote: 'Glass panels within 24" of a door edge may require safety glazing.',
  },

  // ── CATEGORY 2: WET AREAS ────────────────────────────────
  {
    id: 'sg-bathroom',
    name: 'Bathroom Window',
    category: 'wet_area',
    description: 'Bathroom windows near tubs or showers may require safety glazing.',
    isActive: true,
    jurisdiction: 'LA',
    severity: 'high',
    triggerFn: (op) => {
      const room = norm(op.roomLocation);
      const notes = norm(op.installNotes, op.customerNotes);
      return room.includes('bath') || room.includes('restroom') || room.includes('lavatory') ||
        notes.includes('bathroom') || notes.includes('restroom');
    },
    flagReason: 'Bathroom window — review for safety glazing if near tub/shower.',
    voiceKeywords: ['bathroom', 'bath', 'restroom', 'lavatory'],
    requiresPhoto: true,
    photoHint: 'Take photo showing window relative to tub/shower.',
    legalNote: 'Safety glazing required within 60" of drain and within 60" measured horizontally of a tub/shower.',
  },

  {
    id: 'sg-shower-tub',
    name: 'Shower / Tub Enclosure',
    category: 'wet_area',
    description: 'Glass in shower doors and bathtub enclosures requires safety glazing per Louisiana law.',
    isActive: true,
    jurisdiction: 'LA',
    severity: 'high',
    triggerFn: (op) => {
      const room = norm(op.roomLocation);
      const notes = norm(op.installNotes, op.customerNotes);
      return room.includes('shower') || room.includes('tub') || room.includes('bathtub') ||
        notes.includes('shower') || notes.includes('tub') || notes.includes('bathtub') ||
        notes.includes('bath enclosure') || notes.includes('shower door') || notes.includes('tub enclosure');
    },
    flagReason: 'Shower or tub area — safety glazing required by Louisiana law.',
    voiceKeywords: ['shower', 'tub', 'bathtub', 'shower door', 'tub enclosure', 'bath enclosure'],
    requiresPhoto: true,
    photoHint: 'Take photo of tub/shower enclosure and window.',
    legalNote: 'LA State Uniform Construction Code: shower doors, bathtub enclosures require safety glazing.',
  },

  {
    id: 'sg-pool-spa',
    name: 'Pool / Spa / Hot Tub Area',
    category: 'wet_area',
    description: 'Glass adjacent to pool or spa areas may require safety glazing.',
    isActive: true,
    jurisdiction: 'LA',
    severity: 'medium',
    triggerFn: (op) => {
      const room = norm(op.roomLocation);
      const notes = norm(op.installNotes, op.customerNotes);
      return room.includes('pool') || room.includes('spa') || room.includes('hot tub') ||
        notes.includes('pool') || notes.includes('spa') || notes.includes('hot tub');
    },
    flagReason: 'Pool/spa area — safety glazing may be required.',
    voiceKeywords: ['pool', 'spa', 'hot tub', 'jacuzzi'],
    requiresPhoto: false,
    legalNote: 'Safety glazing should be reviewed for glass adjacent to pool and spa areas.',
  },

  // ── CATEGORY 3: LOW TO FLOOR / WALKING SURFACE ──────────
  {
    id: 'sg-low-window',
    name: 'Low Window / Floor-Level Glass',
    category: 'low_to_floor',
    description: 'Glass panels with a bottom edge close to the walking surface may require safety glazing.',
    isActive: true,
    jurisdiction: 'LA',
    severity: 'high',
    triggerFn: (op) => {
      const notes = norm(op.installNotes, op.customerNotes);
      const height = parseFloat(op.height) || 0;
      const isLow = (op.legHeight !== null && op.legHeight !== undefined && parseFloat(op.legHeight) < 18) ||
        notes.includes('floor level') || notes.includes('close to floor') ||
        notes.includes('low window') || notes.includes('floor to ceiling') ||
        notes.includes('floor window');
      return isLow;
    },
    flagReason: 'Glass close to walking surface — safety glazing review recommended.',
    voiceKeywords: ['floor level', 'close to floor', 'low window', 'floor to ceiling', 'floor window', 'low glass'],
    requiresPhoto: true,
    photoHint: 'Take photo showing height from floor to bottom edge of glass.',
    legalNote: 'Glass with bottom edge less than 18" from floor in a walking surface context may require safety glazing.',
  },

  // ── CATEGORY 4: STAIR / LANDING / RAMP ──────────────────
  {
    id: 'sg-stair-landing',
    name: 'Stair / Landing / Ramp',
    category: 'stair_landing',
    description: 'Glass near stairways, landings, or ramps may require safety glazing.',
    isActive: true,
    jurisdiction: 'LA',
    severity: 'high',
    triggerFn: (op) => {
      const room = norm(op.roomLocation);
      const notes = norm(op.installNotes, op.customerNotes);
      return room.includes('stair') || room.includes('landing') || room.includes('ramp') ||
        notes.includes('stair') || notes.includes('landing') || notes.includes('ramp') ||
        notes.includes('steps') || notes.includes('stairway') || notes.includes('staircase');
    },
    flagReason: 'Stair/landing/ramp area — safety glazing review required.',
    voiceKeywords: ['stair', 'stairs', 'stairway', 'staircase', 'landing', 'ramp', 'steps'],
    requiresPhoto: true,
    photoHint: 'Take photo showing window relative to stair/landing.',
    legalNote: 'Safety glazing required within 36" of walking surface on stairways.',
  },

  // ── CATEGORY 5: LARGE PANEL ──────────────────────────────
  {
    id: 'sg-large-picture-panel',
    name: 'Large Picture / Fixed Glass Panel',
    category: 'large_panel',
    description: 'Large picture windows or fixed glass panels may present a safety hazard if not safety-glazed.',
    isActive: true,
    jurisdiction: 'ALL',
    severity: 'medium',
    triggerFn: (op) => {
      const cat = norm(op.productCategory, op.model);
      const w = parseFloat(op.width) || 0;
      const h = parseFloat(op.height) || 0;
      const area = w * h; // sq inches
      const isPicture = cat.includes('picture') || cat.includes('pic') || cat.includes('fixed');
      return isPicture && area > 2304; // > 16 sq ft
    },
    flagReason: 'Large picture/fixed glass panel (>16 sq ft) — safety glazing review recommended.',
    voiceKeywords: ['picture window', 'large glass', 'fixed panel', 'big window', 'large window'],
    requiresPhoto: false,
    legalNote: 'Large glass panels may be considered hazardous depending on location and height.',
  },

  // ── CATEGORY 6: MANUAL / IMPACT RISK ────────────────────
  {
    id: 'sg-impact-risk',
    name: 'High Traffic / Impact Risk Area',
    category: 'impact_risk',
    description: 'Areas marked by rep as high-traffic, child area, or impact risk.',
    isActive: true,
    jurisdiction: 'ALL',
    severity: 'medium',
    triggerFn: (op) => {
      const notes = norm(op.installNotes, op.customerNotes);
      return notes.includes('high traffic') || notes.includes('child') || notes.includes('kids') ||
        notes.includes('impact') || notes.includes('safety concern') || notes.includes('code review') ||
        op.manualSafetyFlag === true;
    },
    flagReason: 'Rep-flagged impact/safety risk area — confirm tempered glass.',
    voiceKeywords: ['high traffic', 'child room', 'kids room', 'impact risk', 'safety concern', 'code review'],
    requiresPhoto: false,
    legalNote: 'Rep-identified safety concern. Confirm compliance with local code official.',
  },
];

// ─── HELPERS ────────────────────────────────────────────────
function norm(...parts: (string | undefined | null)[]): string {
  return parts.filter(Boolean).join(' ').toLowerCase();
}

// ─── EVALUATE RULES FOR OPENING ─────────────────────────────
export function evaluateSafetyGlazingRules(
  opening: any,
  extraNotes?: string,
  activeRules: SafetyGlazingRule[] = LA_SAFETY_GLAZING_RULES,
): SafetyGlazingFlag[] {
  const flags: SafetyGlazingFlag[] = [];

  for (const rule of activeRules) {
    if (!rule.isActive) continue;
    try {
      const triggered = rule.triggerFn(opening, extraNotes);
      if (triggered) {
        flags.push({
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          severity: rule.severity,
          flagReason: rule.flagReason,
          sourceType: 'rule',
          confidence: 0.85,
          requiresPhoto: rule.requiresPhoto,
          photoHint: rule.photoHint,
        });
      }
    } catch { /* skip broken rule */ }
  }

  return flags;
}

// ─── VOICE / TEXT PHRASE DETECTION ──────────────────────────
export interface VoiceSafetyMatch {
  ruleId: string;
  ruleName: string;
  category: SafetyGlazingCategory;
  severity: 'high' | 'medium' | 'low';
  flagReason: string;
  matchedPhrase: string;
  confidence: number;
  requiresPhoto: boolean;
  photoHint?: string;
}

export function detectSafetyGlazingFromVoice(
  transcript: string,
  activeRules: SafetyGlazingRule[] = LA_SAFETY_GLAZING_RULES,
): VoiceSafetyMatch[] {
  const matches: VoiceSafetyMatch[] = [];
  const lower = transcript.toLowerCase();

  for (const rule of activeRules) {
    if (!rule.isActive) continue;
    for (const kw of rule.voiceKeywords) {
      if (lower.includes(kw.toLowerCase())) {
        // Avoid duplicate rule entries
        if (!matches.find(m => m.ruleId === rule.id)) {
          matches.push({
            ruleId: rule.id,
            ruleName: rule.name,
            category: rule.category,
            severity: rule.severity,
            flagReason: rule.flagReason,
            matchedPhrase: kw,
            confidence: 0.75,
            requiresPhoto: rule.requiresPhoto,
            photoHint: rule.photoHint,
          });
        }
        break;
      }
    }
  }

  return matches;
}

// ─── WIZARD QUESTION EVALUATION ─────────────────────────────
export function evaluateWizardAnswers(
  answers: WizardSafetyAnswers,
): { flags: SafetyGlazingFlag[]; recommendation: TemperedDecision } {
  const flags: SafetyGlazingFlag[] = [];
  let highCount = 0;

  if (answers.isInOrPartOfDoor) {
    flags.push({ ruleId: 'wiz-door', ruleName: 'In or Part of Door', category: 'door_adjacent', severity: 'high', flagReason: 'Rep confirmed this is in or part of a door.', sourceType: 'wizard_question', confidence: 1.0, requiresPhoto: true, photoHint: 'Photo of door.' });
    highCount++;
  }
  if (answers.isNextToDoor) {
    flags.push({ ruleId: 'wiz-door-adj', ruleName: 'Adjacent to Door', category: 'door_adjacent', severity: 'high', flagReason: 'Rep confirmed this is next to a door.', sourceType: 'wizard_question', confidence: 1.0, requiresPhoto: true, photoHint: 'Photo showing proximity to door.' });
    highCount++;
  }
  if (answers.isInWetArea) {
    flags.push({ ruleId: 'wiz-wet', ruleName: 'Wet Area', category: 'wet_area', severity: 'high', flagReason: 'Rep confirmed bathroom, shower, tub, or wet area.', sourceType: 'wizard_question', confidence: 1.0, requiresPhoto: true, photoHint: 'Photo of bathroom/shower area.' });
    highCount++;
  }
  if (answers.isCloseToFloor) {
    flags.push({ ruleId: 'wiz-low', ruleName: 'Close to Floor', category: 'low_to_floor', severity: 'high', flagReason: 'Rep confirmed glass is close to walking surface.', sourceType: 'wizard_question', confidence: 1.0, requiresPhoto: true, photoHint: 'Photo showing height from floor.' });
    highCount++;
  }
  if (answers.isNearStairs) {
    flags.push({ ruleId: 'wiz-stair', ruleName: 'Near Stairs/Landing', category: 'stair_landing', severity: 'high', flagReason: 'Rep confirmed near stairs, landing, or ramp.', sourceType: 'wizard_question', confidence: 1.0, requiresPhoto: true, photoHint: 'Photo of stair/landing area.' });
    highCount++;
  }
  if (answers.isLargeFixedPanel) {
    flags.push({ ruleId: 'wiz-large', ruleName: 'Large Fixed Panel', category: 'large_panel', severity: 'medium', flagReason: 'Rep confirmed large fixed/picture glass panel.', sourceType: 'wizard_question', confidence: 0.9, requiresPhoto: false });
  }
  if (answers.isHighTrafficArea || answers.impactRisk || answers.childArea) {
    flags.push({ ruleId: 'wiz-impact', ruleName: 'High Traffic / Impact Risk', category: 'impact_risk', severity: 'medium', flagReason: 'Rep flagged high-traffic, child area, or impact risk.', sourceType: 'wizard_question', confidence: 0.9, requiresPhoto: false });
  }
  if (answers.unsureAboutTempered || answers.codeReviewNeeded) {
    flags.push({ ruleId: 'wiz-unsure', ruleName: 'Rep Unsure / Needs Code Review', category: 'manual_flag', severity: 'medium', flagReason: 'Rep marked as unsure or needs code review.', sourceType: 'wizard_question', confidence: 0.5, requiresPhoto: false });
  }

  const recommendation: TemperedDecision = highCount > 0 ? 'yes' : flags.length > 0 ? 'unsure' : 'not_reviewed';

  return { flags, recommendation };
}

// ─── BUILD SAFETY REVIEW FROM OPENING + FLAGS ────────────────
export function buildSafetyReview(
  opening: any,
  openingNumber: number,
  extraFlags: SafetyGlazingFlag[] = [],
  wizardAnswers?: WizardSafetyAnswers,
): OpeningSafetyReview {
  const ruleFlags = evaluateSafetyGlazingRules(opening);
  const allFlags = [...ruleFlags, ...extraFlags];

  let wizardResult: { flags: SafetyGlazingFlag[]; recommendation: TemperedDecision } | null = null;
  if (wizardAnswers) {
    wizardResult = evaluateWizardAnswers(wizardAnswers);
    allFlags.push(...wizardResult.flags);
  }

  const flaggedReasons = [...new Set(allFlags.map(f => f.flagReason))];
  const hasHighFlag = allFlags.some(f => f.severity === 'high');
  const hasMediumFlag = allFlags.some(f => f.severity === 'medium');
  const avgConfidence = allFlags.length > 0
    ? allFlags.reduce((s, f) => s + f.confidence, 0) / allFlags.length
    : 0;

  const recommendation: TemperedDecision =
    (opening.safetyGlazingStatus as TemperedDecision) ||
    wizardResult?.recommendation ||
    (hasHighFlag ? 'yes' : hasMediumFlag ? 'unsure' : 'not_reviewed');

  return {
    openingId: opening.id,
    openingNumber,
    safetyReviewStatus: opening.safetyReviewStatus || (allFlags.length > 0 ? 'flagged' : 'not_started'),
    temperedRequired: recommendation,
    temperedFull: opening.temperedFull || opening.tempFull || false,
    temperedHalf: opening.temperedHalf || opening.tempS || false,
    flaggedReasons,
    flags: allFlags,
    sourceType: 'rule',
    confidenceScore: Math.round(avgConfidence * 100),
    overrideReason: opening.safetyGlazingOverrideReason,
    reviewedAt: opening.safetyGlazingReviewedAt,
    wizardAnswers,
  };
}

// ─── FINAL EXPORT BLOCKER CHECK ──────────────────────────────
export interface ExportBlockerResult {
  blocked: boolean;
  blockers: string[];
  warnings: string[];
  unsureOpenings: number[];
  overrideOpenings: number[];
  unreviewed: number[];
}

export function checkExportReadiness(reviews: OpeningSafetyReview[]): ExportBlockerResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const unsureOpenings: number[] = [];
  const overrideOpenings: number[] = [];
  const unreviewed: number[] = [];

  for (const rev of reviews) {
    // Block if any high-risk opening has no decision
    if (rev.flags.some(f => f.severity === 'high') && rev.temperedRequired === 'not_reviewed') {
      blockers.push(`Opening #${rev.openingNumber}: High-risk safety glazing flag with no tempered decision.`);
      unreviewed.push(rev.openingNumber);
    }

    // Block if unsure
    if (rev.temperedRequired === 'unsure' || rev.safetyReviewStatus === 'unsure') {
      blockers.push(`Opening #${rev.openingNumber}: Tempered glass status is UNSURE — must resolve before export.`);
      unsureOpenings.push(rev.openingNumber);
    }

    // Block if override without reason
    if (rev.safetyReviewStatus === 'override' && !rev.overrideReason) {
      blockers.push(`Opening #${rev.openingNumber}: Safety glazing overridden without a reason — must provide override reason.`);
    }

    // Warning if override with reason
    if (rev.safetyReviewStatus === 'override' && rev.overrideReason) {
      warnings.push(`Opening #${rev.openingNumber}: Safety glazing override logged — "${rev.overrideReason}".`);
      overrideOpenings.push(rev.openingNumber);
    }
  }

  return {
    blocked: blockers.length > 0,
    blockers,
    warnings,
    unsureOpenings,
    overrideOpenings,
    unreviewed,
  };
}

// ─── CATEGORY DISPLAY HELPERS ────────────────────────────────
export const CATEGORY_LABELS: Record<SafetyGlazingCategory, string> = {
  door_adjacent: '🚪 Door / Door-Adjacent',
  wet_area: '🚿 Wet Area (Bath/Shower/Tub)',
  low_to_floor: '⬇️ Low to Floor',
  stair_landing: '🪜 Stair / Landing / Ramp',
  large_panel: '🖼️ Large Fixed Panel',
  impact_risk: '⚠️ Impact / Traffic Risk',
  manual_flag: '🔴 Manual Flag',
};

export const DISCLAIMER_TEXT =
  'IMPORTANT: This tool identifies likely safety-glazing situations to assist the sales rep. ' +
  'It does NOT constitute legal or building code compliance verification. ' +
  'Final determination of tempered glass requirements must be made by Window World management, ' +
  'local building code officials, or the Louisiana State Fire Marshal.';
