'use server';

import { AuthService } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { DraftStatus, FollowUpStatus, PostStatus } from '@prisma/client';
import { getCompany360Profile } from '@/features/company360/actions';
import { generateOutreachMessage } from './generator';
import { generateAiSequence } from './sequenceAi';
import { OutreachMessageDraft, OutreachChannel, OutreachCategory, ToneSetting, EngagementTelemetry, FollowupStage } from './types';
import { safeRevalidatePath } from '@/lib/revalidate';

const draftStore: Map<string, OutreachMessageDraft> = new Map();
const SEQUENCE_CHANNELS: OutreachChannel[] = ['EMAIL', 'LINKEDIN'];

/**
 * Generate a new personalized AI Outreach draft for a company.
 */
export async function generateOutreachDraftAction(
  companyIdOrDomain: string,
  channel: OutreachChannel = 'EMAIL',
  category: OutreachCategory = 'COLD_OUTREACH',
  tone: ToneSetting = 'EXECUTIVE',
  persist: boolean = true,
  withAiSequence: boolean = true,
  researchNotes?: string
): Promise<OutreachMessageDraft> {
  try {
    await AuthService.verifySession();
    logger.info(`Generating AI Outreach draft for '${companyIdOrDomain}' (${channel})...`);

    const target = companyIdOrDomain && companyIdOrDomain.trim() ? companyIdOrDomain.trim() : 'enterprise.com';
    const profile = await getCompany360Profile(target);
    const draft = generateOutreachMessage(profile, channel, category, tone);

    // Email & LinkedIn DM use the AI 4-stage sequence; the editor shows the active stage.
    if (withAiSequence && SEQUENCE_CHANNELS.includes(channel)) {
      const { steps, language, source } = await generateAiSequence(profile, channel, tone, researchNotes);
      draft.sequence = steps;
      draft.sequenceSource = source;
      draft.sequenceLanguage = language;
      draft.followupStage = steps[0].stage;
      draft.subjectLine = steps[0].subjectLine;
      draft.bodyContent = steps[0].bodyContent;
    }
    draftStore.set(draft.id, draft);

    // Persist to PostgreSQL Database so /review and /pipeline pick it up
    if (persist) {
      try {
        const postUrl = `https://linkedin.com/company/${profile.overview.domain || profile.companyId}`;
        let dbPost = await db.linkedInPost.findFirst({
        where: {
          OR: [
            { postUrl },
            { companyName: profile.overview.companyName }
          ]
        }
      });

      if (!dbPost) {
        const dmName = profile.decisionMakers?.[0]?.name;
        const resolvedAuthorName = (!dmName || dmName === 'Decision Maker') ? `${profile.overview.companyName} Executive` : dmName;
        
        dbPost = await db.linkedInPost.create({
          data: {
            postUrl,
            authorName: resolvedAuthorName,
            authorHeadline: profile.decisionMakers?.[0]?.jobTitle || 'Executive Lead',
            companyName: profile.overview.companyName,
            postPreview: `Live outreach target for ${profile.overview.companyName} (${profile.overview.domain})`,
            matchedKeyword: profile.engineering?.primaryLanguages?.[0] || 'Target Lead',
            opportunityScore: 92, // Keep base score or make dynamic if wanted
            status: PostStatus.REVIEW_QUEUE,
          }
        });
      }

      if (dbPost) {
        await db.postAnalysis.upsert({
          where: { postId: dbPost.id },
          update: { summary: `Live signal for ${profile.overview.companyName}`, buyingSignals: profile.engineering?.primaryLanguages || [] },
          create: {
            postId: dbPost.id,
            summary: `Live AI signal for ${profile.overview.companyName}`,
            buyingSignals: profile.engineering?.primaryLanguages || [],
            opportunityScore: 92,
          }
        });

        const dm = profile.decisionMakers?.[0];
        const resolvedPersonName = (!dm?.name || dm.name === 'Decision Maker') ? `${profile.overview.companyName} Executive` : dm.name;
        
        await db.apolloEnrichment.upsert({
          where: { linkedPostId: dbPost.id },
          update: {
            personName: resolvedPersonName,
            jobTitle: dm?.jobTitle || 'Executive Lead',
            organizationName: profile.overview.companyName,
            organizationDomain: profile.overview.domain,
            enrichmentStatus: 'ENRICHED',
          },
          create: {
            linkedPostId: dbPost.id,
            personName: resolvedPersonName,
            jobTitle: dm?.jobTitle || 'Executive Lead',
            organizationName: profile.overview.companyName,
            organizationDomain: profile.overview.domain,
            enrichmentStatus: 'ENRICHED',
            creditsUsed: 1,
            enrichedAt: new Date(),
          }
        });

        await db.outreachDraft.upsert({
          where: { id: draft.id },
          update: {
            originalAiDraft: `${draft.subjectLine}\n\n${draft.bodyContent}`,
            status: draft.status === 'APPROVED' ? DraftStatus.APPROVED : DraftStatus.DRAFT,
          },
          create: {
            id: draft.id,
            postId: dbPost.id,
            originalAiDraft: `${draft.subjectLine}\n\n${draft.bodyContent}`,
            status: draft.status === 'APPROVED' ? DraftStatus.APPROVED : DraftStatus.DRAFT,
          }
        });
      }
    } catch (e) {
      logger.warn('Failed to persist draft to DB (continuing in-memory)', { error: String(e) });
    }
  }

  return draft;
  } catch (err: unknown) {
    logger.error(`Failed to generate outreach draft for '${companyIdOrDomain}'`, { error: String(err) });
    throw new AppError('Failed to generate AI outreach draft.', 500);
  }
}

/**
 * Update an existing outreach draft content.
 */
export async function updateOutreachDraftAction(draft: OutreachMessageDraft): Promise<OutreachMessageDraft> {
  try {
    await AuthService.verifySession();
    logger.info(`Updating outreach draft ID '${draft.id}'...`);
    draft.updatedAt = new Date().toISOString();
    draftStore.set(draft.id, draft);

    try {
      await db.outreachDraft.update({
        where: { id: draft.id },
        data: { editedDraft: `${draft.subjectLine}\n\n${draft.bodyContent}` }
      });
    } catch {}

    return draft;
  } catch (err: unknown) {
    logger.error(`Failed to update outreach draft '${draft.id}'`, { error: String(err) });
    throw new AppError('Outreach draft update failed.', 500);
  }
}

// ---------- Sequence scheduling (real persistence) ----------

// Day 1 / 3 / 7 / 14 cadence, as day offsets from the sequence start.
const STAGE_DAY_OFFSETS = [0, 2, 6, 13];
const STAGE_TAG = (n: number) => `[Stage ${n}] `;
const stageNumberFromContent = (content?: string | null) => {
  const m = content?.match(/^\[Stage (\d)\]/);
  return m ? Number(m[1]) : null;
};

const sequenceSteps = (draft: OutreachMessageDraft) =>
  draft.sequence && draft.sequence.length
    ? draft.sequence
    : [{ stage: draft.followupStage, stageNumber: 1 as const, subjectLine: draft.subjectLine, bodyContent: draft.bodyContent }];

/** Finds (or creates) the lead row a draft hangs off, then upserts the draft itself with the edited content. */
async function upsertDbDraft(draft: OutreachMessageDraft, status: DraftStatus) {
  const postUrl = `https://linkedin.com/company/${draft.domain || draft.companyId}`;
  let dbPost = await db.linkedInPost.findFirst({ where: { OR: [{ postUrl }, { companyName: draft.companyName }] } });
  if (!dbPost) {
    dbPost = await db.linkedInPost.create({
      data: {
        postUrl,
        authorName: draft.targetContactName || `${draft.companyName} Executive`,
        authorHeadline: draft.targetContactTitle || 'Executive',
        companyName: draft.companyName,
        postPreview: `Outreach sequence for ${draft.companyName} (${draft.domain})`,
        matchedKeyword: 'AI Outreach Sequence',
        status: PostStatus.APPROVED,
      }
    });
  } else if (dbPost.status !== PostStatus.APPROVED) {
    await db.linkedInPost.update({ where: { id: dbPost.id }, data: { status: PostStatus.APPROVED } });
  }

  const first = sequenceSteps(draft)[0];
  const stage1Text = `${first.subjectLine}\n\n${first.bodyContent}`;
  return db.outreachDraft.upsert({
    where: { id: draft.id },
    update: { editedDraft: stage1Text, status, approvedAt: new Date() },
    create: { id: draft.id, postId: dbPost.id, originalAiDraft: stage1Text, editedDraft: stage1Text, status, approvedAt: new Date() },
  });
}

/**
 * Approves the (edited) sequence and schedules every unsent stage as a FollowUp,
 * due on Day 1/3/7/14 counted from `startAt` (defaults to now).
 */
export async function scheduleOutreachSequenceAction(
  draft: OutreachMessageDraft,
  startAt?: string
): Promise<{ success: boolean; message: string; draft: OutreachMessageDraft }> {
  await AuthService.verifySession();
  const start = startAt ? new Date(startAt) : new Date();
  if (Number.isNaN(start.getTime())) throw new AppError('Invalid schedule date.', 400);

  try {
    const sent = new Set(draft.sentStages || []);
    const dbDraft = await upsertDbDraft(draft, sent.size ? DraftStatus.FOLLOW_UP_DUE : DraftStatus.APPROVED);

    // Replace any previously scheduled (unsent) stages with the current edited content.
    await db.followUp.deleteMany({ where: { draftId: dbDraft.id, status: { in: [FollowUpStatus.PENDING, FollowUpStatus.CANCELLED] } } });
    const steps = sequenceSteps(draft).map((s, i) => ({ ...s, n: i + 1 }));
    const toSchedule = steps.filter((s) => !sent.has(s.stage));
    if (toSchedule.length) {
      await db.followUp.createMany({
        data: toSchedule.map((s) => ({
          draftId: dbDraft.id,
          dueDate: new Date(start.getTime() + STAGE_DAY_OFFSETS[s.n - 1] * 86400000),
          status: FollowUpStatus.PENDING,
          content: `${STAGE_TAG(s.n)}${s.subjectLine}\n\n${s.bodyContent}`,
        })),
      });
    }

    await db.outreachHistory.create({
      data: {
        draftId: dbDraft.id,
        status: DraftStatus.APPROVED,
        notes: `Sequence approved via AI Outreach Generator. ${toSchedule.length} stage(s) scheduled from ${start.toISOString()}.`,
      }
    });

    safeRevalidatePath('/review');
    safeRevalidatePath('/pipeline');

    const updated: OutreachMessageDraft = { ...draft, status: 'SCHEDULED', scheduledStartAt: start.toISOString(), sequencePaused: false, updatedAt: new Date().toISOString() };
    draftStore.set(draft.id, updated);
    return { success: true, message: `${toSchedule.length} stage(s) scheduled for ${draft.companyName}.`, draft: updated };
  } catch (err) {
    logger.error(`Failed to schedule outreach sequence '${draft.id}'`, { error: String(err) });
    throw new AppError('Could not save the sequence schedule. Please try again.', 500);
  }
}

/**
 * Records that one stage was actually sent (from the user's email client or LinkedIn).
 * Saves the draft first if it was never approved, so nothing sent goes untracked.
 */
export async function markStageSentAction(
  draft: OutreachMessageDraft,
  stage: FollowupStage
): Promise<{ success: boolean; draft: OutreachMessageDraft }> {
  await AuthService.verifySession();
  try {
    const steps = sequenceSteps(draft);
    const idx = Math.max(0, steps.findIndex((s) => s.stage === stage));
    const n = idx + 1;
    const sentStages = Array.from(new Set([...(draft.sentStages || []), stage]));
    const dbDraft = await upsertDbDraft(draft, n === 1 ? DraftStatus.SENT : DraftStatus.FOLLOW_UP_DUE);
    if (n === 1) await db.outreachDraft.update({ where: { id: dbDraft.id }, data: { sentAt: new Date() } });

    const pending = await db.followUp.findMany({ where: { draftId: dbDraft.id, content: { startsWith: STAGE_TAG(n) } } });
    const content = `${STAGE_TAG(n)}${steps[idx].subjectLine}\n\n${steps[idx].bodyContent}`;
    if (pending.length) {
      await db.followUp.updateMany({ where: { id: { in: pending.map((p) => p.id) } }, data: { status: FollowUpStatus.SENT, content } });
    } else {
      await db.followUp.create({ data: { draftId: dbDraft.id, dueDate: new Date(), status: FollowUpStatus.SENT, content } });
    }

    await db.outreachHistory.create({
      data: { draftId: dbDraft.id, status: DraftStatus.SENT, notes: `Stage ${n} sent via ${draft.channel === 'LINKEDIN' ? 'LinkedIn' : 'email client'}.` }
    });
    safeRevalidatePath('/pipeline');

    const updated: OutreachMessageDraft = { ...draft, sentStages, status: n === 1 ? 'SENT' : draft.status, updatedAt: new Date().toISOString() };
    draftStore.set(draft.id, updated);
    return { success: true, draft: updated };
  } catch (err) {
    logger.error(`Failed to mark stage sent for '${draft.id}'`, { error: String(err) });
    throw new AppError('Could not record the sent stage. Please try again.', 500);
  }
}

/** Pauses (cancels pending) or resumes (re-queues) the remaining stages of a sequence. */
export async function setSequencePausedAction(draftId: string, paused: boolean): Promise<{ success: boolean; affected: number }> {
  await AuthService.verifySession();
  try {
    const res = await db.followUp.updateMany({
      where: { draftId, status: paused ? FollowUpStatus.PENDING : FollowUpStatus.CANCELLED },
      data: { status: paused ? FollowUpStatus.CANCELLED : FollowUpStatus.PENDING },
    });
    await db.outreachHistory.create({
      data: { draftId, status: DraftStatus.APPROVED, notes: paused ? `Sequence paused (${res.count} stage(s) on hold).` : `Sequence resumed (${res.count} stage(s) re-queued).` }
    });
    const cached = draftStore.get(draftId);
    if (cached) draftStore.set(draftId, { ...cached, sequencePaused: paused });
    safeRevalidatePath('/pipeline');
    return { success: true, affected: res.count };
  } catch (err) {
    logger.error(`Failed to ${paused ? 'pause' : 'resume'} sequence '${draftId}'`, { error: String(err) });
    throw new AppError(`Could not ${paused ? 'pause' : 'resume'} the sequence.`, 500);
  }
}

/**
 * Kept for backwards compatibility: approves a draft that is still in the server cache.
 */
export async function approveOutreachDraftAction(draftId: string): Promise<{ success: boolean; message: string }> {
  const draft = draftStore.get(draftId);
  if (!draft) throw new AppError('Draft not found. Please regenerate and approve again.', 404);
  const res = await scheduleOutreachSequenceAction(draft);
  return { success: res.success, message: res.message };
}

/**
 * Get Sales Engagement Telemetry KPIs, computed from real database activity.
 */
export async function getEngagementTelemetryAction(): Promise<EngagementTelemetry> {
  try {
    await AuthService.verifySession();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    let draftsGeneratedToday = 0;
    let emailsAwaitingApproval = 0;
    let followupsScheduled = 0;
    let activeSequences = 0;
    let sentCount = 0;
    let repliedCount = 0;
    let meetingsBookedCount = 0;
    let proposalRequestsCount = 0;

    try {
      [draftsGeneratedToday, emailsAwaitingApproval, followupsScheduled, activeSequences, sentCount, repliedCount, meetingsBookedCount, proposalRequestsCount] = await Promise.all([
        db.outreachDraft.count({ where: { createdAt: { gte: startOfToday } } }),
        db.outreachDraft.count({ where: { status: DraftStatus.DRAFT } }),
        db.followUp.count({ where: { status: FollowUpStatus.PENDING } }),
        db.outreachDraft.count({ where: { status: { in: [DraftStatus.APPROVED, DraftStatus.SENT, DraftStatus.FOLLOW_UP_DUE] } } }),
        db.outreachDraft.count({ where: { sentAt: { not: null } } }),
        db.outreachDraft.count({ where: { status: { in: [DraftStatus.REPLIED, DraftStatus.MEETING, DraftStatus.PROPOSAL, DraftStatus.WON] } } }),
        db.outreachDraft.count({ where: { status: { in: [DraftStatus.MEETING, DraftStatus.PROPOSAL, DraftStatus.WON] } } }),
        db.outreachDraft.count({ where: { status: { in: [DraftStatus.PROPOSAL, DraftStatus.WON] } } }),
      ]);
    } catch {
      // Offline DB safety: show zeros rather than invented numbers.
    }

    // Pipeline is an explicit estimate: active sequences x assumed average deal value.
    const avgDealInr = 1800000;
    const totalPipeline = activeSequences * avgDealInr;
    const expectedRevenue = Math.round(totalPipeline * 0.35);

    return {
      draftsGeneratedToday,
      emailsAwaitingApproval,
      linkedinMessagesReady: 0,
      followupsScheduled,
      responseRatePercent: sentCount > 0 ? Math.round((repliedCount / sentCount) * 1000) / 10 : 0,
      meetingsBookedCount,
      proposalRequestsCount,
      pipelineInfluencedInr: `₹${totalPipeline.toLocaleString('en-IN')}`,
      estimatedRevenueInr: `₹${expectedRevenue.toLocaleString('en-IN')}`,
      activeSequences,
      sentCount,
    };
  } catch (err: unknown) {
    logger.error('Failed to query engagement telemetry', { error: String(err) });
    throw new AppError('Telemetry query failed.', 500);
  }
}

export type OutreachCampaignRow = {
  id: string;
  companyName: string;
  targetContactName: string;
  targetContactTitle: string;
  domain: string;
  status: string;
  stagesSent: number;
  stagesTotal: number;
  nextStage: number | null;
  nextDueDate: string | null;
  paused: boolean;
  updatedAt: string;
};

/**
 * Get approved / running outreach sequences with their real follow-up progress.
 */
export async function getActiveOutreachCampaignsAction(): Promise<OutreachCampaignRow[]> {
  try {
    await AuthService.verifySession();
    const drafts = await db.outreachDraft.findMany({
      where: { status: { in: [DraftStatus.APPROVED, DraftStatus.SENT, DraftStatus.FOLLOW_UP_DUE] } },
      include: { post: true, followUps: { orderBy: { dueDate: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    return drafts.map((d) => {
      const stages = d.followUps.filter((f) => stageNumberFromContent(f.content) !== null);
      const sent = stages.filter((f) => f.status === FollowUpStatus.SENT);
      const pending = stages.filter((f) => f.status === FollowUpStatus.PENDING);
      const cancelled = stages.filter((f) => f.status === FollowUpStatus.CANCELLED);
      const next = pending[0] || cancelled[0];
      const stagesSent = new Set(sent.map((f) => stageNumberFromContent(f.content))).size;
      return {
        id: d.id,
        companyName: d.post?.companyName || 'Unknown Company',
        targetContactName: d.post?.authorName || 'Decision Maker',
        targetContactTitle: d.post?.authorHeadline || 'Executive',
        domain: d.post?.postUrl?.replace('https://linkedin.com/company/', '') || '',
        status: d.status,
        stagesSent,
        stagesTotal: Math.max(stages.length ? new Set(stages.map((f) => stageNumberFromContent(f.content))).size : 0, stagesSent),
        nextStage: next ? stageNumberFromContent(next.content) : null,
        nextDueDate: next ? next.dueDate.toISOString() : null,
        paused: pending.length === 0 && cancelled.length > 0,
        updatedAt: d.updatedAt.toISOString(),
      };
    });
  } catch (err: unknown) {
    logger.error('Failed to fetch active outreach campaigns', { error: String(err) });
    return [];
  }
}
