export type SavedSearch = {
  id: string;
  query: string;
  filtersSummary: string;
  createdAt: string;
  matchCount: number;
};

export type WatchlistItem = {
  companyId: string;
  companyName: string;
  domain: string;
  buyingScore: number;
  icpScore: number;
  tier: 'TIER_A' | 'TIER_B' | 'TIER_C';
  addedAt: string;
};

export type ProviderSelection = {
  apollo: boolean;
  github: boolean;
  crunchbase: boolean;
  producthunt: boolean;
  reddit: boolean;
  linkedin: boolean;
};

export type DiscoveryLeadItem = {
  companyId: string;
  companyName: string;
  domain: string;
  industry?: string;
  country: string;
  employeeCount: number;
  buyingScore: number;
  icpScore: number;
  tier: 'IMMEDIATE' | 'HIGH' | 'MEDIUM' | 'LOW' | 'ARCHIVED';
  primaryTechStack: string[];
  fundingSummary: string;
  hiringSummary: string;
  matchedProviders: ('apollo' | 'github' | 'crunchbase' | 'producthunt' | 'reddit' | 'linkedin')[];
  whyContactReason: string;
  recommendedContactName: string;
  recommendedContactTitle: string;
  bestOutreachChannel: 'EMAIL' | 'LINKEDIN' | 'WHATSAPP';
  contactEmail?: string;
  contactPhone?: string;
  contactLinkedinUrl?: string;
  estimatedBudgetInr: string;
  estimatedBudgetUsd: string;
  conversionProbabilityPercent: number;
  recommendedServices: string[];
};

export type LeadDiscoveryData = {
  leads: DiscoveryLeadItem[];
  savedSearches: SavedSearch[];
  watchlist: WatchlistItem[];
  recentlyViewed: DiscoveryLeadItem[];
  recommendedCompanies: DiscoveryLeadItem[];
  totalCount: number;
  totalPages: number;
  page: number;
  perPage: number;
  totalContactsCount?: number;
  totalCompaniesCount?: number;
  migratedLeadsMap?: Record<string, DiscoveryLeadItem>;
  migratedCompanyIds?: string[];
  removedCompanyIds?: string[];
  apiError?: string;
};
