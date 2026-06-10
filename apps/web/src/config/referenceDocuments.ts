/**
 * Reference Documents Registry — Window World
 * Maps every business document to its workflow location in the app.
 */

export interface ReferenceDocument {
  key: string;
  displayName: string;
  fileName: string;
  localPath: string;
  documentType: 'warranty' | 'disclosure' | 'finance' | 'compliance' | 'template';
  workflowAreas: string[];
  customerFacing: boolean;
  internalOnly: boolean;
  requiredForPacket: boolean;
  appliesWhen?: string;
  version?: string;
  effectiveDate?: string;
  summary: string;
  requiredAcknowledgment: boolean;
  exportPacketSection?: string;
}

export const REFERENCE_DOCUMENTS: ReferenceDocument[] = [
  {
    key: 'window_warranty',
    displayName: 'Window Warranty (AM-WWi-239)',
    fileName: 'AM-WWi-239_Window Warranty Rev 08.24 (1).pdf',
    localPath: 'reference-documents/AM-WWi-239_Window Warranty Rev 08.24 (1).pdf',
    documentType: 'warranty',
    workflowAreas: ['contract_review', 'customer_proposal', 'final_packet', 'warranty_panel'],
    customerFacing: true,
    internalOnly: false,
    requiredForPacket: true,
    version: 'Rev 08.24',
    effectiveDate: '2024-08-01',
    summary: 'Window World product warranty covering vinyl parts, mechanical components, insulated glass units, and screens. Includes warranty terms, exclusions, and claim procedures.',
    requiredAcknowledgment: false,
    exportPacketSection: 'Warranty Documents',
  },
  {
    key: 'lifetime_warranty',
    displayName: 'All-Inclusive Transferable Lifetime Warranty',
    fileName: 'WW All Inclusive Lifetime Warranty.pdf',
    localPath: 'reference-documents/WW All Inclusive Lifetime Warranty.pdf',
    documentType: 'warranty',
    workflowAreas: ['contract_review', 'customer_proposal', 'final_packet', 'warranty_panel', 'pricing_review'],
    customerFacing: true,
    internalOnly: false,
    requiredForPacket: true,
    summary: 'Window World All-Inclusive Transferable Lifetime Warranty. Covers vinyl parts, mechanical parts, insulated glass, glass breakage (if selected), and labor. Transferable to subsequent homeowners. Coverage begins upon project completion and final payment.',
    requiredAcknowledgment: false,
    exportPacketSection: 'Warranty Documents',
  },
  {
    key: 'lead_paint_disclosure',
    displayName: 'Lead-Based Paint Disclosure',
    fileName: 'Lead Base Paint Disclosure.pdf',
    localPath: 'reference-documents/Lead Base Paint Disclosure.pdf',
    documentType: 'disclosure',
    workflowAreas: ['customer_info', 'job_info', 'contract_review', 'final_lockdown', 'final_packet'],
    customerFacing: true,
    internalOnly: false,
    requiredForPacket: false, // Required only when pre-1978
    appliesWhen: 'home_built_before_1978_or_unknown',
    summary: 'EPA-required Lead-Based Paint Disclosure for renovations in homes built before 1978. Must be provided to homeowner and acknowledged before work begins. Federal law requires this disclosure for any renovation that disturbs painted surfaces in pre-1978 housing.',
    requiredAcknowledgment: true,
    exportPacketSection: 'Compliance Documents',
  },
  {
    key: 'finance_options',
    displayName: 'Window World Finance Options',
    fileName: 'Finance Options.xlsx',
    localPath: 'reference-documents/Finance Options.xlsx',
    documentType: 'finance',
    workflowAreas: ['pricing_review', 'customer_proposal', 'contract_review', 'finance_panel'],
    customerFacing: true,
    internalOnly: false,
    requiredForPacket: false, // Only if financing selected
    appliesWhen: 'customer_financing',
    summary: 'Available financing plans: 15-month interest-free, 18-month interest-free, 7.99% APR 60-month, and 9.99% APR 120-month ($10K minimum). Monthly payments calculated from job total.',
    requiredAcknowledgment: false,
    exportPacketSection: 'Finance Documents',
  },
];

// ── Structured Finance Plans (extracted from workbook) ──
export interface FinancePlan {
  id: string;
  name: string;
  termMonths: number;
  apr: number;
  promoType: 'interest_free' | 'fixed_rate';
  minimumAmount?: number;
  monthlyPaymentFormula: string;
  disclosureText: string;
  active: boolean;
}

export const FINANCE_PLANS: FinancePlan[] = [
  {
    id: 'plan_15mo_free',
    name: '15 Months Interest Free',
    termMonths: 15,
    apr: 0,
    promoType: 'interest_free',
    monthlyPaymentFormula: 'ROUNDUP(jobAmount / 15, 0)',
    disclosureText: 'Pay in full within 15 months, no interest due.',
    active: true,
  },
  {
    id: 'plan_18mo_free',
    name: '18 Months Interest Free',
    termMonths: 18,
    apr: 0,
    promoType: 'interest_free',
    monthlyPaymentFormula: 'ROUNDUP(jobAmount / 18, 0)',
    disclosureText: 'Pay in full within 18 months, no interest due.',
    active: true,
  },
  {
    id: 'plan_60mo_799',
    name: '7.99% for 60 Equal Monthly Payments',
    termMonths: 60,
    apr: 7.99,
    promoType: 'fixed_rate',
    monthlyPaymentFormula: 'ROUNDUP(jobAmount * 0.020406, 0)',
    disclosureText: '7.99% APR for 60 equal monthly payments.',
    active: true,
  },
  {
    id: 'plan_120mo_999',
    name: '9.99% for 120 Equal Monthly Payments',
    termMonths: 120,
    apr: 9.99,
    promoType: 'fixed_rate',
    minimumAmount: 10000,
    monthlyPaymentFormula: 'ROUNDUP(jobAmount * 0.013252, 0)',
    disclosureText: '9.99% APR for 120 equal monthly payments. $10,000 minimum purchase required.',
    active: true,
  },
];

// ── Warranty Coverage Summary (for sales rep reference) ──
export const WARRANTY_SUMMARY = {
  title: 'All-Inclusive Transferable Lifetime Warranty',
  coverageAreas: [
    { area: 'Vinyl Parts', coverage: 'Lifetime', details: 'Covers all vinyl components against defects in materials and workmanship' },
    { area: 'Mechanical Parts', coverage: 'Lifetime', details: 'Covers locks, balances, and other operating hardware' },
    { area: 'Insulated Glass', coverage: 'Lifetime', details: 'Covers seal failure and fogging between glass panes' },
    { area: 'Glass Breakage', coverage: 'Lifetime (if selected)', details: 'Optional glass breakage warranty — $39/window. Covers accidental glass breakage.' },
    { area: 'Labor', coverage: 'Lifetime', details: 'Covers labor for warranty-related repairs' },
    { area: 'Transferable', coverage: 'Yes', details: 'Warranty transfers to subsequent homeowner' },
  ],
  coverageBegins: 'Upon project completion and receipt of final payment',
  importantExclusions: [
    'Damage caused by improper installation by others',
    'Damage from acts of God, accidents, or misuse',
    'Normal weathering and discoloration from environmental exposure',
    'Condensation on glass surfaces (not a defect)',
    'Products installed in commercial applications',
    'Damage from failure to follow care/maintenance instructions',
  ],
};

// ── Lead Disclosure Logic ──
export function isLeadDisclosureRequired(homeBuiltYear?: number | null, pre1978Status?: string): boolean {
  if (pre1978Status === 'yes') return true;
  if (pre1978Status === 'unknown') return true;
  if (homeBuiltYear && homeBuiltYear < 1978) return true;
  return false;
}

// ── Finance Plan Calculator ──
export function calculateMonthlyPayment(plan: FinancePlan, jobAmount: number): number | null {
  if (plan.minimumAmount && jobAmount < plan.minimumAmount) return null;
  if (plan.promoType === 'interest_free') {
    return Math.ceil(jobAmount / plan.termMonths);
  }
  // Fixed rate
  const factors: Record<string, number> = {
    'plan_60mo_799': 0.020406,
    'plan_120mo_999': 0.013252,
  };
  const factor = factors[plan.id];
  if (factor) return Math.ceil(jobAmount * factor);
  return null;
}

// ── Document helpers ──
export function getDocumentsForWorkflow(area: string): ReferenceDocument[] {
  return REFERENCE_DOCUMENTS.filter(d => d.workflowAreas.includes(area));
}

export function getRequiredPacketDocuments(pre1978: boolean, financing: boolean): ReferenceDocument[] {
  return REFERENCE_DOCUMENTS.filter(d => {
    if (d.requiredForPacket) return true;
    if (d.key === 'lead_paint_disclosure' && pre1978) return true;
    if (d.key === 'finance_options' && financing) return true;
    return false;
  });
}
