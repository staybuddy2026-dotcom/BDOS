'use server';

import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { SettingsService } from '@/lib/settings';
import { apolloProvider, ApolloPersonMatch, ApolloSearchParams, ApolloOrgSearchParams, ApolloUsageEndpoint, ApolloErrorInfo, getLastApolloErrors, normalizeDomain, isApolloConfigured } from './provider';
import { getSavedPeople } from '@/features/prospecting/service';
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

const GENERIC_HOSTS = /(^|\.)(linkedin\.com|apollo\.io|twitter\.com|x\.com|facebook\.com|google\.com)$/i;

/** Company domain for a post: saved enrichment, then linkedin.com/company/<domain.tld> URLs, then a last-resort guess. */
function resolvePostDomain(postUrl: string, savedDomain?: string | null, companyName?: string | null): string | undefined {
  const saved = normalizeDomain(savedDomain || undefined);
  if (saved && !GENERIC_HOSTS.test(saved)) return saved;
  const fromUrl = postUrl.match(/linkedin\.com\/company\/([a-z0-9-]+\.[a-z.]{2,})/i)?.[1];
  if (fromUrl) return fromUrl.toLowerCase();
  const slug = companyName?.toLowerCase().replace(/\(.*?\)|\b(inc|llc|ltd|gmbh|pvt|limited|corp|co)\b\.?/g, '').replace(/[^a-z0-9]/g, '');
  if (!slug || /^(organization|company|unknown)/.test(slug)) return undefined;
  if (/\.[a-z]{2,}$/.test(companyName || '')) return normalizeDomain(companyName || undefined);
  return `${slug}.com`;
}

/** True when the Apollo person belongs to the expected company (by domain or a close name match). */
function personMatchesCompany(person: ApolloPersonMatch, domain: string, companyName?: string | null): boolean {
  if (person.organizationDomain && normalizeDomain(person.organizationDomain) === domain) return true;
  const norm = (v?: string | null) => (v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const a = norm(person.organizationName);
  const b = norm(companyName);
  const host = domain.split('.')[0];
  return !!a && ((!!b && (a.includes(b) || b.includes(a))) || a.includes(host) || host.includes(a));
}

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

    // 4. Resolve the company's real domain (never guess "<name>.com" when we know better)
    const existing = await db.apolloEnrichment.findUnique({ where: { linkedPostId: postId } });
    const domain = resolvePostDomain(post.postUrl, existing?.organizationDomain, post.companyName);
    if (!domain) {
      throw new AppError(`Could not determine the company domain for "${post.companyName || post.authorName}". Add it via Apollo Search and link the contact instead.`, 400);
    }

    let matches: ApolloPersonMatch[] = [];
    const isGenericName = !post.authorName || /decision maker|executive/i.test(post.authorName);

    if (isGenericName) {
      logger.info(`Generic name detected. Searching for senior leaders at ${domain}...`);
      const advancedRes = await apolloProvider.searchPeopleAdvanced({
        domain,
        seniority: 'owner,founder,c_suite,vp,head,director',
        perPage: 5,
      });
      if (advancedRes.error) throw new AppError(advancedRes.error.message, 502);
      matches = advancedRes.people;
    } else {
      matches = await apolloProvider.searchPeople({ name: post.authorName, domain });
      const err = getLastApolloErrors().find((e) => e.endpoint === 'people/match');
      if (!matches.length && err && Date.now() - new Date(err.at).getTime() < 60000) throw new AppError(err.message, 502);
    }

    // Only accept people who actually work at this company.
    matches = matches.filter((m) => personMatchesCompany(m, domain, post.companyName));

    if (matches.length === 0) {
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

    // The free search never includes emails; reveal them via people/match (uses 1 Apollo credit).
    let enrichedMatch: ApolloPersonMatch = { ...match, organizationDomain: match.organizationDomain || domain };
    let revealNote: string | undefined;
    const wantsWorkEmail = options.workEmail !== false && !match.workEmail;
    if (wantsWorkEmail || shouldPersonalEmail || shouldPhone) {
      const detailed = await apolloProvider.enrichPerson({
        apolloPersonId: match.apolloPersonId,
        name: match.personName,
        domain,
        revealPersonalEmail: shouldPersonalEmail,
        revealPhone: shouldPhone,
      });
      if (detailed) {
        enrichedMatch = { ...enrichedMatch, ...Object.fromEntries(Object.entries(detailed).filter(([, v]) => v !== undefined)) } as ApolloPersonMatch;
      } else {
        revealNote = getLastApolloErrors().find((e) => e.endpoint === 'people/match')?.message;
        enrichedMatch.creditsUsed = 0;
      }
    }
    if (revealNote) logger.warn(`Apollo contact reveal unavailable for post ${postId}: ${revealNote}`);

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
        creditsUsed: enrichedMatch.creditsUsed ?? 0,
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
        creditsUsed: enrichedMatch.creditsUsed ?? 0,
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

export type ApolloCreditWarning = {
  isWarning: boolean;
  /** Real calls left today for Apollo people search (-1 when Apollo did not report usage). */
  remainingCredits: number;
  threshold: number;
  message?: string;
};

/**
 * Real Apollo quota status: daily calls left (from Apollo's usage API) plus any active limit/credit error.
 */
export async function checkApolloCreditWarning(): Promise<ApolloCreditWarning> {
  try {
    const usage = await apolloProvider.getUsage();
    const people = usage?.find((u) => u.endpoint === 'mixed_people/api_search');
    // Ignore impossible thresholds (e.g. larger than the daily limit), which would keep the warning on forever.
    const rawThreshold = parseInt(await SettingsService.get('apolloCreditWarningThreshold', '20'), 10);
    const threshold = rawThreshold > 0 && (!people || rawThreshold < people.dayLimit) ? rawThreshold : 20;
    const blocking = getLastApolloErrors().find((e) => e.code === 'RATE_LIMIT' || e.code === 'CREDITS_EXHAUSTED' || e.code === 'INVALID_KEY');
    const remaining = people ? people.dayLeft : -1;
    return {
      isWarning: !!blocking || (remaining >= 0 && remaining <= threshold),
      remainingCredits: remaining,
      threshold,
      message: blocking?.message || (people && remaining <= threshold ? `Only ${remaining} of ${people.dayLimit} Apollo people searches left today.` : undefined),
    };
  } catch {
    return { isWarning: false, remainingCredits: -1, threshold: 20 };
  }
}

export type ApolloStatus = {
  configured: boolean;
  enabled: boolean;
  healthy: boolean;
  message: string;
  usage: ApolloUsageEndpoint[];
  errors: ApolloErrorInfo[];
};

/**
 * Full Apollo connection status for settings / provider panels.
 */
export async function getApolloStatusAction(): Promise<ApolloStatus> {
  await AuthService.verifySession();
  const enabled = (await SettingsService.get('apolloEnabled', 'true')) === 'true';
  const configured = await isApolloConfigured();
  if (!configured) {
    return { configured, enabled, healthy: false, message: 'Apollo API key is not configured.', usage: [], errors: [] };
  }
  const [health, usage] = await Promise.all([apolloProvider.checkHealth(), apolloProvider.getUsage()]);
  return { configured, enabled, healthy: health.ok, message: health.message, usage: usage || [], errors: getLastApolloErrors() };
}

async function assertApolloEnabled() {
  const apolloEnabled = await SettingsService.get('apolloEnabled', 'true');
  if (apolloEnabled !== 'true') {
    throw new AppError('Apollo integration is currently disabled in App Settings.', 400);
  }
}

async function maxPerPage(requested?: number) {
  const maxEnrich = parseInt(await SettingsService.get('apolloMaxEnrich', '5'), 10) || 5;
  return Math.min(requested || 10, Math.max(maxEnrich * 5, 10), 100);
}

/**
 * Advanced Apollo People Search Server Action.
 * Apollo problems (limits, credits) come back in `error` so the page can show the real reason.
 */
export async function searchApolloPeople(params: ApolloSearchParams) {
  await AuthService.verifySession();
  await assertApolloEnabled();
  logger.info(`Executing Apollo People Search (page ${params.page || 1})...`);
  return apolloProvider.searchPeopleAdvanced({ ...params, perPage: await maxPerPage(params.perPage) });
}

/**
 * Advanced Apollo Organization Search Server Action.
 */
export async function searchApolloOrganizations(params: ApolloOrgSearchParams) {
  await AuthService.verifySession();
  await assertApolloEnabled();
  logger.info(`Executing Apollo Organization Search (page ${params.page || 1})...`);
  return apolloProvider.searchOrganizationsAdvanced({ ...params, perPage: await maxPerPage(params.perPage) });
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
        creditsUsed: personData.creditsUsed ?? 0,
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
        creditsUsed: personData.creditsUsed ?? 0,
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
 * Direct enrichment action for Apollo Search page candidates (uses Apollo credits).
 * Returns `error` instead of throwing so the real reason reaches the UI (server errors are redacted in production).
 */
export async function enrichApolloPersonDirect(
  person: string | { apolloPersonId: string; personName?: string; organizationDomain?: string; organizationName?: string }
): Promise<{ person: ApolloPersonMatch | null; error?: string }> {
  const user = await AuthService.verifySession();
  await assertApolloEnabled();
  const p = typeof person === 'string' ? { apolloPersonId: person } : person;
  const allowPersonalEmail = (await SettingsService.get('apolloAllowPersonalEmail', 'false')) === 'true';

  logger.info(`Enriching Apollo person ${p.apolloPersonId}...`);
  const enriched = await apolloProvider.enrichPerson({
    apolloPersonId: p.apolloPersonId,
    name: p.personName,
    domain: p.organizationDomain,
    organizationName: p.organizationName,
    revealPersonalEmail: allowPersonalEmail,
  });

  if (!enriched) {
    const err = getLastApolloErrors().find((e) => e.endpoint === 'people/match' && Date.now() - new Date(e.at).getTime() < 60000);
    return { person: null, error: err?.message || 'Apollo has no contact details for this person.' };
  }
  // The credit is spent once Apollo answers, whether or not it had contact details: keep a record of who used it.
  const found = [enriched.workEmail && 'work email', enriched.personalEmail && 'personal email', enriched.phone && 'phone'].filter(Boolean);
  await db.activityLog.create({
    data: {
      type: 'APOLLO_ENRICHED',
      title: `Apollo enrichment: ${enriched.personName || p.personName || p.apolloPersonId}`,
      details: `1 credit. ${found.length ? `Found ${found.join(', ')}.` : 'No contact details on file.'}${enriched.organizationName ? ` Company: ${enriched.organizationName}.` : ''}`,
      entityId: p.apolloPersonId,
      actor: user.name,
    },
  }).catch((err) => logger.warn('Could not record Apollo credit usage', { error: String(err) }));

  if (!found.length) {
    return { person: enriched, error: 'Apollo matched this person but has no email or phone on file.' };
  }
  safeRevalidatePath('/apollo-search');
  return { person: enriched };
}

/** The signed-in person's saved Apollo contacts as a JSON map (key -> person). Used by prioritization. */
export async function getApolloPeopleMapFromDb(): Promise<string> {
  try {
    const user = await AuthService.verifySession();
    return JSON.stringify(await getSavedPeople(user));
  } catch (err) {
    logger.error('Failed to read saved Apollo contacts', err);
    return '{}';
  }
}
