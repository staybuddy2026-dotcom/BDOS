'use client';

import { RedditIntelligenceData } from '@/features/reddit/types';
import { Sparkles } from 'lucide-react';

export function BuyingIntentPanel({ reddit }: { reddit: RedditIntelligenceData }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* KPI Intent Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
        <div style={{ background: 'rgba(255, 69, 0, 0.08)', border: '1px solid rgba(255, 69, 0, 0.25)', borderRadius: '10px', padding: '12px' }}>
          <div style={{ fontSize: '0.66rem', color: '#ff4500', fontWeight: 700, textTransform: 'uppercase' }}>Buying Intent Score</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ff4500', marginTop: '2px' }}>
            {reddit.averageIntentScore}/100
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Urgency: {reddit.outsourcingUrgency}</div>
        </div>

        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px' }}>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Technical Match</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-indigo)', marginTop: '2px' }}>
            {reddit.technicalMatchScore}/100
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>React 19 / Node / FastAPI</div>
        </div>

        <div style={{ background: 'var(--bg-primary)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '10px', padding: '12px' }}>
          <div style={{ fontSize: '0.66rem', color: 'var(--color-success)', fontWeight: 700, textTransform: 'uppercase' }}>Target Budget</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-success)', marginTop: '2px' }}>
            {reddit.estimatedBudgetInr}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{reddit.estimatedBudgetUsd}</div>
        </div>

        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px' }}>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Expected Sales Cycle</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-warning)', marginTop: '2px' }}>
            {reddit.expectedSalesCycle}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Fast-track BDE outreach</div>
        </div>
      </div>

      {/* DETECTED BUYING SIGNALS */}
      <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={16} style={{ color: '#ff4500' }} /> Detected Real-Time Buying Signals
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {reddit.buyingSignals.map((signal) => (
            <div key={signal.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>{signal.title}</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{signal.description}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.74rem', color: '#ff4500', fontWeight: 800 }}>Intent: {signal.intentScore}%</span>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-success)', fontWeight: 700, marginTop: '2px' }}>{signal.urgencyLevel}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
