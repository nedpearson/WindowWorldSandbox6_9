// ═══════════════════════════════════════════════════════════════
// BTR Siding Contract Engine
// Extracted from: BTR Siding Contract.xlsx
// Sheets: Contract, Labor Sheet, Everlast Labor Sheet, Ascend Labor Sheet
// ═══════════════════════════════════════════════════════════════

// ── Siding system types (from Contract sheet) ───────────────
export type SidingSystem = 'prodigy' | 'ww4000' | 'ww4000_board_batten' | 'ascend' | 'ascend_board_batten' | 'everlast_45' | 'everlast_7' | 'everlast_board_batten';
export type SidingProfile = 'dutch_lap' | 'clapboard' | 'board_and_batten';

export interface SidingPricing {
  system: SidingSystem;
  label: string;
  pricePerSqft: number;
  profile: string;
}

// ── Extracted pricing from Contract sheet ────────────────────
export const SIDING_SYSTEM_PRICES: SidingPricing[] = [
  { system: 'prodigy', label: 'Prodigy Insulated Siding (R-5.3, 4.5")', pricePerSqft: 9.35, profile: 'Dutch Lap / Clapboard' },
  { system: 'ww4000', label: 'Window World-4000 Series (Charter Oak XL 4.5")', pricePerSqft: 8.25, profile: 'Dutch Lap / Clapboard' },
  { system: 'ww4000_board_batten', label: 'Window World-4000 Series (Charter Oak B&B 7")', pricePerSqft: 8.75, profile: 'Board & Batten' },
  { system: 'ascend', label: 'Ascend Composite Siding (AMI 7")', pricePerSqft: 11.00, profile: 'Standard' },
  { system: 'ascend_board_batten', label: 'Ascend Composite Siding (AMI B&B 12")', pricePerSqft: 12.25, profile: 'Board & Batten' },
  { system: 'everlast_45', label: 'Everlast Composite Siding (4.5")', pricePerSqft: 17.35, profile: 'Standard' },
  { system: 'everlast_7', label: 'Everlast Composite Siding (7")', pricePerSqft: 14.85, profile: 'Standard' },
  { system: 'everlast_board_batten', label: 'Everlast Composite Siding (B&B 11")', pricePerSqft: 17.25, profile: 'Board & Batten' },
];

// ── Patio ceiling pricing ───────────────────────────────────
export const PATIO_CEILING_PRICES = [
  { label: 'Charter Oak Vented Patio Ceiling', pricePerSqft: 7.89 },
  { label: 'Economy Vented Patio Ceiling', pricePerSqft: 6.89 },
];

// ── Soffit & Fascia pricing ─────────────────────────────────
export const SOFFIT_FASCIA_PRICES = [
  { label: 'Charter Oak Soffit & Fascia under 24"', pricePerFt: 15.95 },
  { label: 'Charter Oak Soffit 25" to 48"', pricePerFt: 18.90 },
  { label: 'Economy Soffit under 24"', pricePerFt: 14.10 },
  { label: 'Economy Soffit 24" to 48"', pricePerFt: 16.95 },
  { label: 'Fascia Only', pricePerFt: 9.00 },
];

// ── Options pricing (from Contract sheet) ───────────────────
export const SIDING_OPTIONS: Record<string, number | string> = {
  '22" Louvered Octagon Vent': 145,
  '27" Louvered Octagon Vent': 185,
  'Split Mounts': 35,
  'Prodigy Insulated Corners': 95,
  'Dryer Vents': 45,
  '18x24 Rectangle Vent': 139,
};

// ── Composite options ───────────────────────────────────────
export const COMPOSITE_OPTIONS: Record<string, number> = {
  'Outside Corners': 105,
  'Wide Face J-Channel (3 1/2")': 105,
  'J-Channel (Std, per opening)': 61,
};

// ── Additional labor charges (from Contract sheet) ──────────
export const SIDING_LABOR_CHARGES: Record<string, { price: number; unit: string }> = {
  '2nd Story Dormer/Access': { price: 219, unit: 'each' },
  'Remove Existing Siding': { price: 0.75, unit: 'sqft' },
  '1/4" Fan Fold or Tyvek': { price: 0.80, unit: 'ft' },
  'Wrap Window Opening': { price: 125, unit: 'each' },
  'Wrap Door Opening': { price: 125, unit: 'each' },
  'Bird Box': { price: 75, unit: 'each' },
  'Replace Exterior Sill': { price: 25, unit: 'ft' },
  'Wrap Frieze Board': { price: 3.75, unit: 'ft' },
  '2-Sided Beam Wrap': { price: 3.75, unit: 'ft' },
  '3-Sided Beam Wrap': { price: 4.50, unit: 'ft' },
  'Wrap Garage Door': { price: 200, unit: 'each' },
  '3rd Story Dormer/Access': { price: 300, unit: 'each' },
  'Window/Door Frame Buildout': { price: 150, unit: 'each' },
  'Replace Rotted Fascia': { price: 6.00, unit: 'ft' },
  'Replace Sheeting': { price: 120, unit: 'sheet' },
  'Wrap Post': { price: 125, unit: 'each' },
  'Cut Soffit Vent': { price: 1.00, unit: 'ft' },
  'Window Tape (Opening)': { price: 55, unit: 'each' },
};

// ── Installer labor rates (from Labor Sheet) ────────────────
export const INSTALLER_LABOR_RATES = {
  standard: [
    { task: 'Install Prodigy Siding', pay: 120, unit: 'Square' },
    { task: 'Install WW 4000-Series Siding', pay: 100, unit: 'Square' },
    { task: 'Install Board & Batten', pay: 120, unit: 'Square' },
    { task: 'Install Porch Ceiling', pay: 100, unit: 'Square' },
    { task: 'Install Soffit & Fascia Under 24"', pay: 4.00, unit: 'L/F' },
    { task: 'Install Soffit & Fascia Over 24"', pay: 5.00, unit: 'L/F' },
    { task: 'Wrap Windows', pay: 32, unit: 'Unit' },
    { task: 'Wrap Entry Doors', pay: 32, unit: 'Unit' },
    { task: 'Wrap Garage Doors', pay: 50, unit: 'Unit' },
    { task: 'Remove Old Siding', pay: 0.45, unit: 'S/F' },
  ],
  everlast: [
    { task: 'Install Everlast Siding', pay: 250, unit: 'Square' },
    { task: 'Install Board & Batten', pay: 270, unit: 'Square' },
    { task: 'Wrap Windows', pay: 50, unit: 'Unit' },
    { task: 'Wrap Entry Doors', pay: 50, unit: 'Unit' },
    { task: 'Wrap Garage Doors', pay: 75, unit: 'Unit' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// SIDING CONTRACT DATA TYPE
// ═══════════════════════════════════════════════════════════════
export interface SidingOrderLine {
  lineNumber: number;
  category: 'siding' | 'soffit' | 'fascia' | 'patio_ceiling' | 'trim' | 'option' | 'labor';
  description: string;
  system: SidingSystem | '';
  profile: SidingProfile | '';
  quantity: number;
  unit: 'sqft' | 'lf' | 'each' | 'sheet';
  pricePerUnit: number;
  total: number;
  notes: string;
}

export interface SidingContractData {
  // ── Customer ───────────────────────────────────────────
  customerName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  email: string;
  homePhone: string;
  workPhone: string;
  cellPhone: string;
  customerId: string;

  // ── Siding selection ───────────────────────────────────
  sidingSystem: SidingSystem;
  sidingProfile: SidingProfile;
  totalSqft: number;

  // ── Colors (with initials) ─────────────────────────────
  sidingColor: string;
  sidingColorInitials: string;
  ceilingColor: string;
  ceilingColorInitials: string;
  soffitColor: string;
  soffitColorInitials: string;
  trimColor: string;
  trimColorInitials: string;
  cornerColor: string;
  cornerColorInitials: string;

  // ── Order lines ────────────────────────────────────────
  lines: SidingOrderLine[];

  // ── Soffit & Fascia ────────────────────────────────────
  soffitTotalLf: number;
  soffitType: string;
  fasciaOnlyLf: number;

  // ── Additional labor ───────────────────────────────────
  laborCharges: Array<{ item: string; quantity: number; unitPrice: number; total: number }>;

  // ── Pricing ────────────────────────────────────────────
  totalListPrice: number;
  adminFee: number;             // $295 standard for siding
  permitFee: number;
  salesTax: number;
  totalAmount: number;
  deposit50: number;
  balanceDue: number;
  amountFinanced: number;
  stJudeContribution: number;

  // ── Lead ───────────────────────────────────────────────
  homeBuiltYear: number;
  leadInitials: string;

  // ── Payment ────────────────────────────────────────────
  paymentMethod: string;
}

// ═══════════════════════════════════════════════════════════════
// SIDING VALIDATION RULES
// ═══════════════════════════════════════════════════════════════
export interface SidingValidationWarning {
  id: string;
  severity: 'critical' | 'high' | 'warning' | 'info';
  field: string;
  message: string;
  howToFix: string;
  recommendedFix?: { label: string; fields: Record<string, any> };
}

export function validateSidingContract(contract: SidingContractData): SidingValidationWarning[] {
  const warnings: SidingValidationWarning[] = [];

  // ── Required customer fields ───────────────────────────
  if (!contract.customerName) warnings.push({
    id: 'sid-name', severity: 'critical', field: 'customerName',
    message: 'Customer name is required on siding contract.',
    howToFix: 'Enter the customer\'s full legal name.',
  });
  if (!contract.address) warnings.push({
    id: 'sid-addr', severity: 'critical', field: 'address',
    message: 'Address is required on siding contract.',
    howToFix: 'Enter the full installation address.',
  });

  // ── Siding selection ───────────────────────────────────
  if (!contract.sidingSystem) warnings.push({
    id: 'sid-system', severity: 'critical', field: 'sidingSystem',
    message: 'Siding system not selected.',
    howToFix: 'Choose a siding system (Prodigy, WW-4000, Ascend, or Everlast).',
  });
  if (!contract.sidingProfile) warnings.push({
    id: 'sid-profile', severity: 'high', field: 'sidingProfile',
    message: 'Siding profile not selected (Dutch Lap or Clapboard).',
    howToFix: 'Select Dutch Lap or Clapboard profile.',
  });
  if (!contract.totalSqft || contract.totalSqft <= 0) warnings.push({
    id: 'sid-sqft', severity: 'critical', field: 'totalSqft',
    message: 'Total square footage is required.',
    howToFix: 'Enter the total siding square footage from field measurements.',
  });

  // ── Colors ─────────────────────────────────────────────
  if (!contract.sidingColor) warnings.push({
    id: 'sid-color', severity: 'critical', field: 'sidingColor',
    message: 'Siding color not selected.',
    howToFix: 'Select siding color from available options and capture customer initials.',
  });
  if (contract.sidingColor && !contract.sidingColorInitials) warnings.push({
    id: 'sid-color-init', severity: 'high', field: 'sidingColorInitials',
    message: 'Customer initials required for siding color selection.',
    howToFix: 'Have the customer initial next to the siding color choice.',
  });
  if (!contract.trimColor) warnings.push({
    id: 'sid-trim-color', severity: 'warning', field: 'trimColor',
    message: 'Trim color not selected.',
    howToFix: 'Select trim color and capture customer initials.',
  });

  // ── Lead containment ───────────────────────────────────
  if (contract.homeBuiltYear && contract.homeBuiltYear < 1978 && !contract.leadInitials) {
    warnings.push({
      id: 'sid-lead', severity: 'high', field: 'leadInitials',
      message: 'Pre-1978 home: Federal Lead Containment Law applies.',
      howToFix: 'Confirm lead containment acknowledgment and capture initials.',
    });
  }

  // ── Pricing sanity ─────────────────────────────────────
  if (contract.totalSqft > 0 && contract.totalListPrice <= 0) {
    warnings.push({
      id: 'sid-price', severity: 'high', field: 'totalListPrice',
      message: 'Square footage entered but total price is $0.',
      howToFix: 'Calculate pricing: sqft × price per sqft for selected system.',
    });
  }

  // ── Composite-specific checks ──────────────────────────
  const isEverlast = contract.sidingSystem?.startsWith('everlast');
  const isAscend = contract.sidingSystem?.startsWith('ascend');
  if ((isEverlast || isAscend) && contract.lines?.length > 0) {
    const hasCorners = contract.lines.some(l => l.description?.toLowerCase().includes('corner'));
    if (!hasCorners) {
      warnings.push({
        id: 'sid-corners', severity: 'warning', field: 'lines',
        message: `${isEverlast ? 'Everlast' : 'Ascend'} composite siding: outside corners not added.`,
        howToFix: 'Composite siding requires outside corners ($105/ea). Add to order.',
      });
    }
  }

  return warnings;
}

// ── Calculate siding price ──────────────────────────────────
export function calcSidingTotal(system: SidingSystem, sqft: number): number {
  const pricing = SIDING_SYSTEM_PRICES.find(p => p.system === system);
  return pricing ? sqft * pricing.pricePerSqft : 0;
}
