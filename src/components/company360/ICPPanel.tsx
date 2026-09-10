'use client';

import { Target } from 'lucide-react';

export function ICPPanel({ 
  icpScore = 96, 
  estimatedSizeInr = '₹25,00,000 – ₹80,00,000', 
  estimatedSizeUsd = '$35,000 – $95,000',
  recommendedTeam = '2 React Devs, 2 Node Devs, 1 QA, 1 PM'
}: { 
  icpScore?: number; 
  estimatedSizeInr?: string; 
  estimatedSizeUsd?: string;
  recommendedTeam?: string;
}) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-focus)', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Target size={18} style={{ color: 'var(--accent-indigo)' }} /> Ideal Customer Profile (ICP) Summary
        </h3>
        <span style={{ fontSize: '0.72rem', background: 'var(--color-success-bg)', color: 'var(--color-success)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '3px 8px', borderRadius: '6px', fontWeight: 800 }}>
          Perfect ICP Match
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        <div style={{ background: 'var(--accent-indigo-glow)', border: '1px solid var(--border-focus)', borderRadius: '10px', padding: '14px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--accent-indigo)', fontWeight: 700 }}>ICP Match Score</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--accent-indigo)', marginTop: '2px' }}>{icpScore} / 100</div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Highly Qualified Prospect</div>
        </div>

        <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.25)', borderRadius: '10px', padding: '14px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--color-warning)', fontWeight: 700 }}>Estimated Project Size</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#eab308', marginTop: '2px' }}>{estimatedSizeInr}</div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{estimatedSizeUsd} USD</div>
        </div>

        <div style={{ background: 'var(--color-success-bg)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '10px', padding: '14px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--color-success)', fontWeight: 700 }}>Recommended Team</div>
          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>{recommendedTeam}</div>
        </div>
      </div>
    </div>
  );
}
