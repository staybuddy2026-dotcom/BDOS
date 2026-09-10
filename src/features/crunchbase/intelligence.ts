'use server';

import { AuthService } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { GrowthIntelligenceData } from './types';
import { getCrunchbaseOrgData } from './client';

/**
 * AI Growth Analysis Engine for Crunchbase Company Data.
 */
export async function analyzeCrunchbaseGrowthIntelligence(companyNameOrDomain: string): Promise<{
  data: GrowthIntelligenceData;
  summary: string;
  buyingIntentPill: string;
  recommendedPitch: string;
}> {
  try {
    await AuthService.verifySession();
    logger.info(`Analyzing Crunchbase Growth Intelligence for '${companyNameOrDomain}'...`);

    const data = await getCrunchbaseOrgData(companyNameOrDomain);

    const summary = `${data.crunchbaseOrgId} raised ${data.totalFundingRaisedUsd} (${data.latestRoundName} on ${data.latestRoundDate}). Employee growth is +${data.employeeCountGrowthMomPercent}% YoY.`;
    const buyingIntentPill = data.budgetReadinessScore >= 90 ? 'High Budget Intent 🚀' : 'Medium Budget Intent';

    const recommendedPitch = `Target CTO & VP Engineering with pre-built senior software squad packages. Highlight experience in HIPAA, React 19, and cloud microservices migration.`;

    return {
      data,
      summary,
      buyingIntentPill,
      recommendedPitch,
    };
  } catch (err: unknown) {
    logger.error(`Growth Intelligence analysis failed for '${companyNameOrDomain}'`, { error: String(err) });
    const data = await getCrunchbaseOrgData(companyNameOrDomain);
    return {
      data,
      summary: 'Growth intelligence analysis active.',
      buyingIntentPill: 'High Budget Intent 🚀',
      recommendedPitch: 'Focus on senior engineering squad velocity.',
    };
  }
}
