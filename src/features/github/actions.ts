'use server';

import { AuthService } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { safeRevalidatePath } from '@/lib/revalidate';
import { upsertShortlist } from '@/features/prospecting/service';
import type { DiscoveryLeadItem } from '@/features/discovery/types';
import { findGitHubOrg, getGitHubRate, getOrgInsightsSafe } from './client';
import type { GitHubOrgInsights, GitHubRateInfo, GitHubSearchResult } from './types';

async function catalog() {
  const { getServiceCatalog } = await import('@/features/learning/actions');
  return getServiceCatalog().catch(() => []);
}

/** Company website, GitHub organization name or GitHub URL. */
export async function searchGitHubAction(query: string): Promise<GitHubSearchResult> {
  await AuthService.verifySession();
  if (!query?.trim()) return { error: { code: 'BAD_INPUT', message: 'Type a company website, a GitHub organization name or a GitHub URL.' } };
  const result = await findGitHubOrg(query.slice(0, 200), await catalog());
  return { ...result, rate: await getGitHubRate() };
}

/** One organization picked from a list. */
export async function getGitHubOrgAction(login: string): Promise<GitHubSearchResult> {
  await AuthService.verifySession();
  if (!/^[A-Za-z0-9-]{1,39}$/.test(login || '')) return { error: { code: 'BAD_INPUT', message: 'That is not a GitHub account name.' } };
  const result = await getOrgInsightsSafe(login, await catalog());
  return { ...result, rate: await getGitHubRate() };
}

export async function getGitHubRateAction(): Promise<GitHubRateInfo | null> {
  await AuthService.verifySession();
  return (await getGitHubRate()) ?? null;
}

/**
 * Adds the company to the team shortlist, which AI Priorities ranks (Apollo data is added there).
 * Needs the website from the GitHub profile: a company is never matched by name alone.
 */
export async function addGitHubOrgToPrioritiesAction(insights: Pick<GitHubOrgInsights, 'login' | 'name' | 'domain' | 'location' | 'languages' | 'activity' | 'matchedServices' | 'htmlUrl'>): Promise<{ error?: string; message?: string }> {
  const user = await AuthService.verifySession();
  if (!insights?.domain) return { error: 'This GitHub profile lists no company website, so it cannot be added. Open the company in Company 360 by its website instead.' };
  try {
    const lead: DiscoveryLeadItem = {
      companyId: insights.domain,
      companyName: insights.name || insights.login,
      domain: insights.domain,
      industry: '',
      country: insights.location || '',
      employeeCount: 0,
      buyingScore: 0,
      icpScore: 0,
      tier: 'MEDIUM',
      primaryTechStack: (insights.languages || []).slice(0, 6).map((l) => l.name),
      fundingSummary: '',
      hiringSummary: '',
      matchedProviders: ['github'],
      whyContactReason: `GitHub: ${insights.activity?.updatedLast30Days ?? 0} repositories updated in the last 30 days (${insights.htmlUrl}).`,
      recommendedContactName: '',
      recommendedContactTitle: '',
      bestOutreachChannel: 'EMAIL',
      estimatedBudgetInr: '',
      estimatedBudgetUsd: '',
      conversionProbabilityPercent: 0,
      recommendedServices: (insights.matchedServices || []).map((s) => s.name),
    };
    await upsertShortlist(lead, user.id);
    safeRevalidatePath('/priorities');
    safeRevalidatePath('/company');
    return { message: `${lead.companyName} (${lead.domain}) added. AI Priorities scores it with Apollo on your next visit.` };
  } catch (err) {
    logger.error('Could not add GitHub organization to priorities', err);
    return { error: 'Could not add this company. Please try again.' };
  }
}
