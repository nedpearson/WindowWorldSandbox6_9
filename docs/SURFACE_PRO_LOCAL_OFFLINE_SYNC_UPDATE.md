# Surface Pro Local-First Architecture, Offline Sync, and Updates

This document outlines the hardened local-first architecture for the Window World Assistant Surface Pro field application.

## 1. Local Database (IndexedDB / Dexie)

The core data store for the field app is IndexedDB, managed via `dexie` in `apps/web/src/lib/offlineDb.ts`.
- **Schema**: Versioned using `dexie` versioning. `local_db_migrations` tracks schema updates.
- **Cache Warming**: `apps/web/src/lib/cacheWarmer.ts` manages pre-fetching appointments, customers, pricing, and sketches before heading into the field.
- **Backup**: Data can be exported to raw JSON via the "Backup Local Data" button on the Surface Pro Settings page or via the `Ctrl+F12` Root Cause panel.

## 2. Sync Engine (`syncEngine.ts`)

The `sync_outbox` acts as a durable queue for all operations made while offline.
- **Conflict Resolution**: The app detects HTTP 409 responses from the backend when a cloud resource has a higher version. Conflicts are stored in `sync_conflicts` for manual resolution.
- **Data Protection**: When pulling fresh data from the cloud, the engine checks `dirtyInOutbox === 0` to ensure local unsynced edits are never silently overwritten.
- **Idempotency**: All operations require an `idempotencyKey` to prevent duplicated records if network drops mid-request.

## 3. Local Excel Document Generation

To ensure complete offline independence, editable Excel Order Forms can be generated directly on the Surface Pro without server access.
- **Integration**: Handled via `apps/desktop/src/excelGenerator.ts`.
- **Trigger**: The web app intercepts document generation requests and forwards them to the Electron Main Process via `electronAPI.generateExcelLocally`.
- **Output**: The file is saved directly to the device's Documents folder.

## 4. Updates & Safety Guardrails

- The app utilizes Electron AutoUpdater.
- **Restriction**: Updates are blocked if there are pending items in the `sync_outbox`. This ensures no local data is lost during the update process.

## 5. Root Cause Diagnostics (Ctrl+F12)

The `RootCausePanel` offers advanced metrics and unsafe auto-fixes for field agents with elevated permissions:
- Force Sync Retry
- Rebuild Local Cache Index
- Export Raw Local DB
