'use client';

import { CompetitiveFitAnalysis } from '@/features/icp/competitiveFit';
import { Award, CheckCircle2, AlertTriangle } from 'lucide-react';

export function CompetitiveFitPanel({ 
  analysis 
}: { 
  analysis: CompetitiveFitAnalysis;
}) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-focus)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Award size={16} style={{ color: 'var(--accent-indigo)' }} /> Competitive Fit Analysis & Positioning
        </h4>
        <span style={{ fontSize: '0.84rem', fontWeight: 900, color: 'var(--accent-indigo)', background: 'var(--accent-indigo-glow)', padding: '2px 8px', borderRadius: '4px' }}>
          Tiny Script Fit: {analysis.fitScore} / 100
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
        {/* Strengths */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', padding: '12px' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--color-success)', fontWeight: 800, marginBottom: '8px' }}>
            ✔ Key Strengths & Competitive Advantages
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {analysis.strengths.map((str, i) => (
              <div key={i} style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <CheckCircle2 size={12} style={{ color: 'var(--color-success)', marginTop: '3px', flexShrink: 0 }} />
                <span>{str}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Challenges */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(234, 179, 8, 0.2)', borderRadius: '8px', padding: '12px' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--color-warning)', fontWeight: 800, marginBottom: '8px' }}>
            ⚠️ Possible Sales Challenges & Objections
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {analysis.challenges.map((chl, i) => (
              <div key={i} style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <AlertTriangle size={12} style={{ color: '#eab308', marginTop: '3px', flexShrink: 0 }} />
                <span>{chl}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ fontSize: '0.74rem', color: 'var(--accent-indigo)', fontWeight: 700 }}>
        BDE Strategy: {analysis.summary}
      </div>
    </div>
  );
}
