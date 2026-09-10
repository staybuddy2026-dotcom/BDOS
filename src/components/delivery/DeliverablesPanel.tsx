'use client';

import { DeliveryTask } from '@/features/delivery/types';
import { CheckSquare, CheckCircle2, Circle } from 'lucide-react';

export function DeliverablesPanel({ tasks }: { tasks: DeliveryTask[] }) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckSquare size={18} style={{ color: 'var(--accent-indigo)' }} />
          <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Delivery Task Engine & Technical Checklist ({tasks.length} Tasks)
          </h3>
        </div>

        <span style={{ fontSize: '0.65rem', background: 'var(--accent-indigo-glow)', color: 'var(--accent-indigo)', border: '1px solid var(--border-focus)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
          Auto-Generated Tasks
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {tasks.map((task) => (
          <div key={task.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {task.status === 'DONE' ? <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} /> : <Circle size={16} style={{ color: 'var(--text-muted)' }} />}
              <div>
                <span style={{ fontSize: '0.64rem', background: 'var(--accent-indigo-glow)', color: 'var(--accent-indigo)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                  {task.category}
                </span>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>{task.title}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Assignee: <strong style={{ color: 'var(--accent-indigo)' }}>{task.assignedTo}</strong></span>
              <span style={{ fontSize: '0.66rem', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                {task.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
