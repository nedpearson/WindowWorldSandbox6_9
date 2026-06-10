// ═══════════════════════════════════════════════════════════════
// PropertyImageFetcher
// Shows a "Get House Image" button. On click, calls the backend,
// gets a proxied image URL, and notifies the parent.
// No Google API key is ever used here.
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { api } from '../utils/api';

interface PropertyImageResponse {
  success: boolean;
  source: 'street_view' | 'static_map';
  address: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  imageUrl: string;   // This is a /api/property-image/proxy/:id URL — no key exposed
  error?: string;
  fallback?: string;
}

interface Props {
  address?: string;
  appointmentId?: string;
  customerId?: string;
  onImageReady?: (imageUrl: string, source: string) => void;
  onManualSketch?: () => void;
}

const btn = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  width: '100%',
  padding: '0.6rem',
  fontSize: '0.875rem',
  fontWeight: 600,
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  ...extra,
});

export function PropertyImageFetcher({
  address,
  appointmentId,
  customerId,
  onImageReady,
  onManualSketch,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PropertyImageResponse | null>(null);
  const [overrideAddress, setOverrideAddress] = useState('');

  const effectiveAddress = overrideAddress.trim() || address || '';

  const fetchImage = async () => {
    if (!effectiveAddress) {
      setError('Add a property address before getting a house image.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = (await api.post('/property-image/from-address', {
        address: effectiveAddress,
        appointmentId,
        customerId,
      })) as any as PropertyImageResponse;

      if (response.success) {
        setResult(response);
        // Auto-set as background
        if (onImageReady) onImageReady(response.imageUrl, response.source);
      } else {
        setError(response.error || 'Failed to fetch image.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const sourceLabel = result?.source === 'street_view' ? '📷 Street View' : '🏠 Map Footprint';

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '1rem',
    }}>
      <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '0.75rem' }}>
        🏠 Property Reference Image
      </h3>

      {/* Address display / override */}
      {!result && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {address && (
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>
              📍 {address}
            </div>
          )}
          <input
            type="text"
            value={overrideAddress}
            onChange={e => setOverrideAddress(e.target.value)}
            placeholder={address ? 'Override address (optional)' : 'Enter property address'}
            style={{
              padding: '0 10px',
              height: '38px',
              fontSize: '0.875rem',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              background: 'var(--bg)',
              color: 'var(--text)',
              outline: 'none',
            }}
          />
          <button
            onClick={fetchImage}
            disabled={!effectiveAddress}
            style={btn({
              background: effectiveAddress
                ? 'var(--blue)'
                : 'var(--border)',
              color: effectiveAddress ? '#fff' : 'var(--muted)',
              opacity: effectiveAddress ? 1 : 0.6,
            })}
          >
            Get House Image
          </button>
          {onManualSketch && (
            <button
              onClick={onManualSketch}
              style={btn({ background: 'transparent', color: 'var(--blue)', border: '1px solid var(--border)' })}
            >
              Skip — Sketch Manually
            </button>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 0', color: 'var(--muted)', fontSize: '0.875rem' }}>
          <div style={{
            width: '1.25rem', height: '1.25rem', border: '2px solid var(--border)',
            borderTopColor: 'var(--blue)', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', flexShrink: 0,
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          Getting house image…
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{
            background: '#fdecec', color: '#a32d2d',
            padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem',
            border: '1px solid #a32d2d',
          }}>
            ⚠️ {error}
          </div>
          <button onClick={fetchImage} style={btn({ background: 'var(--blue)', color: '#fff' })}>
            Try Again
          </button>
          {onManualSketch && (
            <button onClick={onManualSketch} style={btn({ background: 'transparent', color: 'var(--blue)', border: '1px solid var(--border)' })}>
              Sketch Manually
            </button>
          )}
        </div>
      )}

      {/* Success */}
      {result && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', background: '#000' }}>
            <img
              src={result.imageUrl}
              alt="Property"
              style={{ width: '100%', height: 'auto', maxHeight: '200px', objectFit: 'cover', display: 'block' }}
            />
            <div style={{
              position: 'absolute', top: '0.5rem', left: '0.5rem',
              background: 'rgba(0,0,0,0.7)', color: '#fff',
              fontSize: '0.7rem', padding: '0.2rem 0.5rem',
              borderRadius: '4px', fontWeight: 600,
            }}>
              {sourceLabel}
            </div>
          </div>

          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            📍 {result.formattedAddress}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => onImageReady && onImageReady(result.imageUrl, result.source)}
              style={btn({ flex: 1, background: 'var(--blue)', color: '#fff' })}
            >
              Use for Sketch
            </button>
            <button
              onClick={fetchImage}
              title="Refresh Image"
              style={btn({ width: 'auto', padding: '0.6rem 0.75rem', background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)' })}
            >
              🔄
            </button>
          </div>

          {onManualSketch && (
            <button
              onClick={onManualSketch}
              style={btn({ background: 'transparent', color: 'var(--blue)', border: '1px solid var(--border)' })}
            >
              Sketch Manually
            </button>
          )}
        </div>
      )}
    </div>
  );
}
