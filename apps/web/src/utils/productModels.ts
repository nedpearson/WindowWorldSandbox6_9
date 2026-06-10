// ═══════════════════════════════════════════════════════════
// BTR 2026 — Complete Product Models & Pricing Data
// Extracted from PDF pages 12-65 (specs + pricing images)
// ═══════════════════════════════════════════════════════════

// ── L200 Series Models (p12) ─────────────────────────────
export const L200_MODELS = [
  { model: 'L201', type: 'Double Hung', minW: 11, maxW: 48, minH: 20, maxH: 78, maxUI: 126, stMinW: 12, stMaxW: 52, stMinH: 20, stMaxH: 96, stMaxUI: 148 },
  { model: 'L202', type: '2-Lite Slider', minW: 18, maxW: 84, minH: 9, maxH: 56, maxUI: 140, stMinW: 18, stMaxW: 96, stMinH: 9, stMaxH: 72, stMaxUI: 156 },
  { model: 'L203', type: '3-Lite Slider', minW: 48, maxW: 108, minH: 9, maxH: 56, maxUI: 164 },
  { model: 'L209', type: 'Equal-Lite 3-Lite Slider', minW: 38, maxW: 108, minH: 9, maxH: 56, maxUI: 164 },
  { model: 'L204', type: 'Picture/Transom', minW: 9, maxW: 96, minH: 9, maxH: 96, maxUI: 154, silverMinW: 9, silverMaxW: 112, silverMinH: 9, silverMaxH: 112, silverMaxUI: 154 },
];

// ── 03A0 Series Models (p14) ─────────────────────────────
export const A03_MODELS = [
  { model: '03A0', type: 'Single Hung', goldMinW: 12, goldMaxW: 48, goldMinH: 22, goldMaxH: 78, goldMaxUI: 126, silverMinW: 12, silverMaxW: 48, silverMinH: 22, silverMaxH: 84, silverMaxUI: 126, stMinW: 12, stMaxW: 52, stMinH: 22, stMaxH: 96, stMaxUI: 148 },
  { model: '03A2', type: '2-Lite Slider', minW: 18.5, maxW: 72, minH: 12, maxH: 56, maxUI: 128, stMinW: 18.5, stMaxW: 96, stMinH: 12, stMaxH: 72, stMaxUI: 156 },
  { model: '03A3', type: '3-Lite Slider', minW: 52, maxW: 108, minH: 12, maxH: 56, maxUI: 164, stGoldMinW: 52, stGoldMaxW: 110, stGoldMaxUI: 182, stSilverMinW: 52, stSilverMaxW: 120, stSilverMaxUI: 192 },
  { model: '03A9', type: 'Equal-Lite 3-Lite Slider', minW: 52, maxW: 108, minH: 12, maxH: 56, maxUI: 164, stMinW: 52, stMaxW: 120, stMinH: 12, stMaxH: 72, stMaxUI: 192 },
  { model: '03A4', type: 'Picture/Transom', minW: 9.5, maxW: 112, minH: 9.5, maxH: 112, maxUI: 154 },
];

// ── 3000 Series Models (p16) ─────────────────────────────
export const S3000_MODELS = [
  { model: '3001', type: 'Double Hung', minW: 12, maxW: 48, minH: 20, maxH: 84, maxUI: 126, stMinW: 12, stMaxW: 52, stMinH: 20, stMaxH: 96, stMaxUI: 148 },
  { model: '3002', type: '2-Lite Slider', minW: 18.5, maxW: 72, minH: 11.25, maxH: 56, maxUI: 128, stMinW: 18.5, stMaxW: 96, stMinH: 11.25, stMaxH: 72, stMaxUI: 156 },
  { model: '3003', type: '3-Lite Slider', minW: 47.5, maxW: 108, minH: 11.25, maxH: 56, maxUI: 164, stMinW: 47.5, stMaxW: 120, stMinH: 11.25, stMaxH: 72, stMaxUI: 192 },
  { model: '3009', type: 'Equal-Lite 3-Lite Slider', minW: 37.25, maxW: 108, minH: 11.25, maxH: 56, maxUI: 164, stMinW: 37.25, stMaxW: 120, stMinH: 11.25, stMaxH: 72, stMaxUI: 192 },
  { model: '3004', type: 'Picture/Transom', minW: 9.5, maxW: 112, minH: 9.5, maxH: 112, maxUI: 154 },
];

// ── Awning Models (p24) ──────────────────────────────────
export const AWNING_MODELS = [
  { model: '0951', type: 'Vinyl Awning', goldMinW: 19, goldMaxW: 48, goldMinH: 16, goldMaxH: 48, goldMaxUI: 96, silverMinW: 19, silverMaxW: 52, silverMinH: 16, silverMaxH: 48, silverMaxUI: 96, newConst: '0151' },
  { model: '0952', type: 'Equal-Lite 2-Lite Awning', goldMinW: 19, goldMaxW: 48, goldMinH: 32, goldMaxH: 96, goldMaxUI: 144, silverMinW: 19, silverMaxW: 52, silverMinH: 32, silverMaxH: 96, silverMaxUI: 144 },
  { model: '0953', type: 'Unequal-Lite 2-Lite Awning', goldMinW: 19, goldMaxW: 48, goldMinH: 48, goldMaxH: 96, goldMaxUI: 144, silverMinW: 19, silverMaxW: 52, silverMinH: 48, silverMaxH: 96, silverMaxUI: 144 },
  { model: '0954', type: '2-Lite Single Vent Awning', goldMinW: 19, goldMaxW: 48, goldMinH: 32, goldMaxH: 96, goldMaxUI: 144, silverMinW: 19, silverMaxW: 52, silverMinH: 32, silverMaxH: 96, silverMaxUI: 144 },
  { model: '0955', type: '2-Lite Dual Vent Awning', goldMinW: 19, goldMaxW: 48, goldMinH: 32, goldMaxH: 96, goldMaxUI: 144, silverMinW: 19, silverMaxW: 52, silverMinH: 32, silverMaxH: 96, silverMaxUI: 144 },
];

// ── Casement Models (p26-29) ─────────────────────────────
export const CASEMENT_MODELS = [
  { model: '0971', type: 'Single Casement', minW: 16, maxW: 36, minH: 19, maxH: 78, maxUI: 114, newConst: '0171' },
  { model: '0972', type: 'Double Casement', minW: 32, maxW: 72, minH: 19, maxH: 78, maxUI: 150 },
  { model: '0973', type: '3-Lite Casement', minW: 94, maxW: 120, minH: 19, maxH: 78, maxUI: 198 },
  { model: '0979', type: 'Equal-Lite 3-Lite Casement', minW: 48, maxW: 108, minH: 19, maxH: 78, maxUI: 186 },
];

// ── Casement Pricing (p26) ───────────────────────────────
export const CASEMENT_PRICING = [
  // 0973 & 0979 share the same pricing tiers
  { models: ['0973', '0979'], tiers: [
    { minUI: 0, maxUI: 73, white: 620.80, beigeClay: 666.50 },
    { minUI: 74, maxUI: 83, white: 666.05, beigeClay: 716.35 },
    { minUI: 84, maxUI: 93, white: 715.85, beigeClay: 771.15 },
    { minUI: 94, maxUI: 101, white: 747.55, beigeClay: 806.15 },
    { minUI: 102, maxUI: 108, white: 779.35, beigeClay: 840.90 },
    { minUI: 109, maxUI: 120, white: 833.45, beigeClay: 900.20 },
    { minUI: 121, maxUI: 132, white: 888.25, beigeClay: 960.70 },
    { minUI: 133, maxUI: 144, white: 942.65, beigeClay: 1020.55 },
    { minUI: 145, maxUI: 150, white: 997.05, beigeClay: 1080.40 },
    { minUI: 151, maxUI: 168, white: 1081.95, beigeClay: 1187.80 },
    { minUI: 169, maxUI: 180, white: 1243.95, beigeClay: 1357.20 },
    { minUI: 181, maxUI: 190, white: 1407.00, beigeClay: 1536.55 },
    { minUI: 191, maxUI: 198, white: 1550.95, beigeClay: 1694.90 },
  ]},
];

// ── Garden Window (p31) ──────────────────────────────────
export const GARDEN_WINDOW = {
  model: 'S134', minW: 24, maxW: 72, minH: 30, maxH: 63,
  largestSizes: ['72x48', '60x60'],
  pricing: {
    height32to47: [
      { widthRange: '24-37', white: 1507.65, beige: 1656.30 },
      { widthRange: '37.125-49', white: 1805.65, beige: 1984.05 },
      { widthRange: '49.125-59', white: 2108.10, beige: 2316.80 },
      { widthRange: '59.125-72', white: 2264.45, beige: 2488.80 },
    ],
    height47to60: [
      { widthRange: '24-37', white: 1900.05, beige: 2088.00 },
      { widthRange: '37.125-49', white: 1990.05, beige: 2186.90 },
      { widthRange: '49.125-59', white: 2277.90, beige: 2503.65 },
      { widthRange: '59.125-72', white: 2488.20, beige: 2734.90 },
    ],
  },
  options: [
    { name: 'Lt Oak Woodgrain', prices: [172.40, 172.40, 172.40, 172.40] },
    { name: 'White Pionite Seatboard', prices: [148.20, 156.05, 165.20, 182.30] },
    { name: 'Oak Veneer Seatboard', prices: [148.20, 156.05, 165.20, 182.30] },
    { name: 'Glass Shelf (2nd)', prices: [150.80, 157.35, 196.65, 216.35] },
    { name: 'Low-E/Argon Glass', prices: [97.05, 121.95, 140.30, 157.35] },
    { name: '1" Insulation Seatboard', prices: [45.90, 59.00, 78.70, 98.35] },
    { name: 'Jamb over 6-9/16"', prices: [85.25, 98.35, 111.50, 131.15] },
    { name: 'Edge Banding', prices: [110.00, 110.00, 110.00, 110.00] },
  ],
};

// ── SGD Custom Pricing (p62) ─────────────────────────────
export const SGD_PRICING = {
  model6402: { panels: 2, minW: 48, maxW: 96, minH: 72, maxH: 96, maxUI: 192, tiers: [
    { minUI: 120, maxUI: 132, w3: 1798.79, b3: 1932.67, w5: 2132.14, b5: 2266.03, wF: 2456.91, bF: 2590.79 },
    { minUI: 133, maxUI: 144, w3: 1922.51, b3: 2060.45, w5: 2278.79, b5: 2416.73, wF: 2625.82, bF: 2763.76 },
    { minUI: 145, maxUI: 156, w3: 2208.67, b3: 2365.97, w5: 2617.96, b5: 2775.26, wF: 3016.85, bF: 3173.95 },
    { minUI: 157, maxUI: 168, w3: 2544.45, b3: 2725.65, w5: 3016.05, b5: 3197.24, wF: 3475.36, bF: 3656.56 },
    { minUI: 169, maxUI: 180, w3: 2899.58, b3: 3104.38, w5: 3437.01, b5: 3641.80, wF: 3960.33, bF: 4165.12 },
    { minUI: 181, maxUI: 192, w3: 3304.27, b3: 3535.74, w5: 3916.77, b5: 4148.12, wF: 4512.94, bF: 4744.12 },
  ]},
  model6403: { panels: 3, minW: 84, maxW: 144, minH: 72, maxH: 96, maxUI: 240, tiers: [
    { minUI: 156, maxUI: 168, w3: 2570.77, b3: 2755.78, w5: 3047.26, b5: 3232.27, wF: 3511.30, bF: 3696.31 },
    { minUI: 169, maxUI: 180, w3: 2969.16, b3: 3181.82, w5: 3519.41, b5: 3732.06, wF: 4055.44, bF: 4268.09 },
    { minUI: 181, maxUI: 192, w3: 3315.52, b3: 3551.47, w5: 3929.96, b5: 4165.91, wF: 4528.55, bF: 4764.50 },
    { minUI: 193, maxUI: 204, w3: 3710.16, b3: 3973.76, w5: 4397.75, b5: 4661.34, wF: 5067.48, bF: 5331.08 },
    { minUI: 205, maxUI: 216, w3: 4247.10, b3: 4555.38, w5: 5034.21, b5: 5332.49, wF: 5800.86, bF: 6089.14 },
    { minUI: 217, maxUI: 228, w3: 4696.62, b3: 5027.25, w5: 5567.09, b5: 5897.72, wF: 6414.82, bF: 6745.45 },
    { minUI: 229, maxUI: 240, w3: 5193.68, b3: 5572.47, w5: 6156.36, b5: 6535.09, wF: 7093.75, bF: 7472.54 },
  ]},
  model6404: { panels: 4, minW: 96, maxW: 144, minH: 72, maxH: 96, maxUI: 240, tiers: [
    { minUI: 168, maxUI: 192, w3: 3634.66, b3: 3904.67, w5: 4308.33, b5: 4578.34, wF: 4964.39, bF: 5234.40 },
    { minUI: 193, maxUI: 204, w3: 4082.36, b3: 4385.77, w5: 4838.91, b5: 5142.32, wF: 5575.92, bF: 5879.33 },
    { minUI: 205, maxUI: 216, w3: 4444.94, b3: 4772.06, w5: 5269.70, b5: 5595.83, wF: 6071.05, bF: 6398.18 },
    { minUI: 217, maxUI: 228, w3: 4868.13, b3: 5224.60, w5: 5770.37, b5: 6126.84, wF: 6649.07, bF: 7005.54 },
    { minUI: 229, maxUI: 240, w3: 5447.24, b3: 5841.40, w5: 6456.80, b5: 6850.96, wF: 7440.05, bF: 7834.21 },
  ]},
  sgdBlinds: {
    leBlinds: { models6405_6406_6408: 1361.25, models6409_6422: 2041.88, model6412: 2722.50 },
    leeBlinds: { models6405_6406_6408: 1694.00, models6409_6422: 2541.00, model6412: 3388.00 },
  },
};

// ── Special Shape Min-Max (p33) ──────────────────────────
export const SPECIAL_SHAPE_MINMAX = [
  { model: 'S105', name: 'Circle Top', extrusions: [
    { type: 'Mezzo', minW: 25, maxW: 88, minH: '1/2 Width', maxH: '1/2 Width', maxUI: 154 },
    { type: '0700/Sheff', minW: 20, maxW: 95, minH: '1/2 Width', maxH: '1/2 Width', maxUI: 154 },
  ]},
  { model: 'S110', name: 'Quarter Arch', extrusions: [
    { type: 'Mezzo', minW: 25, maxW: 95.5, minH: 13, maxH: 108, maxUI: 154 },
    { type: '0700/Sheff', minW: 20, maxW: 95.5, minH: 11, maxH: 96, maxUI: 154 },
  ]},
  { model: 'S111', name: 'Full Circle', extrusions: [
    { type: 'Mezzo', minW: 13, maxW: 72, minH: 13, maxH: 72, maxUI: 154 },
    { type: '0700/Sheff', minW: 12, maxW: 72, minH: 12, maxH: 72, maxUI: 154 },
  ]},
  { model: 'S112', name: 'Oval', extrusions: [
    { type: 'Mezzo', minW: 13, maxW: 112, minH: 11, maxH: 108, maxUI: 154 },
    { type: '0700/Sheff', minW: 12, maxW: 72, minH: 13, maxH: 96, maxUI: 154 },
  ]},
  { model: 'S113', name: 'Eyebrow', extrusions: [
    { type: 'Mezzo', minW: 25, maxW: 112, minH: 11, maxH: 129, maxUI: 154 },
    { type: '0700/Sheff', minW: 20, maxW: 96, minH: 8, maxH: 134, maxUI: 154 },
  ]},
  { model: 'S114', name: 'Extended Leg Eyebrow', extrusions: [
    { type: 'Mezzo', minW: 14, maxW: 112, minH: 29, maxH: 108, maxUI: 154 },
    { type: '0700/Sheff', minW: 12, maxW: 96, minH: 24, maxH: 96, maxUI: 154 },
  ]},
  { model: 'S115', name: 'Half Eyebrow', extrusions: [
    { type: 'Mezzo', minW: 13, maxW: 112, minH: 11, maxH: 108, maxUI: 154 },
    { type: '0700/Sheff', minW: 9, maxW: 96, minH: 10, maxH: 96, maxUI: 154 },
  ]},
  { model: 'S116', name: 'Ellipse', extrusions: [
    { type: 'Mezzo', minW: 11, maxW: 112, minH: 11, maxH: 108, maxUI: 154 },
    { type: '0700/Sheff', minW: 8, maxW: 96, minH: 9, maxH: 96, maxUI: 154 },
  ]},
  { model: 'S118', name: 'Hexagon', extrusions: [
    { type: 'Mezzo', minW: 25, maxW: 76, minH: 25, maxH: 76, maxUI: 154 },
    { type: '0700/Sheff', minW: 20, maxW: 76, minH: 25, maxH: 76, maxUI: 154 },
  ]},
  { model: 'S120', name: 'Octagon', extrusions: [
    { type: 'Mezzo', minW: 11, maxW: 76, minH: 11, maxH: 76, maxUI: 154 },
    { type: '0700/Sheff', minW: 11, maxW: 76, minH: 11, maxH: 76, maxUI: 154 },
  ]},
  { model: 'S121', name: 'Pentagon', extrusions: [
    { type: 'Mezzo', minW: 11, maxW: 112, minH: 11, maxH: 108, maxUI: 154 },
    { type: '0700/Sheff', minW: 9, maxW: 96, minH: 8, maxH: 96, maxUI: 154 },
  ]},
  { model: 'S122', name: 'Cathedral', extrusions: [
    { type: 'Mezzo', minW: 15, maxW: 76, minH: 15, maxH: 76, maxUI: 154 },
    { type: '0700/Sheff', minW: 15, maxW: 76, minH: 15, maxH: 76, maxUI: 154 },
  ]},
  { model: 'S123', name: 'Trapezoid', extrusions: [
    { type: 'Mezzo', minW: 15, maxW: 112, minH: 15, maxH: 112, maxUI: 154 },
    { type: '0700/Sheff', minW: 15, maxW: 96, minH: 15, maxH: 96, maxUI: 154 },
  ]},
  { model: 'S129', name: 'Triangle', extrusions: [
    { type: 'Mezzo', minW: 11, maxW: 112, minH: 12, maxH: 108, maxUI: 154 },
    { type: '0700/Sheff', minW: 8, maxW: 96, minH: 9, maxH: 96, maxUI: 154 },
  ]},
  { model: 'S140', name: 'Arch-Top DH', extrusions: [
    { type: 'Mezzo', minW: 25, maxW: 52, minH: 43, maxH: 96, maxUI: 148 },
    { type: '0700', minW: 20, maxW: 52, minH: 43, maxH: 96, maxUI: 148 },
  ]},
  { model: 'S144', name: 'Arch-Top SH (full arch)', extrusions: [
    { type: 'Mezzo', minW: 16, maxW: 52, minH: 43, maxH: 96, maxUI: 148 },
    { type: '0700', minW: 16, maxW: 52, minH: 43, maxH: 96, maxUI: 148 },
  ]},
  { model: 'S146', name: 'Arch-Top SH (half arch)', extrusions: [
    { type: 'Mezzo', minW: 16, maxW: 52, minH: 43, maxH: 96, maxUI: 148 },
    { type: '0700', minW: 16, maxW: 52, minH: 43, maxH: 96, maxUI: 148 },
  ]},
];

// ── Shape type classification ────────────────────────────
export const SHAPE_TYPE_MAP: Record<string, 'radius' | 'polygon'> = {
  S105: 'radius', S110: 'radius', S111: 'radius', S112: 'radius',
  S113: 'radius', S114: 'radius', S115: 'radius', S116: 'radius',
  S118: 'polygon', S120: 'polygon', S121: 'polygon', S122: 'polygon',
  S123: 'polygon', S129: 'polygon',
  S140: 'radius', S144: 'radius', S146: 'radius',
};
