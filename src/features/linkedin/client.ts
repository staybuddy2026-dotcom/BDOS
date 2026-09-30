import { logger } from '@/lib/logger';
import { linkedinProvider } from './provider';
import type {
  LinkedInBuyingSignalItem,
  LinkedInCompanyResult,
  LinkedInErrorInfo,
  LinkedInIntelligenceData,
  LinkedInPostItem,
  LinkedInPostResult,
  LinkedInRateLimit,
} from './types';

/**
 * Real usage of the LinkedIn scraper account (monthly spend vs. limit, in USD cents so the
 * existing integer fields stay meaningful). Zeroes when not connected: never invented numbers.
 */
export async function getLinkedInRateLimit(): Promise<LinkedInRateLimit> {
  const account = await linkedinProvider.checkAccount();
  const limit = Math.round((account.monthlyLimitUsd || 0) * 100);
  const used = Math.round((account.monthlyUsageUsd || 0) * 100);
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
  nextMonth.setHours(0, 0, 0, 0);
  return {
    limit,
    used,
    remaining: Math.max(0, limit - used),
    reset: Math.floor(nextMonth.getTime() / 1000),
    formattedReset: nextMonth.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
  };
}

const normalize = (v?: string) => (v || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Classifies a real post by its own words (used only for labelling). */
function classifyPost(content: string): LinkedInPostItem['postType'] {
  const c = content.toLowerCase();
  if (/\b(hiring|we'?re hiring|join our team|open role|looking for an?)\b/.test(c)) return 'Hiring Announcement';
  if (/\b(raised|funding|series [a-e]\b|seed round|investors?)\b/.test(c)) return 'Funding Celebration';
  if (/\b(ai|llm|gpt|machine learning|genai|agentic)\b/.test(c)) return 'AI Transformation';
  if (/\b(cloud|aws|azure|gcp|migration|kubernetes)\b/.test(c)) return 'Cloud Migration';
  if (/\b(partner|partnership|collaborat)/.test(c)) return 'Partnership';
  return 'Product Expansion';
}

function toPostItem(p: LinkedInPostResult): LinkedInPostItem {
  return {
    id: p.id,
    authorName: p.authorName,
    authorTitle: p.authorHeadline || '',
    postType: classifyPost(p.content),
    contentSnippet: p.content.length > 400 ? `${p.content.slice(0, 400)}…` : p.content,
    likesCount: p.likes,
    commentsCount: p.comments,
    sharesCount: p.shares,
    postUrl: p.url,
    publishedDate: p.postedAt ? p.postedAt.slice(0, 10) : '',
    buyingIntentScore: 0,
    technologiesMentioned: [],
    source: 'LinkedIn',
  };
}

const EMPTY_POST: LinkedInPostItem = {
  id: '', authorName: '', authorTitle: '', postType: 'Product Expansion', contentSnippet: '', likesCount: 0, commentsCount: 0,
  sharesCount: 0, postUrl: '', publishedDate: '', buyingIntentScore: 0, technologiesMentioned: [], source: 'LinkedIn',
};

/**
 * Finds the company's LinkedIn page. A name search can return a different company, so the
 * result is only accepted when its website or name actually matches what we asked for.
 */
export async function findLinkedInCompany(params: { domain?: string; name?: string; linkedinUrl?: string }): Promise<{ company: LinkedInCompanyResult | null; error?: LinkedInErrorInfo; note?: string }> {
  if (params.linkedinUrl && /linkedin\.com\/company\//i.test(params.linkedinUrl)) {
    return linkedinProvider.getCompany({ url: params.linkedinUrl });
  }
  const domain = (params.domain || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  const host = domain.split('.')[0];
  const searchName = params.name?.trim() || host;
  if (!searchName) return { company: null };

  const res = await linkedinProvider.getCompany({ name: searchName });
  if (!res.company) return res;

  const c = res.company;
  const domainMatches = !!domain && !!c.domain && (c.domain === domain || c.domain.endsWith(`.${domain}`) || domain.endsWith(`.${c.domain}`));
  const nameMatches = [params.name, host].some((n) => !!n && (normalize(c.name) === normalize(n) || normalize(c.universalName) === normalize(n)));
  if (domainMatches || nameMatches) return res;
  return { company: null, note: `LinkedIn returned "${c.name}", which does not match ${domain || searchName}, so it was not used.` };
}

/**
 * LinkedIn company intelligence built only from live data (company page + its recent posts).
 * Returns an empty structure when LinkedIn is not connected or the company is not found.
 */
export async function getLinkedInCompanyData(companyNameOrDomain: string, companyName?: string): Promise<LinkedInIntelligenceData> {
  const domain = companyNameOrDomain.toLowerCase().replace(/https?:\/\//, '').replace(/www\./, '').split('/')[0];
  const empty: LinkedInIntelligenceData = {
    companyDomain: domain,
    companyName: companyName || domain,
    totalEmployeesOnLinkedin: 0,
    activeJobOpeningsCount: 0,
    executivePostsCount: 0,
    socialEngagementScore: 0,
    engineeringExpansionIndex: 0,
    outsourcingProbabilityPercent: 0,
    primaryPost: EMPTY_POST,
    recentPosts: [],
    jobOpenings: [],
    buyingSignals: [],
    recommendedPitch: '',
    source: 'LinkedIn',
  };

  const { company, error } = await findLinkedInCompany({ domain, name: companyName });
  if (!company) {
    if (error) logger.warn(`LinkedIn company data unavailable for '${domain}': ${error.message}`);
    return empty;
  }

  const posts = (await linkedinProvider.getRecentPosts(company.linkedinUrl, 5)).items;
  const items = posts.map(toPostItem);
  const avgEngagement = posts.length ? posts.reduce((sum, p) => sum + p.likes + p.comments * 2 + p.shares * 3, 0) / posts.length : 0;

  // Signals are quotes of real posts, not inferred claims.
  const buyingSignals: LinkedInBuyingSignalItem[] = items
    .filter((p) => p.postType === 'Hiring Announcement' || p.postType === 'AI Transformation' || p.postType === 'Cloud Migration')
    .slice(0, 3)
    .map((p, i) => ({
      id: `li_signal_${i}`,
      signalType: p.postType === 'Hiring Announcement' ? 'SCALING_ENGINEERING_TEAM' : p.postType === 'AI Transformation' ? 'AI_TRANSFORMATION' : 'CLOUD_MIGRATION',
      title: p.postType,
      description: p.contentSnippet.slice(0, 220),
      confidenceScore: 0,
      detectedFrom: p.postUrl,
    }));

  return {
    ...empty,
    companyName: company.name,
    totalEmployeesOnLinkedin: company.employeeCount || 0,
    executivePostsCount: items.length,
    // Transparent formula: average weighted engagement on a log scale, capped at 100.
    socialEngagementScore: Math.min(100, Math.round(Math.log10(avgEngagement + 1) * 33)),
    primaryPost: items[0] || EMPTY_POST,
    recentPosts: items,
    buyingSignals,
  };
}
