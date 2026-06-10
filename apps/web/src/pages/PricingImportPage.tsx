import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { toast } from '../components/Toast';

export function PricingImportPage() {
  const [versions, setVersions] = useState<any[]>([]);
  const [imports, setImports] = useState<any[]>([]);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [selectedImport, setSelectedImport] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<'versions' | 'imports'>('versions');

  const loadVersions = () => api.get('/pricing-versions').then(setVersions).catch(console.error);
  const loadImports = () => api.get('/pricing-versions/imports').then(setImports).catch(console.error);

  useEffect(() => { loadVersions(); loadImports(); }, []);

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Create import record
      const imp = await api.post('/pricing-versions/imports', {
        fileName: file.name,
        fileType: file.name.endsWith('.csv') ? 'csv' : 'pdf',
        fileSize: file.size,
        source: 'local',
      });

      // Read CSV and parse
      const text = await file.text();
      const result = await api.post(`/pricing-versions/imports/${imp.id}/parse-csv`, { csvData: text });
      setSelectedImport(imp);
      setImportRows(result.rows || []);
      loadImports();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const convertToVersion = async (importId: string) => {
    const name = prompt('Pricing version name:', `Import ${new Date().toLocaleDateString()}`);
    if (!name) return;
    try {
      const version = await api.post(`/pricing-versions/imports/${importId}/to-version`, { name });
      loadVersions();
      loadImports();
      toast.success(`Created pricing version: ${version.name} with ${version.items?.length} items`);
    } catch (err) {
      console.error('Conversion failed:', err);
    }
  };

  const publishVersion = async (id: string) => {
    if (!confirm('Publish this pricing version? It will become the active version.')) return;
    try {
      await api.post(`/pricing-versions/${id}/publish`, { userId: 'admin' });
      loadVersions();
    } catch (err) {
      console.error('Publish failed:', err);
    }
  };

  const fmt = (n: number) => `$${(n || 0).toFixed(2)}`;

  return (
    <div className="fade-in">
      <h1 style={{ marginBottom: '1.5rem' }}>📦 Pricing Import & Versions</h1>

      {/* Tabs */}
      <div className="status-filters" style={{ marginBottom: '1.5rem' }}>
        <button className={`status-btn ${tab === 'versions' ? 'active' : ''}`} onClick={() => setTab('versions')}>📋 Versions</button>
        <button className={`status-btn ${tab === 'imports' ? 'active' : ''}`} onClick={() => setTab('imports')}>📥 Imports</button>
      </div>

      {tab === 'versions' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>Pricing Versions</h2>
          </div>

          {versions.map(v => (
            <div key={v.id} className="card" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3>{v.name}</h3>
                  <span className={`badge ${v.status === 'published' ? 'badge-success' : v.status === 'archived' ? 'badge-danger' : 'badge-progress'}`}>
                    {v.status}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                    {v._count?.items || 0} items · {new Date(v.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {v.status === 'draft' && (
                    <button className="btn btn-success btn-sm" onClick={() => publishVersion(v.id)}>🚀 Publish</button>
                  )}
                  {v.status === 'published' && (
                    <span style={{ color: 'var(--success)', fontWeight: 700 }}>✅ ACTIVE</span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {versions.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No pricing versions yet. Import a pricing file to get started.
            </div>
          )}
        </div>
      )}

      {tab === 'imports' && (
        <div>
          {/* Upload */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '0.75rem' }}>Import Pricing File</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>
              Upload a CSV file with pricing data. Expected columns: category, product, series, label, min_ui, max_ui, price, price_type
            </p>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                📁 {uploading ? 'Uploading...' : 'Upload CSV'}
                <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCSVUpload} disabled={uploading} />
              </label>
            </div>
          </div>

          {/* Import list */}
          {imports.map(imp => (
            <div key={imp.id} className="card" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3>{imp.fileName}</h3>
                  <span className={`badge ${imp.status === 'parsed' ? 'badge-progress' : imp.status === 'applied' ? 'badge-success' : 'badge-danger'}`}>
                    {imp.status}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                    {imp._count?.rows || 0} rows · {imp.source} · {new Date(imp.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary btn-sm" onClick={async () => {
                    const full = await api.get(`/pricing-versions/imports/${imp.id}`);
                    setSelectedImport(full);
                    setImportRows(full.rows || []);
                  }}>👁 Review</button>
                  {imp.status === 'parsed' && (
                    <button className="btn btn-success btn-sm" onClick={() => convertToVersion(imp.id)}>✅ Create Version</button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Review modal */}
          {selectedImport && importRows.length > 0 && (
            <div className="card" style={{ marginTop: '1rem' }}>
              <h3 style={{ marginBottom: '0.75rem' }}>Review: {selectedImport.fileName}</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr><th>#</th><th>Category</th><th>Product</th><th>Series</th><th>Label</th><th>UI Min</th><th>UI Max</th><th>Price</th><th>Type</th><th>Conf</th><th>⚠</th></tr>
                  </thead>
                  <tbody>
                    {importRows.map((r: any) => (
                      <tr key={r.id} style={{ opacity: r.status === 'rejected' ? 0.4 : 1 }}>
                        <td>{r.rowNumber}</td>
                        <td>{r.category || '—'}</td>
                        <td>{r.productCategory || '—'}</td>
                        <td>{r.seriesModel || '—'}</td>
                        <td>{r.label || '—'}</td>
                        <td>{r.unitedInchesMin ?? '—'}</td>
                        <td>{r.unitedInchesMax ?? '—'}</td>
                        <td>{r.price != null ? fmt(r.price) : '—'}</td>
                        <td>{r.priceType || '—'}</td>
                        <td><span style={{ color: r.confidence >= 0.7 ? 'var(--success)' : 'var(--warning)', fontWeight: 700 }}>{Math.round((r.confidence || 0) * 100)}%</span></td>
                        <td>{r.needsVerification && <span className="needs-verify">⚠ VERIFY</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="btn btn-secondary" style={{ marginTop: '0.75rem' }} onClick={() => { setSelectedImport(null); setImportRows([]); }}>Close Review</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

