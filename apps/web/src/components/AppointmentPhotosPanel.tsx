import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../utils/api';
import { getPhotoGallery, type PhotoGalleryData } from '../utils/photoOrganizer';

interface Photo {
  id: string;
  photoUrl: string;
  photoType: string;
  description: string;
  createdAt: string;
}

// Filter key: 'all' | '_unassigned' | openingId string
type OpeningFilterKey = 'all' | '_unassigned' | string;

export default function AppointmentPhotosPanel({ appointmentId }: { appointmentId: string }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [openingFilter, setOpeningFilter] = useState<OpeningFilterKey>('all');
  const [galleryData, setGalleryData] = useState<PhotoGalleryData | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPhotos();
    loadGalleryData();
  }, [appointmentId]);

  const fetchPhotos = async () => {
    try {
      const data = await api.getAppointmentPhotos(appointmentId);
      setPhotos(data);
    } catch (err) {
      console.error('Failed to load photos', err);
    } finally {
      setLoading(false);
    }
  };

  const loadGalleryData = async () => {
    try {
      const data = await getPhotoGallery(appointmentId);
      setGalleryData(data);
    } catch (err) {
      console.error('Failed to load gallery data', err);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    // Convert to base64
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      
      try {
        await api.uploadAppointmentPhoto(appointmentId, {
          fileData: base64,
          fileName: file.name,
          photoType: 'general'
        });
        await fetchPhotos();
        await loadGalleryData();
      } catch (err) {
        console.error('Upload failed', err);
        alert('Failed to upload photo. Please try again.');
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;
    try {
      await api.deleteAppointmentPhoto(appointmentId, photoId);
      setPhotos(photos.filter(p => p.id !== photoId));
      if (selectedPhoto?.id === photoId) setSelectedPhoto(null);
      await loadGalleryData();
    } catch (err) {
      console.error('Delete failed', err);
      alert('Failed to delete photo.');
    }
  };

  // Build filter button entries from gallery data
  const filterButtons = useMemo(() => {
    const buttons: { key: OpeningFilterKey; label: string; count: number }[] = [
      { key: 'all', label: 'All Photos', count: photos.length },
    ];

    if (galleryData) {
      // Add opening-specific filters
      for (const [openingId, group] of Object.entries(galleryData.byOpening)) {
        const num = group.openingNumber;
        buttons.push({
          key: openingId,
          label: num ? `Opening #${num}` : openingId.slice(0, 8),
          count: group.photos.length,
        });
      }

      // Add unassigned filter (only if there are unassigned photos)
      if (galleryData.unassigned.length > 0) {
        buttons.push({
          key: '_unassigned',
          label: 'Unassigned',
          count: galleryData.unassigned.length,
        });
      }
    }

    return buttons;
  }, [galleryData, photos.length]);

  // Filter photos based on selected opening filter
  const filteredPhotos = useMemo(() => {
    if (openingFilter === 'all' || !galleryData) return photos;

    if (openingFilter === '_unassigned') {
      const unassignedIds = new Set(galleryData.unassigned.map(p => p.localId));
      return photos.filter(p => unassignedIds.has(p.id));
    }

    // Filter by specific opening
    const openingGroup = galleryData.byOpening[openingFilter];
    if (!openingGroup) return photos;
    const openingIds = new Set(openingGroup.photos.map(p => p.localId));
    return photos.filter(p => openingIds.has(p.id));
  }, [photos, openingFilter, galleryData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48 text-slate-400">
        ⏳ Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Project Photos</h3>
          <p className="text-sm text-slate-500">Store reference images for this appointment</p>
        </div>
        
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {uploading ? '⏳ Uploading...' : '☁️ Upload Photo'}
        </button>
      </div>

      {/* Opening Filter Bar */}
      {filterButtons.length > 1 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '12px 16px',
          background: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
        }}>
          {filterButtons.map(btn => {
            const isActive = openingFilter === btn.key;
            return (
              <button
                key={btn.key}
                onClick={() => setOpeningFilter(btn.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  border: isActive ? '1px solid #3b82f6' : '1px solid #cbd5e1',
                  background: isActive ? '#eff6ff' : '#ffffff',
                  color: isActive ? '#1d4ed8' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {btn.label}
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '20px',
                  height: '20px',
                  padding: '0 6px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: isActive ? '#3b82f6' : '#e2e8f0',
                  color: isActive ? '#ffffff' : '#64748b',
                }}>
                  {btn.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Photo Grid */}
      {photos.length === 0 ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-12 text-center">
          <div className="text-4xl text-slate-300 mx-auto mb-4">📷</div>
          <h4 className="text-slate-900 font-medium mb-1">No photos yet</h4>
          <p className="text-slate-500 text-sm">Upload front of house, damage, or document photos.</p>
        </div>
      ) : filteredPhotos.length === 0 ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
          <div className="text-3xl text-slate-300 mx-auto mb-3">🔍</div>
          <h4 className="text-slate-900 font-medium mb-1">No photos match this filter</h4>
          <p className="text-slate-500 text-sm">Try selecting a different opening or "All Photos".</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filteredPhotos.map(photo => (
            <div 
              key={photo.id} 
              className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 cursor-pointer bg-slate-100"
              onClick={() => setSelectedPhoto(photo)}
            >
              <img 
                src={photo.photoUrl} 
                alt="Project" 
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-start justify-end p-2 opacity-0 group-hover:opacity-100">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(photo.id); }}
                  className="bg-white/90 hover:bg-red-50 text-red-600 p-1.5 rounded-md backdrop-blur-sm transition-colors shadow-sm text-sm"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm" onClick={() => setSelectedPhoto(null)}>
          <button 
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors text-xl font-bold leading-none"
            onClick={() => setSelectedPhoto(null)}
          >
            ✕
          </button>
          
          <img 
            src={selectedPhoto.photoUrl} 
            alt="Enlarged view" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

