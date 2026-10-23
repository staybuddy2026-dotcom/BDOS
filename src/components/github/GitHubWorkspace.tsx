'use client';

import Link from 'next/link';
import {
  AlertTriangle, Building2, Calendar, Check, CheckCircle2, Code, ExternalLink, GitFork, Globe, Loader2, MapPin, Plus, Search, Star, Target, UserSearch,
} from 'lucide-react';
import { addGitHubOrgToPrioritiesAction, getGitHubOrgAction, searchGitHubAction } from '@/features/github/actions';
import type { GitHubOrgInsights, GitHubRateInfo, GitHubRepoSummary, GitHubSearchResult } from '@/features/github/types';
import { usePageState } from '@/lib/usePageState';
import s from '@/components/ui/ui.module.css';
import { useToast } from '@/components/ui/useToast';
import g from './github.module.css';

const EXAMPLES = ['vercel', 'freshworks.com', 'github.com/shopify'];
const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const ago = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : days < 30 ? `${days} days ago` : days < 365 ? `${Math.floor(days / 30)} mo ago` : `${Math.floor(days / 365)} yr ago`;
};

function RateLine({ rate }: { rate?: GitHubRateInfo | null }) {
  if (!rate) return null;
  const low = rate.remaining < Math.max(5, rate.limit * 0.1);
  return (
    <span className={`${g.rate} ${low ? g.rateLow : ''}`}>
      GitHub requests left this hour: {rate.remaining}/{rate.limit}
      {!rate.withToken && <> · no token (<Link className={s.link} href="/settings?tab=github">add one</Link> for 5,000 an hour)</>}
    </span>
  );
}

function RepoList({ repos, empty }: { repos: GitHubRepoSummary[]; empty: string }) {
  if (!repos.length) return <div className={s.cellSub}>{empty}</div>;
  return (
    <div className={g.repoList}>
      {repos.map((r) => (
        <a key={r.htmlUrl} className={g.repo} href={r.htmlUrl} target="_blank" rel="noopener noreferrer">
          <span className={g.repoName}>{r.name}</span>
          {r.description && <span className={g.repoDesc}>{r.description}</span>}
          <span className={g.repoMeta}>
            {r.language && <span><Code size={12} /> {r.language}</span>}
            <span><Star size={12} /> {r.stars.toLocaleString('en-US')}</span>
            <span><GitFork size={12} /> {r.forks.toLocaleString('en-US')}</span>
            <span><Calendar size={12} /> updated {ago(r.pushedAt)}</span>
          </span>
        </a>
      ))}
    </div>
  );
}

/**
 * GitHub engineering signals for a company: find its organization (by website, name or URL), then see what it
 * builds with, how active it is and which of our services fit.
 */
export function GitHubWorkspace({ initialRate }: { initialRate: GitHubRateInfo | null }) {
  const [query, setQuery] = usePageState('github.query', '');
  const [result, setResult] = usePageState<GitHubSearchResult | null>('github.result', null);
  const [loading, setLoading] = usePageState<string | null>('github.loading', null, { persist: false });
  const [adding, setAdding] = usePageState('github.adding', false, { persist: false });
  const [added, setAdded] = usePageState<Record<string, boolean>>('github.added', {});
  const [rate, setRate] = usePageState<GitHubRateInfo | null>('github.rate', initialRate);
  const { toast, notify } = useToast();

  const apply = (res: GitHubSearchResult) => {
    setResult(res);
    if (res.rate) setRate(res.rate);
  };

  const search = async (q = query) => {
    if (!q.trim() || loading) return;
    setQuery(q);
    // The previous company is cleared, so its data is never shown under the new search.
    setResult(null);
    setLoading('search');
    try { apply(await searchGitHubAction(q)); } catch { notify('The GitHub lookup failed. Please try again.', true); } finally { setLoading(null); }
  };

  const pick = async (login: string) => {
    setLoading(login);
    try { apply(await getGitHubOrgAction(login)); } catch { notify('The GitHub lookup failed. Please try again.', true); } finally { setLoading(null); }
  };

  const addToPriorities = async (o: GitHubOrgInsights) => {
    setAdding(true);
    try {
      const res = await addGitHubOrgToPrioritiesAction(o);
      if (res.error) return notify(res.error, true);
      setAdded({ ...added, [o.login]: true });
      notify(res.message || 'Added to AI Priorities.');
    } catch {
      notify('Could not add this company. Please try again.', true);
    } finally {
      setAdding(false);
    }
  };

  const o = result?.insights;

  return (
    <div className={s.root}>
      {toast}

      {/* Search */}
      <section className={s.card} aria-label="Find a company on GitHub">
        <div className={s.cardHeader}>
          <div>
            <h3 className={s.cardTitle}><span className={s.iconTile}><Search size={16} /></span> Find a company on GitHub</h3>
            <p className={s.cardSubtitle}>Type a company website, a GitHub organization name or a GitHub URL. Only public data is read.</p>
          </div>
          <RateLine rate={rate} />
        </div>
        <form className={s.searchRow} onSubmit={(e) => { e.preventDefault(); void search(); }}>
          <input
            className={s.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. freshworks.com, vercel or github.com/shopify"
            aria-label="Company website, GitHub organization or URL"
            disabled={!!loading}
          />
          <button type="submit" className={`${s.btn} ${s.btnPrimary}`} style={{ height: 42 }} disabled={!!loading || !query.trim()}>
            {loading === 'search' ? <Loader2 size={16} className={s.spin} /> : <Search size={16} />} {loading === 'search' ? 'Looking up…' : 'Analyse'}
          </button>
        </form>
        <div className={s.chipRow} style={{ gap: 6 }}>
          <span className={s.cellSub} style={{ marginTop: 0, alignSelf: 'center' }}>Try:</span>
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" className={s.chip} disabled={!!loading} onClick={() => void search(ex)}>{ex}</button>
          ))}
        </div>
      </section>

      {result?.error && (
        <div className={`${s.notice} ${result.error.code === 'NOT_FOUND' ? s.noticeInfo : s.noticeWarn}`} role="alert">
          <AlertTriangle size={16} className={s.noticeIcon} />
          <span>{result.error.message}</span>
        </div>
      )}

      {/* Several possible organizations: the user picks */}
      {result?.candidates && !o && (
        <section className={s.card} aria-label="Possible organizations">
          <div>
            <h3 className={s.cardTitle}><span className={s.iconTile}><Building2 size={16} /></span> Which organization is it?</h3>
            {result.note && <p className={s.cardSubtitle}>{result.note}</p>}
          </div>
          <div className={g.candidates}>
            {result.candidates.map((c) => (
              <div key={c.login} className={`${g.candidate} ${c.websiteMatches ? g.candidateMatch : ''}`}>
                <div className={g.candidateHead}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- GitHub avatars, any host size */}
                  <img className={g.avatarSm} src={`${c.avatarUrl}&s=80`} alt="" />
                  <div style={{ minWidth: 0 }}>
                    <div className={g.candidateName}>{c.name || c.login}</div>
                    <div className={s.cellSub} style={{ marginTop: 0 }}>@{c.login}</div>
                  </div>
                </div>
                {c.description && <div className={g.candidateDesc}>{c.description}</div>}
                <div className={s.badgeRow}>
                  {c.website
                    ? <span className={`${s.badge} ${c.websiteMatches ? s.badgeGreen : s.badgeGray}`}>{c.websiteMatches ? <Check size={11} /> : <Globe size={11} />} {c.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                    : <span className={`${s.badge} ${s.badgeGray}`}>No website on profile</span>}
                </div>
                <div className={s.actionGroup}>
                  <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} disabled={!!loading} onClick={() => void pick(c.login)}>
                    {loading === c.login ? <Loader2 size={13} className={s.spin} /> : <Search size={13} />} Analyse
                  </button>
                  <a className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} href={c.htmlUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} /> GitHub</a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Before the first search */}
      {!result && !loading && (
        <div className={s.empty} style={{ padding: '44px 20px' }}>
          <div className={s.emptyIconBadge}><Code size={24} /></div>
          <div className={s.emptyTitle}>See what a company builds, from its public code</div>
          <p className={s.emptySubtitle}>
            Languages and frameworks they use, how active their engineers are, their most important projects, and which of your services fit.
            Useful for companies that build in the open; many companies keep their code private.
          </p>
        </div>
      )}

      {loading === 'search' && !o && (
        <div className={s.empty} style={{ padding: '44px 20px' }}>
          <div className={s.emptyIconBadge}><Loader2 size={24} className={s.spin} /></div>
          <div className={s.emptyTitle}>Reading their GitHub…</div>
        </div>
      )}

      {o && (
        <>
          {/* Organization */}
          <section className={s.card} aria-label={`${o.name} on GitHub`}>
            <div className={g.orgHead}>
              <span className={g.avatarWrap} aria-hidden>
                <span className={g.avatarInitial}>{o.name.charAt(0).toUpperCase()}</span>
                {/* eslint-disable-next-line @next/next/no-img-element -- GitHub avatars */}
                <img className={g.avatar} src={`${o.avatarUrl}${o.avatarUrl.includes('?') ? '&' : '?'}s=128`} alt="" />
              </span>
              <div className={g.orgText}>
                <h2 className={g.orgName}>
                  {o.name}
                  <span className={`${s.badge} ${s.badgeGray}`}>@{o.login}</span>
                  {o.type === 'User' && <span className={`${s.badge} ${s.badgeAmber}`}>Personal account</span>}
                </h2>
                {o.description && <p className={g.orgDesc}>{o.description}</p>}
                <div className={g.facts}>
                  {o.website && <a href={/^https?:/i.test(o.website) ? o.website : `https://${o.website}`} target="_blank" rel="noopener noreferrer"><Globe size={13} /> {o.domain || o.website}</a>}
                  {o.location && <span><MapPin size={13} /> {o.location}</span>}
                  <span><Calendar size={13} /> On GitHub since {new Date(o.createdAt).getFullYear()}</span>
                  {o.email && <span>{o.email}</span>}
                </div>
              </div>
              <div className={g.actions}>
                <a className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} href={o.htmlUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} /> Open on GitHub</a>
                {o.domain && <Link className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} href={`/company?query=${encodeURIComponent(o.domain)}`}><Building2 size={13} /> Company 360</Link>}
                <Link className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} href={`/apollo-search?company=${encodeURIComponent(o.name)}`}><UserSearch size={13} /> Find people in Apollo</Link>
                {o.domain ? (
                  <button type="button" className={`${s.btn} ${added[o.login] ? s.btnSuccess : s.btnPrimary} ${s.btnSm}`} disabled={adding || added[o.login]} onClick={() => void addToPriorities(o)}>
                    {adding ? <Loader2 size={13} className={s.spin} /> : added[o.login] ? <CheckCircle2 size={13} /> : <Plus size={13} />} {added[o.login] ? 'In AI Priorities' : 'Add to AI Priorities'}
                  </button>
                ) : (
                  <span className={s.cellSub} style={{ alignSelf: 'center', marginTop: 0 }} title="A company is only added by its website">No website on this profile</span>
                )}
              </div>
            </div>

            <div className={g.stats}>
              <div className={g.stat}><div className={g.statLabel}>Public repositories</div><div className={g.statValue}>{o.publicRepos.toLocaleString('en-US')}</div></div>
              <div className={g.stat}><div className={g.statLabel}>Updated in 30 days</div><div className={g.statValue}>{o.activity.updatedLast30Days}</div></div>
              <div className={g.stat}><div className={g.statLabel}>Updated in 90 days</div><div className={g.statValue}>{o.activity.updatedLast90Days}</div></div>
              <div className={g.stat}><div className={g.statLabel}>Stars</div><div className={g.statValue}>{o.activity.totalStars.toLocaleString('en-US')}</div></div>
              <div className={g.stat}><div className={g.statLabel}>Followers</div><div className={g.statValue}>{o.followers.toLocaleString('en-US')}</div></div>
            </div>
            {o.reposAnalyzed > 0 && <div className={s.cellSub} style={{ marginTop: 0 }}>
              Based on their {o.reposAnalyzed} most recently updated own repositories (forks and archived ones left out) · read {fmtDate(o.fetchedAt)}
              {o.activity.lastPushAt && <> · last code change {ago(o.activity.lastPushAt)}</>}
            </div>}
          </section>

          {/* What it means */}
          <section className={s.card} aria-label="What this tells you">
            <h3 className={s.cardTitle}><span className={s.iconTile}><Target size={16} /></span> What this tells you</h3>
            <ul className={g.signals}>
              {o.signals.map((sig) => <li key={sig}><CheckCircle2 size={15} /> {sig}</li>)}
            </ul>
          </section>

          {/* No public code: the cards below would all be empty, the reading above says why. */}
          {o.reposAnalyzed > 0 && (<>
          <div className={g.columns}>
            <section className={s.card} aria-label="Languages">
              <div>
                <h3 className={s.cardTitle}><span className={s.iconTile}><Code size={16} /></span> Languages</h3>
                <p className={s.cardSubtitle}>Main language of each repository, as a share of their repositories.</p>
              </div>
              {o.languages.length ? (
                <div className={g.bars}>
                  {o.languages.map((l) => (
                    <div key={l.name} className={g.barRow} title={`${l.repos} repositor${l.repos === 1 ? 'y' : 'ies'}`}>
                      <span className={g.barName}>{l.name}</span>
                      <span className={g.barTrack}><span className={g.barFill} style={{ display: 'block', width: `${Math.max(3, l.percent)}%` }} /></span>
                      <span className={g.barValue}>{l.percent}% · {l.repos}</span>
                    </div>
                  ))}
                </div>
              ) : <div className={s.cellSub}>No languages detected.</div>}
              {o.topics.length > 0 && (
                <>
                  <div className={s.sectionLabel} style={{ marginTop: 4 }}>Topics on their repositories</div>
                  <div className={g.topics}>
                    {o.topics.map((t) => <span key={t.name} className={g.topic}>{t.name}<small>{t.repos}</small></span>)}
                  </div>
                </>
              )}
            </section>

            <section className={s.card} aria-label="Services that fit">
              <div>
                <h3 className={s.cardTitle}><span className={s.iconTile}><Target size={16} /></span> Services that fit</h3>
                <p className={s.cardSubtitle}>Services from your catalog whose technologies appear in their languages or topics.</p>
              </div>
              {o.matchedServices.length ? (
                <div className={g.repoList}>
                  {o.matchedServices.map((svc) => (
                    <div key={svc.name} className={g.service}>
                      <span className={g.serviceName}>{svc.name}</span>
                      <span className={g.serviceMeta}>They use {svc.matchedTech.join(', ')}</span>
                      {(svc.fromInr || svc.fromUsd) && <span className={g.serviceMeta}>{[svc.fromInr, svc.fromUsd && `(${svc.fromUsd.replace(/^From /, '')})`, svc.model].filter(Boolean).join(' · ')}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className={s.cellSub}>
                  None of your catalog&apos;s technologies show up in their public code. <Link className={s.link} href="/settings?tab=service-catalog">Check the service catalog</Link>.
                </div>
              )}
            </section>
          </div>

          <div className={g.columns}>
            <section className={s.card} aria-label="Recently updated repositories">
              <h3 className={s.cardTitle}><span className={s.iconTile}><Calendar size={16} /></span> Recently updated</h3>
              <RepoList repos={o.recentRepos} empty="No public repositories." />
            </section>
            <section className={s.card} aria-label="Most starred repositories">
              <h3 className={s.cardTitle}><span className={s.iconTile}><Star size={16} /></span> Most starred</h3>
              <RepoList repos={o.topRepos} empty="No public repositories." />
            </section>
          </div>
          </>)}
        </>
      )}
    </div>
  );
}
