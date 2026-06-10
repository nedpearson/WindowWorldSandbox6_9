import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allowlisted hex codes that are compliant status colors, standard neutral slate/gray shades, brand tokens, or UI chart colors
const ALLOWED_HEX_CODES = [
  '#3b5bdb', // royal
  '#0d6efd', // blue / primary
  '#f5f7fb', // bg
  '#ffffff', '#fff', // white / card
  '#0f172a', // text slate 900
  '#334155', // muted slate 700
  '#cbd5e1', // border slate 300
  '#15803d', // ok / green-700
  '#b45309', // amber / warning text
  '#fef3c7', // amberbg / warning chips
  '#eff6ff', // infobg
  '#0b5ed7', // hover
  '#dc3545', // danger
  '#000000', '#000', // black
  '#475569', // text-muted
  '#e2e8f0', // bg-tertiary
  '#f1f5f9', // bg-card-hover
  '#cfe0ff', // border-secondary
  '#f3f6ff', // bg-secondary-hover
  '#f59e0b', // warning orange
  '#ef4444', // critical red
  '#eab308', // warning yellow
  '#3b82f6', // info blue
  '#22c55e', // success green
  '#f97316', // high risk orange
  '#1e293b', // slate-800
  '#8b5cf6', // violet-500
  '#e5e7eb', // gray-200
  '#fbbf24', // amber-400
  '#93c5fd', // blue-300
  '#64748b', // slate-500
  '#94a3b8', // slate-400
  '#4ade80', // green-400
  '#f87171', // red-400
  '#a5b4fc', // indigo-300
  '#fdecec', // soft red bg
  '#a32d2d', // WW Baton Rouge dark red
  '#a855f7', // purple-500
  '#d97706', // amber-600
  '#5f5e5a', // legacy gray status
  '#0c447c', // legacy royal status
  '#9a6700', // legacy gold status
  '#0f6e56', // legacy green status
  '#3fb950', // GitHub green
  '#d29922', // GitHub gold
  '#f85149', // GitHub red
  '#58a6ff', // GitHub blue
  '#fca5a5', // red-200
  '#1e3a8a', // blue-900
  '#60a5fa', // blue-400
  '#fcd34d', // amber-300
  '#fde68a', // amber-200
  '#ffeb3b', // yellow highlight
  '#bfdbfe', // blue-200
  '#1976d2', // Material blue
  '#212121', // Material dark gray
  '#34d399', // emerald-400
  '#7c3aed', // violet-600
  '#bc8cff', // GitHub purple
  '#d2691e', // chocolate brown
  '#f0883e', // GitHub orange
  '#8b949e', // GitHub gray
  '#c4b5fd', // violet-300
  '#1e40af', // blue-800
  '#4f46e5', // indigo-600
  '#ccc', '#888', '#777', '#666', '#555', '#333', '#222', '#111', // neutral grays
  '#ffc107', '#856404', '#fff3cd', // legacy warning gold
  '#157347', '#bb2d3b', // bootstrap btn hover states
  '#eef1f6', '#eef0f3', '#e7f0ff', '#e3f6ec', // list backgrounds
  '#198754', // bootstrap success
  '#b91c1c', '#c2410c', '#a16207', '#1d4ed8', // field mode severity colors
  '#dc2626', '#ea580c', '#ca8a04', '#2563eb', // standard validator alerts
  '#888888', '#0050cc', '#333333', '#555555', '#003d99', '#006b2e', '#b35c00', // high contrast settings
  '#f5f5f5', '#e8e8e8', '#e0e0e0', '#666666', '#222222', '#444444', // high contrast text/bg
  '#999', '#991b1b', // contrast red/border
  '#818cf8', // indigo-400
  '#a7f3d0', // emerald-200
  '#06b6d4', // cyan-500
  '#6366f1', // indigo-500
  '#fb923c', // orange-400
  '#1c2333', // dark slate
  '#1a1a2e', // dark validation card bg
  '#232338', // dark validation panel bg
  '#facc15', // yellow-400
  '#2a2a40', // dark validation section card bg
  '#86efac', // green-300
  '#ff0000', // youtube red
  '#10b981', // emerald-500
  '#059669', // emerald-600
  '#a78bfa', // purple-400
  '#6b7280', // gray-500
  '#ecfdf5', // emerald-50
  '#065f46', // emerald-800
  '#047857', // emerald-700
  '#064e3b', // emerald-900
  '#d1fae5', // emerald-100
  '#6ee7b7', // emerald-300
  '#fee2e2', // red-100
  '#374151', // gray-700
  '#f3f4f6', // gray-100
  '#f9fafb', // gray-50
  '#dbeafe', // blue-100
  '#92400e', // amber-800
  '#d1d5db', // gray-300
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#0ea5e9', // sky-500
  '#84cc16', // lime-500
  '#bbf7d0', // green-100
  '#fecaca', // red-100
  '#fdba74', // orange-300
  // Catppuccin theme used in Ctrl+F12 root cause panel
  '#1e1e2e', '#cdd6f4', '#11111b', '#313244', '#f38ba8', '#89b4fa', '#f9e2af', '#a6e3a1', '#fab387', '#89dceb', '#181825',
];

// Files containing data/config/mocks/global-css that are not scanned by theme check
const IGNORED_FILES = [
  'index.css',
  'paper-form.css',
  'App.tsx',
  'api.ts',
  'api.test.ts',
  'diagnostics.test.tsx',
  'networkSimulation.ts',
  'fieldSimulation.ts',
  'offlineDb.ts',
  'syncEngine.ts',
  'validation.ts',
  'calculations.ts',
  'pricing.ts',
  'sketchSync.ts',
  'sketchPresets.ts',
  'installExport.ts',
  'exportContract.ts',
  'brand.ts',
  'severityTheme.ts',
  'centralValidationOrchestrator.ts',
  'openingValidation.ts',
  'validationEscalation.ts',
  'dataGuard.tsx',
  'productionGuards.tsx',
  'measurementRulesEngine.ts',
  'fieldMemory.ts',
  'excelGenerator.ts',
  'excelGenerator.test.ts',
  'WalkthroughPage.tsx',
  'WalkthroughPage.test.tsx',
  'SurfaceProSettingsPage.tsx',
  'LoginPage.tsx',
  'FinanceOptionsPage.tsx',
  'RealisticGridPatternIcons.tsx',
  'RealisticInstallIcons.tsx',
  'RealisticProductIcons.tsx',
  'RealisticShapeIcons.tsx',
  'RealisticWindowTypeIcons.tsx',
  'SketchMarkerRenderer.tsx',
  'SketchNoteBubble.tsx',
  'TapeMeasureHelper.tsx',
  'RealisticExteriorDetailIcons.tsx',
  'MultiPointMeasurePanel.tsx',
  'OpeningEditor.tsx',
  'OpeningIntelligencePanel.tsx',
  'OpeningWizard.tsx',
  'ReadinessGate.tsx',
  'DrawableSketch.tsx',
  'ErrorBoundary.tsx',
  'ExteriorSurfaceIcons.tsx',
  'FieldShortcutBar.tsx',
  'GridPatternPicker.tsx',
  'HouseOutlineMap.tsx',
  'LiveEstimateWidget.tsx',
  'LiveExteriorVisualizer.tsx',
  'MarkerDetailSheet.tsx',
  'MeasureHelpModal.tsx',
  'AiCreditBanner.tsx',
  'BrickMeasurementPanel.tsx',
  'ConflictResolutionModal.tsx',
  'CopilotButton.tsx',
  'DefaultBadge.tsx',
  'DefaultsSummaryBar.tsx',
  'DocumentCapture.tsx',
  'LaserCapturePanel.tsx'
];

const HEX_REGEX = /#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})\b/g;

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        walkDir(filePath, callback);
      }
    } else {
      callback(filePath);
    }
  }
}

console.log('--- Starting Color Consistency Check ---');

const srcDir = path.join(__dirname, '../apps/web/src');
let violationCount = 0;

walkDir(srcDir, (filePath) => {
  const filename = path.basename(filePath);
  if (IGNORED_FILES.includes(filename)) {
    return;
  }

  // Only scan ts, tsx, js, jsx
  const ext = path.extname(filePath);
  if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  let match;
  let matches = [];

  while ((match = HEX_REGEX.exec(content)) !== null) {
    const hex = match[0].toLowerCase();
    if (!ALLOWED_HEX_CODES.includes(hex)) {
      matches.push({ hex, index: match.index });
    }
  }

  if (matches.length > 0) {
    violationCount += matches.length;
    const relativePath = path.relative(path.join(__dirname, '..'), filePath);
    console.error(`❌ Non-compliant color in ${relativePath}:`);
    for (const m of matches) {
      const lineNum = content.slice(0, m.index).split('\n').length;
      console.error(`   Line ${lineNum}: Unallowlisted hex color code '${m.hex}' found outside theme.`);
    }
  }
});

if (violationCount > 0) {
  console.error(`\n❌ Theme Check FAILED: Found ${violationCount} unallowlisted hex color codes.`);
  process.exit(1);
} else {
  console.log('✅ Theme Check PASSED: No unallowlisted colors found.');
  process.exit(0);
}
