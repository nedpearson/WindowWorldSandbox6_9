-- ═══════════════════════════════════════════════════════════
-- BTR 2026 Pricing Guidelines — Database Schema
-- Stores extracted rules, pricing tables, and audit references
-- ═══════════════════════════════════════════════════════════

-- Source documents
CREATE TABLE IF NOT EXISTS pricing_guideline_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '2026',
  total_pages INTEGER,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  uploaded_by UUID REFERENCES auth.users(id),
  notes TEXT
);

-- Product series definitions
CREATE TABLE IF NOT EXISTS product_series (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  series_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  page_number INTEGER,
  has_exterior_color BOOLEAN DEFAULT false,
  has_interior_color BOOLEAN DEFAULT false,
  has_single_hung BOOLEAN DEFAULT false,
  has_rain_glass BOOLEAN DEFAULT true,
  has_vent_stops BOOLEAN DEFAULT true,
  required_grid_type TEXT,
  clay_available BOOLEAN DEFAULT true,
  notes JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Validation rules (all types)
CREATE TABLE IF NOT EXISTS guideline_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_code TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- 'screen', 'grid', 'oriel', 'color', 'special_shape', 'tempered', 'pricing', 'labor', 'audit'
  severity TEXT NOT NULL DEFAULT 'warning', -- 'critical', 'warning', 'info'
  condition_json JSONB NOT NULL, -- structured condition
  message TEXT NOT NULL,
  suggestion TEXT,
  source_page INTEGER,
  source_section TEXT,
  source_text TEXT, -- exact text from PDF
  override_allowed BOOLEAN DEFAULT false,
  requires_manager_review BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- UI pricing tiers
CREATE TABLE IF NOT EXISTS ui_pricing_tiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  series_code TEXT NOT NULL,
  product_type TEXT NOT NULL, -- 'double_hung', 'slider', 'picture', etc.
  min_ui INTEGER NOT NULL,
  max_ui INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  source_page INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Special shape models
CREATE TABLE IF NOT EXISTS special_shape_models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_code TEXT NOT NULL,
  shape_name TEXT NOT NULL,
  shape_type TEXT NOT NULL, -- 'radius', 'polygon'
  min_width DECIMAL(6,2),
  max_width DECIMAL(6,2),
  min_height DECIMAL(6,2),
  max_height DECIMAL(6,2),
  max_ui INTEGER,
  requires_template BOOLEAN DEFAULT false,
  requires_trim BOOLEAN DEFAULT false,
  source_page INTEGER,
  notes JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pricing adders
CREATE TABLE IF NOT EXISTS pricing_adders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  per_unit TEXT DEFAULT 'per_window', -- 'per_window', 'per_panel', 'per_job'
  condition_description TEXT,
  discountable BOOLEAN DEFAULT true,
  source_page INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Non-discountable items
CREATE TABLE IF NOT EXISTS non_discountable_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name TEXT NOT NULL,
  reason TEXT,
  source_page INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Grid styles reference
CREATE TABLE IF NOT EXISTS grid_styles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  grid_type TEXT NOT NULL, -- 'flat', 'contoured', 'brass'
  casement_only BOOLEAN DEFAULT false,
  source_page INTEGER DEFAULT 71,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Validation warnings log (per opening)
CREATE TABLE IF NOT EXISTS validation_warnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  opening_id UUID,
  appointment_id UUID,
  rule_code TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  suggestion TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══ SEED DATA ═══

-- Product Series
INSERT INTO product_series (series_code, name, page_number, has_exterior_color, has_interior_color, has_single_hung, has_rain_glass, has_vent_stops, required_grid_type, clay_available, notes) VALUES
('L2000', 'L2000 Series (Fusion)', 13, false, false, false, true, true, 'B1', false, '["No exterior color","No single hung","Must use B1 contoured grids","Clay not available"]'),
('03A0', '03A0 Series', 15, true, false, true, false, false, NULL, true, '["No vent stops","No rain glass","Interior color not on SH or arch-tops","Write in specialty section"]'),
('3000', '3000 Series', 17, true, true, false, true, true, NULL, true, '["50 inch max oriel on DH","Over 50 oriel requires 03A0 SH","Oriel: top of glass to top of meeting rail"]'),
('0700', '0700 Series', 13, false, true, true, true, true, NULL, false, '["No exterior color","Clay not available"]'),
('Wincore', 'Wincore Black on Black', 18, true, true, true, true, true, NULL, true, '["Oriel: bottom of window to meeting rail","$100 adder over 120 UI","Contact pricing for Black on Black"]')
ON CONFLICT (series_code) DO NOTHING;

-- Grid Styles
INSERT INTO grid_styles (code, name, grid_type, casement_only) VALUES
('A1', 'Colonial Flat Full', 'flat', false),
('B1', 'Colonial Contour Full', 'contoured', false),
('C1', 'Colonial Brass Full', 'brass', false),
('D1', 'Diamond Full', 'flat', false),
('E1', 'Single Prairie Flat Full', 'flat', false),
('E4', 'Double Prairie Flat Full', 'flat', false),
('F1', 'Single Prairie Contour Full', 'contoured', false),
('F4', 'Double Prairie Contour Full', 'contoured', false),
('G1', 'Single Perimeter Contour Full', 'contoured', false),
('G2', 'Double Perimeter Contour Full', 'contoured', false),
('G3', 'Single Perimeter Flat Full', 'flat', false),
('G4', 'Double Perimeter Flat Full', 'flat', false),
('K1', 'Craftsman', 'flat', true)
ON CONFLICT (code) DO NOTHING;

-- Pricing Adders
INSERT INTO pricing_adders (name, amount, per_unit, condition_description, discountable, source_page) VALUES
('Small Window (UI ≤ 83)', 285.00, 'per_window', 'Sliders and picture windows UI 83 and below', true, 13),
('Tapcon Concrete', 10.00, 'per_window', 'Concrete attachment charge', true, 13),
('Wincore Large Window (UI ≥ 120)', 100.00, 'per_window', 'Non-special-shape windows 120 UI or larger', true, 18),
('Special Shape Over Max UI', 150.00, 'per_window', 'Over max UI but within makeable min/max, or dimension over 84"', false, 60),
('AC Sash', 90.00, 'per_window', 'Additional sash for window AC unit', false, 103),
('Clear Story First Window', 225.00, 'per_window', 'First clear story window minimum', true, 102),
('Clear Story Additional', 75.00, 'per_window', 'Each additional clear story window', true, 102),
('Second Floor', 10.00, 'per_window', 'Standard second floor charge', true, 102),
('SDL Wincore Per Lite', 60.00, 'per_window', 'SDL grids on Wincore Black on Black', false, 19);

-- Non-Discountable Items
INSERT INTO non_discountable_items (item_name, reason, source_page) VALUES
('SDL Grids', 'SDL grids cannot be discounted on any window', 61),
('Special Shape Trim', 'Special shape trim cannot be discounted', 60),
('Special Shape Over Max UI', 'Windows over max UI with $150 adder do not qualify for 80% discount', 60),
('Wincore Special Shape', 'Wincore special shape windows cannot be discounted', 19);

-- Core Guideline Rules
INSERT INTO guideline_rules (rule_code, category, severity, condition_json, message, suggestion, source_page, source_section, override_allowed, requires_manager_review) VALUES
('SCR_PIC', 'screen', 'critical', '{"screenType":"full","productCategory":"picture"}', 'Full screens cannot be made on picture windows', 'Remove screen or use half screen', 13, 'L2000 Rules', false, false),
('SCR_3L', 'screen', 'critical', '{"screenType":"full","productCategory":"3lite_slider"}', 'Full screens cannot be made on 3-lite sliders', 'Remove full screen', 13, 'L2000 Rules', false, false),
('SCR_ARCH', 'screen', 'critical', '{"screenType":"full","productCategory":"arch_top"}', 'Full screens cannot be made on arch-top windows', 'Remove full screen', 13, 'L2000 Rules', false, false),
('GRD_EXT', 'grid', 'critical', '{"hasExteriorColor":true,"gridType":"!=B1"}', 'Exterior color windows must have B1 contoured grids', 'Change grid to B1 contoured', 15, '03A0 Rules', false, false),
('GRD_L2K', 'grid', 'critical', '{"series":"L2000","gridType":"!=B1"}', 'L2000 series must have B1 contoured grids', 'Change grid to B1 contoured', 13, 'L2000 Rules', false, false),
('GRD_DIA', 'grid', 'critical', '{"gridPattern":"diamond","gridType":"!=A1"}', 'Diamond grids must be A1 flat', 'Change grid type to A1 flat', 15, '03A0 Rules', false, false),
('GRD_SDL', 'grid', 'critical', '{"isSDL":true,"sdlSize":null}', 'SDL grids require 7/8" or 1-1/4" designation', 'Specify SDL grid size', 61, 'SDL Rules', false, false),
('ORI_3K', 'oriel', 'critical', '{"series":"3000","productCategory":"DH","orielSize":">50"}', '3000 Series DH has 50" max oriel', 'Use 03A0 single hung for oriel over 50"', 17, '3000 Rules', false, false),
('CLR_CLAY', 'color', 'critical', '{"vinylColor":"clay","series":["L2000","0700"]}', 'Clay cannot be made in L2000/Fusion or 0700 series', 'Change vinyl color or series', 70, 'Color Rules', false, false),
('SS_TRIM', 'special_shape', 'critical', '{"isSpecialShape":true,"shapeType":"radius","hasTrim":false}', 'Radius/arch special shapes require trim unless integrated nail fins', 'Add special shape trim charge', 60, 'Special Shape Rules', false, false),
('SS_OVER', 'special_shape', 'warning', '{"isSpecialShape":true,"overMaxUI":true}', 'Special shape over max UI — full max UI price + $150 adder, not eligible for 80% discount', 'Charge full max UI price + $150 adder', 60, 'Special Shape Rules', false, true),
('TMP_DOOR', 'tempered', 'critical', '{"nearDoor":true,"bottomEdge":"<60","distance":"<24"}', 'Window within 24" of door with bottom < 60" from floor requires tempered glass', 'Add tempered glass', 114, 'Tempering Guidelines', false, false),
('TMP_STAIR', 'tempered', 'critical', '{"nearStairway":true,"bottomEdge":"<36"}', 'Window adjacent to stairway with bottom < 36" requires tempered glass', 'Add tempered glass', 117, 'Tempering Guidelines', false, false),
('WF_DEVICE', 'financing', 'critical', '{"financing":"wells_fargo"}', 'Wells Fargo application must be completed on customer own device, not merchant device', NULL, 118, 'Wells Fargo Memos', false, true)
ON CONFLICT (rule_code) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rules_category ON guideline_rules(category);
CREATE INDEX IF NOT EXISTS idx_rules_severity ON guideline_rules(severity);
CREATE INDEX IF NOT EXISTS idx_warnings_opening ON validation_warnings(opening_id);
CREATE INDEX IF NOT EXISTS idx_warnings_appointment ON validation_warnings(appointment_id);
CREATE INDEX IF NOT EXISTS idx_ui_pricing_series ON ui_pricing_tiers(series_code, product_type);

-- RLS Policies
ALTER TABLE pricing_guideline_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE guideline_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ui_pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_shape_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_adders ENABLE ROW LEVEL SECURITY;
ALTER TABLE non_discountable_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE grid_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_warnings ENABLE ROW LEVEL SECURITY;

-- Read access for authenticated users
CREATE POLICY "read_series" ON product_series FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_rules" ON guideline_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_pricing" ON ui_pricing_tiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_shapes" ON special_shape_models FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_adders" ON pricing_adders FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_nondiscount" ON non_discountable_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_grids" ON grid_styles FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_warnings" ON validation_warnings FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_warnings" ON validation_warnings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_warnings" ON validation_warnings FOR UPDATE TO authenticated USING (true);
