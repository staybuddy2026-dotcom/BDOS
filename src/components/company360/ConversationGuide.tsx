'use client';

import { CheckCircle2, MessageSquare } from 'lucide-react';

export function ConversationGuide({ companyName = 'ACME Health Technologies' }: { companyName?: string }) {
  const openingMessage = `"Congratulations on ${companyName}'s recent Series A funding. We noticed you're expanding your engineering team for AI patient diagnosis features and thought this might be the perfect time to discuss scaling without increasing hiring delays."`;
  
  const goals = [
    'Understand current engineering capacity & hiring bottlenecks',
    'Evaluate Q3 patient portal development roadmap timelines',
    'Identify legacy microservice refactoring challenges',
    'Assess cloud infrastructure scaling readiness on AWS',
    'Explore AI LLM feature integration requirements',
    'Introduce Tiny Script dedicated squad outstaffing model',
  ];

  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-focus)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={16} style={{ color: 'var(--accent-indigo)' }} /> AI Conversation Coach for BDEs
        </h4>
      </div>

      <div style={{ background: 'var(--accent-indigo-glow)', border: '1px solid var(--border-focus)', borderRadius: '8px', padding: '12px' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--accent-indigo)', fontWeight: 800, textTransform: 'uppercase' }}>Recommended Opening Message</div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontStyle: 'italic', marginTop: '4px', lineHeight: 1.4 }}>
          {openingMessage}
        </div>
      </div>

      <div>
        <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 800, marginBottom: '6px' }}>Key Conversation Goals during Discovery Call:</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '6px' }}>
          {goals.map((goal, idx) => (
            <div key={idx} style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={12} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
              <span>{goal}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
