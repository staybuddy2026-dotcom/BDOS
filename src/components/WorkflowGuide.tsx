'use client';

import Link from 'next/link';
import { Target } from 'lucide-react';

export function WorkflowGuide({ activeStep }: { activeStep: number }) {
  return (
    <div style={{ padding: '16px 28px 0 28px' }}>
      <style>{`
        .workflow-container {
          background: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.8);
          border-radius: 12px;
          padding: 20px 24px;
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.02);
          transition: all 0.3s ease;
        }
        .workflow-container:hover {
          box-shadow: 0 8px 30px rgba(15, 23, 42, 0.05);
          border-color: #cbd5e1;
        }
        .workflow-step {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 14px 8px;
          border-radius: 10px;
          text-align: center;
          text-decoration: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          border: 1px solid transparent;
        }
        .workflow-step:not(.active) {
          background: #ffffff;
          border-color: #e2e8f0;
        }
        .workflow-step:not(.active):hover {
          border-color: #a78bfa;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(139, 92, 246, 0.1);
        }
        .workflow-step.active {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-color: transparent;
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
          transform: translateY(-2px);
        }
      `}</style>
      <div className="workflow-container">
        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', display: 'flex', alignItems: 'start', gap: '8px' }}>
          <div style={{ color: '#8b5cf6' }}>
            <Target size={20} strokeWidth={2.5} />
          </div>
          Daily BDE Guided Sales Execution Flow
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
          {[
            { step: 1, name: 'AI Priorities', link: '/priorities', hint: 'Daily Queue' },
            { step: 2, name: 'Apollo B2B Search', link: '/apollo-search', hint: 'Find Decision Makers' },
            { step: 3, name: 'Research Company 360', link: '/company', hint: 'Tech Stack & Profiles' },
            { step: 4, name: 'AI Outreach Generator', link: '/engagement', hint: 'Personalized Copies' },
            { step: 5, name: 'Review Queue', link: '/review', hint: 'Approve & Dispatch' },
            { step: 6, name: 'Automated Sequences', link: '/re-engagement', hint: 'Follow-up Schedules' },
            { step: 7, name: 'Revenue Pipeline', link: '/revenue', hint: 'Manage CRM Deals' },
          ].map((s) => {
            const isActive = activeStep === s.step;
            return (
              <Link
                key={s.step}
                href={s.link}
                className={`workflow-step ${isActive ? 'active' : ''}`}
              >
                <div style={{ fontSize: '0.68rem', color: isActive ? '#e0e7ff' : '#8b5cf6', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>STEP {s.step}</div>
                <div style={{ fontSize: '0.9rem', color: isActive ? '#ffffff' : '#0f172a', fontWeight: 800, marginTop: '2px' }}>{s.name}</div>
                <div style={{ fontSize: '0.7rem', color: isActive ? '#c7d2fe' : '#64748b', fontWeight: 600 }}>{s.hint}</div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
