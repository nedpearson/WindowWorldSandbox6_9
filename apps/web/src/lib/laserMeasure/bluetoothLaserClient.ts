/**
 * bluetoothLaserClient.ts
 *
 * Experimental Web Bluetooth BLE client for Bosch GLM165-27G.
 *
 * IMPORTANT DISCLAIMERS:
 * - The Bosch BLE protocol is PROPRIETARY and NOT officially documented.
 * - The UUIDs and handshake bytes below are community-derived (not Bosch-official).
 * - They may NOT work for the GLM165-27G specifically.
 * - Web Bluetooth is NOT supported on iPhone/iPad (WebKit restriction, May 2026).
 * - This implementation NEVER auto-saves measurements — always requires user confirmation.
 * - If connection/handshake fails, gracefully falls back to manual entry.
 *
 * Research source: docs/bosch-glm165-27g-bluetooth-research.md
 */

import { boschGlm16527gProfile } from './deviceProfiles/boschGlm16527g';

export interface BluetoothConnectionState {
  status: 'idle' | 'connecting' | 'connected' | 'error' | 'unsupported';
  deviceName: string | null;
  errorMessage: string | null;
  lastRawPayload: Uint8Array | null;
  lastRawText: string | null;
  diagnosticMode: boolean;
}

export interface BluetoothLaserCallbacks {
  onStateChange: (state: BluetoothConnectionState) => void;
  onRawPayload: (payload: Uint8Array, diagnosticText: string) => void;
  onDisconnect: () => void;
}

let gattServer: BluetoothRemoteGATTServer | null = null;
let currentDevice: BluetoothDevice | null = null;
let characteristic: BluetoothRemoteGATTCharacteristic | null = null;

function hexToUint8Array(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, '');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes;
}

function uint8ArrayToHex(arr: Uint8Array): string {
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join(' ');
}

/**
 * Try to interpret a binary BLE payload as a measurement value.
 * This is EXPERIMENTAL — the actual decode algorithm for GLM165-27G is not documented.
 * Returns null if decoding is not possible.
 */
function tryDecodeBinaryPayload(data: Uint8Array): string | null {
  // The community-reported packet structure for Bosch GLM series:
  //   Byte 0: 0xC0 (header)
  //   Byte 1: 0x55 (header)
  //   Bytes 2-5: measurement value (little-endian, unit unclear)
  //   Remaining: status bytes
  //
  // This is NOT verified for GLM165-27G. Return null to stay safe.
  if (data.length >= 6 && data[0] === 0xC0 && data[1] === 0x55) {
    // Attempt: interpret bytes 2-5 as a little-endian int32 in mm
    const rawMm = data[2] | (data[3] << 8) | (data[4] << 16) | (data[5] << 24);
    if (rawMm > 0 && rawMm < 60000) { // 0-60m range
      const mm = rawMm / 10; // speculation — not confirmed
      const inches = mm * 0.0393701;
      // Mark as LOW confidence — this decode is speculative
      return `~${inches.toFixed(2)} in (speculative decode — verify)`;
    }
  }
  return null;
}

/**
 * Connect to a Bosch GLM165-27G via Web Bluetooth (experimental).
 * Requires desktop Chrome or Android Chrome.
 * Falls back gracefully if unsupported or connection fails.
 */
export async function connectBoschGlm(
  callbacks: BluetoothLaserCallbacks,
  allowAllDevices = false,
): Promise<void> {
  const setState = (s: Partial<BluetoothConnectionState>) => {
    callbacks.onStateChange({
      status: 'idle',
      deviceName: null,
      errorMessage: null,
      lastRawPayload: null,
      lastRawText: null,
      diagnosticMode: true,
      ...s,
    });
  };

  // Check Web Bluetooth support
  if (typeof navigator === 'undefined' || !('bluetooth' in navigator)) {
    setState({
      status: 'unsupported',
      errorMessage: 'Web Bluetooth is not supported on this device/browser. ' +
        'iPhone and iPad do not support Web Bluetooth. Use Manual Entry instead.',
    });
    return;
  }

  setState({ status: 'connecting' });

  try {
    const serviceUuid = boschGlm16527gProfile.communityBleServices[0];

    const requestOptions: RequestDeviceOptions = allowAllDevices
      ? {
          acceptAllDevices: true,
          optionalServices: serviceUuid ? [serviceUuid] : [],
        }
      : {
          filters: [
            { namePrefix: 'Bosch' },
            { namePrefix: 'GLM' },
          ],
          optionalServices: serviceUuid ? [serviceUuid] : [],
        };

    currentDevice = await navigator.bluetooth.requestDevice(requestOptions);
    currentDevice.addEventListener('gattserverdisconnected', () => {
      gattServer = null;
      characteristic = null;
      callbacks.onDisconnect();
      setState({ status: 'idle', deviceName: null });
    });

    gattServer = await currentDevice.gatt!.connect();
    setState({ status: 'connected', deviceName: currentDevice.name ?? 'Bosch Laser' });

    if (!serviceUuid) {
      setState({
        status: 'connected',
        deviceName: currentDevice.name ?? 'Bosch Laser',
        errorMessage:
          'Connected to device but no verified service UUID available. ' +
          'Running in diagnostic mode only. Measurements will not be auto-captured. ' +
          'Enter measurements manually.',
        diagnosticMode: true,
      });
      return;
    }

    // Try to get the primary service
    let service: BluetoothRemoteGATTService;
    try {
      service = await gattServer.getPrimaryService(serviceUuid);
    } catch {
      setState({
        status: 'connected',
        deviceName: currentDevice.name ?? 'Bosch Laser',
        errorMessage:
          'Connected but could not find the expected GATT service. ' +
          'Community UUIDs may not work for this device model or firmware version. ' +
          'Use Manual Entry to capture measurements.',
        diagnosticMode: true,
      });
      return;
    }

    const charUuid = boschGlm16527gProfile.communityBleCharacteristics[0];
    if (!charUuid) return;

    try {
      characteristic = await service.getCharacteristic(charUuid);

      // Send handshake if known
      const handshake = boschGlm16527gProfile.communityHandshakeHex;
      if (handshake) {
        await characteristic.writeValue(hexToUint8Array(handshake).buffer as ArrayBuffer);
      }

      // Subscribe to indications/notifications
      characteristic.addEventListener('characteristicvaluechanged', (event) => {
        const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
        if (!value) return;
        const data = new Uint8Array(value.buffer);
        const hex = uint8ArrayToHex(data);
        const decoded = tryDecodeBinaryPayload(data);
        const diagnosticText = decoded
          ? `Raw: 0x${hex.replace(/ /g, '')} | Speculative: ${decoded}`
          : `Raw binary payload: 0x${hex.replace(/ /g, '')} (cannot decode — use manual entry)`;

        callbacks.onRawPayload(data, diagnosticText);
      });

      // startNotifications works for both Notifications and Indications in Web Bluetooth
      await characteristic.startNotifications();
    } catch (err) {
      setState({
        status: 'connected',
        deviceName: currentDevice.name ?? 'Bosch Laser',
        errorMessage:
          'Connected but could not subscribe to measurement characteristic. ' +
          'Use Manual Entry to capture measurements. ' +
          `Detail: ${String(err)}`,
        diagnosticMode: true,
      });
    }
  } catch (err: any) {
    if (err.name === 'NotFoundError' || err.message?.includes('cancelled')) {
      setState({ status: 'idle', errorMessage: 'Device selection cancelled.' });
    } else {
      setState({
        status: 'error',
        errorMessage: `Bluetooth connection failed: ${err.message || String(err)}. ` +
          'Use Manual Entry instead.',
      });
    }
  }
}

/** Disconnect from the current device */
export async function disconnectBoschGlm(): Promise<void> {
  if (characteristic) {
    try { await characteristic.stopNotifications(); } catch { /* ignore */ }
    characteristic = null;
  }
  if (gattServer?.connected) {
    gattServer.disconnect();
    gattServer = null;
  }
  currentDevice = null;
}

/** Check if currently connected */
export function isConnected(): boolean {
  return !!(gattServer?.connected);
}
