/**
 * deviceCapability.ts
 *
 * Detects what laser capture modes are available on the current platform/browser.
 * Based on the Bosch GLM165-27G research:
 *   - Web Bluetooth: Chrome/Edge desktop and Android Chrome ONLY
 *   - iPhone/iPad: Web Bluetooth NOT supported (WebKit restriction as of 2026)
 *   - HID/keyboard mode: NOT supported by Bosch GLM165-27G
 *   - Manual entry: always available
 *   - MeasureOn paste/import: always available
 */

export type CaptureMode =
  | 'bluetooth_ble'
  | 'manual'
  | 'measureon_import'
  | 'unknown';

export type Platform =
  | 'ios'
  | 'android'
  | 'desktop_chrome'
  | 'desktop_firefox'
  | 'desktop_safari'
  | 'desktop_edge'
  | 'other';

export interface DeviceCapabilityResult {
  webBluetoothSupported: boolean;
  hidCaptureSupported: false;       // GLM165-27G does NOT support HID — always false
  measureOnImportSupported: true;   // always — paste/import always available
  manualEntrySupported: true;       // always
  platform: Platform;
  browser: string;
  recommendedMode: CaptureMode;
  warnings: string[];
}

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent.toLowerCase();

  // iOS detection (iPhone, iPad, iPod)
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/edg\//.test(ua)) return 'desktop_edge';
  if (/firefox/.test(ua)) return 'desktop_firefox';
  if (/safari/.test(ua) && !/chrome/.test(ua)) return 'desktop_safari';
  if (/chrome/.test(ua)) return 'desktop_chrome';
  return 'other';
}

function detectBrowser(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/OPR\//.test(ua) || /Opera/.test(ua)) return 'Opera';
  if (/SamsungBrowser/.test(ua)) return 'Samsung Internet';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Unknown';
}

/**
 * Detect available laser capture modes for the current browser/device.
 * Call this once on mount and cache the result.
 */
export function detectDeviceCapability(): DeviceCapabilityResult {
  const platform = detectPlatform();
  const browser = detectBrowser();
  const warnings: string[] = [];

  // Web Bluetooth: only available in Chrome/Edge on desktop/Android
  // Explicitly NOT available on iOS/iPadOS (all browsers use WebKit)
  const webBluetoothSupported = typeof navigator !== 'undefined'
    && 'bluetooth' in navigator
    && navigator.bluetooth != null;

  if (platform === 'ios') {
    warnings.push(
      'iPhone and iPad do not support Web Bluetooth. Use Manual Entry or MeasureOn Import.'
    );
  } else if (platform === 'desktop_firefox') {
    warnings.push(
      'Firefox does not support Web Bluetooth. Use Manual Entry or MeasureOn Import.'
    );
  } else if (platform === 'desktop_safari') {
    warnings.push(
      'Safari does not support Web Bluetooth. Use Manual Entry or MeasureOn Import.'
    );
  } else if (webBluetoothSupported) {
    warnings.push(
      'Direct Bluetooth to the Bosch GLM165-27G is experimental. The BLE protocol ' +
      'is not officially documented by Bosch. Use Manual Entry as the primary workflow, ' +
      'and BLE as an optional enhancement.'
    );
  }

  // HID: The Bosch GLM165-27G does NOT support Bluetooth HID keyboard mode.
  // This is confirmed from research — it does not transmit measurements as keystrokes.

  // Determine recommended mode
  let recommendedMode: CaptureMode = 'manual';
  if (webBluetoothSupported) {
    recommendedMode = 'bluetooth_ble'; // available but experimental — default to manual
    recommendedMode = 'manual'; // keep manual as default; BLE is opt-in
  }

  return {
    webBluetoothSupported,
    hidCaptureSupported: false,       // not supported by GLM165-27G
    measureOnImportSupported: true,   // always
    manualEntrySupported: true,       // always
    platform,
    browser,
    recommendedMode,
    warnings,
  };
}
