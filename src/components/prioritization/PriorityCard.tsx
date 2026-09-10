'use client';

import { BuyingReadinessDetails, PriorityTier } from '@/features/prioritization/types';
import { ArrowRight, ShieldCheck, Zap, TrendingUp, Clock } from 'lucide-react';

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

export function PriorityCard({ 
  account, 
  rank, 
  onSelect,
  onTierChange
}: { 
  account: BuyingReadinessDetails; 
  rank: number; 
  onSelect: (acc: BuyingReadinessDetails) => void;
  onTierChange?: (companyId: string, newTier: PriorityTier) => void;
}) {
  const getTierStyle = (tier: PriorityTier) => {
    switch (tier) {
      case 'IMMEDIATE':
        return { label: '🔥 Immediate', bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.4)', glow: 'rgba(239, 68, 68, 0.2)' };
      case 'HIGH':
        return { label: '🟢 High Priority', bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: 'rgba(16, 185, 129, 0.4)', glow: 'rgba(16, 185, 129, 0.2)' };
      case 'MEDIUM':
        return { label: '🟡 Medium Tier', bg: 'rgba(234, 179, 8, 0.12)', color: '#f59e0b', border: 'rgba(234, 179, 8, 0.4)', glow: 'rgba(234, 179, 8, 0.2)' };
      case 'MONITOR':
        return { label: '🔵 Active Monitor', bg: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', border: 'rgba(99, 102, 241, 0.4)', glow: 'rgba(99, 102, 241, 0.2)' };
      default:
        return { label: '⚪ Archive', bg: 'rgba(148, 163, 184, 0.12)', color: '#64748b', border: 'rgba(148, 163, 184, 0.4)', glow: 'transparent' };
    }
  };

  const tierStyle = getTierStyle(account.priorityTier);
  const displayName = formatCleanCompanyName(account.companyName, account.domain);

  return (
    <div 
      onClick={() => onSelect(account)}
      className="card-glass"
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${tierStyle.border}`,
        borderRadius: '16px',
        padding: '20px',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 6px 24px rgba(0,0,0,0.04)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            fontSize: '0.78rem',
            fontWeight: 900,
            color: '#ffffff',
            background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
            flexShrink: 0,
          }}>
            #{rank}
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              {displayName} <ShieldCheck size={17} style={{ color: 'var(--accent-indigo)' }} />
            </h3>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 500 }}>{account.domain}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em' }}>Buying Score</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: tierStyle.color, lineHeight: 1.1 }}>{account.buyingReadinessScore}<span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>/100</span></div>
          </div>

          {/* Styled Priority Tier Selector Pill */}
          <select
            value={account.priorityTier}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              onTierChange?.(account.companyId, e.target.value as PriorityTier);
            }}
            style={{
              fontSize: '0.78rem',
              fontWeight: 800,
              background: tierStyle.bg,
              color: tierStyle.color,
              border: `1.5px solid ${tierStyle.border}`,
              padding: '6px 12px',
              borderRadius: '10px',
              cursor: 'pointer',
              outline: 'none',
              boxShadow: `0 2px 8px ${tierStyle.glow}`,
              fontFamily: 'inherit',
            }}
          >
            <option value="IMMEDIATE">🔥 Immediate</option>
            <option value="HIGH">🟢 High Priority</option>
            <option value="MEDIUM">🟡 Medium Tier</option>
            <option value="MONITOR">🔵 Active Monitor</option>
            <option value="ARCHIVE">⚪ Archive</option>
          </select>
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={12} style={{ color: 'var(--color-success)' }} /> Win Probability
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-success)', marginTop: '3px' }}>{account.winProbabilityPercent}%</div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Zap size={12} style={{ color: 'var(--color-warning)' }} /> Target Deal Value
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-warning)', marginTop: '3px' }}>{account.estimatedDealValueInr}</div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={12} style={{ color: 'var(--accent-indigo)' }} /> Sales Cycle
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--accent-indigo)', marginTop: '3px' }}>{account.expectedSalesCycle}</div>
        </div>
      </div>

      {/* Recommended Next Action Row */}
      {account.nextBestActions.length > 0 && (
        <div style={{ background: 'var(--accent-indigo-glow)', border: '1px solid var(--border-focus)', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div>
            <span style={{ fontSize: '0.66rem', color: 'var(--accent-indigo)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Recommended Next Best Action</span>
            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>{account.nextBestActions[0].title}</div>
          </div>
          <span style={{ fontSize: '0.76rem', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', color: '#ffffff', padding: '6px 12px', borderRadius: '8px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '5px', boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)' }}>
            Review Actions <ArrowRight size={13} />
          </span>
        </div>
      )}
    </div>
  );
}
