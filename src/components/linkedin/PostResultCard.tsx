'use client';

import Link from 'next/link';
import {
  Building2, CheckCircle2, Clock, Copy, ExternalLink, Flame, Kanban, Loader2, MessageSquare, MessageSquareQuote, Repeat2, Send, Sparkles, ThumbsUp, UserPlus,
} from 'lucide-react';
import type { LinkedInPostSearchItem } from '@/features/linkedin/actions';
import type { IntentLevel, PostIntent } from '@/features/linkedin/intent';
import { STAGE_LABELS } from '@/features/crm/types';
import type { CrmMatch } from '@/features/crm/types';
import ui from '@/components/ui/ui.module.css';
import s from './postCard.module.css';

const LEVEL_LABEL: Record<IntentLevel, string> = { HOT: 'Hot', WARM: 'Warm', COLD: 'Cold' };
const LEVEL_CLASS: Record<IntentLevel, string> = { HOT: s.hot, WARM: s.warm, COLD: s.cold };
const AVATAR_COLORS = ['#4f46e5', '#0891b2', '#7c3aed', '#db2777', '#059669', '#ea580c', '#2563eb', '#9333ea'];

/** Up to two initials; the colour is stable per name so the same author always looks the same. */
function avatarFor(name: string) {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  const initials = ((words[0]?.[0] || '?') + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase();
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return { initials, color: AVATAR_COLORS[hash % AVATAR_COLORS.length] };
}

/** "Today", "Yesterday", "3 days ago", then a plain date. */
function postedLabel(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** LinkedIn posts often use blank lines for spacing; keep paragraphs but drop the extra gaps. */
const tidy = (text: string) => text.replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

export type PostResultCardProps = {
  post: LinkedInPostSearchItem;
  intent?: PostIntent;
  crm?: CrmMatch;
  selected: boolean;
  expanded: boolean;
  comment?: string;
  crmBusy: boolean;
  commentBusy: boolean;
  actionsLocked: boolean;
  savingPosts: boolean;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onAddToCrm: () => void;
  onSendToReview: () => void;
  onDraftComment: () => void;
  onCopyComment: () => void;
};

export function PostResultCard({
  post: p, intent, crm, selected, expanded, comment, crmBusy, commentBusy, actionsLocked, savingPosts,
  onToggleSelect, onToggleExpand, onAddToCrm, onSendToReview, onDraftComment, onCopyComment,
}: PostResultCardProps) {
  const isCompany = p.authorType === 'company';
  const avatar = avatarFor(p.authorName);
  const text = tidy(p.content);
  const isLong = text.length > 320 || text.split('\n').length > 5;
  const level = intent?.level;

  return (
    <article className={`${s.card} ${level ? LEVEL_CLASS[level] : ''} ${selected ? s.selected : ''}`} aria-label={`Post by ${p.authorName}`}>
      <div className={s.head}>
        <input
          type="checkbox"
          className={s.check}
          aria-label={`Select post by ${p.authorName}`}
          checked={selected}
          disabled={p.alreadySaved}
          title={p.alreadySaved ? 'Already in your leads' : 'Select for the Review Queue'}
          onChange={onToggleSelect}
        />

        <div className={`${s.avatar} ${isCompany ? s.avatarCompany : ''}`} style={{ background: avatar.color }} aria-hidden>
          {isCompany ? <Building2 size={18} /> : avatar.initials}
        </div>

        <div className={s.who}>
          <div className={s.nameLine}>
            {p.authorProfileUrl
              ? <a className={s.name} href={p.authorProfileUrl} target="_blank" rel="noopener noreferrer">{p.authorName}</a>
              : <span className={s.name}>{p.authorName}</span>}
            {p.authorCompany && !isCompany && <span className={s.company}>· {p.authorCompany}</span>}
          </div>
          {p.authorHeadline && <div className={s.headline} title={p.authorHeadline}>{p.authorHeadline}</div>}
          <div className={s.meta}>
            {p.postedAt && <span className={s.metaItem} title={new Date(p.postedAt).toLocaleString()}><Clock size={12} /> {postedLabel(p.postedAt)}</span>}
            <span className={s.metaItem} title="Reactions"><ThumbsUp size={12} /> {p.likes}</span>
            <span className={s.metaItem} title="Comments"><MessageSquare size={12} /> {p.comments}</span>
            {p.shares > 0 && <span className={s.metaItem} title="Reposts"><Repeat2 size={12} /> {p.shares}</span>}
          </div>
        </div>

        {intent && (
          <div className={s.score} title="Buying intent: how likely the author is to need a development partner soon">
            <div className={s.scoreTop}>
              <span className={s.level}>{level === 'HOT' && <Flame size={11} />}{LEVEL_LABEL[intent.level]}</span>
              <span className={s.scoreNum}>{intent.score}<span className={s.scoreOf}>/100</span></span>
            </div>
            <div className={s.meter} aria-hidden><div className={s.meterFill} style={{ width: `${intent.score}%` }} /></div>
          </div>
        )}
      </div>

      {intent?.reason && (
        <div className={s.signal}>
          <Sparkles size={14} className={s.signalIcon} />
          <span><span className={s.signalLabel}>{intent.level === 'COLD' ? 'Why not a lead:' : 'Why it’s a lead:'}</span>{intent.reason}</span>
        </div>
      )}

      <p className={`${s.body} ${isLong && !expanded ? s.clamped : ''}`}>{text}</p>
      {isLong && (
        <button type="button" className={s.more} onClick={onToggleExpand} aria-expanded={expanded}>
          {expanded ? 'Show less' : 'Read full post'}
        </button>
      )}

      <div className={s.foot}>
        <div className={s.actions}>
          {!crm && (
            <button type="button" className={`${ui.btn} ${ui.btnPrimary} ${ui.btnSm}`} disabled={actionsLocked} onClick={onAddToCrm} title="Saves the post and adds its author to your CRM pipeline">
              {crmBusy ? <Loader2 size={13} className={ui.spin} /> : <UserPlus size={13} />} Add to CRM
            </button>
          )}
          <button type="button" className={`${ui.btn} ${ui.btnSecondary} ${ui.btnSm}`} disabled={p.alreadySaved || savingPosts} onClick={onSendToReview}>
            {p.alreadySaved ? <CheckCircle2 size={13} /> : <Send size={13} />} {p.alreadySaved ? 'In your leads' : 'Send to Review Queue'}
          </button>
          <button type="button" className={`${ui.btn} ${ui.btnGhost} ${ui.btnSm}`} disabled={commentBusy || actionsLocked} onClick={onDraftComment} title="Drafts a short comment to warm up the author before you reach out">
            {commentBusy ? <Loader2 size={13} className={ui.spin} /> : <MessageSquareQuote size={13} />} {comment ? 'Redraft comment' : 'Draft comment'}
          </button>
        </div>
        <div className={s.tags}>
          {crm && (() => {
            const label = `In CRM · ${STAGE_LABELS[crm.stage]} · ${crm.mine ? 'yours' : crm.ownerName || 'unassigned'}`;
            return crm.dealId
              ? <Link className={`${ui.badge} ${crm.mine ? ui.badgeIndigo : ui.badgeAmber}`} href={`/crm?deal=${crm.dealId}`} title="Open this deal in the CRM"><Kanban size={11} /> {label}</Link>
              : <span className={`${ui.badge} ${ui.badgeAmber}`} title="This deal belongs to a teammate"><Kanban size={11} /> {label}</span>;
          })()}
          <a className={`${ui.btn} ${ui.btnGhost} ${ui.btnSm}`} href={p.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} /> Open on LinkedIn</a>
        </div>
      </div>

      {comment && (
        <div className={s.comment}>
          <div className={s.commentText}>
            <span className={s.commentLabel}>Suggested comment</span>
            {comment}
          </div>
          <button type="button" className={`${ui.btn} ${ui.btnSecondary} ${ui.btnSm}`} onClick={onCopyComment}>
            <Copy size={13} /> Copy &amp; open post
          </button>
        </div>
      )}
    </article>
  );
}
