import { describe, it, expect } from 'vitest';
import { resolveWindowWorldModel, abbreviateWindowWorldColor, abbreviateType } from './orderFormMapping.js';
import { formatExcelFraction } from '../workbookEngine.js';

describe('Order Form Mapping', () => {
  describe('resolveWindowWorldModel', () => {
    it('returns exact model string if numeric', () => {
      expect(resolveWindowWorldModel({ seriesModel: '3002' })).toBe('3002');
      expect(resolveWindowWorldModel({ productModel: '4000' })).toBe('4000');
    });

    it('returns exact model string if alphanumeric dash', () => {
      expect(resolveWindowWorldModel({ seriesModel: '3001-FE' })).toBe('3001-FE');
    });

    it('maps Double Hung and Single Hung defaults to 3001, and Oriel to ORIEL', () => {
      expect(resolveWindowWorldModel({ productCategory: 'Double Hung' })).toBe('3001');
      expect(resolveWindowWorldModel({ productCategory: 'double_hung' })).toBe('3001');
      expect(resolveWindowWorldModel({ productCategory: 'dh' })).toBe('3001');
      expect(resolveWindowWorldModel({ productCategory: 'Single Hung' })).toBe('3001');
      expect(resolveWindowWorldModel({ productCategory: 'single_hung' })).toBe('3001');
      expect(resolveWindowWorldModel({ productCategory: 'sh' })).toBe('3001');
      expect(resolveWindowWorldModel({ productCategory: 'oriel' })).toBe('ORIEL');
    });

    it('maps other categories to specific models', () => {
      expect(resolveWindowWorldModel({ productCategory: 'Casement' })).toBe('0971');
      expect(resolveWindowWorldModel({ productCategory: 'Picture' })).toBe('3004');
      expect(resolveWindowWorldModel({ productCategory: 'Awning' })).toBe('0951');
    });

    it('returns TBD for unknown label', () => {
      expect(resolveWindowWorldModel({ productCategory: 'Spaceship Window' })).toBe('TBD');
    });
  });

  describe('abbreviateWindowWorldColor', () => {
    it('abbreviates standard colors', () => {
      expect(abbreviateWindowWorldColor('White')).toBe('WHT');
      expect(abbreviateWindowWorldColor('Almond')).toBe('ALM');
      expect(abbreviateWindowWorldColor('Bronze')).toBe('BRZ');
      expect(abbreviateWindowWorldColor('Black')).toBe('BLK');
      expect(abbreviateWindowWorldColor('Beige')).toBe('BGE');
      expect(abbreviateWindowWorldColor('Sandstone')).toBe('SAND');
    });

    it('handles uppercase and lowercase and whitespace', () => {
      expect(abbreviateWindowWorldColor(' WHITE ')).toBe('WHT');
      expect(abbreviateWindowWorldColor('bronze')).toBe('BRZ');
    });

    it('maps unknown colors to OTH', () => {
      expect(abbreviateWindowWorldColor('Neon Green')).toBe('OTH');
      expect(abbreviateWindowWorldColor('Unknown')).toBe('OTH');
    });
  });

  describe('abbreviateType', () => {
    it('abbreviates exterior types', () => {
      expect(abbreviateType('Brick Veneer', 'exterior')).toBe('BRICK');
      expect(abbreviateType('Vinyl Siding', 'exterior')).toBe('SIDING');
    });

    it('abbreviates removal types', () => {
      expect(abbreviateType('Aluminum Frame', 'remove')).toBe('ALUM');
      expect(abbreviateType('Full Tearout', 'remove')).toBe('ALUM');
      expect(abbreviateType('Wood Frame', 'remove')).toBe('WOOD');
    });

    it('abbreviates install types', () => {
      expect(abbreviateType('Exterior', 'install')).toBe('EXT');
      expect(abbreviateType('Interior', 'install')).toBe('INT');
    });
  });

  describe('formatExcelFraction', () => {
    it('formats exact multiples of 1/8 to fractional strings', () => {
      expect(formatExcelFraction(55.125)).toBe('55 1/8');
      expect(formatExcelFraction(23.375)).toBe('23 3/8');
      expect(formatExcelFraction(36.75)).toBe('36 3/4');
      expect(formatExcelFraction(72)).toBe('72');
    });

    it('handles numeric strings correctly', () => {
      expect(formatExcelFraction('55.125')).toBe('55 1/8');
      expect(formatExcelFraction('23.375')).toBe('23 3/8');
      expect(formatExcelFraction('72')).toBe('72');
    });

    it('returns non-numeric strings as is', () => {
      expect(formatExcelFraction('Y')).toBe('Y');
      expect(formatExcelFraction('N/A')).toBe('N/A');
    });

    it('returns null/undefined/invalid values as null or as-is', () => {
      expect(formatExcelFraction(null)).toBeNull();
      expect(formatExcelFraction(undefined)).toBeNull();
    });
  });
});
