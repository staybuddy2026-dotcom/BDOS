'use client';

import { useState } from 'react';
import { RevenueTask } from '@/features/revenue/types';
import { CheckSquare, CheckCircle2, Check } from 'lucide-react';

export function TasksPanel({ tasks: initialTasks }: { tasks: RevenueTask[] }) {
  const [tasks, setTasks] = useState<RevenueTask[]>(initialTasks);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleToggleTaskComplete = (taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const nextStatus = t.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
        return { ...t, status: nextStatus };
      }
      return t;
    }));

    const target = tasks.find(t => t.id === taskId);
    if (target) {
      setToastMsg(`Task "${target.title}" marked as completed! Stage progress updated.`);
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {toastMsg && (
        <div style={{ background: '#064e3b', color: '#ffffff', padding: '10px 14px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', border: '1.5px solid #10b981' }}>
          <CheckCircle2 size={16} style={{ color: '#34d399' }} /> {toastMsg}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckSquare size={18} style={{ color: 'var(--color-success)' }} />
          <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            AI Auto-Generated Stage Tasks ({tasks.length})
          </h3>
        </div>

        <span style={{ fontSize: '0.65rem', background: 'var(--color-success-bg)', color: 'var(--color-success)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
          AI Task Engine Active
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {tasks.length === 0 ? (
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
            No active stage tasks. All tasks completed!
          </div>
        ) : (
          tasks.map((task) => {
            const isDone = task.status === 'COMPLETED';
            return (
              <div key={task.id} style={{ background: isDone ? 'var(--bg-secondary)' : 'var(--bg-card)', border: isDone ? '1px dashed var(--border-subtle)' : '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', opacity: isDone ? 0.75 : 1 }}>
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-primary)', textDecoration: isDone ? 'line-through' : 'none' }}>
                    {task.title}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{task.description}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '12px' }}>
                    <span>Assignee: <strong style={{ color: 'var(--accent-indigo)' }}>{task.assignedTo}</strong></span>
                    <span>Due: <strong style={{ color: 'var(--color-warning)' }}>{task.dueDate}</strong></span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleTaskComplete(task.id)}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '8px',
                    fontSize: '0.76rem',
                    background: isDone ? '#064e3b' : 'linear-gradient(135deg, #10b981, #059669)',
                    border: isDone ? '1px solid #10b981' : 'none',
                    color: '#ffffff',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxShadow: isDone ? 'none' : '0 2px 8px rgba(16, 185, 129, 0.3)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Check size={14} /> {isDone ? 'Completed' : 'Mark Completed'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
