'use client';

import { ObjectionItem } from '@/features/copilot/types';
import { AlertCircle, ChevronRight } from 'lucide-react';

export function ObjectionPanel({ 
  objections = [
    {
      objection: 'We already have an in-house engineering team.',
      aiResponse: 'Many of our clients also have internal engineering teams. We usually help them accelerate delivery by extending their existing squads rather than replacing them, eliminating local hiring bottlenecks.',
      recommendedStrategy: 'Position Tiny Script as a flexible squad extension that handles backlog velocity without long-term HR overhead.',
    },
    {
      objection: 'We already work with another vendor / development agency.',
      aiResponse: 'We frequently work alongside existing vendors by handling specialized AI Development, AWS Cloud Modernization, or React 19 microservice modules.',
      recommendedStrategy: 'Propose a specialized niche project (e.g. AI LLM RAG integration) where current vendors lack deep expertise.',
    },
    {
      objection: 'Our engineering budget is currently constrained.',
      aiResponse: 'We can begin with a smaller engagement (e.g. 2-developer squad allocation for 4 sprints) and expand once measurable business ROI has been demonstrated.',
      recommendedStrategy: 'Offer a low-friction 4-week MVP pilot or architecture consultation.',
    },
  ]
}: { 
  objections?: ObjectionItem[];
}) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <AlertCircle size={16} style={{ color: '#eab308' }} /> AI Sales Objection Handling & BDE Rebuttals
      </h4>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {objections.map((item, idx) => (
          <div key={idx} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ChevronRight size={14} style={{ color: '#eab308' }} /> Prospect Objection: &quot;{item.objection}&quot;
            </div>

            <div style={{ fontSize: '0.76rem', color: 'var(--color-success)', background: 'var(--color-success-bg)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <strong>AI Recommended Rebuttal:</strong> &quot;{item.aiResponse}&quot;
            </div>

            <div style={{ fontSize: '0.7rem', color: 'var(--accent-indigo)', fontWeight: 700 }}>
              Tactical Strategy: {item.recommendedStrategy}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
