'use client';

import { IcpMatchResult } from '@/features/icp/types';
import { Target, ChevronRight } from 'lucide-react';

export function BestIcpMatchesWidget({ 
  matches, 
  onSelectCompany 
}: { 
  matches: IcpMatchResult[]; 
  onSelectCompany: (company: IcpMatchResult) => void;
}) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-focus)', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Target size={18} style={{ color: 'var(--accent-indigo)' }} /> Best ICP Matches Today ({matches.length})
        </h3>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sorted by Account Fit & Revenue Potential</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {matches.map((item) => (
          <div 
            key={item.companyId} 
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>{item.companyName}</h4>
                <span style={{ fontSize: '0.64rem', background: 'var(--accent-indigo-glow)', color: 'var(--accent-indigo)', border: '1px solid var(--border-focus)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                  ICP {item.icpMatchScore}/100
                </span>
                <span style={{ fontSize: '0.64rem', background: 'var(--color-warning-bg)', color: 'var(--color-warning)', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                  Intent {item.buyingIntentScore}/100
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {item.domain} • Est. Budget: <strong style={{ color: 'var(--color-success)' }}>{item.revenuePotentialInr}</strong> ({item.revenuePotentialUsd} USD)
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--accent-indigo)', marginTop: '2px' }}>
                Recommended Pitch: <strong>{item.recommendedServices[0]}</strong>
              </div>
            </div>

            <button
              onClick={() => onSelectCompany(item)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.74rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-indigo-hover))',
                color: 'var(--bg-primary)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              Contact Immediately <ChevronRight size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
