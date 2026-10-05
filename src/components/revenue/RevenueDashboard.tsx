'use client';

import { useRouter } from 'next/navigation';
import { RevenueDeal, RevenueTelemetry } from '@/features/revenue/types';
import { ForecastProjections } from '@/features/revenue/forecasting';
import { DealPipeline } from './DealPipeline';
import { RevenueForecast } from './RevenueForecast';

/** Forecast view of the CRM pipeline. Deals are worked in the CRM, so clicking one opens it there. */
export function RevenueDashboard({ 
  initialDeals: deals, 
  telemetry, 
  forecast 
}: { 
  initialDeals: RevenueDeal[]; 
  telemetry: RevenueTelemetry; 
  forecast: ForecastProjections;
}) {
  const router = useRouter();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top RevenueOS KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
        <div className="premium-kpi-card" style={{ '--glow-color': 'rgba(99, 102, 241, 0.15)' } as React.CSSProperties}>
          <div style={{ fontSize: '0.68rem', color: 'var(--accent-indigo)', fontWeight: 700, textTransform: 'uppercase' }}>Total Pipeline Value</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--accent-indigo)', marginTop: '2px' }}>{telemetry.pipelineValueInr}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{telemetry.pipelineValueUsd} USD</div>
          <div className="kpi-glow" />
        </div>

        <div className="premium-kpi-card" style={{ '--glow-color': 'rgba(234, 179, 8, 0.15)' } as React.CSSProperties}>
          <div style={{ fontSize: '0.68rem', color: 'var(--color-warning)', fontWeight: 700, textTransform: 'uppercase' }}>Weighted Expected Revenue</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#eab308', marginTop: '2px' }}>{telemetry.expectedRevenueInr}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{telemetry.expectedRevenueUsd} USD</div>
          <div className="kpi-glow" />
        </div>

        <div className="premium-kpi-card" style={{ '--glow-color': 'rgba(16, 185, 129, 0.15)' } as React.CSSProperties}>
          <div style={{ fontSize: '0.68rem', color: 'var(--color-success)', fontWeight: 700, textTransform: 'uppercase' }}>Deals Closing This Month</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-success)', marginTop: '2px' }}>{telemetry.dealsClosingThisMonthCount} Deals</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Avg Sales Cycle {telemetry.salesVelocityDays} Days</div>
          <div className="kpi-glow" />
        </div>

        <div className="premium-kpi-card" style={{ '--glow-color': 'rgba(139, 92, 246, 0.15)' } as React.CSSProperties}>
          <div style={{ fontSize: '0.68rem', color: 'var(--accent-violet)', fontWeight: 700, textTransform: 'uppercase' }}>Target Achievement</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-violet)', marginTop: '2px' }}>{telemetry.annualSalesTargetInr ? `${telemetry.targetAchievementPercent}%` : 'No target'}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{telemetry.dealsWonCount} won · {telemetry.dealsLostCount} lost</div>
          <div className="kpi-glow" />
        </div>
      </div>

      {/* Revenue Forecast Component */}
      <RevenueForecast projections={forecast} />

      {/* Enterprise Multi-Stage Kanban Pipeline */}
      <div>
        <div style={{ fontSize: '0.94rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Enterprise Revenue Pipeline ({deals.length} Active Deals)</span>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Click a deal to open it in the CRM</span>
        </div>

        <DealPipeline deals={deals} onSelectDeal={(deal) => router.push(`/crm?deal=${deal.id}`)} />
      </div>

    </div>
  );
}
