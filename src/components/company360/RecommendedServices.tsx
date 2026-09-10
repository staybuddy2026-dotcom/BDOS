'use client';

import { ServiceMatchItem } from '@/features/playbook/types';
import { Award, Star } from 'lucide-react';

export function RecommendedServices({ 
  services = [
    {
      serviceName: 'AI & LLM Development (RAG & Autonomous Agents)',
      matchScore: 98,
      confidenceLevel: 'High',
      justification: 'Prospect is expanding AI patient diagnosis portal and hiring machine learning specialists.',
      relevanceReason: 'Tiny Script has ready-to-deploy LLM integration patterns for Healthcare SaaS platforms.',
    },
    {
      serviceName: 'Dedicated Development Team (React 19 + Node.js Squad)',
      matchScore: 96,
      confidenceLevel: 'High',
      justification: '60+ day recruitment delays for senior local engineers are creating delivery bottlenecks.',
      relevanceReason: 'Immediate availability of 2 Senior React Devs + 1 PM + 1 QA with 48-hour onboarding.',
    },
  ]
}: { 
  services?: ServiceMatchItem[];
}) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-focus)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Award size={16} style={{ color: 'var(--accent-indigo)' }} /> Recommended Tiny Script Services & Value Alignment
        </h4>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
        {services.map((item, idx) => (
          <div key={idx} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)' }}>{item.serviceName}</span>
              <span style={{ fontSize: '0.74rem', fontWeight: 900, color: 'var(--color-success)', background: 'var(--color-success-bg)', padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Star size={10} fill="#10b981" /> {item.matchScore}% Match
              </span>
            </div>

            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              <strong>Business Justification:</strong> {item.justification}
            </div>

            <div style={{ fontSize: '0.7rem', color: 'var(--accent-indigo)', fontWeight: 700 }}>
              💡 Why Relevant: {item.relevanceReason}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
