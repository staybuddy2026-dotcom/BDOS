'use client';

import { WhyTinyScriptFit } from '@/features/playbook/types';
import { ShieldCheck } from 'lucide-react';

export function WhyTinyScriptPanel({ 
  whyFit = {
    technicalFit: { scorePercent: 98, explanation: 'Hiring React & Node.js engineers; Tiny Script has deep MERN & Next.js 16 mastery.', signals: ['Apollo 4 Open Engineer Positions', 'GitHub Active React Repos'] },
    businessFit: { scorePercent: 96, explanation: 'Recently raised Series A funding; Tiny Script specializes in helping funded SaaS startups scale fast.', signals: ['Crunchbase Series A Feed'] },
    deliveryFit: { scorePercent: 94, explanation: 'Dedicated squad outstaffing model eliminates 60+ day local hiring delays with immediate 48h onboarding.', signals: ['Verified Local Hiring Lag'] },
    growthFit: { scorePercent: 95, explanation: 'Expanding AI patient features; Tiny Script delivers ready-to-deploy LLM & RAG integrations.', signals: ['Product Hunt AI Patient Feature Signals'] },
  }
}: { 
  whyFit?: WhyTinyScriptFit;
}) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-focus)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={16} style={{ color: 'var(--accent-indigo)' }} /> &quot;Why Tiny Script?&quot; Value Recommendation Engine
        </h4>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
        {/* Technical Fit */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--color-success)', fontWeight: 800 }}>⚡ Technical Fit</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-success)', fontWeight: 900, background: 'var(--color-success-bg)', padding: '2px 6px', borderRadius: '4px' }}>
              {whyFit.technicalFit.scorePercent}% Match
            </span>
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{whyFit.technicalFit.explanation}</div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '6px' }}>Signals: {whyFit.technicalFit.signals.join(' • ')}</div>
        </div>

        {/* Business Fit */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-focus)', borderRadius: '8px', padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--accent-indigo)', fontWeight: 800 }}>💼 Business Fit</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--accent-indigo)', fontWeight: 900, background: 'var(--accent-indigo-glow)', padding: '2px 6px', borderRadius: '4px' }}>
              {whyFit.businessFit.scorePercent}% Match
            </span>
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{whyFit.businessFit.explanation}</div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '6px' }}>Signals: {whyFit.businessFit.signals.join(' • ')}</div>
        </div>

        {/* Delivery Fit */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(234, 179, 8, 0.25)', borderRadius: '8px', padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--color-warning)', fontWeight: 800 }}>🚀 Delivery Fit</span>
            <span style={{ fontSize: '0.72rem', color: '#eab308', fontWeight: 900, background: 'var(--color-warning-bg)', padding: '2px 6px', borderRadius: '4px' }}>
              {whyFit.deliveryFit.scorePercent}% Match
            </span>
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{whyFit.deliveryFit.explanation}</div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '6px' }}>Signals: {whyFit.deliveryFit.signals.join(' • ')}</div>
        </div>

        {/* Growth Fit */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(168, 85, 247, 0.25)', borderRadius: '8px', padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.74rem', color: '#c084fc', fontWeight: 800 }}>📈 Growth Fit</span>
            <span style={{ fontSize: '0.72rem', color: '#c084fc', fontWeight: 900, background: 'rgba(168, 85, 247, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
              {whyFit.growthFit.scorePercent}% Match
            </span>
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{whyFit.growthFit.explanation}</div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '6px' }}>Signals: {whyFit.growthFit.signals.join(' • ')}</div>
        </div>
      </div>
    </div>
  );
}
