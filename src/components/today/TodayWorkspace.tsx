'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePageState } from '@/lib/usePageState';
import Link from 'next/link';
import {
  AlertTriangle, ArrowRight, Building, Calendar, CalendarClock, CalendarDays, Check, CheckCircle2, CheckSquare, ChevronDown, Clock, Copy, ExternalLink, Globe, Hand, Inbox, Link2, Loader2,
  Mail, Moon, Plus, RotateCcw, Search, Send, Share2, Sparkles, Sun, Sunrise, Trash2, User, Video, X, Zap,
} from 'lucide-react';
import { addMyTaskAction, addTodayMeetingAction, cancelTodayMeetingAction, getTodayAction, toggleTaskAction, updateTodayMeetingUrlAction } from '@/features/today/actions';
import { sanitizeMeetingUrl, DEFAULT_MEET_URL } from '@/lib/meeting-urls';
import type { TodayData, TodayFollowUp } from '@/features/today/service';
import { completeNextActionAction } from '@/features/crm/actions';
import { markFollowUpSentAction, sendFollowUpNowAction } from '@/features/outreach/actions';
import { STAGE_LABELS } from '@/features/crm/types';
import s from '@/components/ui/ui.module.css';
import { useToast } from '@/components/ui/useToast';
import { Time, formatDate } from '@/components/crm/ui';
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
const dateText = (d: Date) => new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
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

function Section({ tone = 'accent', icon, title, count, subtitle, open, onToggle, action, children }: {
  tone?: Tone; icon: ReactNode; title: string; count?: number; subtitle?: string; open: boolean; onToggle: () => void; action?: ReactNode; children: ReactNode;
}) {
  return (
    <section className={`${t.section} ${TONE[tone]}`} aria-label={title}>
      <div className={t.sectionHeaderContainer}>
        <button type="button" className={t.sectionHead} onClick={onToggle} aria-expanded={open}>
          <span className={t.sectionIcon}>{icon}</span>
          <span className={t.sectionText}>
            <span className={t.sectionTitle}>{title}{count !== undefined && <span className={t.count}>{count}</span>}</span>
            {subtitle && <span className={t.sectionSub} style={{ display: 'block' }}>{subtitle}</span>}
          </span>
        </button>
        <div className={t.sectionHeaderRight}>
          {action && <div className={t.sectionActionSlot}>{action}</div>}
          <button
            type="button"
            className={t.chevronBtn}
            onClick={onToggle}
            aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
            aria-expanded={open}
          >
            <ChevronDown size={18} className={`${t.chevron} ${open ? t.chevronOpen : ''}`} />
          </button>
        </div>
      </div>
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

const isSameDayTask = (iso: string, targetYmd: string) => {
  if (!iso || !targetYmd) return false;
  const d = new Date(iso);
  const localYmd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const utcYmd = iso.slice(0, 10);
  return localYmd === targetYmd || utcYmd === targetYmd;
};

/**
 * The signed-in person's day: what to send, what to do on which deal, tasks and meetings.
 * Everything here can be finished from this page; each action reloads the lists.
 */
export function TodayWorkspace({ initialData, name }: { initialData: TodayData; name: string }) {
  const [data, setData] = useState(initialData);
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [task, setTask] = useState({ title: '', dueDate: '' });
  const [filter, setFilter] = usePageState<Filter>('today.filter', 'all');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  /** Rows being completed: shown struck through until the reload removes them. */
  const [leaving, setLeaving] = useState<Set<string>>(new Set());
  /** Items finished since the page was opened, for the progress ring. */
  const [cleared, setCleared] = useState(0);
  /** Set after mount so server and browser render the same first frame. */
  const [now, setNow] = useState<Date | null>(null);
  const [taskDateFilter, setTaskDateFilter] = useState<'all' | 'today' | 'tomorrow' | 'overdue' | string>('all');
  const [customTaskDate, setCustomTaskDate] = useState<string>('');

  // Schedule meeting modal state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    title: 'Discovery Call',
    companyName: '',
    clientName: '',
    clientEmail: '',
    startTime: '',
    meetingUrl: DEFAULT_MEET_URL,
    dealId: '',
    notes: '',
  });

  // Edit meeting link modal state
  const [editLinkModal, setEditLinkModal] = useState<{ id: string; title: string; url: string } | null>(null);

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

  const openScheduleMeeting = (dealId?: string) => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    let comp = '';
    let cName = '';
    let cEmail = '';
    let mTitle = 'Discovery Call';

    if (dealId && data.availableDeals) {
      const match = data.availableDeals.find((x) => x.id === dealId);
      if (match) {
        comp = match.company;
        cName = match.contactName || '';
        cEmail = match.contactEmail || '';
        mTitle = `Discovery Call with ${match.company}`;
      }
    }

    setMeetingForm({
      title: mTitle,
      companyName: comp,
      clientName: cName,
      clientEmail: cEmail,
      startTime: localIso,
      meetingUrl: DEFAULT_MEET_URL,
      dealId: dealId || '',
      notes: '',
    });
    setScheduleModalOpen(true);
  };

  const onSelectDeal = (selectedDealId: string) => {
    if (!selectedDealId) {
      setMeetingForm((prev) => ({ ...prev, dealId: '' }));
      return;
    }
    const match = (data.availableDeals || []).find((d) => d.id === selectedDealId);
    if (match) {
      setMeetingForm((prev) => ({
        ...prev,
        dealId: selectedDealId,
        companyName: match.company,
        clientName: match.contactName || prev.clientName || '',
        clientEmail: match.contactEmail || prev.clientEmail || '',
        title: prev.title === 'Discovery Call' ? `Discovery Call with ${match.company}` : prev.title,
      }));
    }
  };

  const submitScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingForm.title.trim()) {
      notify('Enter a meeting title.', true);
      return;
    }
    if (!meetingForm.companyName.trim()) {
      notify('Enter a company name.', true);
      return;
    }
    if (!meetingForm.startTime) {
      notify('Pick a meeting date and time.', true);
      return;
    }

    const ok = await run('meeting-schedule', () => addTodayMeetingAction(meetingForm), 'Meeting scheduled.');
    if (ok) {
      setScheduleModalOpen(false);
    }
  };

  const submitUpdateMeetingUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLinkModal) return;
    const ok = await run(
      `edit-meeting-url-${editLinkModal.id}`,
      () => updateTodayMeetingUrlAction(editLinkModal.id, editLinkModal.url),
      'Meeting link updated.'
    );
    if (ok) {
      setEditLinkModal(null);
    }
  };

  const failed = data.followUps.filter((f) => f.status === 'FAILED');
  const manual = data.followUps.filter((f) => f.mode === 'MANUAL' && f.status !== 'FAILED');
  const automatic = data.followUps.filter((f) => f.mode === 'AUTO' && f.status !== 'FAILED');
  const upcoming = data.upcoming.tasks + data.upcoming.nextActions + data.upcoming.followUps + data.upcoming.meetings;
  const nothingToday = data.actionCount === 0 && data.meetings.length === 0 && automatic.length === 0;
  const overdue = data.tasks.filter((x) => x.overdue).length + data.nextActions.filter((x) => x.overdue).length + data.followUps.filter((x) => x.overdue && x.status !== 'FAILED').length;
  const worthALook = data.staleDeals.length + (data.unassignedLeads > 0 ? 1 : 0);

  const todayYmd = localDate(0);
  const tomorrowYmd = localDate(1);
  const todayTasksCount = data.tasks.filter((x) => isSameDayTask(x.dueDate, todayYmd)).length;
  const tomorrowTasksCount = data.tasks.filter((x) => isSameDayTask(x.dueDate, tomorrowYmd)).length;
  const overdueTasksCount = data.tasks.filter((x) => x.overdue).length;

  const filteredTasks = data.tasks.filter((x) => {
    if (taskDateFilter === 'all') return true;
    if (taskDateFilter === 'today') return isSameDayTask(x.dueDate, todayYmd);
    if (taskDateFilter === 'tomorrow') return isSameDayTask(x.dueDate, tomorrowYmd);
    if (taskDateFilter === 'overdue') return x.overdue;
    return isSameDayTask(x.dueDate, taskDateFilter);
  });

  const filterSubtitle =
    taskDateFilter === 'all'
      ? 'All tasks'
      : taskDateFilter === 'today'
      ? 'Today'
      : taskDateFilter === 'tomorrow'
      ? 'Tomorrow'
      : taskDateFilter === 'overdue'
      ? 'Overdue'
      : formatDate(taskDateFilter);

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

      {/* Hero: Greeting, Status Pill, and 4 KPI Cards */}
      <div className={t.hero}>
        <div className={t.heroTop}>
          <div className={t.greetingCol}>
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
                  <span className={t.clockDivider}>·</span>
                  <span>{dateText(now)}</span>
                </span>
              )}
            </div>
            <p className={t.heroLine}>
              {data.actionCount === 0 ? (
                <>
                  <span className={t.heroLineHighlight}>Zero pending actions.</span> No outreach, deal tasks, or meetings waiting for today.
                </>
              ) : (
                <>
                  You have <strong>{plural(data.actionCount, 'action item')} to do</strong> today
                  {overdue > 0 && <span className={t.overduePill}><AlertTriangle size={11} /> {overdue} overdue</span>}.
                  {' '}
                  {nextMeeting && now ? (
                    <>Next meeting: <strong>{nextMeeting.title}</strong> {relative(nextMeeting.startTime, now).label}.</>
                  ) : data.meetings.length === 0 ? (
                    <>Calendar is open today.</>
                  ) : null}
                </>
              )}
            </p>
            {cleared > 0 && <div className={t.progressNote}>{plural(cleared, 'item')} cleared since you opened this page.</div>}
          </div>

          <div className={t.heroStatusCol}>
            {data.actionCount === 0 ? (
              <div className={t.completionPillBadge}>
                <div className={t.completionIconWrap}>
                  <CheckCircle2 size={16} strokeWidth={2.5} />
                </div>
                <div className={t.completionText}>
                  <span className={t.completionTitle}>All Caught Up</span>
                  <span className={t.completionSub}>100% Cleared</span>
                </div>
              </div>
            ) : (
              <div className={t.compactRingWidget}>
                <div className={t.ring} role="img" aria-label={`${data.actionCount} left to do`}>
                  <svg viewBox="0 0 112 112" aria-hidden>
                    <defs>
                      <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="50%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </linearGradient>
                    </defs>
                    <circle className={t.ringTrack} cx="56" cy="56" r={R} />
                    <circle className={t.ringValue} cx="56" cy="56" r={R} strokeDasharray={C} strokeDashoffset={C * (1 - progress)} />
                  </svg>
                  <div className={t.ringCenter}>
                    <span className={t.ringNum}>{data.actionCount}</span>
                  </div>
                </div>
                <div className={t.compactRingText}>
                  <span className={t.compactRingTitle}>{data.actionCount} Actions Due</span>
                  <span className={t.compactRingSub}>{cleared} completed today</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4 Full-Width Stat Cards */}
        <div className={t.stats}>
          {stat(
            'all',
            'To do today',
            data.actionCount,
            data.actionCount ? 'Tasks & follow-ups' : <span className={t.statFootSuccess}><CheckCircle2 size={11} /> All clear</span>,
            <Inbox size={14} />,
            'statTodo'
          )}
          {stat(
            'meetings',
            'Meetings',
            data.meetings.length,
            data.meetings[0] ? <>First: <Time iso={data.meetings[0].startTime} mode="datetime" /></> : 'None scheduled',
            <Video size={14} />,
            'statMeetings'
          )}
          {stat(
            'auto',
            'Automatic',
            automatic.length,
            failed.length ? (
              <span className={t.statAlert}><AlertTriangle size={11} /> {failed.length} failed</span>
            ) : automatic.length > 0 ? (
              'Emails scheduled'
            ) : (
              'Sequences ready'
            ),
            <Zap size={14} />,
            'statAuto'
          )}
          <div className={`${t.stat} ${t.statUpcoming}`} style={{ cursor: 'default' }}>
            <div className={t.statTop}>
              <span className={t.statLabel}>Next 7 days</span>
              <span className={t.statIconBadge}><CalendarDays size={14} /></span>
            </div>
            <span className={t.statValue}>{upcoming}</span>
            <span
              className={t.statFoot}
              title={`${data.upcoming.followUps} follow-ups · ${data.upcoming.tasks + data.upcoming.nextActions} to-dos · ${data.upcoming.meetings} meetings`}
            >
              {data.upcoming.followUps} follow-ups · {data.upcoming.tasks + data.upcoming.nextActions} to-dos · {data.upcoming.meetings} meetings
            </span>
          </div>
        </div>
      </div>

      {nothingToday && filter === 'all' && (
        <div className={t.opportunityHub}>
          <div className={t.hubHeader}>
            <div className={t.hubTitleRow}>
              <h3 className={t.hubTitle}>Recommended Next Actions</h3>
              <span className={t.hubBadge}><Sparkles size={11} /> High Momentum</span>
            </div>
            <p className={t.hubSub}>
              Your daily queue is clear. Use this time to find verified leads, connect on LinkedIn, and prep CRM deals.
            </p>
          </div>

          <div className={t.opportunityGrid}>
            {data.unassignedLeads > 0 && (
              <Link href="/crm" className={`${t.opportunityCard} ${t.oppCardClaim}`}>
                <div className={t.oppTop}>
                  <div className={`${t.oppIconWrap} ${t.oppIconClaim}`}><Hand size={18} /></div>
                  <span className={`${t.oppBadge} ${t.oppBadgeClaim}`}>{plural(data.unassignedLeads, 'Lead')}</span>
                </div>
                <div>
                  <h4 className={t.oppTitle}>Claim Inbound Leads</h4>
                  <p className={t.oppDesc}>Fresh unassigned leads in the CRM waiting for owner assignment.</p>
                </div>
                <div className={`${t.oppAction} ${t.oppActionClaim}`}>
                  Claim leads <ArrowRight size={13} className={t.oppArrow} />
                </div>
              </Link>
            )}

            <Link href="/apollo-search" className={t.opportunityCard}>
              <div className={t.oppTop}>
                <div className={`${t.oppIconWrap} ${t.oppIconApollo}`}><Search size={18} /></div>
                <span className={t.oppBadge}>Prospecting</span>
              </div>
              <div>
                <h4 className={t.oppTitle}>Find Verified Leads</h4>
                <p className={t.oppDesc}>Search 275M+ B2B decision-makers filtered by ICP and company size.</p>
              </div>
              <div className={t.oppAction}>
                Search Apollo <ArrowRight size={13} className={t.oppArrow} />
              </div>
            </Link>

            <Link href="/linkedin" className={t.opportunityCard}>
              <div className={t.oppTop}>
                <div className={`${t.oppIconWrap} ${t.oppIconLinkedin}`}><Share2 size={18} /></div>
                <span className={t.oppBadge}>Outreach</span>
              </div>
              <div>
                <h4 className={t.oppTitle}>Scan LinkedIn Network</h4>
                <p className={t.oppDesc}>Find executive buyers and warm connections in target companies.</p>
              </div>
              <div className={t.oppAction}>
                Scan Network <ArrowRight size={13} className={t.oppArrow} />
              </div>
            </Link>

            <Link href="/crm" className={t.opportunityCard}>
              <div className={t.oppTop}>
                <div className={`${t.oppIconWrap} ${t.oppIconCrm}`}><CalendarClock size={18} /></div>
                <span className={t.oppBadge}>Pipeline</span>
              </div>
              <div>
                <h4 className={t.oppTitle}>Review CRM Pipeline</h4>
                <p className={t.oppDesc}>Audit deal stages, check last activity dates, and plan next actions.</p>
              </div>
              <div className={t.oppAction}>
                Open CRM <ArrowRight size={13} className={t.oppArrow} />
              </div>
            </Link>
          </div>
        </div>
      )}

      {filter !== 'all' && (
        <div className={t.filterResetBar}>
          <span>Filtering by: <strong>{filters.find((f) => f.key === filter)?.label || filter}</strong></span>
          <button type="button" className={t.filterResetBtn} onClick={() => setFilter('all')}>
            ← Show All Sections
          </button>
        </div>
      )}

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
                        <div className={t.rowActions}>
                          <button
                            type="button"
                            className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`}
                            title="Schedule a meeting for this deal"
                            onClick={() => openScheduleMeeting(a.dealId)}
                          >
                            <Video size={13} /> Book Call
                          </button>
                          <Link className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} href={dealHref(a.dealId)} aria-label={`Open deal ${a.company}`}><ExternalLink size={13} /> Deal</Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>
          )}

          {show('tasks') && (
            <Section open={!collapsed.has('tasks')} onToggle={() => toggleSection('tasks')} tone="success" icon={<CheckSquare size={17} />} title="Your tasks" count={filteredTasks.length}
              subtitle={taskDateFilter !== 'all' ? `Filtered by: ${filterSubtitle} (${filteredTasks.length})` : "Due today or overdue, from your deals and your own list."}>
              <form className={t.quickAdd} onSubmit={async (e) => {
                e.preventDefault();
                const addedDate = task.dueDate;
                if (await run('task-add', () => addMyTaskAction(task), 'Task added.')) {
                  if (addedDate) {
                    if (addedDate === todayYmd) {
                      setTaskDateFilter('today');
                      setCustomTaskDate(todayYmd);
                    } else if (addedDate === tomorrowYmd) {
                      setTaskDateFilter('tomorrow');
                      setCustomTaskDate(tomorrowYmd);
                    } else {
                      setTaskDateFilter(addedDate);
                      setCustomTaskDate(addedDate);
                    }
                  }
                  setTask({ title: '', dueDate: '' });
                }
              }}>
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

              {/* Date Filter Bar */}
              <div className={t.taskFilterBar}>
                <div className={t.taskFilterGroup}>
                  <span className={t.taskFilterLabel}>
                    <Calendar size={13} /> Filter:
                  </span>
                  <div className={t.taskFilterChips}>
                    <button
                      type="button"
                      className={`${t.dateChip} ${taskDateFilter === 'all' ? t.dateChipOn : ''}`}
                      onClick={() => { setTaskDateFilter('all'); setCustomTaskDate(''); }}
                    >
                      All ({data.tasks.length})
                    </button>
                    <button
                      type="button"
                      className={`${t.dateChip} ${taskDateFilter === 'today' ? t.dateChipOn : ''}`}
                      onClick={() => { setTaskDateFilter('today'); setCustomTaskDate(todayYmd); }}
                    >
                      Today ({todayTasksCount})
                    </button>
                    <button
                      type="button"
                      className={`${t.dateChip} ${taskDateFilter === 'tomorrow' ? t.dateChipOn : ''}`}
                      onClick={() => { setTaskDateFilter('tomorrow'); setCustomTaskDate(tomorrowYmd); }}
                    >
                      Tomorrow ({tomorrowTasksCount})
                    </button>
                    {overdueTasksCount > 0 && (
                      <button
                        type="button"
                        className={`${t.dateChip} ${taskDateFilter === 'overdue' ? t.dateChipOn : ''}`}
                        onClick={() => { setTaskDateFilter('overdue'); setCustomTaskDate(''); }}
                      >
                        Overdue ({overdueTasksCount})
                      </button>
                    )}
                  </div>
                </div>
                <div className={t.taskFilterPicker}>
                  <input
                    type="date"
                    className={t.quickDate}
                    aria-label="Filter tasks for specific date"
                    value={customTaskDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomTaskDate(val);
                      if (val) {
                        if (val === todayYmd) {
                          setTaskDateFilter('today');
                        } else if (val === tomorrowYmd) {
                          setTaskDateFilter('tomorrow');
                        } else {
                          setTaskDateFilter(val);
                        }
                      } else {
                        setTaskDateFilter('all');
                      }
                    }}
                  />
                  {taskDateFilter !== 'all' && (
                    <button
                      type="button"
                      className={t.clearFilterBtn}
                      onClick={() => { setTaskDateFilter('all'); setCustomTaskDate(''); }}
                      title="Clear date filter"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {filteredTasks.length === 0 ? (
                <Empty>
                  <span>
                    {taskDateFilter === 'all'
                      ? 'All caught up! No tasks found.'
                      : taskDateFilter === 'today'
                      ? 'No tasks due today.'
                      : taskDateFilter === 'tomorrow'
                      ? 'No tasks scheduled for tomorrow.'
                      : taskDateFilter === 'overdue'
                      ? 'No overdue tasks.'
                      : `No tasks found for ${filterSubtitle}.`}
                  </span>
                  {taskDateFilter !== 'all' && (
                    <button
                      type="button"
                      className={`${s.btn} ${s.btnGhost} ${s.btnSm}`}
                      style={{ marginLeft: 8 }}
                      onClick={() => { setTaskDateFilter('all'); setCustomTaskDate(''); }}
                    >
                      Show all tasks
                    </button>
                  )}
                </Empty>
              ) : (
                <div className={t.list}>
                  {filteredTasks.map((x) => {
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
            <Section
              open={!collapsed.has('meetings')}
              onToggle={() => toggleSection('meetings')}
              tone="info"
              icon={<Video size={17} />}
              title="Meetings today"
              count={data.meetings.length}
              subtitle="Scheduled discovery calls, demos and client reviews for today."
              action={
                data.meetings.length > 0 ? (
                  <button
                    type="button"
                    className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`}
                    style={{ height: 30, fontSize: 12, padding: '0 12px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      openScheduleMeeting();
                    }}
                  >
                    <Plus size={13} /> Schedule Meeting
                  </button>
                ) : undefined
              }
            >
              {data.meetings.length === 0 ? (
                <div className={t.meetingsEmptyCard}>
                  <div className={t.meetingsEmptyLeft}>
                    <div className={t.meetingsEmptyIcon}>
                      <Video size={19} />
                    </div>
                    <div className={t.meetingsEmptyContent}>
                      <div className={t.meetingsEmptyTitleRow}>
                        <h4 className={t.meetingsEmptyTitle}>No meetings scheduled for today</h4>
                        <span className={t.calendarOpenBadge}>
                          <span className={t.livePulseDot} /> Calendar Open
                        </span>
                      </div>
                      <p className={t.meetingsEmptySub}>Your schedule is clear. Book a discovery call, demo, or review with your leads.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`}
                    style={{ height: 32, padding: '0 14px', borderRadius: 9, fontWeight: 600, gap: 6 }}
                    onClick={() => openScheduleMeeting()}
                  >
                    <Plus size={14} /> Schedule Meeting
                  </button>
                </div>
              ) : (
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
                                <strong>{m.company}</strong>
                                {m.clientName && <span> · {m.clientName}</span>}
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    fontSize: 11,
                                    fontWeight: 500,
                                    color: '#4f46e5',
                                    background: 'rgba(99, 102, 241, 0.08)',
                                    padding: '1px 8px',
                                    borderRadius: 6,
                                    border: '1px solid rgba(99, 102, 241, 0.18)',
                                  }}
                                  title={sanitizeMeetingUrl(m.meetingUrl)}
                                >
                                  <Video size={11} />
                                  {sanitizeMeetingUrl(m.meetingUrl).includes('meet.google.com') ? 'Google Meet' : sanitizeMeetingUrl(m.meetingUrl).includes('zoom.us') ? 'Zoom' : 'Video Call'}
                                </span>
                                {rel && (
                                  <span className={`${t.when} ${rel.state === 'now' ? t.whenNow : rel.state === 'soon' ? t.whenSoon : ''}`}>
                                    {rel.state === 'now' && <span className={t.livePulseDot} style={{ marginRight: 4 }} />}
                                    {rel.label}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className={t.rowActions}>
                              <a
                                className={`${s.btn} ${rel?.state === 'past' ? s.btnSecondary : s.btnPrimary} ${s.btnSm}`}
                                href={sanitizeMeetingUrl(m.meetingUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`Join Call: ${sanitizeMeetingUrl(m.meetingUrl)}`}
                              >
                                <Video size={13} /> Join Call
                              </a>
                              <button
                                type="button"
                                className={`${s.btn} ${s.btnGhost} ${s.btnSm}`}
                                title="Change or view meeting link"
                                onClick={() => setEditLinkModal({ id: m.id, title: m.title, url: sanitizeMeetingUrl(m.meetingUrl) })}
                              >
                                <Link2 size={13} /> Link
                              </button>
                              {m.dealId && (
                                <Link className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} href={dealHref(m.dealId)} aria-label={`Open deal ${m.company}`}>
                                  <ExternalLink size={13} /> Deal
                                </Link>
                              )}
                              <button
                                type="button"
                                className={`${s.btn} ${s.btnGhost} ${s.btnSm}`}
                                title="Cancel meeting"
                                disabled={busy !== null}
                                onClick={() => {
                                  if (window.confirm(`Cancel meeting "${m.title}"?`)) {
                                    run(`cancel-meeting-${m.id}`, () => cancelTodayMeetingAction(m.id), 'Meeting cancelled.');
                                  }
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
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

      {/* Schedule Meeting Modal */}
      {scheduleModalOpen && (
        <div className={t.modalOverlay} onClick={() => setScheduleModalOpen(false)}>
          <div className={t.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={t.modalHeader}>
              <div className={t.modalTitleWrap}>
                <div className={t.modalIconWrap}><Video size={18} /></div>
                <h3 className={t.modalTitle}>Schedule a Meeting</h3>
              </div>
              <button type="button" className={t.modalCloseBtn} onClick={() => setScheduleModalOpen(false)} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submitScheduleMeeting}>
              <div className={t.modalBody}>
                {data.availableDeals && data.availableDeals.length > 0 && (
                  <div className={t.fieldGroup}>
                    <label className={t.fieldLabel}><Building size={12} /> Link to CRM Deal (Optional)</label>
                    <select
                      className={t.fieldSelect}
                      value={meetingForm.dealId}
                      onChange={(e) => onSelectDeal(e.target.value)}
                    >
                      <option value="">-- No deal link (Standalone meeting) --</option>
                      {data.availableDeals.map((d) => (
                        <option key={d.id} value={d.id}>{d.company} {d.contactName ? `(${d.contactName})` : ''}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className={t.fieldGroup}>
                  <label className={t.fieldLabel}>Meeting Title *</label>
                  <input
                    className={t.fieldInput}
                    placeholder="e.g. Discovery Call, Technical Demo, Contract Review"
                    required
                    value={meetingForm.title}
                    onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                  />
                </div>

                <div className={t.fieldRow}>
                  <div className={t.fieldGroup}>
                    <label className={t.fieldLabel}><Building size={12} /> Company Name *</label>
                    <input
                      className={t.fieldInput}
                      placeholder="e.g. Acme Corp"
                      required
                      value={meetingForm.companyName}
                      onChange={(e) => setMeetingForm({ ...meetingForm, companyName: e.target.value })}
                    />
                  </div>
                  <div className={t.fieldGroup}>
                    <label className={t.fieldLabel}><User size={12} /> Contact / Client Name</label>
                    <input
                      className={t.fieldInput}
                      placeholder="e.g. John Doe"
                      value={meetingForm.clientName}
                      onChange={(e) => setMeetingForm({ ...meetingForm, clientName: e.target.value })}
                    />
                  </div>
                </div>

                <div className={t.fieldRow}>
                  <div className={t.fieldGroup}>
                    <label className={t.fieldLabel}><Mail size={12} /> Contact Email</label>
                    <input
                      type="email"
                      className={t.fieldInput}
                      placeholder="john@example.com"
                      value={meetingForm.clientEmail}
                      onChange={(e) => setMeetingForm({ ...meetingForm, clientEmail: e.target.value })}
                    />
                  </div>
                  <div className={t.fieldGroup}>
                    <label className={t.fieldLabel}><Calendar size={12} /> Date & Time *</label>
                    <input
                      type="datetime-local"
                      className={t.fieldInput}
                      required
                      value={meetingForm.startTime}
                      onChange={(e) => setMeetingForm({ ...meetingForm, startTime: e.target.value })}
                    />
                  </div>
                </div>

                <div className={t.fieldGroup}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <label className={t.fieldLabel} style={{ marginBottom: 0 }}><Globe size={12} /> Meeting Link (Google Meet / Zoom / Teams)</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          background: 'rgba(99, 102, 241, 0.1)',
                          color: '#6366f1',
                          border: '1px solid rgba(99, 102, 241, 0.25)',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                        onClick={() => setMeetingForm({ ...meetingForm, meetingUrl: DEFAULT_MEET_URL })}
                      >
                        <Zap size={11} /> Google Meet
                      </button>
                      <button
                        type="button"
                        style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          background: 'rgba(148, 163, 184, 0.1)',
                          color: '#64748b',
                          border: '1px solid rgba(148, 163, 184, 0.25)',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                        onClick={() => setMeetingForm({ ...meetingForm, meetingUrl: '' })}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <input
                    type="url"
                    className={t.fieldInput}
                    placeholder="https://meet.google.com/new"
                    value={meetingForm.meetingUrl}
                    onChange={(e) => setMeetingForm({ ...meetingForm, meetingUrl: e.target.value })}
                  />
                  <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                    Pre-filled with Google Meet (<code style={{ color: '#475569' }}>meet.google.com/new</code>) which instantly opens a live call room.
                  </span>
                </div>

                <div className={t.fieldGroup}>
                  <label className={t.fieldLabel}>Agenda / Notes (Optional)</label>
                  <textarea
                    className={t.fieldTextarea}
                    placeholder="Discussion points, prospect background, tech requirements..."
                    value={meetingForm.notes}
                    onChange={(e) => setMeetingForm({ ...meetingForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className={t.modalFooter}>
                <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={() => setScheduleModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} disabled={busy !== null}>
                  {busy === 'meeting-schedule' ? <Loader2 size={13} className={s.spin} /> : <Plus size={13} />} Schedule Meeting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editLinkModal && (
        <div className={t.modalOverlay} onClick={() => setEditLinkModal(null)}>
          <div className={t.modalCard} style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className={t.modalHeader}>
              <div className={t.modalTitleWrap}>
                <div className={t.modalIconWrap}><Link2 size={18} /></div>
                <h3 className={t.modalTitle}>Edit Meeting Link</h3>
              </div>
              <button type="button" className={t.modalCloseBtn} onClick={() => setEditLinkModal(null)} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submitUpdateMeetingUrl}>
              <div className={t.modalBody}>
                <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px' }}>
                  Update the call link for <strong>{editLinkModal.title}</strong>:
                </p>
                <div className={t.fieldGroup}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <label className={t.fieldLabel} style={{ marginBottom: 0 }}><Globe size={12} /> Call URL</label>
                    <button
                      type="button"
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        background: 'rgba(99, 102, 241, 0.1)',
                        color: '#6366f1',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                      onClick={() => setEditLinkModal({ ...editLinkModal, url: DEFAULT_MEET_URL })}
                    >
                      <Zap size={11} /> Instant Google Meet
                    </button>
                  </div>
                  <input
                    type="url"
                    className={t.fieldInput}
                    required
                    value={editLinkModal.url}
                    onChange={(e) => setEditLinkModal({ ...editLinkModal, url: e.target.value })}
                    placeholder="https://meet.google.com/new"
                  />
                  <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                    Supports Google Meet, Zoom, Microsoft Teams, or any web conference link.
                  </span>
                </div>
              </div>
              <div className={t.modalFooter}>
                <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={() => setEditLinkModal(null)}>
                  Cancel
                </button>
                <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} disabled={busy !== null}>
                  {busy?.startsWith('edit-meeting-url-') ? <Loader2 size={13} className={s.spin} /> : <Check size={13} />} Save Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
