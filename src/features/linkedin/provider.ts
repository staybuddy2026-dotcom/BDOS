import { logger } from '@/lib/logger';
import type {
  LinkedInCompanyResult,
  LinkedInErrorInfo,
  LinkedInListResponse,
  LinkedInPostResult,
  LinkedInProfileResult,
} from './types';

/**
 * Live LinkedIn data client.
 *
 * LinkedIn's official API does not offer post/people search to normal apps, so this uses the
 * Apify scraper platform named in .env (LINKEDIN_SCRAPER_API_KEY). Each operation runs one
 * "actor" synchronously and maps its dataset items into our own types.
 *
 * Nothing here returns sample data: without a key every call reports NOT_CONFIGURED.
 */

const DEFAULT_BASE = 'https://api.apify.com/v2';

// Default actors (no LinkedIn cookies/account needed). Each can be swapped via .env.
const ACTORS = {
  postSearch: () => process.env.LINKEDIN_ACTOR_POST_SEARCH || 'harvestapi/linkedin-post-search',
  profileSearch: () => process.env.LINKEDIN_ACTOR_PROFILE_SEARCH || 'harvestapi/linkedin-profile-search',
  profile: () => process.env.LINKEDIN_ACTOR_PROFILE || 'harvestapi/linkedin-profile-scraper',
  profilePosts: () => process.env.LINKEDIN_ACTOR_PROFILE_POSTS || 'harvestapi/linkedin-profile-posts',
  company: () => process.env.LINKEDIN_ACTOR_COMPANY || 'harvestapi/linkedin-company',
  companyEmployees: () => process.env.LINKEDIN_ACTOR_COMPANY_EMPLOYEES || 'harvestapi/linkedin-company-employees',
};

const OPERATION_LABELS: Record<string, string> = {
  postSearch: 'LinkedIn post search',
  profileSearch: 'LinkedIn people search',
  profile: 'LinkedIn profile lookup',
  profilePosts: 'LinkedIn recent posts',
  company: 'LinkedIn company lookup',
  companyEmployees: 'LinkedIn company people',
  account: 'LinkedIn connection check',
};

export class LinkedInApiError extends Error {
  constructor(public readonly info: LinkedInErrorInfo) {
    super(info.message);
    this.name = 'LinkedInApiError';
  }
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const looksLikePlaceholder = (v: string) => !v || /your|xxx|here|placeholder|changeme|<|>/i.test(v);
let settingsKeyCache: { value: string | undefined; expires: number } | null = null;

/** LINKEDIN_SCRAPER_API_KEY from .env wins; otherwise a real key saved on the Settings page is used. */
async function getApiKey(): Promise<string | undefined> {
  const envKey = (process.env.LINKEDIN_SCRAPER_API_KEY || process.env.APIFY_API_TOKEN || '').trim();
  if (!looksLikePlaceholder(envKey)) return envKey;

  if (!settingsKeyCache || settingsKeyCache.expires < Date.now()) {
    let value: string | undefined;
    try {
      // Loaded lazily so this module stays importable for types without pulling in the database.
      const { SettingsService } = await import('@/lib/settings');
      const saved = (await SettingsService.get('linkedinApiKey', '')).trim();
      value = looksLikePlaceholder(saved) || /^li_live_/i.test(saved) ? undefined : saved;
    } catch {
      value = undefined;
    }
    settingsKeyCache = { value, expires: Date.now() + 60000 };
  }
  return settingsKeyCache.value;
}

function getBaseUrl(): string {
  const endpoint = (process.env.LINKEDIN_SCRAPER_ENDPOINT || '').trim();
  const match = endpoint.match(/^(https?:\/\/[^/]+\/v2)/i);
  return match ? match[1] : DEFAULT_BASE;
}

export async function isLinkedInConfigured(): Promise<boolean> {
  return !!(await getApiKey());
}

export const LINKEDIN_SETUP_HINT = 'Add your Apify API token as LINKEDIN_SCRAPER_API_KEY in .env (or save it under Settings > LinkedIn), then restart the app.';

// ---------------------------------------------------------------------------
// Request layer: auth, error classification, caching, in-flight dedupe
// ---------------------------------------------------------------------------

let lastError: LinkedInErrorInfo | undefined;
export const getLastLinkedInError = () => lastError;

type CacheEntry = { expires: number; value: unknown };
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<unknown>>();
const MAX_CACHE_ENTRIES = 300;

// Every run costs money, so identical requests are reused generously.
const TTL = {
  search: 30 * 60 * 1000,
  profile: 24 * 60 * 60 * 1000,
  company: 24 * 60 * 60 * 1000,
  account: 60 * 1000,
};

function cacheGet<T>(key: string): T | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (hit.expires < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return hit.value as T;
}

function cacheSet(key: string, value: unknown, ttl: number) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { expires: Date.now() + ttl, value });
}

function classifyError(operation: string, status: number, body: unknown): LinkedInErrorInfo {
  const err = ((body as Record<string, unknown>)?.error as Record<string, unknown>) || {};
  const type = String(err.type || '');
  const raw = String(err.message || '').slice(0, 200);
  const label = OPERATION_LABELS[operation] || operation;
  const at = new Date().toISOString();

  if (status === 401 || /token-not-found|token-not-valid|unauthorized/i.test(type)) {
    return { code: 'INVALID_KEY', operation, at, message: 'The LinkedIn scraper key was rejected. Check LINKEDIN_SCRAPER_API_KEY (it should be your Apify API token).' };
  }
  if (status === 402 || /not-enough-usage|usage-limit|insufficient|monthly-usage/i.test(type + raw)) {
    return { code: 'NO_CREDITS', operation, at, message: `Your Apify account has no usage credit left, so ${label.toLowerCase()} is unavailable. Top up or raise the monthly limit in the Apify console.` };
  }
  if (status === 429 || /rate-limit/i.test(type)) {
    return { code: 'RATE_LIMIT', operation, at, message: `${label} is being rate limited. Wait a moment and try again.` };
  }
  if (status === 403 || status === 404 || /actor-is-not-rented|not-found|actor-disabled/i.test(type)) {
    return { code: 'ACTOR_UNAVAILABLE', operation, at, message: `The scraper for ${label.toLowerCase()} is not available to your Apify account${raw ? ` (${raw})` : ''}. Open it once in the Apify store to enable it, or set a different actor in .env.` };
  }
  if (status === 408 || /timeout|timed-out/i.test(type)) {
    return { code: 'TIMEOUT', operation, at, message: `${label} took too long. Try a narrower search.` };
  }
  if (status === 400) {
    return { code: 'BAD_REQUEST', operation, at, message: `${label} was rejected${raw ? `: ${raw}` : '.'}` };
  }
  return { code: 'HTTP_ERROR', operation, at, message: `${label} failed (HTTP ${status}). Please try again.` };
}

async function authedFetch(operation: string, url: string, init: RequestInit, timeoutMs: number): Promise<unknown> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new LinkedInApiError({ code: 'NOT_CONFIGURED', operation, at: new Date().toISOString(), message: `LinkedIn is not connected yet. ${LINKEDIN_SETUP_HINT}` });
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, ...(init.headers || {}) },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const timedOut = err instanceof Error && /abort|timeout/i.test(err.name + err.message);
    const info: LinkedInErrorInfo = timedOut
      ? { code: 'TIMEOUT', operation, at: new Date().toISOString(), message: `${OPERATION_LABELS[operation] || operation} took too long. Try a narrower search.` }
      : { code: 'NETWORK', operation, at: new Date().toISOString(), message: 'Could not reach the LinkedIn scraper service. Check your internet connection and try again.' };
    lastError = info;
    logger.warn(`LinkedIn ${operation} network error`, { error: String(err) });
    throw new LinkedInApiError(info);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok || data === null) {
    const info = classifyError(operation, res.status, data);
    lastError = info;
    logger.warn(`LinkedIn ${operation} failed: ${info.code} ${info.message}`);
    throw new LinkedInApiError(info);
  }
  if (lastError?.operation === operation) lastError = undefined;
  return data;
}

/** Runs one actor synchronously and returns its dataset items. */
async function runActor(operation: keyof typeof ACTORS, input: Record<string, unknown>, ttl: number): Promise<{ items: Record<string, unknown>[]; cached: boolean }> {
  const actorId = ACTORS[operation]().replace('/', '~');
  // Undefined fields are dropped by JSON.stringify, so identical requests share one cache key.
  const body = JSON.stringify(input);
  const cacheKey = `${actorId} ${body}`;

  const hit = cacheGet<Record<string, unknown>[]>(cacheKey);
  if (hit) return { items: hit, cached: true };
  const pending = inFlight.get(cacheKey);
  if (pending) return { items: (await pending) as Record<string, unknown>[], cached: true };

  const run = (async () => {
    const url = `${getBaseUrl()}/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?timeout=110&clean=true`;
    const data = await authedFetch(operation, url, { method: 'POST', body }, 120000);
    const items = (Array.isArray(data) ? data : []).filter((x): x is Record<string, unknown> => !!x && typeof x === 'object');
    cacheSet(cacheKey, items, ttl);
    return items;
  })();

  inFlight.set(cacheKey, run);
  try {
    return { items: await run, cached: false };
  } finally {
    inFlight.delete(cacheKey);
  }
}

const toErrorInfo = (err: unknown, operation: string): LinkedInErrorInfo =>
  err instanceof LinkedInApiError
    ? err.info
    : { code: 'HTTP_ERROR', operation, at: new Date().toISOString(), message: 'LinkedIn request failed unexpectedly.' };

// ---------------------------------------------------------------------------
// Mapping (field names follow the actors' documented output)
// ---------------------------------------------------------------------------

const str = (...vals: unknown[]) => vals.find((v): v is string => typeof v === 'string' && v.trim().length > 0)?.trim();
const num = (...vals: unknown[]) => vals.find((v): v is number => typeof v === 'number' && Number.isFinite(v));
const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const arr = (v: unknown) => (Array.isArray(v) ? v : []);

/** Strips tracking query strings LinkedIn appends to profile/company URLs. */
export const cleanLinkedInUrl = (url?: string) => url?.split('?')[0].replace(/\/+$/, '') || undefined;

/** "CTO at Acme Health | AI" -> "Acme Health". Only reads what the person wrote in their own headline. */
export function companyFromHeadline(headline?: string): string | undefined {
  if (!headline) return undefined;
  const m = headline.match(/(?:\bat\b|@)\s+([^|•·,\n]+?)(?:\s+[-–—]\s+|\s*[|•·,\n]|$)/i);
  const name = m?.[1]?.trim().replace(/[.\s]+$/, '');
  return name && name.length >= 2 && name.length <= 60 ? name : undefined;
}

export function mapPost(item: Record<string, unknown>): LinkedInPostResult | null {
  const author = obj(item.author);
  const engagement = obj(item.engagement);
  const postedAt = obj(item.postedAt);
  const url = cleanLinkedInUrl(str(item.linkedinUrl, obj(item.socialContent).shareUrl));
  const content = str(item.content, item.text);
  if (!url || !content) return null;
  const headline = str(author.info, author.headline);
  const authorType = author.type === 'company' ? 'company' : 'profile';
  const authorName = str(author.name) || 'LinkedIn member';
  return {
    id: str(item.id) || url,
    url,
    content,
    authorName,
    authorHeadline: headline,
    authorProfileUrl: cleanLinkedInUrl(str(author.linkedinUrl)),
    authorType,
    authorCompany: authorType === 'company' ? authorName : companyFromHeadline(headline),
    postedAt: str(postedAt.date) || (num(postedAt.timestamp) ? new Date(num(postedAt.timestamp)!).toISOString() : undefined),
    likes: num(engagement.likes) || 0,
    comments: num(engagement.comments) || 0,
    shares: num(engagement.shares) || 0,
  };
}

export function mapProfile(item: Record<string, unknown>): LinkedInProfileResult | null {
  const profileUrl = cleanLinkedInUrl(str(item.linkedinUrl)) || (str(item.publicIdentifier) ? `https://www.linkedin.com/in/${str(item.publicIdentifier)}` : undefined);
  const firstName = str(item.firstName);
  const lastName = str(item.lastName);
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || str(item.name, item.fullName);
  if (!profileUrl || !fullName) return null;

  const location = obj(item.location);
  const parsedLoc = obj(location.parsed);
  const experience = arr(item.experience).map(obj);
  const current = obj(arr(item.currentPosition)[0]);
  // The current role is the experience entry without an end date (or simply the first one).
  const currentExp = experience.find((e) => !e.endDate || obj(e.endDate).text === 'Present') || experience[0] || {};
  const emails = arr(item.emails).map((e) => (typeof e === 'string' ? e : str(obj(e).email)));

  return {
    id: str(item.id) || profileUrl,
    profileUrl,
    publicIdentifier: str(item.publicIdentifier),
    fullName,
    firstName,
    lastName,
    headline: str(item.headline),
    about: str(item.about),
    jobTitle: str(current.position, current.title, currentExp.position),
    companyName: str(current.companyName, currentExp.companyName),
    companyLinkedinUrl: cleanLinkedInUrl(str(current.companyLinkedinUrl, currentExp.companyLinkedinUrl)),
    location: str(location.linkedinText, parsedLoc.text),
    country: str(parsedLoc.country, location.countryCode),
    email: str(item.email, ...emails),
    hiring: item.hiring === true,
    openToWork: item.openToWork === true,
    followerCount: num(item.followerCount),
    connectionsCount: num(item.connectionsCount),
    topSkills: str(item.topSkills),
    experience: experience
      .map((e) => ({ title: str(e.position, e.title) || '', company: str(e.companyName) || '', duration: str(e.duration) }))
      .filter((e) => e.title || e.company)
      .slice(0, 5),
  };
}

const domainFromUrl = (url?: string) => {
  if (!url) return undefined;
  try {
    const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '').toLowerCase();
    return /linkedin\.com|lnkd\.in|bit\.ly/.test(host) ? undefined : host;
  } catch {
    return undefined;
  }
};

export function mapCompany(item: Record<string, unknown>): LinkedInCompanyResult | null {
  const name = str(item.name);
  const linkedinUrl = cleanLinkedInUrl(str(item.linkedinUrl)) || (str(item.universalName) ? `https://www.linkedin.com/company/${str(item.universalName)}` : undefined);
  if (!name || !linkedinUrl) return null;
  const range = obj(item.employeeCountRange);
  const hq = arr(item.locations).map(obj).find((l) => l.headquarter === true) || obj(arr(item.locations)[0]);
  const industries = arr(item.industries).map((i) => (typeof i === 'string' ? i : str(obj(i).name))).filter((x): x is string => !!x);
  const website = str(item.website);
  return {
    id: str(item.id) || linkedinUrl,
    name,
    linkedinUrl,
    universalName: str(item.universalName),
    website,
    domain: domainFromUrl(website),
    tagline: str(item.tagline),
    description: str(item.description),
    industry: industries[0],
    specialities: arr(item.specialities).filter((x): x is string => typeof x === 'string').slice(0, 12),
    employeeCount: num(item.employeeCount),
    employeeRange: num(range.start) !== undefined ? `${range.start}${num(range.end) !== undefined ? ` - ${range.end}` : '+'}` : undefined,
    followerCount: num(item.followerCount),
    headquarters: [str(hq.city), str(hq.geographicArea), str(hq.country)].filter(Boolean).join(', ') || undefined,
    foundedYear: num(obj(item.foundedOn).year),
    companyType: str(item.companyType),
  };
}

const mapList = <T>(items: Record<string, unknown>[], mapper: (i: Record<string, unknown>) => T | null): T[] =>
  items.map(mapper).filter((x): x is T => x !== null);

const clampInt = (value: number | undefined, fallback: number, max: number) => Math.min(Math.max(Math.round(value || fallback), 1), max);

export type PostedLimit = '1h' | '24h' | 'week' | 'month' | '3months';

/** Maps a "since" date to the closest window the post search supports. */
export function postedLimitFromDate(since?: Date): PostedLimit {
  if (!since) return 'week';
  const hours = (Date.now() - since.getTime()) / 3600000;
  if (hours <= 1.5) return '1h';
  if (hours <= 30) return '24h';
  if (hours <= 24 * 8) return 'week';
  if (hours <= 24 * 32) return 'month';
  return '3months';
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

export const linkedinProvider = {
  /** Public posts matching a search query (same syntax as the LinkedIn search bar). */
  async searchPosts(params: { query: string; postedLimit?: PostedLimit; maxPosts?: number; authorKeywords?: string; sortBy?: 'relevance' | 'date' }): Promise<LinkedInListResponse<LinkedInPostResult>> {
    const query = params.query.trim().slice(0, 480);
    if (!query) return { items: [] };
    try {
      const { items, cached } = await runActor('postSearch', {
        searchQueries: [query],
        maxPosts: clampInt(params.maxPosts, 20, 100),
        postedLimit: params.postedLimit || 'week',
        sortBy: params.sortBy || 'date',
        authorKeywords: params.authorKeywords?.trim() || undefined,
      }, TTL.search);
      return { items: mapList(items, mapPost), cached };
    } catch (err) {
      if (!(err instanceof LinkedInApiError)) logger.error('LinkedIn searchPosts failed', err);
      return { items: [], error: toErrorInfo(err, 'postSearch') };
    }
  },

  /** People search by keyword, job title, location and current company (company LinkedIn URLs). */
  async searchProfiles(params: { query?: string; jobTitles?: string[]; locations?: string[]; companyUrls?: string[]; maxItems?: number }): Promise<LinkedInListResponse<LinkedInProfileResult>> {
    const jobTitles = (params.jobTitles || []).map((t) => t.trim()).filter(Boolean);
    const locations = (params.locations || []).map((t) => t.trim()).filter(Boolean);
    const companyUrls = (params.companyUrls || []).map((t) => t.trim()).filter(Boolean);
    const query = params.query?.trim();
    if (!query && !jobTitles.length && !companyUrls.length) return { items: [] };
    try {
      const { items, cached } = await runActor('profileSearch', {
        searchQuery: query || undefined,
        currentJobTitles: jobTitles.length ? jobTitles : undefined,
        locations: locations.length ? locations : undefined,
        currentCompanies: companyUrls.length ? companyUrls : undefined,
        maxItems: clampInt(params.maxItems, 10, 50),
        profileScraperMode: process.env.LINKEDIN_PROFILE_SEARCH_MODE || undefined,
      }, TTL.search);
      return { items: mapList(items, mapProfile), cached };
    } catch (err) {
      if (!(err instanceof LinkedInApiError)) logger.error('LinkedIn searchProfiles failed', err);
      return { items: [], error: toErrorInfo(err, 'profileSearch') };
    }
  },

  /** Full profile (headline, About, experience) for one profile URL or public identifier. */
  async getProfile(urlOrIdentifier: string): Promise<{ profile: LinkedInProfileResult | null; error?: LinkedInErrorInfo }> {
    const query = urlOrIdentifier.trim();
    if (!query) return { profile: null };
    try {
      const { items } = await runActor('profile', { queries: [cleanLinkedInUrl(query) || query] }, TTL.profile);
      return { profile: mapList(items, mapProfile)[0] || null };
    } catch (err) {
      if (!(err instanceof LinkedInApiError)) logger.error('LinkedIn getProfile failed', err);
      return { profile: null, error: toErrorInfo(err, 'profile') };
    }
  },

  /** Recent posts by one person or company (profile or company URL). */
  async getRecentPosts(profileOrCompanyUrl: string, maxPosts = 5): Promise<LinkedInListResponse<LinkedInPostResult>> {
    const url = cleanLinkedInUrl(profileOrCompanyUrl.trim());
    if (!url) return { items: [] };
    try {
      const { items, cached } = await runActor('profilePosts', {
        targetUrls: [url],
        maxPosts: clampInt(maxPosts, 5, 25),
        postedLimit: '3months',
        includeReposts: false,
      }, TTL.profile);
      return { items: mapList(items, mapPost), cached };
    } catch (err) {
      if (!(err instanceof LinkedInApiError)) logger.error('LinkedIn getRecentPosts failed', err);
      return { items: [], error: toErrorInfo(err, 'profilePosts') };
    }
  },

  /** Company page details by LinkedIn company URL, or by name search. */
  async getCompany(params: { url?: string; name?: string }): Promise<{ company: LinkedInCompanyResult | null; error?: LinkedInErrorInfo }> {
    const url = cleanLinkedInUrl(params.url?.trim());
    const name = params.name?.trim();
    if (!url && !name) return { company: null };
    try {
      const { items } = await runActor('company', url ? { companies: [url] } : { searches: [name] }, TTL.company);
      return { company: mapList(items, mapCompany)[0] || null };
    } catch (err) {
      if (!(err instanceof LinkedInApiError)) logger.error('LinkedIn getCompany failed', err);
      return { company: null, error: toErrorInfo(err, 'company') };
    }
  },

  /** People working at a company (by its LinkedIn company URL), optionally filtered by job title / name. */
  async getCompanyPeople(params: { companyUrl: string; jobTitles?: string[]; query?: string; maxItems?: number }): Promise<LinkedInListResponse<LinkedInProfileResult>> {
    const companyUrl = cleanLinkedInUrl(params.companyUrl.trim());
    if (!companyUrl) return { items: [] };
    const jobTitles = (params.jobTitles || []).map((t) => t.trim()).filter(Boolean);
    try {
      const { items, cached } = await runActor('companyEmployees', {
        companies: [companyUrl],
        jobTitles: jobTitles.length ? jobTitles : undefined,
        searchQuery: params.query?.trim() || undefined,
        maxItems: clampInt(params.maxItems, 5, 25),
        profileScraperMode: process.env.LINKEDIN_COMPANY_PEOPLE_MODE || undefined,
      }, TTL.search);
      return { items: mapList(items, mapProfile), cached };
    } catch (err) {
      if (!(err instanceof LinkedInApiError)) logger.error('LinkedIn getCompanyPeople failed', err);
      return { items: [], error: toErrorInfo(err, 'companyEmployees') };
    }
  },

  /** Verifies the key and reports the account's monthly usage against its limit. */
  async checkAccount(): Promise<{ ok: boolean; message: string; account?: string; monthlyUsageUsd?: number; monthlyLimitUsd?: number; error?: LinkedInErrorInfo }> {
    const cached = cacheGet<{ ok: boolean; message: string; account?: string; monthlyUsageUsd?: number; monthlyLimitUsd?: number }>('account');
    if (cached) return cached;
    try {
      const me = obj(obj(await authedFetch('account', `${getBaseUrl()}/users/me`, { method: 'GET' }, 20000)).data);
      let monthlyUsageUsd: number | undefined;
      let monthlyLimitUsd: number | undefined;
      try {
        const limits = obj(obj(await authedFetch('account', `${getBaseUrl()}/users/me/limits`, { method: 'GET' }, 20000)).data);
        monthlyUsageUsd = num(obj(limits.current).monthlyUsageUsd);
        monthlyLimitUsd = num(obj(limits.limits).maxMonthlyUsageUsd);
      } catch { /* usage is optional */ }
      const account = str(me.username, me.email);
      const exhausted = monthlyUsageUsd !== undefined && monthlyLimitUsd !== undefined && monthlyUsageUsd >= monthlyLimitUsd;
      const result = {
        ok: !exhausted,
        account,
        monthlyUsageUsd,
        monthlyLimitUsd,
        message: exhausted
          ? 'The LinkedIn scraper key is valid, but this month\'s Apify usage limit is used up.'
          : `LinkedIn scraper connected${account ? ` (Apify account: ${account})` : ''}.`,
      };
      cacheSet('account', result, TTL.account);
      return result;
    } catch (err) {
      const info = toErrorInfo(err, 'account');
      return { ok: false, message: info.message, error: info };
    }
  },
};
