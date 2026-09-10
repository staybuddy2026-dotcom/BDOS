'use client';

import { RevenueActivityEvent } from '@/features/revenue/types';
import { Activity } from 'lucide-react';

export function ActivityTimeline({ events }: { events: RevenueActivityEvent[] }) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} style={{ color: 'var(--accent-indigo)' }} />
          <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Deal Activity Timeline & Audit Log ({events.length})
          </h3>
        </div>

        <span style={{ fontSize: '0.65rem', background: 'var(--accent-indigo-glow)', color: 'var(--accent-indigo)', border: '1px solid var(--border-focus)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
          Immutable Audit Log
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {events.map((evt) => (
          <div key={evt.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
            <div>
              <span style={{ fontSize: '0.64rem', background: 'var(--accent-indigo-glow)', color: 'var(--accent-indigo)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                {evt.eventType}
              </span>
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>{evt.title}</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{evt.description}</div>
            </div>

            <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
              <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>{new Date(evt.timestamp).toLocaleDateString()}</div>
              <div style={{ fontSize: '0.66rem', color: 'var(--accent-indigo)', fontWeight: 700, marginTop: '2px' }}>{evt.performedBy}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
