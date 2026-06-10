import { useState, useRef } from 'react';
import { api } from '../utils/api';
import { toast } from './Toast';
import { logError } from '../utils/productionGuards';
import { generateContractPDF } from '../utils/pdfGenerator';

interface ReconciliationIssue {
  severity: 'BLOCKER' | 'WARNING' | 'INFO';
  category: string;
  message: string;
  fixAction?: string;
}

function runReconciliation(appt: any): ReconciliationIssue[] {
  const issues: ReconciliationIssue[] = [];
  const openings = appt.openings || [];
  const c = appt.customer;

  // Customer data checks
  if (!c.firstName || !c.lastName) issues.push({ severity: 'BLOCKER', category: 'Customer', message: 'Customer name is missing', fixAction: 'Go to Customer step' });
  if (!c.phone) issues.push({ severity: 'BLOCKER', category: 'Customer', message: 'Phone number is required', fixAction: 'Go to Customer step' });
  if (!appt.jobAddress) issues.push({ severity: 'BLOCKER', category: 'Job', message: 'Job address is missing', fixAction: 'Go to Job Info step' });

  // Opening checks
  if (openings.length === 0) issues.push({ severity: 'BLOCKER', category: 'Openings', message: 'No openings entered — Order Form will be empty' });
  if (openings.length > 24) issues.push({ severity: 'WARNING', category: 'Openings', message: `${openings.length} openings exceeds 24-slot template — extra openings will overflow to notes` });

  for (const o of openings) {
    if (!o.width || !o.height) {
      issues.push({ severity: 'BLOCKER', category: 'Measurements', message: `Opening #${o.openingNumber}: Width or Height is missing` });
    }
    if (!o.productCategory) {
      issues.push({ severity: 'WARNING', category: 'Product', message: `Opening #${o.openingNumber}: No product type selected` });
    }
    // Tempered glass review
    if (o.temperedGlass && !o.temperedReviewed) {
      issues.push({ severity: 'WARNING', category: 'Tempered', message: `Opening #${o.openingNumber}: Tempered glass needs review confirmation` });
    }
    // Oriel top sash
    if (o.isOriel && !o.orielTopSash) {
      issues.push({ severity: 'WARNING', category: 'Oriel', message: `Opening #${o.openingNumber}: Oriel window — top sash measurement required` });
    }
    // Picture window screen check
    if (o.productCategory === 'picture' && o.screenOption && o.screenOption !== 'None') {
      issues.push({ severity: 'INFO', category: 'Screen', message: `Opening #${o.openingNumber}: Picture window — screen is typically N/A` });
    }
    // Photo check
    const photos = appt.measurePhotos?.filter((p: any) => p.openingId === o.id) || [];
    if (photos.length === 0) {
      issues.push({ severity: 'BLOCKER', category: 'Photos', message: `Opening #${o.openingNumber}: Missing required measurement photo` });
    }
  }

  // Pricing checks
  const computedTotal = openings.reduce((s: number, o: any) => s + (o.totalPrice || 0), 0);
  if (computedTotal > 0 && appt.totalAmount && Math.abs(computedTotal - appt.totalAmount) > 1) {
    issues.push({ severity: 'WARNING', category: 'Pricing', message: `Opening total ($${computedTotal.toFixed(2)}) differs from contract total ($${(appt.totalAmount || 0).toFixed(2)})` });
  }

  // Deposit/balance check
  if (appt.totalAmount > 0 && appt.depositAmount > appt.totalAmount) {
    issues.push({ severity: 'BLOCKER', category: 'Payment', message: 'Deposit exceeds total amount' });
  }
  if (appt.totalAmount > 0 && !appt.paymentMethod) {
    issues.push({ severity: 'BLOCKER', category: 'Payment', message: 'Missing payment terms' });
  }

  // Production Handoff checks
  if (!appt.signatures || appt.signatures.length === 0) {
    issues.push({ severity: 'BLOCKER', category: 'Signatures', message: 'Missing customer signature' });
  }
  if (!appt.installerNotes) {
    issues.push({ severity: 'WARNING', category: 'Production', message: 'Production handoff missing install notes' });
  }

  return issues;
}

export function ContractExport({ appointment }: { appointment: any }) {
  const [exporting, setExporting] = useState<'excel'|'pdf'|'csv'|'json'|'import'|null>(null);
  const [showRecon, setShowRecon] = useState(false);
  const [ignoreBlockers, setIgnoreBlockers] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
  const c = appointment.customer;
  const openings = appointment.openings || [];
  const issues = runReconciliation(appointment);
  const blockers = issues.filter(i => i.severity === 'BLOCKER');
  const warnings = issues.filter(i => i.severity === 'WARNING');
  const effectiveBlockers: any[] = []; // Always allow clicking export cards

  // 📝 Excel Workbook Export (BTR Template) 📝
  const exportExcel = async () => {
    setExporting('excel');
    try {
      const { getOfflineDb } = await import('../lib/offlineDb');
      const db = getOfflineDb();
      const combinedQuotes = await db.combined_quotes.where('appointmentId').equals(appointment.id).toArray();
      const quoteGroups = await db.quote_groups.where('appointmentId').equals(appointment.id).toArray();

      const {
        resolveWorkbookDefaults,
        resolveWindowWorldModel,
        abbreviateWindowWorldColor,
        abbreviateType,
      } = await import('../utils/exportContract');

      const getFilteredOpenings = async (sourceType?: string, sourceId?: string) => {
        let filtered = openings;
        if (sourceType === 'quote_group' && sourceId) {
          const groupOpenings = await db.quote_group_openings.where('quoteGroupId').equals(sourceId).toArray();
          const selectedIds = groupOpenings.map(go => go.openingId);
          filtered = openings.filter((o: any) => selectedIds.includes(o.id));
        } else if (sourceType === 'combined_quote' && sourceId) {
          const comboGroups = await db.combined_quote_groups.where('combinedQuoteId').equals(sourceId).toArray();
          const selectedIds = new Set<string>();
          for (const cg of comboGroups) {
            const groupOpenings = await db.quote_group_openings.where('quoteGroupId').equals(cg.quoteGroupId).toArray();
            for (const go of groupOpenings) {
              selectedIds.add(go.openingId);
            }
          }
          filtered = openings.filter((o: any) => selectedIds.has(o.id));
        }
        return filtered;
      };

      const mapApptToExportData = (appt: any, filteredOpenings: any[]) => {
        return {
          customer: appt.customer || {},
          openings: filteredOpenings.map((rawO: any) => {
            const o = resolveWorkbookDefaults(rawO);
            const modelCode = resolveWindowWorldModel(o);
            return {
              qty: o.quantity ?? 1,
              model: modelCode,
              vinylColor: abbreviateWindowWorldColor(o.exteriorColor) || '',
              intColor: abbreviateWindowWorldColor(o.interiorColor) || '',
              extColor: abbreviateWindowWorldColor(o.exteriorColor) || '',
              width: o.width || undefined,
              height: o.height || undefined,
              legHeight: o.legHeight || undefined,
              customRadius: o.customRadius || undefined,
              windowNumber: o.openingNumber,
              hinge: o.hinge || undefined,
              glassOption: (o.glassPackage || '').toLowerCase().includes('solar') || (o.glassPackage || '').toLowerCase().includes('low') ? 'LEE' : (o.glassPackage || undefined),
              glassPackage: o.glassPackage || undefined,
              foamEnhanced: o.foamEnhanced ? 'FE' : undefined,
              gridStyle: o.gridStyle || undefined,
              gridPattern: o.gridPattern || undefined,
              temperedFull: o.temperedGlass === 'full' ? 'FULL' : o.temperedGlass === 'half' ? 'BSO' : undefined,
              obscureFull: o.obscureGlass === 'full' ? 'FULL' : o.obscureGlass === 'half' ? 'BSO' : undefined,
              fullScreen: (o.screenOption === 'Full' || o.screenOption === 'Full Screen') ? 'Y' : undefined,
              nailFinNoJ: o.nailFin && !o.exteriorType?.toLowerCase().includes('j') ? 'X' : undefined,
              nailFinWithJ: o.nailFin && o.exteriorType?.toLowerCase().includes('j') ? 'X' : undefined,
              orielDim: (o.oriel || o.productCategory === 'oriel' || String(o.productModel || '').toLowerCase().includes('oriel')) ? (o.orielUpperSashHeight ? String(o.orielUpperSashHeight) : undefined) : undefined,
              headerFlash: (o.exteriorSurface === 'vinyl_siding' || o.exteriorSurface === 'wood_siding' || o.exteriorType === 'siding') ? 'Y' : undefined,
              typeExterior: abbreviateType(o.exteriorSurface || o.exteriorType, 'exterior') || undefined,
              typeTrim: abbreviateType(o.trimType, 'trim') || undefined,
              typeRemoved: abbreviateType(o.removalType, 'remove') || undefined,
              typeInstall: abbreviateType(o.installType, 'install') || undefined,
              sillRepair: o.sillRepair ? 'X' : undefined,
              roomLocation: o.roomLocation || undefined,
              notes: o.customerNotes || undefined,
            };
          }),
          pricing: {
            totalListPrice: appt.subtotal,
            totalAmount: appt.totalAmount,
            depositAmount: appt.depositAmount,
            balanceDue: appt.balanceDue,
            amtFinanced: appt.financingAmount,
            customerId: appt.customer?.customerId
          },
          notes: appt.notes,
          poNumber: appt.poNumber,
          orderDate: appt.appointmentDate,
          completeJob: appt.completeJob ? 'YES' : 'NO',
          estimatorName: appt.user?.name || undefined,
          estimatorEmail: (() => {
            const email = appt.user?.email || 'npearson@winworldinfo.com';
            if (email === 'nedpearson@gmail.com' || email === 'gpearson@winworldinfo.com' || email === 'npearson@winworldinfo.com') {
              return 'npearson@winworldinfo.com';
            }
            return email;
          })(),
          estimatorEmpNum: '', // Always leave employee number blank as requested
        };
      };

      // 1. Desktop Electron Offline/Local Generation
      if (typeof window !== 'undefined' && (window as any).electronAPI?.generateExcelLocally) {
        if (combinedQuotes.length > 0) {
          for (const combo of combinedQuotes) {
            const filtered = await getFilteredOpenings('combined_quote', combo.id);
            const exportData = mapApptToExportData(appointment, filtered);
            const res = await (window as any).electronAPI.generateExcelLocally(exportData);
            if (!res.success) throw new Error(res.error || 'Desktop excel generation failed');
          }
          toast.success(`Generated ${combinedQuotes.length} combined quote contracts locally!`);
        } else if (quoteGroups.length > 0) {
          for (const group of quoteGroups) {
            const filtered = await getFilteredOpenings('quote_group', group.id);
            const exportData = mapApptToExportData(appointment, filtered);
            const res = await (window as any).electronAPI.generateExcelLocally(exportData);
            if (!res.success) throw new Error(res.error || 'Desktop excel generation failed');
          }
          toast.success(`Generated ${quoteGroups.length} quote group contracts locally!`);
        } else {
          const exportData = mapApptToExportData(appointment, openings);
          const res = await (window as any).electronAPI.generateExcelLocally(exportData);
          if (!res.success) throw new Error(res.error || 'Desktop excel generation failed');
          toast.success('Contract generated locally!');
        }
        return;
      }

      // 2. PWA Browser Offline Fallback
      if (!navigator.onLine) {
        try {
          const { exportContract } = await import('../utils/exportContract');
          if (combinedQuotes.length > 0) {
            for (const combo of combinedQuotes) {
              const filtered = await getFilteredOpenings('combined_quote', combo.id);
              const filteredAppt = { ...appointment, openings: filtered };
              await exportContract(filteredAppt, null, null);
            }
            toast.success(`Generated ${combinedQuotes.length} combined quote contracts offline!`);
          } else if (quoteGroups.length > 0) {
            for (const group of quoteGroups) {
              const filtered = await getFilteredOpenings('quote_group', group.id);
              const filteredAppt = { ...appointment, openings: filtered };
              await exportContract(filteredAppt, null, null);
            }
            toast.success(`Generated ${quoteGroups.length} quote group contracts offline!`);
          } else {
            await exportContract(appointment, null, null);
            toast.success('Contract generated offline!');
          }
        } catch (err: any) {
          console.warn('Client-side offline export failed, queueing document generation item', err);
          toast.info('Workbook generation requires internet in this version. Your job data is saved locally and will generate when you reconnect.');
          
          const { useAuthStore } = await import('../store');
          const { getOrCreateDeviceId } = await import('../lib/offlineDb');
          const user = useAuthStore.getState().user;
          const companyId = user?.companyId ?? 'unknown';
          const userId = user?.id ?? 'unknown';
          const deviceId = getOrCreateDeviceId();

          await db.sync_outbox.add({
            companyId,
            userId,
            deviceId,
            platform: 'web',
            entityType: 'document_generation',
            entityLocalId: `doc_gen_${Date.now()}`,
            operation: 'create',
            payloadJson: JSON.stringify({
              appointmentId: appointment.id,
              documentType: 'order_form',
            }),
            idempotencyKey: `doc_gen_${appointment.id}`,
            status: 'pending',
            retryCount: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
        return;
      }

      // 3. Online Server-side Generation
      const downloadFile = (blob: Blob, suffix: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        a.download = `${c.lastName}_${c.firstName}_Contract${suffix}_${ts}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      };

      if (combinedQuotes.length > 0) {
        for (const combo of combinedQuotes) {
          const blob = await api.exportExcel(appointment.id, { sourceType: 'combined_quote', sourceId: combo.id });
          downloadFile(blob, `_${combo.name.replace(/[^a-z0-9]/gi, '_')}`);
        }
        toast.success(`Downloaded ${combinedQuotes.length} combined quote contracts!`);
      } else if (quoteGroups.length > 0) {
        for (const group of quoteGroups) {
          const blob = await api.exportExcel(appointment.id, { sourceType: 'quote_group', sourceId: group.id });
          downloadFile(blob, `_${group.name.replace(/[^a-z0-9]/gi, '_')}`);
        }
        toast.success(`Downloaded ${quoteGroups.length} quote group contracts!`);
      } else {
        const blob = await api.exportExcel(appointment.id);
        downloadFile(blob, '');
        toast.success('Contract downloaded!');
      }
    } catch (err: any) {
      logError({ level: 'error', category: 'contract', message: `Export failed: ${err.message}`, technicalDetail: err?.stack || err?.message });
      toast.error(`Export failed: ${err.message}`);
    } finally {
      setExporting(null);
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExporting('import');
    try {
      const { importContract } = await import('../utils/importContract');
      const updatedOpenings = await importContract(file, appointment);
      
      const { api } = await import('../utils/api');
      await api.batchUpdateOpenings({ appointmentId: appointment.id, updates: updatedOpenings });

      toast.success('Excel imported and openings updated!');
      
      // Save the document to the appointment
      try {
        const stored = JSON.parse(localStorage.getItem(`wwa_docs_${appointment.id}`) || '[]');
        stored.push({
          id: `doc_${Date.now()}`,
          name: file.name,
          type: 'import',
          capturedAt: Date.now(),
          size: file.size
        });
        localStorage.setItem(`wwa_docs_${appointment.id}`, JSON.stringify(stored));
      } catch (err) {
        console.debug('Failed to save document to local storage', err);
      }

      // Force a reload so the parent component fetches new openings
      window.location.reload();
    } catch (err: any) {
      logError({ level: 'error', category: 'contract', message: `Import failed: ${err.message}`, technicalDetail: err?.stack || err?.message });
      toast.error(`Import failed: ${err.message}`);
    } finally {
      setExporting(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const generatePDF = async () => {
    setExporting('pdf');
    try {
      await generateContractPDF(appointment);
    } finally {
      setExporting(null);
    }
  };

  const exportJSON = async () => {
    setExporting('json');
    try {
      const data = await api.exportJSON(appointment.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${c.lastName}_quote.json`; a.click();
    } finally { setExporting(null); }
  };

  const exportCSV = async () => {
    setExporting('csv');
    try {
      const csv = await api.exportCSV(appointment.id);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${c.lastName}_openings.csv`; a.click();
    } finally { setExporting(null); }
  };

  const sevColor = (s: string) => s === 'BLOCKER' ? '#ef4444' : s === 'WARNING' ? '#f59e0b' : '#60a5fa';

  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>📄 Contract & Export</h2>

      {/* ── Reconci      <div className="card" style={{
        marginBottom: '1rem',
        borderColor: blockers.length > 0 ? 'rgba(239,68,68,0.3)' : warnings.length > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.3)',
        background: blockers.length > 0 ? 'rgba(239,68,68,0.05)' : warnings.length > 0 ? 'rgba(245,158,11,0.05)' : 'rgba(34,197,94,0.05)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setShowRecon(!showRecon)}>
          <div>
            <h3 style={{ fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {blockers.length > 0 ? '🛑' : warnings.length > 0 ? '⚠️' : '✅'}
              Workbook Reconciliation
              <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-secondary)' }}>
                {blockers.length > 0 ? `${blockers.length} blocker${blockers.length > 1 ? 's' : ''}` : warnings.length > 0 ? `${warnings.length} warning${warnings.length > 1 ? 's' : ''}` : 'All checks passed'}
              </span>
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {blockers.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setIgnoreBlockers(!ignoreBlockers); }}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '4px', background: ignoreBlockers ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)', border: 'none', color: ignoreBlockers ? '#22c55e' : '#ef4444', cursor: 'pointer' }}
              >
                {ignoreBlockers ? 'Blockers Ignored ✅' : 'Ignore Blockers'}
              </button>
            )}
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{showRecon ? '▲' : '▼'}</span>
          </div>
        </div>
        {showRecon && issues.length > 0 && (
          <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {issues.map((issue, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', padding: '0.375rem 0.5rem', background: `${sevColor(issue.severity)}08`, borderRadius: 6 }}>
                <span style={{ color: sevColor(issue.severity), fontWeight: 700, fontSize: '0.75rem', minWidth: 70 }}>
                  {issue.severity === 'BLOCKER' ? '🛑 BLOCK' : issue.severity === 'WARNING' ? '⚠️ WARN' : 'ℹ️ INFO'}
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.6875rem', minWidth: 70 }}>{issue.category}</span>
                <span>{issue.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <input 
        ref={fileRef} 
        type="file" 
        accept=".xlsx" 
        style={{ display: 'none' }} 
        onChange={handleFileImport} 
      />

      {/* ── Export Cards ── */}
      <div className="card-grid">
        {/* PRIMARY: Excel Workbook Export */}
        <div className="card" style={{
          textAlign: 'center', padding: '2rem', cursor: effectiveBlockers.length > 0 ? 'not-allowed' : 'pointer',
          opacity: effectiveBlockers.length > 0 ? 0.5 : 1,
          background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(59,130,246,0.08))',
          borderColor: 'rgba(34,197,94,0.3)',
        }} onClick={effectiveBlockers.length > 0 ? undefined : exportExcel}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📊</div>
          <h3 style={{ color: '#22c55e' }}>{exporting === 'excel' ? 'Generating...' : 'Download Excel Contract'}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.375rem' }}>
            Exact Contract + Order Form — filled from appointment data
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.6875rem', marginTop: '0.375rem' }}>
            .xlsx • Preserves original template layout
          </p>
        </div>

        <div className="card" style={{ 
          textAlign: 'center', padding: '2rem', 
          cursor: effectiveBlockers.length > 0 ? 'not-allowed' : 'pointer',
          opacity: effectiveBlockers.length > 0 ? 0.5 : 1,
        }} onClick={effectiveBlockers.length > 0 ? undefined : generatePDF}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📄</div>
          <h3>{exporting === 'pdf' ? 'Generating...' : 'Download PDF Contract'}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.375rem' }}>
            Printable contract packet
          </p>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '2rem', cursor: 'pointer' }} onClick={exportCSV}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📊</div>
          <h3>{exporting === 'csv' ? 'Exporting...' : 'Export CSV'}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.375rem' }}>
            Opening schedule spreadsheet
          </p>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '2rem', cursor: 'pointer' }} onClick={exportJSON}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>💾</div>
          <h3>{exporting === 'json' ? 'Exporting...' : 'Export JSON'}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.375rem' }}>
            Full quote data backup
          </p>
        </div>

        <div className="card" style={{ 
          textAlign: 'center', padding: '2rem', cursor: 'pointer',
          background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(234,88,12,0.08))',
          borderColor: 'rgba(245,158,11,0.3)',
        }} onClick={() => fileRef.current?.click()}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📥</div>
          <h3 style={{ color: '#ea580c' }}>{exporting === 'import' ? 'Importing...' : 'Import Excel'}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.375rem' }}>
            Sync local changes back to Sketch
          </p>
        </div>
      </div>

      {/* Quick preview */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Contract Preview</h3>
        <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }}>
          <p><strong>Customer:</strong> {c.firstName} {c.lastName}</p>
          <p><strong>Address:</strong> {appointment.jobAddress}</p>
          <p><strong>Items:</strong> {openings.length}</p>
          <p><strong>Total:</strong> {fmt(appointment.totalAmount)}</p>
          <p><strong>Deposit:</strong> {fmt(appointment.depositAmount)}</p>
          <p><strong>Balance:</strong> {fmt(appointment.balanceDue)}</p>
        </div>
      </div>
    </div>
  );
}
