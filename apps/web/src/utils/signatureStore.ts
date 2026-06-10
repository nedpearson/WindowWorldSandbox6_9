// ═══════════════════════════════════════════════════════════
// Signature Store — localStorage-backed per appointment
// ═══════════════════════════════════════════════════════════

const SIG_KEY = 'wwa_signatures';

export interface SignatureEntry {
  dataUrl: string;      // base64 PNG from canvas
  signedAt: number;
  signerName: string;
}

export interface AppointmentSignatures {
  customerSignature?: SignatureEntry;       // full contract signature
  customerInitialsCancellation?: SignatureEntry;
  customerInitialsLeadPaint?: SignatureEntry;
  customerInitialsFinancing?: SignatureEntry;
  customerInitialsPrice?: SignatureEntry;
  repSignature?: SignatureEntry;
}

export interface SignatureStore {
  [appointmentId: string]: AppointmentSignatures;
}

function loadStore(): SignatureStore {
  try { return JSON.parse(localStorage.getItem(SIG_KEY) || '{}'); } catch { return {}; }
}
function saveStore(s: SignatureStore) { localStorage.setItem(SIG_KEY, JSON.stringify(s)); }

export function getSignatures(appointmentId: string): AppointmentSignatures {
  return loadStore()[appointmentId] || {};
}

export function saveSignature(appointmentId: string, key: keyof AppointmentSignatures, entry: SignatureEntry) {
  const store = loadStore();
  if (!store[appointmentId]) store[appointmentId] = {};
  store[appointmentId][key] = entry;
  saveStore(store);
}

export function clearSignature(appointmentId: string, key: keyof AppointmentSignatures) {
  const store = loadStore();
  if (store[appointmentId]) {
    delete store[appointmentId][key];
    saveStore(store);
  }
}

export function allSignaturesComplete(sigs: AppointmentSignatures): boolean {
  return !!(
    sigs.customerSignature &&
    sigs.customerInitialsCancellation &&
    sigs.customerInitialsLeadPaint
  );
}

export const SIGNATURE_FIELDS: Array<{
  key: keyof AppointmentSignatures;
  label: string;
  type: 'signature' | 'initials';
  required: boolean;
  title: string;
  description: string;
}> = [
  {
    key: 'customerInitialsCancellation',
    type: 'initials',
    required: true,
    title: 'Cancellation Policy',
    label: 'Initial Here',
    description: 'You, the buyer, may cancel this transaction at any time prior to midnight of the third business day after the date of this transaction. By initialing below, you acknowledge receipt of the Right to Cancel notice and confirm your understanding of this 3-day cooling-off period.',
  },
  {
    key: 'customerInitialsLeadPaint',
    type: 'initials',
    required: true,
    title: 'Lead Paint Disclosure',
    label: 'Initial Here',
    description: 'By initialing below, you acknowledge receipt of the EPA Lead Paint Pamphlet "Renovate Right" for window replacement on homes built before 1978. You confirm you have been notified that lead hazards may exist, and that window installation may disturb paint surfaces containing lead.',
  },
  {
    key: 'customerInitialsFinancing',
    type: 'initials',
    required: false,
    title: 'Financing Acknowledgment',
    label: 'Initial Here (if financing)',
    description: 'By initialing below, you acknowledge and approve the financing payment terms, including the principal balance, estimated monthly payments, APR, and lender agreement options. You understand that approval is subject to credit review by the third-party lender.',
  },
  {
    key: 'customerInitialsPrice',
    type: 'initials',
    required: true,
    title: 'Price Acknowledgment',
    label: 'Initial Here',
    description: 'By initialing below, you confirm that you have reviewed the total contract price, deposit amount, and outstanding balance. You acknowledge that the quoted price includes all specified products, options, and installation labor as listed in the order details.',
  },
  {
    key: 'customerSignature',
    type: 'signature',
    required: true,
    title: 'Contract Signature',
    label: 'Sign Here',
    description: 'By signing below, you execute this legally binding agreement. You confirm that you have reviewed and agree to all Window World contract terms and conditions, product specifications, installation schedules, warranty waivers, and payment obligations as set forth in this entire workbook.',
  },
];
