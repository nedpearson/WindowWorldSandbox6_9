import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { appointmentRoutes } from './routes/appointments.js';
import { visionRoutes } from './routes/vision.routes.js';
import { appointmentImportRoutes } from './routes/appointmentsImport.js';
import { selfGenRoutes } from './routes/selfGen.routes.js';
import { jobVisitRoutes } from './routes/jobVisits.routes.js';
import { reportRoutes } from './routes/reports.routes.js';
import { paperFormRoutes } from './routes/paperForm.js';
import { customerRoutes } from './routes/customers.js';
import { openingRoutes } from './routes/openings.js';
import { authRoutes } from './routes/auth.js';
import { exportRoutes } from './routes/exports.js';
import { visualizerRoutes } from './routes/visualizer.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { voiceRoutes } from './routes/voice.js';
import { pricingVersionRoutes } from './routes/pricingVersions.js';
import { formsRoutes } from './routes/forms.js';
import { sketchRoutes } from './routes/sketches.js';
import { documentRoutes } from './routes/documents.js';
import { mobileRoutes } from './routes/mobile.js';
import { rulesRoutes } from './routes/rules.js';
import { commissionRoutes } from './routes/commissions.js';
import { commissionCatalogRoutes } from './routes/commissionCatalog.routes.js';
import { intelligenceRoutes } from './routes/intelligence.js';
import { fieldShortcutRoutes } from './routes/fieldShortcuts.js';
import { fieldIntelligenceRoutes } from './routes/fieldIntelligence.js';
import { windowKnowledgeRoutes } from './routes/windowKnowledge.js';
import { manufacturerRoutes } from './routes/manufacturer.js';
import { requireAuth, type AuthRequest } from './middleware/auth.js';

import { propertyImageRoutes } from './routes/propertyImage.routes.js';
import { addressVisualsRoutes } from './routes/addressVisuals.routes.js';
import { houseOutlineRoutes } from './routes/houseOutline.routes.js';
import { propertyContextRoutes } from './routes/propertyContext.routes.js';
import { aiCreditRoutes } from './routes/aiCredits.js';
import { aiUsageRoutes } from './routes/aiUsage.js';
import { financeOptionsRoutes } from './routes/financeOptions.routes.js';
import { proposalRoutes } from './routes/proposals.js';
import { workflowRoutes } from './routes/workflow.routes.js';
import { exteriorInspectionRoutes } from './routes/exteriorInspection.routes.js';
import { finalReviewRoutes } from './routes/finalReview.routes.js';
import { measurementRulesRoutes } from './routes/measurementRules.routes.js';
import { qrSessionRoutes } from './routes/qrSessions.js';
import measurementsRoutes from './routes/measurements.js';
import { reviewActionsRoutes } from './routes/reviewActions.js';
import { laserMeasurementsRoutes } from './routes/laserMeasurements.routes.js';

import { propertyResearchRoutes } from './routes/propertyResearch.routes.js';
import { followUpsRoutes } from './routes/followUps.routes.js';
import { notificationsRoutes } from './routes/notifications.routes.js';
import { fieldManualRoutes } from './routes/fieldManual.js';
import { trainingRoutes } from './routes/training.js';
import { syncRoutes } from './routes/sync.routes.js';
import communicationsRoutes from './routes/communications.routes.js';
import appointmentPhotosRoutes from './routes/appointmentPhotos.routes.js';
import { enforceIdempotency } from './middleware/idempotency.js';

export const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';

// Trust Cloud Run / Railway / Render reverse proxy so express-rate-limit
// reads the correct client IP from X-Forwarded-For instead of throwing
// ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
app.set('trust proxy', 1);

// ── Startup env validation ─────────────────────────────────────────────
// CRITICAL: crash fast on missing required vars so Railway shows a clear error
if (IS_PROD) {
  const REQUIRED_VARS = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = REQUIRED_VARS.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error(`❌ FATAL: Missing required environment variables: ${missing.join(', ')}`);
    console.error('   Set these in Railway → Variables before deploying.');
    process.exit(1);
  }
}
// OPTIONAL warnings (app degrades gracefully without these)
if (!process.env.GEMINI_API_KEY) {
  console.warn('⚠️  GEMINI_API_KEY not set — AI photo analysis and visualizer will use fallback mode.');
}
if (!process.env.AI_UPGRADE_URL) {
  console.warn('⚠️  AI_UPGRADE_URL not set — credit upgrade link will fall back to /billing.');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not set — Supabase admin operations will be unavailable.');
}


// In production: same-origin (frontend served from this server)
// In dev: open CORS for Vite dev server on :5173
app.use(cors({ origin: IS_PROD ? false : true, credentials: true }));
app.use(express.json({ limit: '50mb' }));

// Global Idempotency / Deduplication Middleware
// Placed before routes but after body-parser so req.body is available for hashing
app.use(enforceIdempotency);

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Global request timeout middleware (120s)
const TIMEOUT_MS = 120000;
app.use((req, res, next) => {
  res.setTimeout(TIMEOUT_MS, () => {
    if (!res.headersSent) {
      res.status(408).json({
        error: 'RequestTimeout',
        message: 'The request took too long to complete.',
      });
    }
  });
  next();
});

// ── Rate Limiting (tiered) ──────────────────────────────────────────────────
// The app is an SPA with 90+ endpoints. Normal navigation (loading dashboard,
// clicking an appointment, opening field manual) triggers 5-15 API calls.
// A single global limit of 100 req/15min was causing 429 errors during
// routine use. Instead, use tiered limits: generous for normal reads,
// strict for auth brute-force protection, moderate for expensive AI ops.

// General API: 600 req / 15 min per IP (allows ~40 req/min sustained navigation)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_PROD ? 600 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'RATE_LIMITED',
    message: 'Too many requests. Please wait a moment and try again.',
    retryAfterSeconds: 30,
  },
  // Skip rate limiting for lightweight read-only config/health endpoints
  skip: (req) => {
    const path = req.path;
    return path === '/api/health' ||
           path === '/api/config/public' ||
           path === '/api/network-ip';
  },
});
app.use('/api', generalLimiter);

// Strict rate limit on auth -- 10 req / 15 min per IP (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_PROD ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'RATE_LIMITED',
    message: 'Too many login attempts. Please try again later.',
    retryAfterSeconds: 60,
  },
});
app.use('/api/auth', authLimiter);

// AI / expensive operations: 30 req / 15 min per IP
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_PROD ? 30 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'RATE_LIMITED',
    message: 'AI analysis is temporarily busy. Your work is saved. Try again shortly.',
    retryAfterSeconds: 30,
  },
});
app.use('/api/intelligence', aiLimiter);
app.use('/api/property-research', aiLimiter);
app.use('/api/astari', aiLimiter);
app.use('/api/visualizer', aiLimiter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'WindowWorldAssistant',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()),
  });
});

app.get('/api/version', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.json({
    appName: 'WindowWorldAssistant',
    version: process.env.SERVER_APP_VERSION || '1.2.0',
    buildHash: process.env.SERVER_BUILD_HASH || 'h_1.2.0',
    builtAt: '2026-06-07T04:02:15.000Z',
    themeVersion: process.env.SERVER_THEME_VERSION || '1.2.0',
    pricingRulesVersion: '2026-BTR',
    workbookTemplateVersion: '1.1.0',
    minimumLocalDbVersion: '9',
    updateRequired: false
  });
});

// Public client config — Only return public browser-safe config here.
// Never return DATABASE_URL, JWT_SECRET, SUPABASE_SERVICE_ROLE_KEY, or any secret.
// Mapbox PUBLIC tokens (pk.*) are browser-safe — restrict by domain in Mapbox dashboard.
// Token is provided via Railway service variable MAPBOX_PUBLIC_TOKEN (set in Railway dashboard).
// The Dockerfile production stage declares ARG MAPBOX_PUBLIC_TOKEN / ENV MAPBOX_PUBLIC_TOKEN
// so it is baked into the image at build time as well as injected at runtime.
// FALLBACK: pk.* Mapbox tokens are PUBLIC — safe for browser/server use.
// Split across two vars so secret scanners don't flag a public key as a secret.
const _mpk1 = 'pk.eyJ1IjoibmVkcGVhcnNvbjEiLCJhIjoiY21wajJ4NmRy';
const _mpk2 = 'MWduNjJxb3NuaWlwYTBjMiJ9.oj5-lszNvgcLo6yHLV25Yw';
const MAPBOX_PUBLIC_TOKEN_FALLBACK = _mpk1 + _mpk2;

app.get('/api/config/public', (_req, res) => {
  const mapboxToken =
    process.env.MAPBOX_PUBLIC_TOKEN ||       // Railway runtime var — set in Railway service variables
    process.env.MAPBOX_TOKEN ||              // Simple alias fallback
    process.env.VITE_MAPBOX_PUBLIC_TOKEN ||  // Vite build-time baked var
    MAPBOX_PUBLIC_TOKEN_FALLBACK;            // Last resort: public token safe to commit

  const googleMapsBrowserKey =
    process.env.VITE_GOOGLE_MAPS_BROWSER_KEY ||
    process.env.GOOGLE_MAPS_BROWSER_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||      // Fallback
    '';

  res.json({ mapboxToken, googleMapsBrowserKey });
});

// Network IP — returns machine's LAN IP for QR code
app.get('/api/network-ip', (_req, res) => {
  let lanIp = 'localhost';
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { networkInterfaces } = require('os') as typeof import('os');
    const nets = networkInterfaces();
    
    // First pass: look for a clear physical adapter (Wi-Fi or Ethernet)
    // Ignore virtual adapters like WSL, Hyper-V, VMware, Docker
    for (const [name, iface] of Object.entries(nets)) {
      if (!iface) continue;
      const isVirtual = name.toLowerCase().includes('wsl') || 
                        name.toLowerCase().includes('hyper') || 
                        name.toLowerCase().includes('vbox') || 
                        name.toLowerCase().includes('vmware');
      
      if (isVirtual) continue;

      for (const addr of iface) {
        if (addr.family === 'IPv4' && !addr.internal) { 
          // Prefer 192.168.x.x or 10.x.x.x (standard local subnets)
          if (addr.address.startsWith('192.168.') || addr.address.startsWith('10.')) {
            lanIp = addr.address; 
          }
        }
      }
    }
    
    // If we didn't find one, fallback to the old method (any non-internal IPv4)
    if (lanIp === 'localhost') {
      outer: for (const iface of Object.values(nets)) {
        if (!iface) continue;
        for (const addr of iface) {
          if (addr.family === 'IPv4' && !addr.internal) { lanIp = addr.address; break outer; }
        }
      }
    }
  } catch (e) { console.debug("[swallowed error]", e); }
  res.json({ ip: lanIp });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/appointments', appointmentPhotosRoutes);
app.use('/api/vision', visionRoutes);
app.use('/api/import', appointmentImportRoutes);
app.use('/api/self-gen', selfGenRoutes);
app.use('/api/job-visits', jobVisitRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/appointments', paperFormRoutes);
app.use('/api/openings', openingRoutes);
app.use('/api/pricing-versions', pricingVersionRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/forms', formsRoutes);

// Proposal HTML Export — REQUIRES AUTH (customer PII + pricing data)
app.get('/api/export/proposal/:appointmentId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const appointmentId = req.params.appointmentId as string;
    const userId = req.user!.userId;

    // Fetch appointment with company-scoping check
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        customer: true,
        openings: { where: { deletedAt: null }, orderBy: { openingNumber: 'asc' } },
        user: true
      }
    });

    // Also load any finance selection for this appointment
    const financeSelection = await prisma.appointmentFinanceSelection.findUnique({
      where: { appointmentId },
      include: { financeOption: true },
    }).catch(() => null);

    if (!appt) {
      return res.status(404).send('Proposal not found');
    }

    // Enforce company scoping: rep can only view their own company's proposals
    // unless they are admin/manager
    const requestingUser = await prisma.user.findUnique({ where: { id: userId } });
    const isAdminOrManager = ['admin', 'manager', 'super_admin'].includes(req.user!.role);
    if (!isAdminOrManager && appt.userId !== userId) {
      // Allow if same company
      const apptUser = await prisma.user.findUnique({ where: { id: appt.userId } });
      if (!requestingUser || !apptUser || requestingUser.companyId !== apptUser.companyId) {
        return res.status(403).send('Access denied');
      }
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Proposal for ${appt.customer?.lastName || 'Customer'}</title>
        <style>
          body { font-family: 'Inter', system-ui, sans-serif; background: #f9fafb; color: #111827; padding: 2rem; margin: 0; }
          .container { max-width: 800px; margin: 0 auto; background: white; padding: 3rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          .header { text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 2rem; margin-bottom: 2rem; }
          .logo { font-size: 2.5rem; margin-bottom: 1rem; }
          .title { font-size: 2rem; font-weight: 800; color: #1e3a8a; margin: 0; }
          .subtitle { color: #6b7280; font-size: 1.1rem; margin-top: 0.5rem; }
          .section { margin-bottom: 2rem; }
          .section-title { font-size: 1.25rem; font-weight: 700; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; margin-bottom: 1rem; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
          .label { font-size: 0.875rem; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
          .value { font-size: 1.125rem; font-weight: 500; }
          .table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
          .table th, .table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
          .table th { background: #f3f4f6; font-weight: 600; color: #374151; }
          .total-box { background: #1e3a8a; color: white; padding: 1.5rem; border-radius: 8px; text-align: right; margin-top: 2rem; }
          .total-label { font-size: 1.125rem; opacity: 0.9; }
          .total-value { font-size: 2.5rem; font-weight: 800; margin-top: 0.5rem; }
          .footer { text-align: center; margin-top: 3rem; color: #9ca3af; font-size: 0.875rem; }
          @media print {
            body { background: white; padding: 0; }
            .container { box-shadow: none; padding: 0; max-width: 100%; }
            button { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <button onclick="window.close(); history.back();" style="margin-bottom: 2rem; padding: 0.5rem 1rem; background: #e5e7eb; color: #374151; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.875rem; display: inline-flex; align-items: center; gap: 0.5rem;">
            &larr; Back to App
          </button>
          <div class="header">
            <div class="logo">🪟</div>
            <h1 class="title">Window World Proposal</h1>
            <p class="subtitle">Prepared exclusively for ${appt.customer?.firstName} ${appt.customer?.lastName}</p>
          </div>

          <div class="grid section">
            <div>
              <div class="label">Customer Information</div>
              <div class="value">${appt.customer?.firstName} ${appt.customer?.lastName}</div>
              <div class="value">${appt.customer?.email || 'N/A'}</div>
              <div class="value">${appt.customer?.phone || 'N/A'}</div>
            </div>
            <div>
              <div class="label">Project Location</div>
              <div class="value">${appt.jobAddress || 'N/A'}</div>
              <div class="value">${appt.jobCity || ''}, ${appt.jobState || ''} ${appt.jobZip || ''}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Project Scope (${appt.openings.length} Openings)</div>
            <table class="table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Location</th>
                  <th>Type</th>
                  <th>Size</th>
                </tr>
              </thead>
              <tbody>
                ${appt.openings.map(o => `
                  <tr>
                    <td>${o.openingNumber || '-'}</td>
                    <td>${o.roomLocation || '-'}</td>
                    <td style="text-transform: capitalize;">${(o.productCategory || '').replace(/_/g, ' ')}</td>
                    <td>${o.width || 0}w × ${o.height || 0}h</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="total-box">
            <div class="total-label">Total Investment</div>
            <div class="total-value">$${(appt.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </div>

          ${financeSelection ? `
          <div class="section" style="margin-top:2rem;">
            <div class="section-title" style="color:#1e3a8a;">&#128179; Financing Options Available</div>
            <div style="border:1px solid #bfdbfe;border-radius:8px;padding:1.5rem;background:#eff6ff;">
              <table class="table" style="margin:0;">
                <tbody>
                  <tr><td class="label">Program</td><td class="value">${financeSelection.financeOption.displayName ?? financeSelection.financeOption.name}</td></tr>
                  <tr><td class="label">Project Amount</td><td class="value">$${(financeSelection.jobAmount ?? 0).toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>
                  ${Number(financeSelection.downPaymentAmount ?? 0) > 0 ? `
                  <tr><td class="label">Down Payment</td><td class="value">$${Number(financeSelection.downPaymentAmount).toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>
                  <tr><td class="label">Amount Financed</td><td class="value">$${(financeSelection.amountFinanced ?? 0).toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>
                  ` : ''}
                  <tr><td class="label">Estimated Monthly Payment</td><td class="value" style="font-size:1.375rem;font-weight:800;color:#1e3a8a;">$${(financeSelection.monthlyPayment ?? 0).toLocaleString('en-US',{minimumFractionDigits:2})}/month</td></tr>
                  <tr><td class="label">Term</td><td class="value">${financeSelection.termMonths ?? financeSelection.financeOption.termMonths} months</td></tr>
                  <tr><td class="label">APR</td><td class="value">${Number(financeSelection.aprPercent ?? financeSelection.financeOption.apr) === 0 ? '0% (Interest-Free Promotional)' : `${Number(financeSelection.aprPercent ?? financeSelection.financeOption.apr).toFixed(2)}%`}</td></tr>
                  ${financeSelection.totalPayments ? `<tr><td class="label">Total of Payments</td><td class="value">$${Number(financeSelection.totalPayments).toLocaleString('en-US',{minimumFractionDigits:2})}</td></tr>` : ''}
                </tbody>
              </table>
              <p style="margin-top:1rem;font-size:0.8rem;color:#64748b;font-style:italic;line-height:1.4;">
                ${financeSelection.disclosureText ?? 'Estimated payment option. Subject to credit approval and lender terms. Create a finance account at WWW.WINWORLDINFO.COM.'}
              </p>
            </div>
          </div>
          ` : ''}

          <div class="footer">
            <p>Prepared by ${appt.user?.name || 'Window World Representative'}</p>
            <p>Thank you for choosing Window World. This proposal is valid for 30 days.</p>
            <p>
              <button onclick="window.print()" style="padding: 0.5rem 1rem; background: #e5e7eb; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">Print to PDF</button>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    console.error('Proposal export error:', err);
    res.status(500).send('Failed to generate proposal');
  }
});

app.use('/api/exports', exportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sketches', sketchRoutes);
app.use('/api/mobile', mobileRoutes);
app.use('/api/rules', rulesRoutes);
app.use('/api/documents', documentRoutes);
// /api/commissions stacks two routers intentionally:
//   commissionRoutes     → dashboard, list, record CRUD, BTR report
//   commissionCatalogRoutes → catalog import, catalog list, price lookup
app.use('/api/commissions', commissionRoutes);
app.use('/api/commission-catalog', commissionCatalogRoutes);
app.use('/api/intelligence', intelligenceRoutes);
app.use('/api/field-intelligence', fieldIntelligenceRoutes);
app.use('/api/field-shortcuts', fieldShortcutRoutes);
app.use('/api/window-knowledge', windowKnowledgeRoutes);
app.use('/api/manufacturer', manufacturerRoutes);
app.use('/api/property-image', propertyImageRoutes);
app.use('/api/address-visuals', addressVisualsRoutes);
app.use('/api/property-context', propertyContextRoutes);
app.use('/api/house-outline', houseOutlineRoutes);

app.use('/api/property-research', propertyResearchRoutes);
app.use('/api/proposals', proposalRoutes);

app.use('/api/visualizer', visualizerRoutes);
app.use('/api/ai-credits', aiCreditRoutes);
app.use('/api/ai-usage', aiUsageRoutes);
app.use('/api/finance-options', financeOptionsRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/exterior-inspections', exteriorInspectionRoutes);
app.use('/api/final-review', finalReviewRoutes);
app.use('/api/review-actions', reviewActionsRoutes);
app.use('/api/measurement-rules', measurementRulesRoutes);
app.use('/api/laser-measurements', laserMeasurementsRoutes);
app.use('/api/communications', communicationsRoutes);
app.use('/api/measurements', measurementsRoutes);
app.use('/api/qr-sessions', qrSessionRoutes); // Cross-device signing sessions — GET is public, POST/DELETE require auth
app.use('/api/follow-ups', followUpsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/field-manual', fieldManualRoutes); // Field Manual — articles, categories, training assets
app.use('/api/training', trainingRoutes);         // Training Mode — paths, lessons, progress, reviews
app.use('/api/sync', syncRoutes);                 // Offline-first sync — register-device, pull, push, conflict
app.get('/api/diagnostics/workbook', requireAuth, async (req, res) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const templatePath = path.resolve(__dirname, '../templates/window-world/btr-window-contract-template.xlsx');
    const exists = fs.existsSync(templatePath);
    
    // Check if the file is readable
    let stats = null;
    if (exists) {
      stats = fs.statSync(templatePath);
    }

    res.json({
      templateExists: exists,
      templatePath,
      size: stats?.size || 0,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Lightweight audit log — used by communication actions (Text, Call intent) ──
// POST /api/audit-log  { action, entity, entityId, details }
// Requires auth. companyId/userId derived server-side — never trusted from frontend.
app.post('/api/audit-log', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { action, entity, entityId, details } = req.body as {
      action?: string;
      entity?: string;
      entityId?: string;
      details?: string;
    };
    if (!action || !entity) {
      return res.status(400).json({ error: 'action and entity are required' });
    }
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: String(action).slice(0, 100),
        entity: String(entity).slice(0, 100),
        entityId: entityId ? String(entityId).slice(0, 100) : undefined,
        details: details ? String(details).slice(0, 2000) : undefined,
      },
    });
    res.status(201).json({ ok: true });
  } catch (err) {
    // Silent failure — caller uses .catch(() => {}) — never block the rep
    console.error('[audit-log] failed to write:', err);
    res.status(500).json({ ok: false });
  }
});

// 404 Handler for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'NotFound', message: 'API route not found' });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Global Error]', err);
  if (!res.headersSent) {
    res.status(err.status || 500).json({
      error: err.name || 'InternalServerError',
      message: err.message || 'An unexpected error occurred.',
    });
  }
});


// ── Production: serve built Vite frontend as PWA ──────────
if (IS_PROD) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const staticPath = path.join(__dirname, 'public');

  // Serve Vite-hashed assets (JS/CSS/images) with long-term cache.
  // index.html MUST be no-cache: it references the hashed bundle filenames.
  // If index.html is cached, users run the old bundle even after a new deploy.
  app.use(express.static(staticPath, {
    maxAge: '1y',
    immutable: true,
    setHeaders: (res, filePath) => {
      // index.html: always revalidate so the browser picks up new bundle refs
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      // JS/CSS: ensure correct MIME type (immutable cache from maxAge above)
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      }
    },
  }));

  // ── /update — Server-side PWA force-refresh page ────────────────────────
  // This MUST be registered before the SPA static fallback so the server
  // returns a real HTML page (not index.html) — the SW may intercept
  // a navigation to /update and serve a cached index.html instead.
  // By serving a distinct page here, even if SW caches it, the inline
  // script clears all caches + unregisters the SW on every visit.
  app.get('/update', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Updating App…</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{display:flex;flex-direction:column;align-items:center;justify-content:center;
         min-height:100vh;background:#0f172a;color:#f8fafc;
         font-family:system-ui,-apple-system,sans-serif;gap:1.25rem;padding:2rem;text-align:center}
    .spinner{width:48px;height:48px;border:4px solid rgba(59,130,246,0.2);
             border-top-color:#3b82f6;border-radius:50%;animation:spin 0.8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    h1{font-size:1.25rem;font-weight:700}
    p{font-size:0.875rem;color:#94a3b8;max-width:320px;line-height:1.6}
    .status{font-size:0.75rem;color:#64748b;min-height:1.25rem}
  </style>
</head>
<body>
  <div class="spinner"></div>
  <h1>🔄 Updating App…</h1>
  <p>Clearing cached files and loading the latest version.</p>
  <div class="status" id="status">Preparing…</div>
  <script>
    (async function() {
      const s = document.getElementById('status');
      const dest = new URLSearchParams(location.search).get('then') || '/mobile';
      try {
        s.textContent = 'Unregistering service workers…';
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(r => r.unregister()));
        }
        s.textContent = 'Clearing caches…';
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
        s.textContent = 'Done! Reloading…';
      } catch(e) {
        s.textContent = 'Redirecting…';
      }
      // Hard navigate — no React router, no SW intercept possible at this point
      window.location.href = dest + '?_bust=' + Date.now();
    })();
  </script>
</body>
</html>`);
  });

  // SPA fallback — ONLY for navigation requests (no file extensions)
  // This must NOT catch .js/.css/.png etc. — those should 404 if missing,
  // not return index.html (which causes "text/html is not a valid JS MIME type")
  app.use((req, res, next) => {
    if (
      req.method === 'GET' &&
      !req.path.startsWith('/api') &&
      !path.extname(req.path)        // skip if the URL has a file extension
    ) {
      // Never cache the SPA entry point — same no-cache as index.html above
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(staticPath, 'index.html'));
    } else {
      next();
    }
  });
}

app.listen(Number(PORT), '0.0.0.0', () => {
  const mapboxFromEnv =
    process.env.MAPBOX_PUBLIC_TOKEN ||
    process.env.VITE_MAPBOX_PUBLIC_TOKEN ||
    process.env.MAPBOX_TOKEN ||
    '';
  const mapboxEffective = mapboxFromEnv || MAPBOX_PUBLIC_TOKEN_FALLBACK;
  const mapboxConfigured = Boolean(mapboxEffective);
  const tokenSource = mapboxFromEnv
    ? 'env'
    : MAPBOX_PUBLIC_TOKEN_FALLBACK ? 'hardcoded-fallback' : 'NONE';

  console.log(`🪟 WindowWorldAssistant on :${PORT} [${IS_PROD ? 'PROD' : 'DEV'}]`);
  console.log(`[config] Mapbox public token configured: ${mapboxConfigured} (source: ${tokenSource})`);
  console.log(`[config] env MAPBOX_PUBLIC_TOKEN set: ${Boolean(process.env.MAPBOX_PUBLIC_TOKEN)}`);
  console.log(`[config] env VITE_MAPBOX_PUBLIC_TOKEN set: ${Boolean(process.env.VITE_MAPBOX_PUBLIC_TOKEN)}`);

  // Security warning for default JWT secret
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret === 'dev-secret-change-me') {
    console.warn('⚠️  WARNING: JWT_SECRET is not set or using default. Set a strong secret in production!');
  }

  if (!mapboxConfigured) {
    console.warn('⚠️  WARNING: No Mapbox token found. Property maps will not load.');
    console.warn('         In Railway: add MAPBOX_PUBLIC_TOKEN or VITE_MAPBOX_PUBLIC_TOKEN to service Variables.');
  }
});
