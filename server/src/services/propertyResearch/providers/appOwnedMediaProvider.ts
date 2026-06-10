import type { PropertyProvider, ProviderResponse } from '../propertyResearch.types.js';

export class AppOwnedMediaProvider implements PropertyProvider {
  name = 'app_owned' as const;

  isEnabled(): boolean {
    return true; // Always enabled for querying existing app database
  }

  async fetchData(address: string, lat?: number, lng?: number): Promise<ProviderResponse> {
    // Database query logic for existing photos
    return {
      provider: this.name,
      status: 'available',
      items: [],
      warnings: [],
      licenseNotes: ['Company-owned media.'],
      confidence: 'high',
    };
  }
}
