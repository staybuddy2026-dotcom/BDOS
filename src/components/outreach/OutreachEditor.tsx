'use client';

import { useEffect, useState } from 'react';
import { OutreachMessageDraft } from '@/features/outreach/types';
import {
  Check, Copy, Loader2, AlertTriangle, Info, ShieldCheck, RefreshCw, Mail, ExternalLink, CircleCheck,
  CalendarClock, PauseCircle, PlayCircle, Send, X, Wand2,
} from 'lucide-react';
import { z } from 'zod';
import { STAGES } from './FollowupTimeline';
import s from './outreach.module.css';

const TestEmailSchema = z.string().trim().email('Enter a valid email address');
const TEST_EMAIL_KEY = 'bdos_outreach_test_email';

export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (!text) return false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall back below */ }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
};

// The message itself, excluding the auto-appended email sign off ("Name\nRole, Tiny Script Soft Tech").
const messageOnly = (body: string) => body.replace(/\n\n[^\n]+\n[^\n]*Tiny Script Soft Tech\s*$/, '');
const messageWordCount = (body: string) => messageOnly(body).split(/\s+/).filter(Boolean).length;

// LinkedIn caps connection request notes at 300 characters.
const LINKEDIN_NOTE_LIMIT = 300;

const toLocalInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const defaultStart = () => {
  const d = new Date(Date.now() + 86400000);
  d.setHours(10, 0, 0, 0);
  return toLocalInput(d);
};

const openMailto = (to: string, subject: string, body: string) => {
  const url = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = url;
};

export type EditorBusy = 'schedule' | 'send' | 'pause' | null;

export function OutreachEditor({
  draft,
  isGenerating,
  busy,
  onChange,
  onRegenerate,
  onSchedule,
  onMarkSent,
  onTogglePause,
  notify,
  onAddResearch,
  hasResearch = false,
}: {
  onAddResearch?: () => void;
  hasResearch?: boolean;
  draft: OutreachMessageDraft;
  isGenerating: boolean;
  busy: EditorBusy;
  onChange: (patch: { subjectLine?: string; bodyContent?: string }) => void;
  onRegenerate: () => void;
  onSchedule: (startAt?: string) => Promise<boolean>;
  onMarkSent: () => void;
  onTogglePause: () => void;
  notify: (msg: string, isError?: boolean) => void;
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [modal, setModal] = useState<'test' | 'schedule' | null>(null);
  // Lazy init is hydration-safe here: the input only renders inside the (client-opened) modal.
  const [testEmail, setTestEmail] = useState(() => {
    try { return typeof window === 'undefined' ? '' : localStorage.getItem(TEST_EMAIL_KEY) || ''; } catch { return ''; }
  });
  const [testEmailError, setTestEmailError] = useState<string | null>(null);
  const [startAt, setStartAt] = useState(defaultStart);
  const [startError, setStartError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ subject?: string; body?: string }>({});

  // Close modals with Escape.
  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setModal(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal]);

  const isEmail = draft.channel !== 'LINKEDIN';
  const stepIndex = Math.max(0, STAGES.findIndex((st) => st.id === draft.followupStage));
  const stageMeta = STAGES[stepIndex];
  const activeStep = draft.sequence?.find((st) => st.stage === draft.followupStage);
  const isSent = !!draft.sentStages?.includes(draft.followupStage);
  const isScheduled = !!draft.scheduledStartAt;
  const words = messageWordCount(draft.bodyContent);
  const maxWords = activeStep?.stageNumber === 4 ? 50 : isEmail ? 90 : 60;
  // LinkedIn stage 1 goes out as a connection note, so characters matter, not words.
  const isConnectionNote = !isEmail && activeStep?.stageNumber === 1;
  const chars = messageOnly(draft.bodyContent).trim().length;
  const lengthOver = isConnectionNote ? chars > LINKEDIN_NOTE_LIMIT : words > maxWords;
  const needsInfo = activeStep?.confidence === 'low';
  const locked = isGenerating || busy !== null;

  const validate = () => {
    const next: typeof errors = {};
    if (isEmail && draft.subjectLine.trim().length < 3) next.subject = 'Add a subject line (at least 3 characters).';
    if (draft.bodyContent.trim().length < 10) next.body = 'The message body is too short.';
    setErrors(next);
    if (Object.keys(next).length) notify('Please fix the highlighted fields first.', true);
    return Object.keys(next).length === 0;
  };

  const handleCopy = async (text: string, key: string, label: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      notify(`${label} copied to clipboard`);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1800);
    } else {
      notify('Copy failed. Please select the text manually.', true);
    }
  };

  const handleOpenChannel = async () => {
    if (!validate()) return;
    if (isEmail) {
      openMailto(draft.targetContactEmail || '', draft.subjectLine, draft.bodyContent);
      notify(draft.targetContactEmail
        ? 'Opened in your email app. Click "Mark as sent" after sending.'
        : 'No email on file, add the recipient in your email app.');
    } else {
      await handleCopy(draft.bodyContent, 'li', 'Message');
      if (draft.targetContactLinkedin) window.open(draft.targetContactLinkedin, '_blank', 'noopener,noreferrer');
      else notify('Message copied. No LinkedIn profile on file for this contact.', true);
    }
  };

  const handleSendTest = () => {
    const parsed = TestEmailSchema.safeParse(testEmail);
    if (!parsed.success) {
      setTestEmailError(parsed.error.issues[0].message);
      return;
    }
    try { localStorage.setItem(TEST_EMAIL_KEY, parsed.data); } catch { /* ignore */ }
    setTestEmailError(null);
    setModal(null);
    openMailto(parsed.data, `[TEST] ${draft.subjectLine}`, draft.bodyContent);
    notify(`Test draft opened in your email app for ${parsed.data}`);
  };

  const handleConfirmSchedule = async () => {
    const d = new Date(startAt);
    if (!startAt || Number.isNaN(d.getTime())) return setStartError('Pick a valid date and time.');
    if (d.getTime() < Date.now() - 60000) return setStartError('The start date must be in the future.');
    if (!validate()) return;
    setStartError(null);
    if (await onSchedule(d.toISOString())) setModal(null);
  };

  const handleApproveNow = () => {
    if (validate()) onSchedule();
  };

  const schedulePreview = (() => {
    const d = new Date(startAt);
    if (Number.isNaN(d.getTime())) return [];
    return STAGES.map((st) => ({
      label: `Stage ${STAGES.indexOf(st) + 1} · ${st.label}`,
      date: new Date(d.getTime() + (st.day - 1) * 86400000).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
    }));
  })();

  return (
    <section className={`${s.card} ${s.editorCard}`} aria-label="Message editor" aria-busy={isGenerating}>
      {isGenerating && (
        <div className={s.overlay} role="status">
          <Loader2 size={28} className={s.spin} style={{ color: 'var(--o-accent)' }} />
          <div className={s.overlayTitle}>Writing the 4-stage sequence</div>
          <div className={s.overlayText}>Reading prospect signals, drafting each stage and checking it against the outreach rules. This can take up to a minute.</div>
          <div className={s.skeletonGroup}>
            <div className={s.skeleton} />
            <div className={s.skeleton} style={{ width: '85%' }} />
            <div className={s.skeleton} style={{ width: '65%' }} />
          </div>
        </div>
      )}

      {/* Header */}
      <div className={s.editorHead}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className={s.badgeRow}>
            <span className={`${s.badge} ${s.badgeIndigo}`}>{isEmail ? (draft.channel === 'EMAIL' ? 'Email' : draft.channel === 'PROPOSAL_COVER' ? 'Proposal cover' : 'Call invite') : 'LinkedIn DM'}</span>
            {activeStep && <span className={`${s.badge} ${s.badgeGray}`}>Stage {stepIndex + 1} of 4 · {stageMeta.label}</span>}
            {draft.sequenceLanguage && <span className={`${s.badge} ${s.badgeGray}`}>{draft.sequenceLanguage}</span>}
            {draft.sequenceSource === 'FALLBACK' && <span className={`${s.badge} ${s.badgeAmber}`}>Template fallback</span>}
            {isSent && <span className={`${s.badge} ${s.badgeGreen}`}><CircleCheck size={12} /> Sent</span>}
            {isScheduled && !draft.sequencePaused && <span className={`${s.badge} ${s.badgeGreen}`}><CalendarClock size={12} /> Scheduled</span>}
            {draft.sequencePaused && <span className={`${s.badge} ${s.badgeAmber}`}><PauseCircle size={12} /> Paused</span>}
          </div>
          <h3 className={s.editorTitle}>{draft.targetContactName} · {draft.companyName}</h3>
          <div className={s.editorMeta}>
            {draft.targetContactTitle}
            <span aria-hidden>·</span>
            {isEmail
              ? (draft.targetContactEmail || <span className={s.contactEmpty}>no email on file</span>)
              : (draft.targetContactLinkedin ? 'LinkedIn profile on file' : <span className={s.contactEmpty}>no LinkedIn profile on file</span>)}
          </div>
        </div>
        <div className={s.headActions}>
          <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={onRegenerate} disabled={locked} title="Write a fresh sequence for this prospect">
            <RefreshCw size={14} /> Regenerate
          </button>
          <button
            type="button"
            className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`}
            onClick={() => handleCopy(isEmail ? `Subject: ${draft.subjectLine}\n\n${draft.bodyContent}` : draft.bodyContent, 'all', isEmail ? 'Subject and message' : 'Message')}
            disabled={isGenerating}
          >
            {copiedKey === 'all' ? <Check size={14} /> : <Copy size={14} />} {copiedKey === 'all' ? 'Copied' : 'Copy all'}
          </button>
        </div>
      </div>

      {/* Quality metrics (real generator output) */}
      {activeStep ? (
        <>
          <div className={s.metricGrid}>
            <div className={s.metric}>
              <div className={s.metricLabel}>Confidence</div>
              <div className={`${s.metricValue} ${activeStep.confidence === 'high' ? s.good : s.warn}`}>{activeStep.confidence === 'high' ? 'High' : 'Low'}</div>
            </div>
            <div className={s.metric} title={activeStep.proofUsed}>
              <div className={s.metricLabel}>Proof used</div>
              <div className={`${s.metricValue} ${s.accent}`}>{activeStep.proofUsed === 'none' ? 'None' : activeStep.proofUsed}</div>
            </div>
            <div className={s.metric} title={isConnectionNote ? 'LinkedIn connection notes are limited to 300 characters' : undefined}>
              <div className={s.metricLabel}>{isConnectionNote ? 'Note length' : 'Words'}</div>
              <div className={`${s.metricValue} ${lengthOver ? s.bad : s.good}`}>
                {isConnectionNote ? chars : words} <span className={s.metricSmall}>/ {isConnectionNote ? `${LINKEDIN_NOTE_LIMIT} chars` : maxWords}</span>
              </div>
            </div>
            <div className={s.metric}>
              <div className={s.metricLabel}>Ready to send</div>
              {activeStep.qualityWarnings.length > 0 || lengthOver
                ? <div className={`${s.metricValue} ${s.warn}`}><AlertTriangle size={15} /> Review</div>
                : needsInfo
                  ? <div className={`${s.metricValue} ${s.warn}`}><Info size={15} /> Needs info</div>
                  : <div className={`${s.metricValue} ${s.good}`}><ShieldCheck size={15} /> Yes</div>}
            </div>
          </div>

          {needsInfo && draft.sequenceSource !== 'FALLBACK' && (
            <div className={`${s.notice} ${s.noticeWarn}`}>
              <AlertTriangle size={16} className={s.noticeIcon} />
              <span style={{ flex: 1 }}>
                <strong>Not specific enough to send yet.</strong>{' '}
                {hasResearch
                  ? 'Even with your research, the AI flagged gaps (see below). Add more detail, or edit the message yourself.'
                  : 'The AI only had a name, title and company, so this reads generic. Paste their LinkedIn About or a recent post and regenerate.'}
              </span>
              {onAddResearch && (
                <button type="button" className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} onClick={onAddResearch}>
                  {hasResearch ? 'Edit research' : 'Add research'}
                </button>
              )}
            </div>
          )}

          {activeStep.qualityWarnings.length > 0 && (
            <div className={`${s.notice} ${s.noticeWarn}`}>
              <AlertTriangle size={16} className={s.noticeIcon} />
              <span><strong>Rule warnings:</strong> {activeStep.qualityWarnings.join('; ')}. Edit the message before sending.</span>
            </div>
          )}
          {activeStep.missingInfo && (
            <div className={`${s.notice} ${s.noticeInfo}`}>
              <Info size={16} className={s.noticeIcon} />
              <span><strong>{draft.sequenceSource === 'FALLBACK' ? 'AI unavailable: ' : 'Missing info: '}</strong>{activeStep.missingInfo}</span>
            </div>
          )}
        </>
      ) : (
        <div className={`${s.notice} ${s.noticeInfo}`}>
          <Wand2 size={16} className={s.noticeIcon} />
          <span>This channel uses a single message template. Switch to <strong>Email</strong> or <strong>LinkedIn DM</strong> for the AI-written 4-stage sequence.</span>
        </div>
      )}

      {/* Fields */}
      <div>
        <div className={s.fieldHead}>
          <label className={s.label} htmlFor="outreach-subject">{isEmail ? 'Subject line' : 'InMail title (optional)'}</label>
          <button type="button" className={`${s.iconBtn} ${copiedKey === 'subject' ? s.iconBtnDone : ''}`} onClick={() => handleCopy(draft.subjectLine, 'subject', 'Subject')} aria-label="Copy subject">
            {copiedKey === 'subject' ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
        <input
          id="outreach-subject"
          className={`${s.input} ${errors.subject ? s.inputError : ''}`}
          value={draft.subjectLine}
          disabled={isGenerating}
          onChange={(e) => { onChange({ subjectLine: e.target.value }); if (errors.subject) setErrors({ ...errors, subject: undefined }); }}
        />
        {errors.subject && <div className={s.fieldError} style={{ marginTop: 6 }}>{errors.subject}</div>}
      </div>

      <div>
        <div className={s.fieldHead}>
          <label className={s.label} htmlFor="outreach-body">Message</label>
          <button type="button" className={`${s.iconBtn} ${copiedKey === 'body' ? s.iconBtnDone : ''}`} onClick={() => handleCopy(draft.bodyContent, 'body', 'Message')} aria-label="Copy message">
            {copiedKey === 'body' ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
        <textarea
          id="outreach-body"
          rows={11}
          className={`${s.textarea} ${errors.body ? s.inputError : ''}`}
          value={draft.bodyContent}
          disabled={isGenerating}
          onChange={(e) => { onChange({ bodyContent: e.target.value }); if (errors.body) setErrors({ ...errors, body: undefined }); }}
        />
        <div className={s.fieldFoot}>
          {errors.body ? <span className={s.fieldError}>{errors.body}</span> : <span>Edits are kept per stage.</span>}
          <span className={lengthOver ? s.bad : undefined}>
            {isConnectionNote ? `${chars}/${LINKEDIN_NOTE_LIMIT} characters (connection note)` : `${words} words`}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className={s.actionBar}>
        <div className={s.actionGroup}>
          <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={handleOpenChannel} disabled={locked}>
            {isEmail ? <><Mail size={15} /> Open in email app</> : <><ExternalLink size={15} /> Copy & open LinkedIn</>}
          </button>
          <button type="button" className={`${s.btn} ${isSent ? s.btnSuccess : s.btnSecondary}`} onClick={() => validate() && onMarkSent()} disabled={locked || isSent}>
            {busy === 'send' ? <Loader2 size={15} className={s.spin} /> : <CircleCheck size={15} />}
            {isSent ? `Stage ${stepIndex + 1} sent` : 'Mark as sent'}
          </button>
          {isEmail && (
            <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => setModal('test')} disabled={locked}>
              <Send size={15} /> Send test
            </button>
          )}
        </div>

        <div className={s.actionGroup}>
          {isScheduled ? (
            <>
              <button type="button" className={`${s.btn} ${draft.sequencePaused ? s.btnSuccess : s.btnWarn}`} onClick={onTogglePause} disabled={locked}>
                {busy === 'pause' ? <Loader2 size={15} className={s.spin} /> : draft.sequencePaused ? <PlayCircle size={15} /> : <PauseCircle size={15} />}
                {draft.sequencePaused ? 'Resume' : 'Pause'}
              </button>
              <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={() => setModal('schedule')} disabled={locked}>
                <CalendarClock size={15} /> Save & reschedule
              </button>
            </>
          ) : (
            <>
              <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={() => setModal('schedule')} disabled={locked}>
                <CalendarClock size={15} /> Pick start date
              </button>
              <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={handleApproveNow} disabled={locked}>
                {busy === 'schedule' ? <Loader2 size={15} className={s.spin} /> : <Check size={15} />} Approve & schedule
              </button>
            </>
          )}
        </div>
        <div className={s.actionHint}>
          {isEmail
            ? 'Emails are sent from your own email app; use "Mark as sent" so the sequence tracks it.'
            : 'LinkedIn messages are sent manually from LinkedIn; use "Mark as sent" so the sequence tracks it.'}
          {isScheduled && ` Sequence started ${new Date(draft.scheduledStartAt!).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}.`}
        </div>
      </div>

      {/* Test send modal */}
      {modal === 'test' && (
        <div className={s.backdrop} onClick={() => setModal(null)}>
          <div className={s.modal} role="dialog" aria-modal="true" aria-labelledby="test-title" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h3 className={s.modalTitle} id="test-title"><Send size={17} /> Send a test to yourself</h3>
              <button type="button" className={s.iconBtn} onClick={() => setModal(null)} aria-label="Close"><X size={16} /></button>
            </div>
            <p className={s.modalText}>Opens this stage in your email app addressed to you, so you can check how it reads before it goes to {draft.targetContactName}.</p>
            <div>
              <label className={s.label} htmlFor="test-email">Your email</label>
              <input
                id="test-email"
                type="email"
                autoFocus
                placeholder="you@tinyscript.com"
                className={`${s.input} ${testEmailError ? s.inputError : ''}`}
                style={{ marginTop: 6 }}
                value={testEmail}
                onChange={(e) => { setTestEmail(e.target.value); setTestEmailError(null); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSendTest()}
              />
              {testEmailError && <div className={s.fieldError} style={{ marginTop: 6 }}>{testEmailError}</div>}
            </div>
            <div className={s.modalActions}>
              <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={() => setModal(null)}>Cancel</button>
              <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={handleSendTest}><Mail size={15} /> Open test email</button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule modal */}
      {modal === 'schedule' && (
        <div className={s.backdrop} onClick={() => busy === null && setModal(null)}>
          <div className={s.modal} role="dialog" aria-modal="true" aria-labelledby="schedule-title" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h3 className={s.modalTitle} id="schedule-title"><CalendarClock size={17} /> Schedule the sequence</h3>
              <button type="button" className={s.iconBtn} onClick={() => setModal(null)} aria-label="Close"><X size={16} /></button>
            </div>
            <p className={s.modalText}>Saves your edited messages and schedules every unsent stage for {draft.companyName}, counted from the start date.</p>
            <div>
              <label className={s.label} htmlFor="start-at">Start date (Stage 1)</label>
              <input
                id="start-at"
                type="datetime-local"
                className={`${s.input} ${startError ? s.inputError : ''}`}
                style={{ marginTop: 6 }}
                min={toLocalInput(new Date())}
                value={startAt}
                onChange={(e) => { setStartAt(e.target.value); setStartError(null); }}
              />
              {startError && <div className={s.fieldError} style={{ marginTop: 6 }}>{startError}</div>}
            </div>
            {schedulePreview.length > 0 && (
              <ul className={s.scheduleList}>
                {schedulePreview.map((p, i) => (
                  <li key={p.label} style={draft.sentStages?.includes(STAGES[i].id) ? { textDecoration: 'line-through', opacity: 0.6 } : undefined}>
                    <span>{p.label}</span><strong>{p.date}</strong>
                  </li>
                ))}
              </ul>
            )}
            <div className={s.modalActions}>
              <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={() => setModal(null)} disabled={busy !== null}>Cancel</button>
              <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={handleConfirmSchedule} disabled={busy !== null}>
                {busy === 'schedule' ? <Loader2 size={15} className={s.spin} /> : <Check size={15} />} Confirm schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
