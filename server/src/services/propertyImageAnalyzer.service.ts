import { createHash } from 'crypto';
import { callAI } from './aiGateway.js';
import { AI_MODELS } from '../config/aiModels.js';

export interface ImageOpeningSuggestion {
  type: 'window' | 'door';
  elevation: string;
  suggestedType: string;
  confidence: number;
}

export interface ImageAnalysisResult {
  sourceRef: string;
  sourceType: string;
  openings: ImageOpeningSuggestion[];
  elevation: string;
  confidence: number;
  limitations: string[];
}

export class PropertyImageAnalyzerService {
  async analyzeImage(
    userId: string,
    companyId: string,
    imageBase64: string,
    imageMimeType: 'image/jpeg' | 'image/png' | 'image/webp',
    sourceRef: string,
    sourceType: string
  ): Promise<ImageAnalysisResult> {
    // Hash the entire image for a reliable cache key
    const fullImageHash = createHash('sha256').update(imageBase64).digest('hex');

    const systemPrompt = `You are an AI Vision Specialist for a window and door replacement company.
Your task is to analyze the provided property image and identify potential windows and doors.
Return your findings as a JSON object with the exact following structure:
{
  "elevation": "front | left | right | rear | unknown",
  "confidence": 0.9,
  "openings": [
    {
      "type": "window | door",
      "elevation": "front",
      "suggestedType": "Double Hung",
      "confidence": 0.8
    }
  ],
  "limitations": ["Tree blocking lower left corner"]
}
Do not include any text outside the JSON. All suggestions must be treated as estimates requiring on-site verification.`;

    const result = await callAI({
      feature: 'photo_analysis',
      userId,
      companyId,
      systemPrompt,
      imageBase64,
      imageMimeType,
      forceModel: AI_MODELS.imageAnalysisModel,
      cacheKey: fullImageHash,
    });

    if (result.status === 'success' || result.status === 'cached') {
      const parsed = result.result;
      return {
        sourceRef,
        sourceType,
        openings: Array.isArray(parsed?.openings) ? parsed.openings : [],
        elevation: parsed?.elevation || 'unknown',
        confidence: typeof parsed?.confidence === 'number' ? parsed.confidence : 0,
        limitations: Array.isArray(parsed?.limitations) ? parsed.limitations : [],
      };
    }

    // Graceful failure
    return {
      sourceRef,
      sourceType,
      openings: [],
      elevation: 'unknown',
      confidence: 0,
      limitations: [result.error || 'AI Vision analysis unavailable or failed.'],
    };
  }
}

export const propertyImageAnalyzer = new PropertyImageAnalyzerService();
