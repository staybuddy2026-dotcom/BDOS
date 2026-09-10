export type ServiceMatchItem = {
  serviceName: string;
  matchScore: number;
  confidenceLevel: 'High' | 'Medium' | 'Low';
  justification: string;
  relevanceReason: string;
};

export type DecisionMakerRanking = {
  rank: number;
  role: string;
  starRating: number;
  reasoning: string;
  expectedResponsibilities: string;
  responseProbabilityPercent: number;
  recommendedChannel: 'LINKEDIN' | 'EMAIL' | 'WHATSAPP';
};

export type OutreachChannelRecommendation = {
  decisionMakerRole: string;
  bestChannel: 'LinkedIn InMail' | 'Cold Email' | 'LinkedIn + Email' | 'Warm Introduction';
  confidencePercent: number;
  reasoning: string;
  firstTouchStrategy: string;
};

export type FitCategoryItem = {
  scorePercent: number;
  explanation: string;
  signals: string[];
};

export type WhyTinyScriptFit = {
  technicalFit: FitCategoryItem;
  businessFit: FitCategoryItem;
  deliveryFit: FitCategoryItem;
  growthFit: FitCategoryItem;
};

export type DiscoveryMeetingPrep = {
  primaryObjective: string;
  secondaryObjectives: string[];
  expectedMeetingOutcomes: string[];
};

export type PredictedObjection = {
  objection: string;
  recommendedResponse: string;
  supportingTalkingPoints: string[];
  suggestedFollowupQuestion: string;
  confidenceScorePercent: number;
};

export type RecommendedCaseStudy = {
  title: string;
  industry: string;
  techStack: string[];
  description: string;
  relevanceScorePercent: number;
};

export type OpportunityPlaybookModel = {
  companyId: string;
  companyName: string;
  overview: {
    summary: string;
    industry: string;
    employeeCount: number;
    headquarters: string;
    fundingStage: string;
    growthStatus: string;
    technologyMaturity: string;
  };
  businessChallenges: { challenge: string; description: string; confidencePercent: number }[];
  whyTinyScript: WhyTinyScriptFit;
  serviceRecommendations: ServiceMatchItem[];
  decisionMakerRankings: DecisionMakerRanking[];
  outreachChannelTable: OutreachChannelRecommendation[];
  discoveryMeetingPrep: DiscoveryMeetingPrep;
  painPointPredictions: { painPoint: string; signals: string[] }[];
  conversationStrategy: {
    openingConversation: string;
    discoveryQuestions: string[];
    technicalQuestions: string[];
    businessQuestions: string[];
    expansionOpportunities: string[];
    crossSellOptions: string[];
    upsellOptions: string[];
  };
  predictedObjections: PredictedObjection[];
  caseStudyRecommendations: RecommendedCaseStudy[];
  overallWinProbabilityPercent: number;
  nextBestAction: string;
};
