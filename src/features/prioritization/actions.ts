'use server';

import { AuthService } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { SettingsService } from '@/lib/settings';
import { safeRevalidatePath } from '@/lib/revalidate';
import { enrichCompany360Action, getCompany360Profile } from '@/features/company360/actions';
import { isFreshProfile } from '@/features/company360/cache';
import { rescoreProfile } from '@/features/company360/scoring';
import { normalizeCompanyDomain } from '@/features/company360/merge';
import type { Company360Profile } from '@/features/company360/types';
import { getSavedPeople, getShortlist, upsertShortlist } from '@/features/prospecting/service';
import type { DiscoveryLeadItem } from '@/features/discovery/types';
import { resolveLinkedInAccount } from '@/features/prioritization/linkedinAccount';
import { lookupCrmMatches } from '@/features/crm/service';
import type { CrmLookupResult } from '@/features/crm/types';
import { calculateBuyingReadiness } from './scoring';
import type { BuyingReadinessDetails, PrioritiesResult, PrioritizationSummary, PriorityTier, TierOverride } from './types';

/** Building a new profile uses Apollo quota (company + people search), so only a few are built per visit. */
const MAX_NEW_PROFILES_PER_VISIT = 8;
const MAX_ACCOUNTS = 100;
const OVERRIDES_KEY = 'priority_tier_overrides';
const TIERS: PriorityTier[] = ['IMMEDIATE', 'HIGH', 'MEDIUM', 'MONITOR', 'ARCHIVE'];

// Platforms and mail providers, never a prospect's own company (they come from bad matches, e.g. a post on linkedin.com).
const PLATFORM_DOMAINS = /(^|\.)(linkedin\.com|lnkd\.in|apollo\.io|gmail\.com|googlemail\.com|yahoo\.(com|co\.in)|outlook\.com|hotmail\.com|live\.com|icloud\.com|proton(mail)?\.(me|com)|github\.com|facebook\.com|instagram\.com|x\.com|twitter\.com|youtube\.com|medium\.com|wordpress\.com|example\.com)$/i;
const isRealDomain = (d?: string | null): d is string =>
  !!d && /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(d) && d !== 'unknown-domain.com' && !PLATFORM_DOMAINS.test(d);

/** Apollo returned nothing about the company itself, so a score would only say "no data", not "bad fit". */
const apolloHasNoRecord = (p: Company360Profile) =>
  !p.overview?.industry && !p.overview?.employeeCount && !(p.opportunityScoring?.scoringFactors || []).length;

async function readOverrides(): Promise<Record<string, TierOverride>> {
  try {
    return JSON.parse(await SettingsService.get(OVERRIDES_KEY, '{}')) as Record<string, TierOverride>;
  } catch {
    return {};
  }
}

/**
 * Companies the team actually works with, best leads first: LinkedIn posts with a known company
 * domain (highest buying intent first), the Company 360 shortlist, then the user's saved Apollo contacts.
 * A domain is never guessed from a company name.
 */
async function collectDomains(user: Awaited<ReturnType<typeof AuthService.verifySession>>): Promise<string[]> {
  const domains: string[] = [];
  const add = (raw?: string | null) => {
    if (!raw) return;
    const d = normalizeCompanyDomain(raw);
    if (isRealDomain(d) && !domains.includes(d)) domains.push(d);
  };

  const posts = await db.linkedInPost.findMany({
    where: { apolloEnrichment: { organizationDomain: { not: null } } },
    orderBy: { opportunityScore: { sort: 'desc', nulls: 'last' } },
    take: 50,
    select: { apolloEnrichment: { select: { organizationDomain: true } } },
  }).catch(() => []);
  posts.forEach((p) => add(p.apolloEnrichment?.organizationDomain));

  const shortlist = await getShortlist().catch(() => null);
  shortlist?.ids.forEach((id) => add(shortlist.leads[id]?.domain));

  const saved = await getSavedPeople(user).catch(() => ({}));
  Object.values(saved).forEach((p) => add(p.organizationDomain));

  return domains.slice(0, MAX_ACCOUNTS);
}

function formatInr(value: number): string {
  if (!value) return '';
  return value >= 10000000 ? `₹${(value / 10000000).toFixed(1)} Cr` : value >= 100000 ? `₹${(value / 100000).toFixed(1)} Lakhs` : `₹${value.toLocaleString('en-IN')}`;
}

function formatUsd(value: number): string {
  if (!value) return '';
  return value >= 1000000 ? `$${(value / 1000000).toFixed(1)}M` : value >= 1000 ? `$${Math.round(value / 1000)}K` : `$${value}`;
}

const digits = (text?: string) => {
  const n = parseInt((text || '').replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
};

/** Page totals, counted from the accounts themselves. */
function summarize(accounts: BuyingReadinessDetails[]): PrioritizationSummary {
  const matched = accounts.filter((a) => a.matchedService);
  return {
    totalAccounts: accounts.length,
    contactToday: accounts.filter((a) => a.priorityTier === 'IMMEDIATE').length,
    highPriority: accounts.filter((a) => a.priorityTier === 'HIGH').length,
    withContact: accounts.filter((a) => a.primaryContact).length,
    inCrm: accounts.filter((a) => a.inCrm).length,
    matchedServiceValueInr: formatInr(matched.reduce((sum, a) => sum + digits(a.matchedService?.fromInr), 0)),
    matchedServiceValueUsd: formatUsd(matched.reduce((sum, a) => sum + digits(a.matchedService?.fromUsd), 0)),
    matchedServiceAccounts: matched.length,
  };
}

/**
 * Accounts ranked by buying readiness, with page totals, in one pass. Saved Company 360 profiles are
 * reused (they are refreshed weekly); at most MAX_NEW_PROFILES_PER_VISIT new ones are built per visit.
 */
export async function getPrioritiesAction(): Promise<PrioritiesResult> {
  const user = await AuthService.verifySession();
  const domains = await collectDomains(user);
  const empty: PrioritiesResult = { accounts: [], summary: summarize([]), pendingCount: 0, sourceCount: domains.length, notFoundDomains: [] };
  if (!domains.length) return empty;

  const rows = await db.companyProfileCache.findMany({ where: { key: { in: domains } } }).catch(() => []);
  const cached = new Map(rows.map((r) => [r.key, r]));
  const overrides = await readOverrides();

  const profiles: { profile: Company360Profile; evaluatedAt: Date }[] = [];
  let budget = MAX_NEW_PROFILES_PER_VISIT;
  let pendingCount = 0;

  for (const domain of domains) {
    const row = cached.get(domain);
    const data = row?.data as unknown as (Company360Profile & { profileVersion?: number }) | undefined;
    if (row && data && isFreshProfile(data, row.updatedAt)) {
      profiles.push({ profile: data, evaluatedAt: row.updatedAt });
    } else if (budget > 0) {
      budget--;
      try {
        const profile = await getCompany360Profile(domain);
        // Apollo did not answer: try again on a later visit rather than show an empty profile.
        if (profile.apolloUnavailable) pendingCount++;
        else profiles.push({ profile, evaluatedAt: new Date() });
      } catch (err) {
        logger.warn(`AI Priorities: could not build the profile for ${domain}`, { error: String(err) });
        if (row && data) profiles.push({ profile: data, evaluatedAt: row.updatedAt });
      }
    } else if (row && data?.opportunityScoring) {
      // Older than a week but still real data; it is refreshed on a later visit.
      profiles.push({ profile: data, evaluatedAt: row.updatedAt });
    } else {
      pendingCount++;
    }
  }

  const notFoundDomains = profiles.filter(({ profile }) => apolloHasNoRecord(profile)).map(({ profile }) => profile.domain || profile.companyId);
  const scored = profiles.filter(({ profile }) => profile.opportunityScoring && profile.overview && !apolloHasNoRecord(profile));

  // Rescored with the current rules and service catalog (no Apollo call).
  const { getServiceCatalog } = await import('@/features/learning/actions');
  const catalog = await getServiceCatalog().catch(() => []);
  scored.forEach((entry) => { entry.profile = rescoreProfile(entry.profile, catalog); });

  const crm = await lookupCrmMatches(user, {
    companies: scored.map(({ profile }) => ({ key: profile.domain || profile.companyId, domain: profile.domain, name: profile.overview.companyName })),
  }).catch((): CrmLookupResult => ({ people: {}, companies: {} }));

  const accounts = scored
    .map(({ profile, evaluatedAt }) => calculateBuyingReadiness(profile, {
      evaluatedAt,
      inCrm: crm.companies[profile.domain || profile.companyId],
      override: overrides[normalizeCompanyDomain(profile.domain || profile.companyId)],
    }))
    .sort((a, b) => TIERS.indexOf(a.priorityTier) - TIERS.indexOf(b.priorityTier) || b.buyingReadinessScore - a.buyingReadinessScore);

  return { accounts, summary: summarize(accounts), pendingCount, sourceCount: domains.length, notFoundDomains };
}

/** Sets (or with null, clears) the team's manual priority tier for one company. */
export async function setPriorityTierAction(domain: string, tier: PriorityTier | null): Promise<{ error?: string; override?: TierOverride }> {
  const user = await AuthService.verifySession();
  const key = normalizeCompanyDomain(domain || '');
  if (!isRealDomain(key)) return { error: 'This account has no company website, so its tier cannot be saved.' };
  if (tier !== null && !TIERS.includes(tier)) return { error: 'Unknown priority tier.' };
  try {
    const overrides = await readOverrides();
    if (tier === null) delete overrides[key];
    else overrides[key] = { tier, setBy: user.name, setAt: new Date().toISOString() };
    await SettingsService.set(OVERRIDES_KEY, JSON.stringify(overrides));
    safeRevalidatePath('/priorities');
    return { override: tier ? overrides[key] : undefined };
  } catch (err) {
    logger.error(`Could not save the priority tier for ${key}`, err);
    return { error: 'Could not save the priority tier. Please try again.' };
  }
}

/**
 * Looks up one account's tech stack and funding (1 Apollo credit, the page asks first) and returns the
 * account rescored with them.
 */
export async function lookUpTechAndFundingAction(domain: string): Promise<{ account?: BuyingReadinessDetails; error?: string }> {
  const user = await AuthService.verifySession();
  const res = await enrichCompany360Action(domain);
  if (res.error || !res.profile) return { error: res.error || 'The Apollo lookup failed. Please try again.' };
  const profile = res.profile;
  const key = profile.domain || profile.companyId;
  const crm = await lookupCrmMatches(user, { companies: [{ key, domain: profile.domain, name: profile.overview.companyName }] })
    .catch((): CrmLookupResult => ({ people: {}, companies: {} }));
  const overrides = await readOverrides();
  return {
    account: calculateBuyingReadiness(profile, {
      evaluatedAt: new Date(),
      inCrm: crm.companies[key],
      override: overrides[normalizeCompanyDomain(key)],
    }),
  };
}

export type AddLinkedInAccountResult = {
  error?: string;
  /** The refreshed page data, with the new account in it. */
  result?: PrioritiesResult;
  domain?: string;
  message?: string;
};

/**
 * Paste a LinkedIn company page or a person's profile: finds the company and its website, adds it to the
 * team's Company 360 shortlist (which AI Priorities ranks) and scores it right away.
 */
export async function addLinkedInAccountAction(linkedinUrl: string): Promise<AddLinkedInAccountResult> {
  const user = await AuthService.verifySession();
  if (!linkedinUrl?.trim()) return { error: 'Paste a LinkedIn URL first.' };

  const { account, error } = await resolveLinkedInAccount(linkedinUrl);
  if (!account) return { error: error || 'Could not resolve this LinkedIn URL. Please check the URL and try again.' };
  if (!isRealDomain(account.domain)) return { error: `${account.companyName} has no usable company website (${account.domain}), so it cannot be ranked.` };

  try {
    const alreadyTracked = (await collectDomains(user)).includes(account.domain);
    const lead: DiscoveryLeadItem = {
      companyId: account.domain,
      companyName: account.companyName,
      domain: account.domain,
      industry: account.industry || '',
      country: account.location || '',
      employeeCount: account.employeeCount || 0,
      buyingScore: 0,
      icpScore: 0,
      tier: 'MEDIUM',
      primaryTechStack: [],
      fundingSummary: '',
      hiringSummary: '',
      matchedProviders: ['linkedin'],
      whyContactReason: account.person ? `Added from ${account.person.name}'s LinkedIn profile.` : 'Added from its LinkedIn company page.',
      recommendedContactName: account.person?.name || '',
      recommendedContactTitle: account.person?.title || '',
      bestOutreachChannel: 'LINKEDIN',
      contactLinkedinUrl: account.person?.profileUrl || account.companyLinkedinUrl,
      estimatedBudgetInr: '',
      estimatedBudgetUsd: '',
      conversionProbabilityPercent: 0,
      recommendedServices: [],
    };
    await upsertShortlist(lead, user.id);

    // Scored now (and cached), so the account is on the page straight away instead of on a later visit.
    const profile = await getCompany360Profile(account.domain).catch((err) => {
      logger.warn(`AI Priorities: could not score ${account.domain} after adding it from LinkedIn`, { error: String(err) });
      return null;
    });

    // If a decision maker was identified from the LinkedIn profile and the profile has no decision makers, seed it
    if (profile && account.person && (!profile.decisionMakers || profile.decisionMakers.length === 0)) {
      profile.decisionMakers = [{
        id: `dm_${account.domain}_1`,
        name: account.person.name,
        jobTitle: account.person.title || 'Decision Maker',
        department: 'Engineering',
        seniority: 'Director',
        email: '',
        emailStatus: 'Unverified',
        linkedinUrl: account.person.profileUrl,
        source: 'LinkedIn',
      }];
      await db.companyProfileCache.upsert({
        where: { key: account.domain },
        update: { data: profile as unknown as Prisma.InputJsonValue },
        create: { key: account.domain, companyId: profile.companyId, data: profile as unknown as Prisma.InputJsonValue },
      }).catch(() => null);
    }

    const result = await getPrioritiesAction();
    safeRevalidatePath('/priorities');
    safeRevalidatePath('/company');

    const who = account.person ? `${account.person.name} works at ${account.companyName} (${account.domain})` : `${account.companyName} (${account.domain})`;
    const ranked = result.accounts.some((a) => normalizeCompanyDomain(a.domain) === account.domain);
    const message = ranked
      ? `${who}${alreadyTracked ? ' is already in your priorities.' : ' added to your priorities.'}`
      : !profile || profile.apolloUnavailable
        ? `${who} added. Apollo did not answer, so it will be scored on your next visit.`
        : `${who} added, but Apollo has no company data for it yet, so it cannot be ranked.`;
    return { result, domain: account.domain, message };
  } catch (err) {
    logger.error(`Could not add ${account.domain} to AI Priorities`, err);
    return { error: 'Could not add this company. Please try again.' };
  }
}
