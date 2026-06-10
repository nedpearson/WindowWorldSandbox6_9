// ═══════════════════════════════════════════════════════════
// Appointment Coach — AI-powered scoring & guidance engine
// Evaluates appointment data from multiple perspectives:
// senior manager, remeasure tech, installer,
// office processor, and QC reviewer.
// ═══════════════════════════════════════════════════════════

export type RiskLevel = 'PASS' | 'REVIEW' | 'HIGH_RISK';
export type CoachCategory = 'installer' | 'measurement' | 'pricing' | 'sketch' | 'photo' | 'contract' | 'forgotten';

export interface CoachItem {
  id: string;
  category: CoachCategory;
  severity: 'critical' | 'warning' | 'info' | 'tip';
  openingNumber?: number;
  message: string;
  detail?: string;
  jumpStep: number;
  resolved?: boolean;
}

export interface OpeningScore {
  openingNumber: number;
  room: string;
  installerClarity: number;
  measurementConfidence: number;
  riskFlags: string[];
  photoRequired: string[];
  missingNotes: string[];
  contextChecks: string[];
}

export interface CoachResult {
  items: CoachItem[];
  openingScores: OpeningScore[];
  appointmentScore: number;
  installerClarityScore: number;
  measurementConfidenceScore: number;
  pricingConfidenceScore: number;
  contractAccuracyScore: number;
  overallRisk: RiskLevel;
  commonlyForgotten: string[];
}

const SPECIALTY = ['eyebrow', 'circle_top', 'quarter_arch', 'custom_shape', 'octagon', 'hexagon', 'trapezoid'];
const DOORS = ['patio_door', 'sliding_door', 'french_door', 'entry_door'];

// ─── CONTEXTUAL CHECKLIST RULES ─────────────────────────
function runContextualChecks(op: any, houseMap: any, appointment: any): CoachItem[] {
  const items: CoachItem[] = [];
  const n = op.openingNumber;

  // Second floor
  if ((op.floorNumber || 1) >= 2) {
    if (!op.installNotes?.toLowerCase()?.includes('ladder') && !op.installNotes?.toLowerCase()?.includes('scaffold'))
      items.push({ id: `ctx-ladder-${n}`, category: 'installer', severity: 'warning', openingNumber: n, message: `Opening #${n}: 2nd floor — add ladder/scaffold note`, detail: 'Installers need to know access requirements for upper floors', jumpStep: 2 });
    if (!op.installNotes?.toLowerCase()?.includes('access'))
      items.push({ id: `ctx-access-${n}`, category: 'installer', severity: 'info', openingNumber: n, message: `Opening #${n}: Add access/difficulty note for floor ${op.floorNumber}`, jumpStep: 2 });
  }

  // Specialty shape
  if (SPECIALTY.includes(op.productCategory)) {
    if (!op.radius && !op.customRadius)
      items.push({ id: `ctx-radius-${n}`, category: 'measurement', severity: 'critical', openingNumber: n, message: `Opening #${n}: Specialty shape requires radius`, detail: 'Production cannot order without radius measurement', jumpStep: 2 });
    if (!op.legHeight)
      items.push({ id: `ctx-leg-${n}`, category: 'measurement', severity: 'warning', openingNumber: n, message: `Opening #${n}: Specialty shape — verify leg height`, jumpStep: 2 });
    items.push({ id: `ctx-spec-verify-${n}`, category: 'measurement', severity: 'info', openingNumber: n, message: `Opening #${n}: Specialty shape — production verification recommended`, jumpStep: 2 });
  }

  // Tempered glass likely situations
  if ((op.floorNumber || 1) === 1 && op.height && op.height < 24) {
    if (op.temperedGlass === 'none' || !op.temperedGlass)
      items.push({ id: `ctx-tempered-${n}`, category: 'forgotten', severity: 'warning', openingNumber: n, message: `Opening #${n}: Low window — confirm tempered glass not needed`, detail: 'Windows near floor level often require tempered glass per building code', jumpStep: 2 });
  }
  if (op.roomLocation?.toLowerCase()?.match(/bath|shower|tub/)) {
    if (op.temperedGlass === 'none' || !op.temperedGlass)
      items.push({ id: `ctx-bath-temp-${n}`, category: 'forgotten', severity: 'critical', openingNumber: n, message: `Opening #${n}: Bathroom — tempered glass likely required`, detail: 'Building code requires tempered glass within 60" of water source', jumpStep: 2 });
    if (op.obscureGlass === 'none' || !op.obscureGlass)
      items.push({ id: `ctx-bath-obsc-${n}`, category: 'forgotten', severity: 'warning', openingNumber: n, message: `Opening #${n}: Bathroom — consider obscure glass`, jumpStep: 2 });
  }

  // Brick exterior
  if (op.exteriorType?.toLowerCase()?.includes('brick') || appointment?.houseMap?.exteriorMaterial?.toLowerCase()?.includes('brick')) {
    if (!op.installNotes?.toLowerCase()?.includes('brick'))
      items.push({ id: `ctx-brick-${n}`, category: 'installer', severity: 'warning', openingNumber: n, message: `Opening #${n}: Brick exterior — add brickmold/install detail`, detail: 'Installer needs to know return depth and brickmold condition', jumpStep: 2 });
  }

  // Sill damage
  if (op.sillRepair || op.installNotes?.toLowerCase()?.includes('sill') || op.installNotes?.toLowerCase()?.includes('rot')) {
    if (!op.installerNotes?.toLowerCase()?.includes('sill'))
      items.push({ id: `ctx-sill-${n}`, category: 'installer', severity: 'warning', openingNumber: n, message: `Opening #${n}: Sill repair flagged — add detailed repair note`, jumpStep: 2 });
  }

  // Patio door
  if (DOORS.includes(op.productCategory)) {
    if (!op.hinge)
      items.push({ id: `ctx-door-hinge-${n}`, category: 'forgotten', severity: 'critical', openingNumber: n, message: `Opening #${n}: Door — hinge side not specified`, jumpStep: 2 });
    if (!op.installNotes?.toLowerCase()?.includes('track') && !op.installNotes?.toLowerCase()?.includes('threshold'))
      items.push({ id: `ctx-door-track-${n}`, category: 'installer', severity: 'warning', openingNumber: n, message: `Opening #${n}: Door — add track/threshold notes`, jumpStep: 2 });
  }

  // Lead paint
  if (appointment?.customer?.preLead1978) {
    items.push({ id: `ctx-lead-${n}`, category: 'installer', severity: 'critical', openingNumber: n, message: `Opening #${n}: Pre-1978 home — lead containment required`, jumpStep: 2 });
  }

  // Missing room/elevation
  if (!op.roomLocation)
    items.push({ id: `ctx-room-${n}`, category: 'installer', severity: 'warning', openingNumber: n, message: `Opening #${n}: No room label — installer won't know which window`, jumpStep: 2 });
  if (!op.elevation)
    items.push({ id: `ctx-elev-${n}`, category: 'installer', severity: 'warning', openingNumber: n, message: `Opening #${n}: No elevation — which side of house?`, jumpStep: 2 });

  return items;
}

// ─── INSTALLER CLARITY SCORE (per opening) ──────────────
function calcInstallerClarity(op: any, houseMap: any): number {
  let score = 0;
  const max = 10;
  if (op.roomLocation) score += 1;
  if (op.elevation) score += 1;
  if (op.width && op.height) score += 1.5;
  if (op.installNotes && op.installNotes.length > 10) score += 1.5;
  if (op.exteriorType) score += 1;
  if (op.removalType) score += 1;
  if (op.trimType || op.trimNotes) score += 0.5;
  if (op.floorNumber) score += 0.5;
  if (op.photos?.length > 0) score += 1;
  const hasMarker = houseMap?.markers?.some((m: any) => m.openingNumber === op.openingNumber);
  if (hasMarker) score += 1;
  return Math.round((score / max) * 100);
}

// ─── MEASUREMENT CONFIDENCE (per opening) ───────────────
function calcMeasurementConfidence(op: any): number {
  let score = 0;
  const max = 10;
  if (op.width && op.width > 0) score += 2;
  if (op.height && op.height > 0) score += 2;
  if (op.unitedInches && op.unitedInches > 0) score += 1;
  // Unusual dimension check
  if (op.width && op.height && op.width > 10 && op.width < 120 && op.height > 10 && op.height < 120) score += 1;
  else if (op.width || op.height) score -= 1; // suspicious
  if (!op.needsVerification) score += 1;
  if (op.photos?.length > 0) score += 1;
  if (!SPECIALTY.includes(op.productCategory)) score += 1; // simple shapes more reliable
  else if (op.radius || op.customRadius) score += 1; // specialty with radius ok
  if (op.installNotes && op.installNotes.length > 5) score += 1;
  return Math.min(100, Math.max(0, Math.round((score / max) * 100)));
}

// ─── PHOTO REQUIREMENTS ─────────────────────────────────
function getPhotoRequirements(op: any): string[] {
  const reqs: string[] = [];
  if ((op.floorNumber || 1) >= 2) reqs.push('Exterior photo (2nd floor access)');
  if (op.sillRepair) reqs.push('Sill damage close-up');
  if (SPECIALTY.includes(op.productCategory)) reqs.push('Measurement photo with tape');
  if (DOORS.includes(op.productCategory)) reqs.push('Track/frame photo', 'Threshold photo');
  if (op.installNotes?.toLowerCase()?.match(/rot|damage|mold/)) reqs.push('Damage detail photo');
  if (op.exteriorType?.toLowerCase()?.includes('brick')) reqs.push('Brickmold detail photo');
  return reqs;
}

// ─── COMMONLY FORGOTTEN ITEMS ───────────────────────────
function getCommonlyForgotten(openings: any[], appointment: any): string[] {
  const forgotten: string[] = [];
  const missing: Record<string, number> = {};
  for (const op of openings) {
    if (!op.floorNumber) missing['Floor number'] = (missing['Floor number'] || 0) + 1;
    if (!op.screenOption) missing['Screen option'] = (missing['Screen option'] || 0) + 1;
    if (!op.gridStyle) missing['Grid selection'] = (missing['Grid selection'] || 0) + 1;
    if (!op.interiorColor) missing['Interior color'] = (missing['Interior color'] || 0) + 1;
    if (!op.exteriorColor) missing['Exterior color'] = (missing['Exterior color'] || 0) + 1;
    if (!op.temperedGlass || op.temperedGlass === 'none') missing['Tempered glass'] = (missing['Tempered glass'] || 0) + 1;
    if (!op.installNotes) missing['Installer notes'] = (missing['Installer notes'] || 0) + 1;
    if (!op.removalType) missing['Removal/install type'] = (missing['Removal/install type'] || 0) + 1;
    if (!op.elevation) missing['Elevation/side'] = (missing['Elevation/side'] || 0) + 1;
  }
  // Surface the most commonly missed (>50% of openings)
  const threshold = Math.max(1, openings.length * 0.5);
  for (const [field, count] of Object.entries(missing).sort((a, b) => b[1] - a[1])) {
    if (count >= threshold) forgotten.push(`${field} (missing on ${count}/${openings.length})`);
  }
  if (appointment.depositAmount <= 0 && appointment.totalAmount > 0) forgotten.push('Deposit not recorded');
  if (!appointment.signatures?.length) forgotten.push('Customer signature');
  return forgotten.slice(0, 8);
}

// ─── CONTRACT/ORDER CONSISTENCY ─────────────────────────
function checkConsistency(appointment: any): CoachItem[] {
  const items: CoachItem[] = [];
  const openings = appointment.openings || [];
  if (openings.length === 0) return items;

  const computedSubtotal = openings.reduce((s: number, o: any) => s + (o.totalPrice || 0), 0);
  if (appointment.subtotal > 0 && Math.abs(computedSubtotal - appointment.subtotal) > 0.01) {
    items.push({ id: 'con-subtotal', category: 'contract', severity: 'critical', message: `Subtotal mismatch: openings=$${computedSubtotal.toFixed(2)} vs quote=$${appointment.subtotal.toFixed(2)}`, jumpStep: 3 });
  }

  // Check for openings with zero price
  const zeroPriced = openings.filter((o: any) => !o.totalPrice || o.totalPrice <= 0);
  if (zeroPriced.length > 0) {
    items.push({ id: 'con-zero-price', category: 'pricing', severity: 'critical', message: `${zeroPriced.length} opening(s) have no price — quote is incomplete`, jumpStep: 3 });
  }

  // Needs-verification check
  const unverified = openings.filter((o: any) => o.needsVerification);
  if (unverified.length > 0) {
    items.push({ id: 'con-unverified', category: 'pricing', severity: 'warning', message: `${unverified.length} opening(s) have unverified pricing`, jumpStep: 3 });
  }

  return items;
}

// ═══════════════════════════════════════════════════════════
// MAIN COACH FUNCTION
// ═══════════════════════════════════════════════════════════
export function runAppointmentCoach(appointment: any): CoachResult {
  const items: CoachItem[] = [];
  const openings: any[] = appointment.openings || [];
  const houseMap = appointment.houseMap || null;
  const openingScores: OpeningScore[] = [];

  let totalInstallerClarity = 0;
  let totalMeasurementConfidence = 0;

  // ─── Per-opening analysis ───────────────────────────
  for (const op of openings) {
    const contextItems = runContextualChecks(op, houseMap, appointment);
    items.push(...contextItems);

    const clarity = calcInstallerClarity(op, houseMap);
    const confidence = calcMeasurementConfidence(op);
    const photoReqs = getPhotoRequirements(op);
    const riskFlags: string[] = [];

    if (clarity < 40) riskFlags.push('Low installer clarity');
    if (confidence < 50) riskFlags.push('Low measurement confidence');
    if (SPECIALTY.includes(op.productCategory)) riskFlags.push('Specialty shape');
    if ((op.floorNumber || 1) >= 2) riskFlags.push('Upper floor');
    if (op.sillRepair) riskFlags.push('Sill repair needed');
    if (op.needsVerification) riskFlags.push('Price needs verification');

    // Photo requirements as coach items
    const existingPhotos = op.photos?.length || 0;
    if (photoReqs.length > 0 && existingPhotos === 0) {
      items.push({ id: `photo-req-${op.openingNumber}`, category: 'photo', severity: 'warning', openingNumber: op.openingNumber, message: `Opening #${op.openingNumber}: ${photoReqs.length} photo(s) recommended`, detail: photoReqs.join(', '), jumpStep: 2 });
    }

    // Low clarity warning
    if (clarity < 50) {
      items.push({ id: `clarity-low-${op.openingNumber}`, category: 'installer', severity: 'warning', openingNumber: op.openingNumber, message: `Opening #${op.openingNumber}: Installer clarity ${clarity}% — add more detail`, detail: 'An installer may not understand this opening. Add room, elevation, notes, and sketch marker.', jumpStep: 2 });
    }

    // Low confidence warning
    if (confidence < 50) {
      items.push({ id: `meas-low-${op.openingNumber}`, category: 'measurement', severity: 'warning', openingNumber: op.openingNumber, message: `Opening #${op.openingNumber}: Measurement confidence ${confidence}% — remeasure recommended`, jumpStep: 2 });
    }

    totalInstallerClarity += clarity;
    totalMeasurementConfidence += confidence;

    openingScores.push({
      openingNumber: op.openingNumber,
      room: op.roomLocation || 'Unnamed',
      installerClarity: clarity,
      measurementConfidence: confidence,
      riskFlags,
      photoRequired: photoReqs,
      missingNotes: contextItems.filter(i => i.category === 'installer').map(i => i.message),
      contextChecks: contextItems.map(i => i.message),
    });
  }

  // ─── Consistency checks ─────────────────────────────
  items.push(...checkConsistency(appointment));

  // ─── Sketch quality ─────────────────────────────────
  if (!houseMap?.sketchData) {
    items.push({ id: 'sketch-missing', category: 'sketch', severity: 'critical', message: 'No home sketch — office staff and installer need a layout', jumpStep: 2 });
  } else {
    const markerCount = houseMap?.markers?.length || 0;
    if (markerCount < openings.length) {
      items.push({ id: 'sketch-markers', category: 'sketch', severity: 'warning', message: `Only ${markerCount}/${openings.length} openings have sketch markers`, jumpStep: 2 });
    }
  }

  // ─── Commonly forgotten ─────────────────────────────
  const commonlyForgotten = getCommonlyForgotten(openings, appointment);
  for (const item of commonlyForgotten) {
    items.push({ id: `forgot-${item.slice(0, 20)}`, category: 'forgotten', severity: 'tip', message: `Commonly forgotten: ${item}`, jumpStep: 2 });
  }

  // ─── Aggregate scores ──────────────────────────────
  const count = Math.max(openings.length, 1);
  const installerClarityScore = Math.round(totalInstallerClarity / count);
  const measurementConfidenceScore = Math.round(totalMeasurementConfidence / count);

  // Pricing confidence
  const pricedCount = openings.filter((o: any) => o.totalPrice > 0).length;
  const verifiedCount = openings.filter((o: any) => !o.needsVerification).length;
  const pricingConfidenceScore = count > 0 ? Math.round(((pricedCount + verifiedCount) / (count * 2)) * 100) : 0;

  // Contract accuracy — deposit, total, and signatures (no tax since Window World doesn't charge tax)
  const hasDeposit = appointment.depositAmount > 0 ? 1 : 0;
  const hasTotal = appointment.totalAmount > 0 ? 1 : 0;
  const hasSigs = (appointment.signatures?.length || 0) > 0 ? 1 : 0;
  const contractAccuracyScore = Math.round(((hasDeposit + hasTotal + hasSigs) / 3) * 100);

  const appointmentScore = Math.round((installerClarityScore + measurementConfidenceScore + pricingConfidenceScore + contractAccuracyScore) / 4);

  let overallRisk: RiskLevel = 'PASS';
  if (appointmentScore < 50 || items.some(i => i.severity === 'critical')) overallRisk = 'HIGH_RISK';
  else if (appointmentScore < 75 || items.some(i => i.severity === 'warning')) overallRisk = 'REVIEW';

  // Sort: critical first
  const sevOrder = { critical: 0, warning: 1, info: 2, tip: 3 };
  items.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);

  return { items, openingScores, appointmentScore, installerClarityScore, measurementConfidenceScore, pricingConfidenceScore, contractAccuracyScore, overallRisk, commonlyForgotten };
}
