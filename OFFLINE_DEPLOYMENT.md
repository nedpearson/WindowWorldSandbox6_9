# WindowWorldAssistant — Offline-First Production Deployment Guide

> **Scope:** WindowWorldAssistant field sales app only. Do not apply to other projects.

---

## Architecture Overview

The app uses a **three-layer offline-first architecture**:

```
Field Device (iPad / iPhone / Surface Pro / Desktop Browser / Electron)
  └─ Dexie v2 IndexedDB ("wwa-offline-v1")
       ├── appointments_cache      — full appointment snapshots
       ├── customers_cache         — customer records
       ├── id_mapping              — localId → cloudId after sync
       ├── sketches_cache          — house map + markers
       ├── sync_outbox             — pending changes queue (idempotent)
       ├── sync_conflicts          — server-detected conflicts
       ├── offline_signatures      — captured signatures (offline contract signing)
       ├── photo_blob_queue        — photo blobs (binary, not base64)
       ├── pricing_cache           — pricing tables + rules (TTL: 24h)
       ├── field_manual_cache      — field manual + training text (TTL: 7 days)
       └── device_meta             — device state + offline-ready status

Server (Express + Prisma + PostgreSQL/Supabase)
  ├── POST /api/sync/pull          — pull delta changes (customers, appts, openings, sketches, tombstones)
  ├── POST /api/sync/push          — push outbox batch (up to 50 items, idempotent)
  ├── POST /api/sync/register-device
  ├── POST /api/sync/resolve-conflict
  ├── POST /api/sync/cleanup-idempotency   (admin-only)
  └── GET  /api/sync/status

Storage (Supabase Storage)
  └── field-photos bucket         — photos uploaded via /api/documents/photos
```

---

## Required Environment Variables

### Server (`server/.env`)
```env
DATABASE_URL=postgresql://...    # Supabase connection string (pooling)
DIRECT_URL=postgresql://...      # Supabase direct connection (for migrations)
JWT_SECRET=<secret>              # Must be ≥ 32 chars, never commit to git
SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_ROLE_KEY=<key>  # SERVER SIDE ONLY — never expose to frontend
MAPBOX_SECRET_TOKEN=sk.ey...     # SERVER SIDE ONLY
NODE_ENV=production
PORT=3001
```

### Frontend (`apps/web/.env`)
```env
VITE_API_URL=https://api.wwassistant.bridgebox.ai
VITE_MAPBOX_PUBLIC_TOKEN=pk.ey...   # Public token only — safe to expose
```

> ⚠️ **NEVER put `SUPABASE_SERVICE_ROLE_KEY` or `MAPBOX_SECRET_TOKEN` in the frontend env file.**

---

## Supabase Migration Steps

Run migrations in order:

```bash
cd server

# 1. Generate Prisma client
npx prisma generate

# 2. Apply all migrations (use DIRECT_URL for migration runs)
DATABASE_URL=$DIRECT_URL npx prisma migrate deploy

# 3. Verify
npx prisma validate
```

### New migration (2026-05-31): `20260531_offline_sync_idempotency`
This migration:
- Adds `localId`, `version`, `deletedAt` to `Customer`, `Appointment`, `Opening`
- Adds `fileHash`, `idempotencyKey` to `OpeningPhoto`
- Creates `SyncIdempotencyKey` table (replaces AuditLog text-search idempotency)

All changes are **additive and non-breaking** — safe to apply on a live database.

---

## Supabase Storage Setup

Ensure the `field-photos` bucket exists:

1. Go to Supabase Dashboard → Storage
2. Create bucket: `field-photos`
3. Set bucket to **private** (access via service role key server-side only)
4. Add RLS policies for the bucket:
   ```sql
   -- Allow authenticated users to upload to their company path
   CREATE POLICY "Company upload" ON storage.objects FOR INSERT
     WITH CHECK (bucket_id = 'field-photos' AND auth.role() = 'authenticated');
   ```

---

## Supabase RLS Notes

The following tables have RLS enabled:

| Table | RLS Policy |
|---|---|
| `Customer` | companyId must match user's company |
| `Appointment` | userId must match OR user is manager/admin |
| `Opening` | via appointment's userId |
| `SyncIdempotencyKey` | companyId must match user's company |
| `OpeningPhoto` | via appointment's userId |

To verify RLS is enabled:
```sql
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;
```

---

## Resetting Local Cache Safely

### For a Field Rep (self-service)
1. Navigate to `https://wwassistant.bridgebox.ai/update`
2. This unregisters service workers and clears the PWA cache
3. Log out and back in to re-warm the offline cache

### For IT Admin
Open browser DevTools → Application → Storage → Clear Site Data (check IndexedDB)

Or from the Electron app, open DevTools (Ctrl+Shift+I) and run:
```javascript
indexedDB.deleteDatabase('wwa-offline-v1');
```

---

## Diagnosing Stuck Sync

### Check pending outbox count (frontend)
Open browser DevTools → Console:
```javascript
const db = new Dexie('wwa-offline-v1');
await db.version(2).stores({ sync_outbox: '++id, status' });
await db.open();
const items = await db.sync_outbox.where('status').anyOf(['pending', 'failed']).toArray();
console.table(items.map(i => ({ id: i.id, type: i.entityType, op: i.operation, status: i.status, error: i.lastError, retries: i.retryCount })));
```

### Force retry failed items
```javascript
await db.sync_outbox.where('status').equals('failed').modify({ status: 'pending', retryCount: 0, lastError: null });
```

### Check idempotency table health (admin SQL)
```sql
SELECT entity_type, operation, COUNT(*) as count
FROM "SyncIdempotencyKey"
WHERE "expiresAt" > NOW()
GROUP BY entity_type, operation
ORDER BY count DESC;
```

### Clean up expired idempotency keys (admin API)
```bash
curl -X POST https://api.wwassistant.bridgebox.ai/api/sync/cleanup-idempotency \
  -H "Authorization: Bearer <admin_jwt>"
```

---

## Repairing Conflicts

Conflicts are stored in:
- **Client**: Dexie `sync_conflicts` table
- **Server**: AuditLog with `action = 'conflict_resolved'`

### View conflicts in DevTools
```javascript
const conflicts = await db.sync_conflicts.where('resolution').equals(undefined).toArray();
console.table(conflicts);
```

### Resolve via API
```bash
curl -X POST https://api.wwassistant.bridgebox.ai/api/sync/resolve-conflict \
  -H "Authorization: Bearer <rep_jwt>" \
  -H "Content-Type: application/json" \
  -d '{"entityType":"opening","entityCloudId":"<id>","resolution":"keep_local","localValue":"{...}"}'
```

---

## Offline Signing Flow

When a field rep captures a signature while offline:
1. Signature `data:image/png;base64,...` is stored in Dexie `offline_signatures` table
2. The contract draft JSON is stored alongside it
3. Status is `pending`
4. On reconnect, `drainWithPull()` → outbox drain includes signature upload via `POST /api/sync/push` with `entityType: 'signature'`
5. The server logs the signature to `AuditLog` and marks `status: uploaded`
6. A full contract PDF generation is then triggered via `POST /api/documents/contract/:appointmentId/generate`

> ⚠️ Offline-captured contracts are marked **"Pending Sync"** in the UI until the server confirms them. Field reps must reconnect and sync before the PDF is available.

---

## Photo Upload Flow (Offline → Supabase)

1. Field rep captures photo on device
2. Photo Blob stored in Dexie `photo_blob_queue` with:
   - `fileHash` (SHA-256 for dedup)
   - `status: 'queued'`
3. On reconnect, `drainPhotoQueue()` in `syncEngine.ts` uploads each photo:
   - `POST /api/documents/photos` (multipart)
   - Server stores in Supabase Storage and returns `cloudUrl`
4. `cloudUrl` written back to Dexie entry; status updated to `uploaded`
5. Same photo hash will not upload twice (deduplication check)

---

## Known Limitations

| Limitation | Workaround |
|---|---|
| Mapbox tile layers require internet | Offline tile caching not implemented — roads won't display when offline |
| YouTube videos in field manual require internet | Text content and quiz questions still available offline |
| PDF generation requires server | Offline signatures sync and generate PDF on reconnect |
| Contract pricing revalidation | Always revalidated server-side on reconnect |
| Photos > 50MB may timeout | Compress photos before upload; max 10MB per photo recommended |

---

## Offline-Ready Status Meanings

| Status | Meaning |
|---|---|
| 🔴 Not Ready | No offline cache — must be online to view appointments |
| 🟡 Syncing... | Cache warming in progress |
| 🟢 Offline Ready | All field data cached — can work fully offline |
| 🟠 Offline Ready* | Cached but some data (e.g., pricing) may be stale |
| ❌ Sync Failed | Cache warming failed — check internet connection |

---

## Electron Desktop App

The desktop app (`apps/desktop`) is a **pure Chromium shell** that loads:
- Production: `https://wwassistant.bridgebox.ai`
- Development: `ELECTRON_START_URL` env override

All offline storage (IndexedDB/Dexie) is managed by the web app within Chromium. The desktop app requires **no separate sync configuration**.

---

## CI/CD Checklist

Before deploying to production:

```bash
# 1. Validate schema
cd server && npx prisma validate

# 2. TypeScript — server
npm run typecheck --workspace=server

# 3. TypeScript — web
npm run typecheck --workspace=apps/web

# 4. Lint
npm run lint --workspace=apps/web

# 5. Tests
npm test --workspace=server

# 6. Build
npm run build --workspace=apps/web
```
