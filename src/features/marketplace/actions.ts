'use server';

import { AuthService } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { PostStatus } from '@prisma/client';
import { safeRevalidatePath } from '@/lib/revalidate';
import { scoreListing } from './store';
import { getSenderIdentity } from '@/lib/sender';

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
 * Run AI Opportunity Analysis on a Marketplace Project, derived from its real
 * budget, technology stack and urgency rather than a fixed template.
 */
export async function analyzeProjectOpportunity(
  projectId: string,
  title: string,
  context?: { budget?: string; technologyStack?: string[]; urgency?: string; estimatedValueNumber?: number }
): Promise<ProjectAiAnalysis> {
  try {
    await AuthService.verifySession();
    logger.info(`Analyzing Project Opportunity ID: ${projectId} ("${title}")...`);

    const value = context?.estimatedValueNumber || 0;
    const techStack = context?.technologyStack || [];
    const isUrgent = context?.urgency === 'Immediate';

    const opportunityScore = scoreListing(value, techStack, context?.urgency);
    const qualification: ProjectAiAnalysis['qualification'] = opportunityScore >= 90 ? 'Perfect Match' : opportunityScore >= 75 ? 'Good Match' : opportunityScore >= 60 ? 'Stretch Project' : 'Not Recommended';
    const complexity: ProjectAiAnalysis['complexity'] = value >= 35000 ? 'Enterprise' : value >= 20000 ? 'High' : value >= 10000 ? 'Medium' : 'Low';

    return {
      opportunityScore,
      qualification,
      revenuePotential: context?.budget || 'Not specified',
      // Not measured against the service catalog, so no number is invented.
      technologyMatchScore: 0,
      estimatedTimeline: complexity === 'Enterprise' ? '8 to 12 Weeks' : complexity === 'High' ? '6 to 8 Weeks' : complexity === 'Medium' ? '4 to 6 Weeks' : '2 to 4 Weeks',
      complexity,
      requiredTeam: complexity === 'Enterprise' ? '1 Tech Lead, 2 Senior Full-Stack Engineers, 1 QA Engineer' : complexity === 'High' ? '1 Tech Lead, 1 Senior Engineer' : '1 Full-Stack Engineer',
      confidenceScore: 0,
      winningStrategy: techStack.length > 0
        ? `Position Tiny Script's ${techStack.slice(0, 2).join(' & ')} expertise directly against the stated requirements.`
        : 'Request a technical scoping call to clarify requirements before proposing.',
      winningAngle: isUrgent ? 'Emphasize immediate squad availability and fast onboarding.' : 'Emphasize proven delivery track record and transparent sprint cycles.',
      riskFactors: isUrgent ? ['Tight delivery timeline stated by client'] : [],
      recommendedPortfolio: [],
      suggestedCaseStudies: [],
      similarProjectsCount: 0,
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
    const sender = await getSenderIdentity();

    const techString = params.techStack.join(', ') || 'the stack you need';
    
    let proposalText = '';

    if (params.type === 'short' || params.type === 'discovery') {
      proposalText = `Hi ${params.clientName} Team,\n\n` +
        `I read your requirements for "${params.projectTitle}". Our senior engineers work with ${techString}.\n\n` +
        `I'd like to ask a few questions about scope and timing, then send you a concrete plan and estimate.\n\n` +
        `Would a 15-minute call this week work for you?\n\n` +
        `Best regards,\n` +
        `${sender.name} — ${sender.company}`;
    } else if (params.type === 'technical') {
      proposalText = `Technical Proposal: ${params.projectTitle}\n` +
        `Prepared by: Tiny Script Soft Tech\n\n` +
        // Only the stack the listing asks for; timeline and team are left for the BDE to fill in after scoping.
        `1. TECHNOLOGY:\n` +
        `- ${techString}\n\n` +
        `2. APPROACH:\n` +
        `- Phase 1: Discovery and technical design [duration to confirm]\n` +
        `- Phase 2: Build in short sprints with a demo after each [duration to confirm]\n` +
        `- Phase 3: Testing, launch and handover [duration to confirm]\n\n` +
        `3. TEAM: [roles and seniority to confirm]\n\n` +
        `We can confirm the start date once scope is agreed.`;
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
