'use client';

import { useState, useEffect } from 'react';
import { OutreachMessageDraft } from '@/features/outreach/types';
import { Send, Check, ShieldCheck, Copy, Pause, Play, Calendar, Mail, CheckCircle2, Clock } from 'lucide-react';
import { z } from 'zod';

const TestEmailSchema = z.string().email("Please enter a valid test email address");
const ScheduleDateSchema = z.string().min(1, "Please select a schedule date and time");
const ContentSchema = z.object({
  subject: z.string().min(3, "Subject line is required"),
  body: z.string().min(10, "Email body is required")
});

const copyToClipboard = (text: string): boolean => {
  if (!text) return false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      return true;
    }
  } catch { }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textArea);
    return ok;
  } catch {
    return false;
  }
};

export function OutreachEditor({
  initialDraft,
  onApprove
}: {
  initialDraft: OutreachMessageDraft;
  onSave?: (draft: OutreachMessageDraft) => void;
  onApprove: (id: string) => void;
}) {
  const [draft, setDraft] = useState<OutreachMessageDraft>(initialDraft);
  const [sequenceStatus, setSequenceStatus] = useState<'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'SENT' | 'CANCELLED'>(
    initialDraft.status === 'APPROVED' ? 'SCHEDULED' : 'DRAFT'
  );

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('bde.lead@tinyscript.io');
  const [scheduleDateTime, setScheduleDateTime] = useState('2026-08-21T10:00');
  const [notification, setNotification] = useState<string | null>(null);
  
  const [testEmailError, setTestEmailError] = useState<string | null>(null);
  const [scheduleDateError, setScheduleDateError] = useState<string | null>(null);
  const [contentErrors, setContentErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      setDraft(initialDraft);
      setSequenceStatus(initialDraft.status === 'APPROVED' ? 'SCHEDULED' : 'DRAFT');
    }, 0);
    return () => clearTimeout(timer);
  }, [initialDraft]);

  const triggerToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCopy = (text: string, key: string) => {
    const ok = copyToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      triggerToast(`Copied ${key.replace('-', ' ')} to clipboard!`);
      setTimeout(() => setCopiedKey(null), 2000);
    } else {
      triggerToast('Failed to copy. Please select text manually.');
    }
  };

  const handleSendNow = () => {
    try {
      ContentSchema.parse({ subject: draft.subjectLine, body: draft.bodyContent });
      setContentErrors({});
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrs: Record<string, string> = {};
        err.issues.forEach(e => fieldErrs[e.path[0] as string] = e.message);
        setContentErrors(fieldErrs);
        triggerToast("Please fix the validation errors before sending.");
      }
      return;
    }
    setSequenceStatus('SENT');
    onApprove(draft.id);
    triggerToast(`🚀 Email sent immediately to ${draft.targetContactName} (${draft.targetContactEmail || 'Lead'})!`);
  };

  const handleApproveSchedule = () => {
    try {
      ContentSchema.parse({ subject: draft.subjectLine, body: draft.bodyContent });
      setContentErrors({});
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrs: Record<string, string> = {};
        err.errors.forEach(e => fieldErrs[e.path[0] as string] = e.message);
        setContentErrors(fieldErrs);
        triggerToast("Please fix the validation errors before approving.");
      }
      return;
    }
    setSequenceStatus('SCHEDULED');
    onApprove(draft.id);
    triggerToast(`📅 Outreach sequence approved and scheduled for ${draft.companyName}!`);
  };

  const handleTogglePause = () => {
    if (sequenceStatus === 'PAUSED') {
      setSequenceStatus('RUNNING');
      triggerToast('▶ Sequence resumed. Automated follow-ups active.');
    } else {
      setSequenceStatus('PAUSED');
      triggerToast('⏸ Sequence paused. Automated follow-ups suspended.');
    }
  };

  const handleSendTest = () => {
    try {
      TestEmailSchema.parse(testEmailAddress);
      setTestEmailError(null);
    } catch (err) {
      if (err instanceof z.ZodError) setTestEmailError(err.errors[0].message);
      return;
    }
    setShowTestModal(false);
    triggerToast(`⚡ Sample preview email dispatched to ${testEmailAddress}!`);
  };

  const handleConfirmSchedule = () => {
    try {
      ScheduleDateSchema.parse(scheduleDateTime);
      setScheduleDateError(null);
    } catch (err) {
      if (err instanceof z.ZodError) setScheduleDateError(err.errors[0].message);
      return;
    }
    setShowScheduleModal(false);
    setSequenceStatus('SCHEDULED');
    onApprove(draft.id);
    triggerToast(`📅 Custom dispatch scheduled for ${scheduleDateTime.replace('T', ' ')}!`);
  };

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.03)' }}>
      {/* Toast Notification */}
      {notification && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 999999, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '2px solid var(--accent-indigo)', padding: '14px 22px', borderRadius: '12px', boxShadow: '0 12px 32px rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', fontWeight: 700 }}>
          <CheckCircle2 size={20} style={{ color: 'var(--accent-indigo)' }} /> {notification}
        </div>
      )}

      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.7rem', background: '#eef2ff', color: '#6366f1', padding: '4px 10px', borderRadius: '4px', fontWeight: 800, textTransform: 'uppercase' }}>
              {draft.channel} • {draft.category}
            </span>
            {sequenceStatus === 'RUNNING' && <span style={{ fontSize: '0.7rem', background: '#eef2ff', color: '#6366f1', border: '1px solid #6366f1', padding: '3px 10px', borderRadius: '12px', fontWeight: 800 }}>● Sequence Running</span>}
            {sequenceStatus === 'PAUSED' && <span style={{ fontSize: '0.7rem', background: 'rgba(234, 179, 8, 0.15)', color: '#d97706', border: '1px solid #f59e0b', padding: '3px 10px', borderRadius: '12px', fontWeight: 800 }}>⏸ Sequence Paused</span>}
            {sequenceStatus === 'SENT' && <span style={{ fontSize: '0.7rem', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid #10b981', padding: '3px 10px', borderRadius: '12px', fontWeight: 800 }}>✓ Email Sent</span>}
            {sequenceStatus === 'SCHEDULED' && <span style={{ fontSize: '0.7rem', background: '#eef2ff', color: '#6366f1', border: '1px solid #6366f1', padding: '3px 10px', borderRadius: '12px', fontWeight: 800 }}>📅 Scheduled</span>}
          </div>

          <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', margin: '8px 0 4px 0', letterSpacing: '-0.01em' }}>
            Outreach to {draft.targetContactName} ({draft.targetContactTitle}) at {draft.companyName}
          </h3>
          <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Target Contact: {draft.targetContactEmail || draft.targetContactLinkedin || 'Executive Lead'}</span>
        </div>

        {/* 1-Click Copy Full Package Button */}
        <button
          type="button"
          onClick={() => handleCopy(`Subject: ${draft.subjectLine}\n\n${draft.bodyContent}`, 'full-package')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 700,
            background: copiedKey === 'full-package' ? '#dcfce7' : '#ffffff',
            color: copiedKey === 'full-package' ? '#15803d' : '#0f172a',
            border: copiedKey === 'full-package' ? '1.5px solid #16a34a' : '1px solid #e2e8f0',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
          }}
          title="Copy Subject Line + Body Content to clipboard"
        >
          {copiedKey === 'full-package' ? <Check size={16} style={{ color: '#16a34a' }} /> : <Copy size={16} style={{ color: '#64748b' }} />}
          {copiedKey === 'full-package' ? 'Copied Full Draft!' : 'Copy Full Email Draft'}
        </button>
      </div>

      {/* Outreach Sequence Control Operations Bar */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={18} style={{ color: '#6366f1' }} /> Sequence Operation Controls:
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Send Now Button */}
          <button
            type="button"
            onClick={handleSendNow}
            style={{
              padding: '8px 18px',
              borderRadius: '6px',
              fontSize: '0.9rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
              transition: 'all 0.2s ease'
            }}
          >
            <Send size={15} /> Send Now
          </button>

          {/* Pause / Resume Button */}
          {(sequenceStatus === 'SCHEDULED' || sequenceStatus === 'RUNNING' || sequenceStatus === 'PAUSED') && (
            <button
              type="button"
              onClick={handleTogglePause}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '0.9rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                background: sequenceStatus === 'PAUSED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.12)',
                color: sequenceStatus === 'PAUSED' ? '#10b981' : '#ef4444',
                border: sequenceStatus === 'PAUSED' ? '1px solid #10b981' : '1px solid rgba(239, 68, 68, 0.4)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              {sequenceStatus === 'PAUSED' ? <Play size={13} /> : <Pause size={13} />}
              {sequenceStatus === 'PAUSED' ? 'Resume Sequence' : 'Pause Sequence'}
            </button>
          )}

          {/* Send Test Email Button */}
          <button
            type="button"
            onClick={() => setShowTestModal(true)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '0.9rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              background: '#ffffff',
              color: '#0f172a',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}
          >
            <Mail size={15} style={{ color: '#10b981' }} /> Test Send
          </button>

          {/* Custom Date Schedule Button */}
          <button
            type="button"
            onClick={() => setShowScheduleModal(true)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '0.9rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              background: '#ffffff',
              color: '#0f172a',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}
          >
            <Calendar size={15} style={{ color: '#6366f1' }} /> Schedule Date
          </button>

          {/* Approve Button */}
          {sequenceStatus === 'DRAFT' && (
            <button
              type="button"
              onClick={handleApproveSchedule}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '0.9rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
              }}
            >
              <Check size={16} /> Approve Sequence
            </button>
          )}
        </div>
      </div>

      {/* Test Send Modal */}
      {showTestModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '440px', background: 'var(--bg-card)', padding: '24px', borderRadius: '14px', border: '1px solid var(--border-focus)', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>⚡ Dispatch Preview Test Email</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
              Send a real sample preview of this email draft to your inbox before launching to {draft.companyName}.
            </p>
            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>Recipient Test Email</label>
              <input
                type="email"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: testEmailError ? '1px solid #ef4444' : '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.88rem', outline: 'none' }}
              />
              {testEmailError && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{testEmailError}</span>}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button type="button" onClick={() => setShowTestModal(false)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Cancel</button>
              <button type="button" onClick={handleSendTest} className="btn-primary" style={{ padding: '8px 18px', fontSize: '0.8rem' }}>Send Sample</button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Custom Date Modal */}
      {showScheduleModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '440px', background: 'var(--bg-card)', padding: '24px', borderRadius: '14px', border: '1px solid var(--border-focus)', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>📅 Schedule Custom Outreach Dispatch</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
              Select exact date & time to launch this outreach sequence for {draft.companyName}.
            </p>
            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>Dispatch Date & Time</label>
              <input
                type="datetime-local"
                value={scheduleDateTime}
                onChange={(e) => setScheduleDateTime(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: scheduleDateError ? '1px solid #ef4444' : '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.88rem', outline: 'none' }}
              />
              {scheduleDateError && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{scheduleDateError}</span>}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button type="button" onClick={() => setShowScheduleModal(false)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Cancel</button>
              <button type="button" onClick={handleConfirmSchedule} className="btn-primary" style={{ padding: '8px 18px', fontSize: '0.8rem' }}>Confirm Schedule</button>
            </div>
          </div>
        </div>
      )}

      {/* AI Content Quality Metrics Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '8px 12px' }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Personalization</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '2px' }}>{draft.personalizationScore}%</div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '8px 12px' }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Tech Relevance</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-indigo)', marginTop: '2px' }}>{draft.technicalRelevanceScore}%</div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '8px 12px' }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Readability</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-warning)', marginTop: '2px' }}>{draft.readabilityScore}%</div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '8px 12px' }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Spam Risk</div>
          <div style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={14} /> LOW RISK
          </div>
        </div>
      </div>

      {/* Editor Fields with 1-Click Copy Buttons next to labels */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Subject Line Field */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 700 }}>
              Subject Line / InMail Title
            </label>
            <button
              type="button"
              onClick={() => handleCopy(draft.subjectLine, 'subject')}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.8rem',
                fontWeight: 700,
                background: copiedKey === 'subject' ? '#dcfce7' : 'var(--bg-secondary)',
                color: copiedKey === 'subject' ? '#15803d' : 'var(--text-secondary)',
                border: copiedKey === 'subject' ? '1px solid #86efac' : '1px solid var(--border-subtle)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Copy subject line to clipboard"
            >
              {copiedKey === 'subject' ? <Check size={12} style={{ color: '#16a34a' }} /> : <Copy size={12} />}
              {copiedKey === 'subject' ? 'Copied Subject!' : 'Copy Subject'}
            </button>
          </div>
          <input
            type="text"
            value={draft.subjectLine}
            onChange={(e) => setDraft({ ...draft, subjectLine: e.target.value })}
            style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', background: 'var(--bg-card)', border: contentErrors.subject ? '1px solid #ef4444' : '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.90rem', fontWeight: 600, outline: 'none' }}
          />
          {contentErrors.subject && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{contentErrors.subject}</span>}
        </div>

        {/* Message Body Field */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 700 }}>
              Personalized Message Body (AI Copywriting)
            </label>
            <button
              type="button"
              onClick={() => handleCopy(draft.bodyContent, 'body-text')}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.8rem',
                fontWeight: 700,
                background: copiedKey === 'body-text' ? '#dcfce7' : 'var(--bg-secondary)',
                color: copiedKey === 'body-text' ? '#15803d' : 'var(--text-secondary)',
                border: copiedKey === 'body-text' ? '1px solid #86efac' : '1px solid var(--border-subtle)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Copy email message body to clipboard"
            >
              {copiedKey === 'body-text' ? <Check size={12} style={{ color: '#16a34a' }} /> : <Copy size={12} />}
              {copiedKey === 'body-text' ? 'Copied Message Body!' : 'Copy Body Text'}
            </button>
          </div>
          <textarea
            rows={10}
            value={draft.bodyContent}
            onChange={(e) => setDraft({ ...draft, bodyContent: e.target.value })}
            style={{ width: '100%', padding: '14px', borderRadius: '10px', background: 'var(--bg-card)', border: contentErrors.body ? '1px solid #ef4444' : '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.88rem', lineHeight: '1.6', fontFamily: 'inherit', outline: 'none' }}
          />
          {contentErrors.body && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{contentErrors.body}</span>}
        </div>
      </div>
    </div>
  );
}
