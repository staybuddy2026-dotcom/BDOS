'use client';

import { XCircle, AlertTriangle } from 'lucide-react';
import { NegativeSignalItem } from '@/features/icp/negativeQualification';

export function WhyNotThisCompany({ 
  negativeSignals = [
    {
      reason: 'Large internal engineering team (> 300 employees)',
      scoreDeduction: 15,
      explanation: 'High likelihood of relying exclusively on in-house development squads.',
      recommendation: 'Target specialized niche outstaffing (e.g. AI LLM RAG module only).',
    },
    {
      reason: 'Legacy monolithic architecture indicators detected on older repos',
      scoreDeduction: 5,
      explanation: 'Requires refactoring strategy prior to rapid feature development.',
      recommendation: 'Propose AWS Cloud Migration & Microservices Modernization audit.',
    },
  ]
}: { 
  negativeSignals?: NegativeSignalItem[];
}) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <XCircle size={16} style={{ color: 'var(--color-danger)' }} /> Why NOT This Company? (Negative Qualification Signals)
      </h4>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {negativeSignals.map((sig, idx) => (
          <div key={idx} style={{ background: 'var(--bg-card)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={12} /> ❌ {sig.reason}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-danger)', fontWeight: 900, background: 'var(--color-danger-bg)', padding: '2px 8px', borderRadius: '4px' }}>
                -{sig.scoreDeduction} pts
              </span>
            </div>

            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{sig.explanation}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--accent-indigo)', fontWeight: 700 }}>BDE Recommendation: {sig.recommendation}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
