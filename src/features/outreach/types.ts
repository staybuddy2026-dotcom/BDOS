export type OutreachChannel = 'EMAIL' | 'LINKEDIN' | 'PROPOSAL_COVER' | 'MEETING_INVITE';

export type OutreachCategory = 
  | 'COLD_OUTREACH' 
  | 'WARM_INTRO' 
  | 'TECHNICAL_CONSULTATION' 
  | 'DISCOVERY_CALL' 
  | 'PROPOSAL_SUBMISSION' 
  | 'FOLLOW_UP';

export type ToneSetting = 'EXECUTIVE' | 'TECHNICAL' | 'FRIENDLY' | 'CONSULTATIVE' | 'PAS_FRAMEWORK' | 'ROI_FOCUSED' | 'CHALLENGER';

export type FollowupStage = 
  | 'STAGE_1_INITIAL' 
  | 'STAGE_2_FOLLOWUP' 
  | 'STAGE_3_VALUE_ADD' 
  | 'STAGE_4_BREAKUP';

export type OutreachMessageDraft = {
  id: string;
  companyId: string;
  domain: string;
  companyName: string;
  targetContactName: string;
  targetContactTitle: string;
  targetContactEmail?: string;
  targetContactLinkedin?: string;
  channel: OutreachChannel;
  category: OutreachCategory;
  tone: ToneSetting;
  subjectLine: string;
  bodyContent: string;
  personalizationScore: number; // 0-100
  technicalRelevanceScore: number; // 0-100
  readabilityScore: number; // 0-100
  spamRiskIndicator: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'DRAFT' | 'APPROVED' | 'SCHEDULED' | 'SENT';
  followupStage: FollowupStage;
  scheduledDate?: string;
  createdAt: string;
  updatedAt: string;
};

export type EngagementTelemetry = {
  draftsGeneratedToday: number;
  emailsAwaitingApproval: number;
  linkedinMessagesReady: number;
  followupsScheduled: number;
  responseRatePercent: number;
  meetingsBookedCount: number;
  proposalRequestsCount: number;
  pipelineInfluencedInr: string;
  estimatedRevenueInr: string;
};
