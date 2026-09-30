import { logger } from '@/lib/logger';

export interface ApolloPersonMatch {
  apolloPersonId: string;
  personName: string;
  linkedinUrl?: string;
  jobTitle?: string;
  seniority?: string;
  location?: string;
  country?: string;
  employeeCount?: number;
  employeeRange?: string;
  organizationName?: string;
  organizationDomain?: string;
  organizationIndustry?: string;
  technologies?: string[];
  workEmail?: string;
  personalEmail?: string;
  phone?: string;
  hasEmailAvailable?: boolean;
  hasPhoneAvailable?: boolean;
  creditsUsed: number;
  apolloOrganizationId?: string;
  searchMatches?: { type: 'keyword' | 'tech' | 'hiring' | 'title' | 'domain'; label: string }[];
}

export interface ApolloOrganizationMatch {
  apolloOrganizationId: string;
  apolloOrgId?: string;
  name: string;
  organizationName?: string;
  domain?: string;
  organizationDomain?: string;
  websiteUrl?: string;
  linkedinUrl?: string;
  industry?: string;
  organizationIndustry?: string;
  description?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  employeeCount?: number;
  employeeRange?: string;
  estimatedRevenue?: string;
  revenuePrinted?: string;
  revenue?: number;
  technologies?: string[];
  fundingStage?: string;
  fundingTotal?: string;
  latestFundingStage?: string;
  latestFundingDate?: string;
  latestFundingAmount?: string;
  totalFundingPrinted?: string;
  totalFunding?: number;
  openJobsCount?: number;
  foundedYear?: number;
  whyThisCompanySummary?: string;
  hasPhone?: boolean;
  searchMatches?: { type: 'keyword' | 'tech' | 'hiring' | 'title' | 'domain'; label: string }[];
}

export interface ApolloOrgSearchParams {
  keywords?: string;
  domain?: string;
  name?: string;
  location?: string;
  employeeCountRange?: string;
  minRevenue?: number;
  maxRevenue?: number;
  techUsage?: string;
  hiringKeywords?: string;
  minOpenJobs?: number;
  fundingStage?: string;
  fundingPresetDays?: number;
  fundingDateFrom?: string;
  fundingDateTo?: string;
  page?: number;
  perPage?: number;
}

export type ApolloErrorCode = 'NOT_CONFIGURED' | 'INVALID_KEY' | 'RATE_LIMIT' | 'CREDITS_EXHAUSTED' | 'BAD_REQUEST' | 'HTTP_ERROR' | 'NETWORK';

export interface ApolloErrorInfo {
  code: ApolloErrorCode;
  message: string;
  endpoint: string;
  at: string;
}

export interface ApolloOrgSearchResponse {
  organizations: ApolloOrganizationMatch[];
  totalCount: number;
  page: number;
  perPage: number;
  /** Set when Apollo could not answer (limit reached, no credits, bad key...). Results are then empty. */
  error?: ApolloErrorInfo;
}

export interface ApolloSearchParams {
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
}

export interface ApolloSearchResponse {
  people: ApolloPersonMatch[];
  totalCount: number;
  page: number;
  perPage: number;
  error?: ApolloErrorInfo;
}

export interface ApolloUsageEndpoint {
  endpoint: string;
  label: string;
  dayLimit: number;
  dayUsed: number;
  dayLeft: number;
}

export interface ApolloProvider {
  searchPeople(params: { name: string; domain?: string }): Promise<ApolloPersonMatch[]>;
  searchPeopleAdvanced(params: ApolloSearchParams): Promise<ApolloSearchResponse>;
  searchOrganizationsAdvanced(params: ApolloOrgSearchParams): Promise<ApolloOrgSearchResponse>;
  enrichPerson(params: {
    apolloPersonId: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    domain?: string;
    organizationName?: string;
    revealPersonalEmail?: boolean;
    revealPhone?: boolean;
    webhookUrl?: string;
  }): Promise<ApolloPersonMatch | null>;
  enrichOrganization(params: { apolloOrgId?: string; domain?: string }): Promise<ApolloOrganizationMatch | null>;
  searchContacts(params: { email?: string; name?: string }): Promise<ApolloPersonMatch[]>;
  getContact(params: { contactId: string }): Promise<ApolloPersonMatch | null>;
  getUsage(): Promise<ApolloUsageEndpoint[] | null>;
  checkHealth(): Promise<{ ok: boolean; message: string }>;
}

// ---------------------------------------------------------------------------
// Request layer: auth header, error classification, caching, in-flight dedupe
// ---------------------------------------------------------------------------

const API_BASE = 'https://api.apollo.io/api/v1';

const ENDPOINT_LABELS: Record<string, string> = {
  'mixed_people/api_search': 'People search',
  'organizations/search': 'Company search',
  'people/match': 'Person enrichment',
  'organizations/enrich': 'Company enrichment',
  'organizations/show': 'Company lookup',
};

export class ApolloApiError extends Error {
  constructor(public readonly info: ApolloErrorInfo) {
    super(info.message);
    this.name = 'ApolloApiError';
  }
}

// Last error per endpoint; cleared when that endpoint succeeds again. Read by the UI via getApolloStatus().
const lastErrors = new Map<string, ApolloErrorInfo>();

export function getLastApolloErrors(): ApolloErrorInfo[] {
  return Array.from(lastErrors.values()).sort((a, b) => b.at.localeCompare(a.at));
}

type CacheEntry = { expires: number; value: unknown };
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<unknown>>();
const MAX_CACHE_ENTRIES = 400;

const TTL = {
  search: 20 * 60 * 1000, // repeated searches (pagination back/forth, re-renders) cost no quota
  enrich: 24 * 60 * 60 * 1000,
  usage: 60 * 1000,
  health: 5 * 60 * 1000,
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

// Placeholder values that must never be sent to Apollo as a key.
const PLACEHOLDER_KEYS = new Set(['', 'your-apollo-api-key-here', 'ap_live_98a7f432194b2']);
let settingsKeyCache: { value: string | undefined; expires: number } | null = null;

/** APOLLO_API_KEY from .env wins; otherwise a real key saved on the Settings page is used. */
async function getApiKey(): Promise<string | undefined> {
  if (process.env.APOLLO_MOCK_MODE === 'true') return undefined;
  const envKey = process.env.APOLLO_API_KEY?.trim();
  if (envKey && !PLACEHOLDER_KEYS.has(envKey)) return envKey;

  if (!settingsKeyCache || settingsKeyCache.expires < Date.now()) {
    let value: string | undefined;
    try {
      // Loaded lazily so this module stays importable for types without pulling in the database.
      const { SettingsService } = await import('@/lib/settings');
      const saved = (await SettingsService.get('apolloApiKey', '')).trim();
      value = PLACEHOLDER_KEYS.has(saved) || /^ap_live_x+$/i.test(saved) ? undefined : saved;
    } catch {
      value = undefined;
    }
    settingsKeyCache = { value, expires: Date.now() + 60000 };
  }
  return settingsKeyCache.value;
}

export async function isApolloConfigured(): Promise<boolean> {
  return !!(await getApiKey());
}

function classifyError(endpoint: string, status: number, body: Record<string, unknown> | null): ApolloErrorInfo {
  const details = (body?.error_details as Record<string, unknown>) || {};
  const code = String(details.code || body?.error_code || '');
  const raw = String(body?.message || body?.error || details.message || '').replace(/<[^>]+>/g, '').trim();
  const label = ENDPOINT_LABELS[endpoint] || endpoint;
  const at = new Date().toISOString();

  if (status === 429 || /RATE_LIMIT/i.test(code) || /maximum number of api calls|rate limit/i.test(raw)) {
    const limit = raw.match(/is (\d+) times per (\w+)/);
    return {
      code: 'RATE_LIMIT', endpoint, at,
      message: limit
        ? `Apollo ${label.toLowerCase()} limit reached (${limit[1]} calls per ${limit[2]} on your plan). It resets automatically; try again later.`
        : `Apollo ${label.toLowerCase()} rate limit reached. Please wait and try again.`,
    };
  }
  if (/CREDITS|credit/i.test(code) || /insufficient credits/i.test(raw)) {
    return { code: 'CREDITS_EXHAUSTED', endpoint, at, message: `Your Apollo account has no credits left this billing cycle, so ${label.toLowerCase()} is unavailable. Upgrade the Apollo plan or wait for the next cycle.` };
  }
  if (status === 401 || status === 403 || /INVALID_API_KEY|api key/i.test(code + raw)) {
    return { code: 'INVALID_KEY', endpoint, at, message: 'Apollo rejected the API key. Check APOLLO_API_KEY in your environment settings.' };
  }
  if (status === 422 || status === 400) {
    return { code: 'BAD_REQUEST', endpoint, at, message: `Apollo could not process this ${label.toLowerCase()} request${raw ? `: ${raw.slice(0, 160)}` : '.'}` };
  }
  return { code: 'HTTP_ERROR', endpoint, at, message: `Apollo ${label.toLowerCase()} failed (HTTP ${status}). Please try again.` };
}

async function apolloRequest<T>(
  endpoint: string,
  options: { method?: 'GET' | 'POST'; body?: Record<string, unknown>; query?: Record<string, string>; ttl?: number } = {}
): Promise<T> {
  const apiKey = await getApiKey();
  const at = new Date().toISOString();
  if (!apiKey) {
    throw new ApolloApiError({ code: 'NOT_CONFIGURED', endpoint, at, message: 'Apollo is not configured. Add APOLLO_API_KEY to .env or save a real key on the Settings page.' });
  }

  const method = options.method || 'POST';
  const qs = options.query ? `?${new URLSearchParams(options.query).toString()}` : '';
  // Undefined fields are dropped so identical searches share one cache key.
  const body = options.body ? JSON.stringify(options.body) : undefined;
  const cacheKey = `${method} ${endpoint}${qs} ${body || ''}`;

  if (options.ttl) {
    const cached = cacheGet<T>(cacheKey);
    if (cached !== undefined) return cached;
    const pending = inFlight.get(cacheKey);
    if (pending) return pending as Promise<T>;
  }

  const run = (async () => {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/${endpoint}${qs}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', 'x-api-key': apiKey },
        body,
        signal: AbortSignal.timeout(30000),
      });
    } catch (err) {
      const info: ApolloErrorInfo = { code: 'NETWORK', endpoint, at: new Date().toISOString(), message: 'Could not reach Apollo. Check your internet connection and try again.' };
      lastErrors.set(endpoint, info);
      logger.warn(`Apollo ${endpoint} network error`, { error: String(err) });
      throw new ApolloApiError(info);
    }

    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    // Apollo sometimes returns 200 with a limit message in the body.
    const softError = res.ok && data && typeof data.message === 'string' && /maximum number of api calls|insufficient credits/i.test(data.message);
    if (!res.ok || softError || !data) {
      const info = classifyError(endpoint, res.status, data);
      lastErrors.set(endpoint, info);
      logger.warn(`Apollo ${endpoint} failed: ${info.code} ${info.message}`);
      throw new ApolloApiError(info);
    }

    lastErrors.delete(endpoint);
    if (options.ttl) cacheSet(cacheKey, data, options.ttl);
    return data as T;
  })();

  if (options.ttl) inFlight.set(cacheKey, run);
  try {
    return await run;
  } finally {
    inFlight.delete(cacheKey);
  }
}

const toErrorInfo = (err: unknown, endpoint: string): ApolloErrorInfo =>
  err instanceof ApolloApiError
    ? err.info
    : { code: 'HTTP_ERROR', endpoint, at: new Date().toISOString(), message: 'Apollo request failed unexpectedly.' };

// ---------------------------------------------------------------------------
// Parameter helpers
// ---------------------------------------------------------------------------

const clean = (v?: string) => (v ? v.replace(/^e\.g\.\s*/i, '').trim() || undefined : undefined);
const splitList = (v?: string) => (v ? v.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean) : []);
export const normalizeDomain = (v?: string) =>
  clean(v)?.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/[/?#].*$/, '') || undefined;
// Apollo technology UIDs are lowercase with underscores, e.g. "google_analytics", "node_js".
const toTechUids = (v?: string) => splitList(v).map((t) => t.toLowerCase().replace(/[\s.]+/g, '_').replace(/[^a-z0-9_]/g, ''));
const orUndefined = <T>(arr: T[]) => (arr.length ? arr : undefined);
const pickString = (...vals: unknown[]) => vals.find((v): v is string => typeof v === 'string' && v.trim().length > 0);
const pickNumber = (...vals: unknown[]) => vals.find((v): v is number => typeof v === 'number' && Number.isFinite(v));

function extractTechnologies(org?: Record<string, unknown>, person?: Record<string, unknown>): string[] {
  const o = org || {};
  const p = person || {};
  const sources = [o.technology_names, p.organization_technology_names, o.current_technologies, p.current_technologies];
  const names: string[] = [];
  for (const source of sources) {
    if (!Array.isArray(source)) continue;
    for (const item of source) {
      if (typeof item === 'string' && item.trim()) names.push(item.trim());
      else if (item && typeof item === 'object') {
        const val = pickString((item as Record<string, unknown>).name, (item as Record<string, unknown>).display_name);
        if (val) names.push(val.trim());
      }
    }
  }
  return Array.from(new Set(names));
}

function nameFromDomain(domain?: string) {
  const host = domain?.split('.')[0];
  return host ? host.charAt(0).toUpperCase() + host.slice(1) : undefined;
}

function mapOrganization(o: Record<string, unknown>): ApolloOrganizationMatch {
  const city = pickString(o.city);
  const state = pickString(o.state);
  const country = pickString(o.country);
  const domain = pickString(o.primary_domain, o.domain);
  const techList = extractTechnologies(o);
  const openJobs = pickNumber(o.num_open_jobs, o.open_jobs_count);
  const latestFundingStage = pickString(o.latest_funding_stage);
  const latestFundingDate = pickString(o.latest_funding_round_date);
  const latestFundingAmount = pickNumber(o.latest_funding_amount) !== undefined ? String(o.latest_funding_amount) : pickString(o.latest_funding_amount);

  const summaryParts: string[] = [];
  if (latestFundingStage || latestFundingDate) {
    const when = latestFundingDate ? ` in ${new Date(latestFundingDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : '';
    summaryParts.push(`Funded${latestFundingStage ? ` (${latestFundingStage})` : ''}${when}`);
  }
  if (openJobs && openJobs > 0) summaryParts.push(`Hiring for ${openJobs} roles`);
  if (techList.length) summaryParts.push(`Uses ${techList.slice(0, 3).join(', ')}`);

  return {
    apolloOrganizationId: pickString(o.id, o.organization_id) || `apollo-org-${domain || pickString(o.name) || 'unknown'}`,
    name: pickString(o.name) || nameFromDomain(domain) || 'Unnamed company',
    domain,
    websiteUrl: pickString(o.website_url),
    linkedinUrl: pickString(o.linkedin_url),
    industry: pickString(o.industry) || (Array.isArray(o.industries) ? pickString(o.industries[0]) : undefined),
    description: pickString(o.short_description, o.seo_description),
    location: pickString(o.raw_address) || [city, state, country].filter(Boolean).join(', ') || undefined,
    city,
    state,
    country,
    employeeCount: pickNumber(o.estimated_num_employees, o.employee_count),
    employeeRange: pickString(o.employee_range, o.estimated_num_employees_printed),
    revenuePrinted: pickString(o.organization_revenue_printed, o.annual_revenue_printed),
    revenue: pickNumber(o.organization_revenue, o.annual_revenue),
    technologies: techList.length ? techList.slice(0, 8) : undefined,
    latestFundingStage,
    latestFundingDate,
    latestFundingAmount,
    totalFundingPrinted: pickString(o.total_funding_printed),
    totalFunding: pickNumber(o.total_funding),
    openJobsCount: openJobs,
    foundedYear: pickNumber(o.founded_year),
    whyThisCompanySummary: summaryParts.length ? summaryParts.join(' • ') : undefined,
    hasPhone: Boolean(o.phone || (o.primary_phone as Record<string, unknown> | undefined)?.number),
    searchMatches: openJobs && openJobs > 0 ? [{ type: 'hiring', label: `Hiring for ${openJobs} roles` }] : undefined,
  };
}

function mapPerson(p: Record<string, unknown>, fallback: { domain?: string; creditsUsed: number }): ApolloPersonMatch {
  const org = (p.organization as Record<string, unknown>) || {};
  const city = pickString(p.city);
  const state = pickString(p.state);
  const country = pickString(p.country);
  const orgDomain = pickString(org.primary_domain, org.domain) || fallback.domain;
  const industry = pickString(org.industry) || (Array.isArray(org.industries) ? pickString(org.industries[0]) : undefined);
  const techList = extractTechnologies(org, p);
  const openJobs = pickNumber(org.num_open_jobs);
  const fundingStage = pickString(org.latest_funding_stage);
  const searchMatches: NonNullable<ApolloPersonMatch['searchMatches']> = [];
  if (openJobs && openJobs > 0) searchMatches.push({ type: 'hiring', label: `Hiring for ${openJobs} roles` });
  if (fundingStage) searchMatches.push({ type: 'hiring', label: `Funded (${fundingStage})` });

  const phoneNumbers = Array.isArray(p.phone_numbers) ? (p.phone_numbers as Record<string, unknown>[]) : [];
  const personalEmails = Array.isArray(p.personal_emails) ? (p.personal_emails as string[]) : [];
  const email = pickString(p.email);
  // Apollo returns placeholder addresses for locked emails; never treat those as real.
  const workEmail = email && !/email_not_unlocked|@domain\.com$/i.test(email) ? email : undefined;
  const lastName = pickString(p.last_name, p.last_name_obfuscated) || '';

  return {
    apolloPersonId: pickString(p.id) || `apollo-p-${pickString(p.first_name) || 'unknown'}-${orgDomain || ''}`,
    personName: `${pickString(p.first_name) || ''} ${lastName}`.trim() || pickString(p.name) || 'Unnamed contact',
    linkedinUrl: pickString(p.linkedin_url),
    jobTitle: pickString(p.title),
    seniority: pickString(p.seniority),
    organizationName: pickString(org.name, p.organization_name) || nameFromDomain(orgDomain),
    organizationDomain: orgDomain,
    organizationIndustry: industry,
    location: [city, state, country].filter(Boolean).join(', ') || undefined,
    country,
    employeeCount: pickNumber(org.estimated_num_employees),
    employeeRange: pickString(org.estimated_num_employees_printed, org.employee_range),
    technologies: techList.length ? techList.slice(0, 6) : undefined,
    workEmail,
    personalEmail: personalEmails.find((e) => typeof e === 'string' && e.includes('@')),
    phone: pickString(phoneNumbers[0]?.sanitized_number, phoneNumbers[0]?.raw_number, p.sanitized_phone),
    apolloOrganizationId: pickString(org.id, p.organization_id),
    hasEmailAvailable: Boolean(p.has_email || workEmail),
    hasPhoneAvailable: p.has_direct_phone === 'Yes' || p.has_direct_phone === true || phoneNumbers.length > 0,
    creditsUsed: fallback.creditsUsed,
    searchMatches: searchMatches.length ? searchMatches : undefined,
  };
}

const emptyPeople = (params: { page?: number; perPage?: number }, error?: ApolloErrorInfo): ApolloSearchResponse =>
  ({ people: [], totalCount: 0, page: params.page || 1, perPage: params.perPage || 10, error });
const emptyOrgs = (params: { page?: number; perPage?: number }, error?: ApolloErrorInfo): ApolloOrgSearchResponse =>
  ({ organizations: [], totalCount: 0, page: params.page || 1, perPage: params.perPage || 10, error });

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export class DefaultApolloProvider implements ApolloProvider {
  /**
   * Find one person by name at a company domain (people/match). Uses one credit when Apollo reveals data.
   */
  async searchPeople(params: { name: string; domain?: string }): Promise<ApolloPersonMatch[]> {
    const [first, ...rest] = params.name.trim().split(/\s+/);
    const domain = normalizeDomain(params.domain);
    try {
      const data = await apolloRequest<{ person?: Record<string, unknown> }>('people/match', {
        body: { first_name: first, last_name: rest.join(' ') || undefined, domain },
        ttl: TTL.enrich,
      });
      return data.person ? [mapPerson(data.person, { domain, creditsUsed: 1 })] : [];
    } catch (err) {
      if (!(err instanceof ApolloApiError)) logger.error('Apollo searchPeople failed', err);
      return [];
    }
  }

  /**
   * People search (mixed_people/api_search). Costs no credits, but has a daily call limit.
   * Note: this endpoint returns limited fields (obfuscated last name, title, company name, has_email flags).
   */
  async searchPeopleAdvanced(params: ApolloSearchParams): Promise<ApolloSearchResponse> {
    const domain = normalizeDomain(params.domain);
    const keywordParts = [clean(params.keywords), clean(params.companyName), clean(params.hiringActivity)].filter(Boolean);
    const perPage = Math.min(Math.max(params.perPage || 10, 1), 100);
    const body: Record<string, unknown> = {
      person_titles: orUndefined(splitList(clean(params.jobTitle))),
      person_seniorities: orUndefined(splitList(params.seniority).map((s) => s.toLowerCase())),
      person_locations: orUndefined(splitList(clean(params.personLocation))),
      organization_locations: orUndefined(splitList(clean(params.orgLocation))),
      // The correct filter name; Apollo silently ignores "organization_domains".
      q_organization_domains_list: domain ? [domain] : undefined,
      currently_using_any_of_technology_uids: orUndefined(toTechUids(params.techUsage)),
      q_keywords: keywordParts.length ? keywordParts.join(' ') : undefined,
      page: params.page || 1,
      per_page: perPage,
    };

    try {
      const data = await apolloRequest<{ people?: Record<string, unknown>[]; total_entries?: number; pagination?: { total_entries?: number } }>(
        'mixed_people/api_search', { body, ttl: TTL.search }
      );
      const people = (data.people || []).map((p) => mapPerson(p, { domain, creditsUsed: 0 }));
      return {
        people,
        totalCount: data.total_entries ?? data.pagination?.total_entries ?? people.length,
        page: params.page || 1,
        perPage,
      };
    } catch (err) {
      if (!(err instanceof ApolloApiError)) logger.error('Apollo searchPeopleAdvanced failed', err);
      return emptyPeople({ ...params, perPage }, toErrorInfo(err, 'mixed_people/api_search'));
    }
  }

  /**
   * Company search (organizations/search). Costs no credits, but has a daily call limit.
   */
  async searchOrganizationsAdvanced(params: ApolloOrgSearchParams): Promise<ApolloOrgSearchResponse> {
    const domain = normalizeDomain(params.domain);
    const perPage = Math.min(Math.max(params.perPage || 10, 1), 100);
    const body: Record<string, unknown> = {
      q_organization_name: clean(params.name),
      q_organization_domains_list: domain ? [domain] : undefined,
      q_organization_keyword_tags: orUndefined(splitList(clean(params.keywords))),
      q_organization_job_titles: orUndefined(splitList(clean(params.hiringKeywords))),
      organization_locations: orUndefined(splitList(clean(params.location))),
      organization_num_employees_ranges: params.employeeCountRange ? [params.employeeCountRange] : undefined,
      currently_using_any_of_technology_uids: orUndefined(toTechUids(params.techUsage)),
      latest_funding_stage_cd: orUndefined(splitList(params.fundingStage)),
      page: params.page || 1,
      per_page: perPage,
    };
    if (params.minRevenue !== undefined || params.maxRevenue !== undefined) {
      body.revenue_range = { min: params.minRevenue, max: params.maxRevenue };
    }
    if (params.minOpenJobs) body.organization_num_jobs_range = { min: params.minOpenJobs };
    if (params.fundingPresetDays || params.fundingDateFrom || params.fundingDateTo) {
      const today = new Date();
      const min = params.fundingPresetDays
        ? new Date(today.getTime() - params.fundingPresetDays * 86400000).toISOString().split('T')[0]
        : params.fundingDateFrom;
      if (min) body.latest_funding_date_range = { min, max: params.fundingDateTo || today.toISOString().split('T')[0] };
    }

    try {
      const data = await apolloRequest<{ organizations?: Record<string, unknown>[]; accounts?: Record<string, unknown>[]; pagination?: { total_entries?: number } }>(
        'organizations/search', { body, ttl: TTL.search }
      );
      const raw = [...(data.organizations || []), ...(data.accounts || [])];
      const organizations = raw.map(mapOrganization);
      return {
        organizations,
        totalCount: data.pagination?.total_entries ?? organizations.length,
        page: params.page || 1,
        perPage,
      };
    } catch (err) {
      if (!(err instanceof ApolloApiError)) logger.error('Apollo searchOrganizationsAdvanced failed', err);
      return emptyOrgs({ ...params, perPage }, toErrorInfo(err, 'organizations/search'));
    }
  }

  /**
   * Reveal a person's contact details (people/match). Uses Apollo credits.
   * Returns null when Apollo has no match or cannot answer; see getLastApolloErrors() for the reason.
   */
  async enrichPerson(params: {
    apolloPersonId: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    domain?: string;
    organizationName?: string;
    revealPersonalEmail?: boolean;
    revealPhone?: boolean;
    webhookUrl?: string;
  }): Promise<ApolloPersonMatch | null> {
    const body: Record<string, unknown> = {};
    // Synthetic ids (from our own fallbacks) must not be sent as Apollo ids.
    if (params.apolloPersonId && !params.apolloPersonId.startsWith('apollo-')) body.id = params.apolloPersonId;
    const domain = normalizeDomain(params.domain);
    if (domain) body.domain = domain;
    if (params.name) {
      const parts = params.name.replace(/\*+/g, '').trim().split(/\s+/);
      body.first_name = parts[0];
      // Obfuscated last names ("Br***n") are useless for matching; rely on the id instead.
      if (parts.length > 1 && !/\*/.test(params.name)) body.last_name = parts.slice(1).join(' ');
    }
    if (params.firstName) body.first_name = params.firstName;
    if (params.lastName) body.last_name = params.lastName;
    if (params.organizationName) body.organization_name = params.organizationName;
    if (params.revealPersonalEmail) body.reveal_personal_emails = true;
    const webhookUrl = params.webhookUrl || process.env.APOLLO_WEBHOOK_URL;
    if (params.revealPhone && webhookUrl?.startsWith('http')) {
      body.reveal_phone_number = true;
      body.webhook_url = webhookUrl;
    }
    if (!body.id && !(body.first_name && (body.domain || body.organization_name))) return null;

    try {
      const data = await apolloRequest<{ person?: Record<string, unknown> }>('people/match', { body, ttl: TTL.enrich });
      return data.person ? mapPerson(data.person, { domain, creditsUsed: 1 }) : null;
    } catch (err) {
      if (!(err instanceof ApolloApiError)) logger.error('Apollo enrichPerson failed', err);
      return null;
    }
  }

  /**
   * Company details by domain (organizations/enrich) or by Apollo id (organizations/{id}).
   */
  async enrichOrganization(params: { apolloOrgId?: string; domain?: string }): Promise<ApolloOrganizationMatch | null> {
    const domain = normalizeDomain(params.domain);
    try {
      if (domain) {
        const data = await apolloRequest<{ organization?: Record<string, unknown> }>('organizations/enrich', { method: 'GET', query: { domain }, ttl: TTL.enrich });
        return data.organization ? mapOrganization(data.organization) : null;
      }
      if (params.apolloOrgId && !params.apolloOrgId.startsWith('apollo-org-')) {
        const data = await apolloRequest<{ organization?: Record<string, unknown> }>(`organizations/${encodeURIComponent(params.apolloOrgId)}`, { method: 'GET', ttl: TTL.enrich });
        return data.organization ? mapOrganization(data.organization) : null;
      }
      return null;
    } catch (err) {
      if (!(err instanceof ApolloApiError)) logger.error('Apollo enrichOrganization failed', err);
      return null;
    }
  }

  async searchContacts(params: { email?: string; name?: string }): Promise<ApolloPersonMatch[]> {
    if (!params.name) return [];
    return this.searchPeople({ name: params.name, domain: params.email?.split('@')[1] });
  }

  async getContact(params: { contactId: string }): Promise<ApolloPersonMatch | null> {
    return this.enrichPerson({ apolloPersonId: params.contactId });
  }

  /**
   * Real daily quota per endpoint from Apollo's usage stats API (not an estimate).
   */
  async getUsage(): Promise<ApolloUsageEndpoint[] | null> {
    try {
      const data = await apolloRequest<Record<string, { day?: { limit: number; consumed: number; left_over: number } }>>('usage_stats/api_usage_stats', { ttl: TTL.usage });
      const wanted: Record<string, string> = {
        '["api/v1/mixed_people", "api_search"]': 'mixed_people/api_search',
        '["api/v1/organizations", "search"]': 'organizations/search',
        '["api/v1/people", "match"]': 'people/match',
        '["api/v1/organizations", "enrich"]': 'organizations/enrich',
      };
      return Object.entries(wanted)
        .filter(([k]) => data[k]?.day)
        .map(([k, endpoint]) => ({
          endpoint,
          label: ENDPOINT_LABELS[endpoint],
          dayLimit: data[k].day!.limit,
          dayUsed: data[k].day!.consumed,
          dayLeft: data[k].day!.left_over,
        }));
    } catch {
      return null;
    }
  }

  async checkHealth(): Promise<{ ok: boolean; message: string }> {
    try {
      const data = await apolloRequest<{ healthy?: boolean; is_logged_in?: boolean }>('auth/health', { method: 'GET', ttl: TTL.health });
      return data.is_logged_in
        ? { ok: true, message: 'Apollo API key is valid.' }
        : { ok: false, message: 'Apollo rejected the API key. Check APOLLO_API_KEY.' };
    } catch (err) {
      return { ok: false, message: err instanceof ApolloApiError ? err.info.message : 'Could not reach Apollo.' };
    }
  }
}

// Singleton export
export const apolloProvider: ApolloProvider = new DefaultApolloProvider();
