// ═══════════════════════════════════════════════════════════════
// Window World — Photo Tape Measurement Reader
// Production: integrates with server-side vision API.
// Fallback: if no server endpoint configured, returns a
// structured error so the UI can prompt manual entry.
//
// IMPORTANT: Never silently apply AI-detected measurements.
// Always require rep review and approval before use.
// ═══════════════════════════════════════════════════════════════

import { parseMeasurement, toFractionDisplay, ParsedMeasurement } from './measurementParser';
import { MeasurementType } from './measurementRules';

export type PhotoReadStatus = 'pending' | 'processing' | 'detected' | 'low_confidence' | 'failed' | 'approved' | 'rejected';

export interface TapePhotoRead {
  id: string;
  photoDataUrl?: string;    // base64 data URL for preview
  photoStoragePath?: string;
  openingId?: string;
  appointmentId?: string;
  measurementType: MeasurementType;
  // AI/OCR outputs
  rawAiText?: string;
  detectedFraction?: string;    // e.g. "35 3/8"
  detectedDecimal?: number;     // e.g. 35.375
  confidence: number;           // 0-1
  candidates?: string[];        // alternate readings if confidence low
  // Rep review
  correctedValue?: number;
  selectedValue?: number;
  // Applied rule
  ruleAppliedId?: string;
  takeoffAmount?: number;
  finalDecimal?: number;
  finalFraction?: string;
  // Audit
  approvedBy?: string;
  approvedAt?: Date;
  status: PhotoReadStatus;
  requiresManualCorrection: boolean;
  metadata?: Record<string, any>;
}

// ─── CONFIDENCE THRESHOLDS ───────────────────────────────
const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.85,    // auto-show, still needs rep approval
  MEDIUM: 0.65,  // show with warning
  LOW: 0.40,     // require manual correction before applying
};

// ─── PARSE OCR TEXT INTO MEASUREMENT ────────────────────
function parseOcrText(text: string): { parsed: ParsedMeasurement; confidence: number } {
  if (!text?.trim()) return { parsed: { inches: 0, display: '', wholeInches: 0, fraction: '', valid: false, warnings: [] }, confidence: 0 };

  const parsed = parseMeasurement(text.trim());

  // Estimate confidence based on format clarity
  let confidence = parsed.valid ? 0.80 : 0.30;
  if (/^\d+\s+\d+\/\d+$/.test(text.trim())) confidence = 0.92;   // "35 3/8" — most reliable
  if (/^\d+$/.test(text.trim())) confidence = 0.75;               // whole number only
  if (/^\d+\.\d+$/.test(text.trim())) confidence = 0.85;          // decimal

  return { parsed, confidence };
}

// ─── ANALYZE TAPE PHOTO ─────────────────────────────────
// Calls server vision API. If not available, returns a
// structured failure prompting manual entry.
export async function analyzeTapePhoto(
  photoDataUrl: string,
  measurementType: MeasurementType,
): Promise<{ detectedText: string; confidence: number; candidates: string[]; source: 'vision_api' | 'manual_required' }> {
  try {
    const token = localStorage.getItem('wwa_token');
    const res = await fetch('/api/vision/tape-read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ photoDataUrl, measurementType }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        detectedText: data.detectedText || '',
        confidence: data.confidence || 0,
        candidates: data.candidates || [],
        source: 'vision_api',
      };
    }
  } catch {
    // Vision API not available — fall through to manual entry
  }

  // No vision API available — require manual entry
  return {
    detectedText: '',
    confidence: 0,
    candidates: [],
    source: 'manual_required',
  };
}

// ─── BUILD TAPE PHOTO READ RECORD ───────────────────────
export async function processTapePhoto(
  photoDataUrl: string,
  measurementType: MeasurementType,
  openingId?: string,
  appointmentId?: string,
): Promise<TapePhotoRead> {
  const id = `tpr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const { detectedText, confidence, candidates, source } = await analyzeTapePhoto(photoDataUrl, measurementType);

  if (source === 'manual_required') {
    return {
      id,
      photoDataUrl,
      openingId,
      appointmentId,
      measurementType,
      rawAiText: '',
      confidence: 0,
      candidates: [],
      status: 'failed',
      requiresManualCorrection: true,
      metadata: { reason: 'Vision API not configured — enter measurement manually' },
    };
  }

  const { parsed } = parseOcrText(detectedText);
  const requiresManualCorrection = confidence < CONFIDENCE_THRESHOLDS.MEDIUM;

  return {
    id,
    photoDataUrl,
    openingId,
    appointmentId,
    measurementType,
    rawAiText: detectedText,
    detectedFraction: parsed.valid ? parsed.display : undefined,
    detectedDecimal: parsed.valid ? parsed.inches : undefined,
    confidence,
    candidates,
    status: parsed.valid
      ? (confidence >= CONFIDENCE_THRESHOLDS.HIGH ? 'detected' : 'low_confidence')
      : 'failed',
    requiresManualCorrection,
    metadata: { parsedWarnings: parsed.warnings },
  };
}

// ─── APPROVE PHOTO READ ──────────────────────────────────
export function approvePhotoRead(
  read: TapePhotoRead,
  finalDecimalValue: number,
  repName?: string,
): TapePhotoRead {
  return {
    ...read,
    selectedValue: finalDecimalValue,
    finalDecimal: finalDecimalValue,
    finalFraction: toFractionDisplay(finalDecimalValue),
    approvedBy: repName || 'rep',
    approvedAt: new Date(),
    status: 'approved',
  };
}

// ─── CONFIDENCE LABEL HELPER ─────────────────────────────
export function getConfidenceLabel(confidence: number): {
  label: string; color: string; requiresManualEntry: boolean;
} {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return { label: `High confidence (${Math.round(confidence * 100)}%)`, color: 'var(--success)', requiresManualEntry: false };
  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return { label: `Medium confidence (${Math.round(confidence * 100)}%) — verify reading`, color: 'var(--warning)', requiresManualEntry: false };
  return { label: `Low confidence (${Math.round(confidence * 100)}%) — manual entry required`, color: 'var(--danger)', requiresManualEntry: true };
}

export const MEASUREMENT_TYPE_LABELS: Record<MeasurementType, string> = {
  width: 'Width',
  height: 'Height',
  top_sash_width: 'Top Sash Width',
  top_sash_height: 'Top Sash Height',
  leg_height: 'Leg Height',
  rise: 'Rise',
  radius: 'Radius',
  custom_radius: 'Custom Radius',
};
