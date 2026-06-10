import { callAI } from './aiGateway.js';
import { AI_MODELS } from '../config/aiModels.js';
import type { ImageAnalysisResult } from './propertyImageAnalyzer.service.js';
import type { InferenceResult } from './windowInferenceReasoner.service.js';

export interface OpeningSuggestion {
  label: string;
  type: 'window' | 'door';
  elevation: string;
  suggestedType: string;
  confidence: number;
  reasoning: string[];
  limitations: string[];
  finalQuoteEligible: boolean;
  sources: string[];
}

export interface FusionResult {
  suggestions: OpeningSuggestion[];
  fusionConfidence: number;
  limitations: string[];
}

export class OpeningFusionService {
  async fuseEvidence(
    userId: string,
    companyId: string,
    imageResults: ImageAnalysisResult[],
    inferenceResult: InferenceResult | null,
    history: any[] = []
  ): Promise<FusionResult> {
    const systemPrompt = `You are the OpeningFusion service for a window/door replacement company.
Your task is to merge evidence from image analysis, property facts inferences, and historical data into a single deduplicated list of openings.
Rules:
1. Label windows sequentially: W1, W2, W3...
2. Label doors sequentially: D1, D2, D3...
3. Deduplicate openings if they likely refer to the same window/door.
4. Final quote eligibility must ALWAYS be false.
5. Provide a combined confidence score (0.0 to 1.0) and lists of reasoning and limitations.
Output strict JSON with this exact structure:
{
  "fusionConfidence": 0.85,
  "suggestions": [
    {
      "label": "W1",
      "type": "window",
      "elevation": "front",
      "suggestedType": "Double Hung",
      "confidence": 0.9,
      "reasoning": ["Seen in front image", "Matches 3-bedroom profile"],
      "limitations": ["Partially obscured by tree"],
      "finalQuoteEligible": false,
      "sources": ["image_front", "property_facts"]
    }
  ],
  "limitations": ["Rear elevation not visible"]
}`;

    const payload = {
      imageResults,
      inferenceResult,
      history,
    };

    const result = await callAI({
      feature: 'default',
      userId,
      companyId,
      systemPrompt,
      input: JSON.stringify(payload),
      forceModel: AI_MODELS.standardTextModel,
    });

    if (result.status === 'success' || result.status === 'cached') {
      const parsed = result.result;
      
      const suggestions = Array.isArray(parsed?.suggestions) ? parsed.suggestions.map((s: any) => ({
        ...s,
        finalQuoteEligible: false // Enforce rule
      })) : [];

      return {
        suggestions,
        fusionConfidence: typeof parsed?.fusionConfidence === 'number' ? parsed.fusionConfidence : 0,
        limitations: Array.isArray(parsed?.limitations) ? parsed.limitations : [],
      };
    }

    // Graceful fallback: manual basic merge if AI fails
    const fallbackSuggestions: OpeningSuggestion[] = [];
    let wCount = 1;
    let dCount = 1;
    
    for (const ir of imageResults) {
      for (const op of ir.openings) {
        const isWin = op.type === 'window';
        fallbackSuggestions.push({
          label: isWin ? `W${wCount++}` : `D${dCount++}`,
          type: op.type,
          elevation: op.elevation,
          suggestedType: op.suggestedType,
          confidence: op.confidence,
          reasoning: [`From ${ir.sourceType}`],
          limitations: ir.limitations || [],
          finalQuoteEligible: false,
          sources: [ir.sourceRef],
        });
      }
    }

    if (inferenceResult) {
      for (const inf of inferenceResult.inferredOpenings) {
        const isWin = inf.openingType.toLowerCase().includes('door') ? false : true;
        fallbackSuggestions.push({
          label: isWin ? `W${wCount++}` : `D${dCount++}`,
          type: isWin ? 'window' : 'door',
          elevation: inf.elevation || 'unknown',
          suggestedType: inf.openingType,
          confidence: inf.confidence,
          reasoning: [inf.reasoning],
          limitations: inferenceResult.limitations || [],
          finalQuoteEligible: false,
          sources: ['property_facts'],
        });
      }
    }

    return {
      suggestions: fallbackSuggestions,
      fusionConfidence: 0.5,
      limitations: ['AI fusion failed. Used basic concatenation fallback.', ...(result.error ? [result.error] : [])],
    };
  }
}

export const openingFusion = new OpeningFusionService();
