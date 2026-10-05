'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, CheckCircle2, ExternalLink, Flame, Inbox, Kanban, Loader2, MessageSquare, MessageSquareQuote, PlugZap, RefreshCw, ScanSearch,
  Search, Send, Sparkles, ThumbsUp, Trash2, UserPlus, UserRound, Users, Copy, Check,
} from 'lucide-react';
import {
  addLinkedInPostToCrmAction,
  draftLinkedInCommentAction,
  getLinkedInInboxAction,
  getLinkedInStatusAction,
  saveLinkedInPostsAction,
  scanLinkedInKeywordsAction,
  scoreLinkedInInboxAction,
  scoreLinkedInPostsAction,
  searchLinkedInPeopleAction,
  searchLinkedInPostsAction,
  updateLinkedInPostStatusAction,
} from '@/features/linkedin/actions';
import type { KeywordScanResult, LinkedInInboxItem, LinkedInPostSearchItem } from '@/features/linkedin/actions';
import type { IntentLevel, IntentSource, PostIntent } from '@/features/linkedin/intent';
import type { LinkedInProfileResult, LinkedInStatus } from '@/features/linkedin/types';
import { addLinkedInProfileToCrm, lookupCrmStatusAction } from '@/features/crm/actions';
import { STAGE_LABELS } from '@/features/crm/types';
import type { CrmMatch } from '@/features/crm/types';
import s from '@/components/ui/ui.module.css';
import { useToast } from '@/components/ui/useToast';

type Tab = 'posts' | 'people' | 'inbox';
type Window = '24h' | 'week' | 'month';
type LevelFilter = 'ALL' | 'HOT' | 'WARM';

const INTENT_LABELS: Record<IntentLevel, string> = { HOT: 'Hot', WARM: 'Warm', COLD: 'Cold' };

/** Buying-intent marker on a post: Hot = asking for help now, Warm = a trigger worth a touch, Cold = not a buyer. */
function IntentBadge({ intent }: { intent: PostIntent }) {
  const cls = intent.level === 'HOT' ? s.badgeRed : intent.level === 'WARM' ? s.badgeAmber : s.badgeGray;
  return (
    <span className={`${s.badge} ${cls}`} title={intent.reason || undefined}>
      {intent.level === 'HOT' && <Flame size={11} />} {INTENT_LABELS[intent.level]} · {intent.score}
    </span>
  );
}

/** "In CRM" marker with the owner, so two people do not chase the same lead. */
function CrmBadge({ match }: { match: CrmMatch }) {
  const label = `In CRM · ${STAGE_LABELS[match.stage]} · ${match.mine ? 'yours' : match.ownerName || 'unassigned'}`;
  return match.dealId
    ? <Link className={`${s.badge} ${match.mine ? s.badgeIndigo : s.badgeAmber}`} href={`/crm?deal=${match.dealId}`} title="Open this deal in the CRM"><Kanban size={11} /> {label}</Link>
    : <span className={`${s.badge} ${s.badgeAmber}`} title="This deal belongs to a teammate"><Kanban size={11} /> {label}</span>;
}

const formatDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

function SetupCard({ status, onRecheck, checking }: { status: LinkedInStatus; onRecheck: () => void; checking: boolean }) {
  return (
    <section className={s.card} aria-label="Connect LinkedIn">
      <div className={s.cardHeader}>
        <div>
          <h3 className={s.cardTitle}><span className={s.iconTile}><PlugZap size={16} /></span> Connect LinkedIn</h3>
          <p className={s.cardSubtitle}>{status.message}</p>
        </div>
        <button type="button" className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} onClick={onRecheck} disabled={checking}>
          <RefreshCw size={14} className={checking ? s.spin : undefined} /> Check connection
        </button>
      </div>
      {!status.configured && (
        <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13.5, color: 'var(--o-text-2)', lineHeight: 1.55 }}>
          <li>Create an account at <a className={s.link} href="https://apify.com" target="_blank" rel="noopener noreferrer">apify.com</a> (LinkedIn has no public search API, so the app uses Apify&apos;s LinkedIn scrapers).</li>
          <li>Open <strong>Settings → API &amp; Integrations</strong> in Apify and copy your <strong>API token</strong>.</li>
          <li>Put it in <code>.env</code> as <code>LINKEDIN_SCRAPER_API_KEY=&quot;apify_api_...&quot;</code>, or save it under <Link className={s.link} href="/settings">Settings → LinkedIn</Link>.</li>
          <li>Restart the app (for a <code>.env</code> change) and press <strong>Check connection</strong>. Everything on this page then works without further setup.</li>
        </ol>
      )}
    </section>
  );
}

export function LinkedInWorkspace({ initialStatus, initialInbox, activeKeywordCount }: {
  initialStatus: LinkedInStatus;
  initialInbox: LinkedInInboxItem[];
  activeKeywordCount: number;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [checking, setChecking] = useState(false);
  const [tab, setTab] = useState<Tab>('posts');

  // Posts
  const [query, setQuery] = useState('');
  const [timeWindow, setTimeWindow] = useState<Window>('week');
  const [authorKeywords, setAuthorKeywords] = useState('');
  const [posts, setPosts] = useState<LinkedInPostSearchItem[]>([]);
  const [postsSearched, setPostsSearched] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [savingPosts, setSavingPosts] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<KeywordScanResult[] | null>(null);
  // Buying intent per post, which results are already in the CRM, and drafted comments.
  const [intents, setIntents] = useState<Record<string, PostIntent>>({});
  const [intentSource, setIntentSource] = useState<IntentSource | null>(null);
  const [scoring, setScoring] = useState(false);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('ALL');
  const [crmPosts, setCrmPosts] = useState<Record<string, CrmMatch>>({});
  const [postCrmBusy, setPostCrmBusy] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [commentBusy, setCommentBusy] = useState<string | null>(null);

  // People
  const [peopleQuery, setPeopleQuery] = useState('');
  const [jobTitles, setJobTitles] = useState('');
  const [locations, setLocations] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [people, setPeople] = useState<LinkedInProfileResult[]>([]);
  const [peopleSearched, setPeopleSearched] = useState(false);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleNote, setPeopleNote] = useState<string | null>(null);
  const [crmBusy, setCrmBusy] = useState<string | null>(null);
  const [addedToCrm, setAddedToCrm] = useState<Set<string>>(new Set());
  const [crmPeople, setCrmPeople] = useState<Record<string, CrmMatch>>({});
  const [copied, setCopied] = useState<string | null>(null);

  // Inbox
  const [inbox, setInbox] = useState(initialInbox);
  const [inboxBusy, setInboxBusy] = useState<string | null>(null);
  const [inboxScoring, setInboxScoring] = useState(false);

  const [banner, setBanner] = useState<string | null>(null);

  const { toast, notify } = useToast();

  const connected = status.configured && status.enabled;

  const recheck = async () => {
    setChecking(true);
    try {
      const next = await getLinkedInStatusAction();
      setStatus(next);
      notify(next.message, !next.healthy);
      if (next.healthy) setBanner(null);
    } catch {
      notify('Could not check the LinkedIn connection.', true);
    } finally {
      setChecking(false);
    }
  };

  const refreshInbox = async () => {
    try { setInbox(await getLinkedInInboxAction()); } catch { /* keep current list */ }
  };

  const handlePostSearch = async (e?: React.FormEvent, overrideQuery?: string) => {
    e?.preventDefault();
    const searchQuery = (overrideQuery ?? query).trim();
    if (!searchQuery || postsLoading) return;
    if (overrideQuery) setQuery(overrideQuery);
    setPostsLoading(true);
    setBanner(null);
    setScanResults(null);
    try {
      const res = await searchLinkedInPostsAction({ query: searchQuery, postedLimit: timeWindow, maxPosts: 25, authorKeywords });
      setPosts(res.items);
      setSelected(new Set());
      setPostsSearched(true);
      setLevelFilter('ALL');
      if (res.error) setBanner(res.error.message);
      else if (res.cached) notify('Showing cached results (no extra scraper cost).');

      // The posts show straight away; intent scores and CRM markers arrive a moment later.
      if (res.items.length) {
        setScoring(true);
        scoreLinkedInPostsAction(res.items.map((p) => ({ id: p.id, content: p.content, authorName: p.authorName, authorHeadline: p.authorHeadline })))
          .then((scored) => { setIntents((prev) => ({ ...prev, ...scored.scores })); setIntentSource(scored.source); })
          .catch(() => { /* posts stay usable without scores */ })
          .finally(() => setScoring(false));
        lookupCrmStatusAction({ people: res.items.filter((p) => p.authorProfileUrl).map((p) => ({ key: p.id, linkedinUrl: p.authorProfileUrl })) })
          .then((found) => setCrmPosts((prev) => ({ ...prev, ...found.people })))
          .catch(() => { });
      }
    } catch {
      setBanner('LinkedIn post search failed. Please try again.');
    } finally {
      setPostsLoading(false);
    }
  };

  const savePosts = async (items: LinkedInPostSearchItem[]) => {
    if (!items.length || savingPosts) return;
    setSavingPosts(true);
    try {
      const res = await saveLinkedInPostsAction(items, {
        matchedKeyword: query.trim() || 'LinkedIn search',
        toReviewQueue: true,
        intents: Object.fromEntries(items.filter((i) => intents[i.id]).map((i) => [i.id, intents[i.id]])),
      });
      const urls = new Set(items.map((i) => i.url));
      setPosts((prev) => prev.map((p) => (urls.has(p.url) ? { ...p, alreadySaved: true } : p)));
      setSelected(new Set());
      notify(`${res.created} post${res.created === 1 ? '' : 's'} sent to the Review Queue${res.skipped ? `, ${res.skipped} already saved` : ''}.`);
      refreshInbox();
    } catch {
      notify('Could not save these posts. Please try again.', true);
    } finally {
      setSavingPosts(false);
    }
  };

  // Post -> lead in one step: saves the post and makes its author a contact on a deal you own.
  const handleAddPostToCrm = async (post: LinkedInPostSearchItem) => {
    if (postCrmBusy) return;
    setPostCrmBusy(post.id);
    try {
      const res = await addLinkedInPostToCrmAction(post, { matchedKeyword: query.trim() || 'LinkedIn search', intent: intents[post.id] });
      if (res.error) return notify(res.error, true);
      if (res.match) setCrmPosts((prev) => ({ ...prev, [post.id]: res.match! }));
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, alreadySaved: true } : p)));
      notify(res.message || 'Added to the CRM.');
    } catch {
      notify('Could not add this post to the CRM.', true);
    } finally {
      setPostCrmBusy(null);
    }
  };

  const handleDraftComment = async (post: LinkedInPostSearchItem) => {
    if (commentBusy) return;
    setCommentBusy(post.id);
    try {
      const res = await draftLinkedInCommentAction({ content: post.content, authorName: post.authorName, authorHeadline: post.authorHeadline });
      if (res.error || !res.comment) return notify(res.error || 'No comment was drafted.', true);
      setComments((prev) => ({ ...prev, [post.id]: res.comment! }));
    } catch {
      notify('The comment could not be drafted.', true);
    } finally {
      setCommentBusy(null);
    }
  };

  const handleScoreInbox = async () => {
    if (inboxScoring) return;
    setInboxScoring(true);
    try {
      const res = await scoreLinkedInInboxAction();
      await refreshInbox();
      notify(res.scored ? `Scored ${res.scored} post${res.scored === 1 ? '' : 's'} for buying intent.` : 'Every post in the inbox is already scored.');
    } catch {
      notify('Could not score the inbox. Please try again.', true);
    } finally {
      setInboxScoring(false);
    }
  };

  const handleScan = async () => {
    if (scanning) return;
    setScanning(true);
    setBanner(null);
    try {
      const res = await scanLinkedInKeywordsAction({ timeframe: timeWindow === 'month' ? '30d' : timeWindow === '24h' ? '24h' : '7d' });
      setScanResults(res.results);
      if (res.error) setBanner(res.error.message);
      else if (!res.totalActive) notify('You have no active keywords yet. Add some on the Keywords page.', true);
      else notify(`Scanned ${res.scanned} of ${res.totalActive} active keywords: ${res.created} new post${res.created === 1 ? '' : 's'} in the inbox.`);
      await refreshInbox();
      if (res.created > 0) setTab('inbox');
    } catch {
      setBanner('The keyword scan failed. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  const handlePeopleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (peopleLoading) return;
    if (!peopleQuery.trim() && !jobTitles.trim() && !companyName.trim()) {
      notify('Add a keyword, job title or company to search people.', true);
      return;
    }
    setPeopleLoading(true);
    setBanner(null);
    setPeopleNote(null);
    try {
      const res = await searchLinkedInPeopleAction({ query: peopleQuery, jobTitles, locations, companyName, maxItems: 15 });
      setPeople(res.items);
      setPeopleSearched(true);
      setPeopleNote(res.note || null);
      if (res.error) setBanner(res.error.message);
      if (res.items.length) {
        lookupCrmStatusAction({ people: res.items.map((p) => ({ key: p.id, linkedinUrl: p.profileUrl, email: p.email })) })
          .then((found) => setCrmPeople((prev) => ({ ...prev, ...found.people })))
          .catch(() => { });
      }
    } catch {
      setBanner('LinkedIn people search failed. Please try again.');
    } finally {
      setPeopleLoading(false);
    }
  };

  const handleAddToCrm = async (p: LinkedInProfileResult) => {
    setCrmBusy(p.id);
    try {
      const res = await addLinkedInProfileToCrm(p);
      if (res.error) return notify(res.error, true);
      setAddedToCrm((prev) => new Set(prev).add(p.id));
      notify(res.created ? `${p.fullName} added to the CRM as a new lead.` : `${p.fullName} added to the existing ${res.account?.name} account.`);
      lookupCrmStatusAction({ people: [{ key: p.id, linkedinUrl: p.profileUrl }] }).then((found) => setCrmPeople((prev) => ({ ...prev, ...found.people }))).catch(() => { });
    } catch {
      notify('Could not add this person to the CRM.', true);
    } finally {
      setCrmBusy(null);
    }
  };

  const handleInbox = async (item: LinkedInInboxItem, next: 'REVIEW_QUEUE' | 'DISMISSED') => {
    setInboxBusy(item.id);
    try {
      const res = await updateLinkedInPostStatusAction(item.id, next);
      if (!res.success) return notify('Could not update this post.', true);
      setInbox((prev) => prev.filter((i) => i.id !== item.id));
      notify(next === 'REVIEW_QUEUE' ? 'Sent to the Review Queue.' : 'Dismissed.');
    } finally {
      setInboxBusy(null);
    }
  };

  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  };

  // Strongest buying intent first once scores arrive; the search order breaks ties.
  const scoredCount = posts.filter((p) => intents[p.id]).length;
  const countLevel = (level: IntentLevel) => posts.filter((p) => intents[p.id]?.level === level).length;
  const visiblePosts = posts
    .filter((p) => levelFilter === 'ALL' || intents[p.id]?.level === 'HOT' || (levelFilter === 'WARM' && intents[p.id]?.level === 'WARM'))
    .map((p, i) => ({ p, i }))
    .sort((a, b) => (intents[b.p.id]?.score ?? -1) - (intents[a.p.id]?.score ?? -1) || a.i - b.i)
    .map(({ p }) => p);
  const selectable = visiblePosts.filter((p) => !p.alreadySaved);
  const inboxUnscored = inbox.filter((i) => !i.intent).length;
  const usage = status.monthlyUsageUsd !== undefined && status.monthlyLimitUsd !== undefined
    ? `$${status.monthlyUsageUsd.toFixed(2)} of $${status.monthlyLimitUsd.toFixed(2)} used this month`
    : null;

  return (
    <div className={s.root}>
      {toast}

      {/* Connection */}
      {connected && status.healthy ? (
        <section className={s.card} aria-label="LinkedIn connection" style={{ padding: '14px 20px' }}>
          <div className={s.cardHeader} style={{ alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className={`${s.badge} ${s.badgeGreen}`}><CheckCircle2 size={12} /> LinkedIn connected</span>
              <span className={s.cardSubtitle} style={{ margin: 0 }}>
                {status.account ? `Apify account ${status.account}` : 'Scraper key is valid'}{usage ? ` · ${usage}` : ''}
              </span>
            </div>
            <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={recheck} disabled={checking}>
              <RefreshCw size={14} className={checking ? s.spin : undefined} /> Refresh
            </button>
          </div>
        </section>
      ) : (
        <SetupCard status={status} onRecheck={recheck} checking={checking} />
      )}

      {banner && (
        <div className={`${s.notice} ${s.noticeWarn}`} role="alert">
          <AlertTriangle size={16} className={s.noticeIcon} />
          <span><strong>LinkedIn notice:</strong> {banner}</span>
        </div>
      )}

      {/* Tabs */}
      <div className={s.chipRow} role="tablist" aria-label="LinkedIn workspace">
        {([
          { id: 'posts', label: 'Post signals', icon: MessageSquare },
          { id: 'people', label: 'People', icon: Users },
          { id: 'inbox', label: `Inbox${inbox.length ? ` (${inbox.length})` : ''}`, icon: Inbox },
        ] as const).map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`${s.chip} ${tab === t.id ? s.chipActive : ''}`} onClick={() => setTab(t.id)}>
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* POSTS */}
      {tab === 'posts' && (
        <>
          <section className={s.card} aria-label="Search LinkedIn posts">
            <div className={s.cardHeader}>
              <div>
                <h3 className={s.cardTitle}><span className={s.iconTile}><Search size={16} /></span> Find buying signals in posts</h3>
                <p className={s.cardSubtitle}>Search what people are posting right now, e.g. “looking for a development partner” or “hiring react developers”.</p>
              </div>
              <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={handleScan} disabled={scanning || postsLoading} title="Searches your active keywords from the Keywords page">
                {scanning ? <Loader2 size={15} className={s.spin} /> : <ScanSearch size={15} />}
                {scanning ? 'Scanning…' : `Scan my keywords${activeKeywordCount ? ` (${activeKeywordCount})` : ''}`}
              </button>
            </div>

            <form onSubmit={handlePostSearch} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className={s.searchRow}>
                <input className={`${s.input} ${s.inputLg}`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder='Post search, e.g. "need a software agency" OR "looking for developers"' aria-label="Post search query" disabled={postsLoading} maxLength={480} />
                <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnLg}`} disabled={postsLoading || !query.trim()}>
                  {postsLoading ? <Loader2 size={17} className={s.spin} /> : <Search size={17} />} {postsLoading ? 'Searching…' : 'Search posts'}
                </button>
              </div>
              <div className={s.searchRow} style={{ alignItems: 'center' }}>
                <div className={s.chipRow} role="group" aria-label="Posted within">
                  {(['24h', 'week', 'month'] as const).map((w) => (
                    <button key={w} type="button" className={`${s.chip} ${timeWindow === w ? s.chipActive : ''}`} onClick={() => setTimeWindow(w)} aria-pressed={timeWindow === w}>
                      {w === '24h' ? 'Last 24 hours' : w === 'week' ? 'Last week' : 'Last month'}
                    </button>
                  ))}
                </div>
                <input className={s.input} style={{ flex: 1, minWidth: 220 }} value={authorKeywords} onChange={(e) => setAuthorKeywords(e.target.value)} placeholder="Only authors whose title contains… (e.g. founder, CTO)" aria-label="Author title keywords" disabled={postsLoading} />
              </div>
            </form>
          </section>

          {scanResults && scanResults.length > 0 && (
            <section className={s.card} aria-label="Keyword scan results">
              <h3 className={s.cardTitle}>Keyword scan results</h3>
              <div className={s.tableWrap}>
                <table className={s.table}>
                  <thead><tr><th>Keyword</th><th>Posts found</th><th>New</th><th>Already saved</th><th>Note</th></tr></thead>
                  <tbody>
                    {scanResults.map((r) => (
                      <tr key={r.keyword}>
                        <td className={s.cellStrong}>{r.keyword}</td><td>{r.found}</td><td>{r.created}</td><td>{r.skipped}</td>
                        <td className={s.cellSub}>{r.error || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className={s.card} aria-label="Post results" aria-busy={postsLoading}>
            <div className={s.cardHeader}>
              <div>
                <h3 className={s.cardTitle}>Results{postsSearched ? ` (${visiblePosts.length}${visiblePosts.length !== posts.length ? ` of ${posts.length}` : ''})` : ''}</h3>
                <p className={s.cardSubtitle}>
                  {scoring
                    ? 'Scoring each post for buying intent…'
                    : scoredCount > 0
                      ? `Sorted by buying intent (${intentSource === 'AI' ? 'AI scored' : 'scored by keyword rules, AI scoring was not available'}). Add the hot ones to the CRM.`
                      : 'Add relevant authors to the CRM, or send posts to the Review Queue to analyse them and draft outreach.'}
                </p>
                {scoredCount > 0 && (
                  <div className={s.chipRow} role="group" aria-label="Filter by buying intent" style={{ marginTop: 10 }}>
                    {([['ALL', `All (${posts.length})`], ['HOT', `Hot (${countLevel('HOT')})`], ['WARM', `Hot + warm (${countLevel('HOT') + countLevel('WARM')})`]] as const).map(([id, label]) => (
                      <button key={id} type="button" className={`${s.chip} ${levelFilter === id ? s.chipActive : ''}`} aria-pressed={levelFilter === id} onClick={() => { setLevelFilter(id); setSelected(new Set()); }}>
                        {id === 'HOT' && <Flame size={14} />} {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectable.length > 0 && (
                <div className={s.actionGroup}>
                  <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={() => setSelected(selected.size === selectable.length ? new Set() : new Set(selectable.map((p) => p.id)))}>
                    {selected.size === selectable.length ? 'Clear selection' : 'Select all'}
                  </button>
                  <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} disabled={!selected.size || savingPosts} onClick={() => savePosts(visiblePosts.filter((p) => selected.has(p.id)))}>
                    {savingPosts ? <Loader2 size={14} className={s.spin} /> : <Send size={14} />} Send {selected.size || ''} to Review Queue
                  </button>
                </div>
              )}
            </div>

            {postsLoading ? (
              <div className={s.empty}>
                <div className={s.emptyIconBadge}>
                  <Loader2 size={24} className={s.spin} />
                </div>
                <div className={s.emptyTitle}>Scanning LinkedIn Discussions…</div>
                <p className={s.emptySubtitle}>
                  Searching live posts and extracting buying triggers for &ldquo;{query}&rdquo;. This usually takes 10 to 30 seconds.
                </p>
              </div>
            ) : posts.length === 0 ? (
              postsSearched ? (
                <div className={s.empty}>
                  <div className={s.emptyIconBadge}>
                    <Search size={24} />
                  </div>
                  <div className={s.emptyTitle}>No posts matched this search</div>
                  <p className={s.emptySubtitle}>
                    We couldn&apos;t find any posts matching &ldquo;{query}&rdquo;. Try using broader terms, clearing the author filter, or expanding the time window.
                  </p>
                  <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                    <button
                      type="button"
                      className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`}
                      onClick={() => { setTimeWindow('month'); handlePostSearch(undefined, query); }}
                    >
                      Search past month
                    </button>
                    <button
                      type="button"
                      className={`${s.btn} ${s.btnGhost} ${s.btnSm}`}
                      onClick={() => { setQuery(''); setAuthorKeywords(''); setPostsSearched(false); }}
                    >
                      Clear search
                    </button>
                  </div>
                </div>
              ) : (
                <div className={s.empty}>
                  <div className={s.emptyIconBadge}>
                    <Sparkles size={26} />
                  </div>
                  <div className={s.emptyTitle}>Discover High-Intent LinkedIn Discussions</div>
                  <p className={s.emptySubtitle}>
                    {connected
                      ? 'Search live posts where decision makers are looking for development teams, AI engineers, or digital agency partners.'
                      : 'Connect your LinkedIn Apify key above to start scanning live discussions for buying signals in real time.'}
                  </p>

                  {/* Quick-fill Trigger Chips */}
                  <div className={s.emptyPillSection}>
                    <div className={s.emptyPillLabel}>Try popular buying-signal searches</div>
                    <div className={s.emptyPills}>
                      {[
                        'looking for a development partner',
                        'hiring react developers',
                        'need a software agency',
                        'seeking AI automation',
                        'looking for technical cofounder',
                        'hiring next.js engineers',
                      ].map((promptText) => (
                        <button
                          key={promptText}
                          type="button"
                          className={s.emptyPill}
                          onClick={() => handlePostSearch(undefined, promptText)}
                          title={`Search for "${promptText}"`}
                        >
                          <Search size={12} style={{ opacity: 0.6 }} />
                          <span>&ldquo;{promptText}&rdquo;</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3 Value Pillars */}
                  <div className={s.emptyFeatureGrid}>
                    <div className={s.emptyFeatureCard}>
                      <div className={s.emptyFeatureTitle}>
                        <Flame size={14} style={{ color: 'var(--o-danger)' }} />
                        <span>AI Intent Detection</span>
                      </div>
                      <div className={s.emptyFeatureText}>
                        Automatically classifies discussions into Hot (ready to hire/buy) or Warm intent tiers.
                      </div>
                    </div>

                    <div className={s.emptyFeatureCard}>
                      <div className={s.emptyFeatureTitle}>
                        <UserRound size={14} style={{ color: 'var(--o-accent)' }} />
                        <span>Decision-Maker Focus</span>
                      </div>
                      <div className={s.emptyFeatureText}>
                        Pinpoints posts from verified Founders, CTOs, and Product Leaders.
                      </div>
                    </div>

                    <div className={s.emptyFeatureCard}>
                      <div className={s.emptyFeatureTitle}>
                        <Send size={14} style={{ color: 'var(--o-success)' }} />
                        <span>1-Click Pipeline</span>
                      </div>
                      <div className={s.emptyFeatureText}>
                        Send high-intent leads straight to your CRM deals or AI Outreach campaigns.
                      </div>
                    </div>
                  </div>
                </div>
              )
            ) : visiblePosts.length === 0 ? (
              <div className={s.empty}>
                <div className={s.emptyIconBadge}>
                  <Flame size={24} style={{ opacity: 0.6 }} />
                </div>
                <div className={s.emptyTitle}>No {levelFilter === 'HOT' ? 'hot' : 'hot or warm'} posts found</div>
                <p className={s.emptySubtitle}>
                  Posts were found, but none reached the {levelFilter.toLowerCase()} intent threshold.
                </p>
                <button
                  type="button"
                  className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`}
                  style={{ marginTop: 14 }}
                  onClick={() => setLevelFilter('ALL')}
                >
                  Show all {posts.length} posts
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {visiblePosts.map((p) => {
                  const isLong = p.content.length > 360;
                  const open = expanded.has(p.id);
                  const intent = intents[p.id];
                  const crm = crmPosts[p.id];
                  return (
                    <article key={p.id} className={s.contactItem} style={{ background: 'var(--o-bg)', display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: 12 }}>
                      <input type="checkbox" aria-label={`Select post by ${p.authorName}`} checked={selected.has(p.id)} disabled={p.alreadySaved} onChange={() => setSelected(toggle(selected, p.id))} style={{ marginTop: 4, width: 16, height: 16 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                          <div style={{ minWidth: 0 }}>
                            <div className={s.cellStrong}>
                              {p.authorProfileUrl ? <a className={s.link} href={p.authorProfileUrl} target="_blank" rel="noopener noreferrer">{p.authorName}</a> : p.authorName}
                              {p.authorCompany && p.authorType === 'profile' && <span className={s.chipMeta}> · {p.authorCompany}</span>}
                            </div>
                            {p.authorHeadline && <div className={s.cellSub} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.authorHeadline}</div>}
                          </div>
                          <div className={s.badgeRow}>
                            {intent && <IntentBadge intent={intent} />}
                            {crm && <CrmBadge match={crm} />}
                            {p.postedAt && <span className={`${s.badge} ${s.badgeGray}`}>{formatDate(p.postedAt)}</span>}
                            <span className={`${s.badge} ${s.badgeGray}`}><ThumbsUp size={11} /> {p.likes} · {p.comments} comments</span>
                            {p.alreadySaved && <span className={`${s.badge} ${s.badgeGreen}`}><CheckCircle2 size={11} /> Saved</span>}
                          </div>
                        </div>
                        {intent?.reason && intent.level !== 'COLD' && (
                          <div className={s.cellSub} style={{ marginTop: 6, color: intent.level === 'HOT' ? 'var(--o-danger)' : 'var(--o-warn)', fontWeight: 600 }}>
                            <Sparkles size={12} style={{ verticalAlign: -2, marginRight: 4 }} />{intent.reason}
                          </div>
                        )}
                        <p style={{ margin: '10px 0', fontSize: 13.5, lineHeight: 1.6, color: 'var(--o-text-2)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                          {open || !isLong ? p.content : `${p.content.slice(0, 360)}…`}
                          {isLong && <button type="button" className={s.link} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 6px', font: 'inherit' }} onClick={() => setExpanded(toggle(expanded, p.id))}>{open ? 'Show less' : 'Show more'}</button>}
                        </p>
                        <div className={s.actionGroup}>
                          {!crm && (
                            <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} disabled={postCrmBusy !== null} onClick={() => handleAddPostToCrm(p)} title="Saves the post and adds its author to your CRM pipeline">
                              {postCrmBusy === p.id ? <Loader2 size={13} className={s.spin} /> : <UserPlus size={13} />} Add to CRM
                            </button>
                          )}
                          <button type="button" className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} disabled={p.alreadySaved || savingPosts} onClick={() => savePosts([p])}>
                            <Send size={13} /> {p.alreadySaved ? 'In your leads' : 'Send to Review Queue'}
                          </button>
                          <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} disabled={commentBusy !== null} onClick={() => handleDraftComment(p)} title="Drafts a short comment to warm up the author before you reach out">
                            {commentBusy === p.id ? <Loader2 size={13} className={s.spin} /> : <MessageSquareQuote size={13} />} {comments[p.id] ? 'Redraft comment' : 'Draft comment'}
                          </button>
                          <a className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} href={p.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} /> Open post</a>
                        </div>
                        {comments[p.id] && (
                          <div className={`${s.notice} ${s.noticeInfo}`} style={{ marginTop: 10, alignItems: 'center' }}>
                            <span style={{ flex: 1, whiteSpace: 'pre-wrap' }}>{comments[p.id]}</span>
                            <button
                              type="button"
                              className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`}
                              onClick={async () => {
                                if (!(await copyText(comments[p.id]))) return notify('Copy failed. Select the text and copy it by hand.', true);
                                notify('Comment copied. Paste it under the post on LinkedIn.');
                                window.open(p.url, '_blank', 'noopener,noreferrer');
                              }}
                            >
                              <Copy size={13} /> Copy &amp; open post
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {/* PEOPLE */}
      {tab === 'people' && (
        <>
          <section className={s.card} aria-label="Search LinkedIn people">
            <div>
              <h3 className={s.cardTitle}><span className={s.iconTile}><UserRound size={16} /></span> Find decision makers</h3>
              <p className={s.cardSubtitle}>Combine any of these. Separate several job titles or locations with commas.</p>
            </div>
            <form onSubmit={handlePeopleSearch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
              <input className={s.input} value={jobTitles} onChange={(e) => setJobTitles(e.target.value)} placeholder="Job titles: Founder, CTO" aria-label="Job titles" disabled={peopleLoading} />
              <input className={s.input} value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company name (optional)" aria-label="Company name" disabled={peopleLoading} />
              <input className={s.input} value={locations} onChange={(e) => setLocations(e.target.value)} placeholder="Locations: London, Berlin" aria-label="Locations" disabled={peopleLoading} />
              <input className={s.input} value={peopleQuery} onChange={(e) => setPeopleQuery(e.target.value)} placeholder="Keyword: fintech, SaaS…" aria-label="Keyword" disabled={peopleLoading} />
              <button type="submit" className={`${s.btn} ${s.btnPrimary}`} style={{ height: 42 }} disabled={peopleLoading}>
                {peopleLoading ? <Loader2 size={16} className={s.spin} /> : <Search size={16} />} {peopleLoading ? 'Searching…' : 'Search people'}
              </button>
            </form>
            {peopleNote && <div className={s.cellSub}>{peopleNote}</div>}
          </section>

          <section className={s.card} aria-label="People results" aria-busy={peopleLoading}>
            <h3 className={s.cardTitle}>Results{peopleSearched ? ` (${people.length})` : ''}</h3>
            {peopleLoading ? (
              <div className={s.empty}>
                <div className={s.emptyIconBadge}>
                  <Loader2 size={24} className={s.spin} />
                </div>
                <div className={s.emptyTitle}>Searching LinkedIn People…</div>
                <p className={s.emptySubtitle}>
                  Scanning profiles matching your target criteria. This usually takes 10 to 40 seconds.
                </p>
              </div>
            ) : people.length === 0 ? (
              <div className={s.empty}>
                <div className={s.emptyIconBadge}>
                  <Users size={24} />
                </div>
                <div className={s.emptyTitle}>{peopleSearched ? 'No decision makers matched' : 'Find Decision Makers on LinkedIn'}</div>
                <p className={s.emptySubtitle}>
                  {peopleSearched
                    ? 'Try using fewer filters or broadening the job title.'
                    : connected
                      ? 'Target founders, VP of Engineering, or CTOs across your key geographies and save them straight to CRM.'
                      : 'Connect LinkedIn above first; the search works as soon as the key is added.'}
                </p>
                {!peopleSearched && (
                  <div className={s.emptyPillSection}>
                    <div className={s.emptyPillLabel}>Popular title filters</div>
                    <div className={s.emptyPills}>
                      {['Founder', 'CEO', 'CTO', 'VP of Engineering', 'Head of Product', 'Tech Lead'].map((t) => (
                        <button
                          key={t}
                          type="button"
                          className={s.emptyPill}
                          onClick={() => setJobTitles(t)}
                        >
                          + {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={s.contactGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                {people.map((p) => (
                  <article key={p.id} className={s.contactItem} style={{ background: 'var(--o-bg)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>
                      <div className={s.cellStrong}>{p.fullName}</div>
                      <div className={s.contactSub}>{[p.jobTitle, p.companyName].filter(Boolean).join(' at ') || p.headline}</div>
                      {p.headline && (p.jobTitle || p.companyName) && <div className={s.cellSub} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.headline}</div>}
                      {p.location && <div className={s.cellSub}>{p.location}</div>}
                    </div>
                    <div className={s.badgeRow}>
                      {crmPeople[p.id] && <CrmBadge match={crmPeople[p.id]} />}
                      {p.hiring && <span className={`${s.badge} ${s.badgeIndigo}`}>Hiring</span>}
                      {p.email && <span className={`${s.badge} ${s.badgeGreen}`}>{p.email}</span>}
                      {p.followerCount !== undefined && <span className={`${s.badge} ${s.badgeGray}`}>{p.followerCount.toLocaleString()} followers</span>}
                    </div>
                    <div className={s.actionGroup} style={{ marginTop: 'auto' }}>
                      <button type="button" className={`${s.btn} ${addedToCrm.has(p.id) || crmPeople[p.id] ? s.btnSuccess : s.btnPrimary} ${s.btnSm}`} disabled={crmBusy === p.id || addedToCrm.has(p.id) || !!crmPeople[p.id]} onClick={() => handleAddToCrm(p)}>
                        {crmBusy === p.id ? <Loader2 size={13} className={s.spin} /> : addedToCrm.has(p.id) || crmPeople[p.id] ? <Check size={13} /> : <UserPlus size={13} />} {addedToCrm.has(p.id) || crmPeople[p.id] ? 'In CRM' : 'Add to CRM'}
                      </button>
                      <a className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} href={p.profileUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} /> Profile</a>
                      <button type="button" className={`${s.iconBtn} ${copied === p.id ? s.iconBtnDone : ''}`} aria-label="Copy profile URL" onClick={async () => { if (await copyText(p.profileUrl)) { setCopied(p.id); setTimeout(() => setCopied(null), 1500); } }}>
                        {copied === p.id ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* INBOX */}
      {tab === 'inbox' && (
        <section className={s.card} aria-label="Discovered posts">
          <div className={s.cardHeader}>
            <div>
              <h3 className={s.cardTitle}><span className={s.iconTile}><Inbox size={16} /></span> Discovered posts</h3>
              <p className={s.cardSubtitle}>Posts found by keyword scans, strongest buying intent first, waiting for your decision.</p>
            </div>
            <div className={s.actionGroup}>
              {inboxUnscored > 0 && (
                <button type="button" className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} onClick={handleScoreInbox} disabled={inboxScoring}>
                  {inboxScoring ? <Loader2 size={14} className={s.spin} /> : <Sparkles size={14} />} Score {inboxUnscored} unscored
                </button>
              )}
              <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={refreshInbox}><RefreshCw size={14} /> Refresh</button>
            </div>
          </div>
          {inbox.length === 0 ? (
            <div className={s.empty}>
              <div className={s.emptyIconBadge}>
                <Inbox size={24} />
              </div>
              <div className={s.emptyTitle}>Your signal inbox is clear</div>
              <p className={s.emptySubtitle}>
                Run “Scan my keywords” on the Post signals tab to discover active discussions matching your saved target terms.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {inbox.map((item) => (
                <article key={item.id} className={s.contactItem} style={{ background: 'var(--o-bg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <div className={s.cellStrong}>
                        {item.authorProfileUrl ? <a className={s.link} href={item.authorProfileUrl} target="_blank" rel="noopener noreferrer">{item.authorName}</a> : item.authorName}
                        {item.companyName && <span className={s.chipMeta}> · {item.companyName}</span>}
                      </div>
                      {item.authorHeadline && <div className={s.cellSub}>{item.authorHeadline}</div>}
                    </div>
                    <div className={s.badgeRow}>
                      {item.intent && <IntentBadge intent={item.intent} />}
                      <span className={`${s.badge} ${s.badgeIndigo}`}>{item.matchedKeyword}</span>
                      {item.postedAt && <span className={`${s.badge} ${s.badgeGray}`}>{formatDate(item.postedAt)}</span>}
                      <span className={`${s.badge} ${s.badgeGray}`}><ThumbsUp size={11} /> {item.engagementCount}</span>
                    </div>
                  </div>
                  {item.intent?.reason && item.intent.level !== 'COLD' && (
                    <div className={s.cellSub} style={{ marginTop: 6, color: item.intent.level === 'HOT' ? 'var(--o-danger)' : 'var(--o-warn)', fontWeight: 600 }}>
                      <Sparkles size={12} style={{ verticalAlign: -2, marginRight: 4 }} />{item.intent.reason}
                    </div>
                  )}
                  <p style={{ margin: '10px 0', fontSize: 13.5, lineHeight: 1.6, color: 'var(--o-text-2)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                    {item.postPreview.length > 420 ? `${item.postPreview.slice(0, 420)}…` : item.postPreview}
                  </p>
                  <div className={s.actionGroup}>
                    <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} disabled={inboxBusy === item.id} onClick={() => handleInbox(item, 'REVIEW_QUEUE')}>
                      {inboxBusy === item.id ? <Loader2 size={13} className={s.spin} /> : <Send size={13} />} Send to Review Queue
                    </button>
                    <a className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} href={item.postUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} /> Open post</a>
                    <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} disabled={inboxBusy === item.id} onClick={() => handleInbox(item, 'DISMISSED')}>
                      <Trash2 size={13} /> Dismiss
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
