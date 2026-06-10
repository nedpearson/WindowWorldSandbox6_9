export interface CushMeasureInput {
  actualWidth: number;
  actualHeight: number;
  exteriorType?: string;
  perSideDeductionOverride?: number;
}

export interface CushMeasureResult {
  revisedWidth: number;
  revisedHeight: number;
  deductionPerSide: number;
  totalWidthDeduction: number;
  totalHeightDeduction: number;
  isBrick: boolean;
}

export function calculateCushMeasure({
  actualWidth,
  actualHeight,
  exteriorType,
  perSideDeductionOverride
}: CushMeasureInput): CushMeasureResult {
  // Determine deduction per side
  const isBrick = exteriorType?.toLowerCase().includes('brick') || false;
  
  let deductionPerSide = isBrick ? 0.5 : 0.375;
  if (perSideDeductionOverride !== undefined) {
    deductionPerSide = perSideDeductionOverride;
  }

  const totalWidthDeduction = deductionPerSide * 2;
  const totalHeightDeduction = deductionPerSide * 2;

  // Calculate raw revised sizes
  const rawRevisedWidth = actualWidth - totalWidthDeduction;
  const rawRevisedHeight = actualHeight - totalHeightDeduction;

  // Round to nearest 1/16th to prevent floating point drift
  const roundToSixteenth = (val: number) => Math.round(val * 16) / 16;
  
  const revisedWidth = roundToSixteenth(rawRevisedWidth);
  const revisedHeight = roundToSixteenth(rawRevisedHeight);

  return {
    revisedWidth: Math.max(0, revisedWidth),
    revisedHeight: Math.max(0, revisedHeight),
    deductionPerSide,
    totalWidthDeduction,
    totalHeightDeduction,
    isBrick
  };
}

// Helper to display fractions nicely
export function formatFraction(decimal: number): string {
  if (!decimal || isNaN(decimal)) return '';
  const whole = Math.floor(decimal);
  const fraction = decimal - whole;
  if (fraction === 0) return `${whole}"`;
  
  // Snap to common fractions
  const sixteenths = Math.round(fraction * 16);
  if (sixteenths === 0) return `${whole}"`;
  if (sixteenths === 16) return `${whole + 1}"`;
  
  // Simplify fraction
  let num = sixteenths;
  let den = 16;
  while (num % 2 === 0 && den % 2 === 0) {
    num /= 2;
    den /= 2;
  }
  
  return whole > 0 ? `${whole} ${num}/${den}"` : `${num}/${den}"`;
}
