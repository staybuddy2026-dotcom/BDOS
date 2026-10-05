'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, ArrowRightLeft, Calendar, CheckSquare, FileText, Globe, Hand, Info, Loader2, Mail, MessageSquare, Pencil, Phone,
  PauseCircle, PlayCircle, Plus, Reply, RotateCcw, Search, Send, Share2, Sparkles, Square, Star, Trash2, UserPlus, Video, X, Zap,
} from 'lucide-react';
import {
  addDealMeetingAction,
  addDealNoteAction,
  addDealProposalAction,
  addDealTaskAction,
  assignDealsAction,
  enrichContactWithApolloAction,
  getDealAiBriefingAction,
  logEmailReplyAction,
  saveDealContactAction,
  setPrimaryContactAction,
  toggleDealTaskAction,
  updateDealAction,
} from '@/features/crm/actions';
import { sendDealEmailAction } from '@/features/email/actions';
import { markFollowUpSentAction, sendFollowUpNowAction, setSequencePausedAction } from '@/features/outreach/actions';
import type { MailboxStatus } from '@/features/email/actions';
import { DEAL_STAGES, LINKEDIN_STATUS_LABELS, SOURCE_LABELS, formatUsd } from '@/features/crm/types';
import type { CrmActivityType, CrmAiBriefing, CrmContact, CrmUser, DealDetail, DealStage } from '@/features/crm/types';
import { LinkedInContactActions } from './LinkedInContactActions';
import s from '@/components/ui/ui.module.css';
import c from './crm.module.css';
import { Notify, OwnerChip, Time, toDateInput } from './ui';

type Tab = 'overview' | 'activity' | 'sequence' | 'tasks' | 'meetings' | 'proposals' | 'ai';

const EVENT_STYLE: Partial<Record<CrmActivityType, string>> = {
  EMAIL: c.eventEmail, STAGE_CHANGE: c.eventStage, LINKEDIN: c.eventLinkedin, MEETING: c.eventMeeting, NOTE: c.eventNote, CALL: c.eventNote,
};

function EventIcon({ type }: { type: CrmActivityType }) {
  const size = 14;
  switch (type) {
    case 'EMAIL': return <Mail size={size} />;
    case 'CALL': return <Phone size={size} />;
    case 'MEETING': return <Video size={size} />;
    case 'PROPOSAL': return <FileText size={size} />;
    case 'TASK': return <CheckSquare size={size} />;
    case 'STAGE_CHANGE': return <ArrowRightLeft size={size} />;
    case 'LINKEDIN': return <Share2 size={size} />;
    case 'NOTE': return <MessageSquare size={size} />;
    default: return <Info size={size} />;
  }
}

const emptyContact = { name: '', title: '', email: '', phone: '', linkedinUrl: '' };

type DrawerProps = {
  deal: DealDetail | null;
  loading: boolean;
  me: CrmUser;
  team: CrmUser[];
  canSeeAll: boolean;
  mailbox: MailboxStatus;
  onClose: () => void;
  onChanged: () => Promise<void>;
  onMove: (stage: DealStage) => void;
  onDelete: () => void;
  notify: Notify;
};

/**
 * Side panel for one deal: stage, owner, next action, contacts, timeline, tasks, meetings and proposals.
 * Every change is saved through a server action and then `onChanged` reloads the board and this deal.
 */
export function CrmDealDrawer(props: DrawerProps) {
  const { deal, loading, onClose } = props;

  // While a deal is shown, DealPanel owns Escape (it may have the email composer open).
  useEffect(() => {
    if (deal) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deal, onClose]);

  return (
    <>
      <div className={c.drawerBackdrop} onClick={onClose} aria-hidden />
      <aside className={c.drawer} role="dialog" aria-modal="true" aria-label={deal ? `Deal: ${deal.company.name}` : 'Deal'}>
        {deal ? (
          // Keyed by deal so tabs, forms and the composer start clean when another deal is opened.
          <DealPanel key={deal.id} {...props} deal={deal} />
        ) : (
          <>
            <div className={c.drawerHead}>
              <div className={c.drawerTitleRow}>
                <h2 className={c.drawerTitle}>{loading ? 'Loading deal…' : 'Deal not found'}</h2>
                <button type="button" className={s.iconBtn} onClick={onClose} aria-label="Close"><X size={18} /></button>
              </div>
            </div>
            <div className={c.drawerLoading}>
              {loading ? <><Loader2 size={18} className={s.spin} /> Loading…</> : 'This deal no longer exists or is not visible to you.'}
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function DealPanel({ deal, me, team, canSeeAll, mailbox, onClose, onChanged, onMove, onDelete, notify }: DrawerProps & { deal: DealDetail }) {
  const [tab, setTab] = useState<Tab>('overview');
  const [busy, setBusy] = useState<string | null>(null);

  // Editable deal fields (saved when the field loses focus).
  const [title, setTitle] = useState(deal.title);
  const [value, setValue] = useState(deal.value == null ? '' : String(deal.value));
  const [nextAction, setNextAction] = useState(deal.nextAction || '');
  const [nextActionDate, setNextActionDate] = useState(toDateInput(deal.nextActionDate));
  const [expectedClose, setExpectedClose] = useState(toDateInput(deal.expectedCloseDate));

  // The saved values can change from outside the inputs (a stage move, "Use as next action"): follow them.
  const savedKey = [deal.title, deal.value, deal.nextAction, deal.nextActionDate, deal.expectedCloseDate].join('|');
  const [syncedKey, setSyncedKey] = useState(savedKey);
  if (syncedKey !== savedKey) {
    setSyncedKey(savedKey);
    setTitle(deal.title);
    setValue(deal.value == null ? '' : String(deal.value));
    setNextAction(deal.nextAction || '');
    setNextActionDate(toDateInput(deal.nextActionDate));
    setExpectedClose(toDateInput(deal.expectedCloseDate));
  }

  const [note, setNote] = useState('');
  const [task, setTask] = useState({ title: '', dueDate: '', priority: 'NORMAL' as 'HIGH' | 'NORMAL' | 'LOW' });
  const [meeting, setMeeting] = useState({ title: '', startTime: '', attendees: '', meetingUrl: '', notes: '' });
  const [proposal, setProposal] = useState({ title: '', amount: '', validUntil: '' });
  const [contactForm, setContactForm] = useState<{ id: string | null; values: typeof emptyContact } | null>(null);
  const [email, setEmail] = useState<{ contact: CrmContact; subject: string; body: string } | null>(null);
  const [briefing, setBriefing] = useState<CrmAiBriefing | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (email) setEmail(null); else onClose(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [email, onClose]);

  /** Runs a server action, shows its error (or the success text) and reloads the deal. */
  const run = async (key: string, action: () => Promise<{ error?: string; message?: string }>, success?: string): Promise<boolean> => {
    setBusy(key);
    try {
      const res = await action();
      if (res.error) { notify('error', res.error); return false; }
      if (success || res.message) notify('success', success || res.message!);
      await onChanged();
      return true;
    } catch {
      notify('error', 'Something went wrong. Please try again.');
      return false;
    } finally {
      setBusy(null);
    }
  };

  const locked = !deal.canEdit;
  const closed = deal.stage === 'WON' || deal.stage === 'LOST';

  const saveField = (patch: Parameters<typeof updateDealAction>[1]) => run('field', () => updateDealAction(deal.id, patch));

  const saveValue = () => {
    const parsed = value.trim() === '' ? null : Number(value.replace(/[$,\s]/g, ''));
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) return notify('error', 'Enter the deal value as a number, e.g. 25000.');
    if (parsed !== deal.value) saveField({ value: parsed });
  };

  const openEmail = (contact: CrmContact) => {
    const firstName = contact.name.split(/\s+/)[0];
    setEmail({ contact, subject: '', body: `Hi ${firstName},\n\n\n${mailbox.signature ? `\n${mailbox.signature}` : ''}` });
  };

  const sendEmail = async () => {
    if (!email) return;
    if (email.subject.trim().length < 3) return notify('error', 'Add a subject line.');
    if (email.body.trim().length < 10) return notify('error', 'The message is too short.');
    const ok = await run('email', () => sendDealEmailAction({ dealId: deal.id, contactId: email.contact.id, subject: email.subject, body: email.body }));
    if (ok) setEmail(null);
  };

  const stageIndex = DEAL_STAGES.findIndex((st) => st.id === deal.stage);

  return (
          <>
            {/* Header */}
            <div className={c.drawerHead}>
              <div className={c.drawerTitleRow}>
                <div style={{ minWidth: 0 }}>
                  <h2 className={c.drawerTitle}>{deal.company.name}</h2>
                  <div className={s.editorMeta} style={{ marginTop: 4 }}>
                    {deal.company.domain && (
                      <a className={s.link} href={`https://${deal.company.domain}`} target="_blank" rel="noopener noreferrer"><Globe size={12} style={{ verticalAlign: -1 }} /> {deal.company.domain}</a>
                    )}
                    {[deal.company.industry, deal.company.location].filter(Boolean).map((v) => <span key={v}>· {v}</span>)}
                  </div>
                </div>
                <button type="button" className={s.iconBtn} onClick={onClose} aria-label="Close"><X size={18} /></button>
              </div>

              <div className={s.badgeRow}>
                <span className={`${s.badge} ${s.badgeGray}`}>{SOURCE_LABELS[deal.source]}</span>
                <span className={`${s.badge} ${s.badgeIndigo}`}>{deal.probability}% win chance</span>
                {deal.isOverdue && <span className={`${s.badge} ${s.badgeRed}`}><AlertTriangle size={11} /> Next action overdue</span>}
                {deal.isStale && <span className={`${s.badge} ${s.badgeAmber}`}>No activity for 7+ days</span>}
                <span className={s.chipMeta}>Created <Time iso={deal.createdAt} /></span>
              </div>

              <div className={c.stageTrack} role="group" aria-label="Deal stage">
                {DEAL_STAGES.map((st, i) => {
                  const current = st.id === deal.stage;
                  const cls = current ? (st.id === 'WON' ? c.stageWon : st.id === 'LOST' ? c.stageLost : c.stageCurrent) : !closed && i < stageIndex ? c.stageDone : '';
                  return (
                    <button key={st.id} type="button" className={`${c.stageStep} ${cls}`} aria-pressed={current} disabled={locked || busy !== null} onClick={() => !current && onMove(st.id)}>
                      {st.label}
                    </button>
                  );
                })}
              </div>
              {deal.stage === 'LOST' && deal.lostReason && <div className={s.cellSub}>Lost reason: {deal.lostReason}</div>}
            </div>

            <div className={c.drawerBody}>
              {locked && (
                <div className={`${s.notice} ${s.noticeInfo}`} role="status">
                  <Hand size={16} className={s.noticeIcon} />
                  <span style={{ flex: 1 }}>This lead is unassigned. Claim it to change the stage, send email or add notes.</span>
                  <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} disabled={busy !== null} onClick={() => run('claim', () => assignDealsAction([deal.id], me.id), 'Lead claimed. It is now in your pipeline.')}>
                    {busy === 'claim' ? <Loader2 size={13} className={s.spin} /> : <Hand size={13} />} Claim lead
                  </button>
                </div>
              )}

              {/* Deal fields */}
              <div className={c.fieldGrid}>
                <div className={`${c.field} ${c.fieldWide}`}>
                  <label className={c.fieldLabel} htmlFor="deal-title">Deal</label>
                  <input id="deal-title" className={`${s.input} ${c.inputSm}`} value={title} disabled={locked} onChange={(e) => setTitle(e.target.value)} onBlur={() => title.trim() && title.trim() !== deal.title ? saveField({ title }) : setTitle(deal.title)} />
                </div>
                <div className={c.field}>
                  <label className={c.fieldLabel} htmlFor="deal-value">Deal value (USD)</label>
                  <input id="deal-value" className={`${s.input} ${c.inputSm}`} inputMode="numeric" placeholder="Not estimated" value={value} disabled={locked} onChange={(e) => setValue(e.target.value)} onBlur={saveValue} />
                </div>
                <div className={c.field}>
                  <label className={c.fieldLabel} htmlFor="deal-owner">Owner</label>
                  {canSeeAll ? (
                    <select id="deal-owner" className={s.select} style={{ height: 36 }} value={deal.owner?.id || ''} disabled={busy !== null} onChange={(e) => run('owner', () => assignDealsAction([deal.id], e.target.value || null), 'Owner updated.')}>
                      <option value="">Unassigned</option>
                      {team.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  ) : (
                    <div style={{ height: 36, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <OwnerChip owner={deal.owner} />
                      {deal.owner?.id === me.id && (
                        <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} disabled={busy !== null} onClick={() => run('owner', () => assignDealsAction([deal.id], null), 'Lead returned to the unassigned pool.')}>Release</button>
                      )}
                    </div>
                  )}
                </div>
                <div className={c.field}>
                  <label className={c.fieldLabel} htmlFor="deal-next">Next action</label>
                  <input id="deal-next" className={`${s.input} ${c.inputSm}`} placeholder={closed ? 'None' : 'e.g. Send case study'} value={nextAction} disabled={locked} onChange={(e) => setNextAction(e.target.value)} onBlur={() => nextAction.trim() !== (deal.nextAction || '') && saveField({ nextAction })} />
                </div>
                <div className={c.field}>
                  <label className={c.fieldLabel} htmlFor="deal-next-date">Next action date</label>
                  <input id="deal-next-date" type="date" className={`${s.input} ${c.inputSm}`} value={nextActionDate} disabled={locked} onChange={(e) => { setNextActionDate(e.target.value); saveField({ nextActionDate: e.target.value || null }); }} />
                </div>
                <div className={c.field}>
                  <label className={c.fieldLabel} htmlFor="deal-close">Expected close</label>
                  <input id="deal-close" type="date" className={`${s.input} ${c.inputSm}`} value={expectedClose} disabled={locked} onChange={(e) => { setExpectedClose(e.target.value); saveField({ expectedCloseDate: e.target.value || null }); }} />
                </div>
                <div className={c.field}>
                  <span className={c.fieldLabel}>Last activity</span>
                  <div style={{ height: 36, display: 'flex', alignItems: 'center', fontSize: 13.5 }}><Time iso={deal.lastActivityAt} mode="ago" /></div>
                </div>
              </div>

              {/* Tabs */}
              <div className={c.tabs} role="tablist">
                {([
                  { id: 'overview', label: 'Contacts', count: deal.contacts.length },
                  { id: 'activity', label: 'Activity', count: deal.activities.length },
                  { id: 'sequence', label: 'Sequence', count: deal.sequences.reduce((n, q) => n + q.steps.filter((st) => st.status === 'PENDING' || st.status === 'FAILED').length, 0) },
                  { id: 'tasks', label: 'Tasks', count: deal.tasks.filter((t) => !t.completed).length },
                  { id: 'meetings', label: 'Meetings', count: deal.meetings.length },
                  { id: 'proposals', label: 'Proposals', count: deal.proposals.length },
                  { id: 'ai', label: 'AI briefing', count: null },
                ] as const).map((t) => (
                  <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`${c.tab} ${tab === t.id ? c.tabActive : ''}`} onClick={() => setTab(t.id)}>
                    {t.id === 'ai' && <Sparkles size={13} />} {t.label}
                    {t.count !== null && t.count > 0 && <span className={c.tabCount}>{t.count}</span>}
                  </button>
                ))}
              </div>

              {/* CONTACTS */}
              {tab === 'overview' && (
                <>
                  <div className={c.list}>
                    {deal.contacts.length === 0 && !contactForm && (
                      <div className={s.empty}><div className={s.emptyTitle}>No contacts yet</div>Add the decision maker you are talking to.</div>
                    )}
                    {deal.contacts.map((contact) => (
                      <div key={contact.id} className={c.item}>
                        <div className={c.itemHead}>
                          <div style={{ minWidth: 0 }}>
                            <div className={c.itemTitle}>
                              {contact.name}
                              {deal.primaryContact?.id === contact.id && <span className={`${s.badge} ${s.badgeIndigo}`} style={{ marginLeft: 8 }}><Star size={10} /> Primary</span>}
                              {contact.linkedinStatus !== 'NOT_CONNECTED' && (
                                <span className={`${s.badge} ${contact.linkedinStatus === 'REPLIED' ? s.badgeGreen : s.badgeGray}`} style={{ marginLeft: 8 }}><Share2 size={10} /> {LINKEDIN_STATUS_LABELS[contact.linkedinStatus]}</span>
                              )}
                            </div>
                            {contact.title && <div className={s.contactSub}>{contact.title}</div>}
                          </div>
                          <div className={s.actionGroup} style={{ flexWrap: 'nowrap' }}>
                            {deal.primaryContact?.id !== contact.id && (
                              <button type="button" className={s.iconBtn} disabled={locked || busy !== null} title="Make primary contact" aria-label={`Make ${contact.name} the primary contact`} onClick={() => run('primary', () => setPrimaryContactAction(deal.id, contact.id))}><Star size={14} /></button>
                            )}
                            <button type="button" className={s.iconBtn} disabled={locked} title="Edit contact" aria-label={`Edit ${contact.name}`} onClick={() => setContactForm({ id: contact.id, values: { name: contact.name, title: contact.title || '', email: contact.email || '', phone: contact.phone || '', linkedinUrl: contact.linkedinUrl || '' } })}><Pencil size={14} /></button>
                          </div>
                        </div>

                        <div className={s.actionGroup}>
                          {contact.email ? (
                            <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} disabled={locked} onClick={() => openEmail(contact)} title={`Send an email to ${contact.email}`}>
                              <Send size={12} /> Email {contact.email}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`}
                              disabled={locked || busy !== null}
                              title="Looks this person up in Apollo. Uses 1 Apollo credit."
                              onClick={() => window.confirm(`Look up ${contact.name} in Apollo? This uses 1 Apollo credit.`) && run(`apollo-${contact.id}`, () => enrichContactWithApolloAction(deal.id, contact.id))}
                            >
                              {busy === `apollo-${contact.id}` ? <Loader2 size={12} className={s.spin} /> : <Search size={12} />} Find email with Apollo
                            </button>
                          )}
                          {contact.email && (
                            <button
                              type="button"
                              className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`}
                              disabled={locked || busy !== null}
                              title="Record that they replied by email. Stops any scheduled follow-ups for this deal."
                              onClick={() => run(`reply-${contact.id}`, () => logEmailReplyAction(deal.id, contact.id))}
                            >
                              {busy === `reply-${contact.id}` ? <Loader2 size={12} className={s.spin} /> : <Reply size={12} />} They replied
                            </button>
                          )}
                          {contact.phone && <a className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} href={`tel:${contact.phone}`}><Phone size={12} /> {contact.phone}</a>}
                        </div>

                        <LinkedInContactActions dealId={deal.id} contact={contact} disabled={locked} connectionsToday={deal.linkedinConnectionsToday} onChanged={onChanged} notify={notify} />
                      </div>
                    ))}
                  </div>

                  {contactForm ? (
                    <form className={c.inlineForm} onSubmit={async (e) => { e.preventDefault(); if (await run('contact', () => saveDealContactAction(deal.id, contactForm.id, contactForm.values), contactForm.id ? 'Contact updated.' : 'Contact added.')) setContactForm(null); }}>
                      <div className={s.sectionLabel} style={{ margin: 0 }}>{contactForm.id ? 'Edit contact' : 'New contact'}</div>
                      <div className={c.formRow}>
                        <input className={`${s.input} ${c.inputSm} ${c.grow}`} placeholder="Full name" aria-label="Contact name" autoFocus required value={contactForm.values.name} onChange={(e) => setContactForm({ ...contactForm, values: { ...contactForm.values, name: e.target.value } })} />
                        <input className={`${s.input} ${c.inputSm} ${c.grow}`} placeholder="Job title" aria-label="Job title" value={contactForm.values.title} onChange={(e) => setContactForm({ ...contactForm, values: { ...contactForm.values, title: e.target.value } })} />
                      </div>
                      <div className={c.formRow}>
                        <input className={`${s.input} ${c.inputSm} ${c.grow}`} type="email" placeholder="Email" aria-label="Email" value={contactForm.values.email} onChange={(e) => setContactForm({ ...contactForm, values: { ...contactForm.values, email: e.target.value } })} />
                        <input className={`${s.input} ${c.inputSm} ${c.grow}`} placeholder="Phone" aria-label="Phone" value={contactForm.values.phone} onChange={(e) => setContactForm({ ...contactForm, values: { ...contactForm.values, phone: e.target.value } })} />
                      </div>
                      <input className={`${s.input} ${c.inputSm}`} placeholder="LinkedIn profile URL (optional)" aria-label="LinkedIn profile URL" value={contactForm.values.linkedinUrl} onChange={(e) => setContactForm({ ...contactForm, values: { ...contactForm.values, linkedinUrl: e.target.value } })} />
                      <div className={s.modalActions} style={{ margin: 0 }}>
                        <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={() => setContactForm(null)}>Cancel</button>
                        <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} disabled={busy !== null}>{busy === 'contact' && <Loader2 size={13} className={s.spin} />} Save contact</button>
                      </div>
                    </form>
                  ) : (
                    <div><button type="button" className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} disabled={locked} onClick={() => setContactForm({ id: null, values: emptyContact })}><UserPlus size={13} /> Add contact</button></div>
                  )}

                  {(deal.company.technologies.length > 0 || deal.company.tags.length > 0 || deal.company.employeeCount || deal.company.revenue) && (
                    <div>
                      <div className={s.sectionLabel}>Company</div>
                      <div className={s.badgeRow}>
                        {deal.company.employeeCount ? <span className={`${s.badge} ${s.badgeGray}`}>{deal.company.employeeCount.toLocaleString()} employees</span> : null}
                        {deal.company.revenue && <span className={`${s.badge} ${s.badgeGray}`}>{deal.company.revenue}</span>}
                        {deal.company.technologies.map((t) => <span key={`t-${t}`} className={`${s.badge} ${s.badgeIndigo}`}>{t}</span>)}
                        {deal.company.tags.map((t) => <span key={`g-${t}`} className={`${s.badge} ${s.badgeGreen}`}>{t}</span>)}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ACTIVITY */}
              {tab === 'activity' && (
                <>
                  <div className={c.inlineForm}>
                    <textarea className={`${s.textarea} ${c.textareaSm}`} placeholder="Write a note or a call summary…" aria-label="Note" value={note} disabled={locked} onChange={(e) => setNote(e.target.value)} />
                    <div className={s.modalActions} style={{ margin: 0 }}>
                      <button type="button" className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} disabled={locked || busy !== null || !note.trim()} onClick={async () => { if (await run('note', () => addDealNoteAction(deal.id, note, 'CALL'))) setNote(''); }}><Phone size={13} /> Log call</button>
                      <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} disabled={locked || busy !== null || !note.trim()} onClick={async () => { if (await run('note', () => addDealNoteAction(deal.id, note, 'NOTE'))) setNote(''); }}><Plus size={13} /> Add note</button>
                    </div>
                  </div>
                  <div className={c.timeline}>
                    {deal.activities.map((a) => (
                      <div key={a.id} className={c.event}>
                        <span className={`${c.eventIcon} ${EVENT_STYLE[a.type] || ''}`}><EventIcon type={a.type} /></span>
                        <div style={{ minWidth: 0 }}>
                          <div className={c.itemHead}>
                            <span className={c.itemTitle}>{a.title}</span>
                            <Time iso={a.createdAt} mode="ago" className={c.itemMeta} />
                          </div>
                          {a.details && <p className={c.itemText} style={{ marginTop: 4 }}>{a.details}</p>}
                          {a.userName && <div className={s.cellSub}>{a.userName}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* SEQUENCE */}
              {tab === 'sequence' && (
                deal.sequences.length === 0 ? (
                  <div className={s.empty}>
                    <div className={s.emptyTitle}>No outreach sequence for this deal</div>
                    Write and schedule one in <Link className={s.link} href="/engagement">Outreach</Link>; its stages will show here.
                  </div>
                ) : (
                  deal.sequences.map((seq) => {
                    const pending = seq.steps.filter((st) => st.status === 'PENDING').length;
                    const onHold = seq.steps.filter((st) => st.status === 'CANCELLED').length;
                    const automatic = seq.autoSend && seq.channel === 'EMAIL';
                    return (
                      <div key={seq.draftId} className={c.list}>
                        <div className={`${s.notice} ${seq.stoppedReason ? s.noticeWarn : s.noticeInfo}`} style={{ alignItems: 'center' }}>
                          {automatic ? <Zap size={16} className={s.noticeIcon} /> : <Info size={16} className={s.noticeIcon} />}
                          <span style={{ flex: 1 }}>
                            {seq.stoppedReason
                              ? `Stopped: ${seq.stoppedReason}.`
                              : automatic
                                ? `Emails go to ${seq.toEmail} automatically on their dates${seq.ownerName ? `, from ${seq.ownerName}'s mailbox` : ''}.`
                                : `${seq.channel === 'LINKEDIN' ? 'LinkedIn messages are' : 'This sequence is'} sent by hand: each stage appears in Today on its date.`}
                          </span>
                          {(pending > 0 || onHold > 0) && (
                            <button type="button" className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} disabled={locked || busy !== null} onClick={() => run('seq', async () => { await setSequencePausedAction(seq.draftId, pending > 0); return {}; }, pending > 0 ? 'Sequence paused.' : 'Sequence resumed.')}>
                              {pending > 0 ? <><PauseCircle size={13} /> Pause</> : <><PlayCircle size={13} /> Resume</>}
                            </button>
                          )}
                        </div>
                        {seq.steps.map((st) => (
                          <div key={st.id} className={c.item}>
                            <div className={c.itemHead}>
                              <span className={c.itemTitle}>{st.stage ? `Stage ${st.stage}: ` : ''}{st.subject || 'Follow-up'}</span>
                              <span className={`${s.badge} ${st.status === 'SENT' ? s.badgeGreen : st.status === 'FAILED' ? s.badgeRed : st.status === 'CANCELLED' ? s.badgeGray : st.status === 'SENDING' ? s.badgeAmber : s.badgeIndigo}`}>
                                {st.status === 'SENT' ? 'Sent' : st.status === 'FAILED' ? 'Failed' : st.status === 'CANCELLED' ? 'On hold' : st.status === 'SENDING' ? 'Sending' : 'Scheduled'}
                              </span>
                            </div>
                            <div className={s.cellSub}>
                              {st.status === 'SENT' && st.sentAt ? <>Sent <Time iso={st.sentAt} mode="datetime" /></> : <>Due <Time iso={st.dueDate} mode="datetime" /></>}
                            </div>
                            {st.error && <div className={s.fieldError}>{st.error}</div>}
                            {(st.status === 'PENDING' || st.status === 'FAILED') && (
                              <div className={s.actionGroup}>
                                {seq.channel === 'EMAIL' && seq.toEmail && (
                                  <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} disabled={locked || busy !== null} onClick={() => window.confirm(`Send stage ${st.stage ?? ''} to ${seq.toEmail} now?`) && run(`fu-${st.id}`, () => sendFollowUpNowAction(st.id))}>
                                    {busy === `fu-${st.id}` ? <Loader2 size={12} className={s.spin} /> : st.status === 'FAILED' ? <RotateCcw size={12} /> : <Send size={12} />} {st.status === 'FAILED' ? 'Retry now' : 'Send now'}
                                  </button>
                                )}
                                <button type="button" className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} disabled={locked || busy !== null} onClick={() => run(`fu-${st.id}`, () => markFollowUpSentAction(st.id), 'Marked as sent.')}>
                                  <CheckSquare size={12} /> I sent it myself
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })
                )
              )}

              {/* TASKS */}
              {tab === 'tasks' && (
                <>
                  <form className={c.inlineForm} onSubmit={async (e) => { e.preventDefault(); if (await run('task', () => addDealTaskAction(deal.id, task), 'Task added.')) setTask({ title: '', dueDate: '', priority: 'NORMAL' }); }}>
                    <input className={`${s.input} ${c.inputSm}`} placeholder="What needs to be done?" aria-label="Task" required disabled={locked} value={task.title} onChange={(e) => setTask({ ...task, title: e.target.value })} />
                    <div className={c.formRow}>
                      <input type="date" className={`${s.input} ${c.inputSm} ${c.grow}`} aria-label="Due date" required disabled={locked} value={task.dueDate} onChange={(e) => setTask({ ...task, dueDate: e.target.value })} />
                      <select className={s.select} style={{ height: 36 }} aria-label="Priority" disabled={locked} value={task.priority} onChange={(e) => setTask({ ...task, priority: e.target.value as typeof task.priority })}>
                        <option value="HIGH">High priority</option>
                        <option value="NORMAL">Normal priority</option>
                        <option value="LOW">Low priority</option>
                      </select>
                      <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} style={{ height: 36 }} disabled={locked || busy !== null}><Plus size={13} /> Add task</button>
                    </div>
                  </form>
                  <div className={c.list}>
                    {deal.tasks.length === 0 && <div className={s.empty}>No tasks for this deal yet.</div>}
                    {deal.tasks.map((t) => (
                      <button key={t.id} type="button" className={`${c.item} ${t.completed ? c.itemDone : ''}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, cursor: locked ? 'not-allowed' : 'pointer', textAlign: 'left', font: 'inherit' }} disabled={locked || busy !== null} onClick={() => run('task', () => toggleDealTaskAction(t.id))} aria-pressed={t.completed}>
                        {t.completed ? <CheckSquare size={18} style={{ color: 'var(--o-success)', flexShrink: 0 }} /> : <Square size={18} style={{ color: 'var(--o-subtle)', flexShrink: 0 }} />}
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span className={c.itemTitle} style={{ display: 'block' }}>{t.title}</span>
                          <span className={s.cellSub}>Due <Time iso={t.dueDate} />{t.assigneeName ? ` · ${t.assigneeName}` : ''}</span>
                        </span>
                        {t.priority === 'HIGH' && !t.completed && <span className={`${s.badge} ${s.badgeRed}`}>High</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* MEETINGS */}
              {tab === 'meetings' && (
                <>
                  <form className={c.inlineForm} onSubmit={async (e) => {
                    e.preventDefault();
                    const ok = await run('meeting', () => addDealMeetingAction(deal.id, { ...meeting, startTime: meeting.startTime ? new Date(meeting.startTime).toISOString() : '', attendees: meeting.attendees.split(',') }), 'Meeting saved.');
                    if (ok) setMeeting({ title: '', startTime: '', attendees: '', meetingUrl: '', notes: '' });
                  }}>
                    <div className={c.formRow}>
                      <input className={`${s.input} ${c.inputSm} ${c.grow}`} placeholder="Meeting title, e.g. Discovery call" aria-label="Meeting title" required disabled={locked} value={meeting.title} onChange={(e) => setMeeting({ ...meeting, title: e.target.value })} />
                      <input type="datetime-local" className={`${s.input} ${c.inputSm} ${c.grow}`} aria-label="Date and time" required disabled={locked} value={meeting.startTime} onChange={(e) => setMeeting({ ...meeting, startTime: e.target.value })} />
                    </div>
                    <div className={c.formRow}>
                      <input className={`${s.input} ${c.inputSm} ${c.grow}`} placeholder="Attendees (comma separated)" aria-label="Attendees" disabled={locked} value={meeting.attendees} onChange={(e) => setMeeting({ ...meeting, attendees: e.target.value })} />
                      <input className={`${s.input} ${c.inputSm} ${c.grow}`} placeholder="Meeting link (Meet, Zoom, Teams)" aria-label="Meeting link" disabled={locked} value={meeting.meetingUrl} onChange={(e) => setMeeting({ ...meeting, meetingUrl: e.target.value })} />
                    </div>
                    <textarea className={`${s.textarea} ${c.textareaSm}`} style={{ minHeight: 60 }} placeholder="Agenda or outcome" aria-label="Notes" disabled={locked} value={meeting.notes} onChange={(e) => setMeeting({ ...meeting, notes: e.target.value })} />
                    <div className={s.modalActions} style={{ margin: 0 }}>
                      <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} disabled={locked || busy !== null}><Calendar size={13} /> Save meeting</button>
                    </div>
                  </form>
                  <div className={c.list}>
                    {deal.meetings.length === 0 && <div className={s.empty}>No meetings yet. Saving one moves the deal to “Meeting Scheduled”.</div>}
                    {deal.meetings.map((m) => (
                      <div key={m.id} className={c.item}>
                        <div className={c.itemHead}>
                          <span className={c.itemTitle}>{m.title}</span>
                          <Time iso={m.startTime} mode="datetime" className={c.itemMeta} />
                        </div>
                        {m.attendees.length > 0 && <div className={s.cellSub}>Attendees: {m.attendees.join(', ')}</div>}
                        {m.notes && <p className={c.itemText}>{m.notes}</p>}
                        {m.meetingUrl && <a className={s.link} style={{ fontSize: 13 }} href={m.meetingUrl} target="_blank" rel="noopener noreferrer"><Video size={13} style={{ verticalAlign: -2 }} /> Open meeting link</a>}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* PROPOSALS */}
              {tab === 'proposals' && (
                <>
                  <form className={c.inlineForm} onSubmit={async (e) => {
                    e.preventDefault();
                    const amount = proposal.amount.trim() ? Number(proposal.amount.replace(/[$,\s]/g, '')) : null;
                    if (amount !== null && !Number.isFinite(amount)) return notify('error', 'Enter the amount as a number, e.g. 25000.');
                    if (await run('proposal', () => addDealProposalAction(deal.id, { title: proposal.title, amount, validUntil: proposal.validUntil }), 'Proposal recorded.')) setProposal({ title: '', amount: '', validUntil: '' });
                  }}>
                    <div className={c.formRow}>
                      <input className={`${s.input} ${c.inputSm} ${c.grow}`} placeholder="Proposal title or version, e.g. v1 Commercial" aria-label="Proposal title" required disabled={locked} value={proposal.title} onChange={(e) => setProposal({ ...proposal, title: e.target.value })} />
                      <input className={`${s.input} ${c.inputSm}`} style={{ width: 140 }} inputMode="numeric" placeholder="Amount (USD)" aria-label="Amount in USD" disabled={locked} value={proposal.amount} onChange={(e) => setProposal({ ...proposal, amount: e.target.value })} />
                    </div>
                    <div className={c.formRow}>
                      <label className={s.cellSub} htmlFor="proposal-valid">Valid until</label>
                      <input id="proposal-valid" type="date" className={`${s.input} ${c.inputSm} ${c.grow}`} disabled={locked} value={proposal.validUntil} onChange={(e) => setProposal({ ...proposal, validUntil: e.target.value })} />
                      <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} style={{ height: 36 }} disabled={locked || busy !== null}><FileText size={13} /> Record proposal</button>
                    </div>
                  </form>
                  <div className={c.list}>
                    {deal.proposals.length === 0 && <div className={s.empty}>No proposals yet. Recording one moves the deal to “Proposal Sent”.</div>}
                    {deal.proposals.map((p) => (
                      <div key={p.id} className={c.item}>
                        <div className={c.itemHead}>
                          <span className={c.itemTitle}>{p.title}</span>
                          <span className={`${s.badge} ${p.stage === 'WON' ? s.badgeGreen : p.stage === 'LOST' ? s.badgeRed : s.badgeIndigo}`}>{p.stage.charAt(0) + p.stage.slice(1).toLowerCase()}</span>
                        </div>
                        <div className={s.cellSub}>
                          {formatUsd(p.amount)} · Sent <Time iso={p.createdAt} />{p.validUntil && <> · Valid until <Time iso={p.validUntil} /></>}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* AI BRIEFING */}
              {tab === 'ai' && (
                <>
                  <div className={`${s.notice} ${s.noticeInfo}`}>
                    <Sparkles size={16} className={s.noticeIcon} />
                    <span style={{ flex: 1 }}>Suggestions written from this deal’s contacts, timeline, tasks and meetings. The more you log, the better they get.</span>
                    <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} disabled={busy !== null} onClick={async () => {
                      setBusy('ai');
                      try {
                        const res = await getDealAiBriefingAction(deal.id);
                        if (res.error || !res.briefing) notify('error', res.error || 'No briefing was returned.');
                        else setBriefing(res.briefing);
                      } catch { notify('error', 'The AI briefing could not be generated.'); } finally { setBusy(null); }
                    }}>
                      {busy === 'ai' ? <Loader2 size={13} className={s.spin} /> : <Sparkles size={13} />} {briefing ? 'Regenerate' : 'Generate'}
                    </button>
                  </div>
                  {briefing && (
                    <div className={c.list}>
                      <div className={c.item}><div className={s.sectionLabel} style={{ margin: 0 }}>Where this deal stands</div><p className={c.itemText}>{briefing.summary}</p></div>
                      <div className={c.item} style={{ borderColor: '#c7d2fe', background: 'var(--o-accent-soft)' }}>
                        <div className={s.sectionLabel} style={{ margin: 0, color: 'var(--o-accent)' }}>Recommended next action</div>
                        <p className={c.itemText}>{briefing.recommendedNextAction}</p>
                        {!locked && briefing.recommendedNextAction && (
                          <div><button type="button" className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} disabled={busy !== null} onClick={() => run('field', () => updateDealAction(deal.id, { nextAction: briefing.recommendedNextAction.slice(0, 180) }), 'Saved as the next action.')}>Use as next action</button></div>
                        )}
                      </div>
                      {([['Discovery questions', briefing.discoveryQuestions], ['Risks and gaps', briefing.risks], ['Services that fit', briefing.suggestedServices]] as const).filter(([, items]) => items.length > 0).map(([label, items]) => (
                        <div key={label} className={c.item}>
                          <div className={s.sectionLabel} style={{ margin: 0 }}>{label}</div>
                          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {items.map((item) => <li key={item} className={c.itemText}>{item}</li>)}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {deal.canEdit && (
                <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--o-border)' }}>
                  <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm} ${c.dangerBtn}`} disabled={busy !== null} onClick={onDelete}><Trash2 size={13} /> Delete deal</button>
                </div>
              )}
            </div>

      {/* Email composer */}
      {email && (
        <div className={s.backdrop} style={{ zIndex: 9500 }} onClick={() => busy === null && setEmail(null)}>
          <div className={`${s.modal} ${c.modalWide}`} role="dialog" aria-modal="true" aria-labelledby="email-title" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h3 className={s.modalTitle} id="email-title"><Mail size={17} /> Email {email.contact.name}</h3>
              <button type="button" className={s.iconBtn} onClick={() => setEmail(null)} aria-label="Close"><X size={16} /></button>
            </div>
            {mailbox.connected ? (
              <p className={s.modalText}>To <strong>{email.contact.email}</strong> · From <strong>{mailbox.address}</strong>{mailbox.source === 'team' ? ' (team mailbox, replies go to you)' : ''}</p>
            ) : (
              <div className={`${s.notice} ${s.noticeWarn}`} role="alert">
                <AlertTriangle size={16} className={s.noticeIcon} />
                <span>No mailbox is connected yet. <Link className={s.link} href="/profile">Connect your mailbox in Profile</Link> to send email from here.</span>
              </div>
            )}
            <div>
              <label className={s.label} htmlFor="email-subject">Subject</label>
              <input id="email-subject" className={s.input} style={{ marginTop: 6 }} autoFocus maxLength={200} value={email.subject} onChange={(e) => setEmail({ ...email, subject: e.target.value })} />
            </div>
            <div>
              <label className={s.label} htmlFor="email-body">Message</label>
              <textarea id="email-body" className={s.textarea} style={{ marginTop: 6, minHeight: 220 }} value={email.body} onChange={(e) => setEmail({ ...email, body: e.target.value })} />
            </div>
            <div className={s.modalActions}>
              <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={() => setEmail(null)} disabled={busy !== null}>Cancel</button>
              <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={sendEmail} disabled={busy !== null || !mailbox.connected}>
                {busy === 'email' ? <Loader2 size={15} className={s.spin} /> : <Send size={15} />} {busy === 'email' ? 'Sending…' : 'Send email'}
              </button>
            </div>
          </div>
        </div>
      )}
          </>
  );
}
