import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

export const windowKnowledgeRoutes = Router();
windowKnowledgeRoutes.use(requireAuth);

// ── Window Default Profiles (Module 16) ───────────────
const WINDOW_DEFAULTS = [
  { id: 'eyebrow-36x80', name: '36×80 Eyebrow DH', width: 36, height: 80, productCategory: 'double_hung', specialtyShape: 'eyebrow', ui: 116, rise: 6, legHeight: 74, customRadius: true },
  { id: 'oriel-36x80-1/3', name: '36×80 Oriel 1/3 over 2/3', width: 36, height: 80, productCategory: 'double_hung', oriel: true, splitType: '1/3_over_2/3', topSash: 26.625, bottomSash: 53.375 },
  { id: 'oriel-36x80-2/3', name: '36×80 Oriel 2/3 over 1/3', width: 36, height: 80, productCategory: 'double_hung', oriel: true, splitType: '2/3_over_1/3', topSash: 53.375, bottomSash: 26.625 },
  { id: 'half-round-60x60', name: '60×60 Half Round', width: 60, height: 60, specialtyShape: 'half_round', radius: 30 },
  { id: 'picture-72x60', name: '72×60 Picture', width: 72, height: 60, productCategory: 'picture', screenOption: 'No Screen', notes: 'Check tempered if low glass' },
  { id: 'slider-72x80', name: '72×80 Slider', width: 72, height: 80, productCategory: 'slider', notes: 'Structural review if opening enlarged' },
  { id: 'bathroom-unit', name: 'Bathroom Unit', roomLocation: 'Bathroom', obscureGlass: 'full', temperedGlass: 'full', notes: 'Obscure + tempered recommended' },
  { id: 'picture-default', name: 'Picture Window Default', productCategory: 'picture', screenOption: 'No Screen', notes: 'No screen by default' },
];

windowKnowledgeRoutes.get('/defaults', (_req, res) => res.json(WINDOW_DEFAULTS));

// ── Specialty Shape Presets (Module 17) ───────────────
const SPECIALTY_SHAPES = [
  { type: 'eyebrow', name: 'Eyebrow', category: 'arch', riseFormula: 'width/6', hasLegHeight: true },
  { type: 'half_round', name: 'Half Round', category: 'arch', radiusFormula: 'width/2', hasLegHeight: false },
  { type: 'full_circle', name: 'Full Circle', category: 'round', radiusFormula: 'width/2' },
  { type: 'quarter_round', name: 'Quarter Round', category: 'arch', radiusFormula: 'width' },
  { type: 'ellipse', name: 'Ellipse', category: 'arch' },
  { type: 'cathedral', name: 'Cathedral', category: 'arch' },
  { type: 'trapezoid', name: 'Trapezoid', category: 'geometric' },
  { type: 'triangle', name: 'Triangle', category: 'geometric' },
  { type: 'pentagon', name: 'Pentagon', category: 'geometric' },
  { type: 'octagon', name: 'Octagon', category: 'geometric' },
  { type: 'hexagon', name: 'Hexagon', category: 'geometric' },
  { type: 'radius_transom', name: 'Radius Transom', category: 'arch' },
  { type: 'eyebrow_over_dh', name: 'Eyebrow over DH', category: 'composite', base: 'double_hung', top: 'eyebrow' },
  { type: 'circle_top_over_dh', name: 'Circle Top over DH', category: 'composite', base: 'double_hung', top: 'half_round' },
  { type: 'bay', name: 'Bay Window', category: 'projection', angles: [45, 90, 45] },
  { type: 'bow', name: 'Bow Window', category: 'projection' },
  { type: 'oriel', name: 'Oriel', category: 'sash_split' },
];

windowKnowledgeRoutes.get('/shapes', (_req, res) => res.json(SPECIALTY_SHAPES));

// ── Sash Split Presets ────────────────────────────────
const SASH_SPLITS = [
  { id: '1/3-2/3', name: '1/3 over 2/3', topRatio: 0.333, bottomRatio: 0.667 },
  { id: '2/3-1/3', name: '2/3 over 1/3', topRatio: 0.667, bottomRatio: 0.333 },
  { id: '1/2-1/2', name: '1/2 over 1/2', topRatio: 0.5, bottomRatio: 0.5 },
  { id: '1/4-3/4', name: '1/4 over 3/4', topRatio: 0.25, bottomRatio: 0.75 },
  { id: '3/4-1/4', name: '3/4 over 1/4', topRatio: 0.75, bottomRatio: 0.25 },
];

windowKnowledgeRoutes.get('/sash-splits', (_req, res) => res.json(SASH_SPLITS));

// ── Code Compliance Defaults (Module 10) ──────────────
const LA_CODE_DEFAULTS = {
  jurisdiction: 'Louisiana / Baton Rouge',
  codeVersion: 'IRC 2021',
  tempered: [
    { rule: 'R308.4.2', desc: 'Glass within 24" arc of door', applies: 'all' },
    { rule: 'R308.4.5', desc: 'Glass within 60" of tub/shower', applies: 'bathroom' },
    { rule: 'R308.4', desc: 'Glass <18" from floor AND >9 sq ft', applies: 'all' },
    { rule: 'R308.4.7', desc: 'Glass adjacent to stairs/landing', applies: 'stairway' },
  ],
  egress: { minWidth: 20, minHeight: 24, minArea: 5.7, maxSillHeight: 44, rooms: ['bedroom'] },
  windZone: 'Zone 1 (90 mph)',
  dpRating: 15,
};

windowKnowledgeRoutes.get('/code-defaults', (_req, res) => res.json(LA_CODE_DEFAULTS));

// ── Manufacturer Series Data ────────────────────────
const WINDOW_WORLD_SERIES_DEFAULTS = [
  { series: 'Classic Double-Hung (4000/6000)', frameDepth: 3.25, extrusionWall: '0.080 - 0.100+', notes: 'Standard replacement' },
  { series: 'Standard Double-Hung', frameDepth: 4.0, extrusionWall: '0.080 - 0.100+', notes: 'Deeper pocket required' },
  { series: 'Slim-Line Series (5000)', frameDepth: 2.875, extrusionWall: '0.080 - 0.100+', notes: 'Maximizes glass space, fits shallow pockets' }
];

windowKnowledgeRoutes.get('/series-profiles', (_req, res) => res.json(WINDOW_WORLD_SERIES_DEFAULTS));

