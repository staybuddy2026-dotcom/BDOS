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
  const confidencePercent = scoring.confidenceScorePercent;
  const reasoningSources = ['Company 360 Profile', 'Apollo Executive Lookup'];

  if (q.includes('who') || q.includes('executive') || q.includes('decision maker') || q.includes('contact first')) {
    answer = primaryContact
      ? `Contact ${primaryContact.name}, ${primaryContact.jobTitle} (${primaryContact.seniority}). Email status: ${primaryContact.emailStatus}. Source: ${primaryContact.source}.`
      : `No verified decision maker is on file for ${companyName} yet. Run an Apollo People search on this domain to surface one.`;
  } else if (q.includes('service') || q.includes('pitch') || q.includes('offer')) {
    answer = topService
      ? `Lead with "${topService.serviceName}": ${topService.reasoning}${topService.estimatedEngagementUsd ? ` (${topService.estimatedEngagementUsd})` : ''}`
      : `No service in your catalog matches a known part of ${companyName}'s stack yet. Ask what they build with on the first call.`;
  } else if (q.includes('problem') || q.includes('pain') || q.includes('facing')) {
    const jobs = profile.linkedin?.activeJobOpeningsCount || 0;
    answer = jobs
      ? `${companyName} has ${jobs} open job${jobs === 1 ? '' : 's'} (Apollo), which often means more work than the team can take on. Ask how hiring is going and what is waiting on it.`
      : `No hiring or delivery-pressure signal is known for ${companyName}. Ask about their priorities on a discovery call.`;
  } else if (q.includes('avoid') || q.includes('don\'t') || q.includes('not say')) {
    answer = `Avoid positioning Tiny Script as an entry-level freelancer or cheap agency${funding ? ` — ${companyName} has ${funding} and needs enterprise-grade squad velocity and compliance.` : `; lead with technical depth and delivery track record instead of price.`}`;
  } else if (q.includes('should i') || q.includes('contact today')) {
    answer = `${companyName} has a fit score of ${scoring.overallScore}/100 (${scoring.salesPriority.toLowerCase()} priority)${funding ? ` and has raised ${funding}` : ''}, based on ${scoring.scoringFactors.length} signal${scoring.scoringFactors.length === 1 ? '' : 's'}: ${scoring.scoringFactors.map((f) => f.factorName.toLowerCase()).join(', ') || 'none yet'}.`;
  } else {
    answer = `${companyName} is a ${scoring.salesPriority.toLowerCase()}-priority target (fit score ${scoring.overallScore}). ${primaryContact ? `Approach ${primaryContact.name} (${primaryContact.jobTitle})` : 'Find a decision maker with an Apollo People search'} and open with what you know about them.`;
  }

  return {
    question,
    answer,
    confidencePercent,
    reasoningSources,
  };
}
