import { 
  CompanyOverviewData, 
  DecisionMakerContact, 
  EngineeringIntelligenceData, 
  CompanyTimelineEvent, 
  CategorizedTechStack 
} from './types';
import { GrowthIntelligenceData } from '../crunchbase/types';
import { ProductHuntIntelligenceData } from '../producthunt/types';
import { RedditIntelligenceData } from '../reddit/types';
import { LinkedInIntelligenceData } from '../linkedin/types';
import { logger } from '@/lib/logger';

/**
 * Standardize company domain from URL or email.
 */
export function normalizeCompanyDomain(rawInput: string): string {
  if (!rawInput) return 'unknown-domain.com';
  let cleaned = rawInput.toLowerCase().trim();
  cleaned = cleaned.replace(/^https?:\/\//, '');
  cleaned = cleaned.replace(/^www\./, '');
  cleaned = cleaned.replace(/\/.*$/, '');
  if (cleaned.includes('@')) {
    cleaned = cleaned.split('@')[1];
  }
  return cleaned || 'unknown-domain.com';
}

/**
 * Generate unique internal Company ID.
 */
export function generateCompanyId(domain: string, companyName: string): string {
  const normDomain = normalizeCompanyDomain(domain);
  if (normDomain && normDomain !== 'unknown-domain.com') {
    return `comp_${normDomain.replace(/[^a-z0-9]/g, '_')}`;
  }
  const normName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `comp_${normName}`;
}

/**
 * Classify technical stack badges into structured categories.
 */
export function categorizeTechStack(techList: string[]): CategorizedTechStack {
  const result: CategorizedTechStack = {
    frontend: [],
    backend: [],
    mobile: [],
    devopsCloud: [],
    aiMl: [],
    databases: [],
  };

  techList.forEach(tech => {
    const t = tech.toLowerCase();
    if (['react', 'react 19', 'next.js', 'nextjs', 'angular', 'vue', 'tailwind', 'typescript'].some(k => t.includes(k))) {
      if (!result.frontend.includes(tech)) result.frontend.push(tech);
    }
    if (['node', 'node.js', 'express', 'nestjs', 'python', 'fastapi', 'django', 'go', 'java', 'ruby'].some(k => t.includes(k))) {
      if (!result.backend.includes(tech)) result.backend.push(tech);
    }
    if (['flutter', 'dart', 'react native', 'ios', 'android', 'swift', 'kotlin'].some(k => t.includes(k))) {
      if (!result.mobile.includes(tech)) result.mobile.push(tech);
    }
    if (['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'vercel', 'devops', 'terraform'].some(k => t.includes(k))) {
      if (!result.devopsCloud.includes(tech)) result.devopsCloud.push(tech);
    }
    if (['ai', 'llm', 'llama 3', 'pytorch', 'tensorflow', 'openai', 'fastapi', 'langchain'].some(k => t.includes(k))) {
      if (!result.aiMl.includes(tech)) result.aiMl.push(tech);
    }
    if (['postgres', 'postgresql', 'mongodb', 'redis', 'mysql', 'prisma', 'firebase'].some(k => t.includes(k))) {
      if (!result.databases.includes(tech)) result.databases.push(tech);
    }
  });

  // Removed fallbacks as per user request to keep data empty if not available

  return result;
}

/**
 * Cross-Provider Data Fusion Engine.
 * Fuses Apollo Company Data with GitHub, Crunchbase, Product Hunt, Reddit, and LinkedIn Organic Intelligence Data.
 */
export function fuseCompanyProfiles(
  apolloData: Partial<CompanyOverviewData> & { decisionMakers?: DecisionMakerContact[] },
  githubData?: Partial<EngineeringIntelligenceData>,
  growthData?: GrowthIntelligenceData,
  productHuntData?: ProductHuntIntelligenceData,
  redditData?: RedditIntelligenceData,
  linkedinData?: LinkedInIntelligenceData
): {
  companyId: string;
  domain: string;
  overview: CompanyOverviewData;
  decisionMakers: DecisionMakerContact[];
  engineering: EngineeringIntelligenceData;
  growth?: GrowthIntelligenceData;
  productHunt?: ProductHuntIntelligenceData;
  reddit?: RedditIntelligenceData;
  linkedin?: LinkedInIntelligenceData;
  timeline: CompanyTimelineEvent[];
} {
  const domain = normalizeCompanyDomain(apolloData.domain || apolloData.websiteUrl || 'unknown-company.com');
  const companyName = apolloData.companyName || (githubData?.githubOrgLogin ? githubData.githubOrgLogin.toUpperCase() : 'Unknown Company');
  const companyId = generateCompanyId(domain, companyName);

  logger.info(`Company Identity Resolution Engine: Fusing identity for '${companyName}' (${domain})...`);

  // Fuse Overview
  const overview: CompanyOverviewData = {
    companyId,
    companyName,
    domain,
    websiteUrl: apolloData.websiteUrl || `https://${domain}`,
    industry: apolloData.industry || 'Technology & B2B Software',
    headquarters: apolloData.headquarters || '',
    employeeCount: apolloData.employeeCount || 0,
    employeeRange: apolloData.employeeRange || (apolloData.employeeCount 
      ? (apolloData.employeeCount > 10000 ? '10000+' 
         : apolloData.employeeCount > 1000 ? '1001 - 10000' 
         : apolloData.employeeCount > 200 ? '201 - 1000' 
         : apolloData.employeeCount > 50 ? '51 - 200' 
         : '1 - 50')
      : 'Unknown'),
    estimatedRevenue: apolloData.estimatedRevenue || (apolloData.employeeCount 
      ? (apolloData.employeeCount > 1000 ? '$100M+' 
         : apolloData.employeeCount > 200 ? '$50M - $100M' 
         : apolloData.employeeCount > 50 ? '$10M - $50M' 
         : '$1M - $10M')
      : 'Undisclosed'),
    fundingStage: apolloData.fundingStage || 'Undisclosed',
    fundingTotal: apolloData.fundingTotal || 'Undisclosed',
    companyDescription: apolloData.companyDescription || `Leading company in the ${apolloData.industry || 'Technology'} space.`,
    logoUrl: apolloData.logoUrl || '',
    linkedinPageUrl: apolloData.linkedinPageUrl || '',
    source: 'Apollo',
  };

  // Fuse Decision Makers (From Apollo)
  const decisionMakers: DecisionMakerContact[] = apolloData.decisionMakers && apolloData.decisionMakers.length > 0 
    ? apolloData.decisionMakers 
    : [];

  // Fuse Engineering Intelligence (From GitHub)
  const githubOrgLogin = githubData?.githubOrgLogin || domain.split('.')[0];
  const allTech = Array.from(new Set([
    ...(githubData?.primaryLanguages || [])
  ]));

  const engineering: EngineeringIntelligenceData = {
    githubOrgLogin,
    githubOrgUrl: githubData?.githubOrgUrl || '',
    publicReposCount: githubData?.publicReposCount || 0,
    activeReposCount: githubData?.activeReposCount || 0,
    totalStarsCount: githubData?.totalStarsCount || 0,
    totalForksCount: githubData?.totalForksCount || 0,
    totalContributorsCount: githubData?.totalContributorsCount || 0,
    primaryLanguages: githubData?.primaryLanguages || [],
    categorizedTechStack: categorizeTechStack(allTech),
    engineeringMaturityScore: githubData?.engineeringMaturityScore || 0,
    hiringSignalScore: githubData?.hiringSignalScore || 0,
    recentActivitySummary: githubData?.recentActivitySummary || '',
    topRepositories: githubData?.topRepositories || [],
    source: 'GitHub',
  };

  // Cross-Provider Timeline Events
  const timeline: CompanyTimelineEvent[] = [
    {
      id: `tl_${companyId}_1`,
      timestamp: 'Today',
      eventType: 'APOLLO_IMPORTED',
      title: 'Company Profile Created',
      description: `Indexed ${overview.companyName}`,
      source: 'Cross-Provider',
    }
  ];

  return {
    companyId,
    domain,
    overview,
    decisionMakers,
    engineering,
    growth: growthData,
    productHunt: productHuntData,
    reddit: redditData,
    linkedin: linkedinData,
    timeline,
  };
}
