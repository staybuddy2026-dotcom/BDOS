'use server';

import { AuthService } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { LinkedInIntelligenceData } from './types';
import { getLinkedInCompanyData } from './client';

/**
 * Summarises live LinkedIn company data. Every sentence is derived from the fetched data;
 * when nothing was found the summary says so instead of inventing activity.
 */
export async function analyzeLinkedInOrganicIntelligence(companyNameOrDomain: string): Promise<{
  data: LinkedInIntelligenceData;
  summary: string;
  buyingIntentPill: string;
  recommendedPitch: string;
  suggestedSquadPackages: { name: string; budget: string; reasoning: string }[];
}> {
  await AuthService.verifySession();
  logger.info(`Analyzing LinkedIn Organic Intelligence for '${companyNameOrDomain}'...`);

  const data = await getLinkedInCompanyData(companyNameOrDomain);
  const hasData = data.totalEmployeesOnLinkedin > 0 || data.recentPosts.length > 0;
  const hiringPosts = data.recentPosts.filter((p) => p.postType === 'Hiring Announcement').length;

  const summary = hasData
    ? `${data.companyName} has ${data.totalEmployeesOnLinkedin.toLocaleString()} employees on LinkedIn and ${data.recentPosts.length} recent company post${data.recentPosts.length === 1 ? '' : 's'}${hiringPosts ? `, ${hiringPosts} of them about hiring` : ''}.`
    : 'No LinkedIn data is available for this company yet.';

  return {
    data,
    summary,
    buyingIntentPill: hiringPosts ? 'Hiring activity on LinkedIn' : hasData ? 'Active on LinkedIn' : 'No LinkedIn data',
    // A pitch needs a real reason; the outreach generator builds one from the prospect research instead.
    recommendedPitch: data.buyingSignals[0]?.description ? `Recent post to reference: "${data.buyingSignals[0].description}"` : '',
    suggestedSquadPackages: [],
  };
}
