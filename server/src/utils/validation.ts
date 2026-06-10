import { prisma } from '../index.js';

export interface ConsistencyIssue {
  openingNumber?: number;
  field?: string;
  severity: 'blocker' | 'warning' | 'info';
  message: string;
}

/**
 * Validates that the measurement guidance selections are consistent
 * across the appointment's openings.
 */
export async function validateMeasurementGuidanceConsistency(appointmentId: string): Promise<ConsistencyIssue[]> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      openings: {
        where: { deletedAt: null },
        orderBy: { openingNumber: 'asc' },
      },
    },
  });

  if (!appointment) return [];

  const issues: ConsistencyIssue[] = [];

  for (const opening of appointment.openings) {
    const ext = (opening.exteriorType || '').toLowerCase();
    const surface = (opening.exteriorSurface || '').toLowerCase();

    // 1. Exterior selected has measurement basis.
    if ((opening.exteriorType || opening.exteriorSurface) && !opening.actualMeasurementBasis) {
      issues.push({
        openingNumber: opening.openingNumber,
        field: 'actualMeasurementBasis',
        severity: 'blocker',
        message: `Opening #${opening.openingNumber}: Exterior selected (${opening.exteriorType || opening.exteriorSurface}) requires measurement basis selection.`,
      });
    }

    // 2. Stucco has cutback decision.
    if ((ext.includes('stucco') || surface.includes('stucco')) && (opening.cutbackRequired === null || opening.cutbackRequired === undefined)) {
      issues.push({
        openingNumber: opening.openingNumber,
        field: 'cutbackRequired',
        severity: 'blocker',
        message: `Opening #${opening.openingNumber}: Stucco requires a cutback decision.`,
      });
    }

    // 3. Stucco aluminum removal maps correctly.
    if ((ext.includes('stucco') || surface.includes('stucco')) && opening.removalType === 'ALUM' && opening.removalDetail !== 'Remove Aluminum from Stucco') {
      issues.push({
        openingNumber: opening.openingNumber,
        field: 'removalDetail',
        severity: 'warning',
        message: `Opening #${opening.openingNumber}: Stucco with aluminum removal should specify 'Remove Aluminum from Stucco'.`,
      });
    }

    // 4. Siding/wood trim/header flashing recommendation accepted or overridden.
    const isSidingOrWood = ext.includes('siding') || ext.includes('wood') || surface.includes('siding') || surface.includes('wood');
    if (isSidingOrWood && opening.trimIncluded === null && opening.headerFlashingIncluded === null && !opening.measurementGuidanceAccepted) {
      issues.push({
        openingNumber: opening.openingNumber,
        field: 'measurementGuidanceAccepted',
        severity: 'warning',
        message: `Opening #${opening.openingNumber}: Siding/Wood exterior measurement guidance must be accepted or overridden.`,
      });
    }

    // 5. Mull has window numbers and contract mapping.
    if (opening.installMullion) {
      // Check if mull details are recorded
      const hasMullDetails = opening.customerNotes?.toLowerCase().includes('mull') || opening.installNotes?.toLowerCase().includes('mull') || opening.mullGroup;
      if (!hasMullDetails) {
        issues.push({
          openingNumber: opening.openingNumber,
          field: 'installMullion',
          severity: 'blocker',
          message: `Opening #${opening.openingNumber}: Mull is selected but missing window numbers or group configuration.`,
        });
      }
    }

    // 6. Special shape has required fields and pricing.
    const cat = (opening.productCategory || '').toLowerCase();
    const isSpecialShape = ['eyebrow', 'circle_top', 'quarter_arch', 'custom_shape', 'special_shape'].includes(cat) || (opening.seriesModel || '').startsWith('S1');
    if (isSpecialShape) {
      if (!opening.width || !opening.height || !opening.legHeight) {
        issues.push({
          openingNumber: opening.openingNumber,
          field: 'legHeight',
          severity: 'blocker',
          message: `Opening #${opening.openingNumber}: Special shape requires Width, Full Height, and Leg Height.`,
        });
      }
      if (!opening.totalPrice || opening.totalPrice === 0) {
        issues.push({
          openingNumber: opening.openingNumber,
          field: 'totalPrice',
          severity: 'blocker',
          message: `Opening #${opening.openingNumber}: Special shape is missing pricing.`,
        });
      }
    }

    // 7. Oriel has top sash height if selected.
    if (opening.oriel && !opening.orielUpperSashHeight) {
      issues.push({
        openingNumber: opening.openingNumber,
        field: 'orielUpperSashHeight',
        severity: 'blocker',
        message: `Opening #${opening.openingNumber}: Oriel double hung requires top sash height.`,
      });
    }

    // 8. Photo annotations linked if used.
    if (opening.outsidePhotoId && !opening.measurementVisualAnnotationId) {
      issues.push({
        openingNumber: opening.openingNumber,
        field: 'measurementVisualAnnotationId',
        severity: 'warning',
        message: `Opening #${opening.openingNumber}: Outside photo is uploaded but has no arrow annotation.`,
      });
    }
  }

  return issues;
}
