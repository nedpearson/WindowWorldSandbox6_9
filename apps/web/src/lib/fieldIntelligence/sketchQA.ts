import { FieldIntelligenceFinding } from './types';
import { NON_OPENING_MARKERS, SketchMarkerData } from '../../utils/sketchSync';

/**
 * Deterministic Sketch vs Openings QA Check
 * Ensures the Sketch Canvas stays perfectly synced with the Openings list.
 */
export function analyzeSketchState(
  appointmentId: string,
  markers: SketchMarkerData[],
  openings: any[]
): FieldIntelligenceFinding[] {
  const findings: FieldIntelligenceFinding[] = [];
  const now = Date.now();

  const windowMarkers = markers.filter(m => !NON_OPENING_MARKERS.includes(m.markerSymbol || ''));
  
  // 1. Duplicate Opening Numbers
  const openingNumbers = new Set<number>();
  const duplicates = new Set<number>();
  for (const op of openings) {
    if (op.openingNumber != null) {
      if (openingNumbers.has(op.openingNumber)) {
        duplicates.add(op.openingNumber);
      } else {
        openingNumbers.add(op.openingNumber);
      }
    }
  }

  for (const dup of duplicates) {
    findings.push({
      id: `smart_check_${appointmentId}_duplicate_opening_${dup}`,
      severity: 'blocking',
      category: 'sketch',
      source: 'deterministic_rule',
      appointmentId,
      title: 'Duplicate Opening Number',
      message: `Multiple openings share Opening #${dup}. This will cause critical conflicts in manufacturing.`,
      suggestedAction: `Delete the duplicate Opening #${dup} or renumber it.`,
      requiresApproval: true,
      status: 'open',
      createdAt: now,
    });
  }

  // 2. Orphan Openings (Opening exists, but no matching marker)
  for (const op of openings) {
    // If opening was created from a marker, it should have sketchMarkerId.
    // If not, we fall back to matching by openingNumber vs markerNumber.
    const matchingMarker = windowMarkers.find(
      m => (op.sketchMarkerId && m.id === op.sketchMarkerId) || m.markerNumber === op.openingNumber
    );

    if (!matchingMarker) {
      findings.push({
        id: `smart_check_${appointmentId}_orphan_opening_${op.id}`,
        severity: 'warning',
        category: 'opening',
        source: 'deterministic_rule',
        appointmentId,
        openingId: op.id,
        openingNumber: op.openingNumber,
        title: 'Opening Missing from Sketch',
        message: `Opening #${op.openingNumber} exists in the quote but has no marker on the sketch canvas.`,
        suggestedAction: `Draw Opening #${op.openingNumber} on the sketch or delete the opening.`,
        requiresApproval: true,
        status: 'open',
        createdAt: now,
      });
    }
  }

  // 3. Orphan Markers (Marker exists, but no matching opening)
  for (const m of windowMarkers) {
    const matchingOp = openings.find(
      op => (op.sketchMarkerId && op.sketchMarkerId === m.id) || op.openingNumber === m.markerNumber
    );

    if (!matchingOp) {
      findings.push({
        id: `smart_check_${appointmentId}_orphan_marker_${m.id}`,
        severity: 'blocking',
        category: 'sketch',
        source: 'deterministic_rule',
        appointmentId,
        title: `Unlinked Sketch Marker #${m.markerNumber || '?'}`,
        message: `A window/door marker (#${m.markerNumber || '?'}) on the sketch has no associated opening details or pricing.`,
        suggestedAction: 'Link marker to an opening or delete the marker.',
        requiresApproval: true,
        status: 'open',
        createdAt: now,
      });
    }
  }

  // 4. Count Mismatch
  if (windowMarkers.length !== openings.length) {
    // If we already flagged orphans, don't overwhelm, but add an info/warning note if it's a general mismatch.
    findings.push({
      id: `smart_check_${appointmentId}_count_mismatch`,
      severity: 'warning',
      category: 'sketch',
      source: 'deterministic_rule',
      appointmentId,
      title: 'Sketch Count Mismatch',
      message: `The sketch has ${windowMarkers.length} openings drawn, but the quote has ${openings.length} openings priced.`,
      requiresApproval: false,
      status: 'open',
      createdAt: now,
    });
  }

  // 5. Check joined/mulled markers (groups)
  // Note: Detailed grouping QA can be added here later if needed, e.g., verifying mulled items have same elevation.

  return findings;
}
