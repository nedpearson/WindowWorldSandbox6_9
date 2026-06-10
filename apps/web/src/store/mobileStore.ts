import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ───────────────────────────────────────────────
export interface FieldExtraction {
  id?: string;
  sourceType: 'recording' | 'note' | 'manual';
  sourceText?: string;
  targetTable: string;
  targetField: string;
  originalValue: string;
  normalizedValue: string;
  confidenceScore: number;
  requiresReview: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'applied' | 'conflict';
  openingNumber?: number;
  pricingImpact?: boolean;
  pricingImpactNote?: string;
}

export interface MobileRecording {
  id: string;
  localId: string;
  status: 'recording' | 'saved' | 'transcribing' | 'extracting_fields' | 'needs_review' | 'applied_to_form' | 'failed';
  transcript?: string;
  extractions: FieldExtraction[];
  createdAt: number;
  durationSeconds?: number;
  appointmentId?: string;
  openingId?: string;
  synced: boolean;
  retryCount?: number;
  lastError?: string;
}

export interface MobileNote {
  id?: string;
  localId: string;
  noteText: string;
  extractions: FieldExtraction[];
  status: 'pending' | 'extracting' | 'needs_review' | 'applied' | 'saved_as_note';
  createdAt: number;
  appointmentId?: string;
  synced: boolean;
  retryCount?: number;
  lastError?: string;
}

export interface SyncQueueItem {
  id: string;
  entityType: 'opening' | 'note' | 'recording' | 'measurement' | 'sketch' | 'photo';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  payload: any;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  createdAt: number;
  updatedAt?: number;
  retryCount: number;
  lastError?: string;
}


export interface OfflineDraftOpening {
  localId: string;
  appointmentId: string;
  openingNumber: number;
  data: Record<string, any>;
  savedAt: number;
  synced: boolean;
}

export interface ConflictItem {
  id: string;
  entityType: string;
  entityId: string;
  localData: any;
  serverData: any;
  detectedAt: number;
  resolved: boolean;
  resolution?: 'local' | 'server';
}

interface MobileState {
  // Active context
  activeAppointmentId: string | null;
  setActiveAppointment: (id: string | null) => void;

  // Recordings
  recordings: MobileRecording[];
  addRecording: (rec: Omit<MobileRecording, 'id'>) => string;
  updateRecording: (localId: string, updates: Partial<MobileRecording>) => void;
  setExtractions: (localId: string, extractions: FieldExtraction[]) => void;
  approveExtraction: (localId: string, idx: number) => void;
  rejectExtraction: (localId: string, idx: number) => void;
  editExtraction: (localId: string, idx: number, value: string) => void;

  // Text Notes
  notes: MobileNote[];
  addNote: (note: Omit<MobileNote, 'id'>) => string;
  updateNote: (localId: string, updates: Partial<MobileNote>) => void;

  // Offline Draft Openings (local-first)
  draftOpenings: OfflineDraftOpening[];
  saveDraftOpening: (appointmentId: string, openingNumber: number, data: Record<string, any>) => string;
  getDraftOpenings: (appointmentId: string) => OfflineDraftOpening[];
  markDraftOpeningSynced: (localId: string) => void;
  clearDraftOpening: (localId: string) => void;

  // Sync Queue
  syncQueue: SyncQueueItem[];
  enqueue: (item: Omit<SyncQueueItem, 'id' | 'status' | 'createdAt' | 'retryCount'>) => string;
  markSynced: (id: string) => void;
  markFailed: (id: string, error?: string) => void;
  markSyncing: (id: string) => void;
  incrementRetry: (id: string) => void;
  pruneCompleted: () => void;
  pendingCount: () => number;
  failedCount: () => number;

  // Conflicts
  conflicts: ConflictItem[];
  addConflict: (item: Omit<ConflictItem, 'id' | 'detectedAt' | 'resolved'>) => void;
  resolveConflict: (id: string, resolution: 'local' | 'server') => void;
  unresolvedConflicts: () => number;

  // Network status
  isOnline: boolean;
  setOnline: (v: boolean) => void;
  lastSyncAt: number | null;
  setLastSync: () => void;

  // Photo upload queue
  photoQueue: Array<{
    id: string;
    openingId: string;
    appointmentId: string;
    localUrl?: string;
    file?: string; // base64
    photoType?: string;
    status: 'pending' | 'uploading' | 'uploaded' | 'failed';
    retryCount: number;
    createdAt: number;
  }>;
  enqueuePhoto: (item: { openingId: string; appointmentId: string; file?: string; localUrl?: string; photoType?: string }) => string;
  updatePhotoStatus: (id: string, status: 'pending' | 'uploading' | 'uploaded' | 'failed') => void;
  pendingPhotos: () => number;


}

export const useMobileStore = create<MobileState>()(
  persist(
    (set, get) => ({
      activeAppointmentId: null,
      setActiveAppointment: (id) => set({ activeAppointmentId: id }),

      // ── Recordings ──────────────────────────────────
      recordings: [],
      addRecording: (rec) => {
        const localId = `rec_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const newRec: MobileRecording = { ...rec, id: localId, localId, retryCount: 0 };
        set(s => ({ recordings: [newRec, ...s.recordings] }));
        return localId;
      },
      updateRecording: (localId, updates) => {
        set(s => ({
          recordings: s.recordings.map(r => r.localId === localId ? { ...r, ...updates } : r)
        }));
      },
      setExtractions: (localId, extractions) => {
        set(s => ({
          recordings: s.recordings.map(r => r.localId === localId ? { ...r, extractions, status: 'needs_review' } : r)
        }));
      },
      approveExtraction: (localId, idx) => {
        set(s => ({
          recordings: s.recordings.map(r => {
            if (r.localId !== localId) return r;
            const exts = [...r.extractions];
            exts[idx] = { ...exts[idx], status: 'approved' };
            return { ...r, extractions: exts };
          })
        }));
      },
      rejectExtraction: (localId, idx) => {
        set(s => ({
          recordings: s.recordings.map(r => {
            if (r.localId !== localId) return r;
            const exts = [...r.extractions];
            exts[idx] = { ...exts[idx], status: 'rejected' };
            return { ...r, extractions: exts };
          })
        }));
      },
      editExtraction: (localId, idx, value) => {
        set(s => ({
          recordings: s.recordings.map(r => {
            if (r.localId !== localId) return r;
            const exts = [...r.extractions];
            exts[idx] = { ...exts[idx], normalizedValue: value, status: 'approved' };
            return { ...r, extractions: exts };
          })
        }));
      },

      // ── Notes ────────────────────────────────────────
      notes: [],
      addNote: (note) => {
        const localId = `note_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        set(s => ({ notes: [{ ...note, localId, retryCount: 0 }, ...s.notes] }));
        return localId;
      },
      updateNote: (localId, updates) => {
        set(s => ({
          notes: s.notes.map(n => n.localId === localId ? { ...n, ...updates } : n)
        }));
      },

      // ── Draft Openings (local-first) ─────────────────
      draftOpenings: [],
      saveDraftOpening: (appointmentId, openingNumber, data) => {
        const localId = `dop_${appointmentId}_${openingNumber}_${Date.now()}`;
        set(s => {
          // Replace existing draft for same appointment + openingNumber
          const existing = s.draftOpenings.filter(
            d => !(d.appointmentId === appointmentId && d.openingNumber === openingNumber)
          );
          return {
            draftOpenings: [...existing, { localId, appointmentId, openingNumber, data, savedAt: Date.now(), synced: false }]
          };
        });
        return localId;
      },
      getDraftOpenings: (appointmentId) => {
        return get().draftOpenings.filter(d => d.appointmentId === appointmentId);
      },
      markDraftOpeningSynced: (localId) => {
        set(s => ({
          draftOpenings: s.draftOpenings.map(d => d.localId === localId ? { ...d, synced: true } : d)
        }));
      },
      clearDraftOpening: (localId) => {
        set(s => ({ draftOpenings: s.draftOpenings.filter(d => d.localId !== localId) }));
      },

      // ── Sync Queue ───────────────────────────────────
      syncQueue: [],
      enqueue: (item) => {
        const id = `sq_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        set(s => ({
          syncQueue: [...s.syncQueue, {
            ...item, id, status: 'pending', createdAt: Date.now(),
            updatedAt: Date.now(), retryCount: 0
          }]
        }));
        return id;
      },
      markSynced: (id) => {
        set(s => ({
          syncQueue: s.syncQueue.map(i => i.id === id ? { ...i, status: 'synced', updatedAt: Date.now() } : i)
        }));
      },
      markFailed: (id, error) => {
        set(s => ({
          syncQueue: s.syncQueue.map(i => i.id === id ? { ...i, status: 'failed', lastError: error, updatedAt: Date.now() } : i)
        }));
      },
      markSyncing: (id) => {
        set(s => ({
          syncQueue: s.syncQueue.map(i => i.id === id ? { ...i, status: 'syncing', updatedAt: Date.now() } : i)
        }));
      },
      incrementRetry: (id) => {
        set(s => ({
          syncQueue: s.syncQueue.map(i => i.id === id ? { ...i, retryCount: (i.retryCount || 0) + 1 } : i)
        }));
      },
      pruneCompleted: () => {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000; // keep 24h of completed items for audit
        set(s => ({
          syncQueue: s.syncQueue.filter(i => i.status !== 'synced' || (i.updatedAt || 0) > cutoff)
        }));
      },
      pendingCount: () => get().syncQueue.filter(i => i.status === 'pending' || i.status === 'syncing').length,
      failedCount: () => get().syncQueue.filter(i => i.status === 'failed').length,

      // ── Conflicts ────────────────────────────────────
      conflicts: [],
      addConflict: (item) => {
        const id = `conflict_${Date.now()}`;
        set(s => ({
          conflicts: [...s.conflicts, { ...item, id, detectedAt: Date.now(), resolved: false }]
        }));
      },
      resolveConflict: (id, resolution) => {
        set(s => ({
          conflicts: s.conflicts.map(c => c.id === id ? { ...c, resolved: true, resolution } : c)
        }));
      },
      unresolvedConflicts: () => get().conflicts.filter(c => !c.resolved).length,

      // ── Network ──────────────────────────────────────
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      setOnline: (v) => set({ isOnline: v }),
      lastSyncAt: null,
      setLastSync: () => set({ lastSyncAt: Date.now() }),

      // ── Photo Queue ──────────────────────────────────
      photoQueue: [],
      enqueuePhoto: (item) => {
        const id = `photo_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        set(s => ({
          photoQueue: [...s.photoQueue, { ...item, id, status: 'uploading', retryCount: 0, createdAt: Date.now() }]
        }));

        // Trigger async upload
        if (item.file) {
          import('../utils/api').then(({ api }) => {
            api.saveOpeningPhoto(item.appointmentId, {
              imageData: item.file!,
              openingId: item.openingId,
              photoType: item.photoType || 'other'
            })
            .then(() => {
              get().updatePhotoStatus(id, 'uploaded');
            })
            .catch(err => {
              console.error('Photo upload failed', err);
              get().updatePhotoStatus(id, 'failed');
            });
          });
        } else {
          get().updatePhotoStatus(id, 'failed');
        }

        return id;
      },
      updatePhotoStatus: (id, status) => {
        set(s => ({
          photoQueue: s.photoQueue.map(p => p.id === id ? { ...p, status } : p)
        }));
      },
      pendingPhotos: () => get().photoQueue.filter(p => p.status === 'pending' || p.status === 'uploading').length,


    }),
    {
      name: 'wwa-mobile',
      // Only persist essential offline data — exclude large blobs
      partialize: (state) => ({
        activeAppointmentId: state.activeAppointmentId,
        recordings: state.recordings.map(r => ({ ...r, file: undefined })),
        notes: state.notes,
        draftOpenings: state.draftOpenings,
        syncQueue: state.syncQueue.filter(i => i.status !== 'synced'),

        conflicts: state.conflicts,
        isOnline: state.isOnline,
        lastSyncAt: state.lastSyncAt,
        photoQueue: state.photoQueue.map(p => ({ ...p, file: undefined })), // don't persist base64 blobs

      }),
    }
  )
);
