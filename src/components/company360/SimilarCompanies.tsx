'use client';

import { SimilarSuccessStory } from '@/features/copilot/types';
import { Building2 } from 'lucide-react';

export function SimilarCompanies({ 
  stories = [
    {
      companyType: 'Healthcare SaaS Startup',
      employeeCount: 120,
      techStack: ['React 19', 'Next.js', 'Node.js', 'PostgreSQL', 'AWS'],
      deliveredServices: ['React Patient Portal', 'AI Chat Assistant', 'AWS Cloud Migration'],
      similarityPercent: 94,
    },
    {
      companyType: 'Series A FinTech Platform',
      employeeCount: 180,
      techStack: ['React Native', 'Node.js', 'GraphQL', 'AWS'],
      deliveredServices: ['Mobile Payment App', 'Microservices Architecture'],
      similarityPercent: 89,
    },
  ]
}: { 
  stories?: SimilarSuccessStory[];
}) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-focus)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={16} style={{ color: 'var(--accent-indigo)' }} /> Similar Past Tiny Script Success Stories
        </h4>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
        {stories.map((st, idx) => (
          <div key={idx} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)' }}>{st.companyType} ({st.employeeCount} Devs)</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-success)', fontWeight: 900, background: 'var(--color-success-bg)', padding: '2px 6px', borderRadius: '4px' }}>
                {st.similarityPercent}% Similarity Match
              </span>
            </div>

            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Tech Stack: {st.techStack.join(', ')}</div>

            <div style={{ fontSize: '0.7rem', color: 'var(--accent-indigo)', fontWeight: 700 }}>
              Tiny Script Delivered: {st.deliveredServices.join(' • ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
