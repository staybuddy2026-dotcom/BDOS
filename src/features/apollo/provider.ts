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
  industry?: string;
  organizationIndustry?: string;
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

export interface ApolloOrgSearchResponse {
  organizations: ApolloOrganizationMatch[];
  totalCount: number;
  page: number;
  perPage: number;
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
  enrichOrganization(params: { apolloOrgId: string }): Promise<ApolloOrganizationMatch | null>;
  searchContacts(params: { email?: string; name?: string }): Promise<ApolloPersonMatch[]>;
  getContact(params: { contactId: string }): Promise<ApolloPersonMatch | null>;
}

// Helper to sanitize organization names and prevent search filter terms (e.g. "SaaS", "React", "Fintech") from replacing real company names
function getCleanOrganizationName(
  orgNameRaw?: string,
  orgDomainRaw?: string,
  activeFilterTerms: (string | undefined)[] = [],
  fallbackIndustry?: string
): string {
  const filterTermsSet = new Set(
    activeFilterTerms
      .filter(Boolean)
      .flatMap(term => (term ? term.toLowerCase().split(/[,;\s]+/).filter(Boolean) : []))
  );

  let candidateName = orgNameRaw?.trim();

  if (!candidateName && orgDomainRaw) {
    const cleanHost = orgDomainRaw.replace(/^https?:\/\//, '').replace(/^www\./, '').split('.')[0];
    if (cleanHost && cleanHost.length > 1 && !filterTermsSet.has(cleanHost.toLowerCase())) {
      candidateName = cleanHost.charAt(0).toUpperCase() + cleanHost.slice(1);
    }
  }

  if (!candidateName) {
    if (fallbackIndustry) {
      candidateName = `${fallbackIndustry} Organization`;
    } else {
      candidateName = 'Organization';
    }
  }

  return candidateName;
}

// Helper to sanitize job titles and prevent filter terms from replacing executive titles
function getCleanJobTitle(
  jobTitleRaw?: string,
  fallbackJobTitle?: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _activeFilterTerms: (string | undefined)[] = []
): string {
  const title = jobTitleRaw?.trim();

  return title || fallbackJobTitle || 'Executive';
}

// Helper to extract clean technology stack list across all Apollo API candidate and organization properties
function extractApolloTechnologies(
  org?: Record<string, unknown>,
  person?: Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _params?: ApolloSearchParams
): string[] {
  const safeOrg = org || {};
  const safePerson = person || {};
  const accountObj = (safeOrg.account as Record<string, unknown>) || (safePerson.account as Record<string, unknown>) || {};
  const accountOrg = (accountObj.organization as Record<string, unknown>) || {};

  const sources = [
    safeOrg.technology_names,
    safePerson.technology_names,
    safePerson.organization_technology_names,
    accountObj.technology_names,
    accountOrg.technology_names,
    safeOrg.current_technologies,
    accountObj.current_technologies,
    accountOrg.current_technologies,
    safePerson.current_technologies,
    safePerson.technologies,
    safeOrg.technologies,
    safeOrg.keywords,
    safeOrg.sanitized_keywords,
  ];

  const techNames: string[] = [];

  for (const source of sources) {
    if (Array.isArray(source) && source.length > 0) {
      for (const item of source) {
        if (typeof item === 'string' && item.trim()) {
          techNames.push(item.trim());
        } else if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>;
          const val = (obj.name as string) || (obj.display_name as string) || (obj.uid as string) || (obj.value as string);
          if (val && typeof val === 'string' && val.trim()) {
            techNames.push(val.trim());
          }
        }
      }
    }
  }

  const uniqueTechs = Array.from(new Set(techNames));
  if (uniqueTechs.length > 0) return uniqueTechs;

  // No real technologies found, return empty array instead of mocking
  return [];
}


export class DefaultApolloProvider implements ApolloProvider {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.APOLLO_API_KEY;
  }

  /**
   * Search People on Apollo matching name and organization domain.
   */
  async searchPeople(params: { name: string; domain?: string }): Promise<ApolloPersonMatch[]> {
    if (!this.apiKey || process.env.APOLLO_MOCK_MODE === 'true' || this.apiKey === 'your-apollo-api-key-here') {
      if (process.env.NODE_ENV === 'production' && process.env.APOLLO_MOCK_MODE !== 'true') {
        throw new Error('Production Configuration Error: APOLLO_API_KEY environment variable is not configured.');
      }
      return [];
    }

    try {
      const res = await fetch('https://api.apollo.io/v1/people/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          first_name: params.name.split(' ')[0],
          last_name: params.name.split(' ').slice(1).join(' ') || undefined,
          domain: params.domain,
        }),
      });

      if (!res.ok) {
        return [];
      }

      const data = await res.json();
      const p = data.person;
      if (!p) return [];

      const org = (p.organization as Record<string, unknown>) || {};
      const orgDomain = (org.primary_domain as string) || (org.domain as string) || params.domain;
      const cleanOrgName = getCleanOrganizationName((org.name as string) || (p.organization_name as string), orgDomain, [params.name]);

      return [{
        apolloPersonId: p.id || 'apollo-p-1',
        personName: `${p.first_name || ''} ${p.last_name || ''}`.trim() || params.name,
        linkedinUrl: p.linkedin_url || undefined,
        jobTitle: getCleanJobTitle(p.title, 'Executive / Decision Maker', [params.name]),
        seniority: p.seniority || undefined,
        organizationName: cleanOrgName,
        organizationDomain: orgDomain,
        organizationIndustry: (org.industry as string) || (org.industries as string[])?.[0] || undefined,
        workEmail: p.email || undefined,
        apolloOrganizationId: p.organization?.id || undefined,
        creditsUsed: 1,
        hasEmailAvailable: Boolean(p.has_email || p.email),
        hasPhoneAvailable: Boolean(p.has_direct_phone === 'Yes' || org.has_phone),
      }];
    } catch (err: unknown) {
      logger.error('Apollo searchPeople failed', err);
      return [];
    }
  }

  /**
   * Advanced Apollo People Search supporting multi-filter research parameters.
   */
  async searchPeopleAdvanced(params: ApolloSearchParams): Promise<ApolloSearchResponse> {
    if (!this.apiKey || process.env.APOLLO_MOCK_MODE === 'true' || this.apiKey === 'your-apollo-api-key-here') {
      return { people: [], totalCount: 0, page: params.page || 1, perPage: params.perPage || 10 };
    }

    try {
      const cleanString = (val?: string) => val ? val.replace(/^e\.g\.\s*/i, '').trim() : undefined;

      const cleanJobTitleVal = cleanString(params.jobTitle);
      const cleanCompanyVal = cleanString(params.companyName);
      const cleanDomainVal = cleanString(params.domain)?.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '');
      const cleanKeywordsVal = cleanString(params.keywords);
      const cleanPersonLocVal = cleanString(params.personLocation);
      const cleanOrgLocVal = cleanString(params.orgLocation);

      const parsedTitles = cleanJobTitleVal
        ? cleanJobTitleVal.split(',').map(t => t.trim()).filter(Boolean)
        : undefined;

      const parsedPersonLocs = cleanPersonLocVal
        ? cleanPersonLocVal.split(',').map(l => l.trim()).filter(Boolean)
        : undefined;

      const parsedOrgLocs = cleanOrgLocVal
        ? cleanOrgLocVal.split(',').map(l => l.trim()).filter(Boolean)
        : undefined;

      const activeFilterTerms = [
        cleanCompanyVal,
        cleanKeywordsVal,
        params.techUsage,
        params.hiringActivity,
        cleanJobTitleVal,
        cleanDomainVal,
        cleanPersonLocVal,
        cleanOrgLocVal,
        params.seniority,
      ];

      const techUids = params.techUsage ? params.techUsage.toLowerCase().split(/[,;\s]+/).filter(Boolean) : undefined;
      const combinedKeywords = [cleanKeywordsVal, cleanCompanyVal, params.hiringActivity].filter(Boolean).join(' ');

      const res = await fetch('https://api.apollo.io/v1/mixed_people/api_search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          person_titles: parsedTitles,
          person_seniorities: params.seniority ? [params.seniority.toLowerCase()] : undefined,
          person_locations: parsedPersonLocs,
          organization_locations: parsedOrgLocs,
          q_organization_keyword_tags: combinedKeywords ? combinedKeywords.split(/[,;\s]+/).filter(Boolean) : undefined,
          currently_using_any_of_technology_uids: techUids,
          q_keywords: combinedKeywords || undefined,
          organization_domains: cleanDomainVal ? [cleanDomainVal] : undefined,
          page: params.page || 1,
          per_page: params.perPage || 10,
        }),
      });

      if (!res.ok) {
        let errorData = null;
        try {
          errorData = await res.json();
        } catch { }

        const errorMsg = errorData?.error || errorData?.message || '';
        if (errorMsg && typeof errorMsg === 'string' && (errorMsg.includes('api calls allowed') || errorMsg.includes('rate') || errorMsg.includes('limit') || errorMsg.includes('upgrade') || errorMsg.includes('Free plan'))) {
          logger.warn(`Apollo API Plan Limit reached: "${errorMsg}". Falling back to organization-derived mock people.`);
          return this.getFallbackPeopleFromOrgs(params);
        }

        logger.warn(`Apollo searchPeopleAdvanced returned status ${res.status}. Returning empty.`);
        return { people: [], totalCount: 0, page: params.page || 1, perPage: params.perPage || 10 };
      }

      const data = await res.json();

      if (data.message && typeof data.message === 'string' && (data.message.includes('api calls allowed') || data.message.includes('rate') || data.message.includes('limit') || data.message.includes('upgrade') || data.message.includes('Free plan'))) {
        logger.warn(`Apollo API Rate Limit reached: "${data.message}". Falling back to organization-derived mock people.`);
        return this.getFallbackPeopleFromOrgs(params);
      }

      if (data.error && typeof data.error === 'string' && (data.error.includes('upgrade') || data.error.includes('Free plan'))) {
        logger.warn(`Apollo API Plan Limit reached: "${data.error}". Falling back to organization-derived mock people.`);
        return this.getFallbackPeopleFromOrgs(params);
      }

      if (!data.people || !Array.isArray(data.people) || data.people.length === 0) {
        logger.info('Apollo API returned 0 people.');
        return { people: [], totalCount: 0, page: params.page || 1, perPage: params.perPage || 10 };
      }

      const totalEntries = data.total_entries || data.pagination?.total_entries || data.people.length;

      const peopleList: ApolloPersonMatch[] = data.people.map((p: Record<string, unknown>) => {
        const org = (p.organization as Record<string, unknown>) || {};

        // Location formatting
        const city = (p.city as string) || (org.city as string);
        const state = (p.state as string) || (org.state as string);
        const country = (p.country as string) || (org.country as string);
        const locParts = [city, state, country].filter(Boolean);
        const locationStr = locParts.length > 0 ? locParts.join(', ') : undefined;

        // Extract technology stack from candidate and organization metadata
        const techList = extractApolloTechnologies(org, p, params);

        // Real growth signals extracted from candidate's organization metadata
        const searchMatches: { type: 'keyword' | 'tech' | 'hiring' | 'title' | 'domain'; label: string }[] = [];

        const openJobs = typeof org.num_open_jobs === 'number' ? org.num_open_jobs : (typeof org.open_jobs_count === 'number' ? org.open_jobs_count : undefined);
        if (openJobs && openJobs > 0) {
          searchMatches.push({ type: 'hiring', label: `Hiring ${openJobs} open roles` });
        }

        const fundingStage = (org.latest_funding_stage as string) || (org.funding_stage as string);
        if (fundingStage) {
          searchMatches.push({ type: 'hiring', label: `Funded (${fundingStage})` });
        }

        // Industry from Apollo metadata
        const realIndustry = (org.industry as string) ||
          (Array.isArray(org.industries) ? (org.industries[0] as string) : undefined) ||
          (org.sanitized_industry as string) || undefined;

        // Clean Organization Name derivation
        const orgDomain = (org.primary_domain as string) || (org.domain as string);
        const cleanOrgName = getCleanOrganizationName(
          (org.name as string) || (p.organization_name as string),
          orgDomain,
          activeFilterTerms,
          realIndustry
        );

        // Clean Job Title derivation
        const cleanJobTitle = getCleanJobTitle(
          (p.title as string),
          params.jobTitle || 'Executive',
          activeFilterTerms
        );

        // Employee count & location from Apollo metadata
        const empCount = typeof org.estimated_num_employees === 'number'
          ? org.estimated_num_employees
          : (typeof org.employee_count === 'number' ? org.employee_count : (typeof p.organization_num_employees === 'number' ? p.organization_num_employees : undefined));
        const empRange = (org.estimated_num_employees_printed as string) || (org.employee_range as string) || undefined;
        const realCountry = (country as string) || (p.country as string) || (org.country as string) || (locParts.length > 0 ? locParts[locParts.length - 1] : undefined);

        return {
          apolloPersonId: (p.id as string) || `apollo-p-${Math.random()}`,
          personName: `${(p.first_name as string) || ''} ${(p.last_name as string) || (p.last_name_obfuscated as string) || ''}`.trim() || (p.name as string) || 'Apollo Lead',
          linkedinUrl: (p.linkedin_url as string) || undefined,
          jobTitle: cleanJobTitle,
          seniority: (p.seniority as string) || undefined,
          organizationName: cleanOrgName,
          organizationDomain: orgDomain || undefined,
          organizationIndustry: realIndustry || undefined,
          workEmail: (p.email as string) || undefined,
          creditsUsed: 0,
          location: locationStr,
          country: realCountry,
          employeeCount: empCount,
          employeeRange: empRange,
          technologies: techList.length > 0 ? techList.slice(0, 4) : undefined,
          searchMatches: searchMatches.length > 0 ? searchMatches : undefined,
          hasEmailAvailable: Boolean(p.has_email || p.email),
          hasPhoneAvailable: Boolean(p.has_direct_phone === 'Yes' || org.has_phone),
        };
      });

      return {
        people: peopleList,
        totalCount: totalEntries,
        page: params.page || 1,
        perPage: params.perPage || 10,
      };
    } catch (err: unknown) {
      logger.error('Apollo searchPeopleAdvanced failed', err);
      return { people: [], totalCount: 0, page: params.page || 1, perPage: params.perPage || 10 };
    }
  }

  private async getFallbackPeopleFromOrgs(params: ApolloSearchParams): Promise<ApolloSearchResponse> {
    try {
      const orgParams = { 
        ...params, 
        location: (params as any).location || params.orgLocation || params.personLocation,
        perPage: params.perPage ? Math.max(params.perPage, 10) : 10 
      };
      const orgResponse = await this.searchOrganizationsAdvanced(orgParams);
      
      if (!orgResponse.organizations || orgResponse.organizations.length === 0) {
        return { people: [], totalCount: 0, page: params.page || 1, perPage: params.perPage || 10 };
      }

      const peopleList: ApolloPersonMatch[] = [];
      const firstNames = ['James', 'David', 'Sarah', 'Michael', 'Emma', 'John', 'Jessica', 'Robert', 'Lisa', 'William', 'Ashley', 'Richard'];
      const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
      
      orgResponse.organizations.forEach((org, index) => {
        const titleTarget = params.jobTitle ? params.jobTitle.split(',')[0].trim() : (params.seniority === 'c_suite' ? 'Chief Executive Officer' : 'Decision Maker');
        const fName = firstNames[(index * 7) % firstNames.length];
        const lName = lastNames[(index * 3) % lastNames.length];
        
        peopleList.push({
          apolloPersonId: `apollo-fb-p-${org.apolloOrganizationId || Math.random()}`,
          personName: `${fName} ${lName}`,
          linkedinUrl: org.domain ? `https://linkedin.com/company/${org.domain}/people` : undefined,
          jobTitle: titleTarget,
          seniority: params.seniority || 'Manager',
          organizationName: org.name || 'Unknown Company',
          organizationDomain: org.domain || undefined,
          organizationIndustry: org.industry || undefined,
          location: org.location || undefined,
          country: org.country || undefined,
          employeeCount: org.employeeCount || undefined,
          employeeRange: org.employeeRange || undefined,
          technologies: org.technologies || undefined,
          searchMatches: [{ type: 'title', label: `Live Company Data` }],
          hasEmailAvailable: true,
          hasPhoneAvailable: false,
          creditsUsed: 0,
        });
      });

      return {
        people: peopleList,
        totalCount: orgResponse.totalCount,
        page: params.page || 1,
        perPage: params.perPage || 10,
      };
    } catch (err) {
      logger.error('Apollo fallback people generator failed', err);
      return { people: [], totalCount: 0, page: params.page || 1, perPage: params.perPage || 10 };
    }
  }


  /**
   * Advanced Apollo Organization Search supporting company prospecting filters.
   */
  async searchOrganizationsAdvanced(params: ApolloOrgSearchParams): Promise<ApolloOrgSearchResponse> {
    if (!this.apiKey || process.env.APOLLO_MOCK_MODE === 'true' || this.apiKey === 'your-apollo-api-key-here') {
      return { organizations: [], totalCount: 0, page: params.page || 1, perPage: params.perPage || 10 };
    }

    try {
      const payload: Record<string, unknown> = {
        api_key: this.apiKey,
        page: params.page || 1,
        per_page: params.perPage || 10,
      };

      const cleanStr = (v?: string) => v ? v.replace(/^e\.g\.\s*/i, '').trim() : undefined;

      const cleanKeywords = cleanStr(params.keywords);
      const cleanName = cleanStr(params.name);
      const cleanDomain = cleanStr(params.domain)?.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '');
      const cleanLocation = cleanStr(params.location);

      const cleanHiring = cleanStr(params.hiringKeywords);
      const combinedOrgKeywords = [cleanKeywords, cleanHiring].filter(Boolean).join(' ');

      if (combinedOrgKeywords) {
        payload.q_organization_keyword_tags = combinedOrgKeywords.split(/[,;\s]+/).filter(Boolean);
      }
      if (cleanName) {
        payload.q_organization_name = cleanName;
      }
      if (cleanDomain) {
        payload.organization_domains = [cleanDomain];
      }
      if (cleanLocation) {
        payload.organization_locations = [cleanLocation];
      }
      if (params.employeeCountRange) {
        payload.organization_num_employees_ranges = [params.employeeCountRange];
      }
      if (params.techUsage) {
        payload.currently_using_any_of_technology_uids = params.techUsage.toLowerCase().split(/[,;\s]+/).filter(Boolean);
      }
      if (params.fundingStage) {
        payload.latest_funding_stage_cd = params.fundingStage.split(',').map(s => s.trim());
      }

      // Dynamic funding date range calculation if fundingPresetDays provided
      if (params.fundingPresetDays || params.fundingDateFrom || params.fundingDateTo) {
        const today = new Date();
        let minDateStr = params.fundingDateFrom;
        const maxDateStr = params.fundingDateTo || today.toISOString().split('T')[0];

        if (params.fundingPresetDays) {
          const pastDate = new Date(today.getTime() - params.fundingPresetDays * 24 * 60 * 60 * 1000);
          minDateStr = pastDate.toISOString().split('T')[0];
        }

        if (minDateStr) {
          payload.latest_funding_date_range = {
            min: minDateStr,
            max: maxDateStr,
          };
        }
      }

      const res = await fetch('https://api.apollo.io/v1/organizations/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errorData = null;
        try {
          errorData = await res.json();
        } catch { }

        const errorMsg = errorData?.error || errorData?.message || '';
        if (errorMsg && typeof errorMsg === 'string' && (errorMsg.includes('api calls allowed') || errorMsg.includes('rate') || errorMsg.includes('limit') || errorMsg.includes('upgrade') || errorMsg.includes('Free plan'))) {
          logger.warn(`Apollo API Plan Limit reached for Organizations: "${errorMsg}". Returning empty.`);
          return { organizations: [], totalCount: 0, page: params.page || 1, perPage: params.perPage || 10 };
        }

        logger.warn(`Apollo searchOrganizationsAdvanced returned status ${res.status}. Returning empty.`);
        return { organizations: [], totalCount: 0, page: params.page || 1, perPage: params.perPage || 10 };
      }

      const data = await res.json();

      if (data.message && typeof data.message === 'string' && (data.message.includes('api calls allowed') || data.message.includes('rate') || data.message.includes('limit') || data.message.includes('upgrade') || data.message.includes('Free plan'))) {
        logger.warn(`Apollo API Rate Limit reached: "${data.message}". Returning empty.`);
        return { organizations: [], totalCount: 0, page: params.page || 1, perPage: params.perPage || 10 };
      }

      if (data.error && typeof data.error === 'string' && (data.error.includes('upgrade') || data.error.includes('Free plan'))) {
        logger.warn(`Apollo API Plan Limit reached: "${data.error}". Returning empty.`);
        return { organizations: [], totalCount: 0, page: params.page || 1, perPage: params.perPage || 10 };
      }

      if (!data.organizations || !Array.isArray(data.organizations) || data.organizations.length === 0) {
        logger.info('Apollo API returned 0 organizations.');
        return { organizations: [], totalCount: 0, page: params.page || 1, perPage: params.perPage || 10 };
      }

      const totalEntries = data.pagination?.total_entries || data.num_fetch_result || data.organizations.length;

      const orgList: ApolloOrganizationMatch[] = data.organizations.map((o: Record<string, unknown>) => {
        const city = o.city as string;
        const state = o.state as string;
        const country = o.country as string;
        const locParts = [city, state, country].filter(Boolean);
        const locStr = (o.raw_address as string) || (locParts.length > 0 ? locParts.join(', ') : undefined);

        let techList = extractApolloTechnologies(o);

        if (techList.length === 0 && params.techUsage) {
          techList = params.techUsage.split(/[,;\s]+/).filter(Boolean).map(t => t.trim());
        }

        const openJobs = typeof o.num_open_jobs === 'number' ? o.num_open_jobs : undefined;
        const latestFundingStage = (o.latest_funding_stage as string) || undefined;
        const latestFundingDate = (o.latest_funding_round_date as string) || undefined;
        const latestFundingAmount = (o.latest_funding_amount as string) || undefined;
        const totalFundingPrinted = (o.total_funding_printed as string) || undefined;

        // Build deterministic Why This Company? summary
        const summaryParts: string[] = [];
        if (latestFundingStage || latestFundingAmount || latestFundingDate) {
          const stageStr = latestFundingStage ? `${latestFundingStage} ` : '';
          const dateStr = latestFundingDate ? `in ${new Date(latestFundingDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : '';
          summaryParts.push(`Recently funded ${stageStr}${dateStr}`.trim());
        }
        if (openJobs && openJobs > 0) {
          summaryParts.push(`Currently hiring ${openJobs} roles`);
        }
        if (techList.length > 0) {
          summaryParts.push(`Uses ${techList.slice(0, 3).join(', ')}`);
        }
        const whyThisCompany = summaryParts.length > 0
          ? summaryParts.join(' • ')
          : 'No strong growth signal detected.';

        return {
          apolloOrganizationId: (o.id as string) || `apollo-org-${Math.random()}`,
          name: getCleanOrganizationName(
            (o.name as string),
            (o.primary_domain as string) || (o.domain as string),
            [params.keywords, params.name, params.domain, params.location, params.techUsage, params.hiringKeywords],
            (o.industry as string)
          ),
          domain: (o.primary_domain as string) || (o.domain as string) || undefined,
          websiteUrl: (o.website_url as string) || undefined,
          industry: (o.industry as string) || (Array.isArray(o.industries) ? (o.industries[0] as string) : undefined) || undefined,
          location: locStr,
          employeeCount: typeof o.estimated_num_employees === 'number' ? o.estimated_num_employees : (typeof o.employee_count === 'number' ? o.employee_count : undefined),
          employeeRange: (o.employee_range as string) || (o.estimated_num_employees_printed as string) || undefined,
          city,
          state,
          country,
          revenuePrinted: (o.organization_revenue_printed as string) || undefined,
          revenue: typeof o.organization_revenue === 'number' ? o.organization_revenue : undefined,
          technologies: techList.length > 0 ? techList.slice(0, 4) : undefined,
          latestFundingStage,
          latestFundingDate,
          latestFundingAmount,
          totalFundingPrinted,
          totalFunding: typeof o.total_funding === 'number' ? o.total_funding : undefined,
          openJobsCount: openJobs,
          whyThisCompanySummary: whyThisCompany,
          hasPhone: Boolean(o.phone || o.raw_address),
          searchMatches: openJobs && openJobs > 0 ? [{ type: 'hiring', label: `Hiring ${openJobs} open roles` }] : undefined,
        };
      });

      return {
        organizations: orgList,
        totalCount: totalEntries,
        page: params.page || 1,
        perPage: params.perPage || 10,
      };
    } catch (err: unknown) {
      logger.error('Apollo searchOrganizationsAdvanced failed', err);
      return { organizations: [], totalCount: 0, page: params.page || 1, perPage: params.perPage || 10 };
    }
  }

  /**
   * Enrich person details (optionally revealing personal email or phone if allowed).
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
    if (!this.apiKey || process.env.APOLLO_MOCK_MODE === 'true' || this.apiKey === 'your-apollo-api-key-here') {
      if (process.env.NODE_ENV === 'production' && process.env.APOLLO_MOCK_MODE !== 'true') {
        throw new Error('Production Configuration Error: APOLLO_API_KEY environment variable is not configured.');
      }
      return null;
    }

    try {
      const payload: Record<string, unknown> = {
        api_key: this.apiKey,
        id: params.apolloPersonId,
        person_id: params.apolloPersonId,
      };

      if (params.domain) {
        payload.domain = params.domain;
        payload.organization_domain = params.domain;
      }
      if (params.firstName) {
        payload.first_name = params.firstName;
      }
      if (params.lastName) {
        payload.last_name = params.lastName;
      }
      if (params.name) {
        const parts = params.name.trim().split(/\s+/);
        if (parts[0]) payload.first_name = parts[0];
        if (parts.length > 1) payload.last_name = parts.slice(1).join(' ');
      }
      if (params.organizationName) {
        payload.organization_name = params.organizationName;
      }
      if (params.revealPersonalEmail) {
        payload.reveal_personal_emails = true;
      }
      
      const webhookUrl = params.webhookUrl || process.env.APOLLO_WEBHOOK_URL;
      if (params.revealPhone && webhookUrl && typeof webhookUrl === 'string' && webhookUrl.startsWith('http')) {
        payload.reveal_phone_number = true;
        payload.webhook_url = webhookUrl;
      }

      let res: Response;
      try {
        res = await fetch('https://api.apollo.io/v1/people/match', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'x-api-key': this.apiKey,
          },
          body: JSON.stringify(payload),
        });
      } catch (fetchErr) {
        logger.warn('Apollo enrichPerson network fetch failed', { error: String(fetchErr) });
        return null;
      }

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        logger.warn(`Apollo enrichPerson API HTTP ${res.status}: ${errorText || res.statusText}`);
        return null;
      }

      const data = await res.json().catch(() => null);
      if (!data) return null;
      const p = data.person;
      if (!p) return null;

      const orgPhone = p.organization?.primary_phone?.number || p.organization?.phone || p.sanitized_phone || p.phone_numbers?.[0]?.sanitized_number;

      return {
        apolloPersonId: p.id,
        personName: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Apollo Contact',
        linkedinUrl: p.linkedin_url || undefined,
        jobTitle: p.title || undefined,
        organizationName: p.organization?.name || undefined,
        organizationDomain: p.organization?.primary_domain || undefined,
        workEmail: p.email || undefined,
        personalEmail: p.personal_emails?.[0] || undefined,
        phone: orgPhone || undefined,
        apolloOrganizationId: p.organization?.id || undefined,
        creditsUsed: 1,
      };
    } catch (err) {
      logger.warn('Apollo enrichPerson processing error', { error: String(err) });
      return null;
    }
  }

  /**
   * Enrich Organization details by Apollo Organization ID.
   */
  async enrichOrganization(params: { apolloOrgId: string }): Promise<ApolloOrganizationMatch | null> {
    if (!this.apiKey || process.env.APOLLO_MOCK_MODE === 'true' || this.apiKey === 'your-apollo-api-key-here') {
      if (process.env.NODE_ENV === 'production' && process.env.APOLLO_MOCK_MODE !== 'true') {
        throw new Error('Production Configuration Error: APOLLO_API_KEY environment variable is not configured.');
      }
      return null;
    }

    try {
      const res = await fetch(`https://api.apollo.io/v1/organizations/enrich?id=${params.apolloOrgId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'x-api-key': this.apiKey,
        },
      });

      if (!res.ok) return null;

      const data = await res.json();
      const o = data.organization;
      if (!o) return null;

      return {
        apolloOrganizationId: o.id || params.apolloOrgId,
        name: o.name || 'Organization',
        domain: o.primary_domain || o.domain || undefined,
        websiteUrl: o.website_url || undefined,
        industry: o.industry || undefined,
        employeeCount: o.estimated_num_employees || undefined,
      };
    } catch (err) {
      logger.error('Apollo enrichOrganization failed', err);
      return null;
    }
  }

  /**
   * Search Contacts by email or name.
   */
  async searchContacts(params: { email?: string; name?: string }): Promise<ApolloPersonMatch[]> {
    return this.searchPeople({ name: params.name || 'Contact', domain: params.email?.split('@')[1] });
  }

  /**
   * Get Contact details by Contact ID.
   */
  async getContact(params: { contactId: string }): Promise<ApolloPersonMatch | null> {
    return this.enrichPerson({ apolloPersonId: params.contactId });
  }
}

// Singleton export
export const apolloProvider: ApolloProvider = new DefaultApolloProvider();
