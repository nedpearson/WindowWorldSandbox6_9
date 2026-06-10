import { useState } from 'react';

export function ProfitabilityPage() {
  const [salePrice, setSalePrice] = useState(1200);
  const [result, setResult] = useState<any>(null);
  const [costs, setCosts] = useState({
    materialCost: 300, laborCostPerHour: 45, laborHours: 2,
    disposalCost: 25, fuelCost: 15, permitCost: 0,
    financingFeeRate: 0.03, commissionRate: 0.08, discountAmount: 0, riskReserveRate: 0.02,
  });

  const calculate = () => {
    // Calculate locally — no API dependency needed for pure arithmetic
    const laborCost = costs.laborCostPerHour * costs.laborHours;
    const financingFee = +(salePrice * costs.financingFeeRate).toFixed(2);
    const commission = +(salePrice * costs.commissionRate).toFixed(2);
    const riskReserve = +(salePrice * costs.riskReserveRate).toFixed(2);
    const totalCost = +(costs.materialCost + laborCost + costs.disposalCost + costs.fuelCost + costs.permitCost + financingFee + commission + riskReserve + costs.discountAmount).toFixed(2);
    const grossMargin = +(salePrice - costs.materialCost - laborCost - costs.disposalCost - costs.fuelCost).toFixed(2);
    const grossMarginPct = salePrice > 0 ? (grossMargin / salePrice) * 100 : 0;
    const netMargin = +(salePrice - totalCost).toFixed(2);
    const netMarginPct = salePrice > 0 ? (netMargin / salePrice) * 100 : 0;
    const status = netMarginPct >= 20 ? 'green' : netMarginPct >= 10 ? 'yellow' : 'red';
    setResult({
      materialCost: costs.materialCost, laborCost, disposal: costs.disposalCost, fuel: costs.fuelCost,
      financingFee, commission, riskReserve, totalCost, grossMargin, grossMarginPct, netMargin, netMarginPct, status,
    });
  };

  const statusColor = result?.status === 'green' ? '#3fb950' : result?.status === 'yellow' ? '#d29922' : '#f85149';

  return (
    <div style={{ padding: '24px', maxWidth: 900 }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        💰 Live Profit Engine
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '0.95rem', margin: '0 0 12px' }}>Sale Price</h3>
          <input type="number" value={salePrice} onChange={e => setSalePrice(Number(e.target.value))}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 600 }} />
        </div>

        <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '0.95rem', margin: '0 0 12px' }}>Cost Inputs</h3>
          {Object.entries(costs).map(([key, val]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{key.replace(/([A-Z])/g, ' $1')}</label>
              <input type="number" step="0.01" value={val}
                onChange={e => setCosts(p => ({ ...p, [key]: Number(e.target.value) }))}
                style={{ width: '80px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.8rem', textAlign: 'right' }} />
            </div>
          ))}
        </div>
      </div>

      <button onClick={calculate} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#58a6ff', color: '#fff', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', marginBottom: '20px' }}>
        Calculate Profitability
      </button>

      {result && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <ProfitCard label="Material" value={`$${result.materialCost}`} />
          <ProfitCard label="Labor" value={`$${result.laborCost}`} />
          <ProfitCard label="Disposal + Fuel" value={`$${(result.disposal + result.fuel).toFixed(2)}`} />
          <ProfitCard label="Financing Fee" value={`$${result.financingFee}`} />
          <ProfitCard label="Commission" value={`$${result.commission}`} />
          <ProfitCard label="Risk Reserve" value={`$${result.riskReserve}`} />
          <ProfitCard label="Total Cost" value={`$${result.totalCost}`} color="#f85149" />
          <ProfitCard label="Gross Margin" value={`$${result.grossMargin} (${result.grossMarginPct.toFixed(1)}%)`} color="#3fb950" />
          <ProfitCard label="Net Margin" value={`$${result.netMargin} (${result.netMarginPct.toFixed(1)}%)`} color={statusColor} />
          <div style={{ gridColumn: '1 / -1', padding: '16px', background: `${statusColor}22`, borderRadius: '12px', border: `2px solid ${statusColor}`, textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: statusColor }}>
              {result.status === 'green' ? '✅' : result.status === 'yellow' ? '⚠️' : '🔴'} {result.status.toUpperCase()}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Net Margin: {result.netMarginPct.toFixed(1)}% — {result.status === 'green' ? 'Healthy' : result.status === 'yellow' ? 'Thin margin' : 'Below minimum'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfitCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: '8px', borderLeft: `3px solid ${color || '#58a6ff'}` }}>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '1rem', fontWeight: 600, color: color || 'var(--text-primary)', marginTop: '2px' }}>{value}</div>
    </div>
  );
}

export default ProfitabilityPage;
