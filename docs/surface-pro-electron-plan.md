# Surface Pro Electron Plan

## Architecture Decision
Window World Assistant will use an Electron wrapper for the Windows Surface Pro environment. This provides a unified codebase for the web, iPad (PWA/Capacitor), and Windows Desktop.

### Storage Strategy
- **SQLite Database**: Electron will use a local SQLite database file to persist the offline data. 
- **Schema Parity**: The SQLite schema will directly mirror the Dexie IndexedDB schema used in the web/mobile PWA. This ensures that the sync engine logic (`syncEngine.ts`) can be reused across all platforms by abstracting the storage layer behind a common interface.

### Sync Flow
1. The React frontend interacts with a unified `getOfflineDb()` interface.
2. In the Electron environment, `getOfflineDb()` routes queries to SQLite via IPC channels (`window.electronAPI.query(...)`).
3. The sync engine continuously drains the `sync_outbox` table, sending changes to the Supabase cloud.
4. Any conflicts are logged in the `sync_conflicts` table for manual resolution.

### Implementation Status
**NOT COMPLETE**: Implementing the Electron SQLite adapter and building the Windows executable is out of scope for this immediate phase, to ensure a safe build of the web/mobile offline capabilities without introducing desktop build pipeline dependencies.

### Next Steps for Desktop
1. Set up Electron forge or builder.
2. Implement IPC bridge in `preload.js` to expose `better-sqlite3`.
3. Create an SQLite adapter class that implements the Dexie Table interface for drop-in compatibility.
