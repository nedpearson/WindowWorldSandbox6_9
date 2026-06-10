# Surface Pro Offline Installation & Usage Guide

This guide covers installing and using the offline-first Windows desktop app for WindowWorldAssistant on a Surface Pro 12-inch device.

## 1. How to Build & Install on Surface Pro

The app is packaged as a standard Windows executable using Electron and Chromium.

### Building the Installer (On Developer Machine)
Run the following PowerShell commands to generate the installer:
```powershell
# 1. Install all monorepo dependencies
npm install

# 2. Build the web app and package the desktop executable
npm run desktop:build
```
The output installer will be located at:
`apps/desktop/release/Window World Assistant Setup 1.0.0.exe`

### Installing on the Surface Pro
1. Copy the generated `.exe` file to the Surface Pro.
2. Double-click the installer. It will install the app and create a Start Menu shortcut ("WWA Field") and a Desktop shortcut automatically.
3. Launch "WWA Field" from your Start menu.

## 2. Initial Setup (Internet Required)

To prepare for offline field use, you must authenticate and cache your data while connected to Wi-Fi.

1. **Log in:** Open the app and log in with your credentials.
2. **Cache Appointments:** The dashboard will automatically fetch your appointments for the day. You will see a green "Offline Ready" indicator when the Dexie (IndexedDB) cache finishes downloading the customers, openings, and pricing data.
3. **Verify:** You can test offline mode immediately by turning on Airplane Mode and reloading the app. Your appointments should still appear instantly.

## 3. How to Use Offline

Once cached, you can disconnect from the internet and head into the field. 

* **Start Job:** Tap your appointment and begin your workflow.
* **Sketching & Measuring:** The sketch canvas operates fully offline. Your house outlines and markers are saved to the local database.
* **Bluetooth Measuring:** Turn on your Bosch GLM165 laser. Tap the Bluetooth icon in the app. The app will automatically pair (via Chromium Web Bluetooth) and record your measurements.
* **Photos:** Any photos captured are stored securely as binary blobs in the local database until you reconnect.

> [!IMPORTANT]
> **Where is local data stored?** 
> All field data is stored locally in the Chromium IndexedDB engine (via Dexie). On Windows, this lives in:
> `%APPDATA%\Window World Assistant\IndexedDB\`

## 4. Sync Engine

The sync engine uses an idempotent "Outbox" pattern. Every change you make offline is recorded in a local queue (`sync_outbox`).

### How Sync Works
* **Automatic:** When the app detects that Windows has reconnected to Wi-Fi, the sync engine will automatically begin processing the queue in the background.
* **Manual:** You can tap the "Sync Now" button on the dashboard to force a sync if you are on a slow cellular hotspot.
* **Conflicts:** If another user (e.g., an office admin) modified the exact same opening you modified while offline, the app will pause the sync for that item and present a conflict resolution screen, asking you to choose whether to keep your local changes or accept the cloud version.

## 5. Updates & Version Control

Because this app handles critical offline data, updates must be handled carefully.

* **Checking for Updates:** If a new version is released by the development team, you will need to download the latest `.exe` installer. 
* **Safe Updating:** *Never* install an update if you have pending offline changes. The installer replaces the app binaries, but it preserves your `%APPDATA%` local database. However, to guarantee zero data loss, **always tap "Sync Now" while online before running a new installer.**

## 6. What Features Need Internet?

While the core workflow is 100% offline, the following features require an internet connection:
* **Mapbox Satellite Maps:** If you did not view the property online before leaving the office, the satellite view will display "Map unavailable offline." This does not block your ability to draw a sketch.
* **PDF Document Generation:** Generating the final PDF proposal relies on the server and must be queued until you reconnect. (Local Excel generation may be available depending on your template configuration).
* **Voice AI Parsing:** The AI dictation feature requires server connectivity. 

## 7. Troubleshooting

* **Blank Screen Offline:** You likely closed the app before the initial "Offline Ready" green badge appeared. Always ensure cache is warmed before leaving Wi-Fi.
* **Bluetooth Won't Connect:** Ensure Windows 11 Bluetooth is turned ON in the system tray, and the Bosch laser is flashing blue.
* **Data Loss Prevention:** Do *not* use "Clear Site Data" or "Reset App" in settings if you have unsynced changes. This will permanently wipe the local Dexie database.
