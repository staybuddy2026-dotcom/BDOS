'use client';

import { DecisionMakerContact } from '@/features/company360/types';
import { UserCheck, Mail, Globe, CheckCircle, Shield } from 'lucide-react';

export function DecisionMakerPanel({ decisionMakers }: { decisionMakers: DecisionMakerContact[] }) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserCheck size={18} style={{ color: 'var(--accent-indigo)' }} />
          <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Executive Decision Makers ({decisionMakers.length})
          </h3>
        </div>

        <span style={{ fontSize: '0.65rem', background: 'var(--accent-indigo-glow)', color: 'var(--accent-indigo)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
          Sourced from Apollo.io Provider
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
        {decisionMakers.map((dm) => (
          <div 
            key={dm.id}
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {dm.name}
                </h4>
                <div style={{ fontSize: '0.76rem', color: 'var(--accent-indigo)', fontWeight: 600, marginTop: '2px' }}>
                  {dm.jobTitle}
                </div>
              </div>

              <span style={{ fontSize: '0.62rem', background: 'var(--accent-indigo-glow)', color: 'var(--accent-indigo)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                {dm.seniority}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                <span style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Mail size={12} style={{ color: 'var(--color-success)' }} /> {dm.email}
                </span>
                <span style={{ fontSize: '0.62rem', color: 'var(--color-success)', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}>
                  <CheckCircle size={10} /> {dm.emailStatus}
                </span>
              </div>

              {dm.linkedinUrl && (
                <a 
                  href={dm.linkedinUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.72rem', color: 'var(--accent-indigo)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                >
                  <Globe size={12} /> View LinkedIn Executive Profile →
                </a>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.66rem', color: 'var(--text-muted)' }}>
              <span>Department: <strong style={{ color: 'var(--text-muted)' }}>{dm.department}</strong></span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <Shield size={10} /> Provenance: {dm.source}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
