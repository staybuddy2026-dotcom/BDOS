'use client';

import { ForecastProjections } from '@/features/revenue/forecasting';
import { TrendingUp } from 'lucide-react';

export function RevenueForecast({ projections }: { projections: ForecastProjections }) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-focus)', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={20} style={{ color: 'var(--accent-indigo)' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
            AI Revenue Forecast & Weighted Pipeline Projections
          </h3>
        </div>

        <span style={{ fontSize: '0.72rem', background: 'var(--accent-indigo-glow)', color: 'var(--accent-indigo)', border: '1px solid var(--border-focus)', padding: '4px 10px', borderRadius: '6px', fontWeight: 800 }}>
          FY 2026 Forecast Model Active
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Monthly Forecast</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--accent-indigo)', marginTop: '2px' }}>{projections.expectedMonthlyRevenueInr}</div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Weighted Cash Flow</div>
        </div>

        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Quarterly Projections</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-warning)', marginTop: '2px' }}>{projections.expectedQuarterlyRevenueInr}</div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Q1 2026 Target</div>
        </div>

        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Annual Forecast</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-success)', marginTop: '2px' }}>{projections.expectedAnnualRevenueInr}</div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Annual Recurring Run Rate</div>
        </div>

        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Weighted Pipeline</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '2px' }}>{projections.weightedPipelineValueInr}</div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Avg Sales Cycle: {projections.averageSalesCycleDays} Days</div>
        </div>
      </div>
    </div>
  );
}
