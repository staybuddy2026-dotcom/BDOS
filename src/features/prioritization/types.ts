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

export type BuyingReadinessDetails = {
  companyId: string;
  domain: string;
  companyName: string;
  /** Company 360 fit score: the sum of the evidence-based factors in keySignals. */
  buyingReadinessScore: number;
  /** The tier shown: the team's manual choice when there is one, else the score's tier. */
  priorityTier: PriorityTier;
  /** The tier the score alone gives. */
  scoredTier: PriorityTier;
  tierOverride?: TierOverride;
  /** Share of the eight facts in dataChecklist that are known. */
  dataCoveragePercent: number;
  /** What is known about the company and what is still missing (with how to get it). */
  dataChecklist: { label: string; known: boolean; hint?: string }[];
  primaryContact?: { name: string; jobTitle: string; linkedinUrl?: string; email?: string };
  linkedinPageUrl?: string;
  /** Best match from the team's service catalog, with the catalog's starting price. */
  /** 'tech' when their tech stack matches the service; 'focus' when what they do fits it (a likely match). */
  matchedService?: { name: string; reason: string; fromInr: string; fromUsd: string; model: string; matchedBy: 'tech' | 'focus' };
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
