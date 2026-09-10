import { logger } from '@/lib/logger';

export type ConversationStrategyGuide = {
  openingConversation: string;
  discoveryQuestions: string[];
  technicalQuestions: string[];
  businessQuestions: string[];
  expansionOpportunities: string[];
  crossSellOptions: string[];
  upsellOptions: string[];
};

/**
 * Discovery Question & Conversation Strategy Generator.
 */
export function generatePlaybookConversationStrategy(
  companyName: string = 'ACME Health Technologies'
): ConversationStrategyGuide {
  logger.info(`Playbook Conversation Engine: Generating strategy for '${companyName}'...`);

  return {
    openingConversation: `Congratulate on ${companyName}'s Series A milestone. Mention noticing their active engineering hiring push and offer dedicated squad velocity to meet Q3 roadmap goals.`,
    discoveryQuestions: [
      'What are your primary product feature milestones for Q3/Q4?',
      'How are local recruitment timelines currently impacting your release schedule?',
      'What is your target timeline for launching the next AI patient feature iteration?',
    ],
    technicalQuestions: [
      'How is your engineering team handling microservice communication between React frontend and Node backend?',
      'Are you experiencing scaling bottlenecks with your current AWS infrastructure under peak load?',
      'What AI models or LLM APIs are you currently evaluating for patient data processing?',
    ],
    businessQuestions: [
      'What is the estimated revenue impact if your AI portal release is delayed by 60 days?',
      'How do you currently evaluate external development squad partners vs. internal hires?',
    ],
    expansionOpportunities: [
      'Transition from 2-engineer squad extension to dedicated 6-person product delivery unit.',
      'Quarterly architectural review & performance optimization agreement.',
    ],
    crossSellOptions: [
      'QA Automation Pipeline Setup',
      'AWS Cloud DevOps Infrastructure Audit',
      'Flutter Mobile Application Development',
    ],
    upsellOptions: [
      'AI & LLM Custom RAG Fine-Tuning Module',
      '24/7 Enterprise SaaS Managed SLA Support',
    ],
  };
}
