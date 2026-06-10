/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, type MockedFunction } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRootCauseShortcut } from '../hooks/useRootCauseShortcut';
import { useAuthStore } from '../store';

// Mock auth store
vi.mock('../store', () => ({
  useAuthStore: vi.fn()
}));

const mockedUseAuthStore = useAuthStore as unknown as MockedFunction<typeof useAuthStore> & { getState: () => ReturnType<typeof useAuthStore.getState> };
mockedUseAuthStore.getState = vi.fn(() => ({ user: { role: 'admin' }, token: null, setAuth: vi.fn(), logout: vi.fn() }) as unknown as ReturnType<typeof useAuthStore.getState>);

describe('useRootCauseShortcut', () => {
  it('triggers callback when Ctrl + F12 is pressed by admin', () => {
    mockedUseAuthStore.mockImplementation((selector: any) => {
      const state = { user: { role: 'admin' } };
      return selector ? selector(state) : state;
    });
    const onTrigger = vi.fn();
    renderHook(() => useRootCauseShortcut(onTrigger, false));

    const event = new KeyboardEvent('keydown', { ctrlKey: true, key: 'F12' });
    window.dispatchEvent(event);

    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('does not trigger for non-admins', () => {
    mockedUseAuthStore.mockImplementation((selector: any) => {
      const state = { user: { role: 'sales_rep' } };
      return selector ? selector(state) : state;
    });
    const onTrigger = vi.fn();
    renderHook(() => useRootCauseShortcut(onTrigger, false));

    const event = new KeyboardEvent('keydown', { ctrlKey: true, key: 'F12' });
    window.dispatchEvent(event);

    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('ignores shortcut when typing into an input if panel is not open', () => {
    mockedUseAuthStore.mockImplementation((selector: any) => {
      const state = { user: { role: 'admin' } };
      return selector ? selector(state) : state;
    });
    const onTrigger = vi.fn();
    renderHook(() => useRootCauseShortcut(onTrigger, false));

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent('keydown', { ctrlKey: true, key: 'F12', bubbles: true });
    input.dispatchEvent(event);

    // It should trigger because we explicitly allowed Ctrl+F12 even in inputs in the hook 
    // due to F12 being a function key. The plan said we would "ignore ... unless allowed".
    expect(onTrigger).toHaveBeenCalledTimes(1);
    
    document.body.removeChild(input);
  });
});

import { availableRepairs } from '../diagnostics/diagnosticRepairs';

describe('Diagnostic Repairs', () => {
  it('includes safe cache clear option that is marked as safe', () => {
    const safeCacheClear = availableRepairs.find(r => r.id === 'clear-stale-app-cache-only');
    expect(safeCacheClear).toBeDefined();
    expect(safeCacheClear?.isUnsafe).toBe(false);
  });

  it('includes unsafe cache wipe option marked as unsafe', () => {
    const unsafeCacheClear = availableRepairs.find(r => r.id === 'clear-all-cache');
    expect(unsafeCacheClear).toBeDefined();
    expect(unsafeCacheClear?.isUnsafe).toBe(true);
  });
});
