// ═══════════════════════════════════════════════════════════════
// Rule Execution Engine — DB-first with local fallback
// Loads rules from server API, falls back to local WINDOW_WORLD_RULES.
// Supports all action types, categories, and confirmation workflows.
// ═══════════════════════════════════════════════════════════════

import { WINDOW_WORLD_RULES, evaluateRules as localEvaluateRules } from './businessRules';
import type { RuleResult, RuleContext, RuleTrigger } from './businessRules';
import { api } from './api';

export interface DbRule {
  id: string;
  ruleKey: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  severity: string;
  triggerField?: string;
  operator?: string;
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

  // Guideline Metadata and Lifecycle
  priority: number;
  sourceDocument?: string;
  sourceSection?: string;
  sourcePage?: string;
  fieldRepGuidance?: string;
  installerNoteTemplate?: string;
  orderFormImpact?: string;
  contractImpact?: string;
  pricingImpact?: string;
  workbookMappingKey?: string;
  appliesToAllReps: boolean;
  region?: string;
  createdBy?: string;
  updatedBy?: string;
  lastTestedAt?: string;
}

// Cache DB rules for the session
let _cachedDbRules: DbRule[] | null = null;
let _lastFetch = 0;
const CACHE_MS = 5 * 60 * 1000; // 5 min

export async function loadDbRules(): Promise<DbRule[]> {
  if (_cachedDbRules && Date.now() - _lastFetch < CACHE_MS) return _cachedDbRules;
  try {
    const resp = await api.get('/rules');
    // FIX: api.get resolves the body directly, not a wrapper object
    _cachedDbRules = Array.isArray(resp) ? resp : (resp?.data || []);
    _lastFetch = Date.now();
    return _cachedDbRules!;
  } catch {
    return [];
  }
}

// Evaluate DB rules against an opening
export function evaluateDbRule(rule: DbRule, opening: any, context?: RuleContext): boolean {
  if (!rule.isActive) return false;

  // 1. Oriel over 50 inches / 3000 DH Oriel Max 50
  if (rule.ruleKey === 'ww-oriel-dh-max-50') {
    const cat = (opening.productCategory || opening.windowType || '').toLowerCase();
    const isDH = cat.includes('double') || cat.includes('dh');
    const isOriel = opening.orielSelected === true || opening.orielSelected === 'true' || opening.oriel === true || opening.oriel === 'true';
    const height = parseFloat(opening.orielHeight || opening.orielUpperSashHeight || '0');
    return isOriel && isDH && height > 50;
  }

  // 2. Inside Set + not Wood → Trim Required
  if (rule.ruleKey === 'ww-inside-set-trim-required') {
    const isInsideSet = opening.insideSet === true || opening.insideSet === 'true' || (opening.installType || '').toLowerCase() === 'int';
    const isNotWood = (opening.exteriorType || '').toLowerCase() !== 'wood';
    return isInsideSet && isNotWood;
  }

  // 3. Wells Fargo Device Restriction
  if (rule.ruleKey === 'ww-wells-fargo-device-restriction') {
    const isWellsFargo = opening.financeProvider === 'Wells Fargo' || (context?.appointment?.financeProvider === 'Wells Fargo');
    const onMerchantDevice = opening.customerDeviceFinance === false || opening.customerDeviceFinance === 'false' || context?.appointment?.customerDeviceFinance === false;
    return isWellsFargo && onMerchantDevice;
  }

  // 4. Tempered adjacent to door
  if (rule.ruleKey === 'ww-tempered-adjacent-door') {
    const adj = opening.adjacentToDoor === true || opening.adjacentToDoor === 'true' || opening.adjacentToDoor === 'yes';
    const bottomEdge = parseFloat(opening.bottomEdgeFromFloor || opening.bottomGlassHeightInches || '100');
    const dist = parseFloat(opening.walkingSurfaceDistance || opening.distanceToTubInches || '100');
    return adj && bottomEdge < 60 && dist <= 24;
  }

  // 5. Special Shape Radius Trim
  if (rule.ruleKey === 'ww-special-shape-radius-trim') {
    const isSpecial = (opening.windowType || opening.productCategory || '').toLowerCase().includes('special');
    const isRadius = (opening.specialShapeType || '').toLowerCase().includes('arch') || (opening.specialShapeType || '').toLowerCase().includes('radius');
    const noNailFin = opening.nailFin !== true && opening.nailFin !== 'true';
    return isSpecial && isRadius && noNailFin;
  }

  // 6. Special Shape Polygon Trim
  if (rule.ruleKey === 'ww-special-shape-polygon-trim') {
    const isSpecial = (opening.windowType || opening.productCategory || '').toLowerCase().includes('special');
    const isPolygon = (opening.specialShapeType || '').toLowerCase().includes('polygon') || 
                      ['hexagon', 'octagon', 'pentagon', 'triangle', 'trapezoid'].some(p => (opening.specialShapeType || '').toLowerCase().includes(p));
    return isSpecial && isPolygon;
  }

  // 7. Special Shape max UI adder
  if (rule.ruleKey === 'ww-special-shape-max-ui-adder') {
    const isSpecial = (opening.windowType || opening.productCategory || '').toLowerCase().includes('special');
    const width = parseFloat(opening.width || '0');
    const height = parseFloat(opening.height || '0');
    const ui = width + height;
    return isSpecial && (ui > 120 || width > 84 || height > 84);
  }

  // 8. Mull Casement Pair -> 0972
  if (rule.ruleKey === 'ww-mull-casement-pair-0972') {
    const isMulled = opening.mullSelected === true || opening.isMulled === true;
    const is0971 = (opening.productModel || '').includes('0971');
    const width = parseFloat(opening.width || '0');
    const height = parseFloat(opening.height || '0');
    const ui = width + height;
    return isMulled && is0971 && width >= 32 && width <= 72 && height >= 19 && height <= 79 && ui <= 150;
  }

  // General field trigger evaluation
  if (!rule.triggerField) return true; // global rules

  const field = rule.triggerField;
  const operator = (rule.operator || 'equals').toLowerCase();
  const ruleVal = rule.triggerValue;

  const openingVal = opening[field];
  if (operator === 'is_empty') {
    return openingVal === undefined || openingVal === null || openingVal === '';
  }
  if (operator === 'is_not_empty') {
    return openingVal !== undefined && openingVal !== null && openingVal !== '';
  }

  const valStr = openingVal === undefined || openingVal === null ? '' : openingVal.toString();
  const ruleValStr = ruleVal === undefined || ruleVal === null ? '' : ruleVal.toString();

  switch (operator) {
    case 'equals':
    case '==':
    case '=':
      return valStr.toLowerCase() === ruleValStr.toLowerCase();
    case 'not_equals':
    case '!=':
      return valStr.toLowerCase() !== ruleValStr.toLowerCase();
    case 'contains':
      return valStr.toLowerCase().includes(ruleValStr.toLowerCase());
    case 'greater_than':
    case '>':
      return parseFloat(valStr) > parseFloat(ruleValStr);
    case 'less_than':
    case '<':
      return parseFloat(valStr) < parseFloat(ruleValStr);
    default:
      return valStr.toLowerCase() === ruleValStr.toLowerCase();
  }
}

function mapDbActionType(type: string): any {
  if (type === 'suggest_field') return 'set_field';
  if (type === 'require_field') return 'set_field';
  if (type === 'disable_option') return 'flag_field';
  if (type === 'add_installer_note' || type === 'add_sales_note' || type === 'add_order_form_note' || type === 'add_note') return 'add_note';
  if (type === 'add_warning') return 'add_warning';
  if (type === 'add_price') return 'add_price';
  if (type === 'ask_confirmation' || type === 'require_customer_confirm') return 'require_confirmation';
  return type;
}

function parseActionValue(value: string | undefined): any {
  if (value === 'true') return true;
  if (value === 'false') return false;
  const num = Number(value);
  if (!isNaN(num) && value !== '') return num;
  return value;
}

// Hybrid evaluation: try DB rules first, fallback to local
export async function evaluateRulesHybrid(
  opening: any,
  context: RuleContext,
  triggers: RuleTrigger[] = ['opening_save'],
): Promise<RuleResult[]> {
  const dbRules = await loadDbRules();

  if (dbRules.length > 0) {
    const results: RuleResult[] = [];
    for (const rule of dbRules) {
      if (!evaluateDbRule(rule, opening, context)) continue;
      results.push({
        ruleId: rule.ruleKey || rule.id,
        ruleName: rule.name,
        severity: rule.severity as any,
        autoApplied: rule.autoApply,
        requiresConfirmation: rule.requiresConfirmation,
        actions: [{
          type: mapDbActionType(rule.actionType),
          field: rule.actionField || undefined,
          value: parseActionValue(rule.actionValue),
          message: rule.fieldRepGuidance || rule.message,
          priceAmount: rule.actionType === 'add_price' ? parseFloat(rule.actionValue || '0') : undefined,
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
