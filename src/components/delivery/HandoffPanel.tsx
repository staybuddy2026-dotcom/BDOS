'use client';

import { Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';

export function HandoffPanel({ onInitiate }: { onInitiate: () => void }) {
  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(56, 189, 248, 0.15))', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '14px', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ background: 'var(--color-success-bg)', padding: '10px', borderRadius: '50%', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
          <Sparkles size={24} style={{ color: 'var(--color-success)' }} />
        </div>

        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-success)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            AI Handoff Engine • Zero Manual Copy-Paste
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)', margin: '2px 0 0 0' }}>
            Automated Sales-to-Delivery Workspace Generation
          </h3>
          <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Contracts signed in RevenueOS automatically provision squad team, sprint plans, milestones, risks & GitHub repos.
          </p>
        </div>
      </div>

      <button
        onClick={onInitiate}
        style={{
          padding: '10px 18px',
          borderRadius: '8px',
          fontSize: '0.82rem',
          fontWeight: 800,
          background: 'linear-gradient(135deg, #10b981, #059669)',
          color: 'var(--bg-primary)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
        }}
      >
        <CheckCircle2 size={16} /> Initiate New Deal Handoff <ArrowRight size={14} />
      </button>
    </div>
  );
}
