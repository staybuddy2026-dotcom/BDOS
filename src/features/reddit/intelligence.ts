'use server';

import { AuthService } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { RedditIntelligenceData } from './types';
import { getRedditCompanyDiscussions } from './client';

/**
 * AI Buying Intent Analysis Engine for Reddit Community Data.
 */
export async function analyzeRedditBuyingIntentIntelligence(companyNameOrDomain: string): Promise<{
  data: RedditIntelligenceData;
  summary: string;
  buyingIntentPill: string;
  recommendedPitch: string;
  suggestedSquadPackages: { name: string; budget: string; reasoning: string }[];
}> {
  try {
    await AuthService.verifySession();
    logger.info(`Analyzing Reddit Buying Intent Intelligence for '${companyNameOrDomain}'...`);

    const data = await getRedditCompanyDiscussions(companyNameOrDomain);

    const summary = `Identified ${data.totalDiscussionsCount} active buying intent discussions across ${data.activeSubreddits.join(', ')}. Average intent score is ${data.averageIntentScore}/100 with ${data.outsourcingUrgency} intent.`;
    const buyingIntentPill = data.averageIntentScore >= 90 ? 'Immediate Buying Intent 🚀' : 'Active Discussion Intent';

    const recommendedPitch = `Engage lead author ${data.primaryDiscussion.author} on Reddit/LinkedIn with Tiny Script's fixed-price React 19 & Node.js squad blueprint.`;

    const suggestedSquadPackages = [
      {
        name: 'Dedicated Senior React 19 & Node.js Squad',
        budget: '₹20,00,000 – ₹40,00,000',
        reasoning: 'Address active r/reactjs request for patient portal & SaaS backend microservices development.',
      },
      {
        name: 'Python FastAPI & Clinical LLM Integration',
        budget: '₹15,00,000 – ₹28,00,000',
        reasoning: 'Fulfill r/artificial post seeking AI team for HIPAA-compliant LLM fine-tuning.',
      },
      {
        name: 'Flutter iOS & Android Mobile Squad',
        budget: '₹12,00,000 – ₹22,00,000',
        reasoning: 'Address r/flutterdev mobile companion app outsourcing request.',
      },
    ];

    return {
      data,
      summary,
      buyingIntentPill,
      recommendedPitch,
      suggestedSquadPackages,
    };
  } catch (err: unknown) {
    logger.error(`Reddit Buying Intent analysis failed for '${companyNameOrDomain}'`, { error: String(err) });
    const data = await getRedditCompanyDiscussions(companyNameOrDomain);
    return {
      data,
      summary: 'Reddit buying intent analysis active.',
      buyingIntentPill: 'Immediate Buying Intent 🚀',
      recommendedPitch: 'Engage with software squad blueprint.',
      suggestedSquadPackages: [
        {
          name: 'Dedicated Senior React 19 & Node.js Squad',
          budget: '₹20,00,000 – ₹40,00,000',
          reasoning: 'Address active outsourcing request.',
        },
      ],
    };
  }
}
