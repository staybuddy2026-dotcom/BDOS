import { apolloProvider } from './provider';
import { normalizeCompanyDomain } from '@/features/company360/merge';

/** Names that are not a company ("Self-employed", "Jane Doe (independent)", "Stealth"). */
const NOT_A_COMPANY = /^(self[- ]?employed|freelance(r)?|independent|confidential|stealth( mode| startup)?|n\/?a|none|-+)$|\(independent\)$/i;

/**
 * The website of a company known only by name (Apollo people search and LinkedIn give a company name but no
 * website). Looked up with Apollo company search, which costs no credits, and kept only on an exact name
 * match: without a website the company cannot be matched to its Company 360 profile, AI Priorities or CRM
 * record. Returns undefined when unsure.
 */
export async function findCompanyWebsite(name?: string | null): Promise<{ domain: string; linkedinUrl?: string; apolloOrganizationId?: string } | undefined> {
  const clean = (name || '').trim();
  if (!clean || NOT_A_COMPANY.test(clean)) return undefined;
  const org = await apolloProvider.findCompanyByExactName(clean);
  const domain = normalizeCompanyDomain(org?.domain || org?.organizationDomain || '');
  if (!org || !domain) return undefined;
  return { domain, linkedinUrl: org.linkedinUrl, apolloOrganizationId: org.apolloOrganizationId };
}
