// ═══════════════════════════════════════════════════════════════════════════
// pricingQA.test.ts — Unit tests for deterministic pricing QA
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  checkQA2PriceFields,
  checkPricingDimensionSource,
  checkPricingCacheAge,
  checkFinanceOptionPresence,
} from './pricingQA';

const APPT = 'test-appt-pricing-001';

describe('checkQA2PriceFields', () => {
  it('produces blocking finding for NaN value', () => {
    const findings = checkQA2PriceFields(APPT, { qa2Price1: NaN });
    expect(findings.some(f => f.severity === 'blocking')).toBe(true);
    expect(findings[0].title).toContain('qa2Price1');
  });

  it('produces blocking finding for Infinity value', () => {
    const findings = checkQA2PriceFields(APPT, { qa2Price2: Infinity });
    expect(findings.some(f => f.severity === 'blocking')).toBe(true);
  });

  it('produces warning for negative value', () => {
    const findings = checkQA2PriceFields(APPT, { qa2Price3: -100 });
    expect(findings.some(f => f.severity === 'warning')).toBe(true);
  });

  it('produces no finding for null or undefined', () => {
    const findings = checkQA2PriceFields(APPT, { qa2Price1: null, qa2Price2: undefined });
    expect(findings).toHaveLength(0);
  });

  it('produces no finding for valid numbers', () => {
    const findings = checkQA2PriceFields(APPT, {
      qa2Price1: 1299.99,
      qa2Price2: 0,
      qa2Price3: 250.5,
    });
    expect(findings.filter(f => f.severity === 'blocking')).toHaveLength(0);
  });
});

describe('checkPricingDimensionSource', () => {
  it('produces blocking finding when raw BT width equals stored final width', () => {
    // Raw BT = 36.0, stored = 36.0 → deduction NOT applied
    const findings = checkPricingDimensionSource(APPT, [
      { id: 'op1', openingNumber: 1, width: 36.0, height: 47.625, rawBtWidth: 36.0, rawBtHeight: null },
    ]);
    expect(findings.some(f => f.severity === 'blocking' && f.title.includes('Raw Bluetooth width'))).toBe(true);
  });

  it('produces no finding when adjusted width differs from raw BT', () => {
    // Raw BT = 36.0, stored = 35.625 → deduction applied correctly
    const findings = checkPricingDimensionSource(APPT, [
      { id: 'op1', openingNumber: 1, width: 35.625, height: 47.625, rawBtWidth: 36.0, rawBtHeight: 48.0 },
    ]);
    expect(findings).toHaveLength(0);
  });
});

describe('checkPricingCacheAge', () => {
  it('returns no finding when cache is fresh (< 24h)', () => {
    const findings = checkPricingCacheAge(APPT, Date.now() - 12 * 60 * 60 * 1000);
    expect(findings).toHaveLength(0);
  });

  it('returns info finding when cache is 25h old', () => {
    const findings = checkPricingCacheAge(APPT, Date.now() - 25 * 60 * 60 * 1000);
    expect(findings).toHaveLength(1);
  });

  it('returns warning finding when cache is 49h old', () => {
    const findings = checkPricingCacheAge(APPT, Date.now() - 49 * 60 * 60 * 1000);
    expect(findings[0].severity).toBe('warning');
  });

  it('returns no finding when null', () => {
    const findings = checkPricingCacheAge(APPT, null);
    expect(findings).toHaveLength(0);
  });
});

describe('checkFinanceOptionPresence', () => {
  it('returns warning when finance requested but no option selected', () => {
    const findings = checkFinanceOptionPresence(APPT, {
      financeRequested: true,
      financeOptionId: null,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe('warning');
  });

  it('returns no finding when finance option is selected', () => {
    const findings = checkFinanceOptionPresence(APPT, {
      financeRequested: true,
      financeOptionId: 'some-finance-id',
    });
    expect(findings).toHaveLength(0);
  });

  it('returns no finding when finance was not requested', () => {
    const findings = checkFinanceOptionPresence(APPT, {
      financeRequested: false,
      financeOptionId: null,
    });
    expect(findings).toHaveLength(0);
  });
});
