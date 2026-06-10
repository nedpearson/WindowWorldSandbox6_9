import React, { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../utils/api';
import { detectDeviceCapability, type CaptureMode } from '../lib/laserMeasure/deviceCapability';
import {
  normalizeLaserMeasurement,
  detectSuspiciousMeasurement,
  toFractionDisplay,
} from '../lib/laserMeasure/normalizeLaserMeasurement';
import { useBluetoothLaser, type LaserConnectionStatus } from '../lib/laserMeasure/useBluetoothLaser';
import { enqueueOutboxItem } from '../lib/syncEngine';
import { saveOfflineLaserCapture, getOrCreateDeviceId, detectPlatformType } from '../lib/offlineDb';
import { useAuthStore } from '../store';

/**
 * LaserCapturePanel
 *
 * Compact laser measurement capture UI for the field app measurement workflow.
 * Supports:
 *   - Manual laser entry (primary — all devices)
 *   - Experimental BLE (Chrome/Android only, optional, clear disclaimer)
 *   - MeasureOn paste/import (all devices)
 *
 * The Bosch GLM165-27G does NOT support Bluetooth HID keyboard mode.
 * iPhone/iPad do not support Web Bluetooth.
 * See docs/bosch-glm165-27g-bluetooth-research.md for full device research.
 *
 * Usage:
 *   <LaserCapturePanel
 *     appointmentId={appt.id}
 *     openingId={opening?.id}
 *     openingNumber={opening?.openingNumber}
 *     defaultTargetField="width"
 *     currentWidth={opening?.width}
 *     currentHeight={opening?.height}
 *     onMeasurementApplied={(field, inches, adjustedInches) => { ... }}
 *   />
 */

export type TargetField =
  | 'width' | 'height' | 'leg_height'
  | 'top_sash_width' | 'top_sash_height'
  | 'return_depth' | 'sill_depth'
  | 'door_width' | 'door_height'
  | 'siding_length' | 'custom';

interface Props {
  appointmentId: string;
  openingId?: string;
  openingNumber?: number;
  defaultTargetField?: TargetField;
  currentWidth?: number;
  currentHeight?: number;
  ruleApplied?: string;
  deductionInches?: number;
  onMeasurementApplied?: (field: TargetField, normalizedInches: number, adjustedInches: number | null, captureId: string) => void;
  onClose?: () => void;
  compact?: boolean;
}

const TARGET_FIELD_LABELS: Record<TargetField, string> = {
  width: 'Width',
  height: 'Height',
  leg_height: 'Leg Height',
  top_sash_width: 'Top Sash Width',
  top_sash_height: 'Top Sash Height',
  return_depth: 'Return Depth',
  sill_depth: 'Sill Depth',
  door_width: 'Door Width',
  door_height: 'Door Height',
  siding_length: 'Siding / Elevation Length',
  custom: 'Custom Field',
};

const MEASUREMENT_TIPS: Record<TargetField, string> = {
  width: 'Measure from jamb to jamb, inside the frame.',
  height: 'Measure from sill to head jamb inside the frame.',
  leg_height: 'Measure from the slant cut down to the bottom of the frame.',
  top_sash_width: 'Width of the fixed upper sash (for oriel windows).',
  top_sash_height: 'Height from the top of the meeting rail to top of sash.',
  return_depth: 'Depth from the front face of the frame to the wall surface.',
  sill_depth: 'Depth from the inside edge of the sill to the glass.',
  door_width: 'Measure the rough opening width.',
  door_height: 'Measure from finished floor to top of rough opening.',
  siding_length: 'Total elevation length for siding estimate.',
  custom: 'Enter the measurement for a custom field.',
};

// Status badge color for BLE connection
const BLE_STATUS_COLORS: Record<LaserConnectionStatus, string> = {
  unsupported: '#64748b',
  idle: '#64748b',
  connecting: '#f59e0b',
  connected: '#22c55e',
  disconnected: '#94a3b8',
  error: '#ef4444',
};

const BLE_STATUS_LABELS: Record<LaserConnectionStatus, string> = {
  unsupported: 'Not supported',
  idle: 'Not connected',
  connecting: 'Connecting…',
  connected: 'Connected',
  disconnected: 'Disconnected',
  error: 'Connection error',
};

interface CaptureState {
  mode: 'manual' | 'ble' | 'measureon';
  targetField: TargetField;
  inputText: string;
  parsed: ReturnType<typeof normalizeLaserMeasurement> | null;
  suspicionFlags: string[];
  captureHistory: Array<{
    field: TargetField;
    raw: string;
    normalized: string;
    adjusted: string;
    ruleApplied: string;
    captureId: string;
    timestamp: string;
    mode: string;
  }>;
  saving: boolean;
  error: string | null;
  lastCaptureId: string | null;
  bleStatus: string | null;
  showImportArea: boolean;
  importText: string;
  offlinePending: boolean;
}

export function LaserCapturePanel({
  appointmentId,
  openingId,
  openingNumber,
  defaultTargetField = 'width',
  currentWidth,
  currentHeight,
  ruleApplied,
  deductionInches,
  onMeasurementApplied,
  onClose,
  compact = false,
}: Props) {
  const capability = detectDeviceCapability();
  const inputRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuthStore();

  // BLE hook
  const laser = useBluetoothLaser();

  const [state, setState] = useState<CaptureState>({
    mode: 'manual',
    targetField: defaultTargetField,
    inputText: '',
    parsed: null,
    suspicionFlags: [],
    captureHistory: [],
    saving: false,
    error: null,
    lastCaptureId: null,
    bleStatus: null,
    showImportArea: false,
    importText: '',
    offlinePending: false,
  });

  const upd = (patch: Partial<CaptureState>) => setState(s => ({ ...s, ...patch }));

  // When a BLE reading arrives, populate the input text automatically
  useEffect(() => {
    if (laser.lastReading && laser.lastReading.normalized.valid) {
      const text = laser.lastReading.normalized.rawValueText;
      handleInputChange(text);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [laser.lastReading]);

  // Parse input as user types
  const handleInputChange = useCallback((val: string) => {
    const parsed = val.trim() ? normalizeLaserMeasurement(val) : null;
    let suspicionFlags: string[] = [];
    if (parsed?.valid) {
      const prev = state.targetField === 'width' ? currentWidth
        : state.targetField === 'height' ? currentHeight : undefined;
      suspicionFlags = detectSuspiciousMeasurement(parsed.normalizedInches, state.targetField, prev);
    }
    upd({ inputText: val, parsed, suspicionFlags });
  }, [state.targetField, currentWidth, currentHeight]);

  // Handle Enter key in the input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && state.parsed?.valid && !state.saving) {
      handleApply();
    }
  };

  // Calculate adjusted/order measurement
  const getAdjustedInches = (normalized: number): number | null => {
    if (deductionInches && deductionInches > 0 &&
        (state.targetField === 'width' || state.targetField === 'height')) {
      return normalized - deductionInches;
    }
    return null;
  };

  const handleApply = async () => {
    if (!state.parsed?.valid || state.saving) return;
    upd({ saving: true, error: null });

    try {
      const normalized = state.parsed.normalizedInches;
      const adjusted = getAdjustedInches(normalized);
      const adjustedFraction = adjusted != null ? toFractionDisplay(adjusted) : null;
      const captureMode = state.mode === 'ble' ? 'bluetooth_ble'
        : state.mode === 'measureon' ? 'measureon_import' : 'manual';

      const body = {
        appointmentId,
        openingId: openingId || null,
        rawValueText: state.inputText.trim(),
        rawUnit: state.parsed.rawUnit,
        normalizedInches: normalized,
        normalizedFractionText: state.parsed.normalizedFractionText,
        assignedField: state.targetField,
        captureMode,
        deviceModel: 'GLM165-27G',
        deviceName: laser.deviceName || null,
        ruleApplied: ruleApplied || null,
        deductionInches: deductionInches || null,
        adjustedOrderInches: adjusted,
        adjustedOrderFractionText: adjustedFraction,
        confidence: state.parsed.parseConfidence,
        isSuspicious: state.suspicionFlags.length > 0,
        suspicionReasons: state.suspicionFlags,
      };

      let captureId: string;
      const isOnline = navigator.onLine;

      if (isOnline) {
        // Online path: save directly to server
        const saved = await api.saveLaserCapture(body);
        captureId = saved.id;
        upd({ offlinePending: false });
      } else {
        // Offline path: save to Dexie + queue for sync
        const localId = `laser_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const deviceId = getOrCreateDeviceId();
        const companyId = user?.companyId || 'company_pending';
        const userId = user?.id || 'user_pending';

        await saveOfflineLaserCapture({
          localId,
          appointmentId,
          openingId,
          assignedField: state.targetField,
          rawValueText: state.inputText.trim(),
          rawUnit: state.parsed.rawUnit,
          normalizedInches: normalized,
          normalizedFractionText: state.parsed.normalizedFractionText,
          adjustedOrderInches: adjusted ?? undefined,
          adjustedOrderFractionText: adjustedFraction ?? undefined,
          deductionInches: deductionInches || undefined,
          ruleApplied: ruleApplied || undefined,
          captureMode,
          deviceModel: 'GLM165-27G',
          deviceName: laser.deviceName ?? undefined,
          confidence: state.parsed.parseConfidence,
          isSuspicious: state.suspicionFlags.length > 0,
          suspicionReasons: state.suspicionFlags,
        });

        await enqueueOutboxItem({
          companyId,
          userId,
          entityType: 'laser_capture',
          entityLocalId: localId,
          appointmentId,
          operation: 'create',
          payload: {
            ...body,
            localId,
            companyId,
            userId,
            deviceId,
          },
        });

        captureId = localId;
        upd({ offlinePending: true });
      }

      const historyEntry = {
        field: state.targetField,
        raw: state.inputText.trim(),
        normalized: state.parsed.normalizedFractionText || `${normalized.toFixed(2)}"`,
        adjusted: adjusted != null ? `${toFractionDisplay(adjusted)}"` : '—',
        ruleApplied: ruleApplied || 'None',
        captureId,
        timestamp: new Date().toLocaleTimeString(),
        mode: state.mode,
      };

      upd({
        saving: false,
        lastCaptureId: captureId,
        inputText: '',
        parsed: null,
        suspicionFlags: [],
        captureHistory: [historyEntry, ...state.captureHistory].slice(0, 20),
      });

      laser.clearLastReading();
      onMeasurementApplied?.(state.targetField, normalized, adjusted, captureId);
    } catch (err: any) {
      upd({ saving: false, error: `Save failed: ${err.message || 'Unknown error'}` });
    }
  };

  // Parse MeasureOn import (list of measurements, one per line)
  const handleImport = () => {
    const lines = state.importText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    // Use the first line as the measurement input
    const firstLine = lines[0];
    upd({ showImportArea: false, inputText: firstLine, mode: 'measureon' });
    handleInputChange(firstLine);
  };

  const modeColor: Record<string, string> = {
    manual: '#6366f1',
    ble: '#0ea5e9',
    measureon: '#22c55e',
  };

  const activeModeColor = modeColor[state.mode] || '#6366f1';
  const bleColor = BLE_STATUS_COLORS[laser.status];

  return (
    <div
      id={`laser-panel-${openingNumber ?? 'global'}`}
      style={{
        background: 'rgba(30,30,50,0.97)',
        border: `1px solid ${activeModeColor}55`,
        borderRadius: 12,
        padding: compact ? '0.75rem' : '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
        fontFamily: 'inherit',
        maxWidth: '100%',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={activeModeColor} strokeWidth="2">
            <path d="M2 12h20M12 2v20M7 7l10 10M17 7L7 17"/>
          </svg>
          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
            Laser Measure
          </span>
          {openingNumber != null && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 2 }}>
              — Opening #{openingNumber}
            </span>
          )}
          {state.offlinePending && (
            <span style={{ fontSize: '0.68rem', color: '#f59e0b', marginLeft: 4 }}>
              ⏳ Pending sync
            </span>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>×</button>
        )}
      </div>

      {/* Mode selector */}
      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
        {(['manual', 'ble', 'measureon'] as const).map(m => {
          const labels = { manual: 'Manual Entry', ble: 'BLE (Experimental)', measureon: 'MeasureOn Import' };
          const disabled = m === 'ble' && !capability.webBluetoothSupported;
          const active = state.mode === m;
          return (
            <button
              key={m}
              id={`laser-mode-${m}-${openingNumber ?? 'g'}`}
              disabled={disabled}
              onClick={() => {
                upd({ mode: m, showImportArea: m === 'measureon' });
                if (m !== 'measureon') setTimeout(() => inputRef.current?.focus(), 50);
              }}
              style={{
                padding: '0.3rem 0.65rem',
                borderRadius: 6,
                fontSize: '0.72rem',
                fontWeight: active ? 700 : 500,
                background: active ? modeColor[m] : 'rgba(255,255,255,0.06)',
                color: disabled ? 'rgba(255,255,255,0.3)' : active ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${active ? modeColor[m] : 'rgba(255,255,255,0.1)'}`,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
              }}
            >
              {labels[m]}
            </button>
          );
        })}
      </div>

      {/* iOS/unsupported BLE warning */}
      {!capability.webBluetoothSupported && state.mode === 'ble' && (
        <div style={{ fontSize: '0.73rem', color: '#f97316', padding: '0.4rem 0.6rem', background: 'rgba(249,115,22,0.08)', borderRadius: 6 }}>
          ⚠ Web Bluetooth is not available on this device. Use Manual Entry or MeasureOn Import.
        </div>
      )}

      {/* BLE connection panel — shown only in BLE mode on supported devices */}
      {state.mode === 'ble' && capability.webBluetoothSupported && (
        <div style={{ background: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.2)', borderRadius: 8, padding: '0.6rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          {/* Status row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                background: bleColor, flexShrink: 0,
                boxShadow: laser.status === 'connected' ? `0 0 6px ${bleColor}` : 'none',
              }} />
              <span style={{ fontSize: '0.75rem', color: bleColor, fontWeight: 600 }}>
                {BLE_STATUS_LABELS[laser.status]}
              </span>
              {laser.deviceName && (
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>— {laser.deviceName}</span>
              )}
            </div>

            {/* Connect / Disconnect button */}
            {laser.status === 'idle' || laser.status === 'disconnected' || laser.status === 'error' ? (
              <button
                id={`laser-ble-connect-${openingNumber ?? 'g'}`}
                onClick={() => laser.connect()}
                style={{
                  padding: '0.3rem 0.75rem', background: '#0ea5e9', color: '#fff',
                  border: 'none', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                🔗 Connect Laser
              </button>
            ) : laser.status === 'connecting' ? (
              <span style={{ fontSize: '0.73rem', color: '#f59e0b' }}>Connecting… (select device in popup)</span>
            ) : laser.status === 'connected' ? (
              <button
                id={`laser-ble-disconnect-${openingNumber ?? 'g'}`}
                onClick={() => laser.disconnect()}
                style={{
                  padding: '0.3rem 0.75rem', background: 'rgba(239,68,68,0.15)', color: '#f87171',
                  border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, fontSize: '0.73rem',
                  cursor: 'pointer',
                }}
              >
                Disconnect
              </button>
            ) : null}
          </div>

          {/* Pairing instructions when idle/error */}
          {(laser.status === 'idle' || laser.status === 'disconnected') && (
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', lineHeight: 1.5 }}>
              1. Hold the Bluetooth button on the laser until LED flashes.&nbsp;
              2. Tap <strong style={{ color: '#38bdf8' }}>Connect Laser</strong> above.&nbsp;
              3. Select your Bosch device from the popup.
            </div>
          )}

          {/* Error message */}
          {laser.errorMessage && (
            <div style={{ fontSize: '0.7rem', color: '#fca5a5', lineHeight: 1.4 }}>
              ⚠ {laser.errorMessage}
            </div>
          )}

          {/* Diagnostic mode warning */}
          {laser.isDiagnosticMode && (
            <div style={{ fontSize: '0.7rem', color: '#f59e0b', lineHeight: 1.4 }}>
              ℹ Connected in diagnostic mode — measurements cannot be auto-decoded. Type the value you see on the laser display into the field below.
            </div>
          )}

          {/* Last BLE reading indicator */}
          {laser.lastReading && (
            <div style={{ fontSize: '0.72rem', background: 'rgba(14,165,233,0.1)', borderRadius: 5, padding: '0.3rem 0.5rem', color: '#38bdf8' }}>
              📡 Last reading: <strong>{laser.lastReading.normalized.normalizedFractionText || laser.lastReading.rawText}"</strong>
              {laser.lastReading.isSpeculative && <span style={{ color: '#f59e0b' }}> (speculative — verify)</span>}
              → populated in input below
            </div>
          )}

          {/* Disclaimer */}
          <div style={{ fontSize: '0.65rem', color: '#64748b', lineHeight: 1.4 }}>
            <strong style={{ color: '#475569' }}>Experimental BLE:</strong> Bosch protocol is not officially documented. Community-derived UUIDs only. Manual entry is the primary workflow.
          </div>
        </div>
      )}

      {/* Target field selector */}
      <div>
        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
          Assign measurement to:
        </label>
        <select
          id={`laser-target-field-${openingNumber ?? 'g'}`}
          value={state.targetField}
          onChange={e => upd({ targetField: e.target.value as TargetField })}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6,
            padding: '0.35rem 0.5rem',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
          }}
        >
          {(Object.entries(TARGET_FIELD_LABELS) as [TargetField, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem', lineHeight: 1.4 }}>
          {MEASUREMENT_TIPS[state.targetField]}
        </div>
      </div>

      {/* MeasureOn import area */}
      {state.showImportArea && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Paste measurements from Bosch MeasureOn (one per line):
          </label>
          <textarea
            ref={importRef}
            value={state.importText}
            onChange={e => upd({ importText: e.target.value })}
            rows={4}
            placeholder={"36 1/4\n48 1/2\n3ft 2 1/4in"}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6,
              padding: '0.4rem 0.5rem', color: 'var(--text-primary)',
              fontSize: '0.82rem', fontFamily: 'monospace', resize: 'vertical',
            }}
          />
          <button
            id={`laser-import-apply-${openingNumber ?? 'g'}`}
            onClick={handleImport}
            disabled={!state.importText.trim()}
            style={{
              alignSelf: 'flex-start', padding: '0.35rem 0.8rem',
              background: '#22c55e', color: '#fff', border: 'none',
              borderRadius: 6, fontSize: '0.78rem', fontWeight: 700,
              cursor: state.importText.trim() ? 'pointer' : 'not-allowed',
              opacity: state.importText.trim() ? 1 : 0.5,
            }}
          >
            Use First Value →
          </button>
        </div>
      )}

      {/* Manual / BLE capture input */}
      {!state.showImportArea && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {state.mode === 'ble'
              ? laser.status === 'connected'
                ? 'Press the measurement button on the laser. Reading will appear here automatically:'
                : 'BLE not connected — or type measurement manually:'
              : 'Enter measurement (e.g., 36 1/4 or 3ft 0 1/4in or 914mm):'}
          </label>
          <input
            ref={inputRef}
            id={`laser-input-${openingNumber ?? 'g'}`}
            type="text"
            inputMode="decimal"
            value={state.inputText}
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="36 1/4"
            autoComplete="off"
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.08)',
              border: `1px solid ${state.parsed?.valid ? activeModeColor + '88' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: 6,
              padding: '0.5rem 0.6rem',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              fontFamily: 'monospace',
              outline: 'none',
            }}
          />

          {/* Parsed result preview */}
          {state.parsed?.valid && (
            <div style={{
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 6, padding: '0.5rem 0.65rem',
              display: 'flex', flexDirection: 'column', gap: '0.15rem',
            }}>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>ACTUAL</span><br/>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {state.parsed.normalizedFractionText}"
                  </span>
                </div>
                {(() => {
                  const adj = getAdjustedInches(state.parsed.normalizedInches);
                  if (adj == null) return null;
                  return (
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>ORDER ({ruleApplied || 'adjusted'})</span><br/>
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: '#22c55e' }}>
                        {toFractionDisplay(adj)}"
                      </span>
                      {deductionInches && (
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                          (-{toFractionDisplay(deductionInches)}")
                        </span>
                      )}
                    </div>
                  );
                })()}
                <div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>PARSED AS</span><br/>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{state.parsed.rawUnit}</span>
                </div>
              </div>
              {state.parsed.warnings.length > 0 && (
                <div style={{ fontSize: '0.68rem', color: '#f97316', marginTop: '0.15rem' }}>
                  ⚠ {state.parsed.warnings.join(' | ')}
                </div>
              )}
            </div>
          )}

          {/* Suspicion flags */}
          {state.suspicionFlags.length > 0 && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '0.4rem 0.65rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f87171', marginBottom: '0.2rem' }}>
                ⚠ Suspicious measurement — please confirm:
              </div>
              {state.suspicionFlags.map((f, i) => (
                <div key={i} style={{ fontSize: '0.68rem', color: '#fca5a5' }}>• {f}</div>
              ))}
            </div>
          )}

          {state.error && (
            <div style={{ fontSize: '0.72rem', color: '#ef4444' }}>{state.error}</div>
          )}

          {/* Apply button */}
          <button
            id={`laser-apply-${openingNumber ?? 'g'}`}
            onClick={handleApply}
            disabled={!state.parsed?.valid || state.saving}
            style={{
              padding: '0.5rem 1.2rem',
              background: state.parsed?.valid && !state.saving ? activeModeColor : 'rgba(255,255,255,0.08)',
              color: state.parsed?.valid ? '#fff' : 'rgba(255,255,255,0.3)',
              border: 'none',
              borderRadius: 7,
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: state.parsed?.valid && !state.saving ? 'pointer' : 'not-allowed',
              alignSelf: 'flex-start',
              transition: 'all 0.15s',
            }}
          >
            {state.saving
              ? 'Saving…'
              : `Use ${state.parsed?.valid ? state.parsed.normalizedFractionText + '" ' : ''}for ${TARGET_FIELD_LABELS[state.targetField]}`}
          </button>
        </div>
      )}

      {/* Capture history */}
      {state.captureHistory.length > 0 && (
        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>
            CAPTURE HISTORY (this session)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', maxHeight: 140, overflowY: 'auto' }}>
            {state.captureHistory.map((h, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap',
                fontSize: '0.7rem', padding: '0.2rem 0.4rem',
                background: i === 0 ? 'rgba(99,102,241,0.07)' : 'transparent',
                borderRadius: 4,
              }}>
                <span style={{ color: activeModeColor, fontWeight: 700 }}>#{state.captureHistory.length - i}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{TARGET_FIELD_LABELS[h.field]}</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{h.normalized}"</span>
                {h.adjusted !== '—' && (
                  <span style={{ color: '#22c55e' }}>→ {h.adjusted} (order)</span>
                )}
                <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>{h.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Device notes */}
      {!compact && (
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '0.4rem' }}>
          <strong>Bosch GLM165-27G tips:</strong> Hold the Rounding button 3s to set units.
          Use Fractional Inches (36 1/4") for window work. 1/16" or 1/8" precision recommended.
          HID keyboard mode is not supported — type measurements here.
          {!capability.webBluetoothSupported && (
            <span> This device/browser does not support Web Bluetooth — Manual Entry is the correct workflow.</span>
          )}
        </div>
      )}
    </div>
  );
}
