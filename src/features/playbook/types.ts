/**
 * Company 360 sales playbook. Every company-specific line comes from the profile (Apollo data and the
 * team's service catalog); where nothing is known the playbook says so instead of filling in examples.
 */
export type PlaybookEvidence = { label: string; detail: string; points: number };

export type PlaybookFitArea = {
  area: 'Technical fit' | 'Company fit' | 'Growth' | 'Reachability';
  /** What was actually found. Empty means nothing is known yet. */
  found: string[];
  /** What to do or ask about this area. */
  note: string;
};

export type PlaybookService = { name: string; reason: string; startingPrice: string; matchedTech: string[] };

export type PlaybookContact = { name: string; title: string; channel: 'LinkedIn' | 'Email'; email: string; linkedinUrl: string };

export type PlaybookObjection = { objection: string; response: string; followUp: string };

export type OpportunityPlaybookModel = {
  companyId: string;
  companyName: string;
  domain: string;
  summary: string;
  /** The Company 360 fit score and what it is made of. */
  fitScore: number;
  evidence: PlaybookEvidence[];
  /** Share of the possible evidence that was found (0-100). */
  dataCompleteness: number;
  nextBestAction: string;
  fitAreas: PlaybookFitArea[];
  services: PlaybookService[];
  contacts: PlaybookContact[];
  /** An opening line built from the strongest real signal, or a neutral one when there is none. */
  openingLine: string;
  discoveryQuestions: string[];
  objections: PlaybookObjection[];
};
