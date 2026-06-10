# Railway Environment Variables Guide

All environment variables required for the WindowWorldAssistant Railway deployment.

> **Rule**: Never commit real values to source control. Set all variables in the
> Railway service dashboard: **Project → Service → Variables**.

---

## Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Supabase pooler connection string (PgBouncer) | `postgresql://postgres.[REF]:[PASS]@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | Supabase direct connection string (for migrations) | `postgresql://postgres.[REF]:[PASS]@aws-1-us-east-2.pooler.supabase.com:5432/postgres` |
| `JWT_SECRET` | Strong random secret for auth tokens (min 32 chars) | `openssl rand -hex 32` |

---

## Supabase Variables

| Variable | Description | Where Used |
|----------|-------------|------------|
| `SUPABASE_URL` | Supabase project URL | Server-side storage, document uploads |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Server-side only — **never expose** |

---

## Mapbox (Property Maps)

| Variable | Description | Where Used |
|----------|-------------|------------|
| `MAPBOX_PUBLIC_TOKEN` | Mapbox public token (`pk.*`) | Server → `/api/config/public` → frontend maps |
| `VITE_MAPBOX_PUBLIC_TOKEN` | Same token, baked into Vite bundle at build time | Frontend build-time (optional if MAPBOX_PUBLIC_TOKEN is set) |

**Token resolution order** (server `/api/config/public` endpoint):
1. `MAPBOX_PUBLIC_TOKEN` (Railway env)
2. `MAPBOX_TOKEN` (alias)
3. `VITE_MAPBOX_PUBLIC_TOKEN` (Vite build-time)
4. Hardcoded fallback (public token committed in server code)

**Token resolution order** (startup config logging):
Same chain as above. Logs report `source: env` or `source: hardcoded-fallback`.

> **Note**: Mapbox `pk.*` tokens are public and browser-safe. Restrict by domain
> in the [Mapbox dashboard](https://account.mapbox.com/access-tokens/) for security.

### How to set in Railway

```
MAPBOX_PUBLIC_TOKEN = pk.eyJ1Ijoi...your-token-here
```

---

## Google Maps (Optional)

| Variable | Description | Where Used |
|----------|-------------|------------|
| `GOOGLE_MAPS_API_KEY` | Google Maps server-side key | Server geocoding, street view (never sent to browser) |
| `VITE_GOOGLE_MAPS_BROWSER_KEY` | Google Maps JS API browser key | Frontend aerial map — also served via `/api/config/public` at runtime |

---

## AI / Gemini (Optional)

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key for AI features |
| `AI_CREDITS_ENABLED` | Enable credit system (default: `true`) |
| `AI_DEFAULT_MONTHLY_CREDITS` | Monthly credits per company (default: `1000`) |

---

## Storage Buckets (Optional)

| Variable | Default | Purpose |
|----------|---------|---------|
| `STORAGE_BUCKET_PHOTOS` | `wwa-opening-photos` | Opening photos |
| `STORAGE_BUCKET_EXPORTS` | `wwa-form-exports` | Form/document exports |
| `STORAGE_BUCKET_RECORDINGS` | `wwa-voice-recordings` | Voice recordings |
| `STORAGE_BUCKET_SKETCHES` | `wwa-sketches` | Sketch images |

---

## Variables NOT Required in Railway

These are development-only or handled differently in production:

| Variable | Reason |
|----------|--------|
| `PORT` | Set to `8080` in Dockerfile |
| `NODE_ENV` | Set to `production` in Dockerfile |
| `APP_BASE_URL` | Derived from Railway domain |
| `FRONTEND_URL` | Derived from Railway domain |

---

## Verifying Configuration

After setting variables, redeploy and check startup logs:

```
🪟 WindowWorldAssistant on :8080 [PROD]
[config] Mapbox public token configured: true (source: env)
[config] env MAPBOX_PUBLIC_TOKEN set: true
```

If you see `source: hardcoded-fallback`, the token is working but consider
setting `MAPBOX_PUBLIC_TOKEN` in Railway for explicit control.

If you see `WARNING: No Mapbox token found`, maps will not load — add the token.
