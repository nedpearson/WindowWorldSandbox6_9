import type { PropertyProvider, ProviderResponse } from '../propertyResearch.types.js';

export class PublicPropertyFactsProvider implements PropertyProvider {
  name = 'public_property_facts' as const;

  isEnabled(): boolean {
    // Replace with real public records API check when implemented
    return false;
  }

  async fetchData(address: string, lat?: number, lng?: number): Promise<ProviderResponse> {
    return {
      provider: this.name,
      status: 'available',
      items: [],
      warnings: [],
      licenseNotes: ['Public records data.'],
      confidence: 'high',
    };
  }
}
