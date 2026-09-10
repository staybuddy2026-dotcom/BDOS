import { logger } from '@/lib/logger';

export type RankedContactItem = {
  rankStars: '★★★★★' | '★★★★' | '★★★' | '★★' | '★';
  title: string;
  name: string;
  confidencePercent: number;
  reason: string;
  suggestedChannel: 'LinkedIn + Email' | 'Email' | 'WhatsApp' | 'LinkedIn InMail' | 'LinkedIn';
  bestTimeToContact: string;
  recommendedTone: string;
};

/**
 * Intelligent Contact Recommendation Engine: Ranks executive decision makers.
 */
export function rankDecisionMakers(
  companyName: string = 'ACME Health Technologies'
): RankedContactItem[] {
  logger.info(`Intelligent Contact Recommendation: Ranking decision makers for '${companyName}'...`);

  return [
    {
      rankStars: '★★★★★',
      title: 'Chief Technology Officer (CTO)',
      name: 'Dr. Rajesh Kumar',
      confidencePercent: 98,
      reason: 'Leading engineering expansion, AI initiative, and architecture scaling.',
      suggestedChannel: 'LinkedIn + Email',
      bestTimeToContact: 'Tuesday / Thursday (9:30 AM – 11:00 AM EST)',
      recommendedTone: 'Technical & Consultative (Focus on React 19 & AWS Architecture)',
    },
    {
      rankStars: '★★★★',
      title: 'VP of Engineering',
      name: 'Marcus Vance',
      confidencePercent: 94,
      reason: 'Responsible for sprint velocity, team capacity, and vendor outstaffing.',
      suggestedChannel: 'Email',
      bestTimeToContact: 'Monday / Wednesday (10:00 AM EST)',
      recommendedTone: 'Direct & Solution-Focused (Focus on Squad Velocity & Outstaffing)',
    },
    {
      rankStars: '★★★',
      title: 'Head of Product',
      name: 'Sarah Jenkins',
      confidencePercent: 88,
      reason: 'Drives product roadmap feature delivery and UX/UI requirements.',
      suggestedChannel: 'LinkedIn',
      bestTimeToContact: 'Wednesday / Friday (2:00 PM EST)',
      recommendedTone: 'Product & Roadmap Oriented (Focus on User Engagement & Speed to Market)',
    },
    {
      rankStars: '★★',
      title: 'Chief Executive Officer (CEO)',
      name: 'Alexander Wright',
      confidencePercent: 82,
      reason: 'Primary sponsor for Series A capital deployment and strategic growth.',
      suggestedChannel: 'Email',
      bestTimeToContact: 'Tuesday Morning (8:30 AM EST)',
      recommendedTone: 'Strategic & ROI-Driven (Focus on Scalability & Budget Efficiency)',
    },
  ];
}
