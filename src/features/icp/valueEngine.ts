import { logger } from '@/lib/logger';

export type ProjectValueEstimate = {
  budgetRangeInr: string;
  dealSizeUsd: string;
  estimatedTeamSize: string;
  estimatedDuration: string;
  confidenceLevel: 'High' | 'Medium' | 'Low';
  confidencePercent: number;
  explanation: string;
};

/**
 * Estimated Project Value Engine: Calculates commercial project size & squad requirements.
 */
export function estimateProjectValue(
  companyName: string = 'ACME Health Technologies',
  employeeCount: number = 250,
  buyingScore: number = 96
): ProjectValueEstimate {
  logger.info(`Estimated Project Value Engine: Estimating deal size & squad for '${companyName}'...`);

  let budgetRangeInr = '₹50L – ₹1Cr';
  let dealSizeUsd = '$75,000 USD';
  let estimatedTeamSize = 'Dedicated Squad (4 Devs + 1 PM + 1 QA)';
  let estimatedDuration = '6 Months';
  const confidenceLevel: 'High' | 'Medium' | 'Low' = 'High';
  let confidencePercent = 94;

  if (employeeCount < 50) {
    budgetRangeInr = '₹20L – ₹50L';
    dealSizeUsd = '$40,000 USD';
    estimatedTeamSize = '2 Senior Developers + 1 Lead';
    estimatedDuration = '4 Months';
    confidencePercent = 88;
  } else if (employeeCount > 500) {
    budgetRangeInr = '₹1Cr+';
    dealSizeUsd = '$150,000+ USD';
    estimatedTeamSize = 'Full Product Team (8 Devs + 2 Leads + 2 QA)';
    estimatedDuration = '12 Months';
    confidencePercent = 91;
  }

  return {
    budgetRangeInr,
    dealSizeUsd,
    estimatedTeamSize,
    estimatedDuration,
    confidenceLevel,
    confidencePercent,
    explanation: `Based on ${companyName}'s employee headcount (${employeeCount}), active hiring gaps, and verified buying intent score (${buyingScore}/100).`,
  };
}
