'use server';

import { AuthService } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { answerCopilotQuestion } from './assistant';
import { Company360Profile } from '../company360/types';
import { CopilotQuestionAnswer } from './types';

/**
 * Server Action: Process BDE question to AI Sales Copilot.
 * Uses the real, already-resolved Company 360 profile — no fabricated facts.
 */
export async function askSalesCopilotAction(
  profile: Company360Profile,
  question: string
): Promise<CopilotQuestionAnswer> {
  try {
    await AuthService.verifySession();
    logger.info(`Server Action: Sales Copilot Q&A for '${profile.overview.companyName}': "${question}"`);
    return answerCopilotQuestion(profile, question);
  } catch (err: unknown) {
    logger.error('Ask Sales Copilot Action failed', { error: String(err) });
    throw new AppError('Copilot response failed.', 500);
  }
}
