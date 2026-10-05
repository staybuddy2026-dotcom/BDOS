'use client';

import Link from 'next/link';
import { ArrowRight, BookOpen, CheckCircle2, CircleDashed, HelpCircle, Layers, MessageSquare, ShieldQuestion, Users } from 'lucide-react';
import type { OpportunityPlaybookModel } from '@/features/playbook/types';
import s from '@/components/ui/ui.module.css';

/**
 * The sales playbook for one company. Everything company-specific comes from its Company 360 profile;
 * areas with no data say so, so the BDE knows what to find out rather than repeating a guess.
 */
export function OpportunityPlaybook({ playbook }: { playbook: OpportunityPlaybookModel }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <section className={s.card}>
        <div className={s.cardHeader} style={{ flexWrap: 'wrap', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div className={s.sectionLabel} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><BookOpen size={13} /> Sales playbook</div>
            <h3 className={s.cardTitle} style={{ marginTop: 4 }}>{playbook.companyName}</h3>
            <p className={s.cardSubtitle}>{playbook.summary}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className={s.sectionLabel}>Fit score</div>
            <div className={s.kpiValue} style={{ marginTop: 2 }}>{playbook.fitScore}</div>
            <div className={s.cellSub}>{playbook.dataCompleteness}% of the data found</div>
          </div>
        </div>
        <div className={`${s.notice} ${s.noticeInfo}`} style={{ alignItems: 'center' }}>
          <ArrowRight size={15} className={s.noticeIcon} />
          <span style={{ flex: 1 }}><strong>Next step:</strong> {playbook.nextBestAction}</span>
          {playbook.domain && (
            <Link href={`/engagement?domain=${encodeURIComponent(playbook.domain)}`} className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`}>Write outreach</Link>
          )}
        </div>
      </section>

      <section className={s.card}>
        <h4 className={s.cardTitle}><CheckCircle2 size={15} /> What the score is based on</h4>
        {playbook.evidence.length === 0 ? (
          <p className={s.cardSubtitle}>Nothing is known about this company yet, so it has no score. Search it in Apollo to fill in the profile.</p>
        ) : (
          <table className={s.table} style={{ fontSize: 13 }}>
            <tbody>
              {playbook.evidence.map((e) => (
                <tr key={e.label}>
                  <td style={{ padding: '8px 0', fontWeight: 600, whiteSpace: 'nowrap', paddingRight: 12 }}>{e.label}</td>
                  <td style={{ padding: '8px 0', color: 'var(--o-text-2)' }}>{e.detail}</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700 }}>+{e.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={s.card}>
        <h4 className={s.cardTitle}><Layers size={15} /> Fit</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
          {playbook.fitAreas.map((a) => (
            <div key={a.area} className={s.metric} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className={s.metricLabel}>{a.area}</div>
              {a.found.length ? (
                a.found.map((f) => <div key={f} style={{ fontSize: 13, display: 'flex', gap: 6 }}><CheckCircle2 size={13} style={{ color: 'var(--o-success)', flexShrink: 0, marginTop: 2 }} /> {f}</div>)
              ) : (
                <div className={s.cellSub} style={{ display: 'flex', gap: 6 }}><CircleDashed size={13} style={{ flexShrink: 0, marginTop: 2 }} /> Not found yet</div>
              )}
              <div className={s.fieldHint}>{a.note}</div>
            </div>
          ))}
        </div>
      </section>

      <section className={s.card}>
        <h4 className={s.cardTitle}><Layers size={15} /> Services to offer</h4>
        {playbook.services.length === 0 ? (
          <p className={s.cardSubtitle}>No service in your catalog matches a known part of their stack yet. Admins can edit the catalog in Settings &gt; Service catalog.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
            {playbook.services.map((svc) => (
              <div key={svc.name} className={s.metric} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{svc.name}</div>
                <div className={s.cellSub}>{svc.reason}</div>
                <div className={s.badgeRow}>
                  {svc.matchedTech.slice(0, 5).map((t) => <span key={t} className={`${s.badge} ${s.badgeIndigo}`}>{t}</span>)}
                  {svc.startingPrice && <span className={`${s.badge} ${s.badgeGray}`}>{svc.startingPrice}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={s.card}>
        <h4 className={s.cardTitle}><Users size={15} /> Who to contact</h4>
        {playbook.contacts.length === 0 ? (
          <p className={s.cardSubtitle}>No senior contact found yet. Search this domain in Apollo.</p>
        ) : (
          <table className={s.table} style={{ fontSize: 13 }}>
            <tbody>
              {playbook.contacts.map((c, i) => (
                <tr key={c.name + i}>
                  <td style={{ padding: '8px 0', fontWeight: 600 }}>{i + 1}. {c.name}</td>
                  <td style={{ padding: '8px 0', color: 'var(--o-text-2)' }}>{c.title}</td>
                  <td style={{ padding: '8px 0', textAlign: 'right' }}>
                    {c.channel === 'Email' && c.email
                      ? <a className={s.link} href={`mailto:${c.email}`}>{c.email}</a>
                      : c.linkedinUrl ? <a className={s.link} href={c.linkedinUrl} target="_blank" rel="noopener noreferrer">LinkedIn</a> : <span className={s.cellSub}>No contact details yet</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={s.card}>
        <h4 className={s.cardTitle}><MessageSquare size={15} /> Opening line</h4>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, fontStyle: 'italic' }}>&ldquo;{playbook.openingLine}&rdquo;</p>
        <div>
          <div className={s.sectionLabel} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><HelpCircle size={13} /> Questions for the discovery call</div>
          <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13.5, color: 'var(--o-text-2)' }}>
            {playbook.discoveryQuestions.map((q) => <li key={q}>{q}</li>)}
          </ol>
        </div>
      </section>

      <section className={s.card}>
        <h4 className={s.cardTitle}><ShieldQuestion size={15} /> Common objections</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {playbook.objections.map((ob) => (
            <div key={ob.objection} className={s.metric} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>&ldquo;{ob.objection}&rdquo;</div>
              <div style={{ fontSize: 13, color: 'var(--o-text-2)' }}>{ob.response}</div>
              <div className={s.cellSub}>Ask: {ob.followUp}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
