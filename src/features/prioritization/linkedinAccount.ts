import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import { normalizeCompanyDomain } from '@/features/company360/merge';
import { DefaultApolloProvider } from '@/features/apollo/provider';
import { linkedinProvider, isLinkedInConfigured, cleanLinkedInUrl } from '@/features/linkedin/provider';
import { nameFromProfileUrl } from '@/features/linkedin/salesnav';

export type ResolvedLinkedInAccount = {
  domain: string;
  companyName: string;
  industry?: string;
  location?: string;
  employeeCount?: number;
  companyLinkedinUrl?: string;
  person?: {
    name: string;
    title: string;
    profileUrl: string;
  };
};

// Platform and email domains that can never be a prospect's company website.
const PLATFORM_DOMAINS = /(^|\.)(linkedin\.com|lnkd\.in|apollo\.io|gmail\.com|googlemail\.com|yahoo\.(com|co\.in)|outlook\.com|hotmail\.com|live\.com|icloud\.com|proton(mail)?\.(me|com)|github\.com|facebook\.com|instagram\.com|x\.com|twitter\.com|youtube\.com|medium\.com|wordpress\.com|example\.com)$/i;

export const isRealDomain = (d?: string | null): d is string =>
  !!d && /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(d) && d !== 'unknown-domain.com' && !PLATFORM_DOMAINS.test(d);

function extractCleanDomain(urlOrDomain?: string): string | undefined {
  if (!urlOrDomain) return undefined;
  const d = normalizeCompanyDomain(urlOrDomain);
  return isRealDomain(d) ? d : undefined;
}

function nameFromSlug(slug: string): string {
  return decodeURIComponent(slug)
    .replace(/[-_.]+/g, ' ')
    .replace(/\b(inc|corp|corporation|llc|ltd|co|gmbh|technologies|solutions|group|private limited|pvt ltd)\b/gi, '')
    .trim();
}

/**
 * Resolves a pasted LinkedIn URL (company page, personal profile, post, or Sales Navigator lead)
 * into a verified company domain and details for AI Priorities.
 */
export async function resolveLinkedInAccount(rawUrl: string): Promise<{ account?: ResolvedLinkedInAccount; error?: string }> {
  const input = (rawUrl || '').trim();
  if (!input) {
    return { error: 'Paste a LinkedIn URL first.' };
  }

  // Prepend protocol if missing so URL parsing works reliably
  const urlWithProto = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  const cleanUrl = cleanLinkedInUrl(urlWithProto) || urlWithProto.split(/[?#]/)[0].replace(/\/+$/, '');

  // -------------------------------------------------------------------------
  // 1. LinkedIn Company Page: /company/<slug> or /school/<slug>
  // -------------------------------------------------------------------------
  const companyMatch = cleanUrl.match(/linkedin\.com\/(?:company|school)\/([^/?#\s]+)/i);
  if (companyMatch) {
    const slug = decodeURIComponent(companyMatch[1]).replace(/\/+$/, '');

    // Strategy 1A: LinkedIn provider lookup (Apify)
    if (await isLinkedInConfigured().catch(() => false)) {
      try {
        const liRes = await linkedinProvider.getCompany({ url: cleanUrl });
        if (liRes.company) {
          const c = liRes.company;
          const domain = extractCleanDomain(c.website) || extractCleanDomain(c.domain);
          if (domain) {
            return {
              account: {
                domain,
                companyName: c.name || nameFromSlug(slug),
                industry: c.industry,
                location: c.headquarters,
                employeeCount: c.employeeCount,
                companyLinkedinUrl: c.linkedinUrl || cleanUrl,
              },
            };
          }
        }
      } catch (err) {
        logger.warn(`LinkedIn company lookup failed for ${slug}:`, { error: String(err) });
      }
    }

    // Strategy 1B: Apollo Organization Search
    try {
      const apollo = new DefaultApolloProvider();
      // If slug has dots or looks like a domain directly (e.g. dropbox.com)
      if (slug.includes('.') && isRealDomain(slug)) {
        const orgRes = await apollo.searchOrganizationsAdvanced({ domain: slug, perPage: 1 });
        const org = orgRes.organizations?.[0];
        if (org?.domain && isRealDomain(org.domain)) {
          return {
            account: {
              domain: normalizeCompanyDomain(org.domain),
              companyName: org.name || nameFromSlug(slug),
              industry: org.industry,
              location: org.location,
              employeeCount: org.employeeCount,
              companyLinkedinUrl: org.linkedinUrl || cleanUrl,
            },
          };
        }
      }

      // Search by company name derived from the slug
      const searchName = nameFromSlug(slug);
      if (searchName) {
        const orgRes = await apollo.searchOrganizationsAdvanced({ name: searchName, perPage: 3 });
        const org = orgRes.organizations?.find((o) => o.domain && isRealDomain(o.domain)) || orgRes.organizations?.[0];
        if (org?.domain && isRealDomain(org.domain)) {
          return {
            account: {
              domain: normalizeCompanyDomain(org.domain),
              companyName: org.name || searchName,
              industry: org.industry,
              location: org.location,
              employeeCount: org.employeeCount,
              companyLinkedinUrl: org.linkedinUrl || cleanUrl,
            },
          };
        }
      }
    } catch (err) {
      logger.warn(`Apollo lookup for LinkedIn company ${slug} failed:`, { error: String(err) });
    }

    // Strategy 1C: Check local database & cached profiles
    try {
      const searchName = nameFromSlug(slug);
      const cached = await db.companyProfileCache.findFirst({
        where: {
          OR: [
            { key: slug.toLowerCase() },
            { companyId: { contains: slug, mode: 'insensitive' } },
          ],
        },
      });
      if (cached?.key && isRealDomain(cached.key)) {
        const data = cached.data as Record<string, unknown> | null;
        const overview = (data?.overview as Record<string, unknown>) || {};
        return {
          account: {
            domain: cached.key,
            companyName: (overview.companyName as string) || searchName || slug,
            industry: overview.industry as string | undefined,
            location: overview.headquarters as string | undefined,
            employeeCount: overview.employeeCount as number | undefined,
            companyLinkedinUrl: (overview.linkedinPageUrl as string) || cleanUrl,
          },
        };
      }

      const shortlisted = await db.shortlistedCompany.findFirst({
        where: {
          OR: [
            { domain: slug.toLowerCase() },
            { name: { equals: searchName, mode: 'insensitive' } },
          ],
        },
      });
      if (shortlisted?.domain && isRealDomain(shortlisted.domain)) {
        return {
          account: {
            domain: shortlisted.domain,
            companyName: shortlisted.name,
            companyLinkedinUrl: cleanUrl,
          },
        };
      }
    } catch {
      // Local DB lookup fallback failure is non-blocking
    }

    return {
      error: `Could not find a company website for LinkedIn company "${slug}". Make sure it is an active company with a website or search by company website.`,
    };
  }

  // -------------------------------------------------------------------------
  // 2. LinkedIn Person Profile: /in/<slug>
  // -------------------------------------------------------------------------
  const personMatch = cleanUrl.match(/linkedin\.com\/in\/([^/?#\s]+)/i);
  if (personMatch) {
    const slug = decodeURIComponent(personMatch[1]).replace(/\/+$/, '');
    const apollo = new DefaultApolloProvider();

    // Strategy 2A: Apollo people/match with LinkedIn URL
    try {
      const match = await apollo.enrichPerson({ apolloPersonId: '', linkedinUrl: cleanUrl });
      if (match?.organizationDomain && isRealDomain(match.organizationDomain)) {
        const domain = normalizeCompanyDomain(match.organizationDomain);
        return {
          account: {
            domain,
            companyName: match.organizationName || nameFromSlug(domain.split('.')[0]),
            industry: match.organizationIndustry,
            location: match.location,
            employeeCount: match.employeeCount,
            person: {
              name: match.personName || nameFromProfileUrl(cleanUrl) || slug,
              title: match.jobTitle || 'Decision Maker',
              profileUrl: cleanUrl,
            },
          },
        };
      }
    } catch (err) {
      logger.warn(`Apollo enrichPerson for LinkedIn profile ${cleanUrl} failed:`, { error: String(err) });
    }

    // Strategy 2B: LinkedIn Profile Scraper (Apify)
    if (await isLinkedInConfigured().catch(() => false)) {
      try {
        const profRes = await linkedinProvider.getProfile(cleanUrl);
        if (profRes.profile) {
          const p = profRes.profile;
          const personName = p.fullName || nameFromProfileUrl(cleanUrl) || slug;
          const jobTitle = p.jobTitle || p.headline || 'Decision Maker';

          // If company LinkedIn URL was returned, resolve company domain from it
          if (p.companyLinkedinUrl) {
            const compRes = await linkedinProvider.getCompany({ url: p.companyLinkedinUrl });
            const compDomain = extractCleanDomain(compRes.company?.website) || extractCleanDomain(compRes.company?.domain);
            if (compDomain) {
              return {
                account: {
                  domain: compDomain,
                  companyName: compRes.company?.name || p.companyName || nameFromSlug(compDomain.split('.')[0]),
                  industry: compRes.company?.industry,
                  location: compRes.company?.headquarters || p.location,
                  employeeCount: compRes.company?.employeeCount,
                  companyLinkedinUrl: p.companyLinkedinUrl,
                  person: { name: personName, title: jobTitle, profileUrl: cleanUrl },
                },
              };
            }
          }

          // If company name was found, lookup company in Apollo
          if (p.companyName) {
            const orgRes = await apollo.searchOrganizationsAdvanced({ name: p.companyName, perPage: 1 });
            const org = orgRes.organizations?.[0];
            if (org?.domain && isRealDomain(org.domain)) {
              return {
                account: {
                  domain: normalizeCompanyDomain(org.domain),
                  companyName: org.name || p.companyName,
                  industry: org.industry,
                  location: org.location || p.location,
                  employeeCount: org.employeeCount,
                  companyLinkedinUrl: p.companyLinkedinUrl || org.linkedinUrl,
                  person: { name: personName, title: jobTitle, profileUrl: cleanUrl },
                },
              };
            }
          }
        }
      } catch (err) {
        logger.warn(`LinkedIn getProfile failed for ${cleanUrl}:`, { error: String(err) });
      }
    }

    // Strategy 2C: Local database contact match
    try {
      const contact = await db.contact.findFirst({
        where: {
          OR: [
            { linkedinUrl: { equals: cleanUrl, mode: 'insensitive' } },
            { linkedinUrl: { contains: slug, mode: 'insensitive' } },
          ],
        },
        include: { company: true },
      });
      if (contact?.company?.domain && isRealDomain(contact.company.domain)) {
        return {
          account: {
            domain: normalizeCompanyDomain(contact.company.domain),
            companyName: contact.company.name,
            person: {
              name: contact.name,
              title: contact.title || 'Decision Maker',
              profileUrl: cleanUrl,
            },
          },
        };
      }
    } catch {
      // Local DB lookup fallback failure is non-blocking
    }

    return {
      error: `Could not identify the company website from ${nameFromProfileUrl(cleanUrl) || 'this contact'}'s LinkedIn profile. Try pasting their company's LinkedIn page or company website instead.`,
    };
  }

  // -------------------------------------------------------------------------
  // 3. LinkedIn Post URL: /posts/ or /feed/update/
  // -------------------------------------------------------------------------
  if (/linkedin\.com\/(?:posts\/|feed\/update\/)/i.test(cleanUrl)) {
    try {
      const post = await db.linkedInPost.findFirst({
        where: { postUrl: { contains: cleanUrl } },
        include: { apolloEnrichment: true },
      });
      const enrichment = post?.apolloEnrichment;
      const domain = extractCleanDomain(enrichment?.organizationDomain || undefined);
      if (domain) {
        return {
          account: {
            domain,
            companyName: enrichment?.organizationName || post?.companyName || nameFromSlug(domain.split('.')[0]),
            person: post?.authorName
              ? {
                  name: post.authorName,
                  title: post.authorHeadline || 'Decision Maker',
                  profileUrl: enrichment?.linkedinUrl || cleanUrl,
                }
              : undefined,
          },
        };
      }
      if (enrichment?.linkedinUrl) {
        return resolveLinkedInAccount(enrichment.linkedinUrl);
      }
      if (post?.companyName) {
        const apollo = new DefaultApolloProvider();
        const orgRes = await apollo.searchOrganizationsAdvanced({ name: post.companyName, perPage: 1 });
        const org = orgRes.organizations?.[0];
        if (org?.domain && isRealDomain(org.domain)) {
          return {
            account: {
              domain: normalizeCompanyDomain(org.domain),
              companyName: org.name || post.companyName,
              industry: org.industry,
              location: org.location,
              employeeCount: org.employeeCount,
              person: post?.authorName
                ? {
                    name: post.authorName,
                    title: post.authorHeadline || 'Decision Maker',
                    profileUrl: cleanUrl,
                  }
                : undefined,
            },
          };
        }
      }
    } catch (err) {
      logger.warn(`Could not resolve LinkedIn post ${cleanUrl}:`, { error: String(err) });
    }
  }

  // -------------------------------------------------------------------------
  // 4. Sales Navigator Lead or Company URL
  // -------------------------------------------------------------------------
  if (/linkedin\.com\/sales\//i.test(cleanUrl)) {
    const leadName = nameFromProfileUrl(cleanUrl);
    if (leadName) {
      try {
        const apollo = new DefaultApolloProvider();
        const people = await apollo.searchPeople({ name: leadName });
        const p = people.find((x) => x.organizationDomain && isRealDomain(x.organizationDomain));
        if (p?.organizationDomain) {
          const domain = normalizeCompanyDomain(p.organizationDomain);
          return {
            account: {
              domain,
              companyName: p.organizationName || nameFromSlug(domain.split('.')[0]),
              industry: p.organizationIndustry,
              location: p.location,
              employeeCount: p.employeeCount,
              person: { name: p.personName, title: p.jobTitle || 'Decision Maker', profileUrl: cleanUrl },
            },
          };
        }
      } catch {
        // Fallback continues
      }
    }
  }

  // -------------------------------------------------------------------------
  // 5. Direct Domain or Company Website Fallback
  // (In case the user pasted stripe.com or https://stripe.com)
  // -------------------------------------------------------------------------
  const directDomain = extractCleanDomain(cleanUrl);
  if (directDomain) {
    try {
      const apollo = new DefaultApolloProvider();
      const orgRes = await apollo.searchOrganizationsAdvanced({ domain: directDomain, perPage: 1 });
      const org = orgRes.organizations?.[0];
      return {
        account: {
          domain: directDomain,
          companyName: org?.name || nameFromSlug(directDomain.split('.')[0]) || directDomain,
          industry: org?.industry,
          location: org?.location,
          employeeCount: org?.employeeCount,
          companyLinkedinUrl: org?.linkedinUrl,
        },
      };
    } catch {
      return {
        account: {
          domain: directDomain,
          companyName: nameFromSlug(directDomain.split('.')[0]) || directDomain,
        },
      };
    }
  }

  return {
    error: 'Unrecognized URL. Please paste a LinkedIn company page (e.g. linkedin.com/company/acme) or person profile (e.g. linkedin.com/in/name).',
  };
}
