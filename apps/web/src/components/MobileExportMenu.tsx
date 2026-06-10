import { useState } from 'react';
import { api } from '../utils/api';

const EXPORT_OPTIONS = [
  { id: 'order_pdf', label: 'Order Form PDF', icon: '📋', description: 'Complete order form with all openings' },
  { id: 'contract_pdf', label: 'Contract PDF', icon: '📝', description: 'Customer contract with signatures' },
  { id: 'packet_pdf', label: 'Appointment Packet', icon: '📦', description: 'Full packet: order + sketch + photos' },
  { id: 'schedule_xlsx', label: 'Opening Schedule', icon: '📊', description: 'Excel spreadsheet of all openings' },
  { id: 'current_pdf', label: 'Current View PDF', icon: '🖨', description: 'Print/save what you see on screen' },
];

export function MobileExportMenu({
  appointmentId,
  appointmentName,
  onClose,
}: {
  appointmentId: string;
  appointmentName: string;
  onClose: () => void;
}) {
  const [exporting, setExporting] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  const doExport = async (exportType: string) => {
    setExporting(exportType);
    setResult(null);
    try {
      const res = await api.post(`/exports/${appointmentId}`, { type: exportType });
      if (res.downloadUrl) {
        // Trigger download on mobile
        const a = document.createElement('a');
        a.href = res.downloadUrl;
        a.download = `${appointmentName}_${exportType}.pdf`;
        a.click();
      }
      setResult({ id: exportType, success: true, message: res.message || 'Export ready!' });
    } catch (err: any) {
      setResult({ id: exportType, success: false, message: err.message || 'Export failed — will retry when online' });
    } finally {
      setExporting(null);
    }
  };

  const sharePdf = async () => {
    if ('share' in navigator) {
      try {
        await (navigator as any).share({
          title: `${appointmentName} — Window World`,
          text: 'Window World appointment documents',
          url: window.location.href,
        });
      } catch (e) { console.debug("[swallowed error]", e); }
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 250, display: 'flex', alignItems: 'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: '100%', background: 'var(--bg-secondary)',
        borderRadius: '20px 20px 0 0', padding: '1.25rem',
        maxHeight: '80dvh', overflowY: 'auto',
        paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>📤 Export & Share</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gap: '0.625rem' }}>
          {EXPORT_OPTIONS.map(opt => (
            <button key={opt.id} onClick={() => doExport(opt.id)} disabled={exporting === opt.id}
              style={{
                width: '100%', padding: '0.875rem 1rem', textAlign: 'left',
                background: result?.id === opt.id && result.success ? 'rgba(34,197,94,0.08)' : 'var(--bg-input)',
                border: `1px solid ${result?.id === opt.id && result.success ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
                borderRadius: 12, cursor: exporting ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                color: 'var(--text-primary)', transition: 'all 0.2s',
              }}>
              <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{opt.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{opt.label}</div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{opt.description}</div>
              </div>
              {exporting === opt.id && <span style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>Exporting…</span>}
              {result?.id === opt.id && result.success && <span style={{ color: 'var(--success)' }}>✓</span>}
              {result?.id === opt.id && !result.success && <span style={{ color: 'var(--danger)', fontSize: '0.6875rem' }}>⚠</span>}
            </button>
          ))}
        </div>

        {/* Share button */}
        {'share' in navigator && (
          <button onClick={sharePdf} style={{
            width: '100%', marginTop: '0.75rem', padding: '0.875rem',
            background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.1))',
            border: '1px solid rgba(59,130,246,0.3)', borderRadius: 12,
            color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          }}>
            📱 Share via Device
          </button>
        )}

        {/* Result message */}
        {result && (
          <div style={{
            marginTop: '0.75rem', padding: '0.625rem 0.875rem', borderRadius: 8,
            background: result.success ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${result.success ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
            fontSize: '0.75rem', color: result.success ? 'var(--success)' : 'var(--danger)',
          }}>
            {result.message}
          </div>
        )}

        {/* Offline note */}
        <div style={{ marginTop: '0.75rem', fontSize: '0.6875rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          📌 If export fails on mobile, open this appointment on desktop to export.
        </div>
      </div>
    </div>
  );
}
