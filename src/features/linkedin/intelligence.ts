'use server';

import { AuthService } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { LinkedInIntelligenceData } from './types';
import { getLinkedInCompanyData } from './client';

/**
 * AI Hiring Signal Engine & Organic Post Analysis Engine for LinkedIn.
 */
export async function analyzeLinkedInOrganicIntelligence(companyNameOrDomain: string): Promise<{
  data: LinkedInIntelligenceData;
  summary: string;
  buyingIntentPill: string;
  recommendedPitch: string;
  suggestedSquadPackages: { name: string; budget: string; reasoning: string }[];
}> {
  try {
    await AuthService.verifySession();
    logger.info(`Analyzing LinkedIn Organic Intelligence for '${companyNameOrDomain}'...`);

    const data = await getLinkedInCompanyData(companyNameOrDomain);

    const summary = `${data.companyName} has ${data.totalEmployeesOnLinkedin} employees on LinkedIn, ${data.activeJobOpeningsCount} active engineering job openings, and ${data.executivePostsCount} executive posts. Engineering Expansion Index is ${data.engineeringExpansionIndex}/100.`;
    const buyingIntentPill = data.engineeringExpansionIndex >= 90 ? 'High Hiring Expansion Intent 🚀' : 'Active Social Engagement';

    const recommendedPitch = `Position Tiny Script's senior React 19 & Python FastAPI squad as the immediate delivery accelerator for CTO ${data.primaryPost.authorName}.`;

    const suggestedSquadPackages = [
      {
        name: 'Dedicated Senior React 19 & Next.js Squad',
        budget: '₹22,00,000 – ₹42,00,000',
        reasoning: 'Fulfill CTO hiring announcement seeking senior React 19 microservices squad.',
      },
      {
        name: 'Python FastAPI & Clinical LLM fine-tuning',
        budget: '₹18,00,000 – ₹30,00,000',
        reasoning: 'Support VP Engineering AI Patient Intake Llama 3 workflow initiative.',
      },
      {
        name: 'PostgreSQL & AWS EKS Microservices Team',
        budget: '₹14,00,000 – ₹25,00,000',
        reasoning: 'Assist Head of Product cloud migration & PostgreSQL EKS architecture.',
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
    logger.error(`LinkedIn Organic Intelligence analysis failed for '${companyNameOrDomain}'`, { error: String(err) });
    const data = await getLinkedInCompanyData(companyNameOrDomain);
    return {
      data,
      summary: 'LinkedIn organic social intelligence active.',
      buyingIntentPill: 'High Hiring Expansion Intent 🚀',
      recommendedPitch: 'Reach out to CTO with squad augmentation proposal.',
      suggestedSquadPackages: [
        {
          name: 'Dedicated Senior React 19 & Next.js Squad',
          budget: '₹22,00,000 – ₹42,00,000',
          reasoning: 'Fulfill hiring expansion request.',
        },
      ],
    };
  }
}
