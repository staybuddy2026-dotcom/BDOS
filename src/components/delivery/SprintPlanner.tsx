'use client';

import { SprintPlan } from '@/features/delivery/types';
import { Target, CheckCircle2, Circle } from 'lucide-react';

export function SprintPlanner({ sprints }: { sprints: SprintPlan[] }) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Target size={18} style={{ color: '#eab308' }} />
          <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            AI Sprint Planner & Story Allocations ({sprints.length} Sprints)
          </h3>
        </div>

        <span style={{ fontSize: '0.65rem', background: 'var(--color-warning-bg)', color: 'var(--color-warning)', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
          Agile 2-Week Iterations
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {sprints.map((sprint) => (
          <div key={sprint.sprintNumber} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                Sprint {sprint.sprintNumber}: <span style={{ color: 'var(--accent-indigo)' }}>{sprint.goal}</span>
              </span>
              <span style={{ fontSize: '0.68rem', background: 'var(--accent-indigo-glow)', color: 'var(--accent-indigo)', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                {sprint.totalCapacityPoints} Story Points
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {sprint.stories.map((story) => (
                <div key={story.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {story.status === 'DONE' ? <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} /> : <Circle size={14} style={{ color: 'var(--text-muted)' }} />}
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: 700 }}>{story.title}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.66rem', color: 'var(--text-secondary)' }}>{story.storyPoints} pts</span>
                    <span style={{ fontSize: '0.64rem', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                      {story.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
