'use client';

import { InvestorItem } from '@/features/crunchbase/types';
import { Award, ExternalLink } from 'lucide-react';

export function InvestorPanel({ investors }: { investors: InvestorItem[] }) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Award size={18} style={{ color: '#a5b4fc' }} />
          <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Investors & Venture Capital Backers ({investors.length})
          </h3>
        </div>

        <span style={{ fontSize: '0.65rem', background: 'var(--accent-indigo-glow)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
          Crunchbase Investment Intelligence
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
        {investors.map((inv) => (
          <div 
            key={inv.id}
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{inv.name}</h4>
                {inv.isLeadInvestor && (
                  <span style={{ fontSize: '0.62rem', background: 'rgba(234, 179, 8, 0.2)', color: 'var(--color-warning)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                    Lead Investor
                  </span>
                )}
              </div>

              <div style={{ fontSize: '0.74rem', color: '#a5b4fc', fontWeight: 600, marginTop: '4px' }}>
                Type: {inv.type}
              </div>

              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Total Investments Tracked: <strong style={{ color: 'var(--text-secondary)' }}>{inv.totalInvestmentsCount} companies</strong>
              </div>
            </div>

            {inv.websiteUrl && (
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                <a 
                  href={inv.websiteUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.72rem', color: 'var(--accent-indigo)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                >
                  Visit Investor Website <ExternalLink size={11} />
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
