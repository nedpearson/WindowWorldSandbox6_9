import type { PropertyProvider, ProviderResponse } from '../propertyResearch.types.js';

export class GooglePropertyProvider implements PropertyProvider {
  name = 'google' as const;

  isEnabled(): boolean {
    return !!process.env.GOOGLE_MAPS_API_KEY;
  }

  async fetchData(address: string, lat?: number, lng?: number): Promise<ProviderResponse> {
    // Street View & Geocoding logic will be implemented here
    return {
      provider: this.name,
      status: 'available',
      items: [],
      warnings: [],
      licenseNotes: ['Google Maps Platform Terms of Service apply.'],
      confidence: 'high',
    };
  }
}
