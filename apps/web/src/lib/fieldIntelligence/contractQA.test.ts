// ═══════════════════════════════════════════════════════════════════════════
// contractQA.test.ts — Unit tests for contract readiness QA
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  checkCustomerFields,
  checkOpeningCompleteness,
  checkSignatureFields,
  analyzeContractReadiness,
} from './contractQA';

const APPT = 'test-appt-contract-001';

// ── Customer Fields ────────────────────────────────────────────────────────

describe('checkCustomerFields', () => {
  it('produces blocking finding when customer is null', () => {
    const findings = checkCustomerFields(APPT, null);
    expect(findings.some(f => f.severity === 'blocking')).toBe(true);
  });

  it('produces blocking finding when customer name is missing', () => {
    const findings = checkCustomerFields(APPT, {
      firstName: '',
      lastName: '',
      phone: '555-1234',
    });
    expect(findings.some(f => f.title.includes('name'))).toBe(true);
  });

  it('produces warning when phone is missing', () => {
    const findings = checkCustomerFields(APPT, {
      firstName: 'John',
      lastName: 'Smith',
      phone: null,
    });
    expect(findings.some(f => f.severity === 'warning' && f.title.includes('phone'))).toBe(true);
  });

  it('produces warning for missing address fields', () => {
    const findings = checkCustomerFields(APPT, {
      firstName: 'John',
      lastName: 'Smith',
      phone: '555-1234',
      city: null,
      state: null,
      zip: null,
    });
    expect(findings.some(f => f.severity === 'warning' && f.title.includes('address'))).toBe(true);
  });

  it('produces no findings for a complete customer', () => {
    const findings = checkCustomerFields(APPT, {
      firstName: 'John',
      lastName: 'Smith',
      phone: '555-1234',
      email: 'john@example.com',
      address: '123 Main St',
      city: 'Columbus',
      state: 'OH',
      zip: '43215',
    });
    expect(findings).toHaveLength(0);
  });
});

// ── Opening Completeness ───────────────────────────────────────────────────

describe('checkOpeningCompleteness', () => {
  it('produces blocking finding when no openings', () => {
    const findings = checkOpeningCompleteness(APPT, []);
    expect(findings.some(f => f.severity === 'blocking' && f.title.includes('No openings'))).toBe(true);
  });

  it('produces blocking finding for opening with missing dimensions', () => {
    const findings = checkOpeningCompleteness(APPT, [
      { id: 'op1', openingNumber: 1, width: null, height: null, price: null },
    ]);
    expect(findings.some(f => f.title.includes('Missing final dimensions'))).toBe(true);
  });

  it('produces blocking finding for opening with missing price', () => {
    const findings = checkOpeningCompleteness(APPT, [
      { id: 'op1', openingNumber: 1, width: 35.625, height: 47.625, price: null },
    ]);
    expect(findings.some(f => f.title.includes('Missing price'))).toBe(true);
  });

  it('produces no findings for a complete opening', () => {
    const findings = checkOpeningCompleteness(APPT, [
      { id: 'op1', openingNumber: 1, width: 35.625, height: 47.625, price: 1299.99, productCategory: 'double_hung' },
    ]);
    expect(findings).toHaveLength(0);
  });
});

// ── Signature Fields ───────────────────────────────────────────────────────

describe('checkSignatureFields', () => {
  it('produces no findings at quick_price stage even if signatures are missing', () => {
    const findings = checkSignatureFields(APPT, {}, 'quick_price');
    expect(findings).toHaveLength(0);
  });

  it('produces blocking finding for missing owner signature at contract_ready', () => {
    const findings = checkSignatureFields(APPT, {
      ownerSignature: null,
      estimatorSignature: 'rep-sig-data',
    }, 'contract_ready');
    expect(findings.some(f => f.title.includes('Customer signature'))).toBe(true);
  });

  it('produces no findings when all signatures present at contract_ready', () => {
    const findings = checkSignatureFields(APPT, {
      ownerSignature: 'customer-sig-data',
      estimatorSignature: 'rep-sig-data',
      signatureDate: '2026-05-31',
    }, 'contract_ready');
    expect(findings).toHaveLength(0);
  });
});

// ── analyzeContractReadiness integration ───────────────────────────────────

describe('analyzeContractReadiness', () => {
  it('returns multiple blocking findings for an empty appointment', () => {
    const findings = analyzeContractReadiness(APPT, {
      customer: null,
      openings: [],
    });
    expect(findings.filter(f => f.severity === 'blocking').length).toBeGreaterThan(0);
  });

  it('returns empty findings for a complete appointment at quick_price stage', () => {
    const findings = analyzeContractReadiness(APPT, {
      customer: {
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '555-9999',
        city: 'Columbus',
        state: 'OH',
        zip: '43215',
      },
      openings: [
        { id: 'op1', openingNumber: 1, width: 35.625, height: 47.625, price: 1299 },
      ],
      stage: 'quick_price',
    });
    // No blocking findings at quick_price (signatures not required)
    expect(findings.filter(f => f.severity === 'blocking')).toHaveLength(0);
  });
});
