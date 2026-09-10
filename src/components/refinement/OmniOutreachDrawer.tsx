'use client';

import { useState } from 'react';
import { OmniChannelOutreachPackage } from '@/features/refinement/types';
import { Send, Check, X, Copy } from 'lucide-react';

export function OmniOutreachDrawer({ 
  packageData, 
  onClose 
}: { 
  packageData: OmniChannelOutreachPackage; 
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'email' | 'linkedin' | 'whatsapp' | 'followup' | 'proposal' | 'agenda'>('email');
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, width: '100%', maxWidth: '720px', height: '100vh', background: '#0b1120', borderLeft: '1px solid rgba(255,255,255,0.1)', zIndex: 1000, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '-10px 0 40px rgba(0,0,0,0.8)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
        <div>
          <span style={{ fontSize: '0.68rem', color: 'var(--accent-indigo)', fontWeight: 800, textTransform: 'uppercase' }}>Single-Click Omni-Channel Outreach Generator</span>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', margin: '2px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Multi-Channel Campaign Package <Send size={18} style={{ color: 'var(--accent-indigo)' }} />
          </h2>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Target: {packageData.targetContactName} ({packageData.targetContactTitle} • {packageData.companyName})</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => {
              const dom = packageData.companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
              window.location.href = `/engagement?domain=${encodeURIComponent(dom)}`;
            }}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            }}
          >
            <Send size={13} /> Open in Full AI Engagement Workspace
          </button>
          <button onClick={onClose} style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', padding: '6px', borderRadius: '50%', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px', overflowX: 'auto' }}>
        {(['email', 'linkedin', 'whatsapp', 'followup', 'proposal', 'agenda'] as const).map((tb) => (
          <button
            key={tb}
            onClick={() => setActiveTab(tb)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.74rem',
              fontWeight: 800,
              border: activeTab === tb ? '1px solid #38bdf8' : '1px solid transparent',
              background: activeTab === tb ? 'var(--accent-indigo-glow)' : 'transparent',
              color: activeTab === tb ? '#ffffff' : '#94a3b8',
              cursor: 'pointer',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            {tb}
          </button>
        ))}
      </div>

      {/* Active Channel Content */}
      <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {activeTab === 'email' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}><strong>Subject:</strong> {packageData.coldEmail.subject}</div>
            <textarea
              value={packageData.coldEmail.body}
              readOnly
              rows={8}
              style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'monospace' }}
            />
            <button onClick={() => handleCopy(packageData.coldEmail.body)} style={{ padding: '8px', borderRadius: '6px', background: 'var(--accent-indigo-glow)', border: '1px solid #38bdf8', color: 'var(--bg-primary)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              {copied ? <Check size={14} /> : <Copy size={14} />} Copy Email Content
            </button>
          </div>
        )}

        {activeTab === 'linkedin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}><strong>InMail Subject:</strong> {packageData.linkedInInMail.subject}</div>
            <textarea
              value={packageData.linkedInInMail.message}
              readOnly
              rows={4}
              style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'monospace' }}
            />
            <button onClick={() => handleCopy(packageData.linkedInInMail.message)} style={{ padding: '8px', borderRadius: '6px', background: 'var(--accent-indigo-glow)', border: '1px solid #38bdf8', color: 'var(--bg-primary)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              {copied ? <Check size={14} /> : <Copy size={14} />} Copy LinkedIn InMail
            </button>
          </div>
        )}

        {activeTab === 'whatsapp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-success)' }}><strong>WhatsApp Direct Chat Pitch:</strong></div>
            <textarea
              value={packageData.whatsAppMessage}
              readOnly
              rows={4}
              style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'monospace' }}
            />
            <button onClick={() => handleCopy(packageData.whatsAppMessage)} style={{ padding: '8px', borderRadius: '6px', background: 'var(--color-success-bg)', border: '1px solid #10b981', color: 'var(--bg-primary)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              {copied ? <Check size={14} /> : <Copy size={14} />} Copy WhatsApp Message
            </button>
          </div>
        )}

        {activeTab === 'followup' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {packageData.followupSequence.map((f, idx) => (
              <div key={idx} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--accent-indigo)', fontWeight: 800 }}>Day {f.day} Follow-up Touch:</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{f.message}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'proposal' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-warning)' }}><strong>Commercial Proposal Opening Introduction:</strong></div>
            <textarea
              value={packageData.proposalIntro}
              readOnly
              rows={4}
              style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'monospace' }}
            />
          </div>
        )}

        {activeTab === 'agenda' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--accent-indigo)' }}><strong>Technical Discovery Call Agenda:</strong></div>
            {packageData.meetingAgenda.map((ag, idx) => (
              <div key={idx} style={{ fontSize: '0.82rem', color: 'var(--text-primary)', background: 'var(--bg-card)', padding: '8px 12px', borderRadius: '6px' }}>
                {ag}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
