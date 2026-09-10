'use client';

import { GrowthIntelligenceData } from '@/features/crunchbase/types';
import { TrendingUp, Rocket, ExternalLink } from 'lucide-react';

export function GrowthPanel({ growth }: { growth: GrowthIntelligenceData }) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid rgba(234, 179, 8, 0.25)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={20} style={{ color: 'var(--color-warning)' }} />
          <div>
            <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Crunchbase Growth & Investment Intelligence
            </h3>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              Official Crunchbase API: Venture funding, employee expansion & budget readiness
            </span>
          </div>
        </div>

        <a 
          href={growth.crunchbaseOrgUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ fontSize: '0.72rem', color: 'var(--color-warning)', textDecoration: 'none', background: 'var(--color-warning-bg)', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '4px 10px', borderRadius: '6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          View Crunchbase Profile <ExternalLink size={11} />
        </a>
      </div>

      {/* KPI Growth Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Funding</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--color-success)', marginTop: '2px' }}>
            {growth.totalFundingRaisedUsd}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{growth.totalFundingRaisedInr}</div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 600 }}>Latest Round</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-warning)', marginTop: '2px' }}>
            {growth.latestRoundName}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{growth.latestRoundAmountUsd} ({growth.latestRoundDate})</div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 600 }}>Employee Growth</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-indigo)', marginTop: '2px' }}>
            +{growth.employeeCountGrowthMomPercent}% YoY
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Founded: {growth.foundedYear}</div>
        </div>

        <div style={{ background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.25)', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.66rem', color: 'var(--color-warning)', fontWeight: 700 }}>Growth Score</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--color-warning)', marginTop: '2px' }}>
            {growth.growthOpportunityScore}/100
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--color-success)' }}>Budget Intent: {growth.budgetReadinessScore}%</div>
        </div>
      </div>

      {/* DETECTED EXPANSION SIGNALS */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Rocket size={14} style={{ color: 'var(--color-warning)' }} /> Expansion & Market Growth Signals
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {growth.expansionSignals.map((signal) => (
            <div key={signal.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>{signal.title}</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{signal.description}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--color-success)', fontWeight: 800 }}>+{signal.impactScore} Score</span>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>{signal.detectedDate}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
