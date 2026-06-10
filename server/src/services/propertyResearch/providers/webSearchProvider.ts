import type { PropertyProvider, ProviderResponse } from '../propertyResearch.types.js';

export class WebSearchProvider implements PropertyProvider {
  name = 'web_search' as const;

  isEnabled(): boolean {
    return process.env.PROPERTY_RESEARCH_WEB_SEARCH_ENABLED === 'true' &&
           !!process.env.GOOGLE_CUSTOM_SEARCH_API_KEY &&
           !!process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;
  }

  async fetchData(address: string, lat?: number, lng?: number): Promise<ProviderResponse> {
    // Google Custom Search API logic will be implemented here
    return {
      provider: this.name,
      status: 'available',
      items: [],
      warnings: [],
      licenseNotes: ['Data from public web search results. Do not scrape listings.'],
      confidence: 'medium',
    };
  }
}
