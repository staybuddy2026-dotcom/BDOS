import { logger } from '@/lib/logger';
import { RankedContactItem, rankDecisionMakers } from './contactRecommendation';

export type AISalesPlaybook = {
  companyName: string;
  domain: string;
  recommendedContact: RankedContactItem;
  businessSituation: string[];
  primaryPainPoints: string[];
  suggestedOpeningLine: string;
  discoveryQuestions: string[];
  meetingObjective: string;
  estimatedProjectSizeInr: string;
  estimatedProjectSizeUsd: string;
  recommendedDeliveryModel: string;
  closingProbabilityPercent: number;
  closingProbabilityLabel: 'High Probability' | 'Moderate Probability' | 'Low Probability';
  nextBestAction: string;
};

/**
 * AI Sales Playbook Generator: Builds complete pre-sales strategy document for BDEs.
 */
export function generateSalesPlaybook(
  companyName: string = 'ACME Health Technologies',
  domain: string = 'acmehealth.com'
): AISalesPlaybook {
  logger.info(`AI Sales Playbook Generator: Crafting sales playbook for '${companyName}' (${domain})...`);

  const contacts = rankDecisionMakers(companyName);
  const primaryContact = contacts[0];

  return {
    companyName,
    domain,
    recommendedContact: primaryContact,
    businessSituation: [
      'Recently raised $12.5M Series A funding led by Sequoia Capital.',
      'Actively recruiting 4 Senior React 19 & Node.js Engineers.',
      'Launching AI-assisted patient diagnosis module in Q3.',
      'Migrating AWS infrastructure to Kubernetes & microservices.',
    ],
    primaryPainPoints: [
      'Engineers taking 60+ days to hire locally in US market.',
      'Need immediate React 19 frontend squad capacity.',
      'Slow velocity on AI LLM feature roadmap implementation.',
      'Legacy monolith causing microservice scaling bottlenecks.',
    ],
    suggestedOpeningLine: `Hi ${primaryContact.name.split(' ')[0]}, saw ${companyName}'s recent Series A announcement and your team's expansion in React 19 & AI patient features—impressed by your roadmap at ${domain}.`,
    discoveryQuestions: [
      '1. How are you currently managing the timeline for your Q3 AI patient feature rollout with current squad bandwidth?',
      '2. What is your biggest challenge in recruiting Senior React 19 & Node.js engineers locally?',
      '3. Are you open to integrating a dedicated senior engineering squad (React 19 + AWS) to accelerate sprint velocity?',
      '4. What cloud infrastructure bottlenecks are you experiencing as user concurrency scales?',
      '5. What key metrics will determine success for your outsourcing partners this quarter?',
    ],
    meetingObjective: 'Schedule a 20-minute Technical Architecture Discovery Call with Dr. Rajesh Kumar to present Tiny Script squad allocation case studies.',
    estimatedProjectSizeInr: '₹25,00,000 – ₹80,00,000',
    estimatedProjectSizeUsd: '$35,000 – $95,000',
    recommendedDeliveryModel: 'Dedicated Development Squad (2 React + 2 Node + 1 QA)',
    closingProbabilityPercent: 82,
    closingProbabilityLabel: 'High Probability',
    nextBestAction: 'Send personalized cold email using 1-Click Omni-Outreach Package & send LinkedIn connection invite to Dr. Rajesh Kumar.',
  };
}
