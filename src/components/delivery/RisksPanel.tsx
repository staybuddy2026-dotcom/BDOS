'use client';

import { ProjectRisk } from '@/features/delivery/types';
import { AlertTriangle } from 'lucide-react';

export function RisksPanel({ risks }: { risks: ProjectRisk[] }) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} style={{ color: 'var(--color-danger)' }} />
          <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            AI Risk Register & Mitigation Controls ({risks.length} Risks)
          </h3>
        </div>

        <span style={{ fontSize: '0.65rem', background: 'var(--color-danger-bg)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
          Continuous Risk Monitoring
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {risks.map((risk) => (
          <div key={risk.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.68rem', background: 'var(--color-danger-bg)', color: '#fca5a5', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                {risk.category} RISK • {risk.severity} SEVERITY
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Owner: <strong style={{ color: 'var(--accent-indigo)' }}>{risk.owner}</strong></span>
            </div>

            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Potential Impact:</strong> {risk.impact}
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '6px', fontSize: '0.74rem', color: 'var(--color-success)', fontWeight: 700 }}>
              AI Recommended Mitigation: {risk.mitigation}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
