// ═══════════════════════════════════════════════════════════════
// Window World — Never Ask Twice Engine
// Learns from previously entered openings in the CURRENT appointment
// and suggests/auto-fills values for future openings.
// ═══════════════════════════════════════════════════════════════

export interface NeverAskTwiceState {
  appointmentId: string;
  /** Detected job-wide defaults from existing openings */
  jobDefaults: Record<string, { value: any; count: number; total: number; confidence: number }>;
  /** Fields that have been manually changed by the rep on any opening */
  manuallyChangedFields: Set<string>;
  /** Per-rep preferences stored across appointments */
  repPreferences: Record<string, any>;
}

const TRACKED_FIELDS = [
  'interiorColor', 'exteriorColor', 'gridStyle', 'gridPattern',
  'glassPackage', 'glassOption', 'screenOption', 'removalType',
  'seriesModel', 'foamEnhanced', 'nailFin', 'argon',
  'temperedGlass', 'obscureGlass', 'exteriorType', 'installType',
  'typeRemoved',
];

const STORAGE_KEY = 'wwa_never_ask_twice';

interface StoredPrefs {
  repId: string;
  preferences: Record<string, any>;
  lastUpdated: number;
}

function loadRepPrefs(repId: string): Record<string, any> {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${repId}`);
    if (raw) {
      const parsed: StoredPrefs = JSON.parse(raw);
      return parsed.preferences || {};
    }
  } catch (e) { console.debug("[swallowed error]", e); }
  return {};
}

function saveRepPrefs(repId: string, prefs: Record<string, any>) {
  const stored: StoredPrefs = { repId, preferences: prefs, lastUpdated: Date.now() };
  localStorage.setItem(`${STORAGE_KEY}_${repId}`, JSON.stringify(stored));
}

// ─── ANALYZE EXISTING OPENINGS FOR JOB DEFAULTS ────────────
export function analyzeJobDefaults(openings: any[]): NeverAskTwiceState['jobDefaults'] {
  const defaults: NeverAskTwiceState['jobDefaults'] = {};

  if (openings.length === 0) return defaults;

  for (const field of TRACKED_FIELDS) {
    const counts: Record<string, number> = {};
    let total = 0;

    for (const op of openings) {
      const val = op[field];
      if (val !== undefined && val !== null && val !== '' && val !== 'none' && val !== 0) {
        const key = typeof val === 'boolean' ? String(val) : String(val);
        counts[key] = (counts[key] || 0) + 1;
        total++;
      }
    }

    if (total > 0) {
      const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const [topValue, topCount] = entries[0];
      const confidence = topCount / openings.length;

      // Only suggest if at least 60% of openings use this value
      if (confidence >= 0.5) {
        // Convert back to proper type
        let parsedValue: any = topValue;
        if (topValue === 'true') parsedValue = true;
        else if (topValue === 'false') parsedValue = false;
        else if (!isNaN(Number(topValue)) && topValue !== '') parsedValue = Number(topValue);

        defaults[field] = { value: parsedValue, count: topCount, total: openings.length, confidence };
      }
    }
  }

  return defaults;
}

// ─── GET SUGGESTED DEFAULTS FOR A NEW OPENING ───────────────
export function getSuggestedDefaults(
  existingOpenings: any[],
  repId?: string,
): Record<string, any> {
  const jobDefaults = analyzeJobDefaults(existingOpenings);
  const suggested: Record<string, any> = {};

  // Apply job defaults (high confidence first)
  for (const [field, info] of Object.entries(jobDefaults)) {
    if (info.confidence >= 0.6) {
      suggested[field] = info.value;
    }
  }

  // Apply rep preferences (lower priority than job defaults)
  if (repId) {
    const repPrefs = loadRepPrefs(repId);
    for (const [field, value] of Object.entries(repPrefs)) {
      if (!(field in suggested)) {
        suggested[field] = value;
      }
    }
  }

  return suggested;
}

// ─── LEARN FROM A SAVED OPENING ─────────────────────────────
export function learnFromSavedOpening(opening: any, repId?: string) {
  if (!repId) return;

  const prefs = loadRepPrefs(repId);
  const trackablePrefs = ['glassOption', 'glassPackage', 'foamEnhanced', 'removalType',
    'seriesModel', 'screenOption'];

  for (const field of trackablePrefs) {
    const val = opening[field];
    if (val !== undefined && val !== null && val !== '' && val !== 'none') {
      prefs[field] = val;
    }
  }

  saveRepPrefs(repId, prefs);
}

// ─── DETECT BULK APPLY OPPORTUNITIES ────────────────────────
export interface BulkApplyOpportunity {
  id: string;
  field: string;
  fieldLabel: string;
  value: any;
  description: string;
  targetCount: number;
  alreadyApplied: number;
  icon: string;
}

const FIELD_LABELS: Record<string, string> = {
  interiorColor: 'Interior Color', exteriorColor: 'Exterior Color',
  gridStyle: 'Grid Style', gridPattern: 'Grid Pattern',
  glassPackage: 'Glass Package', glassOption: 'Glass Option',
  screenOption: 'Screen', removalType: 'Removal Type',
  seriesModel: 'Series/Model', foamEnhanced: 'Foam Enhanced',
  nailFin: 'Nail Fin', argon: 'Argon',
  temperedGlass: 'Tempered', obscureGlass: 'Obscure',
  exteriorType: 'Exterior Type', installType: 'Install Type',
  typeRemoved: 'Type Removed',
};

export function detectBulkApplyOpportunities(openings: any[]): BulkApplyOpportunity[] {
  if (openings.length < 2) return [];

  const opportunities: BulkApplyOpportunity[] = [];
  const defaults = analyzeJobDefaults(openings);

  for (const [field, info] of Object.entries(defaults)) {
    if (info.confidence >= 0.5 && info.count < openings.length) {
      const mismatchCount = openings.filter(o => {
        const val = o[field];
        return val === undefined || val === null || val === '' || val === 'none' || String(val) !== String(info.value);
      }).length;

      if (mismatchCount > 0 && mismatchCount < openings.length) {
        opportunities.push({
          id: `bulk-${field}`,
          field,
          fieldLabel: FIELD_LABELS[field] || field,
          value: info.value,
          description: `Apply "${info.value}" to ${mismatchCount} remaining opening${mismatchCount > 1 ? 's' : ''}`,
          targetCount: mismatchCount,
          alreadyApplied: info.count,
          icon: field.includes('color') ? '🎨' : field.includes('grid') ? '🔲' : '⚡',
        });
      }
    }
  }

  // Sort by impact (most targets first)
  return opportunities.sort((a, b) => b.targetCount - a.targetCount);
}

// ─── COLOR CONSISTENCY CHECK ────────────────────────────────
export function detectColorConsistency(openings: any[]): {
  isConsistent: boolean;
  suggestion?: string;
  interiorColor?: string;
  exteriorColor?: string;
} {
  if (openings.length < 2) return { isConsistent: true };

  const intColors = new Set(openings.map(o => o.interiorColor).filter(Boolean));
  const extColors = new Set(openings.map(o => o.exteriorColor).filter(Boolean));

  if (intColors.size === 1 && extColors.size === 1) {
    return {
      isConsistent: true,
      interiorColor: [...intColors][0],
      exteriorColor: [...extColors][0],
    };
  }

  if (intColors.size <= 2 && extColors.size <= 2) {
    return {
      isConsistent: false,
      suggestion: 'Mixed colors detected. Apply same color to all openings?',
    };
  }

  return { isConsistent: false };
}

// ─── GRID CONSISTENCY CHECK ─────────────────────────────────
export function detectGridPattern(openings: any[]): {
  hasMixedGrids: boolean;
  frontFacingGrids?: string;
  suggestion?: string;
} {
  if (openings.length < 2) return { hasMixedGrids: false };

  const gridStyles = new Set(openings.map(o => o.gridStyle).filter(v => v && v !== 'None'));

  if (gridStyles.size === 0) return { hasMixedGrids: false };

  const frontOpenings = openings.filter(o => (o.elevation || '').toLowerCase() === 'front');
  const frontGrids = new Set(frontOpenings.map(o => o.gridStyle).filter(v => v && v !== 'None'));

  if (frontGrids.size === 1 && gridStyles.size === 1) {
    return {
      hasMixedGrids: false,
      frontFacingGrids: [...frontGrids][0],
    };
  }

  if (gridStyles.size > 1) {
    return {
      hasMixedGrids: true,
      suggestion: `Mixed grid styles detected: ${[...gridStyles].join(', ')}. Apply same to all?`,
    };
  }

  return { hasMixedGrids: false };
}
