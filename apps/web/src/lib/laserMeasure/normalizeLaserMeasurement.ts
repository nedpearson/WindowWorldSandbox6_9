/**
 * normalizeLaserMeasurement.ts
 *
 * Normalizes any laser measurement input string to decimal inches.
 * Supports all formats the Bosch GLM165-27G can display:
 *   - Fractional inches:  "36 1/4"  "36-1/4"  "36 1/4 in"
 *   - Decimal inches:     "36.25"   "36.25 in" "36.25\""
 *   - Feet/inches:        "3' 0 1/4"  "3ft 0 1/4in"  "3 ft 0.25 in"
 *   - Metric:             "914 mm"  "91.4 cm"  "0.914 m"
 *   - Plain number:       "36"  (assumed inches)
 *
 * Returns both decimal inches and fractional display string.
 */

export interface NormalizedMeasurement {
  rawValueText: string;
  rawUnit: 'inches' | 'feet_inches' | 'fractional_inches' | 'mm' | 'cm' | 'm' | 'decimal_inches' | 'unknown';
  normalizedInches: number;
  normalizedFractionText: string;   // e.g. "36 1/4"
  parseConfidence: number;          // 0-1
  warnings: string[];
  valid: boolean;
}

const INCH_PER_MM = 0.0393701;
const INCH_PER_CM = 0.393701;
const INCH_PER_M  = 39.3701;

const COMMON_FRACTIONS: Record<string, number> = {
  '1/32': 1/32, '1/16': 1/16, '3/32': 3/32,
  '1/8': 1/8, '3/16': 3/16,
  '1/4': 1/4, '5/16': 5/16, '3/8': 3/8, '7/16': 7/16,
  '1/2': 1/2, '9/16': 9/16, '5/8': 5/8, '11/16': 11/16,
  '3/4': 3/4, '13/16': 13/16, '7/8': 7/8, '15/16': 15/16,
};

/** Convert decimal inches to nearest fractional string (1/16 precision) */
export function toFractionDisplay(inches: number): string {
  const whole = Math.floor(inches);
  const frac = inches - whole;
  if (frac < 0.02) return `${whole}`;
  // Find nearest 1/16
  const sixteenths = Math.round(frac * 16);
  if (sixteenths === 0) return `${whole}`;
  if (sixteenths === 16) return `${whole + 1}`;
  // Simplify fraction
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const num = sixteenths;
  const den = 16;
  const g = gcd(num, den);
  return whole > 0
    ? `${whole} ${num / g}/${den / g}`
    : `${num / g}/${den / g}`;
}

function parseFraction(s: string): number | null {
  const match = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  const d = parseInt(match[2], 10);
  if (d === 0) return null;
  return n / d;
}

/** Main normalization function */
export function normalizeLaserMeasurement(input: string): NormalizedMeasurement {
  const rawValueText = input.trim();
  const warnings: string[] = [];

  if (!rawValueText) {
    return {
      rawValueText,
      rawUnit: 'unknown',
      normalizedInches: 0,
      normalizedFractionText: '',
      parseConfidence: 0,
      warnings: ['Empty input'],
      valid: false,
    };
  }

  const s = rawValueText.toLowerCase().replace(/"/g, ' in ').replace(/'/g, ' ft ').trim();

  // --- Metric: mm ---
  const mmMatch = s.match(/^(\d+(?:\.\d+)?)\s*mm$/);
  if (mmMatch) {
    const inches = parseFloat(mmMatch[1]) * INCH_PER_MM;
    return { rawValueText, rawUnit: 'mm', normalizedInches: inches,
      normalizedFractionText: toFractionDisplay(inches), parseConfidence: 0.99,
      warnings, valid: true };
  }

  // --- Metric: cm ---
  const cmMatch = s.match(/^(\d+(?:\.\d+)?)\s*cm$/);
  if (cmMatch) {
    const inches = parseFloat(cmMatch[1]) * INCH_PER_CM;
    return { rawValueText, rawUnit: 'cm', normalizedInches: inches,
      normalizedFractionText: toFractionDisplay(inches), parseConfidence: 0.99,
      warnings, valid: true };
  }

  // --- Metric: m ---
  const mMatch = s.match(/^(\d+(?:\.\d+)?)\s*m$/);
  if (mMatch) {
    const inches = parseFloat(mMatch[1]) * INCH_PER_M;
    return { rawValueText, rawUnit: 'm', normalizedInches: inches,
      normalizedFractionText: toFractionDisplay(inches), parseConfidence: 0.99,
      warnings, valid: true };
  }

  // --- Fractional inches: "36 1/4"  "36-1/4"  "36 1/4 in" ---
  // IMPORTANT: Check this BEFORE feet-inches to avoid misclassifying "36 1/4" as 36ft 1/4in.
  const fracInchMatch = s.match(/^(\d+)\s*[\s\-]?\s*(\d+\/\d+)\s*(?:in|inch|inches)?$/);
  if (fracInchMatch) {
    const whole = parseInt(fracInchMatch[1], 10);
    const frac = parseFraction(fracInchMatch[2]) ?? 0;
    const inches = whole + frac;
    return { rawValueText, rawUnit: 'fractional_inches', normalizedInches: inches,
      normalizedFractionText: toFractionDisplay(inches), parseConfidence: 0.99,
      warnings, valid: true };
  }

  // --- Feet + fractional/decimal inches ---
  // Handles: "3' 0 1/4 in"  "3ft 0.25in"  "3 ft 0 1/4"  "3-0-1/4"
  // REQUIRES an explicit feet keyword (ft, foot, feet, or ') to prevent ambiguity.
  const ftMatch = s.match(/^(\d+)\s*(?:ft|foot|feet|')\s*[\s\-]?\s*(\d+)?\s*[\s\-]?(\d+\/\d+)?\s*(?:in|inch|inches)?$/) ||
                  s.match(/^(\d+)\s*(?:ft|foot|feet)\s+(\d+(?:\.\d+)?)\s*(?:in|inch|inches)?$/);
  if (ftMatch && ftMatch[1]) {
    const ftVal = parseInt(ftMatch[1], 10);
    let inVal = 0;
    // Check for decimal inches in group 2
    if (ftMatch[2] && ftMatch[2].includes('.')) {
      inVal = parseFloat(ftMatch[2]);
    } else if (ftMatch[2]) {
      inVal = parseInt(ftMatch[2], 10);
    }
    const fracVal = ftMatch[3] ? parseFraction(ftMatch[3]) ?? 0 : 0;
    const inches = ftVal * 12 + inVal + fracVal;
    if (inches > 0) {
      return { rawValueText, rawUnit: 'feet_inches', normalizedInches: inches,
        normalizedFractionText: toFractionDisplay(inches), parseConfidence: 0.97,
        warnings, valid: true };
    }
  }

  // --- Plain fraction: "1/4" (without whole number) ---
  if (/^\d+\/\d+$/.test(s)) {
    const frac = parseFraction(s) ?? 0;
    return { rawValueText, rawUnit: 'fractional_inches', normalizedInches: frac,
      normalizedFractionText: toFractionDisplay(frac), parseConfidence: 0.85,
      warnings: ['No whole number — assumed fractional inch only'], valid: frac > 0 };
  }

  // --- Decimal inches: "36.25"  "36.25 in"  "36.25\"" ---
  const decMatch = s.match(/^(\d+(?:\.\d+)?)\s*(?:in|inch|inches|")?$/);
  if (decMatch) {
    const inches = parseFloat(decMatch[1]);
    // Heuristic: if > 0 and < 300 (25ft), it's likely inches
    if (inches > 0 && inches < 300) {
      return { rawValueText, rawUnit: 'decimal_inches', normalizedInches: inches,
        normalizedFractionText: toFractionDisplay(inches), parseConfidence: 0.95,
        warnings, valid: true };
    }
  }

  // --- Plain whole number: "36" ---
  const plainMatch = s.match(/^(\d+)$/);
  if (plainMatch) {
    const val = parseInt(plainMatch[1], 10);
    if (val > 0 && val < 300) {
      return { rawValueText, rawUnit: 'inches', normalizedInches: val,
        normalizedFractionText: toFractionDisplay(val), parseConfidence: 0.80,
        warnings: ['Assumed inches — verify unit on laser display'], valid: true };
    }
  }

  // --- Failed to parse ---
  return {
    rawValueText,
    rawUnit: 'unknown',
    normalizedInches: 0,
    normalizedFractionText: '',
    parseConfidence: 0,
    warnings: [`Could not parse measurement: "${rawValueText}"`],
    valid: false,
  };
}

/** Flag suspicious measurements that need user confirmation */
export function detectSuspiciousMeasurement(
  inches: number,
  assignedField: string,
  previousInches?: number,
): string[] {
  const issues: string[] = [];
  if (inches <= 0) issues.push('Measurement is zero or negative');
  if (inches > 240) issues.push('Measurement exceeds 20 ft — unusually large');
  if (assignedField === 'width' || assignedField === 'height') {
    if (inches < 6)  issues.push('Measurement less than 6" — unusually small for a window');
    if (inches > 144) issues.push('Measurement exceeds 12 ft — very large window');
  }
  if (previousInches && previousInches > 0) {
    const pctChange = Math.abs(inches - previousInches) / previousInches;
    if (pctChange > 0.25) {
      issues.push(`Measurement is ${Math.round(pctChange * 100)}% different from previous value (${toFractionDisplay(previousInches)}")`);
    }
  }
  return issues;
}
