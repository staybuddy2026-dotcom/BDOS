import type { Company360Profile } from '../company360/types';
import type { OpportunityPlaybookModel, PlaybookContact, PlaybookFitArea, PlaybookObjection } from './types';

const isSet = (v?: string | null) => !!v && v !== 'Undisclosed' && v !== 'Unknown';

/** Buyers first: founders and CEOs, then technology leaders, then other senior roles; recruiters last. */
const titleRank = (t = '') =>
  /talent|recruit|people|\bhr\b|human resources/i.test(t) ? 9
    : /founder|\bceo\b|chief executive|owner/i.test(t) ? 0
      : /\bcto\b|chief technology|chief product|\bcpo\b/i.test(t) ? 1
        : /chief|president|\bcoo\b|\bcio\b/i.test(t) ? 2
          : /\bvp\b|vice president/i.test(t) ? 3
            : /head of/i.test(t) ? 4
              : /director/i.test(t) ? 5 : 6;

/**
 * Builds the sales playbook for a company from its Company 360 profile. Only facts in the profile are
 * used; generic sales guidance (questions, objections) is worded so it never states things about the
 * company that are not known.
 */
export function generateOpportunityPlaybook(profile: Company360Profile): OpportunityPlaybookModel {
  const o = profile.overview;
  const companyName = o.companyName || 'this company';
  const stack = profile.engineering.primaryLanguages || [];
  const jobs = profile.linkedin?.activeJobOpeningsCount || 0;
  const funded = isSet(o.fundingStage);
  const scoring = profile.opportunityScoring;

  const contacts: PlaybookContact[] = [...(profile.decisionMakers || [])]
    .filter((d) => d.name)
    .sort((a, b) => titleRank(a.jobTitle) - titleRank(b.jobTitle))
    .slice(0, 5)
    .map((d) => ({
      name: d.name,
      title: d.jobTitle,
      channel: d.email && d.emailStatus === 'Verified' ? 'Email' : 'LinkedIn',
      email: d.email,
      linkedinUrl: d.linkedinUrl,
    }));

  const fitAreas: PlaybookFitArea[] = [
    {
      area: 'Technical fit',
      found: stack.length ? [`Uses ${stack.slice(0, 8).join(', ')}`] : [],
      note: stack.length ? 'Lead with the services below that match this stack.' : 'Their stack is not known yet. Ask what they build with on the first call.',
    },
    {
      area: 'Company fit',
      found: [
        o.industry ? `Industry: ${o.industry}` : '',
        o.employeeCount ? `About ${o.employeeCount.toLocaleString('en-US')} employees` : '',
        o.headquarters ? `Based in ${o.headquarters}` : '',
      ].filter(Boolean),
      note: o.employeeCount ? 'Check this size matches the teams you usually work with.' : 'Company size is not known yet.',
    },
    {
      area: 'Growth',
      found: [
        funded ? `Funding: ${o.fundingStage}${isSet(o.fundingTotal) ? ` (${o.fundingTotal} raised)` : ''}` : '',
        jobs ? `${jobs} open job${jobs === 1 ? '' : 's'}` : '',
      ].filter(Boolean),
      note: funded || jobs ? 'Growth usually means delivery pressure: ask how they plan to meet it.' : 'No funding or hiring signal found. Ask about their roadmap for the next two quarters.',
    },
    {
      area: 'Reachability',
      found: contacts.length ? [`${contacts.length} senior contact${contacts.length === 1 ? '' : 's'} found`] : [],
      note: contacts.length ? `Start with ${contacts[0].name} (${contacts[0].title}).` : 'No decision maker found yet. Search this domain in Apollo.',
    },
  ];

  const services = (profile.recommendedServices || []).map((s) => ({
    name: s.serviceName,
    reason: s.reasoning,
    startingPrice: s.estimatedEngagementUsd || s.estimatedEngagementInr || '',
    matchedTech: s.detectedTechTrigger || [],
  }));

  // Open with the strongest thing actually known about them.
  const openingLine = funded
    ? `Saw that ${companyName} has raised ${o.fundingStage}${isSet(o.fundingTotal) ? ` (${o.fundingTotal})` : ''}. Teams at that stage often need to ship faster than they can hire, so I wanted to ask how you are planning for it.`
    : jobs
      ? `Noticed ${companyName} has ${jobs} open role${jobs === 1 ? '' : 's'}. While those are being filled, we help teams keep delivery on track.`
      : stack.length
        ? `We work a lot with ${stack.slice(0, 2).join(' and ')}, which I understand ${companyName} uses. Happy to share how we have helped similar teams.`
        : `I would like to learn what ${companyName} is building this year and whether an extra engineering team could help.`;

  const discoveryQuestions = [
    'What are the main things you need to ship in the next two quarters?',
    jobs ? `You have ${jobs} open role${jobs === 1 ? '' : 's'}: how long does hiring usually take, and what happens to the roadmap meanwhile?` : 'How is your engineering team staffed today, and where is it stretched?',
    stack.length ? `What is hardest about your ${stack[0]} work right now?` : 'What do you build with, and what would you change about it?',
    'Have you worked with an outside development team before? What worked and what did not?',
    'Who else is involved in choosing a development partner, and how is budget approved?',
  ];

  // General guidance for common objections; it makes no claims about this company.
  const objections: PlaybookObjection[] = [
    {
      objection: 'We have an in-house team.',
      response: 'We work alongside in-house teams: taking a defined piece of the backlog so the core team can stay on what matters most.',
      followUp: 'Is there a part of the roadmap the team will not get to this quarter?',
    },
    {
      objection: 'We already have a vendor.',
      response: 'Many teams use more than one partner. A small, well-defined piece of work is an easy way to compare.',
      followUp: 'Is there a module or project you could use to see how we work?',
    },
    {
      objection: 'There is no budget right now.',
      response: 'We can start small, with a short engagement tied to a clear result, so it fits an existing budget line.',
      followUp: 'When is budget for next quarter decided, and who decides it?',
    },
  ];

  const nextBestAction = contacts.length
    ? `Write to ${contacts[0].name} (${contacts[0].title}) by ${contacts[0].channel === 'Email' ? 'email' : 'LinkedIn'}, opening with the line below.`
    : `Find a technical decision maker at ${companyName} in Apollo Search.`;

  return {
    companyId: profile.companyId,
    companyName,
    domain: profile.domain,
    summary: profile.executiveBriefing?.summary || companyName,
    fitScore: scoring.overallScore,
    evidence: scoring.scoringFactors.map((f) => ({ label: f.factorName, detail: f.description, points: f.impactScore })),
    dataCompleteness: scoring.confidenceScorePercent,
    nextBestAction,
    fitAreas,
    services,
    contacts,
    openingLine,
    discoveryQuestions,
    objections,
  };
}
