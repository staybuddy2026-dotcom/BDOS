'use client';

import { AISalesPlaybook } from '@/features/icp/salesPlaybook';
import { BookOpen, UserCheck, HelpCircle, Target, ArrowRight, Zap } from 'lucide-react';

export function SalesPlaybookPanel({ 
  playbook 
}: { 
  playbook: AISalesPlaybook;
}) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-focus)', borderRadius: '14px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '18px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
        <div>
          <span style={{ fontSize: '0.7rem', color: 'var(--accent-indigo)', fontWeight: 800, textTransform: 'uppercase' }}>
            AI Sales Execution Strategy
          </span>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)', margin: '2px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={20} style={{ color: 'var(--accent-indigo)' }} /> BDE Sales Playbook: {playbook.companyName}
          </h3>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.76rem', background: 'var(--color-success-bg)', color: 'var(--color-success)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 10px', borderRadius: '20px', fontWeight: 800 }}>
            {playbook.closingProbabilityPercent}% {playbook.closingProbabilityLabel}
          </span>
        </div>
      </div>

      {/* Grid Layout for Playbook Sections */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
        {/* Recommended Contact */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--accent-indigo)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <UserCheck size={14} /> Recommended First Contact
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '4px' }}>
            {playbook.recommendedContact.rankStars} {playbook.recommendedContact.name}
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {playbook.recommendedContact.title} ({playbook.recommendedContact.confidencePercent}% Match)
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-success)', marginTop: '6px', fontWeight: 700 }}>
            Best Channel: {playbook.recommendedContact.suggestedChannel} • {playbook.recommendedContact.bestTimeToContact}
          </div>
        </div>

        {/* Meeting Objective & Delivery Model */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px' }}>
          <div style={{ fontSize: '0.72rem', color: '#eab308', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Target size={14} /> Meeting Objective & Delivery Model
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', marginTop: '6px', fontWeight: 600 }}>
            {playbook.meetingObjective}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Model: <strong style={{ color: 'var(--accent-indigo)' }}>{playbook.recommendedDeliveryModel}</strong>
          </div>
        </div>
      </div>

      {/* Suggested Opening Line */}
      <div style={{ background: 'var(--accent-indigo-glow)', border: '1px solid var(--border-focus)', borderRadius: '10px', padding: '14px' }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--accent-indigo)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Zap size={14} /> Suggested Opening Line for BDE
        </div>
        <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)', fontStyle: 'italic', marginTop: '6px', fontWeight: 600, lineHeight: 1.4 }}>
          &quot;{playbook.suggestedOpeningLine}&quot;
        </div>
      </div>

      {/* Business Situation & Primary Pain Points */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 800 }}>Business Context & Situation</div>
          <ul style={{ paddingLeft: '18px', margin: '8px 0 0 0', fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {playbook.businessSituation.map((sit, i) => (
              <li key={i}>{sit}</li>
            ))}
          </ul>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--color-danger)', fontWeight: 800 }}>Primary Predicted Pain Points</div>
          <ul style={{ paddingLeft: '18px', margin: '8px 0 0 0', fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {playbook.primaryPainPoints.map((pain, i) => (
              <li key={i}>{pain}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 5-10 Discovery Questions */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px' }}>
        <div style={{ fontSize: '0.74rem', color: 'var(--accent-indigo)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <HelpCircle size={14} /> Recommended BDE Discovery Questions (5 Key Questions)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
          {playbook.discoveryQuestions.map((q, idx) => (
            <div key={idx} style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: '6px' }}>
              {q}
            </div>
          ))}
        </div>
      </div>

      {/* Next Best Action */}
      <div style={{ background: 'var(--color-success-bg)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ArrowRight size={18} style={{ color: 'var(--color-success)' }} />
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-success)', fontWeight: 800, textTransform: 'uppercase' }}>Recommended Next Best Action</div>
            <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)', fontWeight: 700 }}>{playbook.nextBestAction}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
