'use server';

import { AuthService } from '@/lib/auth';
import type { UserSession } from '@/lib/auth';
import { canSeeAllDeals } from '@/lib/roles';
import { isValidEmail, resolveMailbox } from '@/lib/mailer';
import { createLead, logActivity } from '@/features/crm/service';
import { STAGE_DAY_OFFSETS, STAGE_TAG, deliverFollowUp, parseFollowUpContent, stageNumberFromContent } from './sequence';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { DraftStatus, FollowUpStatus, PostStatus, Prisma } from '@prisma/client';
import { getCompany360Profile } from '@/features/company360/actions';
import { generateOutreachMessage } from './generator';
import { generateAiSequence } from './sequenceAi';
import { OutreachMessageDraft, OutreachChannel, OutreachCategory, ToneSetting, EngagementTelemetry, FollowupStage } from './types';
import { safeRevalidatePath } from '@/lib/revalidate';

const SEQUENCE_CHANNELS: OutreachChannel[] = ['EMAIL', 'LINKEDIN'];

const blankDraft = (channel: OutreachChannel, category: OutreachCategory, tone: ToneSetting): OutreachMessageDraft => {
  const now = new Date().toISOString();
  return {
    id: `draft_${Date.now()}`, companyId: '', domain: '', companyName: '', targetContactName: '', targetContactTitle: '',
    channel, category, tone, subjectLine: '', bodyContent: '',
    personalizationScore: 0, technicalRelevanceScore: 0, readabilityScore: 0, spamRiskIndicator: 'LOW',
    status: 'DRAFT', followupStage: 'STAGE_1_INITIAL', createdAt: now, updatedAt: now,
  };
};

/**
 * Generate a new personalized AI Outreach draft for a company. Nothing is saved: the draft reaches the
 * database (and the Review Queue / CRM) only when the BDE approves or schedules it (see upsertDbDraft),
 * so trying out companies, channels and tones leaves no leads behind.
 */
export async function generateOutreachDraftAction(
  companyIdOrDomain: string,
  channel: OutreachChannel = 'EMAIL',
  category: OutreachCategory = 'COLD_OUTREACH',
  tone: ToneSetting = 'EXECUTIVE',
  withAiSequence: boolean = true,
  researchNotes?: string
): Promise<OutreachMessageDraft> {
  try {
    await AuthService.verifySession();
    logger.info(`Generating AI Outreach draft for '${companyIdOrDomain}' (${channel})...`);

    const target = companyIdOrDomain?.trim();
    // No company chosen yet: an empty draft, rather than researching and writing to a placeholder company.
    if (!target) return blankDraft(channel, category, tone);
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
    return draft;
  } catch (err: unknown) {
    logger.error(`Failed to generate outreach draft for '${companyIdOrDomain}'`, { error: String(err) });
    throw new AppError('Failed to generate AI outreach draft.', 500);
  }
}

// ---------- The draft a BDE is working on ----------

/** The signed-in person's unsent draft, so the Outreach page can pick up where they left off. */
export async function getWorkingDraftAction(): Promise<OutreachMessageDraft | null> {
  const user = await AuthService.verifySession();
  const row = await db.outreachWorkingDraft.findUnique({ where: { userId: user.id } }).catch(() => null);
  return row ? (row.data as unknown as OutreachMessageDraft) : null;
}

/** Saves the draft on screen (called a moment after each change). One per person: the latest wins. */
export async function saveWorkingDraftAction(draft: OutreachMessageDraft): Promise<{ error?: string }> {
  const user = await AuthService.verifySession();
  try {
    const json = JSON.stringify(draft);
    if (json.length > 200_000) return { error: 'This draft is too large to save.' };
    const data = JSON.parse(json) as Prisma.InputJsonValue;
    await db.outreachWorkingDraft.upsert({ where: { userId: user.id }, update: { data }, create: { userId: user.id, data } });
    return {};
  } catch (err) {
    logger.error('Could not save the working outreach draft', err);
    return { error: 'Could not save the draft.' };
  }
}

// ---------- Sequence scheduling (real persistence) ----------

const sequenceSteps = (draft: OutreachMessageDraft) =>
  draft.sequence && draft.sequence.length
    ? draft.sequence
    : [{ stage: draft.followupStage, stageNumber: 1 as const, subjectLine: draft.subjectLine, bodyContent: draft.bodyContent }];

/** A BDE works their own sequences (and ones saved before sequences had owners); admins and managers see all. */
const canManageDraft = (user: UserSession, draft: { ownerId: string | null }) => canSeeAllDeals(user.role) || !draft.ownerId || draft.ownerId === user.id;

/** Finds (or creates) the lead row a draft hangs off, then upserts the draft itself with the edited content. */
async function upsertDbDraft(draft: OutreachMessageDraft, status: DraftStatus, user?: UserSession) {
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
  const toEmail = draft.targetContactEmail?.trim().toLowerCase();
  // Who the sequence goes to and who sends it: needed to deliver follow-ups after the browser is closed.
  const delivery = { channel: draft.channel, toEmail: toEmail && isValidEmail(toEmail) ? toEmail : null, toName: draft.targetContactName || null };
  const existing = await db.outreachDraft.findUnique({ where: { id: draft.id }, select: { ownerId: true } });
  return db.outreachDraft.upsert({
    where: { id: draft.id },
    // The first person to approve or send a sequence owns it; later edits by others do not take it over.
    update: { editedDraft: stage1Text, status, approvedAt: new Date(), ...delivery, ownerId: existing?.ownerId || user?.id },
    create: { id: draft.id, postId: dbPost.id, originalAiDraft: stage1Text, editedDraft: stage1Text, status, approvedAt: new Date(), ...delivery, ownerId: user?.id },
  });
}

/**
 * Approves the (edited) sequence and schedules every unsent stage as a FollowUp,
 * due on Day 1/3/7/14 counted from `startAt` (defaults to now).
 *
 * With `autoSend`, email stages are sent from the user's mailbox when they fall due. Without it
 * (and always for LinkedIn) each stage becomes a reminder in the Today view.
 */
export async function scheduleOutreachSequenceAction(
  draft: OutreachMessageDraft,
  startAt?: string,
  options: { autoSend?: boolean } = {}
): Promise<{ success: boolean; message: string; draft: OutreachMessageDraft }> {
  const user = await AuthService.verifySession();
  const start = startAt ? new Date(startAt) : new Date();
  if (Number.isNaN(start.getTime())) throw new AppError('Invalid schedule date.', 400);

  // Automatic sending needs an email channel, a recipient and a mailbox; say so instead of scheduling emails that cannot go out.
  if (options.autoSend) {
    const problem = draft.channel !== 'EMAIL'
      ? 'Only email sequences can be sent automatically.'
      : !isValidEmail(draft.targetContactEmail || '')
        ? 'This contact has no valid email address, so the sequence cannot be sent automatically.'
        : !(await resolveMailbox(user.id))
          ? 'Connect your mailbox under Profile before scheduling automatic emails.'
          : null;
    if (problem) return { success: false, message: problem, draft };
  }

  try {
    const sent = new Set(draft.sentStages || []);
    const existing = await db.outreachDraft.findUnique({ where: { id: draft.id }, select: { ownerId: true } });
    if (existing && !canManageDraft(user, existing)) return { success: false, message: 'This sequence belongs to a teammate.', draft };
    const dbDraft = await upsertDbDraft(draft, sent.size ? DraftStatus.FOLLOW_UP_DUE : DraftStatus.APPROVED, user);

    // Replace any previously scheduled (unsent) stages with the current edited content.
    await db.followUp.deleteMany({ where: { draftId: dbDraft.id, status: { in: [FollowUpStatus.PENDING, FollowUpStatus.CANCELLED, FollowUpStatus.FAILED] } } });
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

    const autoSend = !!options.autoSend;
    await db.outreachHistory.create({
      data: {
        draftId: dbDraft.id,
        status: DraftStatus.APPROVED,
        notes: `Sequence approved via AI Outreach Generator. ${toSchedule.length} stage(s) scheduled from ${start.toISOString()} (${autoSend ? 'sent automatically' : 'sent by hand'}).`,
      }
    });

    // Tie the sequence to the company's CRM deal: it shows on the deal, and a reply or a booked meeting stops it.
    let dealId: string | null = dbDraft.dealId;
    try {
      if (!dealId) {
        const lead = await createLead({
          company: { name: draft.companyName, domain: draft.domain },
          contact: draft.targetContactName ? { name: draft.targetContactName, title: draft.targetContactTitle, email: draft.targetContactEmail, linkedinUrl: draft.targetContactLinkedin } : null,
          source: 'COMPANY360',
          ownerId: user.id,
          actorId: user.id,
          note: { title: 'Created from the AI Outreach Generator' },
        });
        dealId = lead.dealId;
      }
      const firstDue = toSchedule.length ? new Date(start.getTime() + STAGE_DAY_OFFSETS[toSchedule[0].n - 1] * 86400000) : null;
      await db.$transaction(async (tx) => {
        await tx.outreachDraft.update({ where: { id: dbDraft.id }, data: { dealId, autoSend, stoppedReason: null } });
        if (dealId && toSchedule.length) {
          await logActivity(tx, {
            dealId,
            type: 'SYSTEM',
            title: `Outreach sequence scheduled: ${toSchedule.length} stage${toSchedule.length === 1 ? '' : 's'}`,
            details: `${draft.channel === 'LINKEDIN' ? 'LinkedIn messages' : 'Emails'} from ${start.toISOString().slice(0, 10)}, ${autoSend ? `sent automatically to ${dbDraft.toEmail}` : 'sent by hand (reminders appear in Today)'}.`,
            userId: user.id,
          });
          // Keep the deal's "next action" in step with the sequence when nothing else is planned.
          const deal = await tx.deal.findUnique({ where: { id: dealId }, select: { nextAction: true } });
          if (deal && !deal.nextAction && firstDue) {
            await tx.deal.update({ where: { id: dealId }, data: { nextAction: `Outreach stage ${toSchedule[0].n}${autoSend ? ' (automatic)' : ''}`, nextActionDate: firstDue } });
          }
        }
      });
    } catch (err) {
      // The schedule itself is saved; without the deal link it simply is not shown on a deal.
      logger.error(`Sequence '${draft.id}' was scheduled but could not be linked to a CRM deal`, err);
      await db.outreachDraft.update({ where: { id: dbDraft.id }, data: { autoSend, stoppedReason: null } }).catch(() => undefined);
    }

    safeRevalidatePath('/review');
    safeRevalidatePath('/crm');
    safeRevalidatePath('/crm');
    safeRevalidatePath('/today');

    const updated: OutreachMessageDraft = { ...draft, status: 'SCHEDULED', scheduledStartAt: start.toISOString(), sequencePaused: false, updatedAt: new Date().toISOString() };
    const how = autoSend ? `They will be sent automatically to ${dbDraft.toEmail}.` : 'You will be reminded in Today when each one is due.';
    return { success: true, message: `${toSchedule.length} stage(s) scheduled for ${draft.companyName}. ${how}`, draft: updated };
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
  const user = await AuthService.verifySession();
  try {
    const steps = sequenceSteps(draft);
    const idx = Math.max(0, steps.findIndex((s) => s.stage === stage));
    const n = idx + 1;
    const sentStages = Array.from(new Set([...(draft.sentStages || []), stage]));
    const dbDraft = await upsertDbDraft(draft, n === 1 ? DraftStatus.SENT : DraftStatus.FOLLOW_UP_DUE, user);
    if (n === 1) await db.outreachDraft.update({ where: { id: dbDraft.id }, data: { sentAt: new Date() } });

    const pending = await db.followUp.findMany({ where: { draftId: dbDraft.id, content: { startsWith: STAGE_TAG(n) } } });
    const content = `${STAGE_TAG(n)}${steps[idx].subjectLine}\n\n${steps[idx].bodyContent}`;
    // sentAt also spaces out the automatic stages that follow.
    if (pending.length) {
      await db.followUp.updateMany({ where: { id: { in: pending.map((p) => p.id) } }, data: { status: FollowUpStatus.SENT, sentAt: new Date(), error: null, content } });
    } else {
      await db.followUp.create({ data: { draftId: dbDraft.id, dueDate: new Date(), status: FollowUpStatus.SENT, sentAt: new Date(), content } });
    }

    await db.outreachHistory.create({
      data: { draftId: dbDraft.id, status: DraftStatus.SENT, notes: `Stage ${n} sent via ${draft.channel === 'LINKEDIN' ? 'LinkedIn' : 'email client'}.` }
    });
    safeRevalidatePath('/crm');

    const updated: OutreachMessageDraft = { ...draft, sentStages, status: n === 1 ? 'SENT' : draft.status, updatedAt: new Date().toISOString() };
    return { success: true, draft: updated };
  } catch (err) {
    logger.error(`Failed to mark stage sent for '${draft.id}'`, { error: String(err) });
    throw new AppError('Could not record the sent stage. Please try again.', 500);
  }
}

/** Pauses (cancels pending) or resumes (re-queues) the remaining stages of a sequence. */
export async function setSequencePausedAction(draftId: string, paused: boolean): Promise<{ success: boolean; affected: number }> {
  const user = await AuthService.verifySession();
  try {
    const owned = await db.outreachDraft.findUnique({ where: { id: draftId }, select: { ownerId: true } });
    if (!owned || !canManageDraft(user, owned)) throw new AppError('This sequence belongs to a teammate.', 403);

    const res = await db.followUp.updateMany({
      where: { draftId, status: paused ? FollowUpStatus.PENDING : FollowUpStatus.CANCELLED },
      data: { status: paused ? FollowUpStatus.CANCELLED : FollowUpStatus.PENDING },
    });
    // Resuming is a deliberate decision to carry on, e.g. after a sequence was stopped by a reply.
    if (!paused) await db.outreachDraft.update({ where: { id: draftId }, data: { stoppedReason: null } });
    await db.outreachHistory.create({
      data: { draftId, status: DraftStatus.APPROVED, notes: paused ? `Sequence paused (${res.count} stage(s) on hold).` : `Sequence resumed (${res.count} stage(s) re-queued).` }
    });
    safeRevalidatePath('/crm');
    safeRevalidatePath('/today');
    return { success: true, affected: res.count };
  } catch (err) {
    logger.error(`Failed to ${paused ? 'pause' : 'resume'} sequence '${draftId}'`, { error: String(err) });
    throw new AppError(`Could not ${paused ? 'pause' : 'resume'} the sequence.`, 500);
  }
}

/**
 * Sends one scheduled email stage right now (also used to retry a failed one).
 * Returns `{ error }` rather than throwing, so the mail server's reason reaches the UI.
 */
export async function sendFollowUpNowAction(followUpId: string): Promise<{ error?: string; message?: string }> {
  const user = await AuthService.verifySession();
  try {
    const followUp = await db.followUp.findUnique({ where: { id: followUpId }, select: { draft: { select: { ownerId: true } } } });
    if (!followUp) return { error: 'This follow-up no longer exists.' };
    if (!canManageDraft(user, followUp.draft)) return { error: 'This sequence belongs to a teammate.' };
    // An unowned (older) sequence is sent from the mailbox of whoever presses the button.
    if (!followUp.draft.ownerId) await db.followUp.update({ where: { id: followUpId }, data: { draft: { update: { ownerId: user.id } } } });

    const outcome = await deliverFollowUp(followUpId, [FollowUpStatus.PENDING, FollowUpStatus.FAILED]);
    safeRevalidatePath('/today');
    safeRevalidatePath('/crm');
    return outcome.status === 'SENT' ? { message: outcome.message } : { error: outcome.message };
  } catch (err) {
    logger.error(`Failed to send follow-up '${followUpId}'`, err);
    return { error: 'The email could not be sent. Please try again.' };
  }
}

/** Marks a due stage as sent by hand (LinkedIn messages, or an email sent from the user's own mail app). */
export async function markFollowUpSentAction(followUpId: string): Promise<{ error?: string }> {
  const user = await AuthService.verifySession();
  try {
    const followUp = await db.followUp.findUnique({ where: { id: followUpId }, include: { draft: true } });
    if (!followUp) return { error: 'This follow-up no longer exists.' };
    if (!canManageDraft(user, followUp.draft)) return { error: 'This sequence belongs to a teammate.' };

    const claimed = await db.followUp.updateMany({ where: { id: followUpId, status: { in: [FollowUpStatus.PENDING, FollowUpStatus.FAILED] } }, data: { status: FollowUpStatus.SENT, sentAt: new Date(), error: null } });
    if (claimed.count !== 1) return { error: 'This stage was already sent or cancelled.' };

    const { stage, subject } = parseFollowUpContent(followUp.content);
    const channel = followUp.draft.channel === 'LINKEDIN' ? 'LinkedIn' : 'email';
    await db.outreachDraft.update({ where: { id: followUp.draftId }, data: { status: stage === 1 ? DraftStatus.SENT : DraftStatus.FOLLOW_UP_DUE, sentAt: followUp.draft.sentAt || new Date(), ownerId: followUp.draft.ownerId || user.id } });
    await db.outreachHistory.create({ data: { draftId: followUp.draftId, status: DraftStatus.SENT, notes: `Stage ${stage ?? ''} marked as sent by hand (${channel}).` } });
    if (followUp.draft.dealId) {
      await logActivity(db, { dealId: followUp.draft.dealId, type: followUp.draft.channel === 'LINKEDIN' ? 'LINKEDIN' : 'EMAIL', title: `Stage ${stage ?? ''} follow-up sent by hand${subject ? `: ${subject}` : ''}`, userId: user.id });
    }
    safeRevalidatePath('/today');
    safeRevalidatePath('/crm');
    return {};
  } catch (err) {
    logger.error(`Failed to mark follow-up '${followUpId}' as sent`, err);
    return { error: 'Could not update this follow-up. Please try again.' };
  }
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

    return {
      draftsGeneratedToday,
      emailsAwaitingApproval,
      linkedinMessagesReady: 0,
      followupsScheduled,
      responseRatePercent: sentCount > 0 ? Math.round((repliedCount / sentCount) * 1000) / 10 : 0,
      meetingsBookedCount,
      proposalRequestsCount,
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
  /** Email stages go out from the owner's mailbox by themselves; otherwise they are reminders. */
  autoSend: boolean;
  channel: string | null;
  ownerName: string | null;
  /** Why the remaining stages were cancelled (a reply, a booked meeting, a closed deal). */
  stoppedReason: string | null;
  /** The mail server's error for a stage that could not be sent. */
  failedStage: { id: string; stage: number | null; error: string | null } | null;
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
    const user = await AuthService.verifySession();
    const drafts = await db.outreachDraft.findMany({
      where: {
        status: { in: [DraftStatus.APPROVED, DraftStatus.SENT, DraftStatus.FOLLOW_UP_DUE] },
        ...(canSeeAllDeals(user.role) ? {} : { OR: [{ ownerId: user.id }, { ownerId: null }] }),
      },
      include: { post: true, owner: { select: { name: true } }, followUps: { orderBy: { dueDate: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    return drafts.map((d) => {
      const stages = d.followUps.filter((f) => stageNumberFromContent(f.content) !== null);
      const sent = stages.filter((f) => f.status === FollowUpStatus.SENT);
      const pending = stages.filter((f) => f.status === FollowUpStatus.PENDING);
      const cancelled = stages.filter((f) => f.status === FollowUpStatus.CANCELLED);
      const failed = stages.find((f) => f.status === FollowUpStatus.FAILED);
      const next = pending[0] || cancelled[0];
      const stagesSent = new Set(sent.map((f) => stageNumberFromContent(f.content))).size;
      return {
        id: d.id,
        autoSend: d.autoSend,
        channel: d.channel,
        ownerName: d.owner?.name ?? null,
        stoppedReason: d.stoppedReason,
        failedStage: failed ? { id: failed.id, stage: stageNumberFromContent(failed.content), error: failed.error } : null,
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
