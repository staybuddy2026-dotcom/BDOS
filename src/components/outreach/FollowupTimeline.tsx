'use client';

import { FollowupStage, SequenceStepDraft } from '@/features/outreach/types';
import { Check, AlertTriangle, ListChecks } from 'lucide-react';
import s from '@/components/ui/ui.module.css';

export const STAGES: { id: FollowupStage; day: number; label: string; desc: string }[] = [
  { id: 'STAGE_1_INITIAL', day: 1, label: 'Relevance', desc: 'Specific reason and one open question' },
  { id: 'STAGE_2_FOLLOWUP', day: 3, label: 'New angle', desc: 'A fresh observation that gives value' },
  { id: 'STAGE_3_VALUE_ADD', day: 7, label: 'Bottleneck & proof', desc: 'Hypothesis plus a real portfolio match' },
  { id: 'STAGE_4_BREAKUP', day: 14, label: 'Close the loop', desc: 'Short, no pressure sign off' },
];

const formatDue = (startAt: string, day: number) =>
  new Date(new Date(startAt).getTime() + (day - 1) * 86400000).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

// First real line of the message (skips the greeting) as a one-line preview.
const preview = (body: string) => body.split('\n').map((l) => l.trim()).filter(Boolean)[1] || '';

export function FollowupTimeline({
  currentStage,
  onSelectStage,
  sequence,
  sentStages = [],
  scheduledStartAt,
  disabled = false,
}: {
  currentStage: FollowupStage;
  onSelectStage?: (stage: FollowupStage) => void;
  sequence?: SequenceStepDraft[];
  sentStages?: FollowupStage[];
  scheduledStartAt?: string;
  disabled?: boolean;
}) {
  const hasSequence = !!sequence?.length;
  const sentCount = sentStages.length;

  return (
    <section className={s.card} aria-label="Outreach sequence">
      <div className={s.cardHeader}>
        <div>
          <h3 className={s.cardTitle}>
            <span className={s.iconTile}><ListChecks size={16} /></span>
            4-Stage Sequence
          </h3>
          <p className={s.cardSubtitle}>
            {hasSequence ? 'Select a stage to review and edit its message.' : 'Available for the Email and LinkedIn DM channels.'}
          </p>
        </div>
        {hasSequence && (
          <span className={`${s.badge} ${sentCount === 4 ? s.badgeGreen : s.badgeIndigo}`}>
            {sentCount}/4 sent
          </span>
        )}
      </div>

      <div className={s.stageList}>
        {STAGES.map((st, idx) => {
          const step = sequence?.find((x) => x.stage === st.id);
          const active = hasSequence && currentStage === st.id;
          const sent = sentStages.includes(st.id);
          const needsReview = !!step && !sent && (step.confidence === 'low' || step.qualityWarnings.length > 0);
          return (
            <button
              key={st.id}
              type="button"
              disabled={!hasSequence || disabled}
              aria-current={active ? 'step' : undefined}
              onClick={() => onSelectStage?.(st.id)}
              className={`${s.stage} ${active ? s.stageActive : ''}`}
            >
              <span className={`${s.stageNum} ${sent ? s.stageNumSent : ''}`}>
                {sent ? <Check size={16} /> : idx + 1}
              </span>
              <span style={{ minWidth: 0 }}>
                <span className={s.stageTitle}>
                  {st.label}
                  <span className={s.stageDay}>
                    Day {st.day}{scheduledStartAt ? ` · ${formatDue(scheduledStartAt, st.day)}` : ''}
                  </span>
                </span>
                <span className={s.stageDesc} style={{ display: 'block' }}>
                  {step ? preview(step.bodyContent) || st.desc : st.desc}
                </span>
              </span>
              {sent ? (
                <span className={`${s.badge} ${s.badgeGreen}`}>Sent</span>
              ) : needsReview ? (
                <span className={`${s.badge} ${s.badgeAmber}`} title="Low confidence or rule warning: review before sending">
                  <AlertTriangle size={12} /> Review
                </span>
              ) : step ? (
                <span className={`${s.badge} ${s.badgeGray}`}>Ready</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
