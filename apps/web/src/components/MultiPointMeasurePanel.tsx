/**
 * MultiPointMeasurePanel.tsx
 *
 * Field-friendly multi-point measurement panel for window/opening sizing.
 *
 * Captures:
 *   Width:  Top | Middle | Bottom
 *   Height: Left | Center | Right
 *
 * Logic:
 *   - Selects the SMALLEST valid measurement per axis
 *   - Applies the configured deduction rule (default: −3/8" for replacement windows)
 *   - Warns if captures vary by more than 1/4" (out-of-square)
 *   - Supports Bluetooth BLE, manual entry, and tape reading
 *   - Works fully offline (saves to Dexie, queues sync on reconnect)
 *
 * Platform:
 *   - iOS/iPad: BLE tab auto-disabled (WebKit restriction)
 *   - Android Chrome / Desktop Chrome: full BLE support
 *   - All platforms: manual entry always available
 */

import React, { useState, useCallback, useId } from 'react';
import { useMultiPointMeasurement, type MeasurePointKey, type CaptureSource } from '../lib/laserMeasure/useMultiPointMeasurement';
import { useBluetoothLaser } from '../lib/laserMeasure/useBluetoothLaser';
import { normalizeLaserMeasurement, toFractionDisplay } from '../lib/laserMeasure/normalizeLaserMeasurement';
import { detectDeviceCapability } from '../lib/laserMeasure/deviceCapability';
import { VARIATION_TOLERANCE_INCHES } from '../lib/laserMeasure/measurementRules';
import { api } from '../utils/api';
import { enqueueOutboxItem } from '../lib/syncEngine';
import { saveOfflineMeasurementSession } from '../lib/offlineDb';
import { useAuthStore } from '../store';
import { SmartCheckPanel } from './SmartCheckPanel';
import { useSmartCheck } from '../hooks/useSmartCheck';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface MultiPointMeasurePanelProps {
  appointmentId: string;
  openingId?: string;
  openingNumber?: number;
  /** 'window' | 'patio_door' | 'entry_door' | 'siding' */
  productType?: string;
  /** 'replacement' | 'new_construction' */
  installType?: string;
  /** Pre-populate from existing opening data */
  initialWidthInches?: number;
  initialHeightInches?: number;
  /** Called when rep accepts the final size */
  onFinalSizeAccepted: (payload: {
    width: number;
    height: number;
    rawWidth: number | null;
    rawHeight: number | null;
    widthDeductionInches: number;
    heightDeductionInches: number;
    needsVerification: boolean;
    measurementMethod: string;
    sessionPayload: Record<string, unknown>;
  }) => void;
  onCancel?: () => void;
  /** Show compact version (no header, no cancel button) */
  compact?: boolean;
}

// ── Point row config ──────────────────────────────────────────────────────────

interface PointRowConfig {
  key: MeasurePointKey;
  label: string;
  axis: 'width' | 'height';
}

const WIDTH_ROWS: PointRowConfig[] = [
  { key: 'widthTop',    label: 'Top',    axis: 'width' },
  { key: 'widthMiddle', label: 'Middle', axis: 'width' },
  { key: 'widthBottom', label: 'Bottom', axis: 'width' },
];

const HEIGHT_ROWS: PointRowConfig[] = [
  { key: 'heightLeft',   label: 'Left',   axis: 'height' },
  { key: 'heightCenter', label: 'Center', axis: 'height' },
  { key: 'heightRight',  label: 'Right',  axis: 'height' },
];

const OBSTRUCTION_OPTIONS = [
  { value: 'brick',   label: '🧱 Brick' },
  { value: 'siding',  label: '🏠 Siding' },
  { value: 'stucco',  label: '🪨 Stucco' },
  { value: 'trim',    label: '🔲 Trim' },
  { value: 'sill',    label: '⬜ Sill' },
  { value: 'frame',   label: '🪟 Frame' },
  { value: 'unknown', label: '❓ Unknown' },
];

// ── Helper: format or show placeholder ───────────────────────────────────────

function fmtInches(v: number | null): string {
  if (v === null) return '—';
  return `${toFractionDisplay(v)}"`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MultiPointMeasurePanel({
  appointmentId,
  openingId,
  openingNumber,
  productType = 'window',
  installType = 'replacement',
  initialWidthInches,
  initialHeightInches,
  onFinalSizeAccepted,
  onCancel,
  compact = false,
}: MultiPointMeasurePanelProps) {
  const uid = useId();
  const user = useAuthStore(s => s.user);
  const capability = detectDeviceCapability();

  // Multi-point state
  const mp = useMultiPointMeasurement({
    ctx: { productType, installType },
  });

  // BLE hook (shared across all point rows)
  const ble = useBluetoothLaser();

  // UI state
  const [manualInputValues, setManualInputValues] = useState<Partial<Record<MeasurePointKey, string>>>({});
  const [editingPoint, setEditingPoint] = useState<MeasurePointKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showOverride, setShowOverride] = useState(false);
  const [overrideWidth, setOverrideWidth] = useState('');
  const [overrideHeight, setOverrideHeight] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  const isOffline = !navigator.onLine;

  const { report: smartCheckReport, loading: smartCheckLoading, runCheck: runSmartCheck, handleFindingResolved } = useSmartCheck(appointmentId, {
    stage: 'full_details',
  });

  // ── BLE capture: pipe reading into active point ────────────────────────────

  const captureBleToPoint = useCallback(
    (point: MeasurePointKey) => {
      if (!ble.lastReading?.normalized.valid) return;
      mp.captureToPoint(point, ble.lastReading.normalized.normalizedInches, 'bluetooth');
    },
    [ble.lastReading, mp]
  );

  // ── Manual capture ─────────────────────────────────────────────────────────

  const applyManualInput = useCallback(
    (point: MeasurePointKey) => {
      const raw = manualInputValues[point] ?? '';
      if (!raw.trim()) return;
      const parsed = normalizeLaserMeasurement(raw);
      if (!parsed.valid) {
        // flash red on the input — handled by state
        return;
      }
      mp.captureToPoint(point, parsed.normalizedInches, 'manual');
      setManualInputValues(prev => ({ ...prev, [point]: '' }));
      setEditingPoint(null);
    },
    [manualInputValues, mp]
  );

  // ── Accept final size ─────────────────────────────────────────────────────

  const handleAccept = useCallback(async () => {
    const payload = mp.getSessionPayload();

    // If override is active, validate and apply
    if (showOverride) {
      const w = normalizeLaserMeasurement(overrideWidth);
      const h = normalizeLaserMeasurement(overrideHeight);
      if (!w.valid || !h.valid) {
        setSaveError('Invalid override values — use format like 35 1/2 or 35.5');
        return;
      }
      mp.setOverride(w.normalizedInches, h.normalizedInches, overrideReason);
    }

    if (payload.finalWidthInches === null || payload.finalHeightInches === null) {
      setSaveError('Please capture at least one width and one height measurement.');
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const idempotencyKey = `multipoint:${appointmentId}:${openingId ?? 'new'}:${Date.now()}`;
      const sessionData = {
        ...payload,
        appointmentId,
        openingId,
        openingNumber,
        idempotencyKey,
        widthTakeoff: payload.widthTakeoff,
        heightTakeoff: payload.heightTakeoff,
        adjWidth: payload.finalWidthInches,
        adjHeight: payload.finalHeightInches,
        ruleId: payload.ruleId,
      };

      if (isOffline) {
        // Save to Dexie offline store
        await saveOfflineMeasurementSession({
          localId: idempotencyKey,
          appointmentId,
          openingId,
          widthTop: payload.widthTop,
          widthMiddle: payload.widthMiddle,
          widthBottom: payload.widthBottom,
          heightLeft: payload.heightLeft,
          heightCenter: payload.heightCenter,
          heightRight: payload.heightRight,
          smallestWidthPoint: payload.smallestWidthPoint,
          smallestHeightPoint: payload.smallestHeightPoint,
          rawWidth: payload.rawWidth,
          rawHeight: payload.rawHeight,
          adjWidth: payload.finalWidthInches,
          adjHeight: payload.finalHeightInches,
          widthTakeoff: payload.widthTakeoff,
          heightTakeoff: payload.heightTakeoff,
          ruleId: payload.ruleId,
          ruleName: payload.ruleName,
          sizingMethod: payload.sizingMethod === 'manual_override' ? 'manual_override' : 'smallest_opening',
          widthVarianceInches: payload.widthVarianceInches,
          heightVarianceInches: payload.heightVarianceInches,
          widthNeedsReview: payload.widthNeedsReview,
          heightNeedsReview: payload.heightNeedsReview,
          obstructionDetected: payload.obstructionDetected,
          obstructionType: payload.obstructionType,
          obstructionNotes: payload.obstructionNotes,
          manualOverride: payload.manualOverride,
          overrideReason: payload.overrideReason,
          idempotencyKey,
          savedAt: Date.now(),
          synced: false,
        });

        // Queue for sync on reconnect (idempotency key prevents duplicate)
        if (user) {
          await enqueueOutboxItem({
            companyId: user.companyId ?? '',
            userId: user.id,
            entityType: 'measurement_session',
            entityLocalId: idempotencyKey,
            appointmentId,
            operation: 'create',
            payload: sessionData as Record<string, unknown>,
          });
        }
      } else {
        // Online: save directly
        await api.saveMultiPointSession(sessionData as Record<string, unknown>);
      }

      mp.accept();
      onFinalSizeAccepted({
        width: payload.finalWidthInches!,
        height: payload.finalHeightInches!,
        rawWidth: payload.rawWidth,
        rawHeight: payload.rawHeight,
        widthDeductionInches: payload.widthTakeoff,
        heightDeductionInches: payload.heightTakeoff,
        needsVerification: payload.widthNeedsReview || payload.heightNeedsReview,
        measurementMethod: 'smallest_opening',
        sessionPayload: sessionData as Record<string, unknown>,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setSaveError(`Failed to save: ${msg}`);
    } finally {
      setSaving(false);
    }
  }, [mp, appointmentId, openingId, openingNumber, isOffline, user, showOverride, overrideWidth, overrideHeight, overrideReason, onFinalSizeAccepted]);

  // ── Render ────────────────────────────────────────────────────────────────

  const { result } = mp;
  const varianceWarning =
    (result.widthNeedsReview || result.heightNeedsReview) &&
    (result.widthVarianceInches !== null || result.heightVarianceInches !== null);

  const bleConnected = ble.status === 'connected';
  const bleConnecting = ble.status === 'connecting';
  const bleLastInches = ble.lastReading?.normalized.valid
    ? ble.lastReading.normalized.normalizedInches
    : null;
  const bleLastFraction = ble.lastReading?.normalized.normalizedFractionText ?? null;

  return (
    <div style={styles.panel}>
      {/* Header */}
      {!compact && (
        <div style={styles.header}>
          <span style={styles.headerTitle}>📐 Multi-Point Measurement</span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {isOffline && <span style={styles.offlineBadge}>📵 Offline — saves locally</span>}
            {capability.webBluetoothSupported && (
              <button
                id={`${uid}-ble-connect`}
                onClick={() => bleConnected ? ble.disconnect() : ble.connect()}
                style={bleConnected ? styles.bleConnectedBtn : styles.bleConnectBtn}
              >
                {bleConnected ? '📡 Laser Connected' : '📡 Connect Laser'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Smart Check QA Panel */}
      <div style={{ marginBottom: '0.5rem' }}>
        <SmartCheckPanel
          report={smartCheckReport}
          loading={smartCheckLoading}
          compact={true}
          filterOpeningId={openingId}
          onRunCheck={runSmartCheck}
          onFindingResolved={handleFindingResolved}
        />
      </div>

      {/* BLE status */}
      {capability.webBluetoothSupported && bleConnecting && (
        <div style={styles.bleStatus}>⏳ Connecting to laser…</div>
      )}
      {capability.webBluetoothSupported && bleConnected && ble.lastReading && (
        <div style={styles.bleReading}>
          📡 Last reading: <strong>{bleLastFraction}"</strong>
          {' '}— tap a Capture button to apply to that point
        </div>
      )}
      {!capability.webBluetoothSupported && (
        <div style={styles.bleUnavailable}>
          📵 Bluetooth not available on this browser — use manual entry or tape reading
        </div>
      )}

      {/* Width section */}
      <AxisSection
        uid={uid}
        label="Width"
        rows={WIDTH_ROWS}
        points={mp.points}
        sources={mp.sources}
        activePoint={mp.activePoint}
        smallestPoint={result.smallestWidthPoint}
        smallestValue={result.smallestWidthInches}
        finalValue={result.finalWidthInches}
        varianceInches={result.widthVarianceInches}
        needsReview={result.widthNeedsReview}
        displayDeduction={result.displayDeduction}
        displayFinal={result.displayFinalWidth}
        bleLastReading={bleLastInches}
        bleConnected={bleConnected}
        bleSupported={capability.webBluetoothSupported}
        manualInputValues={manualInputValues}
        editingPoint={editingPoint}
        onSetActive={mp.setActivePoint}
        onCaptureBle={captureBleToPoint}
        onManualChange={(pt, val) => setManualInputValues(prev => ({ ...prev, [pt]: val }))}
        onManualEdit={pt => setEditingPoint(pt)}
        onManualApply={applyManualInput}
        onClear={mp.clearPoint}
      />

      {/* Height section */}
      <AxisSection
        uid={uid}
        label="Height"
        rows={HEIGHT_ROWS}
        points={mp.points}
        sources={mp.sources}
        activePoint={mp.activePoint}
        smallestPoint={result.smallestHeightPoint}
        smallestValue={result.smallestHeightInches}
        finalValue={result.finalHeightInches}
        varianceInches={result.heightVarianceInches}
        needsReview={result.heightNeedsReview}
        displayDeduction={result.displayDeduction}
        displayFinal={result.displayFinalHeight}
        bleLastReading={bleLastInches}
        bleConnected={bleConnected}
        bleSupported={capability.webBluetoothSupported}
        manualInputValues={manualInputValues}
        editingPoint={editingPoint}
        onSetActive={mp.setActivePoint}
        onCaptureBle={captureBleToPoint}
        onManualChange={(pt, val) => setManualInputValues(prev => ({ ...prev, [pt]: val }))}
        onManualEdit={pt => setEditingPoint(pt)}
        onManualApply={applyManualInput}
        onClear={mp.clearPoint}
      />

      {/* Variation warning */}
      {varianceWarning && (
        <div style={styles.warningBox}>
          ⚠️ <strong>Opening varies more than {toFractionDisplay(VARIATION_TOLERANCE_INCHES)}&quot;</strong> —
          opening may be out of square or obstructed.
          Smallest measurement selected. Review before contract.
        </div>
      )}

      {/* Obstruction flags */}
      <div style={styles.obstructionSection}>
        <div style={styles.sectionLabel}>🏗️ Obstruction / Condition Notes</div>
        <div style={styles.obstructionButtons}>
          {OBSTRUCTION_OPTIONS.map(opt => (
            <button
              key={opt.value}
              id={`${uid}-obs-${opt.value}`}
              onClick={() => mp.setObstruction({
                detected: true,
                type: opt.value as 'brick' | 'siding' | 'stucco' | 'trim' | 'sill' | 'frame' | 'unknown',
              })}
              style={{
                ...styles.obstructionBtn,
                ...(mp.obstruction.type === opt.value ? styles.obstructionBtnActive : {}),
              }}
            >
              {opt.label}
            </button>
          ))}
          <button
            id={`${uid}-obs-out-of-square`}
            onClick={() => mp.setObstruction({ detected: true, type: 'unknown' })}
            style={styles.obstructionBtn}
          >
            📐 Out of Square
          </button>
        </div>
        {mp.obstruction.detected && (
          <input
            id={`${uid}-obs-notes`}
            placeholder="Describe obstruction (optional)…"
            value={mp.obstruction.notes}
            onChange={e => mp.setObstruction({ notes: e.target.value })}
            style={styles.notesInput}
          />
        )}
      </div>

      {/* Manual override */}
      {showOverride ? (
        <div style={styles.overrideBox}>
          <div style={styles.sectionLabel}>✏️ Manual Override</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={styles.overrideField}>
              <label htmlFor={`${uid}-ov-w`} style={styles.overrideLabel}>Final Width</label>
              <input
                id={`${uid}-ov-w`}
                placeholder='e.g. 35 1/2'
                value={overrideWidth}
                onChange={e => setOverrideWidth(e.target.value)}
                style={styles.overrideInput}
              />
            </div>
            <div style={styles.overrideField}>
              <label htmlFor={`${uid}-ov-h`} style={styles.overrideLabel}>Final Height</label>
              <input
                id={`${uid}-ov-h`}
                placeholder='e.g. 59 5/8'
                value={overrideHeight}
                onChange={e => setOverrideHeight(e.target.value)}
                style={styles.overrideInput}
              />
            </div>
          </div>
          <input
            id={`${uid}-ov-reason`}
            placeholder='Override reason (optional)…'
            value={overrideReason}
            onChange={e => setOverrideReason(e.target.value)}
            style={{ ...styles.notesInput, marginTop: '0.5rem' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button id={`${uid}-ov-cancel`} onClick={() => setShowOverride(false)} style={styles.cancelBtn}>
              Cancel Override
            </button>
          </div>
        </div>
      ) : null}

      {/* Summary row */}
      {(result.finalWidthInches !== null || result.finalHeightInches !== null) && (
        <div style={styles.summaryRow}>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Final Width</span>
            <span style={styles.summaryValue}>{result.displayFinalWidth}</span>
          </div>
          <div style={styles.summarySep}>×</div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Final Height</span>
            <span style={styles.summaryValue}>{result.displayFinalHeight}</span>
          </div>
        </div>
      )}

      {/* Error */}
      {saveError && <div style={styles.errorBox}>{saveError}</div>}

      {/* Action buttons */}
      <div style={styles.actions}>
        {!showOverride && (
          <button id={`${uid}-override`} onClick={() => setShowOverride(true)} style={styles.overrideToggleBtn}>
            ✏️ Override
          </button>
        )}
        <button
          id={`${uid}-accept`}
          onClick={handleAccept}
          disabled={saving || (result.finalWidthInches === null && result.finalHeightInches === null)}
          style={{
            ...styles.acceptBtn,
            ...(saving ? styles.acceptBtnDisabled : {}),
          }}
        >
          {saving ? '⏳ Saving…' : '✅ Accept Final Size'}
        </button>
        {onCancel && (
          <button id={`${uid}-cancel`} onClick={onCancel} style={styles.cancelBtn}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

// ── AxisSection sub-component ─────────────────────────────────────────────────

interface AxisSectionProps {
  uid: string;
  label: string;
  rows: PointRowConfig[];
  points: Record<MeasurePointKey, number | null>;
  sources: Record<MeasurePointKey, CaptureSource | null>;
  activePoint: MeasurePointKey;
  smallestPoint: string | null;
  smallestValue: number | null;
  finalValue: number | null;
  varianceInches: number | null;
  needsReview: boolean;
  displayDeduction: string;
  displayFinal: string;
  bleLastReading: number | null;
  bleConnected: boolean;
  bleSupported: boolean;
  manualInputValues: Partial<Record<MeasurePointKey, string>>;
  editingPoint: MeasurePointKey | null;
  onSetActive: (pt: MeasurePointKey) => void;
  onCaptureBle: (pt: MeasurePointKey) => void;
  onManualChange: (pt: MeasurePointKey, val: string) => void;
  onManualEdit: (pt: MeasurePointKey) => void;
  onManualApply: (pt: MeasurePointKey) => void;
  onClear: (pt: MeasurePointKey) => void;
}

function AxisSection({
  uid, label, rows, points, sources, activePoint,
  smallestPoint, smallestValue, finalValue,
  varianceInches, needsReview, displayDeduction, displayFinal,
  bleLastReading, bleConnected, bleSupported,
  manualInputValues, editingPoint,
  onSetActive, onCaptureBle, onManualChange, onManualEdit, onManualApply, onClear,
}: AxisSectionProps) {
  return (
    <div style={styles.axisSection}>
      <div style={styles.axisHeader}>{label}</div>
      <table style={styles.table}>
        <tbody>
          {rows.map(row => {
            const value = points[row.key];
            const source = sources[row.key];
            const isSmallest = row.key === smallestPoint;
            const isActive = activePoint === row.key;
            const isEditing = editingPoint === row.key;
            const manualVal = manualInputValues[row.key] ?? '';

            return (
              <tr
                key={row.key}
                id={`${uid}-row-${row.key}`}
                onClick={() => onSetActive(row.key)}
                style={{
                  ...styles.tableRow,
                  ...(isActive ? styles.tableRowActive : {}),
                  ...(isSmallest && value !== null ? styles.tableRowSmallest : {}),
                }}
              >
                {/* Label */}
                <td style={styles.tdLabel}>
                  {isActive && <span style={styles.activeDot}>▶</span>}
                  {row.label}
                </td>

                {/* Value display or manual input */}
                <td style={styles.tdValue}>
                  {isEditing ? (
                    <input
                      id={`${uid}-input-${row.key}`}
                      autoFocus
                      value={manualVal}
                      onChange={e => onManualChange(row.key, e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') onManualApply(row.key);
                        if (e.key === 'Escape') onManualEdit(null as unknown as MeasurePointKey);
                      }}
                      placeholder="e.g. 36 1/4"
                      style={styles.inlineInput}
                    />
                  ) : (
                    <span style={value !== null ? styles.capturedValue : styles.emptyValue}>
                      {fmtInches(value)}
                      {source && value !== null && (
                        <span style={styles.sourceTag}>
                          {source === 'bluetooth' ? ' 📡' : source === 'manual' ? ' ✏️' : ' 📷'}
                        </span>
                      )}
                      {isSmallest && value !== null && (
                        <span style={styles.smallestTag}> ◀ smallest</span>
                      )}
                    </span>
                  )}
                </td>

                {/* Action buttons */}
                <td style={styles.tdActions}>
                  {!isEditing && (
                    <>
                      {bleSupported && bleConnected && bleLastReading !== null && (
                        <button
                          id={`${uid}-ble-${row.key}`}
                          onClick={e => { e.stopPropagation(); onSetActive(row.key); onCaptureBle(row.key); }}
                          style={styles.captureBtn}
                          title={`Capture laser reading (${toFractionDisplay(bleLastReading)}") to ${row.label}`}
                        >
                          📡
                        </button>
                      )}
                      <button
                        id={`${uid}-manual-${row.key}`}
                        onClick={e => { e.stopPropagation(); onSetActive(row.key); onManualEdit(row.key); }}
                        style={styles.manualBtn}
                        title="Manual entry"
                      >
                        ✏️
                      </button>
                      {value !== null && (
                        <button
                          id={`${uid}-clear-${row.key}`}
                          onClick={e => { e.stopPropagation(); onClear(row.key); }}
                          style={styles.clearBtn}
                          title="Clear this reading"
                        >
                          ↩
                        </button>
                      )}
                    </>
                  )}
                  {isEditing && (
                    <>
                      <button
                        id={`${uid}-apply-${row.key}`}
                        onClick={e => { e.stopPropagation(); onManualApply(row.key); }}
                        style={styles.applyBtn}
                      >
                        ✓
                      </button>
                      <button
                        id={`${uid}-discard-${row.key}`}
                        onClick={e => { e.stopPropagation(); onManualEdit(null as unknown as MeasurePointKey); }}
                        style={styles.discardBtn}
                      >
                        ✕
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Axis result summary */}
      <div style={styles.axisSummary}>
        <span style={styles.axisSummaryItem}>
          Smallest: <strong>{fmtInches(smallestValue)}</strong>
        </span>
        <span style={styles.axisSummaryDivider}>→</span>
        <span style={styles.axisSummaryItem}>
          Rule: <strong>{displayDeduction}</strong>
        </span>
        <span style={styles.axisSummaryDivider}>→</span>
        <span style={{ ...styles.axisSummaryItem, color: finalValue !== null ? '#22c55e' : '#9ca3af' }}>
          Final: <strong>{displayFinal}</strong>
        </span>
        {needsReview && varianceInches !== null && (
          <span style={styles.variancePill}>
            ⚠️ ±{toFractionDisplay(varianceInches)}"
          </span>
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  panel: {
    background: 'rgba(15, 15, 25, 0.95)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: 16,
    padding: '1rem',
    color: '#f1f5f9',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '0.875rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.5rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  headerTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#a78bfa',
  },
  offlineBadge: {
    background: 'rgba(245,158,11,0.15)',
    color: '#fbbf24',
    border: '1px solid rgba(245,158,11,0.3)',
    borderRadius: 8,
    padding: '0.2rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  bleConnectBtn: {
    background: 'rgba(139,92,246,0.15)',
    color: '#a78bfa',
    border: '1px solid rgba(139,92,246,0.3)',
    borderRadius: 8,
    padding: '0.3rem 0.75rem',
    cursor: 'pointer',
    fontSize: '0.8125rem',
    fontWeight: 600,
    minHeight: 40,
  },
  bleConnectedBtn: {
    background: 'rgba(34,197,94,0.15)',
    color: '#4ade80',
    border: '1px solid rgba(34,197,94,0.35)',
    borderRadius: 8,
    padding: '0.3rem 0.75rem',
    cursor: 'pointer',
    fontSize: '0.8125rem',
    fontWeight: 600,
    minHeight: 40,
  },
  bleStatus: {
    color: '#fbbf24',
    fontSize: '0.8125rem',
    padding: '0.25rem 0.5rem',
    background: 'rgba(245,158,11,0.08)',
    borderRadius: 6,
  },
  bleReading: {
    color: '#a78bfa',
    fontSize: '0.8125rem',
    padding: '0.25rem 0.5rem',
    background: 'rgba(139,92,246,0.08)',
    borderRadius: 6,
  },
  bleUnavailable: {
    color: '#6b7280',
    fontSize: '0.8125rem',
    padding: '0.25rem 0.5rem',
    background: 'rgba(100,100,100,0.08)',
    borderRadius: 6,
  },
  axisSection: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    padding: '0.625rem',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  axisHeader: {
    fontWeight: 700,
    color: '#94a3b8',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '0.5rem',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableRow: {
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  tableRowActive: {
    background: 'rgba(139,92,246,0.1)',
  },
  tableRowSmallest: {
    background: 'rgba(34,197,94,0.06)',
  },
  tdLabel: {
    padding: '0.5rem 0.25rem',
    color: '#94a3b8',
    fontWeight: 500,
    width: '4.5rem',
    whiteSpace: 'nowrap',
  },
  tdValue: {
    padding: '0.5rem 0.25rem',
    fontVariantNumeric: 'tabular-nums',
  },
  tdActions: {
    padding: '0.5rem 0.25rem',
    display: 'flex',
    gap: '0.25rem',
    justifyContent: 'flex-end',
    whiteSpace: 'nowrap',
  },
  activeDot: {
    color: '#a78bfa',
    marginRight: '0.25rem',
    fontSize: '0.625rem',
  },
  capturedValue: {
    color: '#f1f5f9',
    fontWeight: 600,
    fontSize: '0.9375rem',
  },
  emptyValue: {
    color: '#475569',
    fontStyle: 'italic',
  },
  sourceTag: {
    fontSize: '0.75rem',
    opacity: 0.7,
  },
  smallestTag: {
    color: '#4ade80',
    fontSize: '0.6875rem',
    fontWeight: 700,
  },
  inlineInput: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(139,92,246,0.5)',
    borderRadius: 6,
    color: '#f1f5f9',
    padding: '0.25rem 0.5rem',
    fontSize: '0.9375rem',
    width: '7rem',
    outline: 'none',
  },
  captureBtn: {
    background: 'rgba(139,92,246,0.2)',
    border: '1px solid rgba(139,92,246,0.4)',
    borderRadius: 6,
    color: '#c4b5fd',
    cursor: 'pointer',
    padding: '0.25rem 0.5rem',
    fontSize: '0.8125rem',
    minHeight: 36,
    minWidth: 36,
  },
  manualBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '0.25rem 0.5rem',
    fontSize: '0.8125rem',
    minHeight: 36,
    minWidth: 36,
  },
  clearBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 6,
    color: '#64748b',
    cursor: 'pointer',
    padding: '0.25rem 0.5rem',
    fontSize: '0.8125rem',
    minHeight: 36,
    minWidth: 36,
  },
  applyBtn: {
    background: 'rgba(34,197,94,0.15)',
    border: '1px solid rgba(34,197,94,0.35)',
    borderRadius: 6,
    color: '#4ade80',
    cursor: 'pointer',
    padding: '0.25rem 0.5rem',
    fontSize: '0.8125rem',
    minHeight: 36,
    minWidth: 36,
  },
  discardBtn: {
    background: 'transparent',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 6,
    color: '#f87171',
    cursor: 'pointer',
    padding: '0.25rem 0.5rem',
    fontSize: '0.8125rem',
    minHeight: 36,
    minWidth: 36,
  },
  axisSummary: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: '0.5rem',
    paddingTop: '0.5rem',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    fontSize: '0.8125rem',
  },
  axisSummaryItem: {
    color: '#94a3b8',
  },
  axisSummaryDivider: {
    color: '#475569',
  },
  variancePill: {
    background: 'rgba(245,158,11,0.15)',
    color: '#fbbf24',
    borderRadius: 999,
    padding: '0.125rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  warningBox: {
    background: 'rgba(245,158,11,0.1)',
    border: '1px solid rgba(245,158,11,0.3)',
    borderRadius: 10,
    padding: '0.75rem',
    color: '#fbbf24',
    fontSize: '0.8125rem',
    lineHeight: 1.5,
  },
  obstructionSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  sectionLabel: {
    color: '#64748b',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  obstructionButtons: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.375rem',
  },
  obstructionBtn: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '0.375rem 0.625rem',
    fontSize: '0.8125rem',
    minHeight: 40,
    transition: 'all 0.15s',
  },
  obstructionBtnActive: {
    background: 'rgba(139,92,246,0.2)',
    border: '1px solid rgba(139,92,246,0.5)',
    color: '#c4b5fd',
  },
  notesInput: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: '#f1f5f9',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
  },
  overrideBox: {
    background: 'rgba(245,158,11,0.06)',
    border: '1px solid rgba(245,158,11,0.2)',
    borderRadius: 10,
    padding: '0.75rem',
  },
  overrideField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  overrideLabel: {
    color: '#94a3b8',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  overrideInput: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(245,158,11,0.35)',
    borderRadius: 6,
    color: '#f1f5f9',
    padding: '0.4rem 0.6rem',
    fontSize: '0.9375rem',
    width: '8rem',
    outline: 'none',
  },
  summaryRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    background: 'rgba(34,197,94,0.06)',
    border: '1px solid rgba(34,197,94,0.2)',
    borderRadius: 12,
    padding: '0.75rem 1rem',
    justifyContent: 'center',
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.125rem',
  },
  summaryLabel: {
    color: '#6b7280',
    fontSize: '0.6875rem',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
  },
  summaryValue: {
    color: '#4ade80',
    fontSize: '1.25rem',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
  },
  summarySep: {
    color: '#374151',
    fontSize: '1.25rem',
  },
  errorBox: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 8,
    color: '#fca5a5',
    padding: '0.5rem 0.75rem',
    fontSize: '0.8125rem',
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  acceptBtn: {
    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
    border: 'none',
    borderRadius: 10,
    color: '#fff',
    cursor: 'pointer',
    padding: '0.625rem 1.25rem',
    fontSize: '0.9375rem',
    fontWeight: 700,
    minHeight: 44,
    flex: 1,
    minWidth: 160,
    transition: 'opacity 0.2s',
  },
  acceptBtnDisabled: {
    opacity: 0.45,
    cursor: 'not-allowed',
  },
  overrideToggleBtn: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '0.5rem 0.875rem',
    fontSize: '0.875rem',
    minHeight: 44,
  },
  cancelBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    color: '#64748b',
    cursor: 'pointer',
    padding: '0.5rem 0.875rem',
    fontSize: '0.875rem',
    minHeight: 44,
  },
};
