'use client';

import { ProjectMilestone } from '@/features/delivery/types';
import { Flag, CheckCircle2, Clock } from 'lucide-react';

export function MilestoneTimeline({ milestones }: { milestones: ProjectMilestone[] }) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Flag size={18} style={{ color: 'var(--color-success)' }} />
          <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Project Milestones & Delivery Schedule ({milestones.length} Milestones)
          </h3>
        </div>

        <span style={{ fontSize: '0.65rem', background: 'var(--color-success-bg)', color: 'var(--color-success)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
          10-Stage Milestone Framework
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {milestones.map((m) => (
          <div key={m.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {m.status === 'COMPLETED' ? <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} /> : <Clock size={14} style={{ color: 'var(--text-muted)' }} />}
                {m.title}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Duration: {m.startDate} to {m.endDate} • Owner: <strong style={{ color: 'var(--accent-indigo)' }}>{m.owner}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${m.progressPercent}%`, height: '100%', background: m.status === 'COMPLETED' ? 'var(--color-success)' : 'var(--accent-indigo)' }} />
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: m.status === 'COMPLETED' ? 'var(--color-success)' : 'var(--accent-indigo)' }}>
                {m.progressPercent}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
