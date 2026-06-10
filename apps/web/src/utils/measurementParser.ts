// ═══════════════════════════════════════════════════════════
// Smart Measurement Parser — Fractions, decimals, voice text
// ═══════════════════════════════════════════════════════════

const FRACTIONS: Record<string, number> = {
  '1/8': 0.125, '1/4': 0.25, '3/8': 0.375, '1/2': 0.5,
  '5/8': 0.625, '3/4': 0.75, '7/8': 0.875,
};

const WORD_NUMBERS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90,
};

const WORD_FRACTIONS: Record<string, number> = {
  'one eighth': 0.125, 'one quarter': 0.25, 'a quarter': 0.25,
  'three eighths': 0.375, 'one half': 0.5, 'a half': 0.5, 'half': 0.5,
  'five eighths': 0.625, 'three quarters': 0.75, 'three quarter': 0.75,
  'seven eighths': 0.875,
};

export interface ParsedMeasurement {
  inches: number;
  display: string;       // e.g. "35 3/8"
  wholeInches: number;
  fraction: string;      // e.g. "3/8" or ""
  valid: boolean;
  warnings: string[];
}

/** Parse any measurement string into inches */
export function parseMeasurement(input: string): ParsedMeasurement {
  const raw = input.trim();
  if (!raw) return { inches: 0, display: '', wholeInches: 0, fraction: '', valid: false, warnings: [] };

  const warnings: string[] = [];
  let whole = 0;
  let num = 0;
  let den = 1;
  let hasFraction = false;
  let inches = 0;

  // 1. Try slash typo first (e.g. 23/3/8)
  const slashTypoMatch = raw.match(/^(\d+)\/(\d+)\/(\d+)$/);
  if (slashTypoMatch) {
    whole = parseInt(slashTypoMatch[1], 10);
    num = parseInt(slashTypoMatch[2], 10);
    den = parseInt(slashTypoMatch[3], 10);
    hasFraction = true;
  } else {
    // 2. Try normal fraction (e.g. 55 1/8 or 55-3/8)
    const normalFracMatch = raw.match(/^(\d+)\s*[-\s]\s*(\d+)\/(\d+)$/);
    if (normalFracMatch) {
      whole = parseInt(normalFracMatch[1], 10);
      num = parseInt(normalFracMatch[2], 10);
      den = parseInt(normalFracMatch[3], 10);
      hasFraction = true;
    } else {
      // 3. Try bare fraction (e.g. 3/8)
      const bareFracMatch = raw.match(/^(\d+)\/(\d+)$/);
      if (bareFracMatch) {
        whole = 0;
        num = parseInt(bareFracMatch[1], 10);
        den = parseInt(bareFracMatch[2], 10);
        hasFraction = true;
      } else {
        // 4. Try decimal/integer (e.g. 55.125 or 72)
        const decMatch = raw.match(/^(\d+(?:\.\d+)?)$/);
        if (decMatch) {
          const val = parseFloat(decMatch[1]);
          whole = Math.floor(val);
          const remainder = val - whole;
          if (remainder > 0) {
            // Check if it's a multiple of 0.125
            const eighths = remainder * 8;
            if (Math.abs(eighths - Math.round(eighths)) < 0.01) {
              num = Math.round(eighths);
              den = 8;
              hasFraction = true;
            } else {
              // Decimal not matching eighths (e.g. 55.1)
              const roundedEighths = Math.round(val * 8);
              const roundedVal = roundedEighths / 8;
              warnings.push(`Value ${val}" is not in 1/8-inch increments. Rounded to nearest eighth: ${formatResult(roundedVal, []).display}"`);
              inches = roundedVal;
              return formatResult(inches, warnings);
            }
          } else {
            inches = whole;
            return formatResult(inches, warnings);
          }
        } else {
          // 5. Try voice/text: "thirty five and three eighths"
          const textResult = parseTextMeasurement(raw.toLowerCase());
          if (textResult > 0) {
            return formatResult(textResult, warnings);
          }
          return { inches: 0, display: raw, wholeInches: 0, fraction: '', valid: false, warnings: ['Could not parse measurement'] };
        }
      }
    }
  }

  // If we have a fraction, validate it
  if (hasFraction) {
    if (den === 0) {
      return { inches: 0, display: raw, wholeInches: 0, fraction: '', valid: false, warnings: ['Denominator cannot be zero'] };
    }
    if (num >= den) {
      return { inches: 0, display: raw, wholeInches: 0, fraction: '', valid: false, warnings: ['Fraction numerator must be less than denominator'] };
    }
    // Check if it simplifies to a multiple of 1/8.
    // In general, (num * 8) % den === 0 means it can be represented as an integer number of eighths.
    if ((num * 8) % den !== 0) {
      const val = whole + num / den;
      const roundedEighths = Math.round(val * 8);
      const roundedVal = roundedEighths / 8;
      warnings.push(`Fraction ${num}/${den} is not in 1/8-inch increments. Rounded to nearest eighth: ${formatResult(roundedVal, []).display}"`);
      return { inches: 0, display: raw, wholeInches: 0, fraction: '', valid: false, warnings };
    }
    inches = whole + num / den;
  }

  return formatResult(inches, warnings);
}

function parseTextMeasurement(text: string): number {
  let total = 0;

  // Remove "and" used as separator, "inches"
  let cleaned = text.replace(/\binches?\b/g, '').replace(/\bby\b/g, '×').trim();

  // Extract fraction part first
  for (const [phrase, val] of Object.entries(WORD_FRACTIONS)) {
    if (cleaned.includes(phrase)) {
      total += val;
      cleaned = cleaned.replace(phrase, '').replace(/\band\b/g, '').trim();
      break;
    }
  }

  // Parse whole number words
  const words = cleaned.split(/[\s-]+/).filter(w => w && w !== 'and');
  let whole = 0;
  for (const w of words) {
    if (WORD_NUMBERS[w] !== undefined) whole += WORD_NUMBERS[w];
  }
  total += whole;

  return total;
}

function formatResult(inches: number, warnings: string[]): ParsedMeasurement {
  if (inches <= 0) return { inches: 0, display: '0', wholeInches: 0, fraction: '', valid: false, warnings };

  const whole = Math.floor(inches);
  const remainder = inches - whole;

  // Find closest 1/8th fraction
  let closestFrac = '';
  let minDiff = Infinity;
  for (const [label, val] of Object.entries(FRACTIONS)) {
    const diff = Math.abs(remainder - val);
    if (diff < minDiff) { minDiff = diff; closestFrac = label; }
  }
  const fracStr = minDiff < 0.01 ? closestFrac : '';
  const display = fracStr ? `${whole} ${fracStr}` : `${whole}`;

  return { inches, display, wholeInches: whole, fraction: fracStr, valid: true, warnings };
}

/** Parse "W x H" voice input */
export function parseWxH(input: string): { width: ParsedMeasurement; height: ParsedMeasurement } {
  const separators = [' by ', ' × ', ' x ', '×', 'x'];
  for (const sep of separators) {
    const idx = input.toLowerCase().indexOf(sep);
    if (idx >= 0) {
      const w = input.substring(0, idx).trim();
      const h = input.substring(idx + sep.length).trim();
      return { width: parseMeasurement(w), height: parseMeasurement(h) };
    }
  }
  return { width: parseMeasurement(input), height: { inches: 0, display: '', wholeInches: 0, fraction: '', valid: false, warnings: [] } };
}

/** Validate measurement for common errors */
export function validateMeasurement(width: number, height: number, productCategory: string): string[] {
  const warnings: string[] = [];
  if (width <= 0 || height <= 0) { warnings.push('Width and height must be positive'); return warnings; }

  // Unrealistic sizes
  if (width > 120) warnings.push(`Width ${width}" seems too large (>10 ft)`);
  if (height > 120) warnings.push(`Height ${height}" seems too large (>10 ft)`);
  if (width < 8) warnings.push(`Width ${width}" seems too small (<8")`);
  if (height < 8 && !['custom_shape'].includes(productCategory)) warnings.push(`Height ${height}" seems too small (<8")`);

  // Inverted dimensions
  const doors = ['patio_door', 'sliding_door', 'french_door', 'entry_door'];
  if (doors.includes(productCategory)) {
    if (width > height) warnings.push('Door width exceeds height — dimensions may be inverted');
    if (height < 72) warnings.push('Door height under 72" — verify measurement');
  } else {
    if (height > width * 3) warnings.push('Height is 3x+ width — verify orientation');
  }

  // Specialty shape checks
  const specialty = ['eyebrow', 'circle_top', 'quarter_arch'];
  if (specialty.includes(productCategory)) {
    if (width % 2 !== 0 && productCategory === 'circle_top') warnings.push('Circle top width should be even for symmetric radius');
  }

  // Likely typo: single digit probably missing a digit
  if (width >= 1 && width <= 9) warnings.push(`Width ${width}" is very small — did you mean ${width}0"?`);
  if (height >= 1 && height <= 9) warnings.push(`Height ${height}" is very small — did you mean ${height}0"?`);

  return warnings;
}

/** Convert decimal to display fraction */
export function toFractionDisplay(inches: number): string {
  return formatResult(inches, []).display;
}

/** All standard fractions for keypad */
export const FRACTION_BUTTONS = [
  { label: '⅛', value: '1/8', decimal: 0.125 },
  { label: '¼', value: '1/4', decimal: 0.25 },
  { label: '⅜', value: '3/8', decimal: 0.375 },
  { label: '½', value: '1/2', decimal: 0.5 },
  { label: '⅝', value: '5/8', decimal: 0.625 },
  { label: '¾', value: '3/4', decimal: 0.75 },
  { label: '⅞', value: '7/8', decimal: 0.875 },
];
