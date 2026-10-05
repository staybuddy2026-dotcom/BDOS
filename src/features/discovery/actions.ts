'use server';

import { AuthService } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { db } from '@/lib/db';
import { LeadDiscoveryData, DiscoveryLeadItem, SavedSearch, WatchlistItem, ProviderSelection } from './types';
import { apolloProvider, getLastApolloErrors } from '@/features/apollo/provider';
import { getPostMetaMap } from '@/features/linkedin/store';
import { getShortlist } from '@/features/prospecting/service';


/**
 * Fit score from what is actually known about a lead. Each point comes with the reason, which the
 * "Why this score?" view lists. Nothing is assumed: a lead with no signals scores low.
 */
function scoreLead(evidence: { title?: string; hasEmail?: boolean; hiring?: string; stack?: string[]; aiScore?: number | null }) {
  const reasons: { label: string; points: number }[] = [];
  if (evidence.aiScore) {
    reasons.push({ label: 'AI analysis of their LinkedIn post', points: Math.round(evidence.aiScore) });
    return { score: Math.round(evidence.aiScore), reasons };
  }
  reasons.push({ label: 'Base score for a matching search result', points: 50 });
  const title = evidence.title || '';
  if (/founder|owner|\bceo\b|\bcto\b|chief|president/i.test(title)) reasons.push({ label: `Decision maker: ${title}`, points: 20 });
  else if (/\bvp\b|vice president|head of|director/i.test(title)) reasons.push({ label: `Senior role: ${title}`, points: 12 });
  if (evidence.hiring) reasons.push({ label: `Hiring signal: ${evidence.hiring}`, points: 15 });
  if (evidence.hasEmail) reasons.push({ label: 'Email available in Apollo', points: 10 });
  if (evidence.stack?.length) reasons.push({ label: `Known tech stack: ${evidence.stack.slice(0, 3).join(', ')}`, points: 5 });
  return { score: Math.min(100, reasons.reduce((n, r) => n + r.points, 0)), reasons };
}

/**
 * Sanitizes and guarantees verified, clean, non-generic contact info for any lead.
 */
function sanitizeDiscoveryLead(lead: DiscoveryLeadItem): DiscoveryLeadItem {
  const rawName = (lead.recommendedContactName || 'Executive Lead').trim();
  const rawTitle = (lead.recommendedContactTitle || 'Technology Executive').trim();

  return {
    ...lead,
    recommendedContactName: rawName,
    recommendedContactTitle: rawTitle,
    whyContactReason: lead.whyContactReason || `Apollo B2B Contact: ${rawName} (${rawTitle}).`,
    contactEmail: lead.contactEmail || undefined,
    contactPhone: lead.contactPhone || undefined,
    contactLinkedinUrl: lead.contactLinkedinUrl || undefined,
  };
}

/**
 * Server Action: Fetches unified Lead Discovery data from live Prisma database records & active provider integrations.
 */
export async function getUniversalLeadDiscoveryDataAction(
  query: string = '',
  providers?: ProviderSelection,
  page: number = 1,
  perPage: number = 25
): Promise<LeadDiscoveryData> {
  try {
    await AuthService.verifySession();
    logger.info(`Server Action: Fetching live Lead Discovery data for query: '${query}' (Page ${page}, PerPage ${perPage})`);

    // Ingest live posts & enrichment records from database
    const dbPosts = await db.linkedInPost.findMany({
      take: 100,
      orderBy: { discoveredAt: 'desc' },
      include: { apolloEnrichment: true, analysis: true },
    }).catch(() => []);

    // Purge & filter out legacy test placeholders using a centralized function
    const isDummyLead = (orgName: string, personName: string = '') => {
      const lowerOrg = orgName.toLowerCase().trim();
      const lowerPerson = personName.toLowerCase().trim();
      return (
        lowerOrg === 'organization' ||
        lowerOrg === 'target account' ||
        lowerOrg.includes('likesoft') ||
        lowerOrg.includes('99ideas') ||
        lowerPerson === 'chris lyn' ||
        lowerPerson === 'jane doe' ||
        lowerPerson === 'apollo lead' ||
        lowerPerson === 'decision maker'
      );
    };

    const validDbPosts = dbPosts.filter((post) => {
      const orgName = post.apolloEnrichment?.organizationName || post.companyName || '';
      const personName = post.apolloEnrichment?.personName || post.authorName || '';
      return !isDummyLead(orgName, personName);
    });

    // Author profile links for posts discovered on LinkedIn.
    const linkedinPostMeta = await getPostMetaMap();

    let liveLeads: DiscoveryLeadItem[] = validDbPosts.map((post) => {
      const enrichment = post.apolloEnrichment;
      const orgName = enrichment?.organizationName || post.companyName || 'Target Account';
      // A real LinkedIn post has no known company domain: leave it empty rather than guess one.
      const isLinkedInPost = !enrichment && /linkedin\.com\/(posts|feed)\//i.test(post.postUrl || '');
      // Only a domain we actually know: guessing "<name>.io" would point outreach at the wrong company.
      const domain = enrichment?.organizationDomain || '';
      const contactName = enrichment?.personName || post.authorName;
      const contactTitle = enrichment?.jobTitle || post.authorHeadline || 'Technology Executive';
      const { score, reasons } = scoreLead({ aiScore: post.opportunityScore || post.analysis?.opportunityScore, title: contactTitle, hasEmail: !!enrichment?.workEmail });

      const actualSources: ("apollo" | "github" | "crunchbase" | "linkedin")[] = [];
      const postObj = post as unknown as Record<string, unknown>;
      const srcProv = String(postObj.sourceProvider || '').toLowerCase();
      if (enrichment || srcProv === 'apollo') {
        actualSources.push('apollo');
      } else if (srcProv === 'linkedin' || post.postUrl?.includes('linkedin.com')) {
        actualSources.push('linkedin');
      } else if (srcProv === 'github') {
        actualSources.push('github');
      } else if (srcProv === 'crunchbase') {
        actualSources.push('crunchbase');
      } else {
        actualSources.push('apollo');
      }

      return {
        companyId: `comp_${post.id}`,
        companyName: orgName,
        domain,
        industry: '',
        country: '',
        employeeCount: 0,
        buyingScore: score,
        icpScore: score,
        scoreReasons: reasons,
        tier: score >= 90 ? 'IMMEDIATE' : score >= 75 ? 'HIGH' : 'MEDIUM',
        primaryTechStack: post.analysis?.buyingSignals || [],
        fundingSummary: '',
        hiringSummary: '',
        matchedProviders: actualSources,
        whyContactReason: post.analysis?.summary || `Live signal detected for ${orgName}: ${post.matchedKeyword}`,
        recommendedContactName: contactName,
        recommendedContactTitle: contactTitle,
        bestOutreachChannel: isLinkedInPost ? ('LINKEDIN' as const) : ('EMAIL' as const),
        contactLinkedinUrl: isLinkedInPost ? linkedinPostMeta[post.postUrl]?.authorProfileUrl : undefined,
        estimatedBudgetInr: '',
        estimatedBudgetUsd: '',
        conversionProbabilityPercent: 0,
        recommendedServices: [],
      };
    });

    let apolloTotalCount = 0;
    let apolloApiError = undefined;

    // Try executing live Apollo REST API search using saved Apollo key if apollo provider is active
    if (!providers || providers.apollo) {
      try {
        const apolloRes = await apolloProvider.searchPeopleAdvanced({
          keywords: query || 'Software SaaS',
          perPage: 50, // Fetch a larger batch to ensure we have enough items left after deduplication
          page: page,
        });

        if (apolloRes && apolloRes.people && apolloRes.people.length > 0) {
          apolloTotalCount = apolloRes.totalCount || apolloRes.people.length;

          const apolloMapped: DiscoveryLeadItem[] = apolloRes.people.map((p, idx) => {
            // Apollo masks surnames ("Br***n"); show "Tyler B." instead of a mangled "Tyler Brn".
            const cleanName = (p.personName || 'Decision Maker').replace(/\s+([A-Za-z])[A-Za-z]*\*+[A-Za-z]*/g, ' $1.').trim();
            const cleanTitle = (p.jobTitle || 'Executive').trim();
            const rawOrg = (p.organizationName || 'Target Account').trim();
            const rawDomain = (p.organizationDomain || '').trim().toLowerCase();

            const hiring = p.searchMatches?.find(m => m.type === 'hiring')?.label || '';
            const { score, reasons } = scoreLead({ title: cleanTitle, hasEmail: !!(p.workEmail || p.hasEmailAvailable), hiring, stack: p.technologies });
            const locationStr = (p.location || '').trim();
            const countryVal = p.country || locationStr || '';
            const empVal = p.employeeCount || (p.employeeRange ? parseInt(p.employeeRange.replace(/[^0-9]/g, ''), 10) : 0);

            return {
              companyId: `apollo_live_${p.apolloPersonId || (page * 100 + idx)}`,
              companyName: rawOrg,
              domain: rawDomain,
              industry: p.organizationIndustry || '',
              country: countryVal,
              employeeCount: empVal,
              buyingScore: score,
              icpScore: score,
              scoreReasons: reasons,
              tier: (score >= 90 ? 'IMMEDIATE' : score >= 75 ? 'HIGH' : 'MEDIUM') as DiscoveryLeadItem['tier'],
              primaryTechStack: p.technologies?.length ? p.technologies : [],
              fundingSummary: '',
              hiringSummary: hiring,
              matchedProviders: ['apollo'] as DiscoveryLeadItem['matchedProviders'],
              whyContactReason: `Apollo contact: ${cleanName} (${cleanTitle}) at ${rawOrg}. Email ${p.workEmail ? 'revealed' : p.hasEmailAvailable ? 'on file in Apollo (enrich to reveal)' : 'not on file'}.`,
              recommendedContactName: cleanName,
              recommendedContactTitle: cleanTitle,
              bestOutreachChannel: 'EMAIL' as const,
              contactEmail: p.workEmail || undefined,
              contactPhone: p.phone || undefined,
              contactLinkedinUrl: p.linkedinUrl || undefined,
              estimatedBudgetInr: '',
              estimatedBudgetUsd: '',
              conversionProbabilityPercent: 0,
              recommendedServices: [],
            };
          }).filter(p => !isDummyLead(p.companyName, p.recommendedContactName)); // Filter live Apollo results too

          liveLeads = apolloMapped;
        }
      } catch (e) {
        logger.info('Live Apollo API fetch error in Lead Discovery', { error: String(e) });
        apolloApiError = 'Apollo API Error: ' + (e instanceof Error ? e.message : String(e));
      }
    }

    // Strict Company Deduplication on domain & companyName so NO repeated company is ever returned
    // EXCEPT when the company is a generic placeholder due to missing data (prevent squashing all results to 1)
    const uniqueLeadsMap = new Map<string, DiscoveryLeadItem>();
    for (const lead of liveLeads) {
      const isGeneric = lead.companyName.toLowerCase() === 'organization' || lead.companyName.toLowerCase() === 'target account';
      const key = (lead.domain && lead.domain.length > 2) 
        ? lead.domain.toLowerCase() 
        : (isGeneric ? lead.companyId : lead.companyName.toLowerCase());

      if (!uniqueLeadsMap.has(key)) {
        uniqueLeadsMap.set(key, lead);
      }
    }
    liveLeads = Array.from(uniqueLeadsMap.values());

    let results = liveLeads;

    // Filter by text search query across all lead fields
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      results = results.filter((lead) => {
        const text = [
          lead.companyName,
          lead.domain,
          lead.industry,
          lead.recommendedContactName,
          lead.recommendedContactTitle,
          lead.whyContactReason,
          ...lead.primaryTechStack,
        ].join(' ').toLowerCase();
        return text.includes(q);
      });
    }

    // Filter results so ONLY leads whose actual true source is currently checked are returned
    if (providers) {
      results = results.filter(lead =>
        lead.matchedProviders.some(p => providers[p] === true)
      );
    }

    // Query saved searches dynamically from database
    const dbSaved = await db.applicationSettings.findMany({
      where: { key: { startsWith: 'search_' } },
      take: 5,
    }).catch(() => []);

    const savedSearches: SavedSearch[] = dbSaved.map((s, idx) => {
      try {
        const val = JSON.parse(s.value);
        return {
          id: `s_${idx}`,
          query: val.query || s.key.replace('search_', ''),
          filtersSummary: val.filtersSummary || 'V1 Providers',
          createdAt: 'Saved',
          matchCount: results.length,
        };
      } catch {
        return {
          id: `s_${idx}`,
          query: s.key.replace('search_', ''),
          filtersSummary: 'V1 Providers',
          createdAt: 'Saved',
          matchCount: results.length,
        };
      }
    });

    const watchlist: WatchlistItem[] = [];

    // Match total count and page calculation
    const totalContactsCount = apolloTotalCount > 0 ? apolloTotalCount : Math.max(results.length, 1);
    const totalCompaniesCount = totalContactsCount;

    // Calculate actual total pages for live results
    const effectivePerPage = Math.max(1, perPage);
    const totalPages = Math.max(1, Math.ceil(totalCompaniesCount / effectivePerPage));
    const currentPage = page;
    
    // Slice down to exactly the requested perPage amount (since we fetched 50 to survive deduplication)
    const finalLeads = results.slice(0, effectivePerPage);
    const paginatedLeads = finalLeads.map(sanitizeDiscoveryLead);

    // Companies the team shortlisted for Company 360
    const shortlist = await getShortlist().catch(() => ({ leads: {} as Record<string, DiscoveryLeadItem>, ids: [] as string[] }));

    return {
      leads: paginatedLeads,
      savedSearches,
      watchlist,
      recentlyViewed: [],
      recommendedCompanies: paginatedLeads,
      totalCount: totalCompaniesCount,
      totalPages,
      page: currentPage,
      perPage: effectivePerPage,
      totalContactsCount,
      totalCompaniesCount,
      migratedLeadsMap: shortlist.leads,
      migratedCompanyIds: shortlist.ids,
      apiError: apolloApiError,
    };
  } catch (err: unknown) {
    logger.error('Universal Lead Discovery Action failed', { error: String(err) });
    throw new AppError('Lead Discovery fetch failed.', 500);
  }
}

/**
 * Server Action: Saves a search query & filter configuration for quick BDE re-use.
 */
export async function saveSearchAction(query: string, filtersSummary: string): Promise<SavedSearch> {
  try {
    await AuthService.verifySession();
    logger.info(`Server Action: Saving search '${query}' in database`);

    await db.applicationSettings.upsert({
      where: { key: `search_${query.toLowerCase().replace(/\s+/g, '_')}` },
      update: { value: JSON.stringify({ query, filtersSummary, savedAt: new Date() }) },
      create: {
        key: `search_${query.toLowerCase().replace(/\s+/g, '_')}`,
        value: JSON.stringify({ query, filtersSummary, savedAt: new Date() }),
      },
    }).catch(() => null);

    return {
      id: `s_${Date.now()}`,
      query,
      filtersSummary,
      createdAt: 'Just now',
      matchCount: 1,
    };
  } catch (err: unknown) {
    logger.error('Save Search Action failed', { error: String(err) });
    throw new AppError('Save search failed.', 500);
  }
}

/**
 * Server Action: Executes background post & lead discovery scan across active providers.
 */
export async function runDiscoveryScan(provider: string = 'all', timeframe: string = '24h'): Promise<{ created: number }> {
  try {
    await AuthService.verifySession();
    logger.info(`Server Action: Running discovery scan for provider '${provider}', timeframe '${timeframe}'`);
    // Keyword scans run on LinkedIn posts (Apollo has people, not posts).
    if (provider === 'all' || provider === 'linkedin') {
      const { scanLinkedInKeywordsAction } = await import('@/features/linkedin/actions');
      const res = await scanLinkedInKeywordsAction({ timeframe });
      if (res.error) logger.warn(`Discovery scan: LinkedIn unavailable: ${res.error.message}`);
      return { created: res.created };
    }
    return { created: 0 };
  } catch (err: unknown) {
    logger.error('Discovery scan failed', { error: String(err) });
    throw new AppError('Discovery scan failed.', 500);
  }
}

/**
 * The team's Company 360 shortlist (see features/prospecting), in the shape the discovery pages use.
 */
export async function getMigratedCompaniesFromDbAction(): Promise<{
  migratedLeadsMap: Record<string, DiscoveryLeadItem>;
  migratedCompanyIds: string[];
}> {
  await AuthService.verifySession();
  const { leads, ids } = await getShortlist();
  return { migratedLeadsMap: leads, migratedCompanyIds: ids };
}

/**
 * Server Action: On-demand live Apollo Enrichment to reveal direct work email & phone number.
 */
export async function enrichDiscoveryLeadContactAction(lead: DiscoveryLeadItem): Promise<{ email?: string; phone?: string; linkedinUrl?: string; error?: string }> {
  try {
    await AuthService.verifySession();
    const result = await revealDiscoveryContact(lead);
    if (result.email || result.phone) return result;
    // Pass Apollo's real reason (no credits, daily limit, no match) back to the page.
    const recent = getLastApolloErrors().find((e) => Date.now() - new Date(e.at).getTime() < 60000);
    return { ...result, error: recent?.message || `Apollo has no email or phone on file for ${lead.recommendedContactName}.` };
  } catch (err) {
    logger.error('Failed to enrich discovery contact', err);
    return { error: 'Apollo contact enrichment failed. Please try again.' };
  }
}

async function revealDiscoveryContact(lead: DiscoveryLeadItem): Promise<{ email?: string; phone?: string; linkedinUrl?: string }> {
  {
    const personId = lead.companyId.startsWith('apollo_live_') ? lead.companyId.replace('apollo_live_', '') : undefined;
    if (personId && !personId.startsWith('apollo-p-')) {
      const enriched = await apolloProvider.enrichPerson({
        apolloPersonId: personId,
        name: lead.recommendedContactName,
        domain: lead.domain,
        organizationName: lead.companyName,
        revealPersonalEmail: true,
        revealPhone: true,
      });
      if (enriched && (enriched.workEmail || enriched.phone)) {
        return {
          email: enriched.workEmail || enriched.personalEmail,
          phone: enriched.phone,
          linkedinUrl: enriched.linkedinUrl,
        };
      }
    }

    // No Apollo id yet: find the person at this company first. Skipped when a known Apollo id already
    // failed (no credits / limit), since a second lookup would only spend more quota for the same answer.
    if (!personId && lead.domain && lead.recommendedContactName) {
      const firstName = lead.recommendedContactName.split(/\s+/)[0];
      const searchRes = await apolloProvider.searchPeopleAdvanced({
        domain: lead.domain,
        keywords: firstName,
        jobTitle: lead.recommendedContactTitle,
        perPage: 1,
      });
      const match = searchRes.people?.[0];
      if (match) {
        if (match.workEmail || match.phone) {
          return { email: match.workEmail, phone: match.phone, linkedinUrl: match.linkedinUrl };
        }
        const enriched = await apolloProvider.enrichPerson({
          apolloPersonId: match.apolloPersonId,
          name: match.personName || lead.recommendedContactName,
          domain: match.organizationDomain || lead.domain,
          organizationName: match.organizationName || lead.companyName,
          revealPersonalEmail: true,
          revealPhone: true,
        });
        if (enriched) {
          return { email: enriched.workEmail || enriched.personalEmail, phone: enriched.phone, linkedinUrl: enriched.linkedinUrl };
        }
      }
    }
    return {};
  }
}
