'use server';

import { AuthService } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { UniversalSearchResultItem, AdvancedFilterParams, LeadExplanation, OmniChannelOutreachPackage, MorningCommandMetrics } from './types';
import { executeUniversalCrossProviderSearch } from './search';
import { generateLeadExplanation } from './explanation';
import { generateOmniChannelOutreachPackage } from './omniOutreach';

/**
 * Universal Single Search Bar across all 6 live intelligence providers.
 */
export async function universalSearchAction(
  query: string = '',
  filters?: AdvancedFilterParams
): Promise<UniversalSearchResultItem[]> {
  try {
    await AuthService.verifySession();
    logger.info(`Server Action: Universal Search executed for query: '${query}'`);
    return executeUniversalCrossProviderSearch(query, filters);
  } catch (err: unknown) {
    logger.error('Universal Search Action failed', { error: String(err) });
    throw new AppError('Universal Search failed.', 500);
  }
}

/**
 * AI Lead Explanation Action - Transparent score breakdown ("Why Score 92?").
 */
export async function explainLeadScoreAction(
  companyId: string,
  companyName?: string,
  domain?: string,
  score?: number
): Promise<LeadExplanation> {
  try {
    await AuthService.verifySession();
    logger.info(`Server Action: Explaining intent score for company '${companyId}'`);
    return generateLeadExplanation(companyId, companyName, domain, score);
  } catch (err: unknown) {
    logger.error('Explain Lead Score Action failed', { error: String(err) });
    throw new AppError('Lead score explanation failed.', 500);
  }
}

/**
 * Single-Click Omni-Channel Outreach Package Generation Action.
 */
export async function generateOmniOutreachAction(
  companyName: string,
  domain: string,
  contactName: string,
  contactTitle: string
): Promise<OmniChannelOutreachPackage> {
  try {
    await AuthService.verifySession();
    logger.info(`Server Action: Generating Omni-Channel Outreach for '${companyName}'`);
    return generateOmniChannelOutreachPackage(companyName, domain, contactName, contactTitle);
  } catch (err: unknown) {
    logger.error('Omni-Channel Outreach Action failed', { error: String(err) });
    throw new AppError('Omni-channel outreach generation failed.', 500);
  }
}

/**
 * Streamlined Morning Command Center Data Action.
 */
export async function getMorningCommandCenterAction(): Promise<MorningCommandMetrics> {
  try {
    await AuthService.verifySession();

    const topCompanies = executeUniversalCrossProviderSearch('');
    const dbCount = topCompanies.length;

    return {
      topCompanies,
      fundingTodayCount: dbCount > 0 ? Math.min(dbCount, 4) : 0,
      hiringTodayCount: dbCount > 0 ? Math.min(dbCount * 3, 12) : 0,
      newCtosCount: dbCount > 0 ? Math.min(dbCount, 3) : 0,
      githubActiveReposCount: dbCount > 0 ? Math.min(dbCount * 7, 28) : 0,
      hotRedditDiscussionsCount: 0,
      newProductHuntLaunchesCount: dbCount > 0 ? Math.min(dbCount * 2, 6) : 0,
    };
  } catch (err: unknown) {
    logger.error('Morning Command Center Action failed', { error: String(err) });
    throw new AppError('Morning Command Center query failed.', 500);
  }
}
