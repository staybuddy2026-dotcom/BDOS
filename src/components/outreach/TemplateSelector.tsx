'use client';

import { OutreachChannel, ToneSetting } from '@/features/outreach/types';
import { Mail, Share2, FileText, Calendar, Sparkles } from 'lucide-react';

export function TemplateSelector({
  selectedChannel,
  selectedTone,
  onSelectChannel,
  onSelectTone,
}: {
  selectedChannel: OutreachChannel;
  selectedTone: ToneSetting;
  onSelectChannel: (ch: OutreachChannel) => void;
  onSelectTone: (tn: ToneSetting) => void;
}) {
  const channels = [
    { id: 'EMAIL' as const, label: 'Email Outreach', icon: Mail },
    { id: 'LINKEDIN' as const, label: 'LinkedIn InMail', icon: Share2 },
    { id: 'PROPOSAL_COVER' as const, label: 'Proposal Cover Letter', icon: FileText },
    { id: 'MEETING_INVITE' as const, label: 'Discovery Call Invite', icon: Calendar },
  ];

  const tones = [
    { id: 'EXECUTIVE' as const, label: '👔 Executive' },
    { id: 'TECHNICAL' as const, label: '💻 Technical' },
    { id: 'FRIENDLY' as const, label: '🤝 Friendly' },
    { id: 'CONSULTATIVE' as const, label: '💡 Consultative' },
    { id: 'PAS_FRAMEWORK' as const, label: '🔥 PAS Framework' },
    { id: 'ROI_FOCUSED' as const, label: '📈 ROI Focused' },
    { id: 'CHALLENGER' as const, label: '⚡ Challenger Sale' },
  ];

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 4px 24px rgba(0,0,0,0.03)' }}>
      {/* Channel Select */}
      <div>
        <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.04em' }}>
          Select Outreach Channel
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
          {channels.map((ch) => {
            const Icon = ch.icon;
            const isSelected = selectedChannel === ch.id;
            return (
              <button
                key={ch.id}
                onClick={() => onSelectChannel(ch.id)}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  border: isSelected ? '1.5px solid #6366f1' : '1px solid #e2e8f0',
                  background: isSelected ? '#eef2ff' : '#ffffff',
                  color: isSelected ? '#6366f1' : '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 2px 8px rgba(99, 102, 241, 0.1)' : 'none',
                }}
              >
                <Icon size={16} style={{ color: isSelected ? '#6366f1' : '#94a3b8' }} /> {ch.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tone Select */}
      <div>
        <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.04em' }}>
          <Sparkles size={16} style={{ color: '#6366f1' }} /> AI Tone & Persona
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {tones.map((tn) => {
            const isSelected = selectedTone === tn.id;
            return (
              <button
                key={tn.id}
                onClick={() => onSelectTone(tn.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  border: isSelected ? '1.5px solid #6366f1' : '1px solid #e2e8f0',
                  background: isSelected ? '#eef2ff' : '#ffffff',
                  color: isSelected ? '#6366f1' : '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 2px 8px rgba(99, 102, 241, 0.1)' : 'none',
                }}
              >
                {tn.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
