const API_BASE = '/api';

import { markQuoteGroupsStaleByOpening } from '../lib/offlineDb';

// ── In-flight GET deduplication ─────────────────────────────────────────────
// If two components request the same GET endpoint simultaneously (e.g. on
// mount), reuse the first in-flight promise instead of firing a second request.
const _inflightGets = new Map<string, Promise<any>>();

// ── Rate-limit toast (shown at most once per 10 seconds) ────────────────────
let _lastRateLimitToast = 0;
function showRateLimitToast(message: string) {
  const now = Date.now();
  if (now - _lastRateLimitToast < 10_000) return; // suppress rapid duplicates
  _lastRateLimitToast = now;
  // Use a non-blocking visual indicator; falls back to console if no toast lib
  if (typeof document !== 'undefined') {
    const existing = document.getElementById('wwa-rate-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'wwa-rate-toast';
    toast.setAttribute('role', 'alert');
    toast.textContent = message;
    Object.assign(toast.style, {
      position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
      background: '#1e293b', color: '#f8fafc', padding: '0.75rem 1.5rem',
      borderRadius: '10px', fontSize: '0.875rem', fontWeight: '600',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: '99999',
      border: '1px solid rgba(59,130,246,0.3)', maxWidth: '90vw', textAlign: 'center',
    });
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 6000);
  }
}

async function request(path: string, options: RequestInit = {}, { skipOfflineQueue = false, timeoutMs = 30000 } = {}) {
  const isMutation = options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method);
  const isGet = !isMutation;

  if (!skipOfflineQueue && !navigator.onLine && isMutation) {
    const errObj: any = new Error('You are currently offline. This action must be performed online, or explicitly queued for offline sync by the component.');
    errObj.isOffline = true;
    throw errObj;
  }

  // ── GET deduplication: reuse in-flight request for identical paths ─────
  if (isGet) {
    const existing = _inflightGets.get(path);
    if (existing) return existing;
  }

  const doFetch = async (retryCount = 0): Promise<any> => {
    const token = localStorage.getItem('wwa_token');
    
    // Set up AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const fetchOptions: RequestInit = {
      ...options,
      signal: options.signal || controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    };

    let res: Response;
    try {
      res = await fetch(`${API_BASE}${path}`, fetchOptions);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) {
      // ── 429 Rate Limit handling ──────────────────────────────────────
      if (res.status === 429) {
        const errBody = await res.json().catch(() => ({ message: 'Too many requests' }));
        const retryAfter = parseInt(res.headers.get('Retry-After') || '', 10);
        const waitMs = retryAfter > 0 ? retryAfter * 1000 : (errBody.retryAfterSeconds || 10) * 1000;

        // For idempotent GETs: retry once after waiting
        if (isGet && retryCount < 1) {
          const jitter = Math.random() * 2000; // 0-2s jitter to spread retries
          await new Promise(r => setTimeout(r, Math.min(waitMs, 30_000) + jitter));
          return doFetch(retryCount + 1);
        }

        // Show user-friendly message
        const msg = errBody.message || 'Too many requests. Please wait a few seconds and try again.';
        showRateLimitToast(msg);

        const errObj: any = new Error(msg);
        errObj.status = 429;
        errObj.body = errBody;
        errObj.retryAfterMs = waitMs;
        throw errObj;
      }

      if (res.status === 401) {
        // Force logout if token is invalid or user no longer exists
        localStorage.removeItem('wwa_token');
        localStorage.removeItem('wwa-auth');
        // Don't use window.location.href = '/' — on mobile this triggers a
        // secondary redirect to /mobile, causing a double-reload glitch.
        // Instead, let the Zustand auth state change drive React to show LoginPage.
        try {
          const { useAuthStore } = await import('../store');
          useAuthStore.getState().logout();
        } catch { /* fallback if dynamic import fails */
          window.location.href = '/';
        }
        throw new Error('Session expired. Please log in again.');
      }
      const errBody = await res.json().catch(() => ({ error: res.statusText }));
      const errObj: any = new Error(errBody.details ? `${errBody.error}: ${errBody.details}` : (errBody.error || 'Request failed'));
      errObj.status = res.status;
      errObj.body = errBody;   // attach structured payload so callers can read 409 details
      throw errObj;
    }
    return await res.json();
  };

  // Wrap in dedup tracking for GETs
  if (isGet) {
    const promise = doFetch().finally(() => _inflightGets.delete(path));
    _inflightGets.set(path, promise);
    return promise;
  }

  try {
    return await doFetch();
  } catch (err: any) {
    // If fetch failed completely due to network error, queue it if it's a mutation and offline queue isn't skipped
    if (!skipOfflineQueue && err.name === 'TypeError' && err.message.includes('Failed to fetch') && isMutation) {
      const errObj: any = new Error('Failed to reach server. You may be offline.');
      errObj.isOffline = true;
      throw errObj;
    }
    throw err;
  }
}

export const api = {
  // Generic
  get: (path: string) => request(path),
  post: (path: string, data: any) => request(path, { method: 'POST', body: JSON.stringify(data) }),
  put: (path: string, data: any) => request(path, { method: 'PUT', body: JSON.stringify(data) }),
  patch: (path: string, data: any) => request(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (path: string) => request(path, { method: 'DELETE' }),
  del: (path: string) => request(path, { method: 'DELETE' }),

  // Auth
  login: (email: string, password: string) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/auth/me'),

  // Dashboard
  dashboardStats: () => request('/dashboard/stats'),
  dashboardRecent: () => request('/dashboard/recent'),
  getManagerDashboard: () => request('/dashboard/manager'),
  getMobileFieldDashboard: () => request('/mobile/field-dashboard', {}, { timeoutMs: 10000 }),

  // Customers
  getCustomers: () => request('/customers'),
  getCustomer: (id: string) => request(`/customers/${id}`),
  createCustomer: (data: any) => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
  createCustomerForce: (data: any) => request('/customers?skipDuplicateCheck=1', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id: string, data: any) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  searchCustomers: (q: string) => request(`/customers/search?q=${encodeURIComponent(q)}`),
  getCustomerDocuments: (id: string) => request(`/documents/customer/${id}/documents`),
  getWorkbookStatus: (appointmentId: string) => request(`/documents/appointment/${appointmentId}/workbook`),
  generateWorkbook: (appointmentId: string, isFinal?: boolean) =>
    request(`/documents/appointment/${appointmentId}/workbook/generate`, { method: 'POST', body: JSON.stringify({ isFinal }) }),
  uploadWorkbook: (appointmentId: string, fileName: string, fileData: string) =>
    request(`/documents/appointment/${appointmentId}/workbook/upload`, { method: 'POST', body: JSON.stringify({ fileName, fileData }) }),
  finalizeWorkbook: (appointmentId: string) =>
    request(`/documents/appointment/${appointmentId}/workbook/finalize`, { method: 'POST', body: JSON.stringify({}) }),
  saveWorkbookToCustomerFile: (appointmentId: string) =>
    request(`/documents/appointment/${appointmentId}/workbook/save-customer-file`, { method: 'POST', body: JSON.stringify({}) }),
  sendWorkbookToDocusign: (appointmentId: string) =>
    request(`/documents/appointment/${appointmentId}/docusign/send`, { method: 'POST', body: JSON.stringify({}) }),
  getDocusignStatus: () => request('/documents/docusign/status'),
  sendEmail: (data: any) => request('/communications/email', { method: 'POST', body: JSON.stringify(data) }),
  getEmailLogs: (id: string) => request(`/communications/emails/${id}`),

  // Appointments
  getAppointments: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/appointments${qs}`);
  },
  getAppointment: (id: string, signal?: AbortSignal) => request(`/appointments/${id}`, { signal }),
  getAppointmentSummary: (id: string) => request(`/appointments/${id}/summary`),
  getAppointmentPhotos: (id: string) => request(`/appointments/${id}/photos`),
  uploadAppointmentPhoto: (id: string, data: { photoType?: string; description?: string; fileData: string; fileName: string }) => request(`/appointments/${id}/photos`, { method: 'POST', body: JSON.stringify(data) }),
  deleteAppointmentPhoto: (appointmentId: string, photoId: string) => request(`/appointments/${appointmentId}/photos/${photoId}`, { method: 'DELETE' }),
  createAppointment: (data: any) => request('/appointments', { method: 'POST', body: JSON.stringify(data) }),
  updateAppointment: (id: string, data: any) => request(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  // Destructive appointment operations — ALWAYS hit the server directly (skipOfflineQueue)
  // These must never be silently queued; a fake-success would leave stale UI
  deleteAppointment: (id: string) => request(`/appointments/${id}`, { method: 'DELETE' }, { skipOfflineQueue: true }),
  archiveAppointment: (id: string) => request(`/appointments/${id}/archive`, { method: 'PATCH' }, { skipOfflineQueue: true }),
  recalculate: (id: string) => request(`/appointments/${id}/recalculate`, { method: 'POST' }),
  addTimelineEvent: (id: string, data: { eventType: string; title: string; description?: string }) =>
    request(`/appointments/${id}/timeline`, { method: 'POST', body: JSON.stringify(data) }),
  getTimeline: (id: string) => request(`/appointments/${id}/timeline`),
  getFollowUpsDue: () => request('/appointments?followUp=due'),

  // Openings
  getOpenings: (appointmentId: string) => request(`/openings/appointment/${appointmentId}`),
  getOpening: (id: string) => request(`/openings/${id}`),
  createOpening: (data: any) => {
    const { tempFull, tempS, temperedFull, temperedHalf, safetyReview, safetyGlazingFlags, wizardSafetyAnswers, ...dbData } = data;
    return request('/openings', { method: 'POST', body: JSON.stringify(dbData) });
  },
  updateOpening: (id: string, data: any) => {
    const { tempFull, tempS, temperedFull, temperedHalf, safetyReview, safetyGlazingFlags, wizardSafetyAnswers, ...dbData } = data;
    markQuoteGroupsStaleByOpening(id).catch(() => {});
    return request(`/openings/${id}`, { method: 'PUT', body: JSON.stringify(dbData) });
  },
  deleteOpening: (id: string) => request(`/openings/${id}`, { method: 'DELETE' }),
  batchUpdateOpenings: (data: any) => {
    const { updates, ...rest } = data;
    let cleanUpdates = updates;
    if (updates) {
      const { tempFull, tempS, temperedFull, temperedHalf, safetyReview, safetyGlazingFlags, wizardSafetyAnswers, ...dbData } = updates;
      cleanUpdates = dbData;
    }
    return request('/openings/batch', { method: 'PUT', body: JSON.stringify({ ...rest, updates: cleanUpdates }) });
  },
  batchSyncOpenings: (data: any) => {
    const { openings, ...rest } = data;
    const cleanOpenings = Array.isArray(openings) ? openings.map((o: any) => {
      const { tempFull, tempS, temperedFull, temperedHalf, safetyReview, safetyGlazingFlags, wizardSafetyAnswers, ...dbData } = o;
      return dbData;
    }) : openings;
    return request('/openings/batch-sync', { method: 'POST', body: JSON.stringify({ ...rest, openings: cleanOpenings }) });
  },

  // Pricing Tables (legacy)
  getPricingTables: () => request('/pricing/tables'),
  createPricingTable: (data: any) => request('/pricing/tables', { method: 'POST', body: JSON.stringify(data) }),
  updatePricingTable: (id: string, data: any) => request(`/pricing/tables/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePricingTable: (id: string) => request(`/pricing/tables/${id}`, { method: 'DELETE' }),
  createPricingItem: (data: any) => request('/pricing/items', { method: 'POST', body: JSON.stringify(data) }),
  updatePricingItem: (id: string, data: any) => request(`/pricing/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePricingItem: (id: string) => request(`/pricing/items/${id}`, { method: 'DELETE' }),
  priceLookup: (data: any) => request('/pricing/lookup', { method: 'POST', body: JSON.stringify(data) }),

  // House Map
  getHouseMap: (appointmentId: string) => request(`/house-maps/appointment/${appointmentId}`),
  addMarker: (data: any) => request('/house-maps/markers', { method: 'POST', body: JSON.stringify(data) }),
  updateMarker: (id: string, data: any) => request(`/house-maps/markers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMarker: (id: string) => request(`/house-maps/markers/${id}`, { method: 'DELETE' }),

  // Exports
  exportJSON: (id: string) => request(`/exports/json/${id}`),
  exportCSV: (id: string) => fetch(`${API_BASE}/exports/csv/${id}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('wwa_token') || ''}` }
  }).then(r => r.text()),
  exportExcel: async (id: string, options?: { sourceType?: string, sourceId?: string }): Promise<Blob> => {
    let url = `${API_BASE}/exports/excel/${id}`;
    if (options?.sourceType && options?.sourceId) {
      url += `?sourceType=${encodeURIComponent(options.sourceType)}&sourceId=${encodeURIComponent(options.sourceId)}`;
    }
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${localStorage.getItem('wwa_token') || ''}` }
    });
    if (!r.ok) {
      // Surface the server's error detail so blockers can be shown in UI
      let detail = 'Excel export failed';
      try {
        const body = await r.json();
        detail = body?.details || body?.error || detail;
      } catch {}
      const err = new Error(detail) as Error & { statusCode: number };
      err.statusCode = r.status;
      throw err;
    }
    return r.blob();
  },

  // ── Field Intelligence Engine ──────────────────────
  analyzeOpening: (data: any) => request('/intelligence/analyze-opening', { method: 'POST', body: JSON.stringify(data) }),
  calculateUI: (data: any) => request('/intelligence/calculate-ui', { method: 'POST', body: JSON.stringify(data) }),
  calculateTempered: (data: any) => request('/intelligence/calculate-tempered', { method: 'POST', body: JSON.stringify(data) }),
  calculateComplexity: (data: any) => request('/intelligence/calculate-complexity', { method: 'POST', body: JSON.stringify(data) }),
  calculateRoughOpening: (data: any) => request('/intelligence/calculate-rough-opening', { method: 'POST', body: JSON.stringify(data) }),
  calculateProfitability: (data: any) => request('/intelligence/calculate-profitability', { method: 'POST', body: JSON.stringify(data) }),
  calculateLeadTime: (data: any) => request('/intelligence/calculate-lead-time', { method: 'POST', body: JSON.stringify(data) }),
  calculateStructural: (data: any) => request('/intelligence/calculate-structural', { method: 'POST', body: JSON.stringify(data) }),
  calculateEyebrow: (data: any) => request('/intelligence/calculate-eyebrow', { method: 'POST', body: JSON.stringify(data) }),
  calculateOrielSplit: (data: any) => request('/intelligence/calculate-oriel-split', { method: 'POST', body: JSON.stringify(data) }),
  validateBrickMeasurement: (data: any) => request('/intelligence/validate-brick-measurement', { method: 'POST', body: JSON.stringify(data) }),
  calculateMullGroup: (data: any) => request('/intelligence/calculate-mull-group', { method: 'POST', body: JSON.stringify(data) }),
  calculateLinePrice: (data: any) => request('/intelligence/calculate-line-price', { method: 'POST', body: JSON.stringify(data) }),
  parseLineItems: (data: { appointmentId: string; text: string }) =>
    request('/intelligence/parse-line-items', { method: 'POST', body: JSON.stringify(data) }),
  analyzeOpeningPhoto: (data: { imageData: string; photoId?: string }) =>
    request('/intelligence/analyze-opening-photo', { method: 'POST', body: JSON.stringify(data) }),

  // ── Photo Save ─────────────────────────────────────
  saveOpeningPhoto: (appointmentId: string, data: {
    imageData: string; photoType?: string; openingId?: string;
    sketchObjectId?: string; elevation?: string; markerNumber?: number;
  }) => request(`/visualizer/photo/${appointmentId}`, { method: 'POST', body: JSON.stringify(data) }),

  // ── Canonical Pricing Engine ───────────────────────
  calculateOfficialPricing: (data: any) => request('/pricing-versions/calculate', { method: 'POST', body: JSON.stringify(data) }),
  getActivePricingVersion: () => request('/pricing-versions/active'),

  // ── Field Shortcuts ────────────────────────────────
  getFieldShortcuts: () => request('/field-shortcuts'),
  getPricingAdders: () => request('/field-shortcuts/adders'),
  getScopeRules: () => request('/field-shortcuts/scope-rules'),

  // ── Window Knowledge Library ───────────────────────
  getWindowDefaults: () => request('/window-knowledge/defaults'),
  getSpecialtyShapes: () => request('/window-knowledge/shapes'),
  getSashSplits: () => request('/window-knowledge/sash-splits'),
  getCodeDefaults: () => request('/window-knowledge/code-defaults'),

  // ── Manufacturer Constraints ───────────────────────
  getManufacturerProfiles: () => request('/manufacturer/profiles'),
  getManufacturerProfile: (code: string) => request(`/manufacturer/profiles/${code}`),
  validateManufacturer: (data: any) => request('/manufacturer/validate', { method: 'POST', body: JSON.stringify(data) }),

  // ── Proposals & Sales Optimization ─────────────────
  getProposalTiers: () => request('/proposals/tiers'),
  getFinancingPlans: () => request('/proposals/financing'),
  calculateFinancing: (data: any) => request('/proposals/financing/calculate', { method: 'POST', body: JSON.stringify(data) }),
  getSalesRecommendations: () => request('/proposals/recommendations'),

  // ── AI Credits ──────────────────────────────────────
  getAiCreditStatus: () => request('/ai-credits/status'),
  getAiUsage: (days?: number) => request(`/ai-credits/usage${days ? '?days=' + days : ''}`),
  getAiUpgradeUrl: () => request('/ai-credits/upgrade'),
  adminAddBonusCredits: (companyId: string, credits: number) =>
    request('/ai-credits/admin/add-bonus', { method: 'POST', body: JSON.stringify({ companyId, credits }) }),
  adminResetCredits: (companyId: string) =>
    request('/ai-credits/admin/reset', { method: 'POST', body: JSON.stringify({ companyId }) }),
  adminGetAiDashboard: () => request('/ai-credits/admin/dashboard'),

  // ── Astari AI Command Center ─────────────────────────────
  astariSummary: () => request('/astari/summary'),
  astariCommands: (limit = 20) => request(`/astari/commands?limit=${limit}`),
  astariRunCommand: (input: string) => request('/astari/command', { method: 'POST', body: JSON.stringify({ input }) }),
  astariTasks: (status?: string) => request(`/astari/tasks${status ? `?status=${status}` : ''}`),
  astariCreateTask: (data: any) => request('/astari/tasks', { method: 'POST', body: JSON.stringify(data) }),
  astariUpdateTask: (id: string, data: any) => request(`/astari/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  astariDeleteTask: (id: string) => request(`/astari/tasks/${id}`, { method: 'DELETE' }),
  astariGenerateTasks: (context: string) => request('/astari/tasks/generate', { method: 'POST', body: JSON.stringify({ context }) }),
  astariWorkflows: () => request('/astari/workflows'),
  astariCreateWorkflow: (data: any) => request('/astari/workflows', { method: 'POST', body: JSON.stringify(data) }),
  astariRunWorkflow: (id: string) => request(`/astari/workflows/${id}/run`, { method: 'POST', body: '{}' }),
  astariKnowledge: (search?: string) => request(`/astari/knowledge${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  astariCreateKnowledge: (data: any) => request('/astari/knowledge', { method: 'POST', body: JSON.stringify(data) }),
  astariSummarizeKnowledge: (id: string) => request(`/astari/knowledge/${id}/summarize`, { method: 'POST', body: '{}' }),
  astariAiUsage: (days?: number) => request(`/astari/ai-usage${days ? `?days=${days}` : ''}`),

  // ── Workflows ───────────────────────────────────────
  pingWorkflow: (appointmentId: string) => request(`/workflow/ping/${appointmentId}`, { method: 'PUT', body: '{}' }),

  // ── Active Workflow ──────────────────────────────────────────
  getActiveWorkflow: () => request('/workflow/active'),

  // ── Exterior Inspection ──────────────────────────────────────
  createExteriorInspection: (data: { appointmentId: string; customerId?: string; status?: string }) => request('/exterior-inspections', { method: 'POST', body: JSON.stringify(data) }),
  getExteriorInspection: (appointmentId: string) => request(`/exterior-inspections/appointment/${appointmentId}`),
  createInspectionOpening: (inspectionId: string, data: any) => request(`/exterior-inspections/${inspectionId}/openings`, { method: 'POST', body: JSON.stringify(data) }),

  // ── Final Review ─────────────────────────────────────────────
  getFinalReviewItems: (appointmentId: string) => request(`/final-review/appointment/${appointmentId}`),
  createFinalReviewItem: (data: any) => request('/final-review/items', { method: 'POST', body: JSON.stringify(data) }),
  updateFinalReviewItem: (id: string, data: { status: string }) => request(`/final-review/items/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  applyReviewAction: (data: any) => request('/review-actions/apply', { method: 'POST', body: JSON.stringify(data) }),

  // Save all four signature types for an appointment in one call.
  // signatures: { ownerSignature?, estimatorSignature?, customerInitials?, signatureDate? }
  saveSignatures: (appointmentId: string, signatures: Record<string, string>) =>
    request(`/review-actions/${appointmentId}/signatures`, { method: 'PATCH', body: JSON.stringify({ signatures }) }),

  // Rep explicitly confirms that job-level pricing is intentional.
  confirmJobLevelPrice: (appointmentId: string) =>
    request(`/review-actions/${appointmentId}/confirm-job-level`, { method: 'POST', body: '{}' }),

  // Link unlinked sketch markers to new pricing openings automatically.
  reconcileOpenings: (appointmentId: string) =>
    request(`/review-actions/${appointmentId}/reconcile-openings`, { method: 'POST', body: '{}' }),

  // ── Measurement Rules ─────────────────────────────────────────
  getMeasurementRules: (includeInactive = false) =>
    request(`/measurement-rules${includeInactive ? '/all' : ''}`),
  getMeasurementRule: (id: string) => request(`/measurement-rules/${id}`),
  createMeasurementRule: (data: any) =>
    request('/measurement-rules', { method: 'POST', body: JSON.stringify(data) }),
  updateMeasurementRule: (id: string, data: any) =>
    request(`/measurement-rules/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteMeasurementRule: (id: string) =>
    request(`/measurement-rules/${id}`, { method: 'DELETE' }),
  verifyMeasurementRule: (id: string) =>
    request(`/measurement-rules/${id}/verify`, { method: 'POST' }),

  // ── Field Manual (cloud-backed) ───────────────────────────────────
  // All content is tenant-scoped. userId/companyId are derived from the JWT, not trusted from the client.
  getManualCategories: () => request('/field-manual/categories'),
  getManualArticles: (params?: { category?: string; search?: string; tag?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return request(`/field-manual/articles${qs}`);
  },
  getManualArticle: (slug: string) => request(`/field-manual/articles/${slug}`),
  createManualArticle: (data: any) =>
    request('/field-manual/articles', { method: 'POST', body: JSON.stringify(data) }),
  updateManualArticle: (id: string, data: any) =>
    request(`/field-manual/articles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  publishManualArticle: (id: string) =>
    request(`/field-manual/articles/${id}/publish`, { method: 'POST', body: '{}' }),
  searchManualArticles: (q: string) =>
    request(`/field-manual/search?q=${encodeURIComponent(q)}`),
  getManualAssets: (params?: { category?: string; type?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return request(`/field-manual/assets${qs}`);
  },
  createManualAsset: (data: any) =>
    request('/field-manual/assets', { method: 'POST', body: JSON.stringify(data) }),
  approveManualAsset: (id: string) =>
    request(`/field-manual/assets/${id}/approve`, { method: 'PUT', body: '{}' }),
  // Contextual help: resolve ?featureKey= to a cloud article
  getManualHelp: (featureKey: string) =>
    request(`/field-manual/help?featureKey=${encodeURIComponent(featureKey)}`),
  getManualFeatureLinks: () => request('/field-manual/feature-links'),
  upsertManualFeatureLink: (data: any) =>
    request('/field-manual/feature-links', { method: 'POST', body: JSON.stringify(data) }),

  // ── Training Mode (cloud-backed) ──────────────────────────────────
  getTrainingPaths: () => request('/training/paths'),
  getTrainingPath: (id: string) => request(`/training/paths/${id}`),
  getTrainingLessons: (pathId: string) => request(`/training/paths/${pathId}/lessons`),
  getTrainingLesson: (id: string) => request(`/training/lessons/${id}`),
  saveTrainingProgress: (data: {
    trainingPathId: string;
    lessonId?: string;
    status: string;
    score?: number;
    timeSpentSec?: number;
    metadataJson?: any;
  }) => request('/training/progress', { method: 'POST', body: JSON.stringify(data) }),
  getMyTrainingProgress: () => request('/training/progress/me'),
  getUserTrainingProgress: (userId: string) => request(`/training/progress/user/${userId}`),
  getCompanyTrainingProgress: () => request('/training/progress/company'),
  getTrainingQuestions: (lessonId: string) =>
    request(`/training/questions?lessonId=${encodeURIComponent(lessonId)}`),
  getTrainingReviews: () => request('/training/reviews'),
  requestTrainingReview: (data: { trainingPathId: string; reviewerUserId?: string; notes?: string }) =>
    request('/training/reviews', { method: 'POST', body: JSON.stringify(data) }),
  updateTrainingReview: (id: string, data: { status: string; notes?: string; score?: number }) =>
    request(`/training/reviews/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  generateSimulatorScenario: (topic: string) =>
    request(`/training/scenario/generate?topic=${encodeURIComponent(topic)}`),

  // -- Laser Measurement Capture --
  saveLaserCapture: (data: any) =>
    request('/laser-measurements', { method: 'POST', body: JSON.stringify(data) }),
  getLaserCaptures: (appointmentId: string) =>
    request(`/laser-measurements/${appointmentId}`),
  getLaserCapturesByOpening: (openingId: string) =>
    request(`/laser-measurements/opening/${openingId}`),
  confirmLaserCapture: (id: string) =>
    request(`/laser-measurements/${id}/confirm`, { method: 'PATCH' }),
  getBoschDeviceProfile: () =>
    request('/laser-measurements/device-profile/bosch-glm165-27g'),

  // ── Multi-Point Measurement Sessions ──
  saveMultiPointSession: (data: Record<string, unknown>) =>
    request('/measurements/multi-point', { method: 'POST', body: JSON.stringify(data) }),
  getMultiPointSession: (openingId: string) =>
    request(`/measurements/opening/${openingId}/multi-point`),
};
