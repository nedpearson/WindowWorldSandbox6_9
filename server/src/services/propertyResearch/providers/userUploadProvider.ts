import type { PropertyProvider, ProviderResponse } from '../propertyResearch.types.js';

export class UserUploadProvider implements PropertyProvider {
  name = 'user_upload' as const;

  isEnabled(): boolean {
    return true; // Always enabled for user uploads
  }

  async fetchData(address: string, lat?: number, lng?: number): Promise<ProviderResponse> {
    // Database query logic for user uploads in this session
    return {
      provider: this.name,
      status: 'available',
      items: [],
      warnings: [],
      licenseNotes: ['User uploaded media.'],
      confidence: 'high',
    };
  }
}
