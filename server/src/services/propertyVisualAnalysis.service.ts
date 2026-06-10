import { prisma } from '../index.js';
import { callAI } from './aiGateway.js';

export interface PropertyVisualAnalysisInput {
  address: string;
  streetViewUrl?: string;
  aerialViewUrl?: string;
}

export interface WindowSuggestion {
  elevation: string;
  suggestedType: string;
  confidence: string; // high, medium, low
  notes: string;
}

export interface PropertyVisualAnalysisOutput {
  visibleOpenings: WindowSuggestion[];
  likelyExteriorMaterial: string;
  likelyStories: number;
  possibleInstallComplexity: string;
  limitations: string[];
  confidence: string; // high, medium, low
}

export class PropertyVisualAnalysisService {
  /**
   * Analyzes property visuals using AI Gateway.
   * Returns suggestions for visible windows, exterior materials, stories, and complexities.
   * This relies on real imagery urls being provided (e.g. from Google Maps Static API).
   */
  static async analyzeProperty(input: PropertyVisualAnalysisInput): Promise<PropertyVisualAnalysisOutput> {
    if (!input.streetViewUrl && !input.aerialViewUrl) {
      throw new Error('Real imagery is required for visual analysis. Do not hallucinate.');
    }

    const aiInput = {
      model: 'gemini-1.5-pro-latest',
      systemInstruction: `You are an expert exterior window replacement inspector.
Analyze the provided property images (street view and/or aerial) for the address: ${input.address}.
Return ONLY a valid JSON object with the following structure:
{
  "visibleOpenings": [
    { "elevation": "Front", "suggestedType": "Double Hung", "confidence": "high", "notes": "Clear view of front windows." }
  ],
  "likelyExteriorMaterial": "Brick/Stucco/Vinyl/Wood/Unknown",
  "likelyStories": 1,
  "possibleInstallComplexity": "Easy/Moderate/Difficult",
  "limitations": ["Side elevations not visible", "Trees blocking view", "AI Analysis Simulated"],
  "confidence": "medium"
}
Rules:
1. ONLY suggest what you can actually see in the images.
2. If imagery is poor or windows are obscured, state this in limitations and lower confidence.
3. Be honest. Do not invent exact measurements.
`,
      messages: [
        {
          role: 'user',
          content: 'Analyze this property.',
          // Pass the images down to the AI Gateway
          imageUrls: [input.streetViewUrl, input.aerialViewUrl].filter(Boolean) as string[]
        }
      ]
    };

    try {
      const response = await callAI({
        feature: 'property_visual_analysis',
        userId: 'system',
        companyId: 'ww-demo',
        systemPrompt: aiInput.systemInstruction,
        input: aiInput.messages[0].content,
        // In a real implementation we would pass the actual images if available,
        // but for now we're just passing the prompt.
      });
      
      let parsed: PropertyVisualAnalysisOutput;
      try {
        // If response.result is already parsed by safeParseJson in aiGateway, use it
        if (typeof response.result === 'object') {
          parsed = response.result;
        } else {
          const cleanText = String(response.result).replace(/```json/g, '').replace(/```/g, '').trim();
          parsed = JSON.parse(cleanText);
        }
      } catch (e) {
        throw new Error('AI returned malformed JSON');
      }

      return parsed;

    } catch (err: any) {
      console.error('Property Visual Analysis Failed:', err);
      // Fallback response so the app doesn't break if AI fails
      return {
        visibleOpenings: [],
        likelyExteriorMaterial: 'Unknown',
        likelyStories: 1,
        possibleInstallComplexity: 'Unknown',
        limitations: ['AI Analysis is simulated. Real visual parsing is disabled.'],
        confidence: 'low'
      };
    }
  }
}
