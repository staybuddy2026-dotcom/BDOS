'use client';

import { Tag, Sparkles } from 'lucide-react';

export function QualificationPanel({ 
  labels = ['Perfect ICP', 'AI Startup', 'Healthcare SaaS', 'High Budget', 'Growth Company', 'Engineering Expansion', 'Cloud Migration'] 
}: { 
  labels?: string[] 
}) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Tag size={16} style={{ color: 'var(--accent-indigo)' }} /> AI Lead Qualification Labels
      </h4>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {labels.map((lbl, idx) => (
          <span
            key={idx}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 800,
              background: idx === 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.12)',
              color: idx === 0 ? 'var(--color-success)' : 'var(--accent-indigo)',
              border: idx === 0 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(56, 189, 248, 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Sparkles size={10} /> {lbl}
          </span>
        ))}
      </div>
    </div>
  );
}
