import { NextBestAction, PriorityTier } from './types';
import { Company360Profile } from '../company360/types';

/**
 * Next Best Action Engine for AI Account Prioritization.
 * Generates tailored sales actions based on Priority Tier and detected signals.
 */

export function generateNextBestActions(
  profile: Company360Profile,
  priorityTier: PriorityTier,
  score: number
): NextBestAction[] {
  const actions: NextBestAction[] = [];
  const companyId = profile.companyId;
  const domain = profile.domain;
  
  // Extract real tech stack
  const actualTechStack = profile.engineering?.primaryLanguages || [];
  const tech = actualTechStack.length > 0 ? actualTechStack.slice(0, 2).join(' & ') : 'Engineering';
  
  // Determine Use Case based on tech
  let useCase = 'team scale-up';
  if (tech.toLowerCase().includes('react') || tech.toLowerCase().includes('next')) useCase = 'frontend modernization';
  else if (tech.toLowerCase().includes('node') || tech.toLowerCase().includes('python')) useCase = 'backend microservices';
  
  // Extract real contacts
  const decisionMakers = profile.decisionMakers || [];
  const topContact = decisionMakers.length > 0 ? decisionMakers[0].jobTitle : 'CTO';

  if (priorityTier === 'IMMEDIATE' || score >= 95) {
    actions.push({
      id: `act_${companyId}_1`,
      actionType: 'LINKEDIN_CONNECT',
      title: `Send LinkedIn Connection & InMail to ${topContact}`,
      description: `Reference tech expansion for ${tech} ${useCase}.`,
      recommendedAssignee: 'Senior BDE Lead',
      executionPriority: 'Urgent Today',
      ctaLabel: 'Send LinkedIn InMail',
      targetUrl: `https://linkedin.com/company/${domain.split('.')[0]}`,
    });

    actions.push({
      id: `act_${companyId}_2`,
      actionType: 'GENERATE_PROPOSAL',
      title: `Generate Fixed-Price 2-Week ${actualTechStack[0] || 'Tech'} Blueprint`,
      description: `Auto-generate AI proposal for ${useCase}.`,
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
      description: `Focus email on ${tech} modernization and rapid scaling.`,
      recommendedAssignee: 'BDE Executive',
      executionPriority: 'Within 24 Hours',
      ctaLabel: 'Generate AI Email',
      targetUrl: `/engagement`,
    });

    actions.push({
      id: `act_${companyId}_2`,
      actionType: 'LINKEDIN_CONNECT',
      title: `Connect with ${topContact}`,
      description: `Engage on recent LinkedIn ${tech} related post.`,
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
      description: 'Monitor GitHub releases, job postings, and funding announcements weekly.',
      recommendedAssignee: 'Automation Bot',
      executionPriority: 'This Week',
      ctaLabel: 'Track Re-engagement',
      targetUrl: `/re-engagement`,
    });
  }

  return actions;
}
