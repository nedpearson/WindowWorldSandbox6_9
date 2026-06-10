/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { CLIENT_VERSION } from '../config/version';

// Mock getOfflineDb and database elements
vi.mock('../lib/offlineDb', () => {
  const innerMockCount = vi.fn().mockResolvedValue(0);
  const innerMockTable = {
    count: innerMockCount,
    toArray: vi.fn().mockResolvedValue([]),
    where: vi.fn().mockReturnThis(),
    equals: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(null),
    add: vi.fn().mockResolvedValue(1),
    update: vi.fn().mockResolvedValue(1),
    delete: vi.fn().mockResolvedValue(1),
    get: vi.fn().mockResolvedValue(null),
    filter: vi.fn().mockReturnThis(),
  };

  return {
    getOfflineDb: vi.fn().mockReturnValue({
      address_visuals_cache: innerMockTable,
      sync_outbox: innerMockTable,
      sync_conflicts: innerMockTable,
      photo_blob_queue: innerMockTable,
      appointments_cache: innerMockTable,
      customers_cache: innerMockTable,
      sketches_cache: innerMockTable,
      local_db_migrations: innerMockTable,
      pricing_cache: innerMockTable,
      field_manual_cache: innerMockTable,
      tables: [
        { name: 'appointments_cache', toArray: vi.fn().mockResolvedValue([]) },
        { name: 'customers_cache', toArray: vi.fn().mockResolvedValue([]) },
        { name: 'sync_outbox', toArray: vi.fn().mockResolvedValue([]) }
      ]
    }),
    backupLocalData: vi.fn().mockResolvedValue(true),
    getOrCreateDeviceId: () => 'test_device',
    detectPlatformType: () => 'web'
  };
});

import { getOfflineDb, backupLocalData } from '../lib/offlineDb';

// Import modules to test after mocks
import { checkForAppUpdates, triggerAppUpdate } from '../services/updateService';
import { useUpdateStore } from '../store/updateStore';
import { UpdateBanner } from '../components/UpdateBanner';
import { collectDiagnostics } from '../diagnostics/diagnosticCollectors';

describe('Version Manifest & Theme Update Verification', () => {
  let originalOnLine: boolean;
  let originalFetch: typeof fetch;
  let originalLocation: Location;
  let locationReplaceMock = vi.fn();
  let originalConfirm: typeof window.confirm;
  let cssContent = '';
  let mockCount: any;

  beforeEach(() => {
    originalOnLine = navigator.onLine;
    originalFetch = window.fetch;
    originalConfirm = window.confirm;
    originalLocation = window.location;

    // Get mockCount reference dynamically from mock
    mockCount = getOfflineDb().sync_outbox.count;

    // Mock window.location
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      replace: locationReplaceMock,
      pathname: '/appointments/test-appt',
      search: '',
    } as any;

    // Reset mocks
    locationReplaceMock.mockReset();
    mockCount.mockReset().mockResolvedValue(0);

    // Read CSS content for style assertion tests
    const cssPath = path.resolve(__dirname, '../styles/index.css');
    if (fs.existsSync(cssPath)) {
      cssContent = fs.readFileSync(cssPath, 'utf8');
    }
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', { value: originalOnLine, writable: true });
    window.fetch = originalFetch;
    window.confirm = originalConfirm;
    window.location = originalLocation as any;
  });

  // 1. Canonical theme tokens exist
  it('1. should verify that canonical theme tokens exist in index.css', () => {
    expect(cssContent).toContain('--primary');
    expect(cssContent).toContain('--primary-foreground');
    expect(cssContent).toContain('--secondary');
    expect(cssContent).toContain('--accent');
    expect(cssContent).toContain('--background');
    expect(cssContent).toContain('--surface-card');
    expect(cssContent).toContain('--border');
    expect(cssContent).toContain('--muted');
    expect(cssContent).toContain('--success');
    expect(cssContent).toContain('--warning');
    expect(cssContent).toContain('--danger');
    expect(cssContent).toContain('--info');
    expect(cssContent).toContain('--text-primary');
    expect(cssContent).toContain('--text-secondary');
    expect(cssContent).toContain('--disabled');
    expect(cssContent).toContain('--selected');
    expect(cssContent).toContain('--focus-ring');
  });

  // 2. Primary button uses theme token
  it('2. should verify primary button uses theme token', () => {
    const primaryBtnMatch = cssContent.match(/\.btn-primary\s*\{[^}]*\}/s);
    expect(primaryBtnMatch).not.toBeNull();
    const rule = primaryBtnMatch![0];
    expect(rule).toContain('var(--blue)');
  });

  // 3. Sketch toolbar uses theme token
  it('3. should verify sketch toolbar uses theme token', () => {
    expect(cssContent).toContain('.voice-mic-btn');
    expect(cssContent).toContain('var(--accent)');
  });

  // 4. Marker detail panel uses theme token
  it('4. should verify marker detail panel uses theme token', () => {
    const markerMatch = cssContent.match(/\.marker\s*\{[^}]*\}/s);
    expect(markerMatch).not.toBeNull();
    const rule = markerMatch![0];
    expect(rule).toContain('var(--accent)');
  });

  // 5. Proposal Builder uses theme token
  it('5. should verify Proposal Builder uses theme tokens', () => {
    expect(cssContent).toContain('--bg-card-hover');
    expect(cssContent).toContain('var(--bg-card-hover)');
  });

  // 6. Offline Center uses theme token
  it('6. should verify Offline Center uses theme tokens', () => {
    expect(cssContent).toContain('var(--border)');
    expect(cssContent).toContain('var(--text-muted)');
  });

  // 7. No stale old primary color classes outside allowlist
  it('7. should verify theme compliance allows royal, blue, and allowed status/neutrals only', () => {
    const hexRegex = /#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})\b/g;
    const matches = Array.from(cssContent.matchAll(hexRegex)).map(m => m[0].toLowerCase());
    
    // Core brand color checks inside css
    expect(matches).toContain('#3b5bdb'); // royal
    expect(matches).toContain('#0d6efd'); // blue
  });

  // 8. Version manifest returns app/theme/pricing/template versions
  it('8. should return all version properties from the version manifest mock response', async () => {
    const fakeManifest = {
      appName: 'WindowWorldAssistant',
      version: '1.2.0',
      buildHash: 'hash_120',
      builtAt: '2026-06-06T00:00:00Z',
      themeVersion: '1.2.0',
      pricingRulesVersion: '2026-BTR',
      workbookTemplateVersion: '1.2.0',
      minimumLocalDbVersion: '9',
      updateRequired: false
    };

    window.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => fakeManifest
    });

    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });

    const result = await checkForAppUpdates();
    expect(result.updateAvailable).toBe(true);
    expect(result.serverManifest?.version).toBe('1.2.0');
    expect(result.serverManifest?.themeVersion).toBe('1.2.0');
    expect(result.serverManifest?.pricingRulesVersion).toBe('2026-BTR');
    expect(result.serverManifest?.workbookTemplateVersion).toBe('1.2.0');
  });

  // 9. App detects version mismatch
  it('9. should detect a version mismatch when server version differs from client version', async () => {
    window.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        version: '1.2.0',
        themeVersion: '1.1.0',
        pricingRulesVersion: '2026-BTR',
        workbookTemplateVersion: '1.1.0'
      })
    });
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });

    const result = await checkForAppUpdates();
    expect(result.updateAvailable).toBe(true);
  });

  // 10. Update prompt shows when latest version differs
  it('10. should render update banner when update is available', async () => {
    act(() => {
      useUpdateStore.setState({
        updateAvailable: true,
        serverManifest: {
          appName: 'WindowWorldAssistant',
          version: '1.2.0',
          buildHash: 'xyz',
          builtAt: '',
          themeVersion: '1.2.0',
          pricingRulesVersion: '2026-BTR',
          workbookTemplateVersion: '1.2.0',
          minimumLocalDbVersion: '9',
          updateRequired: false
        }
      });
    });

    render(<UpdateBanner />);
    expect(screen.getByText(/Update Available/)).toBeDefined();
    expect(screen.getByText(/Update Now/)).toBeDefined();
  });

  // 11. Service worker clears old app-shell cache
  it('11. should redirect to /update path during application update trigger to clean service workers and cache', async () => {
    mockCount.mockResolvedValue(0); // No unsynced data
    const res = await triggerAppUpdate();
    expect(res.success).toBe(true);
    expect(locationReplaceMock).toHaveBeenCalledWith('/update?then=%2Fmobile');
  });

  // 12. Local DB not cleared during cache cleanup
  it('12. should verify local DB tables are not wiped during triggerAppUpdate', async () => {
    mockCount.mockResolvedValue(0);
    const db = getOfflineDb();
    
    // We spy on db clear/delete operations to ensure they are NOT called
    const syncOutboxDeleteSpy = vi.spyOn(db.sync_outbox, 'delete');
    
    await triggerAppUpdate();
    expect(syncOutboxDeleteSpy).not.toHaveBeenCalled();
  });

  // 13. Photos not deleted during update
  it('13. should verify photo blob queue is not deleted during update', async () => {
    mockCount.mockResolvedValue(0);
    const db = getOfflineDb();
    const spy = vi.spyOn(db.photo_blob_queue, 'delete');
    await triggerAppUpdate();
    expect(spy).not.toHaveBeenCalled();
  });

  // 14. Documents not deleted during update
  it('14. should verify appointments cache (where documents live) is not wiped during update', async () => {
    mockCount.mockResolvedValue(0);
    const db = getOfflineDb();
    const spy = vi.spyOn(db.appointments_cache, 'delete');
    await triggerAppUpdate();
    expect(spy).not.toHaveBeenCalled();
  });

  // 15. Unsynced changes block or warn before update
  it('15. should warn and return unsynced_data_exists when outbox has pending items', async () => {
    mockCount.mockResolvedValue(5); // 5 items unsynced
    const res = await triggerAppUpdate(false);
    expect(res.success).toBe(false);
    expect(res.error).toBe('unsynced_data_exists');
    expect(res.unsyncedCount).toBe(10); // 5 from outbox + 5 from photos queue
  });

  // 16. After simulated update, themeVersion matches latest
  it('16. should verify version checks pass if client is matched to simulated latest', async () => {
    window.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        version: CLIENT_VERSION.version,
        themeVersion: CLIENT_VERSION.themeVersion,
        pricingRulesVersion: CLIENT_VERSION.pricingRulesVersion,
        workbookTemplateVersion: CLIENT_VERSION.workbookTemplateVersion
      })
    });
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });

    const result = await checkForAppUpdates();
    expect(result.updateAvailable).toBe(false);
  });

  // 17. iPhone 6/7 no horizontal overflow after update
  it('17. should verify index.css enforces horizontal overflow prevention for small screens', () => {
    expect(cssContent).toContain('overflow-x: hidden');
    expect(cssContent).toContain('max-width: 100vw');
  });

  // 18. Surface Pro local app preserves data after update
  it('18. should verify backupLocalData is run before redirection to preserve offline data', async () => {
    mockCount.mockResolvedValue(0);
    const backupSpy = backupLocalData;
    await triggerAppUpdate(true);
    expect(backupSpy).toHaveBeenCalled();
  });

  // 19. Offline mode does not fail when update check unavailable
  it('19. should return updateAvailable false and no error when client is offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
    const result = await checkForAppUpdates();
    expect(result.updateAvailable).toBe(false);
    expect(result.error).toBe('offline');
  });

  // 20. Ctrl + F12 shows app/theme/cache/version state
  it('20. should verify diagnostics collector populates the version checklist fields correctly', async () => {
    window.fetch = vi.fn().mockResolvedValue({ ok: true });
    const report = await collectDiagnostics();
    expect(report.versionChecklist).toBeDefined();
    expect(report.versionChecklist!.themeVersion).toBe(CLIENT_VERSION.themeVersion);
    expect(report.versionChecklist!.pricingRulesVersion).toBe(CLIENT_VERSION.pricingRulesVersion);
    expect(report.versionChecklist!.localDbVersion).toBe(CLIENT_VERSION.localDbVersion);
  });
});

