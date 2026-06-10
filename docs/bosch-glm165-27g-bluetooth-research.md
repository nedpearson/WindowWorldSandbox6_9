# Bosch GLM165-27G Bluetooth Research

**Research Date:** 2026-05-30  
**Researcher:** Window World Assistant Engineering Team  
**Purpose:** Determine how the Bosch GLM165-27G laser distance meter transmits
measurements, and which capture modes Window World Assistant can reliably support.

---

## Device Identification

| Field | Value |
|-------|-------|
| Model | Bosch GLM165-27G (also marketed as GLM165-27CG, GLM165-27CGL) |
| Category | Bluetooth-connected laser distance meter |
| Bluetooth Version | Bluetooth Smart 4.2 (BLE) |
| Measuring Range | Up to 165 ft (50 m) |
| Accuracy | ±1/16 inch |
| IP Rating | IP65 |
| Official App | Bosch MeasureOn (iOS and Android) |

---

## Sources Reviewed

1. **Bosch Tools official product page** — boschtools.com (GLM165-27CG)
2. **Home Depot product listing and Q&A** — homedepot.com
3. **Bosch Professional documentation** — bosch-professional.com
4. **Stack Overflow BLE reverse engineering thread** — stackoverflow.com
5. **Nordic Semiconductor DevZone community forum** — nordicsemi.com
6. **GitHub community reverse engineering repositories** (multiple)
7. **Apple App Store — Bosch MeasureOn listing**
8. **Bosch MeasureOn official documentation** — bosch-measureon.com
9. **EEV Blog hardware forum** — eevblog.com
10. **Web Bluetooth API browser compatibility** — testmuai.com, magicbell.com, progressier.com
11. **manuals.plus — GLM165-27G user manual summary**
12. **Reddit user feedback — measurement unit settings**

---

## Confirmed Device Behavior

### Bluetooth Technology
- **Confirmed BLE:** The device uses Bluetooth Low Energy (BLE) 4.2.
- **Not a Bluetooth Classic device.** It does not act as a Bluetooth serial port (SPP) or audio device.
- **Not a Bluetooth HID keyboard.** The device does NOT support Bluetooth HID (Human Interface Device) keyboard mode. It cannot "type" measurements as keystrokes into arbitrary text fields on any computer, phone, or tablet.

### Pairing and Connection Method
- The device **must be connected from within the Bosch MeasureOn app** — not from the OS Bluetooth settings menu.
- It does not appear in a standard OS Bluetooth device list as a keyboard, mouse, or serial device.
- Connection range: approximately 10 meters (33 feet) in open conditions.

### Data Transfer Protocol
- **Proprietary BLE GATT protocol.** No official public API or documented protocol.
- The protocol has been partially reverse-engineered by the community:
  - **Probable Service UUID:** `00005301-0000-0041-5253-534f46540000` (community-derived, not Bosch-official)
  - **Probable Characteristic UUID:** `00004301-0000-0041-5253-534f46540000` (community-derived, not Bosch-official)
  - Data is received via **BLE Indications** (not standard Notifications).
  - A specific **handshake/enable command** must be written to the device before it transmits measurement data. Example reported: `0xC0 0x56 0x01 0x00 0x1E` (hex, model-specific — not verified for GLM165-27G specifically).
  - Payload is **binary, not human-readable text.**
  - Packet structure includes a header (e.g., `0xC0 0x55`) followed by proprietary encoded measurement bytes.
  - Decoding logic requires reverse-engineered mapping from bytes to decimal inches/mm.
- **These UUIDs and handshake codes are NOT officially documented by Bosch.**
- **They may differ between GLM models and firmware versions.**
- Bosch may update firmware at any time, breaking third-party connections silently.

### Measurement Unit Settings (on-device)
The device can be configured on-screen to display:
- Decimal inches (e.g., `36.25"`)
- Feet and fractional inches (e.g., `3' 0 1/4"`)
- Fractional inches (e.g., `36 1/4"`)
- Metric (mm, cm, m)

The unit selected on the device likely affects what is transmitted in the BLE payload, but the exact encoding per unit is not publicly documented.

### Send Trigger
- Measurement is captured by pressing the measuring button on the device.
- The current measurement is sent automatically to the connected MeasureOn app when the connection is established and the handshake is complete.
- There is no separate "send" button to push data to a third-party app.

### MeasureOn App Export
- MeasureOn can export data as **PDF, JPG, or XLS (Excel)** — no native CSV or JSON export.
- No official public REST or BLE API for third-party apps.
- MeasureOn Cloud web interface exists at bosch-measureon.com (browser-accessible).
- Users can copy/paste individual measurement values from MeasureOn.
- PRO subscription required for some export features.

---

## Capture Mode Analysis

### Mode 1: Web Bluetooth BLE (Direct Browser → Device)

| Item | Status |
|------|--------|
| API available | `navigator.bluetooth` — Chrome/Edge desktop and Android Chrome |
| Device uses BLE | ✅ Confirmed (BLE 4.2) |
| Service UUID known | ⚠️ Community-derived only — not Bosch-official |
| Characteristic UUID known | ⚠️ Community-derived only |
| Handshake required | ✅ Yes — specific byte sequence required |
| Handshake bytes known | ⚠️ Partially (other GLM models); not confirmed for GLM165-27G |
| Payload format | ✅ Binary proprietary — decoding required |
| Decoding algorithm | ⚠️ Community reverse-engineered, not verified for this model |
| Stability guarantee | ❌ None — proprietary, may break on firmware update |
| iPhone/iPad Safari | ❌ Not supported (WebKit does not implement Web Bluetooth) |
| iPhone/iPad Chrome | ❌ Not supported (iOS Chrome uses WebKit) |
| Desktop Chrome | ✅ Supported |
| Android Chrome | ✅ Supported |
| **Overall verdict** | **Experimental — can be offered as "advanced/lab" mode with clear warnings** |

**Recommendation:** Implement as an **optional experimental BLE mode** behind a clear
disclaimer. Do not present as the primary or reliable workflow. Gracefully fall back if
UUIDs or handshake fail. Do not hardcode UUIDs as if they are verified.

### Mode 2: Bluetooth HID Keyboard Mode

| Item | Status |
|------|--------|
| Device supports HID | ❌ Confirmed NOT supported |
| Works in any browser | ❌ N/A |
| **Overall verdict** | **Not available — do not implement** |

### Mode 3: Manual Laser Entry (Type-in fallback)

| Item | Status |
|------|--------|
| Works on all devices | ✅ Always |
| Rep reads display and types | ✅ Standard practice |
| Parser handles all formats | ✅ (inches, fractions, ft/in, mm) |
| **Overall verdict** | **Primary reliable workflow — always available** |

### Mode 4: Bosch MeasureOn Import / Paste

| Item | Status |
|------|--------|
| MeasureOn exports | ✅ PDF, XLS, JPG (not CSV/JSON) |
| Rep can copy measurement text | ✅ From MeasureOn app or cloud |
| App can parse pasted text | ✅ With normalization parser |
| Direct API integration | ❌ No public Bosch API |
| **Overall verdict** | **Good fallback — paste-import is reliable** |

---

## Browser / Device Compatibility Matrix

| Platform | Web Bluetooth | Keyboard Entry | Manual Entry | MeasureOn Paste |
|----------|:---:|:---:|:---:|:---:|
| Desktop Chrome/Edge (Windows/Mac) | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| Android Chrome | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| iPhone Safari | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes |
| iPad Safari | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes |
| iPhone Chrome | ❌ No (WebKit) | ✅ Yes | ✅ Yes | ✅ Yes |
| iPad Chrome | ❌ No (WebKit) | ✅ Yes | ✅ Yes | ✅ Yes |
| Firefox (all) | ❌ Disabled | ✅ Yes | ✅ Yes | ✅ Yes |

---

## Recommended Implementation Path

### Primary Workflow (All Devices)
**Manual Laser Entry** — Rep reads the measurement display and types it into a
dedicated capture input. The app normalizes the value (handles inches, fractions,
ft/in, metric), applies the appropriate measurement rule (Cush, brick, outside
measure, etc.), and stores both the actual and adjusted measurements.

### Secondary Workflow (Desktop Chrome / Android Chrome)
**Experimental BLE Mode** — Offer as an optional "Connect Laser" button that:
1. Detects Web Bluetooth support.
2. Prompts user to connect to the Bosch device.
3. Uses community-derived UUIDs with a clear disclaimer.
4. Shows raw binary payload in diagnostic mode.
5. If decoding works: pre-fills the measurement input for user confirmation.
6. If decoding fails: shows error, falls back to manual entry.
7. NEVER auto-saves without user confirmation.

### Tertiary Workflow (All Devices)
**MeasureOn Paste/Import** — Rep takes measurements in MeasureOn, then taps
"Import from MeasureOn" and pastes or types the value list. App parses and
assigns fields.

---

## Fallback Plan

If Web Bluetooth is unavailable or fails:
1. Show clear message: "Direct Bluetooth is not available on this device. Use Manual Entry or MeasureOn Import."
2. Automatically focus the manual entry input.
3. Do not show error dialogs — seamlessly switch to the next available mode.

---

## What We Are NOT Doing

- ❌ No hardcoded fake UUIDs presented as "verified Bosch protocol"
- ❌ No auto-sending measurements without rep confirmation
- ❌ No claiming HID/keyboard mode is supported
- ❌ No blocking iPhone/iPad field workflow due to missing BLE support
- ❌ No storing measurements locally only (all saves go to Supabase/backend)
- ❌ No trusting unverified binary decoding for production order values

---

## Required Device Configuration for Best Results

If a rep uses the BLE or Manual Entry mode, they should configure the device to:
1. Press and hold the **Rounding Button** for 3 seconds to enter the unit menu.
2. Select **Fractional Inches** (e.g., 36 1/4") for easiest window measurement entry.
3. Set rounding to **1/16 inch** or **1/8 inch** for window work.

---

## Notes for Future Improvement

- Use `chrome://bluetooth-internals` on Android Chrome while the device is in BLE
  advertising mode to inspect actual service/characteristic UUIDs.
- Use Android HCI snoop log + Wireshark to capture Bosch MeasureOn ↔ device traffic
  to reverse-engineer the exact handshake and decode algorithm for GLM165-27G.
- If confirmed stable, upgrade from experimental to standard BLE mode.
- Bosch has historically changed UUIDs between GLM generations — always verify per model.
