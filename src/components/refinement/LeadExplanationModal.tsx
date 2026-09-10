'use client';

import { LeadExplanation } from '@/features/refinement/types';
import { ShieldCheck, X, CheckCircle2, Zap } from 'lucide-react';

export function LeadExplanationModal({
  explanation,
  onClose
}: {
  explanation: LeadExplanation;
  onClose: () => void;
}) {
  return (
    <div style={{ position: 'fixed', top: 0, right: 0, width: '100%', maxWidth: '660px', height: '100vh', background: '#ffffff', borderLeft: '1px solid var(--border-subtle)', zIndex: 1000, overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '-15px 0 50px rgba(0,0,0,0.08)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', padding: '12px 20px', position: 'sticky', top: 0, zIndex: 10, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)' }}>

        {/* Left Side: Icon + Text Block */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.15)', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={28} style={{ color: '#6366f1' }} fill="rgba(99, 102, 241, 0.15)" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.68rem', color: '#6366f1', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em' }}>AI Lead Intent Score Transparency Engine</span>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0 0 0' }}>
              Why Score {explanation.buyingScore}/100?
            </h2>
            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)', marginTop: '3px' }}>{explanation.companyName} ({explanation.domain})</span>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{ background: '#ffffff', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', padding: '6px', borderRadius: '50%', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'; e.currentTarget.style.color = '#6366f1'; e.currentTarget.style.border = '1px solid rgba(99, 102, 241, 0.3)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.border = '1px solid var(--border-subtle)'; }}
        >
          <X size={20} />
        </button>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Recommended Action Banner */}
        <div style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(59, 130, 246, 0.15))', border: '1px solid rgba(99, 102, 241, 0.4)', borderRadius: '10px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.1)' }}>
          <Zap size={24} style={{ color: '#6366f1', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.8rem', color: '#6366f1', fontWeight: 700, textTransform: 'uppercase' }}>AI Strategic Recommendation</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: '1.4' }}>{explanation.recommendedAction}</div>
          </div>
        </div>

        {/* Verified Signals Checklist */}
        <div style={{ background: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Verified Cross-Provider Signals ({explanation.signals.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {explanation.signals.map((sig, idx) => (
              <div
                key={idx}
                style={{ background: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', transition: 'all 0.2s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.border = '1px solid rgba(99, 102, 241, 0.4)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.05)'; e.currentTarget.style.transform = 'translateX(2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.border = '1px solid var(--border-subtle)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateX(0)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <CheckCircle2 size={18} style={{ color: '#6366f1', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <span style={{ fontSize: '0.68rem', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#6366f1', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      {sig.category}
                    </span>
                    <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '6px' }}>{sig.description}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>Verified: {sig.verifiedAt}</div>
                  </div>
                </div>

                <span style={{ fontSize: '0.82rem', color: '#6366f1', fontWeight: 800, whiteSpace: 'nowrap', padding: '4px 8px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '4px' }}>
                  +{sig.impactScore} Pts
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Financial & Tech Stack Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div
            style={{ background: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px 16px', transition: 'all 0.2s ease', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
            onMouseEnter={(e) => { e.currentTarget.style.border = '1px solid rgba(99, 102, 241, 0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.border = '1px solid var(--border-subtle)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Expected Project Budget</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#6366f1', marginTop: '4px' }}>{explanation.expectedBudgetInr}</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{explanation.expectedBudgetUsd} USD</div>
          </div>

          <div
            style={{ background: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px 16px', transition: 'all 0.2s ease', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
            onMouseEnter={(e) => { e.currentTarget.style.border = '1px solid rgba(99, 102, 241, 0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.border = '1px solid var(--border-subtle)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Expected Squad Size</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#6366f1', marginTop: '4px' }}>{explanation.expectedTeamSize}</div>
          </div>

          <div
            style={{ background: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px 16px', transition: 'all 0.2s ease', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
            onMouseEnter={(e) => { e.currentTarget.style.border = '1px solid rgba(99, 102, 241, 0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.border = '1px solid var(--border-subtle)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Closing Probability</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#6366f1', marginTop: '4px' }}>{explanation.probabilityOfClosingPercent}%</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Est. Timeline: {explanation.expectedTimelineWeeks} Weeks</div>
          </div>
        </div>

        {/* Opportunity Playbook Shortcut */}
        <a
          href={`/company?q=${encodeURIComponent(explanation.companyName)}`}
          style={{
            display: 'block',
            textAlign: 'center',
            padding: '12px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.9rem',
            textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.4)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(99, 102, 241, 0.3)'; }}
          onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(1px)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.3)'; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.4)'; }}
        >
          View Full AI Opportunity Playbook for {explanation.companyName} →
        </a>
      </div>
    </div>
  );
}
