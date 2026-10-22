import { BuyingReadinessDetails, NextBestAction } from './types';

/**
 * Next best actions for one account, built only from what is known: a named contact, a LinkedIn page,
 * a deal in the CRM, a matching service. When something is missing, the action is to find it,
 * never a step that assumes it exists.
 */
export function generateNextBestActions(account: Omit<BuyingReadinessDetails, 'nextBestActions'>): NextBestAction[] {
  const { companyId, companyName, domain, priorityTier, primaryContact: contact, inCrm, matchedService } = account;
  const when: NextBestAction['executionPriority'] =
    priorityTier === 'IMMEDIATE' ? 'Urgent Today' : priorityTier === 'HIGH' ? 'Within 24 Hours' : 'This Week';
  const actions: NextBestAction[] = [];
  const add = (a: Omit<NextBestAction, 'id' | 'executionPriority'>) =>
    actions.push({ ...a, id: `act_${companyId}_${actions.length + 1}`, executionPriority: when });

  if (inCrm) {
    add({
      actionType: 'OPEN_DEAL',
      title: `Continue the deal (${inCrm.mine ? 'yours' : inCrm.ownerName || 'a teammate’s'})`,
      description: `${companyName} is already in the CRM. Pick up from its current stage instead of starting again.`,
      ctaLabel: inCrm.dealId ? 'Open deal' : 'Open CRM',
      targetUrl: inCrm.dealId ? `/crm?deal=${inCrm.dealId}` : '/crm',
    });
  }

  if (priorityTier === 'ARCHIVE' || priorityTier === 'MONITOR') {
    add({
      actionType: 'MONITOR_ACTIVITY',
      title: 'Check again later',
      description: 'Too little evidence of a need right now. The profile is refreshed from Apollo every 7 days, so new funding, hiring or contacts will raise the score.',
      ctaLabel: 'View in Company 360',
      targetUrl: `/company?query=${encodeURIComponent(domain)}`,
    });
    return actions;
  }

  if (!contact) {
    add({
      actionType: 'FIND_CONTACT',
      title: 'Find a decision maker',
      description: `No senior contact at ${companyName} has been found yet. Search Apollo for founders, CTOs and engineering leaders there.`,
      ctaLabel: 'Search Apollo',
      targetUrl: `/apollo-search?company=${encodeURIComponent(companyName)}`,
    });
  } else {
    add({
      actionType: 'PERSONALIZED_EMAIL',
      title: `Write to ${contact.name} (${contact.jobTitle})`,
      description: matchedService
        ? `AI-written email about ${matchedService.name}, based on what is known about ${companyName}.`
        : `AI-written email based on what is known about ${companyName}.`,
      ctaLabel: 'Write outreach',
      targetUrl: `/engagement?domain=${encodeURIComponent(domain)}`,
    });
    if (contact.linkedinUrl) {
      add({
        actionType: 'LINKEDIN_CONNECT',
        title: `Connect with ${contact.name} on LinkedIn`,
        description: 'A connection request next to the email makes a reply more likely.',
        ctaLabel: 'Open LinkedIn profile',
        targetUrl: contact.linkedinUrl,
      });
    }
  }

  if (!contact?.linkedinUrl && account.linkedinPageUrl) {
    add({
      actionType: 'LINKEDIN_CONNECT',
      title: `See who works at ${companyName} on LinkedIn`,
      description: 'Their company page lists employees and recent posts to reference.',
      ctaLabel: 'Open company page',
      targetUrl: account.linkedinPageUrl,
    });
  }

  if (!inCrm) {
    add({
      actionType: 'ADD_TO_CRM',
      title: 'Add to your pipeline',
      description: 'Create a deal so follow-ups, emails and notes are tracked.',
      ctaLabel: 'Open in Company 360',
      targetUrl: `/company?query=${encodeURIComponent(domain)}`,
    });
  }

  return actions;
}
