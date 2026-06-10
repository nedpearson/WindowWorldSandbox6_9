// ═══════════════════════════════════════════════════════════════
// Rule Execution Engine — DB-first with local fallback
// Loads rules from server API, falls back to local WINDOW_WORLD_RULES.
// Supports all action types, categories, and confirmation workflows.
// ═══════════════════════════════════════════════════════════════

import { WINDOW_WORLD_RULES, evaluateRules as localEvaluateRules } from './businessRules';
import type { RuleResult, RuleContext, RuleTrigger } from './businessRules';
import { api } from './api';

interface DbRule {
  id: string;
  ruleKey: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  severity: string;
  triggerField?: string;
  triggerValue?: string;
  triggerConditionJson?: any;
  actionType: string;
  actionField?: string;
  actionValue?: string;
  actionJson?: any;
  message: string;
  autoApply: boolean;
  requiresConfirmation: boolean;
  requiresOverrideReason: boolean;
}

// Cache DB rules for the session
let _cachedDbRules: DbRule[] | null = null;
let _lastFetch = 0;
const CACHE_MS = 5 * 60 * 1000; // 5 min

export async function loadDbRules(): Promise<DbRule[]> {
  if (_cachedDbRules && Date.now() - _lastFetch < CACHE_MS) return _cachedDbRules;
  try {
    const resp = await api.get('/rules');
    _cachedDbRules = resp.data || [];
    _lastFetch = Date.now();
    return _cachedDbRules!;
  } catch {
    return [];
  }
}

// Evaluate DB rules against an opening
function evaluateDbRule(rule: DbRule, opening: any): boolean {
  if (!rule.isActive) return false;
  if (!rule.triggerField) return true; // Global default rules always apply

  const fieldVal = (opening[rule.triggerField] || '').toString().toLowerCase();
  if (!rule.triggerValue) return fieldVal !== '' && fieldVal !== 'white'; // Non-default trigger

  return fieldVal.includes(rule.triggerValue.toLowerCase());
}

// Hybrid evaluation: try DB rules first, fallback to local
export async function evaluateRulesHybrid(
  opening: any,
  context: RuleContext,
  triggers: RuleTrigger[] = ['opening_save'],
): Promise<RuleResult[]> {
  const dbRules = await loadDbRules();

  if (dbRules.length > 0) {
    // Convert DB rules to RuleResults
    const results: RuleResult[] = [];
    for (const rule of dbRules) {
      if (!evaluateDbRule(rule, opening)) continue;
      results.push({
        ruleId: rule.ruleKey || rule.id,
        ruleName: rule.name,
        severity: rule.severity as any,
        autoApplied: rule.autoApply,
        requiresConfirmation: rule.requiresConfirmation,
        actions: [{
          type: rule.actionType as any,
          field: rule.actionField || undefined,
          value: rule.actionValue || undefined,
          message: rule.message,
          applied: rule.autoApply,
          confirmed: false,
        }],
        openingNumber: opening.openingNumber,
        category: rule.category,
      });
    }
    return results;
  }

  // Fallback to local rules
  return localEvaluateRules(opening, context, triggers);
}

// Apply auto-rules using DB or local engine
export async function applyAutoRulesHybrid(
  opening: any,
  context: RuleContext,
): Promise<{ updated: any; results: RuleResult[] }> {
  const results = await evaluateRulesHybrid(opening, context, ['opening_save']);
  const updated = { ...opening };

  for (const result of results) {
    if (!result.autoApplied) continue;
    for (const action of result.actions) {
      if (action.type === 'set_field' && action.field) {
        let val: any = action.value;
        if (val === 'true') val = true;
        if (val === 'false') val = false;
        (updated as any)[action.field] = val;
        action.applied = true;
      }
    }
  }

  return { updated, results };
}

// Check for tempered glass requirements
export function evaluateTemperedRules(
  tubOrShowerNearby: string | null,
  distanceToTubInches: number | null,
  bottomGlassHeightInches: number | null,
  glassAreaSqft: number | null,
): { required: boolean; rules: string[] } {
  const triggered: string[] = [];

  // Rule A: Tub/Shower proximity
  if (tubOrShowerNearby === 'yes' && (distanceToTubInches === null || distanceToTubInches <= 60)) {
    triggered.push('Tub/Shower within 60" — tempered required');
  }

  // Rule B: Low glass + large area
  if (bottomGlassHeightInches !== null && bottomGlassHeightInches < 18 && glassAreaSqft !== null && glassAreaSqft > 9) {
    triggered.push('Low glass (<18") + area >9 sqft — tempered required');
  }

  return { required: triggered.length > 0, rules: triggered };
}

// Invalidate cache (for admin updates)
export function invalidateRuleCache() {
  _cachedDbRules = null;
  _lastFetch = 0;
}
