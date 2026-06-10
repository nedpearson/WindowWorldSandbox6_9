# Railway Deployment Fix

**Date:** 2026-05-15  
**Status:** Fixed  

## Root Cause

Railway deployment failed at **Deploy → Create Container** with:

```
The executable `cd` could not be found.
```

### Why It Happened

The `railway.toml` had a `startCommand` that overrode the Dockerfile's `CMD`:

```toml
startCommand = "cd server && npx prisma migrate deploy && node dist/index.js"
```

Railway's container runtime executes `startCommand` using **exec**, not through a shell.
Since `cd` is a shell builtin (not a standalone binary), the container failed to start.

## Fix Applied

### 1. Removed `startCommand` from `railway.toml`

The Dockerfile already has the correct `CMD`:
```dockerfile
CMD ["node", "server/dist/index.js"]
```

By removing `startCommand`, Railway uses the Dockerfile's CMD, which runs correctly.

### 2. Server binds to `0.0.0.0`

Changed from:
```ts
app.listen(PORT, () => { ... });
```
To:
```ts
app.listen(Number(PORT), '0.0.0.0', () => { ... });
```

Railway's proxy requires the server to listen on all interfaces, not just localhost.

### 3. Enhanced health check

`/api/health` now returns service name, environment, and uptime for monitoring.

## Railway Configuration

### railway.toml
```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

### Required Railway Environment Variables

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | ✅ | Supabase connection string (with pgbouncer) |
| `DIRECT_URL` | ✅ | Supabase direct connection (for migrations) |
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Server-only, never in frontend |
| `JWT_SECRET` | ✅ | Must NOT be `dev-secret-change-me` |
| `PORT` | Auto | Railway sets this automatically |
| `NODE_ENV` | Auto | Set to `production` in Dockerfile |

### How to Verify Deployment

```bash
curl https://windowworld.bridgebox.ai/api/health
```

Expected response:
```json
{
  "ok": true,
  "service": "WindowWorldAssistant",
  "timestamp": "2026-05-15T...",
  "env": "production",
  "uptime": 42
}
```

## Architecture

```
Dockerfile (multi-stage):
  Stage 1: npm ci (all deps)
  Stage 2: prisma generate
  Stage 3: vite build (frontend)
  Stage 4: tsc (server)
  Stage 5: production runtime
    /app/server/dist/index.js  ← server entry
    /app/server/dist/public/   ← built frontend (SPA)
    /app/server/prisma/        ← prisma schema
    /app/reference-documents/  ← warranty/disclosure PDFs
    /app/server/templates/     ← Excel templates
```
