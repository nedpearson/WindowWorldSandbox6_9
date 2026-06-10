import { create } from 'zustand';
import { checkForAppUpdates, type VersionManifest } from '../services/updateService';

interface UpdateState {
  updateAvailable: boolean;
  serverManifest: VersionManifest | null;
  checking: boolean;
  error: string | null;
  checkUpdates: () => Promise<void>;
  resetError: () => void;
}

export const useUpdateStore = create<UpdateState>((set) => ({
  updateAvailable: false,
  serverManifest: null,
  checking: false,
  error: null,
  checkUpdates: async () => {
    set({ checking: true, error: null });
    try {
      const res = await checkForAppUpdates();
      if (res.error) {
        set({ error: res.error, checking: false });
      } else {
        set({
          updateAvailable: res.updateAvailable,
          serverManifest: res.serverManifest || null,
          checking: false
        });
      }
    } catch (e: any) {
      set({ error: e.message || 'failed_to_check', checking: false });
    }
  },
  resetError: () => set({ error: null })
}));
