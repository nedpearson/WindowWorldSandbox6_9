import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface PhotoMeasurementAnalysisRequest {
  companyId?: string;
  userId?: string;
  appointmentId: string;
  openingId?: string;
  photoId: string;
  imageUrlOrStoragePath?: string;
  knownMeasurements?: { width: number; height: number };
  exteriorType?: string;
  installType?: string;
  productType?: string; // 'window', 'patio_door', 'entry_door', 'siding'
}

export interface PhotoMeasurementAnalysisResponse {
  windowTypeSuggestion: string;
  exteriorTypeSuggestion: string;
  installTypeSuggestion: string;
  gridSuggestion: string;
  screenSuggestion: string;
  sashNotes: string;
  trimNotes: string;
  tapeReading?: string;
  measurementTips: string[];
  fieldPrefill: any;
  confidence: number;
  limitations: string[];
}

export async function analyzeWindowPhotoForMeasurement(
  req: PhotoMeasurementAnalysisRequest
): Promise<PhotoMeasurementAnalysisResponse> {
  const geminiKey = process.env.GEMINI_API_KEY;

  // Mock response structure
  const defaultResponse: PhotoMeasurementAnalysisResponse = {
    windowTypeSuggestion: "double_hung",
    exteriorTypeSuggestion: req.exteriorType || "brick",
    installTypeSuggestion: req.installType || "insert",
    gridSuggestion: "colonial",
    screenSuggestion: "half_screen",
    sashNotes: "Upper and lower sashes appear intact.",
    trimNotes: "Standard brickmould visible.",
    measurementTips: [
      "Measure width at top, middle, and bottom.",
      "Use the smallest width.",
      "Measure height at left, middle, and right.",
      "Use the smallest height.",
      "Keep the tape level and tight."
    ],
    fieldPrefill: {
      windowType: "double_hung",
      exteriorType: req.exteriorType || "brick",
      installType: req.installType || "insert",
      gridOption: "colonial",
      needsTrim: false,
      needsHeaderFlashing: false,
      needsPhotoReview: false
    },
    tapeReading: undefined,
    confidence: 0.85,
    limitations: [
      "Exact physical size cannot be determined from photo without a verified scale."
    ]
  };

  if (!geminiKey || !req.imageUrlOrStoragePath) {
    // If no key or no image, return the mock
    defaultResponse.limitations.push("AI Analysis simulated. GEMINI_API_KEY not configured or image missing.");
    return defaultResponse;
  }

  // Attempt real Gemini vision call if we have a base64 string
  if (req.imageUrlOrStoragePath.startsWith('data:image')) {
    try {
      const mimeTypeMatch = req.imageUrlOrStoragePath.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
      const base64Data = req.imageUrlOrStoragePath.replace(/^data:image\/\w+;base64,/, "");
      
      const productType = req.productType || 'window';
      let prompt = '';
      
      if (productType === 'siding') {
        prompt = `You are a professional siding installer analyzing a photo of an exterior elevation.
Your task is to:
1. Identify the current siding material, corner trims, and architectural features.
2. Provide measurement tips for estimating square footage and identifying potential obstacles (like meter boxes or exterior light fixtures).

Return ONLY valid JSON in this format:
{
  "windowTypeSuggestion": "siding_elevation",
  "exteriorTypeSuggestion": "vinyl_siding|stucco|wood_siding|brick|aluminum",
  "installTypeSuggestion": "full_tearout|overlay",
  "gridSuggestion": "none",
  "sashNotes": "elevation obstacles noted",
  "trimNotes": "corner trim and fascia notes",
  "measurementTips": ["Measure total width and height of the wall.", "Subtract large non-siding areas like garage doors.", "Note any obstacles."],
  "confidence": 0.85
}`;
      } else if (productType === 'patio_door' || productType === 'entry_door') {
        prompt = `You are a professional door installer analyzing a photo of a door opening.
Your task is to:
1. Identify the door type, number of panels, swing direction (if visible), and exterior surface.
2. Provide measurement tips for doors, emphasizing measuring the rough opening or frame-to-frame width and height, and checking floor clearance.
3. If there is a tape measure visible, read the exact measurement it is pointing to.

Return ONLY valid JSON in this format:
{
  "windowTypeSuggestion": "patio_door|entry_door|storm_door",
  "exteriorTypeSuggestion": "brick|vinyl_siding|stucco|wood_siding",
  "installTypeSuggestion": "insert|full_frame",
  "gridSuggestion": "none|colonial|prairie",
  "sashNotes": "panel configuration notes",
  "trimNotes": "threshold and casing notes",
  "tapeReading": "71.5",
  "measurementTips": ["Measure frame to frame.", "Check sill height.", "Measure diagonally for squareness."],
  "confidence": 0.85
}`;
      } else {
        prompt = `You are a professional window installer analyzing a photo of a window opening.
Your task is to:
1. Identify the window type, exterior surface, and grid patterns.
2. Provide measurement tips. If it's a replacement window, remind them to check the pocket depth. (Classic/Standard series need 3.25" to 4", Slim-Line 5000 needs 2.875").
3. If there is a tape measure visible, read the exact measurement it is pointing to (e.g. "35.5"). If no tape is visible, return null for tapeReading.

Return ONLY valid JSON in this format:
{
  "windowTypeSuggestion": "double_hung|casement|picture|slider",
  "exteriorTypeSuggestion": "brick|vinyl_siding|stucco|wood_siding",
  "installTypeSuggestion": "insert|full_frame",
  "gridSuggestion": "none|colonial|prairie",
  "sashNotes": "brief notes",
  "trimNotes": "brief notes",
  "tapeReading": "35.5",
  "measurementTips": ["tip 1", "tip 2"],
  "confidence": 0.85
}`;
      }

      const body = {
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64Data } }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
        }
      };

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      if (res.ok) {
        const data = await res.json() as any;
        const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            ...defaultResponse,
            windowTypeSuggestion: parsed.windowTypeSuggestion || defaultResponse.windowTypeSuggestion,
            exteriorTypeSuggestion: parsed.exteriorTypeSuggestion || defaultResponse.exteriorTypeSuggestion,
            gridSuggestion: parsed.gridSuggestion || defaultResponse.gridSuggestion,
            sashNotes: parsed.sashNotes || defaultResponse.sashNotes,
            trimNotes: parsed.trimNotes || defaultResponse.trimNotes,
            tapeReading: parsed.tapeReading || undefined,
            confidence: parsed.confidence || defaultResponse.confidence,
            fieldPrefill: {
              ...defaultResponse.fieldPrefill,
              windowType: parsed.windowTypeSuggestion || defaultResponse.fieldPrefill.windowType,
              exteriorType: parsed.exteriorTypeSuggestion || defaultResponse.fieldPrefill.exteriorType,
              gridOption: parsed.gridSuggestion || defaultResponse.fieldPrefill.gridOption,
            }
          };
        }
      }
    } catch (err) {
      console.error('Gemini Vision error:', err);
    }
  }

  return defaultResponse;
}
