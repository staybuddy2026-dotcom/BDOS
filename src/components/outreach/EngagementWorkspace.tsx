'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { OutreachMessageDraft, OutreachChannel, ToneSetting, EngagementTelemetry, FollowupStage } from '@/features/outreach/types';
import { TemplateSelector } from './TemplateSelector';
import { OutreachEditor, EditorBusy, copyToClipboard } from './OutreachEditor';
import { FollowupTimeline, STAGES } from './FollowupTimeline';
import { OutreachCampaignDashboard } from './OutreachCampaignDashboard';
import {
  generateOutreachDraftAction,
  scheduleOutreachSequenceAction,
  markStageSentAction,
  setSequencePausedAction,
} from '@/features/outreach/actions';
import {
  Search, Sparkles, Loader2, Building2, CheckCircle2, AlertTriangle, Copy, Check, Mail, Globe,
  UserRound, MessageSquare, CalendarClock, TrendingUp, Target,
} from 'lucide-react';
import { DiscoveryLeadItem } from '@/features/discovery/types';
import { importLinkedInResearchAction } from '@/features/linkedin/actions';
import s from './outreach.module.css';

const PLACEHOLDER_DOMAINS = ['', 'enterprise.com', 'acmehealth.com'];
const NOTES_KEY = 'bdos_outreach_research_notes';

const EXAMPLE_ACCOUNTS = [
  { name: 'SaaS Labs', domain: 'saaslabs.com', tag: 'SaaS' },
  { name: 'Vercel', domain: 'vercel.com', tag: 'Cloud platform' },
  { name: 'Supabase', domain: 'supabase.com', tag: 'Database' },
  { name: 'Linear', domain: 'linear.app', tag: 'Productivity' },
  { name: 'Postman', domain: 'postman.com', tag: 'API platform' },
  { name: 'Sentry', domain: 'sentry.io', tag: 'Developer tools' },
];

type Lead = { name: string; domain: string; tag: string };

const readSavedLeads = (): Lead[] => {
  try {
    const raw = localStorage.getItem('bdos_company360_migrated_leads');
    if (!raw) return [];
    const parsed: Record<string, DiscoveryLeadItem> = JSON.parse(raw);
    return Object.values(parsed)
      .filter((l) => l && l.domain && l.companyName)
      .map((l) => ({
        name: l.companyName.replace(/\(.*?\)/g, '').trim(),
        domain: l.domain,
        tag: [l.icpScore ? `ICP ${l.icpScore}` : '', l.industry || ''].filter(Boolean).join(' · ') || 'Saved lead',
      }));
  } catch {
    return [];
  }
};

const cleanDomain = (value: string) =>
  value.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').split(/[/?#]/)[0].toLowerCase();

export function EngagementWorkspace({
  initialDraft,
  telemetry,
}: {
  initialDraft: OutreachMessageDraft;
  telemetry: EngagementTelemetry;
}) {
  const [draft, setDraft] = useState<OutreachMessageDraft>(initialDraft);
  const [channel, setChannel] = useState<OutreachChannel>(initialDraft.channel);
  const [tone, setTone] = useState<ToneSetting>(initialDraft.tone);
  const [domainQuery, setDomainQuery] = useState(PLACEHOLDER_DOMAINS.includes(initialDraft.domain) ? '' : initialDraft.domain);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [busy, setBusy] = useState<EditorBusy>(null);
  const [toast, setToast] = useState<{ msg: string; error: boolean } | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [campaignsVersion, setCampaignsVersion] = useState(0);
  // Research notes per company domain (LinkedIn About, a recent post, news), remembered in this browser.
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const notesMapRef = useRef<Record<string, string>>({});
  const researchRef = useRef<HTMLTextAreaElement>(null);
  const [profileUrlInput, setProfileUrlInput] = useState('');
  const [importingResearch, setImportingResearch] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  const notify = useCallback((msg: string, error = false) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, error });
    toastTimer.current = setTimeout(() => setToast(null), error ? 5000 : 3200);
  }, []);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  // Latest draft for async handlers that finish after a re-render.
  const draftRef = useRef(draft);
  useEffect(() => { draftRef.current = draft; });

  const regenerate = useCallback(async (targetDomain: string, nextChannel: OutreachChannel, nextTone: ToneSetting, persist: boolean) => {
    const id = ++requestId.current;
    setIsGenerating(true);
    try {
      const notes = notesMapRef.current[targetDomain]?.trim() || undefined;
      const updated = await generateOutreachDraftAction(targetDomain, nextChannel, 'COLD_OUTREACH', nextTone, persist, true, notes);
      if (id !== requestId.current) return null; // a newer request superseded this one
      // Keep a LinkedIn profile imported for this same company; forget it when the company changes.
      const prev = draftRef.current;
      const sameCompany = prev.domain === updated.domain;
      if (!sameCompany) setProfileUrlInput('');
      const keptProfile = sameCompany && /linkedin\.com\/in\//i.test(prev.targetContactLinkedin || '') ? prev.targetContactLinkedin : undefined;
      setDraft({ ...updated, targetContactLinkedin: updated.targetContactLinkedin || keptProfile });
      if (updated.sequenceSource === 'FALLBACK') notify('AI is unavailable right now, so a template sequence was loaded. Review it before sending.', true);
      else notify(updated.sequence ? `4-stage sequence ready for ${updated.companyName}` : `Draft ready for ${updated.companyName}`);
      return updated;
    } catch {
      if (id === requestId.current) notify('Generation failed. Please try again.', true);
      return null;
    } finally {
      if (id === requestId.current) setIsGenerating(false);
    }
  }, [notify]);

  // On mount: load saved leads, then write the real AI sequence (the server render skips AI for speed).
  useEffect(() => {
    const timer = setTimeout(() => {
      const saved = readSavedLeads();
      setLeads(saved);
      try {
        const storedNotes = JSON.parse(localStorage.getItem(NOTES_KEY) || '{}');
        if (storedNotes && typeof storedNotes === 'object') {
          notesMapRef.current = storedNotes;
          setNotesMap(storedNotes);
        }
      } catch { /* storage unavailable */ }
      const usePlaceholder = PLACEHOLDER_DOMAINS.includes(initialDraft.domain);
      const target = usePlaceholder && saved[0] ? saved[0].domain : initialDraft.domain;
      if (usePlaceholder && saved[0]) setDomainQuery(saved[0].domain);
      if (!initialDraft.sequence && (initialDraft.channel === 'EMAIL' || initialDraft.channel === 'LINKEDIN')) {
        regenerate(target, initialDraft.channel, initialDraft.tone, false);
      }
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const researchNotes = notesMap[draft.domain] || '';
  const handleNotesChange = (value: string) => {
    const next = { ...notesMapRef.current, [draft.domain]: value };
    if (!value.trim()) delete next[draft.domain];
    notesMapRef.current = next;
    setNotesMap(next);
    try { localStorage.setItem(NOTES_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  };

  const handleImportLinkedIn = async () => {
    if (importingResearch) return;
    setImportingResearch(true);
    try {
      const knownUrl = /linkedin\.com\/in\//i.test(draft.targetContactLinkedin || '') ? draft.targetContactLinkedin : undefined;
      const res = await importLinkedInResearchAction({
        linkedinUrl: profileUrlInput.trim() || knownUrl,
        contactName: draft.targetContactName,
        contactTitle: draft.targetContactTitle,
        companyName: draft.companyName,
        domain: draft.domain,
      });
      if (res.error || !res.notes) {
        notify(res.error || 'LinkedIn returned no research for this contact.', true);
        return;
      }
      // Keep anything the BDE already typed; add the LinkedIn research after it.
      const merged = [researchNotes.trim(), res.notes].filter(Boolean).join('\n\n').slice(0, 2000);
      handleNotesChange(merged);
      if (res.profileUrl) {
        setProfileUrlInput(res.profileUrl);
        setDraft((prev) => ({ ...prev, targetContactLinkedin: res.profileUrl }));
      }
      notify(`Imported LinkedIn research for ${res.fullName || draft.targetContactName}. Click "Regenerate with research".`);
    } catch {
      notify('Could not import from LinkedIn. Please try again.', true);
    } finally {
      setImportingResearch(false);
    }
  };

  const focusResearch = () => {
    researchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => researchRef.current?.focus(), 350);
  };

  const confirmDiscard = () => {
    const committed = draft.scheduledStartAt || draft.sentStages?.length;
    return !committed || window.confirm('This sequence is already scheduled or partly sent. Regenerating starts a new draft (the saved sequence keeps its schedule). Continue?');
  };

  const handleGenerate = async (target?: string) => {
    const domain = cleanDomain(target ?? domainQuery);
    if (!domain || !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) {
      setDomainError('Enter a company domain such as stripe.com');
      return;
    }
    if (isGenerating || !confirmDiscard()) return;
    setDomainError(null);
    setDomainQuery(domain);
    await regenerate(domain, channel, tone, true);
  };

  const handleChannelChange = async (next: OutreachChannel) => {
    if (isGenerating || !confirmDiscard()) return;
    setChannel(next);
    await regenerate(draft.domain, next, tone, false);
  };

  const handleToneChange = async (next: ToneSetting) => {
    if (isGenerating || !confirmDiscard()) return;
    setTone(next);
    await regenerate(draft.domain, channel, next, false);
  };

  // Keep edits per stage so switching stages never loses them.
  const handleEditorChange = (patch: { subjectLine?: string; bodyContent?: string }) => {
    setDraft((prev) => ({
      ...prev,
      ...patch,
      sequence: prev.sequence?.map((st) => (st.stage === prev.followupStage ? { ...st, ...patch } : st)),
    }));
  };

  const handleStageSelect = (stage: FollowupStage) => {
    const step = draft.sequence?.find((st) => st.stage === stage);
    if (step) setDraft({ ...draft, followupStage: stage, subjectLine: step.subjectLine, bodyContent: step.bodyContent });
  };

  const handleSchedule = async (startAt?: string) => {
    setBusy('schedule');
    try {
      const res = await scheduleOutreachSequenceAction(draft, startAt);
      setDraft((prev) => ({ ...prev, status: res.draft.status, scheduledStartAt: res.draft.scheduledStartAt, sequencePaused: false }));
      setCampaignsVersion((v) => v + 1);
      notify(res.message);
      return true;
    } catch {
      notify('Could not save the schedule. Please try again.', true);
      return false;
    } finally {
      setBusy(null);
    }
  };

  const handleMarkSent = async () => {
    setBusy('send');
    try {
      const res = await markStageSentAction(draft, draft.followupStage);
      const sentStages = res.draft.sentStages || [];
      // Move on to the next unsent stage so the flow continues naturally.
      const next = draft.sequence?.find((st) => !sentStages.includes(st.stage));
      setDraft((prev) => ({
        ...prev,
        status: res.draft.status,
        sentStages,
        ...(next ? { followupStage: next.stage, subjectLine: next.subjectLine, bodyContent: next.bodyContent } : {}),
      }));
      setCampaignsVersion((v) => v + 1);
      const n = STAGES.findIndex((st) => st.id === draft.followupStage) + 1;
      notify(next ? `Stage ${n} marked as sent. Showing the next stage.` : `Stage ${n} marked as sent.`);
    } catch {
      notify('Could not record the sent stage. Please try again.', true);
    } finally {
      setBusy(null);
    }
  };

  const handleTogglePause = async () => {
    const paused = !draft.sequencePaused;
    setBusy('pause');
    try {
      await setSequencePausedAction(draft.id, paused);
      setDraft((prev) => ({ ...prev, sequencePaused: paused }));
      setCampaignsVersion((v) => v + 1);
      notify(paused ? 'Sequence paused. Remaining stages are on hold.' : 'Sequence resumed.');
    } catch {
      notify('Could not update the sequence. Please try again.', true);
    } finally {
      setBusy(null);
    }
  };

  const handleCopy = async (text: string, key: string, label: string) => {
    if (await copyToClipboard(text)) {
      setCopiedKey(key);
      notify(`${label} copied to clipboard`);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1800);
    } else {
      notify('Copy failed.', true);
    }
  };

  const hasName = draft.targetContactName && !/engineering lead|decision maker/i.test(draft.targetContactName);
  const emailGuessed = draft.targetContactEmailStatus && draft.targetContactEmailStatus !== 'Verified';
  const suggestionList = (leads.length ? leads : EXAMPLE_ACCOUNTS).slice(0, 8);

  return (
    <div className={s.root}>
      {toast && (
        <div className={`${s.toast} ${toast.error ? s.toastError : ''}`} role="status" aria-live="polite">
          {toast.error ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />} {toast.msg}
        </div>
      )}

      {/* Target search */}
      <section className={s.card} aria-label="Target company">
        <div className={s.cardHeader}>
          <div>
            <h3 className={s.cardTitle}>
              <span className={s.iconTile}><Search size={16} /></span>
              Target company
            </h3>
            <p className={s.cardSubtitle}>Enter a domain to enrich the prospect with Apollo and LinkedIn signals and write the sequence.</p>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className={s.searchRow} noValidate>
          <input
            className={`${s.input} ${s.inputLg} ${domainError ? s.inputError : ''}`}
            value={domainQuery}
            onChange={(e) => { setDomainQuery(e.target.value); setDomainError(null); }}
            placeholder="company.com"
            aria-label="Company domain"
            aria-invalid={!!domainError}
            disabled={isGenerating}
          />
          <button type="submit" className={`${s.btn} ${s.btnPrimary} ${s.btnLg}`} disabled={isGenerating}>
            {isGenerating ? <Loader2 size={17} className={s.spin} /> : <Sparkles size={17} />}
            {isGenerating ? 'Generating…' : 'Generate sequence'}
          </button>
        </form>
        {domainError && <div className={s.fieldError} style={{ marginTop: -8 }}>{domainError}</div>}

        <div>
          <div className={s.sectionLabel}><Building2 size={13} /> {leads.length ? 'Your qualified leads' : 'Example accounts'}</div>
          <div className={s.chipRow}>
            {suggestionList.map((acc) => (
              <button
                key={acc.domain}
                type="button"
                disabled={isGenerating}
                onClick={() => handleGenerate(acc.domain)}
                className={`${s.chip} ${draft.domain === acc.domain ? s.chipActive : ''}`}
              >
                {acc.name} <span className={s.chipMeta}>{acc.tag}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className={s.card} aria-label="Decision maker">
        <div className={s.cardHeader}>
          <h3 className={s.cardTitle}>
            <span className={s.iconTile}><UserRound size={16} /></span>
            Decision maker at {draft.companyName}
          </h3>
          <button
            type="button"
            className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`}
            onClick={() => handleCopy(
              [`${draft.targetContactName} (${draft.targetContactTitle}, ${draft.companyName})`,
                draft.targetContactEmail && `Email: ${draft.targetContactEmail}${emailGuessed ? ' (unverified)' : ''}`,
                draft.targetContactLinkedin && `LinkedIn: ${draft.targetContactLinkedin}`,
                `Domain: ${draft.domain}`].filter(Boolean).join('\n'),
              'card', 'Contact card')}
          >
            {copiedKey === 'card' ? <Check size={14} /> : <Copy size={14} />} Copy contact
          </button>
        </div>

        <div className={s.contactGrid}>
          <div className={s.contactItem}>
            <div className={s.contactLabel}><span>Contact</span></div>
            <div className={`${s.contactValue} ${hasName ? '' : s.contactEmpty}`}>{hasName ? draft.targetContactName : 'Not found'}</div>
            <div className={s.contactSub}>{draft.targetContactTitle}</div>
          </div>

          <div className={s.contactItem}>
            <div className={s.contactLabel}>
              <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Mail size={13} /> Email</span>
              {draft.targetContactEmail && (
                <span className={`${s.badge} ${emailGuessed ? s.badgeAmber : s.badgeGreen}`}>{emailGuessed ? 'Unverified' : 'Verified'}</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div className={`${s.contactValue} ${draft.targetContactEmail ? '' : s.contactEmpty}`} style={{ flex: 1 }} title={draft.targetContactEmail}>
                {draft.targetContactEmail || 'Not found'}
              </div>
              {draft.targetContactEmail && (
                <button type="button" className={`${s.iconBtn} ${copiedKey === 'email' ? s.iconBtnDone : ''}`} onClick={() => handleCopy(draft.targetContactEmail!, 'email', 'Email')} aria-label="Copy email">
                  {copiedKey === 'email' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              )}
            </div>
          </div>

          <div className={s.contactItem}>
            <div className={s.contactLabel}><span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><MessageSquare size={13} /> LinkedIn</span></div>
            <div className={s.contactValue}>
              {draft.targetContactLinkedin
                ? <a className={s.link} href={draft.targetContactLinkedin} target="_blank" rel="noopener noreferrer">{draft.targetContactLinkedin.replace(/^https?:\/\/(www\.)?/, '')}</a>
                : <span className={s.contactEmpty}>Not found</span>}
            </div>
          </div>

          <div className={s.contactItem}>
            <div className={s.contactLabel}><span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Globe size={13} /> Website</span></div>
            <div className={s.contactValue}>
              <a className={s.link} href={`https://${draft.domain}`} target="_blank" rel="noopener noreferrer">{draft.domain}</a>
            </div>
          </div>
        </div>

        {/* Prospect research: the single biggest lever for message quality */}
        <div>
          <div className={s.fieldHead}>
            <label className={s.label} htmlFor="prospect-research">
              Prospect research <span className={s.chipMeta}>(optional, strongly recommended)</span>
            </label>
            <span className={s.chipMeta}>{researchNotes.length}/2000</span>
          </div>
          <textarea
            id="prospect-research"
            ref={researchRef}
            className={s.textarea}
            style={{ minHeight: 96 }}
            maxLength={2000}
            disabled={isGenerating}
            value={researchNotes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder={`Paste real facts about ${hasName ? draft.targetContactName.split(' ')[0] : 'this prospect'}: their LinkedIn About section, a recent post, a launch, hiring news or funding. The AI only states facts it is given, so this is what makes the message specific.`}
          />
          <div className={s.fieldFoot}>
            <span>Saved in this browser for {draft.domain}.</span>
            <button
              type="button"
              className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`}
              disabled={isGenerating || !researchNotes.trim()}
              onClick={() => confirmDiscard() && regenerate(draft.domain, channel, tone, false)}
            >
              <Sparkles size={14} /> Regenerate with research
            </button>
          </div>

          {/* Pull the research straight from the contact's LinkedIn profile */}
          <div className={s.searchRow} style={{ marginTop: 10, alignItems: 'center' }}>
            <input
              className={s.input}
              style={{ height: 36, fontSize: 13 }}
              value={profileUrlInput}
              onChange={(e) => setProfileUrlInput(e.target.value)}
              placeholder="LinkedIn profile URL (optional, e.g. https://www.linkedin.com/in/username)"
              aria-label="Contact LinkedIn profile URL"
              disabled={importingResearch || isGenerating}
            />
            <button type="button" className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} style={{ height: 36 }} disabled={importingResearch || isGenerating} onClick={handleImportLinkedIn}>
              {importingResearch ? <Loader2 size={14} className={s.spin} /> : <MessageSquare size={14} />}
              {importingResearch ? 'Importing…' : 'Import from LinkedIn'}
            </button>
          </div>
          <div className={s.actionHint} style={{ marginTop: 6 }}>
            Fills the box with their headline, About section and recent posts. Without a URL it looks the contact up at {draft.companyName} by name and title.
          </div>
        </div>
      </section>

      {/* KPIs */}
      <div className={s.kpiGrid}>
        <div className={s.kpi}>
          <div className={s.kpiHead}>Drafts today <MessageSquare size={16} className={s.accent} /></div>
          <div className={s.kpiValue}>{telemetry.draftsGeneratedToday}</div>
          <div className={s.kpiFoot}>{telemetry.emailsAwaitingApproval} awaiting approval</div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiHead}>Stages scheduled <CalendarClock size={16} className={s.good} /></div>
          <div className={s.kpiValue}>{telemetry.followupsScheduled}</div>
          <div className={s.kpiFoot}>{telemetry.activeSequences ?? 0} active sequences</div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiHead}>Est. pipeline <TrendingUp size={16} className={s.warn} /></div>
          <div className={s.kpiValue}>{telemetry.pipelineInfluencedInr}</div>
          <div className={s.kpiFoot}>Active sequences × ₹18L avg. deal</div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiHead}>Est. revenue <Target size={16} className={s.accent} /></div>
          <div className={s.kpiValue}>{telemetry.estimatedRevenueInr}</div>
          <div className={s.kpiFoot}>At an assumed 35% close rate</div>
        </div>
      </div>

      {/* Workspace */}
      <div className={s.mainGrid}>
        <div className={s.col}>
          <TemplateSelector
            selectedChannel={channel}
            selectedTone={tone}
            onSelectChannel={handleChannelChange}
            onSelectTone={handleToneChange}
            disabled={isGenerating || busy !== null}
          />
          <FollowupTimeline
            currentStage={draft.followupStage}
            onSelectStage={handleStageSelect}
            sequence={draft.sequence}
            sentStages={draft.sentStages}
            scheduledStartAt={draft.scheduledStartAt}
            disabled={isGenerating}
          />
        </div>

        <div className={`${s.col} ${s.stickyCol}`}>
          <OutreachEditor
            draft={draft}
            isGenerating={isGenerating}
            busy={busy}
            onChange={handleEditorChange}
            onRegenerate={() => confirmDiscard() && regenerate(draft.domain, channel, tone, false)}
            onSchedule={handleSchedule}
            onMarkSent={handleMarkSent}
            onTogglePause={handleTogglePause}
            notify={notify}
            onAddResearch={focusResearch}
            hasResearch={!!researchNotes.trim()}
          />
        </div>
      </div>

      <OutreachCampaignDashboard version={campaignsVersion} notify={notify} />
    </div>
  );
}
