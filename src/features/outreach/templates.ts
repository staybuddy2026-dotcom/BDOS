import { OutreachCategory, OutreachChannel } from './types';

export type TemplateItem = {
  id: string;
  name: string;
  channel: OutreachChannel;
  category: OutreachCategory;
  description: string;
  subjectPattern: string;
  bodyPattern: string;
};

// Starting points the BDE edits. They only state what the placeholders fill in, never a fact about the
// prospect (growth, hiring, a post) or a promise (delivery time, a meeting slot) nobody has checked.
export const OUTREACH_TEMPLATES: TemplateItem[] = [
  {
    id: 'tpl_email_cold_1',
    name: 'Engineering capacity for a CTO',
    channel: 'EMAIL',
    category: 'COLD_OUTREACH',
    description: 'Short first email about adding senior developers to their team.',
    subjectPattern: '{{companyName}} and your {{techStack}} work',
    bodyPattern: `Hi {{contactName}},

I'm reaching out about {{companyName}}'s work with {{techStack}}.

At Tiny Script Soft Tech, we provide senior developers who join your team and work in your sprints and review process.

Would a short call to see whether that could help your roadmap make sense?

Best regards,
Tiny Script Soft Tech Pvt. Ltd.`,
  },
  {
    id: 'tpl_linkedin_connect_1',
    name: 'CTO / VP Engineering connection request',
    channel: 'LINKEDIN',
    category: 'WARM_INTRO',
    description: 'Short LinkedIn connection note (under 300 characters).',
    subjectPattern: 'Connection request | {{companyName}}',
    bodyPattern: `Hi {{contactName}}, I work with engineering teams using {{techStack}} and would be glad to connect and follow what {{companyName}} is building.`,
  },
  {
    id: 'tpl_proposal_cover_1',
    name: 'Proposal cover letter',
    channel: 'PROPOSAL_COVER',
    category: 'PROPOSAL_SUBMISSION',
    description: 'Cover letter to send with a proposal. Fill in the scope, team and pricing you agreed.',
    subjectPattern: 'Proposal for {{companyName}}',
    bodyPattern: `Dear {{contactName}},

Please find attached Tiny Script Soft Tech's proposal for {{companyName}}.

It covers:
1. The scope and approach we discussed
2. The proposed team
3. Pricing and timeline

I'm happy to walk you through it or adjust anything.

Sincerely,
Tiny Script Soft Tech Pvt. Ltd.`,
  },
];
