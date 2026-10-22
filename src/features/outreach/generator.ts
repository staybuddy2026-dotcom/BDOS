import { Company360Profile } from '../company360/types';
import { OutreachChannel, OutreachCategory, ToneSetting, OutreachMessageDraft } from './types';
import { logger } from '@/lib/logger';

/**
 * AI Outreach Generation Engine.
 * Fuses multi-provider Company 360 intelligence into hyper-personalized sales outreach with dynamic tone copywriting.
 */
export function generateOutreachMessage(
  profile: Company360Profile,
  channel: OutreachChannel = 'EMAIL',
  category: OutreachCategory = 'COLD_OUTREACH',
  tone: ToneSetting = 'EXECUTIVE'
): OutreachMessageDraft {
  logger.info(`AI Outreach Engine: Generating personalized ${channel} outreach for '${profile.overview.companyName}' with tone '${tone}'...`);

  // No invented contact details: when nobody was found, the greeting stays generic and email/LinkedIn empty.
  const known = profile.decisionMakers.find((d) => d.name && !/decision maker|engineering lead|^executive$/i.test(d.name));
  const contact: { name: string; jobTitle: string; email?: string; emailStatus?: 'Verified' | 'Unverified' | 'Extrapolated'; linkedinUrl?: string } =
    known || { name: '', jobTitle: '' };
  const firstName = known ? known.name.split(' ')[0] : 'there';
  const company = profile.overview.companyName;

  // Only facts from the company profile. Unknown facts are left out, never filled with a default stack,
  // a "growth" claim or a client result: a template is a starting point the BDE edits, not a promise.
  const stack = profile.engineering?.primaryLanguages?.slice(0, 3) || [];
  const tech = stack.length ? stack.join(', ') : '';
  const techLine = tech ? ` I can see your team works with ${tech}.` : '';
  const sign = 'Best regards,\nTiny Script Soft Tech';

  let subject = `${company} and your engineering plans`;
  let body = `Hi ${firstName},\n\nI'm reaching out about ${company}'s engineering plans.${techLine}\n\nWe provide dedicated senior developers who join your team and work in your sprints.\n\nWould a short call to see if that is useful for you make sense?\n\n${sign}`;

  if (tone === 'EXECUTIVE') {
    subject = `${company}: engineering capacity`;
    body = `Hi ${firstName},\n\nA short note about ${company}'s engineering capacity.${techLine}\n\nWe provide senior developers who join your team directly, so new work does not wait on hiring.\n\nWould a 15-minute call to compare notes on your roadmap be useful?\n\n${sign}`;
  } else if (tone === 'TECHNICAL') {
    subject = tech ? `${tech} work at ${company}` : `Engineering work at ${company}`;
    body = `Hi ${firstName},\n\n${tech ? `I looked at ${company}'s stack (${tech}).` : `I'm reaching out about ${company}'s engineering work.`}\n\nOur developers work on web and mobile products, cloud infrastructure and AI features, and join your existing codebase and review process.\n\nIs there a part of your backlog where extra senior hands would help?\n\n${sign}`;
  } else if (tone === 'FRIENDLY') {
    subject = `A question about ${company}'s roadmap`;
    body = `Hi ${firstName},\n\nI came across ${company}${profile.overview.industry ? ` in the ${profile.overview.industry} space` : ''} and wanted to say hello.${techLine}\n\nWe help product teams build and scale web and mobile apps. I'd be glad to hear what your team is working on this year.\n\nOpen to a short chat?\n\n${sign}`;
  } else if (tone === 'CONSULTATIVE') {
    subject = `Your release pipeline at ${company}`;
    body = `Hi ${firstName},\n\nWhen a team is short on senior engineers, releases tend to slip.${techLine}\n\nWe can review where work is getting stuck and add experienced developers where it helps most.\n\nWould you be open to a short call to talk through your current priorities?\n\n${sign}`;
  } else if (tone === 'PAS_FRAMEWORK') {
    subject = `Engineering capacity at ${company}`;
    body = `Hi ${firstName},\n\nHiring senior engineers${tech ? ` for ${tech}` : ''} takes time, and roadmap work waits in the meantime.\n\nThat delay puts pressure on the team you already have.\n\nWe add vetted senior developers to your team, working in your process, so the roadmap keeps moving while you hire.\n\nCould we talk about your capacity for next quarter?\n\n${sign}`;
  } else if (tone === 'ROI_FOCUSED') {
    subject = `Engineering cost and speed at ${company}`;
    body = `Hi ${firstName},\n\nIf cost per feature and release speed matter to ${company} this year, it may be worth comparing a dedicated team with hiring.${techLine}\n\nI can walk you through how our engagements are priced and staffed, so you can compare it with your own numbers.\n\nWould a short call help?\n\n${sign}`;
  } else if (tone === 'CHALLENGER') {
    subject = `Another way to staff engineering at ${company}`;
    body = `Hi ${firstName},\n\nMany teams only consider two options: hire in-house or use freelancers.${techLine}\n\nA third option is a dedicated team that works in your process and scales with your roadmap.\n\nWould you be open to comparing the options for ${company}?\n\n${sign}`;
  }

  // Only a funding round that is actually on record.
  if (profile.growth?.latestRoundName) {
    body += `\n\nP.S. Congratulations on the ${profile.growth.latestRoundName} round${profile.growth.latestRoundAmountUsd ? ` (${profile.growth.latestRoundAmountUsd})` : ''}.`;
  }

  return {
    id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    companyId: profile.companyId,
    domain: profile.domain,
    companyName: profile.overview.companyName,
    targetContactName: contact.name,
    targetContactTitle: contact.jobTitle,
    targetContactEmail: contact.email,
    targetContactEmailStatus: contact.emailStatus,
    targetContactLinkedin: contact.linkedinUrl,
    channel,
    category,
    tone,
    subjectLine: subject,
    bodyContent: body,
    // Not measured; kept at 0 so nothing shows an invented quality score.
    personalizationScore: 0,
    technicalRelevanceScore: 0,
    readabilityScore: 0,
    spamRiskIndicator: 'LOW',
    status: 'DRAFT',
    followupStage: 'STAGE_1_INITIAL',
    scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
