# Deploying WindowWorldAssistant — Use Without Your Laptop

This guide gets the app running at a permanent public URL so your phone works
anywhere, with no laptop required after the first install.

---

## Option A — Railway (Easiest, ~5 minutes)

Railway is the fastest path — one click, free tier available.

1. Go to https://railway.app and sign in with GitHub
2. Click **"New Project" → "Deploy from GitHub repo"**
3. Select `nedpearson/WindowWorldAssistant`
4. Railway auto-detects the Dockerfile — click **Deploy**
5. Go to **Settings → Domains** → click **Generate Domain**
6. You'll get a URL like `https://windowworldassistant-production.up.railway.app`

**Add environment variables** (Settings → Variables):
```
DATABASE_URL        = (copy from your .env)
DIRECT_URL          = (copy from your .env)
JWT_SECRET          = (copy from your .env)
NODE_ENV            = production
PORT                = 8080
```

---

## Option B — Render (Free tier, always-on)

1. Go to https://render.com → New → Web Service
2. Connect your GitHub repo `nedpearson/WindowWorldAssistant`
3. Set:
   - **Runtime:** Docker
   - **Port:** 8080
4. Add the same environment variables from your `.env`
5. Deploy → you'll get `https://windowworldassistant.onrender.com`

> ⚠️ Free tier sleeps after 15 min. Use the $7/mo "Starter" plan for always-on.

---

## Option C — Google Cloud Run (Scalable, pay-per-use)

```powershell
# One-time setup
gcloud auth login
gcloud config set project YOUR_GCP_PROJECT

# Build and deploy
gcloud builds submit --tag gcr.io/YOUR_PROJECT/wwa .
gcloud run deploy wwa \
  --image gcr.io/YOUR_PROJECT/wwa \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL="...",JWT_SECRET="...",NODE_ENV=production
```

---

## After Deploying — Install on Your Phone

Once the app is live at a public URL:

### iPhone (Safari)
1. Open the URL in Safari
2. Tap the **Share** button (box with arrow)
3. Tap **"Add to Home Screen"**
4. Tap **Add** — the app icon appears on your home screen
5. Open it — it runs like a native app, full screen, no browser bar

### Android (Chrome)
1. Open the URL in Chrome
2. Chrome shows a banner "Add WindowWorldAssistant to Home screen" — tap it
3. Or: tap ⋮ menu → "Add to Home screen"
4. The app icon appears on your home screen

---

## How Offline Works (After Install)

The Service Worker caches everything on first load:

| Data | Strategy | Works Offline? |
|---|---|---|
| App UI (JS/CSS) | Pre-cached on install | ✅ Always |
| Appointments list | StaleWhileRevalidate (7 days) | ✅ Last seen |
| Openings/measurements | StaleWhileRevalidate (7 days) | ✅ Last seen |
| Order forms | StaleWhileRevalidate (3 days) | ✅ Last seen |
| Pricing/rules | StaleWhileRevalidate (1 day) | ✅ Last seen |
| Dashboard | NetworkFirst (5s timeout) | ✅ Falls back to cache |
| Voice/AI parsing | NetworkOnly | ❌ Requires connection |
| PDF export | NetworkOnly | ❌ Requires connection |

**Notes/measurements you enter while offline** → saved to local storage via the sync queue → automatically uploaded when you reconnect.

---

## Local Build Test (Verify Before Deploying)

```powershell
# From repo root
cd apps\web
npm run build     # builds to apps/web/dist

cd ..\..\server
npm run build     # compiles to server/dist

# Copy frontend into server's static dir
xcopy ..\apps\web\dist .\dist\public /E /I

# Test the production bundle locally
$env:NODE_ENV = "production"
$env:PORT = "8080"
node dist/index.js
# → open http://localhost:8080
```
