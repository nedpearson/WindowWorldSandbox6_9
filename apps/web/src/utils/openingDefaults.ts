// ═══════════════════════════════════════════════════════════════
// Window World — Opening Defaults Engine
// Applies Window World default field values to new openings.
// Tracks which values were defaulted vs manually entered.
// Provides resolveOpeningDefaults() for structured resolver output.
// ═══════════════════════════════════════════════════════════════

import type {
  FieldStatus,
  DefaultResolverResult,
  DefaultResolverContext,
  SuggestionItem,
  ReviewItem,
  BlockerItem,
} from './openingDefaultTypes';

export interface DefaultTracker {
  /** Fields that were set by defaults (not manually entered) */
  defaultedFields: Record<string, { value: any; source: string; ruleId?: string; appliedAt: number }>;
  /** Fields that were manually overridden after being defaulted */
  overriddenFields: Record<string, { originalDefault: any; newValue: any; overriddenAt: number }>;
}

// ─── WINDOW WORLD HARD DEFAULTS ─────────────────────────────
// These are the company-standard defaults for every new opening.
export const WW_OPENING_DEFAULTS: Record<string, any> = {
  // RULE A: Default glass option = LEE
  glassOption: 'LEE',
  glassPackage: 'LEE',
  // RULE B: Default foam enhanced = unchecked (user must opt in)
  foamEnhanced: false,
  // RULE C: Default type removed = ALUM
  removalType: 'ALUM',
  typeRemoved: 'ALUM',
  // RULE H: Default type installed = EXT
  installType: 'EXT',
  // Standard defaults
  interiorColor: 'White',
  exteriorColor: 'White',
  seriesModel: '4000 Series',
  productCategory: 'double_hung',
  gridStyle: 'None',
  screenOption: 'Half Screen',
  quantity: 1,
  floorNumber: 1,
  elevation: 'Normal',
  argon: false,
  nailFin: false,
  oriel: false,
  horizontalRR: false,
  sillRepair: false,
  removeStormWindow: false,
  installMullion: false,
  structuralMullion: false,
  jChannel: false,
  temperedGlass: 'none',
  obscureGlass: 'none',
  // Grid defaults
  gridPattern: 'None',
  gridProfile: '',
  gridVerticalCount: 0,
  gridHorizontalCount: 0,
  gridPlacement: 'full',
  gridNotes: '',
  gridConfirmed: true,
  // Exterior / tracking
  exteriorSurface: '',
  measurementConfirmed: true,
  safetyConfirmed: false,
  
  // ── Source of Truth Defaults ──
  measurementBasis: 'outside',
  measurementBasisDefaulted: true,
  measurementBasisOverridden: false,
  measurementMode: 'simple',
  cutbackType: '',
  headerType: '',
  // Quick add-on defaults
  rainObscure: false,
  tapcon: false,
  clearStory: false,
  clearStoryIsFirst: false,
  stuccoRemoval: false,
};

// ─── CONDITIONAL DEFAULTS (based on other fields) ───────────
export interface ConditionalDefault {
  id: string;
  name: string;
  description: string;
  triggerField: string;
  triggerValues: string[];
  triggerOperator: 'equals' | 'includes' | 'not_equals';
  setField: string;
  setValue: any;
  helperNote: string;
  requiresConfirmation: boolean;
  additionalFields?: Record<string, any>;
  additionalNotes?: string;
}

export const WW_CONDITIONAL_DEFAULTS: ConditionalDefault[] = [
  // RULE D: Brick → Type Install = EXT
  {
    id: 'ww-brick-ext',
    name: 'Brick Exterior → EXT Install',
    description: 'When exterior type is Brick, default Type Install to EXT and no cutback',
    triggerField: 'exteriorType',
    triggerValues: ['brick', 'Brick', 'BRICK'],
    triggerOperator: 'includes',
    setField: 'installType',
    setValue: 'EXT',
    helperNote: 'Brick exterior defaults Type Install to EXT and No Cutback.',
    requiresConfirmation: false,
    additionalFields: {
      cutbackType: 'No cutback',
    },
  },
  // RULE E: Siding/Wood → Type Install = INT
  {
    id: 'ww-siding-int',
    name: 'Siding/Wood → INT Install + Trim/Header',
    description: 'When exterior type is Siding or Wood, default Type Install to INT and require vinyl trim/header',
    triggerField: 'exteriorType',
    triggerValues: ['siding', 'Siding', 'SIDING', 'wood', 'Wood', 'WOOD', 'vinyl siding', 'Vinyl Siding'],
    triggerOperator: 'includes',
    setField: 'installType',
    setValue: 'INT',
    helperNote: 'Siding/Wood exterior defaults Type Install to INT and requires vinyl trim/header.',
    requiresConfirmation: true,
    additionalFields: {
      trimType: 'Vinyl trim',
      trimIncludedInPrice: true,
      trimRequired: true,
      headerType: 'New header',
      headerIncludedInPrice: true,
      headerRequired: true,
    },
    additionalNotes: 'Siding/wood exterior: vinyl trim required; header required.',
  },
  // RULE F: Stucco → Needs Cutback Selection
  {
    id: 'ww-stucco-cutback',
    name: 'Stucco → Cutback Required',
    description: 'When exterior type is Stucco, a cutback choice is required.',
    triggerField: 'exteriorType',
    triggerValues: ['stucco', 'Stucco', 'STUCCO'],
    triggerOperator: 'includes',
    setField: 'cutbackType',
    setValue: 'Needs cutback selection',
    helperNote: 'Stucco requires an explicit cutback selection.',
    requiresConfirmation: true,
  },
  // RULE G: Picture Window → No Screen
  {
    id: 'ww-pic-no-screen',
    name: 'Picture Window → No Screen',
    description: 'Picture windows should default to No Screen',
    triggerField: 'productCategory',
    triggerValues: ['picture', 'pic', 'Picture', 'PIC'],
    triggerOperator: 'includes',
    setField: 'screenOption',
    setValue: 'No Screen',
    helperNote: 'Picture windows normally have no screen.',
    requiresConfirmation: false,
    additionalFields: { fullScreen: false },
  },
  // RULE: Stucco + ALUM removal → Aluminum from Stucco
  {
    id: 'ww-stucco-alum-removal',
    name: 'Stucco + ALUM → Aluminum from Stucco',
    description: 'When exterior is stucco and removal is aluminum, flag as stucco removal',
    triggerField: 'exteriorSurface',
    triggerValues: ['stucco', 'Stucco', 'STUCCO'],
    triggerOperator: 'includes',
    setField: 'stuccoRemoval',
    setValue: true,
    helperNote: 'Stucco exterior with aluminum removal → "Remove Aluminum from Stucco".',
    requiresConfirmation: false,
  },
];

// ─── CREATE NEW OPENING WITH DEFAULTS ───────────────────────
export function createOpeningWithDefaults(
  appointmentId: string,
  openingNumber: number,
  existingOpenings: any[] = [],
  neverAskTwiceDefaults: Record<string, any> = {},
): { opening: any; tracker: DefaultTracker } {
  const tracker: DefaultTracker = { defaultedFields: {}, overriddenFields: {} };
  const now = Date.now();

  // Start with base empty opening
  const opening: any = {
    appointmentId,
    openingNumber,
    width: 0,
    height: 0,
    basePrice: 0,
    optionsPrice: 0,
    laborPrice: 0,
    totalPrice: 0,
    radius: null,
    customRadius: null,
    legHeight: null,
    specialtyNotes: '',
    needsVerification: false,
    installNotes: '',
    customerNotes: '',
    installerNotes: '',
    trimNotes: '',
    hinge: '',
    lowEPackage: '',
    installType: '',
    exteriorType: '',
    trimType: '',
    cutbackType: '',
    headerType: '',
    roomLocation: '',
    pricingStatus: 'pending',
    measurementBasis: 'outside',
  };

  // Apply Window World hard defaults
  for (const [field, value] of Object.entries(WW_OPENING_DEFAULTS)) {
    opening[field] = value;
    tracker.defaultedFields[field] = { value, source: 'ww_company_default', appliedAt: now };
  }

  // Apply Never Ask Twice defaults (from previous openings in this job)
  for (const [field, value] of Object.entries(neverAskTwiceDefaults)) {
    // Never Ask Twice overrides company defaults if available
    if (value !== undefined && value !== null && value !== '') {
      opening[field] = value;
      tracker.defaultedFields[field] = { value, source: 'never_ask_twice', appliedAt: now };
    }
  }

  return { opening, tracker };
}

// ─── APPLY CONDITIONAL DEFAULTS ─────────────────────────────
export function applyConditionalDefaults(
  opening: any,
  tracker: DefaultTracker,
  changedField?: string,
): { opening: any; tracker: DefaultTracker; appliedRules: ConditionalDefault[]; helperNotes: string[] } {
  const updated = { ...opening };
  const updatedTracker = { ...tracker };
  const appliedRules: ConditionalDefault[] = [];
  const helperNotes: string[] = [];

  for (const rule of WW_CONDITIONAL_DEFAULTS) {
    if (changedField && changedField !== rule.triggerField) continue;

    const triggerValue = (updated[rule.triggerField] || '').toString().toLowerCase();
    const matches = rule.triggerValues.some(v => triggerValue.includes(v.toLowerCase()));

    if (!matches) continue;

    // Check if the target field was manually overridden — don't re-apply
    if (updatedTracker.overriddenFields[rule.setField]) continue;

    // Apply the default
    updated[rule.setField] = rule.setValue;
    updatedTracker.defaultedFields[rule.setField] = {
      value: rule.setValue,
      source: 'conditional_rule',
      ruleId: rule.id,
      appliedAt: Date.now(),
    };

    // Apply additional fields
    if (rule.additionalFields) {
      for (const [af, av] of Object.entries(rule.additionalFields)) {
        updated[af] = av;
        updatedTracker.defaultedFields[af] = {
          value: av,
          source: 'conditional_rule',
          ruleId: rule.id,
          appliedAt: Date.now(),
        };
      }
    }

    // Add install notes if specified
    if (rule.additionalNotes && !(updated.installNotes || '').includes(rule.additionalNotes)) {
      updated.installNotes = ((updated.installNotes || '') + '\n' + rule.additionalNotes).trim();
    }

    appliedRules.push(rule);
    helperNotes.push(rule.helperNote);
  }

  return { opening: updated, tracker: updatedTracker, appliedRules, helperNotes };
}

// ─── TRACK MANUAL OVERRIDE ──────────────────────────────────
export function trackOverride(
  tracker: DefaultTracker,
  field: string,
  newValue: any,
): DefaultTracker {
  const updated = { ...tracker, overriddenFields: { ...tracker.overriddenFields } };

  if (tracker.defaultedFields[field]) {
    updated.overriddenFields[field] = {
      originalDefault: tracker.defaultedFields[field].value,
      newValue,
      overriddenAt: Date.now(),
    };
  }

  return updated;
}

// ─── CHECK IF FIELD WAS DEFAULTED ───────────────────────────
export function isDefaulted(tracker: DefaultTracker, field: string): boolean {
  return !!tracker.defaultedFields[field] && !tracker.overriddenFields[field];
}

export function isOverridden(tracker: DefaultTracker, field: string): boolean {
  return !!tracker.overriddenFields[field];
}

// ─── DEFAULT INDICATOR COMPONENT DATA ───────────────────────
export function getFieldSource(tracker: DefaultTracker, field: string): 'default' | 'override' | 'manual' {
  if (tracker.overriddenFields[field]) return 'override';
  if (tracker.defaultedFields[field]) return 'default';
  return 'manual';
}

export function getFieldSourceLabel(tracker: DefaultTracker, field: string): string {
  const source = getFieldSource(tracker, field);
  if (source === 'default') {
    const def = tracker.defaultedFields[field];
    if (def.source === 'ww_company_default') return '🏢 WW Default';
    if (def.source === 'never_ask_twice') return '🔄 Auto-filled';
    if (def.source === 'conditional_rule') return '⚡ Rule Applied';
    return '📋 Default';
  }
  if (source === 'override') return '✏️ Manual Override';
  return '';
}

// ─── MODEL RESOLUTION (client-side mirror of orderFormMapping) ──
const MODEL_MAP: Record<string, string> = {
  'double hung': '3002',
  dh: '3002',
  'single hung': '3002',
  sh: '3002',
  oriel: '3002',
  slider: '3002',
  sl: '3002',
  picture: '3004',
  pic: '3004',
  casement: '0971',
  cas: '0971',
  awning: '0951',
  awn: '0951',
};

function resolveModelNumber(opening: Record<string, unknown>): string | null {
  const seriesModel = String(opening.seriesModel || '').trim();
  const productModel = String(opening.productModel || '').trim();
  // If user already entered a numeric model, use it
  if (seriesModel && !isNaN(Number(seriesModel))) return seriesModel;
  if (seriesModel.match(/^\d+[-a-zA-Z0-9]*$/)) return seriesModel;
  if (productModel && !isNaN(Number(productModel))) return productModel;
  // Map from product category
  const category = String(opening.productCategory || '').toLowerCase().replace(/_/g, ' ');
  for (const [key, model] of Object.entries(MODEL_MAP)) {
    if (category.includes(key)) {
      // Append -FE if foam enhanced
      return opening.foamEnhanced ? `${model}-FE` : model;
    }
  }
  return null; // Unknown — will be marked needs_review
}

// ─── CENTRAL DEFAULT RESOLVER ───────────────────────────
// Returns structured output: defaults, suggestions, needsReview, blockers, fieldStatus, reasons.
// Does NOT mutate the opening — caller decides what to apply.
export function resolveOpeningDefaults(
  opening: Record<string, unknown>,
  context: DefaultResolverContext = { stage: 'save_item' },
): DefaultResolverResult {
  const defaults: Record<string, string | number | boolean | null> = {};
  const suggestions: SuggestionItem[] = [];
  const needsReview: ReviewItem[] = [];
  const blockers: BlockerItem[] = [];
  const reasons: Record<string, string> = {};
  const fieldStatus: Record<string, FieldStatus> = {};
  const overriddenFields = context.overriddenFields || new Set<string>();

  // Helper: set a default if the field is blank and not overridden
  function setDefault(field: string, value: string | number | boolean, reason: string): void {
    if (overriddenFields.has(field)) {
      fieldStatus[field] = 'overridden';
      return;
    }
    const current = opening[field];
    const isEmpty = current === undefined || current === null || current === '' ||
      (typeof current === 'number' && current === 0 && !['width', 'height', 'quantity', 'floorNumber'].includes(field));
    if (isEmpty) {
      defaults[field] = value;
      reasons[field] = reason;
      fieldStatus[field] = 'defaulted';
    } else if (current === value) {
      fieldStatus[field] = 'defaulted';
    } else {
      fieldStatus[field] = 'confirmed';
    }
  }

  // ── 1. Hard defaults ──
  setDefault('glassPackage', 'LEE', 'WW standard glass package');
  setDefault('foamEnhanced', false, 'Foam enhanced off by default — user must opt in');
  setDefault('removalType', 'ALUM', 'Most common removal type');
  setDefault('installType', 'EXT', 'Standard installation type');
  setDefault('interiorColor', 'White', 'WW standard color');
  setDefault('exteriorColor', 'White', 'WW standard color');
  setDefault('gridStyle', 'None', 'No grids unless selected');
  setDefault('gridPattern', 'None', 'No grids unless selected');
  setDefault('temperedGlass', 'none', 'Standard non-tempered');
  setDefault('obscureGlass', 'none', 'Standard clear glass');
  setDefault('sillRepair', false, 'Not required unless selected');
  setDefault('removeStormWindow', false, 'Not required unless selected');
  setDefault('installMullion', false, 'Not required unless selected');
  setDefault('structuralMullion', false, 'Not required unless selected');
  setDefault('jChannel', false, 'Not required unless selected');
  setDefault('elevation', 'Normal', 'Standard elevation');

  // ── Glass option restriction ──
  const currentGlass = String(opening.glassPackage || opening.glassOption || '');
  if (currentGlass && currentGlass !== '' && currentGlass !== 'LE' && currentGlass !== 'LEE') {
    needsReview.push({
      field: 'glassPackage',
      label: 'Glass Option',
      reason: `Glass option "${currentGlass}" is not a standard option. Only Low E (LE) and Low E Elite (LEE) are available.`,
      severity: 'warning',
      action: 'Select Low E or Low E Elite',
      requiresConfirmation: true,
    });
    fieldStatus['glassPackage'] = 'needs_review';
  }

  // ── Special shape trim default ──
  const isSpecialShape = !!(opening.shapeType || String(opening.seriesModel || '').startsWith('S1'));
  if (isSpecialShape) {
    setDefault('specialShapeTrimSelected', true, 'Special shape trim applies to all special shapes by default');
  }

  // ── 2. Product-specific defaults ──
  const category = String(opening.productCategory || 'double_hung').toLowerCase();
  if (category.includes('picture') || category === 'pic') {
    setDefault('screenOption', 'No Screen', 'Picture windows have no screen');
  } else {
    setDefault('screenOption', 'Half Screen', 'WW standard half screen');
  }

  // ── 3. Model number resolution ──
  const resolvedModel = resolveModelNumber(opening);
  if (resolvedModel) {
    // Only suggest if not already set to a valid model
    const currentModel = String(opening.seriesModel || opening.productModel || '').trim();
    if (!currentModel || currentModel === '4000 Series' || currentModel === 'TBD') {
      suggestions.push({
        field: 'seriesModel',
        label: 'Model Number',
        suggestedValue: resolvedModel,
        reason: `Resolved from product category: ${category}`,
        severity: 'info',
      });
    }
  } else if (opening.productCategory) {
    needsReview.push({
      field: 'seriesModel',
      label: 'Model Number',
      reason: `Unknown product category "${opening.productCategory}" — cannot resolve model number`,
      severity: 'warning',
    });
  }

  // ── 4. Measurement basis from exterior type ──
  const exterior = String(opening.exteriorType || opening.exteriorSurface || '').toLowerCase();
  if (exterior && !overriddenFields.has('measurementBasis')) {
    if (exterior.includes('brick')) {
      // Check for wood return / mixed situation
      const touchesWindow = String(opening.whatTouchesWindow || '').toLowerCase();
      if (touchesWindow.includes('wood') || touchesWindow.includes('trim')) {
        // Brick with wood/trim return — needs review
        needsReview.push({
          field: 'measurementBasis',
          label: 'Measurement Basis',
          reason: 'Brick exterior with wood/trim return — confirm what touches the window',
          severity: 'warning',
          action: 'Select what touches the window: brick or wood/trim',
          requiresConfirmation: true,
        });
        fieldStatus['measurementBasis'] = 'needs_review';
      } else {
        setDefault('measurementBasis', 'outside', 'Brick — measure outside brick-to-brick');
        reasons['measurementBasis'] = 'Brick exterior: measure outside brick-to-brick';
      }
    } else if (exterior.includes('siding') || exterior.includes('wood') || exterior.includes('vinyl')) {
      setDefault('measurementBasis', 'inside', 'Siding/Wood — measure inside with trim/header');
      setDefault('trimType', 'Vinyl trim', 'Siding/Wood requires vinyl trim');
      setDefault('headerType', 'New header', 'Siding/Wood requires header flashing');
      setDefault('installType', 'INT', 'Siding/Wood — interior installation');
      reasons['measurementBasis'] = 'Siding/Wood: "Whatever touches the window is what you measure" — inside measure';
      reasons['trimType'] = 'Siding/Wood exterior requires vinyl trim per WW standard';
      reasons['headerType'] = 'Siding/Wood exterior requires header flashing per WW standard';
    } else if (exterior.includes('stucco')) {
      setDefault('measurementBasis', 'inside', 'Stucco — measure inside');
      reasons['measurementBasis'] = 'Stucco: inside measure standard';
      // Cutback suggestion
      const cutback = opening.cutbackType;
      if (!cutback || cutback === '' || cutback === 'Needs cutback selection') {
        suggestions.push({
          field: 'cutbackType',
          label: 'Stucco Cutback',
          suggestedValue: 'Review cutback options',
          reason: 'Stucco exterior — review cutback requirement',
          severity: 'suggestion',
        });
        if (!overriddenFields.has('cutbackType')) {
          fieldStatus['cutbackType'] = 'needs_review';
        }
      }
    } else if (exterior.includes('hardie')) {
      setDefault('measurementBasis', 'inside', 'Hardie — measure inside with trim/header');
      setDefault('trimType', 'Vinyl trim', 'Hardie requires vinyl trim');
      setDefault('headerType', 'New header', 'Hardie requires header flashing');
    }
  }

  // ── 5. Safety glazing defaults ──
  const room = String(opening.roomLocation || '').toLowerCase();
  const width = Number(opening.width || 0);
  const height = Number(opening.height || 0);
  const isBathroom = room.includes('bath') || room.includes('shower') || room.includes('tub');
  const isDoorOrSidelight = category.includes('door') || category.includes('sidelight');
  const isLowGlass = height > 0 && (opening.sillHeight ? Number(opening.sillHeight) < 18 : false);
  const isLargeGlass = width > 0 && height > 0 && (width * height) / 144 > 9; // > 9 sq ft

  const currentSafety = String(opening.safetyGlazingStatus || '');
  if (!currentSafety || currentSafety === '' || currentSafety === 'not_reviewed') {
    if (isBathroom || isDoorOrSidelight || (isLowGlass && isLargeGlass)) {
      const triggerReason = isBathroom
        ? 'Near bathtub/shower — tempered glass may be required by code'
        : isDoorOrSidelight
          ? 'Door/sidelight — safety glazing condition'
          : 'Low glass (<18" from floor) over 9 sq ft';
      needsReview.push({
        field: 'safetyGlazingStatus',
        label: 'Safety Glazing',
        reason: triggerReason,
        severity: context.stage === 'contract_ready' ? 'blocking' : 'warning',
        action: 'Select: Tempered, Not Tempered, or Unsure',
        requiresConfirmation: true,
      });
      fieldStatus['safetyGlazingStatus'] = 'needs_review';
    } else {
      suggestions.push({
        field: 'safetyGlazingStatus',
        label: 'Safety Glazing',
        suggestedValue: 'suggested_not_tempered',
        reason: 'No safety trigger detected — suggested not tempered',
        severity: 'info',
      });
      fieldStatus['safetyGlazingStatus'] = 'suggested';
    }
  }

  // ── 6. Oriel defaults ──
  if (opening.oriel) {
    const orielHeight = opening.orielUpperSashHeight;
    if (!orielHeight || orielHeight === 0) {
      if (context.stage === 'contract_ready' || context.stage === 'production_handoff') {
        blockers.push({
          field: 'orielUpperSashHeight',
          label: 'Oriel Upper Sash Height',
          reason: 'Oriel requires upper sash height before final order',
          blocksAt: 'contract_ready',
        });
      } else {
        suggestions.push({
          field: 'orielUpperSashHeight',
          label: 'Oriel Upper Sash Height',
          suggestedValue: 0,
          reason: 'Oriel requires upper sash height before final order — can save progress without it',
          severity: 'suggestion',
        });
      }
      fieldStatus['orielUpperSashHeight'] = context.stage === 'contract_ready' ? 'needs_review' : 'suggested';
    }
  }

  // ── 7. Final contract blockers ──
  if (context.stage === 'contract_ready' || context.stage === 'production_handoff') {
    if (!opening.width || Number(opening.width) === 0) {
      blockers.push({ field: 'width', label: 'Width', reason: 'Width is required', blocksAt: 'contract_ready' });
    }
    if (!opening.height || Number(opening.height) === 0) {
      blockers.push({ field: 'height', label: 'Height', reason: 'Height is required', blocksAt: 'contract_ready' });
    }
    if (!resolvedModel) {
      blockers.push({ field: 'seriesModel', label: 'Model Number', reason: 'Model number could not be resolved', blocksAt: 'contract_ready' });
    }
    // Safety glazing unsure blocks final contract
    if (opening.safetyGlazingStatus === 'unsure') {
      blockers.push({ field: 'safetyGlazingStatus', label: 'Safety Glazing', reason: 'Safety glazing marked "Unsure" — requires review before final contract', blocksAt: 'contract_ready' });
    }
  }

  return { defaults, suggestions, needsReview, blockers, reasons, fieldStatus };
}
