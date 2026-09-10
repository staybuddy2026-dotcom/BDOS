'use server';

import { AuthService } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { IcpMatchResult } from './types';
import { calculateIcpMatchScore } from './engine';

/**
 * Server Action: Calculates ICP Account Fit Score and Sales Recommendations for a target company.
 */
export async function calculateIcpMatchAction(
  companyId: string,
  companyName?: string,
  domain?: string,
  buyingIntentScore?: number
): Promise<IcpMatchResult> {
  try {
    await AuthService.verifySession();
    logger.info(`Server Action: Calculating ICP Account Fit for '${companyId}'`);
    return calculateIcpMatchScore(companyId, companyName, domain, buyingIntentScore);
  } catch (err: unknown) {
    logger.error('Calculate ICP Match Action failed', { error: String(err) });
    throw new AppError('ICP calculation failed.', 500);
  }
}

/**
 * Server Action: Retrieves the top ICP matches for the BDE Morning Dashboard.
 */
export async function getTopIcpMatchesAction(): Promise<IcpMatchResult[]> {
  try {
    await AuthService.verifySession();
    logger.info('Server Action: Fetching Top ICP Matches for BDE Morning Dashboard');

    return [];
  } catch (err: unknown) {
    logger.error('Get Top ICP Matches Action failed', { error: String(err) });
    throw new AppError('Failed to fetch top ICP matches.', 500);
  }
}
