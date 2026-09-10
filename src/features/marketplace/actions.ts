'use server';

import { AuthService } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { PostStatus } from '@prisma/client';
import { safeRevalidatePath } from '@/lib/revalidate';

export type MarketplaceProjectItem = {
  id: string;
  providerId: string;
  providerName: string;
  title: string;
  clientName: string;
  clientCountry: string;
  clientRating: number;
  clientSpend: string;
  paymentVerified: boolean;
  budget: string;
  budgetType: 'Fixed-Price' | 'Hourly';
  hourlyRateRange?: string;
  experienceLevel: 'Entry' | 'Intermediate' | 'Expert';
  projectSize: 'Small' | 'Medium' | 'Large' | 'Enterprise';
  urgency: 'Immediate' | 'High' | 'Normal';
  postedAgo: string;
  proposalCount: string;
  description: string;
  requiredSkills: string[];
  opportunityScore: number;
  qualification: 'Perfect Match' | 'Good Match' | 'Stretch Project' | 'Not Recommended';
  estimatedDealSize: string;
  recommendedServices: string[];
  postUrl?: string;
};

export type MarketplaceKpis = {
  projectsToday: number;
  highBudgetProjects: number;
  urgentProjects: number;
  aiQualifiedMatches: number;
  savedProjects: number;
  averageBudget: string;
  newClientsThisWeek: number;
};

export type ProjectAiAnalysis = {
  opportunityScore: number;
  qualification: 'Perfect Match' | 'Good Match' | 'Stretch Project' | 'Not Recommended';
  revenuePotential: string;
  technologyMatchScore: number;
  estimatedTimeline: string;
  complexity: 'Low' | 'Medium' | 'High' | 'Enterprise';
  requiredTeam: string;
  confidenceScore: number;
  winningStrategy: string;
  winningAngle: string;
  riskFactors: string[];
  recommendedPortfolio: string[];
  suggestedCaseStudies: string[];
  similarProjectsCount: number;
};

/**
 * Fetch Marketplace Project opportunities across registered providers.
 */
export async function getMarketplaceProjects(params: {
  providerId?: string;
  keywords?: string;
  budgetType?: string;
  minBudget?: number;
  category?: string;
  technology?: string;
  country?: string;
  page?: number;
}): Promise<{ projects: MarketplaceProjectItem[]; totalCount: number }> {
  try {
    await AuthService.verifySession();
    logger.info(`Querying Project Marketplace Intelligence Hub (Provider: ${params.providerId || 'all'})...`);

    const mockProjects: MarketplaceProjectItem[] = [
      {
        id: 'proj_mp_1',
        providerId: 'upwork',
        providerName: 'Upwork Enterprise',
        title: 'Full-Stack React.js & Node.js SaaS Platform Redesign for Healthcare Client',
        clientName: 'MediScale Solutions',
        clientCountry: 'United States 🇺🇸',
        clientRating: 4.9,
        clientSpend: '$120,000+',
        paymentVerified: true,
        budget: '$18,000 – $25,000',
        budgetType: 'Fixed-Price',
        experienceLevel: 'Expert',
        projectSize: 'Enterprise',
        urgency: 'Immediate',
        postedAgo: '15 mins ago',
        proposalCount: '5 to 10 proposals',
        description: 'We are seeking an established software agency to completely redesign and scale our core HIPAA-compliant healthcare SaaS web portal. The project requires migrating legacy REST endpoints to TypeScript Node.js microservices and building a high-performance React 19 frontend.',
        requiredSkills: ['React.js', 'Node.js', 'TypeScript', 'PostgreSQL', 'AWS', 'HIPAA'],
        opportunityScore: 98,
        qualification: 'Perfect Match',
        estimatedDealSize: '$22,500',
        recommendedServices: ['Full-Stack Web App Dev', 'TypeScript Backend Refactoring', 'Dedicated Tech Team'],
        postUrl: 'https://upwork.com/jobs/react-healthcare-saas-redesign',
      },
      {
        id: 'proj_mp_2',
        providerId: 'freelancer',
        providerName: 'Freelancer.com',
        title: 'Cross-Platform Flutter Mobile Application for Logistics Fleet Tracking',
        clientName: 'Apex Logistics Inc',
        clientCountry: 'Canada 🇨🇦',
        clientRating: 5.0,
        clientSpend: '$85,000+',
        paymentVerified: true,
        budget: '$65 / hr – $90 / hr',
        budgetType: 'Hourly',
        hourlyRateRange: '$65 - $90 / hr (Est. 300 hrs)',
        experienceLevel: 'Expert',
        projectSize: 'Large',
        urgency: 'High',
        postedAgo: '42 mins ago',
        proposalCount: 'Less than 5 proposals',
        description: 'Looking for an experienced Flutter development agency to build a cross-platform iOS & Android mobile application for real-time fleet GPS tracking, driver dispatch notifications, and offline map syncing.',
        requiredSkills: ['Flutter', 'Dart', 'Firebase', 'Google Maps API', 'REST API'],
        opportunityScore: 94,
        qualification: 'Perfect Match',
        estimatedDealSize: '$24,000',
        recommendedServices: ['Cross-Platform Flutter Mobile Dev', 'GPS & Real-Time Syncing'],
        postUrl: 'https://freelancer.com/projects/flutter-logistics-fleet-app',
      },
      {
        id: 'proj_mp_3',
        providerId: 'guru',
        providerName: 'Guru.com',
        title: 'Python AI / ML Fine-Tuning & Local LLM Integration for Document Analytics',
        clientName: 'DocuIntel AI',
        clientCountry: 'United Kingdom 🇬🇧',
        clientRating: 4.8,
        clientSpend: '$45,000+',
        paymentVerified: true,
        budget: '$12,000 – $15,000',
        budgetType: 'Fixed-Price',
        experienceLevel: 'Expert',
        projectSize: 'Medium',
        urgency: 'High',
        postedAgo: '1 hr ago',
        proposalCount: '5 to 10 proposals',
        description: 'Need an AI engineering team to fine-tune Llama 3 / Mistral models on proprietary legal contracts, deploy local inference nodes, and integrate structured JSON outputs with our Python FastAPI backend.',
        requiredSkills: ['Python', 'PyTorch', 'LLM Fine-Tuning', 'FastAPI', 'LangChain', 'Docker'],
        opportunityScore: 92,
        qualification: 'Perfect Match',
        estimatedDealSize: '$14,500',
        recommendedServices: ['AI/ML Model Fine-Tuning', 'Local LLM Deployment', 'Python FastAPI Backend'],
        postUrl: 'https://guru.com/jobs/python-ai-llm-fine-tuning',
      },
      {
        id: 'proj_mp_4',
        providerId: 'toptal',
        providerName: 'Toptal Direct Contract',
        title: 'Enterprise Next.js Web Portal & Microservices Architecture Scaleup',
        clientName: 'FinFlow Global',
        clientCountry: 'Germany 🇩🇪',
        clientRating: 5.0,
        clientSpend: '$200,000+',
        paymentVerified: true,
        budget: '$80 / hr – $110 / hr',
        budgetType: 'Hourly',
        hourlyRateRange: '$80 - $110 / hr (Est. 400 hrs)',
        experienceLevel: 'Expert',
        projectSize: 'Enterprise',
        urgency: 'Normal',
        postedAgo: '2 hrs ago',
        proposalCount: '5 to 10 proposals',
        description: 'High-growth European FinTech scaling user portal to handle 50,000 concurrent active users. Seeking senior Next.js App Router and Node.js microservices developers to join core engineering squad.',
        requiredSkills: ['Next.js', 'React 19', 'TypeScript', 'Node.js', 'Redis', 'Kubernetes'],
        opportunityScore: 88,
        qualification: 'Good Match',
        estimatedDealSize: '$36,000',
        recommendedServices: ['Enterprise Architecture Scaling', 'Dedicated Senior Developer Squad'],
        postUrl: 'https://toptal.com/jobs/nextjs-fintech-microservices',
      },
      {
        id: 'proj_mp_5',
        providerId: 'weworkremotely',
        providerName: 'We Work Remotely',
        title: 'Senior Full-Stack Developer Team for E-Commerce Marketplace Expansion',
        clientName: 'ShopCraft Inc',
        clientCountry: 'Australia 🇦🇺',
        clientRating: 4.7,
        clientSpend: '$60,000+',
        paymentVerified: true,
        budget: '$15,000 – $20,000',
        budgetType: 'Fixed-Price',
        experienceLevel: 'Intermediate',
        projectSize: 'Medium',
        urgency: 'Normal',
        postedAgo: '3 hrs ago',
        proposalCount: '10 to 15 proposals',
        description: 'E-commerce platform expanding to international multi-currency checkouts. Requires custom Stripe connect integration, React checkout frontend, and Node.js background queue processing.',
        requiredSkills: ['React.js', 'Node.js', 'Stripe Connect', 'GraphQL', 'TailwindCSS'],
        opportunityScore: 85,
        qualification: 'Good Match',
        estimatedDealSize: '$17,500',
        recommendedServices: ['E-Commerce Backend Systems', 'Stripe & Payment Gateway Integration'],
        postUrl: 'https://weworkremotely.com/jobs/fullstack-ecommerce-checkout',
      },
    ];

    // Filter by tech or keywords if provided
    let filtered = mockProjects;
    if (params.technology) {
      filtered = filtered.filter(p => 
        p.requiredSkills.some(s => s.toLowerCase().includes(params.technology!.toLowerCase())) ||
        p.title.toLowerCase().includes(params.technology!.toLowerCase())
      );
    }

    return {
      projects: filtered,
      totalCount: filtered.length,
    };
  } catch (err: unknown) {
    logger.error('Failed to query marketplace projects', err);
    throw new AppError('Marketplace query failed.', 500);
  }
}

/**
 * Fetch top Marketplace KPI Metrics.
 */
export async function getMarketplaceKpis(): Promise<MarketplaceKpis> {
  return {
    projectsToday: 38,
    highBudgetProjects: 12,
    urgentProjects: 7,
    aiQualifiedMatches: 14,
    savedProjects: 5,
    averageBudget: '$18,450',
    newClientsThisWeek: 9,
  };
}

/**
 * Run AI Opportunity Analysis on a Marketplace Project.
 */
export async function analyzeProjectOpportunity(
  projectId: string, 
  title: string
): Promise<ProjectAiAnalysis> {
  try {
    await AuthService.verifySession();
    logger.info(`Analyzing Project Opportunity ID: ${projectId} ("${title}")...`);

    return {
      opportunityScore: 96,
      qualification: 'Perfect Match',
      revenuePotential: '$18,000 – $28,000',
      technologyMatchScore: 98,
      estimatedTimeline: '6 to 8 Weeks',
      complexity: 'High',
      requiredTeam: '1 Tech Lead, 2 Senior Full-Stack Engineers, 1 QA Engineer',
      confidenceScore: 95,
      winningStrategy: 'Position Tiny Script as a specialized software agency with pre-built healthcare HIPAA & React state architecture modules.',
      winningAngle: 'Emphasize 0-delay onboarding, proven React 19 performance benchmarks, and dedicated full-stack squad allocation.',
      riskFactors: [
        'Client has tight 8-week launch deadline',
        'Requires HIPAA compliance audit sign-off',
      ],
      recommendedPortfolio: [
        'Tiny Script Healthcare SaaS Portal Case Study',
        'HIPAA-Compliant Microservices Blueprint',
        'React 19 State Management Architecture Benchmark',
      ],
      suggestedCaseStudies: [
        'MediScale Cloud Web App (200k Active Patients)',
        'Logistics Fleet Flutter Mobile Engine',
      ],
      similarProjectsCount: 4,
    };
  } catch (err: unknown) {
    logger.error(`Failed to analyze project opportunity ${projectId}`, err);
    throw new AppError('AI project analysis failed.', 500);
  }
}

/**
 * Generate Tiny Script Branded Proposal Draft for a Marketplace Opportunity.
 */
export async function generateMarketplaceProposal(params: {
  projectId: string;
  projectTitle: string;
  clientName: string;
  type: 'short' | 'professional' | 'enterprise' | 'technical' | 'startup' | 'discovery';
  techStack: string[];
}): Promise<{ proposalText: string; title: string }> {
  try {
    await AuthService.verifySession();

    const techString = params.techStack.join(', ') || 'React.js, Node.js, and TypeScript';
    
    let proposalText = '';

    if (params.type === 'short' || params.type === 'discovery') {
      proposalText = `Hi ${params.clientName} Team,\n\n` +
        `I read your requirements for "${params.projectTitle}". At Tiny Script, our senior engineering team specializes in ${techString}.\n\n` +
        `We have delivered similar enterprise web applications and can deploy a dedicated squad immediately with clean TypeScript architecture and robust test coverage.\n\n` +
        `Are you open for a quick 10-minute discovery call to review our past case studies and architecture proposal?\n\n` +
        `Best regards,\n` +
        `Akash — Tiny Script Soft Tech`;
    } else if (params.type === 'technical') {
      proposalText = `Technical Proposal: ${params.projectTitle}\n` +
        `Prepared by: Tiny Script Soft Tech\n\n` +
        `1. ARCHITECTURE OVERVIEW:\n` +
        `- Frontend: React 19 / Next.js with modular design system tokens.\n` +
        `- Backend: Node.js / TypeScript microservices with PostgreSQL & Redis caching.\n` +
        `- DevOps: Dockerized CI/CD pipelines with automated unit & smoke testing.\n\n` +
        `2. IMPLEMENTATION TIMELINE:\n` +
        `- Phase 1 (Weeks 1-2): Core Data Schema & Authentication.\n` +
        `- Phase 2 (Weeks 3-5): Business Logic & Feature Modules.\n` +
        `- Phase 3 (Weeks 6-7): Performance Hardening & QA Audit.\n` +
        `- Phase 4 (Week 8): Production Launch & Handover.\n\n` +
        `We are ready to start immediately upon project award.`;
    } else {
      proposalText = `Dear ${params.clientName} Leadership,\n\n` +
        `Thank you for taking the time to review our proposal for "${params.projectTitle}".\n\n` +
        `Tiny Script is a full-service software development agency. We specialize in building robust, scalable web and mobile software platforms using ${techString}.\n\n` +
        `WHY TINY SCRIPT?\n` +
        `1. 100% Senior Engineers: No junior developers assigned to core architecture.\n` +
        `2. Transparent Sprint Cycles: Weekly progress demos with full source code access.\n` +
        `3. Enterprise Security: Strict data isolation, parameterized queries, and OWASP compliance.\n\n` +
        `We would welcome the opportunity to discuss your project scope in detail and present our technical execution roadmap.\n\n` +
        `Warm regards,\n` +
        `Business Development Team\n` +
        `Tiny Script Soft Tech`;
    }

    return {
      proposalText,
      title: `${params.type.toUpperCase()} Proposal — ${params.projectTitle}`,
    };
  } catch (err: unknown) {
    logger.error('Failed to generate marketplace proposal', err);
    throw new AppError('Proposal generation failed.', 500);
  }
}

/**
 * Send a Marketplace Project Opportunity directly to the Review Queue as a candidate lead.
 */
export async function sendMarketplaceProjectToReviewQueue(project: {
  title: string;
  clientName: string;
  postUrl?: string;
  budget?: string;
  techStack?: string[];
  description?: string;
}) {
  try {
    await AuthService.verifySession();

    const titleStr = project.title || 'Marketplace Opportunity';
    const clientStr = project.clientName || 'Marketplace Client';
    const descStr = project.description || `Enterprise project opportunity for ${clientStr}.`;
    const postUrl = project.postUrl || `https://marketplace.opportunity/${Date.now()}`;
    const previewText = `[MARKETPLACE PROJECT] ${titleStr} (Budget: ${project.budget || 'N/A'}). Client: ${clientStr}. Description: ${descStr.slice(0, 200)}...`;

    // Check duplicate URL
    const existing = await db.linkedInPost.findUnique({
      where: { postUrl },
    });

    if (existing) {
      return { post: existing, created: false };
    }

    const post = await db.linkedInPost.create({
      data: {
        postUrl,
        authorName: clientStr,
        authorHeadline: `Marketplace Client (${project.budget || 'Project Deal'})`,
        companyName: clientStr,
        postPreview: previewText,
        postContent: descStr,
        matchedKeyword: project.techStack?.[0] || 'Marketplace Project',
        keywordCategory: 'marketplace',
        opportunityScore: 92,
        status: PostStatus.REVIEW_QUEUE,
      },
    });

    logger.info(`Marketplace Project "${titleStr}" sent to Review Queue (ID: ${post.id}).`);
    safeRevalidatePath('/review');
    safeRevalidatePath('/marketplace');

    return { post, created: true };
  } catch (err: unknown) {
    logger.error(`Failed to send marketplace project to Review Queue`, err);
    throw new AppError('Failed to send project to Review Queue.', 500);
  }
}
