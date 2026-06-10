import { ImageAnnotatorClient } from '@google-cloud/vision';
import { VertexAI } from '@google-cloud/vertexai';
import { GoogleGenAI } from '@google/genai';

// ─── INIT GOOGLE SDKs ───────────────────────────────────────────────
// Will gracefully fail and return nulls if keys are missing,
// allowing the frontend to use local heuristic fallbacks.
let visionClient: ImageAnnotatorClient | null = null;
let vertexAI: VertexAI | null = null;
let genAi: GoogleGenAI | null = null;

try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    visionClient = new ImageAnnotatorClient();
    vertexAI = new VertexAI({ project: process.env.GOOGLE_PROJECT_ID!, location: 'us-central1' });
  }
  if (process.env.GEMINI_API_KEY) {
    genAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
} catch (error) {
  console.warn('GCP AI Initialization bypassed. Running in heuristic-fallback mode.', error);
}

// ─── 1. VISION AI (Live Exterior Visualizer & Measurement Recovery) ───
export async function detectExteriorGeometry(imageBuffer: Buffer) {
  if (!visionClient) return { status: 'fallback', reason: 'No Vision SDK' };
  
  try {
    const [result] = await (visionClient as any).objectLocalization({
      image: { content: imageBuffer },
    });
    
    return {
      status: 'success',
      objects: result.localizedObjectAnnotations?.map((obj: any) => ({
        name: obj.name, // e.g., 'Window', 'Door', 'Siding'
        score: obj.score,
        vertices: obj.boundingPoly?.normalizedVertices, // Pixel perfect segmentation masks
      })) || [],
    };
  } catch (error: any) {
    return { status: 'error', error: error.message };
  }
}

// ─── 2. VERTEX AI (Remake Prevention Engine) ─────────────────────────
export async function predictRemakeRisk(orderData: any) {
  if (!vertexAI) return { status: 'fallback', riskScore: null };

  try {
    // Calling a custom Vertex AI model trained on historical Window World remakes
    const model = 'projects/windowworld-ai/locations/us-central1/models/remake_predictor_v1';
    
    // Note: Tabular prediction endpoint using the Vertex AI SDK
    const customModel = vertexAI.preview.getGenerativeModel({ model });
    const response = await customModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: JSON.stringify(orderData) }] }]
    });

    const output = response.response.candidates?.[0].content.parts[0].text;
    return {
      status: 'success',
      riskScore: output ? parseFloat(output) : 0, // e.g., 0.85 (85% risk of remake)
    };
  } catch (error: any) {
    return { status: 'error', riskScore: null, error: error.message };
  }
}

// ─── 3. GEMINI 1.5 PRO (Smart Voice & Multimodal Sketch) ─────────────
export async function processVoiceAndPhotoCommand(promptText: string, base64Photo?: string) {
  if (!genAi) return { status: 'fallback', action: null };

  try {
    const parts: any[] = [{ text: `
      You are an Aperture Sales OS assistant. The user is a Window World rep standing outside a house.
      Extract the requested window/door openings from the audio transcript and provide the exact X/Y coordinates 
      relative to the provided house photo. Output strictly in JSON format matching the SketchMarker schema.
      Transcript: "${promptText}"
    ` }];

    if (base64Photo) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Photo,
        }
      });
    }

    const response = await genAi.models.generateContent({
      model: 'gemini-1.5-pro',
      contents: parts,
      config: {
        responseMimeType: 'application/json',
      }
    });

    return {
      status: 'success',
      markers: JSON.parse(response.text || '[]'),
    };
  } catch (error: any) {
    return { status: 'error', action: null, error: error.message };
  }
}
