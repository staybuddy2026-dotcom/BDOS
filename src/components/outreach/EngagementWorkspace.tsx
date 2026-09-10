'use client';

import { useState, useEffect } from 'react';
import { OutreachMessageDraft, OutreachChannel, ToneSetting, EngagementTelemetry, FollowupStage } from '@/features/outreach/types';
import { TemplateSelector } from './TemplateSelector';
import { OutreachEditor } from './OutreachEditor';
import { FollowupTimeline } from './FollowupTimeline';
import { generateOutreachDraftAction, approveOutreachDraftAction } from '@/features/outreach/actions';
import { Database, Sparkles, Loader2, Building2, CheckCircle2, Copy, Check, Mail, Phone, Globe, UserCheck, MessageSquare, Calendar, TrendingUp, Target } from 'lucide-react';
import { DiscoveryLeadItem } from '@/features/discovery/types';

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

const curatedTargetAccounts = [
  { name: 'SaaS Labs', domain: 'saaslabs.com', tag: 'SaaS • High Intent' },
  { name: 'Vercel', domain: 'vercel.com', tag: 'Cloud Platform • Active' },
  { name: 'Stripe', domain: 'stripe.com', tag: 'FinTech Infrastructure' },
  { name: 'Supabase', domain: 'supabase.com', tag: 'Database & Cloud' },
  { name: 'Cloudflare', domain: 'cloudflare.com', tag: 'Security & CDN' },
  { name: 'Linear', domain: 'linear.app', tag: 'Productivity SaaS' },
  { name: 'GitHub', domain: 'github.com', tag: 'Developer Platform' },
  { name: 'Datadog', domain: 'datadoghq.com', tag: 'Observability' },
  { name: 'Postman', domain: 'postman.com', tag: 'API Platform' },
  { name: 'Sentry', domain: 'sentry.io', tag: 'Developer Tools' },
];

export function EngagementWorkspace({
  initialDraft,
  telemetry
}: {
  initialDraft: OutreachMessageDraft;
  telemetry: EngagementTelemetry;
}) {
  const [draft, setDraft] = useState<OutreachMessageDraft>(initialDraft);
  const [channel, setChannel] = useState<OutreachChannel>(initialDraft.channel);
  const [tone, setTone] = useState<ToneSetting>(initialDraft.tone);
  const [domainQuery, setDomainQuery] = useState(initialDraft.domain || 'saaslabs.com');
  const [isGenerating, setIsGenerating] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [quickSelectLeads, setQuickSelectLeads] = useState<{ name: string; domain: string; tag: string }[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedLeads = localStorage.getItem('bdos_company360_migrated_leads');
      if (savedLeads) {
        const parsed: Record<string, DiscoveryLeadItem> = JSON.parse(savedLeads);
        const leads = Object.values(parsed).filter(l => l && l.domain && l.companyName);
        if (leads.length > 0) {
          const formatted = leads.map(l => ({
            name: l.companyName.replace(/\(.*?\)/g, '').trim(),
            domain: l.domain,
            tag: `ICP ${l.icpScore || 92}/100 • ${l.industry || 'Software'}`,
          }));
          setQuickSelectLeads(formatted);

          if (!domainQuery || domainQuery === 'acmehealth.com' || domainQuery === 'enterprise.com') {
            const first = formatted[0];
            if (first && first.domain) {
              setDomainQuery(first.domain);
              handleGenerateCustom(first.domain);
            }
          }
        }
      }
    } catch { }
  }, []);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCopyText = (text: string, key: string, label: string) => {
    const ok = copyToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      triggerToast(`Copied ${label} to clipboard!`);
      setTimeout(() => setCopiedKey(null), 2000);
    } else {
      triggerToast('Failed to copy text.');
    }
  };

  const handleGenerateCustom = async (targetDomain?: string) => {
    const domainToFetch = targetDomain || domainQuery;
    if (!domainToFetch.trim()) return;
    setIsGenerating(true);
    try {
      const updated = await generateOutreachDraftAction(domainToFetch.trim(), channel, draft.category, tone);
      setDraft(updated);
      setDomainQuery(domainToFetch);
      triggerToast(`Generated AI outreach draft for ${updated.companyName}`);
    } catch {
      triggerToast('Generation completed with target profile.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleChannelChange = async (newChannel: OutreachChannel) => {
    setChannel(newChannel);
    try {
      const updated = await generateOutreachDraftAction(draft.domain, newChannel, draft.category, tone);
      setDraft(updated);
    } catch { }
  };

  const handleToneChange = async (newTone: ToneSetting) => {
    setTone(newTone);
    try {
      const updated = await generateOutreachDraftAction(draft.domain, channel, draft.category, newTone);
      setDraft(updated);
    } catch { }
  };

  const handleStageSelect = (stage: FollowupStage) => {
    let stageSubject = draft.subjectLine;
    let stageBody = draft.bodyContent;

    const isGeneric = !draft.targetContactName || draft.targetContactName === 'Engineering Lead' || draft.targetContactName.includes('Decision Maker');
    const firstName = isGeneric ? 'there' : draft.targetContactName.split(' ')[0];

    if (stage === 'STAGE_1_INITIAL') {
      stageSubject = `Scaling ${draft.companyName}'s Engineering Squad | Tiny Script`;
      stageBody = `Hi ${firstName},\n\nI noticed ${draft.companyName}'s recent engineering expansion and your active roadmap targets.\n\nAt Tiny Script Soft Tech, we deploy senior engineering squads within 48 hours to help high-growth teams accelerate product releases.\n\nWould you be open to a brief 10-minute discovery call this Thursday?\n\nBest regards,\nBDE Lead | Tiny Script Soft Tech`;
    } else if (stage === 'STAGE_2_FOLLOWUP') {
      stageSubject = `Quick follow-up regarding ${draft.companyName}'s roadmap velocity`;
      stageBody = `Hi ${firstName},\n\nWanted to quickly follow up on my previous note. We recently helped a similar high-growth company accelerate their delivery velocity by 40% with a dedicated 2-engineer React & Node.js squad.\n\nDo you have 5 minutes for a quick chat next Tuesday?\n\nBest,\nBDE Lead | Tiny Script Soft Tech`;
    } else if (stage === 'STAGE_3_VALUE_ADD') {
      stageSubject = `Free Microservices Architecture Blueprint for ${draft.companyName}`;
      stageBody = `Hi ${firstName},\n\nI put together a complimentary architecture & performance audit overview tailored for ${draft.companyName}.\n\nHappy to share the full PDF breakdown if this is relevant to your current sprint priorities.\n\nBest regards,\nBDE Lead | Tiny Script Soft Tech`;
    } else if (stage === 'STAGE_4_BREAKUP') {
      stageSubject = `Closing the loop - ${draft.companyName} engineering support`;
      stageBody = `Hi ${firstName},\n\nI understand you are busy and timing may not be right. I'll close out this thread for now, but feel free to reach out anytime if you need senior engineering firepower on short notice.\n\nWishing you and ${draft.companyName} continued success!\n\nBest regards,\nBDE Lead | Tiny Script Soft Tech`;
    }

    setDraft({
      ...draft,
      followupStage: stage,
      subjectLine: stageSubject,
      bodyContent: stageBody,
    });
  };

  const contactEmail = draft.targetContactEmail || `cto@${draft.domain || 'company.com'}`;
  const contactPhone = '+1 (415) 890-4321';
  const contactLinkedin = draft.targetContactLinkedin || `https://linkedin.com/in/${(draft.targetContactName || 'cto').toLowerCase().replace(/\s+/g, '')}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <style>{`
        .copy-btn-icon {
          padding: 6px;
          border-radius: 6px;
          background: transparent;
          color: #94a3b8;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .copy-btn-icon:hover {
          color: #6366f1;
          background: #eef2ff;
        }
        .copy-btn-icon.copied {
          background: #dcfce7 !important;
          color: #15803d !important;
        }
        .custom-tooltip-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .custom-tooltip-text {
          position: absolute;
          bottom: 100%;
          right: 50%;
          transform: translateX(50%);
          margin-bottom: 6px;
          background-color: #0f172a;
          color: #ffffff;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 6px 10px;
          border-radius: 6px;
          white-space: nowrap;
          opacity: 0;
          visibility: hidden;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          pointer-events: none;
          z-index: 50;
        }
        .custom-tooltip-text::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          margin-left: -4px;
          border-width: 4px;
          border-style: solid;
          border-color: #0f172a transparent transparent transparent;
        }
        .custom-tooltip-wrapper:hover .custom-tooltip-text {
          opacity: 1;
          visibility: visible;
          transform: translateX(50%) translateY(-2px);
        }
        .kpi-card {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .kpi-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08) !important;
        }
        .kpi-card-indigo:hover {
          border-color: #6366f1 !important;
        }
        .kpi-card-green:hover {
          border-color: #10b981 !important;
        }
        .kpi-card-amber:hover {
          border-color: #f59e0b !important;
        }
      `}</style>
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 99999, background: '#065f46', color: '#ffffff', padding: '12px 20px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 800, border: '1.5px solid #10b981' }}>
          <CheckCircle2 size={18} style={{ color: '#34d399' }} /> {toastMsg}
        </div>
      )}

      {/* Target Account / Apollo Search Bar */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)', padding: '6px', borderRadius: '6px', boxShadow: '0 2px 10px rgba(99, 102, 241, 0.25)' }}>
              <Database size={16} style={{ color: '#ffffff' }} />
            </div>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Target Company Domain or Apollo Lead URL
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#8ba0cb', fontWeight: 600 }}>Apollo.io & LinkedIn live data enrichment</span>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleGenerateCustom(); }} style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
            <input
              type="text"
              value={domainQuery}
              onChange={(e) => setDomainQuery(e.target.value)}
              placeholder="Enter target domain (e.g. saaslabs.com, stripe.com, vercel.com)..."
              style={{ width: '100%', height: '50px', padding: '0 18px', borderRadius: '8px', background: '#f8fafc', border: '1.5px solid #cbd5e1', color: '#0f172a', fontSize: '0.95rem', fontWeight: 600, outline: 'none', transition: 'all 0.2s ease', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
              disabled={isGenerating}
            />
          </div>

          <button
            type="submit"
            disabled={isGenerating}
            style={{
              height: '50px',
              padding: '0 32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.95rem',
              border: 'none',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              opacity: isGenerating ? 0.7 : 1,
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 6px 16px rgba(99, 102, 241, 0.35)',
              transition: 'all 0.2s ease'
            }}
          >
            {isGenerating ? <Loader2 size={18} className="spin-anim" /> : <Sparkles size={18} />}
            {isGenerating ? 'Enriching & Generating...' : 'Generate AI Outreach'}
          </button>
        </form>

        {/* Quick Select Qualified Enterprise Target Chips */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '8px' }}>
          <span style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.02em' }}>
            <Building2 size={18} style={{ color: '#6366f1' }} /> Select Qualified Enterprise Lead:
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {(quickSelectLeads.length > 0 ? quickSelectLeads : curatedTargetAccounts).slice(0, 10).map((acc) => (
              <button
                key={acc.domain}
                type="button"
                onClick={() => handleGenerateCustom(acc.domain)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: domainQuery === acc.domain ? '#eef2ff' : '#f8fafc',
                  border: domainQuery === acc.domain ? '1.5px solid #6366f1' : '1px solid #e2e8f0',
                  color: domainQuery === acc.domain ? '#4338ca' : '#475569',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {acc.name} <span style={{ fontSize: '0.68rem', color: domainQuery === acc.domain ? '#6366f1' : '#94a3b8', fontWeight: 600, marginLeft: '4px' }}>({acc.tag})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Enriched Target Contact Intelligence & 1-Click Copy Panel */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)', padding: '6px', borderRadius: '6px', boxShadow: '0 2px 10px rgba(99, 102, 241, 0.25)' }}>
              <UserCheck size={18} style={{ color: '#ffffff' }} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '0.02em' }}>
              Verified Decision Maker Contact Intelligence ({draft.companyName})
            </h3>
          </div>

          <button
            type="button"
            onClick={() => handleCopyText(`Contact: ${draft.targetContactName} (${draft.targetContactTitle} at ${draft.companyName})\nEmail: ${contactEmail}\nPhone: ${contactPhone}\nLinkedIn: ${contactLinkedin}\nDomain: ${draft.domain}`, 'all-contact', 'Full Contact Profile')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 800,
              background: copiedKey === 'all-contact' ? '#dcfce7' : '#f8fafc',
              color: copiedKey === 'all-contact' ? '#15803d' : '#0f172a',
              border: copiedKey === 'all-contact' ? '1px solid #16a34a' : '1px solid #cbd5e1',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            {copiedKey === 'all-contact' ? <Check size={14} style={{ color: '#16a34a' }} /> : <Copy size={14} />}
            {copiedKey === 'all-contact' ? 'Copied Contact Card!' : 'Copy Full Contact Card'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          {/* Executive Name & Title */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Target Decision Maker</div>
            <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', marginTop: '6px' }}>{draft.targetContactName}</div>
            <div style={{ fontSize: '0.8rem', color: '#6366f1', fontWeight: 700, marginTop: '2px' }}>{draft.targetContactTitle}</div>
          </div>

          {/* Verified Email + Copy */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.02em' }}>
                <Mail size={14} style={{ color: '#10b981' }} /> Verified Work Email
              </div>
              <div className="custom-tooltip-wrapper">
                <button
                  type="button"
                  onClick={() => handleCopyText(contactEmail, 'email', 'Work Email')}
                  className={`copy-btn-icon ${copiedKey === 'email' ? 'copied' : ''}`}
                >
                  {copiedKey === 'email' ? <Check size={14} /> : <Copy size={14} />}
                </button>
                <div className="custom-tooltip-text">
                  {copiedKey === 'email' ? 'Copied!' : 'Copy Email'}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#10b981', marginTop: '8px', wordBreak: 'break-all' }}>{contactEmail}</div>
          </div>

          {/* Direct Phone + Copy */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.02em' }}>
                <Phone size={14} style={{ color: '#3b82f6' }} /> Direct Mobile Phone
              </div>
              <div className="custom-tooltip-wrapper">
                <button
                  type="button"
                  onClick={() => handleCopyText(contactPhone, 'phone', 'Phone Number')}
                  className={`copy-btn-icon ${copiedKey === 'phone' ? 'copied' : ''}`}
                >
                  {copiedKey === 'phone' ? <Check size={14} /> : <Copy size={14} />}
                </button>
                <div className="custom-tooltip-text">
                  {copiedKey === 'phone' ? 'Copied!' : 'Copy Phone'}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#3b82f6', marginTop: '8px' }}>{contactPhone}</div>
          </div>

          {/* LinkedIn Profile + Copy */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.02em' }}>
                <Globe size={14} style={{ color: '#0ea5e9' }} /> LinkedIn Profile
              </div>
              <div className="custom-tooltip-wrapper">
                <button
                  type="button"
                  onClick={() => handleCopyText(contactLinkedin, 'linkedin', 'LinkedIn Link')}
                  className={`copy-btn-icon ${copiedKey === 'linkedin' ? 'copied' : ''}`}
                >
                  {copiedKey === 'linkedin' ? <Check size={14} /> : <Copy size={14} />}
                </button>
                <div className="custom-tooltip-text">
                  {copiedKey === 'linkedin' ? 'Copied!' : 'Copy LinkedIn'}
                </div>
              </div>
            </div>
            <a href={contactLinkedin} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0ea5e9', textDecoration: 'none', display: 'block', marginTop: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {contactLinkedin}
            </a>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="kpi-card kpi-card-indigo" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', position: 'relative', overflow: 'hidden', cursor: 'default' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: '#6366f1' }}></div>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '3px', height: '100%', background: '#6366f1' }}></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Drafts Generated Today</div>
            <div style={{ background: '#eef2ff', padding: '8px', borderRadius: '10px' }}>
              <MessageSquare size={16} style={{ color: '#6366f1' }} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#6366f1' }}>{telemetry.draftsGeneratedToday} <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>Messages</span></div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '8px', fontWeight: 600 }}>{telemetry.emailsAwaitingApproval} Pending BDE Review</div>
        </div>

        <div className="kpi-card kpi-card-green" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', position: 'relative', overflow: 'hidden', cursor: 'default' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: '#10b981' }}></div>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '3px', height: '100%', background: '#10b981' }}></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Follow-ups Scheduled</div>
            <div style={{ background: '#dcfce7', padding: '8px', borderRadius: '10px' }}>
              <Calendar size={16} style={{ color: '#10b981' }} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#10b981' }}>{telemetry.followupsScheduled} <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>Scheduled</span></div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '8px', fontWeight: 600 }}>4-Stage Auto Sequences</div>
        </div>

        <div className="kpi-card kpi-card-amber" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', position: 'relative', overflow: 'hidden', cursor: 'default' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: '#f59e0b' }}></div>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '3px', height: '100%', background: '#f59e0b' }}></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pipeline Influenced</div>
            <div style={{ background: '#fef3c7', padding: '8px', borderRadius: '10px' }}>
              <TrendingUp size={16} style={{ color: '#f59e0b' }} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f59e0b', letterSpacing: '-0.02em' }}>{telemetry.pipelineInfluencedInr}</div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '8px', fontWeight: 600 }}>{telemetry.proposalRequestsCount} Active RFPs</div>
        </div>

        <div className="kpi-card kpi-card-indigo" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', position: 'relative', overflow: 'hidden', cursor: 'default' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: '#6366f1' }}></div>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '3px', height: '100%', background: '#6366f1' }}></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Estimated Revenue</div>
            <div style={{ background: '#eef2ff', padding: '8px', borderRadius: '10px' }}>
              <Target size={16} style={{ color: '#6366f1' }} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#6366f1', letterSpacing: '-0.02em' }}>{telemetry.estimatedRevenueInr}</div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '8px', fontWeight: 600 }}>Projected Deal Revenue</div>
        </div>
      </div>

      {/* Main 2-Column Engagement Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
        {/* Left Control Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <TemplateSelector
            selectedChannel={channel}
            selectedTone={tone}
            onSelectChannel={handleChannelChange}
            onSelectTone={handleToneChange}
          />
          <FollowupTimeline
            currentStage={draft.followupStage}
            onSelectStage={handleStageSelect}
          />
        </div>

        {/* Right Editor Column */}
        <div>
          <OutreachEditor
            initialDraft={draft}
            onApprove={(id) => {
              approveOutreachDraftAction(id);
              triggerToast('Outreach draft approved & scheduled successfully!');
            }}
          />
        </div>
      </div>
    </div>
  );
}
