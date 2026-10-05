'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, ArrowRight, CalendarClock, CalendarDays, Check, CheckCircle2, CheckSquare, ChevronDown, Clock, Copy, ExternalLink, Hand, Inbox, Loader2,
  Mail, Moon, Plus, RotateCcw, Search, Send, Share2, Sparkles, Sun, Sunrise, Video, Zap,
} from 'lucide-react';
import { addMyTaskAction, getTodayAction, toggleTaskAction } from '@/features/today/actions';
import type { TodayData, TodayFollowUp } from '@/features/today/service';
import { completeNextActionAction } from '@/features/crm/actions';
import { markFollowUpSentAction, sendFollowUpNowAction } from '@/features/outreach/actions';
import { STAGE_LABELS } from '@/features/crm/types';
import s from '@/components/ui/ui.module.css';
import { useToast } from '@/components/ui/useToast';
import { Time } from '@/components/crm/ui';
import t from './today.module.css';

const dealHref = (dealId: string) => `/crm?deal=${dealId}`;

const copyText = async (text: string) => {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
};

/** yyyy-mm-dd in the browser's time zone, `offset` days from today. */
const localDate = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const greetingFor = (d: Date) => (d.getHours() < 12 ? 'Good morning' : d.getHours() < 17 ? 'Good afternoon' : 'Good evening');
const greetingIconFor = (d: Date) => {
  const h = d.getHours();
  if (h < 12) return <Sunrise size={20} className={t.timeIcon} />;
  if (h < 17) return <Sun size={20} className={t.timeIcon} />;
  return <Moon size={20} className={t.timeIcon} />;
};
const clockText = (d: Date) => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(d);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "in 25 min", "in 2 h 10 min", "started 5 min ago" relative to `now`. */
const relative = (iso: string, now: Date) => {
  const mins = Math.round((new Date(iso).getTime() - now.getTime()) / 60000);
  const span = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);
  if (mins > 0) return { label: `in ${span(mins)}`, state: mins <= 30 ? 'soon' : 'later' } as const;
  if (mins === 0) return { label: 'starting now', state: 'now' } as const;
  return { label: `started ${span(-mins)} ago`, state: -mins <= 60 ? 'now' : 'past' } as const;
};

type Filter = 'all' | 'fix' | 'send' | 'deals' | 'tasks' | 'meetings' | 'auto' | 'look';
type Tone = 'accent' | 'danger' | 'warn' | 'success' | 'info';
const TONE: Record<Tone, string> = { accent: '', danger: t.toneDanger, warn: t.toneWarn, success: t.toneSuccess, info: t.toneInfo };

function Section({ tone = 'accent', icon, title, count, subtitle, open, onToggle, children }: {
  tone?: Tone; icon: ReactNode; title: string; count?: number; subtitle?: string; open: boolean; onToggle: () => void; children: ReactNode;
}) {
  return (
    <section className={`${t.section} ${TONE[tone]}`} aria-label={title}>
      <button type="button" className={t.sectionHead} onClick={onToggle} aria-expanded={open}>
        <span className={t.sectionIcon}>{icon}</span>
        <span className={t.sectionText}>
          <span className={t.sectionTitle}>{title}{count !== undefined && <span className={t.count}>{count}</span>}</span>
          {subtitle && <span className={t.sectionSub} style={{ display: 'block' }}>{subtitle}</span>}
        </span>
        <ChevronDown size={18} className={`${t.chevron} ${open ? t.chevronOpen : ''}`} />
      </button>
      <div className={`${t.collapse} ${open ? '' : t.collapsed}`}>
        <div className={t.collapseInner}><div className={t.sectionBody}>{children}</div></div>
      </div>
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className={t.empty}>
      <span className={t.emptyIconBadge}>
        <CheckCircle2 size={15} className={t.emptyIcon} />
      </span>
      <span>{children}</span>
    </div>
  );
}

/**
 * The signed-in person's day: what to send, what to do on which deal, tasks and meetings.
 * Everything here can be finished from this page; each action reloads the lists.
 */
export function TodayWorkspace({ initialData, name }: { initialData: TodayData; name: string }) {
  const [data, setData] = useState(initialData);
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [task, setTask] = useState({ title: '', dueDate: '' });
  const [filter, setFilter] = useState<Filter>('all');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  /** Rows being completed: shown struck through until the reload removes them. */
  const [leaving, setLeaving] = useState<Set<string>>(new Set());
  /** Items finished since the page was opened, for the progress ring. */
  const [cleared, setCleared] = useState(0);
  /** Set after mount so server and browser render the same first frame. */
  const [now, setNow] = useState<Date | null>(null);

  const { toast, notify } = useToast();

  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 30000);
    return () => { clearTimeout(first); clearInterval(id); };
  }, []);

  /** Runs a server action, shows the outcome and reloads the day. */
  const run = async (key: string, action: () => Promise<{ error?: string; message?: string }>, success?: string, countsAsDone = false): Promise<boolean> => {
    setBusy(key);
    if (countsAsDone) setLeaving((prev) => new Set(prev).add(key));
    try {
      const res = await action();
      if (res.error) { notify(res.error, true); setData(await getTodayAction()); return false; }
      if (success || res.message) notify(success || res.message!);
      if (countsAsDone) setCleared((n) => n + 1);
      setData(await getTodayAction());
      return true;
    } catch {
      notify('Something went wrong. Please try again.', true);
      return false;
    } finally {
      setBusy(null);
      if (countsAsDone) setLeaving((prev) => { const next = new Set(prev); next.delete(key); return next; });
    }
  };

  const toggleSection = (id: string) => setCollapsed((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const failed = data.followUps.filter((f) => f.status === 'FAILED');
  const manual = data.followUps.filter((f) => f.mode === 'MANUAL' && f.status !== 'FAILED');
  const automatic = data.followUps.filter((f) => f.mode === 'AUTO' && f.status !== 'FAILED');
  const upcoming = data.upcoming.tasks + data.upcoming.nextActions + data.upcoming.followUps + data.upcoming.meetings;
  const nothingToday = data.actionCount === 0 && data.meetings.length === 0 && automatic.length === 0;
  const overdue = data.tasks.filter((x) => x.overdue).length + data.nextActions.filter((x) => x.overdue).length + data.followUps.filter((x) => x.overdue && x.status !== 'FAILED').length;
  const worthALook = data.staleDeals.length + (data.unassignedLeads > 0 ? 1 : 0);

  const total = cleared + data.actionCount;
  const progress = total === 0 ? 1 : cleared / total;
  const R = 46;
  const C = 2 * Math.PI * R;
  const nextMeeting = now ? data.meetings.find((m) => relative(m.startTime, now).state !== 'past') : undefined;
  const firstName = name.split(/\s+/)[0];

  const filters: { key: Filter; label: string; count: number; icon: ReactNode; hidden?: boolean; alert?: boolean }[] = [
    { key: 'all', label: 'Everything', count: data.actionCount, icon: <Inbox size={14} /> },
    { key: 'fix', label: 'Not sent', count: failed.length, icon: <AlertTriangle size={14} />, hidden: failed.length === 0, alert: true },
    { key: 'send', label: 'To send', count: manual.length, icon: <Send size={14} /> },
    { key: 'deals', label: 'Deal actions', count: data.nextActions.length, icon: <CalendarClock size={14} /> },
    { key: 'tasks', label: 'Tasks', count: data.tasks.length, icon: <CheckSquare size={14} /> },
    { key: 'meetings', label: 'Meetings', count: data.meetings.length, icon: <Video size={14} /> },
    { key: 'auto', label: 'Automatic', count: automatic.length, icon: <Zap size={14} /> },
    { key: 'look', label: 'Worth a look', count: worthALook, icon: <Clock size={14} />, hidden: worthALook === 0 },
  ];
  const show = (key: Filter) => filter === 'all' || filter === key;

  const copyAndOpen = async (f: TodayFollowUp) => {
    const ok = await copyText(f.channel === 'LINKEDIN' ? f.body : `${f.subject}\n\n${f.body}`);
    notify(ok ? 'Message copied.' : 'Copy failed. Open the message and copy it by hand.', !ok);
    if (ok && f.channel === 'LINKEDIN' && f.linkedinUrl) window.open(f.linkedinUrl, '_blank', 'noopener,noreferrer');
  };

  const followUpRow = (f: TodayFollowUp) => {
    const isEmail = f.channel !== 'LINKEDIN';
    const open = expanded === f.id;
    const key = `fu-${f.id}`;
    return (
      <div key={f.id} className={`${t.row} ${f.overdue || f.status === 'FAILED' ? t.rowOverdue : ''} ${leaving.has(key) ? t.rowLeaving : ''}`}>
        <div className={t.rowHead}>
          <div className={t.rowMain}>
            <div className={t.rowTitle}>
              {f.company}
              {f.contactName ? <span style={{ color: '#64748b', fontWeight: 500 }}> · {f.contactName}</span> : ''}
            </div>
            <div className={t.rowMeta}>
              <span className={`${t.channelBadge} ${isEmail ? t.channelEmail : t.channelLinkedin}`}>
                {isEmail ? <Mail size={11} /> : <Share2 size={11} />} {isEmail ? 'Email' : 'LinkedIn'} stage {f.stage ?? ''}
              </span>
              {f.subject && isEmail && <span className={t.metaDot}>{f.subject}</span>}
            </div>
          </div>
          <div className={s.badgeRow} style={{ flexShrink: 0 }}>
            {f.status === 'FAILED'
              ? <span className={`${s.badge} ${s.badgeRed}`}><AlertTriangle size={11} /> Not sent</span>
              : f.overdue
                ? <span className={t.itemOverdueBadge}><AlertTriangle size={11} /> Overdue · <Time iso={f.dueDate} /></span>
                : <span className={`${s.badge} ${f.mode === 'AUTO' ? s.badgeIndigo : s.badgeAmber}`}>{f.mode === 'AUTO' ? <Zap size={11} /> : <Clock size={11} />} <Time iso={f.dueDate} mode="datetime" /></span>}
          </div>
        </div>
        {f.error && <div className={t.rowError}>{f.error}</div>}
        <div className={`${t.collapse} ${open ? '' : t.collapsed}`}>
          <div className={t.collapseInner}>
            <p className={t.message}>
              {isEmail && f.subject && <span className={t.messageSubject}>{f.subject}</span>}
              {f.body || 'No message saved for this follow-up.'}
            </p>
          </div>
        </div>
        <div className={`${t.rowActions} ${f.status === 'FAILED' ? '' : t.rowActionsQuiet}`}>
          {isEmail && f.toEmail && (
            <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} disabled={busy !== null} onClick={() => window.confirm(`Send this email to ${f.toEmail} now?`) && run(key, () => sendFollowUpNowAction(f.id), undefined, true)}>
              {busy === key ? <Loader2 size={13} className={s.spin} /> : f.status === 'FAILED' ? <RotateCcw size={13} /> : <Send size={13} />} {f.status === 'FAILED' ? 'Retry now' : 'Send now'}
            </button>
          )}
          {!isEmail && (
            <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} onClick={() => copyAndOpen(f)}>
              <Copy size={13} /> {f.linkedinUrl ? 'Copy & open LinkedIn' : 'Copy message'}
            </button>
          )}
          <button type="button" className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} disabled={busy !== null} onClick={() => run(key, () => markFollowUpSentAction(f.id), 'Marked as sent.', true)}>
            <CheckSquare size={13} /> I sent it myself
          </button>
          <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={() => setExpanded(open ? null : f.id)} aria-expanded={open}>
            <ChevronDown size={13} className={`${t.chevron} ${open ? t.chevronOpen : ''}`} /> {open ? 'Hide message' : 'Read message'}
          </button>
          {f.dealId && <Link className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} href={dealHref(f.dealId)}><ExternalLink size={13} /> Deal</Link>}
        </div>
      </div>
    );
  };

  const stat = (key: Filter, label: ReactNode, value: number, foot: ReactNode, icon: ReactNode, toneClass: string) => (
    <button
      type="button"
      className={`${t.stat} ${t[toneClass] || ''} ${filter === key && key !== 'all' ? t.statActive : ''}`}
      onClick={() => setFilter(filter === key ? 'all' : key)}
      aria-pressed={filter === key}
    >
      <div className={t.statTop}>
        <span className={t.statLabel}>{label}</span>
        <span className={t.statIconBadge}>{icon}</span>
      </div>
      <span className={t.statValue}>{value}</span>
      <span className={t.statFoot}>{foot}</span>
    </button>
  );

  return (
    <div className={s.root}>
      {toast}

      {/* Hero: greeting, progress and the day at a glance */}
      <div className={t.hero}>
        <div className={`${t.ring} ${data.actionCount === 0 ? t.ringDone : ''}`} role="img" aria-label={data.actionCount === 0 ? 'Nothing left to do' : `${data.actionCount} left to do`}>
          <div className={t.ringGlow} />
          <svg viewBox="0 0 112 112" aria-hidden>
            <defs>
              <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="60%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
              <linearGradient id="ringGradDone" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>
            <circle className={t.ringTrack} cx="56" cy="56" r={R} />
            <circle className={t.ringValue} cx="56" cy="56" r={R} strokeDasharray={C} strokeDashoffset={C * (1 - progress)} />
          </svg>
          <div className={t.ringCenter}>
            {data.actionCount === 0
              ? <><Check size={28} strokeWidth={3} className={t.ringCheck} /><span className={t.ringLabel}>All done</span></>
              : <><span className={t.ringNum}>{data.actionCount}</span><span className={t.ringLabel}>left to do</span></>}
          </div>
        </div>

        <div className={t.heroBody}>
          <div>
            <div className={t.greetingRow}>
              {now && (
                <div className={t.greetingIconBadge}>
                  {greetingIconFor(now)}
                </div>
              )}
              <h2 className={t.greeting}>
                {now ? greetingFor(now) : 'Hello'}, <span className={t.greetingName}>{firstName}</span>
              </h2>
              {now && (
                <span className={t.clockPill}>
                  <span className={t.clockPulseDot} />
                  <Clock size={11} /> {clockText(now)}
                </span>
              )}
            </div>
            <p className={t.heroLine}>
              {data.actionCount === 0
                ? <>Nothing is waiting on you right now.</>
                : <>You have <strong>{plural(data.actionCount, 'thing')} to do</strong> today{overdue > 0 && <span className={t.overduePill}><AlertTriangle size={11} /> {overdue} overdue</span>}.</>}
              {' '}
              {nextMeeting && now
                ? <>Next meeting: <strong>{nextMeeting.title}</strong> {relative(nextMeeting.startTime, now).label}.</>
                : data.meetings.length === 0 ? <>No meetings today.</> : null}
            </p>
            {cleared > 0 && <div className={t.progressNote}>{plural(cleared, 'item')} cleared since you opened this page.</div>}
          </div>

          <div className={t.stats}>
            {stat('all', 'To do today', data.actionCount, data.actionCount ? 'Tasks, actions, follow-ups' : 'Nothing waiting on you', <Inbox size={14} />, 'statTodo')}
            {stat('meetings', 'Meetings', data.meetings.length, data.meetings[0] ? <>First: <Time iso={data.meetings[0].startTime} mode="datetime" /></> : 'None scheduled', <Video size={14} />, 'statMeetings')}
            {stat('auto', 'Automatic', automatic.length, failed.length ? <span className={t.statAlert}><AlertTriangle size={11} /> {failed.length} failed</span> : 'Emails sent for you', <Zap size={14} />, 'statAuto')}
            <div className={`${t.stat} ${t.statUpcoming}`} style={{ cursor: 'default' }}>
              <div className={t.statTop}>
                <span className={t.statLabel}>Next 7 days</span>
                <span className={t.statIconBadge}><CalendarDays size={14} /></span>
              </div>
              <span className={t.statValue}>{upcoming}</span>
              <span className={t.statFoot} title={`${data.upcoming.followUps} follow-ups · ${data.upcoming.tasks + data.upcoming.nextActions} to-dos · ${data.upcoming.meetings} meetings`}>
                {data.upcoming.followUps} follow-ups · {data.upcoming.tasks + data.upcoming.nextActions} to-dos · {data.upcoming.meetings} meetings
              </span>
            </div>
          </div>
        </div>
      </div>

      {nothingToday ? (
        <div className={t.allClear}>
          <span className={t.allClearIcon}><Sparkles size={24} /></span>
          <h3 className={t.allClearTitle}>You are all caught up, {firstName}</h3>
          <div>
            {data.unassignedLeads > 0
              ? <>There {data.unassignedLeads === 1 ? 'is 1 unassigned lead' : `are ${data.unassignedLeads} unassigned leads`} in the CRM you could claim.</>
              : <>A good moment to find new prospects.</>}
          </div>
          <div className={t.allClearActions}>
            {data.unassignedLeads > 0 && <Link className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} href="/crm"><Hand size={13} /> Claim leads</Link>}
            <Link className={`${s.btn} ${data.unassignedLeads > 0 ? s.btnSecondary : s.btnPrimary} ${s.btnSm}`} href="/apollo-search"><Search size={13} /> Search Apollo</Link>
            <Link className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} href="/linkedin"><Share2 size={13} /> Scan LinkedIn</Link>
          </div>
        </div>
      ) : (
        <nav className={t.filterBar} aria-label="Show">
          {filters.filter((f) => !f.hidden).map((f) => (
            <button
              key={f.key}
              type="button"
              className={`${t.filter} ${filter === f.key ? t.filterActive : ''} ${f.alert ? t.filterAlert : ''}`}
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
            >
              {f.icon} {f.label} <span className={t.filterCount}>{f.count}</span>
            </button>
          ))}
        </nav>
      )}

      {failed.length > 0 && show('fix') && (
        <Section open={!collapsed.has('fix')} onToggle={() => toggleSection('fix')} tone="danger" icon={<AlertTriangle size={17} />} title="Emails that could not be sent" count={failed.length}
          subtitle="The sequence is waiting on these. Fix the cause shown, then retry, or send it yourself and mark it as sent.">
          <div className={t.list}>{failed.map(followUpRow)}</div>
        </Section>
      )}

      {show('send') && (manual.length > 0 || filter === 'send') && (
        <Section open={!collapsed.has('send')} onToggle={() => toggleSection('send')} tone="warn" icon={<Send size={17} />} title="Follow-ups to send" count={manual.length}
          subtitle="Outreach stages due now that you send yourself: LinkedIn messages, and email sequences without automatic sending.">
          {manual.length === 0 ? <Empty>No follow-ups to send by hand today.</Empty> : <div className={t.list}>{manual.map(followUpRow)}</div>}
        </Section>
      )}

      {(show('deals') || show('tasks')) && (
        <div className={t.columns}>
          {show('deals') && (
            <Section open={!collapsed.has('deals')} onToggle={() => toggleSection('deals')} icon={<CalendarClock size={17} />} title="Next actions on your deals" count={data.nextActions.length}
              subtitle="Set on each deal in the CRM. Tick one off and set the next.">
              {data.nextActions.length === 0 ? <Empty>All caught up! No deal actions due today.</Empty> : (
                <div className={t.list}>
                  {data.nextActions.map((a) => {
                    const key = `na-${a.dealId}`;
                    return (
                      <div key={a.dealId} className={`${t.row} ${t.rowInline} ${a.overdue ? t.rowOverdue : ''} ${leaving.has(key) ? t.rowLeaving : ''}`}>
                        <button type="button" className={`${t.check} ${leaving.has(key) ? t.checkOn : ''}`} aria-label={`Mark done: ${a.nextAction}`} disabled={busy !== null}
                          onClick={() => run(key, () => completeNextActionAction(a.dealId), 'Done. Set the next action on the deal.', true)}>
                          {busy === key && !leaving.has(key) ? <Loader2 size={13} className={s.spin} /> : <Check size={14} strokeWidth={3} />}
                        </button>
                        <div className={t.rowMain}>
                          <div className={t.rowTitle}>{a.nextAction}</div>
                          <div className={t.rowMeta}>
                            <span>{a.company}</span>
                            <span className={t.metaDot}>{STAGE_LABELS[a.stage]}</span>
                            <span className={`${t.metaDot} ${a.overdue ? t.overdueText : ''}`}>{a.overdue ? 'Overdue since ' : 'Due '}<Time iso={a.dueDate} /></span>
                          </div>
                        </div>
                        <Link className={`${s.btn} ${s.btnGhost} ${s.btnSm} ${t.rowActionsQuiet}`} href={dealHref(a.dealId)} aria-label={`Open deal ${a.company}`}><ExternalLink size={13} /> Deal</Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>
          )}

          {show('tasks') && (
            <Section open={!collapsed.has('tasks')} onToggle={() => toggleSection('tasks')} tone="success" icon={<CheckSquare size={17} />} title="Your tasks" count={data.tasks.length}
              subtitle="Due today or overdue, from your deals and your own list.">
              <form className={t.quickAdd} onSubmit={async (e) => { e.preventDefault(); if (await run('task-add', () => addMyTaskAction(task), 'Task added.')) setTask({ title: '', dueDate: '' }); }}>
                <Plus size={16} color="#4f46e5" style={{ marginLeft: 4 }} aria-hidden />
                <input className={t.quickInput} placeholder="Add a task for yourself…" aria-label="Task" required value={task.title} onChange={(e) => setTask({ ...task, title: e.target.value })} />
                <div className={t.dateChips}>
                  <button type="button" className={`${t.dateChip} ${task.dueDate === localDate(0) ? t.dateChipOn : ''}`} onClick={() => setTask({ ...task, dueDate: localDate(0) })}>Today</button>
                  <button type="button" className={`${t.dateChip} ${task.dueDate === localDate(1) ? t.dateChipOn : ''}`} onClick={() => setTask({ ...task, dueDate: localDate(1) })}>Tomorrow</button>
                </div>
                <input type="date" className={t.quickDate} aria-label="Due date" required value={task.dueDate} onChange={(e) => setTask({ ...task, dueDate: e.target.value })} />
                <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} style={{ height: 32 }} disabled={busy !== null}>
                  {busy === 'task-add' ? <Loader2 size={13} className={s.spin} /> : <Plus size={13} />} Add
                </button>
              </form>
              {data.tasks.length === 0 ? <Empty>All caught up! No tasks due today.</Empty> : (
                <div className={t.list}>
                  {data.tasks.map((x) => {
                    const key = `task-${x.id}`;
                    return (
                      <div key={x.id} className={`${t.row} ${t.rowInline} ${t.toneSuccess} ${x.overdue ? t.rowOverdue : ''} ${leaving.has(key) ? t.rowLeaving : ''}`}>
                        <button type="button" className={`${t.check} ${leaving.has(key) ? t.checkOn : ''}`} aria-label={`Complete task: ${x.title}`} disabled={busy !== null}
                          onClick={() => run(key, () => toggleTaskAction(x.id), 'Task completed.', true)}>
                          <Check size={14} strokeWidth={3} />
                        </button>
                        <div className={t.rowMain}>
                          <div className={t.rowTitle}>{x.title}</div>
                          <div className={t.rowMeta}>
                            {x.deal && <span>{x.deal.company}</span>}
                            <span className={`${x.deal ? t.metaDot : ''} ${x.overdue ? t.overdueText : ''}`}>{x.overdue ? 'Overdue since ' : 'Due '}<Time iso={x.dueDate} /></span>
                          </div>
                        </div>
                        {x.priority === 'HIGH' && <span className={`${s.badge} ${s.badgeRed}`}>High</span>}
                        {x.deal && <Link className={`${s.btn} ${s.btnGhost} ${s.btnSm} ${t.rowActionsQuiet}`} href={dealHref(x.deal.id)} aria-label={`Open deal ${x.deal.company}`}><ExternalLink size={13} /> Deal</Link>}
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>
          )}
        </div>
      )}

      {(show('meetings') || show('auto')) && (
        <div className={t.columns}>
          {show('meetings') && (
            <Section open={!collapsed.has('meetings')} onToggle={() => toggleSection('meetings')} tone="info" icon={<Video size={17} />} title="Meetings today" count={data.meetings.length}>
              {data.meetings.length === 0 ? <Empty>No meetings today.</Empty> : (
                <div className={t.timeline}>
                  {data.meetings.map((m) => {
                    const rel = now ? relative(m.startTime, now) : null;
                    const slotClass = rel?.state === 'now' ? t.slotNow : rel?.state === 'soon' ? t.slotSoon : rel?.state === 'past' ? t.slotPast : '';
                    return (
                      <div key={m.id} className={`${t.slot} ${slotClass}`}>
                        <div className={t.slotTime} suppressHydrationWarning>{clockText(new Date(m.startTime))}</div>
                        <div className={t.slotRail}><span className={t.slotDot} /></div>
                        <div className={t.slotBody}>
                          <div className={`${t.row} ${t.rowInline} ${t.toneInfo}`}>
                            <div className={t.rowMain}>
                              <div className={t.rowTitle}>{m.title}</div>
                              <div className={t.rowMeta}>
                                <span>{m.company}</span>
                                {rel && <span className={`${t.when} ${rel.state === 'now' ? t.whenNow : rel.state === 'soon' ? t.whenSoon : ''}`}>{rel.label}</span>}
                              </div>
                            </div>
                            {m.meetingUrl && <a className={`${s.btn} ${rel?.state === 'past' ? s.btnSecondary : s.btnPrimary} ${s.btnSm}`} href={m.meetingUrl} target="_blank" rel="noopener noreferrer"><Video size={13} /> Join</a>}
                            {m.dealId && <Link className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} href={dealHref(m.dealId)} aria-label={`Open deal ${m.company}`}><ExternalLink size={13} /></Link>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>
          )}

          {show('auto') && (
            <Section open={!collapsed.has('auto')} onToggle={() => toggleSection('auto')} icon={<Zap size={17} />} title="Going out automatically" count={automatic.length}
              subtitle="Scheduled outreach emails sent from your mailbox. Nothing to do unless you want to send one early.">
              {automatic.length === 0 ? <Empty>No automatic emails are due today.</Empty> : <div className={t.list}>{automatic.map(followUpRow)}</div>}
            </Section>
          )}
        </div>
      )}

      {worthALook > 0 && show('look') && (
        <Section open={!collapsed.has('look')} onToggle={() => toggleSection('look')} tone="warn" icon={<Clock size={17} />} title="Worth a look" count={worthALook}
          subtitle="Your open deals with no activity for a week, and leads nobody has claimed.">
          {data.unassignedLeads > 0 && (
            <div className={t.claim}>
              <Hand size={16} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{plural(data.unassignedLeads, 'unassigned lead')} waiting to be claimed.</span>
              <Link className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} href="/crm">Open CRM <ArrowRight size={13} /></Link>
            </div>
          )}
          {data.staleDeals.length > 0 && (
            <div className={t.staleGrid}>
              {data.staleDeals.map((d) => {
                const days = now ? Math.max(0, Math.floor((now.getTime() - new Date(d.lastActivityAt).getTime()) / 86400000)) : 0;
                return (
                  <Link key={d.dealId} href={dealHref(d.dealId)} className={t.stale}>
                    <span className={t.staleName}>{d.company}<ArrowRight size={14} className={t.staleArrow} /></span>
                    <span className={t.rowMeta}><span>{STAGE_LABELS[d.stage]}</span><span className={t.metaDot}>last activity <Time iso={d.lastActivityAt} mode="ago" /></span></span>
                    <span className={t.quietBar} title={now ? `${days} days without activity` : undefined}>
                      <span className={t.quietFill} style={{ display: 'block', width: `${Math.min(100, (days / 30) * 100)}%` }} />
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}
