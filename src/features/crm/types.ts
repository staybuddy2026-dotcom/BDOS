import type { CrmActivityType, DealStage, FollowUpStatus, LeadSource, ProposalStage, TaskPriority, UserRole } from '@prisma/client';

export type { CrmActivityType, DealStage, LeadSource };

/** Pipeline stages in board order. `probability` is the default win chance a deal gets on entering the stage. */
export const DEAL_STAGES: { id: DealStage; label: string; probability: number }[] = [
  { id: 'LEAD', label: 'Lead', probability: 10 },
  { id: 'CONTACTED', label: 'Contacted', probability: 25 },
  { id: 'MEETING_SCHEDULED', label: 'Meeting Scheduled', probability: 45 },
  { id: 'PROPOSAL_SENT', label: 'Proposal Sent', probability: 65 },
  { id: 'NEGOTIATION', label: 'Negotiation', probability: 80 },
  { id: 'WON', label: 'Won', probability: 100 },
  { id: 'LOST', label: 'Lost', probability: 0 },
];

export const STAGE_LABELS = Object.fromEntries(DEAL_STAGES.map((s) => [s.id, s.label])) as Record<DealStage, string>;
export const STAGE_PROBABILITY = Object.fromEntries(DEAL_STAGES.map((s) => [s.id, s.probability])) as Record<DealStage, number>;
export const isClosedStage = (stage: DealStage) => stage === 'WON' || stage === 'LOST';

export const SOURCE_LABELS: Record<LeadSource, string> = {
  MANUAL: 'Manual',
  APOLLO: 'Apollo',
  LINKEDIN_POST: 'LinkedIn post',
  LINKEDIN_PEOPLE: 'LinkedIn people',
  MARKETPLACE: 'Marketplace',
  DISCOVERY: 'Universal Search',
  COMPANY360: 'Company 360',
};

export const LOST_REASONS = ['No budget', 'Chose a competitor', 'No response', 'Bad timing', 'Not a fit', 'Built in-house', 'Other'];

/** An open deal with no activity for this many days is flagged as stale. */
export const STALE_AFTER_DAYS = 7;

export type CrmUser = { id: string; name: string; role: UserRole };

export type CrmContact = {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  /** LinkedIn post this lead was discovered from (kept separate from the profile link). */
  sourcePostUrl: string | null;
  /** True when Apollo knows this person, so their email can be looked up (uses 1 Apollo credit). */
  apolloLinked: boolean;
  /** How far the LinkedIn conversation has got, from the touches logged on this deal. */
  linkedinStatus: LinkedInStatus;
};

export type DealSummary = {
  id: string;
  title: string;
  stage: DealStage;
  /** Whole USD; null until someone estimates the deal. */
  value: number | null;
  probability: number;
  source: LeadSource;
  company: { id: string; name: string; domain: string | null; industry: string | null; location: string | null };
  primaryContact: { id: string; name: string; title: string | null; email: string | null } | null;
  owner: { id: string; name: string } | null;
  nextAction: string | null;
  nextActionDate: string | null;
  lastActivityAt: string;
  stageChangedAt: string;
  createdAt: string;
  openTasks: number;
  /** Open deal whose next action date has passed. */
  isOverdue: boolean;
  /** Open deal with no activity for STALE_AFTER_DAYS. */
  isStale: boolean;
};

export type CrmActivityItem = {
  id: string;
  type: CrmActivityType;
  title: string;
  details: string | null;
  createdAt: string;
  userName: string | null;
};

export type CrmTaskItem = {
  id: string;
  title: string;
  priority: TaskPriority;
  dueDate: string;
  completed: boolean;
  assigneeName: string | null;
};

export type CrmMeetingItem = {
  id: string;
  title: string;
  startTime: string;
  attendees: string[];
  notes: string | null;
  meetingUrl: string | null;
};

export type CrmProposalItem = {
  id: string;
  title: string;
  amount: number | null;
  stage: ProposalStage;
  validUntil: string | null;
  createdAt: string;
};

export type DealSequenceStep = {
  id: string;
  stage: number | null;
  subject: string;
  dueDate: string;
  status: FollowUpStatus;
  sentAt: string | null;
  /** Why the email could not be sent (from the mail server). */
  error: string | null;
};

/** An outreach sequence running against this deal. */
export type DealSequence = {
  draftId: string;
  channel: string | null;
  /** Email stages are sent by the app at their due time; otherwise each stage is a reminder. */
  autoSend: boolean;
  toEmail: string | null;
  ownerName: string | null;
  /** Set when the remaining stages were cancelled (reply received, meeting booked, deal closed). */
  stoppedReason: string | null;
  steps: DealSequenceStep[];
};

export type DealDetail = DealSummary & {
  company: DealSummary['company'] & {
    linkedinUrl: string | null;
    employeeCount: number | null;
    revenue: string | null;
    technologies: string[];
    tags: string[];
  };
  contacts: CrmContact[];
  activities: CrmActivityItem[];
  tasks: CrmTaskItem[];
  meetings: CrmMeetingItem[];
  proposals: CrmProposalItem[];
  sequences: DealSequence[];
  lostReason: string | null;
  expectedCloseDate: string | null;
  /** Whether the signed-in user may edit this deal (owner, admin or manager). */
  canEdit: boolean;
  /** LinkedIn connection requests the signed-in user has logged today, across all deals. */
  linkedinConnectionsToday: number;
};

export type CrmKpis = {
  openDeals: number;
  pipelineValue: number;
  /** Open pipeline weighted by each deal's win probability. */
  weightedValue: number;
  wonDeals: number;
  wonValue: number;
  lostDeals: number;
  /** Won / (won + lost), null until a deal has been closed. */
  winRate: number | null;
  overdueActions: number;
  staleDeals: number;
  unassigned: number;
};

export type CrmBoard = {
  deals: DealSummary[];
  kpis: CrmKpis;
  team: CrmUser[];
  me: CrmUser;
  /** Admins and managers see every deal; a BDE sees their own plus the unassigned pool. */
  canSeeAll: boolean;
};

export type CrmFilters = {
  search?: string;
  /** A user id, 'unassigned', or empty for everything the user may see. */
  owner?: string;
  source?: LeadSource | '';
};

export type CrmAiBriefing = {
  summary: string;
  recommendedNextAction: string;
  discoveryQuestions: string[];
  risks: string[];
  suggestedServices: string[];
};

export type LinkedInTouch = 'CONNECTION_SENT' | 'CONNECTION_ACCEPTED' | 'MESSAGE_SENT' | 'REPLY_RECEIVED' | 'POST_ENGAGED';

/** Timeline titles for LinkedIn touches. The contact's LinkedIn status is read back from these. */
export const LINKEDIN_TOUCH_TITLES: Record<LinkedInTouch, string> = {
  CONNECTION_SENT: 'LinkedIn connection request sent',
  CONNECTION_ACCEPTED: 'LinkedIn connection accepted',
  MESSAGE_SENT: 'LinkedIn message sent',
  REPLY_RECEIVED: 'LinkedIn reply received',
  POST_ENGAGED: 'Engaged with their LinkedIn post',
};

export type LinkedInStatus = 'NOT_CONNECTED' | 'REQUEST_SENT' | 'CONNECTED' | 'MESSAGED' | 'REPLIED';

export const LINKEDIN_STATUS_LABELS: Record<LinkedInStatus, string> = {
  NOT_CONNECTED: 'Not connected',
  REQUEST_SENT: 'Request sent',
  CONNECTED: 'Connected',
  MESSAGED: 'Messaged',
  REPLIED: 'Replied',
};

/** Staying under ~20 connection requests a day keeps a LinkedIn account clear of restrictions. */
export const LINKEDIN_DAILY_CONNECTION_LIMIT = 20;

/** A prospect that already exists in the CRM, shown on search results so nobody works the same lead twice. */
export type CrmMatch = {
  /** Null when the deal belongs to someone else and the viewer may not open it. */
  dealId: string | null;
  companyName: string;
  stage: DealStage;
  ownerName: string | null;
  mine: boolean;
};

export type CrmLookupInput = {
  people?: { key: string; apolloPersonId?: string; linkedinUrl?: string; email?: string }[];
  companies?: { key: string; domain?: string; name?: string }[];
};

export type CrmLookupResult = { people: Record<string, CrmMatch>; companies: Record<string, CrmMatch> };

export const formatUsd = (value: number | null | undefined) => (value == null ? 'Not estimated' : `$${value.toLocaleString('en-US')}`);
