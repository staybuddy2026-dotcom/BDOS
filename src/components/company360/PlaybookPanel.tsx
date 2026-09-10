'use client';

import { PlaybookTimelineStep } from '@/features/copilot/types';
import { Calendar, ChevronRight } from 'lucide-react';

export function PlaybookPanel({ 
  playbook = [
    { dayNumber: 1, channel: 'LINKEDIN', actionTitle: 'LinkedIn Connection Request', description: 'Send connection invite to CTO Dr. Rajesh Kumar congratulating on recent Series A.' },
    { dayNumber: 2, channel: 'EMAIL', actionTitle: 'Personalized Cold Email Outreach', description: 'Send Email #1 highlighting React 19 & Node.js squad extension capabilities.' },
    { dayNumber: 4, channel: 'LINKEDIN', actionTitle: 'LinkedIn InMail Touchpoint', description: 'Follow up mentioning local hiring gaps and sharing Healthcare SaaS case study.' },
    { dayNumber: 7, channel: 'CASE_STUDY', actionTitle: 'Technical Case Study Sharing', description: 'Send Tiny Script AWS Cloud & AI LLM integration architecture whitepaper.' },
    { dayNumber: 10, channel: 'DISCOVERY_MEETING', actionTitle: 'Discovery Meeting Invitation', description: 'Invite CTO to 20-minute Technical Discovery Call with Solutions Architect.' },
    { dayNumber: 14, channel: 'EMAIL', actionTitle: 'Final Value Follow-up', description: 'Send concise break-away touchpoint before enrolling lead in monthly content nurture.' },
  ]
}: { 
  playbook?: PlaybookTimelineStep[];
}) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-focus)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={16} style={{ color: 'var(--accent-indigo)' }} /> Recommended 14-Day Sales Sequence & Outreach Schedule
        </h4>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {playbook.map((step, idx) => (
          <div key={idx} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ background: 'var(--accent-indigo-glow)', border: '1px solid var(--border-focus)', color: 'var(--accent-indigo)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 900, whiteSpace: 'nowrap' }}>
              Day {step.dayNumber}
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ChevronRight size={14} style={{ color: 'var(--accent-indigo)' }} /> {step.actionTitle} ({step.channel})
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{step.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
