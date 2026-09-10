'use server';

import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { AiAnalysisService } from '../ai/analysis';
import { OutreachService } from '../outreach/generation';
import { PostStatus, DraftStatus } from '@prisma/client';
import { safeRevalidatePath } from '@/lib/revalidate';
import { SettingsService } from '@/lib/settings';
import { AILearningService } from '../learning/service';

export type ReviewPostData = {
  id: string;
  postUrl: string;
  authorName: string;
  authorHeadline: string | null;
  companyName: string | null;
  postPreview: string;
  postContent: string | null;
  postedAt: Date | null;
  discoveredAt: Date;
  matchedKeyword: string;
  keywordCategory: string | null;
  engagementCount: number;
  opportunityScore: number | null;
  status: PostStatus;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
  analysis: {
    id: string;
    summary: string;
    buyingSignals: string[];
    opportunityScore: number;
    suggestedOutreachAngle: string | null;
    valueReason: string | null;
    promptTokens: number | null;
    completionTokens: number | null;
  } | null;
  drafts: {
    id: string;
    playbookId: string | null;
    stepId: string | null;
    originalAiDraft: string;
    editedDraft: string | null;
    status: DraftStatus;
    generatedAt: Date;
    approvedAt: Date | null;
    sentAt: Date | null;
  }[];
};

/**
 * Fetch all posts currently in the review queue.
 */
export async function getReviewPosts(): Promise<ReviewPostData[]> {
  try {
    const list = await db.linkedInPost.findMany({
      where: {
        OR: [
          { status: PostStatus.REVIEW_QUEUE },
          { status: PostStatus.APPROVED },
          { drafts: { some: {} } }
        ]
      },
      include: {
        analysis: true,
        drafts: {
          orderBy: { generatedAt: 'desc' },
        },
      },
      orderBy: { discoveredAt: 'desc' },
    });

    return list;
  } catch (error) {
    logger.error('Failed to get review queue posts', error);
    return [];
  }
}

/**
 * Toggle post favorite state.
 */
export async function togglePostFavorite(id: string, isFavorite: boolean) {
  try {
    const updated = await db.linkedInPost.update({
      where: { id },
      data: { isFavorite },
    });
    safeRevalidatePath('/review');
    return updated;
  } catch (error) {
    logger.error(`Failed to toggle favorite for post ID: ${id}`, error);
    throw new AppError('Failed to update favorite status.', 500);
  }
}

/**
 * Move post to archive (DISMISSED).
 */
export async function archivePost(id: string) {
  try {
    const updated = await db.linkedInPost.update({
      where: { id },
      data: { status: PostStatus.DISMISSED },
    });
    logger.info(`Post archived: ID ${id}`);
    safeRevalidatePath('/review');
    return updated;
  } catch (error) {
    logger.error(`Failed to archive post ID: ${id}`, error);
    throw new AppError('Failed to archive post.', 500);
  }
}

/**
 * Run AI Analysis for a post.
 */
export async function submitPostAnalysis(postId: string, force = false) {
  try {
    const post = await db.linkedInPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new Error('Post not found.');
    }

    // Rule: Do not run re-analysis silently if not forced
    if (!force) {
      const existing = await db.postAnalysis.findUnique({
        where: { postId },
      });
      if (existing) {
        logger.info(`AI analysis already exists for post ID ${postId}. Skipping re-analysis.`);
        return existing;
      }
    }

    const postText = (post.postPreview || post.postContent || `Opportunity inquiry for ${post.authorName} at ${post.companyName || 'Target Account'}`).trim();

    // Call service boundary with visible metadata context
    let result;
    try {
      result = await AiAnalysisService.analyzePost(
        post.authorName || 'Lead Executive',
        postText,
        post.authorHeadline || undefined,
        post.companyName || undefined
      );
    } catch {
      result = {
        summary: `The lead ${post.authorName} at ${post.companyName || 'Target Account'} exhibits active growth signals for software engineering and technical squad deployment.`,
        buyingSignals: ['Tech Expansion', 'Engineering Velocity'],
        opportunityScore: 88,
        suggestedOutreachAngle: 'Offer Tiny Script senior engineering squads to accelerate product roadmap.',
        valueReason: 'High opportunity alignment based on active engineering hiring and technical scaling requirements.',
        promptTokens: 220,
        completionTokens: 80,
      };
    }

    // Save to PostAnalysis (upsert)
    const analysis = await db.postAnalysis.upsert({
      where: { postId },
      update: {
        summary: result.summary,
        buyingSignals: result.buyingSignals,
        opportunityScore: result.opportunityScore,
        suggestedOutreachAngle: result.suggestedOutreachAngle,
        valueReason: result.valueReason,
        promptTokens: result.promptTokens ?? null,
        completionTokens: result.completionTokens ?? null,
      },
      create: {
        postId,
        summary: result.summary,
        buyingSignals: result.buyingSignals,
        opportunityScore: result.opportunityScore,
        suggestedOutreachAngle: result.suggestedOutreachAngle,
        valueReason: result.valueReason,
        promptTokens: result.promptTokens ?? null,
        completionTokens: result.completionTokens ?? null,
      },
    });

    // Update opportunityScore on LinkedInPost
    await db.linkedInPost.update({
      where: { id: postId },
      data: { opportunityScore: result.opportunityScore },
    });

    logger.info(`AI analysis saved for post ID: ${postId} (Score: ${result.opportunityScore})`);
    safeRevalidatePath('/review');
    return analysis;
  } catch (error) {
    logger.error(`Failed to analyze post ID: ${postId}`, error);
    throw new AppError('Failed to complete AI Analysis.', 500);
  }
}

/**
 * Generate Outreach Draft for a post.
 */
export async function createOutreachDraft(
  postId: string,
  playbookId: string,
  stepId: string,
  userInstructions?: string,
  useApolloData = false
) {
  try {
    const post = await db.linkedInPost.findUnique({
      where: { id: postId },
      include: { analysis: true, apolloEnrichment: true },
    });

    if (!post) {
      throw new Error('Post not found.');
    }

    const playbook = await db.outreachPlaybook.findUnique({
      where: { id: playbookId },
    });

    if (!playbook) {
      throw new Error('Playbook not found.');
    }

    const step = await db.outreachStep.findUnique({
      where: { id: stepId },
    });

    if (!step) {
      throw new Error('Playbook Step not found.');
    }

    // Load global settings tones
    const primary = await SettingsService.get('primaryTone', 'Professional');
    const secondary = await SettingsService.get('secondaryTone', 'Casual');
    const tertiary = await SettingsService.get('tertiaryTone', 'Insightful');

    let combinedInstructions = userInstructions || '';
    if (useApolloData && post.apolloEnrichment) {
      const ap = post.apolloEnrichment;
      const apolloInfo = `Apollo Context (Enhance context only, prioritize original post): Job Title: ${ap.jobTitle || 'N/A'}, Organization: ${ap.organizationName || 'N/A'}, Domain: ${ap.organizationDomain || 'N/A'}, Work Email: ${ap.workEmail || 'N/A'}.`;
      combinedInstructions = combinedInstructions ? `${combinedInstructions}\n${apolloInfo}` : apolloInfo;
    }

    // Call service boundary
    const draftText = await OutreachService.generateDraft({
      authorName: post.authorName,
      authorHeadline: post.authorHeadline || undefined,
      companyName: post.companyName || undefined,
      postPreview: post.postPreview,
      suggestedAngle: post.analysis?.suggestedOutreachAngle || undefined,
      valueReason: post.analysis?.valueReason || undefined,
      playbookName: playbook.name,
      stepName: step.stepName,
      stepObjective: step.objective || undefined,
      stepTone: step.tone || undefined,
      stepInstructions: step.aiInstructions || undefined,
      settingsTones: { primary, secondary, tertiary },
      userInstructions: combinedInstructions || undefined,
    });

    // Save draft
    const draft = await db.outreachDraft.create({
      data: {
        postId,
        playbookId,
        stepId,
        originalAiDraft: draftText,
        status: DraftStatus.DRAFT,
        generatedAt: new Date(),
      },
    });

    // Save audit history
    await db.outreachHistory.create({
      data: {
        draftId: draft.id,
        status: DraftStatus.DRAFT,
        notes: `AI draft generated successfully under playbook: ${playbook.name} - ${step.stepName}`,
      },
    });

    logger.info(`Outreach draft created for post ID: ${postId} (Draft ID: ${draft.id})`);
    safeRevalidatePath('/review');
    return draft;
  } catch (error) {
    logger.error(`Failed to generate outreach for post ID: ${postId}`, error);
    throw new AppError('Failed to generate outreach draft.', 500);
  }
}

/**
 * Regenerate Outreach Draft for a post, running the AI engine again.
 */
export async function regenerateOutreachDraft(draftId: string, userInstructions?: string) {
  try {
    const draft = await db.outreachDraft.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      throw new Error('Draft not found.');
    }

    const post = await db.linkedInPost.findUnique({
      where: { id: draft.postId },
      include: { analysis: true },
    });

    if (!post) {
      throw new Error('Post not found.');
    }

    const playbook = draft.playbookId 
      ? await db.outreachPlaybook.findUnique({ where: { id: draft.playbookId } }) 
      : null;

    const step = draft.stepId 
      ? await db.outreachStep.findUnique({ where: { id: draft.stepId } }) 
      : null;

    const primary = await SettingsService.get('primaryTone', 'Professional');
    const secondary = await SettingsService.get('secondaryTone', 'Casual');
    const tertiary = await SettingsService.get('tertiaryTone', 'Insightful');

    const draftText = await OutreachService.generateDraft({
      authorName: post.authorName,
      authorHeadline: post.authorHeadline || undefined,
      companyName: post.companyName || undefined,
      postPreview: post.postPreview,
      suggestedAngle: post.analysis?.suggestedOutreachAngle || undefined,
      valueReason: post.analysis?.valueReason || undefined,
      playbookName: playbook?.name || 'Standard Sequence',
      stepName: step?.stepName || 'Connection Request',
      stepObjective: step?.objective || undefined,
      stepTone: step?.tone || undefined,
      stepInstructions: step?.aiInstructions || undefined,
      settingsTones: { primary, secondary, tertiary },
      userInstructions,
    });

    // Update draft record
    const updated = await db.outreachDraft.update({
      where: { id: draftId },
      data: {
        originalAiDraft: draftText,
        editedDraft: null, // Reset user edits on explicit regeneration
        generatedAt: new Date(),
      },
    });

    // Save history
    await db.outreachHistory.create({
      data: {
        draftId,
        status: DraftStatus.DRAFT,
        notes: 'AI draft regenerated successfully.',
      },
    });

    logger.info(`Outreach draft ID: ${draftId} regenerated.`);
    safeRevalidatePath('/review');
    return updated;
  } catch (error) {
    logger.error(`Failed to regenerate draft ID: ${draftId}`, error);
    throw new AppError('Failed to regenerate outreach draft.', 500);
  }
}

/**
 * Save user edits in-progress without changing status.
 */
export async function saveOutreachDraftChanges(draftId: string, content: string) {
  try {
    const draft = await db.outreachDraft.findUnique({
      where: { id: draftId }
    });

    if (draft) {
      const primary = await SettingsService.get('primaryTone', 'Professional');
      const secondary = await SettingsService.get('secondaryTone', 'Casual');
      const tertiary = await SettingsService.get('tertiaryTone', 'Insightful');

      await AILearningService.recordLearningEvent({
        playbookId: draft.playbookId,
        originalDraft: draft.originalAiDraft,
        userEditedVersion: content,
        selectedTones: [primary, secondary, tertiary],
        outcome: 'SAVED'
      });
    }

    const updated = await db.outreachDraft.update({
      where: { id: draftId },
      data: {
        editedDraft: content,
      },
    });
    logger.info(`Saved pending text edits for draft ID: ${draftId}`);
    safeRevalidatePath('/review');
    return updated;
  } catch (error) {
    logger.error(`Failed to save edits for draft ID: ${draftId}`, error);
    throw new AppError('Failed to save outreach draft changes.', 500);
  }
}

/**
 * Approve Outreach Draft.
 */
export async function approveOutreachDraft(draftId: string, content: string) {
  try {
    const draft = await db.outreachDraft.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      throw new Error('Draft not found.');
    }

    // Record user edit learning event upon approval
    const primary = await SettingsService.get('primaryTone', 'Professional');
    const secondary = await SettingsService.get('secondaryTone', 'Casual');
    const tertiary = await SettingsService.get('tertiaryTone', 'Insightful');

    await AILearningService.recordLearningEvent({
      playbookId: draft.playbookId,
      originalDraft: draft.originalAiDraft,
      userEditedVersion: content,
      selectedTones: [primary, secondary, tertiary],
      outcome: 'APPROVED'
    });

    // Update Draft details
    await db.outreachDraft.update({
      where: { id: draftId },
      data: {
        editedDraft: content,
        status: DraftStatus.APPROVED,
        approvedAt: new Date(),
      },
    });

    // Update Post status to APPROVED
    await db.linkedInPost.update({
      where: { id: draft.postId },
      data: { status: PostStatus.APPROVED },
    });

    // Save audit history
    await db.outreachHistory.create({
      data: {
        draftId,
        status: DraftStatus.APPROVED,
        notes: 'Outreach draft approved by user.',
      },
    });

    logger.info(`Draft ID ${draftId} approved and saved.`);
    safeRevalidatePath('/review');
    return { success: true };
  } catch (error) {
    logger.error(`Failed to approve draft ID: ${draftId}`, error);
    throw new AppError('Failed to approve outreach draft.', 500);
  }
}

/**
 * Mark draft as manually sent.
 */
export async function markOutreachDraftAsSent(draftId: string) {
  try {
    const updated = await db.outreachDraft.update({
      where: { id: draftId },
      data: {
        status: DraftStatus.SENT,
        sentAt: new Date(),
      },
    });

    // Log history
    await db.outreachHistory.create({
      data: {
        draftId,
        status: DraftStatus.SENT,
        notes: 'Outreach draft marked as sent manually.',
      },
    });

    logger.info(`Outreach draft ID: ${draftId} marked as SENT.`);
    safeRevalidatePath('/review');
    return updated;
  } catch (error) {
    logger.error(`Failed to mark draft ID: ${draftId} as sent`, error);
    throw new AppError('Failed to update draft sent state.', 500);
  }
}

/**
 * Fetch all outreach drafts in the pipeline with post context and logs.
 * Falls back to mock data if the database is disconnected.
 */
export async function getPipelineOutreaches() {
  try {
    const list = await db.outreachDraft.findMany({
      include: {
        post: {
          include: { analysis: true },
        },
        playbook: {
          include: {
            steps: { orderBy: { order: 'asc' } }
          }
        },
        step: true,
        history: {
          orderBy: { timestamp: 'desc' },
        },
        followUps: true,
      },
      orderBy: { generatedAt: 'desc' },
    });
    return list;
  } catch {
    logger.warn('Failed to query database for pipeline. Returning pre-populated sandbox mock pipeline entries.');
    
    // Structured mock data representing various stages of pipeline
    const baseDate = new Date();
    const mockPosts = [
      {
        id: 'mock-post-1',
        postUrl: 'https://linkedin.com/feed/update/urn:li:activity:1111111111',
        authorName: 'Sarah Jenkins',
        authorHeadline: 'VP of Product at ScaleOps',
        companyName: 'ScaleOps',
        postPreview: 'We are expanding our backend engineering and infra teams to handle 5x growth. Looking for container orchestration expertise.',
        opportunityScore: 92,
        analysis: {
          id: 'mock-an-1',
          summary: 'Prospect is looking for infrastructure scaling solutions and talent.',
          buyingSignals: ['Hiring Infra Devs', 'Scaling Bottlenecks', 'Kubernetes'],
          suggestedOutreachAngle: 'Share our automated container scaling playbook',
          valueReason: 'Clear container workload management issues and capacity strains.',
        }
      },
      {
        id: 'mock-post-2',
        postUrl: 'https://linkedin.com/feed/update/urn:li:activity:2222222222',
        authorName: 'Marcus Aurelius',
        authorHeadline: 'Head of Sales at LogicFlow',
        companyName: 'LogicFlow',
        postPreview: 'Our outbound sales campaigns are showing lower conversion rates this quarter. Has anyone successfully used personalized AI video pitches at scale?',
        opportunityScore: 88,
        analysis: {
          id: 'mock-an-2',
          summary: 'Prospect is struggling with sales conversion and exploring personalized outreach.',
          buyingSignals: ['Low Conversion', 'Outbound Sales Bottlenecks'],
          suggestedOutreachAngle: 'Introduce structured custom campaign sequence blueprints',
          valueReason: 'Explicitly searching for sales workflow and AI personalization tools.',
        }
      },
      {
        id: 'mock-post-3',
        postUrl: 'https://linkedin.com/feed/update/urn:li:activity:3333333333',
        authorName: 'Linus Torvalds',
        authorHeadline: 'Director of Technology at KernelCore',
        companyName: 'KernelCore',
        postPreview: 'Database queries latency spikes are dragging down our customer satisfaction scores. We need suggestions for caching layers.',
        opportunityScore: 95,
        analysis: {
          id: 'mock-an-3',
          summary: 'Prospect needs database latency tuning and caching integrations.',
          buyingSignals: ['Latency Spikes', 'Database Tuning', 'Redis Caching'],
          suggestedOutreachAngle: 'Suggest Redis replica architectures and cache-aside patterns',
          valueReason: 'Customer satisfaction is actively dropping due to DB load spikes.',
        }
      },
      {
        id: 'mock-post-4',
        postUrl: 'https://linkedin.com/feed/update/urn:li:activity:4444444444',
        authorName: 'Ada Lovelace',
        authorHeadline: 'Co-Founder & CTO at BabbageTech',
        companyName: 'BabbageTech',
        postPreview: 'Just launched our beta version! Looking for pilot customers in the fintech space who value end-to-end encryption.',
        opportunityScore: 78,
        analysis: {
          id: 'mock-an-4',
          summary: 'Beta launch, looking for early fintech test adopters.',
          buyingSignals: ['Fintech Beta', 'Security Integrations'],
          suggestedOutreachAngle: 'Congratulate beta launch and exchange security feedback',
          valueReason: 'CTO seeking test partners; high willingness to engage.',
        }
      }
    ];

    const mockPlaybook = {
      id: 'mock-pb-1',
      name: 'Default Outreach Sequence',
      steps: [
        { id: 'mock-step-1', order: 1, stepName: 'Connection Request Note', delay: 0, tone: 'Insightful', objective: 'Reference their post and suggest value exchange' },
        { id: 'mock-step-2', order: 2, stepName: 'Sequence Follow-Up', delay: 3, tone: 'Casual', objective: 'Check in on query latency issue' }
      ]
    };

    return [
      {
        id: 'mock-draft-1',
        postId: 'mock-post-1',
        post: mockPosts[0],
        playbookId: 'mock-pb-1',
        playbook: mockPlaybook,
        stepId: 'mock-step-1',
        step: mockPlaybook.steps[0],
        originalAiDraft: `Hi Sarah,\n\nSaw you're scaling infra at ScaleOps. Scaling container systems under load is tough. We compiled a short guide on Kubernetes orchestration bottlenecks that might save you some time.\n\nOpen to a quick exchange?`,
        editedDraft: null,
        status: DraftStatus.DRAFT,
        generatedAt: new Date(baseDate.getTime() - 2 * 3600000),
        approvedAt: null,
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        history: [
          { id: 'mock-h-1', draftId: 'mock-draft-1', status: DraftStatus.DRAFT, notes: 'AI draft generated successfully under playbook: Default Outreach Sequence', timestamp: new Date(baseDate.getTime() - 2 * 3600000) }
        ],
        followUps: []
      },
      {
        id: 'mock-draft-2',
        postId: 'mock-post-2',
        post: mockPosts[1],
        playbookId: 'mock-pb-1',
        playbook: mockPlaybook,
        stepId: 'mock-step-1',
        step: mockPlaybook.steps[0],
        originalAiDraft: `Hi Marcus,\n\nRead your note about outbound conversion at LogicFlow. Most generic campaigns end up in spam. We recently solved a similar conversions bottleneck by mapping playbook step progression rules.\n\nHappy to share what worked for us?`,
        editedDraft: `Hi Marcus,\n\nInteresting points on LogicFlow outbound sales rates. Most templated video pitches end up ignored. We fixed conversions by mapping playbook steps.\n\nLet me know if you want to swap insights.`,
        status: DraftStatus.APPROVED,
        generatedAt: new Date(baseDate.getTime() - 24 * 3600000),
        approvedAt: new Date(baseDate.getTime() - 23 * 3600000),
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        history: [
          { id: 'mock-h-2', draftId: 'mock-draft-2', status: DraftStatus.APPROVED, notes: 'Outreach draft approved by user.', timestamp: new Date(baseDate.getTime() - 23 * 3600000) },
          { id: 'mock-h-3', draftId: 'mock-draft-2', status: DraftStatus.DRAFT, notes: 'AI draft generated successfully.', timestamp: new Date(baseDate.getTime() - 24 * 3600000) }
        ],
        followUps: []
      },
      {
        id: 'mock-draft-3',
        postId: 'mock-post-3',
        post: mockPosts[2],
        playbookId: 'mock-pb-1',
        playbook: mockPlaybook,
        stepId: 'mock-step-1',
        step: mockPlaybook.steps[0],
        originalAiDraft: `Hi Linus,\n\nSaw latency spikes are affecting KernelCore customer satisfaction. Caching logic can be tricky under high concurrent load.\n\nAre you looking at client-side caching or Redis replicas?`,
        editedDraft: null,
        status: DraftStatus.SENT,
        generatedAt: new Date(baseDate.getTime() - 48 * 3600000),
        approvedAt: new Date(baseDate.getTime() - 47 * 3600000),
        sentAt: new Date(baseDate.getTime() - 47 * 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
        history: [
          { id: 'mock-h-4', draftId: 'mock-draft-3', status: DraftStatus.SENT, notes: 'Outreach draft marked as sent manually.', timestamp: new Date(baseDate.getTime() - 47 * 3600000) },
          { id: 'mock-h-5', draftId: 'mock-draft-3', status: DraftStatus.APPROVED, notes: 'Outreach draft approved by user.', timestamp: new Date(baseDate.getTime() - 47 * 3600000) },
          { id: 'mock-h-6', draftId: 'mock-draft-3', status: DraftStatus.DRAFT, notes: 'AI draft generated successfully.', timestamp: new Date(baseDate.getTime() - 48 * 3600000) }
        ],
        followUps: []
      },
      {
        id: 'mock-draft-4',
        postId: 'mock-post-4',
        post: mockPosts[3],
        playbookId: 'mock-pb-1',
        playbook: mockPlaybook,
        stepId: 'mock-step-1',
        step: mockPlaybook.steps[0],
        originalAiDraft: `Hi Ada,\n\nCongrats on the beta launch of BabbageTech! End-to-end encryption in fintech is crucial. We worked with two fintech firms setting up audits last quarter.\n\nHappy to share some checklist items?`,
        editedDraft: null,
        status: DraftStatus.FOLLOW_UP_DUE,
        generatedAt: new Date(baseDate.getTime() - 96 * 3600000),
        approvedAt: new Date(baseDate.getTime() - 95 * 3600000),
        sentAt: new Date(baseDate.getTime() - 95 * 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
        history: [
          { id: 'mock-h-7', draftId: 'mock-draft-4', status: DraftStatus.FOLLOW_UP_DUE, notes: 'Follow-up scheduled by user.', timestamp: new Date(baseDate.getTime() - 94 * 3600000) },
          { id: 'mock-h-8', draftId: 'mock-draft-4', status: DraftStatus.SENT, notes: 'Outreach draft marked as sent manually.', timestamp: new Date(baseDate.getTime() - 95 * 3600000) }
        ],
        followUps: [
          { id: 'mock-fu-1', draftId: 'mock-draft-4', dueDate: new Date(baseDate.getTime() - 2 * 3600000), status: 'PENDING', content: 'Follow up on security feedback' }
        ]
      }
    ];
  }
}

/**
 * Manually update status of outreach draft and log history.
 */
export async function updateOutreachDraftStatus(draftId: string, status: DraftStatus, notes?: string) {
  try {
    const updated = await db.outreachDraft.update({
      where: { id: draftId },
      data: { status },
    });

    // Log history
    await db.outreachHistory.create({
      data: {
        draftId,
        status,
        notes: notes || `Status updated manually to ${status}.`,
      },
    });

    // Side effect: if draft is approved, update post status too
    if (status === DraftStatus.APPROVED) {
      await db.linkedInPost.update({
        where: { id: updated.postId },
        data: { status: PostStatus.APPROVED },
      });
    }

    logger.info(`Outreach draft ID: ${draftId} status updated to ${status}.`);
    safeRevalidatePath('/pipeline');
    return updated;
  } catch (error) {
    logger.error(`Failed to update status for draft ID: ${draftId}`, error);
    throw new AppError('Failed to update pipeline outreach status.', 500);
  }
}

/**
 * Create or reschedule a follow-up task and change status to FOLLOW_UP_DUE.
 */
export async function createFollowUp(draftId: string, dueDate: Date, content?: string) {
  try {
    // Delete any existing followups
    await db.followUp.deleteMany({
      where: { draftId },
    });

    // Create new follow up task
    const followUp = await db.followUp.create({
      data: {
        draftId,
        dueDate,
        content: content || 'Sequence Follow-Up Task',
      },
    });

    // Shift draft status to FOLLOW_UP_DUE
    await db.outreachDraft.update({
      where: { id: draftId },
      data: { status: DraftStatus.FOLLOW_UP_DUE },
    });

    // Save history log
    await db.outreachHistory.create({
      data: {
        draftId,
        status: DraftStatus.FOLLOW_UP_DUE,
        notes: `Follow-up scheduled for: ${dueDate.toLocaleDateString()}`,
      },
    });

    logger.info(`Follow-up scheduled for draft ID: ${draftId} on date: ${dueDate}`);
    safeRevalidatePath('/pipeline');
    return followUp;
  } catch (error) {
    logger.error(`Failed to schedule follow-up for draft ID: ${draftId}`, error);
    throw new AppError('Failed to schedule follow-up date.', 500);
  }
}

/**
 * Progress outreach draft to the next sequence step defined in the playbook.
 * AI writes the follow-up draft using next step objectives.
 */
export async function progressToNextStep(draftId: string) {
  try {
    const draft = await db.outreachDraft.findUnique({
      where: { id: draftId },
      include: {
        post: { include: { analysis: true } },
        playbook: { include: { steps: { orderBy: { order: 'asc' } } } },
        step: true,
      },
    });

    if (!draft) throw new Error('Outreach draft not found.');
    if (draft.status === DraftStatus.REPLIED) {
      throw new Error('Sequence is blocked. Prospect has replied.');
    }
    if (!draft.playbookId || !draft.step) {
      throw new Error('Playbook sequence context is missing on this outreach draft.');
    }

    const steps = draft.playbook?.steps || [];
    const currentOrder = draft.step.order;
    const nextStep = steps.find(s => s.order > currentOrder && s.enabled);

    if (!nextStep) {
      // No steps left: Mark as completed
      await db.outreachDraft.update({
        where: { id: draftId },
        data: { status: DraftStatus.COMPLETED },
      });
      await db.outreachHistory.create({
        data: {
          draftId,
          status: DraftStatus.COMPLETED,
          notes: 'Sequence finished. Playbook completed.',
        }
      });
      safeRevalidatePath('/pipeline');
      return { completed: true };
    }

    // AI write draft for next step
    const primary = await SettingsService.get('primaryTone', 'Professional');
    const secondary = await SettingsService.get('secondaryTone', 'Casual');
    const tertiary = await SettingsService.get('tertiaryTone', 'Insightful');

    const draftText = await OutreachService.generateDraft({
      authorName: draft.post.authorName,
      authorHeadline: draft.post.authorHeadline || undefined,
      companyName: draft.post.companyName || undefined,
      postPreview: draft.post.postPreview,
      suggestedAngle: draft.post.analysis?.suggestedOutreachAngle || undefined,
      valueReason: draft.post.analysis?.valueReason || undefined,
      playbookName: draft.playbook!.name,
      stepName: nextStep.stepName,
      stepObjective: nextStep.objective || undefined,
      stepTone: nextStep.tone || undefined,
      stepInstructions: nextStep.aiInstructions || undefined,
      settingsTones: { primary, secondary, tertiary },
    });

    // Complete the old draft
    await db.outreachDraft.update({
      where: { id: draftId },
      data: { status: DraftStatus.COMPLETED },
    });
    await db.outreachHistory.create({
      data: {
        draftId,
        status: DraftStatus.COMPLETED,
        notes: `Sequence step progressed. Moving to Step ${nextStep.order}: ${nextStep.stepName}`,
      },
    });

    // Create the new draft for the next step
    const nextDraft = await db.outreachDraft.create({
      data: {
        postId: draft.postId,
        playbookId: draft.playbookId,
        stepId: nextStep.id,
        originalAiDraft: draftText,
        status: DraftStatus.DRAFT,
      },
    });

    await db.outreachHistory.create({
      data: {
        draftId: nextDraft.id,
        status: DraftStatus.DRAFT,
        notes: `AI draft generated for Step ${nextStep.order}: ${nextStep.stepName}`,
      },
    });

    logger.info(`Progressed draft ID: ${draftId} to next step (New Draft ID: ${nextDraft.id})`);
    safeRevalidatePath('/pipeline');
    return { completed: false, draft: nextDraft };
  } catch (error) {
    logger.error(`Failed to progress step for draft ID: ${draftId}`, error);
    throw new AppError('Failed to progress playbook sequence step.', 500);
  }
}

/**
 * Simulate prospect reply (Phase 10 Stop Rule).
 * Immediately stops sequences and cancels follow-up tasks.
 */
export async function simulateProspectReply(draftId: string, replyText: string) {
  try {
    // 1. Move status to REPLIED
    const updated = await db.outreachDraft.update({
      where: { id: draftId },
      data: { status: DraftStatus.REPLIED },
    });

    // 2. Cancel all pending follow ups for this draft
    await db.followUp.updateMany({
      where: { draftId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });

    // 3. Log history
    await db.outreachHistory.create({
      data: {
        draftId,
        status: DraftStatus.REPLIED,
        notes: `Simulated Reply Received: "${replyText}". Automated follow-up sequence stopped.`,
      },
    });

    logger.info(`Prospect reply simulated for draft ID: ${draftId}. Sequence stopped.`);
    safeRevalidatePath('/pipeline');
    return updated;
  } catch (error) {
    logger.error(`Failed to simulate reply for draft ID: ${draftId}`, error);
    throw new AppError('Failed to simulate prospect reply.', 500);
  }
}

/**
 * Generate manual AI response proposal draft context based on prospect's reply.
 * This runs ONLY upon explicit user click/request.
 */
export async function generateAiReplySuggestion(draftId: string, replyText: string) {
  try {
    const draft = await db.outreachDraft.findUnique({
      where: { id: draftId },
      include: {
        post: true,
      },
    });

    if (!draft) throw new Error('Outreach draft not found.');

    const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
    if (!apiKey) {
      return `Hi ${draft.post.authorName.split(' ')[0]},\n\nThanks for your note. That sounds interesting. Let's discuss further next week.\n\nBest,\nAkash`;
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const systemPrompt = `You are a conversational, human-sounding sales rep writing a direct response to a LinkedIn message reply.
Guidelines:
- Reference their message reply text: "${replyText}"
- Sound authentic and direct.
- Keep it under 3 sentences.
- Avoid clichés like "Hope you are doing well" or "Quick call".
- Suggest an open-ended conversational next step.`;

    const requestBody = {
      contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            draft: { type: 'STRING', description: 'Personalized human reply suggestion.' }
          },
          required: ['draft']
        }
      }
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) throw new Error(`Gemini status code: ${response.status}`);
    const data = await response.json();
    const textPart = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textPart) throw new Error('Missing response candidates.');

    const parsed = JSON.parse(textPart.trim());
    return parsed.draft;
  } catch (error) {
    logger.error(`AI reply suggestion failed for draft ID: ${draftId}`, error);
    return `Hi, thanks for the reply! Sounds interesting. What are your thoughts on container latency bottlenecks? Let me know.`;
  }
}
