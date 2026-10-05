import { DraftStatus, FollowUpStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { MailError, sendMail } from '@/lib/mailer';
import { advanceDealStage, logActivity } from '@/features/crm/service';

/**
 * Delivery of scheduled outreach stages. A sequence stage is a FollowUp row whose content is
 * "[Stage n] subject\n\nbody"; when its draft has auto-send on, the automation job emails it
 * from the owner's mailbox at the due time. LinkedIn stages and manual sequences are never
 * sent from here: they show up as reminders in the Today view.
 */

// Day 1 / 3 / 7 / 14 cadence, as day offsets from the sequence start.
export const STAGE_DAY_OFFSETS = [0, 2, 6, 13];
export const STAGE_TAG = (n: number) => `[Stage ${n}] `;

export const stageNumberFromContent = (content?: string | null) => {
  const m = content?.match(/^\[Stage (\d)\]/);
  return m ? Number(m[1]) : null;
};

/** Splits stored follow-up content back into stage number, subject and body. */
export function parseFollowUpContent(content?: string | null): { stage: number | null; subject: string; body: string } {
  const text = (content || '').replace(/^\[Stage \d\]\s?/, '');
  const split = text.indexOf('\n\n');
  return {
    stage: stageNumberFromContent(content),
    subject: (split === -1 ? text : text.slice(0, split)).trim(),
    body: split === -1 ? '' : text.slice(split + 2).trim(),
  };
}

const HOUR_MS = 3600000;
/** A stage still marked "sending" after this long means the server stopped mid-send. */
const STUCK_AFTER_MS = 10 * 60 * 1000;
/** Never send two stages of one sequence closer together than this, even when both are overdue. */
const MIN_GAP_BETWEEN_STAGES_MS = 20 * HOUR_MS;
/** A stage this far past its date was missed (automation was off); a person should decide what to do with it. */
const TOO_LATE_AFTER_MS = 7 * 24 * HOUR_MS;

export type DeliveryResult = { status: 'SENT' | 'FAILED' | 'SKIPPED'; message: string };

const emailDetails = (to: string, subject: string, body: string) => `To: ${to}\nSubject: ${subject}\n\n${body}`.slice(0, 8000);

/**
 * Sends one scheduled stage by email. The row is first claimed (PENDING/FAILED -> SENDING) in a
 * single conditional update, so two job runs, or a job run and a "Send now" click, can never send it twice.
 */
export async function deliverFollowUp(followUpId: string, from: FollowUpStatus[] = [FollowUpStatus.PENDING]): Promise<DeliveryResult> {
  const followUp = await db.followUp.findUnique({ where: { id: followUpId }, include: { draft: { include: { owner: true, post: true } } } });
  if (!followUp) return { status: 'SKIPPED', message: 'This follow-up no longer exists.' };

  const { draft } = followUp;
  const { stage, subject, body } = parseFollowUpContent(followUp.content);
  if (draft.channel !== 'EMAIL') return { status: 'SKIPPED', message: 'Only email stages can be sent from here. Send this one by hand and mark it as sent.' };
  if (!draft.toEmail) return { status: 'SKIPPED', message: 'This sequence has no recipient email address.' };
  if (!draft.ownerId || !draft.owner?.isActive) return { status: 'SKIPPED', message: 'This sequence has no active owner to send from.' };
  if (!subject || !body) return { status: 'SKIPPED', message: 'This stage has no subject or message.' };

  const claimed = await db.followUp.updateMany({ where: { id: followUp.id, status: { in: from } }, data: { status: FollowUpStatus.SENDING, error: null } });
  if (claimed.count !== 1) return { status: 'SKIPPED', message: 'This stage was already sent, cancelled or is being sent right now.' };

  const label = `Stage ${stage ?? ''}`.trim();
  const company = draft.post?.companyName || draft.toName || draft.toEmail;
  let mailed = false;
  try {
    const sent = await sendMail(draft.ownerId, { to: draft.toEmail, subject, body });
    mailed = true;

    await db.$transaction(async (tx) => {
      await tx.followUp.update({ where: { id: followUp.id }, data: { status: FollowUpStatus.SENT, sentAt: new Date(), error: null } });
      await tx.outreachDraft.update({
        where: { id: draft.id },
        data: { status: stage === 1 ? DraftStatus.SENT : DraftStatus.FOLLOW_UP_DUE, sentAt: draft.sentAt || new Date() },
      });
      await tx.outreachHistory.create({ data: { draftId: draft.id, status: DraftStatus.SENT, notes: `${label} sent to ${draft.toEmail} from ${sent.from}.` } });
      if (draft.dealId) {
        const deal = await tx.deal.findUnique({ where: { id: draft.dealId }, select: { id: true, stage: true } });
        if (deal) {
          await logActivity(tx, { dealId: deal.id, type: 'EMAIL', title: `${label} follow-up sent to ${draft.toName || draft.toEmail}: ${subject}`, details: emailDetails(draft.toEmail!, subject, body), userId: draft.ownerId });
          await advanceDealStage(tx, deal, 'CONTACTED', { userId: draft.ownerId, reason: 'Outreach email sent.' });
        }
      }
    });
    logger.info(`Sequence ${label} sent for ${company} (${followUp.id}).`);
    return { status: 'SENT', message: `${label} sent to ${draft.toEmail}.` };
  } catch (err) {
    // The email went out but saving that failed: leave the row as SENDING so it is flagged for a
    // manual check (see runDueFollowUps) instead of being sent a second time.
    if (mailed) {
      logger.error(`Sequence ${label} for ${company} was sent but could not be recorded`, err);
      return { status: 'FAILED', message: 'The email was sent but could not be recorded. It will be flagged for a check.' };
    }
    const reason = err instanceof MailError ? err.message : 'The email could not be sent because of a server error.';
    if (!(err instanceof MailError)) logger.error(`Sequence ${label} for ${company} failed before sending`, err);
    await db.followUp.update({ where: { id: followUp.id }, data: { status: FollowUpStatus.FAILED, error: reason } });
    await db.outreachHistory.create({ data: { draftId: draft.id, status: draft.status, notes: `${label} could not be sent: ${reason}` } }).catch(() => undefined);
    if (draft.dealId) {
      await logActivity(db, { dealId: draft.dealId, type: 'SYSTEM', title: `${label} follow-up email could not be sent`, details: reason, userId: draft.ownerId }).catch(() => undefined);
    }
    logger.warn(`Sequence ${label} for ${company} failed: ${reason}`);
    return { status: 'FAILED', message: reason };
  }
}

/**
 * Sends every automatic email stage that is due. Called by the scheduler every few minutes
 * and by the cron endpoint; safe to run concurrently.
 */
export async function runDueFollowUps(now = new Date()): Promise<{ sent: number; failed: number; skipped: number }> {
  const result = { sent: 0, failed: 0, skipped: 0 };

  // Stages left "sending" by a stopped server: do not retry blindly, the email may have gone out.
  await db.followUp.updateMany({
    where: { status: FollowUpStatus.SENDING, updatedAt: { lt: new Date(now.getTime() - STUCK_AFTER_MS) } },
    data: { status: FollowUpStatus.FAILED, error: 'Sending was interrupted. Check your Sent folder before retrying, so the prospect does not receive it twice.' },
  });

  const automatic = { autoSend: true, channel: 'EMAIL', toEmail: { not: null }, ownerId: { not: null }, owner: { isActive: true } };
  // Stages missed by more than a week are handed back to a person instead of going out late.
  const missed = await db.followUp.updateMany({
    where: { status: FollowUpStatus.PENDING, dueDate: { lt: new Date(now.getTime() - TOO_LATE_AFTER_MS) }, draft: automatic },
    data: { status: FollowUpStatus.FAILED, error: 'This stage was due more than a week ago and was not sent. Review it and send it yourself, or reschedule the sequence.' },
  });
  result.failed += missed.count;

  const due = await db.followUp.findMany({
    where: { status: FollowUpStatus.PENDING, dueDate: { lte: now }, draft: automatic },
    orderBy: { dueDate: 'asc' },
    take: 100,
    select: { id: true, draftId: true },
  });

  const seenDrafts = new Set<string>();
  for (const item of due) {
    // One stage per sequence per run, and not within a day of the previous stage.
    if (seenDrafts.has(item.draftId)) continue;
    seenDrafts.add(item.draftId);
    const recent = await db.followUp.findFirst({
      where: { draftId: item.draftId, status: FollowUpStatus.SENT, sentAt: { gt: new Date(now.getTime() - MIN_GAP_BETWEEN_STAGES_MS) } },
      select: { id: true },
    });
    if (recent) { result.skipped++; continue; }

    const outcome = await deliverFollowUp(item.id);
    if (outcome.status === 'SENT') result.sent++;
    else if (outcome.status === 'FAILED') result.failed++;
    else result.skipped++;
    if (result.sent + result.failed >= 25) break; // keep each run short; the rest goes out on the next run
  }

  if (result.sent || result.failed) logger.info(`Follow-up automation: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped.`);
  return result;
}
