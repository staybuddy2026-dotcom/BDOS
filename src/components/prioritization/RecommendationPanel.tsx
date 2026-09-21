'use client';

import { BuyingReadinessDetails, PriorityTier } from '@/features/prioritization/types';
import { Sparkles, ShieldCheck, ArrowRight, Flame } from 'lucide-react';
import Link from 'next/link';
import { CustomDropdown } from '@/components/CustomDropdown';

function formatCleanCompanyName(rawName: string, domain: string): string {
  if (!rawName) return domain || 'Target Account';
  let clean = rawName.replace(/\([^)]*\)/g, '').trim();
  if (clean.endsWith('.COM') || clean.endsWith('.com')) {
    clean = clean.substring(0, clean.length - 4);
  }
  if (clean === clean.toUpperCase()) {
    clean = clean.split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  }
  return clean || domain;
}

export function RecommendationPanel({ 
  account,
  onTierChange
}: { 
  account: BuyingReadinessDetails;
  onTierChange?: (companyId: string, newTier: PriorityTier) => void;
}) {
  const displayName = formatCleanCompanyName(account.companyName, account.domain);

  const getTierStyle = (tier: PriorityTier) => {
    switch (tier) {
      case 'IMMEDIATE':
        return { label: '🚀 Immediate (Contact Today)', bg: 'var(--accent-indigo-glow)', color: 'var(--accent-indigo)', border: 'var(--border-focus)' };
      case 'HIGH':
        return { label: '⚡ High Priority (Within 24 Hours)', bg: 'var(--accent-violet-glow)', color: 'var(--accent-violet)', border: 'rgba(139, 92, 246, 0.3)' };
      case 'MEDIUM':
        return { label: '✨ Medium Tier (Outreach Sequence)', bg: 'var(--accent-cyan-glow)', color: 'var(--accent-cyan)', border: 'rgba(14, 165, 233, 0.3)' };
      case 'MONITOR':
        return { label: '👀 Active Monitor (Track Signals)', bg: 'rgba(100, 116, 139, 0.08)', color: 'var(--text-muted)', border: 'var(--border-subtle)' };
      default:
        return { label: '⚪ Archive', bg: 'rgba(148, 163, 184, 0.08)', color: '#64748b', border: 'var(--border-subtle)' };
    }
  };

  const tierStyle = getTierStyle(account.priorityTier);

  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 6px 24px rgba(0,0,0,0.04)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--accent-indigo)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>AI Account Prioritization Report</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {displayName} <ShieldCheck size={18} style={{ color: 'var(--accent-indigo)' }} />
          </h2>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{account.domain} • Evaluated {account.lastEvaluatedDate}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: tierStyle.bg, border: `1px solid ${tierStyle.border}`, padding: '8px 16px', borderRadius: '10px', textAlign: 'right' }}>
            <div style={{ fontSize: '0.64rem', color: tierStyle.color, fontWeight: 800, textTransform: 'uppercase' }}>Buying Readiness Score</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: tierStyle.color, lineHeight: 1.1 }}>{account.buyingReadinessScore}<span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>/100</span></div>
          </div>
        </div>
      </div>

      {/* Manual Priority Tier Migration Selector Bar */}
      <div style={{ background: 'var(--bg-secondary)', border: `1.5px solid ${tierStyle.border}`, borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Flame size={16} style={{ color: tierStyle.color }} /> Priority Tier Assignment:
        </div>
        <div style={{ minWidth: '240px' }}>
          <CustomDropdown
            value={account.priorityTier}
            onChange={(val) => onTierChange?.(account.companyId, val as PriorityTier)}
            options={[
              { value: 'IMMEDIATE', label: '🚀 Immediate (Contact Today)' },
              { value: 'HIGH', label: '⚡ High Priority (Within 24 Hours)' },
              { value: 'MEDIUM', label: '✨ Medium Tier (Outreach Sequence)' },
              { value: 'MONITOR', label: '👀 Active Monitor (Track Signals)' },
              { value: 'ARCHIVE', label: '⚪ Archive' }
            ]}
          />
        </div>
      </div>

      {/* Suggested Squad & Pitch */}
      <div style={{ background: 'var(--accent-indigo-glow)', border: '1px solid var(--border-focus)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent-indigo)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={16} /> Recommended Engagement & Pitch Strategy
        </div>
        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.5 }}>&ldquo;{account.recommendedPitch}&rdquo;</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Suggested Squad: <strong style={{ color: 'var(--color-warning)' }}>{account.suggestedSquad}</strong>
        </div>
      </div>

      {/* Recommended Next Best Actions */}
      <div>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>Recommended Next Best Actions</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {account.nextBestActions.map((act) => (
            <div key={act.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '0.64rem', background: 'var(--accent-indigo-glow)', color: 'var(--accent-indigo)', border: '1px solid var(--border-focus)', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, textTransform: 'uppercase' }}>
                  {act.executionPriority}
                </span>
                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '6px' }}>{act.title}</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{act.description}</div>
              </div>

              {act.targetUrl && (
                act.targetUrl.startsWith('http') ? (
                  <a 
                    href={act.targetUrl} 
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '0.78rem', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#ffffff', textDecoration: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
                  >
                    {act.ctaLabel} <ArrowRight size={13} />
                  </a>
                ) : (
                  <Link 
                    href={act.targetUrl} 
                    style={{ fontSize: '0.78rem', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#ffffff', textDecoration: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
                  >
                    {act.ctaLabel} <ArrowRight size={13} />
                  </Link>
                )
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Key Buying Signals Triggered */}
      <div>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>Multi-Provider Signals Triggered</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
          {account.keySignals.map((sig) => (
            <div key={sig.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--accent-indigo)', fontWeight: 800, textTransform: 'uppercase' }}>{sig.provider}</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--color-success)', fontWeight: 800 }}>+{sig.impactScore} pts</span>
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>{sig.title}</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: 1.4 }}>{sig.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
