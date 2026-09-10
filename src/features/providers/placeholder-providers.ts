import { BaseLeadProvider } from './base-provider';
import { ProviderCapabilities, ProviderFilterKey } from './types';

// 1. LinkedIn Provider
export class LinkedInLeadProvider extends BaseLeadProvider {
  id = 'linkedin';
  name = 'LinkedIn';
  description = 'Social Hiring & Buying Intent Posts, Profiles, and Organization Signals';
  iconName = 'Share2';
  isBeta = true;
  isLive = false;
  version = '1.2.0';
  apiVersion = 'v2';
  avgResponseTimeMs = 450;

  getCapabilities(): ProviderCapabilities {
    return {
      searchTypes: ['Posts', 'People', 'Companies'],
      supportsCompanies: true,
      supportsPeople: true,
      supportsProjects: false,
      supportsEnrichment: false,
      supportedFilters: ['company', 'industry', 'country', 'jobTitle', 'decisionMaker', 'keywords', 'hiring', 'remote'],
    };
  }
  getSupportedFilters(): ProviderFilterKey[] {
    return this.getCapabilities().supportedFilters;
  }
}

// 2. Upwork Provider
export class UpworkLeadProvider extends BaseLeadProvider {
  id = 'upwork';
  name = 'Upwork';
  description = 'Freelance Enterprise Client Job Openings, RFPs & Project Requests';
  iconName = 'Briefcase';
  isBeta = true;
  isLive = false;
  version = '1.0.0';
  apiVersion = 'v1';
  avgResponseTimeMs = 320;

  getCapabilities(): ProviderCapabilities {
    return {
      searchTypes: ['Projects', 'Buyer Requests'],
      supportsCompanies: false,
      supportsPeople: false,
      supportsProjects: true,
      supportsEnrichment: false,
      supportedFilters: ['keywords', 'technology', 'budget', 'projectType', 'country', 'remote'],
    };
  }
  getSupportedFilters(): ProviderFilterKey[] {
    return this.getCapabilities().supportedFilters;
  }
}

// 3. Fiverr Provider
export class FiverrLeadProvider extends BaseLeadProvider {
  id = 'fiverr';
  name = 'Fiverr Pro';
  description = 'Buyer Briefs & Custom Agency Project Requirements';
  iconName = 'ShoppingBag';
  isBeta = true;
  isLive = false;
  version = '1.0.0';
  apiVersion = 'v1';
  avgResponseTimeMs = 290;

  getCapabilities(): ProviderCapabilities {
    return {
      searchTypes: ['Buyer Requests', 'Projects'],
      supportsCompanies: false,
      supportsPeople: false,
      supportsProjects: true,
      supportsEnrichment: false,
      supportedFilters: ['keywords', 'technology', 'budget', 'projectType'],
    };
  }
  getSupportedFilters(): ProviderFilterKey[] {
    return this.getCapabilities().supportedFilters;
  }
}

// 4. Freelancer Provider
export class FreelancerLeadProvider extends BaseLeadProvider {
  id = 'freelancer';
  name = 'Freelancer.com';
  description = 'Global Software & IT Outsourcing Bids and Contests';
  iconName = 'Globe';
  isBeta = true;
  isLive = false;
  version = '1.1.0';
  apiVersion = 'v1';
  avgResponseTimeMs = 310;

  getCapabilities(): ProviderCapabilities {
    return {
      searchTypes: ['Projects'],
      supportsCompanies: false,
      supportsPeople: false,
      supportsProjects: true,
      supportsEnrichment: false,
      supportedFilters: ['keywords', 'technology', 'budget', 'country', 'projectType'],
    };
  }
  getSupportedFilters(): ProviderFilterKey[] {
    return this.getCapabilities().supportedFilters;
  }
}

// 5. Guru Provider
export class GuruLeadProvider extends BaseLeadProvider {
  id = 'guru';
  name = 'Guru.com';
  description = 'Enterprise Software Bids, Agency RFPs & Contract Opportunities';
  iconName = 'Award';
  isBeta = true;
  isLive = false;
  version = '1.0.0';
  apiVersion = 'v1';
  avgResponseTimeMs = 330;

  getCapabilities(): ProviderCapabilities {
    return {
      searchTypes: ['Projects', 'Buyer Requests'],
      supportsCompanies: false,
      supportsPeople: false,
      supportsProjects: true,
      supportsEnrichment: false,
      supportedFilters: ['keywords', 'technology', 'budget', 'projectType', 'country'],
    };
  }
  getSupportedFilters(): ProviderFilterKey[] {
    return this.getCapabilities().supportedFilters;
  }
}

// 6. PeoplePerHour Provider
export class PeoplePerHourLeadProvider extends BaseLeadProvider {
  id = 'peopleperhour';
  name = 'PeoplePerHour';
  description = 'UK & European Tech Client Project Job Offers';
  iconName = 'Users';
  isBeta = true;
  isLive = false;
  version = '1.0.0';
  apiVersion = 'v1';
  avgResponseTimeMs = 350;

  getCapabilities(): ProviderCapabilities {
    return {
      searchTypes: ['Projects'],
      supportsCompanies: false,
      supportsPeople: false,
      supportsProjects: true,
      supportsEnrichment: false,
      supportedFilters: ['keywords', 'technology', 'budget', 'country', 'projectType'],
    };
  }
  getSupportedFilters(): ProviderFilterKey[] {
    return this.getCapabilities().supportedFilters;
  }
}

// 7. Toptal Provider
export class ToptalLeadProvider extends BaseLeadProvider {
  id = 'toptal';
  name = 'Toptal';
  description = 'Top 3% Premium Tech Talent & Agency Contracting Roles';
  iconName = 'Zap';
  isBeta = true;
  isLive = false;
  version = '1.0.0';
  apiVersion = 'v2';
  avgResponseTimeMs = 270;

  getCapabilities(): ProviderCapabilities {
    return {
      searchTypes: ['Projects', 'Hiring'],
      supportsCompanies: true,
      supportsPeople: false,
      supportsProjects: true,
      supportsEnrichment: false,
      supportedFilters: ['keywords', 'technology', 'budget', 'remote'],
    };
  }
  getSupportedFilters(): ProviderFilterKey[] {
    return this.getCapabilities().supportedFilters;
  }
}

// 8. Contra Provider
export class ContraLeadProvider extends BaseLeadProvider {
  id = 'contra';
  name = 'Contra';
  description = 'Commission-free Independent Dev & Design Projects';
  iconName = 'Briefcase';
  isBeta = true;
  isLive = false;
  version = '1.0.0';
  apiVersion = 'v1';
  avgResponseTimeMs = 260;

  getCapabilities(): ProviderCapabilities {
    return {
      searchTypes: ['Projects'],
      supportsCompanies: false,
      supportsPeople: false,
      supportsProjects: true,
      supportsEnrichment: false,
      supportedFilters: ['keywords', 'technology', 'budget', 'remote'],
    };
  }
  getSupportedFilters(): ProviderFilterKey[] {
    return this.getCapabilities().supportedFilters;
  }
}

// 9. Wellfound Jobs Provider
export class WellfoundLeadProvider extends BaseLeadProvider {
  id = 'wellfound';
  name = 'Wellfound (AngelList)';
  description = 'High-Growth Tech Startups Hiring Engineering & Product Leaders';
  iconName = 'Flame';
  isBeta = true;
  isLive = false;
  version = '1.0.0';
  apiVersion = 'v2';
  avgResponseTimeMs = 410;

  getCapabilities(): ProviderCapabilities {
    return {
      searchTypes: ['Companies', 'Hiring', 'Projects'],
      supportsCompanies: true,
      supportsPeople: false,
      supportsProjects: true,
      supportsEnrichment: false,
      supportedFilters: ['company', 'industry', 'employees', 'funding', 'hiring', 'technology', 'remote'],
    };
  }
  getSupportedFilters(): ProviderFilterKey[] {
    return this.getCapabilities().supportedFilters;
  }
}

// 10. RemoteOK Provider
export class RemoteOKLeadProvider extends BaseLeadProvider {
  id = 'remoteok';
  name = 'RemoteOK';
  description = 'Global Remote Engineering & Software Development Roles';
  iconName = 'Globe';
  isBeta = true;
  isLive = false;
  version = '1.0.0';
  apiVersion = 'v1';
  avgResponseTimeMs = 240;

  getCapabilities(): ProviderCapabilities {
    return {
      searchTypes: ['Hiring', 'Projects'],
      supportsCompanies: true,
      supportsPeople: false,
      supportsProjects: true,
      supportsEnrichment: false,
      supportedFilters: ['keywords', 'technology', 'remote', 'country'],
    };
  }
  getSupportedFilters(): ProviderFilterKey[] {
    return this.getCapabilities().supportedFilters;
  }
}

// 11. WeWorkRemotely Provider
export class WeWorkRemotelyLeadProvider extends BaseLeadProvider {
  id = 'weworkremotely';
  name = 'We Work Remotely';
  description = 'Largest Remote Dev & Engineering Job Community';
  iconName = 'Building2';
  isBeta = true;
  isLive = false;
  version = '1.0.0';
  apiVersion = 'v1';
  avgResponseTimeMs = 280;

  getCapabilities(): ProviderCapabilities {
    return {
      searchTypes: ['Hiring', 'Projects'],
      supportsCompanies: true,
      supportsPeople: false,
      supportsProjects: true,
      supportsEnrichment: false,
      supportedFilters: ['keywords', 'technology', 'remote', 'country'],
    };
  }
  getSupportedFilters(): ProviderFilterKey[] {
    return this.getCapabilities().supportedFilters;
  }
}

// 12. Crunchbase Provider
export class CrunchbaseLeadProvider extends BaseLeadProvider {
  id = 'crunchbase';
  name = 'Crunchbase';
  description = 'Venture Funding Rounds, M&A Activity, and Growth Investments';
  iconName = 'TrendingUp';
  isBeta = true;
  isLive = false;
  version = '2.1.0';
  apiVersion = 'v4';
  avgResponseTimeMs = 520;

  getCapabilities(): ProviderCapabilities {
    return {
      searchTypes: ['Companies', 'Funding'],
      supportsCompanies: true,
      supportsPeople: false,
      supportsProjects: false,
      supportsEnrichment: false,
      supportedFilters: ['company', 'industry', 'funding', 'revenue', 'country', 'employees'],
    };
  }
  getSupportedFilters(): ProviderFilterKey[] {
    return this.getCapabilities().supportedFilters;
  }
}

// 13. Clutch Provider
export class ClutchLeadProvider extends BaseLeadProvider {
  id = 'clutch';
  name = 'Clutch.co';
  description = 'B2B Client Reviews, Verified Agency Listings & Buyers';
  iconName = 'Award';
  isBeta = true;
  isLive = false;
  version = '1.0.0';
  apiVersion = 'v1';
  avgResponseTimeMs = 380;

  getCapabilities(): ProviderCapabilities {
    return {
      searchTypes: ['Companies', 'People'],
      supportsCompanies: true,
      supportsPeople: true,
      supportsProjects: false,
      supportsEnrichment: false,
      supportedFilters: ['company', 'industry', 'budget', 'country', 'revenue', 'technology'],
    };
  }
  getSupportedFilters(): ProviderFilterKey[] {
    return this.getCapabilities().supportedFilters;
  }
}

// 14. GoodFirms Provider
export class GoodFirmsLeadProvider extends BaseLeadProvider {
  id = 'goodfirms';
  name = 'GoodFirms';
  description = 'IT Services Directory & Software Buyer Research Data';
  iconName = 'CheckCircle2';
  isBeta = true;
  isLive = false;
  version = '1.0.0';
  apiVersion = 'v1';
  avgResponseTimeMs = 360;

  getCapabilities(): ProviderCapabilities {
    return {
      searchTypes: ['Companies'],
      supportsCompanies: true,
      supportsPeople: false,
      supportsProjects: false,
      supportsEnrichment: false,
      supportedFilters: ['company', 'industry', 'technology', 'country'],
    };
  }
  getSupportedFilters(): ProviderFilterKey[] {
    return this.getCapabilities().supportedFilters;
  }
}

// 15. GitHub Provider
export class GitHubLeadProvider extends BaseLeadProvider {
  id = 'github';
  name = 'GitHub';
  description = 'Open Source Tech Stacks, Hiring Issues & Developer Activity';
  iconName = 'Code';
  isBeta = true;
  isLive = false;
  version = '3.0.0';
  apiVersion = 'v3';
  avgResponseTimeMs = 280;

  getCapabilities(): ProviderCapabilities {
    return {
      searchTypes: ['Repositories', 'Hiring', 'People'],
      supportsCompanies: false,
      supportsPeople: true,
      supportsProjects: true,
      supportsEnrichment: false,
      supportedFilters: ['technology', 'keywords', 'country', 'hiring', 'language', 'stars'],
    };
  }
  getSupportedFilters(): ProviderFilterKey[] {
    return this.getCapabilities().supportedFilters;
  }
}

// 16. Reddit Provider
export class RedditLeadProvider extends BaseLeadProvider {
  id = 'reddit';
  name = 'Reddit';
  description = 'Buying Intent Subreddit Discussions (r/forhire, r/software, etc.)';
  iconName = 'MessageSquare';
  isBeta = true;
  isLive = false;
  version = '1.0.0';
  apiVersion = 'v1';
  avgResponseTimeMs = 340;

  getCapabilities(): ProviderCapabilities {
    return {
      searchTypes: ['Discussions', 'Posts'],
      supportsCompanies: false,
      supportsPeople: false,
      supportsProjects: true,
      supportsEnrichment: false,
      supportedFilters: ['keywords', 'technology', 'budget', 'projectType'],
    };
  }
  getSupportedFilters(): ProviderFilterKey[] {
    return this.getCapabilities().supportedFilters;
  }
}

// 17. Product Hunt Provider
export class ProductHuntLeadProvider extends BaseLeadProvider {
  id = 'producthunt';
  name = 'Product Hunt';
  description = 'Newly Launched SaaS Tech Products & Maker Contacts';
  iconName = 'Zap';
  isBeta = true;
  isLive = false;
  version = '2.0.0';
  apiVersion = 'v2';
  avgResponseTimeMs = 390;

  getCapabilities(): ProviderCapabilities {
    return {
      searchTypes: ['Companies', 'People'],
      supportsCompanies: true,
      supportsPeople: true,
      supportsProjects: false,
      supportsEnrichment: false,
      supportedFilters: ['company', 'industry', 'technology', 'jobTitle', 'keywords'],
    };
  }
  getSupportedFilters(): ProviderFilterKey[] {
    return this.getCapabilities().supportedFilters;
  }
}

// 18. Custom RSS Feed Provider
export class RssFeedLeadProvider extends BaseLeadProvider {
  id = 'rss';
  name = 'Custom RSS / Webhooks';
  description = 'Ingest Custom Marketplace RSS & Inbound Webhook Opportunities';
  iconName = 'Radio';
  isBeta = false;
  isLive = true;
  version = '1.0.0';
  apiVersion = 'v1';
  avgResponseTimeMs = 45;

  async getStatus() {
    return 'Connected' as const;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      searchTypes: ['Projects', 'Posts'],
      supportsCompanies: true,
      supportsPeople: false,
      supportsProjects: true,
      supportsEnrichment: false,
      supportedFilters: ['keywords', 'technology', 'budget', 'country'],
    };
  }
  getSupportedFilters(): ProviderFilterKey[] {
    return this.getCapabilities().supportedFilters;
  }
}

// 19. Manual Import Provider
export class ManualLeadProvider extends BaseLeadProvider {
  id = 'manual';
  name = 'Manual CSV Import';
  description = 'Custom CSV/Excel List Import for Direct Cold Prospecting';
  iconName = 'FileSpreadsheet';
  isBeta = false;
  isLive = true;
  version = '1.0.0';
  apiVersion = 'v1';
  avgResponseTimeMs = 15;

  async getStatus() {
    return 'Connected' as const;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      searchTypes: ['Manual Import', 'Companies', 'People', 'Projects'],
      supportsCompanies: true,
      supportsPeople: true,
      supportsProjects: true,
      supportsEnrichment: false,
      supportedFilters: ['company', 'industry', 'country', 'jobTitle', 'keywords'],
    };
  }
  getSupportedFilters(): ProviderFilterKey[] {
    return this.getCapabilities().supportedFilters;
  }
}

// 20. Webhook Inbound Provider
export class WebhookLeadProvider extends BaseLeadProvider {
  id = 'webhook';
  name = 'Zapier / Custom Webhooks';
  description = 'Inbound Real-Time Opportunity Webhook Connector (Zapier, Make.com, n8n)';
  iconName = 'Zap';
  isBeta = false;
  isLive = true;
  version = '1.0.0';
  apiVersion = 'v1';
  avgResponseTimeMs = 85;

  async getStatus() {
    return 'Connected' as const;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      searchTypes: ['Projects', 'Buyer Requests'],
      supportsCompanies: true,
      supportsPeople: true,
      supportsProjects: true,
      supportsEnrichment: false,
      supportedFilters: ['keywords', 'technology', 'budget', 'country'],
    };
  }
  getSupportedFilters(): ProviderFilterKey[] {
    return this.getCapabilities().supportedFilters;
  }
}
