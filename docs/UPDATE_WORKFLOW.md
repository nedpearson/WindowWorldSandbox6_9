# Update Workflow — WindowWorldAssistant

> How updates propagate from the development laptop to every device in the field.

---

## Table of Contents

1. [Development Laptop (Source of Truth)](#1-development-laptop-source-of-truth)
2. [Surface Pro — Electron Desktop](#2-surface-pro--electron-desktop)
3. [iPhone 6 & iPhone 7 — PWA](#3-iphone-6--iphone-7--pwa)
4. [Version Mismatch Detection](#4-version-mismatch-detection)
5. [Troubleshooting](#5-troubleshooting)

---

## 1. Development Laptop (Source of Truth)

The development laptop is where all code changes originate. The deploy flow is:

```bash
# 1. Pull latest from main
git pull origin main

# 2. Install dependencies (if package.json changed)
npm install

# 3. Start dev server for local testing
npm run dev

# 4. Build production bundle
npm run build

# 5. Commit and push to deploy
git add . && git commit -m "describe changes" && git push origin main
```

**What happens on push:**
- The production server pulls the latest build artifacts
- The `/api/version` endpoint starts returning the new version manifest
- All connected devices detect the version mismatch within ~2 minutes

---

## 2. Surface Pro — Electron Desktop

The Surface Pro runs the app as an Electron desktop application.

### Auto-Update (Default)
- Electron's built-in auto-updater checks for new releases on GitHub Releases
- When an update is found, a banner appears in the Settings page
- The user clicks **Install Update** to apply it
- The app restarts automatically after installation

### Manual Check
- Open **Settings** → **Updates** section
- Click **Check for Updates**
- Programmatically: call `electronAPI.checkForUpdates()` from the DevTools console

### Force Update (Nuclear Option)
- Navigate to `/update` in the app URL bar
- This clears all caches (Service Worker, localStorage, IndexedDB caches) and force-reloads
- The app reloads with the latest version from the server

### Fallback: Re-download Installer
If all else fails:
1. Go to the GitHub Releases page for the repository
2. Download the latest `.exe` installer
3. Run it — it will overwrite the existing installation

### ⚠️ Important
Always check for **unsynced data** before updating. The Settings page shows the pending sync count. If items are pending, sync them first to avoid data loss.

---

## 3. iPhone 6 & iPhone 7 — PWA

Both iPhones run the app as a Progressive Web App (PWA) installed from Safari.

### Auto-Update (Default)
- The Service Worker detects a new version when fetching assets
- When a new version is found, the app auto-reloads to pick up the changes
- This happens automatically when the app is opened or brought to the foreground

### Manual Update
- **Pull-to-refresh** in Safari to trigger a fresh fetch
- Close and reopen the PWA from the home screen
- This forces the Service Worker to re-check for updates

### Force Update (Nuclear Option)
- Navigate to `/update` in the app
- This clears **all caches**: Service Worker cache, localStorage, and any stale assets
- The app reloads fresh from the server

### Check Current Version
- Press **Ctrl+F12** (admin only) to open the diagnostics panel
- The diagnostics panel shows the current `version`, `themeVersion`, `pricingRulesVersion`, and `workbookTemplateVersion`
- Compare these against the server's `/api/version` response to verify sync

---

## 4. Version Mismatch Detection

The app uses the `UpdateBanner` component to automatically detect version mismatches across all devices.

### How It Works

1. **Polling:** The `UpdateBanner` component calls `/api/version` every **2 minutes** (120 seconds) when the device is online
2. **Comparison:** The response is compared against the client's built-in `CLIENT_VERSION` config:

   | Field                      | Purpose                                |
   |----------------------------|----------------------------------------|
   | `version`                  | Main app version (e.g. `1.1.0`)        |
   | `themeVersion`             | UI theme/style version                 |
   | `pricingRulesVersion`      | Pricing calculation rules version      |
   | `workbookTemplateVersion`  | Excel workbook export template version |

3. **Trigger:** If **any** of the four fields differ between client and server, the update banner is shown
4. **Banner:** A yellow banner appears at the top of the screen: _"🚀 Update Available: A new version (X.Y.Z) is ready!"_
5. **Action:** The user clicks **Update Now**, which:
   - Checks for unsynced data in the outbox
   - If unsynced data exists, prompts for confirmation
   - Backs up the local database
   - Redirects to `/update` to clear caches and reload

### Version Config Location

```
apps/web/src/config/version.ts
```

```typescript
export const CLIENT_VERSION = {
  appName: 'WindowWorldAssistant',
  version: '1.1.0',
  themeVersion: '1.1.0',
  pricingRulesVersion: '2026-BTR',
  workbookTemplateVersion: '1.1.0',
  localDbVersion: 9,
} as const;
```

When deploying a new version, update the relevant fields in this file. The server's `/api/version` endpoint serves the same manifest, and mismatches trigger the update banner.

---

## 5. Troubleshooting

### "App shows old version after update"

**Cause:** Stale Service Worker or browser cache.

**Fix:**
1. Navigate to `/update` — this clears all caches and force-reloads
2. If that doesn't work on the Surface Pro, close and reopen the Electron app
3. On iPhones, close the PWA completely (swipe up from app switcher) and reopen

### "Unsynced data warning blocks update"

**Cause:** Field data was collected offline and hasn't synced yet.

**Fix:**
1. Ensure the device is connected to the internet
2. Wait for the sync engine to push all pending items (check the pending count in Settings)
3. Once the count reaches 0, proceed with the update
4. If sync is stuck, try navigating to a different page and back to trigger a retry

### "Update failed" or "An unexpected error occurred"

**Cause:** Network connectivity issue or server error.

**Fix:**
1. Check that the device has a stable internet connection
2. Try again in a few minutes — the server may be deploying
3. On the Surface Pro, try **Check for Updates** again from Settings
4. As a last resort, use the `/update` force-reload path

### "Version shows 'Unknown' in Settings"

**Cause:** The `electronAPI` bridge is not available (running in browser instead of Electron).

**Fix:**
- This is expected when running in the browser during development
- In the Electron app, the version is fetched via `electronAPI.getAppVersion()`
- If this happens inside Electron, restart the app

---

## Quick Reference

| Device           | Auto-Update Method         | Manual Trigger                           | Force Reset     |
|------------------|---------------------------|------------------------------------------|-----------------|
| Dev Laptop       | N/A (source)              | `git pull && npm run build`              | N/A             |
| Surface Pro      | Electron auto-updater     | Settings → Check for Updates             | Navigate `/update` |
| iPhone 6         | Service Worker auto-reload| Pull-to-refresh / close & reopen         | Navigate `/update` |
| iPhone 7         | Service Worker auto-reload| Pull-to-refresh / close & reopen         | Navigate `/update` |
