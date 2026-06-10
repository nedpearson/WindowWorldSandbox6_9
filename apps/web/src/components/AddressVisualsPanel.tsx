import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { HouseOutlineMap } from './HouseOutlineMap';
import { getCachedAddressVisuals, cacheAddressVisuals } from '../lib/offlineDb';

interface Props {
  appointmentId: string;
  address?: string;
  customerId?: string;
  autoLoad?: boolean;
  autoApplyOnLoad?: boolean;
  onGeoReady?: (url: string) => void;
  onReady?: () => void;
  onImportImage?: (dataUrl: string, rotationDegrees?: number) => void;
  onAutoOutline?: (points: { x: number, y: number }[], source: string) => void;
  onManualSketch?: () => void;
}

export function AddressVisualsPanel({ appointmentId, address, customerId, autoLoad, autoApplyOnLoad, onGeoReady, onReady, onImportImage, onAutoOutline, onManualSketch }: Props) {
  const [tab, setTab] = useState<'map' | 'street' | 'photo'>('map');
  const [visuals, setVisuals] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [streetViewUrl, setStreetViewUrl] = useState('');
  const [streetViewLoading, setStreetViewLoading] = useState(false);
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const [frontDirection, setFrontDirection] = useState('South');

  useEffect(() => {
    const loadVisuals = async () => {
      try {
        let data = null;
        try {
          const res = await api.get(`/api/address-visuals/${appointmentId}`);
          if (res.success && res.data) {
            data = res.data;
            await cacheAddressVisuals(data);
          }
        } catch (e) {
          // fallback to offline cache
          data = await getCachedAddressVisuals(appointmentId);
        }

        if (data) {
          setVisuals(data);
          setRotationDegrees(data.rotationDegrees || 0);
          setFrontDirection(data.frontElevationDirection || 'South');
          setTab(data.selectedPrimaryView === 'street' ? 'street' : 'map');
        }
      } catch (err) {
        console.error('Failed to load address visuals', err);
      } finally {
        setLoading(false);
      }
    };
    loadVisuals();
  }, [appointmentId]);

  const saveVisuals = async (updates: any) => {
    try {
      const res = await api.put(`/api/address-visuals/${appointmentId}`, updates);
      if (res.success) {
        setVisuals(res.data);
        await cacheAddressVisuals(res.data);
      }
    } catch (err) {
      console.error('Failed to save visuals', err);
      // Fallback: update local cache optimistically
      const merged = { ...visuals, ...updates };
      setVisuals(merged);
      await cacheAddressVisuals(merged);
      // Note: sync outbox should be used for full offline support but this ensures local persistence
    }
  };

  const fetchStreetView = async () => {
    setStreetViewLoading(true);
    try {
      const res = await api.post(`/api/address-visuals/${appointmentId}/street-view`, {});
      if (res.success && res.available) {
        setVisuals(res.data);
        // Load the proxy image directly using the cache ID
        setStreetViewUrl(`/api/property-image/proxy/${res.snapshotId}`);
      } else {
        alert(res.error || 'Street view is unavailable for this address. Take or upload a front photo instead.');
        setTab('photo');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to fetch street view');
    } finally {
      setStreetViewLoading(false);
    }
  };

  // When tab changes to street view, fetch if not already done
  useEffect(() => {
    if (tab === 'street' && visuals && !visuals.streetViewSnapshotId && !streetViewLoading && !streetViewUrl) {
      fetchStreetView();
    } else if (tab === 'street' && visuals?.streetViewSnapshotId && !streetViewUrl) {
       setStreetViewUrl(`/api/property-image/proxy/${visuals.streetViewSnapshotId}`);
    }
  }, [tab, visuals]);

  const handleRotate = (deg: number) => {
    const newRot = (rotationDegrees + deg) % 360;
    setRotationDegrees(newRot);
  };

  const handleSaveOrientation = async () => {
    await saveVisuals({ rotationDegrees, frontElevationDirection: frontDirection });
    alert('Orientation Saved!');
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading visuals...</div>;

  const S = {
    wrap: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' },
    tabs: { display: 'flex', background: 'var(--card)', borderBottom: '1px solid var(--border)' },
    tab: (active: boolean) => ({
      flex: 1, padding: '0.75rem', textAlign: 'center' as const, fontWeight: active ? 700 : 500,
      background: active ? 'var(--blue-light)' : 'transparent', color: active ? 'var(--blue)' : 'var(--text-muted)',
      borderBottom: active ? '3px solid var(--blue)' : '3px solid transparent', cursor: 'pointer'
    }),
    toolbar: { padding: '0.5rem', background: 'var(--card)', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' as const, borderBottom: '1px solid var(--border)' },
    btn: { padding: '0.4rem 0.8rem', fontSize: '0.875rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }
  };

  return (
    <div style={S.wrap}>
      <div style={S.tabs}>
        <div style={S.tab(tab === 'map')} onClick={() => setTab('map')}>🗺️ Map / Outline</div>
        <div style={S.tab(tab === 'street')} onClick={() => setTab('street')}>📷 Street View</div>
        <div style={S.tab(tab === 'photo')} onClick={() => setTab('photo')}>📸 Front Photo</div>
      </div>

      <div style={S.toolbar}>
        <div style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Orientation:</div>
        <button style={S.btn} onClick={() => handleRotate(-90)}>↺ 90°</button>
        <button style={S.btn} onClick={() => handleRotate(90)}>↻ 90°</button>
        <button style={S.btn} onClick={() => handleRotate(-5)}>↺ 5°</button>
        <button style={S.btn} onClick={() => handleRotate(5)}>↻ 5°</button>
        <button style={S.btn} onClick={() => setRotationDegrees(0)}>Reset</button>
        
        <div style={{ flex: 1 }} />
        <select style={{ ...S.btn, padding: '0.3rem 0.5rem' }} value={frontDirection} onChange={e => setFrontDirection(e.target.value)}>
          <option value="North">Front is North</option>
          <option value="South">Front is South</option>
          <option value="East">Front is East</option>
          <option value="West">Front is West</option>
        </select>
        <button style={{ ...S.btn, background: 'var(--blue)', color: '#fff', border: 'none' }} onClick={handleSaveOrientation}>
          Save Orientation
        </button>
      </div>

      <div style={{ padding: '1rem', background: '#f8fafc' }}>
        {tab === 'map' && (
          <div style={{ transform: `rotate(${rotationDegrees}deg)`, transition: 'transform 0.2s', transformOrigin: 'center center' }}>
            <HouseOutlineMap 
              address={address} 
              appointmentId={appointmentId} 
              customerId={customerId} 
              onAutoOutline={onAutoOutline} 
              onImportImage={(url) => {
                 // Save the primary view as map and the rotation automatically
                 saveVisuals({ selectedPrimaryView: 'map', rotationDegrees });
                 if (onImportImage) onImportImage(url, rotationDegrees);
              }}
              onManualSketch={onManualSketch}
              autoLoad={autoLoad}
              autoApplyOnLoad={autoApplyOnLoad}
              onGeoReady={onGeoReady}
              onReady={onReady}
            />
          </div>
        )}

        {tab === 'street' && (
          <div style={{ textAlign: 'center' }}>
            {streetViewLoading ? (
              <div style={{ padding: '3rem' }}>Fetching Street View...</div>
            ) : streetViewUrl ? (
              <div>
                 <img src={streetViewUrl} alt="Street View" style={{ width: '100%', maxWidth: 600, borderRadius: 8, border: '1px solid var(--border)' }} />
                 <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                    <button style={{ ...S.btn, background: 'var(--blue)', color: '#fff' }} onClick={() => saveVisuals({ selectedPrimaryView: 'street', confirmedFrontElevation: true })}>
                      Use as Front View
                    </button>
                    <button style={S.btn} onClick={fetchStreetView}>Refresh Street View</button>
                 </div>
              </div>
            ) : (
              <div style={{ padding: '2rem' }}>
                <p>Street view is unavailable for this address. Take or upload a front photo instead.</p>
                <button style={S.btn} onClick={() => setTab('photo')}>Go to Manual Photo</button>
              </div>
            )}
          </div>
        )}

        {tab === 'photo' && (
          <div style={{ padding: '2rem', textAlign: 'center', border: '2px dashed var(--border)', borderRadius: 8 }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📸</div>
            <p style={{ color: 'var(--text-muted)' }}>Upload or capture a front photo of the property.</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
              <button style={S.btn}>Take Front Photo</button>
              <button style={S.btn}>Upload Front Photo</button>
            </div>
            {/* The actual photo logic uses the standard AppointmentPhoto upload logic in reality */}
          </div>
        )}
      </div>
    </div>
  );
}

