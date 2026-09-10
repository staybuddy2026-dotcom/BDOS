'use server';

import { AuthService } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { generateOpportunityPlaybook } from './generator';
import { OpportunityPlaybookModel } from './types';

/**
 * Server Action: Fetches AI Opportunity Playbook for target company.
 */
export async function getOpportunityPlaybookAction(
  _companyId: string,
  _companyName: string,
  _domain: string
): Promise<OpportunityPlaybookModel> {
  try {
    await AuthService.verifySession();
    logger.info(`Server Action: Fetching Opportunity Playbook...`);
    return generateOpportunityPlaybook();
  } catch (err: unknown) {
    logger.error('Get Opportunity Playbook Action failed', { error: String(err) });
    throw new AppError('Opportunity Playbook fetch failed.', 500);
  }
}
