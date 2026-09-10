import { DiscoveryPost, IDiscoveryProvider, registerDiscoveryProvider } from './discovery';

class MockDiscoveryProvider implements IDiscoveryProvider {
  public readonly name = 'mock';

  private mockAuthors = [
    { name: 'Sarah Jenkins', headline: 'VP of Sales @ TechCorp | B2B Growth Strategy', company: 'TechCorp' },
    { name: 'David Chen', headline: 'Founder at LeadFlow AI | YC W24', company: 'LeadFlow AI' },
    { name: 'Elena Rostova', headline: 'Chief Marketing Officer at SaaSify | Product-Led Growth Specialist', company: 'SaaSify' },
    { name: 'Marcus Brody', headline: 'Director of Talent Acquisition @ ScaleUp | We are hiring!', company: 'ScaleUp' },
    { name: 'Nikhil Sharma', headline: 'Head of Engineering at DevSquad | Cloud Architect', company: 'DevSquad' },
    { name: 'Jessica Vance', headline: 'Enterprise Account Executive @ Salesforce | Digital Transformation', company: 'Salesforce' },
  ];

  private templates = {
    ai: [
      'We just integrated custom AI agents into our customer support workflow. The result? First response time dropped from 4 hours to 4 minutes, and CSAT is up by 15%. Anyone else exploring LLM integrations for enterprise operations?',
      'Is anyone else struggling with high API latency when deploying OpenAI assistants in production? We are looking for strategies to cache prompts and optimize token usage. Share your stacks below!',
      'AI is not going to replace software engineers, but engineers who use AI will replace those who do not. We just automated 40% of our code documentation using LLMs. Curious to hear how other CTOs are measuring team productivity.',
    ],
    saas: [
      'Bootstrapping a SaaS to $10k MRR in 6 months taught me one critical lesson: focus on distribution before you write a single line of code. If you do not have an audience, you do not have a business.',
      'Our SaaS churn rate spiked to 6.2% last month. After doing 20 customer interviews, we realized it was not a product issue—it was an onboarding issue. We simplified our setup wizard and churn dropped to 2.8%.',
      'The era of cheap capital is over. For SaaS startups in 2026, efficient growth is the only metric that matters. LTV/CAC ratio of 4+ is the new baseline. What is your primary focus this quarter?',
    ],
    outreach: [
      'Cold outreach is officially dead if you are sending generic mass templates. We switched to highly personalized, trigger-based LinkedIn outreach and saw our reply rates jump from 1.5% to 18.4%. Focus on relevance, not volume.',
      'Just received another cold email pitch that got my company name and role completely wrong. Quick tip for sales reps: if you do not have time to personalize the first line, do not send the email.',
      'How are enterprise sales teams handling lead generation this year? We are finding that warm introductions from mutual connections on LinkedIn convert 5x better than cold campaigns. Let us discuss strategies.',
    ],
    general: [
      'Just wrapped up an incredible workshop on digital transformation with our leadership team. Looking forward to implementing these workflows next month! Thanks to everyone who participated.',
      'Had a great conversation with a prospective partner today. The key takeaway was that transparency and clear expectations are the foundation of any successful business relationship.',
      'As we plan our roadmap for the next two quarters, user feedback is our primary compass. Customer-centric design is not a luxury—it is a survival mechanism in this market.',
    ],
  };

  async search(
    query: string,
    options: { since?: Date; until?: Date; limit?: number }
  ): Promise<DiscoveryPost[]> {
    const limit = options.limit || 10;
    const lowerQuery = query.toLowerCase();
    
    // Choose appropriate template pool based on query terms
    let pool = this.templates.general;
    if (lowerQuery.includes('ai') || lowerQuery.includes('gpt') || lowerQuery.includes('chat') || lowerQuery.includes('bot') || lowerQuery.includes('artificial')) {
      pool = this.templates.ai;
    } else if (lowerQuery.includes('saas') || lowerQuery.includes('software') || lowerQuery.includes('subscription')) {
      pool = this.templates.saas;
    } else if (lowerQuery.includes('outreach') || lowerQuery.includes('sales') || lowerQuery.includes('lead') || lowerQuery.includes('pitch')) {
      pool = this.templates.outreach;
    }

    const posts: DiscoveryPost[] = [];
    const sinceTime = options.since ? options.since.getTime() : Date.now() - 24 * 60 * 60 * 1000;
    const untilTime = options.until ? options.until.getTime() : Date.now();
    const timeSpan = untilTime - sinceTime;

    for (let i = 0; i < limit; i++) {
      const author = this.mockAuthors[i % this.mockAuthors.length];
      const template = pool[i % pool.length];
      
      // Calculate random timestamp within bounds
      const randomTime = new Date(sinceTime + Math.random() * timeSpan);
      
      // Create a unique post URL based on index and hash
      const hash = Math.floor(Math.random() * 1000000);
      const postUrl = `https://www.linkedin.com/posts/activity-${hash}_${i}`;

      // Calculate realistic engagement counts
      const engagementCount = Math.floor(Math.random() * 150) + 5;

      posts.push({
        postUrl,
        authorName: author.name,
        authorHeadline: author.headline,
        companyName: author.company,
        postPreview: template.substring(0, 100) + '...',
        postedAt: randomTime,
        engagementCount,
      });
    }

    // Return mock results with a slight artificial network delay
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(posts);
      }, 300);
    });
  }
}

// Automatically register mock provider
registerDiscoveryProvider(new MockDiscoveryProvider());
