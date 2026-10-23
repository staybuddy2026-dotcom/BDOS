'use client';

import { BuyingReadinessDetails, DataSource, PriorityTier, TIER_BANDS } from '@/features/prioritization/types';
import { ArrowRight, Gauge, UserRound, Briefcase, Kanban, Hand, Share2, Database } from 'lucide-react';
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

const SOURCE_STYLE: Record<'Apollo' | 'LinkedIn', { color: string; bg: string }> = {
  Apollo: { color: '#b45309', bg: 'rgba(245, 158, 11, 0.12)' },
  LinkedIn: { color: '#0a66c2', bg: 'rgba(10, 102, 194, 0.10)' },
};

/** Where a value came from: Apollo, LinkedIn or both. */
export function SourceBadge({ source, label }: { source: DataSource; label?: string }) {
  const parts = source === 'Apollo + LinkedIn' ? (['Apollo', 'LinkedIn'] as const) : [source];
  return (
    <span style={{ display: 'inline-flex', gap: 3, verticalAlign: 'middle' }}>
      {parts.map((p) => (
        <span key={p} style={{ fontSize: '0.62rem', fontWeight: 800, color: SOURCE_STYLE[p].color, background: SOURCE_STYLE[p].bg, borderRadius: 5, padding: '1px 5px', display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
          {p === 'Apollo' ? <Database size={9} /> : <Share2 size={9} />} {label && parts.length === 1 ? label : p}
        </span>
      ))}
    </span>
  );
}

/** "Asked for on LinkedIn", "Tech stack match", "Likely fit". */
export const serviceMatchLabel = (by?: 'linkedin' | 'tech' | 'focus') =>
  by === 'linkedin' ? 'Asked for on LinkedIn' : by === 'focus' ? 'Likely service' : 'Service';

/** One-line summary of the LinkedIn evidence. */
export function linkedinSummary(account: BuyingReadinessDetails): { value: string; detail: string } {
  const ev = account.linkedinEvidence;
  if (!ev) return { value: 'Nothing yet', detail: 'No LinkedIn posts or people saved for this company yet' };
  const scores = ev.posts.map((p) => p.intentScore).filter((x): x is number => x !== undefined);
  if (ev.posts.length) {
    return {
      value: scores.length ? `Intent ${Math.max(...scores)}/100` : `${ev.posts.length} post${ev.posts.length === 1 ? '' : 's'}`,
      detail: `${ev.posts.length} LinkedIn post${ev.posts.length === 1 ? '' : 's'} about a need${ev.people.length ? `, ${ev.people.length} people found` : ''}`,
    };
  }
  if (ev.people.length) return { value: `${ev.people.length} ${ev.people.length === 1 ? 'person' : 'people'}`, detail: `Found on LinkedIn: ${ev.people.map((p) => p.name).join(', ')}` };
  return { value: 'Deal from LinkedIn', detail: 'A deal for this company came in from LinkedIn' };
}

export function displayCompanyName(rawName: string, domain: string): string {
  if (!rawName) return domain || 'Unnamed company';
  let clean = rawName.replace(/\([^)]*\)/g, '').trim().replace(/\.com$/i, '');
  if (clean === clean.toUpperCase()) clean = clean.split(' ').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  return clean || domain;
}

const metricBox = { background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '10px 12px', minWidth: 0 };
const metricLabel = { fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' as const, display: 'flex', alignItems: 'center', flexWrap: 'wrap' as const, gap: '4px' };
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
  const linkedin = linkedinSummary(account);

  return (
    <div
      onClick={() => onSelect(account)}
      className="card-glass"
      style={{
        background: isSelected ? 'var(--bg-primary)' : 'var(--bg-card)',
        border: isSelected ? `2px solid ${style.color}` : `1px solid ${style.border}`,
        borderRadius: '16px',
        padding: isSelected ? '15px' : '16px',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: isSelected ? `0 8px 32px ${style.glow}` : 'var(--glass-shadow)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#ffffff', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            #{rank}
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>{displayCompanyName(account.companyName, account.domain)}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{account.domain}</span>
              <SourceBadge source="Apollo" label={`Apollo ${account.scoreBreakdown.apollo.points}/${account.scoreBreakdown.apollo.max}`} />
              {account.scoreBreakdown.linkedin.found
                ? <SourceBadge source="LinkedIn" label={`LinkedIn ${account.scoreBreakdown.linkedin.points}/${account.scoreBreakdown.linkedin.max}`} />
                : <span title="No LinkedIn posts or people saved for this company yet" style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', border: '1px dashed var(--border-subtle)', borderRadius: 5, padding: '0 5px' }}>LinkedIn: no data yet</span>}
              {account.inCrm && (
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--accent-indigo)', background: 'var(--accent-indigo-glow)', borderRadius: '6px', padding: '1px 6px', display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
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

        <div style={{ textAlign: 'right', flexShrink: 0 }} title={`Apollo company fit ${account.scoreBreakdown.apollo.fitScore}/100 → ${account.scoreBreakdown.apollo.points} of ${account.scoreBreakdown.apollo.max} points\nLinkedIn evidence → ${account.scoreBreakdown.linkedin.points} of ${account.scoreBreakdown.linkedin.max} points`}>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Combined fit</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: style.color, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{account.buyingReadinessScore}<span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>/100</span></div>
          <div style={{ fontSize: '0.64rem', fontWeight: 800, color: style.color, marginTop: 2 }}>{TIER_BANDS[account.priorityTier].label}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
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
        <div style={metricBox} title={contact ? `${contact.name}, ${contact.jobTitle} (from ${contact.source})` : 'No senior contact found in Apollo or on LinkedIn yet'}>
          <div style={{ ...metricLabel, justifyContent: 'space-between' }}><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><UserRound size={12} style={{ color: 'var(--accent-indigo)' }} /> Contact</span>{contact && <SourceBadge source={contact.source} />}</div>
          <div style={{ ...metricValue, color: contact ? 'var(--text-primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{contact ? contact.name : 'None found'}</span>
            {contact && (contact.linkedinUrl || contact.linkedinSearchUrl) && (
              <a
                href={contact.linkedinUrl || contact.linkedinSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                aria-label={contact.linkedinUrl ? `${contact.name} on LinkedIn` : `Find ${contact.name} on LinkedIn`}
                title={contact.linkedinUrl ? 'LinkedIn profile' : 'Find on LinkedIn (profile not on file)'}
                style={{ color: '#0a66c2', display: 'inline-flex', flexShrink: 0 }}
              >
                <Share2 size={13} />
              </a>
            )}
          </div>
        </div>
        <div
          style={metricBox}
          title={service
            ? `${serviceMatchLabel(service.matchedBy)}: ${service.name}. ${service.reason}`
            : account.techFundingCheckedAt ? 'Their tech stack and what they do do not match a service in your catalog' : 'What they do does not point to a service; their tech stack is not checked yet'}
        >
          <div style={{ ...metricLabel, justifyContent: 'space-between' }}><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Briefcase size={12} style={{ color: 'var(--color-warning)' }} /> {serviceMatchLabel(service?.matchedBy)}</span>{service && <SourceBadge source={service.source} />}</div>
          <div style={{ ...metricValue, color: service ? 'var(--color-warning)' : 'var(--text-muted)' }}>
            {service ? service.name : account.techFundingCheckedAt ? 'No match' : 'Not checked yet'}
          </div>
        </div>
        <div style={metricBox} title={linkedin.detail}>
          <div style={metricLabel}><Share2 size={12} style={{ color: '#0a66c2' }} /> LinkedIn</div>
          <div style={{ ...metricValue, color: account.linkedinEvidence ? '#0a66c2' : 'var(--text-muted)' }}>{linkedin.value}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch', flexWrap: 'wrap' }}>
        {account.nextBestActions[0] && (
          <div style={{ flex: '1 1 220px', minWidth: 0, background: 'var(--accent-indigo-glow)', border: '1px solid var(--border-focus)', borderRadius: '10px', padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ minWidth: 0 }}>
              <span style={{ fontSize: '0.62rem', color: 'var(--accent-indigo)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Next step</span>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{account.nextBestActions[0].title}</div>
            </div>
            <ArrowRight size={16} style={{ color: 'var(--accent-indigo)', flexShrink: 0 }} />
          </div>
        )}
        <div onClick={(e) => e.stopPropagation()} style={{ flex: '1 1 170px', minWidth: 0 }} title="Priority tier (a manual choice is saved for the team)">
          <CustomDropdown
            value={account.tierOverride ? account.priorityTier : 'AUTO'}
            onChange={(val) => onTierChange?.(account, val === 'AUTO' ? null : (val as PriorityTier))}
            options={tierOptions(account)}
          />
        </div>
      </div>
    </div>
  );
}
