import React, { useState, useEffect } from 'react';
import { useRootCauseShortcut } from '../../hooks/useRootCauseShortcut';
import { analyzeRootCause } from '../../diagnostics/rootCauseDiagnostics';
import { DiagnosticReport, RootCauseSummary } from '../../diagnostics/diagnosticTypes';
import { availableRepairs } from '../../diagnostics/diagnosticRepairs';
import { useAuthStore } from '../../store';
import { getOfflineDb, type OutboxItem } from '../../lib/offlineDb';

// ── Device detection helpers ──────────────────────────────────────────────────

interface DeviceInfo {
  deviceType: string;
  connectionType: string;
  batteryLevel: number | null;
  batteryCharging: boolean | null;
  storageUsed: number | null;
  storageTotal: number | null;
}

function detectDeviceType(): string {
  const ua = navigator.userAgent;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (/iPad/i.test(ua)) return 'iPad';
  if (/iPhone/i.test(ua)) {
    // iPhone 6/7/8 — 375×667 logical viewport
    if (vw <= 375 && vh <= 667) return 'iPhone 6/7/8';
    // iPhone 6/7/8 Plus — 414×736
    if (vw <= 414 && vh <= 736) return 'iPhone 6/7/8 Plus';
    return 'iPhone (modern)';
  }
  if (/Android/i.test(ua) && /Mobile/i.test(ua)) return 'Android Phone';
  if (/Android/i.test(ua)) return 'Android Tablet';
  // Surface Pro: Windows + touch support
  if (/Windows/i.test(ua) && navigator.maxTouchPoints > 1) return 'Surface Pro';
  if (/Macintosh|Mac OS/i.test(ua)) return 'Desktop (Mac)';
  if (/Windows/i.test(ua)) return 'Desktop (Windows)';
  return 'Desktop';
}

async function collectDeviceInfo(): Promise<DeviceInfo> {
  const info: DeviceInfo = {
    deviceType: detectDeviceType(),
    connectionType: 'unknown',
    batteryLevel: null,
    batteryCharging: null,
    storageUsed: null,
    storageTotal: null,
  };

  // Connection type
  try {
    const conn = (navigator as any).connection;
    if (conn?.effectiveType) {
      info.connectionType = conn.effectiveType;
    }
  } catch { /* not available */ }

  // Battery
  try {
    if ('getBattery' in navigator) {
      const battery = await (navigator as any).getBattery();
      info.batteryLevel = Math.round(battery.level * 100);
      info.batteryCharging = battery.charging;
    }
  } catch { /* not available */ }

  // Storage quota
  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      info.storageUsed = est.usage ?? null;
      info.storageTotal = est.quota ?? null;
    }
  } catch { /* not available */ }

  return info;
}

// ── Photo stats helpers ───────────────────────────────────────────────────────

interface PhotoStats {
  total: number;
  queued: number;
  uploaded: number;
  failed: number;
  uploading: number;
  totalSizeBytes: number;
}

async function collectPhotoStats(): Promise<PhotoStats> {
  const stats: PhotoStats = { total: 0, queued: 0, uploaded: 0, failed: 0, uploading: 0, totalSizeBytes: 0 };
  try {
    const db = getOfflineDb();
    const allPhotos = await db.photo_blob_queue.toArray();
    stats.total = allPhotos.length;
    for (const p of allPhotos) {
      if (p.status === 'queued') stats.queued++;
      else if (p.status === 'uploaded') stats.uploaded++;
      else if (p.status === 'failed') stats.failed++;
      else if (p.status === 'uploading') stats.uploading++;
      stats.totalSizeBytes += p.sizeBytes || 0;
    }
  } catch { /* DB not available */ }
  return stats;
}

// ── Sync queue helpers ────────────────────────────────────────────────────────

interface SyncQueueDetail {
  byEntityType: Record<string, number>;
  failedItems: Array<{ entityType: string; entityLocalId: string; lastError?: string; createdAt: number }>;
  oldestPendingAge: number | null; // ms
  totalPending: number;
}

async function collectSyncQueueDetail(): Promise<SyncQueueDetail> {
  const detail: SyncQueueDetail = {
    byEntityType: {},
    failedItems: [],
    oldestPendingAge: null,
    totalPending: 0,
  };
  try {
    const db = getOfflineDb();
    const allItems: OutboxItem[] = await db.sync_outbox.toArray();
    const now = Date.now();
    let oldestPending = Infinity;

    for (const item of allItems) {
      // Count by entity type
      detail.byEntityType[item.entityType] = (detail.byEntityType[item.entityType] || 0) + 1;

      // Track pending items
      if (item.status === 'pending' || item.status === 'dirty' || item.status === 'syncing') {
        detail.totalPending++;
        if (item.createdAt < oldestPending) {
          oldestPending = item.createdAt;
        }
      }

      // Collect failed items (cap at 10 for display)
      if (item.status === 'failed' && detail.failedItems.length < 10) {
        detail.failedItems.push({
          entityType: item.entityType,
          entityLocalId: item.entityLocalId,
          lastError: item.lastError,
          createdAt: item.createdAt,
        });
      }
    }

    detail.oldestPendingAge = oldestPending < Infinity ? now - oldestPending : null;
  } catch { /* DB not available */ }
  return detail;
}

// ── Utility ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatAge(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${(ms / 3_600_000).toFixed(1)}h`;
  return `${(ms / 86_400_000).toFixed(1)}d`;
}

function batteryColor(level: number): string {
  if (level <= 15) return '#f38ba8'; // red — critical
  if (level <= 40) return '#fab387'; // orange — low
  return '#a6e3a1';                  // green — healthy
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RootCausePanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [summary, setSummary] = useState<RootCauseSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [repairLogs, setRepairLogs] = useState<string[]>([]);
  const [workbookDiag, setWorkbookDiag] = useState<any>(null);
  
  // New state for enhanced diagnostics
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [photoStats, setPhotoStats] = useState<PhotoStats | null>(null);
  const [syncDetail, setSyncDetail] = useState<SyncQueueDetail | null>(null);

  const user = useAuthStore((s) => s.user);

  useRootCauseShortcut(() => {
    setIsOpen(prev => !prev);
  }, isOpen);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      analyzeRootCause().then(({ report, summary }) => {
        setReport(report);
        setSummary(summary);
        setLoading(false);
      });
      // Fetch workbook diagnostics
      fetch('/api/diagnostics/workbook', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('wwa_token')}` }
      })
        .then(r => r.json())
        .then(data => setWorkbookDiag(data))
        .catch(() => setWorkbookDiag({ error: 'Failed to load workbook diagnostics' }));

      // Collect device info, photo stats, and sync queue detail on mount
      collectDeviceInfo().then(setDeviceInfo).catch(() => {});
      collectPhotoStats().then(setPhotoStats).catch(() => {});
      collectSyncQueueDetail().then(setSyncDetail).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;
  // Fallback to prevent unauthorized viewing (also prevented in useRootCauseShortcut)
  if (user?.role !== 'admin' && user?.role !== 'super_admin') return null;

  const executeRepair = async (id: string, isUnsafe: boolean, confirmMsg?: string) => {
    if (isUnsafe) {
      const confirmed = window.confirm(confirmMsg || 'This action is unsafe. Are you sure you want to proceed?');
      if (!confirmed) return;
    }

    const repair = availableRepairs.find(r => r.id === id);
    if (!repair) return;

    try {
      const result = await repair.execute();
      setRepairLogs(prev => [...prev, `[${new Date().toISOString()}] ${repair.name}: ${result.message}`]);
    } catch (err: any) {
      setRepairLogs(prev => [...prev, `[${new Date().toISOString()}] ${repair.name} FAILED: ${err.message}`]);
    }
  };

  const copyReport = () => {
    navigator.clipboard.writeText(JSON.stringify({ report, summary }, null, 2));
    alert('Diagnostic report copied to clipboard.');
  };

  const exportDiagnosticBundle = () => {
    const bundle = {
      exportedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      report,
      summary,
      deviceInfo,
      photoStats,
      syncQueueDetail: syncDetail,
      workbookDiagnostics: workbookDiag,
      repairLogs,
    };

    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wwa-diagnostics-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 99999,
      display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div style={{
        width: '90%', maxWidth: '1000px', height: '90%', backgroundColor: '#1e1e2e',
        borderRadius: '8px', display: 'flex', flexDirection: 'column', color: '#cdd6f4',
        fontFamily: 'monospace', overflow: 'hidden', boxShadow: '0 0 20px rgba(0,0,0,0.5)'
      }}>
        {/* Header */}
        <div style={{ padding: '16px', backgroundColor: '#11111b', borderBottom: '1px solid #313244', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, color: '#f38ba8' }}>🛠️ Root Cause Diagnostic Panel (Ctrl+F12)</h2>
          <div>
            <button onClick={exportDiagnosticBundle} style={{ marginRight: '8px', padding: '6px 12px', background: '#f9e2af', color: '#11111b', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>📦 Export Full Diagnostic Bundle</button>
            <button onClick={copyReport} style={{ marginRight: '8px', padding: '6px 12px', background: '#89b4fa', color: '#11111b', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Copy Report</button>
            <button onClick={() => setIsOpen(false)} style={{ padding: '6px 12px', background: '#f38ba8', color: '#11111b', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Close</button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', gap: '20px' }}>
          
          {/* Left Column: Diagnostics */}
          <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {loading ? (
              <div>Collecting diagnostics...</div>
            ) : report ? (
              <>
                <Section title="Root Cause Summary">
                  <div style={{ color: '#f9e2af' }}>Category: {summary?.category}</div>
                  <div>Description: {summary?.description}</div>
                  <div>Confidence: {summary?.confidence}</div>
                </Section>

                {/* Device Detection */}
                <Section title="📱 Device & Environment">
                  {deviceInfo ? (
                    <>
                      <div><strong>Device Type:</strong> {deviceInfo.deviceType}</div>
                      <div><strong>Connection:</strong> <span style={{ color: deviceInfo.connectionType === '4g' ? '#a6e3a1' : deviceInfo.connectionType === '3g' ? '#f9e2af' : deviceInfo.connectionType === '2g' ? '#f38ba8' : '#cdd6f4' }}>{deviceInfo.connectionType}</span></div>
                      <div>
                        <strong>Battery:</strong>{' '}
                        {deviceInfo.batteryLevel !== null ? (
                          <span style={{ color: batteryColor(deviceInfo.batteryLevel) }}>
                            {deviceInfo.batteryLevel}%{deviceInfo.batteryCharging ? ' ⚡ Charging' : ''}
                          </span>
                        ) : (
                          <span style={{ color: '#6c7086' }}>Not available</span>
                        )}
                      </div>
                      <div>
                        <strong>Storage Quota:</strong>{' '}
                        {deviceInfo.storageUsed !== null && deviceInfo.storageTotal !== null ? (
                          <>
                            {formatBytes(deviceInfo.storageUsed)} / {formatBytes(deviceInfo.storageTotal)}
                            <span style={{ color: '#6c7086', marginLeft: '8px' }}>
                              ({((deviceInfo.storageUsed / deviceInfo.storageTotal) * 100).toFixed(1)}% used)
                            </span>
                          </>
                        ) : (
                          <span style={{ color: '#6c7086' }}>Not available</span>
                        )}
                      </div>
                      <div style={{ marginTop: '4px' }}><strong>Viewport:</strong> {window.innerWidth}×{window.innerHeight} @ {window.devicePixelRatio}x</div>
                      <div><strong>Touch Points:</strong> {navigator.maxTouchPoints}</div>
                    </>
                  ) : (
                    <div style={{ color: '#6c7086' }}>Collecting device info...</div>
                  )}
                </Section>

                {/* Photo Storage Stats */}
                <Section title="📸 Photo Storage Stats">
                  {photoStats ? (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                        <div><strong>Total in Queue:</strong></div>
                        <div>{photoStats.total}</div>
                        <div><strong>Pending Upload:</strong></div>
                        <div style={{ color: photoStats.queued > 0 ? '#f9e2af' : '#a6e3a1' }}>{photoStats.queued}</div>
                        <div><strong>Uploading:</strong></div>
                        <div style={{ color: photoStats.uploading > 0 ? '#89b4fa' : '#cdd6f4' }}>{photoStats.uploading}</div>
                        <div><strong>Uploaded:</strong></div>
                        <div style={{ color: '#a6e3a1' }}>{photoStats.uploaded}</div>
                        <div><strong>Failed:</strong></div>
                        <div style={{ color: photoStats.failed > 0 ? '#f38ba8' : '#a6e3a1' }}>{photoStats.failed}</div>
                      </div>
                      <div style={{ marginTop: '8px', borderTop: '1px solid #313244', paddingTop: '8px' }}>
                        <strong>Total Storage Used:</strong> {formatBytes(photoStats.totalSizeBytes)}
                      </div>
                    </>
                  ) : (
                    <div style={{ color: '#6c7086' }}>Loading photo stats...</div>
                  )}
                </Section>

                {/* Sync Queue Detail */}
                <Section title="🔄 Sync Queue Detail">
                  {syncDetail ? (
                    <>
                      <div style={{ marginBottom: '8px' }}>
                        <strong>Total Pending:</strong>{' '}
                        <span style={{ color: syncDetail.totalPending > 0 ? '#f9e2af' : '#a6e3a1' }}>
                          {syncDetail.totalPending} items
                        </span>
                        {syncDetail.oldestPendingAge !== null && (
                          <span style={{ color: '#6c7086', marginLeft: '8px' }}>
                            (oldest: {formatAge(syncDetail.oldestPendingAge)} ago)
                          </span>
                        )}
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <strong>Items by Entity Type:</strong>
                        <div style={{ paddingLeft: '12px', marginTop: '4px', borderLeft: '2px solid #313244', fontSize: '0.85rem' }}>
                          {Object.keys(syncDetail.byEntityType).length > 0 ? (
                            Object.entries(syncDetail.byEntityType).map(([type, count]) => (
                              <div key={type}>{type}: {count}</div>
                            ))
                          ) : (
                            <div style={{ color: '#a6e3a1' }}>Outbox empty</div>
                          )}
                        </div>
                      </div>
                      {syncDetail.failedItems.length > 0 && (
                        <div>
                          <strong style={{ color: '#f38ba8' }}>Failed Items ({syncDetail.failedItems.length}):</strong>
                          <div style={{ paddingLeft: '12px', marginTop: '4px', borderLeft: '2px solid #f38ba8', fontSize: '0.8rem' }}>
                            {syncDetail.failedItems.map((item, i) => (
                              <div key={i} style={{ marginBottom: '6px' }}>
                                <div>{item.entityType} — {item.entityLocalId}</div>
                                {item.lastError && (
                                  <div style={{ color: '#f38ba8', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                                    {item.lastError.slice(0, 120)}{item.lastError.length > 120 ? '…' : ''}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ color: '#6c7086' }}>Loading sync queue...</div>
                  )}
                </Section>

                <Section title="Current Screen & Context">
                  <div>Route: {report.route}</div>
                  <div>App Version: {report.appVersion}</div>
                  <div>User Role: {report.context.role}</div>
                  <div>Offline Mode: {report.context.isOffline ? 'Yes' : 'No'}</div>
                  <div>Viewport: {report.context.viewportWidth}x{report.context.viewportHeight}</div>
                  {report.context.iphone67LayoutWarnings && report.context.iphone67LayoutWarnings.length > 0 && (
                    <div style={{ color: '#f38ba8', fontWeight: 'bold', marginTop: '4px' }}>
                      ⚠️ Layout Warnings: {report.context.iphone67LayoutWarnings.join(', ')}
                    </div>
                  )}
                  <div style={{ marginTop: '8px' }}>
                    <strong>Local Photo Folder:</strong> {report.context.localPhotoFolderPath}
                  </div>
                  <div>
                    <strong>Local Document Folder:</strong> {report.context.localDocumentFolderPath}
                  </div>
                </Section>
                <Section title="Version & Cache Checklist">
                  {report.versionChecklist ? (
                    <>
                      <div><strong>Client Version:</strong> {report.appVersion}</div>
                      <div><strong>Server Version:</strong> {report.versionChecklist.appVersionServer}</div>
                      <div><strong>Theme Version:</strong> {report.versionChecklist.themeVersion}</div>
                      <div><strong>Pricing Rules:</strong> {report.versionChecklist.pricingRulesVersion}</div>
                      <div><strong>Workbook Template:</strong> {report.versionChecklist.workbookTemplateVersion}</div>
                      <div><strong>Service Worker:</strong> {report.versionChecklist.serviceWorkerVersion}</div>
                      <div><strong>Local DB Schema:</strong> v{report.versionChecklist.localDbVersion}</div>
                      <div><strong>Asset Version:</strong> {report.versionChecklist.installedAssetVersion}</div>
                      <div style={{ color: report.versionChecklist.staleCacheDetected ? '#f38ba8' : '#a6e3a1', fontWeight: 'bold' }}>
                        Stale Cache Detected: {report.versionChecklist.staleCacheDetected ? 'Yes (Update Available)' : 'No'}
                      </div>
                      <div style={{ marginTop: '8px' }}>
                        <strong>Active Feature Flags:</strong>
                        <div style={{ paddingLeft: '12px', fontSize: '0.8rem', color: '#a6e3a1' }}>
                          {report.versionChecklist.featureFlagsActive.map(flag => (
                            <div key={flag}>✓ {flag}</div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div>No version checklist collected</div>
                  )}
                </Section>
                <Section title="🌐 Connection Integrity Map">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
                    <div style={{ fontWeight: 'bold' }}>Service / Connection</div>
                    <div style={{ fontWeight: 'bold' }}>Status</div>
                    <div style={{ fontWeight: 'bold' }}>Expected</div>
                    
                    <div>API Backend</div>
                    <div style={{ color: report.versionChecklist ? '#a6e3a1' : '#f38ba8' }}>{report.versionChecklist ? 'Connected' : 'Unreachable'}</div>
                    <div style={{ color: '#6c7086' }}>/api/version</div>

                    <div>Supabase / Postgres</div>
                    <div style={{ color: workbookDiag?.templateExists !== undefined ? '#a6e3a1' : '#f9e2af' }}>{workbookDiag?.templateExists !== undefined ? 'Verified via Backend' : 'Pending...'}</div>
                    <div style={{ color: '#6c7086' }}>Cloud DB</div>

                    <div>Mapbox GL</div>
                    <div style={{ color: report.documentGeneration.mapSnapshotAvailable ? '#a6e3a1' : '#f9e2af' }}>{report.documentGeneration.mapSnapshotAvailable ? 'Token Valid' : 'Unused/Pending'}</div>
                    <div style={{ color: '#6c7086' }}>External Map API</div>

                    <div>Offline Database</div>
                    <div style={{ color: report.localDb.status.includes('Connected') ? '#a6e3a1' : '#f38ba8' }}>{report.localDb.status}</div>
                    <div style={{ color: '#6c7086' }}>IndexedDB</div>

                    <div>Sync Upload Endpoint</div>
                    <div style={{ color: '#a6e3a1' }}>Registered</div>
                    <div style={{ color: '#6c7086' }}>/api/sync/outbox</div>
                  </div>
                </Section>
                <Section title="Workflow State">
                  <pre>{JSON.stringify(report.workflowState, null, 2)}</pre>
                  <div>Sketch Marker Count: {report.windowWorldSpecific.sketchMarkerCount ?? 0}</div>
                  <div>Order Row Count: {report.windowWorldSpecific.orderRowCount ?? 0}</div>
                  <div>Rendered Marker Count: {report.windowWorldSpecific.renderedMarkerCount ?? 0}</div>
                </Section>
                <Section title="Cache & Local DB">
                  <div>DB Status: {report.localDb.status}</div>
                  <div>Dexie Schema Version: {report.localDb.schemaVersion ?? 9}</div>
                  <div>Cached Jobs: {report.localDb.cachedJobsCount ?? 0}</div>
                  <div>Sync Queue Total: {report.localDb.queueSize} items</div>
                  <div>Sync State: {report.localDb.syncStatus}</div>
                  <div style={{ paddingLeft: '12px', marginTop: '4px', borderLeft: '2px solid #313244', fontSize: '0.85rem' }}>
                    <div>Unsynced Openings: {report.localDb.unsyncedOpeningsCount ?? 0}</div>
                    <div>Unsynced Photos: {report.localDb.unsyncedPhotosCount ?? 0}</div>
                    <div>Unsynced Sketches: {report.localDb.unsyncedSketchItemsCount ?? 0}</div>
                    <div>Unsynced Documents: {report.localDb.unsyncedDocumentsCount ?? 0}</div>
                  </div>
                  <div style={{ marginTop: '8px' }}>Cache: {report.cache.status}</div>
                </Section>
                <Section title="Console Errors (Recent)">
                  <pre style={{ color: '#f38ba8', whiteSpace: 'pre-wrap' }}>
                    {report.errors.console.length > 0 ? report.errors.console.join('\n') : 'No recent errors'}
                  </pre>
                </Section>
                <Section title="Workbook & Template Status">
                  {workbookDiag ? (
                    <>
                      <div>Template Path: {workbookDiag.templatePath}</div>
                      <div style={{ color: workbookDiag.templateExists ? '#a6e3a1' : '#f38ba8' }}>
                        Template Exists (Server): {workbookDiag.templateExists ? 'Yes' : 'No'}
                      </div>
                      <div>Template Size (Server): {workbookDiag.size} bytes</div>
                      {workbookDiag.error && <div style={{ color: '#f38ba8' }}>Error: {workbookDiag.error}</div>}
                    </>
                  ) : (
                    <div>Loading workbook status...</div>
                  )}
                  <div style={{ marginTop: '8px' }}>
                    <strong>Client Template Status:</strong> {report.documentGeneration.workbookTemplateAvailable ? 'Ready (Cached)' : 'Missing/Uncached'}
                  </div>
                  <div>
                    <strong>Map Snapshot Available:</strong> {report.documentGeneration.mapSnapshotAvailable ? 'Yes' : 'No'}
                  </div>
                  <div>
                    <strong>Pricing Rules Version:</strong> {report.pricing.pricingRulesVersion || '2026-v1.0'}
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <strong>Email Override Active:</strong> Yes (npearson@winworldinfo.com)
                  </div>
                </Section>
              </>
            ) : null}
          </div>

          {/* Right Column: Fixes & Logs */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Section title="Safe Auto-Fixes">
              {availableRepairs.filter(r => !r.isUnsafe).map(repair => (
                <button 
                  key={repair.id}
                  onClick={() => executeRepair(repair.id, repair.isUnsafe)}
                  style={{ display: 'block', width: '100%', padding: '10px', marginBottom: '8px', background: '#a6e3a1', color: '#11111b', border: 'none', borderRadius: '4px', cursor: 'pointer', textAlign: 'left' }}
                >
                  <strong>{repair.name}</strong>
                  <div style={{ fontSize: '0.8em', opacity: 0.8 }}>{repair.description}</div>
                </button>
              ))}
            </Section>
            <Section title="Unsafe Actions">
              {availableRepairs.filter(r => r.isUnsafe).map(repair => (
                <button 
                  key={repair.id}
                  onClick={() => executeRepair(repair.id, repair.isUnsafe, repair.requiresConfirmationMessage)}
                  style={{ display: 'block', width: '100%', padding: '10px', marginBottom: '8px', background: '#fab387', color: '#11111b', border: 'none', borderRadius: '4px', cursor: 'pointer', textAlign: 'left' }}
                >
                  <strong>{repair.name}</strong>
                  <div style={{ fontSize: '0.8em', opacity: 0.8 }}>{repair.description}</div>
                </button>
              ))}
            </Section>
            <Section title="Repair Log">
              <div style={{ fontSize: '0.9em', color: '#89dceb', whiteSpace: 'pre-wrap' }}>
                {repairLogs.length > 0 ? repairLogs.join('\n') : 'No actions taken yet.'}
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: '#181825', padding: '16px', borderRadius: '8px', border: '1px solid #313244' }}>
      <h3 style={{ marginTop: 0, marginBottom: '12px', borderBottom: '1px solid #313244', paddingBottom: '8px', color: '#89b4fa' }}>
        {title}
      </h3>
      <div style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
        {children}
      </div>
    </div>
  );
}
