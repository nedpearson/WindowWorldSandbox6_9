import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { prisma } from '../index.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

export const rulesRoutes = Router();
rulesRoutes.use(requireAuth);

// ── JSON file fallback when BusinessRule table doesn't exist in DB ────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '../../../data');
const RULES_FILE = join(DATA_DIR, 'business_rules.json');

const SEED_RULES = [
  { id: 'rule_glass_lee', ruleKey: 'ww-glass-default-lee', name: 'Glass Default = LEE', description: 'Default glass option is LEE (Low-E/Argon)', category: 'window_defaults', triggerField: null, triggerValue: null, actionType: 'set_field', actionField: 'glassPackage', actionValue: 'LEE', severity: 'info', message: 'Glass default set to LEE', isActive: true, autoApply: true, requiresConfirmation: false, requiresOverrideReason: false, needsVerification: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'rule_foam_default', ruleKey: 'ww-foam-enhanced-default', name: 'Foam Enhanced Default', description: 'Foam enhanced is checked by default on all openings', category: 'window_defaults', triggerField: null, triggerValue: null, actionType: 'set_field', actionField: 'foamEnhanced', actionValue: 'true', severity: 'info', message: 'Foam enhanced defaulted ON', isActive: true, autoApply: true, requiresConfirmation: false, requiresOverrideReason: false, needsVerification: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'rule_type_removed_alum', ruleKey: 'ww-type-removed-alum', name: 'Type Removed = ALUM', description: 'Default type removed is ALUM', category: 'window_defaults', triggerField: null, triggerValue: null, actionType: 'set_field', actionField: 'removalType', actionValue: 'ALUM', severity: 'info', message: 'Type removed defaulted to ALUM', isActive: true, autoApply: true, requiresConfirmation: false, requiresOverrideReason: false, needsVerification: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'rule_brick_ext', ruleKey: 'ww-brick-ext-install', name: 'Brick → EXT Install', description: 'Brick exterior defaults Install Type to EXT', category: 'exterior_install', triggerField: 'exteriorType', triggerValue: 'Brick', actionType: 'set_field', actionField: 'installType', actionValue: 'EXT', severity: 'info', message: 'Brick → EXT install auto-applied', isActive: true, autoApply: true, requiresConfirmation: false, requiresOverrideReason: false, needsVerification: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'rule_siding_int', ruleKey: 'ww-siding-wood-stucco-int', name: 'Siding/Wood/Stucco → INT + Trim/Header', description: 'Siding, wood, or stucco exterior → INT install, requires vinyl trim and header', category: 'exterior_install', triggerField: 'exteriorType', triggerValue: 'Siding', actionType: 'require_confirmation', actionField: 'installType', actionValue: 'INT', severity: 'high', message: 'Siding/Wood → INT install. Vinyl trim + header required.', isActive: true, autoApply: true, requiresConfirmation: true, requiresOverrideReason: false, needsVerification: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'rule_pic_no_screen', ruleKey: 'ww-picture-no-screen', name: 'Picture Window → No Screen', description: 'Picture windows default to No Screen', category: 'window_defaults', triggerField: 'productCategory', triggerValue: 'picture', actionType: 'set_field', actionField: 'screenOption', actionValue: 'No Screen', severity: 'info', message: 'Picture window → no screen', isActive: true, autoApply: true, requiresConfirmation: false, requiresOverrideReason: false, needsVerification: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'rule_clear_story', ruleKey: 'ww-clear-story-pricing', name: 'Clear Story Pricing ($225/$75)', description: 'Clear story / upper floor: first = $225, each additional = $75', category: 'pricing', triggerField: 'floorNumber', triggerValue: '2', actionType: 'add_price', actionField: null, actionValue: null, severity: 'high', message: 'Clear story charge: first = $225, additional = $75', isActive: true, autoApply: true, requiresConfirmation: false, requiresOverrideReason: false, needsVerification: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'rule_bso', ruleKey: 'ww-bso-expansion', name: 'BSO = Bottom Sash Only', description: 'Expand BSO abbreviation to Bottom Sash Only', category: 'window_defaults', triggerField: null, triggerValue: null, actionType: 'expand_abbreviation', actionField: 'notes', actionValue: 'Bottom Sash Only', severity: 'info', message: 'BSO = Bottom Sash Only', isActive: true, autoApply: true, requiresConfirmation: false, requiresOverrideReason: false, needsVerification: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'rule_diff_color', ruleKey: 'ww-different-color', name: 'Different Color Warning', description: 'Non-standard color selected — mark out on order form', category: 'window_defaults', triggerField: 'interiorColor', triggerValue: null, actionType: 'warn', actionField: null, actionValue: null, severity: 'high', message: 'Different color selected. Mark out the other color on the order form.', isActive: true, autoApply: false, requiresConfirmation: true, requiresOverrideReason: false, needsVerification: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'rule_tempered_tub', ruleKey: 'ww-tempered-tub-shower', name: 'Tempered — Tub/Shower Within 60"', description: 'Safety glazing required for windows within 60 inches of a tub or shower drain', category: 'tempered_glass', triggerField: 'tubOrShowerNearby', triggerValue: 'yes', actionType: 'require_confirmation', actionField: 'temperedGlass', actionValue: 'full', severity: 'blocker', message: 'Window within 60" of tub/shower — tempered glass REQUIRED', isActive: true, autoApply: false, requiresConfirmation: true, requiresOverrideReason: true, needsVerification: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'rule_tempered_low', ruleKey: 'ww-tempered-low-glass', name: 'Tempered — Low Glass <18" + >9 sqft', description: 'Safety glazing required when bottom of glass is <18" from floor AND glass area >9 sq ft', category: 'tempered_glass', triggerField: 'bottomGlassHeightInches', triggerValue: null, actionType: 'require_confirmation', actionField: 'temperedGlass', actionValue: 'full', severity: 'blocker', message: 'Low glass (<18") with area >9 sq ft — tempered glass REQUIRED', isActive: true, autoApply: false, requiresConfirmation: true, requiresOverrideReason: true, needsVerification: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

function loadJsonRules(): any[] {
  try {
    if (!existsSync(RULES_FILE)) {
      if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
      writeFileSync(RULES_FILE, JSON.stringify(SEED_RULES, null, 2));
      return SEED_RULES;
    }
    return JSON.parse(readFileSync(RULES_FILE, 'utf-8'));
  } catch {
    return SEED_RULES;
  }
}

function saveJsonRules(rules: any[]): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(RULES_FILE, JSON.stringify(rules, null, 2));
  } catch (e) {
    console.error('Failed to save rules to JSON:', e);
  }
}

// ── Try Prisma first, fall back to JSON file ──────────────────────────────────
async function getRules(): Promise<any[]> {
  try {
    return await (prisma as any).businessRule.findMany({ orderBy: { createdAt: 'asc' } });
  } catch {
    return loadJsonRules();
  }
}

async function createRule(data: any): Promise<any> {
  try {
    return await (prisma as any).businessRule.create({ data });
  } catch {
    const rules = loadJsonRules();
    const newRule = { ...data, id: randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    saveJsonRules([...rules, newRule]);
    return newRule;
  }
}

async function updateRule(id: string, data: any): Promise<any> {
  try {
    return await (prisma as any).businessRule.update({ where: { id }, data });
  } catch {
    const rules = loadJsonRules();
    const idx = rules.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Rule not found');
    rules[idx] = { ...rules[idx], ...data, updatedAt: new Date().toISOString() };
    saveJsonRules(rules);
    return rules[idx];
  }
}

async function deleteRule(id: string): Promise<void> {
  try {
    await (prisma as any).businessRule.delete({ where: { id } });
  } catch {
    const rules = loadJsonRules().filter(r => r.id !== id);
    saveJsonRules(rules);
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

// List all rules
rulesRoutes.get('/', async (_req, res) => {
  try {
    res.json(await getRules());
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch rules', details: err.message });
  }
});

// Get single rule
rulesRoutes.get('/:id', async (req, res) => {
  try {
    const rules = await getRules();
    const rule = rules.find(r => r.id === String(req.params.id));
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    res.json(rule);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch rule' });
  }
});

// Create rule — admin/manager only
rulesRoutes.post('/', requireAdmin, async (req, res) => {
  try {
    const rule = await createRule(req.body);
    res.status(201).json(rule);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create rule', details: err.message });
  }
});

// Update rule — admin/manager only
rulesRoutes.put('/:id', requireAdmin, async (req, res) => {
  try {
    const rule = await updateRule(String(req.params.id), req.body);
    res.json(rule);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update rule', details: err.message });
  }
});

// Toggle active — admin only
rulesRoutes.patch('/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const rules = await getRules();
    const existing = rules.find(r => r.id === String(req.params.id));
    if (!existing) return res.status(404).json({ error: 'Rule not found' });
    const updated = await updateRule(String(req.params.id), { isActive: !existing.isActive });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to toggle rule', details: err.message });
  }
});

// Delete rule — admin only
rulesRoutes.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await deleteRule(String(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete rule', details: err.message });
  }
});
