import { IDiscoveryProvider, DiscoveryPost, registerDiscoveryProvider } from './discovery';
import { linkedinProvider, postedLimitFromDate } from '@/features/linkedin/provider';
import { savePostMeta } from '@/features/linkedin/store';
import { logger } from '@/lib/logger';

/**
 * Keyword discovery on real LinkedIn posts. Select it with DISCOVERY_PROVIDER="linkedin"
 * (or pass providerName: 'linkedin' to DiscoveryService.scanKeyword).
 */
class LinkedInDiscoveryProvider implements IDiscoveryProvider {
  public readonly name = 'linkedin';

  async search(query: string, options: { since?: Date; until?: Date; limit?: number }): Promise<DiscoveryPost[]> {
    const res = await linkedinProvider.searchPosts({
      query,
      postedLimit: postedLimitFromDate(options.since),
      maxPosts: options.limit || 20,
      sortBy: 'date',
    });
    if (res.error) {
      logger.warn(`LinkedIn discovery unavailable for "${query}": ${res.error.message}`);
      return [];
    }

    const until = options.until?.getTime();
    const posts = res.items.filter((p) => !until || !p.postedAt || new Date(p.postedAt).getTime() <= until);

    // Author profile links have no column on LinkedInPost; keep them in the side store.
    await savePostMeta(Object.fromEntries(posts.map((p) => [p.url, {
      authorProfileUrl: p.authorProfileUrl, authorType: p.authorType, likes: p.likes, comments: p.comments, shares: p.shares,
    }])));

    return posts.map((p) => ({
      postUrl: p.url,
      authorName: p.authorName,
      authorHeadline: p.authorHeadline,
      companyName: p.authorCompany,
      postPreview: p.content.slice(0, 600),
      postedAt: p.postedAt ? new Date(p.postedAt) : undefined,
      engagementCount: p.likes + p.comments + p.shares,
    }));
  }
}

registerDiscoveryProvider(new LinkedInDiscoveryProvider());
