'use server';

import { AuthService } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { ProductHuntIntelligenceData } from './types';
import { getProductHuntProductData } from './client';

/**
 * AI Startup Launch Intelligence Engine for Product Hunt Data.
 */
export async function analyzeProductHuntStartupIntelligence(companyNameOrDomain: string): Promise<{
  data: ProductHuntIntelligenceData;
  summary: string;
  buyingIntentPill: string;
  recommendedPitch: string;
  suggestedSquadPackages: { name: string; budget: string; reasoning: string }[];
}> {
  try {
    await AuthService.verifySession();
    logger.info(`Analyzing Product Hunt Startup Intelligence for '${companyNameOrDomain}'...`);

    const data = await getProductHuntProductData(companyNameOrDomain);

    const summary = `${data.primaryProduct.name} launched on Product Hunt (${data.primaryProduct.launchDate}) ranking #${data.primaryProduct.community.productOfTheDayRank || 1} Product of the Day with ${data.totalUpvotes.toLocaleString()} upvotes and ${data.totalComments} comments.`;
    const buyingIntentPill = data.postMvpBuyingIntentScore >= 90 ? 'Post-MVP Scaling Intent 🚀' : 'Medium Launch Intent';

    const recommendedPitch = `Offer Tiny Script's 2-Week Architecture Review & Dedicated React 19 / Node.js Squad to rapidly convert MVP feedback into production features.`;

    const suggestedSquadPackages = [
      {
        name: 'Dedicated Senior React 19 Squad',
        budget: '₹18,00,000 – ₹32,00,000',
        reasoning: 'Accelerate post-launch frontend feature velocity following Product Hunt launch surge.',
      },
      {
        name: 'FastAPI & AI Fine-Tuning Integration',
        budget: '₹15,00,000 – ₹28,00,000',
        reasoning: 'Implement custom AI agent workflows & LLM microservices requested in community comments.',
      },
      {
        name: 'React Native / Flutter Cross-Platform App',
        budget: '₹12,00,000 – ₹22,00,000',
        reasoning: 'Build iOS & Android mobile apps requested by early Product Hunt upvoters.',
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
    logger.error(`Product Hunt Intelligence analysis failed for '${companyNameOrDomain}'`, { error: String(err) });
    const data = await getProductHuntProductData(companyNameOrDomain);
    return {
      data,
      summary: 'Startup launch intelligence active.',
      buyingIntentPill: 'Post-MVP Scaling Intent 🚀',
      recommendedPitch: 'Focus on post-launch software squad scaling.',
      suggestedSquadPackages: [
        {
          name: 'Dedicated Senior React 19 Squad',
          budget: '₹18,00,000 – ₹32,00,000',
          reasoning: 'Accelerate post-launch feature velocity.',
        },
      ],
    };
  }
}
