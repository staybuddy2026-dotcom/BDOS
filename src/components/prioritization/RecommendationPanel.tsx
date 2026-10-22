'use client';

import Link from 'next/link';
import { Sparkles, ArrowRight, Flame, Mail, UserRound, Briefcase, Zap, Loader2 } from 'lucide-react';
import { BuyingReadinessDetails, PriorityTier, TIER_BANDS } from '@/features/prioritization/types';
import { CustomDropdown } from '@/components/CustomDropdown';
import { displayCompanyName, TIER_STYLE, tierOptions } from './PriorityCard';

const formatDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const ctaStyle = { fontSize: '0.78rem', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#ffffff', textDecoration: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' as const };
const sectionTitle = { fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 12px' };

export function RecommendationPanel({
  account,
  onTierChange,
  onLookUpTechFunding,
  lookingUp = false,
}: {
  account: BuyingReadinessDetails;
  onTierChange?: (account: BuyingReadinessDetails, tier: PriorityTier | null) => void;
  /** Adds tech stack & funding to the score (1 Apollo credit; the dashboard asks first). */
  onLookUpTechFunding?: (account: BuyingReadinessDetails) => void;
  lookingUp?: boolean;
}) {
  const style = TIER_STYLE[account.priorityTier];
  const contact = account.primaryContact;
  const service = account.matchedService;

  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 6px 24px rgba(0,0,0,0.04)', position: 'sticky', top: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--accent-indigo)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Account priority</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', margin: '4px 0 0 0' }}>{displayCompanyName(account.companyName, account.domain)}</h2>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
            {account.domain} · Data from {formatDay(account.lastEvaluatedDate)}
            <Link href={`/company?query=${encodeURIComponent(account.domain)}`} style={{ color: 'var(--accent-indigo)', marginLeft: 8, fontWeight: 700 }}>Open in Company 360</Link>
          </span>
        </div>
        <div style={{ background: style.bg, border: `1px solid ${style.border}`, padding: '8px 16px', borderRadius: '10px', textAlign: 'right' }}>
          <div style={{ fontSize: '0.64rem', color: style.color, fontWeight: 800, textTransform: 'uppercase' }}>Fit score</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: style.color, lineHeight: 1.1 }}>{account.buyingReadinessScore}<span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>/100</span></div>
        </div>
      </div>

      {/* Tier */}
      <div style={{ background: 'var(--bg-secondary)', border: `1.5px solid ${style.border}`, borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Flame size={16} style={{ color: style.color }} /> {TIER_BANDS[account.priorityTier].label}: {TIER_BANDS[account.priorityTier].when}</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {account.tierOverride
              ? `Set by ${account.tierOverride.setBy} on ${formatDay(account.tierOverride.setAt)} (the score alone gives ${TIER_BANDS[account.scoredTier].label})`
              : 'Set automatically from the score. A manual choice is saved for the whole team.'}
          </span>
        </div>
        <div style={{ minWidth: '240px' }}>
          <CustomDropdown
            value={account.tierOverride ? account.priorityTier : 'AUTO'}
            onChange={(val) => onTierChange?.(account, val === 'AUTO' ? null : (val as PriorityTier))}
            options={tierOptions(account)}
          />
        </div>
      </div>

      {/* Contact + service */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '12px 14px' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5 }}><UserRound size={12} /> Decision maker</div>
          {contact ? (
            <>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{contact.name}</div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>{contact.jobTitle}</div>
              {contact.email && <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={12} /> {contact.email}</div>}
            </>
          ) : (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>None found yet in Apollo.</div>
          )}
        </div>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '12px 14px' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5 }}><Briefcase size={12} /> {service?.matchedBy === 'focus' ? 'Likely service (from what they do)' : 'Matching service'}</div>
          {service ? (
            <>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{service.name}</div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                {[service.fromInr, service.fromUsd && `(${service.fromUsd.replace(/^From /, '')})`, service.model].filter(Boolean).join(' · ')}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
                {service.reason} Starting price from your service catalog.
                {service.matchedBy === 'focus' && !account.techFundingCheckedAt && ' Confirm with the tech stack lookup.'}
              </div>
            </>
          ) : (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
              {account.techFundingCheckedAt
                ? 'Neither their tech stack nor what they do matches a service in your catalog.'
                : 'What they do does not point to one of your services, and their tech stack is not checked yet.'}
            </div>
          )}
        </div>
      </div>

      {/* Pitch */}
      <div style={{ background: 'var(--accent-indigo-glow)', border: '1px solid var(--border-focus)', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent-indigo)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={16} /> Suggested angle
        </div>
        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.5 }}>{account.recommendedPitch}</div>
      </div>

      {/* Next steps */}
      <div>
        <h4 style={sectionTitle}>Next steps</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {account.nextBestActions.map((act) => (
            <div key={act.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <span style={{ fontSize: '0.64rem', background: 'var(--accent-indigo-glow)', color: 'var(--accent-indigo)', border: '1px solid var(--border-focus)', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, textTransform: 'uppercase' }}>
                  {act.executionPriority}
                </span>
                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '6px' }}>{act.title}</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.45 }}>{act.description}</div>
              </div>
              {act.targetUrl && (act.targetUrl.startsWith('http')
                ? <a href={act.targetUrl} target="_blank" rel="noopener noreferrer" style={ctaStyle}>{act.ctaLabel} <ArrowRight size={13} /></a>
                : <Link href={act.targetUrl} style={ctaStyle}>{act.ctaLabel} <ArrowRight size={13} /></Link>)}
            </div>
          ))}
        </div>
      </div>

      {/* What is known (data coverage) */}
      {account.dataChecklist.length > 0 && (
        <div>
          <h4 style={sectionTitle}>
            What we know · {account.dataCoveragePercent}% <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.78rem' }}>({account.dataChecklist.filter((e) => e.known).length} of {account.dataChecklist.length} facts)</span>
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 6 }}>
            {account.dataChecklist.map((e) => (
              <div key={e.label} title={e.known ? undefined : e.hint} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.78rem', padding: '7px 10px', borderRadius: 8, background: e.known ? 'rgba(16,185,129,0.07)' : 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontWeight: 800, color: e.known ? 'var(--color-success)' : 'var(--text-muted)' }}>{e.known ? '✓' : '–'}</span>
                <span>
                  <span style={{ fontWeight: 700, color: e.known ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{e.label}</span>
                  {!e.known && e.hint && <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{e.hint}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Why this score */}
      <div>
        <h4 style={sectionTitle}>Why this score</h4>
        {/* Apollo company search has no tech stack or funding; they are looked up only when asked (1 credit). */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', background: 'var(--bg-secondary)', border: '1px dashed var(--border-subtle)', borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.45, flex: 1, minWidth: 220 }}>
            {account.techFundingCheckedAt
              ? `Tech stack and funding checked on ${formatDay(account.techFundingCheckedAt)}.`
              : 'Tech stack and funding are not checked yet (Apollo search does not include them), so service fit and funding may score low.'}
          </span>
          {!account.techFundingCheckedAt && onLookUpTechFunding && (
            <button
              type="button"
              onClick={() => onLookUpTechFunding(account)}
              disabled={lookingUp}
              style={{ fontSize: '0.76rem', fontWeight: 800, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border-focus)', background: 'var(--accent-indigo-glow)', color: 'var(--accent-indigo)', cursor: lookingUp ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
            >
              {lookingUp ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={13} />} Get tech stack &amp; funding · 1 credit
            </button>
          )}
        </div>
        {account.keySignals.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {account.keySignals.map((sig) => (
              <div key={sig.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>{sig.title}</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>{sig.description}</div>
                </div>
                <span style={{ fontSize: '0.74rem', color: 'var(--color-success)', fontWeight: 800, whiteSpace: 'nowrap' }}>+{sig.impactScore}</span>
              </div>
            ))}
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textAlign: 'right', fontWeight: 700 }}>
              Total {account.buyingReadinessScore}/100
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Apollo returned no usable signals for this company yet.</div>
        )}
      </div>
    </div>
  );
}
