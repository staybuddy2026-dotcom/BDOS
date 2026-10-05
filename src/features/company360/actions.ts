'use server';

import { Prisma } from '@prisma/client';
import { AuthService } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { Company360Profile, Company360SearchResult, CompanyOverviewData, DecisionMakerContact } from './types';
import type { ApolloOrganizationMatch } from '@/features/apollo/provider';
import { GrowthIntelligenceData } from '../crunchbase/types';
import { LinkedInIntelligenceData } from '../linkedin/types';
import { fuseCompanyProfiles, normalizeCompanyDomain } from './merge';
import { getMigratedCompaniesFromDbAction } from '../discovery/actions';
import { calculateAiOpportunityScore, generateRecommendedServices, generateExecutiveBriefing } from './scoring';
import { createCrmDealForCompany } from '@/features/crm/actions';
import { sendMarketplaceProjectToReviewQueue } from '@/features/marketplace/actions';
import { safeRevalidatePath } from '@/lib/revalidate';

// Built profiles are cached in the database: reopening a company costs no Apollo quota, and the cache
// survives restarts. After PROFILE_MAX_AGE_DAYS the profile is rebuilt from fresh Apollo data.
const PROFILE_MAX_AGE_DAYS = 7;
// Bump when the way profiles are built changes, so cached ones are rebuilt instead of showing old numbers.
const PROFILE_VERSION = 2;

// normalizeCompanyDomain turns an empty value into a placeholder domain, so use the company id then.
const profileKey = (profile: Pick<Company360Profile, 'domain' | 'companyId'>) =>
  (profile.domain ? normalizeCompanyDomain(profile.domain) : profile.companyId || '').toLowerCase();

async function readCachedProfile(query: string, cleaned: string | null): Promise<{ profile: Company360Profile; fresh: boolean } | null> {
  const keys = [...new Set([cleaned, query.toLowerCase().trim()].filter((k): k is string => !!k))];
  const row = await db.companyProfileCache.findFirst({ where: { OR: [{ key: { in: keys } }, { companyId: query }] }, orderBy: { updatedAt: 'desc' } });
  if (!row) return null;
  const data = row.data as unknown as Company360Profile & { profileVersion?: number };
  const fresh = data.profileVersion === PROFILE_VERSION && Date.now() - row.updatedAt.getTime() < PROFILE_MAX_AGE_DAYS * 86400000;
  return { profile: data, fresh };
}

async function saveProfile(profile: Company360Profile) {
  const key = profileKey(profile);
  if (!key) return;
  const data = { ...profile, profileVersion: PROFILE_VERSION } as unknown as Prisma.InputJsonValue;
  await db.companyProfileCache.upsert({ where: { key }, update: { companyId: profile.companyId, data }, create: { key, companyId: profile.companyId, data } })
    .catch((err) => logger.warn('Could not cache a Company 360 profile', { error: String(err) }));
}

/**
 * Fetch Unified Company 360 Profile by Company ID or Domain.
 */
export async function getCompany360Profile(companyIdOrDomain: string): Promise<Company360Profile> {
  try {
    await AuthService.verifySession();
    logger.info(`Fetching Company 360 Master Profile for query: '${companyIdOrDomain}'...`);

    const cleaned = normalizeCompanyDomain(companyIdOrDomain);
    const cached = await readCachedProfile(companyIdOrDomain, cleaned).catch(() => null);
    if (cached?.fresh) return cached.profile;

    const { DefaultApolloProvider } = await import('@/features/apollo/provider');
    const apolloProvider = new DefaultApolloProvider();

    // Real Apollo company data. Search by domain when we have one (searching the domain as a *name* rarely matches).
    // Results are cached in the Apollo provider, so revisiting a profile costs no quota.
    const looksLikeDomain = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(cleaned);
    const apolloRes = await apolloProvider.searchOrganizationsAdvanced(
      looksLikeDomain ? { domain: cleaned, perPage: 1 } : { name: cleaned, perPage: 1 }
    ).catch(() => null);
    if (apolloRes?.error) logger.warn(`Company 360: Apollo company lookup unavailable for '${cleaned}': ${apolloRes.error.message}`);
    const orgData: ApolloOrganizationMatch | null = apolloRes?.organizations?.[0] || null;

    // Only real signals: no "Undisclosed" placeholder rounds.
    const growthFromOrg = (o: ApolloOrganizationMatch): GrowthIntelligenceData | undefined =>
      o.latestFundingStage || o.latestFundingDate
        ? ({
          latestRoundName: o.latestFundingStage || '',
          latestRoundDate: o.latestFundingDate || '',
          latestRoundAmountUsd: o.latestFundingAmount ? `$${Number(o.latestFundingAmount).toLocaleString()}` : '',
          totalFundingRaisedUsd: o.totalFundingPrinted || '',
          growthOpportunityScore: o.latestFundingDate ? 95 : 75,
          expansionSignals: [],
        } as unknown as GrowthIntelligenceData)
        : undefined;
    const linkedinFromOrg = (o: ApolloOrganizationMatch): LinkedInIntelligenceData | undefined =>
      o.openJobsCount
        ? ({ activeJobOpeningsCount: o.openJobsCount, engineeringExpansionIndex: 90, jobOpenings: [], recentPosts: [] } as unknown as LinkedInIntelligenceData)
        : undefined;

    // Dynamic identity resolution fallback for unknown query
    const companyName = orgData?.name || companyIdOrDomain.replace(/comp_/, '').replace(/-/g, ' ').toUpperCase();
    
    // Fetch actual migrated data from Universal Search
    const dbLeadsData = await getMigratedCompaniesFromDbAction().catch(() => null);
    const migratedLead = dbLeadsData?.migratedLeadsMap?.[cleaned] || dbLeadsData?.migratedLeadsMap?.[companyIdOrDomain];

    const growth: GrowthIntelligenceData | undefined = orgData ? growthFromOrg(orgData) : undefined;
    const linkedin: LinkedInIntelligenceData | undefined = orgData ? linkedinFromOrg(orgData) : undefined;

    const productHunt = undefined; // disabled
    const reddit = undefined; // disabled

    const apolloSeed: Partial<CompanyOverviewData> & { decisionMakers?: DecisionMakerContact[]; technologies?: string[] } = {
      companyName: migratedLead?.companyName || (companyName as string),
      domain: cleaned,
    };

    // Real Apollo company facts (industry, location, size, description) feed the profile and AI outreach.
    if (orgData) {
      apolloSeed.industry = orgData.industry;
      apolloSeed.headquarters = orgData.location;
      apolloSeed.employeeCount = orgData.employeeCount;
      apolloSeed.employeeRange = orgData.employeeRange;
      apolloSeed.estimatedRevenue = orgData.revenuePrinted;
      apolloSeed.fundingStage = orgData.latestFundingStage;
      apolloSeed.fundingTotal = orgData.totalFundingPrinted;
      apolloSeed.companyDescription = orgData.description;
      apolloSeed.websiteUrl = orgData.websiteUrl;
      apolloSeed.linkedinPageUrl = orgData.linkedinUrl;
      apolloSeed.technologies = orgData.technologies || [];
    }

    if (migratedLead) {
      apolloSeed.industry = apolloSeed.industry || migratedLead.industry;
      apolloSeed.headquarters = apolloSeed.headquarters || migratedLead.country;
      apolloSeed.employeeCount = apolloSeed.employeeCount || migratedLead.employeeCount;
      apolloSeed.fundingStage = apolloSeed.fundingStage || migratedLead.fundingSummary;
      
      const rcName = migratedLead.recommendedContactName || '';
      const isDummy = !rcName || rcName.toLowerCase().includes('decision maker') || rcName.toLowerCase() === 'executive';

      if (!isDummy) {
        apolloSeed.decisionMakers = [
          {
            id: `dm_${cleaned}_1`,
            name: rcName,
            jobTitle: migratedLead.recommendedContactTitle || 'Executive',
            department: 'Engineering',
            seniority: 'Director',
            email: migratedLead.contactEmail || '',
            emailStatus: migratedLead.contactEmail ? 'Verified' : 'Unverified',
            linkedinUrl: migratedLead.contactLinkedinUrl || '',
            source: 'Apollo'
          }
        ];
      }
    }

    // Senior people at this exact company (the domain filter now works, so no more unrelated celebrities).
    if ((!apolloSeed.decisionMakers || apolloSeed.decisionMakers.length === 0) && looksLikeDomain) {
      const peopleRes = await apolloProvider.searchPeopleAdvanced({
        domain: cleaned,
        seniority: 'owner,founder,c_suite,partner,vp,head,director',
        perPage: 5,
      });
      if (peopleRes.error) logger.warn(`Company 360: Apollo people lookup unavailable for '${cleaned}': ${peopleRes.error.message}`);
      const seniorityMap: Record<string, DecisionMakerContact['seniority']> = {
        owner: 'C-Level', founder: 'C-Level', c_suite: 'C-Level', partner: 'C-Level', vp: 'VP', head: 'Director', director: 'Director', manager: 'Manager',
      };
      // Most relevant buyer first (outreach uses the first contact); recruiters/HR are least relevant.
      const titleRank = (t = '') =>
        /talent|recruit|people|hr\b|human resources/i.test(t) ? 9
          : /founder|\bceo\b|chief executive|owner/i.test(t) ? 0
            : /\bcto\b|chief technology|chief product|\bcpo\b/i.test(t) ? 1
              : /chief|president|\bcoo\b|\bcio\b/i.test(t) ? 2
                : /\bvp\b|vice president/i.test(t) ? 3
                  : /head of/i.test(t) ? 4
                    : /director/i.test(t) ? 5 : 6;
      const people = peopleRes.people
        .filter((p) => p.personName && !/decision maker/i.test(p.personName))
        .sort((a, b) => titleRank(a.jobTitle) - titleRank(b.jobTitle));
      if (people.length) {
        apolloSeed.decisionMakers = people.map((p, idx) => ({
          id: p.apolloPersonId || `dm_${cleaned}_${idx}`,
          name: p.personName,
          jobTitle: p.jobTitle || 'Executive',
          department: /product/i.test(p.jobTitle || '') ? 'Product' : /engineer|technolog|cto|developer/i.test(p.jobTitle || '') ? 'Engineering' : 'Executive',
          seniority: seniorityMap[p.seniority || ''] || 'Director',
          // Apollo search never includes emails; reveal one explicitly via Apollo Search enrichment.
          email: p.workEmail || '',
          emailStatus: p.workEmail ? 'Verified' : 'Unverified',
          linkedinUrl: p.linkedinUrl || '',
          source: 'Apollo',
        }));
      }
    }

    const fused = fuseCompanyProfiles(apolloSeed, undefined, growth, productHunt, reddit, linkedin);
    const scoring = calculateAiOpportunityScore(fused.overview, fused.engineering, fused.decisionMakers, growth, productHunt, reddit, linkedin);
    const { getServiceCatalog } = await import('@/features/learning/actions');
    const catalog = await getServiceCatalog().catch(() => []);
    const recs = generateRecommendedServices(fused.engineering, catalog);
    const briefing = generateExecutiveBriefing(fused.overview, fused.engineering, fused.decisionMakers, scoring);

    const newProfile: Company360Profile = {
      companyId: fused.companyId,
      domain: fused.domain,
      overview: fused.overview,
      decisionMakers: fused.decisionMakers,
      engineering: fused.engineering,
      growth,
      productHunt,
      reddit,
      linkedin,
      opportunityScoring: scoring,
      recommendedServices: recs,
      // Keep what the team did with this company (deal created, sent to review) when the profile is rebuilt.
      timeline: [...(cached?.profile.timeline || []).filter((t) => t.source === 'CRM' || t.source === 'Cross-Provider'), ...fused.timeline],
      executiveBriefing: briefing,
      crmActivity: {
        currentStage: 'New Prospect',
        assignedBde: '',
        totalDealsCount: 0,
        openDealsValueInr: '₹0',
      },
      provenance: {
        companyName: 'Apollo',
        opportunityScore: 'AI',
      },
    };

    await saveProfile(newProfile);
    return newProfile;
  } catch (err: unknown) {
    logger.error('Failed to get Company 360 Profile', { error: String(err) });
    throw new AppError('Failed to retrieve Company 360 profile.', 500);
  }
}

/**
 * Search Companies across Company 360 Database.
 */
export async function searchCompanies360(query?: string): Promise<Company360SearchResult[]> {
  try {
    await AuthService.verifySession();

    // Searching for a company the team has not opened yet builds (and caches) its profile.
    if (query && query.trim().length > 0) {
      const q = query.trim();
      if (!(await readCachedProfile(q, normalizeCompanyDomain(q)).catch(() => null))) {
        await getCompany360Profile(q).catch(() => null);
      }
    }

    const rows = await db.companyProfileCache.findMany({ orderBy: { updatedAt: 'desc' }, take: 500 });
    // Profiles built the old way carried invented scores; they are rebuilt when opened, and left out until then.
    const uniqueProfiles: Company360Profile[] = rows
      .map((r) => r.data as unknown as Company360Profile & { profileVersion?: number })
      .filter((p) => p.profileVersion === PROFILE_VERSION);

    let filtered = uniqueProfiles;
    if (query && query.trim().length > 0) {
      const q = query.toLowerCase();
      filtered = uniqueProfiles.filter(p => 
        p.overview.companyName.toLowerCase().includes(q) ||
        p.domain.toLowerCase().includes(q) ||
        p.overview.industry.toLowerCase().includes(q)
      );
    }

    return filtered.map(p => ({
      companyId: p.companyId,
      companyName: p.overview.companyName,
      domain: p.domain,
      industry: p.overview.industry,
      headquarters: p.overview.headquarters,
      employeeCount: p.overview.employeeCount,
      opportunityScore: p.opportunityScoring.overallScore,
      engineeringMaturity: p.engineering.engineeringMaturityScore,
      sourcesAvailable: ['Apollo', 'GitHub', 'CRM', 'AI'],
    }));
  } catch (err: unknown) {
    logger.error('Failed to search Company 360 database', { error: String(err) });
    throw new AppError('Company 360 search failed.', 500);
  }
}

/**
 * Create CRM Opportunity directly from Company 360 Profile.
 */
export async function createCrmDealFromCompany360(companyId: string, serviceName?: string) {
  try {
    await AuthService.verifySession();
    const profile = await getCompany360Profile(companyId);

    const dealTitle = serviceName 
      ? `${profile.overview.companyName} — ${serviceName}` 
      : `${profile.overview.companyName} Enterprise Deal`;

    const result = await createCrmDealForCompany({
      companyName: profile.overview.companyName,
      domain: profile.overview?.websiteUrl || profile.domain,
      title: dealTitle,
      location: profile.overview?.headquarters,
      industry: profile.overview?.industry,
      technologies: profile.engineering?.primaryLanguages,
    });

    // Append to Company Timeline
    profile.timeline.unshift({
      id: `tl_${Date.now()}`,
      timestamp: 'Just now',
      eventType: 'CRM_MEETING_LOGGED',
      title: 'CRM Deal & Account Created',
      description: `Created Enterprise CRM Deal '${dealTitle}' in stage 'Qualified Lead'`,
      source: 'CRM',
    });

    profile.crmActivity.totalDealsCount += 1;
    profile.crmActivity.currentStage = 'Qualified Lead';
    await saveProfile(profile);

    safeRevalidatePath('/company');
    safeRevalidatePath('/crm');

    return {
      success: true,
      dealId: result.dealId,
      message: result.created
        ? `Created a CRM deal for '${profile.overview.companyName}'.`
        : `'${profile.overview.companyName}' already has an open CRM deal (${result.ownerName ? `owner: ${result.ownerName}` : 'unassigned'}).`,
    };
  } catch (err: unknown) {
    logger.error('Failed to create CRM deal from Company 360', { error: String(err) });
    throw new AppError('Failed to create CRM deal.', 500);
  }
}

/**
 * Dispatch Company 360 to Review Queue.
 */
export async function sendCompany360ToReviewQueue(companyId: string) {
  try {
    await AuthService.verifySession();
    const profile = await getCompany360Profile(companyId);

    const cto = profile.decisionMakers[0];
    const companyDesc = profile.overview.companyDescription || `Company 360 profile for ${profile.overview.companyName} (${profile.overview.industry || 'Technology & Software'}).`;
    const dealBudget = profile.opportunityScoring?.estimatedDealSizeUsd || '';

    const result = await sendMarketplaceProjectToReviewQueue({
      title: `Company 360 Lead: ${profile.overview.companyName}`,
      clientName: `${profile.overview.companyName} (${cto ? cto.name : 'CTO'})`,
      postUrl: profile.overview.websiteUrl || `https://company360.lead/${profile.companyId}`,
      budget: dealBudget,
      techStack: profile.engineering?.primaryLanguages || ['React.js', 'Node.js'],
      description: companyDesc,
    });

    profile.timeline.unshift({
      id: `tl_${Date.now()}`,
      timestamp: 'Just now',
      eventType: 'REVIEW_QUEUE_ADDED',
      title: 'Dispatched to Review Queue',
      description: `Company profile sent to Review Queue for BDE approval.`,
      source: 'Cross-Provider',
    });
    await saveProfile(profile);

    safeRevalidatePath('/company');
    safeRevalidatePath('/review');

    return {
      success: true,
      created: result.created,
      message: result.created ? `Dispatched '${profile.overview.companyName}' to Review Queue!` : `'${profile.overview.companyName}' is already in Review Queue.`,
    };
  } catch (err: unknown) {
    logger.error('Failed to send Company 360 to Review Queue', { error: String(err) });
    throw new AppError('Failed to send to Review Queue.', 500);
  }
}
