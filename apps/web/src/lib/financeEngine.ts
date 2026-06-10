import { FinanceOption } from '../types';

export interface FinanceCalculation {
  amountFinanced: number;
  financedBalance: number;
  monthlyPayment: number;
  termMonths: number;
  apr: number;
  promoMonths: number;
  disclosureText?: string;
  sourceVersion: string;
  calculationMethod: string;
  warnings: string[];
  blockers: string[];
}

export function calculateFinancePayment(params: {
  finalContractTotal: number;
  downPayment: number;
  financeOption: FinanceOption;
}): FinanceCalculation {
  const { finalContractTotal, downPayment, financeOption } = params;
  
  const warnings: string[] = [];
  const blockers: string[] = [];
  
  const financedBalance = Math.max(0, finalContractTotal - downPayment);
  let monthlyPayment = 0;
  let calculationMethod = 'unknown';

  if (financeOption.minimumAmount && financedBalance < financeOption.minimumAmount) {
    blockers.push(`Amount financed ($${financedBalance.toFixed(2)}) is below the minimum required ($${financeOption.minimumAmount.toFixed(2)}) for this plan.`);
  }
  if (financeOption.maximumAmount && financedBalance > financeOption.maximumAmount) {
    blockers.push(`Amount financed ($${financedBalance.toFixed(2)}) exceeds the maximum allowed ($${financeOption.maximumAmount.toFixed(2)}) for this plan.`);
  }

  if (financeOption.factor !== undefined && financeOption.factor > 0) {
    // Standard factor-based calculation
    monthlyPayment = financedBalance * financeOption.factor;
    calculationMethod = 'factor';
  } else if (financeOption.apr !== undefined && financeOption.termMonths > 0) {
    // Amortized APR calculation
    const monthlyInterestRate = (financeOption.apr / 100) / 12;
    if (monthlyInterestRate === 0) {
      monthlyPayment = financedBalance / financeOption.termMonths;
      calculationMethod = 'zero-interest-division';
    } else {
      const term = financeOption.termMonths;
      monthlyPayment = financedBalance * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, term)) / (Math.pow(1 + monthlyInterestRate, term) - 1);
      calculationMethod = 'amortized';
    }
  } else {
    // Deferred or custom promo without a direct calculation formula
    blockers.push('This finance plan requires manager review for payment calculation.');
    calculationMethod = 'manual-review';
  }

  // Monthly Payments are usually rounded up
  monthlyPayment = Math.ceil(monthlyPayment * 100) / 100;

  return {
    amountFinanced: finalContractTotal,
    financedBalance,
    monthlyPayment,
    termMonths: financeOption.termMonths,
    apr: financeOption.apr || 0,
    promoMonths: financeOption.promoMonths || 0,
    disclosureText: financeOption.disclosureText,
    sourceVersion: financeOption.sourceVersion,
    calculationMethod,
    warnings,
    blockers
  };
}
