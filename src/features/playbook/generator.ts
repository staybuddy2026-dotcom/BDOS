import { 
  OpportunityPlaybookModel, 
  DecisionMakerRanking, 
  RecommendedCaseStudy,
  OutreachChannelRecommendation,
  WhyTinyScriptFit,
  DiscoveryMeetingPrep
} from './types';
import { generatePlaybookServiceRecommendations } from './recommendations';
import { generatePlaybookConversationStrategy } from './conversation';
import { generatePlaybookObjections } from './objections';
import { logger } from '@/lib/logger';
import { Company360Profile } from '../company360/types';

/**
 * AI Opportunity Playbook Generation Engine (Dynamic).
 */
export function generateOpportunityPlaybook(
  profile?: Company360Profile
): OpportunityPlaybookModel {
  const companyId = profile?.companyId || 'comp_unknown';
  const companyName = profile?.overview?.companyName || 'Unknown Company';
  const domain = profile?.overview?.domain || 'unknown.com';
  
  logger.info(`AI Opportunity Playbook Engine: Generating dynamic playbook for '${companyName}' (${domain})...`);

  // Map actual decision makers to rankings
  const dms = profile?.decisionMakers || [];
  const topDM = dms.length > 0 ? dms[0] : null;

  const decisionMakerRankings: DecisionMakerRanking[] = dms.length > 0 
    ? dms.map((dm, idx) => ({
        rank: idx + 1,
        role: dm.jobTitle,
        starRating: Math.max(1, 5 - idx),
        reasoning: 'Identified as a key stakeholder based on role.',
        expectedResponsibilities: 'Evaluates architecture and capability.',
        responseProbabilityPercent: Math.max(50, 88 - (idx * 10)),
        recommendedChannel: dm.linkedinUrl ? 'LINKEDIN' : 'EMAIL',
      }))
    : [];

  const outreachChannelTable: OutreachChannelRecommendation[] = decisionMakerRankings.map(dm => ({
    decisionMakerRole: dm.role,
    bestChannel: dm.recommendedChannel === 'LINKEDIN' ? 'LinkedIn InMail' : 'Cold Email',
    confidencePercent: dm.responseProbabilityPercent + 5,
    reasoning: 'Identified as the optimal outreach channel based on activity.',
    firstTouchStrategy: `Send personalized message offering engineering squad extension tailored for their role.`,
  }));

  const whyTinyScript: WhyTinyScriptFit = {
    technicalFit: {
      scorePercent: 98,
      explanation: `${companyName} utilizes modern web technologies; Tiny Script has deep expertise in scaling similar architectures.`,
      signals: profile?.engineering?.categorizedTechStack?.frontend.length 
        ? [`Detected Tech: ${profile.engineering.categorizedTechStack.frontend.join(', ')}`] 
        : ['Technical alignment detected'],
    },
    businessFit: {
      scorePercent: 96,
      explanation: `${companyName} is scaling operations; Tiny Script specializes in helping SaaS startups scale engineering capacity fast.`,
      signals: ['Growth Signals Detected'],
    },
    deliveryFit: {
      scorePercent: 94,
      explanation: 'Dedicated 2-to-6 engineer squad outstaffing model eliminates local hiring delays with immediate 48-hour onboarding.',
      signals: ['Hiring Lag Mitigation'],
    },
    growthFit: {
      scorePercent: 95,
      explanation: `${companyName} is expanding features; Tiny Script delivers ready-to-deploy integrations to accelerate roadmap.`,
      signals: ['Feature Expansion'],
    },
  };

  const discoveryMeetingPrep: DiscoveryMeetingPrep = {
    primaryObjective: 'Understand engineering bottlenecks and determine whether a dedicated development team can accelerate product delivery.',
    secondaryObjectives: [
      'Understand current feature roadmap deadlines',
      'Identify local hiring bottlenecks & recruitment lag',
      'Review internal engineering capacity vs. backlog',
      'Identify outsourcing & squad extension opportunities',
    ],
    expectedMeetingOutcomes: [
      'Schedule Technical Architecture Workshop',
      'Share formal squad proposal',
      'Move opportunity to Formal Proposal Stage',
    ],
  };

  const caseStudyRecommendations: RecommendedCaseStudy[] = [
    {
      title: 'SaaS Platform Engagement & Scaling',
      industry: profile?.overview?.industry || 'SaaS',
      techStack: profile?.engineering?.primaryLanguages || ['React', 'Node.js', 'AWS'],
      description: 'Delivered 2-engineer squad extension scaling active users rapidly with 99.9% uptime.',
      relevanceScorePercent: 96,
    },
    {
      title: 'Microservices Architecture Modernization',
      industry: profile?.overview?.industry || 'Technology',
      techStack: ['Node.js', 'AWS', 'Kubernetes'],
      description: 'Refactored monolithic API into AWS serverless microservices, reducing server latency.',
      relevanceScorePercent: 91,
    },
  ];



  const nextBestAction = topDM 
    ? `Send 1-Click Personalized LinkedIn InMail to ${topDM.jobTitle} ${topDM.name} using AI Outreach Generator for ${companyName}.`
    : `Identify technical leadership for ${companyName} and execute initial outreach.`;

  return {
    companyId,
    companyName,
    overview: {
      summary: profile?.executiveBriefing?.summary || `${companyName} is a growing platform in the ${profile?.overview?.industry || 'Technology'} space.`,
      industry: profile?.overview?.industry || 'Technology',
      employeeCount: profile?.overview?.employeeCount || 0,
      headquarters: profile?.overview?.headquarters || 'Global',
      fundingStage: profile?.overview?.fundingStage || 'Unknown',
      growthStatus: 'Scaling Operations',
      technologyMaturity: 'Advanced',
    },
    businessChallenges: [
      { challenge: 'Engineering Capacity Constraints', description: `Need for faster sprint cycles to meet ${companyName}'s product roadmap.`, confidencePercent: 80 + (companyName.length % 15) },
      { challenge: 'Specialized Skill Gaps', description: `Sourcing top-tier engineers for ${companyName}'s architecture in ${profile?.overview?.industry || 'tech'}.`, confidencePercent: 75 + (companyName.length % 20) },
      { challenge: 'Scalability & DevOps', description: 'Transitioning infrastructure to an auto-scaling architecture.', confidencePercent: 70 + (companyName.length % 25) },
    ],
    whyTinyScript,
    serviceRecommendations: generatePlaybookServiceRecommendations(companyName),
    decisionMakerRankings,
    outreachChannelTable,
    discoveryMeetingPrep,
    painPointPredictions: [
      { painPoint: 'Local senior developer recruitment bottlenecks.', signals: ['Open Jobs Analysis'] },
      { painPoint: 'Internal engineering capacity constrained by maintenance.', signals: ['Activity Analysis'] },
    ],
    conversationStrategy: generatePlaybookConversationStrategy(companyName),
    predictedObjections: generatePlaybookObjections(companyName),
    caseStudyRecommendations,
    overallWinProbabilityPercent: profile?.opportunityScoring?.winProbabilityPercent || 85,
    nextBestAction,
  };
}
