import type { PropertyProvider, ProviderResponse } from '../propertyResearch.types.js';

export class ListingDataProvider implements PropertyProvider {
  name = 'licensed_listing' as const;

  isEnabled(): boolean {
    return !!process.env.LISTING_DATA_PROVIDER && !!process.env.LISTING_DATA_API_KEY;
  }

  async fetchData(address: string, lat?: number, lng?: number): Promise<ProviderResponse> {
    // Licensed listing logic placeholder
    return {
      provider: this.name,
      status: 'available',
      items: [],
      warnings: [],
      licenseNotes: ['Licensed listing data only.'],
      confidence: 'high',
    };
  }
}
