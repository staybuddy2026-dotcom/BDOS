import { PredictedObjection } from './types';
import { logger } from '@/lib/logger';

/**
 * Objection Prediction & Response Engine.
 */
export function generatePlaybookObjections(
  companyName: string = 'ACME Health Technologies'
): PredictedObjection[] {
  logger.info(`Playbook Objection Engine: Predicting objections for '${companyName}'...`);

  return [
    {
      objection: 'We already have an internal development team and prefer in-house hires.',
      recommendedResponse: 'We completely respect internal team autonomy. Tiny Script operates as a seamless squad extension that handles backlog overflow without long-term HR commitment, allowing your core team to focus on core IP.',
      supportingTalkingPoints: [
        '48-hour developer onboarding vs. 60+ days local recruitment cycle.',
        'Flexible monthly scaling up or down based on release milestones.',
        'Zero upfront hiring or severance liability.',
      ],
      suggestedFollowupQuestion: 'If we could accelerate your Q3 AI portal release by 4 weeks without permanent headcount overhead, would you be open to evaluating a short 4-sprint pilot squad?',
      confidenceScorePercent: 96,
    },
    {
      objection: 'We already work with another software development vendor.',
      recommendedResponse: 'Many of our fast-growing clients work with multiple specialized vendors. Tiny Script brings dedicated expertise in React 19, Node.js microservices, and AI LLM RAG pipelines.',
      supportingTalkingPoints: [
        'Specialized AI integration capabilities.',
        'Transparent code ownership & daily Standup visibility.',
        'Proven Healthcare SaaS compliance track record.',
      ],
      suggestedFollowupQuestion: 'Would you be open to assigning us a discrete 4-week AI module to compare delivery velocity against your existing vendor?',
      confidenceScorePercent: 92,
    },
    {
      objection: 'Our engineering budget for Q3 is currently locked.',
      recommendedResponse: 'We understand budget constraints. We can structure a small 2-developer proof-of-concept phase with milestones tied to business deliverables.',
      supportingTalkingPoints: [
        'Pay-as-you-go sprint milestones.',
        'Fixed budget caps with zero unexpected overages.',
      ],
      suggestedFollowupQuestion: 'If we start with a minimal 2-engineer squad for 2 sprints, what budget threshold would require approval?',
      confidenceScorePercent: 89,
    },
  ];
}
