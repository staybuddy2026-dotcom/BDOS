import { DataSourceOrigin } from '../company360/types';
import type { CrmMatch } from '../crm/types';

export type PriorityTier = 'IMMEDIATE' | 'HIGH' | 'MEDIUM' | 'MONITOR' | 'ARCHIVE';

/** Score bands per tier (see scoring.ts); shown in the UI so labels and logic never disagree. */
export const TIER_BANDS: Record<PriorityTier, { min: number; label: string; when: string }> = {
  IMMEDIATE: { min: 80, label: 'Immediate', when: 'Contact today' },
  HIGH: { min: 65, label: 'High', when: 'Within 24 hours' },
  MEDIUM: { min: 45, label: 'Medium', when: 'Add to a sequence' },
  MONITOR: { min: 25, label: 'Monitor', when: 'Watch for signals' },
  ARCHIVE: { min: 0, label: 'Archive', when: 'Not a fit now' },
};

export type NextBestActionType =
  | 'OPEN_DEAL'
  | 'LINKEDIN_CONNECT'
  | 'PERSONALIZED_EMAIL'
  | 'FIND_CONTACT'
  | 'ADD_TO_CRM'
  | 'MONITOR_ACTIVITY';

export type NextBestAction = {
  id: string;
  actionType: NextBestActionType;
  title: string;
  /** Why this action, in terms of what is actually known about the account. */
  description: string;
  executionPriority: 'Urgent Today' | 'Within 24 Hours' | 'This Week';
  ctaLabel: string;
  targetUrl?: string;
};

export type AccountBuyingSignal = {
  id: string;
  provider: DataSourceOrigin | 'Marketplace';
  title: string;
  description: string;
  impactScore: number;
  /** When the data behind the signal was fetched. */
  detectedDate: string;
};

export type TierOverride = { tier: PriorityTier; setBy: string; setAt: string };

export type DataSource = 'Apollo' | 'LinkedIn' | 'Apollo + LinkedIn';

/** A LinkedIn post by someone at the company, with the AI's buying-intent reading of it. */
export type LinkedInPostEvidence = {
  url: string;
  author: string;
  authorTitle?: string;
  postedAt?: string;
  /** AI buying-intent score of the post (0-100); unset when the post was not scored yet. */
  intentScore?: number;
  signals: string[];
  summary?: string;
  outreachAngle?: string;
  /** Post text, used to match what they ask for with the service catalog. */
  text: string;
};

/** A person at the company found on LinkedIn (post author, CRM contact with a LinkedIn profile, or added from LinkedIn). */
export type LinkedInPersonEvidence = { name: string; jobTitle?: string; linkedinUrl?: string; email?: string; via: string };

/** Everything the app holds from LinkedIn about one company. */
export type LinkedInAccountEvidence = {
  posts: LinkedInPostEvidence[];
  people: LinkedInPersonEvidence[];
  /** A deal for the company came in from LinkedIn (post or people search). */
  fromLinkedInDeal: boolean;
};

/** How the combined fit score is built: Apollo company fit (70 points) + LinkedIn evidence (30 points). */
export type ScoreBreakdown = {
  apollo: { fitScore: number; points: number; max: number };
  linkedin: { points: number; max: number; found: boolean };
};

export type BuyingReadinessDetails = {
  companyId: string;
  domain: string;
  companyName: string;
  /** Combined fit score: Apollo company fit scaled to 70 points + LinkedIn evidence up to 30 points. */
  buyingReadinessScore: number;
  scoreBreakdown: ScoreBreakdown;
  /** The tier shown: the team's manual choice when there is one, else the score's tier. */
  priorityTier: PriorityTier;
  /** The tier the score alone gives. */
  scoredTier: PriorityTier;
  tierOverride?: TierOverride;
  /** Share of the eight facts in dataChecklist that are known. */
  dataCoveragePercent: number;
  /** What is known about the company and what is still missing (with how to get it). */
  dataChecklist: { label: string; known: boolean; hint?: string; source?: 'Apollo' | 'LinkedIn' }[];
  /** linkedinSearchUrl: a LinkedIn people search for the person when their profile URL is not known. */
  primaryContact?: { name: string; jobTitle: string; linkedinUrl?: string; linkedinSearchUrl?: string; email?: string; source: DataSource; via?: string };
  /** Senior people Apollo found at the company, most relevant first, with their LinkedIn profile or a search for it. */
  apolloPeople: { name: string; jobTitle: string; linkedinUrl?: string; linkedinSearchUrl: string; email?: string }[];
  /** What LinkedIn shows about the company (posts, people); unset when nothing was found. */
  linkedinEvidence?: { posts: LinkedInPostEvidence[]; people: LinkedInPersonEvidence[]; fromLinkedInDeal: boolean };
  linkedinPageUrl?: string;
  /**
   * Best match from the team's service catalog, with the catalog's starting price.
   * 'linkedin': they asked for it in a LinkedIn post (strongest); 'tech': their tech stack (Apollo) matches;
   * 'focus': what they do fits it (a likely match).
   */
  matchedService?: { name: string; reason: string; fromInr: string; fromUsd: string; model: string; matchedBy: 'linkedin' | 'tech' | 'focus'; source: DataSource };
  /** Other catalog services that fit, best first. */
  otherServices: { name: string; matchedBy: 'linkedin' | 'tech' | 'focus' }[];
  inCrm?: CrmMatch;
  nextBestActions: NextBestAction[];
  keySignals: AccountBuyingSignal[];
  recommendedPitch: string;
  /** Date the company data was fetched (profiles are reused for up to 7 days). */
  lastEvaluatedDate: string;
  /** When tech stack & funding were looked up (1 Apollo credit); unset when they were never checked. */
  techFundingCheckedAt?: string;
};

export type PrioritizationSummary = {
  totalAccounts: number;
  contactToday: number;
  highPriority: number;
  withContact: number;
  inCrm: number;
  /** Accounts with LinkedIn evidence (posts or people). */
  withLinkedIn: number;
  /** Sum of catalog starting prices of the matched services (not a forecast). */
  matchedServiceValueInr: string;
  matchedServiceValueUsd: string;
  matchedServiceAccounts: number;
};

export type PrioritiesResult = {
  accounts: BuyingReadinessDetails[];
  summary: PrioritizationSummary;
  /** Known companies not scored yet on this visit (each new profile uses Apollo quota, so a few are built per visit). */
  pendingCount: number;
  /** Where the companies come from, for the empty state. */
  sourceCount: number;
  /** Companies Apollo has no record of: listed, not ranked (a 0 score would be misleading). */
  notFoundDomains: string[];
};
