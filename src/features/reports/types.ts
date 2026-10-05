import type { LeadSource } from '@prisma/client';

/** Report shapes and the period filter, safe to import from client components. */

export type ReportRange = '30d' | '90d' | '365d' | 'all';
export const REPORT_RANGES: { id: ReportRange; label: string }[] = [
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
  { id: '365d', label: 'Last 12 months' },
  { id: 'all', label: 'All time' },
];

export type FunnelRow = {
  source: LeadSource;
  leads: number;
  /** Deals that reached at least this stage (a lost deal counts for the stages it got to). */
  contacted: number;
  meeting: number;
  proposal: number;
  won: number;
  lost: number;
  wonValue: number;
};

export type ActivityBucket = { start: string; label: string; emails: number; linkedin: number; conversations: number; replies: number };

export type TeamRow = {
  userId: string;
  name: string;
  openDeals: number;
  pipelineValue: number;
  wonDeals: number;
  lostDeals: number;
  wonValue: number;
  emails: number;
  linkedin: number;
  conversations: number;
};

export type Report = {
  range: ReportRange;
  from: string | null;
  /** 'team' for admins and managers, 'mine' for a BDE. */
  scope: 'team' | 'mine';
  kpis: {
    leads: number;
    wonDeals: number;
    wonValue: number;
    /** Won / (won + lost) for deals closed in the period; null when none closed. */
    winRate: number | null;
    /** Average days from lead to won, for deals won in the period. */
    avgDaysToWin: number | null;
    emailsSent: number;
    /** Share of outreach sequences started in the period that got a reply. */
    replyRate: number | null;
    sequencesStarted: number;
  };
  funnel: FunnelRow[];
  activity: { unit: 'week' | 'month'; buckets: ActivityBucket[] };
  team: TeamRow[];
  lostReasons: { reason: string; count: number }[];
};

