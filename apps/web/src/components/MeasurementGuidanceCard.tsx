import React from 'react';
import { MeasurementGuidanceDetail } from '../utils/measurementRulesEngine';

export function MeasurementGuidanceCard({ 
  guidance 
}: { 
  guidance: MeasurementGuidanceDetail 
}) {
  return (
    <div style={{ padding: '0.8rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: 8, border: '1px solid rgba(59, 130, 246, 0.2)', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span>📏</span> {guidance.surfaceTitle} Measurement
        </h4>
        {guidance.highRisk && (
          <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', borderRadius: 4, fontWeight: 700 }}>HIGH RISK</span>
        )}
      </div>
      
      <div 
        style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.5, marginLeft: '-1rem' }}
        dangerouslySetInnerHTML={{ __html: guidance.instructionHTML }} 
      />
      
      <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.75rem', color: '#94a3b8' }}>
        <strong>Rule Applied:</strong> {guidance.deductionRule} 
        {guidance.defaultDeduction !== 0 && ` (${guidance.defaultDeduction > 0 ? '+' : ''}${guidance.defaultDeduction}")`}
      </div>
    </div>
  );
}
