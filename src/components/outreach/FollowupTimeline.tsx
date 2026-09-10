'use client';

import { FollowupStage } from '@/features/outreach/types';
import { Clock, Sparkles, CheckCircle2 } from 'lucide-react';

export function FollowupTimeline({
  currentStage,
  onSelectStage
}: {
  currentStage: FollowupStage;
  onSelectStage?: (stage: FollowupStage) => void;
}) {
  const stages = [
    { id: 'STAGE_1_INITIAL' as const, label: 'Day 1: Initial Touch', desc: 'Technical & Value-Add Intro' },
    { id: 'STAGE_2_FOLLOWUP' as const, label: 'Day 3: Quick Follow-up', desc: 'Case study & squad availability' },
    { id: 'STAGE_3_VALUE_ADD' as const, label: 'Day 7: Architecture Blueprint', desc: 'Free microservices audit' },
    { id: 'STAGE_4_BREAKUP' as const, label: 'Day 14: Final Check-in', desc: 'Closing the loop' },
  ];

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 4px 24px rgba(0,0,0,0.03)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={19} style={{ color: '#6366f1' }} /> Automated Multi-Stage Outreach Sequence
        </div>
        <span style={{ fontSize: '0.76rem', background: '#eef2ff', color: '#6366f1', padding: '4px 10px', borderRadius: '4px', fontWeight: 700 }}>
          4-Stage Sequence Active
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
        {stages.map((st, idx) => {
          const isCurrent = currentStage === st.id;
          return (
            <div
              key={st.id}
              onClick={() => onSelectStage && onSelectStage(st.id)}
              style={{
                background: isCurrent ? '#eef2ff' : '#ffffff',
                border: isCurrent ? '1.5px solid #6366f1' : '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                cursor: onSelectStage ? 'pointer' : 'default',
                transition: 'all 0.15s ease',
                boxShadow: isCurrent ? '0 2px 8px rgba(99, 102, 241, 0.1)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isCurrent ? '#6366f1' : '#64748b' }}>
                  Stage {idx + 1}
                </span>
                {isCurrent ? <Sparkles size={15} style={{ color: '#6366f1' }} /> : <CheckCircle2 size={15} style={{ color: '#10b981' }} />}
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>{st.label}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: '1.4' }}>{st.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
