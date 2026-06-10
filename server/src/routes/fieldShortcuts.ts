import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

export const fieldShortcutRoutes = Router();
fieldShortcutRoutes.use(requireAuth);

// ── WW Field Shortcuts ────────────────────────────────
const WW_SHORTCUTS = [
  { key: 'convert_slider', name: 'Convert to Slider', category: 'conversion', actions: { productCategory: 'slider' }, icon: '↔️' },
  { key: 'convert_oriel', name: 'Convert to Oriel', category: 'conversion', actions: { oriel: true, productCategory: 'double_hung' }, icon: '⬆️' },
  { key: 'eyebrow_over_dh', name: 'Eyebrow over DH', category: 'specialty', actions: { specialtyShape: 'eyebrow', productCategory: 'double_hung' }, icon: '🌙' },
  { key: 'circle_top_over_dh', name: 'Circle Top over DH', category: 'specialty', actions: { specialtyShape: 'circle_top', productCategory: 'double_hung' }, icon: '⭕' },
  { key: 'twin_mull', name: 'Twin Mulled', category: 'mull', actions: { mullGroup: true, mullCount: 2 }, icon: '🔲' },
  { key: 'triple_mull', name: 'Triple Mulled', category: 'mull', actions: { mullGroup: true, mullCount: 3 }, icon: '🔳' },
  { key: 'bath_tempered', name: 'Bath Tempered', category: 'safety', actions: { temperedGlass: 'full', roomLocation: 'Bathroom' }, icon: '🛁' },
  { key: 'obscure_glass', name: 'Obscure Glass', category: 'glass', actions: { obscureGlass: 'full' }, icon: '🔍' },
  { key: 'clear_story', name: 'Clear Story', category: 'install', actions: { clearStory: true, ladderRequired: true, floorNumber: 2 }, icon: '🪜' },
  { key: 'stucco_trim', name: 'Stucco w/ Trim+Header', category: 'install', actions: { exteriorType: 'Stucco', trimRequired: true, headerRequired: true }, icon: '🏗️' },
  { key: 'siding_trim', name: 'Siding w/ Trim+Header', category: 'install', actions: { exteriorType: 'Siding', trimRequired: true, headerRequired: true }, icon: '🪵' },
  { key: 'wood_trim', name: 'Wood w/ Trim+Header', category: 'install', actions: { exteriorType: 'Wood', trimRequired: true, headerRequired: true }, icon: '🌲' },
];

fieldShortcutRoutes.get('/', (_req, res) => {
  res.json(WW_SHORTCUTS);
});

// ── Pricing Adders ────────────────────────────────────
const WW_ADDERS = [
  { key: 'clear_story_first', name: 'Clear Story (1st)', amount: 225, logic: 'flat' },
  { key: 'clear_story_add', name: 'Clear Story (additional)', amount: 75, logic: 'flat' },
  { key: 'tempered_upgrade', name: 'Tempered Glass', amount: 0, logic: 'tier_lookup' },
  { key: 'obscure_upgrade', name: 'Obscure Glass', amount: 0, logic: 'tier_lookup' },
  { key: 'grid_colonial', name: 'Colonial Grids', amount: 0, logic: 'tier_lookup' },
];

fieldShortcutRoutes.get('/adders', (_req, res) => {
  res.json(WW_ADDERS);
});

// ── Included Scope Rules ──────────────────────────────
const INCLUDED_SCOPE = [
  { exteriorType: 'Stucco', includesTrim: true, includesHeader: true },
  { exteriorType: 'Siding', includesTrim: true, includesHeader: true },
  { exteriorType: 'Wood', includesTrim: true, includesHeader: true },
  { exteriorType: 'Brick', includesTrim: false, includesHeader: false },
];

fieldShortcutRoutes.get('/scope-rules', (_req, res) => {
  res.json(INCLUDED_SCOPE);
});
