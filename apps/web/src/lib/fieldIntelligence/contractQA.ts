// ═══════════════════════════════════════════════════════════════════════════
// fieldIntelligence/contractQA.ts — Pre-submission contract readiness checks
//
// OFFLINE-SAFE: All checks run from local data.
//
// BOUNDARY RULE: These checks identify what is missing or inconsistent.
// They NEVER auto-approve, modify, or submit contracts.
// Final proposal/contract generation remains in the deterministic engine.
// ═══════════════════════════════════════════════════════════════════════════

import type { FieldIntelligenceFinding } from './types';

/** Simple djb2 hash — works with any Unicode string */
function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash.toString(36).padStart(7, '0');
}

function makeId(appointmentId: string, key: string): string {
  return `cqa_${djb2Hash(`cqa:${appointmentId}:${key}`)}`;
}

// ── Customer Field Checks ─────────────────────────────────────────────────

export function checkCustomerFields(
  appointmentId: string,
  customer: {
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  } | null | undefined,
): FieldIntelligenceFinding[] {
  const findings: FieldIntelligenceFinding[] = [];
  if (!customer) {
    findings.push({
      id: makeId(appointmentId, 'customer:missing'),
      severity: 'blocking',
      category: 'customer',
      source: 'deterministic_rule',
      appointmentId,
      title: 'No customer linked to this appointment',
      message: 'This appointment has no customer record. A customer name and phone number are required before the contract can be generated.',
      suggestedAction: 'Add or link a customer on the Appointment home tab.',
      requiresApproval: false,
      status: 'open',
      createdAt: Date.now(),
    });
    return findings;
  }

  if (!customer.firstName?.trim() || !customer.lastName?.trim()) {
    findings.push({
      id: makeId(appointmentId, 'customer:name'),
      severity: 'blocking',
      category: 'customer',
      source: 'deterministic_rule',
      appointmentId,
      title: 'Customer name is missing',
      message: 'Customer first and last name are required for the contract and proposal.',
      suggestedAction: 'Enter the customer name on the Appointment home tab.',
      requiresApproval: false,
      status: 'open',
      createdAt: Date.now(),
    });
  }

  if (!customer.phone?.trim()) {
    findings.push({
      id: makeId(appointmentId, 'customer:phone'),
      severity: 'warning',
      category: 'customer',
      source: 'deterministic_rule',
      appointmentId,
      title: 'Customer phone number missing',
      message: 'No phone number is on file for this customer. This is required for the order form.',
      suggestedAction: 'Enter the customer phone number on the Appointment home tab.',
      requiresApproval: false,
      status: 'open',
      createdAt: Date.now(),
    });
  }

  const addressFields: [string, string | null | undefined, string][] = [
    ['city', customer.city, 'City'],
    ['state', customer.state, 'State'],
    ['zip', customer.zip, 'ZIP'],
  ];

  const missingAddress = addressFields.filter(([, v]) => !v?.trim());
  if (missingAddress.length > 0) {
    findings.push({
      id: makeId(appointmentId, `customer:address:${missingAddress.map(f => f[0]).join('_')}`),
      severity: 'warning',
      category: 'customer',
      source: 'deterministic_rule',
      appointmentId,
      title: `Customer address incomplete (${missingAddress.map(f => f[2]).join(', ')} missing)`,
      message: `The customer address is missing: ${missingAddress.map(f => f[2]).join(', ')}. These fields are needed for the order form and permit paperwork.`,
      suggestedAction: 'Complete the customer address on the Appointment home tab.',
      requiresApproval: false,
      status: 'open',
      createdAt: Date.now(),
      metadataJson: { missingFields: missingAddress.map(f => f[0]) },
    });
  }

  return findings;
}

// ── Opening Completeness ──────────────────────────────────────────────────

export function checkOpeningCompleteness(
  appointmentId: string,
  openings: {
    id: string;
    openingNumber?: number;
    width?: number | null;
    height?: number | null;
    productCategory?: string | null;
    price?: number | null;
  }[],
): FieldIntelligenceFinding[] {
  const findings: FieldIntelligenceFinding[] = [];

  if (openings.length === 0) {
    findings.push({
      id: makeId(appointmentId, 'openings:none'),
      severity: 'blocking',
      category: 'opening',
      source: 'deterministic_rule',
      appointmentId,
      title: 'No openings entered',
      message: 'At least one opening must be measured and priced before the proposal can be generated.',
      suggestedAction: 'Go to the Measure tab and add at least one opening.',
      requiresApproval: false,
      status: 'open',
      createdAt: Date.now(),
    });
    return findings;
  }

  for (const op of openings) {
    const n = op.openingNumber ?? 0;

    if (!op.width || !op.height) {
      findings.push({
        id: makeId(appointmentId, `opening:dims:${op.id}`),
        severity: 'blocking',
        category: 'measurement',
        source: 'deterministic_rule',
        appointmentId,
        openingId: op.id,
        openingNumber: n,
        title: `Opening ${n}: Missing final dimensions`,
        message: `Opening ${n} does not have final width and height recorded. ` +
          `Pricing cannot be calculated and the contract will be incomplete.`,
        suggestedAction: `Measure Opening ${n} and save final dimensions.`,
        requiresApproval: false,
        status: 'open',
        createdAt: Date.now(),
        metadataJson: { openingNumber: n },
      });
    }

    if (op.price == null || !isFinite(op.price)) {
      findings.push({
        id: makeId(appointmentId, `opening:price:${op.id}`),
        severity: 'blocking',
        category: 'pricing',
        source: 'deterministic_rule',
        appointmentId,
        openingId: op.id,
        openingNumber: n,
        title: `Opening ${n}: Missing price`,
        message: `Opening ${n} has no price calculated. Run Recalculate on the Pricing tab.`,
        suggestedAction: `Go to Pricing tab and recalculate. Then verify Opening ${n} has a valid price.`,
        requiresApproval: false,
        status: 'open',
        createdAt: Date.now(),
        metadataJson: { openingNumber: n },
      });
    }
  }

  return findings;
}

// ── Signature Check ───────────────────────────────────────────────────────

export function checkSignatureFields(
  appointmentId: string,
  contractData: {
    ownerSignature?: string | null;
    estimatorSignature?: string | null;
    signatureDate?: string | null;
    customerInitials?: string | null;
  } | null | undefined,
  stage: 'quick_price' | 'full_details' | 'contract_ready',
): FieldIntelligenceFinding[] {
  // Only enforce signatures at contract_ready stage
  if (stage !== 'contract_ready') return [];
  if (!contractData) return [];

  const findings: FieldIntelligenceFinding[] = [];

  if (!contractData.ownerSignature) {
    findings.push({
      id: makeId(appointmentId, 'sig:owner'),
      severity: 'blocking',
      category: 'contract',
      source: 'deterministic_rule',
      appointmentId,
      title: 'Customer signature missing',
      message: 'The customer (owner) signature is required before the contract can be finalized.',
      suggestedAction: 'Have the customer sign on the Proposal tab.',
      requiresApproval: false,
      status: 'open',
      createdAt: Date.now(),
    });
  }

  if (!contractData.estimatorSignature) {
    findings.push({
      id: makeId(appointmentId, 'sig:estimator'),
      severity: 'blocking',
      category: 'contract',
      source: 'deterministic_rule',
      appointmentId,
      title: 'Estimator signature missing',
      message: 'The estimator (rep) signature is required before finalizing the contract.',
      suggestedAction: 'Sign as the estimator on the Proposal tab.',
      requiresApproval: false,
      status: 'open',
      createdAt: Date.now(),
    });
  }

  return findings;
}

// ── Full Contract Readiness Analysis ─────────────────────────────────────

export function analyzeContractReadiness(
  appointmentId: string,
  data: {
    customer?: Parameters<typeof checkCustomerFields>[1];
    openings?: Parameters<typeof checkOpeningCompleteness>[1];
    contractData?: Parameters<typeof checkSignatureFields>[1];
    stage?: Parameters<typeof checkSignatureFields>[2];
  },
): FieldIntelligenceFinding[] {
  return [
    ...checkCustomerFields(appointmentId, data.customer),
    ...(data.openings ? checkOpeningCompleteness(appointmentId, data.openings) : []),
    ...(data.contractData !== undefined
      ? checkSignatureFields(appointmentId, data.contractData, data.stage ?? 'full_details')
      : []),
  ];
}
