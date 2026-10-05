'use client';

import { useState } from 'react';
import { Check, ExternalLink, FileText, Loader2, Search, X } from 'lucide-react';
import { findContactOnLinkedIn, logLinkedInTouch, setContactLinkedIn } from '@/features/crm/actions';
import { LINKEDIN_DAILY_CONNECTION_LIMIT } from '@/features/crm/types';
import type { CrmContact, LinkedInTouch } from '@/features/crm/types';

const TOUCHES: { id: LinkedInTouch; label: string }[] = [
  { id: 'CONNECTION_SENT', label: 'Connection sent' },
  { id: 'CONNECTION_ACCEPTED', label: 'Accepted' },
  { id: 'MESSAGE_SENT', label: 'DM sent' },
  { id: 'REPLY_RECEIVED', label: 'Reply received' },
];

const LINKEDIN_BLUE = '#0a66c2';

const pill: React.CSSProperties = {
  fontSize: '0.72rem', fontWeight: 700, padding: '4px 9px', borderRadius: '999px', border: '1px solid #cbd5e1',
  background: '#ffffff', color: '#334155', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px',
  transition: 'all 0.15s ease',
};

/**
 * LinkedIn controls on a CRM contact card: open/find the profile, open the post the lead came
 * from, and log manual LinkedIn touches (LinkedIn messages are sent by hand) to the timeline.
 */
export function LinkedInContactActions({
  dealId,
  contact,
  disabled = false,
  connectionsToday,
  onChanged,
  notify,
}: {
  dealId: string;
  contact: CrmContact;
  /** True when the user cannot edit this deal (an unassigned lead that has not been claimed). */
  disabled?: boolean;
  /** Connection requests the signed-in user has logged today (all deals), for the daily safety limit. */
  connectionsToday?: number;
  onChanged: () => void | Promise<void>;
  notify: (type: 'success' | 'error', message: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [candidates, setCandidates] = useState<{ fullName: string; headline?: string; profileUrl: string }[]>([]);

  const saveUrl = async (url: string) => {
    setBusy('save');
    try {
      const res = await setContactLinkedIn(dealId, contact.id, url);
      if (res.error) return notify('error', res.error);
      setEditing(false);
      setCandidates([]);
      setUrlInput('');
      notify('success', url ? `LinkedIn profile saved for ${contact.name}.` : 'LinkedIn profile removed.');
      await onChanged();
    } catch {
      notify('error', 'Could not save the LinkedIn profile.');
    } finally {
      setBusy(null);
    }
  };

  const find = async () => {
    setBusy('find');
    try {
      const res = await findContactOnLinkedIn(dealId, contact.id);
      if (res.error) return notify('error', res.error);
      if (res.candidates?.length) {
        setCandidates(res.candidates);
        return notify('success', 'Several people matched. Pick the right one.');
      }
      notify('success', `Found ${contact.name} on LinkedIn.`);
      await onChanged();
    } catch {
      notify('error', 'LinkedIn lookup failed. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const log = async (touch: LinkedInTouch, label: string) => {
    setBusy(touch);
    try {
      const res = await logLinkedInTouch(dealId, contact.id, touch);
      if (res.error) return notify('error', res.error);
      // The server adds a warning once today's connection requests reach the safe limit.
      if (res.message) notify('error', res.message);
      else notify('success', `Logged: ${label} (${contact.name}).`);
      await onChanged();
    } catch {
      notify('error', 'Could not log this LinkedIn activity.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '2px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
        {contact.linkedinUrl ? (
          <>
            <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ ...pill, color: LINKEDIN_BLUE, borderColor: '#bfdbfe', background: '#eff6ff', textDecoration: 'none' }}>
              <ExternalLink size={12} /> LinkedIn profile
            </a>
            <button type="button" style={pill} onClick={() => { setUrlInput(contact.linkedinUrl || ''); setEditing(true); }} disabled={disabled} title="Change the profile URL">Edit</button>
          </>
        ) : (
          <>
            <button type="button" style={{ ...pill, color: LINKEDIN_BLUE, borderColor: '#bfdbfe' }} onClick={find} disabled={disabled || busy !== null}>
              {busy === 'find' ? <Loader2 size={12} className="spin-li" /> : <Search size={12} />} Find on LinkedIn
            </button>
            <button type="button" style={pill} onClick={() => setEditing(true)} disabled={disabled || busy !== null}>Paste URL</button>
          </>
        )}
        {contact.sourcePostUrl && (
          <a href={contact.sourcePostUrl} target="_blank" rel="noopener noreferrer" style={{ ...pill, textDecoration: 'none' }} title="The LinkedIn post this lead was discovered from">
            <FileText size={12} /> Source post
          </a>
        )}
      </div>

      {editing && (
        <form onSubmit={(e) => { e.preventDefault(); saveUrl(urlInput); }} style={{ display: 'flex', gap: '6px' }}>
          <input
            autoFocus
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://www.linkedin.com/in/username"
            aria-label={`LinkedIn profile URL for ${contact.name}`}
            style={{ flex: 1, minWidth: 0, fontSize: '0.78rem', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
          />
          <button type="submit" style={{ ...pill, background: LINKEDIN_BLUE, color: '#fff', borderColor: LINKEDIN_BLUE }} disabled={busy !== null} aria-label="Save profile URL">
            {busy === 'save' ? <Loader2 size={12} className="spin-li" /> : <Check size={12} />}
          </button>
          <button type="button" style={pill} onClick={() => setEditing(false)} aria-label="Cancel"><X size={12} /></button>
        </form>
      )}

      {candidates.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>Which one is {contact.name}?</div>
          {candidates.map((c) => (
            <button key={c.profileUrl} type="button" onClick={() => saveUrl(c.profileUrl)} disabled={busy !== null} style={{ textAlign: 'left', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>{c.fullName}</div>
              {c.headline && <div style={{ fontSize: '0.72rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.headline}</div>}
            </button>
          ))}
        </div>
      )}

      <div>
        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
          <span>Log LinkedIn activity</span>
          {connectionsToday !== undefined && (
            <span style={{ textTransform: 'none', letterSpacing: 0, color: connectionsToday >= LINKEDIN_DAILY_CONNECTION_LIMIT ? '#dc2626' : '#94a3b8' }} title="Connection requests you logged today, across all deals">
              {connectionsToday}/{LINKEDIN_DAILY_CONNECTION_LIMIT} requests today
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
          {TOUCHES.map((t) => (
            <button key={t.id} type="button" style={pill} onClick={() => log(t.id, t.label)} disabled={disabled || busy !== null}>
              {busy === t.id ? <Loader2 size={11} className="spin-li" /> : null} {t.label}
            </button>
          ))}
        </div>
      </div>

      <style>{`@keyframes spin-li-kf { to { transform: rotate(360deg); } } .spin-li { animation: spin-li-kf 0.9s linear infinite; }`}</style>
    </div>
  );
}
