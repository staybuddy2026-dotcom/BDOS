import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { KeywordStatus, PostStatus } from '@prisma/client';

export interface DiscoveryPost {
  postUrl: string;
  authorName: string;
  authorHeadline?: string;
  companyName?: string;
  postPreview: string;
  postedAt?: Date;
  engagementCount: number;
}

export interface IDiscoveryProvider {
  name: string;
  search(
    query: string,
    options: {
      since?: Date;
      until?: Date;
      limit?: number;
    }
  ): Promise<DiscoveryPost[]>;
}

// Registry for pluggable discovery providers
const providersRegistry: Record<string, IDiscoveryProvider> = {};

export function registerDiscoveryProvider(provider: IDiscoveryProvider) {
  providersRegistry[provider.name.toLowerCase()] = provider;
  logger.info(`Registered discovery provider: ${provider.name}`);
}

export function getDiscoveryProvider(name?: string): IDiscoveryProvider {
  const providerName = name || process.env.DISCOVERY_PROVIDER || 'mock';
  const provider = providersRegistry[providerName.toLowerCase()];
  if (!provider) {
    throw new AppError(`Discovery provider "${providerName}" is not registered.`, 500);
  }
  return provider;
}

export class DiscoveryService {
  /**
   * Run discovery process for a single keyword
   */
  static async scanKeyword(
    keywordId: string,
    timeFilter: string,
    options?: {
      customSince?: Date;
      customUntil?: Date;
      providerName?: string;
    }
  ): Promise<{ created: number; skipped: number }> {
    const keywordRecord = await db.keyword.findUnique({
      where: { id: keywordId },
    });

    if (!keywordRecord) {
      throw new AppError('Keyword not found in library.', 404);
    }

    // Rule: Scan ONLY active keywords
    if (keywordRecord.status !== KeywordStatus.ACTIVE) {
      logger.warn(`Skipping inactive keyword scan: "${keywordRecord.keyword}"`);
      return { created: 0, skipped: 0 };
    }

    // Calculate time bounds
    const { since, until } = this.calculateTimeBounds(timeFilter, options?.customSince, options?.customUntil);

    // Fetch matching posts from active provider
    const provider = getDiscoveryProvider(options?.providerName);
    logger.info(`Initiating post scan with keyword: "${keywordRecord.keyword}" using provider: "${provider.name}"`);
    
    const results = await provider.search(keywordRecord.keyword, { since, until, limit: 20 });
    
    let createdCount = 0;
    let skippedCount = 0;

    // Save and deduplicate results
    for (const post of results) {
      try {
        // Automatic deduplication: check if URL exists in DB
        const existing = await db.linkedInPost.findUnique({
          where: { postUrl: post.postUrl },
        });

        if (existing) {
          skippedCount++;
          continue;
        }

        // Insert new discovered post
        await db.linkedInPost.create({
          data: {
            postUrl: post.postUrl,
            authorName: post.authorName,
            authorHeadline: post.authorHeadline,
            companyName: post.companyName,
            postPreview: post.postPreview,
            postedAt: post.postedAt || new Date(),
            matchedKeyword: keywordRecord.keyword,
            keywordCategory: keywordRecord.category,
            engagementCount: post.engagementCount,
            status: PostStatus.DISCOVERED,
          },
        });
        createdCount++;
      } catch (error) {
        logger.error(`Error saving discovered post URL: ${post.postUrl}`, error);
      }
    }

    // Update keyword stats
    await db.keyword.update({
      where: { id: keywordId },
      data: {
        lastSearchedAt: new Date(),
        matchesFound: {
          increment: createdCount,
        },
      },
    });

    logger.info(`Keyword scan completed: "${keywordRecord.keyword}". Found: ${createdCount}, Skipped: ${skippedCount}`);
    return { created: createdCount, skipped: skippedCount };
  }

  /**
   * Helper to calculate since/until dates based on string filter
   */
  private static calculateTimeBounds(
    filter: string,
    customSince?: Date,
    customUntil?: Date
  ): { since?: Date; until?: Date } {
    const now = new Date();
    
    switch (filter) {
      case 'hour':
        return { since: new Date(now.getTime() - 60 * 60 * 1000) };
      case '6hours':
        return { since: new Date(now.getTime() - 6 * 60 * 60 * 1000) };
      case '12hours':
        return { since: new Date(now.getTime() - 12 * 60 * 60 * 1000) };
      case '24hours':
        return { since: new Date(now.getTime() - 24 * 60 * 60 * 1000) };
      case '48hours':
        return { since: new Date(now.getTime() - 48 * 60 * 60 * 1000) };
      case '7days':
        return { since: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
      case '30days':
        return { since: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
      case 'custom':
        return { since: customSince, until: customUntil };
      default:
        // Default to past 24 hours if unspecified
        return { since: new Date(now.getTime() - 24 * 60 * 60 * 1000) };
    }
  }
}
