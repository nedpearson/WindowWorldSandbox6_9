// ═══════════════════════════════════════════════════════════════
// Window Vision Analyzer Service
// Uses Gemini Vision to analyze Street View Static images
// and suggest possible window/door openings.
// If Gemini key is missing → falls back to rule-based estimates.
// ═══════════════════════════════════════════════════════════════

export interface WindowSuggestion {
  label: string;       // W1, W2, W3...
  elevation: string;   // front | left | right | rear | unknown
  suggestedType: string;
  confidence: number;  // 0–1
  sourceType: string;  // street_front | street_left | street_right | rule_based
  sourceRef: string;
  bbox: { x: number; y: number; w: number; h: number } | null;
  notes: string;
  limitations: string[];
}

export interface WindowAnalysisResult {
  success: boolean;
  suggestions: WindowSuggestion[];
  limitations: string[];
  aiUsed: boolean;
  fallbackUsed: boolean;
}

interface StreetViewSource {
  heading: number;
  elevation: 'front' | 'left' | 'right' | 'rear';
  label: string;
}

const STREET_VIEW_SOURCES: StreetViewSource[] = [
  { heading: 0,   elevation: 'front', label: 'Front' },
  { heading: 90,  elevation: 'right', label: 'Right Side' },
  { heading: 270, elevation: 'left',  label: 'Left Side' },
];

// Fetch a Street View Static image as base64
async function fetchStreetViewBase64(
  lat: number,
  lng: number,
  heading: number,
  apiKey: string
): Promise<{ base64: string; mimeType: string } | null> {
  const url = new URL('https://maps.googleapis.com/maps/api/streetview');
  url.searchParams.set('size', '640x480');
  url.searchParams.set('location', `${lat},${lng}`);
  url.searchParams.set('heading', String(heading));
  url.searchParams.set('pitch', '-5');
  url.searchParams.set('fov', '90');
  url.searchParams.set('key', apiKey);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    // Check content type — street view returns JPEG
    const ct = res.headers.get('content-type') || '';
    if (!ct.startsWith('image/')) return null;
    const buf = await res.arrayBuffer();
    const base64 = Buffer.from(buf).toString('base64');
    return { base64, mimeType: 'image/jpeg' };
  } catch {
    return null;
  }
}

// Call Gemini Vision to detect windows in an image
async function analyzeImageWithGemini(
  imageBase64: string,
  mimeType: string,
  elevation: string,
  geminiApiKey: string
): Promise<{ windows: Array<{ type: string; confidence: number; notes: string }> }> {
  const prompt = `You are analyzing a Street View photograph of a residential house exterior taken from the ${elevation} side.

Your task: Identify any visible windows and doors on the house structure ONLY (not neighboring houses, trees, or parked cars).

For each opening you see:
- type: double_hung, casement, awning, slider, bay, picture, fixed, front_door, sliding_glass_door, or unknown
- confidence: 0.0 to 1.0 (how certain you are it is a window/door opening in this house)
- notes: brief description (e.g. "upper left, appears to be double hung", "partially obscured by tree")

If you cannot clearly see windows (obstructed view, wrong angle, not a house, etc.) return an empty windows array and explain in a top-level "limitation" field.

Return ONLY valid JSON in this format:
{
  "limitation": "string or null",
  "windows": [
    { "type": "double_hung", "confidence": 0.85, "notes": "lower floor, center" }
  ]
}`;

  const body = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: mimeType, data: imageBase64 } }
      ]
    }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1024,
    }
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    let errorDetail = res.status.toString();
    try {
      const errData = await res.json() as any;
      if (errData?.error?.message) {
        errorDetail = `${res.status} (${errData.error.message})`;
      } else {
        errorDetail = `${res.status} (${JSON.stringify(errData)})`;
      }
    } catch (e) { console.debug("[swallowed error]", e); }
    throw new Error(`Gemini API error: ${errorDetail}`);
  }
  const data = await res.json() as any;
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

  // Parse JSON from response (Gemini sometimes wraps in markdown)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { windows: [] };
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return { windows: [] };
  }
}

// Rule-based fallback estimates (clearly labeled)
function generateRuleBasedEstimates(lat: number, lng: number): WindowSuggestion[] {
  const suggestions: WindowSuggestion[] = [];
  let counter = 1;

  // Front elevation typical estimates
  const frontEstimates = [
    { type: 'double_hung', notes: 'Lower floor, typical front elevation window' },
    { type: 'double_hung', notes: 'Lower floor, typical front elevation window' },
    { type: 'front_door',  notes: 'Primary entry — assumed front elevation' },
  ];

  for (const est of frontEstimates) {
    suggestions.push({
      label: `W${counter++}`,
      elevation: 'front',
      suggestedType: est.type,
      confidence: 0.4,
      sourceType: 'rule_based',
      sourceRef: 'Statistical estimate — not from imagery',
      bbox: null,
      notes: `${est.notes}. Verify on site.`,
      limitations: ['No imagery analyzed. This is a statistical estimate based on typical single-family homes.'],
    });
  }

  // Side/rear placeholders
  ['left', 'right', 'rear'].forEach(elev => {
    suggestions.push({
      label: `W${counter++}`,
      elevation: elev,
      suggestedType: 'double_hung',
      confidence: 0.3,
      sourceType: 'rule_based',
      sourceRef: 'Statistical estimate — not from imagery',
      bbox: null,
      notes: `Possible ${elev} elevation window. Verify on site.`,
      limitations: [`${elev} elevation not visible from available imagery.`],
    });
  });

  return suggestions;
}

export async function analyzePropertyWindows(
  lat: number,
  lng: number,
  profileId: string,
  streetAvailable: boolean
): Promise<WindowAnalysisResult> {
  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const limitations: string[] = [];

  // If no Gemini or no Street View → rule-based fallback
  if (!geminiKey || !streetAvailable || !googleKey) {
    if (!geminiKey) limitations.push('AI analysis unavailable: GEMINI_API_KEY not configured. Showing statistical estimates.');
    if (!streetAvailable) limitations.push('Street View not available at this address. Showing statistical estimates.');

    return {
      success: true,
      suggestions: generateRuleBasedEstimates(lat, lng),
      limitations,
      aiUsed: false,
      fallbackUsed: true,
    };
  }

  // Run Gemini vision on each street view angle
  const allSuggestions: WindowSuggestion[] = [];
  let counter = 1;

  for (const source of STREET_VIEW_SOURCES) {
    const imageData = await fetchStreetViewBase64(lat, lng, source.heading, googleKey);
    if (!imageData) {
      limitations.push(`Could not fetch ${source.label} Street View image.`);
      continue;
    }

    let analysis: Awaited<ReturnType<typeof analyzeImageWithGemini>> | undefined = undefined;
    let retries = 0;
    const maxRetries = 2;
    while (true) {
      try {
        analysis = await analyzeImageWithGemini(imageData.base64, imageData.mimeType, source.label, geminiKey);
        break;
      } catch (err: any) {
        if (err.message.includes('429') && retries < maxRetries) {
          retries++;
          console.log(`[WindowVision] 429 Rate limit hit for ${source.label}, retrying in 2s...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        limitations.push(`AI analysis failed for ${source.label}: ${err.message}`);
        break;
      }
    }
    
    // If analysis failed completely, it will be undefined here
    if (!analysis) continue;

    if (analysis.windows.length === 0) {
      limitations.push(`No windows clearly visible in ${source.label} view.`);
      continue;
    }

    for (const w of analysis.windows) {
      allSuggestions.push({
        label: `W${counter++}`,
        elevation: source.elevation,
        suggestedType: w.type || 'unknown',
        confidence: Math.min(Math.max(w.confidence || 0.5, 0), 1),
        sourceType: `street_${source.elevation}`,
        sourceRef: `Street View heading ${source.heading}°`,
        bbox: null, // bbox requires more advanced vision; reserved for future
        notes: `${w.notes || ''}. Suggested from imagery — verify on site.`,
        limitations: [],
      });
    }

    // Add a strict 1-second delay between requests to avoid Gemini free tier burst limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  if (allSuggestions.length === 0) {
    limitations.push('No windows were clearly identified from available imagery. Using statistical estimates.');
    return {
      success: true,
      suggestions: generateRuleBasedEstimates(lat, lng),
      limitations,
      aiUsed: true,
      fallbackUsed: true,
    };
  }

  // Add standard rear/side limitation note
  limitations.push('Rear elevation is typically not visible from Street View. Rep must verify in person.');

  return {
    success: true,
    suggestions: allSuggestions,
    limitations,
    aiUsed: true,
    fallbackUsed: false,
  };
}
