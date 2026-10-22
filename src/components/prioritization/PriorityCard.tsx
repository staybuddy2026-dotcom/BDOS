'use client';

import { BuyingReadinessDetails, PriorityTier, TIER_BANDS } from '@/features/prioritization/types';
import { ArrowRight, Gauge, UserRound, Briefcase, Kanban, Hand } from 'lucide-react';
import { CustomDropdown } from '@/components/CustomDropdown';

export const TIER_STYLE: Record<PriorityTier, { color: string; bg: string; border: string; glow: string }> = {
  IMMEDIATE: { bg: 'var(--accent-indigo-glow)', color: 'var(--accent-indigo)', border: 'var(--border-focus)', glow: 'rgba(99, 102, 241, 0.15)' },
  HIGH: { bg: 'var(--accent-violet-glow)', color: 'var(--accent-violet)', border: 'rgba(139, 92, 246, 0.3)', glow: 'rgba(139, 92, 246, 0.15)' },
  MEDIUM: { bg: 'var(--accent-cyan-glow)', color: 'var(--accent-cyan)', border: 'rgba(14, 165, 233, 0.3)', glow: 'rgba(14, 165, 233, 0.15)' },
  MONITOR: { bg: 'rgba(100, 116, 139, 0.08)', color: 'var(--text-muted)', border: 'var(--border-subtle)', glow: 'transparent' },
  ARCHIVE: { bg: 'rgba(148, 163, 184, 0.08)', color: '#64748b', border: 'var(--border-subtle)', glow: 'transparent' },
};

/** Tier choices: the score's own tier first ("Automatic"), then a manual choice saved for the team. */
export function tierOptions(account: BuyingReadinessDetails) {
  return [
    { value: 'AUTO', label: `Automatic: ${TIER_BANDS[account.scoredTier].label}` },
    ...(['IMMEDIATE', 'HIGH', 'MEDIUM', 'MONITOR', 'ARCHIVE'] as PriorityTier[]).map((t) => ({ value: t, label: `${TIER_BANDS[t].label} (${TIER_BANDS[t].when.toLowerCase()})` })),
  ];
}

export function displayCompanyName(rawName: string, domain: string): string {
  if (!rawName) return domain || 'Unnamed company';
  let clean = rawName.replace(/\([^)]*\)/g, '').trim().replace(/\.com$/i, '');
  if (clean === clean.toUpperCase()) clean = clean.split(' ').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  return clean || domain;
}

const metricBox = { background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '10px 12px', minWidth: 0 };
const metricLabel = { fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' as const, display: 'flex', alignItems: 'center', gap: '4px' };
const metricValue = { fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const };

export function PriorityCard({
  account,
  rank,
  isSelected,
  onSelect,
  onTierChange,
}: {
  account: BuyingReadinessDetails;
  rank: number;
  isSelected?: boolean;
  onSelect: (acc: BuyingReadinessDetails) => void;
  onTierChange?: (account: BuyingReadinessDetails, tier: PriorityTier | null) => void;
}) {
  const style = TIER_STYLE[account.priorityTier];
  const contact = account.primaryContact;
  const service = account.matchedService;

  return (
    <div
      onClick={() => onSelect(account)}
      className="card-glass"
      style={{
        background: isSelected ? 'var(--bg-primary)' : 'var(--bg-card)',
        border: isSelected ? `2px solid ${style.color}` : `1px solid ${style.border}`,
        borderRadius: '16px',
        padding: isSelected ? '17px' : '18px',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: isSelected ? `0 8px 32px ${style.glow}` : 'var(--glass-shadow)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#ffffff', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            #{rank}
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>{displayCompanyName(account.companyName, account.domain)}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{account.domain}</span>
              {account.inCrm && (
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--accent-indigo)', background: 'var(--accent-indigo-glow)', borderRadius: '6px', padding: '1px 6px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <Kanban size={10} /> In CRM{account.inCrm.mine ? '' : ` · ${account.inCrm.ownerName || 'teammate'}`}
                </span>
              )}
              {account.tierOverride && (
                <span title={`Tier set by ${account.tierOverride.setBy}; the score alone gives ${TIER_BANDS[account.scoredTier].label}`} style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '1px 6px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <Hand size={10} /> Set by {account.tierOverride.setBy}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em' }}>Fit score</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: style.color, lineHeight: 1.1 }}>{account.buyingReadinessScore}<span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>/100</span></div>
          </div>
          <div onClick={(e) => e.stopPropagation()} style={{ minWidth: '170px' }}>
            <CustomDropdown
              value={account.tierOverride ? account.priorityTier : 'AUTO'}
              onChange={(val) => onTierChange?.(account, val === 'AUTO' ? null : (val as PriorityTier))}
              options={tierOptions(account)}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
        <div style={metricBox} title={account.dataChecklist.map((e) => `${e.known ? '✓' : '✗'} ${e.label}`).join('\n') || 'How much is known about this company'}>
          <div style={metricLabel}><Gauge size={12} style={{ color: 'var(--color-success)' }} /> Data coverage</div>
          <div style={{ ...metricValue, color: account.dataCoveragePercent >= 60 ? 'var(--color-success)' : account.dataCoveragePercent >= 40 ? 'var(--color-warning)' : 'var(--text-muted)' }}>
            {account.dataCoveragePercent}%
            {account.dataChecklist.length > 0 && (
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', marginLeft: 6 }}>
                {account.dataChecklist.filter((e) => e.known).length} of {account.dataChecklist.length} facts
              </span>
            )}
          </div>
        </div>
        <div style={metricBox} title={contact ? `${contact.name}, ${contact.jobTitle}` : 'No senior contact found yet'}>
          <div style={metricLabel}><UserRound size={12} style={{ color: 'var(--accent-indigo)' }} /> Contact</div>
          <div style={{ ...metricValue, color: contact ? 'var(--text-primary)' : 'var(--text-muted)' }}>{contact ? contact.name : 'None found'}</div>
        </div>
        <div
          style={metricBox}
          title={service
            ? `${service.matchedBy === 'focus' ? 'Likely fit' : 'Tech stack match'}: ${service.name}. ${service.reason}`
            : account.techFundingCheckedAt ? 'Their tech stack and what they do do not match a service in your catalog' : 'What they do does not point to a service; their tech stack is not checked yet'}
        >
          <div style={metricLabel}><Briefcase size={12} style={{ color: 'var(--color-warning)' }} /> {service?.matchedBy === 'focus' ? 'Likely service' : 'Service'}</div>
          <div style={{ ...metricValue, color: service ? 'var(--color-warning)' : 'var(--text-muted)' }}>
            {service ? service.name : account.techFundingCheckedAt ? 'No match' : 'Not checked yet'}
          </div>
        </div>
      </div>

      {account.nextBestActions[0] && (
        <div style={{ background: 'var(--accent-indigo-glow)', border: '1px solid var(--border-focus)', borderRadius: '10px', padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: '0.66rem', color: 'var(--accent-indigo)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Next step</span>
            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>{account.nextBestActions[0].title}</div>
          </div>
          <ArrowRight size={16} style={{ color: 'var(--accent-indigo)', flexShrink: 0 }} />
        </div>
      )}
    </div>
  );
}
