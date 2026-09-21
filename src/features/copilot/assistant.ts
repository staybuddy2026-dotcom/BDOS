import { CopilotQuestionAnswer } from './types';
import { Company360Profile } from '../company360/types';
import { logger } from '@/lib/logger';

/**
 * AI Sales Copilot Reasoning Engine: Answers BDE questions using the real,
 * already-resolved Company 360 profile (Apollo-sourced) instead of fabricating
 * facts about the company.
 */
export function answerCopilotQuestion(
  profile: Company360Profile,
  question: string
): CopilotQuestionAnswer {
  const companyName = profile.overview.companyName;
  logger.info(`AI Sales Copilot Assistant: Processing BDE question for '${companyName}': "${question}"`);

  const q = question.toLowerCase();
  const primaryContact = profile.decisionMakers?.[0];
  const topService = profile.recommendedServices?.[0];
  const scoring = profile.opportunityScoring;
  const funding = profile.overview.fundingStage && profile.overview.fundingStage !== 'Undisclosed'
    ? `${profile.overview.fundingStage}${profile.overview.fundingTotal && profile.overview.fundingTotal !== 'Undisclosed' ? ` (${profile.overview.fundingTotal} raised)` : ''}`
    : null;

  let answer = '';
  let confidencePercent = scoring.confidenceScorePercent;
  const reasoningSources = ['Company 360 Profile', 'Apollo Executive Lookup'];

  if (q.includes('contact') || q.includes('should i')) {
    answer = `${companyName} has an ICP opportunity score of ${scoring.overallScore}/100 (${scoring.salesPriority} priority)${funding ? `, and has raised ${funding}` : ''}. ${scoring.winProbabilityPercent}% estimated win probability based on current signals — worth reaching out.`;
  } else if (q.includes('service') || q.includes('pitch')) {
    answer = topService
      ? `Recommend "${topService.serviceName}" (${topService.fitScore}% fit score) — ${topService.reasoning}`
      : `No specific service recommendation is on file yet for ${companyName}. Run a fresh Company 360 scan to generate one from their tech stack and hiring signals.`;
  } else if (q.includes('who') || q.includes('executive') || q.includes('first')) {
    answer = primaryContact
      ? `Contact ${primaryContact.name}, ${primaryContact.jobTitle} (${primaryContact.seniority}). Email status: ${primaryContact.emailStatus}. Source: ${primaryContact.source}.`
      : `No verified decision maker is on file for ${companyName} yet. Run an Apollo People search on this domain to surface one.`;
  } else if (q.includes('problem') || q.includes('pain')) {
    answer = profile.engineering.hiringSignalScore > 60
      ? `${companyName} shows a hiring signal score of ${profile.engineering.hiringSignalScore}/100 — ${profile.engineering.recentActivitySummary || 'active engineering hiring is likely creating delivery bottlenecks.'}`
      : `No strong hiring or delivery-pressure signal is currently detected for ${companyName}. Consider a discovery call to surface their actual priorities.`;
  } else if (q.includes('avoid') || q.includes('don\'t')) {
    answer = `Avoid positioning Tiny Script as an entry-level freelancer or cheap agency${funding ? ` — ${companyName} has ${funding} and needs enterprise-grade squad velocity and compliance.` : `; lead with technical depth and delivery track record instead of price.`}`;
  } else {
    answer = `${companyName} is a ${scoring.salesPriority.toLowerCase()}-priority target with an estimated deal size of ${scoring.estimatedDealSizeUsd}. ${primaryContact ? `Approach ${primaryContact.name} (${primaryContact.jobTitle})` : 'Identify a decision maker via Apollo People search'} with a technical consultative angle.`;
  }

  return {
    question,
    answer,
    confidencePercent,
    reasoningSources,
  };
}
