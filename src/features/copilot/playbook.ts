import { PlaybookTimelineStep } from './types';
import { Company360Profile } from '../company360/types';
import { logger } from '@/lib/logger';

/**
 * Sales Playbook Sequence Generator: Builds a step-by-step BDE outreach schedule
 * using the real, already-resolved Company 360 profile (Apollo-sourced).
 */
export function generatePlaybookTimeline(profile: Company360Profile): PlaybookTimelineStep[] {
  const companyName = profile.overview.companyName;
  logger.info(`Sales Playbook Engine: Building touchpoint timeline for '${companyName}'...`);

  const contact = profile.decisionMakers?.[0];
  const contactLabel = contact ? `${contact.name} (${contact.jobTitle})` : 'the primary decision maker';
  const fundingNote = profile.overview.fundingStage && profile.overview.fundingStage !== 'Undisclosed'
    ? ` congratulating on their ${profile.overview.fundingStage}`
    : '';
  const techNote = profile.engineering.primaryLanguages?.length
    ? profile.engineering.primaryLanguages.slice(0, 2).join(' & ')
    : 'their current tech stack';
  const topService = profile.recommendedServices?.[0]?.serviceName || 'squad extension capabilities';

  return [
    {
      dayNumber: 1,
      channel: 'LINKEDIN',
      actionTitle: 'LinkedIn Connection Request',
      description: `Send connection invite to ${contactLabel}${fundingNote}.`,
    },
    {
      dayNumber: 2,
      channel: 'EMAIL',
      actionTitle: 'Personalized Cold Email Outreach',
      description: `Send Email #1 highlighting ${techNote} squad extension for ${topService}.`,
    },
    {
      dayNumber: 4,
      channel: 'LINKEDIN',
      actionTitle: 'LinkedIn InMail Touchpoint',
      description: `Follow up on LinkedIn referencing ${companyName}'s hiring activity and sharing a relevant case study.`,
    },
    {
      dayNumber: 7,
      channel: 'CASE_STUDY',
      actionTitle: 'Technical Case Study Sharing',
      description: `Send email sharing a Tiny Script case study aligned with ${topService}.`,
    },
    {
      dayNumber: 10,
      channel: 'DISCOVERY_MEETING',
      actionTitle: 'Discovery Meeting Invitation',
      description: `Invite ${contactLabel} to a 20-minute technical discovery call with a Tiny Script Solutions Architect.`,
    },
    {
      dayNumber: 14,
      channel: 'EMAIL',
      actionTitle: 'Final Value Follow-up',
      description: `Send a concise break-away touchpoint before enrolling ${companyName} in the monthly nurture sequence.`,
    },
  ];
}
