/**
 * boschGlm16527g.ts — Device profile for Bosch GLM165-27G
 *
 * RESEARCH STATUS: partial
 * Based on community reverse engineering. NOT officially documented by Bosch.
 * These UUIDs and handshake bytes may not work on the GLM165-27G specifically.
 * They were reported for other GLM models and may differ here.
 *
 * DO NOT ship BLE as the primary workflow based on this profile alone.
 * Use nRF Connect or Chrome BT internals to verify for this specific device.
 *
 * Source: docs/bosch-glm165-27g-bluetooth-research.md
 */

export type ResearchStatus = 'verified' | 'partial' | 'community_only' | 'unknown';

export interface BoschDeviceProfile {
  brand: string;
  model: string;
  marketingName: string;
  bluetoothVersion: string;
  knownModes: string[];

  /** BLE service UUIDs — empty array means not verified for this model */
  verifiedBleServices: string[];
  /** BLE characteristic UUIDs — empty means not verified */
  verifiedBleCharacteristics: string[];

  /**
   * Community-derived UUIDs. May work, may not. Use only in experimental mode.
   * Source: Stack Overflow, GitHub reverse engineering threads.
   * NOT verified against actual GLM165-27G hardware.
   */
  communityBleServices: string[];
  communityBleCharacteristics: string[];

  /**
   * Hex bytes to write to the command characteristic to start measurement streaming.
   * Community-derived, not verified for GLM165-27G.
   */
  communityHandshakeHex: string | null;

  /** Whether the device supports BLE Indications (vs Notifications) */
  usesIndications: boolean;

  /** Payload format as determined by research */
  payloadFormat: 'proprietary_binary' | 'text' | 'unknown';

  /** How units are set on-device */
  unitBehavior: string;

  /** Instructions for connecting via Bosch MeasureOn */
  pairingInstructions: string;

  /** Instructions for rep to capture measurement */
  captureInstructions: string;

  /** Fallback instructions when BLE is unavailable */
  fallbackInstructions: string;

  /** Overall research status */
  researchStatus: ResearchStatus;

  notes: string[];
}

export const boschGlm16527gProfile: BoschDeviceProfile = {
  brand: 'Bosch',
  model: 'GLM165-27G',
  marketingName: 'Bosch BLAZE 165-ft Outdoor Green-Beam Laser',
  bluetoothVersion: 'BLE 4.2 (Bluetooth Smart)',

  knownModes: [
    'manual_entry',
    'measureon_import',
    'bluetooth_ble_experimental',
  ],

  // Verified BLE service/characteristic UUIDs for this specific model:
  // NONE — Bosch does not publish official BLE GATT documentation.
  verifiedBleServices: [],
  verifiedBleCharacteristics: [],

  // Community-derived UUIDs. Use only behind experimental flag.
  // Reported for Bosch GLM series (not specifically GLM165-27G).
  // Source: stackoverflow.com, nordicsemi.com DevZone threads.
  communityBleServices: [
    '00005301-0000-0041-5253-534f46540000',  // "SOFTA" custom service
  ],
  communityBleCharacteristics: [
    '00004301-0000-0041-5253-534f46540000',  // measurement data characteristic
  ],

  // Handshake bytes to enable measurement streaming.
  // Reported for some GLM models; NOT confirmed for GLM165-27G.
  // Bytes: C0 56 01 00 1E
  communityHandshakeHex: 'c0560100 1e',

  usesIndications: true,  // device uses BLE Indications, not standard Notifications

  payloadFormat: 'proprietary_binary',

  unitBehavior:
    'The device stores units on-device. Switch units by holding the Rounding button ' +
    '3 seconds. Options: fractional inches (36 1/4"), decimal inches (36.25"), ' +
    'feet/inches (3\' 0 1/4"), metric (m/cm/mm). The unit affects the binary payload ' +
    'encoding but the exact encoding per unit is not publicly documented.',

  pairingInstructions:
    'DO NOT pair via iOS/Android Bluetooth settings. Instead: ' +
    '(1) Open the Bosch MeasureOn app. ' +
    '(2) Tap the device icon. ' +
    '(3) Follow in-app pairing steps. ' +
    'For experimental Web Bluetooth: hold the Bluetooth button on the laser until the ' +
    'LED flashes, then use the "Connect Laser" button in this app on Chrome/Android.',

  captureInstructions:
    'Press the green measurement button to take a reading. ' +
    'The measurement appears on the laser display. ' +
    'Read the value and enter it in the Manual Entry field, ' +
    'or use Experimental BLE to attempt automatic capture.',

  fallbackInstructions:
    'If Bluetooth is unavailable: (1) Read the measurement from the laser display. ' +
    '(2) Tap Manual Entry. (3) Type the value (e.g., 36 1/4 or 3ft 0 1/4in). ' +
    '(4) Tap Use for [Width/Height/etc]. ' +
    'Alternatively, take measurements in Bosch MeasureOn, then tap ' +
    '"Import from MeasureOn" and paste the values.',

  researchStatus: 'community_only',

  notes: [
    'HID keyboard mode is NOT supported. The GLM165-27G cannot type measurements into arbitrary inputs.',
    'Web Bluetooth is not supported on iPhone/iPad — use Manual Entry.',
    'The BLE protocol is proprietary. Bosch may change it in firmware updates.',
    'Community UUIDs were derived from other GLM models — verify with nRF Connect on actual device.',
    'MeasureOn exports PDF/XLS/JPG — no native CSV/JSON API.',
    'For best results, set device to Fractional Inches with 1/16" precision before measuring windows.',
  ],
};
