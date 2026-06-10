# Surface Pro Local Offline Field App Installation & Architecture

This document describes the Windows Surface Pro offline architecture for WindowWorldAssistant.
The system is built as a truly local-first application using Electron, Dexie, and local AI runtimes.

## 1. Installation Steps
1. Navigate to the \pps/desktop\ directory.
2. Run \
pm run package\ to build the Windows executable.
3. Distribute the \Window World Assistant Setup.exe\ generated in \pps/desktop/release\.
4. Install it on the Surface Pro.
5. The app runs from the Start Menu/Desktop exactly like a native app.

## 2. Local Database & Storage
- **Database Backend**: The app uses Chromium's IndexedDB natively (powered by SQLite on disk) wrapped via **Dexie v6**. This provides robust, asynchronous, schema-versioned persistence.
- **Photos Path**: Photos are backed up locally to \Documents\WW Customers\Photos\ using native Electron IPC to ensure zero data loss.
- **Conflict Resolution**: The Sync Engine uses idempotency keys to ensure duplicate openings or photos are never uploaded. Conflicts are pushed to a \conflict_records\ store for merging.

## 3. Local AI (Transformers.js)
- **Status**: Enabled via \@xenova/transformers\ running locally.
- **Offline Capabilities**:
  - Automatically classifies photos without an internet connection.
  - Can identify Brick vs Siding, detect Tempered Glass risks (e.g., bathrooms), and append smart notes.
  - Features rule-based measurement warnings.
- **Installation**: Sales Reps can navigate to the **Surface Settings** page and click "Download Local AI Pack" to install the vision model payload.

## 4. Updates & Protections
- **Updates**: The app checks for updates automatically via \electron-updater\.
- **Protection**: Updates are hard-blocked by the UI if there is any unsynced offline data to prevent data-wiping edge cases during migrations.

## 5. Offline Documents
- The app generates editable Excel Workbooks using a bundled \tr-window-contract-template.xlsx\.
- All outputs securely map to \gpearson@winworldinfo.com\ for customer-facing documents.
