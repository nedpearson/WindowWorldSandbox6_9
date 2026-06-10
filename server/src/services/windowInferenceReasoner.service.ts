export interface PropertyFacts {
  bedrooms?: number;
  bathrooms?: number;
  stories?: number;
  squareFootage?: number;
  yearBuilt?: number;
  homeStyle?: string;
  propertyType?: string;
  exteriorMaterial?: string;
  listingDescription?: string;
}

export interface InferredOpening {
  label: string;
  openingType: string;
  elevation?: string;
  reasoning: string;
  confidence: number;
}

export interface InferenceResult {
  inferredOpenings: InferredOpening[];
  reasoningSummary: string[];
  limitations: string[];
  confidence: number;
  requiredVerification: string;
}

export class WindowInferenceReasoner {
  inferOpenings(facts: PropertyFacts): InferenceResult {
    const inferredOpenings: InferredOpening[] = [];
    const reasoningSummary: string[] = [];
    const limitations = [
      'This is an estimation based on typical building codes and standard home layouts.',
      'Actual window counts and placements may vary significantly.',
      'Does not replace on-site visual verification.'
    ];

    if (facts.bedrooms) {
      reasoningSummary.push(`${facts.bedrooms}-bedroom home: planning assumption includes at least one operable window per bedroom for egress.`);
      for (let i = 1; i <= facts.bedrooms; i++) {
        inferredOpenings.push({
          label: `W-Bed${i}`,
          openingType: 'window',
          reasoning: 'Standard egress requirement for bedroom.',
          confidence: 0.8,
        });
      }
    }

    if (facts.bathrooms) {
      reasoningSummary.push(`${facts.bathrooms}-bathroom home: planning assumption includes possible obscure glass windows.`);
      for (let i = 1; i <= facts.bathrooms; i++) {
        inferredOpenings.push({
          label: `W-Bath${i}`,
          openingType: 'window',
          reasoning: 'Common placement in bathrooms. May require obscure/tempered glass.',
          confidence: 0.5,
        });
      }
    }

    // Always assume at least one front door and front living room window
    inferredOpenings.push({
      label: 'D-Front',
      openingType: 'door',
      elevation: 'front',
      reasoning: 'Primary entrance assumption.',
      confidence: 0.9,
    });

    inferredOpenings.push({
      label: 'W-Front',
      openingType: 'window',
      elevation: 'front',
      reasoning: 'Standard front elevation living space window.',
      confidence: 0.7,
    });

    return {
      inferredOpenings,
      reasoningSummary,
      limitations,
      confidence: 0.6,
      requiredVerification: 'Verify all openings on site to confirm count, dimensions, and type.',
    };
  }
}

export const windowInferenceReasoner = new WindowInferenceReasoner();
