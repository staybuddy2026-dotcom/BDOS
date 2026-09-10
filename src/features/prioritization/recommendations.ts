import { NextBestAction, PriorityTier } from './types';

/**
 * Next Best Action Engine for AI Account Prioritization.
 * Generates tailored sales actions based on Priority Tier and detected signals.
 */
export function generateNextBestActions(
  companyId: string,
  domain: string,
  priorityTier: PriorityTier,
  score: number
): NextBestAction[] {
  const actions: NextBestAction[] = [];

  if (priorityTier === 'IMMEDIATE' || score >= 95) {
    actions.push({
      id: `act_${companyId}_1`,
      actionType: 'LINKEDIN_CONNECT',
      title: 'Send LinkedIn Connection & InMail to CTO',
      description: 'Reference CTO hiring post for React 19 & Node.js microservices squad.',
      recommendedAssignee: 'Senior BDE Lead',
      executionPriority: 'Urgent Today',
      ctaLabel: 'Send LinkedIn InMail',
      targetUrl: `https://linkedin.com/company/${domain.split('.')[0]}`,
    });

    actions.push({
      id: `act_${companyId}_2`,
      actionType: 'GENERATE_PROPOSAL',
      title: 'Generate Fixed-Price 2-Week React 19 Squad Blueprint',
      description: 'Auto-generate AI proposal for patient portal & microservices scaling.',
      recommendedAssignee: 'Solutions Architect',
      executionPriority: 'Urgent Today',
      ctaLabel: 'Generate AI Proposal',
      targetUrl: `/marketplace`,
    });

    actions.push({
      id: `act_${companyId}_3`,
      actionType: 'REVIEW_QUEUE_PUSH',
      title: 'Push Account to BDE High-Priority Review Queue',
      description: 'Escalate account to senior BDE team for immediate phone/email discovery call.',
      recommendedAssignee: 'BDE Executive',
      executionPriority: 'Urgent Today',
      ctaLabel: 'View Review Queue',
      targetUrl: `/review`,
    });
  } else if (priorityTier === 'HIGH' || score >= 85) {
    actions.push({
      id: `act_${companyId}_1`,
      actionType: 'PERSONALIZED_EMAIL',
      title: 'Send AI-Personalized Technical Outreach Email',
      description: 'Focus email on Python FastAPI & AWS EKS microservices modernization.',
      recommendedAssignee: 'BDE Executive',
      executionPriority: 'Within 24 Hours',
      ctaLabel: 'Generate AI Email',
      targetUrl: `/engagement`,
    });

    actions.push({
      id: `act_${companyId}_2`,
      actionType: 'LINKEDIN_CONNECT',
      title: 'Connect with VP of Software Engineering',
      description: 'Engage on recent LinkedIn AI Patient Intake LLM post.',
      recommendedAssignee: 'BDE Executive',
      executionPriority: 'Within 24 Hours',
      ctaLabel: 'View LinkedIn Profile',
      targetUrl: `/company`,
    });
  } else {
    actions.push({
      id: `act_${companyId}_1`,
      actionType: 'MONITOR_ACTIVITY',
      title: 'Add to Automated Re-engagement & Tracking Sequence',
      description: 'Monitor GitHub releases and funding announcements weekly.',
      recommendedAssignee: 'Automation Bot',
      executionPriority: 'This Week',
      ctaLabel: 'Track Re-engagement',
      targetUrl: `/re-engagement`,
    });
  }

  return actions;
}
