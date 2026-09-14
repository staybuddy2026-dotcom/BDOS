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
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 999, animation: 'fadeIn 0.5s ease-out' }}
        onClick={onClose}
      />
      <div style={{ position: 'fixed', top: 0, right: 0, width: '100%', maxWidth: '700px', height: '100vh', background: '#ffffff', borderLeft: '1px solid var(--border-subtle)', zIndex: 1000, display: 'flex', flexDirection: 'column', boxShadow: '-20px 0 50px rgba(15, 23, 42, 0.15)', animation: 'slideInRightSmooth 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)', overflow: 'hidden' }}>
        <style>{`
          @keyframes slideInRightSmooth {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', padding: '16px', background: '#ffffff', zIndex: 10, flexShrink: 0 }}>
          <div>
            <span style={{ fontSize: '0.72rem', background: 'var(--accent-indigo-glow)', color: 'var(--accent-indigo)', padding: '4px 10px', borderRadius: '6px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Single-Click Omni-Channel Outreach</span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', margin: '10px 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.02em' }}>
              Campaign Package <Send size={20} style={{ color: 'var(--accent-indigo)' }} />
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              <strong style={{ color: 'var(--text-secondary)' }}>Target:</strong> {packageData.targetContactName} ({packageData.targetContactTitle} @ {packageData.companyName})
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
            <button onClick={onClose} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', padding: '8px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b'; }}
            >
              <X size={18} strokeWidth={2.5} />
            </button>

            <button
              onClick={() => {
                const dom = packageData.companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
                window.location.href = `/engagement?domain=${encodeURIComponent(dom)}`;
              }}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-violet))',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 6px 16px rgba(99, 102, 241, 0.3)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(99, 102, 241, 0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.3)'; }}
            >
              <Send size={14} /> Full AI Workspace
            </button>
          </div>
        </div>

        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '24px 32px 32px 32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Tabs */}
          <div className="custom-scrollbar" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', overflowX: 'auto', flexShrink: 0 }}>
            {(['email', 'linkedin', 'whatsapp', 'followup', 'proposal', 'agenda'] as const).map((tb) => (
              <button
                key={tb}
                onClick={() => setActiveTab(tb)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: activeTab === tb ? 800 : 600,
                  border: activeTab === tb ? '1px solid var(--accent-indigo)' : '1px solid transparent',
                  background: activeTab === tb ? 'var(--accent-indigo-glow)' : 'transparent',
                  color: activeTab === tb ? 'var(--accent-indigo)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tb) {
                    e.currentTarget.style.background = 'var(--bg-secondary)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tb) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-muted)';
                  }
                }}
              >
                {tb}
              </button>
            ))}
          </div>

          {/* Active Channel Content */}
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.03)', flex: 1 }}>
            {activeTab === 'email' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
                <div style={{ fontSize: '0.86rem', color: 'var(--text-primary)', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <strong style={{ color: 'var(--text-muted)' }}>Subject:</strong> {packageData.coldEmail.subject}
                </div>
                <textarea
                  value={packageData.coldEmail.body}
                  readOnly
                  className="custom-scrollbar"
                  style={{ flex: 1, minHeight: '300px', width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', fontFamily: 'var(--font-body)', resize: 'none' }}
                />
                <button onClick={() => handleCopy(packageData.coldEmail.body)} style={{ padding: '12px', borderRadius: '10px', background: 'var(--accent-indigo)', color: '#ffffff', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: 'none', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-indigo-hover)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent-indigo)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />} Copy Email Content
                </button>
              </div>
            )}

            {activeTab === 'linkedin' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '0.86rem', color: 'var(--text-primary)', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <strong style={{ color: '#0a66c2' }}>InMail Subject:</strong> {packageData.linkedInInMail.subject}
                </div>
                <textarea
                  value={packageData.linkedInInMail.message}
                  readOnly
                  className="custom-scrollbar"
                  rows={8}
                  style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', fontFamily: 'var(--font-body)', resize: 'none' }}
                />
                <button onClick={() => handleCopy(packageData.linkedInInMail.message)} style={{ padding: '12px', borderRadius: '10px', background: '#0a66c2', color: '#ffffff', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: 'none', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(10, 102, 194, 0.2)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#084f96'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#0a66c2'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />} Copy LinkedIn InMail
                </button>
              </div>
            )}

            {activeTab === 'whatsapp' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-success)' }} /> WhatsApp Direct Chat Pitch
                </div>
                <textarea
                  value={packageData.whatsAppMessage}
                  readOnly
                  className="custom-scrollbar"
                  rows={6}
                  style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', fontFamily: 'var(--font-body)', resize: 'none' }}
                />
                <button onClick={() => handleCopy(packageData.whatsAppMessage)} style={{ padding: '12px', borderRadius: '10px', background: 'var(--color-success)', color: '#ffffff', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: 'none', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#059669'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-success)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />} Copy WhatsApp Message
                </button>
              </div>
            )}

            {activeTab === 'followup' && (
              <div className="custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '4px' }}>
                {packageData.followupSequence.map((f, idx) => (
                  <div key={idx} style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px', transition: 'all 0.2s', cursor: 'default' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-indigo)'; e.currentTarget.style.background = 'var(--accent-indigo-glow)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = '#f8fafc'; }}
                  >
                    <div style={{ fontSize: '0.78rem', color: 'var(--accent-indigo)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                      Day {f.day} Touch
                    </div>
                    <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{f.message}</div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'proposal' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-warning)' }} /> Commercial Proposal Opening Introduction
                </div>
                <textarea
                  value={packageData.proposalIntro}
                  readOnly
                  className="custom-scrollbar"
                  rows={8}
                  style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', fontFamily: 'var(--font-body)', resize: 'none' }}
                />
              </div>
            )}

            {activeTab === 'agenda' && (
              <div className="custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', paddingRight: '4px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-indigo)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-indigo)' }} /> Technical Discovery Call Agenda
                </div>
                {packageData.meetingAgenda.map((ag, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: '#f8fafc', border: '1px solid var(--border-subtle)', padding: '14px', borderRadius: '10px' }}>
                    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, width: '24px', height: '24px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {idx + 1}
                    </div>
                    <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: '1.5', paddingTop: '2px' }}>
                      {ag}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
