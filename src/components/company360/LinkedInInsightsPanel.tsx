'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Check, ExternalLink, Loader2, Share2, ThumbsUp, UserPlus, Users } from 'lucide-react';
import { getLinkedInCompanyInsightsAction, getLinkedInCompanyPeopleAction } from '@/features/linkedin/actions';
import type { LinkedInCompanyInsights } from '@/features/linkedin/actions';
import type { LinkedInProfileResult } from '@/features/linkedin/types';
import { addLinkedInProfileToCrm } from '@/features/crm/actions';
import s from '@/components/ui/ui.module.css';

const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/**
 * Live LinkedIn view of one company: its page, what it posted recently and who to contact.
 * Loaded on demand (each lookup uses the LinkedIn scraper), never with sample data.
 */
export function LinkedInInsightsPanel({ domain, companyName, linkedinUrl }: { domain: string; companyName: string; linkedinUrl?: string }) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<LinkedInCompanyInsights | null>(null);
  const [people, setPeople] = useState<LinkedInProfileResult[] | null>(null);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleError, setPeopleError] = useState<string | null>(null);
  const [crmBusy, setCrmBusy] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [crmMessage, setCrmMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setPeople(null);
    try {
      setInsights(await getLinkedInCompanyInsightsAction({ domain, companyName, linkedinUrl }));
    } catch {
      setInsights({ company: null, posts: [], note: 'LinkedIn lookup failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const loadPeople = async () => {
    if (!insights?.company) return;
    setPeopleLoading(true);
    setPeopleError(null);
    try {
      const res = await getLinkedInCompanyPeopleAction({ companyLinkedinUrl: insights.company.linkedinUrl });
      setPeople(res.items);
      if (res.error) setPeopleError(res.error.message);
    } catch {
      setPeopleError('Could not load people from LinkedIn.');
    } finally {
      setPeopleLoading(false);
    }
  };

  const addToCrm = async (p: LinkedInProfileResult) => {
    setCrmBusy(p.id);
    setCrmMessage(null);
    try {
      const res = await addLinkedInProfileToCrm({ ...p, companyName: p.companyName || insights?.company?.name || companyName });
      if (res.error) return setCrmMessage(res.error);
      setAdded((prev) => new Set(prev).add(p.id));
      setCrmMessage(`${p.fullName} is now in the CRM.`);
    } catch {
      setCrmMessage('Could not add this person to the CRM.');
    } finally {
      setCrmBusy(null);
    }
  };

  const company = insights?.company;
  const problem = insights?.error?.message || (!company ? insights?.note : undefined);

  return (
    <div className={s.root}>
      <section className={s.card}>
        <div className={s.cardHeader}>
          <div>
            <h3 className={s.cardTitle}><span className={s.iconTile}><Share2 size={16} /></span> LinkedIn: {company?.name || companyName}</h3>
            <p className={s.cardSubtitle}>Company page, recent posts and decision makers, fetched live from LinkedIn when you ask.</p>
          </div>
          <button type="button" className={`${s.btn} ${insights ? s.btnSecondary : s.btnPrimary} ${s.btnSm}`} onClick={load} disabled={loading}>
            {loading ? <Loader2 size={14} className={s.spin} /> : <Share2 size={14} />} {loading ? 'Loading…' : insights ? 'Refresh' : 'Load LinkedIn insights'}
          </button>
        </div>

        {problem && (
          <div className={`${s.notice} ${s.noticeWarn}`} role="alert">
            <AlertTriangle size={16} className={s.noticeIcon} />
            <span>{problem}{insights?.error?.code === 'NOT_CONFIGURED' && <> Open the <Link className={s.link} href="/linkedin">LinkedIn page</Link> for setup steps.</>}</span>
          </div>
        )}

        {!insights && !loading && (
          <div className={s.empty}>
            <Share2 size={26} style={{ opacity: 0.5 }} />
            <div className={s.emptyTitle}>No LinkedIn data loaded yet</div>
            Click “Load LinkedIn insights” to fetch this company&apos;s page and recent posts.
          </div>
        )}

        {company && (
          <>
            <div className={s.metricGrid}>
              <div className={s.metric}><div className={s.metricLabel}>Employees on LinkedIn</div><div className={s.metricValue}>{company.employeeCount?.toLocaleString() ?? company.employeeRange ?? 'Not listed'}</div></div>
              <div className={s.metric}><div className={s.metricLabel}>Followers</div><div className={s.metricValue}>{company.followerCount?.toLocaleString() ?? 'Not listed'}</div></div>
              <div className={s.metric}><div className={s.metricLabel}>Industry</div><div className={s.metricValue} title={company.industry}>{company.industry || 'Not listed'}</div></div>
              <div className={s.metric}><div className={s.metricLabel}>Headquarters</div><div className={s.metricValue} title={company.headquarters}>{company.headquarters || 'Not listed'}</div></div>
            </div>
            {company.tagline && <div className={s.cellStrong}>{company.tagline}</div>}
            {company.description && <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: 'var(--o-text-2)', whiteSpace: 'pre-wrap' }}>{company.description.length > 700 ? `${company.description.slice(0, 700)}…` : company.description}</p>}
            {company.specialities.length > 0 && (
              <div className={s.badgeRow}>{company.specialities.map((sp) => <span key={sp} className={`${s.badge} ${s.badgeGray}`}>{sp}</span>)}</div>
            )}
            <div className={s.actionGroup}>
              <a className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} href={company.linkedinUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} /> Company page</a>
              <button type="button" className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} onClick={loadPeople} disabled={peopleLoading}>
                {peopleLoading ? <Loader2 size={13} className={s.spin} /> : <Users size={13} />} {people ? 'Refresh decision makers' : 'Find decision makers'}
              </button>
            </div>
          </>
        )}
      </section>

      {company && (
        <section className={s.card}>
          <h3 className={s.cardTitle}>Recent company posts ({insights?.posts.length || 0})</h3>
          {insights?.posts.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {insights.posts.map((p) => (
                <article key={p.id} className={s.contactItem} style={{ background: 'var(--o-bg)' }}>
                  <div className={s.badgeRow}>
                    {p.postedAt && <span className={`${s.badge} ${s.badgeGray}`}>{formatDate(p.postedAt)}</span>}
                    <span className={`${s.badge} ${s.badgeGray}`}><ThumbsUp size={11} /> {p.likes} · {p.comments} comments</span>
                    <a className={s.link} style={{ fontSize: 12.5 }} href={p.url} target="_blank" rel="noopener noreferrer">Open post</a>
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: 13.5, lineHeight: 1.6, color: 'var(--o-text-2)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                    {p.content.length > 420 ? `${p.content.slice(0, 420)}…` : p.content}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className={s.cellSub}>No posts in the last three months.</div>
          )}
        </section>
      )}

      {(people || peopleError) && (
        <section className={s.card}>
          <h3 className={s.cardTitle}><span className={s.iconTile}><Users size={16} /></span> Decision makers on LinkedIn ({people?.length || 0})</h3>
          {peopleError && <div className={`${s.notice} ${s.noticeWarn}`}><AlertTriangle size={16} className={s.noticeIcon} /><span>{peopleError}</span></div>}
          {crmMessage && <div className={s.cellSub}>{crmMessage}</div>}
          <div className={s.contactGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {(people || []).map((p) => (
              <article key={p.id} className={s.contactItem} style={{ background: 'var(--o-bg)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <div className={s.cellStrong}>{p.fullName}</div>
                  <div className={s.contactSub}>{p.jobTitle || p.headline}</div>
                  {p.location && <div className={s.cellSub}>{p.location}</div>}
                </div>
                <div className={s.actionGroup} style={{ marginTop: 'auto' }}>
                  <button type="button" className={`${s.btn} ${added.has(p.id) ? s.btnSuccess : s.btnPrimary} ${s.btnSm}`} disabled={crmBusy === p.id || added.has(p.id)} onClick={() => addToCrm(p)}>
                    {crmBusy === p.id ? <Loader2 size={13} className={s.spin} /> : added.has(p.id) ? <Check size={13} /> : <UserPlus size={13} />} {added.has(p.id) ? 'In CRM' : 'Add to CRM'}
                  </button>
                  <a className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} href={p.profileUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} /> Profile</a>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
