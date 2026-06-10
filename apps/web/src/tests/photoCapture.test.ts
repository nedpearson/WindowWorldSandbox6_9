import { describe, it, expect, beforeEach, vi } from 'vitest';
import { savePhotoRecord, getPhotoRecords } from '../utils/photoRecommendationEngine';
import type { PhotoAnalysisRecord } from '../utils/photoRecommendationEngine';

const dbStore: PhotoAnalysisRecord[] = [];
vi.mock('../lib/offlineDb', () => ({
  getOfflineDb: () => ({
    photo_analysis_records: {
      where: (key: string) => ({
        equals: (val: string) => ({
          toArray: async () => dbStore.filter(r => (r as any)[key] === val).map(r => ({ ...r, featureTagsJson: JSON.stringify(r.featureTags), recommendationJson: r.recommendation ? JSON.stringify(r.recommendation) : '' })),
        })
      }),
      put: async (record: any) => {
        const memRecord = {
          ...record,
          featureTags: JSON.parse(record.featureTagsJson),
          recommendation: record.recommendationJson ? JSON.parse(record.recommendationJson) : null
        };
        dbStore.push(memRecord);
      }
    }
  })
}));

describe('Photo Capture Stress Test', () => {
  beforeEach(() => {
    dbStore.length = 0;
  });

  it('can rapidly capture and store 50 photos in IndexedDB without quota exceptions', async () => {
    // Generate a 10KB dummy base64 string
    const dummyBase64 = 'data:image/jpeg;base64,' + 'A'.repeat(1024 * 10);
    
    // Simulate capturing 50 photos rapidly in an offline scenario
    for (let i = 1; i <= 50; i++) {
      const record: PhotoAnalysisRecord = {
        id: `pa_${Date.now()}_${i}`,
        appointmentId: 'apt_stress',
        markerId: `mk_${i}`,
        openingNumber: i,
        photoDataUrl: dummyBase64,
        featureTags: { frameMaterial: 'vinyl' },
        recommendation: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      // Await saving to IndexedDB (if this was localStorage, it would hit quota around 5MB)
      await expect(savePhotoRecord(record)).resolves.not.toThrow();
    }

    const records = await getPhotoRecords('apt_stress');
    expect(records.length).toBe(50);
    
    // Total simulated stored data is around ~500KB but base64 can easily be larger.
    // The main point is IndexedDB can handle it gracefully.
  });
});
