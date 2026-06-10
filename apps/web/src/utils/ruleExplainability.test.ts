import { describe, it, expect } from 'vitest';
import { explainRule, hasExplanation } from './ruleExplainability';

describe('Rule Explainability Registry', () => {
  describe('Screen rules', () => {
    it('explains full screen on picture window', () => {
      const ex = explainRule('pricing-SCR_PIC-1', 'Full screens cannot be made on picture windows.', 1);
      expect(ex.whatIsWrong).toContain('full screen');
      expect(ex.whyItMatters).toContain('fixed');
      expect(ex.consequence).toContain('reject');
      expect(ex.howToFix).toContain('No Screen');
      expect(ex.sourceRule).toContain('Screen');
      expect(ex.affectedField).toBe('screenOption');
      expect(ex.overrideAllowed).toBe(false);
    });

    it('explains missing screen on operable window', () => {
      const ex = explainRule('est-scr-missing-3', 'has no screen', 3);
      expect(ex.whatIsWrong).toContain('#3');
      expect(ex.whyItMatters).toContain('insects');
      expect(ex.overrideAllowed).toBe(true);
      expect(ex.overrideRequires).toBeTruthy();
    });
  });

  describe('Grid rules', () => {
    it('explains exterior color grid mismatch', () => {
      const ex = explainRule('pricing-GRD_EXT-1', 'must have B1 contoured', 1);
      expect(ex.whatIsWrong).toContain('non-B1');
      expect(ex.whyItMatters).toContain('laminate');
      expect(ex.howToFix).toContain('B1');
      expect(ex.overrideAllowed).toBe(false);
    });

    it('explains SDL missing size', () => {
      const ex = explainRule('pricing-GRD_SDL-1', 'SDL grids require designation', 1);
      expect(ex.whatIsWrong).toContain('SDL');
      expect(ex.howToFix).toContain('7/8');
      expect(ex.sourcePage).toBe('Page 61');
    });
  });

  describe('Tempered rules', () => {
    it('explains bathroom tempered requirement', () => {
      const ex = explainRule('est-temp-bath-1', 'bathroom missing tempered', 1);
      expect(ex.whatIsWrong).toContain('bathroom');
      expect(ex.whyItMatters).toContain('building code');
      expect(ex.consequence).toContain('violation');
      expect(ex.overrideAllowed).toBe(false);
    });

    it('explains door-adjacent tempered', () => {
      const ex = explainRule('safety-sg-sidelight-near-door-2', 'within 24" of door', 2);
      expect(ex.whatIsWrong).toContain('24');
      expect(ex.consequence).toContain('code violation');
    });

    it('explains stairway tempered', () => {
      const ex = explainRule('safety-sg-stair-landing-5', 'stairway area', 5);
      expect(ex.whyItMatters).toContain('fall');
      expect(ex.sourcePage).toBe('Page 117');
    });
  });

  describe('Oriel rules', () => {
    it('explains 3000 series oriel > 50"', () => {
      const ex = explainRule('pricing-ORI_3K-1', '3000 Series DH has 50" max oriel', 1);
      expect(ex.whatIsWrong).toContain('50"');
      expect(ex.whyItMatters).toContain('balance');
      expect(ex.howToFix).toContain('03A0');
      expect(ex.sourcePage).toBe('Page 17');
    });
  });

  describe('Color rules', () => {
    it('explains clay + exterior color conflict', () => {
      const ex = explainRule('pricing-CLR_CLAY_EXT-1', 'exterior color on clay', 1);
      expect(ex.whatIsWrong).toContain('clay');
      expect(ex.whyItMatters).toContain('lamination');
      expect(ex.overrideAllowed).toBe(false);
    });
  });

  describe('Size/geometry rules', () => {
    it('explains swapped dimensions', () => {
      const ex = explainRule('est-geo-swap-1', 'did you swap width and height?', 1);
      expect(ex.whatIsWrong).toContain('swap');
      expect(ex.overrideAllowed).toBe(true);
    });

    it('explains min size violation', () => {
      const ex = explainRule('pricing-SZ_MINW-1', 'min width is 14"', 1);
      expect(ex.whyItMatters).toContain('minimum');
      expect(ex.overrideAllowed).toBe(false);
    });
  });

  describe('Brick/install rules', () => {
    it('explains missing brick depth', () => {
      const ex = explainRule('meas-depth-3', 'brick requires depth', 3);
      expect(ex.whatIsWrong).toContain('#3');
      expect(ex.whyItMatters).toContain('return depth');
      expect(ex.howToFix).toContain('Measure');
      expect(ex.affectedField).toBe('openingDepth');
    });
  });

  describe('Order completeness', () => {
    it('explains missing dimensions', () => {
      const ex = explainRule('missing-width-1', 'missing width', 1);
      expect(ex.whatIsWrong).toContain('missing width');
      expect(ex.consequence).toContain('submitted');
    });

    it('explains missing product type', () => {
      const ex = explainRule('missing-productCategory-2', 'missing product', 2);
      expect(ex.howToFix).toContain('Double Hung');
    });
  });

  describe('Sketch sync', () => {
    it('explains missing front door', () => {
      const ex = explainRule('sketch-missing_front_door-g', 'no front door', undefined);
      expect(ex.whatIsWrong).toContain('front door');
      expect(ex.howToFix).toContain('Place');
      expect(ex.overrideAllowed).toBe(true);
    });

    it('explains unlinked marker', () => {
      const ex = explainRule('sketch-marker_no_opening-5', 'no linked opening', 5);
      expect(ex.whatIsWrong).toContain('#5');
      expect(ex.consequence).toContain('missing from the order');
    });
  });

  describe('Consistency', () => {
    it('explains mixed grids in room', () => {
      const ex = explainRule('est-room-grid-Kitchen', 'Kitchen: mixed grid styles', undefined);
      expect(ex.whyItMatters).toContain('Mismatched');
      expect(ex.overrideAllowed).toBe(true);
    });

    it('explains exterior color outlier', () => {
      const ex = explainRule('est-color-ext-outlier', 'different exterior color', undefined);
      expect(ex.consequence).toContain('mismatch');
    });
  });

  describe('Pricing anomalies', () => {
    it('explains high price', () => {
      const ex = explainRule('est-price-high-1', 'price is 3x+ above average', 1);
      expect(ex.howToFix).toContain('breakdown');
      expect(ex.overrideAllowed).toBe(true);
    });
  });

  describe('Fallback', () => {
    it('provides fallback for unknown rules', () => {
      const ex = explainRule('unknown-rule-42', 'Something happened', 42);
      expect(ex.whatIsWrong).toContain('Something happened');
      expect(ex.sourceRule).toContain('unknown-rule-42');
      expect(ex.overrideAllowed).toBe(false);
    });
  });

  describe('hasExplanation', () => {
    it('returns true for known patterns', () => {
      expect(hasExplanation('pricing-SCR_PIC-1', 'picture')).toBe(true);
      expect(hasExplanation('meas-depth-1', 'depth brick')).toBe(true);
    });

    it('returns false for unknown patterns', () => {
      expect(hasExplanation('totally-unknown-xyz', 'gibberish')).toBe(false);
    });
  });

  describe('Enrichment integration', () => {
    it('all explanations have required fields', () => {
      const testCases = [
        'pricing-SCR_PIC-1', 'pricing-GRD_EXT-1', 'est-temp-bath-1',
        'pricing-ORI_3K-1', 'meas-depth-3', 'missing-width-1',
        'sketch-missing_front_door-g', 'est-room-grid-Kitchen',
      ];
      for (const id of testCases) {
        const ex = explainRule(id, id, 1);
        expect(ex.whatIsWrong).toBeTruthy();
        expect(ex.whyItMatters).toBeTruthy();
        expect(ex.consequence).toBeTruthy();
        expect(ex.howToFix).toBeTruthy();
        expect(ex.sourceRule).toBeTruthy();
        expect(typeof ex.overrideAllowed).toBe('boolean');
      }
    });
  });
});
