'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Flame, Filter, CheckCircle2, AlertTriangle, Target, UserRound, IndianRupee, Info, Sparkles, Link2, Loader2, X, Share2 } from 'lucide-react';
import { addLinkedInAccountAction, lookUpTechAndFundingAction, setPriorityTierAction } from '@/features/prioritization/actions';
import { BuyingReadinessDetails, PrioritiesResult, PrioritizationSummary, PriorityTier, TIER_BANDS } from '@/features/prioritization/types';
import { generateNextBestActions } from '@/features/prioritization/recommendations';
import layout from './priorities.module.css';
import { PriorityCard } from './PriorityCard';
import { RecommendationPanel } from './RecommendationPanel';

const TIER_ORDER: PriorityTier[] = ['IMMEDIATE', 'HIGH', 'MEDIUM', 'MONITOR', 'ARCHIVE'];
const TIER_COLOR: Record<PriorityTier, string> = {
  IMMEDIATE: 'var(--accent-indigo)', HIGH: 'var(--accent-violet)', MEDIUM: 'var(--accent-cyan)', MONITOR: 'var(--text-muted)', ARCHIVE: '#64748b',
};

/** "80+", "65-79" ... straight from the scoring bands, so labels can never disagree with the score. */
export function tierRange(tier: PriorityTier): string {
  const i = TIER_ORDER.indexOf(tier);
  const min = TIER_BANDS[tier].min;
  if (i === 0) return `${min}+`;
  const above = TIER_BANDS[TIER_ORDER[i - 1]].min - 1;
  return min === 0 ? `under ${above + 1}` : `${min}–${above}`;
}

const kpiCard = (accent: string) => ({
  background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderTop: `3px solid ${accent}`, borderRadius: '14px', padding: '16px', boxShadow: 'var(--glass-shadow)',
});
const kpiLabel = { fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.04em' };
const kpiSub = { fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '3px', fontWeight: 600 };

export function PriorityDashboard({ initial }: { initial: PrioritiesResult }) {
  const [accounts, setAccounts] = useState<BuyingReadinessDetails[]>(initial.accounts);
  const [summary, setSummary] = useState<PrioritizationSummary>(initial.summary);
  const [pendingCount, setPendingCount] = useState<number>(initial.pendingCount);
  const [notFoundDomains, setNotFoundDomains] = useState<string[]>(initial.notFoundDomains);
  const [selectedFilter, setSelectedFilter] = useState<PriorityTier | 'ALL'>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(initial.accounts[0]?.companyId ?? null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);

  // Paste LinkedIn URL state
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const notify = (text: string, error = false) => {
    setToast({ text, error });
    setTimeout(() => setToast(null), 4000);
  };

  const handleAddLinkedIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const url = linkedinUrl.trim();
    if (!url) {
      setAddError('Paste a LinkedIn company page or profile URL first.');
      return;
    }
    setAddError(null);
    setIsAdding(true);
    try {
      const res = await addLinkedInAccountAction(url);
      if (res.error) {
        setAddError(res.error);
        notify(res.error, true);
        return;
      }
      if (res.result) {
        setAccounts(res.result.accounts);
        setSummary(res.result.summary);
        setPendingCount(res.result.pendingCount);
        setNotFoundDomains(res.result.notFoundDomains);

        // Auto-select and display the newly added account
        const targetDomain = res.domain?.toLowerCase();
        const added = res.result.accounts.find((a) => a.domain.toLowerCase() === targetDomain);
        if (added) {
          setSelectedId(added.companyId);
          setSelectedFilter('ALL');
        }
      }
      setLinkedinUrl('');
      notify(res.message || 'Account added to AI Priorities!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not add this account. Please try again.';
      setAddError(msg);
      notify(msg, true);
    } finally {
      setIsAdding(false);
    }
  };

  // Saved for the whole team. The card moves straight away and moves back if saving fails.
  const handleTierChange = async (account: BuyingReadinessDetails, tier: PriorityTier | null) => {
    const previous = accounts;
    const nextTier = tier || account.scoredTier;
    // The next steps depend on the tier (urgency, which steps), so they are rebuilt with it.
    setAccounts((list) => list.map((a) => {
      if (a.companyId !== account.companyId) return a;
      const updated = { ...a, priorityTier: nextTier, tierOverride: tier ? { tier, setBy: 'you', setAt: new Date().toISOString() } : undefined };
      return { ...updated, nextBestActions: generateNextBestActions(updated) };
    }));
    const res = await setPriorityTierAction(account.domain, tier);
    if (res.error) {
      setAccounts(previous);
      notify(res.error, true);
      return;
    }
    notify(tier
      ? `${account.companyName} set to ${TIER_BANDS[tier].label} for the whole team.`
      : `${account.companyName} is back on its score's tier (${TIER_BANDS[account.scoredTier].label}).`);
  };

  // Tech stack & funding for one account (1 Apollo credit). The account is rescored and may change tier.
  const [lookingUpId, setLookingUpId] = useState<string | null>(null);
  const handleLookUp = async (account: BuyingReadinessDetails) => {
    if (lookingUpId) return;
    if (!window.confirm(`Look up the tech stack and funding of ${account.companyName}? This uses 1 Apollo credit.`)) return;
    setLookingUpId(account.companyId);
    try {
      const res = await lookUpTechAndFundingAction(account.domain);
      if (res.error || !res.account) return notify(res.error || 'The Apollo lookup failed. Please try again.', true);
      const next = res.account;
      setAccounts((list) => list.map((a) => (a.companyId === account.companyId ? next : a)));
      const diff = next.buyingReadinessScore - account.buyingReadinessScore;
      notify(`${next.companyName}: combined fit ${account.buyingReadinessScore} → ${next.buyingReadinessScore}${diff === 0 ? ' (no tech stack or funding on file)' : ''}.`);
    } catch {
      notify('The Apollo lookup failed. Please try again.', true);
    } finally {
      setLookingUpId(null);
    }
  };

  const filteredAccounts = accounts.filter((a) => selectedFilter === 'ALL' || a.priorityTier === selectedFilter);
  const selectedAccount = accounts.find((a) => a.companyId === selectedId) || filteredAccounts[0] || null;

  const handleFilterSelect = (tier: PriorityTier | 'ALL') => {
    setSelectedFilter(tier);
    setSelectedId(accounts.find((a) => tier === 'ALL' || a.priorityTier === tier)?.companyId ?? null);
  };

  const counts = Object.fromEntries(TIER_ORDER.map((t) => [t, accounts.filter((a) => a.priorityTier === t).length])) as Record<PriorityTier, number>;
  const contactToday = counts.IMMEDIATE;
  const highPriority = counts.HIGH;

  const notFoundNote = notFoundDomains.length > 0 && (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '10px 14px', fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'left' }}>
      <AlertTriangle size={16} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: 2 }} />
      <span>
        Not ranked: Apollo has no company data for {notFoundDomains.slice(0, 5).join(', ')}
        {notFoundDomains.length > 5 ? ` and ${notFoundDomains.length - 5} more` : ''}. The website on these deals may be wrong; fix it in the CRM.
      </span>
    </div>
  );

  const renderAddLinkedInBar = (isCompact = false) => (
    <form
      onSubmit={handleAddLinkedIn}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '16px',
        padding: isCompact ? '20px' : '16px 20px',
        boxShadow: 'var(--glass-shadow)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#0a66c2',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '1rem',
              boxShadow: '0 2px 8px rgba(10, 102, 194, 0.3)',
              flexShrink: 0,
            }}
          >
            in
          </div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Add to AI Priorities from LinkedIn
              <span style={{ fontSize: '0.65rem', background: 'var(--accent-indigo-glow)', color: 'var(--accent-indigo)', border: '1px solid var(--border-focus)', padding: '1px 7px', borderRadius: '6px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Instant Evaluation
              </span>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Paste a LinkedIn company page or person profile to resolve the company, score real buying signals, and add to your queue.
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Link2
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={linkedinUrl}
            onChange={(e) => {
              setLinkedinUrl(e.target.value);
              if (addError) setAddError(null);
            }}
            placeholder="Paste LinkedIn URL (e.g. linkedin.com/company/stripe or linkedin.com/in/satyanadella)"
            disabled={isAdding}
            style={{
              width: '100%',
              padding: '9px 36px 9px 36px',
              borderRadius: '10px',
              border: addError ? '1.5px solid var(--color-danger, #dc2626)' : '1.5px solid var(--border-subtle)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '0.84rem',
              fontWeight: 500,
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              if (!addError) e.currentTarget.style.borderColor = 'var(--accent-indigo)';
            }}
            onBlur={(e) => {
              if (!addError) e.currentTarget.style.borderColor = 'var(--border-subtle)';
            }}
          />
          {linkedinUrl && !isAdding && (
            <button
              type="button"
              onClick={() => {
                setLinkedinUrl('');
                setAddError(null);
              }}
              aria-label="Clear input"
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={isAdding || !linkedinUrl.trim()}
          style={{
            padding: '9px 20px',
            borderRadius: '10px',
            background: isAdding || !linkedinUrl.trim()
              ? 'var(--border-subtle)'
              : 'linear-gradient(135deg, var(--accent-indigo) 0%, #2563eb 100%)',
            color: '#ffffff',
            border: 'none',
            fontSize: '0.82rem',
            fontWeight: 800,
            cursor: isAdding || !linkedinUrl.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: isAdding || !linkedinUrl.trim() ? 'none' : '0 4px 14px rgba(79, 70, 229, 0.3)',
            transition: 'all 0.15s ease',
            flexShrink: 0,
            minHeight: '38px',
          }}
        >
          {isAdding ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Analyzing & Ranking…</span>
            </>
          ) : (
            <>
              <Sparkles size={15} />
              <span>Add to Priorities</span>
            </>
          )}
        </button>
      </div>

      {addError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--color-danger, #dc2626)', fontWeight: 600 }}>
          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
          <span>{addError}</span>
        </div>
      )}
    </form>
  );

  if (!accounts.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
        {toast && (
          <div role="status" style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 999999, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: `2px solid ${toast.error ? 'var(--color-danger, #dc2626)' : 'var(--accent-indigo)'}`, padding: '14px 22px', borderRadius: '12px', boxShadow: '0 12px 32px rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', fontWeight: 700 }}>
            {toast.error ? <AlertTriangle size={20} style={{ color: 'var(--color-danger, #dc2626)' }} /> : <CheckCircle2 size={20} style={{ color: 'var(--accent-indigo)' }} />} {toast.text}
          </div>
        )}

        {/* Quick Add Bar */}
        {renderAddLinkedInBar(true)}

        <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-subtle)', borderRadius: '16px', padding: '40px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px' }}>
          <Target size={28} style={{ color: 'var(--accent-indigo)' }} />
          <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-primary)' }}>
            {pendingCount ? 'Scoring your accounts…' : 'No accounts to prioritise yet'}
          </div>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', maxWidth: 620, margin: 0, lineHeight: 1.6 }}>
            {pendingCount
              ? `${pendingCount} known compan${pendingCount === 1 ? 'y is' : 'ies are'} waiting to be scored. A few are scored per visit because each uses Apollo quota. Refresh the page to continue.`
              : 'Paste a LinkedIn company page or profile above to add your first account, or discover leads across the app:'}
          </p>
          {!pendingCount && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '6px' }}>
              {[
                ['/apollo-search', 'Save contacts in Apollo Search'],
                ['/company', 'Shortlist companies in Company 360'],
                ['/review', 'Enrich LinkedIn leads in the Review Queue'],
              ].map(([href, label]) => (
                <Link key={href} href={href} style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-indigo)', background: 'var(--accent-indigo-glow)', border: '1px solid var(--border-focus)', padding: '8px 14px', borderRadius: '10px', textDecoration: 'none' }}>
                  {label}
                </Link>
              ))}
            </div>
          )}
          {notFoundNote}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {toast && (
        <div role="status" style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 999999, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: `2px solid ${toast.error ? 'var(--color-danger, #dc2626)' : 'var(--accent-indigo)'}`, padding: '14px 22px', borderRadius: '12px', boxShadow: '0 12px 32px rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', fontWeight: 700 }}>
          {toast.error ? <AlertTriangle size={20} style={{ color: 'var(--color-danger, #dc2626)' }} /> : <CheckCircle2 size={20} style={{ color: 'var(--accent-indigo)' }} />} {toast.text}
        </div>
      )}

      {/* Quick Add Bar: Paste LinkedIn URL to Add Directly to AI Priorities */}
      {renderAddLinkedInBar()}

      {/* Totals, all counted from the accounts below */}
      <div className={layout.kpiGrid}>
        <div style={kpiCard('var(--accent-indigo)')}>
          <div style={kpiLabel}>Contact today</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-indigo)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Flame size={22} /> {contactToday}
          </div>
          <div style={kpiSub}>Immediate tier (score {tierRange('IMMEDIATE')})</div>
        </div>

        <div style={kpiCard('var(--accent-violet)')}>
          <div style={kpiLabel}>High priority</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-violet)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Target size={20} /> {highPriority}
          </div>
          <div style={kpiSub}>Within 24 hours (score {tierRange('HIGH')})</div>
        </div>

        <div style={kpiCard('var(--accent-cyan)')}>
          <div style={kpiLabel}>Decision maker known</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-cyan)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UserRound size={20} /> {summary.withContact}<span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/ {summary.totalAccounts}</span>
          </div>
          <div style={kpiSub}>{summary.inCrm} already in the CRM</div>
        </div>

        <div style={kpiCard('#0a66c2')} title="Combined fit score = Apollo company fit (70 points) + LinkedIn evidence (30 points): posts about a need with their AI buying-intent score, and people found on LinkedIn.">
          <div style={kpiLabel}>LinkedIn evidence</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0a66c2', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Share2 size={20} /> {summary.withLinkedIn ?? 0}<span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/ {summary.totalAccounts}</span>
          </div>
          <div style={kpiSub}>Score = Apollo fit (70) + LinkedIn (30)</div>
        </div>

        <div style={kpiCard('var(--text-primary)')} title="Sum of the starting prices in your service catalog for the services matched to these accounts. Not a forecast.">
          <div style={kpiLabel}>Matched service value</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <IndianRupee size={18} /> {summary.matchedServiceValueInr ? `From ${summary.matchedServiceValueInr.replace('₹', '')}` : '—'}
          </div>
          <div style={kpiSub}>
            {summary.matchedServiceAccounts
              ? `${summary.matchedServiceAccounts} account${summary.matchedServiceAccounts === 1 ? '' : 's'}, catalog starting prices${summary.matchedServiceValueUsd ? ` (${summary.matchedServiceValueUsd})` : ''}`
              : <>No catalog match yet. <Link href="/settings" style={{ color: 'var(--accent-indigo)' }}>Add services</Link></>}
          </div>
        </div>
      </div>

      {pendingCount > 0 && (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'var(--accent-indigo-glow)', border: '1px solid var(--border-focus)', borderRadius: '12px', padding: '10px 14px', fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
          <Info size={16} style={{ color: 'var(--accent-indigo)', flexShrink: 0 }} />
          {pendingCount} more compan{pendingCount === 1 ? 'y' : 'ies'} will be scored on your next visits. Each new company uses Apollo quota, so a few are scored per visit.
        </div>
      )}

      {notFoundNote}

      {/* Tier filter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '12px 18px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={17} style={{ color: 'var(--accent-indigo)' }} />
          <span style={{ fontSize: '0.84rem', fontWeight: 900, color: 'var(--text-primary)' }}>Priority tier</span>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['ALL', ...TIER_ORDER] as const).map((id) => {
            const isSelected = selectedFilter === id;
            const color = id === 'ALL' ? 'var(--text-primary)' : TIER_COLOR[id];
            const label = id === 'ALL' ? 'All accounts' : `${TIER_BANDS[id].label} (${tierRange(id)})`;
            const count = id === 'ALL' ? accounts.length : counts[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleFilterSelect(id)}
                aria-pressed={isSelected}
                style={{
                  padding: '7px 14px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 800, height: '34px',
                  border: isSelected ? `1.5px solid ${color}` : '1.5px solid var(--border-subtle)',
                  background: isSelected ? `color-mix(in srgb, ${color} 10%, transparent)` : 'var(--bg-secondary)',
                  color: isSelected ? color : 'var(--text-secondary)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <span>{label}</span>
                <span style={{ fontSize: '0.68rem', background: isSelected ? color : 'var(--border-subtle)', color: isSelected ? '#ffffff' : 'var(--text-secondary)', padding: '2px 6px', borderRadius: '12px', fontWeight: 900 }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* List and detail */}
      <div className={layout.layout}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
          <div className={layout.listHead}>
            <span>Ranked accounts ({filteredAccounts.length})</span>
            <span className={layout.listHint}>Score = Apollo fit (70) + LinkedIn evidence (30)</span>
          </div>

          {filteredAccounts.length === 0 ? (
            <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-subtle)', borderRadius: '14px', padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              No accounts in the <strong style={{ color: 'var(--text-primary)' }}>{selectedFilter === 'ALL' ? 'list' : TIER_BANDS[selectedFilter].label}</strong> tier.
            </div>
          ) : (
            filteredAccounts.map((acc, idx) => (
              <PriorityCard
                key={acc.companyId}
                account={acc}
                rank={idx + 1}
                isSelected={selectedAccount?.companyId === acc.companyId}
                onSelect={(a) => {
                  setSelectedId(a.companyId);
                  // One-column layout: the details are below the list, so bring them into view.
                  if (window.matchMedia('(max-width: 1099px)').matches) {
                    requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
                  }
                }}
                onTierChange={handleTierChange}
              />
            ))
          )}
        </div>

        <div ref={panelRef} className={layout.panelAnchor}>
          {selectedAccount ? (
            <RecommendationPanel
              account={selectedAccount}
              onTierChange={handleTierChange}
              onLookUpTechFunding={handleLookUp}
              lookingUp={lookingUpId === selectedAccount.companyId}
            />
          ) : (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Select an account to see why it ranks where it does and what to do next.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
