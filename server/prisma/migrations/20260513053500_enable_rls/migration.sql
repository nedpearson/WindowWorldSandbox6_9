-- Enable Row Level Security
ALTER TABLE "FormSketch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SketchLayer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SketchMarker" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SketchMarkerLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SketchMeasurementValidation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SketchPricingValidation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SketchAiInterpretation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SketchWarningFlag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SketchCompletenessScore" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InstallerClarityScore" ENABLE ROW LEVEL SECURITY;

-- Create admin override policies for nedpearson@gmail.com
-- For FormSketch
CREATE POLICY "Admin override FormSketch" ON "FormSketch" FOR ALL USING (
    current_setting('request.jwt.claims', true)::json->>'email' = 'nedpearson@gmail.com'
);

-- For SketchLayer
CREATE POLICY "Admin override SketchLayer" ON "SketchLayer" FOR ALL USING (
    current_setting('request.jwt.claims', true)::json->>'email' = 'nedpearson@gmail.com'
);

-- For SketchMarker
CREATE POLICY "Admin override SketchMarker" ON "SketchMarker" FOR ALL USING (
    current_setting('request.jwt.claims', true)::json->>'email' = 'nedpearson@gmail.com'
);

-- For SketchMarkerLink
CREATE POLICY "Admin override SketchMarkerLink" ON "SketchMarkerLink" FOR ALL USING (
    current_setting('request.jwt.claims', true)::json->>'email' = 'nedpearson@gmail.com'
);

-- For SketchMeasurementValidation
CREATE POLICY "Admin override SketchMeasurementValidation" ON "SketchMeasurementValidation" FOR ALL USING (
    current_setting('request.jwt.claims', true)::json->>'email' = 'nedpearson@gmail.com'
);

-- For SketchPricingValidation
CREATE POLICY "Admin override SketchPricingValidation" ON "SketchPricingValidation" FOR ALL USING (
    current_setting('request.jwt.claims', true)::json->>'email' = 'nedpearson@gmail.com'
);

-- For SketchAiInterpretation
CREATE POLICY "Admin override SketchAiInterpretation" ON "SketchAiInterpretation" FOR ALL USING (
    current_setting('request.jwt.claims', true)::json->>'email' = 'nedpearson@gmail.com'
);

-- For SketchWarningFlag
CREATE POLICY "Admin override SketchWarningFlag" ON "SketchWarningFlag" FOR ALL USING (
    current_setting('request.jwt.claims', true)::json->>'email' = 'nedpearson@gmail.com'
);

-- For SketchCompletenessScore
CREATE POLICY "Admin override SketchCompletenessScore" ON "SketchCompletenessScore" FOR ALL USING (
    current_setting('request.jwt.claims', true)::json->>'email' = 'nedpearson@gmail.com'
);

-- For InstallerClarityScore
CREATE POLICY "Admin override InstallerClarityScore" ON "InstallerClarityScore" FOR ALL USING (
    current_setting('request.jwt.claims', true)::json->>'email' = 'nedpearson@gmail.com'
);
