-- ═══════════════════════════════════════════════════════════
-- BTR 2026 — Product Models & Pricing Seed Data
-- Extracted from PDF image pages (12-65)
-- ═══════════════════════════════════════════════════════════

-- Product Models table
CREATE TABLE IF NOT EXISTS product_models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  series_code TEXT NOT NULL,
  model_code TEXT NOT NULL,
  product_type TEXT NOT NULL,
  min_width DECIMAL(6,2), max_width DECIMAL(6,2),
  min_height DECIMAL(6,2), max_height DECIMAL(6,2),
  max_ui INTEGER,
  label_type TEXT DEFAULT 'gold', -- 'gold', 'silver', 'st' (storm)
  new_construction_model TEXT,
  source_page INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(model_code, label_type)
);

-- Casement/SGD Pricing tiers
CREATE TABLE IF NOT EXISTS model_pricing_tiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_code TEXT NOT NULL,
  min_ui INTEGER NOT NULL,
  max_ui INTEGER NOT NULL,
  sash_style TEXT DEFAULT 'standard',
  price_white DECIMAL(10,2),
  price_beige DECIMAL(10,2),
  price_clay DECIMAL(10,2),
  price_french_white DECIMAL(10,2),
  price_french_beige DECIMAL(10,2),
  source_page INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE product_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_pricing_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_models" ON product_models FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_model_pricing" ON model_pricing_tiers FOR SELECT TO authenticated USING (true);

-- ═══ L200 Series (p12) ═══
INSERT INTO product_models (series_code, model_code, product_type, min_width, max_width, min_height, max_height, max_ui, label_type, source_page) VALUES
('L2000', 'L201', 'Double Hung', 11, 48, 20, 78, 126, 'gold', 12),
('L2000', 'L201', 'Double Hung', 12, 52, 20, 96, 148, 'st', 12),
('L2000', 'L202', '2-Lite Slider', 18, 84, 9, 56, 140, 'gold', 12),
('L2000', 'L202', '2-Lite Slider', 18, 96, 9, 72, 156, 'st', 12),
('L2000', 'L203', '3-Lite Slider', 48, 108, 9, 56, 164, 'gold', 12),
('L2000', 'L209', 'Equal-Lite 3-Lite Slider', 38, 108, 9, 56, 164, 'gold', 12),
('L2000', 'L204', 'Picture/Transom', 9, 96, 9, 96, 154, 'gold', 12),
('L2000', 'L204', 'Picture/Transom', 9, 112, 9, 112, 154, 'silver', 12)
ON CONFLICT (model_code, label_type) DO NOTHING;

-- ═══ 03A0 Series (p14) ═══
INSERT INTO product_models (series_code, model_code, product_type, min_width, max_width, min_height, max_height, max_ui, label_type, source_page) VALUES
('03A0', '03A0', 'Single Hung', 12, 48, 22, 78, 126, 'gold', 14),
('03A0', '03A0', 'Single Hung', 12, 48, 22, 84, 126, 'silver', 14),
('03A0', '03A0', 'Single Hung', 12, 52, 22, 96, 148, 'st', 14),
('03A0', '03A2', '2-Lite Slider', 18.5, 72, 12, 56, 128, 'gold', 14),
('03A0', '03A2', '2-Lite Slider', 18.5, 96, 12, 72, 156, 'st', 14),
('03A0', '03A3', '3-Lite Slider', 52, 108, 12, 56, 164, 'gold', 14),
('03A0', '03A3', '3-Lite Slider', 52, 110, 12, 72, 182, 'st', 14),
('03A0', '03A9', 'Equal-Lite 3-Lite Slider', 52, 108, 12, 56, 164, 'gold', 14),
('03A0', '03A9', 'Equal-Lite 3-Lite Slider', 52, 120, 12, 72, 192, 'st', 14),
('03A0', '03A4', 'Picture/Transom', 9.5, 112, 9.5, 112, 154, 'gold', 14)
ON CONFLICT (model_code, label_type) DO NOTHING;

-- ═══ 3000 Series (p16) ═══
INSERT INTO product_models (series_code, model_code, product_type, min_width, max_width, min_height, max_height, max_ui, label_type, source_page) VALUES
('3000', '3001', 'Double Hung', 12, 48, 20, 84, 126, 'gold', 16),
('3000', '3001', 'Double Hung', 12, 52, 20, 96, 148, 'st', 16),
('3000', '3002', '2-Lite Slider', 18.5, 72, 11.25, 56, 128, 'gold', 16),
('3000', '3002', '2-Lite Slider', 18.5, 96, 11.25, 72, 156, 'st', 16),
('3000', '3003', '3-Lite Slider', 47.5, 108, 11.25, 56, 164, 'gold', 16),
('3000', '3003', '3-Lite Slider', 47.5, 120, 11.25, 72, 192, 'st', 16),
('3000', '3009', 'Equal-Lite 3-Lite Slider', 37.25, 108, 11.25, 56, 164, 'gold', 16),
('3000', '3009', 'Equal-Lite 3-Lite Slider', 37.25, 120, 11.25, 72, 192, 'st', 16),
('3000', '3004', 'Picture/Transom', 9.5, 112, 9.5, 112, 154, 'gold', 16)
ON CONFLICT (model_code, label_type) DO NOTHING;

-- ═══ Awning Models (p24) ═══
INSERT INTO product_models (series_code, model_code, product_type, min_width, max_width, min_height, max_height, max_ui, label_type, new_construction_model, source_page) VALUES
('03A0', '0951', 'Vinyl Awning', 19, 48, 16, 48, 96, 'gold', '0151', 24),
('03A0', '0951', 'Vinyl Awning', 19, 52, 16, 48, 96, 'silver', '0151', 24),
('03A0', '0952', 'Equal-Lite 2-Lite Awning', 19, 48, 32, 96, 144, 'gold', NULL, 24),
('03A0', '0952', 'Equal-Lite 2-Lite Awning', 19, 52, 32, 96, 144, 'silver', NULL, 24),
('03A0', '0953', 'Unequal-Lite 2-Lite Awning', 19, 48, 48, 96, 144, 'gold', NULL, 24),
('03A0', '0953', 'Unequal-Lite 2-Lite Awning', 19, 52, 48, 96, 144, 'silver', NULL, 24),
('03A0', '0954', '2-Lite Single Vent Awning', 19, 48, 32, 96, 144, 'gold', NULL, 24),
('03A0', '0955', '2-Lite Dual Vent Awning', 19, 48, 32, 96, 144, 'gold', NULL, 24)
ON CONFLICT (model_code, label_type) DO NOTHING;

-- ═══ Casement Models (p26) ═══
INSERT INTO product_models (series_code, model_code, product_type, min_width, max_width, min_height, max_height, max_ui, label_type, new_construction_model, source_page, notes) VALUES
('03A0', '0971', 'Single Casement', 16, 36, 19, 78, 114, 'gold', '0171', 26, 'Egress hinge available - must specify'),
('03A0', '0972', 'Double Casement', 32, 72, 19, 78, 150, 'gold', NULL, 26, 'Two 0971s within limits must be 0972'),
('03A0', '0973', '3-Lite Casement', 94, 120, 19, 78, 198, 'gold', NULL, 26, NULL),
('03A0', '0979', 'Equal-Lite 3-Lite Casement', 48, 108, 19, 78, 186, 'gold', NULL, 26, NULL)
ON CONFLICT (model_code, label_type) DO NOTHING;

-- ═══ Casement Pricing (p26) ═══
INSERT INTO model_pricing_tiers (model_code, min_ui, max_ui, price_white, price_beige, source_page) VALUES
('0973', 0, 73, 620.80, 666.50, 26), ('0973', 74, 83, 666.05, 716.35, 26),
('0973', 84, 93, 715.85, 771.15, 26), ('0973', 94, 101, 747.55, 806.15, 26),
('0973', 102, 108, 779.35, 840.90, 26), ('0973', 109, 120, 833.45, 900.20, 26),
('0973', 121, 132, 888.25, 960.70, 26), ('0973', 133, 144, 942.65, 1020.55, 26),
('0973', 145, 150, 997.05, 1080.40, 26), ('0973', 151, 168, 1081.95, 1187.80, 26),
('0973', 169, 180, 1243.95, 1357.20, 26), ('0973', 181, 190, 1407.00, 1536.55, 26),
('0973', 191, 198, 1550.95, 1694.90, 26),
('0979', 0, 73, 620.80, 666.50, 26), ('0979', 74, 83, 666.05, 716.35, 26),
('0979', 84, 93, 715.85, 771.15, 26), ('0979', 94, 101, 747.55, 806.15, 26),
('0979', 102, 108, 779.35, 840.90, 26), ('0979', 109, 120, 833.45, 900.20, 26),
('0979', 121, 132, 888.25, 960.70, 26), ('0979', 133, 144, 942.65, 1020.55, 26),
('0979', 145, 150, 997.05, 1080.40, 26), ('0979', 151, 168, 1071.95, 1187.80, 26),
('0979', 169, 180, 1243.95, 1357.20, 26), ('0979', 181, 186, 1407.00, 1536.55, 26);

-- ═══ Garden Window (p31) ═══
INSERT INTO product_models (series_code, model_code, product_type, min_width, max_width, min_height, max_height, max_ui, label_type, source_page, notes) VALUES
('03A0', 'S134', 'Garden Window', 24, 72, 30, 63, NULL, 'gold', 31, 'Largest sizes: 72x48, 60x60')
ON CONFLICT (model_code, label_type) DO NOTHING;

INSERT INTO model_pricing_tiers (model_code, min_ui, max_ui, sash_style, price_white, price_beige, source_page) VALUES
('S134', 56, 74, '32-47h_24-37w', 1507.65, 1656.30, 31),
('S134', 56, 86, '32-47h_37-49w', 1805.65, 1984.05, 31),
('S134', 56, 106, '32-47h_49-59w', 2108.10, 2316.80, 31),
('S134', 56, 119, '32-47h_59-72w', 2264.45, 2488.80, 31),
('S134', 71, 97, '47-60h_24-37w', 1900.05, 2088.00, 31),
('S134', 84, 109, '47-60h_37-49w', 1990.05, 2186.90, 31),
('S134', 96, 119, '47-60h_49-59w', 2277.90, 2503.65, 31),
('S134', 106, 132, '47-60h_59-72w', 2488.20, 2734.90, 31);

-- ═══ SGD Custom Models (p62) ═══
INSERT INTO product_models (series_code, model_code, product_type, min_width, max_width, min_height, max_height, max_ui, label_type, source_page, notes) VALUES
('SGD', '6402', '2-Panel Custom SGD', 48, 96, 72, 96, 192, 'gold', 62, 'Not field reversible'),
('SGD', '6403', '3-Panel Custom SGD', 84, 144, 72, 96, 240, 'gold', 62, 'Not field reversible'),
('SGD', '6404', '4-Panel Custom SGD', 96, 144, 72, 96, 240, 'gold', 62, 'Not field reversible')
ON CONFLICT (model_code, label_type) DO NOTHING;

-- SGD 6402 pricing
INSERT INTO model_pricing_tiers (model_code, min_ui, max_ui, sash_style, price_white, price_beige, price_french_white, price_french_beige, source_page) VALUES
('6402', 120, 132, '3"', 1798.79, 1932.67, 2456.91, 2590.79, 62),
('6402', 133, 144, '3"', 1922.51, 2060.45, 2625.82, 2763.76, 62),
('6402', 145, 156, '3"', 2208.67, 2365.97, 3016.85, 3173.95, 62),
('6402', 157, 168, '3"', 2544.45, 2725.65, 3475.36, 3656.56, 62),
('6402', 169, 180, '3"', 2899.58, 3104.38, 3960.33, 4165.12, 62),
('6402', 181, 192, '3"', 3304.27, 3535.74, 4512.94, 4744.12, 62),
('6402', 120, 132, '5"', 2132.14, 2266.03, NULL, NULL, 62),
('6402', 133, 144, '5"', 2278.79, 2416.73, NULL, NULL, 62),
('6402', 145, 156, '5"', 2617.96, 2775.26, NULL, NULL, 62),
('6402', 157, 168, '5"', 3016.05, 3197.24, NULL, NULL, 62),
('6402', 169, 180, '5"', 3437.01, 3641.80, NULL, NULL, 62),
('6402', 181, 192, '5"', 3916.77, 4148.12, NULL, NULL, 62);

-- ═══ Special Shape Models (p33) ═══
INSERT INTO special_shape_models (model_code, shape_name, shape_type, min_width, max_width, min_height, max_height, max_ui, requires_trim, source_page, notes) VALUES
('S105', 'Circle Top', 'radius', 25, 88, NULL, NULL, 154, true, 33, '["Min/Max Height = 1/2 Width","Mezzo extrusion"]'),
('S110', 'Quarter Arch', 'radius', 25, 95.5, 13, 108, 154, true, 33, '["Mezzo extrusion"]'),
('S111', 'Full Circle', 'radius', 13, 72, 13, 72, 154, true, 33, '["Mezzo extrusion"]'),
('S112', 'Oval', 'radius', 13, 112, 11, 108, 154, true, 33, '["Mezzo extrusion"]'),
('S113', 'Eyebrow', 'radius', 25, 112, 11, 129, 154, true, 33, '["Mezzo extrusion"]'),
('S114', 'Extended Leg Eyebrow', 'radius', 14, 112, 29, 108, 154, true, 33, '["Mezzo extrusion"]'),
('S115', 'Half Eyebrow', 'radius', 13, 112, 11, 108, 154, true, 33, '["Mezzo extrusion"]'),
('S116', 'Ellipse', 'radius', 11, 112, 11, 108, 154, true, 33, '["Mezzo extrusion"]'),
('S118', 'Hexagon', 'polygon', 25, 76, 25, 76, 154, false, 33, '["Mezzo extrusion"]'),
('S120', 'Octagon', 'polygon', 11, 76, 11, 76, 154, false, 33, '["Mezzo extrusion"]'),
('S121', 'Pentagon', 'polygon', 11, 112, 11, 108, 154, false, 33, '["Mezzo extrusion"]'),
('S122', 'Cathedral', 'polygon', 15, 76, 15, 76, 154, false, 33, '["Mezzo extrusion"]'),
('S123', 'Trapezoid', 'polygon', 15, 112, 15, 112, 154, false, 33, '["Mezzo extrusion"]'),
('S129', 'Triangle', 'polygon', 11, 112, 12, 108, 154, false, 33, '["Mezzo extrusion"]'),
('S140', 'Arch-Top DH', 'radius', 25, 52, 43, 96, 148, true, 33, '["No interior color"]'),
('S144', 'Arch-Top SH (full)', 'radius', 16, 52, 43, 96, 148, true, 33, '["No interior color"]'),
('S146', 'Arch-Top SH (half)', 'radius', 16, 52, 43, 96, 148, true, 33, '["No interior color"]');

CREATE INDEX IF NOT EXISTS idx_product_models_series ON product_models(series_code);
CREATE INDEX IF NOT EXISTS idx_product_models_code ON product_models(model_code);
CREATE INDEX IF NOT EXISTS idx_model_pricing_code ON model_pricing_tiers(model_code);
CREATE INDEX IF NOT EXISTS idx_special_shapes_code ON special_shape_models(model_code);
