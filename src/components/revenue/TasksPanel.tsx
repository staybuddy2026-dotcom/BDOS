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
    <div className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl p-[18px] flex flex-col gap-[14px]">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-[999999] bg-[var(--bg-card)] text-[var(--text-primary)] px-3.5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 border-2 border-[var(--accent-indigo)] shadow-[0_12px_32px_rgba(99,102,241,0.2)]">
          <CheckCircle2 size={18} className="text-[var(--accent-indigo)]" /> {toastMsg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare size={18} className="text-[var(--color-success)]" />
          <h3 className="text-[0.94rem] font-extrabold text-[var(--text-primary)] m-0">
            AI Auto-Generated Stage Tasks ({tasks.length})
          </h3>
        </div>

        <span className="text-[0.65rem] bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[rgba(16,185,129,0.3)] px-2 py-0.5 rounded-md font-bold">
          AI Task Engine Active
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {tasks.length === 0 ? (
          <div className="text-[0.76rem] text-[var(--text-muted)] italic py-2">
            No active stage tasks. All tasks completed!
          </div>
        ) : (
          tasks.map((task) => {
            const isDone = task.status === 'COMPLETED';
            return (
              <div 
                key={task.id} 
                className={`rounded-[10px] p-[12px_14px] flex items-center justify-between flex-wrap gap-[10px] ${
                  isDone 
                    ? 'bg-[var(--bg-secondary)] border-dashed border border-[var(--border-subtle)] opacity-75' 
                    : 'bg-[var(--bg-card)] border border-[var(--border-subtle)] opacity-100'
                }`}
              >
                <div>
                  <div className={`text-[0.86rem] font-extrabold text-[var(--text-primary)] ${isDone ? 'line-through' : ''}`}>
                    {task.title}
                  </div>
                  <div className="text-[0.76rem] text-[var(--text-secondary)] mt-[2px]">{task.description}</div>
                  <div className="text-[0.68rem] text-[var(--text-muted)] mt-[4px] flex gap-3">
                    <span>Assignee: <strong className="text-[var(--accent-indigo)]">{task.assignedTo}</strong></span>
                    <span>Due: <strong className="text-[var(--color-warning)]">{task.dueDate}</strong></span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleTaskComplete(task.id)}
                  className={`px-4 py-[7px] rounded-lg text-[0.76rem] text-white font-extrabold cursor-pointer inline-flex items-center gap-[5px] transition-all duration-150 ease-in-out ${
                    isDone 
                      ? 'bg-[#064e3b] border border-[#10b981] shadow-none' 
                      : 'bg-gradient-to-br from-[#10b981] to-[#059669] border-none shadow-[0_2px_8px_rgba(16,185,129,0.3)]'
                  }`}
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
