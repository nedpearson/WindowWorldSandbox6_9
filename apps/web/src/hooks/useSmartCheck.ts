import { useState, useCallback, useEffect } from 'react';
import type { FieldIntelligenceReport } from '../lib/fieldIntelligence/types';

export function useSmartCheck(
  appointmentId: string | undefined,
  inputData: {
    customer?: any;
    openings?: any[];
    photos?: any[];
    markers?: any[];
    qa2PriceFields?: any;
    pricingCachedAt?: number | null;
    financeOption?: any;
    contractData?: any;
    stage?: 'quick_price' | 'full_details' | 'contract_ready';
  }
) {
  const [report, setReport] = useState<FieldIntelligenceReport | null>(null);
  const [loading, setLoading] = useState(false);

  // Load cached report initially
  useEffect(() => {
    if (!appointmentId) return;
    import('../lib/fieldIntelligence/engine').then(({ loadCachedReport }) => {
      loadCachedReport(appointmentId).then((cached: any) => {
        if (cached) setReport(cached);
      }).catch(() => {});
    }).catch(() => {});
  }, [appointmentId]);

  const runCheck = useCallback(async () => {
    if (!appointmentId || loading) return;
    setLoading(true);
    try {
      const { runFieldIntelligence } = await import('../lib/fieldIntelligence/engine');
      const newReport = await runFieldIntelligence({
        appointmentId,
        isOnline: navigator.onLine,
        customer: inputData.customer,
        openings: inputData.openings || [],
        photos: inputData.photos,
        markers: inputData.markers,
        qa2PriceFields: inputData.qa2PriceFields,
        pricingCachedAt: inputData.pricingCachedAt,
        financeOption: inputData.financeOption,
        contractData: inputData.contractData,
        stage: inputData.stage || 'full_details',
      });
      setReport(newReport);
    } catch (err) {
      console.warn('[SmartCheck] engine error:', err);
    } finally {
      setLoading(false);
    }
  }, [appointmentId, inputData, loading]);

  const handleFindingResolved = useCallback((finding: any) => {
    // The panel handles its own local state, but we can trigger a re-run or just update counts
    // For now, no-op since the Panel calls API and updates its local clone of the report.
  }, []);

  return {
    report,
    loading,
    runCheck,
    handleFindingResolved,
  };
}
