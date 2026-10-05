'use client';

import type { DealStage } from '@/features/crm/types';
import c from './crm.module.css';

export type Notify = (type: 'success' | 'error', message: string) => void;

export const STAGE_COLORS: Record<DealStage, string> = {
  LEAD: '#64748b',
  CONTACTED: '#0ea5e9',
  MEETING_SCHEDULED: '#6366f1',
  PROPOSAL_SENT: '#8b5cf6',
  NEGOTIATION: '#d97706',
  WON: '#059669',
  LOST: '#dc2626',
};

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const DATE_TIME_FORMAT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const formatDate = (iso?: string | null) => (iso ? DATE_FORMAT.format(new Date(iso)) : '');
export const formatDateTime = (iso?: string | null) => (iso ? DATE_TIME_FORMAT.format(new Date(iso)) : '');
/** Value for <input type="date">. */
export const toDateInput = (iso?: string | null) => (iso ? iso.slice(0, 10) : '');

export function timeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days}d ago` : formatDate(iso);
}

/** Dates depend on the viewer's clock and time zone, so the server-rendered text may differ slightly. */
export function Time({ iso, mode = 'date', className }: { iso?: string | null; mode?: 'date' | 'datetime' | 'ago'; className?: string }) {
  if (!iso) return null;
  return (
    <time dateTime={iso} className={className} title={formatDateTime(iso)} suppressHydrationWarning>
      {mode === 'ago' ? timeAgo(iso) : mode === 'datetime' ? formatDateTime(iso) : formatDate(iso)}
    </time>
  );
}

export function OwnerChip({ owner, large = false }: { owner: { name: string } | null; large?: boolean }) {
  return (
    <span className={c.owner}>
      <span className={`${c.avatar} ${large ? c.avatarLg : ''} ${owner ? '' : c.avatarEmpty}`} aria-hidden>
        {owner ? owner.name.charAt(0).toUpperCase() : '?'}
      </span>
      <span className={c.ownerName}>{owner ? owner.name : 'Unassigned'}</span>
    </span>
  );
}
