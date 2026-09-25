'use client';

import { IcpMatchResult } from '@/features/icp/types';
import { Target, CheckCircle2, Flame, Layers, Sparkles, ChevronRight } from 'lucide-react';

export function IcpFitCard({ result }: { result: IcpMatchResult }) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-focus)', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--accent-indigo)', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Target size={12} /> Ideal Customer Profile (ICP) Fit Analysis
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-primary)', margin: '2px 0 0 0' }}>
            {result.companyName} ({result.domain})
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.74rem', background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '4px 10px', borderRadius: '6px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Flame size={14} /> 🔥 Contact Immediately (Tier A)
          </span>
        </div>
      </div>

      {/* KPI Scores Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        <div style={{ background: 'var(--accent-indigo-glow)', border: '1px solid var(--border-focus)', borderRadius: '10px', padding: '12px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--accent-indigo)', fontWeight: 700 }}>ICP Match Score</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'var(--font-kpi)', color: 'var(--accent-indigo)', marginTop: '2px' }}>{result.icpMatchScore} / 100</div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-secondary)', marginTop: '2px' }}>High Account Fit</div>
        </div>

        <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.25)', borderRadius: '10px', padding: '12px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--color-warning)', fontWeight: 700 }}>Buying Intent</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'var(--font-kpi)', color: '#eab308', marginTop: '2px' }}>{result.buyingIntentScore} / 100</div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Active Buying Signals</div>
        </div>

        <div style={{ background: 'var(--color-success-bg)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '10px', padding: '12px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--color-success)', fontWeight: 700 }}>Revenue Potential</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--color-success)', marginTop: '2px' }}>{result.revenuePotentialInr}</div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{result.revenuePotentialUsd} USD</div>
        </div>

        <div style={{ background: 'rgba(192, 132, 252, 0.1)', border: '1px solid rgba(192, 132, 252, 0.25)', borderRadius: '10px', padding: '12px' }}>
          <div style={{ fontSize: '0.68rem', color: '#c084fc', fontWeight: 700 }}>Closing Probability</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'var(--font-kpi)', color: '#c084fc', marginTop: '2px' }}>{result.closingProbabilityPercent}%</div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Est. Deal Win Probability</div>
        </div>
      </div>

      {/* Transparent Reasoning Checklist */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h4 style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          Why ICP Score = {result.icpMatchScore}?
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px' }}>
          {result.reasoning.map((sig, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={14} style={{ color: 'var(--color-success)', marginTop: '2px' }} />
              <span>{sig.description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Tiny Script Services & Squad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--accent-indigo)', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Layers size={12} /> Recommended Tiny Script Services to Pitch
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {result.recommendedServices.map((srv, idx) => (
              <div key={idx} style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ChevronRight size={12} style={{ color: 'var(--accent-indigo)' }} /> {srv}
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-success)', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={12} /> Recommended Sales Strategy & Case Study
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <strong>Emphasis:</strong> {result.salesRecommendation.techEmphasis}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <strong>Attach Portfolio:</strong> {result.salesRecommendation.portfolioCaseStudy}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <strong>Squad Structure:</strong> {result.recommendedSquadComposition}
          </div>
        </div>
      </div>
    </div>
  );
}
