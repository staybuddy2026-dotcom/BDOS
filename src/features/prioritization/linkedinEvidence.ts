import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { normalizeCompanyDomain } from '@/features/company360/merge';
import { getShortlist } from '@/features/prospecting/service';
import type { LinkedInAccountEvidence, LinkedInPersonEvidence, LinkedInPostEvidence } from './types';

/**
 * What the app already holds from LinkedIn about each ranked company, read from the database only
 * (no Apify call, so it costs nothing):
 *  - LinkedIn posts the team found (keyword scans, post search), with the AI's buying-intent reading;
 *  - people at the company found on LinkedIn: post authors, CRM contacts with a LinkedIn profile that did
 *    not come from Apollo, and the person a company was added from on AI Priorities;
 *  - deals that came in from LinkedIn.
 * A record belongs to a company when its website matches, or its company name matches exactly; a website is
 * never guessed from a name.
 */

const MAX_POSTS_PER_COMPANY = 5;

/** "SAFELOG", "Safelog Inc." and "safelog.com" all become "safelog". */
export const companyNameKey = (name?: string | null) =>
  (name || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\.(com|io|ai|co|net|org|in)\b/g, ' ')
    .replace(/\b(inc|llc|ltd|limited|pvt|private|gmbh|corp|corporation|co|plc|sa|bv|ag)\b\.?/g, ' ')
    .replace(/[^a-z0-9]+/g, '')
    .trim();

const emptyEvidence = (): LinkedInAccountEvidence => ({ posts: [], people: [], fromLinkedInDeal: false });

export async function loadLinkedInEvidence(accounts: { key: string; name: string }[]): Promise<Record<string, LinkedInAccountEvidence>> {
  const result: Record<string, LinkedInAccountEvidence> = {};
  if (!accounts.length) return result;

  const byDomain = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const a of accounts) {
    const domain = normalizeCompanyDomain(a.key);
    if (domain) byDomain.set(domain, a.key);
    const nameKey = companyNameKey(a.name);
    // Two ranked companies with the same name: matching by name would be a guess, so only by website.
    if (nameKey && nameKey.length >= 3) byName.set(nameKey, byName.has(nameKey) ? '' : a.key);
  }
  const find = (domain?: string | null, name?: string | null) =>
    (domain && byDomain.get(normalizeCompanyDomain(domain))) || byName.get(companyNameKey(name)) || undefined;
  const at = (key: string) => (result[key] ||= emptyEvidence());
  const addPerson = (key: string, person: LinkedInPersonEvidence) => {
    const list = at(key).people;
    const same = list.find((p) => companyNameKey(p.name) === companyNameKey(person.name) || (!!person.linkedinUrl && p.linkedinUrl === person.linkedinUrl));
    if (!same) list.push(person);
    else {
      same.jobTitle ||= person.jobTitle;
      same.linkedinUrl ||= person.linkedinUrl;
      same.email ||= person.email;
    }
  };

  const [posts, contacts, deals, shortlist] = await Promise.all([
    db.linkedInPost.findMany({
      where: { status: { not: 'DISMISSED' }, OR: [{ apolloEnrichment: { organizationDomain: { not: null } } }, { companyName: { not: null } }] },
      orderBy: { discoveredAt: 'desc' },
      take: 1000,
      include: { analysis: true, apolloEnrichment: true },
    }).catch((err) => { logger.warn('AI Priorities: could not read LinkedIn posts', { error: String(err) }); return []; }),
    db.contact.findMany({
      where: { linkedinUrl: { not: null } },
      take: 2000,
      select: { name: true, title: true, email: true, linkedinUrl: true, apolloPersonId: true, sourcePostUrl: true, company: { select: { name: true, domain: true } } },
    }).catch(() => []),
    db.deal.findMany({
      where: { source: { in: ['LINKEDIN_POST', 'LINKEDIN_PEOPLE'] } },
      take: 2000,
      select: { company: { select: { name: true, domain: true } } },
    }).catch(() => []),
    getShortlist().catch(() => null),
  ]);

  for (const post of posts) {
    const enrichment = post.apolloEnrichment;
    const key = find(enrichment?.organizationDomain, enrichment?.organizationName || post.companyName);
    if (!key) continue;
    const evidence: LinkedInPostEvidence = {
      url: post.postUrl,
      author: enrichment?.personName || post.authorName,
      authorTitle: enrichment?.jobTitle || post.authorHeadline || undefined,
      postedAt: (post.postedAt || post.discoveredAt).toISOString(),
      intentScore: post.analysis?.opportunityScore ?? post.opportunityScore ?? undefined,
      signals: post.analysis?.buyingSignals || [],
      summary: post.analysis?.summary || undefined,
      outreachAngle: post.analysis?.suggestedOutreachAngle || undefined,
      text: (post.postContent || post.postPreview || '').slice(0, 4000),
    };
    const list = at(key).posts;
    if (list.length < MAX_POSTS_PER_COMPANY) list.push(evidence);
    addPerson(key, {
      name: evidence.author,
      jobTitle: evidence.authorTitle,
      linkedinUrl: enrichment?.linkedinUrl || undefined,
      email: enrichment?.workEmail || undefined,
      via: 'Wrote a LinkedIn post about this',
    });
  }

  for (const c of contacts) {
    // Contacts saved from Apollo are Apollo data; the rest with a LinkedIn profile were found on LinkedIn.
    if (c.apolloPersonId && !c.sourcePostUrl) continue;
    const key = find(c.company.domain, c.company.name);
    if (key && c.name?.trim()) addPerson(key, { name: c.name, jobTitle: c.title || undefined, linkedinUrl: c.linkedinUrl || undefined, email: c.email || undefined, via: 'CRM contact found on LinkedIn' });
  }

  for (const d of deals) {
    const key = find(d.company.domain, d.company.name);
    if (key) at(key).fromLinkedInDeal = true;
  }

  for (const lead of Object.values(shortlist?.leads || {})) {
    if (!lead?.matchedProviders?.includes('linkedin')) continue;
    const key = find(lead.domain, lead.companyName);
    if (!key || !lead.recommendedContactName) continue;
    addPerson(key, {
      name: lead.recommendedContactName,
      jobTitle: lead.recommendedContactTitle || undefined,
      linkedinUrl: /linkedin\.com\/in\//i.test(lead.contactLinkedinUrl || '') ? lead.contactLinkedinUrl : undefined,
      via: 'Company added from their LinkedIn profile',
    });
  }

  return result;
}
