/**
 * manualLibraryLaser.ts
 * Laser measurement articles - Bosch GLM165-27G
 *
 * ENCODING: ASCII only. No emoji literals. No curly quotes. No em/en-dash literals.
 */

import type { ManualChapter } from './manualContent';

export const manualLibraryLaserChapters: ManualChapter[] = [

  {
    id: 'lib-bosch-glm-setup',
    title: 'Bosch GLM165-27G Laser Measure Setup',
    subtitle: 'Set up and configure the Bosch GLM165-27G for window measurement work',
    category: 'Measurement Tools',
    roles: ['rep', 'manager', 'admin'],
    tags: ['laser', 'bosch', 'GLM165', 'measurement', 'bluetooth', 'setup', 'fractional inches'],
    sections: [
      {
        id: 'lib-glm-setup-units',
        title: 'Setting the Correct Unit Mode',
        body: 'Before measuring windows, set the GLM165-27G to Fractional Inches mode. Hold the Rounding button for 3 seconds to open the unit menu. Cycle to Fractional Inches (e.g., 36 1/4"). Press Rounding briefly to set precision to 1/16 or 1/8 inch for window work.',
        steps: [
          'Hold the Rounding button for 3 seconds to open the unit menu.',
          'Cycle using the Rounding button to Fractional Inches.',
          'Press Rounding briefly to adjust precision to 1/16 or 1/8 inch.',
          'Take a test measurement to verify the display shows fractional inches.',
        ],
      },
      {
        id: 'lib-glm-setup-connect',
        title: 'Connecting to Window World Assistant',
        body: 'The GLM165-27G does NOT act as a keyboard and cannot type measurements. Use Manual Entry: read the laser display and type the value. On iPhone/iPad, only Manual Entry is available - Web Bluetooth is not supported on iOS. On Chrome/Android, experimental BLE mode may be available as an optional enhancement.',
        steps: [
          'Open an opening editor and find the Laser Measure panel.',
          'Select Manual Entry mode.',
          'Take your measurement with the laser.',
          'Read the value from the laser display.',
          'Type the value into the Manual Entry field (e.g., 36 1/4).',
          'Confirm the parsed result and tap Use for Width or Height.',
        ],
      },
    ],
  },

  {
    id: 'lib-bosch-glm-protocol',
    title: 'How the GLM165-27G Sends Measurements',
    subtitle: 'What the laser can and cannot do with Bluetooth - BLE vs HID vs Manual',
    category: 'Measurement Tools',
    roles: ['rep', 'manager', 'admin'],
    tags: ['laser', 'bosch', 'GLM165', 'bluetooth', 'BLE', 'HID', 'MeasureOn', 'protocol', 'iPhone', 'iPad'],
    sections: [
      {
        id: 'lib-glm-protocol-facts',
        title: 'What the Device Actually Does',
        body: 'The GLM165-27G uses BLE 4.2 to communicate ONLY with the Bosch MeasureOn app. It does NOT act as a Bluetooth keyboard (no HID mode). It cannot type measurements into any text field. The BLE protocol is proprietary and not officially documented by Bosch. Community-derived UUIDs exist but are not verified for this model. Manual Entry is the correct primary workflow.',
        steps: [],
      },
      {
        id: 'lib-glm-capture-modes',
        title: 'Capture Modes in Window World Assistant',
        body: 'Three capture modes are available: (1) Manual Entry - works on all devices, always available, rep reads display and types value. (2) Experimental BLE - Chrome and Android Chrome only, uses community-derived UUIDs, may not work on all devices or firmware versions. (3) MeasureOn Import - take measurements in Bosch MeasureOn app and paste values, works on all devices.',
        steps: [],
      },
    ],
  },

  {
    id: 'lib-laser-capture-workflow',
    title: 'Capturing Width and Height from Laser',
    subtitle: 'Step-by-step workflow for assigning laser measurements to openings',
    category: 'Measurement Tools',
    roles: ['rep', 'manager'],
    tags: ['laser', 'width', 'height', 'workflow', 'cush measure', 'actual', 'order', 'opening'],
    sections: [
      {
        id: 'lib-lcw-workflow',
        title: 'Width and Height Capture Workflow',
        body: 'Measure width first (jamb-to-jamb), then height (sill to head jamb). The Laser Measure panel shows the Actual measurement and the Order measurement (after Cush Measure or other rule deductions). Both are stored separately in Supabase. The contract and order form use the Order measurement. The audit history preserves the Actual measurement. Never modify actual to match order - the system tracks them independently.',
        steps: [
          'Open the opening editor.',
          'In the Laser Measure panel, select Width as the target field.',
          'Measure jamb-to-jamb with the laser.',
          'Type the value (e.g., 36 1/4).',
          'Confirm actual and order values shown in the panel.',
          'Tap Use for Width.',
          'Change target to Height and repeat for sill-to-head measurement.',
        ],
      },
    ],
  },

  {
    id: 'lib-laser-cush-measure',
    title: 'Cush Measure with Laser Measurements',
    subtitle: 'How Cush Measure and other rules apply to laser-captured values',
    category: 'Measurement Rules',
    roles: ['rep', 'manager', 'admin'],
    tags: ['laser', 'cush measure', 'deduction', 'actual measurement', 'order measurement', 'brick', 'rule'],
    sections: [
      {
        id: 'lib-lcm-how',
        title: 'Actual vs Order Measurement',
        body: 'When you enter a laser measurement, the panel shows two values: Actual (exactly what the laser read) and Order (after the Cush Measure or other rule deduction). Example: Actual = 36 1/4", Order = 36" (after 1/4" Cush deduction per side). Tap Use for Width to save both. The opening field shows the Order measurement. The Laser Capture record in Supabase stores both permanently for audit purposes.',
        steps: [
          'Enter the laser measurement for Width (e.g., 36 1/4).',
          'See Actual = 36 1/4" and Order = 36" in the panel.',
          'Confirm both values are correct.',
          'Tap Use for Width to save.',
          'The opening width field will show the Order measurement.',
        ],
      },
    ],
  },

  {
    id: 'lib-laser-troubleshoot-bluetooth',
    title: 'Troubleshooting Laser Bluetooth',
    subtitle: 'What to do when Bluetooth does not work with the GLM165-27G',
    category: 'Measurement Tools',
    roles: ['rep', 'manager', 'admin'],
    tags: ['laser', 'bluetooth', 'troubleshoot', 'iPhone', 'iPad', 'error', 'BLE', 'fallback', 'iOS'],
    sections: [
      {
        id: 'lib-lt-ipad',
        title: 'iPhone or iPad Cannot Connect via Bluetooth',
        body: 'iPhone and iPad (all browsers, including Chrome) do not support Web Bluetooth. This is an Apple WebKit platform limitation as of 2026. Always use Manual Entry on iPhone/iPad. Alternatively, take measurements in Bosch MeasureOn and paste values using MeasureOn Import.',
        steps: [
          'On iPhone/iPad, select Manual Entry mode in the Laser Measure panel.',
          'Take the measurement with the laser and read the display.',
          'Type the value.',
          'Or use MeasureOn Import: measure in MeasureOn app, then paste values.',
        ],
      },
      {
        id: 'lib-lt-ble-fail',
        title: 'BLE Connection Fails on Chrome',
        body: 'If Experimental BLE fails on Chrome/Android, the app shows an error and remains open for Manual Entry. This is expected behavior - the BLE protocol is proprietary and community-derived UUIDs may not work on your specific device or firmware version. Use Manual Entry and continue with the appointment. Do not spend field time troubleshooting BLE.',
        steps: [
          'Dismiss the BLE error message.',
          'Switch to Manual Entry mode.',
          'Type the measurement value.',
          'Continue with the appointment.',
        ],
      },
    ],
  },

];
