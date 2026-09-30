'use client';

import { OutreachChannel, ToneSetting } from '@/features/outreach/types';
import { Mail, MessageSquare, FileText, CalendarDays, Sparkles, Briefcase, Code2, Smile, Lightbulb, Layers, TrendingUp, Zap, SlidersHorizontal } from 'lucide-react';
import s from './outreach.module.css';

const CHANNELS = [
  { id: 'EMAIL' as const, label: 'Email', icon: Mail, sequence: true },
  { id: 'LINKEDIN' as const, label: 'LinkedIn DM', icon: MessageSquare, sequence: true },
  { id: 'PROPOSAL_COVER' as const, label: 'Proposal Cover', icon: FileText, sequence: false },
  { id: 'MEETING_INVITE' as const, label: 'Call Invite', icon: CalendarDays, sequence: false },
];

const TONES = [
  { id: 'EXECUTIVE' as const, label: 'Executive', icon: Briefcase },
  { id: 'TECHNICAL' as const, label: 'Technical', icon: Code2 },
  { id: 'FRIENDLY' as const, label: 'Friendly', icon: Smile },
  { id: 'CONSULTATIVE' as const, label: 'Consultative', icon: Lightbulb },
  { id: 'PAS_FRAMEWORK' as const, label: 'PAS', icon: Layers },
  { id: 'ROI_FOCUSED' as const, label: 'ROI Focused', icon: TrendingUp },
  { id: 'CHALLENGER' as const, label: 'Challenger', icon: Zap },
];

export function TemplateSelector({
  selectedChannel,
  selectedTone,
  onSelectChannel,
  onSelectTone,
  disabled = false,
}: {
  selectedChannel: OutreachChannel;
  selectedTone: ToneSetting;
  onSelectChannel: (ch: OutreachChannel) => void;
  onSelectTone: (tn: ToneSetting) => void;
  disabled?: boolean;
}) {
  return (
    <section className={s.card} aria-label="Channel and tone">
      <div className={s.cardHeader}>
        <div>
          <h3 className={s.cardTitle}>
            <span className={s.iconTile}><SlidersHorizontal size={16} /></span>
            Channel & Tone
          </h3>
          <p className={s.cardSubtitle}>Changing either regenerates the sequence.</p>
        </div>
      </div>

      <div>
        <div className={s.sectionLabel}>Outreach channel</div>
        <div className={s.channelGrid}>
          {CHANNELS.map((ch) => {
            const Icon = ch.icon;
            const active = selectedChannel === ch.id;
            return (
              <button
                key={ch.id}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                onClick={() => !active && onSelectChannel(ch.id)}
                className={`${s.chip} ${s.channelBtn} ${active ? s.chipActive : ''}`}
              >
                <Icon size={15} /> {ch.label}
                {ch.sequence && <span className={s.channelNote}>4 stages</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className={s.sectionLabel}><Sparkles size={13} /> Tone nudge</div>
        <div className={s.chipRow}>
          {TONES.map((tn) => {
            const Icon = tn.icon;
            const active = selectedTone === tn.id;
            return (
              <button
                key={tn.id}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                onClick={() => !active && onSelectTone(tn.id)}
                className={`${s.chip} ${active ? s.chipActive : ''}`}
              >
                <Icon size={14} /> {tn.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
