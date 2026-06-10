// ═══════════════════════════════════════════════════════════════
// Remake Prevention AI Layer
// Analyzes openings for high-risk configurations that commonly 
// result in factory remakes, installation failures, or order delays.
// ═══════════════════════════════════════════════════════════════

export interface RemakeRiskAlert {
  id: string;
  severity: 'critical' | 'high' | 'warning';
  openingNumbers: number[];
  riskType: 'remake_risk' | 'install_issue' | 'missing_field';
  title: string;
  detail: string;
  probability: number; // 0-100%
}

export function analyzeRemakeRisks(openings: any[], groups: any[] = []): RemakeRiskAlert[] {
  const alerts: RemakeRiskAlert[] = [];
  
  if (!openings || openings.length === 0) return alerts;

  // 1. Inconsistent Colors (Remake Risk)
  const colorCounts: Record<string, number> = {};
  openings.forEach(op => {
    if (op.exteriorColor) {
      colorCounts[op.exteriorColor] = (colorCounts[op.exteriorColor] || 0) + 1;
    }
  });
  const dominantColor = Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  
  const oddColorOpenings = openings.filter(op => op.exteriorColor && dominantColor && op.exteriorColor !== dominantColor);
  if (oddColorOpenings.length > 0 && oddColorOpenings.length <= 2) {
    alerts.push({
      id: 'remake-color-inconsistency',
      severity: 'high',
      openingNumbers: oddColorOpenings.map(o => o.openingNumber),
      riskType: 'remake_risk',
      title: 'Inconsistent Exterior Color Detected',
      detail: `Most of the house is ${dominantColor}, but ${oddColorOpenings.length} opening(s) are ${oddColorOpenings.map(o => o.exteriorColor).join(', ')}. This is a high-risk factory remake scenario if entered incorrectly.`,
      probability: 85,
    });
  }

  // 2. Suspicious Dimensions for Window Type
  openings.forEach(op => {
    if (op.width && op.height && op.windowType) {
      const type = op.windowType.toLowerCase();
      // Double hungs are usually taller than they are wide.
      if (type.includes('double_hung') || type.includes('double hung')) {
        if (op.width > op.height + 10) {
          alerts.push({
            id: `remake-dim-dh-${op.openingNumber}`,
            severity: 'critical',
            openingNumbers: [op.openingNumber],
            riskType: 'remake_risk',
            title: 'Suspicious Dimensions: Double Hung',
            detail: `Double hung window width (${op.width}") is significantly greater than height (${op.height}"). Did you transpose the W×H measurements?`,
            probability: 92,
          });
        }
      }
      // Sliders are usually wider than they are tall.
      if (type.includes('slider')) {
        if (op.height > op.width + 10) {
          alerts.push({
            id: `remake-dim-slider-${op.openingNumber}`,
            severity: 'critical',
            openingNumbers: [op.openingNumber],
            riskType: 'remake_risk',
            title: 'Suspicious Dimensions: Slider',
            detail: `Slider window height (${op.height}") is greater than width (${op.width}"). Check if this should be a Double Hung.`,
            probability: 88,
          });
        }
      }
    }

    // 3. Risky Specialty Shapes
    if (['special_shape', 'custom_shape', 'arch', 'circle_top'].some(s => (op.windowType || '').toLowerCase().includes(s) || (op.productCategory || '').toLowerCase().includes(s))) {
      if (!op.templateRequired && !op.installNotes?.toLowerCase().includes('template')) {
        alerts.push({
          id: `remake-specialty-${op.openingNumber}`,
          severity: 'high',
          openingNumbers: [op.openingNumber],
          riskType: 'remake_risk',
          title: 'Specialty Shape Without Template',
          detail: 'Specialty shapes often result in remakes if exact radius/leg height is not templated. Consider requiring a hard template for the factory.',
          probability: 75,
        });
      }
    }

    // 4. Missing Brick Depth (Install Issue)
    if ((op.exteriorType || '').toLowerCase().includes('brick') && (!op.openingDepth || op.openingDepth <= 0)) {
      alerts.push({
        id: `install-depth-${op.openingNumber}`,
        severity: 'high',
        openingNumbers: [op.openingNumber],
        riskType: 'missing_field',
        title: 'Missing Return Depth for Brick',
        detail: 'Brick installs usually require an exact depth measurement for exterior capping/trim sizing.',
        probability: 95,
      });
    }
  });

  // 5. Mull Complexity (Install / Remake Risk)
  groups.forEach(g => {
    if (g.memberMarkerIds.length > 3) {
      const gOpenings = openings.filter(o => g.memberMarkerIds.includes(o.id) || g.memberMarkerIds.includes(`marker_${o.openingNumber}`)); // Rough match
      alerts.push({
        id: `install-mull-${g.id}`,
        severity: 'high',
        openingNumbers: gOpenings.map(o => o.openingNumber),
        riskType: 'install_issue',
        title: 'High Complexity Mull Group',
        detail: `Grouping ${g.memberMarkerIds.length} windows. Verify factory max united inches for continuous mulls. This may require field-mulling and structural reinforcement.`,
        probability: 70,
      });
    }
  });

  return alerts;
}
