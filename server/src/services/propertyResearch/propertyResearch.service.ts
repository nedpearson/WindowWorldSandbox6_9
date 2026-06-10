import type { PropertyProvider, ProviderResponse } from './propertyResearch.types.js';
import { GooglePropertyProvider } from './providers/googlePropertyProvider.js';
import { WebSearchProvider } from './providers/webSearchProvider.js';
import { ListingDataProvider } from './providers/listingDataProvider.js';
import { PublicPropertyFactsProvider } from './providers/publicPropertyFactsProvider.js';
import { AppOwnedMediaProvider } from './providers/appOwnedMediaProvider.js';
import { UserUploadProvider } from './providers/userUploadProvider.js';

export class PropertyResearchService {
  private providers: PropertyProvider[] = [];

  constructor() {
    this.providers = [
      new GooglePropertyProvider(),
      new WebSearchProvider(),
      new ListingDataProvider(),
      new PublicPropertyFactsProvider(),
      new AppOwnedMediaProvider(),
      new UserUploadProvider(),
    ];
  }

  async runFullResearch(address: string, lat?: number, lng?: number): Promise<ProviderResponse[]> {
    const results = await Promise.all(
      this.providers.map(async (provider) => {
        if (!provider.isEnabled()) {
          return {
            provider: provider.name,
            status: 'not_configured' as const,
            items: [],
            warnings: ['Provider is not enabled or configured.'],
            licenseNotes: [],
            confidence: 'low' as const,
          };
        }

        try {
          return await provider.fetchData(address, lat, lng);
        } catch (error: any) {
          return {
            provider: provider.name,
            status: 'error' as const,
            items: [],
            warnings: [`Error fetching data: ${error.message}`],
            licenseNotes: [],
            confidence: 'low' as const,
          };
        }
      })
    );

    return results;
  }
}

export const propertyResearchService = new PropertyResearchService();
