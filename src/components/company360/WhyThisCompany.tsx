'use client';

import { CheckCircle2, ShieldCheck } from 'lucide-react';

export function WhyThisCompany({ 
  reasons = [
    'Raised $12.5M Series A funding led by Sequoia Capital',
    'Actively hiring 4 Senior React 19 & Node.js Engineers',
    'New CTO appointed (ex-VP Engineering at Healthify)',
    'Building AI & LLM patient portal features',
    'Using Node.js microservices architecture',
    'Looking for engineering scaling and outstaffing squad',
    'Technology stack matches Tiny Script core expertise',
    'High outsourcing probability based on active recruitment gaps',
  ] 
}: { 
  reasons?: string[] 
}) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-focus)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ShieldCheck size={16} style={{ color: 'var(--accent-indigo)' }} /> Why is this company a good customer for Tiny Script?
      </h4>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '8px' }}>
        {reasons.map((rsn, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <CheckCircle2 size={14} style={{ color: 'var(--color-success)', marginTop: '2px', flexShrink: 0 }} />
            <span>{rsn}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
