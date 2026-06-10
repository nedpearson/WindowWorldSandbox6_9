import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

export const proposalRoutes = Router();
proposalRoutes.use(requireAuth);

// ── Good/Better/Best Option Tiers ─────────────────────
const OPTION_TIERS = [
  {
    tier: 'solarzone', label: 'Great', icon: '☀️', color: '#3b82f6',
    description: 'SolarZone Low-E & Argon',
    defaults: { glassPackage: 'SolarZone', gridStyle: 'None', interiorColor: 'White', exteriorColor: 'White', foamEnhanced: true, argon: true },
    priceModifier: 0,
  },
  {
    tier: 'elite', label: 'Best', icon: '👑', color: '#8b5cf6',
    description: 'SolarZone Low-E Elite',
    defaults: { glassPackage: 'SolarZone Elite', gridStyle: 'None', interiorColor: 'White', exteriorColor: 'White', foamEnhanced: true, argon: true },
    priceModifier: 0.15,
  },
];

proposalRoutes.get('/tiers', (_req, res) => res.json(OPTION_TIERS));

// ── Financing Scenarios ───────────────────────────────
const FINANCING = [
  { id: 'cash', name: 'Cash / Check', termMonths: 0, apr: 0, promoType: 'none', monthlyFormula: null },
  { id: 'same-as-cash-12', name: '12 Month Same-as-Cash', termMonths: 12, apr: 0, promoType: 'interest_free' },
  { id: 'same-as-cash-18', name: '18 Month Same-as-Cash', termMonths: 18, apr: 0, promoType: 'interest_free' },
  { id: 'fixed-60', name: '60 Month Fixed 6.99%', termMonths: 60, apr: 6.99, promoType: 'fixed_rate' },
  { id: 'fixed-120', name: '120 Month Fixed 9.99%', termMonths: 120, apr: 9.99, promoType: 'fixed_rate' },
];

proposalRoutes.get('/financing', (_req, res) => res.json(FINANCING));

// ── Calculate financing scenario ──────────────────────
proposalRoutes.post('/financing/calculate', (req, res) => {
  const { totalAmount, financingId } = req.body;
  const plan = FINANCING.find(f => f.id === financingId);
  if (!plan) return res.status(404).json({ error: 'Financing plan not found' });

  const amount = parseFloat(totalAmount) || 0;
  let monthlyPayment = 0;

  if (plan.id === 'cash' || plan.termMonths === 0) {
    // Cash / Check — pay in full
    res.json({
      plan: plan.name,
      totalAmount: amount,
      termMonths: 0,
      apr: 0,
      monthlyPayment: 0,
      totalPayment: amount,
      interestCost: 0,
      isCash: true,
    });
    return;
  }

  if (plan.apr > 0) {
    const r = plan.apr / 100 / 12;
    monthlyPayment = amount * (r * Math.pow(1 + r, plan.termMonths)) / (Math.pow(1 + r, plan.termMonths) - 1);
  } else {
    monthlyPayment = amount / plan.termMonths;
  }

  const totalPayment = Math.round(monthlyPayment * plan.termMonths * 100) / 100;

  res.json({
    plan: plan.name,
    totalAmount: amount,
    termMonths: plan.termMonths,
    apr: plan.apr,
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    totalPayment,
    interestCost: Math.max(0, Math.round((totalPayment - amount) * 100) / 100),
    isCash: false,
  });
});

// ── Sales Recommendations ─────────────────────────────
const UPSELL_RULES = [
  { id: 'grid-match', condition: 'front_has_grids', recommendation: 'Add matching grids to side/rear windows for curb appeal', upsellPct: 8 },
  { id: 'sz-upgrade', condition: 'lee_glass', recommendation: 'Upgrade to SolarZone for better energy savings — pays for itself', upsellPct: 12 },
  { id: 'sze-upgrade', condition: 'sz_glass', recommendation: 'SolarZone Elite offers top-tier efficiency — premium upgrade', upsellPct: 10 },
  { id: 'color-exterior', condition: 'white_exterior', recommendation: 'Exterior color upgrade enhances curb appeal — Clay and Bronze popular', upsellPct: 5 },
  { id: 'financing-offer', condition: 'cash_payment', recommendation: 'Same-as-Cash financing available — no interest for 12–18 months', upsellPct: 0 },
  { id: 'foam-all', condition: 'missing_foam', recommendation: 'Add foam enhanced to all openings for improved insulation', upsellPct: 3 },
];

proposalRoutes.get('/recommendations', (_req, res) => res.json(UPSELL_RULES));
