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
  icon: string;
}> = [
  {
    key: 'customerInitialsCancellation',
    type: 'initials',
    required: true,
    icon: '📋',
    title: 'Cancellation Policy',
    label: 'Initial Here',
    description: 'I acknowledge that I have 3 business days to cancel this contract without penalty. After that period, cancellation fees may apply as outlined in the contract terms.',
  },
  {
    key: 'customerInitialsLeadPaint',
    type: 'initials',
    required: true,
    icon: '⚠️',
    title: 'Lead Paint Disclosure',
    label: 'Initial Here',
    description: 'I acknowledge receipt of the EPA Lead Paint Pamphlet "Renovate Right." This home may contain lead-based paint. Window replacement may disturb lead paint.',
  },
  {
    key: 'customerInitialsFinancing',
    type: 'initials',
    required: false,
    icon: '💳',
    title: 'Financing Acknowledgment',
    label: 'Initial Here (if financing)',
    description: 'I acknowledge the financing terms, APR, and monthly payment schedule as outlined. I understand that approval is subject to credit review.',
  },
  {
    key: 'customerInitialsPrice',
    type: 'initials',
    required: true,
    icon: '💰',
    title: 'Price Acknowledgment',
    label: 'Initial Here',
    description: 'I confirm the total contract price as quoted. I understand this includes all products, installation labor, and applicable taxes.',
  },
  {
    key: 'customerSignature',
    type: 'signature',
    required: true,
    icon: '✍️',
    title: 'Contract Signature',
    label: 'Sign Here',
    description: 'By signing below, I agree to the Window World contract terms, product specifications, installation schedule, and payment obligations as described above.',
  },
];
