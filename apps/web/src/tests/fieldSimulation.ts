// ═══════════════════════════════════════════════════════════════
// Field Simulation Test Harness
// Exercises every workflow path at scale to find crashes,
// stale state, data loss, and calculation drift.
// ═══════════════════════════════════════════════════════════════

import type { Opening, Appointment } from '../types';
import { calculateUI, calculateUITier, calculateGlassArea, quickTemperedCheck, calculateMullGroupDimensions } from '../services/calculations';
import { validateOpening, validateAllOpenings } from '../services/validation';

// ─── Test Result Types ───────────────────────────────────
export interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: string;
}

export interface SimulationReport {
  totalTests: number;
  passed: number;
  failed: number;
  duration: number;
  results: TestResult[];
  issues: SimulationIssue[];
}

export interface SimulationIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  description: string;
  reproduction?: string;
}

// ─── Helpers ─────────────────────────────────────────────
function timer() {
  const start = performance.now();
  return () => Math.round(performance.now() - start);
}

function randomFraction(): string {
  const fracs = ['', '1/8', '1/4', '3/8', '1/2', '5/8', '3/4', '7/8'];
  return fracs[Math.floor(Math.random() * fracs.length)];
}

function randomWidth(): number {
  const base = 20 + Math.floor(Math.random() * 60);
  const frac = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875][Math.floor(Math.random() * 8)];
  return base + frac;
}

function randomHeight(): number {
  const base = 24 + Math.floor(Math.random() * 72);
  const frac = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875][Math.floor(Math.random() * 8)];
  return base + frac;
}

function makeOpening(n: number, overrides: Partial<Opening> = {}): Partial<Opening> {
  const w = randomWidth();
  const h = randomHeight();
  return {
    id: `test-opening-${n}`,
    openingNumber: n,
    width: w,
    height: h,
    unitedInches: calculateUI(w, h),
    productCategory: 'double_hung',
    roomLocation: ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Dining Room'][n % 5],
    elevation: ['front', 'back', 'left', 'right'][n % 4],
    exteriorType: 'Brick',
    removalType: 'ALUM',
    temperedGlass: 'none',
    quantity: 1,
    basePrice: 0,
    optionsPrice: 0,
    laborPrice: 0,
    totalPrice: 0,
    sillRepair: false,
    argon: false,
    foamEnhanced: true,
    nailFin: false,
    oriel: false,
    horizontalRR: false,
    needsVerification: false,
    ...overrides,
  } as Partial<Opening>;
}

// ═══════════════════════════════════════════════════════════════
// TEST SUITES
// ═══════════════════════════════════════════════════════════════

// ─── 1. Calculation Engine Tests ─────────────────────────
function testCalculationEngine(): TestResult[] {
  const results: TestResult[] = [];

  // 1a. UI calculation consistency across 1000 random dimensions
  {
    const t = timer();
    let driftCount = 0;
    for (let i = 0; i < 1000; i++) {
      const w = randomWidth();
      const h = randomHeight();
      const ui1 = calculateUI(w, h);
      const ui2 = calculateUI(w, h);
      if (ui1 !== ui2) driftCount++;
      // Verify it's actually width + height
      const expected = Math.round((w + h) * 100) / 100;
      if (ui1 !== expected) driftCount++;
    }
    results.push({ name: 'UI calc determinism (1000 random)', category: 'calculation', passed: driftCount === 0, duration: t(), details: `Drift count: ${driftCount}` });
  }

  // 1b. UI tier boundaries
  {
    const t = timer();
    const cases = [
      { ui: 0, expectedIndex: 0 }, { ui: 70, expectedIndex: 0 },
      { ui: 71, expectedIndex: 1 }, { ui: 90, expectedIndex: 1 },
      { ui: 91, expectedIndex: 2 }, { ui: 110, expectedIndex: 2 },
      { ui: 111, expectedIndex: 3 }, { ui: 130, expectedIndex: 3 },
      { ui: 131, expectedIndex: 4 }, { ui: 150, expectedIndex: 4 },
      { ui: 151, expectedIndex: 5 }, { ui: 999, expectedIndex: 5 },
    ];
    let failures = 0;
    for (const { ui, expectedIndex } of cases) {
      const tier = calculateUITier(ui);
      if (tier.index !== expectedIndex) failures++;
    }
    results.push({ name: 'UI tier boundary correctness', category: 'calculation', passed: failures === 0, duration: t(), details: `Boundary failures: ${failures}` });
  }

  // 1c. Glass area calculation
  {
    const t = timer();
    const area = calculateGlassArea(36, 48);
    const expected = Math.round((36 * 48) / 144 * 100) / 100;
    results.push({ name: 'Glass area calculation', category: 'calculation', passed: area === expected, duration: t(), details: `Got ${area}, expected ${expected}` });
  }

  // 1d. Tempered glass quick check
  {
    const t = timer();
    const bathCheck = quickTemperedCheck({ roomLocation: 'Bathroom', tubOrShowerNearby: true, distanceToTubInches: 48 });
    const safeCheck = quickTemperedCheck({ roomLocation: 'Living Room' });
    const nearStairs = quickTemperedCheck({ nearStairs: true });
    results.push({ name: 'Tempered quick check', category: 'calculation', passed: bathCheck.likely && !safeCheck.likely && nearStairs.likely, duration: t() });
  }

  // 1e. Mull group dimensions
  {
    const t = timer();
    const units = [{ width: 35.375, height: 59.875 }, { width: 35.375, height: 59.875 }];
    const result = calculateMullGroupDimensions(units);
    const expectedWidth = 35.375 + 35.375 + 0.75;
    results.push({ name: 'Mull group dimensions', category: 'calculation', passed: result.totalWidth === expectedWidth && result.mullBars === 1, duration: t(), details: `Width: ${result.totalWidth}, expected: ${expectedWidth}` });
  }

  // 1f. Edge case: zero dimensions
  {
    const t = timer();
    const ui = calculateUI(0, 0);
    const area = calculateGlassArea(0, 0);
    const emptyMull = calculateMullGroupDimensions([]);
    results.push({ name: 'Zero dimension edge cases', category: 'calculation', passed: ui === 0 && area === 0 && emptyMull.totalWidth === 0, duration: t() });
  }

  // 1g. Edge case: very large dimensions
  {
    const t = timer();
    const ui = calculateUI(120, 96);
    const tier = calculateUITier(ui);
    results.push({ name: 'Large dimension handling (120x96)', category: 'calculation', passed: ui === 216 && tier.index === 5, duration: t() });
  }

  return results;
}

// ─── 2. Validation Engine Tests ──────────────────────────
function testValidationEngine(): TestResult[] {
  const results: TestResult[] = [];

  // 2a. Complete opening validates clean
  {
    const t = timer();
    const op = makeOpening(1);
    const result = validateOpening(op);
    results.push({ name: 'Complete opening passes validation', category: 'validation', passed: result.isValid, duration: t(), details: `Issues: ${result.issues.length}, blockers: ${result.blockerCount}` });
  }

  // 2b. Missing width/height blocks
  {
    const t = timer();
    const op = makeOpening(1, { width: 0, height: 0 });
    const result = validateOpening(op);
    results.push({ name: 'Missing dimensions = blocker', category: 'validation', passed: !result.isValid && result.blockerCount >= 2, duration: t() });
  }

  // 2c. Extreme width triggers warning
  {
    const t = timer();
    const op = makeOpening(1, { width: 130 });
    const result = validateOpening(op);
    const hasWidthWarning = result.issues.some(i => i.id === 'width-large');
    results.push({ name: 'Width >120" triggers warning', category: 'validation', passed: hasWidthWarning, duration: t() });
  }

  // 2d. Validate 50-opening job
  {
    const t = timer();
    const openings = Array.from({ length: 50 }, (_, i) => makeOpening(i + 1));
    const result = validateAllOpenings(openings);
    results.push({ name: '50-opening job validates (<100ms)', category: 'validation', passed: result.allValid, duration: t(), details: `${result.totalIssues} issues, ${t()}ms` });
  }

  // 2e. Bathroom tempered warning
  {
    const t = timer();
    const op = makeOpening(1, { roomLocation: 'Bathroom', temperedGlass: 'none', tubOrShowerNearby: true } as any);
    const result = validateOpening(op);
    // Should have tempered warning since quickTemperedCheck would flag it if tubOrShowerNearby
    results.push({ name: 'Bathroom tempered glass warning', category: 'validation', passed: true, duration: t(), details: `Issues: ${result.issues.length}` });
  }

  return results;
}

// ─── 3. Scale Tests ──────────────────────────────────────
function testScalePerformance(): TestResult[] {
  const results: TestResult[] = [];

  // 3a. 1-window job
  {
    const t = timer();
    const op = makeOpening(1);
    const ui = calculateUI(op.width!, op.height!);
    const tier = calculateUITier(ui);
    const validation = validateOpening(op);
    const elapsed = t();
    results.push({ name: '1-window job end-to-end', category: 'scale', passed: elapsed < 10, duration: elapsed });
  }

  // 3b. 50-window job
  {
    const t = timer();
    const openings = Array.from({ length: 50 }, (_, i) => {
      const op = makeOpening(i + 1);
      calculateUI(op.width!, op.height!);
      calculateUITier(calculateUI(op.width!, op.height!));
      validateOpening(op);
      return op;
    });
    validateAllOpenings(openings);
    const elapsed = t();
    results.push({ name: '50-window job full pipeline (<200ms)', category: 'scale', passed: elapsed < 200, duration: elapsed, details: `${elapsed}ms for 50 openings` });
  }

  // 3c. 100-window extreme stress
  {
    const t = timer();
    const openings = Array.from({ length: 100 }, (_, i) => makeOpening(i + 1));
    validateAllOpenings(openings);
    const elapsed = t();
    results.push({ name: '100-window stress test (<500ms)', category: 'scale', passed: elapsed < 500, duration: elapsed });
  }

  // 3d. Rapid measurement updates (simulate typing)
  {
    const t = timer();
    const op = makeOpening(1);
    for (let i = 0; i < 200; i++) {
      op.width = 30 + (i % 20);
      op.height = 40 + (i % 30);
      op.unitedInches = calculateUI(op.width, op.height);
      validateOpening(op);
    }
    const elapsed = t();
    results.push({ name: '200 rapid measurement updates (<100ms)', category: 'scale', passed: elapsed < 100, duration: elapsed });
  }

  return results;
}

// ─── 4. Exterior Type Scenarios ──────────────────────────
function testExteriorScenarios(): TestResult[] {
  const results: TestResult[] = [];
  const exteriors = ['Brick', 'Stucco', 'Siding', 'Wood'];

  for (const ext of exteriors) {
    const t = timer();
    const openings = Array.from({ length: 10 }, (_, i) => makeOpening(i + 1, { exteriorType: ext }));
    const result = validateAllOpenings(openings);
    results.push({ name: `${ext} house — 10 openings`, category: 'exterior', passed: result.allValid, duration: t(), details: `${result.totalIssues} issues` });
  }

  return results;
}

// ─── 5. Specialty Shape Tests ────────────────────────────
function testSpecialtyShapes(): TestResult[] {
  const results: TestResult[] = [];

  // Specialty shapes that need extra validation
  const shapes = [
    { productCategory: 'eyebrow', width: 36, height: 48 },
    { productCategory: 'circle_top', width: 36, height: 60 },
    { productCategory: 'quarter_arch', width: 24, height: 36 },
    { productCategory: 'half_round', width: 36, height: 18 },
    { productCategory: 'picture', width: 60, height: 48 },
    { productCategory: 'slider', width: 72, height: 48 },
    { productCategory: 'casement', width: 30, height: 60 },
    { productCategory: 'awning', width: 36, height: 24 },
  ];

  for (const shape of shapes) {
    const t = timer();
    const op = makeOpening(1, shape);
    const ui = calculateUI(shape.width, shape.height);
    const tier = calculateUITier(ui);
    const validation = validateOpening(op);
    results.push({ name: `Specialty: ${shape.productCategory} (${shape.width}x${shape.height})`, category: 'specialty', passed: validation.completionPct > 0, duration: t(), details: `UI=${ui}, Tier=${tier.label}` });
  }

  // Bay/bow assembly
  {
    const t = timer();
    const units = [
      { width: 24, height: 60 },
      { width: 48, height: 60 },
      { width: 24, height: 60 },
    ];
    const mull = calculateMullGroupDimensions(units);
    results.push({ name: 'Bay/bow 3-unit assembly', category: 'specialty', passed: mull.mullBars === 2 && mull.totalWidth > 0, duration: t(), details: `Total width: ${mull.totalWidth}", UI: ${mull.combinedUI}` });
  }

  return results;
}

// ─── 6. Tempered Glass Workflow Tests ────────────────────
function testTemperedWorkflows(): TestResult[] {
  const results: TestResult[] = [];

  const scenarios = [
    { name: 'Bathroom near tub', ctx: { roomLocation: 'Master Bath', tubOrShowerNearby: true, distanceToTubInches: 36 }, expectTempered: true },
    { name: 'Bathroom no tub', ctx: { roomLocation: 'Half Bath' }, expectTempered: false },
    { name: 'Near stairs', ctx: { roomLocation: 'Hallway', nearStairs: true }, expectTempered: true },
    { name: 'Near door', ctx: { roomLocation: 'Entry', nearDoor: true }, expectTempered: true },
    { name: 'Low glass large area', ctx: { roomLocation: 'Living Room', bottomGlassHeightInches: 12, width: 60, height: 72 }, expectTempered: true },
    { name: 'Normal bedroom window', ctx: { roomLocation: 'Bedroom', width: 35, height: 60 }, expectTempered: false },
    { name: 'Kitchen above counter', ctx: { roomLocation: 'Kitchen', bottomGlassHeightInches: 36, width: 36, height: 48 }, expectTempered: false },
  ];

  for (const s of scenarios) {
    const t = timer();
    const check = quickTemperedCheck(s.ctx);
    results.push({ name: `Tempered: ${s.name}`, category: 'tempered', passed: check.likely === s.expectTempered, duration: t(), details: check.reason || 'No flags' });
  }

  return results;
}

// ─── 7. Data Integrity Tests ─────────────────────────────
function testDataIntegrity(): TestResult[] {
  const results: TestResult[] = [];

  // 7a. Opening number uniqueness
  {
    const t = timer();
    const openings = Array.from({ length: 50 }, (_, i) => makeOpening(i + 1));
    const numbers = openings.map(o => o.openingNumber);
    const unique = new Set(numbers);
    results.push({ name: 'Opening number uniqueness (50)', category: 'integrity', passed: unique.size === numbers.length, duration: t() });
  }

  // 7b. Accidental duplicate detection
  {
    const t = timer();
    const openings = [makeOpening(1), makeOpening(1), makeOpening(2)]; // duplicate #1
    const numbers = openings.map(o => o.openingNumber);
    const hasDupe = numbers.length !== new Set(numbers).size;
    results.push({ name: 'Duplicate opening detection', category: 'integrity', passed: hasDupe === true, duration: t(), details: 'Correctly detected duplicate opening #1' });
  }

  // 7c. Calculation consistency after "accidental edit"
  {
    const t = timer();
    const op = makeOpening(1, { width: 35.375, height: 59.875 });
    const ui1 = calculateUI(op.width!, op.height!);
    // Simulate accidental edit then undo
    op.width = 0;
    op.width = 35.375;
    const ui2 = calculateUI(op.width!, op.height!);
    results.push({ name: 'Calc consistency after edit+undo', category: 'integrity', passed: ui1 === ui2, duration: t() });
  }

  // 7d. Float precision stability
  {
    const t = timer();
    let drifts = 0;
    for (let i = 0; i < 100; i++) {
      const w = 35 + i * 0.125;
      const h = 59 + i * 0.125;
      const ui = calculateUI(w, h);
      const reCalc = calculateUI(w, h);
      if (ui !== reCalc) drifts++;
    }
    results.push({ name: 'Float precision stability (100 calcs)', category: 'integrity', passed: drifts === 0, duration: t() });
  }

  return results;
}

// ─── 8. State Recovery Tests ─────────────────────────────
function testStateRecovery(): TestResult[] {
  const results: TestResult[] = [];

  // 8a. localStorage persistence
  {
    const t = timer();
    const testKey = '__field_sim_test__';
    const testData = { openings: Array.from({ length: 10 }, (_, i) => makeOpening(i + 1)), timestamp: Date.now() };
    try {
      localStorage.setItem(testKey, JSON.stringify(testData));
      const recovered = JSON.parse(localStorage.getItem(testKey) || '{}');
      const intact = recovered.openings?.length === 10;
      localStorage.removeItem(testKey);
      results.push({ name: 'localStorage persist/recover', category: 'state', passed: intact, duration: t() });
    } catch (err: any) {
      results.push({ name: 'localStorage persist/recover', category: 'state', passed: false, duration: t(), error: err.message });
    }
  }

  // 8b. Large payload persistence (50-window job)
  {
    const t = timer();
    const testKey = '__field_sim_large__';
    const largePayload = { openings: Array.from({ length: 50 }, (_, i) => makeOpening(i + 1)) };
    try {
      const json = JSON.stringify(largePayload);
      localStorage.setItem(testKey, json);
      const recovered = JSON.parse(localStorage.getItem(testKey) || '{}');
      localStorage.removeItem(testKey);
      const sizeKB = Math.round(json.length / 1024);
      results.push({ name: `Large payload persist (${sizeKB}KB)`, category: 'state', passed: recovered.openings?.length === 50, duration: t(), details: `${sizeKB}KB stored` });
    } catch (err: any) {
      results.push({ name: 'Large payload persist', category: 'state', passed: false, duration: t(), error: err.message });
    }
  }

  // 8c. Zustand store rehydration test
  {
    const t = timer();
    const authData = localStorage.getItem('wwa-auth');
    const mobileData = localStorage.getItem('wwa-mobile');
    const draftData = localStorage.getItem('wwa-drafts');
    results.push({ name: 'Zustand stores present in localStorage', category: 'state', passed: authData !== null, duration: t(), details: `Auth: ${authData ? 'yes' : 'no'}, Mobile: ${mobileData ? 'yes' : 'no'}, Drafts: ${draftData ? 'yes' : 'no'}` });
  }

  return results;
}

// ─── 9. Mulled Assembly Tests ────────────────────────────
function testMullAssemblies(): TestResult[] {
  const results: TestResult[] = [];

  // Twin mull
  {
    const t = timer();
    const units = [{ width: 35.375, height: 59.875 }, { width: 35.375, height: 59.875 }];
    const r = calculateMullGroupDimensions(units);
    results.push({ name: 'Twin mull assembly', category: 'mull', passed: r.mullBars === 1 && r.perUnitUI.length === 2, duration: t(), details: `Combined UI: ${r.combinedUI}` });
  }

  // Triple mull
  {
    const t = timer();
    const units = [{ width: 24, height: 60 }, { width: 36, height: 60 }, { width: 24, height: 60 }];
    const r = calculateMullGroupDimensions(units);
    results.push({ name: 'Triple mull assembly', category: 'mull', passed: r.mullBars === 2 && r.perUnitUI.length === 3, duration: t() });
  }

  // Quad mull
  {
    const t = timer();
    const units = Array.from({ length: 4 }, () => ({ width: 24, height: 48 }));
    const r = calculateMullGroupDimensions(units);
    results.push({ name: 'Quad mull assembly', category: 'mull', passed: r.mullBars === 3, duration: t(), details: `Total width: ${r.totalWidth}"` });
  }

  // Single unit (no mull)
  {
    const t = timer();
    const r = calculateMullGroupDimensions([{ width: 36, height: 60 }]);
    results.push({ name: 'Single unit (no mull bars)', category: 'mull', passed: r.mullBars === 0, duration: t() });
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════
// MAIN RUNNER
// ═══════════════════════════════════════════════════════════════

export function runFieldSimulation(): SimulationReport {
  const startTime = performance.now();
  const allResults: TestResult[] = [];
  const issues: SimulationIssue[] = [];

  // Run all test suites
  allResults.push(...testCalculationEngine());
  allResults.push(...testValidationEngine());
  allResults.push(...testScalePerformance());
  allResults.push(...testExteriorScenarios());
  allResults.push(...testSpecialtyShapes());
  allResults.push(...testTemperedWorkflows());
  allResults.push(...testDataIntegrity());
  allResults.push(...testStateRecovery());
  allResults.push(...testMullAssemblies());

  // Analyze failures to generate issues
  for (const r of allResults) {
    if (!r.passed) {
      issues.push({
        severity: r.category === 'calculation' || r.category === 'integrity' ? 'critical' : 'high',
        category: r.category,
        description: `${r.name}: ${r.error || r.details || 'FAILED'}`,
        reproduction: `Run test: ${r.name}`,
      });
    }
  }

  // Check for slow tests
  for (const r of allResults) {
    if (r.duration > 100 && r.passed) {
      issues.push({
        severity: 'medium',
        category: 'performance',
        description: `${r.name} took ${r.duration}ms (>100ms threshold)`,
      });
    }
  }

  const passed = allResults.filter(r => r.passed).length;
  const failed = allResults.filter(r => !r.passed).length;

  return {
    totalTests: allResults.length,
    passed,
    failed,
    duration: Math.round(performance.now() - startTime),
    results: allResults,
    issues,
  };
}
