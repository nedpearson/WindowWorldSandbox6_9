/**
 * financeCalculator.service.ts
 * Pure finance calculation engine — no DB access.
 *
 * Supported formula types (from Finance Options.xlsx "Price Aid" sheet):
 *   zero_interest — total / termMonths  (0% APR, equal payments)
 *   factor        — total × factor      (pre-computed amortization factor)
 *   amortized     — standard PMT        (any APR, calculated)
 *   half_down     — total / 2           (50% down payment)
 *   custom        — from formulaJson    (future extensibility)
 */

// ── Input / Output Types ──────────────────────────────────────

export interface FinanceOptionSnapshot {
  planKey: string;
  displayName: string;
  formulaType: 'zero_interest' | 'factor' | 'amortized' | 'half_down' | 'custom';
  termMonths: number;
  apr: number;                         // e.g. 6.99 (not 0.0699)
  monthlyPaymentFactor?: number | null; // e.g. 0.031249
  minimumAmount?: number | null;
  maximumAmount?: number | null;
  downPaymentPercent?: number | null;  // e.g. 0.50 for 50%
  downPaymentAmount?: number | null;   // fixed dollar amount
  disclosureText?: string | null;
  promoType: string;
}

export interface FinanceCalculationInput {
  projectAmount: number;
  option: FinanceOptionSnapshot;
  downPaymentOverride?: number;        // customer enters custom down payment
}

export interface FinanceCalculationResult {
  planKey: string;
  displayName: string;
  projectAmount: number;
  downPaymentAmount: number;
  financedAmount: number;
  termMonths: number;
  aprPercent: number;
  estimatedMonthlyPayment: number;
  totalPayments: number;
  totalInterest: number;
  disclosureText: string;
  warnings: string[];
  isEligible: boolean;
  formulaType: string;
}

// ── Rounding helper ───────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Core calculation function ─────────────────────────────────

export function calculateFinancing(input: FinanceCalculationInput): FinanceCalculationResult {
  const { projectAmount, option, downPaymentOverride } = input;
  const warnings: string[] = [];

  // Validate project amount
  if (projectAmount <= 0) {
    return ineligible(option, projectAmount, 'Project amount must be greater than zero.');
  }

  // Check minimum amount
  if (option.minimumAmount && projectAmount < option.minimumAmount) {
    return ineligible(
      option,
      projectAmount,
      `Minimum project amount for this plan is $${option.minimumAmount.toLocaleString()}. Your project total is $${projectAmount.toLocaleString()}.`,
    );
  }

  // Check maximum amount
  if (option.maximumAmount && projectAmount > option.maximumAmount) {
    warnings.push(
      `Maximum project amount for this plan is $${option.maximumAmount.toLocaleString()}. Contact your finance manager.`,
    );
  }

  // ── Half-down plan ────────────────────────────────────────
  if (option.formulaType === 'half_down') {
    const down = round2(projectAmount / 2);
    const financed = round2(projectAmount - down);
    return {
      planKey: option.planKey,
      displayName: option.displayName,
      projectAmount: round2(projectAmount),
      downPaymentAmount: down,
      financedAmount: financed,
      termMonths: option.termMonths,
      aprPercent: option.apr,
      estimatedMonthlyPayment: 0,  // balance due at completion
      totalPayments: round2(projectAmount),
      totalInterest: 0,
      disclosureText: buildDisclosure(option, warnings),
      warnings,
      isEligible: true,
      formulaType: option.formulaType,
    };
  }

  // ── Down payment ──────────────────────────────────────────
  let downPaymentAmount = 0;
  if (downPaymentOverride != null && downPaymentOverride >= 0) {
    downPaymentAmount = round2(downPaymentOverride);
  } else if (option.downPaymentAmount != null && option.downPaymentAmount > 0) {
    downPaymentAmount = round2(option.downPaymentAmount);
  } else if (option.downPaymentPercent != null && option.downPaymentPercent > 0) {
    downPaymentAmount = round2(projectAmount * option.downPaymentPercent);
  }

  // Guard: down payment cannot exceed project amount
  if (downPaymentAmount > projectAmount) {
    downPaymentAmount = projectAmount;
    warnings.push('Down payment adjusted to match project total.');
  }

  const financedAmount = round2(Math.max(0, projectAmount - downPaymentAmount));

  if (financedAmount <= 0) {
    return {
      planKey: option.planKey,
      displayName: option.displayName,
      projectAmount: round2(projectAmount),
      downPaymentAmount,
      financedAmount: 0,
      termMonths: option.termMonths,
      aprPercent: option.apr,
      estimatedMonthlyPayment: 0,
      totalPayments: round2(projectAmount),
      totalInterest: 0,
      disclosureText: buildDisclosure(option, warnings),
      warnings,
      isEligible: true,
      formulaType: option.formulaType,
    };
  }

  // ── Monthly payment calculation ───────────────────────────
  let estimatedMonthlyPayment = 0;

  switch (option.formulaType) {
    case 'zero_interest': {
      // Formula: financedAmount / termMonths
      if (option.termMonths <= 0) {
        warnings.push('Invalid term — defaulting to 12 months.');
        estimatedMonthlyPayment = Math.ceil(financedAmount / 12);
      } else {
        estimatedMonthlyPayment = Math.ceil(financedAmount / option.termMonths);
      }
      break;
    }

    case 'factor': {
      // Formula: financedAmount × monthlyPaymentFactor (pre-computed)
      const factor = option.monthlyPaymentFactor;
      if (!factor || factor <= 0) {
        // Fall back to amortized calculation
        warnings.push('Monthly payment factor missing — using amortized calculation.');
        estimatedMonthlyPayment = calculateAmortized(financedAmount, option.apr, option.termMonths);
      } else {
        estimatedMonthlyPayment = Math.ceil(financedAmount * factor);
      }
      break;
    }

    case 'amortized': {
      estimatedMonthlyPayment = calculateAmortized(financedAmount, option.apr, option.termMonths);
      break;
    }

    default: {
      // Generic fallback: use factor if available, else amortized, else zero-interest
      if (option.monthlyPaymentFactor && option.monthlyPaymentFactor > 0) {
        estimatedMonthlyPayment = Math.ceil(financedAmount * option.monthlyPaymentFactor);
      } else if (option.apr > 0) {
        estimatedMonthlyPayment = calculateAmortized(financedAmount, option.apr, option.termMonths);
      } else if (option.termMonths > 0) {
        estimatedMonthlyPayment = Math.ceil(financedAmount / option.termMonths);
      }
    }
  }

  const totalPayments = round2(estimatedMonthlyPayment * option.termMonths);
  const totalInterest = round2(Math.max(0, totalPayments - financedAmount));

  // Promo disclosure
  if (option.promoType === 'interest_free' || option.apr === 0) {
    warnings.push(
      'Promotional rate applies. If balance is not paid by end of promotional period, ' +
      'interest charges may be assessed. Subject to credit approval.',
    );
  }

  return {
    planKey: option.planKey,
    displayName: option.displayName,
    projectAmount: round2(projectAmount),
    downPaymentAmount,
    financedAmount,
    termMonths: option.termMonths,
    aprPercent: option.apr,
    estimatedMonthlyPayment,
    totalPayments: option.termMonths > 0 ? totalPayments : round2(projectAmount),
    totalInterest,
    disclosureText: buildDisclosure(option, warnings),
    warnings,
    isEligible: true,
    formulaType: option.formulaType,
  };
}

// ── Standard amortized payment (PMT) ─────────────────────────

function calculateAmortized(principal: number, aprPct: number, termMonths: number): number {
  if (termMonths <= 0) return 0;
  if (aprPct <= 0) return Math.ceil(principal / termMonths);
  const r = aprPct / 100 / 12;
  const payment = principal * (r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
  return Math.ceil(payment);
}

// ── Ineligible result helper ──────────────────────────────────

function ineligible(
  option: FinanceOptionSnapshot,
  projectAmount: number,
  reason: string,
): FinanceCalculationResult {
  return {
    planKey: option.planKey,
    displayName: option.displayName,
    projectAmount: round2(projectAmount),
    downPaymentAmount: 0,
    financedAmount: 0,
    termMonths: option.termMonths,
    aprPercent: option.apr,
    estimatedMonthlyPayment: 0,
    totalPayments: 0,
    totalInterest: 0,
    disclosureText: reason,
    warnings: [reason],
    isEligible: false,
    formulaType: option.formulaType,
  };
}

// ── Disclosure builder ────────────────────────────────────────

function buildDisclosure(option: FinanceOptionSnapshot, warnings: string[]): string {
  const parts: string[] = [];

  if (option.disclosureText) {
    parts.push(option.disclosureText.trim());
  }

  parts.push(
    'Estimated payment option. Subject to credit approval and lender terms. ' +
    'Create a finance account at WWW.WINWORLDINFO.COM.',
  );

  if (warnings.length > 0) {
    parts.push(...warnings);
  }

  return parts.join(' ');
}

// ── Bulk calculate all options for a project amount ───────────

export function calculateAllOptions(
  projectAmount: number,
  options: FinanceOptionSnapshot[],
): FinanceCalculationResult[] {
  return options
    .filter(o => o.planKey !== 'cash')
    .map(option => calculateFinancing({ projectAmount, option }))
    .sort((a, b) => (a.termMonths || 0) - (b.termMonths || 0));
}

// ── Verify against spreadsheet samples (@ $10,000) ───────────
// Used by smoke test to ensure calculation matches the source sheet.

export interface SpreadsheetVerification {
  planKey: string;
  projectAmount: number;
  expectedMonthly: number;
  actualMonthly: number;
  differenceAmount: number;
  differencePct: number;
  pass: boolean;
}

export function verifyAgainstSpreadsheet(options: FinanceOptionSnapshot[]): SpreadsheetVerification[] {
  const SAMPLE_AMOUNT = 10000;

  // Ground truth from Finance Options.xlsx "Price Aid" sheet @ $10,000
  const EXPECTED: Record<string, number> = {
    'zero-6mo':   1667,
    'zero-15mo':   667,
    'zero-18mo':   556,
    'zero-24mo':   417,
    'factor-36mo': 313,
    'factor-60mo': 205,
    'factor-96mo': 153,
    'factor-120mo':133,
  };

  const results: SpreadsheetVerification[] = [];
  for (const option of options) {
    const expected = EXPECTED[option.planKey];
    if (expected === undefined) continue;

    const result = calculateFinancing({ projectAmount: SAMPLE_AMOUNT, option });
    const actual = result.estimatedMonthlyPayment;
    const diff = Math.abs(actual - expected);
    const pct = expected > 0 ? (diff / expected) * 100 : 0;

    results.push({
      planKey: option.planKey,
      projectAmount: SAMPLE_AMOUNT,
      expectedMonthly: expected,
      actualMonthly: actual,
      differenceAmount: round2(diff),
      differencePct: round2(pct),
      pass: diff < 0.02, // tolerance: 2 cents
    });
  }

  return results;
}
