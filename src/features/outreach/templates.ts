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

export const OUTREACH_TEMPLATES: TemplateItem[] = [
  {
    id: 'tpl_email_cold_1',
    name: 'Technical Squad Expansion for CTO',
    channel: 'EMAIL',
    category: 'COLD_OUTREACH',
    description: 'Targeted technical email addressing engineering team expansion and stack modernization.',
    subjectPattern: 'Scaling {{companyName}}\'s {{techStack}} Engineering Squad | Tiny Script',
    bodyPattern: `Hi {{contactName}},

I noticed {{companyName}}'s recent hiring expansion for senior {{techStack}} engineers and your active work on scaling microservices infrastructure.

At Tiny Script Soft Tech, we specialize in embedding pre-vetted, senior React 19 & Python/Node.js engineering squads to accelerate product delivery for fast-growing companies.

Given your recent growth, our team can deploy a dedicated 2-engineer squad within 48 hours to help you hit your Q3 roadmap targets.

Would you be open to a brief 10-minute technical discovery call this Thursday?

Best regards,
BDE Lead | Tiny Script Soft Tech Pvt. Ltd.`,
  },
  {
    id: 'tpl_linkedin_connect_1',
    name: 'CTO / VP Engineering Connection Request',
    channel: 'LINKEDIN',
    category: 'WARM_INTRO',
    description: 'Personalized LinkedIn connection note referencing public post or engineering velocity.',
    subjectPattern: 'Connection Request | {{companyName}} Engineering',
    bodyPattern: `Hi {{contactName}}, impressed by your recent work at {{companyName}} on {{techStack}} scaling. Would love to connect and share insights on microservices optimization and AI team integration!`,
  },
  {
    id: 'tpl_proposal_cover_1',
    name: 'Commercial Proposal Cover Letter',
    channel: 'PROPOSAL_COVER',
    category: 'PROPOSAL_SUBMISSION',
    description: 'Professional cover letter accompanying technical solution blueprint and fixed-price estimate.',
    subjectPattern: 'Commercial & Technical Proposal: {{companyName}} Modernization',
    bodyPattern: `Dear {{contactName}},

Enclosed is Tiny Script Soft Tech's commercial and technical proposal for {{companyName}}'s platform modernization project.

Our proposal includes:
1. Executive Summary & Architecture Blueprint
2. 2-Engineer Senior React 19 + Node.js Squad Allocation
3. Fixed-Price & Timeline Guarantee (2-Week Delivery Sprints)

We look forward to partnering with {{companyName}} to accelerate your platform goals.

Sincerely,
Business Development Team | Tiny Script Soft Tech Pvt. Ltd.`,
  },
];
