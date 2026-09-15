import { IDiscoveryProvider, DiscoveryPost, registerDiscoveryProvider } from './discovery';
import { apolloProvider } from '@/features/apollo/provider';
import { logger } from '@/lib/logger';

class ApolloDiscoveryProvider implements IDiscoveryProvider {
  public readonly name = 'apollo';

  async search(
    query: string,
    options: {
      since?: Date;
      until?: Date;
      limit?: number;
    }
  ): Promise<DiscoveryPost[]> {
    try {
      // We will map Apollo's searchPeopleAdvanced to DiscoveryPost
      const apolloRes = await apolloProvider.searchPeopleAdvanced({
        keywords: query,
        perPage: options.limit || 20,
        page: 1,
      });

      if (!apolloRes || !apolloRes.people || apolloRes.people.length === 0) {
        return [];
      }

      return apolloRes.people.map(p => {
        // Build a synthetic post preview if there is no real post
        // since Apollo is mostly people-based, not post-based.
        const preview = `(Live Apollo Signal) ${p.personName}, ${p.jobTitle || 'Executive'} at ${p.organizationName || 'Target Account'}, matches our target criteria for '${query}'.`;
        
        return {
          postUrl: p.linkedinUrl || `https://apollo.io/person/${p.apolloPersonId}`,
          authorName: p.personName || 'Unknown Lead',
          authorHeadline: p.jobTitle || 'Executive',
          companyName: p.organizationName || undefined,
          postPreview: preview,
          postedAt: new Date(),
          engagementCount: 0,
        };
      });
    } catch (error) {
      logger.error('ApolloDiscoveryProvider search failed', error);
      return [];
    }
  }
}

// Automatically register apollo provider
registerDiscoveryProvider(new ApolloDiscoveryProvider());
