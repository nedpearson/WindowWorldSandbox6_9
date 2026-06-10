// ═══════════════════════════════════════════════════════════════
// BTR Door Contract Engine
// Extracted from: BTR Door Contract.xlsx
// Sheets: Contract, Payment Options, Door 1-5, Checklist
// ═══════════════════════════════════════════════════════════════

// ── Door configuration types ────────────────────────────────
export type DoorSwing = 'inswing' | 'outswing';
export type DoorHand = 'left_hand' | 'right_hand';
export type DoorCategory = 'entry' | 'patio' | 'sgd' | 'storm' | 'french';
export type InteriorCasing = '2 1/4' | '3 1/4' | '3 1/2' | 'custom';
export type ExteriorMoulding = 'brickmould' | 'flat_casing' | 'custom' | 'none';

export interface DoorOrderLine {
  doorNumber: number;
  location: string;
  category: DoorCategory;
  description: string;

  // ── Measurement (from Door 1-5 sheets) ─────────────────
  jambMeasurement: number;       // Hump to Hump width
  unitWidth: number;             // jambMeasurement + 2.5"
  roughOpeningWidth: number;     // unitWidth + 0.75"
  sillToHumpHeight: number;      // Bottom of exterior sill to hump
  unitHeight: number;            // sillToHumpHeight + 1.25"
  roughOpeningHeight: number;    // unitHeight + 0.5"
  jambDepth: number;             // Width of jamb (no brickmold/casing)
  outerTipWidth: number;         // O.M. measurement W
  outerTipHeight: number;        // O.M. measurement H

  // ── Configuration ──────────────────────────────────────
  swing: DoorSwing;
  hand: DoorHand;
  interiorCasing: InteriorCasing;
  exteriorMoulding: ExteriorMoulding;
  doorStyle: string;

  // ── Glass / Color / Hardware ────────────────────────────
  glassStyle: string;
  glassType: string;            // tempered always for doors
  interiorColor: string;
  exteriorColor: string;
  hardwareFinish: string;
  locksetType: string;
  threshold: string;
  peephole: boolean;
  sidelites: string;
  transom: string;

  // ── Pricing ────────────────────────────────────────────
  amount: number;
  adders: DoorAdder[];
  notes: string;
}

export interface DoorAdder {
  label: string;
  amount: number;
}

export interface DoorContractData {
  // ── Customer (from Contract sheet) ─────────────────────
  customerName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  email: string;
  primaryPhone: string;
  secondaryPhone: string;
  otherPhone: string;
  customerId: string;

  // ── Job info ───────────────────────────────────────────
  completeJob: boolean;
  remainingWindows: boolean;
  location: 'Baton Rouge' | 'New Orleans' | 'Lafayette';
  homeBuiltYear: number;

  // ── Door lines ─────────────────────────────────────────
  doors: DoorOrderLine[];

  // ── Pricing (from Contract sheet) ──────────────────────
  totalListPrice: number;
  adminFee: number;             // $150 standard
  salesTax: number;
  totalAmount: number;
  deposit50: number;
  balanceDue: number;
  amountFinanced: number;
  stJudeContribution: number;

  // ── Payment ────────────────────────────────────────────
  paymentMethod: 'check' | 'visa' | 'amex' | 'mastercard' | 'discover' | 'finance';
  checkNumber: string;
  cardLast4: string;
  cardExp: string;
  cardSecCode: string;
  financeOption: string;

  // ── Contract terms ─────────────────────────────────────
  unfinishedDoorInitials: string;  // "initial if door is unfinished"
  leadContainmentInitials: string;
  cancellationInitials: string;
}

// ── Default empty door line ─────────────────────────────────
export function createEmptyDoorLine(doorNumber: number): DoorOrderLine {
  return {
    doorNumber, location: '', category: 'entry', description: '',
    jambMeasurement: 0, unitWidth: 0, roughOpeningWidth: 0,
    sillToHumpHeight: 0, unitHeight: 0, roughOpeningHeight: 0,
    jambDepth: 0, outerTipWidth: 0, outerTipHeight: 0,
    swing: 'inswing', hand: 'left_hand',
    interiorCasing: '3 1/4', exteriorMoulding: 'brickmould',
    doorStyle: '', glassStyle: '', glassType: 'tempered',
    interiorColor: 'White', exteriorColor: 'White',
    hardwareFinish: '', locksetType: '', threshold: '',
    peephole: false, sidelites: '', transom: '',
    amount: 0, adders: [], notes: '',
  };
}

// ── Auto-calculate door dimensions ──────────────────────────
export function calcDoorDimensions(jambWidth: number, sillToHump: number) {
  return {
    unitWidth: jambWidth + 2.5,
    roughOpeningWidth: jambWidth + 2.5 + 0.75,
    unitHeight: sillToHump + 1.25,
    roughOpeningHeight: sillToHump + 1.25 + 0.5,
  };
}

// ── Payment plan options (from Payment Options sheet) ────────
export const DOOR_PAYMENT_PLANS = [
  { code: '2318', label: '15 Months, No Interest', rate: 0, months: 15 },
  { code: '1064', label: '18 Months, No Interest', rate: 0, months: 18 },
  { code: '4357', label: '60 Equal Monthly Payments @ 7.99%', rate: 7.99, months: 60 },
  { code: '3671', label: '120 Equal Monthly Payments @ 9.99%', rate: 9.99, months: 120 },
] as const;

// ── Door adder prices (from Contract sheet) ─────────────────
export const DOOR_ADDER_PRICES: Record<string, number> = {
  'Deadbolt': 12,
  'Peephole': 22,
};

// ═══════════════════════════════════════════════════════════════
// DOOR VALIDATION RULES
// ═══════════════════════════════════════════════════════════════
export interface DoorValidationWarning {
  id: string;
  severity: 'critical' | 'high' | 'warning' | 'info';
  field: string;
  message: string;
  howToFix: string;
  recommendedFix?: { label: string; fields: Record<string, any> };
}

export function validateDoorLine(door: DoorOrderLine): DoorValidationWarning[] {
  const warnings: DoorValidationWarning[] = [];
  const n = door.doorNumber;

  // ── Required fields ────────────────────────────────────
  if (!door.location) warnings.push({
    id: `door-loc-${n}`, severity: 'critical', field: 'location',
    message: `Door ${n}: Location is required.`,
    howToFix: 'Enter the door location (e.g. Front Entry, Back Door, Garage to House).',
  });
  if (!door.jambMeasurement) warnings.push({
    id: `door-jamb-w-${n}`, severity: 'critical', field: 'jambMeasurement',
    message: `Door ${n}: Jamb width measurement is required.`,
    howToFix: 'Measure from hump to hump across the door jamb.',
  });
  if (!door.sillToHumpHeight) warnings.push({
    id: `door-sill-h-${n}`, severity: 'critical', field: 'sillToHumpHeight',
    message: `Door ${n}: Height measurement (sill to hump) is required.`,
    howToFix: 'Measure from the bottom of the exterior sill to the hump at the top of the frame.',
  });
  if (!door.jambDepth) warnings.push({
    id: `door-depth-${n}`, severity: 'high', field: 'jambDepth',
    message: `Door ${n}: Jamb depth is missing.`,
    howToFix: 'Measure the width of the jamb (do not include brickmold or interior casing).',
  });
  if (!door.swing) warnings.push({
    id: `door-swing-${n}`, severity: 'critical', field: 'swing',
    message: `Door ${n}: Swing direction (inswing/outswing) is required.`,
    howToFix: 'Select inswing or outswing. Stand with back against hinge side and swing closest arm.',
  });
  if (!door.hand) warnings.push({
    id: `door-hand-${n}`, severity: 'critical', field: 'hand',
    message: `Door ${n}: Door handing (left/right) is required.`,
    howToFix: 'Place back against hinge side jamb, swing closest arm in direction of door.',
  });
  if (!door.doorStyle) warnings.push({
    id: `door-style-${n}`, severity: 'high', field: 'doorStyle',
    message: `Door ${n}: Door style is not selected.`,
    howToFix: 'Choose a door style from the catalog.',
  });
  if (!door.hardwareFinish) warnings.push({
    id: `door-hw-${n}`, severity: 'warning', field: 'hardwareFinish',
    message: `Door ${n}: Hardware finish not selected.`,
    howToFix: 'Select hardware finish (e.g. Satin Nickel, Oil Rubbed Bronze, Brass).',
  });
  if (!door.exteriorColor) warnings.push({
    id: `door-ext-color-${n}`, severity: 'warning', field: 'exteriorColor',
    message: `Door ${n}: Exterior color is not selected.`,
    howToFix: 'Choose exterior door color.',
  });

  // ── Safety: all door glass must be tempered ────────────
  if (door.glassStyle && door.glassType !== 'tempered') {
    warnings.push({
      id: `door-tempered-${n}`, severity: 'critical', field: 'glassType',
      message: `Door ${n}: Door glass must be tempered per IRC R308.4.1.`,
      howToFix: 'All glazing in doors requires safety glazing (tempered or laminated).',
      recommendedFix: { label: 'Set tempered', fields: { glassType: 'tempered' } },
    });
  }

  // ── Measurement sanity ─────────────────────────────────
  if (door.jambMeasurement > 0 && door.jambMeasurement < 24) {
    warnings.push({
      id: `door-narrow-${n}`, severity: 'high', field: 'jambMeasurement',
      message: `Door ${n}: Jamb measurement ${door.jambMeasurement}" seems too narrow for a door.`,
      howToFix: 'Verify measurement. Standard entry doors are 32"-36" wide.',
    });
  }
  if (door.sillToHumpHeight > 0 && door.sillToHumpHeight < 72) {
    warnings.push({
      id: `door-short-${n}`, severity: 'warning', field: 'sillToHumpHeight',
      message: `Door ${n}: Height ${door.sillToHumpHeight}" is below standard 80" door height.`,
      howToFix: 'Verify measurement. Standard entry doors are 80" tall.',
    });
  }

  return warnings;
}

export function validateDoorContract(contract: DoorContractData): DoorValidationWarning[] {
  const warnings: DoorValidationWarning[] = [];

  if (!contract.customerName) warnings.push({
    id: 'door-cust-name', severity: 'critical', field: 'customerName',
    message: 'Customer name is required on door contract.',
    howToFix: 'Enter the customer\'s full legal name.',
  });
  if (!contract.address) warnings.push({
    id: 'door-address', severity: 'critical', field: 'address',
    message: 'Address is required on door contract.',
    howToFix: 'Enter the full installation address.',
  });
  if (contract.doors.length === 0) warnings.push({
    id: 'door-no-lines', severity: 'critical', field: 'doors',
    message: 'No door order lines added.',
    howToFix: 'Add at least one door from the sketch or order form.',
  });
  if (contract.homeBuiltYear && contract.homeBuiltYear < 1978) warnings.push({
    id: 'door-lead', severity: 'high', field: 'homeBuiltYear',
    message: 'Pre-1978 home: Federal Lead Containment Law applies. Get initials.',
    howToFix: 'Confirm lead containment acknowledgment and capture initials.',
  });

  for (const door of contract.doors) {
    warnings.push(...validateDoorLine(door));
  }

  return warnings;
}
