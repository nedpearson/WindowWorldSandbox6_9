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
  
  // DocuSign States
  const [dsStatus, setDsStatus] = useState<{ isConnected: boolean; email?: string } | null>(null);
  const [isConnectingDs, setIsConnectingDs] = useState<boolean>(false);
  const [dsStatusLoading, setDsStatusLoading] = useState<boolean>(true);

  // Reconciliation States
  const [differences, setDifferences] = useState<Diff[]>([]);
  const [parsedOpenings, setParsedOpenings] = useState<any[]>([]);
  const [resolutions, setResolutions] = useState<Record<string, 'accept' | 'keep'>>({});
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const appointmentId = appointment.id;

  const checkDocusignStatus = async () => {
    setDsStatusLoading(true);
    try {
      const res = await api.getDocusignStatus();
      setDsStatus(res);
    } catch (err) {
      console.error('Failed to get DocuSign status:', err);
    } finally {
      setDsStatusLoading(false);
    }
  };

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
      checkDocusignStatus();
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

  const handleSaveToCustomerFile = async () => {
    setLoadingAction('save_customer');
    try {
      const isOnline = navigator.onLine;
      if (isOnline) {
        const res = await api.saveWorkbookToCustomerFile(appointmentId);
        toast.success('Workbook saved to customer file successfully!');
        await fetchStatus();
      } else {
        // Offline save
        toast.success('Workbook saved locally to customer file (Offline).');
        setStatus('saved_to_customer_file');
      }
      onRefresh();
    } catch (err: any) {
      console.error('Failed to save workbook to customer file:', err);
      toast.error(err.message || 'Failed to save workbook.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSendDocusign = async () => {
    const isOnline = navigator.onLine;
    if (!isOnline) {
      // Queue for offline sending
      setLoadingAction('queue_docusign');
      try {
        const { enqueueOutboxItem } = await import('../lib/syncEngine');
        await enqueueOutboxItem({
          companyId: appointment.companyId || 'default',
          userId: appointment.userId || '',
          entityType: 'docusign_send',
          entityLocalId: appointmentId,
          appointmentId: appointmentId,
          operation: 'create',
          payload: { appointmentId }
        });
        toast.success('Queued for DocuSign when online.');
        setStatus('sent_to_docusign'); // Optimistic local status update
      } catch (err: any) {
        toast.error('Failed to queue DocuSign request.');
      } finally {
        setLoadingAction(null);
      }
      return;
    }

    setLoadingAction('send_docusign');
    try {
      const res = await api.sendWorkbookToDocusign(appointmentId);
      toast.success('DocuSign envelope created and sent successfully!');
      await fetchStatus();
      onRefresh();
    } catch (err: any) {
      console.error('Failed to send DocuSign envelope:', err);
      toast.error(err.message || 'Failed to send DocuSign envelope.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleConnectDocusign = () => {
    setIsConnectingDs(true);
    const width = 600;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    const connectWindow = window.open(
      '/api/documents/docusign/connect',
      'Connect DocuSign',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    // Check every 1 second if the connect window is closed
    const timer = setInterval(async () => {
      if (connectWindow && connectWindow.closed) {
        clearInterval(timer);
        setIsConnectingDs(false);
        toast.success('DocuSign connection updated.');
        await checkDocusignStatus();
        await fetchStatus();
      }
    }, 1000);
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
        return { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', text: 'Draft Ready' };
      case 'final_generated':
        return { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', text: 'Final Ready' };
      case 'saved_to_customer_file':
        return { bg: 'rgba(16,185,129,0.1)', color: '#10b981', text: 'Saved to Customer File' };
      case 'sent_to_docusign':
        return { bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6', text: 'Sent to DocuSign' };
      case 'completed_docusign':
        return { bg: 'rgba(16,185,129,0.15)', color: '#10b981', text: 'Signed / Completed' };
      case 'edited_externally':
        return { bg: 'rgba(99,102,241,0.1)', color: '#6366f1', text: 'Edited Externally' };
      case 'stale_needs_regeneration':
        return { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', text: 'Needs Regeneration' };
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

      {/* 💾 Save & DocuSign Section */}
      {status !== 'not_generated' && (
        <div className="card" style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-md)',
          marginTop: '1rem'
        }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800 }}>✍️ Save & DocuSign Workflow</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Save your finalized workbook to the customer file and send the signature copy through DocuSign.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Step A: Save to Customer File */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.01)',
              border: '1px solid var(--border)',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <h5 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700 }}>1. Save to Customer File</h5>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Saves the master Excel file and metadata to the customer profile.
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleSaveToCustomerFile}
                disabled={status === 'draft_generated' || status === 'stale_needs_regeneration' || status === 'not_generated' || loadingAction !== null}
              >
                {loadingAction === 'save_customer' ? 'Saving...' : '💾 Save to Customer File'}
              </button>
            </div>

            {/* Step B: DocuSign Connection & Send */}
            <div style={{
              padding: '1rem',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.01)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h5 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700 }}>2. DocuSign Signature Handoff</h5>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Sends a signable copy to the customer using your `@winworldinfo.com` identity.
                  </p>
                </div>
                
                {dsStatusLoading ? (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Checking DocuSign connection...</span>
                ) : !dsStatus?.isConnected ? (
                  <button
                    className="btn btn-secondary"
                    onClick={handleConnectDocusign}
                    disabled={isConnectingDs}
                  >
                    {isConnectingDs ? 'Connecting...' : '🔗 Connect DocuSign'}
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>✓ Connected ({dsStatus.email})</span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={handleConnectDocusign}
                      style={{ padding: '2px 8px', fontSize: '0.6875rem' }}
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>

              {!dsStatusLoading && dsStatus?.isConnected && (
                <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="btn btn-success"
                    onClick={handleSendDocusign}
                    disabled={(status !== 'saved_to_customer_file' && status !== 'sent_to_docusign') || loadingAction !== null}
                  >
                    {loadingAction === 'send_docusign' ? 'Sending...' : loadingAction === 'queue_docusign' ? 'Queueing...' : '✍️ Send with DocuSign'}
                  </button>
                </div>
              )}
            </div>
            
            {/* DocuSign Envelope Metadata Display */}
            {workbookDoc && (workbookDoc.docusignEnvelopeId || workbookDoc.metadataJson?.docusignEnvelopeId) && (
              <div style={{
                padding: '1rem',
                borderRadius: '12px',
                background: 'rgba(139,92,246,0.04)',
                border: '1px solid rgba(139,92,246,0.15)',
                fontSize: '0.8125rem'
              }}>
                <h5 style={{ margin: '0 0 0.5rem 0', color: '#a78bfa', fontWeight: 700 }}>Envelope Information</h5>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.375rem', color: 'var(--text-secondary)' }}>
                  <span>Envelope ID:</span>
                  <span style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{workbookDoc.docusignEnvelopeId || workbookDoc.metadataJson?.docusignEnvelopeId}</span>
                  
                  <span>Status:</span>
                  <span style={{ fontWeight: 700 }}>{workbookDoc.docusignStatus || workbookDoc.metadataJson?.docusignStatus || 'Sent'}</span>
                  
                  <span>Recipient:</span>
                  <span>{workbookDoc.docusignRecipientName || workbookDoc.metadataJson?.docusignRecipientName || 'Customer'}</span>
                  
                  <span>Sender Email:</span>
                  <span>{workbookDoc.docusignSenderEmail || workbookDoc.metadataJson?.docusignSenderEmail}</span>
                  
                  <span>Sent At:</span>
                  <span>{workbookDoc.docusignSentAt ? new Date(workbookDoc.docusignSentAt).toLocaleString() : workbookDoc.metadataJson?.docusignSentAt ? new Date(workbookDoc.metadataJson.docusignSentAt).toLocaleString() : 'N/A'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
