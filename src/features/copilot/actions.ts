'use server';

import { AuthService } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { answerCopilotQuestion } from './assistant';
import { getObjectionHandlingGuides } from './objections';
import { generatePlaybookTimeline } from './playbook';
import { 
  CopilotQuestionAnswer, 
  ObjectionItem, 
  PlaybookTimelineStep, 
  SimilarSuccessStory, 
  CopilotConfidenceMeter 
} from './types';

/**
 * Server Action: Process BDE question to AI Sales Copilot.
 */
export async function askSalesCopilotAction(
  companyName: string,
  question: string
): Promise<CopilotQuestionAnswer> {
  try {
    await AuthService.verifySession();
    logger.info(`Server Action: Sales Copilot Q&A for '${companyName}': "${question}"`);
    return answerCopilotQuestion(companyName, question);
  } catch (err: unknown) {
    logger.error('Ask Sales Copilot Action failed', { error: String(err) });
    throw new AppError('Copilot response failed.', 500);
  }
}

/**
 * Server Action: Fetches complete AI Copilot intelligence suite for Company 360 page.
 */
export async function getCopilotIntelligenceAction(companyName: string): Promise<{
  objections: ObjectionItem[];
  playbook: PlaybookTimelineStep[];
  similarStories: SimilarSuccessStory[];
  confidenceMeter: CopilotConfidenceMeter;
}> {
  try {
    await AuthService.verifySession();
    logger.info(`Server Action: Fetching Copilot intelligence suite for '${companyName}'`);

    const objections = getObjectionHandlingGuides(companyName);
    const playbook = generatePlaybookTimeline(companyName);

    const similarStories: SimilarSuccessStory[] = [
      {
        companyType: 'Healthcare SaaS Startup',
        employeeCount: 120,
        techStack: ['React 19', 'Next.js', 'Node.js', 'PostgreSQL', 'AWS'],
        deliveredServices: ['React Patient Portal', 'AI Chat Assistant', 'AWS Cloud Migration'],
        similarityPercent: 94,
      },
      {
        companyType: 'Series A FinTech Platform',
        employeeCount: 180,
        techStack: ['React Native', 'Node.js', 'GraphQL', 'AWS'],
        deliveredServices: ['Mobile Payment App', 'Microservices Architecture'],
        similarityPercent: 89,
      },
    ];

    const confidenceMeter: CopilotConfidenceMeter = {
      icpScorePercent: 96,
      overallConfidencePercent: 94,
      serviceMatchPercent: 98,
      budgetEstimatePercent: 91,
      buyingIntentPercent: 95,
      decisionMakerPercent: 97,
    };

    return {
      objections,
      playbook,
      similarStories,
      confidenceMeter,
    };
  } catch (err: unknown) {
    logger.error('Get Copilot Intelligence Action failed', { error: String(err) });
    throw new AppError('Copilot intelligence fetch failed.', 500);
  }
}
