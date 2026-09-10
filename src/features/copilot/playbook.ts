import { PlaybookTimelineStep } from './types';
import { logger } from '@/lib/logger';

/**
 * Sales Playbook Sequence Generator: Builds step-by-step BDE outreach schedule.
 */
export function generatePlaybookTimeline(
  companyName: string = 'ACME Health Technologies'
): PlaybookTimelineStep[] {
  logger.info(`Sales Playbook Engine: Building touchpoint timeline for '${companyName}'...`);

  return [
    {
      dayNumber: 1,
      channel: 'LINKEDIN',
      actionTitle: 'LinkedIn Connection Request',
      description: 'Send connection invite to CTO Dr. Rajesh Kumar congratulating on recent $12.5M Series A funding.',
    },
    {
      dayNumber: 2,
      channel: 'EMAIL',
      actionTitle: 'Personalized Cold Email Outreach',
      description: 'Send Email #1 highlighting React 19 & Node.js squad extension capabilities for Q3 patient features.',
    },
    {
      dayNumber: 4,
      channel: 'LINKEDIN',
      actionTitle: 'LinkedIn InMail Touchpoint',
      description: 'Follow up on LinkedIn mentioning local hiring gaps and sharing Healthcare SaaS case study video.',
    },
    {
      dayNumber: 7,
      channel: 'CASE_STUDY',
      actionTitle: 'Technical Case Study Sharing',
      description: 'Send email sharing Tiny Script AWS Cloud & AI LLM integration architecture whitepaper.',
    },
    {
      dayNumber: 10,
      channel: 'DISCOVERY_MEETING',
      actionTitle: 'Discovery Meeting Invitation',
      description: 'Invite CTO to 20-minute Technical Discovery Call with Tiny Script Solutions Architect.',
    },
    {
      dayNumber: 14,
      channel: 'EMAIL',
      actionTitle: 'Final Value Follow-up',
      description: 'Send concise break-away touchpoint before enrolling lead in monthly content nurture workflow.',
    },
  ];
}
