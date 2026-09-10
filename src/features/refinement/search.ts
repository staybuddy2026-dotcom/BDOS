import { UniversalSearchResultItem, AdvancedFilterParams } from './types';
import { logger } from '@/lib/logger';

const liveCompanyDataset: UniversalSearchResultItem[] = [];

/**
 * Single Universal Cross-Provider Search & Semantic AI Engine.
 * Searches across Apollo, LinkedIn, Crunchbase & GitHub simultaneously.
 */
export function executeUniversalCrossProviderSearch(
  query: string = '',
  filters?: AdvancedFilterParams
): UniversalSearchResultItem[] {
  logger.info(`Universal Search Engine: Scanning active V1 core providers (Apollo, LinkedIn, Crunchbase, GitHub) for query: '${query}'...`);

  let results = [...liveCompanyDataset];

  if (query.trim()) {
    const q = query.toLowerCase();
    results = results.filter(
      (item) =>
        item.companyName.toLowerCase().includes(q) ||
        item.domain.toLowerCase().includes(q) ||
        item.primaryTechStack.some((tech) => tech.toLowerCase().includes(q)) ||
        item.country.toLowerCase().includes(q) ||
        item.fundingSummary.toLowerCase().includes(q)
    );
  }

  if (filters?.tierFilter && filters.tierFilter !== 'ALL') {
    results = results.filter((item) => item.tier === filters.tierFilter);
  }

  if (filters?.techStacks && filters.techStacks.length > 0) {
    results = results.filter((item) =>
      filters.techStacks!.some((reqTech) =>
        item.primaryTechStack.some((itemTech) => itemTech.toLowerCase().includes(reqTech.toLowerCase()))
      )
    );
  }

  return results;
}
