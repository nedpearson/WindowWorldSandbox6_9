import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

export const manufacturerRoutes = Router();
manufacturerRoutes.use(requireAuth);

// ── Default WW Manufacturer Profiles ──────────────────
const WW_PROFILES = [
  {
    id: 'ww-4000', manufacturer: 'Window World', series: '4000 Series', code: '4000',
    sizeLimits: { minWidth: 14, maxWidth: 48, minHeight: 20, maxHeight: 96, maxUI: 150 },
    colors: [
      { name: 'White', code: 'WH', leadTimeDays: 0, upcharge: 0 },
      { name: 'Almond', code: 'AL', leadTimeDays: 5, upcharge: 0 },
      { name: 'Clay', code: 'CL', leadTimeDays: 7, upcharge: 25 },
      { name: 'Bronze', code: 'BZ', leadTimeDays: 7, upcharge: 25 },
      { name: 'Black', code: 'BK', leadTimeDays: 10, upcharge: 35 },
      { name: 'Dark Bronze', code: 'DB', leadTimeDays: 10, upcharge: 35 },
    ],
    glass: [
      { name: 'LEE', code: 'LEE', available: true, leadTimeDays: 0 },
      { name: 'SolarZone', code: 'SZ', available: true, leadTimeDays: 3 },
      { name: 'SolarZone Elite', code: 'SZE', available: true, leadTimeDays: 5 },
    ],
    grids: [
      { style: 'None', available: true }, { style: 'Colonial', available: true },
      { style: 'Diamond', available: true }, { style: 'Prairie', available: true },
    ],
    mullRules: { maxUnits: 3, maxCombinedWidth: 120, requiresStructuralOver: 96 },
    dpRatings: [15, 20, 25, 35],
  },
  {
    id: 'ww-6000', manufacturer: 'Window World', series: '6000 Series', code: '6000',
    sizeLimits: { minWidth: 14, maxWidth: 60, minHeight: 20, maxHeight: 108, maxUI: 168 },
    colors: [
      { name: 'White', code: 'WH', leadTimeDays: 0, upcharge: 0 },
      { name: 'Almond', code: 'AL', leadTimeDays: 5, upcharge: 0 },
      { name: 'Clay', code: 'CL', leadTimeDays: 7, upcharge: 30 },
      { name: 'Black', code: 'BK', leadTimeDays: 10, upcharge: 40 },
    ],
    glass: [
      { name: 'LEE', code: 'LEE', available: true, leadTimeDays: 0 },
      { name: 'SolarZone', code: 'SZ', available: true, leadTimeDays: 3 },
      { name: 'SolarZone Elite', code: 'SZE', available: true, leadTimeDays: 5 },
    ],
    grids: [
      { style: 'None', available: true }, { style: 'Colonial', available: true },
      { style: 'Diamond', available: true },
    ],
    mullRules: { maxUnits: 4, maxCombinedWidth: 144, requiresStructuralOver: 108 },
    dpRatings: [15, 20, 25, 35, 50],
  },
];

// ── Get all profiles ──────────────────────────────────
manufacturerRoutes.get('/profiles', (_req, res) => {
  res.json(WW_PROFILES);
});

// ── Get profile by series code ────────────────────────
manufacturerRoutes.get('/profiles/:code', (req, res) => {
  const profile = WW_PROFILES.find(p => p.code === req.params.code);
  if (!profile) return res.status(404).json({ error: 'Series not found' });
  res.json(profile);
});

// ── Validate opening against manufacturer constraints ─
manufacturerRoutes.post('/validate', (req, res) => {
  const { width, height, seriesCode, color, glassPackage, gridStyle, mullCount } = req.body;
  const profile = WW_PROFILES.find(p => p.code === (seriesCode || '4000'));
  if (!profile) return res.status(404).json({ error: 'Series not found' });

  const violations: { field: string; message: string; severity: 'error' | 'warning' }[] = [];
  const w = parseFloat(width) || 0;
  const h = parseFloat(height) || 0;
  const ui = Math.ceil(w) + Math.ceil(h);

  // Size limits
  if (w < profile.sizeLimits.minWidth) violations.push({ field: 'width', message: `Width ${w}" below minimum ${profile.sizeLimits.minWidth}" for ${profile.series}`, severity: 'error' });
  if (w > profile.sizeLimits.maxWidth) violations.push({ field: 'width', message: `Width ${w}" exceeds maximum ${profile.sizeLimits.maxWidth}" for ${profile.series}`, severity: 'error' });
  if (h < profile.sizeLimits.minHeight) violations.push({ field: 'height', message: `Height ${h}" below minimum ${profile.sizeLimits.minHeight}" for ${profile.series}`, severity: 'error' });
  if (h > profile.sizeLimits.maxHeight) violations.push({ field: 'height', message: `Height ${h}" exceeds maximum ${profile.sizeLimits.maxHeight}" for ${profile.series}`, severity: 'error' });
  if (ui > profile.sizeLimits.maxUI) violations.push({ field: 'ui', message: `UI ${ui} exceeds maximum ${profile.sizeLimits.maxUI} for ${profile.series}`, severity: 'error' });

  // Color
  if (color) {
    const colorRule = profile.colors.find(c => c.name.toLowerCase() === color.toLowerCase());
    if (!colorRule) violations.push({ field: 'color', message: `Color "${color}" not available in ${profile.series}`, severity: 'error' });
  }

  // Glass
  if (glassPackage) {
    const glassRule = profile.glass.find(g => g.code === glassPackage || g.name.toLowerCase() === glassPackage.toLowerCase());
    if (!glassRule) violations.push({ field: 'glassPackage', message: `Glass "${glassPackage}" not available in ${profile.series}`, severity: 'error' });
    else if (!glassRule.available) violations.push({ field: 'glassPackage', message: `Glass "${glassPackage}" currently unavailable`, severity: 'warning' });
  }

  // Grid
  if (gridStyle && gridStyle !== 'None') {
    const gridRule = profile.grids.find(g => g.style.toLowerCase() === gridStyle.toLowerCase());
    if (!gridRule) violations.push({ field: 'gridStyle', message: `Grid "${gridStyle}" not available in ${profile.series}`, severity: 'error' });
  }

  // Mull
  if (mullCount && mullCount > profile.mullRules.maxUnits) {
    violations.push({ field: 'mullCount', message: `${mullCount} units exceeds max ${profile.mullRules.maxUnits} for ${profile.series}`, severity: 'error' });
  }

  res.json({
    valid: violations.filter(v => v.severity === 'error').length === 0,
    violations,
    profile: { series: profile.series, code: profile.code },
  });
});
