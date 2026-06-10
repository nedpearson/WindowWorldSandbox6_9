// ═══════════════════════════════════════════════════════════════
// Photo Recommendation Engine — Unit Tests
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  analyzePhotoAndRecommend,
  savePhotoRecord,
  getPhotoForMarker,
  deletePhotoRecord,
  detectPhotoOrderConflicts,
  type PhotoFeatureTags,
  type PhotoAnalysisRecord,
} from './photoRecommendationEngine';

// Mock offlineDb
const dbStore: PhotoAnalysisRecord[] = [];
vi.mock('../lib/offlineDb', () => ({
  getOfflineDb: () => ({
    photo_analysis_records: {
      where: (key: string) => ({
        equals: (val: string) => ({
          toArray: async () => dbStore.filter(r => (r as any)[key] === val).map(r => ({ ...r, featureTagsJson: JSON.stringify(r.featureTags), recommendationJson: r.recommendation ? JSON.stringify(r.recommendation) : '' })),
          first: async () => {
            const r = dbStore.find(r => (r as any)[key] === val);
            return r ? { ...r, featureTagsJson: JSON.stringify(r.featureTags), recommendationJson: r.recommendation ? JSON.stringify(r.recommendation) : '' } : undefined;
          }
        })
      }),
      put: async (record: any) => {
        const idx = dbStore.findIndex(r => r.id === record.id);
        const memRecord = {
          ...record,
          featureTags: JSON.parse(record.featureTagsJson),
          recommendation: record.recommendationJson ? JSON.parse(record.recommendationJson) : null
        };
        if (idx >= 0) dbStore[idx] = memRecord; else dbStore.push(memRecord);
      },
      delete: async (id: string) => {
        const idx = dbStore.findIndex(r => r.id === id);
        if (idx >= 0) dbStore.splice(idx, 1);
      }
    }
  })
}));

describe('PhotoRecommendationEngine', () => {
  beforeEach(() => {
    dbStore.length = 0;
  });

  // ── Core Analysis ─────────────────────────────────────────
  describe('analyzePhotoAndRecommend', () => {
    it('generates 3 tiers (good/better/best) for windows', () => {
      const tags: PhotoFeatureTags = {
        frameMaterial: 'aluminum',
        condition: 'poor',
        paneCount: 1,
        damages: ['seal_failure', 'draft'],
        exteriorSurface: 'brick',
      };
      const rec = analyzePhotoAndRecommend(tags, 'mk_1', 'dh', 1);

      expect(rec.tiers).toHaveLength(3);
      expect(rec.tiers[0].tier).toBe('good');
      expect(rec.tiers[1].tier).toBe('better');
      expect(rec.tiers[2].tier).toBe('best');
    });

    it('generates 3 tiers for doors', () => {
      const tags: PhotoFeatureTags = { condition: 'fair' };
      const rec = analyzePhotoAndRecommend(tags, 'mk_2', 'sgd', 2);

      expect(rec.tiers).toHaveLength(3);
      expect(rec.tiers[0].productType).toBe('Sliding Glass Door');
    });

    it('sets temperedRequired when near bathroom', () => {
      const tags: PhotoFeatureTags = { isNearBathroom: true };
      const rec = analyzePhotoAndRecommend(tags, 'mk_3', 'dh', 3);

      expect(rec.temperedRequired).toBe(true);
      expect(rec.obscureRecommended).toBe(true);
    });

    it('sets egressConcern for 2nd floor windows', () => {
      const tags: PhotoFeatureTags = { floorLevel: 2 };
      const rec = analyzePhotoAndRecommend(tags, 'mk_4', 'dh', 4);

      expect(rec.egressConcern).toBe(true);
    });

    it('detects issues from damaged aluminum single-pane', () => {
      const tags: PhotoFeatureTags = {
        frameMaterial: 'aluminum',
        paneCount: 1,
        condition: 'failing',
        damages: ['rot', 'seal_failure', 'fogging'],
      };
      const rec = analyzePhotoAndRecommend(tags, 'mk_5', 'dh', 5);

      expect(rec.detectedIssues.length).toBeGreaterThanOrEqual(3);
      expect(rec.energyUpgradeRecommended).toBe(true);
      expect(rec.defaultTier).toBe('best');
    });

    it('defaults to "better" for moderate condition', () => {
      const tags: PhotoFeatureTags = { condition: 'fair' };
      const rec = analyzePhotoAndRecommend(tags, 'mk_6', 'dh', 6);

      expect(rec.defaultTier).toBe('better');
    });

    it('generates order fields with correct install type for brick', () => {
      const tags: PhotoFeatureTags = { exteriorSurface: 'brick' };
      const rec = analyzePhotoAndRecommend(tags, 'mk_7', 'dh', 7);

      expect(rec.orderFields.installType).toBe('EXT');
    });

    it('generates order fields with INT for siding', () => {
      const tags: PhotoFeatureTags = { exteriorSurface: 'vinyl_siding' };
      const rec = analyzePhotoAndRecommend(tags, 'mk_8', 'dh', 8);

      expect(rec.orderFields.installType).toBe('INT');
    });
  });

  // ── Talking Points ────────────────────────────────────────
  describe('talking points', () => {
    it('generates energy talking point for single-pane', () => {
      const tags: PhotoFeatureTags = { paneCount: 1 };
      const rec = analyzePhotoAndRecommend(tags, 'mk_9', 'dh', 9);

      const energyPoint = rec.talkingPoints.find(tp => tp.category === 'energy');
      expect(energyPoint).toBeDefined();
      expect(energyPoint!.script).toContain('thermal performance');
    });

    it('generates maintenance point for wood frames', () => {
      const tags: PhotoFeatureTags = { frameMaterial: 'wood' };
      const rec = analyzePhotoAndRecommend(tags, 'mk_10', 'dh', 10);

      const mainPoint = rec.talkingPoints.find(tp => tp.category === 'maintenance');
      expect(mainPoint).toBeDefined();
      expect(mainPoint!.script).toContain('wood');
    });

    it('always includes savings and comfort points', () => {
      const rec = analyzePhotoAndRecommend({}, 'mk_11', 'dh', 11);

      expect(rec.talkingPoints.find(tp => tp.category === 'savings')).toBeDefined();
      expect(rec.talkingPoints.find(tp => tp.category === 'comfort')).toBeDefined();
    });
  });

  // ── Confidence Scoring ────────────────────────────────────
  describe('confidence scoring', () => {
    it('has lower confidence with fewer tags', () => {
      const minimal = analyzePhotoAndRecommend({}, 'mk_12', 'dh', 12);
      const detailed = analyzePhotoAndRecommend({
        frameMaterial: 'aluminum', condition: 'poor', paneCount: 1,
        isNearBathroom: true, isNearStairs: false, floorLevel: 1,
        damages: ['seal_failure'],
      }, 'mk_13', 'dh', 13);

      expect(detailed.confidence.overall).toBeGreaterThan(minimal.confidence.overall);
    });

    it('always requires manual measurement confirmation', () => {
      const rec = analyzePhotoAndRecommend({ frameMaterial: 'vinyl', condition: 'good' }, 'mk_14', 'dh', 14);

      expect(rec.confidence.requiresManualConfirmation).toBe(true);
    });
  });

  // ── Persistence ───────────────────────────────────────────
  describe('photo record persistence', () => {
    it('saves and retrieves photo records', async () => {
      const record: PhotoAnalysisRecord = {
        id: 'pa_test_1',
        appointmentId: 'apt_1',
        markerId: 'mk_100',
        openingNumber: 1,
        photoDataUrl: 'data:image/png;base64,test',
        featureTags: { frameMaterial: 'vinyl' },
        recommendation: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await savePhotoRecord(record);
      const retrieved = await getPhotoForMarker('mk_100');
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe('pa_test_1');
    });

    it('deletes photo records', async () => {
      const record: PhotoAnalysisRecord = {
        id: 'pa_test_2',
        appointmentId: 'apt_1',
        markerId: 'mk_200',
        openingNumber: 2,
        photoDataUrl: '',
        featureTags: {},
        recommendation: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await savePhotoRecord(record);
      await deletePhotoRecord('pa_test_2');
      expect(await getPhotoForMarker('mk_200')).toBeNull();
    });
  });

  // ── Photo-Order Conflict Detection ────────────────────────
  describe('detectPhotoOrderConflicts', () => {
    it('detects product type mismatch', () => {
      const rec = analyzePhotoAndRecommend({ condition: 'fair' }, 'mk_20', 'picture', 20);
      rec.status = 'accepted';
      rec.orderFields.productCategory = 'picture';

      const conflicts = detectPhotoOrderConflicts(rec, { productCategory: 'double_hung' });
      expect(conflicts.length).toBeGreaterThanOrEqual(1);
      expect(conflicts[0].field).toBe('productCategory');
    });

    it('detects missing tempered glass', () => {
      const rec = analyzePhotoAndRecommend({ isNearBathroom: true }, 'mk_21', 'dh', 21);
      rec.status = 'accepted';

      const conflicts = detectPhotoOrderConflicts(rec, { temperedGlass: 'none' });
      const tempConflict = conflicts.find(c => c.field === 'temperedGlass');
      expect(tempConflict).toBeDefined();
      expect(tempConflict!.severity).toBe('critical');
    });

    it('skips conflict check for non-accepted recommendations', () => {
      const rec = analyzePhotoAndRecommend({}, 'mk_22', 'dh', 22);
      // status is 'pending_review' by default
      const conflicts = detectPhotoOrderConflicts(rec, { productCategory: 'slider' });
      expect(conflicts).toHaveLength(0);
    });
  });

  // ── Window Type Variations ────────────────────────────────
  describe('window type variations', () => {
    it('recommends correct product for slider', () => {
      const rec = analyzePhotoAndRecommend({}, 'mk_30', 'slider', 30);
      expect(rec.tiers[0].productType).toBe('Slider');
    });

    it('recommends no screen for picture windows', () => {
      const rec = analyzePhotoAndRecommend({}, 'mk_31', 'picture', 31);
      expect(rec.tiers[0].screen).toBe('No Screen');
    });

    it('recommends correct product for casement', () => {
      const rec = analyzePhotoAndRecommend({}, 'mk_32', 'casement', 32);
      expect(rec.tiers[0].productType).toBe('Casement');
    });

    it('prices casement higher than double hung', () => {
      const dh = analyzePhotoAndRecommend({}, 'mk_33', 'dh', 33);
      const cas = analyzePhotoAndRecommend({}, 'mk_34', 'casement', 34);
      expect(cas.tiers[0].estimatedPrice).toBeGreaterThan(dh.tiers[0].estimatedPrice);
    });
  });

  // ── Door Recommendations ──────────────────────────────────
  describe('door recommendations', () => {
    it('recommends sliding glass door for SGD marker', () => {
      const rec = analyzePhotoAndRecommend({}, 'mk_40', 'sgd', 40);
      expect(rec.tiers[0].productType).toBe('Sliding Glass Door');
    });

    it('recommends entry door for front_door marker', () => {
      const rec = analyzePhotoAndRecommend({}, 'mk_41', 'front_door', 41);
      expect(rec.tiers[0].productType).toBe('Entry Door');
    });

    it('prices SGD higher than entry door', () => {
      const sgd = analyzePhotoAndRecommend({}, 'mk_42', 'sgd', 42);
      const entry = analyzePhotoAndRecommend({}, 'mk_43', 'front_door', 43);
      expect(sgd.tiers[0].estimatedPrice).toBeGreaterThan(entry.tiers[0].estimatedPrice);
    });
  });

  // ── Grid Matching ─────────────────────────────────────────
  describe('grid pattern matching', () => {
    it('matches existing colonial grids', () => {
      const rec = analyzePhotoAndRecommend({ gridPattern: 'colonial' }, 'mk_50', 'dh', 50);
      expect(rec.tiers[0].gridStyle).toBe('Colonial');
    });

    it('defaults to no grids when none detected', () => {
      const rec = analyzePhotoAndRecommend({ gridPattern: 'none' }, 'mk_51', 'dh', 51);
      expect(rec.tiers[0].gridStyle).toBe('None');
    });

    it('generates curb appeal talking point when grids detected', () => {
      const rec = analyzePhotoAndRecommend({ gridPattern: 'colonial' }, 'mk_52', 'dh', 52);
      const curb = rec.talkingPoints.find(tp => tp.category === 'curb_appeal');
      expect(curb).toBeDefined();
    });
  });
});
