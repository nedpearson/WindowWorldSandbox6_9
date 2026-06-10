// ═══════════════════════════════════════════════════════════════
// reviewGrouping.ts — Consolidate related validation issues into
// guided fix groups. Related issues (signatures, openings/pricing,
// customer details, product options) become single group cards.
// Unrelated individual issues each get their OWN card so every
// issue has its own working Fix / Change buttons.
// ═══════════════════════════════════════════════════════════════

import type { UnifiedWarning, RecommendedFix, AlternativeFix } from '../utils/centralValidationOrchestrator';
import { enrichValidationWarning } from './reviewIssueActions';

export interface ReviewGroup {
  key: string;
  title: string;
  emoji: string;
  /** True if ANY member blocks submission */
  blocksSubmission: boolean;
  /** Short description for the card body */
  message: string;
  /** The one primary action for the whole group */
  primaryAction: RecommendedFix;
  /** Alternatives shown in the Change menu */
  alternativeActions: AlternativeFix[];
  /** All raw warnings that belong to this group */
  issues: UnifiedWarning[];
}

// ── Issue-ID → Group key lookup ─────────────────────────────
// Only for IDs that should be grouped with related siblings.
// Everything else falls through to individual cards.
const ID_TO_GROUP: Record<string, string> = {
  // Signature group — all 4 go in one card
  'contract-ownerSignature':       'signature_completion',
  'contract-signatureDate':        'signature_completion',
  'contract-estimatorSignature':   'signature_completion',
  'contract-customerInitials':     'signature_completion',
  'missing_owner_signature':       'signature_completion',
  'missing_signature_date':        'signature_completion',
  'missing_estimator_signature':   'signature_completion',
  'missing_customer_initials':     'signature_completion',

  // Openings / pricing group — structural issues group together
  'no-openings':                   'openings_pricing',
  'no-openings-linked':            'openings_pricing',
  'no_openings_entered':           'openings_pricing',
  'pricing-mismatch-unpriced':     'openings_pricing',
  'reconcile-mismatch':            'openings_pricing',
  'pricing_mismatch':              'openings_pricing',
  'pricing-mismatch-no-openings':  'openings_pricing',

  // Customer header group
  'header-customerCity':  'customer_header',
  'header-customerState': 'customer_header',
  'header-customerZip':   'customer_header',
  'header-customerPhone': 'customer_header',
  'header-customerEmail': 'customer_header',
  'missing_city':         'customer_header',
  'missing_state':        'customer_header',
  'missing_zip':          'customer_header',
  'missing_phone':        'customer_header',
  'missing_email':        'customer_header',

  // Follow-up group
  'follow_up_missing': 'follow_up',
};

// Pattern-based resolution — for IDs not in the exact lookup
function resolveGroupKey(warning: UnifiedWarning): string {
  const exact = ID_TO_GROUP[warning.id];
  if (exact) return exact;

  // Contract / signature prefix
  if (warning.id.startsWith('contract-')) return 'signature_completion';
  // Customer header prefix
  if (warning.id.startsWith('header-'))   return 'customer_header';

  // Energy argon → product_options group
  if (warning.id === 'LA-NRG-003' || warning.id === 'energy_argon_recommended') return 'product_options';
  if (warning.id.startsWith('LA-NRG'))    return 'product_options';

  // Everything else gets its own individual card.
  // We encode the per-opening grouping as 'opening_{N}' or 'issue_{id}' so
  // each gets its own ReviewGroup with correct Fix/Change buttons.
  return `__individual__${warning.id}`;
}

// ── Group-level primary actions ──────────────────────────────
const GROUP_PRIMARY_ACTIONS: Record<string, RecommendedFix> = {
  signature_completion: {
    label: 'Complete Signatures',
    actionType: 'route_focus',
    payload: { tab: 'proposal', focusTarget: 'ownerSignature' },
  },
  openings_pricing: {
    label: 'Fix Openings & Pricing',
    actionType: 'route_focus',
    payload: { tab: 'sketch' },
  },
  customer_header: {
    label: 'Fix Customer Details',
    actionType: 'route_focus',
    payload: { tab: 'home', hash: '#customer', focusTarget: 'customerCity' },
  },
  product_options: {
    label: 'Add Argon (All Openings)',
    actionType: 'apply_product_option',
    payload: { optionCode: 'argon' },
  },
  follow_up: {
    label: 'Schedule Follow-Up',
    actionType: 'schedule_follow_up',
    payload: {},
  },
};

const GROUP_ALTERNATIVE_ACTIONS: Record<string, AlternativeFix[]> = {
  signature_completion: [
    { label: 'Complete signatures now', actionType: 'route_focus', payload: { tab: 'proposal', focusTarget: 'ownerSignature' } },
    { label: 'Send contract for remote signature', actionType: 'manual_required' },
    { label: 'Mark draft only (sign later)', actionType: 'dismiss_with_reason', requiresReason: true },
    { label: 'Schedule follow-up to sign', actionType: 'schedule_follow_up' },
    { label: 'Escalate to manager', actionType: 'escalate' },
  ],
  openings_pricing: [
    { label: 'Add openings now', actionType: 'route_focus', payload: { tab: 'sketch' } },
    { label: 'Confirm job-level price', actionType: 'apply_quote_options', payload: { action: 'confirm_job_level_price' } },
    { label: 'Recalculate from openings', actionType: 'apply_quote_options', payload: { action: 'recalculate' } },
    { label: 'Open pricing tab', actionType: 'route_focus', payload: { tab: 'pricing' } },
    { label: 'Escalate to manager', actionType: 'escalate' },
  ],
  customer_header: [
    { label: 'Enter city manually', actionType: 'route_focus', payload: { tab: 'home', hash: '#customer', focusTarget: 'customerCity' } },
    { label: 'Enter state manually', actionType: 'route_focus', payload: { tab: 'home', hash: '#customer', focusTarget: 'customerState' } },
    { label: 'Enter ZIP manually', actionType: 'route_focus', payload: { tab: 'home', hash: '#customer', focusTarget: 'customerZip' } },
    { label: 'Mark unknown for draft', actionType: 'dismiss_with_reason', requiresReason: true },
    { label: 'Escalate to manager', actionType: 'escalate' },
  ],
  product_options: [
    { label: 'Add argon (all openings)', actionType: 'apply_product_option', payload: { optionCode: 'argon' } },
    { label: 'Customer declined argon', actionType: 'dismiss_with_reason', requiresReason: true },
    { label: 'Open product options', actionType: 'route_focus', payload: { tab: 'pricing' } },
    { label: 'Escalate to manager', actionType: 'escalate' },
  ],
  follow_up: [
    { label: 'Schedule follow-up', actionType: 'schedule_follow_up' },
    { label: 'No follow-up needed', actionType: 'dismiss_with_reason', requiresReason: true },
  ],
};

const GROUP_META: Record<string, { title: string; emoji: string; message: string }> = {
  signature_completion: {
    title: 'Complete Signatures',
    emoji: '✍️',
    message: 'Signatures and initials are required before final proposal or export.',
  },
  openings_pricing: {
    title: 'Complete Openings & Pricing',
    emoji: '📐',
    message: 'Openings and pricing must be confirmed before proposal or export.',
  },
  customer_header: {
    title: 'Complete Customer Details',
    emoji: '👤',
    message: 'Customer address details are needed for the order form.',
  },
  product_options: {
    title: 'Confirm Product Options',
    emoji: '🪟',
    message: 'Product options require review or confirmation.',
  },
  follow_up: {
    title: 'Set Follow-Up',
    emoji: '📅',
    message: 'A follow-up appointment or call should be scheduled.',
  },
};

// Emoji by category for individual issue cards
function issueEmoji(w: UnifiedWarning): string {
  if (w.category === 'tempered') return '🔒';
  if (w.category === 'sketch') return '📍';
  if (w.category === 'measurement' || w.category === 'brick') return '📏';
  if (w.category === 'screen') return '🪟';
  if (w.category === 'specialty') return '⭐';
  if (w.category === 'pricing') return '💰';
  if (w.category === 'color') return '🎨';
  if (w.category === 'energy') return '⚡';
  if (w.category === 'consistency') return '🔗';
  if (w.category === 'order') return '📋';
  return 'ℹ️';
}

// ── Main grouping function ───────────────────────────────────
export function groupValidationIssues(warnings: UnifiedWarning[]): ReviewGroup[] {
  const buckets: Record<string, UnifiedWarning[]> = {};

  for (const rawW of warnings) {
    // Enrich each warning so it has a real recommendedFix and alternativeFixes
    const w = enrichValidationWarning(rawW);
    const key = resolveGroupKey(w);
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(w);
  }

  const groups: ReviewGroup[] = [];

  // ── Defined display order for shared groups ──────────────
  const ORDER = [
    'signature_completion',
    'openings_pricing',
    'customer_header',
    'product_options',
    'follow_up',
  ];

  for (const key of ORDER) {
    const issues = buckets[key];
    if (!issues || issues.length === 0) continue;

    const meta = GROUP_META[key];
    groups.push({
      key,
      title: meta.title,
      emoji: meta.emoji,
      blocksSubmission: issues.some(i => i.blocksSubmission),
      message: meta.message,
      primaryAction: GROUP_PRIMARY_ACTIONS[key],
      alternativeActions: GROUP_ALTERNATIVE_ACTIONS[key] || [],
      issues,
    });
  }

  // ── Individual issue cards (one per unique __individual__ key) ──
  const individualKeys = Object.keys(buckets)
    .filter(k => k.startsWith('__individual__'))
    // Sort: blockers first, then by severity, then alphabetically
    .sort((a, b) => {
      const wa = buckets[a][0];
      const wb = buckets[b][0];
      if (wa.blocksSubmission !== wb.blocksSubmission) return wa.blocksSubmission ? -1 : 1;
      const sevOrder = { critical: 0, high: 1, warning: 2, info: 3 };
      const sa = sevOrder[wa.severity] ?? 3;
      const sb = sevOrder[wb.severity] ?? 3;
      if (sa !== sb) return sa - sb;
      return a.localeCompare(b);
    });

  for (const key of individualKeys) {
    const issues = buckets[key]; // always exactly 1 warning per __individual__ key
    const w = issues[0];

    const enriched = enrichValidationWarning(w);

    const primaryAction: RecommendedFix = enriched.recommendedFix ?? {
      label: w.openingNumber !== undefined ? `Edit Opening #${w.openingNumber}` : 'Open Section',
      actionType: 'route_focus',
      payload: {
        tab: w.category === 'sketch' ? 'sketch' : w.openingNumber !== undefined ? 'pricing' : 'home',
        openingNumber: w.openingNumber,
      },
    };

    const alternativeActions: AlternativeFix[] = (enriched.alternativeFixes as AlternativeFix[] | undefined) ?? [
      { label: 'Dismiss', actionType: 'dismiss_with_reason' },
    ];

    // Build a user-friendly title for the card
    const cardTitle = w.title.length > 50 ? w.title.slice(0, 50) + '…' : w.title;
    const openingTag = w.openingNumber !== undefined ? ` — Opening #${w.openingNumber}` : '';

    groups.push({
      key,
      title: `${cardTitle}${openingTag}`,
      emoji: issueEmoji(w),
      blocksSubmission: w.blocksSubmission,
      message: w.detail,
      primaryAction,
      alternativeActions,
      issues,
    });
  }

  return groups;
}
