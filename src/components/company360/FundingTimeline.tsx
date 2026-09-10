'use client';

import { FundingRound } from '@/features/crunchbase/types';
import { Clock } from 'lucide-react';

export function FundingTimeline({ timeline }: { timeline: FundingRound[] }) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={18} style={{ color: 'var(--color-success)' }} />
          <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Funding History & Capital Timeline ({timeline.length} Rounds)
          </h3>
        </div>

        <span style={{ fontSize: '0.65rem', background: 'var(--color-success-bg)', color: 'var(--color-success)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
          Verified Crunchbase Timeline
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {timeline.map((round) => (
          <div 
            key={round.id}
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.74rem', background: 'rgba(234, 179, 8, 0.2)', color: 'var(--color-warning)', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                  {round.roundName}
                </span>
                <h4 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {round.amountUsd} <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 500 }}>({round.amountInr})</span>
                </h4>
              </div>

              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Lead Investor: <strong style={{ color: 'var(--accent-indigo)' }}>{round.leadInvestor}</strong> • Announced Date: {round.announcedDate}
              </div>

              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                {round.investors.map((inv, idx) => (
                  <span key={idx} style={{ fontSize: '0.65rem', background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', padding: '1px 6px', borderRadius: '4px' }}>
                    {inv}
                  </span>
                ))}
              </div>
            </div>

            {round.valuationUsd && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Valuation</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--color-success)' }}>{round.valuationUsd}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
