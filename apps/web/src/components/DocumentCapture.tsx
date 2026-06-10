import { useState, useRef, useCallback } from 'react';

interface DocumentCaptureProps {
  appointmentId: string;
  onFileCaptured?: (file: File, type: 'camera' | 'import', preview: string) => void;
}

interface CapturedDoc {
  id: string;
  file: File;
  preview: string;
  type: 'camera' | 'import';
  label: string;
  capturedAt: number;
}

export function DocumentCapture({ appointmentId, onFileCaptured }: DocumentCaptureProps) {
  const [docs, setDocs] = useState<CapturedDoc[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [activePreview, setActivePreview] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File, type: 'camera' | 'import') => {
    const preview = URL.createObjectURL(file);
    const doc: CapturedDoc = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      preview,
      type,
      label: type === 'camera' ? `Photo ${docs.length + 1}` : file.name,
      capturedAt: Date.now(),
    };
    setDocs(prev => [...prev, doc]);
    onFileCaptured?.(file, type, preview);

    // Persist to localStorage for offline recovery
    try {
      const stored = JSON.parse(localStorage.getItem(`wwa_docs_${appointmentId}`) || '[]');
      stored.push({ id: doc.id, name: doc.label, type: doc.type, capturedAt: doc.capturedAt, size: file.size });
      localStorage.setItem(`wwa_docs_${appointmentId}`, JSON.stringify(stored));
    } catch (e) { console.debug("[swallowed error]", e); }
  }, [docs.length, appointmentId, onFileCaptured]);

  const handleCameraCapture = () => {
    cameraRef.current?.click();
  };

  const handleFileImport = () => {
    fileRef.current?.click();
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file, 'camera');
    e.target.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      processFile(files[i], 'import');
    }
    e.target.value = '';
  };

  const removeDoc = (id: string) => {
    setDocs(prev => {
      const doc = prev.find(d => d.id === id);
      if (doc) URL.revokeObjectURL(doc.preview);
      return prev.filter(d => d.id !== id);
    });
    try {
      const stored = JSON.parse(localStorage.getItem(`wwa_docs_${appointmentId}`) || '[]');
      localStorage.setItem(`wwa_docs_${appointmentId}`, JSON.stringify(stored.filter((s: any) => s.id !== id)));
    } catch (e) { console.debug("[swallowed error]", e); }
  };

  const renameDoc = (id: string, newLabel: string) => {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, label: newLabel } : d));
  };

  const isImage = (file: File) => file.type.startsWith('image/');
  const isPdf = (file: File) => file.type === 'application/pdf';

  return (
    <>
      {/* Hidden inputs */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment"
        style={{ display: 'none' }} onChange={handleCameraChange} />
      <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx,.xlsx,.xls,.csv,.txt"
        multiple style={{ display: 'none' }} onChange={handleFileChange} />

      {/* Toggle bar */}
      <div style={{
        background: 'var(--bg-secondary, #161b22)', borderRadius: '12px', padding: '12px 16px',
        border: '1px solid var(--border-color, #30363d)', marginBottom: '12px',
      }}>
        <div
          onClick={() => setShowPanel(!showPanel)}
          style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary, #e6edf3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📎 Documents & Photos
            {docs.length > 0 && (
              <span style={{
                fontSize: '0.7rem', fontWeight: 700, background: '#58a6ff22', color: '#58a6ff',
                padding: '2px 8px', borderRadius: '10px',
              }}>
                {docs.length}
              </span>
            )}
          </h4>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #8b949e)' }}>
            {showPanel ? '▲' : '▼'}
          </span>
        </div>

        {showPanel && (
          <div style={{ marginTop: '12px' }}>
            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <button onClick={handleCameraCapture} style={{
                flex: 1, padding: '14px 12px', borderRadius: '10px', border: '2px dashed #3fb95066',
                background: 'rgba(63,185,80,0.06)', cursor: 'pointer', color: '#3fb950',
                fontSize: '0.85rem', fontWeight: 600, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '6px', transition: 'all 0.2s',
              }}
                onMouseEnter={e => { (e.currentTarget).style.borderColor = '#3fb950'; (e.currentTarget).style.background = 'rgba(63,185,80,0.12)'; }}
                onMouseLeave={e => { (e.currentTarget).style.borderColor = '#3fb95066'; (e.currentTarget).style.background = 'rgba(63,185,80,0.06)'; }}
              >
                <span style={{ fontSize: '1.6rem' }}>📷</span>
                <span>Take Photo</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                  Opens camera
                </span>
              </button>

              <button onClick={handleFileImport} style={{
                flex: 1, padding: '14px 12px', borderRadius: '10px', border: '2px dashed #58a6ff66',
                background: 'rgba(88,166,255,0.06)', cursor: 'pointer', color: '#58a6ff',
                fontSize: '0.85rem', fontWeight: 600, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '6px', transition: 'all 0.2s',
              }}
                onMouseEnter={e => { (e.currentTarget).style.borderColor = '#58a6ff'; (e.currentTarget).style.background = 'rgba(88,166,255,0.12)'; }}
                onMouseLeave={e => { (e.currentTarget).style.borderColor = '#58a6ff66'; (e.currentTarget).style.background = 'rgba(88,166,255,0.06)'; }}
              >
                <span style={{ fontSize: '1.6rem' }}>📄</span>
                <span>Import Document</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                  PDF, Images, Excel, Word
                </span>
              </button>
            </div>

            {/* Document list */}
            {docs.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '20px', color: 'var(--text-muted, #8b949e)',
                fontSize: '0.8rem', fontStyle: 'italic',
              }}>
                No documents attached yet. Take a photo or import a file.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {docs.map(doc => (
                  <div key={doc.id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px',
                    background: 'var(--bg-tertiary, #0d1117)', borderRadius: '8px',
                    border: '1px solid var(--border-color, #30363d)', transition: 'all 0.15s',
                  }}>
                    {/* Thumbnail */}
                    {isImage(doc.file) ? (
                      <img src={doc.preview} alt={doc.label}
                        onClick={() => setActivePreview(doc.preview)}
                        style={{
                          width: 44, height: 44, objectFit: 'cover', borderRadius: '6px',
                          cursor: 'pointer', border: '1px solid var(--border-color)',
                        }} />
                    ) : (
                      <div style={{
                        width: 44, height: 44, borderRadius: '6px', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
                        background: isPdf(doc.file) ? 'rgba(248,81,73,0.12)' : 'rgba(88,166,255,0.12)',
                        border: '1px solid var(--border-color)',
                      }}>
                        {isPdf(doc.file) ? '📕' : '📄'}
                      </div>
                    )}

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <input
                        value={doc.label}
                        onChange={e => renameDoc(doc.id, e.target.value)}
                        style={{
                          background: 'transparent', border: 'none', color: 'var(--text-primary)',
                          fontSize: '0.8rem', fontWeight: 600, width: '100%', padding: 0,
                          outline: 'none',
                        }}
                        title="Click to rename"
                      />
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                        <span>{doc.type === 'camera' ? '📷 Camera' : '📄 Imported'}</span>
                        <span>{(doc.file.size / 1024).toFixed(0)} KB</span>
                        <span>{new Date(doc.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <button onClick={() => removeDoc(doc.id)}
                      title="Remove"
                      style={{
                        background: 'rgba(248,81,73,0.1)', border: 'none', color: '#f85149',
                        padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem',
                      }}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fullscreen preview overlay */}
      {activePreview && (
        <div
          onClick={() => setActivePreview(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <img src={activePreview} alt="Preview"
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '8px', objectFit: 'contain' }} />
          <button
            onClick={e => { e.stopPropagation(); setActivePreview(null); }}
            style={{
              position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.15)',
              border: 'none', color: '#fff', fontSize: '1.2rem', padding: '8px 14px',
              borderRadius: '8px', cursor: 'pointer',
            }}
          >
            ✕ Close
          </button>
        </div>
      )}
    </>
  );
}

export default DocumentCapture;
