// ═══════════════════════════════════════════════════════════════
// Louisiana Residential Building Code Engine
// Based on 2021 IRC (adopted Jan 1 2023), 2021 IECC, LSUCC
// Climate Zone 2 · Louisiana State Fire Marshal jurisdiction
//
// DISCLAIMER: This tool assists sales reps in identifying LIKELY
// code issues. Final determination must be made by Window World
// management, local code officials, or the LA State Fire Marshal.
// ═══════════════════════════════════════════════════════════════

export type CodeSeverity = 'critical' | 'high' | 'warning' | 'info';
export type CodeCategory =
  | 'egress' | 'tempered' | 'safety_glazing' | 'energy'
  | 'replacement' | 'installation' | 'sill_height' | 'door'
  | 'siding' | 'bedroom' | 'bathroom' | 'low_glass'
  | 'stair_proximity' | 'specialty' | 'mull';

export interface CodeRule {
  id: string;
  name: string;
  category: CodeCategory;
  severity: CodeSeverity;
  codeRef: string;        // e.g. "IRC R310.2.1"
  codeSource: string;     // e.g. "2021 IRC"
  description: string;
  whyItMatters: string;
  howToFix: string;
  blocksSubmission: boolean;
  overrideAllowed: boolean;
  overrideRequires?: string;
}

export interface CodeViolation {
  ruleId: string;
  rule: CodeRule;
  openingNumber: number;
  detail: string;
  currentValue?: string;
  requiredValue?: string;
  recommendedFix?: { label: string; fields: Record<string, any> };
}

// ── Room type detection helpers ──────────────────────────────
function isLikelyBedroom(o: any): boolean {
  const room = (o.roomLocation || '').toLowerCase();
  return /bed|master|guest|kid|child|nursery|sleep/i.test(room);
}
function isLikelyBathroom(o: any): boolean {
  const room = (o.roomLocation || '').toLowerCase();
  return /bath|shower|tub|powder|restroom|lavatory/i.test(room);
}
function isNearDoor(o: any): boolean {
  return !!o.nearDoor || /door|entry|front|back|patio|slider/i.test(o.installNotes || '');
}
function isNearStairs(o: any): boolean {
  return !!o.nearStairway || /stair|landing|step/i.test(o.installNotes || '');
}
function isDoor(o: any): boolean {
  return /door|sgd|patio_door|front_door|back_door|sliding_glass/i.test(o.productCategory || '');
}
function isSlidingGlassDoor(o: any): boolean {
  return /sgd|sliding.*glass|patio_door/i.test(o.productCategory || '');
}

// ── Egress calculation ──────────────────────────────────────
export function calcNetClearOpening(w: number, h: number): number {
  return (w * h) / 144; // inches to sq ft
}

// ═══════════════════════════════════════════════════════════════
// RULE DEFINITIONS
// ═══════════════════════════════════════════════════════════════
export const LA_CODE_RULES: CodeRule[] = [
  // ── EGRESS ─────────────────────────────────────────────────
  {
    id: 'LA-EGR-001', name: 'Egress: Minimum Net Clear Opening',
    category: 'egress', severity: 'critical',
    codeRef: 'IRC R310.2.1', codeSource: '2021 IRC',
    description: 'Bedroom egress openings must provide minimum 5.7 sq ft net clear opening (5.0 sq ft at grade).',
    whyItMatters: 'Emergency responders must be able to enter and occupants must be able to escape through bedroom windows during a fire.',
    howToFix: 'Increase window width or height, or switch to a casement which provides larger clear openings.',
    blocksSubmission: true, overrideAllowed: true,
    overrideRequires: 'Manager approval + documentation that replacement exception applies (IRC R310.5)',
  },
  {
    id: 'LA-EGR-002', name: 'Egress: Minimum Width 20"',
    category: 'egress', severity: 'critical',
    codeRef: 'IRC R310.2.1', codeSource: '2021 IRC',
    description: 'Egress opening must have minimum 20" net clear width.',
    whyItMatters: 'A firefighter in gear must be able to fit through the opening.',
    howToFix: 'Increase window width to provide at least 20" clear opening.',
    blocksSubmission: true, overrideAllowed: true,
    overrideRequires: 'Manager approval + replacement window exception documentation',
  },
  {
    id: 'LA-EGR-003', name: 'Egress: Minimum Height 24"',
    category: 'egress', severity: 'critical',
    codeRef: 'IRC R310.2.1', codeSource: '2021 IRC',
    description: 'Egress opening must have minimum 24" net clear height.',
    whyItMatters: 'Opening must be tall enough for a person to climb through during an emergency.',
    howToFix: 'Increase window height or switch to a style with larger clear opening.',
    blocksSubmission: true, overrideAllowed: true,
    overrideRequires: 'Manager approval + replacement window exception documentation',
  },
  {
    id: 'LA-EGR-004', name: 'Egress: Maximum Sill Height 44"',
    category: 'sill_height', severity: 'high',
    codeRef: 'IRC R310.2.2', codeSource: '2021 IRC',
    description: 'Egress sill height must not exceed 44" above finished floor.',
    whyItMatters: 'Occupants (including children) must be able to reach and climb through the window during an emergency.',
    howToFix: 'Verify sill height with homeowner. If over 44", note replacement window exception if applicable.',
    blocksSubmission: false, overrideAllowed: true,
    overrideRequires: 'Field measurement confirming sill height + replacement exception note',
  },
  {
    id: 'LA-EGR-005', name: 'Egress: Operable from Inside',
    category: 'egress', severity: 'critical',
    codeRef: 'IRC R310.1.1', codeSource: '2021 IRC',
    description: 'Egress windows must be operable from inside without keys, tools, or special knowledge.',
    whyItMatters: 'In an emergency, anyone must be able to open the window quickly.',
    howToFix: 'Ensure window is operable type (DH, SH, casement, slider, awning). Picture windows cannot serve as egress.',
    blocksSubmission: true, overrideAllowed: false,
  },

  // ── SAFETY GLAZING / TEMPERED ──────────────────────────────
  {
    id: 'LA-TMP-001', name: 'Tempered: Glass in Doors',
    category: 'tempered', severity: 'critical',
    codeRef: 'IRC R308.4.1', codeSource: '2021 IRC',
    description: 'All glazing in swinging, sliding, and bifold doors requires safety glazing.',
    whyItMatters: 'Door glass is at high risk of impact. Non-tempered glass can shatter into dangerous shards.',
    howToFix: 'Enable tempered glass on this door unit.',
    blocksSubmission: true, overrideAllowed: false,
  },
  {
    id: 'LA-TMP-002', name: 'Tempered: Sliding Glass Door',
    category: 'tempered', severity: 'critical',
    codeRef: 'IRC R308.4.1', codeSource: '2021 IRC',
    description: 'Sliding glass doors require safety glazing on all panels.',
    whyItMatters: 'Large glass panels in traffic paths create high impact risk.',
    howToFix: 'Enable full tempered glass.',
    blocksSubmission: true, overrideAllowed: false,
  },
  {
    id: 'LA-TMP-003', name: 'Tempered: Adjacent to Door',
    category: 'tempered', severity: 'high',
    codeRef: 'IRC R308.4.2', codeSource: '2021 IRC',
    description: 'Glass within 24" of a door and with bottom edge below 60" requires safety glazing.',
    whyItMatters: 'Windows near doors are in the swing path and subject to accidental impact.',
    howToFix: 'Enable tempered glass, or verify the window is more than 24" from the nearest door.',
    blocksSubmission: false, overrideAllowed: true,
    overrideRequires: 'Field measurement confirming window is >24" from door edge',
  },
  {
    id: 'LA-TMP-004', name: 'Tempered: Bathroom / Wet Area',
    category: 'bathroom', severity: 'high',
    codeRef: 'IRC R308.4.5', codeSource: '2021 IRC',
    description: 'Glass in bathrooms with bottom edge below 60" above standing surface requires safety glazing.',
    whyItMatters: 'Wet surfaces increase slip and fall risk. Impact with non-tempered glass can cause severe injury.',
    howToFix: 'Enable tempered glass for this bathroom window.',
    blocksSubmission: false, overrideAllowed: true,
    overrideRequires: 'Confirmation that glass bottom edge is >60" above floor',
  },
  {
    id: 'LA-TMP-005', name: 'Tempered: Low Glass Near Floor',
    category: 'low_glass', severity: 'high',
    codeRef: 'IRC R308.4.3', codeSource: '2021 IRC',
    description: 'Glass >9 sqft with bottom edge <18" above floor, top edge >36", and walking surface within 36" requires safety glazing.',
    whyItMatters: 'Large low glass panels are in the fall zone. A person tripping could impact the glass.',
    howToFix: 'Enable tempered glass or verify the sill is 18" or higher above floor.',
    blocksSubmission: false, overrideAllowed: true,
    overrideRequires: 'Field measurement confirming sill height ≥18"',
  },
  {
    id: 'LA-TMP-006', name: 'Tempered: Near Stairs/Landing',
    category: 'stair_proximity', severity: 'high',
    codeRef: 'IRC R308.4.6', codeSource: '2021 IRC',
    description: 'Glass with bottom edge <36" above adjacent stair/ramp walking surface requires safety glazing.',
    whyItMatters: 'Falls on stairs can propel a person into adjacent glazing.',
    howToFix: 'Enable tempered glass for this window near stairs.',
    blocksSubmission: false, overrideAllowed: true,
    overrideRequires: 'Field measurement confirming glass bottom edge ≥36" above stair surface',
  },

  // ── ENERGY (IECC) ─────────────────────────────────────────
  {
    id: 'LA-NRG-001', name: 'Energy: U-Factor Compliance',
    category: 'energy', severity: 'info',
    codeRef: 'IECC Table R402.1.2', codeSource: '2021 IECC',
    description: 'Louisiana (Climate Zone 2) requires max U-factor 0.40 for windows.',
    whyItMatters: 'Energy code compliance ensures the home meets minimum insulation standards and qualifies for permits.',
    howToFix: 'Recommend SolarZone or SolarZone Elite glass package which meets U-0.40.',
    blocksSubmission: false, overrideAllowed: true,
  },
  {
    id: 'LA-NRG-002', name: 'Energy: SHGC Compliance',
    category: 'energy', severity: 'info',
    codeRef: 'IECC Table R402.1.2', codeSource: '2021 IECC',
    description: 'Louisiana (Climate Zone 2) requires max SHGC 0.25 for windows.',
    whyItMatters: 'Low SHGC reduces solar heat gain, lowering cooling costs in Louisiana\'s hot climate.',
    howToFix: 'Recommend Low-E glass package. SolarZone Elite provides best SHGC performance.',
    blocksSubmission: false, overrideAllowed: true,
  },
  {
    id: 'LA-NRG-003', name: 'Energy: Argon Recommendation',
    category: 'energy', severity: 'info',
    codeRef: 'IECC R402.3', codeSource: '2021 IECC',
    description: 'Argon gas fill improves U-factor performance for energy code compliance.',
    whyItMatters: 'Argon-filled windows provide better insulation, helping meet Louisiana energy requirements.',
    howToFix: 'Enable argon gas fill option.',
    blocksSubmission: false, overrideAllowed: true,
  },

  // ── REPLACEMENT WINDOW ────────────────────────────────────
  {
    id: 'LA-RPL-001', name: 'Replacement: Use Smallest Measurement',
    category: 'replacement', severity: 'warning',
    codeRef: 'Window World Field Standard', codeSource: 'WW Install Guide',
    description: 'Replacement windows must be ordered using the smallest of the 3-point measurements (top/middle/bottom width, left/center/right height).',
    whyItMatters: 'Openings are rarely perfectly square. Using the smallest measurement ensures the window fits without forcing.',
    howToFix: 'Verify width and height are the smallest of the 3 measurements taken at each position.',
    blocksSubmission: false, overrideAllowed: true,
    overrideRequires: 'Rep confirmation that smallest measurement was used',
  },
  {
    id: 'LA-RPL-002', name: 'Replacement: Depth Check Required',
    category: 'replacement', severity: 'warning',
    codeRef: 'Window World Field Standard', codeSource: 'WW Install Guide',
    description: 'Replacement insert windows require minimum frame depth measurement to ensure proper fit.',
    whyItMatters: 'Insufficient depth causes the window to protrude past the frame, creating water intrusion risk.',
    howToFix: 'Measure frame depth and record. Minimum 3.25" typically required for standard inserts.',
    blocksSubmission: false, overrideAllowed: true,
    overrideRequires: 'Depth measurement recorded in notes',
  },

  // ── INSTALLATION ──────────────────────────────────────────
  {
    id: 'LA-INS-001', name: 'Installation: Brick House Outside Measurement',
    category: 'installation', severity: 'high',
    codeRef: 'Window World Field Standard', codeSource: 'WW Install Guide',
    description: 'Brick houses must be measured from outside. Use the smallest of 3 measurements.',
    whyItMatters: 'Brick openings taper. Inside measurements will be larger than actual opening, causing incorrect window size.',
    howToFix: 'Confirm measurement was taken from outside. Enable Brick House Mode.',
    blocksSubmission: false, overrideAllowed: true,
    overrideRequires: 'Rep confirmation of outside measurement',
  },
  {
    id: 'LA-INS-002', name: 'Installation: Nail Fin on Brick',
    category: 'installation', severity: 'warning',
    codeRef: 'Window World Field Standard', codeSource: 'WW Install Guide',
    description: 'Nail fin installation is not appropriate for brick exterior homes.',
    whyItMatters: 'Nail fins cannot be properly secured to brick. This causes water infiltration and structural issues.',
    howToFix: 'Remove nail fin option. Use insert or flush-mount installation for brick.',
    blocksSubmission: false, overrideAllowed: false,
  },
];

// ═══════════════════════════════════════════════════════════════
// MAIN VALIDATION FUNCTION
// ═══════════════════════════════════════════════════════════════
export function validateLouisianaCode(opening: any, allOpenings: any[]): CodeViolation[] {
  const violations: CodeViolation[] = [];
  const num = opening.openingNumber ?? 0;
  const w = opening.width || 0;
  const h = opening.height || 0;

  // ── EGRESS CHECKS (bedroom openings) ──────────────────────
  if (isLikelyBedroom(opening) && w > 0 && h > 0) {
    // Picture windows cannot serve as egress
    if (/picture/i.test(opening.productCategory || '')) {
      const rule = LA_CODE_RULES.find(r => r.id === 'LA-EGR-005')!;
      violations.push({
        ruleId: rule.id, rule, openingNumber: num,
        detail: `Bedroom #${num} has a picture window which cannot serve as emergency egress — it does not open.`,
        recommendedFix: { label: 'Change to Double Hung', fields: { productCategory: 'double_hung' } },
      });
    } else {
      // Net clear opening (rough estimate: ~80% of nominal for DH, ~90% for casement)
      const clearFactor = /casement|awning/i.test(opening.productCategory || '') ? 0.90 : 0.80;
      const clearW = w * clearFactor;
      const clearH = h * clearFactor;
      const clearArea = calcNetClearOpening(clearW, clearH);

      if (clearArea < 5.7) {
        const rule = LA_CODE_RULES.find(r => r.id === 'LA-EGR-001')!;
        violations.push({
          ruleId: rule.id, rule, openingNumber: num,
          detail: `Bedroom #${num}: estimated clear opening ${clearArea.toFixed(1)} sq ft is below the 5.7 sq ft minimum.`,
          currentValue: `${clearArea.toFixed(1)} sq ft`,
          requiredValue: '≥ 5.7 sq ft',
        });
      }
      if (clearW < 20) {
        const rule = LA_CODE_RULES.find(r => r.id === 'LA-EGR-002')!;
        violations.push({
          ruleId: rule.id, rule, openingNumber: num,
          detail: `Bedroom #${num}: estimated clear width ${clearW.toFixed(1)}" is below 20" minimum.`,
          currentValue: `${clearW.toFixed(1)}"`, requiredValue: '≥ 20"',
        });
      }
      if (clearH < 24) {
        const rule = LA_CODE_RULES.find(r => r.id === 'LA-EGR-003')!;
        violations.push({
          ruleId: rule.id, rule, openingNumber: num,
          detail: `Bedroom #${num}: estimated clear height ${clearH.toFixed(1)}" is below 24" minimum.`,
          currentValue: `${clearH.toFixed(1)}"`, requiredValue: '≥ 24"',
        });
      }
    }

    // Sill height check
    if (opening.sillHeight && opening.sillHeight > 44) {
      const rule = LA_CODE_RULES.find(r => r.id === 'LA-EGR-004')!;
      violations.push({
        ruleId: rule.id, rule, openingNumber: num,
        detail: `Bedroom #${num}: sill height ${opening.sillHeight}" exceeds 44" maximum for egress.`,
        currentValue: `${opening.sillHeight}"`, requiredValue: '≤ 44"',
      });
    }
  }

  // ── TEMPERED / SAFETY GLAZING ─────────────────────────────
  const hasTempered = opening.temperedGlass === 'full' || opening.temperedGlass === 'half';

  // Doors always require tempered
  if (isDoor(opening) && !hasTempered) {
    const rule = isSlidingGlassDoor(opening)
      ? LA_CODE_RULES.find(r => r.id === 'LA-TMP-002')!
      : LA_CODE_RULES.find(r => r.id === 'LA-TMP-001')!;
    violations.push({
      ruleId: rule.id, rule, openingNumber: num,
      detail: `#${num}: ${opening.productCategory} requires safety glazing per IRC R308.4.1.`,
      recommendedFix: { label: 'Add tempered', fields: { temperedGlass: 'full' } },
    });
  }

  // Adjacent to door
  if (isNearDoor(opening) && !isDoor(opening) && !hasTempered) {
    const rule = LA_CODE_RULES.find(r => r.id === 'LA-TMP-003')!;
    violations.push({
      ruleId: rule.id, rule, openingNumber: num,
      detail: `#${num}: window is noted as near a door — safety glazing likely required within 24".`,
      recommendedFix: { label: 'Add tempered', fields: { temperedGlass: 'full' } },
    });
  }

  // Bathroom
  if (isLikelyBathroom(opening) && !hasTempered) {
    const rule = LA_CODE_RULES.find(r => r.id === 'LA-TMP-004')!;
    violations.push({
      ruleId: rule.id, rule, openingNumber: num,
      detail: `#${num}: bathroom window likely requires safety glazing per IRC R308.4.5.`,
      recommendedFix: { label: 'Add tempered', fields: { temperedGlass: 'full' } },
    });
  }

  // Low glass (large panel near floor)
  const paneArea = (w * h) / 144;
  if (paneArea > 9 && opening.sillHeight !== undefined && opening.sillHeight < 18 && !hasTempered) {
    const rule = LA_CODE_RULES.find(r => r.id === 'LA-TMP-005')!;
    violations.push({
      ruleId: rule.id, rule, openingNumber: num,
      detail: `#${num}: large glass (${paneArea.toFixed(1)} sqft) with low sill (${opening.sillHeight}") requires safety glazing.`,
      recommendedFix: { label: 'Add tempered', fields: { temperedGlass: 'full' } },
    });
  }

  // Near stairs
  if (isNearStairs(opening) && !hasTempered) {
    const rule = LA_CODE_RULES.find(r => r.id === 'LA-TMP-006')!;
    violations.push({
      ruleId: rule.id, rule, openingNumber: num,
      detail: `#${num}: window near stairs likely requires safety glazing per IRC R308.4.6.`,
      recommendedFix: { label: 'Add tempered', fields: { temperedGlass: 'full' } },
    });
  }

  // ── ENERGY RECOMMENDATIONS ────────────────────────────────
  const glassPkg = (opening.glassPackage || '').toLowerCase();
  if (glassPkg === 'clear' || glassPkg === '') {
    const rule = LA_CODE_RULES.find(r => r.id === 'LA-NRG-001')!;
    violations.push({
      ruleId: rule.id, rule, openingNumber: num,
      detail: `#${num}: clear glass may not meet Louisiana IECC U-factor 0.40 requirement. Recommend Low-E package.`,
      recommendedFix: { label: 'Upgrade to SolarZone', fields: { glassPackage: 'SolarZone' } },
    });
  }
  if (!opening.argon && glassPkg !== 'solarzone elite') {
    const rule = LA_CODE_RULES.find(r => r.id === 'LA-NRG-003')!;
    violations.push({
      ruleId: rule.id, rule, openingNumber: num,
      detail: `#${num}: argon gas fill recommended for Louisiana energy code compliance.`,
      recommendedFix: { label: 'Add argon', fields: { argon: true } },
    });
  }

  // ── REPLACEMENT / INSTALLATION ────────────────────────────
  if (opening.exteriorType === 'brick' || opening.isBrickHouse) {
    if (opening.nailFin) {
      const rule = LA_CODE_RULES.find(r => r.id === 'LA-INS-002')!;
      violations.push({
        ruleId: rule.id, rule, openingNumber: num,
        detail: `#${num}: nail fin selected on brick house — not appropriate for brick exterior.`,
        recommendedFix: { label: 'Remove nail fin', fields: { nailFin: false } },
      });
    }
  }

  return violations;
}

// ═══════════════════════════════════════════════════════════════
// PROJECT-WIDE CODE AUDIT
// ═══════════════════════════════════════════════════════════════
export interface CodeAuditReport {
  violations: CodeViolation[];
  byCategory: Record<string, CodeViolation[]>;
  bySeverity: Record<CodeSeverity, CodeViolation[]>;
  counts: { critical: number; high: number; warning: number; info: number; total: number };
  egressCompliant: boolean;
  safetyGlazingComplete: boolean;
  energyCompliant: boolean;
}

export function auditProject(openings: any[]): CodeAuditReport {
  const violations: CodeViolation[] = [];
  for (const op of openings) {
    violations.push(...validateLouisianaCode(op, openings));
  }

  const byCategory: Record<string, CodeViolation[]> = {};
  const bySeverity: Record<CodeSeverity, CodeViolation[]> = { critical: [], high: [], warning: [], info: [] };

  for (const v of violations) {
    (byCategory[v.rule.category] ??= []).push(v);
    bySeverity[v.rule.severity].push(v);
  }

  return {
    violations, byCategory, bySeverity,
    counts: {
      critical: bySeverity.critical.length,
      high: bySeverity.high.length,
      warning: bySeverity.warning.length,
      info: bySeverity.info.length,
      total: violations.length,
    },
    egressCompliant: !violations.some(v => v.rule.category === 'egress'),
    safetyGlazingComplete: !violations.some(v => ['tempered', 'bathroom', 'low_glass', 'stair_proximity'].includes(v.rule.category)),
    energyCompliant: !violations.some(v => v.rule.category === 'energy' && v.rule.severity !== 'info'),
  };
}

// ═══════════════════════════════════════════════════════════════
// REP COACHING — Plain-English answers to common questions
// ═══════════════════════════════════════════════════════════════
export const CODE_COACHING: Record<string, string> = {
  'why tempered': 'Louisiana adopted the 2021 IRC which requires safety glazing (tempered) in hazardous locations: near doors (within 24"), in bathrooms near tubs/showers, near stairs, and for large low glass panels. This prevents dangerous shards if glass breaks from impact.',
  'why egress': 'Louisiana requires bedroom windows to serve as emergency escape routes (IRC R310). The window must open to at least 5.7 sq ft, be at least 20" wide and 24" tall when open, with a sill no higher than 44" from the floor. This lets firefighters enter and occupants escape.',
  'egress double hung': 'Double hung windows can meet egress if the clear opening (when the bottom sash is fully raised) provides ≥5.7 sq ft, ≥20" width, and ≥24" height. Larger DH sizes (e.g., 36"×60") typically qualify. Smaller sizes may not — check the manufacturer\'s net clear opening specs.',
  'egress casement': 'Casement windows are excellent for egress because they crank fully open, providing roughly 90% of nominal size as clear opening. A 24"×36" casement can meet egress requirements more easily than a same-size double hung.',
  'sill height': 'IRC R310.2.2 limits egress sill height to 44" above the finished floor. If replacing a window with a high sill, the replacement window exception (IRC R310.5) may allow it if you use the manufacturer\'s largest standard size that fits the opening.',
  'replacement exception': 'IRC R310.5 allows replacement windows in existing homes to use the manufacturer\'s largest standard size that fits the existing opening, even if it doesn\'t meet full egress dimensions — as long as the new window provides equal or greater opening area and the same operating style.',
  'energy louisiana': 'Louisiana is Climate Zone 2 under the 2021 IECC. Windows must meet: U-factor ≤0.40 and SHGC ≤0.25. SolarZone and SolarZone Elite glass packages meet these requirements. Clear glass does not. Argon fill helps meet the U-factor target.',
  'brick measurement': 'Brick openings must be measured from OUTSIDE because the brick opening is smaller than the interior opening. Take 3 measurements each for width (top/middle/bottom) and height (left/center/right). Use the SMALLEST measurement to order the window.',
};
