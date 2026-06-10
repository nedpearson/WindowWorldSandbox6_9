import { UnifiedWarning } from "./centralValidationOrchestrator";

// Measurement Intelligence: Outlier and Transposition Error Detection
export function runMeasurementIntelligence(openings: any[]): UnifiedWarning[] {
  const warnings: UnifiedWarning[] = [];
  
  if (!openings || openings.length === 0) return warnings;

  // 1. Group openings by product category for outlier detection
  const dimensionsByCategory: Record<string, { widths: number[], heights: number[] }> = {};
  
  for (const op of openings) {
    if (!op.productCategory || !op.width || !op.height) continue;
    if (!dimensionsByCategory[op.productCategory]) {
      dimensionsByCategory[op.productCategory] = { widths: [], heights: [] };
    }
    dimensionsByCategory[op.productCategory].widths.push(op.width);
    dimensionsByCategory[op.productCategory].heights.push(op.height);
  }

  // 2. Calculate medians for each category
  const medians: Record<string, { w: number, h: number }> = {};
  for (const [cat, dims] of Object.entries(dimensionsByCategory)) {
    if (dims.widths.length < 3) continue; // Need at least 3 for a meaningful median
    
    dims.widths.sort((a, b) => a - b);
    dims.heights.sort((a, b) => a - b);
    
    const midW = Math.floor(dims.widths.length / 2);
    const midH = Math.floor(dims.heights.length / 2);
    
    medians[cat] = {
      w: dims.widths.length % 2 !== 0 ? dims.widths[midW] : (dims.widths[midW - 1] + dims.widths[midW]) / 2,
      h: dims.heights.length % 2 !== 0 ? dims.heights[midH] : (dims.heights[midH - 1] + dims.heights[midH]) / 2,
    };
  }

  // 3. Scan openings for outliers and transpositions
  for (const op of openings) {
    if (!op.productCategory || !op.width || !op.height) continue;
    const med = medians[op.productCategory];
    if (!med) continue; // not enough data

    // Transposition Error Detection (e.g., entered 72x36 instead of 36x72)
    // If swapping W and H brings it much closer to the median, it's likely transposed
    const currentDiff = Math.abs(op.width - med.w) + Math.abs(op.height - med.h);
    const transposedDiff = Math.abs(op.height - med.w) + Math.abs(op.width - med.h);
    
    if (transposedDiff < currentDiff * 0.3 && Math.abs(op.width - op.height) > 10) {
      warnings.push({
        id: `ai-transposition-${op.openingNumber}`,
        severity: 'high',
        category: 'measurement',
        stage: 'full_details',
        source: 'measurementIntelligence',
        openingNumber: op.openingNumber,
        title: '🤖 AI Detection: Possible Transposed Dimensions',
        detail: `Opening #${op.openingNumber}: The width (${op.width}") and height (${op.height}") appear to be reversed based on the rest of the house. Did you mean ${op.height}" W × ${op.width}" H?`,
        blocksSubmission: false,
        recommendedFix: {
          label: `Swap to ${op.height}" W × ${op.width}" H`,
          actionType: 'set_fields',
          payload: { fields: { width: op.height, height: op.width }, targetOpenings: [op.openingNumber] }
        }
      });
      continue; // Skip outlier check if it's a transposition
    }

    // Outlier Detection
    // If a dimension is >50% different from the median, flag it
    const wRatio = op.width / med.w;
    const hRatio = op.height / med.h;
    
    if (wRatio > 1.5 || wRatio < 0.5 || hRatio > 1.5 || hRatio < 0.5) {
      warnings.push({
        id: `ai-outlier-${op.openingNumber}`,
        severity: 'warning',
        category: 'measurement',
        stage: 'full_details',
        source: 'measurementIntelligence',
        openingNumber: op.openingNumber,
        title: '🤖 AI Detection: Unusual Measurement',
        detail: `Opening #${op.openingNumber}: ${op.width}" × ${op.height}" is significantly different from other ${op.productCategory.replace('_', ' ')}s in this house. Please double-check.`,
        blocksSubmission: false,
      });
    }
  }

  return warnings;
}
