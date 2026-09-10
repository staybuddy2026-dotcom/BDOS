'use client';

import { DiscoveryMeetingPrep } from '@/features/playbook/types';
import { Target, CheckCircle2 } from 'lucide-react';

export function DiscoveryPrepPanel({ 
  prep = {
    primaryObjective: 'Understand engineering bottlenecks and determine whether a dedicated development team can accelerate Q3 product delivery.',
    secondaryObjectives: [
      'Understand current Q3 feature roadmap deadlines',
      'Identify local hiring bottlenecks & recruitment lag',
      'Review internal engineering capacity vs. backlog',
      'Identify outsourcing & squad extension opportunities',
      'Evaluate AI LLM adoption plans & patient portal features',
    ],
    expectedMeetingOutcomes: [
      'Schedule 45-minute Technical Architecture Workshop',
      'Share formal 2-engineer React + Node squad proposal',
      'Arrange consultation with Tiny Script Chief Architect',
      'Move opportunity to Formal Proposal Stage in BDOS',
    ],
  }
}: { 
  prep?: DiscoveryMeetingPrep;
}) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-focus)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Target size={16} style={{ color: 'var(--accent-indigo)' }} /> AI Discovery Meeting Preparation & Call Objectives
        </h4>
      </div>

      <div style={{ background: 'var(--accent-indigo-glow)', border: '1px solid var(--border-focus)', borderRadius: '8px', padding: '12px' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--accent-indigo)', fontWeight: 800, textTransform: 'uppercase' }}>Primary Meeting Objective</div>
        <div style={{ fontSize: '0.86rem', color: 'var(--text-primary)', fontWeight: 800, marginTop: '4px' }}>
          🎯 {prep.primaryObjective}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
        {/* Secondary Objectives */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--color-success)', fontWeight: 800, marginBottom: '6px' }}>Secondary Discovery Objectives:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {prep.secondaryObjectives.map((obj, idx) => (
              <div key={idx} style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={12} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                <span>{obj}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Expected Outcomes */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--color-warning)', fontWeight: 800, marginBottom: '6px' }}>Target Call Outcomes & Next Steps:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {prep.expectedMeetingOutcomes.map((out, idx) => (
              <div key={idx} style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={12} style={{ color: '#eab308', flexShrink: 0 }} />
                <span>{out}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
