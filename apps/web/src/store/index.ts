import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem('wwa_token', token);
        set({ user, token });
      },
      logout: () => {
        const currentUser = useAuthStore.getState().user;
        localStorage.removeItem('wwa_token');
        // Clear wwa-mobile store (mobileStore) to prevent previous user's
        // notes, recordings, and draft openings from leaking to next user.
        localStorage.removeItem('wwa-mobile');
        // Clear user-scoped IDB data (appointments, customers, id_mapping, etc.)
        // but preserve company-wide pricing/manual cache and any unsynced outbox
        // items that haven't been confirmed yet.
        if (currentUser?.id) {
          import('../lib/offlineDb').then(({ clearUserCache }) => {
            clearUserCache(currentUser.id).catch(() => {});
          });
        } else {
          // No user ID — safe to wipe everything
          try {
            indexedDB.deleteDatabase('wwa-offline-v1');
          } catch (e) { console.debug("[swallowed error]", e); }
        }
        set({ user: null, token: null });
      },
    }),
    { name: 'wwa-auth' }
  )
);

// ── Unified Draft Store ──────────────────────────────────
// Single KV draft store for both desktop and mobile.
// The mobileStore.drafts is an alias that delegates here.
interface DraftState {
  drafts: Record<string, any>;
  saveDraft: (key: string, data: any) => void;
  getDraft: (key: string) => any;
  removeDraft: (key: string) => void;
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set, get) => ({
      drafts: {},
      saveDraft: (key, data) => set({ drafts: { ...get().drafts, [key]: { ...data, _savedAt: Date.now() } } }),
      getDraft: (key) => get().drafts[key],
      removeDraft: (key) => {
        const d = { ...get().drafts };
        delete d[key];
        set({ drafts: d });
      },
    }),
    { name: 'wwa-drafts' }
  )
);

export * from './updateStore';
