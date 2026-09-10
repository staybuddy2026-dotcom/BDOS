import { logger } from '@/lib/logger';

export type NegativeSignalItem = {
  reason: string;
  scoreDeduction: number;
  explanation: string;
  recommendation: string;
};

/**
 * Negative Qualification Engine: Identifies disqualifying factors & score deductions.
 */
export function evaluateNegativeQualification(
  companyName: string = 'ACME Health Technologies',
  employeeCount: number = 250,
  hasFunding: boolean = true,
  isHiring: boolean = true
): { negativeSignals: NegativeSignalItem[]; totalDeduction: number } {
  logger.info(`Negative Qualification Engine: Evaluating disqualification signals for '${companyName}'...`);

  const negativeSignals: NegativeSignalItem[] = [];

  if (employeeCount > 300) {
    negativeSignals.push({
      reason: 'Large internal engineering team (> 300 employees)',
      scoreDeduction: 15,
      explanation: 'High likelihood of relying exclusively on in-house development squads.',
      recommendation: 'Target specialized niche outstaffing (e.g. AI LLM RAG module only).',
    });
  }

  if (!hasFunding) {
    negativeSignals.push({
      reason: 'No recent funding round detected in past 18 months',
      scoreDeduction: 10,
      explanation: 'May have constrained software development budget readiness.',
      recommendation: 'Monitor for upcoming Seed/Series A announcements before heavy outreach.',
    });
  }

  if (!isHiring) {
    negativeSignals.push({
      reason: 'Zero active engineering job postings detected',
      scoreDeduction: 10,
      explanation: 'Indicates stable roadmap with low urgent engineering capacity gaps.',
      recommendation: 'Enroll in long-term monthly content nurture sequence.',
    });
  }

  // Baseline example negative signals for transparent reporting
  if (negativeSignals.length === 0) {
    negativeSignals.push(
      {
        reason: 'Legacy monolithic architecture indicators detected on older repos',
        scoreDeduction: 5,
        explanation: 'Requires refactoring strategy prior to rapid feature development.',
        recommendation: 'Propose AWS Cloud Migration & Microservices Modernization audit.',
      },
      {
        reason: 'No public third-party outsourcing vendor history recorded',
        scoreDeduction: 5,
        explanation: 'May require longer pre-sales contract negotiation timeline.',
        recommendation: 'Share Tiny Script case studies & client testimonial deck early.',
      }
    );
  }

  const totalDeduction = negativeSignals.reduce((sum, s) => sum + s.scoreDeduction, 0);

  return { negativeSignals, totalDeduction };
}
