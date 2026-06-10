// ═══════════════════════════════════════════════════════════════
// Tests — Louisiana Safety Glazing / Tempered Glass Rule Engine
// ═══════════════════════════════════════════════════════════════

import { describe, test, expect } from 'vitest';

import {
  evaluateSafetyGlazingRules,
  detectSafetyGlazingFromVoice,
  evaluateWizardAnswers,
  checkExportReadiness,
  buildSafetyReview,
  LA_SAFETY_GLAZING_RULES,
  OpeningSafetyReview,
} from '../utils/safetyGlazingRules';

// ─── HELPERS ────────────────────────────────────────────────
function makeOpening(overrides: Record<string, any> = {}) {
  return {
    productCategory: 'double_hung',
    model: 'Series 2000',
    width: 36, height: 48,
    roomLocation: '',
    installNotes: '',
    customerNotes: '',
    ...overrides,
  };
}

// ─── RULE EVALUATION TESTS ──────────────────────────────────
describe('Safety Glazing Rule Engine', () => {
  test('No flags on ordinary interior window', () => {
    const op = makeOpening({ roomLocation: 'bedroom', installNotes: 'standard install' });
    const flags = evaluateSafetyGlazingRules(op);
    expect(flags).toHaveLength(0);
  });

  test('Flags sliding glass door', () => {
    const op = makeOpening({ productCategory: 'patio_door', installNotes: 'sliding glass door install' });
    const flags = evaluateSafetyGlazingRules(op);
    const ids = flags.map(f => f.ruleId);
    expect(ids).toContain('sg-sliding-glass-door');
  });

  test('Flags entrance door via model name', () => {
    const op = makeOpening({ model: 'Entrance Door Glass Panel' });
    const flags = evaluateSafetyGlazingRules(op);
    const ids = flags.map(f => f.ruleId);
    expect(ids).toContain('sg-entrance-door');
  });

  test('Flags sidelight via notes', () => {
    const op = makeOpening({ installNotes: 'sidelight next to front door' });
    const flags = evaluateSafetyGlazingRules(op);
    const ids = flags.map(f => f.ruleId);
    expect(ids).toContain('sg-sidelight-near-door');
  });

  test('Flags bathroom window', () => {
    const op = makeOpening({ roomLocation: 'bathroom', height: 36 });
    const flags = evaluateSafetyGlazingRules(op);
    const ids = flags.map(f => f.ruleId);
    expect(ids).toContain('sg-bathroom');
  });

  test('Flags shower/tub area from notes', () => {
    const op = makeOpening({ installNotes: 'window by the tub enclosure in master bath' });
    const flags = evaluateSafetyGlazingRules(op);
    const ids = flags.map(f => f.ruleId);
    expect(ids).toContain('sg-shower-tub');
  });

  test('Flags pool/spa area from room location', () => {
    const op = makeOpening({ roomLocation: 'pool room' });
    const flags = evaluateSafetyGlazingRules(op);
    const ids = flags.map(f => f.ruleId);
    expect(ids).toContain('sg-pool-spa');
  });

  test('Flags stairway location', () => {
    const op = makeOpening({ roomLocation: 'stairway landing' });
    const flags = evaluateSafetyGlazingRules(op);
    const ids = flags.map(f => f.ruleId);
    expect(ids).toContain('sg-stair-landing');
  });

  test('Flags stair in notes', () => {
    const op = makeOpening({ installNotes: 'above the stairs near landing' });
    const flags = evaluateSafetyGlazingRules(op);
    const ids = flags.map(f => f.ruleId);
    expect(ids).toContain('sg-stair-landing');
  });

  test('Flags large picture window over 16 sq ft', () => {
    const op = makeOpening({ productCategory: 'picture', width: 72, height: 60 }); // 30 sq ft
    const flags = evaluateSafetyGlazingRules(op);
    const ids = flags.map(f => f.ruleId);
    expect(ids).toContain('sg-large-picture-panel');
  });

  test('Does NOT flag small picture window under 16 sq ft', () => {
    const op = makeOpening({ productCategory: 'picture', width: 36, height: 36 }); // 9 sq ft
    const flags = evaluateSafetyGlazingRules(op);
    expect(flags.find(f => f.ruleId === 'sg-large-picture-panel')).toBeUndefined();
  });

  test('Flags impact risk from notes', () => {
    const op = makeOpening({ installNotes: 'high traffic area near child room' });
    const flags = evaluateSafetyGlazingRules(op);
    const ids = flags.map(f => f.ruleId);
    expect(ids).toContain('sg-impact-risk');
  });

  test('Flags low window from leg height', () => {
    const op = makeOpening({ legHeight: 12 }); // 12" from floor
    const flags = evaluateSafetyGlazingRules(op);
    const ids = flags.map(f => f.ruleId);
    expect(ids).toContain('sg-low-window');
  });
});

// ─── VOICE DETECTION TESTS ──────────────────────────────────
describe('Voice/Text Safety Glazing Detection', () => {
  test('Detects "bathroom" keyword', () => {
    const matches = detectSafetyGlazingFromVoice('bathroom window by the tub');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some(m => m.ruleId === 'sg-bathroom')).toBe(true);
  });

  test('Detects "tub" keyword', () => {
    const matches = detectSafetyGlazingFromVoice('window right next to the tub');
    expect(matches.some(m => m.ruleId === 'sg-shower-tub')).toBe(true);
  });

  test('Detects "patio door" keyword', () => {
    const matches = detectSafetyGlazingFromVoice('sliding patio door in the back');
    expect(matches.some(m => m.ruleId === 'sg-sliding-glass-door')).toBe(true);
  });

  test('Detects "sidelight" keyword', () => {
    const matches = detectSafetyGlazingFromVoice('sidelight beside the front door');
    expect(matches.some(m => m.ruleId === 'sg-sidelight-near-door')).toBe(true);
  });

  test('Detects "stairs" keyword', () => {
    const matches = detectSafetyGlazingFromVoice('window at the top of the stairs');
    expect(matches.some(m => m.ruleId === 'sg-stair-landing')).toBe(true);
  });

  test('Returns empty for no safety-related phrases', () => {
    const matches = detectSafetyGlazingFromVoice('bedroom double hung white white 36 by 48');
    expect(matches).toHaveLength(0);
  });

  test('Provides source phrase in match', () => {
    const matches = detectSafetyGlazingFromVoice('bathroom window by the shower');
    expect(matches[0].matchedPhrase).toBeTruthy();
  });
});

// ─── WIZARD ANSWER TESTS ────────────────────────────────────
describe('Wizard Safety Answers Evaluation', () => {
  test('No answers = not_reviewed recommendation', () => {
    const { recommendation, flags } = evaluateWizardAnswers({});
    expect(recommendation).toBe('not_reviewed');
    expect(flags).toHaveLength(0);
  });

  test('isInOrPartOfDoor = yes recommendation', () => {
    const { recommendation } = evaluateWizardAnswers({ isInOrPartOfDoor: true });
    expect(recommendation).toBe('yes');
  });

  test('isInWetArea = yes recommendation', () => {
    const { recommendation } = evaluateWizardAnswers({ isInWetArea: true });
    expect(recommendation).toBe('yes');
  });

  test('isNearStairs = yes recommendation', () => {
    const { recommendation } = evaluateWizardAnswers({ isNearStairs: true });
    expect(recommendation).toBe('yes');
  });

  test('unsureAboutTempered = unsure recommendation', () => {
    const { recommendation } = evaluateWizardAnswers({ unsureAboutTempered: true });
    expect(recommendation).toBe('unsure');
  });

  test('isLargeFixedPanel only = unsure recommendation', () => {
    const { recommendation } = evaluateWizardAnswers({ isLargeFixedPanel: true });
    expect(recommendation).toBe('unsure');
  });
});

// ─── EXPORT READINESS TESTS ──────────────────────────────────
describe('Export Readiness / Final Lockdown Check', () => {
  test('No safety reviews = no blockers', () => {
    const result = checkExportReadiness([]);
    expect(result.blocked).toBe(false);
    expect(result.blockers).toHaveLength(0);
  });

  test('Unsure decision blocks export', () => {
    const review: OpeningSafetyReview = {
      openingNumber: 1,
      safetyReviewStatus: 'unsure',
      temperedRequired: 'unsure',
      temperedFull: false,
      temperedHalf: false,
      flaggedReasons: ['Bathroom area'],
      flags: [{ ruleId: 'sg-bathroom', ruleName: 'Bathroom', category: 'wet_area', severity: 'high', flagReason: 'Bathroom', sourceType: 'rule', confidence: 0.9, requiresPhoto: false }],
      sourceType: 'rule',
      confidenceScore: 90,
    };
    const result = checkExportReadiness([review]);
    expect(result.blocked).toBe(true);
    expect(result.unsureOpenings).toContain(1);
  });

  test('High-risk opening with no review decision blocks export', () => {
    const review: OpeningSafetyReview = {
      openingNumber: 3,
      safetyReviewStatus: 'flagged',
      temperedRequired: 'not_reviewed',
      temperedFull: false,
      temperedHalf: false,
      flaggedReasons: [],
      flags: [{ ruleId: 'sg-shower-tub', ruleName: 'Shower/Tub', category: 'wet_area', severity: 'high', flagReason: 'Tub area', sourceType: 'rule', confidence: 0.9, requiresPhoto: true }],
      sourceType: 'rule',
      confidenceScore: 90,
    };
    const result = checkExportReadiness([review]);
    expect(result.blocked).toBe(true);
    expect(result.unreviewed).toContain(3);
  });

  test('Override without reason blocks export', () => {
    const review: OpeningSafetyReview = {
      openingNumber: 2,
      safetyReviewStatus: 'override',
      temperedRequired: 'no',
      temperedFull: false,
      temperedHalf: false,
      flaggedReasons: [],
      flags: [{ ruleId: 'sg-bathroom', ruleName: 'Bathroom', category: 'wet_area', severity: 'high', flagReason: 'Bathroom', sourceType: 'rule', confidence: 0.9, requiresPhoto: false }],
      sourceType: 'rule',
      confidenceScore: 80,
      overrideReason: undefined, // no reason!
    };
    const result = checkExportReadiness([review]);
    expect(result.blocked).toBe(true);
  });

  test('Override WITH reason generates warning but does NOT block', () => {
    const review: OpeningSafetyReview = {
      openingNumber: 2,
      safetyReviewStatus: 'override',
      temperedRequired: 'no',
      temperedFull: false,
      temperedHalf: false,
      flaggedReasons: [],
      flags: [{ ruleId: 'sg-bathroom', ruleName: 'Bathroom', category: 'wet_area', severity: 'high', flagReason: 'Bathroom', sourceType: 'rule', confidence: 0.9, requiresPhoto: false }],
      sourceType: 'rule',
      confidenceScore: 80,
      overrideReason: 'Customer confirmed window is above tub surround height, not within code range.',
    };
    const result = checkExportReadiness([review]);
    expect(result.blocked).toBe(false);
    expect(result.warnings).toHaveLength(1);
    expect(result.overrideOpenings).toContain(2);
  });

  test('Confirmed tempered = clear to export', () => {
    const review: OpeningSafetyReview = {
      openingNumber: 1,
      safetyReviewStatus: 'reviewed',
      temperedRequired: 'yes',
      temperedFull: true,
      temperedHalf: false,
      flaggedReasons: ['Shower area'],
      flags: [{ ruleId: 'sg-shower-tub', ruleName: 'Shower/Tub', category: 'wet_area', severity: 'high', flagReason: 'Shower area', sourceType: 'rule', confidence: 0.9, requiresPhoto: true }],
      sourceType: 'rule',
      confidenceScore: 90,
    };
    const result = checkExportReadiness([review]);
    expect(result.blocked).toBe(false);
    expect(result.blockers).toHaveLength(0);
  });
});

// ─── BUILD SAFETY REVIEW TESTS ──────────────────────────────
describe('buildSafetyReview Integration', () => {
  test('Bathroom opening auto-builds high-confidence review', () => {
    const op = makeOpening({ roomLocation: 'bathroom', installNotes: 'next to tub' });
    const review = buildSafetyReview(op, 1);
    expect(review.flags.length).toBeGreaterThan(0);
    expect(review.safetyReviewStatus).toBe('flagged');
    expect(review.temperedRequired).toBe('yes');
  });

  test('Patio door auto-recommends tempered', () => {
    const op = makeOpening({ productCategory: 'patio_door', model: 'Sliding Glass Door' });
    const review = buildSafetyReview(op, 2);
    expect(review.temperedRequired).toBe('yes');
  });

  test('Plain bedroom window = not_reviewed', () => {
    const op = makeOpening({ roomLocation: 'bedroom' });
    const review = buildSafetyReview(op, 3);
    expect(review.flags).toHaveLength(0);
    expect(review.temperedRequired).toBe('not_reviewed');
  });
});
