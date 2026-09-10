export type ProviderStatus = 'Connected' | 'Not Connected' | 'Coming Soon' | 'Unsupported' | 'Error';
export type HealthStatus = 'Healthy' | 'Warning' | 'Offline' | 'Coming Soon' | 'Rate Limited' | 'Unauthorized';

export type ProviderFilterKey = 
  | 'company'
  | 'industry'
  | 'country'
  | 'employees'
  | 'revenue'
  | 'technology'
  | 'funding'
  | 'hiring'
  | 'keywords'
  | 'projectType'
  | 'budget'
  | 'decisionMaker'
  | 'jobTitle'
  | 'remote'
  | 'hybrid'
  | 'onsite'
  | 'language'
  | 'stars';

export type ProviderCapabilityType = 
  | 'Companies'
  | 'People'
  | 'Projects'
  | 'Posts'
  | 'Funding'
  | 'Hiring'
  | 'Repositories'
  | 'Buyer Requests'
  | 'Discussions'
  | 'Manual Import';

export interface ProviderCapabilities {
  searchTypes: ProviderCapabilityType[];
  supportsCompanies: boolean;
  supportsPeople: boolean;
  supportsProjects: boolean;
  supportsEnrichment: boolean;
  supportedFilters: ProviderFilterKey[];
}

export interface LeadSearchParams {
  providerId: string;
  searchType?: 'companies' | 'people' | 'projects' | 'posts' | 'all';
  keywords?: string;
  company?: string;
  industry?: string;
  country?: string;
  employees?: string;
  revenue?: string;
  technology?: string;
  fundingStage?: string;
  fundingDays?: number;
  hiringKeywords?: string;
  jobTitle?: string;
  seniority?: string;
  projectType?: string;
  budget?: string;
  workMode?: 'remote' | 'hybrid' | 'onsite';
  language?: string;
  stars?: string;
  page?: number;
  perPage?: number;
}

export interface LeadGrowthSignal {
  type: string;
  label: string;
}

export interface LeadItem {
  id: string;
  providerId: string;
  name: string;
  type: ProviderCapabilityType;
  subtitle?: string;
  location?: string;
  domain?: string;
  industry?: string;
  technologies?: string[];
  growthSignals?: LeadGrowthSignal[];
  workEmail?: string;
  personalEmail?: string;
  phone?: string;
  apolloPersonId?: string;
  apolloOrganizationId?: string;
  opportunityScore?: number;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  buyingSignals?: string[];
  whyThisLead?: string;
  url?: string;
  employeeCount?: number;
  revenuePrinted?: string;
  latestFundingStage?: string;
  latestFundingAmount?: string;
  openJobsCount?: number;
  budgetPrinted?: string;
  projectCategory?: string;
  details?: Record<string, unknown>;
}

export interface LeadSearchResponse {
  providerId: string;
  providerName: string;
  items: LeadItem[];
  totalCount: number;
  page: number;
  perPage: number;
  status: ProviderStatus;
  healthStatus?: HealthStatus;
  responseTimeMs?: number;
  message?: string;
}

export interface SearchHistoryItem {
  id: string;
  providerId: string;
  providerName: string;
  timestamp: Date;
  filters: LeadSearchParams;
  durationMs: number;
  resultCount: number;
  status: 'Success' | 'No Results' | 'Error';
}

export interface SavedSearchPreset {
  id: string;
  name: string;
  description: string;
  providerId: string;
  filters: LeadSearchParams;
  iconName?: string;
  badgeLabel?: string;
}

export interface ILeadProvider {
  id: string;
  name: string;
  description: string;
  iconName: string;
  isBeta?: boolean;
  isLive?: boolean;
  version?: string;
  apiVersion?: string;
  avgResponseTimeMs?: number;
  
  getStatus(): Promise<ProviderStatus>;
  getHealthStatus?(): Promise<HealthStatus>;
  getCapabilities(): ProviderCapabilities;
  getSupportedFilters(): ProviderFilterKey[];
  search(params: LeadSearchParams): Promise<LeadSearchResponse>;
  health(): Promise<{ ok: boolean; status: HealthStatus; message: string }>;
}
