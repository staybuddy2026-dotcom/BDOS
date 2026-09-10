import { ObjectionItem } from './types';
import { logger } from '@/lib/logger';

/**
 * Objection Handling Engine: Generates BDE objection responses & tactics.
 */
export function getObjectionHandlingGuides(
  companyName: string = 'ACME Health Technologies'
): ObjectionItem[] {
  logger.info(`Objection Handling Engine: Pre-building objection responses for '${companyName}'...`);

  return [
    {
      objection: 'We already have an in-house engineering team.',
      aiResponse: 'Many of our clients also have internal engineering teams. We usually help them accelerate delivery by extending their existing squads rather than replacing them, eliminating local hiring bottlenecks.',
      recommendedStrategy: 'Position Tiny Script as a flexible squad extension that handles backlog velocity without long-term HR overhead.',
    },
    {
      objection: 'We already work with another vendor / development agency.',
      aiResponse: 'We frequently work alongside existing vendors by handling specialized AI Development, AWS Cloud Modernization, or React 19 microservice modules.',
      recommendedStrategy: 'Propose a specialized niche project (e.g. AI LLM RAG integration) where current vendors lack deep expertise.',
    },
    {
      objection: 'Our engineering budget is currently constrained.',
      aiResponse: 'We can begin with a smaller engagement (e.g. 2-developer squad allocation for 4 sprints) and expand once measurable business ROI has been demonstrated.',
      recommendedStrategy: 'Offer a low-friction 4-week MVP pilot or architecture consultation.',
    },
    {
      objection: 'We are not ready to outsource software development right now.',
      aiResponse: 'Understood. We can provide an initial architecture consultation and share relevant Healthcare SaaS case studies so your CTO is prepared when scaling demand arises.',
      recommendedStrategy: 'Add CTO to monthly technical newsletter & schedule quarterly check-in.',
    },
  ];
}
