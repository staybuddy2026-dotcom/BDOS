'use server';

import { AuthService } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { Company360Profile, Company360SearchResult, CompanyOverviewData, DecisionMakerContact } from './types';
import { GrowthIntelligenceData } from '../crunchbase/types';
import { LinkedInIntelligenceData } from '../linkedin/types';
import { fuseCompanyProfiles, normalizeCompanyDomain } from './merge';
import { getMigratedCompaniesFromDbAction } from '../discovery/actions';
import { calculateAiOpportunityScore, generateRecommendedServices, generateExecutiveBriefing } from './scoring';
import { createCrmDealFromMarketplaceOpportunity } from '@/features/crm/actions';
import { sendMarketplaceProjectToReviewQueue } from '@/features/marketplace/actions';
import { safeRevalidatePath } from '@/lib/revalidate';

// Curated Master Company Store
const masterCompanyStore: Map<string, Company360Profile> = new Map();

function initializeMasterCompanyStore() {
  // Master Store initialized empty
}

/**
 * Fetch Unified Company 360 Profile by Company ID or Domain.
 */
export async function getCompany360Profile(companyIdOrDomain: string): Promise<Company360Profile> {
  try {
    await AuthService.verifySession();
    initializeMasterCompanyStore();

    logger.info(`Fetching Company 360 Master Profile for query: '${companyIdOrDomain}'...`);

    const cleaned = normalizeCompanyDomain(companyIdOrDomain);
    const existing = masterCompanyStore.get(companyIdOrDomain) || masterCompanyStore.get(cleaned);

    const { DefaultApolloProvider } = await import('@/features/apollo/provider');
    const apolloProvider = new DefaultApolloProvider();

    // Fetch actual Apollo Data
    const apolloRes = await apolloProvider.searchOrganizationsAdvanced({
      name: cleaned, // fallback
      perPage: 1
    }).catch(() => null);

    interface ApolloOrgData {
      name?: string;
      latestFundingStage?: string;
      latestFundingAmount?: number;
      latestFundingDate?: string;
      openJobsCount?: number;
      estimatedNumEmployees?: string;
    }
    
    let orgData: ApolloOrgData | null = null;
    if (apolloRes && apolloRes.organizations && apolloRes.organizations.length > 0) {
       orgData = apolloRes.organizations[0] as ApolloOrgData;
    }

    if (existing) {
      if (orgData) {
        existing.growth = {
          latestRoundName: orgData.latestFundingStage || 'Undisclosed',
          latestRoundAmountUsd: orgData.latestFundingAmount ? `$${Number(orgData.latestFundingAmount).toLocaleString()}` : 'Undisclosed',
          growthOpportunityScore: orgData.latestFundingDate ? 95 : 75
        } as GrowthIntelligenceData;
        existing.linkedin = {
          activeJobOpeningsCount: orgData.openJobsCount || 0,
          engineeringExpansionIndex: (orgData.openJobsCount || 0) > 0 ? 90 : 70
        } as LinkedInIntelligenceData;
      }
      return existing;
    }

    // Dynamic identity resolution fallback for unknown query
    const companyName = orgData?.name || companyIdOrDomain.replace(/comp_/, '').replace(/-/g, ' ').toUpperCase();
    
    // Fetch actual migrated data from Universal Search
    const dbLeadsData = await getMigratedCompaniesFromDbAction().catch(() => null);
    const migratedLead = dbLeadsData?.migratedLeadsMap?.[cleaned] || dbLeadsData?.migratedLeadsMap?.[companyIdOrDomain];

    let growth: GrowthIntelligenceData | undefined = undefined;
    let linkedin: LinkedInIntelligenceData | undefined = undefined;

    if (orgData) {
      growth = {
        latestRoundName: orgData.latestFundingStage || 'Undisclosed',
        latestRoundAmountUsd: orgData.latestFundingAmount ? `$${Number(orgData.latestFundingAmount).toLocaleString()}` : 'Undisclosed',
        growthOpportunityScore: orgData.latestFundingDate ? 95 : 75
      } as GrowthIntelligenceData;
      linkedin = {
        activeJobOpeningsCount: orgData.openJobsCount || 0,
        engineeringExpansionIndex: (orgData.openJobsCount || 0) > 0 ? 90 : 70
      } as LinkedInIntelligenceData;
    }

    const productHunt = undefined; // disabled
    const reddit = undefined; // disabled

    const apolloSeed: Partial<CompanyOverviewData> & { decisionMakers?: DecisionMakerContact[] } = {
      companyName: migratedLead?.companyName || (companyName as string),
      domain: cleaned,
    };

    if (migratedLead) {
      apolloSeed.industry = migratedLead.industry;
      apolloSeed.headquarters = migratedLead.country;
      apolloSeed.employeeCount = migratedLead.employeeCount;
      apolloSeed.fundingStage = migratedLead.fundingSummary;
      
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
            email: migratedLead.contactEmail || `contact@${cleaned}`,
            emailStatus: 'Verified',
            linkedinUrl: migratedLead.contactLinkedinUrl || `https://linkedin.com/company/${cleaned}`,
            source: 'Apollo'
          }
        ];
      }
    }

    if (orgData && !apolloSeed.employeeCount) {
        apolloSeed.employeeCount = orgData.estimatedNumEmployees ? parseInt(orgData.estimatedNumEmployees) : 0;
    }

    if (!apolloSeed.decisionMakers || apolloSeed.decisionMakers.length === 0) {
      try {
        const peopleRes = await apolloProvider.searchPeopleAdvanced({
          domain: cleaned,
          perPage: 3
        });
        if (peopleRes && peopleRes.people && peopleRes.people.length > 0) {
          apolloSeed.decisionMakers = peopleRes.people.filter(p => !p.personName.toLowerCase().includes('decision maker')).map((p, idx) => ({
            id: `dm_${cleaned}_${idx}`,
            name: p.personName,
            jobTitle: p.jobTitle || 'Executive',
            department: 'Engineering',
            seniority: (p.seniority as "Manager" | "Director" | "C-Level" | "VP" | "Lead") || 'Director',
            email: p.hasEmailAvailable ? `${p.personName.split(' ')[0].toLowerCase()}@${cleaned}` : `contact@${cleaned}`,
            emailStatus: p.hasEmailAvailable ? 'Verified' : 'Unverified',
            linkedinUrl: p.linkedinUrl || `https://linkedin.com/company/${cleaned}`,
            source: 'Apollo'
          }));
        }
      } catch (err) {
        logger.error('Failed to fetch real decision makers for company360', err);
      }
    }

    const fused = fuseCompanyProfiles(apolloSeed, undefined, growth, productHunt, reddit, linkedin);
    const scoring = calculateAiOpportunityScore(fused.overview, fused.engineering, fused.decisionMakers, growth, productHunt, reddit, linkedin);
    const recs = generateRecommendedServices(fused.engineering);
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
      timeline: fused.timeline,
      executiveBriefing: briefing,
      crmActivity: {
        currentStage: 'New Prospect',
        assignedBde: 'Akash (Lead BDE)',
        totalDealsCount: 0,
        openDealsValueInr: '₹0',
      },
      provenance: {
        companyName: 'Apollo',
        opportunityScore: 'AI',
      },
    };

    masterCompanyStore.set(newProfile.companyId, newProfile);
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
    initializeMasterCompanyStore();

    if (query && query.trim().length > 0) {
      const q = query.trim();
      const existing = masterCompanyStore.get(q) || masterCompanyStore.get(normalizeCompanyDomain(q));
      if (!existing) {
        try {
          await getCompany360Profile(q);
        } catch {
          // Dynamic fallback
        }
      }
    }

    const uniqueProfiles: Company360Profile[] = Array.from(new Set(masterCompanyStore.values()));

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
    initializeMasterCompanyStore();

    const profile = await getCompany360Profile(companyId);

    const dealTitle = serviceName 
      ? `${profile.overview.companyName} — ${serviceName}` 
      : `${profile.overview.companyName} Enterprise Deal`;

    const result = await createCrmDealFromMarketplaceOpportunity({
      projectTitle: dealTitle,
      clientCountry: profile.overview?.headquarters || 'Global Client',
      budget: profile.opportunityScoring?.estimatedDealSizeUsd || '$50,000',
      technologyStack: profile.engineering?.primaryLanguages || ['React.js', 'Node.js'],
      projectUrl: profile.overview?.websiteUrl || `https://company360.lead/${profile.companyId}`,
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

    safeRevalidatePath('/company');
    safeRevalidatePath('/crm');

    return {
      success: true,
      dealId: result.dealId,
      message: `Created Enterprise CRM Deal for '${profile.overview.companyName}'!`,
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
    const dealBudget = profile.opportunityScoring?.estimatedDealSizeUsd || '$35,000';

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
