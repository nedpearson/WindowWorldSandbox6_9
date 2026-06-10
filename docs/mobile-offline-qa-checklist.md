# Mobile Offline QA Checklist (iPad & iPhone)

Use this checklist to perform final quality assurance testing on the Window World Assistant offline PWA on iPad and iPhone devices.

## Pre-requisites
1. [ ] Install the PWA to the home screen (Safari -> Share -> Add to Home Screen).
2. [ ] Log in while connected to the internet.
3. [ ] Allow the app to fully load the `MobileHomePage` and cache the `pricing_version`.

## 1. Offline Mode Activation
- [ ] Disable Wi-Fi and Cellular data (Airplane Mode).
- [ ] Kill the app and reopen it from the home screen.
- [ ] Verify the app loads without a network connection.
- [ ] Verify the "Working Offline — Showing cached appointments" banner is visible on the Home Page.

## 2. Appointment Caching
- [ ] Verify all appointments that were visible online are listed.
- [ ] Verify you can click into an appointment and see the full details (Customer, About House, Windows).

## 3. Opening Creation & Modification
- [ ] Add a new window opening. 
- [ ] Verify the opening is saved locally and appears in the list.
- [ ] Check the top of the Appointment Detail page: the `SyncStatusBar` should show "Pending Sync" with a count > 0.
- [ ] Modify an existing opening. Verify the change is saved locally.

## 4. Photo Capture (Dexie Blob Queue)
- [ ] Open the camera/photo capture modal for an opening.
- [ ] Take or select a photo and save it.
- [ ] Verify the photo saves locally without throwing an error.
- [ ] Kill the app, reopen it, and verify the `SyncStatusBar` still shows pending items (the Dexie Blob Queue survived the restart).

## 5. Pricing & Offline Quoting
- [ ] Navigate to the Pricing Review step.
- [ ] Tap "Calculate Prices". Verify the system uses the local `pricing_cache`.
- [ ] If the cache is > 24 hours old, verify the "⚠ Offline Pricing is Stale" warning appears.
- [ ] Verify the generated quote is marked as "DRAFT OFFLINE".

## 6. Reconnection & Sync Engine
- [ ] Turn off Airplane Mode / reconnect to the internet.
- [ ] Observe the `SyncStatusBar` change from "Pending" to "Syncing".
- [ ] Wait for the sync to complete. Verify the status changes to "Synced" (green).
- [ ] Verify that photos successfully uploaded to the cloud storage and are visible on the desktop app.
- [ ] Verify that any new openings were assigned permanent Cloud IDs (check the backend database or refresh the app).

## 7. Conflict Resolution
- [ ] Go offline. Edit an opening's `width` from 36 to 40.
- [ ] On a separate desktop device (online), edit the SAME opening's `width` from 36 to 42.
- [ ] Reconnect the iPad to the internet.
- [ ] Verify the `ConflictResolutionModal` appears or a conflict is logged.
- [ ] Resolve the conflict by choosing either "Keep Local" or "Keep Cloud". Verify the choice is successfully saved.
