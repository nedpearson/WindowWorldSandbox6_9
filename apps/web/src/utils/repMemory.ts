// ═══════════════════════════════════════════════════════════
// Smart Rep Memory — Learns patterns, suggests defaults,
// enables one-tap config reuse, and auto-completes fields.
// Uses localStorage for instant persistence.
// ═══════════════════════════════════════════════════════════

const STORAGE_KEY = 'wwa_rep_memory';

export interface SavedConfig {
  id: string;
  name: string;
  favorite: boolean;
  usageCount: number;
  lastUsed: number;
  fields: Record<string, any>;
}

export interface NoteSuggestion {
  text: string;
  category: 'install' | 'access' | 'exterior' | 'damage' | 'general';
  usageCount: number;
}

export interface SmartSuggestion {
  id: string;
  type: 'apply_to_all' | 'apply_to_remaining' | 'one_tap_fix' | 'config_reuse' | 'note_suggest';
  label: string;
  detail?: string;
  icon: string;
  action: () => void;
}

interface MemoryStore {
  configs: SavedConfig[];
  noteSuggestions: NoteSuggestion[];
  roomLabels: Record<string, number>;  // room name → usage count
  fieldFrequency: Record<string, Record<string, number>>; // field → value → count
}

function loadStore(): MemoryStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { console.debug("[swallowed error]", e); }
  return { configs: [], noteSuggestions: [], roomLabels: {}, fieldFrequency: {} };
}

function saveStore(store: MemoryStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

// ─── LEARN FROM SAVED OPENINGS ──────────────────────────
export function learnFromOpening(opening: any) {
  const store = loadStore();

  // Track room labels
  if (opening.roomLocation) {
    store.roomLabels[opening.roomLocation] = (store.roomLabels[opening.roomLocation] || 0) + 1;
  }

  // Track field values
  const tracked = ['interiorColor', 'exteriorColor', 'gridStyle', 'glassPackage', 'screenOption',
    'removalType', 'seriesModel', 'productCategory', 'temperedGlass', 'obscureGlass'];
  for (const field of tracked) {
    const val = opening[field];
    if (val && val !== 'none') {
      if (!store.fieldFrequency[field]) store.fieldFrequency[field] = {};
      store.fieldFrequency[field][val] = (store.fieldFrequency[field][val] || 0) + 1;
    }
  }

  // Track install notes as suggestions
  if (opening.installNotes && opening.installNotes.length > 5) {
    const existing = store.noteSuggestions.find(n => n.text === opening.installNotes);
    if (existing) existing.usageCount++;
    else {
      const cat = detectNoteCategory(opening.installNotes);
      store.noteSuggestions.push({ text: opening.installNotes, category: cat, usageCount: 1 });
    }
    // Keep only top 20
    store.noteSuggestions.sort((a, b) => b.usageCount - a.usageCount);
    store.noteSuggestions = store.noteSuggestions.slice(0, 20);
  }

  saveStore(store);
}

function detectNoteCategory(note: string): NoteSuggestion['category'] {
  const lower = note.toLowerCase();
  if (lower.match(/ladder|scaffold|access|narrow|tight/)) return 'access';
  if (lower.match(/brick|stucco|siding|wood|vinyl|exterior/)) return 'exterior';
  if (lower.match(/rot|damage|sill|mold|repair/)) return 'damage';
  if (lower.match(/install|remove|tear|insert|trim/)) return 'install';
  return 'general';
}

// ─── SAVED CONFIGURATIONS ───────────────────────────────
export function saveConfig(name: string, opening: any, favorite = false) {
  const store = loadStore();
  const fields: Record<string, any> = {};
  const keep = ['productCategory', 'seriesModel', 'interiorColor', 'exteriorColor',
    'gridStyle', 'gridPattern', 'glassPackage', 'temperedGlass', 'obscureGlass',
    'argon', 'foamEnhanced', 'nailFin', 'oriel', 'screenOption', 'removalType', 'lowEPackage'];
  for (const k of keep) if (opening[k] !== undefined) fields[k] = opening[k];

  const id = `cfg_${Date.now()}`;
  store.configs.push({ id, name, favorite, usageCount: 0, lastUsed: Date.now(), fields });
  saveStore(store);
  return id;
}

export function getConfigs(): SavedConfig[] {
  return loadStore().configs.sort((a, b) => {
    if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
    return b.usageCount - a.usageCount;
  });
}

export function applyConfig(configId: string, opening: any): any {
  const store = loadStore();
  const config = store.configs.find(c => c.id === configId);
  if (!config) return opening;
  config.usageCount++;
  config.lastUsed = Date.now();
  saveStore(store);
  return { ...opening, ...config.fields };
}

export function toggleFavorite(configId: string) {
  const store = loadStore();
  const config = store.configs.find(c => c.id === configId);
  if (config) { config.favorite = !config.favorite; saveStore(store); }
}

export function deleteConfig(configId: string) {
  const store = loadStore();
  store.configs = store.configs.filter(c => c.id !== configId);
  saveStore(store);
}

// ─── SMART DEFAULTS FROM CURRENT JOB ────────────────────
export function detectJobDefaults(openings: any[]): Record<string, any> {
  if (openings.length < 2) return {};
  const defaults: Record<string, any> = {};
  const fields = ['interiorColor', 'exteriorColor', 'gridStyle', 'glassPackage',
    'screenOption', 'removalType', 'seriesModel'];

  for (const field of fields) {
    const counts: Record<string, number> = {};
    for (const op of openings) {
      const val = op[field];
      if (val && val !== 'none') counts[val] = (counts[val] || 0) + 1;
    }
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (entries.length > 0 && entries[0][1] >= openings.length * 0.6) {
      defaults[field] = entries[0][0];
    }
  }
  return defaults;
}

// ─── GENERATE SMART SUGGESTIONS ─────────────────────────
export function generateSuggestions(
  openings: any[],
  currentOpening: any | null,
  onApply: (updates: Record<string, any>, targets: 'current' | 'all' | 'remaining') => void,
): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = [];
  const store = loadStore();
  const jobDefaults = detectJobDefaults(openings);

  // ─── "Apply to remaining" suggestions ─────────────
  for (const [field, value] of Object.entries(jobDefaults)) {
    const missingCount = openings.filter(o => !o[field] || o[field] === 'none' || o[field] !== value).length;
    if (missingCount > 0 && missingCount < openings.length) {
      const label = fieldLabel(field);
      suggestions.push({
        id: `apply-${field}`,
        type: 'apply_to_remaining',
        label: `Apply ${value} ${label} to ${missingCount} remaining`,
        detail: `Most openings use ${value} for ${label}`,
        icon: '🔄',
        action: () => onApply({ [field]: value }, 'remaining'),
      });
    }
  }

  // ─── "One-tap fix" for common missing fields ──────
  const missingFields: Record<string, number> = {};
  const fixableFields = ['floorNumber', 'screenOption', 'gridStyle', 'removalType', 'elevation'];
  for (const op of openings) {
    for (const f of fixableFields) {
      if (!op[f] || op[f] === 'none' || op[f] === 0) {
        missingFields[f] = (missingFields[f] || 0) + 1;
      }
    }
  }
  for (const [field, count] of Object.entries(missingFields)) {
    if (count >= Math.max(2, openings.length * 0.5)) {
      const label = fieldLabel(field);
      const defaultVal = getSmartDefault(field, openings, store);
      if (defaultVal) {
        suggestions.push({
          id: `fix-${field}`,
          type: 'one_tap_fix',
          label: `Set ${label} to "${defaultVal}" on ${count} openings`,
          detail: `${count} openings are missing ${label}`,
          icon: '⚡',
          action: () => onApply({ [field]: defaultVal }, 'all'),
        });
      }
    }
  }

  // ─── Saved config suggestions ─────────────────────
  const topConfigs = store.configs.filter(c => c.favorite || c.usageCount >= 2).slice(0, 3);
  for (const cfg of topConfigs) {
    suggestions.push({
      id: `cfg-${cfg.id}`,
      type: 'config_reuse',
      label: `${cfg.favorite ? '⭐' : ''} ${cfg.name}`,
      detail: `Used ${cfg.usageCount} times`,
      icon: '📋',
      action: () => currentOpening && onApply(cfg.fields, 'current'),
    });
  }

  // ─── Install note suggestions ─────────────────────
  if (currentOpening) {
    const contextNotes = getContextualNotes(currentOpening);
    for (const note of contextNotes.slice(0, 3)) {
      suggestions.push({
        id: `note-${note.text.slice(0, 15)}`,
        type: 'note_suggest',
        label: note.text,
        icon: '📝',
        action: () => {
          const existing = currentOpening.installNotes || '';
          onApply({ installNotes: existing ? `${existing}\n${note.text}` : note.text }, 'current');
        },
      });
    }
  }

  return suggestions;
}

// ─── CONTEXTUAL NOTE SUGGESTIONS ────────────────────────
function getContextualNotes(opening: any): { text: string; reason: string }[] {
  const notes: { text: string; reason: string }[] = [];
  const store = loadStore();

  // Context-driven
  if ((opening.floorNumber || 1) >= 2) {
    notes.push({ text: 'Second floor — ladder required', reason: 'Upper floor access' });
    notes.push({ text: 'Verify exterior access for scaffold', reason: 'Upper floor' });
  }
  if (opening.exteriorType?.toLowerCase()?.includes('brick')) {
    notes.push({ text: 'Brick opening — verify return depth', reason: 'Brick exterior' });
    notes.push({ text: 'Brickmold condition: good / needs replacement', reason: 'Brick' });
  }
  if (opening.sillRepair) {
    notes.push({ text: 'Sill repair required — see photo', reason: 'Sill damage' });
  }
  if (opening.roomLocation?.toLowerCase()?.match(/bath|shower/)) {
    notes.push({ text: 'Bathroom — verify tempered glass requirement', reason: 'Bathroom' });
  }
  if (opening.productCategory === 'patio_door') {
    notes.push({ text: 'Verify track condition and threshold height', reason: 'Door install' });
    notes.push({ text: 'Check header for proper support', reason: 'Door structural' });
  }

  // Learned notes from history
  const relevant = store.noteSuggestions
    .filter(n => {
      if (opening.floorNumber >= 2 && n.category === 'access') return true;
      if (opening.exteriorType?.includes('brick') && n.category === 'exterior') return true;
      if (opening.sillRepair && n.category === 'damage') return true;
      return n.usageCount >= 3;
    })
    .slice(0, 3);

  for (const n of relevant) {
    if (!notes.find(existing => existing.text === n.text)) {
      notes.push({ text: n.text, reason: `Used ${n.usageCount} times` });
    }
  }

  return notes;
}

// ─── ROOM LABEL SUGGESTIONS ─────────────────────────────
export function getRoomSuggestions(): string[] {
  const store = loadStore();
  const defaults = ['Living Room', 'Bedroom', 'Master Bedroom', 'Kitchen', 'Bathroom',
    'Dining Room', 'Family Room', 'Office', 'Laundry', 'Garage', 'Basement',
    'Foyer', 'Hallway', 'Nursery', 'Guest Room', 'Den'];

  // Merge with learned rooms, prioritize by usage
  const all = new Map<string, number>();
  for (const room of defaults) all.set(room, 0);
  for (const [room, count] of Object.entries(store.roomLabels)) all.set(room, count);

  return Array.from(all.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([room]) => room);
}

// ─── HELPERS ────────────────────────────────────────────
function fieldLabel(field: string): string {
  const labels: Record<string, string> = {
    interiorColor: 'interior color', exteriorColor: 'exterior color',
    gridStyle: 'grid style', glassPackage: 'glass package',
    screenOption: 'screen', removalType: 'removal type',
    seriesModel: 'series', floorNumber: 'floor number',
    elevation: 'elevation', productCategory: 'product type',
  };
  return labels[field] || field;
}

function getSmartDefault(field: string, openings: any[], store: MemoryStore): any {
  // First check job majority
  const counts: Record<string, number> = {};
  for (const op of openings) {
    const val = op[field];
    if (val && val !== 'none' && val !== 0) counts[val] = (counts[val] || 0) + 1;
  }
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (entries.length > 0) return entries[0][0];

  // Then check historical frequency
  const hist = store.fieldFrequency[field];
  if (hist) {
    const histEntries = Object.entries(hist).sort((a, b) => b[1] - a[1]);
    if (histEntries.length > 0) return histEntries[0][0];
  }

  // Hard defaults
  const hardDefaults: Record<string, any> = {
    floorNumber: 1, screenOption: 'Standard', elevation: 'front',
    gridStyle: 'None', removalType: 'full_tearout',
  };
  return hardDefaults[field];
}

// ─── BUILT-IN WINDOW CONFIGS ────────────────────────────
export function getBuiltInConfigs(): SavedConfig[] {
  return [
    {
      id: 'builtin-1', name: 'Standard White DH + Colonial', favorite: false, usageCount: 0, lastUsed: 0,
      fields: { productCategory: 'double_hung', seriesModel: '4000 Series', interiorColor: 'White', exteriorColor: 'White', gridStyle: 'Colonial', glassPackage: 'SolarZone', screenOption: 'Standard', removalType: 'full_tearout' },
    },
    {
      id: 'builtin-2', name: 'Beige/White DH + No Grid', favorite: false, usageCount: 0, lastUsed: 0,
      fields: { productCategory: 'double_hung', seriesModel: '4000 Series', interiorColor: 'White', exteriorColor: 'Almond', gridStyle: 'None', glassPackage: 'SolarZone', screenOption: 'Standard', removalType: 'full_tearout' },
    },
    {
      id: 'builtin-3', name: 'Standard Picture Window', favorite: false, usageCount: 0, lastUsed: 0,
      fields: { productCategory: 'picture', seriesModel: '4000 Series', interiorColor: 'White', exteriorColor: 'White', gridStyle: 'None', glassPackage: 'SolarZone', screenOption: 'None', removalType: 'full_tearout' },
    },
    {
      id: 'builtin-4', name: 'Brick Install Package', favorite: false, usageCount: 0, lastUsed: 0,
      fields: { removalType: 'full_tearout', nailFin: false, installNotes: 'Brick opening — verify return depth and brickmold condition' },
    },
  ];
}
