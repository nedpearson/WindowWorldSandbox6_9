import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { toast } from './Toast';
import { importContract } from '../utils/importContract';

interface WorkbookManagementPanelProps {
  appointment: any;
  onRefresh: () => void;
}

interface Diff {
  openingId: string;
  openingNumber: number;
  windowNumber: string;
  field: string;
  label: string;
  appValue: any;
  excelValue: any;
  parsedOpening?: any; // reference to parsed opening if new
}

const COMPARE_FIELDS = [
  { field: 'quantity', label: 'Quantity' },
  { field: 'width', label: 'Width' },
  { field: 'height', label: 'Height' },
  { field: 'exteriorColor', label: 'Exterior Color' },
  { field: 'interiorColor', label: 'Interior Color' },
  { field: 'glassPackage', label: 'Glass Package' },
  { field: 'gridPattern', label: 'Grid Pattern' },
  { field: 'gridProfile', label: 'Grid Profile' },
  { field: 'screenOption', label: 'Screen Option' },
  { field: 'temperedGlass', label: 'Tempered Glass' },
  { field: 'obscureGlass', label: 'Obscure Glass' },
  { field: 'exteriorSurface', label: 'Exterior Surface' },
  { field: 'trimType', label: 'Trim Type' },
  { field: 'removalType', label: 'Removal Type' },
  { field: 'installType', label: 'Install Type' },
  { field: 'sillRepair', label: 'Sill Repair' },
  { field: 'legHeight', label: 'Leg Height' },
  { field: 'customRadius', label: 'Custom Radius' },
];

function normalizeVal(val: any): string {
  if (val === null || val === undefined) return '';
  if (val === false) return 'false';
  if (val === true) return 'true';
  return String(val).trim().toLowerCase();
}

export function WorkbookManagementPanel({ appointment, onRefresh }: WorkbookManagementPanelProps) {
  const [status, setStatus] = useState<string>('loading');
  const [workbookDoc, setWorkbookDoc] = useState<any>(null);
  const [xlsxUrl, setXlsxUrl] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  
  // Reconciliation States
  const [differences, setDifferences] = useState<Diff[]>([]);
  const [parsedOpenings, setParsedOpenings] = useState<any[]>([]);
  const [resolutions, setResolutions] = useState<Record<string, 'accept' | 'keep'>>({});
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const appointmentId = appointment.id;

  const fetchStatus = async () => {
    try {
      const res = await api.getWorkbookStatus(appointmentId);
      setStatus(res.status);
      setWorkbookDoc(res.document);
      setXlsxUrl(res.xlsxSignedUrl);
    } catch (err: any) {
      console.error('Failed to load workbook status:', err);
      toast.error('Could not load workbook status.');
    }
  };

  useEffect(() => {
    if (appointmentId) {
      fetchStatus();
    }
  }, [appointmentId]);

  const handleGenerate = async (isFinal: boolean = false) => {
    setLoadingAction(isFinal ? 'finalize' : 'generate');
    try {
      const res = await api.generateWorkbook(appointmentId, isFinal);
      toast.success(isFinal ? 'Final workbook generated successfully!' : 'Workbook draft generated!');
      await fetchStatus();
      onRefresh();
    } catch (err: any) {
      console.error('Workbook generation failed:', err);
      const msg = err.response?.data?.error || err.message || 'Generation failed.';
      toast.error(msg);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // 1. Parse Excel locally using importContract
      const parsed = await importContract(file, appointment);
      setParsedOpenings(parsed);

      // 2. Find differences between parsed Excel openings and DB openings
      const dbOpenings = (appointment.openings || []).filter((o: any) => !o.deletedAt);
      const diffs: Diff[] = [];
      const dbMap = new Map<string, any>(dbOpenings.map((o: any) => [String(o.windowNumber || o.openingNumber), o]));

      // Check for Excel additions or field updates
      for (const p of parsed) {
        const key = String(p.windowNumber || p.openingNumber);
        const dbOp = dbMap.get(key) as any;

        if (!dbOp) {
          // New opening in Excel
          diffs.push({
            openingId: p.id,
            openingNumber: p.openingNumber,
            windowNumber: key,
            field: 'NEW_OPENING',
            label: 'New Opening',
            appValue: '(Not in App)',
            excelValue: `${p.productCategory || 'Window'} (${p.width || 36}" x ${p.height || 60}")`,
            parsedOpening: p
          });
          continue;
        }

        // Compare individual fields
        for (const f of COMPARE_FIELDS) {
          const dbVal = dbOp[f.field];
          const exVal = p[f.field];

          if (normalizeVal(dbVal) !== normalizeVal(exVal)) {
            diffs.push({
              openingId: dbOp.id,
              openingNumber: dbOp.openingNumber,
              windowNumber: key,
              field: f.field,
              label: f.label,
              appValue: dbVal === null || dbVal === undefined ? '(Empty)' : String(dbVal),
              excelValue: exVal === null || exVal === undefined ? '(Empty)' : String(exVal),
            });
          }
        }
      }

      // Check for Excel deletions
      const parsedKeys = new Set(parsed.map(p => String(p.windowNumber || p.openingNumber)));
      for (const dbOp of dbOpenings) {
        const key = String(dbOp.windowNumber || dbOp.openingNumber);
        if (!parsedKeys.has(key)) {
          diffs.push({
            openingId: dbOp.id,
            openingNumber: dbOp.openingNumber,
            windowNumber: key,
            field: 'DELETED_OPENING',
            label: 'Deleted Opening',
            appValue: `${dbOp.productCategory || 'Window'} (${dbOp.width || 36}" x ${dbOp.height || 60}")`,
            excelValue: '(Removed in Excel)',
          });
        }
      }

      setDifferences(diffs);

      // Initialize resolutions state to default all to 'accept'
      const initialResolutions: Record<string, 'accept' | 'keep'> = {};
      diffs.forEach(d => {
        initialResolutions[`${d.windowNumber}_${d.field}`] = 'accept';
      });
      setResolutions(initialResolutions);

      // If no differences found, we can upload file directly as edited_externally
      if (diffs.length === 0) {
        await uploadToBackend(file);
      } else {
        toast.info(`Found ${diffs.length} differences. Please review the reconciliation table below.`);
      }
    } catch (err: any) {
      console.error('Error parsing uploaded contract:', err);
      toast.error(err.message || 'Failed to parse uploaded Excel workbook.');
    } finally {
      setIsUploading(false);
      // Reset file input value
      e.target.value = '';
    }
  };

  const uploadToBackend = async (file: File) => {
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        await api.uploadWorkbook(appointmentId, file.name, base64);
        toast.success('Edited workbook uploaded successfully!');
        await fetchStatus();
        onRefresh();
      };
    } catch (err: any) {
      toast.error('Failed to upload workbook file to server.');
    }
  };

  const handleResolutionChange = (key: string, type: 'accept' | 'keep') => {
    setResolutions(prev => ({ ...prev, [key]: type }));
  };

  const applyReconciliation = async () => {
    setLoadingAction('reconcile');
    try {
      const dbOpenings = (appointment.openings || []).filter((o: any) => !o.deletedAt);
      const dbMap = new Map<string, any>(dbOpenings.map((o: any) => [String(o.windowNumber || o.openingNumber), o]));
      const finalOpeningsList: any[] = [];

      // Step 1: Process parsed Excel openings
      for (const p of parsedOpenings) {
        const key = String(p.windowNumber || p.openingNumber);
        const dbOp = dbMap.get(key) as any;

        if (!dbOp) {
          // New opening
          const resType = resolutions[`${key}_NEW_OPENING`];
          if (resType === 'accept') {
            // Include new opening
            // Remove local temp ID so database creates a fresh one
            const { id, ...newOpeningData } = p;
            finalOpeningsList.push(newOpeningData);
          }
        } else {
          // Existing opening. Apply accepted changes.
          const updatedOpening = { ...dbOp } as any;
          let hasFieldChanges = false;

          const isOutside = dbOp.actualMeasurementBasis === 'outside' || dbOp.measurementBasis === 'outside';
          const needsCushion = dbOp.actualMeasurementBasis === 'Opening' || dbOp.measurementBasis === 'Opening' || isOutside;
          const deduction = dbOp.cutbackAmount || 0.375;

          for (const f of COMPARE_FIELDS) {
            const resKey = `${key}_${f.field}`;
            if (resKey in resolutions && resolutions[resKey] === 'accept') {
              updatedOpening[f.field] = p[f.field];
              hasFieldChanges = true;

              // Keep raw measurements in sync with Net Order changes
              if (f.field === 'width') {
                updatedOpening.rawWidth = Number(p.width) + (needsCushion ? deduction : 0);
              } else if (f.field === 'height') {
                updatedOpening.rawHeight = Number(p.height) + (needsCushion ? deduction : 0);
              }
            }
          }

          finalOpeningsList.push(updatedOpening);
          dbMap.delete(key);
        }
      }

      // Step 2: Handle remaining DB openings (which were not in Excel)
      for (const [key, dbOp] of dbMap.entries()) {
        const resType = resolutions[`${key}_DELETED_OPENING`];
        if (resType === 'keep') {
          // Re-include the opening to keep it
          finalOpeningsList.push(dbOp);
        }
        // If 'accept', we do not add it, which effectively deletes it in the batch sync
      }

      // 3. Batch sync openings back to server
      await api.batchSyncOpenings({
        appointmentId,
        openings: finalOpeningsList
      });

      // 4. Force regenerate the Excel workbook as draft to include the merged changes
      await api.generateWorkbook(appointmentId, false);

      toast.success('Excel changes reconciled and applied successfully!');
      
      // Clear reconciliation state
      setDifferences([]);
      setParsedOpenings([]);
      setResolutions({});
      
      await fetchStatus();
      onRefresh();
    } catch (err: any) {
      console.error('Reconciliation failed:', err);
      toast.error(err.message || 'Failed to apply reconciliation.');
    } finally {
      setLoadingAction(null);
    }
  };

  const getStatusBadgeStyles = (statusVal: string) => {
    switch (statusVal) {
      case 'not_generated':
        return { bg: 'rgba(100,116,139,0.1)', color: '#64748b', text: 'Not Generated' };
      case 'draft_generated':
        return { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', text: 'Draft Workbook' };
      case 'final_generated':
        return { bg: 'rgba(34,197,94,0.1)', color: '#22c55e', text: 'Finalized Workbook' };
      case 'edited_externally':
        return { bg: 'rgba(99,102,241,0.1)', color: '#6366f1', text: 'Edited Externally' };
      case 'stale_needs_regeneration':
        return { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', text: 'Stale (Needs Regeneration)' };
      default:
        return { bg: 'rgba(100,116,139,0.1)', color: '#64748b', text: statusVal };
    }
  };

  const badge = getStatusBadgeStyles(status);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* 📊 Workbook Overview Card */}
      <div className="card" style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '1.5rem',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800 }}>Excel Workbook Lifecycle</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Create, download, and reconcile your main editable job order form.
            </p>
          </div>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: '9999px',
            background: badge.bg,
            color: badge.color,
            border: `1px solid ${badge.color}30`
          }}>
            {badge.text}
          </span>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <button
            className="btn btn-primary"
            onClick={() => handleGenerate(false)}
            disabled={loadingAction !== null || isUploading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {loadingAction === 'generate' ? 'Generating...' : '🛠️ Generate Draft'}
          </button>
          
          <button
            className="btn btn-success"
            onClick={() => handleGenerate(true)}
            disabled={loadingAction !== null || isUploading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {loadingAction === 'finalize' ? 'Finalizing...' : '🔒 Mark Final (DocuSign Ready)'}
          </button>

          {xlsxUrl && (
            <a
              href={xlsxUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
            >
              📥 Download Excel (.xlsx)
            </a>
          )}
        </div>

        {/* Upload Edited Excel File */}
        {xlsxUrl && (
          <div style={{
            marginTop: '1.5rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border)'
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9375rem', fontWeight: 700 }}>Upload Edited Workbook</h4>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Make corrections directly in Excel, then upload the edited file back to reconcile changes with the app.
            </p>
            <div style={{ position: 'relative' }}>
              <input
                type="file"
                accept=".xlsx"
                id="workbook-file-upload"
                onChange={handleFileUpload}
                disabled={loadingAction !== null || isUploading}
                style={{ display: 'none' }}
              />
              <label
                htmlFor="workbook-file-upload"
                className="btn btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: isUploading || loadingAction !== null ? 'not-allowed' : 'pointer',
                  opacity: isUploading || loadingAction !== null ? 0.6 : 1
                }}
              >
                {isUploading ? 'Parsing File...' : '📤 Choose Edited File (.xlsx)'}
              </label>
            </div>
          </div>
        )}
      </div>

      {/* ⚠️ Outstanding Reconciliation Banner */}
      {status === 'edited_externally' && differences.length === 0 && (
        <div style={{
          padding: '1rem 1.25rem',
          borderRadius: '12px',
          background: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.2)',
          color: '#818cf8',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <span>ℹ️</span>
          <span>
            An edited Excel workbook has been uploaded. All values matched exactly with the application state.
          </span>
        </div>
      )}

      {/* 🤝 Reconciliation Interactive Board */}
      {differences.length > 0 && (
        <div className="card" style={{
          background: 'var(--bg-secondary)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: '16px',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.2)',
            marginBottom: '1.5rem'
          }}>
            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, color: '#f59e0b', fontSize: '0.875rem', fontWeight: 800 }}>Reconciliation Pending</h4>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                The uploaded Excel workbook contains changes. Review each mismatch and decide what to keep.
              </p>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>Opening #</th>
                  <th style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>Field</th>
                  <th style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>App Value</th>
                  <th style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>Excel Value</th>
                  <th style={{ padding: '8px 12px', color: 'var(--text-muted)', textAlign: 'right' }}>Resolution</th>
                </tr>
              </thead>
              <tbody>
                {differences.map(d => {
                  const resKey = `${d.windowNumber}_${d.field}`;
                  const currentRes = resolutions[resKey] || 'accept';

                  return (
                    <tr key={resKey} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }}>
                      <td style={{ padding: '12px', fontWeight: 700 }}>#{d.windowNumber}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: d.field.startsWith('NEW') ? 'rgba(34,197,94,0.1)' : d.field.startsWith('DEL') ? 'rgba(239,68,68,0.1)' : 'var(--border)',
                          color: d.field.startsWith('NEW') ? '#22c55e' : d.field.startsWith('DEL') ? '#ef4444' : 'var(--text-primary)',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          {d.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{d.appValue}</td>
                      <td style={{ padding: '12px', color: '#6366f1', fontWeight: 600 }}>{d.excelValue}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '4px', background: 'rgba(255,255,255,0.02)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                          <button
                            type="button"
                            onClick={() => handleResolutionChange(resKey, 'accept')}
                            style={{
                              padding: '4px 8px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer',
                              background: currentRes === 'accept' ? 'rgba(99,102,241,0.12)' : 'transparent',
                              color: currentRes === 'accept' ? '#818cf8' : 'var(--text-muted)',
                              transition: 'all 0.15s'
                            }}
                          >
                            Accept Excel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResolutionChange(resKey, 'keep')}
                            style={{
                              padding: '4px 8px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer',
                              background: currentRes === 'keep' ? 'rgba(255,255,255,0.08)' : 'transparent',
                              color: currentRes === 'keep' ? 'var(--text-primary)' : 'var(--text-muted)',
                              transition: 'all 0.15s'
                            }}
                          >
                            Keep App
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setDifferences([]);
                setParsedOpenings([]);
                setResolutions({});
                toast.info('Reconciliation changes discarded.');
              }}
              disabled={loadingAction !== null}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={applyReconciliation}
              disabled={loadingAction !== null}
            >
              {loadingAction === 'reconcile' ? 'Applying...' : '✔️ Confirm & Apply Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
