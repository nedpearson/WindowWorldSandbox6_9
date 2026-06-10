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

// Suggest rules from guideline document
rulesRoutes.get('/suggest', async (_req, res) => {
  try {
    let textContent = '';
    const pathsToTry = [
      join(__dirname, '../../reference/window-world/2026-btr-pricing-guidelines-text-only.md'),
      'C:/dev/github/personal/WindowWorldSandbox6_9/server/reference/window-world/2026-btr-pricing-guidelines-text-only.md'
    ];
    for (const p of pathsToTry) {
      if (existsSync(p)) {
        textContent = readFileSync(p, 'utf-8');
        break;
      }
    }

    const suggestions: any[] = [];
    const lowerText = textContent.toLowerCase();
    
    if (lowerText.includes('oriel')) {
      suggestions.push({
        id: 'sug-oriel-dh',
        name: '3000 DH Oriel Max 50 Inches',
        category: 'oriel',
        sourceSection: '3000 Model Rules and Exceptions',
        sourcePage: '17',
        triggerField: 'series',
        operator: 'equals',
        triggerValue: '3000',
        actionType: 'block_final',
        actionField: 'orielHeight',
        actionValue: '50',
        message: '3000 DH oriel windows can be max 50 inches. Oriel over 50 inches requires 03A0 Single Hung.',
        fieldRepGuidance: 'Oriel window over 50 inches requires changing the model series to 03A0 Single Hung.',
        installerNoteTemplate: 'Oriel height check required.',
        orderFormImpact: 'Blocker on order form generation',
        contractImpact: 'Forced model change if over limit',
        pricingImpact: 'None',
        validationSeverity: 'Block Final Workbook',
        confidence: 98,
        recommendedTestCase: 'DH Window with Oriel selected and height 52 inches',
      });
    }

    if (lowerText.includes('trim')) {
      suggestions.push({
        id: 'sug-inside-set-trim',
        name: 'Inside Set → Trim Required',
        category: 'exterior_install',
        sourceSection: 'Labor Requirement Memos (Trim)',
        sourcePage: '102',
        triggerField: 'insideSet',
        operator: 'equals',
        triggerValue: 'true',
        actionType: 'require_field',
        actionField: 'trim',
        actionValue: 'Required',
        message: 'Trim is required when windows are inside set unless the exterior is wood.',
        fieldRepGuidance: 'Trim is required when windows are inside set unless the exterior is wood.',
        installerNoteTemplate: 'Inside set windows - vinyl trim required.',
        orderFormImpact: 'Order Form labor section - trim checked',
        contractImpact: 'Trim line item added',
        pricingImpact: 'Standard trim pricing applies',
        validationSeverity: 'Block Final Workbook',
        confidence: 95,
        recommendedTestCase: 'Inside set window with brick exterior and trim omitted',
      });
    }

    if (lowerText.includes('flashing')) {
      suggestions.push({
        id: 'sug-siding-flashing',
        name: 'Siding → Header Flashing Suggested',
        category: 'exterior_install',
        sourceSection: 'Labor Requirement Memos (Header Flashing)',
        sourcePage: '102',
        triggerField: 'exteriorType',
        operator: 'equals',
        triggerValue: 'Siding',
        actionType: 'suggest_field',
        actionField: 'headerFlashing',
        actionValue: 'Suggested',
        message: 'When exterior is siding, header flashing is commonly needed unless protected by covering.',
        fieldRepGuidance: 'When exterior is siding, header flashing is commonly needed unless protected by covering.',
        installerNoteTemplate: 'Confirm if header flashing is required.',
        orderFormImpact: 'Order Form labor section note',
        contractImpact: 'Header flashing option suggestion',
        pricingImpact: 'Surcharge if selected',
        validationSeverity: 'Warning',
        confidence: 90,
        recommendedTestCase: 'Siding exterior window with header flashing omitted',
      });
    }

    if (lowerText.includes('wells fargo')) {
      suggestions.push({
        id: 'sug-wells-fargo',
        name: 'Wells Fargo Finance Device Check',
        category: 'final_export',
        sourceSection: 'Audit Wells Fargo Memos',
        sourcePage: '120',
        triggerField: 'financeProvider',
        operator: 'equals',
        triggerValue: 'Wells Fargo',
        actionType: 'add_warning',
        actionField: 'customerDeviceFinance',
        actionValue: 'false',
        message: 'Wells Fargo customer must complete remote authorization on customer device.',
        fieldRepGuidance: 'Wells Fargo customer must complete remote authorization on customer device. Do not let salesperson complete Wells Fargo remote application on salesperson device.',
        installerNoteTemplate: 'Confirm remote authorization was done on customer device.',
        orderFormImpact: 'Blocker on order finalization',
        contractImpact: 'Verification warning',
        pricingImpact: 'None',
        validationSeverity: 'Block Final Workbook',
        confidence: 96,
        recommendedTestCase: 'Wells Fargo financing chosen and customer device auth flag is unchecked',
      });
    }

    if (lowerText.includes('tempering')) {
      suggestions.push({
        id: 'sug-tempered-door',
        name: 'Tempered Adjacent Door',
        category: 'tempered_glass',
        sourceSection: 'Tempering Guidelines',
        sourcePage: '115',
        triggerField: 'adjacentToDoor',
        operator: 'equals',
        triggerValue: 'true',
        actionType: 'require_field',
        actionField: 'temperedRequired',
        actionValue: 'true',
        message: 'Safety glass required adjacent to door.',
        fieldRepGuidance: 'Glazing adjacent to door (within 24 inches) with bottom exposed edge < 60 inches above floor requires tempered glass.',
        installerNoteTemplate: 'Tempered glass near door.',
        orderFormImpact: 'Glass option set to Tempered',
        contractImpact: 'Tempered glass surcharge',
        pricingImpact: 'Separately itemized tempering surcharge',
        validationSeverity: 'Block Final Workbook',
        confidence: 95,
        recommendedTestCase: 'Window adjacent to door within 24 inches with bottom edge 30 inches off floor',
      });
    }

    res.json(suggestions);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to suggest rules', details: err.message });
  }
});

rulesRoutes.post('/suggest', async (req, res) => {
  // forward POST to GET for compatibility
  res.redirect(307, '/api/rules/suggest');
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
