'use client';

import { TeamMember } from '@/features/delivery/types';
import { Users } from 'lucide-react';

export function TeamAssignment({ team }: { team: TeamMember[] }) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={18} style={{ color: 'var(--accent-indigo)' }} />
          <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            AI-Allocated Senior Engineering Squad ({team.length} Members)
          </h3>
        </div>

        <span style={{ fontSize: '0.65rem', background: 'var(--accent-indigo-glow)', color: 'var(--accent-indigo)', border: '1px solid var(--border-focus)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
          Optimal Skill Matching Active
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
        {team.map((mem) => (
          <div key={mem.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <strong style={{ fontSize: '0.84rem', color: 'var(--text-primary)' }}>{mem.name}</strong>
              <span style={{ fontSize: '0.66rem', background: 'var(--color-success-bg)', color: 'var(--color-success)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                {mem.allocationPercent}% Capacity
              </span>
            </div>

            <div style={{ fontSize: '0.72rem', color: 'var(--accent-indigo)', fontWeight: 700 }}>
              {mem.role.replace(/_/g, ' ')}
            </div>

            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Skills: {mem.skills.join(', ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
