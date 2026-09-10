export type CopilotQuestionAnswer = {
  question: string;
  answer: string;
  confidencePercent: number;
  reasoningSources: string[];
};

export type ObjectionItem = {
  objection: string;
  aiResponse: string;
  recommendedStrategy: string;
};

export type PlaybookTimelineStep = {
  dayNumber: number;
  channel: 'LINKEDIN' | 'EMAIL' | 'WHATSAPP' | 'CASE_STUDY' | 'DISCOVERY_MEETING';
  actionTitle: string;
  description: string;
};

export type SimilarSuccessStory = {
  companyType: string;
  employeeCount: number;
  techStack: string[];
  deliveredServices: string[];
  similarityPercent: number;
};

export type CopilotConfidenceMeter = {
  icpScorePercent: number;
  overallConfidencePercent: number;
  serviceMatchPercent: number;
  budgetEstimatePercent: number;
  buyingIntentPercent: number;
  decisionMakerPercent: number;
};
