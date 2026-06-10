import { useState, useRef } from 'react';
import { useMobileStore } from '../store/mobileStore';
import { useAuthStore } from '../store';
import { getOfflineDb, getOrCreateDeviceId } from '../lib/offlineDb';
import { analyzePhotoLocal, isLocalAiInstalled } from '../lib/localAi';
import { PhotoMarkupEditor } from './PhotoMarkupEditor';

const PHOTO_TYPES = [
  { id: 'interior', label: 'Interior', icon: '🏠' },
  { id: 'exterior', label: 'Exterior', icon: '🏡' },
  { id: 'sill', label: 'Sill', icon: '🪵' },
  { id: 'damage', label: 'Damage', icon: '⚠️' },
  { id: 'specialty', label: 'Specialty Shape', icon: '🔷' },
  { id: 'tape', label: 'Tape Measure', icon: '📏' },
  { id: 'track', label: 'Track/Frame', icon: '🚪' },
  { id: 'other', label: 'Other', icon: '📷' },
];

export function MobilePhotoCapture({
  appointmentId,
  openingId,
  openingNumber,
  onClose,
  onPhotoAdded,
}: {
  appointmentId: string;
  openingId?: string;
  openingNumber?: number;
  onClose: () => void;
  onPhotoAdded?: () => void;
}) {
  const mobile = useMobileStore();
  const user = useAuthStore(s => s.user);
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoType, setPhotoType] = useState('');
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [isMarkingUp, setIsMarkingUp] = useState(false);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoBlob(file);
    const reader = new FileReader();
    reader.onload = async () => {
      setPreview(reader.result as string);
      
      // Attempt Local AI Analysis if enabled
      if (isLocalAiInstalled()) {
        setAnalyzing(true);
        try {
          const aiNotes = await analyzePhotoLocal(file);
          if (aiNotes && !note) {
            setNote(aiNotes);
          }
        } catch (err) {
          console.warn('Local AI Photo analysis failed silently', err);
        } finally {
          setAnalyzing(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const savePhoto = async () => {
    if (!preview || !photoType || !photoBlob) return;
    setSaving(true);
    
    try {
      const localId = `photo_${Date.now()}`;
      // Use file size + lastModified as a stable hash for dedup
      const fileHash = `${photoBlob.size}_${photoBlob.lastModified}_${photoBlob.name}`;
      const companyId = user?.companyId ?? 'unknown';
      const userId = user?.id ?? 'unknown';
      const deviceId = getOrCreateDeviceId();

      // Save full binary blob to Dexie so it survives app restart
      await getOfflineDb().photo_blob_queue.add({
        localId,
        appointmentId,
        openingId,
        photoType,
        blob: photoBlob,
        fileName: photoBlob.name || `${localId}.jpg`,
        mimeType: photoBlob.type || 'image/jpeg',
        sizeBytes: photoBlob.size,
        fileHash,
        status: 'queued',
        retryCount: 0,
        createdAt: Date.now(),
      });

      // Bulletproof Surface Pro Local File Backup for Photos
      if (typeof window !== 'undefined' && (window as any).electronAPI?.saveFileLocally) {
        try {
          const arrayBuffer = await photoBlob.arrayBuffer();
          const filename = `${appointmentId}_${photoType}_${localId}.jpg`;
          (window as any).electronAPI.saveFileLocally(filename, arrayBuffer, `Photos`);
        } catch (err) {
          console.error('Failed to save photo locally via IPC', err);
        }
      }

      // Also add an outbox item to trigger sync
      await getOfflineDb().sync_outbox.add({
        companyId,
        userId,
        deviceId,
        platform: 'web',
        entityType: 'photo',
        entityLocalId: localId,
        appointmentId,
        operation: 'upload_file',
        payloadJson: JSON.stringify({
          appointmentId,
          openingId,
          openingNumber,
          photoType,
          note,
          fileHash,
        }),
        idempotencyKey: `photo_${fileHash}`, // dedup by content hash
        status: 'pending',
        retryCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Keep legacy store update for immediate UI reflection
      mobile.enqueuePhoto({
        openingId: openingId || '',
        appointmentId,
        file: preview,
        localUrl: preview,
        photoType,
      });

    } catch (err) {
      console.error('Failed to queue photo offline:', err);
    }

    setSaving(false);
    setPreview(null);
    setPhotoBlob(null);
    setPhotoType('');
    setNote('');
    onPhotoAdded?.();
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 250, display: 'flex', alignItems: 'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: '100%', background: 'var(--bg-secondary)',
        borderRadius: '20px 20px 0 0', padding: '1.25rem',
        maxHeight: '92dvh', overflowY: 'auto',
        paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
      }}>
        {isMarkingUp && preview ? (
          <PhotoMarkupEditor
            originalDataUrl={preview}
            onSave={async (newUrl) => {
              setPreview(newUrl);
              // convert new data URL to blob so we can save it properly
              const res = await fetch(newUrl);
              const blob = await res.blob();
              const newFile = new File([blob], photoBlob?.name || 'markup.jpg', { type: 'image/jpeg' });
              setPhotoBlob(newFile);
              setIsMarkingUp(false);
            }}
            onCancel={() => setIsMarkingUp(false)}
          />
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>📷 Add Photo {openingNumber ? `— Opening #${openingNumber}` : ''}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Photo type selector */}
        {!preview && (
          <>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              Photo Type
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
              {PHOTO_TYPES.map(pt => (
                <button key={pt.id} onClick={() => setPhotoType(pt.id)} style={{
                  padding: '0.75rem 0.25rem', borderRadius: 10, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
                  background: photoType === pt.id ? 'rgba(59,130,246,0.15)' : 'var(--bg-input)',
                  border: `1px solid ${photoType === pt.id ? 'var(--accent)' : 'var(--border)'}`,
                  color: photoType === pt.id ? 'var(--accent)' : 'var(--text-secondary)',
                  fontSize: '0.6875rem', fontWeight: 600,
                }}>
                  <span style={{ fontSize: '1.25rem' }}>{pt.icon}</span>
                  {pt.label}
                </button>
              ))}
            </div>

            {/* Capture buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button onClick={() => fileRef.current?.click()} disabled={!photoType} style={{
                padding: '1.25rem', borderRadius: 12, cursor: photoType ? 'pointer' : 'not-allowed',
                background: photoType ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'var(--bg-input)',
                color: photoType ? 'white' : 'var(--text-muted)', border: 'none',
                fontWeight: 700, fontSize: '0.9375rem',
              }}>
                📸 Take Photo
              </button>
              <button onClick={() => {
                const input = document.createElement('input');
                input.type = 'file'; input.accept = 'image/*'; input.onchange = (e: any) => handleCapture(e);
                input.click();
              }} disabled={!photoType} style={{
                padding: '1.25rem', borderRadius: 12, cursor: photoType ? 'pointer' : 'not-allowed',
                background: 'var(--bg-input)', color: photoType ? 'var(--text-primary)' : 'var(--text-muted)',
                border: '1px solid var(--border)', fontWeight: 600, fontSize: '0.9375rem',
              }}>
                🖼 Upload
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleCapture} style={{ display: 'none' }} />
            {!photoType && <div style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: '0.5rem', textAlign: 'center' }}>Select a photo type first</div>}
          </>
        )}

        {/* Preview */}
        {preview && (
          <div>
            <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: '0.75rem', border: '1px solid var(--border)' }}>
              <img src={preview} alt="Preview" style={{ width: '100%', maxHeight: 300, objectFit: 'cover' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.5rem', borderRadius: 6, background: 'rgba(59,130,246,0.15)', color: 'var(--accent)' }}>
                {PHOTO_TYPES.find(p => p.id === photoType)?.icon} {PHOTO_TYPES.find(p => p.id === photoType)?.label}
              </span>
              {openingNumber && <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.5rem', borderRadius: 6, background: 'rgba(34,197,94,0.15)', color: 'var(--success)' }}>Opening #{openingNumber}</span>}
            </div>
            <input type="text" placeholder="Add a note (optional)..." value={note} onChange={e => setNote(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.625rem 0.75rem', color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '0.75rem' }} />
            
            {analyzing && <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginBottom: '0.75rem' }}>✨ Local AI is analyzing photo...</div>}
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <button onClick={() => setIsMarkingUp(true)} style={{
                padding: '0.875rem', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)',
                borderRadius: 10, fontWeight: 700, cursor: 'pointer',
              }}>
                🖍 Markup / Draw
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button onClick={savePhoto} disabled={saving} style={{
                padding: '0.875rem', background: 'var(--accent)', color: 'white', border: 'none',
                borderRadius: 10, fontWeight: 700, cursor: 'pointer',
              }}>
                {saving ? 'Saving…' : '✓ Save Photo'}
              </button>
              <button onClick={() => { setPreview(null); }} style={{
                padding: '0.875rem', background: 'var(--bg-input)', color: 'var(--text-primary)',
                border: '1px solid var(--border)', borderRadius: 10, fontWeight: 600, cursor: 'pointer',
              }}>
                ← Retake
              </button>
            </div>
          </div>
        )}

        {/* Pending photos count */}
        {mobile.pendingPhotos() > 0 && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--warning)', textAlign: 'center' }}>
            📤 {mobile.pendingPhotos()} photo(s) pending upload
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
