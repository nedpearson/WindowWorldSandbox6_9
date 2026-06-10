// ═══════════════════════════════════════════════════════════════════════
// Central AI Gateway
// ALL AI provider calls must go through callAI() — never call providers
// directly from routes or components.
//
// Responsibilities:
//   • Credit check & enforcement
//   • Request deduplication & in-flight coalescing
//   • In-memory + DB cache
//   • Retry with exponential backoff
//   • Usage logging (always, even on failure)
//   • Super-admin bypass (server-side only)
//   • Graceful failure — never crashes the caller
// ═══════════════════════════════════════════════════════════════════════

import { createHash } from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { AI_MODELS, AI_CONFIG, AI_FEATURE_CREDITS, AI_CACHE_TTL } from '../config/aiModels.js';

// ── Prisma (lazy import to avoid circular deps) ──────────────────────
let _prisma: any;
async function getPrisma() {
  if (!_prisma) {
    const { prisma } = await import('../index.js');
    _prisma = prisma;
  }
  return _prisma;
}

// ── Gemini client (singleton) ─────────────────────────────────────────
let _genAi: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    _genAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    console.info('[AIGateway] Gemini initialized.');
  } else {
    console.warn('[AIGateway] GEMINI_API_KEY not set — AI features disabled.');
  }
} catch (err) {
  console.error('[AIGateway] Failed to initialize Gemini:', err);
}

// ── In-memory LRU cache (keyed by requestHash) ────────────────────────
interface CacheEntry { result: any; expiresAt: number; }
const _memCache = new Map<string, CacheEntry>();
const MEM_CACHE_MAX = 500;

function memCacheGet(hash: string): any | null {
  const entry = _memCache.get(hash);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { _memCache.delete(hash); return null; }
  return entry.result;
}

function memCacheSet(hash: string, result: any, ttlSeconds: number) {
  if (_memCache.size >= MEM_CACHE_MAX) {
    // Evict oldest
    const firstKey = _memCache.keys().next().value;
    if (firstKey) _memCache.delete(firstKey);
  }
  _memCache.set(hash, { result, expiresAt: Date.now() + ttlSeconds * 1000 });
}

// ── In-flight deduplication ───────────────────────────────────────────
const _inFlight = new Map<string, Promise<any>>();

// ── Types ─────────────────────────────────────────────────────────────
export interface AiCallParams {
  /** Logical feature key, e.g. 'photo_analysis', 'voice_command' */
  feature: string;
  /** Authenticated user ID (from JWT, not client-supplied) */
  userId: string;
  /** Authenticated company ID (from DB lookup, not client-supplied) */
  companyId: string;
  /** Input text / prompt */
  input?: string;
  /** System prompt override */
  systemPrompt?: string;
  /** Base64-encoded image (no data: prefix) */
  imageBase64?: string;
  /** Image MIME type */
  imageMimeType?: 'image/jpeg' | 'image/png' | 'image/webp';
  /** Force a specific model, overrides feature default */
  forceModel?: string;
  /** Skip cache lookup and force a fresh call */
  bypassCache?: boolean;
  /** Extra data included in the hash for cache keying */
  cacheKey?: string;
}

export interface AiCallResult {
  status: 'success' | 'cached' | 'blocked' | 'error' | 'unavailable';
  result?: any;
  rawText?: string;
  cached: boolean;
  creditsUsed: number;
  creditsRemaining?: number;
  upgradeUrl?: string;
  requestHash: string;
  error?: string;
}

export interface AiUsageSummary {
  companyId: string;
  totalCreditsUsed: number;
  creditLimit: number;
  creditsRemaining: number;
  cacheHitRate: number;
  totalCalls: number;
  failedCalls: number;
  byFeature: Record<string, { calls: number; credits: number; cacheHits: number }>;
  byUser: Array<{ userId: string; calls: number; credits: number }>;
  estimatedCostUsd: number;
}

// ── Helpers ───────────────────────────────────────────────────────────

/** Hash a request for cache/dedup keying */
function hashRequest(params: AiCallParams): string {
  const payload = JSON.stringify({
    feature: params.feature,
    companyId: params.companyId,
    userId: params.userId,
    input: (params.input || '').trim(),
    systemPrompt: (params.systemPrompt || '').trim(),
    // hash image content not the raw string to be memory-friendly
    imageHash: params.imageBase64
      ? createHash('sha256').update(params.imageBase64.slice(0, 4096)).digest('hex')
      : null,
    model: params.forceModel || '',
    cacheKey: params.cacheKey || '',
  });
  return createHash('sha256').update(payload).digest('hex');
}

/** Check if a user is super admin (server-side only — never trust client) */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  try {
    const prisma = await getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return user?.email === AI_CONFIG.superAdminEmail;
  } catch {
    return false;
  }
}

/** Get or auto-create a company credit account */
async function getOrCreateCreditAccount(companyId: string) {
  const prisma = await getPrisma();
  try {
    return await prisma.aiCreditAccount.upsert({
      where: { companyId },
      create: {
        companyId,
        monthlyCreditLimit: AI_CONFIG.defaultMonthlyCredits,
        monthlyCreditsUsed: 0,
        hardLimitEnabled: AI_CONFIG.hardLimitEnabled,
      },
      update: {},
    });
  } catch {
    // If table doesn't exist yet (pre-migration), return permissive defaults
    return {
      companyId,
      monthlyCreditLimit: AI_CONFIG.defaultMonthlyCredits,
      monthlyCreditsUsed: 0,
      bonusCredits: 0,
      hardLimitEnabled: false,
    };
  }
}

/** Check credit balance and whether request is allowed */
export async function checkCreditBalance(
  companyId: string,
  userId: string,
  feature: string
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  if (!AI_CONFIG.creditsEnabled) return { allowed: true, remaining: 99999, limit: 99999 };

  try {
    // Super admin always allowed
    if (await isSuperAdmin(userId)) return { allowed: true, remaining: 99999, limit: 99999 };

    const account = await getOrCreateCreditAccount(companyId);
    const totalUsed = (account.monthlyCreditsUsed || 0);
    const totalLimit = (account.monthlyCreditLimit || AI_CONFIG.defaultMonthlyCredits) + (account.bonusCredits || 0);
    const remaining = Math.max(0, totalLimit - totalUsed);

    if (account.hardLimitEnabled && remaining <= 0) {
      return { allowed: false, remaining: 0, limit: totalLimit };
    }
    return { allowed: true, remaining, limit: totalLimit };
  } catch {
    // On error, allow the request (fail open)
    return { allowed: true, remaining: 999, limit: 999 };
  }
}

/** Log an AI usage event */
async function logUsageEvent(params: {
  companyId: string;
  userId: string;
  feature: string;
  model: string;
  creditsUsed: number;
  cacheHit: boolean;
  requestHash: string;
  status: string;
  errorMessage?: string;
  imageCount?: number;
}) {
  try {
    const prisma = await getPrisma();
    await prisma.aiUsageEvent.create({
      data: {
        companyId: params.companyId,
        userId: params.userId,
        featureKey: params.feature,
        model: params.model,
        creditsUsed: params.creditsUsed,
        cacheHit: params.cacheHit,
        requestHash: params.requestHash,
        status: params.status,
        errorMessage: params.errorMessage || null,
        imageCount: params.imageCount || 0,
        provider: 'gemini',
      },
    });

    // Increment company usage counter
    if (!params.cacheHit && params.creditsUsed > 0) {
      await prisma.aiCreditAccount.updateMany({
        where: { companyId: params.companyId },
        data: { monthlyCreditsUsed: { increment: params.creditsUsed } },
      });
    }
  } catch {
    // Usage logging must never crash the main request
  }
}

/** Check DB cache for a prior result */
async function dbCacheGet(companyId: string, feature: string, requestHash: string): Promise<any | null> {
  try {
    const prisma = await getPrisma();
    const entry = await prisma.aiCacheEntry.findUnique({
      where: { companyId_featureKey_requestHash: { companyId, featureKey: feature, requestHash } },
    });
    if (!entry) return null;
    if (new Date(entry.expiresAt) < new Date()) {
      await prisma.aiCacheEntry.delete({
        where: { companyId_featureKey_requestHash: { companyId, featureKey: feature, requestHash } },
      }).catch(() => {});
      return null;
    }
    return entry.responseJson;
  } catch {
    return null;
  }
}

/** Store result in DB cache */
async function dbCacheSet(
  companyId: string,
  feature: string,
  requestHash: string,
  model: string,
  result: any,
  ttlSeconds: number
) {
  try {
    const prisma = await getPrisma();
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    await prisma.aiCacheEntry.upsert({
      where: { companyId_featureKey_requestHash: { companyId, featureKey: feature, requestHash } },
      create: { companyId, featureKey: feature, requestHash, model, responseJson: result, expiresAt },
      update: { responseJson: result, expiresAt, model },
    });
  } catch {
    // DB cache failure is non-fatal
  }
}

/** Sleep helper for retries */
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** The core AI call with retry logic */
async function invokeGemini(model: string, input: string, systemPrompt?: string, imageBase64?: string, imageMimeType?: string): Promise<string> {
  if (!_genAi) throw new Error('GEMINI_API_KEY not configured. AI features are unavailable.');

  const contents: any[] = [];

  if (systemPrompt) {
    contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
    contents.push({ role: 'model', parts: [{ text: 'Understood.' }] });
  }

  const userParts: any[] = [];
  if (input) userParts.push({ text: input });
  if (imageBase64) {
    userParts.push({ inlineData: { mimeType: imageMimeType || 'image/jpeg', data: imageBase64 } });
  }
  contents.push({ role: 'user', parts: userParts });

  let lastErr: any;
  for (let attempt = 0; attempt <= AI_CONFIG.maxRetries; attempt++) {
    if (attempt > 0) {
      await sleep(500 * Math.pow(2, attempt - 1)); // 500ms, 1000ms
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), AI_CONFIG.requestTimeoutMs);
      try {
        const response = await _genAi.models.generateContent({
          model,
          contents,
          config: { responseMimeType: 'application/json' } as any,
        });
        clearTimeout(timeout);
        const text = response?.text ?? '';
        if (!text) throw new Error('Empty response from AI provider');
        return text;
      } finally {
        clearTimeout(timeout);
      }
    } catch (err: any) {
      lastErr = err;
      // Only retry on rate limit or server errors
      const isRetryable = err?.status === 429 || err?.status === 503 || err?.code === 'ECONNRESET';
      if (!isRetryable || attempt === AI_CONFIG.maxRetries) break;
    }
  }
  throw lastErr ?? new Error('AI request failed after retries');
}

/** Safe JSON parse with markdown cleanup */
function safeParseJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      return { raw: text };
    }
  }
}

// ── Main Gateway Entry Point ───────────────────────────────────────────

/**
 * callAI — the ONLY function that should call AI providers.
 *
 * @param params AiCallParams (userId and companyId MUST come from server-side auth context)
 * @returns AiCallResult
 */
export async function callAI(params: AiCallParams): Promise<AiCallResult> {
  const requestHash = hashRequest(params);
  const model = params.forceModel || AI_MODELS.standardTextModel;
  const creditCost = AI_FEATURE_CREDITS[params.feature] ?? AI_FEATURE_CREDITS.default;
  const cacheTtl = AI_CACHE_TTL[params.feature] ?? AI_CACHE_TTL.default;

  // 1. Memory cache check (fastest)
  if (!params.bypassCache) {
    const memHit = memCacheGet(requestHash);
    if (memHit !== null) {
      await logUsageEvent({
        companyId: params.companyId,
        userId: params.userId,
        feature: params.feature,
        model,
        creditsUsed: 0,
        cacheHit: true,
        requestHash,
        status: 'cached',
      });
      return { status: 'cached', result: memHit, cached: true, creditsUsed: 0, requestHash };
    }

    // 2. DB cache check
    const dbHit = await dbCacheGet(params.companyId, params.feature, requestHash);
    if (dbHit !== null) {
      memCacheSet(requestHash, dbHit, cacheTtl);
      await logUsageEvent({
        companyId: params.companyId,
        userId: params.userId,
        feature: params.feature,
        model,
        creditsUsed: 0,
        cacheHit: true,
        requestHash,
        status: 'cached',
      });
      return { status: 'cached', result: dbHit, cached: true, creditsUsed: 0, requestHash };
    }
  }

  // 3. Credit check
  const { allowed, remaining, limit } = await checkCreditBalance(params.companyId, params.userId, params.feature);
  if (!allowed) {
    await logUsageEvent({
      companyId: params.companyId,
      userId: params.userId,
      feature: params.feature,
      model,
      creditsUsed: 0,
      cacheHit: false,
      requestHash,
      status: 'blocked',
      errorMessage: 'Credit limit exceeded',
    });
    return {
      status: 'blocked',
      cached: false,
      creditsUsed: 0,
      creditsRemaining: 0,
      upgradeUrl: AI_CONFIG.upgradeUrl,
      requestHash,
      error: `You've reached your AI credit limit for this month. Credits reset monthly. Upgrade at: ${AI_CONFIG.upgradeUrl}`,
    };
  }

  // 4. In-flight deduplication
  if (_inFlight.has(requestHash)) {
    try {
      const result = await _inFlight.get(requestHash)!;
      return { status: 'cached', result, cached: true, creditsUsed: 0, requestHash };
    } catch {
      // fallthrough to fresh call
    }
  }

  // 5. Make the AI call
  const callPromise = (async () => {
    const rawText = await invokeGemini(
      model,
      params.input || '',
      params.systemPrompt,
      params.imageBase64,
      params.imageMimeType
    );
    return safeParseJson(rawText);
  })();

  _inFlight.set(requestHash, callPromise);
  callPromise.finally(() => _inFlight.delete(requestHash));

  try {
    const result = await callPromise;

    // 6. Store in cache
    memCacheSet(requestHash, result, cacheTtl);
    await dbCacheSet(params.companyId, params.feature, requestHash, model, result, cacheTtl);

    // 7. Log success
    await logUsageEvent({
      companyId: params.companyId,
      userId: params.userId,
      feature: params.feature,
      model,
      creditsUsed: creditCost,
      cacheHit: false,
      requestHash,
      status: 'success',
      imageCount: params.imageBase64 ? 1 : 0,
    });

    return {
      status: 'success',
      result,
      cached: false,
      creditsUsed: creditCost,
      creditsRemaining: Math.max(0, remaining - creditCost),
      requestHash,
    };
  } catch (err: any) {
    // 8. Log failure
    await logUsageEvent({
      companyId: params.companyId,
      userId: params.userId,
      feature: params.feature,
      model,
      creditsUsed: 0,
      cacheHit: false,
      requestHash,
      status: 'error',
      errorMessage: err?.message || 'Unknown error',
    });

    const isUnavailable = !_genAi || err?.message?.includes('GEMINI_API_KEY');
    return {
      status: isUnavailable ? 'unavailable' : 'error',
      cached: false,
      creditsUsed: 0,
      requestHash,
      error: isUnavailable
        ? 'AI features are not configured. Please contact your administrator.'
        : 'AI request failed. Please try again.',
    };
  }
}

// ── Admin Operations ───────────────────────────────────────────────────

/** Get usage summary for a company (optionally filtered by user or time period) */
export async function getUsageSummary(
  companyId: string,
  userId?: string,
  days = 30
): Promise<AiUsageSummary> {
  const prisma = await getPrisma();
  const since = new Date(Date.now() - days * 86_400_000);

  const [account, events] = await Promise.all([
    getOrCreateCreditAccount(companyId),
    prisma.aiUsageEvent.findMany({
      where: {
        companyId,
        ...(userId ? { userId } : {}),
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    }),
  ]);

  const totalCalls = events.length;
  const cacheHits = events.filter((e: any) => e.cacheHit).length;
  const failedCalls = events.filter((e: any) => e.status === 'error' || e.status === 'blocked').length;
  const totalCreditsUsed = events.reduce((s: number, e: any) => s + (e.creditsUsed || 0), 0);
  const estimatedCostUsd = events.reduce((s: number, e: any) => s + (e.estimatedCostUsd || 0), 0);

  const byFeature: Record<string, { calls: number; credits: number; cacheHits: number }> = {};
  const byUserMap = new Map<string, { calls: number; credits: number }>();

  for (const e of events) {
    const fk = e.featureKey || 'unknown';
    if (!byFeature[fk]) byFeature[fk] = { calls: 0, credits: 0, cacheHits: 0 };
    byFeature[fk].calls++;
    byFeature[fk].credits += e.creditsUsed || 0;
    if (e.cacheHit) byFeature[fk].cacheHits++;

    const uid = e.userId || 'unknown';
    if (!byUserMap.has(uid)) byUserMap.set(uid, { calls: 0, credits: 0 });
    const u = byUserMap.get(uid)!;
    u.calls++;
    u.credits += e.creditsUsed || 0;
  }

  const limit = (account.monthlyCreditLimit || AI_CONFIG.defaultMonthlyCredits) + (account.bonusCredits || 0);
  const used = account.monthlyCreditsUsed || 0;

  return {
    companyId,
    totalCreditsUsed: used,
    creditLimit: limit,
    creditsRemaining: Math.max(0, limit - used),
    cacheHitRate: totalCalls > 0 ? cacheHits / totalCalls : 0,
    totalCalls,
    failedCalls,
    byFeature,
    byUser: Array.from(byUserMap.entries()).map(([uid, data]) => ({ userId: uid, ...data })),
    estimatedCostUsd,
  };
}

/** Add bonus credits to a company (admin only) */
export async function addBonusCredits(
  companyId: string,
  credits: number,
  adminUserId: string
): Promise<void> {
  const prisma = await getPrisma();
  await getOrCreateCreditAccount(companyId);
  await prisma.aiCreditAccount.update({
    where: { companyId },
    data: { bonusCredits: { increment: credits } },
  });
  // Log the grant as a negative usage event for auditing
  await logUsageEvent({
    companyId,
    userId: adminUserId,
    feature: 'admin_credit_grant',
    model: 'none',
    creditsUsed: -credits,
    cacheHit: false,
    requestHash: `grant_${Date.now()}`,
    status: 'success',
  });
}

/** Reset monthly credits for a company (admin only) */
export async function resetMonthlyCredits(
  companyId: string,
  adminUserId: string
): Promise<void> {
  const prisma = await getPrisma();
  await getOrCreateCreditAccount(companyId);
  await prisma.aiCreditAccount.update({
    where: { companyId },
    data: { monthlyCreditsUsed: 0, resetDate: new Date() },
  });
  await logUsageEvent({
    companyId,
    userId: adminUserId,
    feature: 'admin_credit_reset',
    model: 'none',
    creditsUsed: 0,
    cacheHit: false,
    requestHash: `reset_${Date.now()}`,
    status: 'success',
  });
}
