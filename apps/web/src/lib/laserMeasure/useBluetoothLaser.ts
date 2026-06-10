/**
 * useBluetoothLaser.ts
 *
 * React hook for managing a Bosch GLM165-27G BLE connection in the field app.
 *
 * Wraps the low-level `bluetoothLaserClient.ts` into a React-friendly API
 * that tracks connection state, device name, and the last received reading.
 *
 * Safety guarantees:
 *   - Never crashes or blocks if Web Bluetooth is unavailable.
 *   - Connection only begins on explicit user gesture (calling connect()).
 *   - All readings arrive as strings — the panel must confirm before applying.
 *   - Automatically updates status on disconnect.
 *
 * Platform notes:
 *   - Chrome/Edge desktop + Android Chrome: full BLE support
 *   - iPhone/iPad: NOT supported (Safari WebKit restriction)
 *   - Firefox: NOT supported
 *   - When unsupported, status is 'unsupported' and connect() is a no-op.
 *
 * Usage:
 *   const laser = useBluetoothLaser();
 *   <button onClick={laser.connect}>Connect Laser</button>
 *   {laser.status === 'connected' && <span>{laser.deviceName}</span>}
 *   {laser.lastReading && <input value={laser.lastReading.displayText} />}
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  connectBoschGlm,
  disconnectBoschGlm,
  isConnected,
  type BluetoothConnectionState,
} from './bluetoothLaserClient';
import { normalizeLaserMeasurement, type NormalizedMeasurement } from './normalizeLaserMeasurement';
import { detectDeviceCapability } from './deviceCapability';

// ── Types ─────────────────────────────────────────────────────────────────────

export type LaserConnectionStatus =
  | 'unsupported'
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

export interface LaserReading {
  /** Raw text as received from device or decoded from BLE payload */
  rawText: string;
  /** Parsed/normalized measurement */
  normalized: NormalizedMeasurement;
  /** Whether the decode is speculative (from binary payload) */
  isSpeculative: boolean;
  /** Timestamp when received */
  receivedAt: number;
}

export interface UseBluetoothLaserResult {
  /** Current connection status */
  status: LaserConnectionStatus;
  /** Name of the connected device, or null */
  deviceName: string | null;
  /** Last received BLE reading (null until a reading arrives) */
  lastReading: LaserReading | null;
  /** Error message when status === 'error', or reason for unsupported */
  errorMessage: string | null;
  /** Whether the current device/browser supports Web Bluetooth */
  isSupported: boolean;
  /** Whether the device is running in diagnostic mode (connected but can't decode) */
  isDiagnosticMode: boolean;
  /** Raw diagnostic text from last BLE payload (for the debug inspector) */
  lastDiagnosticText: string | null;
  /** Connect to the Bosch GLM device (must be called from user gesture) */
  connect: (allowAllDevices?: boolean) => Promise<void>;
  /** Disconnect from the current device */
  disconnect: () => Promise<void>;
  /** Clear the last reading */
  clearLastReading: () => void;
}

// ── Hook implementation ───────────────────────────────────────────────────────

export function useBluetoothLaser(): UseBluetoothLaserResult {
  const capability = detectDeviceCapability();
  const isSupported = capability.webBluetoothSupported;

  const [status, setStatus] = useState<LaserConnectionStatus>(
    isSupported ? 'idle' : 'unsupported'
  );
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    isSupported ? null : (capability.warnings[0] ?? 'Web Bluetooth is not supported on this device.')
  );
  const [isDiagnosticMode, setIsDiagnosticMode] = useState(false);
  const [lastReading, setLastReading] = useState<LaserReading | null>(null);
  const [lastDiagnosticText, setLastDiagnosticText] = useState<string | null>(null);

  // Track if we're still mounted to avoid state updates after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const safeSet = <T>(setter: React.Dispatch<React.SetStateAction<T>>) =>
    (val: T) => { if (mountedRef.current) setter(val); };

  const connect = useCallback(async (allowAllDevices = false): Promise<void> => {
    if (!isSupported) return;
    if (status === 'connecting' || status === 'connected') return;

    safeSet(setStatus)('connecting');
    safeSet(setErrorMessage)(null);

    await connectBoschGlm(
      {
        onStateChange: (state: BluetoothConnectionState) => {
          if (!mountedRef.current) return;
          switch (state.status) {
            case 'unsupported':
              setStatus('unsupported');
              setErrorMessage(state.errorMessage);
              break;
            case 'connecting':
              setStatus('connecting');
              break;
            case 'connected':
              setStatus('connected');
              setDeviceName(state.deviceName);
              setIsDiagnosticMode(state.diagnosticMode);
              if (state.errorMessage) setErrorMessage(state.errorMessage);
              break;
            case 'error':
              setStatus('error');
              setErrorMessage(state.errorMessage);
              break;
            case 'idle':
              if (!isConnected()) {
                setStatus(prev => prev === 'connecting' ? 'idle' : prev);
              }
              if (state.errorMessage) setErrorMessage(state.errorMessage);
              break;
          }
        },

        onRawPayload: (payload: Uint8Array, diagnosticText: string) => {
          if (!mountedRef.current) return;
          setLastDiagnosticText(diagnosticText);

          // Extract the measurement value if we can
          // The diagnostic text looks like: "Raw: 0xC055... | Speculative: ~36.25 in (speculative decode — verify)"
          // Or just: "Raw binary payload: 0x... (cannot decode — use manual entry)"
          const speculativeMatch = diagnosticText.match(/Speculative:\s*(~?[\d.]+)\s*in/);
          const isSpeculative = speculativeMatch !== null;

          let rawText: string;
          let normalized: NormalizedMeasurement;

          if (speculativeMatch) {
            // Parse the speculative decimal value
            const rawValue = speculativeMatch[1].replace('~', '');
            rawText = `${rawValue} in`;
            normalized = normalizeLaserMeasurement(rawText);
          } else {
            // Cannot decode — use hex as raw text; user must type it manually
            rawText = diagnosticText;
            normalized = {
              rawValueText: rawText,
              rawUnit: 'unknown',
              normalizedInches: 0,
              normalizedFractionText: '',
              parseConfidence: 0,
              warnings: ['BLE payload could not be decoded — please type the measurement manually'],
              valid: false,
            };
          }

          setLastReading({
            rawText,
            normalized,
            isSpeculative,
            receivedAt: Date.now(),
          });
        },

        onDisconnect: () => {
          if (!mountedRef.current) return;
          setStatus('disconnected');
          setDeviceName(null);
          setIsDiagnosticMode(false);
        },
      },
      allowAllDevices,
    );
  }, [isSupported, status]);

  const disconnect = useCallback(async (): Promise<void> => {
    await disconnectBoschGlm();
    if (mountedRef.current) {
      setStatus('idle');
      setDeviceName(null);
      setIsDiagnosticMode(false);
      setLastReading(null);
    }
  }, []);

  const clearLastReading = useCallback(() => {
    if (mountedRef.current) setLastReading(null);
  }, []);

  return {
    status,
    deviceName,
    lastReading,
    errorMessage,
    isSupported,
    isDiagnosticMode,
    lastDiagnosticText,
    connect,
    disconnect,
    clearLastReading,
  };
}
