export type ProviderStatus = 'available' | 'unavailable' | 'not_configured' | 'error';
export type ProviderName = 'google' | 'app_owned' | 'user_upload' | 'web_search' | 'licensed_listing' | 'public_property_facts';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ProviderResponse {
  provider: ProviderName;
  status: ProviderStatus;
  items: any[];
  warnings: string[];
  licenseNotes: string[];
  confidence: ConfidenceLevel;
}

export interface PropertyProvider {
  name: ProviderName;
  isEnabled(): boolean;
  fetchData(address: string, lat?: number, lng?: number): Promise<ProviderResponse>;
}
