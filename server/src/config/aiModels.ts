// ═══════════════════════════════════════════════════════════════════════
// AI Model Configuration
// All model selection is driven by environment variables.
// Change models without code changes by updating Railway/Supabase env vars.
// ═══════════════════════════════════════════════════════════════════════

export const AI_MODELS = {
  /** Cheap & fast: classification, extraction, field hints, short summaries */
  cheapTextModel:    process.env.AI_CHEAP_TEXT_MODEL    || 'gemini-2.0-flash',
  /** Standard: voice commands, measurement instructions, validation feedback */
  standardTextModel: process.env.AI_STANDARD_TEXT_MODEL || 'gemini-2.0-flash',
  /** Premium: proposal generation, legal/financial docs, multi-doc synthesis */
  premiumTextModel:  process.env.AI_PREMIUM_TEXT_MODEL  || 'gemini-1.5-pro',
  /** Image: photo analysis, opening detection, exterior surface identification */
  imageAnalysisModel: process.env.AI_IMAGE_ANALYSIS_MODEL || 'gemini-2.0-flash',
  /** Embeddings: semantic search, document chunking */
  embeddingModel:    process.env.AI_EMBEDDING_MODEL     || 'text-embedding-004',
  /** Fallback: used when primary model fails or is rate-limited */
  fallbackModel:     process.env.AI_FALLBACK_MODEL      || 'gemini-2.0-flash',
} as const;

export const AI_CONFIG = {
  /** Whether the credit/quota system is active — defaults TRUE in production */
  creditsEnabled:       process.env.AI_CREDITS_ENABLED !== 'false',
  /** Monthly credit allowance per company (default for new accounts) */
  defaultMonthlyCredits: parseInt(process.env.AI_DEFAULT_MONTHLY_CREDITS || '1000', 10),
  /** When true, requests are blocked after credits are exhausted */
  hardLimitEnabled:     process.env.AI_HARD_LIMIT_ENABLED === 'true',
  /** URL shown to users when credits run out */
  upgradeUrl:           process.env.AI_UPGRADE_URL || '/billing',
  /** Stripe price ID for credit top-up */
  stripePriceId:        process.env.STRIPE_AI_CREDIT_PRICE_ID || '',
  /** Stripe billing portal URL for self-service */
  stripeBillingUrl:     process.env.STRIPE_BILLING_PORTAL_URL || '',
  /** Max request timeout in ms */
  requestTimeoutMs:     30_000,
  /** Max retries on 429/503 */
  maxRetries:           2,
  /** Super admin email — server-side bypass only */
  superAdminEmail:      'nedpearson@gmail.com',
} as const;

/** Credit cost per feature (credits charged per successful AI call) */
export const AI_FEATURE_CREDITS: Record<string, number> = {
  photo_analysis:    10,   // Opening/window photo analysis
  voice_command:      5,   // Voice measurement command
  visualizer:        20,   // Legacy key (kept for backward compat)
  visualizer_preview: 15,  // AI home exterior visualizer preview
  proposal_gen:      15,   // Proposal/quote generation
  chat:               3,   // AI chat / copilot
  doc_parse:          8,   // Document/PDF parsing
  lead_score:         4,   // Lead scoring
  measurement:        5,   // Measurement assistance
  report_gen:        12,   // Report generation
  // Astari AI Command Center features
  'astari.command':            5,   // General AI command
  'astari.task.plan':          8,   // Task generation from context
  'astari.workflow.generate':  10,  // Workflow step generation
  'astari.knowledge.summarize': 6,  // Knowledge item summarization
  'astari.action.run':          8,  // Workflow action execution
  default:            5,
};

/** Cache TTL per feature in seconds */
export const AI_CACHE_TTL: Record<string, number> = {
  photo_analysis:    86_400,  // 24h — same photo same result
  voice_command:         60,  // 1 min — contextual, short lived
  visualizer:         3_600,  // 1h (legacy key)
  visualizer_preview: 3_600,  // 1h — same house + same options = same image
  proposal_gen:       3_600,  // 1h
  chat:                 300,  // 5 min
  doc_parse:         86_400,  // 24h — same doc same result
  lead_score:         3_600,  // 1h
  measurement:        3_600,  // 1h
  report_gen:         3_600,  // 1h
  // Astari AI Command Center
  'astari.command':              300,   // 5 min
  'astari.task.plan':          1_800,   // 30 min
  'astari.workflow.generate':  3_600,   // 1h
  'astari.knowledge.summarize': 86_400, // 24h
  'astari.action.run':           300,   // 5 min
  default:            3_600,
};
