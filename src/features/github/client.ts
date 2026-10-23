import { logger } from '@/lib/logger';
import { sameTech } from '@/lib/techMatch';
import { normalizeCompanyDomain } from '@/features/company360/merge';
import type { CatalogService } from '@/features/company360/scoring';
import type {
  GitHubError, GitHubOrgCandidate, GitHubOrgInsights, GitHubRateInfo, GitHubRepoSummary, GitHubSearchResult,
} from './types';

/**
 * Public GitHub REST API (api.github.com). Works without a token (60 requests an hour); a token saved under
 * Settings > GitHub (or GITHUB_TOKEN) raises that to 5,000. Responses are cached for 30 minutes, so looking at
 * the same company again costs nothing. Only public data is read.
 */

const API = 'https://api.github.com';
const TTL_MS = 30 * 60 * 1000;
const DAY_MS = 86400000;

class GitHubApiError extends Error {
  constructor(public readonly info: GitHubError) { super(info.message); }
}

const cache = new Map<string, { expires: number; value: unknown }>();
let lastRate: GitHubRateInfo | undefined;
let tokenCache: { value: string; expires: number } | undefined;

async function getToken(): Promise<string> {
  const env = (process.env.GITHUB_TOKEN || '').trim();
  if (env) return env;
  if (!tokenCache || tokenCache.expires < Date.now()) {
    let value = '';
    try {
      const { SettingsService } = await import('@/lib/settings');
      value = (await SettingsService.get('githubApiKey', '')).trim();
    } catch { /* no saved token */ }
    // Placeholders typed into Settings are not tokens.
    if (value && !/^(gh[pousr]_|github_pat_)[A-Za-z0-9_]{20,}$/.test(value)) value = '';
    tokenCache = { value, expires: Date.now() + 60000 };
  }
  return tokenCache.value;
}

/** Called after the token is changed in Settings. */
export function resetGitHubTokenCache() { tokenCache = undefined; }

async function gh<T>(path: string): Promise<T> {
  const hit = cache.get(path);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const token = await getToken();

  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      headers: {
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        'user-agent': 'BDOS-sales-app',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(20000),
      cache: 'no-store',
    });
  } catch (err) {
    logger.warn('GitHub request failed', { path, error: String(err) });
    throw new GitHubApiError({ code: 'NETWORK', message: 'Could not reach GitHub. Check the internet connection and try again.' });
  }

  const limit = Number(res.headers.get('x-ratelimit-limit'));
  const remaining = Number(res.headers.get('x-ratelimit-remaining'));
  const reset = Number(res.headers.get('x-ratelimit-reset'));
  // Search has its own small limit (10-30 a minute); only the hourly core limit is shown.
  if (Number.isFinite(limit) && limit > 0 && !path.startsWith('/search/')) {
    lastRate = { limit, remaining, resetAt: new Date(reset * 1000).toISOString(), withToken: !!token };
  }

  if (res.status === 401) {
    throw new GitHubApiError({ code: 'INVALID_TOKEN', message: 'GitHub rejected the token saved under Settings > GitHub. Replace it with a valid token, or remove it to use GitHub without one.' });
  }
  if (res.status === 403 || res.status === 429) {
    const when = Number.isFinite(reset) && reset > 0 ? new Date(reset * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'later';
    throw new GitHubApiError({
      code: 'RATE_LIMIT',
      message: token
        ? `GitHub's request limit is used up until ${when}. Try again then.`
        : `GitHub allows 60 requests an hour without a token, and they are used up until ${when}. Add a GitHub token under Settings > GitHub for 5,000 an hour.`,
    });
  }
  if (res.status === 404) throw new GitHubApiError({ code: 'NOT_FOUND', message: 'Not found on GitHub.' });
  if (!res.ok) throw new GitHubApiError({ code: 'HTTP_ERROR', message: `GitHub returned an error (HTTP ${res.status}). Please try again.` });

  const value = (await res.json()) as T;
  cache.set(path, { value, expires: Date.now() + TTL_MS });
  if (cache.size > 300) cache.delete(cache.keys().next().value as string);
  return value;
}

export async function getGitHubRate(): Promise<GitHubRateInfo | undefined> {
  if (lastRate) return lastRate;
  try {
    // /rate_limit does not count against the limit.
    const token = await getToken();
    const res = await fetch(`${API}/rate_limit`, {
      headers: { accept: 'application/vnd.github+json', 'user-agent': 'BDOS-sales-app', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    });
    if (res.status === 401) return undefined;
    const data = (await res.json()) as { resources?: { core?: { limit: number; remaining: number; reset: number } } };
    const core = data.resources?.core;
    if (core) lastRate = { limit: core.limit, remaining: core.remaining, resetAt: new Date(core.reset * 1000).toISOString(), withToken: !!token };
  } catch { /* shown as unknown */ }
  return lastRate;
}

// ---------------------------------------------------------------------------
// Finding the organization
// ---------------------------------------------------------------------------

type GhAccount = {
  login: string; type: 'Organization' | 'User'; name?: string | null; avatar_url: string; html_url: string;
  description?: string | null; bio?: string | null; blog?: string | null; location?: string | null; email?: string | null;
  twitter_username?: string | null; public_repos: number; followers: number; created_at: string;
};
type GhRepo = {
  name: string; html_url: string; description: string | null; language: string | null; stargazers_count: number;
  forks_count: number; pushed_at: string; fork: boolean; archived: boolean; topics?: string[];
};

const domainOf = (website?: string | null) => (website ? normalizeCompanyDomain(website) || undefined : undefined);
/** "www.freshworks.com" and "freshworks.com", or a subdomain of the company's own domain. */
const sameSite = (a?: string, b?: string) => !!a && !!b && (a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`));

/** What was typed: a GitHub URL / login, or a company website. */
export function parseGitHubQuery(raw: string): { login?: string; domain?: string; text?: string } {
  const q = raw.trim();
  const url = q.match(/github\.com\/([A-Za-z0-9-]{1,39})(?:[/?#]|$)/i);
  if (url) return { login: url[1] };
  if (/^@?[A-Za-z0-9-]{1,39}$/.test(q) && !q.includes('.')) return { login: q.replace(/^@/, ''), text: q.replace(/^@/, '') };
  const domain = normalizeCompanyDomain(q);
  if (domain && /\.[a-z]{2,}$/i.test(domain)) return { domain };
  return { text: q };
}

const toCandidate = (a: GhAccount, domain?: string): GitHubOrgCandidate => ({
  login: a.login,
  name: a.name || undefined,
  avatarUrl: a.avatar_url,
  htmlUrl: a.html_url,
  description: (a.description || a.bio || undefined)?.slice(0, 200),
  website: a.blog || undefined,
  websiteMatches: domain ? sameSite(domainOf(a.blog), domain) : undefined,
});

async function account(login: string): Promise<GhAccount> {
  return gh<GhAccount>(`/users/${encodeURIComponent(login)}`);
}

/** Organizations matching a name (GitHub search), with their profiles for the top few. */
async function searchOrgs(text: string, domain?: string): Promise<GitHubOrgCandidate[]> {
  const q = encodeURIComponent(`${text} type:org`);
  // Each profile is one request (60 an hour without a token), so only the top 4 are loaded.
  const res = await gh<{ items?: { login: string }[] }>(`/search/users?q=${q}&per_page=4`);
  const logins = (res.items || []).map((i) => i.login).slice(0, 4);
  const accounts = await Promise.all(logins.map((l) => account(l).catch(() => null)));
  return accounts.filter((a): a is GhAccount => !!a).map((a) => toCandidate(a, domain));
}

/**
 * Finds a company's GitHub organization. A login or GitHub URL is used as given. For a website, an
 * organization counts only when its GitHub profile lists that website; otherwise the possible ones are
 * returned to pick from, never guessed.
 */
export async function findGitHubOrg(raw: string, catalog: CatalogService[]): Promise<GitHubSearchResult> {
  const parsed = parseGitHubQuery(raw);
  try {
    if (parsed.login) {
      try {
        return { insights: await getOrgInsights(parsed.login, catalog) };
      } catch (err) {
        if (!(err instanceof GitHubApiError) || err.info.code !== 'NOT_FOUND' || !parsed.text) throw err;
        const candidates = await searchOrgs(parsed.text);
        return candidates.length
          ? { candidates, note: `No GitHub account is called "${parsed.login}". These organizations match the name:` }
          : { error: { code: 'NOT_FOUND', message: `No GitHub organization found for "${raw.trim()}".` } };
      }
    }

    if (parsed.domain) {
      const base = parsed.domain.split('.')[0];
      // The usual login is the domain name ("freshworks.com" -> "freshworks"); confirm it by the website.
      const direct = await account(base).catch(() => null);
      if (direct && sameSite(domainOf(direct.blog), parsed.domain)) return { insights: await getOrgInsights(direct.login, catalog) };
      const candidates = await searchOrgs(base, parsed.domain);
      const matching = candidates.filter((c) => c.websiteMatches);
      if (matching.length === 1) return { insights: await getOrgInsights(matching[0].login, catalog) };
      const all = direct && !candidates.some((c) => c.login === direct.login) ? [toCandidate(direct, parsed.domain), ...candidates] : candidates;
      if (!all.length) return { error: { code: 'NOT_FOUND', message: `No GitHub organization lists ${parsed.domain} as its website, and none is named "${base}". The company may not publish code on GitHub.` } };
      return {
        candidates: all,
        note: matching.length > 1
          ? `Several organizations list ${parsed.domain} as their website. Pick the one to analyse:`
          : `No GitHub organization lists ${parsed.domain} as its website. These have a similar name; pick one only if it is this company:`,
      };
    }

    if (!parsed.text) return { error: { code: 'BAD_INPUT', message: 'Type a company website, a GitHub organization name or a GitHub URL.' } };
    const candidates = await searchOrgs(parsed.text);
    if (!candidates.length) return { error: { code: 'NOT_FOUND', message: `No GitHub organization found for "${parsed.text}".` } };
    return { candidates, note: 'Pick the organization to analyse:' };
  } catch (err) {
    if (err instanceof GitHubApiError) return { error: err.info };
    logger.error('GitHub lookup failed', err);
    return { error: { code: 'HTTP_ERROR', message: 'The GitHub lookup failed. Please try again.' } };
  }
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

const toRepo = (r: GhRepo): GitHubRepoSummary => ({
  name: r.name, htmlUrl: r.html_url, description: r.description || undefined, language: r.language || undefined,
  stars: r.stargazers_count, forks: r.forks_count, pushedAt: r.pushed_at, topics: r.topics || [],
});

/** Languages GitHub reports that say nothing about the product stack. */
const NOISE_LANGUAGES = new Set(['Makefile', 'Dockerfile', 'Shell', 'Batchfile', 'PowerShell', 'Roff', 'HCL', 'Nix', 'CMake']);

/** Profile, the 100 most recently updated repositories, and what they show. Two API requests. */
export async function getOrgInsights(login: string, catalog: CatalogService[]): Promise<GitHubOrgInsights> {
  const a = await account(login);
  const reposPath = a.type === 'Organization'
    ? `/orgs/${encodeURIComponent(a.login)}/repos?type=public&sort=pushed&per_page=100`
    : `/users/${encodeURIComponent(a.login)}/repos?type=owner&sort=pushed&per_page=100`;
  const repos = (await gh<GhRepo[]>(reposPath)).filter((r) => !r.fork && !r.archived);
  const now = Date.now();
  const age = (iso: string) => (now - new Date(iso).getTime()) / DAY_MS;

  const langCount = new Map<string, number>();
  repos.forEach((r) => { if (r.language && !NOISE_LANGUAGES.has(r.language)) langCount.set(r.language, (langCount.get(r.language) || 0) + 1); });
  const langTotal = [...langCount.values()].reduce((x, y) => x + y, 0);
  const languages = [...langCount.entries()]
    .sort((x, y) => y[1] - x[1])
    .slice(0, 10)
    .map(([name, n]) => ({ name, repos: n, percent: langTotal ? Math.round((n / langTotal) * 100) : 0 }));

  const topicCount = new Map<string, number>();
  repos.forEach((r) => (r.topics || []).forEach((t) => topicCount.set(t, (topicCount.get(t) || 0) + 1)));
  const topics = [...topicCount.entries()].sort((x, y) => y[1] - x[1]).slice(0, 18).map(([name, n]) => ({ name, repos: n }));

  const updatedLast30Days = repos.filter((r) => age(r.pushed_at) <= 30).length;
  const updatedLast90Days = repos.filter((r) => age(r.pushed_at) <= 90).length;
  const lastPushAt = repos[0]?.pushed_at;
  const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0);

  // Tech they really use: languages in at least 5% (or 3) of their repositories, and topics on 2+ repositories
  // (any topic when they have few). One stray Python script in 90 repositories is not a Python shop.
  const fewRepos = repos.length < 10;
  const used = [
    ...languages.filter((l) => l.percent >= 5 || l.repos >= 3).map((l) => l.name),
    ...topics.filter((t) => fewRepos || t.repos >= 2).map((t) => t.name.replace(/-/g, ' ')),
  ];
  const matchedServices = catalog
    .map((svc) => ({ svc, hits: [...new Set(svc.stack.split(',').map((t) => t.trim()).filter((t) => t && used.some((u) => sameTech(u, t))))] }))
    .filter((x) => x.hits.length)
    .sort((x, y) => y.hits.length - x.hits.length)
    .slice(0, 4)
    .map(({ svc, hits }) => ({ name: svc.name, matchedTech: hits, fromInr: svc.minInr ? `From ${svc.minInr}` : '', fromUsd: svc.minUsd ? `From ${svc.minUsd}` : '', model: svc.model }));

  const signals: string[] = [];
  if (!repos.length) signals.push('No public repositories of their own: they do not build in the open, so GitHub says little about their stack.');
  else {
    if (updatedLast30Days >= 5) signals.push(`Very active engineering: ${updatedLast30Days} repositories updated in the last 30 days.`);
    else if (updatedLast30Days > 0) signals.push(`Active: ${updatedLast30Days} repositor${updatedLast30Days === 1 ? 'y' : 'ies'} updated in the last 30 days.`);
    else if (updatedLast90Days > 0) signals.push(`Some activity: ${updatedLast90Days} repositor${updatedLast90Days === 1 ? 'y' : 'ies'} updated in the last 90 days.`);
    else if (lastPushAt) signals.push(`Quiet: no public code changes in the last 90 days (last ${new Date(lastPushAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}).`);
    if (languages[0]) signals.push(`Main languages: ${languages.slice(0, 3).map((l) => `${l.name} (${l.percent}%)`).join(', ')}.`);
    if (matchedServices[0]) signals.push(`Fits your "${matchedServices[0].name}" service: they use ${matchedServices[0].matchedTech.slice(0, 4).join(', ')}.`);
    else if (catalog.length) signals.push('Their public languages and topics do not match a service in your catalog.');
    if (totalStars >= 1000) signals.push(`Well-known open source: ${totalStars.toLocaleString('en-US')} stars in total.`);
  }

  return {
    login: a.login,
    type: a.type === 'User' ? 'User' : 'Organization',
    name: a.name || a.login,
    avatarUrl: a.avatar_url,
    htmlUrl: a.html_url,
    description: (a.description || a.bio || undefined) ?? undefined,
    domain: domainOf(a.blog),
    website: a.blog || undefined,
    location: a.location || undefined,
    email: a.email || undefined,
    twitter: a.twitter_username || undefined,
    publicRepos: a.public_repos,
    followers: a.followers,
    createdAt: a.created_at,
    reposAnalyzed: repos.length,
    languages,
    topics,
    activity: { updatedLast30Days, updatedLast90Days, lastPushAt, totalStars },
    topRepos: [...repos].sort((x, y) => y.stargazers_count - x.stargazers_count).slice(0, 6).map(toRepo),
    recentRepos: repos.slice(0, 6).map(toRepo),
    matchedServices,
    signals,
    fetchedAt: new Date().toISOString(),
  };
}

export async function getOrgInsightsSafe(login: string, catalog: CatalogService[]): Promise<GitHubSearchResult> {
  try {
    return { insights: await getOrgInsights(login, catalog) };
  } catch (err) {
    if (err instanceof GitHubApiError) return { error: err.info.code === 'NOT_FOUND' ? { code: 'NOT_FOUND', message: `GitHub has no account called "${login}".` } : err.info };
    logger.error('GitHub insights failed', err);
    return { error: { code: 'HTTP_ERROR', message: 'The GitHub lookup failed. Please try again.' } };
  }
}
