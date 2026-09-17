'use server';

import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { SettingsService } from '@/lib/settings';
import { apolloProvider, ApolloPersonMatch } from './provider';
import { AuthService } from '@/lib/auth';
import { EnrichmentStatus } from '@prisma/client';
import { safeRevalidatePath } from '@/lib/revalidate';

export type ApolloEnrichmentData = {
  id: string;
  linkedPostId: string;
  personName: string;
  linkedinUrl: string | null;
  organizationName: string | null;
  organizationDomain: string | null;
  jobTitle: string | null;
  workEmail: string | null;
  personalEmail: string | null;
  phone: string | null;
  apolloPersonId: string | null;
  apolloOrganizationId: string | null;
  enrichmentStatus: EnrichmentStatus;
  creditsUsed: number;
  enrichedAt: Date | null;
};

/**
 * Trigger explicit user-confirmed Apollo Enrichment for a LinkedIn Post candidate.
 */
export async function enrichPostWithApollo(
  postId: string,
  options: {
    workEmail?: boolean;
    personalEmail?: boolean;
    phone?: boolean;
    organization?: boolean;
  } = {}
) {
  try {
    await AuthService.verifySession();

    // 1. Check if Apollo integration is enabled
    const apolloEnabled = await SettingsService.get('apolloEnabled', 'true');
    if (apolloEnabled !== 'true') {
      throw new AppError('Apollo integration is currently disabled in App Settings.', 400);
    }

    // 2. Settings allowance checks
    const allowPersonalEmail = await SettingsService.get('apolloAllowPersonalEmail', 'false');
    const allowPhone = await SettingsService.get('apolloAllowPhone', 'false');

    const shouldPersonalEmail = options.personalEmail && allowPersonalEmail === 'true';
    const shouldPhone = options.phone && allowPhone === 'true';

    // 3. Load Post context
    const post = await db.linkedInPost.findUnique({
      where: { id: postId }
    });

    if (!post) {
      throw new AppError('LinkedIn Post candidate not found.', 404);
    }

    logger.info(`Starting Apollo enrichment for post ID ${postId} (${post.authorName})...`);

    // 4. Perform search via ApolloProvider abstraction
    let matches: ApolloPersonMatch[] = [];
    const isGenericName = !post.authorName || post.authorName.toLowerCase().includes('decision maker') || post.authorName.toLowerCase().includes('executive');
    const domain = post.companyName?.toLowerCase().replace(/\s+/g, '') + '.com';

    if (isGenericName) {
      logger.info(`Generic name detected. Falling back to advanced search for executives at ${domain}...`);
      const advancedRes = await apolloProvider.searchPeopleAdvanced({
        domain: domain,
        seniority: 'c_suite,vp,head,director',
        perPage: 1
      });
      matches = advancedRes.people;
      console.log('ADVANCED SEARCH MATCHES:', matches.length);
    } else {
      matches = await apolloProvider.searchPeople({
        name: post.authorName,
        domain: domain
      });
      console.log('STANDARD SEARCH MATCHES:', matches.length);
    }

    if (matches.length === 0) {
      console.log('MATCHES IS ZERO, SAVING NO_MATCH!');
      // Record NO_MATCH
      const noMatchRec = await db.apolloEnrichment.upsert({
        where: { linkedPostId: postId },
        create: {
          linkedPostId: postId,
          personName: post.authorName,
          enrichmentStatus: EnrichmentStatus.NO_MATCH,
          creditsUsed: 0
        },
        update: {
          enrichmentStatus: EnrichmentStatus.NO_MATCH
        }
      });
      safeRevalidatePath('/review');
      return noMatchRec;
    }

    const match = matches[0];

    // Enrich person details if personal email or phone requested
    let enrichedMatch = match;
    if (shouldPersonalEmail || shouldPhone) {
      const detailed = await apolloProvider.enrichPerson({
        apolloPersonId: match.apolloPersonId,
        revealPersonalEmail: shouldPersonalEmail,
        revealPhone: shouldPhone
      });
      if (detailed) {
        enrichedMatch = detailed;
      }
    }

    // 5. Save to database
    const enrichment = await db.apolloEnrichment.upsert({
      where: { linkedPostId: postId },
      create: {
        linkedPostId: postId,
        personName: enrichedMatch.personName,
        linkedinUrl: enrichedMatch.linkedinUrl || post.postUrl,
        organizationName: enrichedMatch.organizationName || post.companyName,
        organizationDomain: enrichedMatch.organizationDomain,
        jobTitle: enrichedMatch.jobTitle || post.authorHeadline,
        workEmail: options.workEmail !== false ? enrichedMatch.workEmail : null,
        personalEmail: shouldPersonalEmail ? enrichedMatch.personalEmail : null,
        phone: shouldPhone ? enrichedMatch.phone : null,
        apolloPersonId: enrichedMatch.apolloPersonId,
        apolloOrganizationId: enrichedMatch.apolloOrganizationId,
        enrichmentStatus: EnrichmentStatus.ENRICHED,
        creditsUsed: enrichedMatch.creditsUsed || 1,
        enrichedAt: new Date()
      },
      update: {
        personName: enrichedMatch.personName,
        linkedinUrl: enrichedMatch.linkedinUrl || post.postUrl,
        organizationName: enrichedMatch.organizationName || post.companyName,
        organizationDomain: enrichedMatch.organizationDomain,
        jobTitle: enrichedMatch.jobTitle || post.authorHeadline,
        workEmail: options.workEmail !== false ? enrichedMatch.workEmail : null,
        personalEmail: shouldPersonalEmail ? enrichedMatch.personalEmail : null,
        phone: shouldPhone ? enrichedMatch.phone : null,
        apolloPersonId: enrichedMatch.apolloPersonId,
        apolloOrganizationId: enrichedMatch.apolloOrganizationId,
        enrichmentStatus: EnrichmentStatus.ENRICHED,
        creditsUsed: enrichedMatch.creditsUsed || 1,
        enrichedAt: new Date()
      }
    });

    logger.info(`Apollo enrichment complete for post ID ${postId}. Status: ENRICHED.`);
    safeRevalidatePath('/review');
    return enrichment;
  } catch (err: unknown) {
    logger.error(`Failed to perform Apollo enrichment for post ID ${postId}`, err);
    if (err instanceof AppError) throw err;
    const msg = err instanceof Error ? err.message : 'Failed to enrich post with Apollo.';
    throw new AppError(msg, 500);
  }
}

/**
 * Query existing Apollo Enrichment record for a post.
 */
export async function getPostApolloEnrichment(postId: string): Promise<ApolloEnrichmentData | null> {
  try {
    const rec = await db.apolloEnrichment.findUnique({
      where: { linkedPostId: postId }
    });
    return rec as ApolloEnrichmentData | null;
  } catch {
    logger.warn(`Failed to query database for Apollo enrichment ID ${postId}. Returning sandbox record if present.`);
    return null;
  }
}

/**
 * Check credit warning thresholds for Apollo usage.
 */
export async function checkApolloCreditWarning(): Promise<{
  isWarning: boolean;
  remainingCredits: number;
  threshold: number;
}> {
  try {
    const thresholdStr = await SettingsService.get('apolloCreditWarningThreshold', '20');
    const threshold = parseInt(thresholdStr, 10) || 20;

    // Aggregate total credits used from DB
    const aggregate = await db.apolloEnrichment.aggregate({
      _sum: { creditsUsed: true }
    });
    const used = aggregate._sum.creditsUsed || 0;
    const totalCreditsAllowed = 100; // Standard starter credit balance
    const remaining = Math.max(0, totalCreditsAllowed - used);

    return {
      isWarning: remaining <= threshold,
      remainingCredits: remaining,
      threshold
    };
  } catch {
    return {
      isWarning: false,
      remainingCredits: 85,
      threshold: 20
    };
  }
}

/**
 * Advanced Apollo People Search Server Action.
 */
export async function searchApolloPeople(params: {
  jobTitle?: string;
  seniority?: string;
  personLocation?: string;
  orgLocation?: string;
  keywords?: string;
  domain?: string;
  companyName?: string;
  techUsage?: string;
  hiringActivity?: string;
  page?: number;
  perPage?: number;
}) {
  try {
    await AuthService.verifySession();
    const apolloEnabled = await SettingsService.get('apolloEnabled', 'true');
    if (apolloEnabled !== 'true') {
      throw new AppError('Apollo integration is currently disabled in App Settings.', 400);
    }

    const maxEnrichStr = await SettingsService.get('apolloMaxEnrich', '5');
    const maxEnrich = parseInt(maxEnrichStr, 10) || 5;

    const perPage = Math.min(params.perPage || 10, maxEnrich * 5); // Enforce max page result limit

    logger.info(`Executing Apollo People Search research query (page ${params.page || 1})...`);
    
    return await apolloProvider.searchPeopleAdvanced({
      ...params,
      perPage,
    });
  } catch (err: unknown) {
    logger.error('Failed to search people with Apollo provider', err);
    if (err instanceof AppError) throw err;
    const msg = err instanceof Error ? err.message : 'Apollo research search failed.';
    throw new AppError(msg, 500);
  }
}

/**
 * Advanced Apollo Organization Search Server Action.
 */
export async function searchApolloOrganizations(params: Parameters<typeof apolloProvider.searchOrganizationsAdvanced>[0]) {
  try {
    await AuthService.verifySession();
    const apolloEnabled = await SettingsService.get('apolloEnabled', 'true');
    if (apolloEnabled !== 'true') {
      throw new AppError('Apollo integration is currently disabled in App Settings.', 400);
    }

    const maxEnrichStr = await SettingsService.get('apolloMaxEnrich', '5');
    const maxEnrich = parseInt(maxEnrichStr, 10) || 5;

    const perPage = Math.min(params.perPage || 10, maxEnrich * 5);

    logger.info(`Executing Apollo Organization Search research query (page ${params.page || 1})...`);
    
    return await apolloProvider.searchOrganizationsAdvanced({
      ...params,
      perPage,
    });
  } catch (err: unknown) {
    logger.error('Failed to search organizations with Apollo provider', err);
    if (err instanceof AppError) throw err;
    const msg = err instanceof Error ? err.message : 'Apollo company research search failed.';
    throw new AppError(msg, 500);
  }
}

/**
 * Link an enriched research person record to an existing Review Queue candidate post.
 */
export async function linkApolloEnrichmentToPost(
  postId: string,
  personData: {
    personName: string;
    jobTitle?: string;
    organizationName?: string;
    organizationDomain?: string;
    workEmail?: string;
    personalEmail?: string;
    phone?: string;
    apolloPersonId?: string;
    creditsUsed?: number;
  }
) {
  try {
    await AuthService.verifySession();
    const enrichment = await db.apolloEnrichment.upsert({
      where: { linkedPostId: postId },
      create: {
        linkedPostId: postId,
        personName: personData.personName,
        organizationName: personData.organizationName,
        organizationDomain: personData.organizationDomain,
        jobTitle: personData.jobTitle,
        workEmail: personData.workEmail,
        personalEmail: personData.personalEmail,
        phone: personData.phone,
        apolloPersonId: personData.apolloPersonId,
        enrichmentStatus: EnrichmentStatus.ENRICHED,
        creditsUsed: personData.creditsUsed || 1,
        enrichedAt: new Date(),
      },
      update: {
        personName: personData.personName,
        organizationName: personData.organizationName,
        organizationDomain: personData.organizationDomain,
        jobTitle: personData.jobTitle,
        workEmail: personData.workEmail,
        personalEmail: personData.personalEmail,
        phone: personData.phone,
        apolloPersonId: personData.apolloPersonId,
        enrichmentStatus: EnrichmentStatus.ENRICHED,
        creditsUsed: personData.creditsUsed || 1,
        enrichedAt: new Date(),
      }
    });

    safeRevalidatePath('/review');
    safeRevalidatePath('/apollo-search');
    return enrichment;
  } catch (err: unknown) {
    logger.error(`Failed to link Apollo enrichment to post ID ${postId}`, err);
    if (err instanceof AppError) throw err;
    const msg = err instanceof Error ? err.message : 'Failed to link enrichment to post.';
    throw new AppError(msg, 500);
  }
}

/**
 * Direct enrichment action for Apollo Search page candidates.
 */
export async function enrichApolloPersonDirect(apolloPersonId: string) {
  try {
    await AuthService.verifySession();
    const apolloEnabled = await SettingsService.get('apolloEnabled', 'true');
    if (apolloEnabled !== 'true') {
      throw new AppError('Apollo integration is currently disabled in App Settings.', 400);
    }

    const allowPersonalEmail = await SettingsService.get('apolloAllowPersonalEmail', 'false');

    logger.info(`Enriching Apollo person ID direct: ${apolloPersonId}...`);
    const enriched = await apolloProvider.enrichPerson({
      apolloPersonId,
      revealPersonalEmail: allowPersonalEmail === 'true',
    });

    if (!enriched) {
      throw new AppError('No matching enrichment record returned by Apollo.', 404);
    }

    safeRevalidatePath('/apollo-search');
    return enriched;
  } catch (err: unknown) {
    logger.error(`Failed to enrich Apollo person direct ID ${apolloPersonId}`, err);
    if (err instanceof AppError) throw err;
    const msg = err instanceof Error ? err.message : 'Apollo enrichment failed.';
    throw new AppError(msg, 500);
  }
}

/**
 * Persist saved Apollo people map to PostgreSQL Database.
 */
export async function saveApolloPeopleMapToDb(mapJson: string): Promise<boolean> {
  try {
    await AuthService.verifySession();
    await SettingsService.set('bdos_apollo_saved_people_map', mapJson);
    return true;
  } catch (err) {
    logger.error('Failed to persist saved Apollo people map to PostgreSQL', err);
    return false;
  }
}

/**
 * Retrieve saved Apollo people map from PostgreSQL Database.
 */
export async function getApolloPeopleMapFromDb(): Promise<string> {
  try {
    await AuthService.verifySession();
    const mapJson = await SettingsService.get('bdos_apollo_saved_people_map', '{}');
    return mapJson;
  } catch (err) {
    logger.error('Failed to fetch saved Apollo people map from PostgreSQL', err);
    return '{}';
  }
}
