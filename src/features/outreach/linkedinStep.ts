import { DraftStatus, FollowUpStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { draftConnectionNote } from '@/features/linkedin/intent';
import { STAGE_TAG } from './sequence';
import type { OutreachMessageDraft } from './types';

/**
 * The LinkedIn half of an email sequence (multi-channel outreach): a connection request with a short
 * note, due when the first email goes out. LinkedIn does not allow sending it from the app, so it is
 * a reminder in Today: "Copy & open LinkedIn" copies the note and opens the profile, then "Mark as
 * sent". It lives on the same deal, so a reply or a booked meeting stops it with the emails.
 * Returns whether a step was scheduled.
 */
export async function scheduleLinkedInConnectStep(params: {
  draft: OutreachMessageDraft;
  /** The sequence's first email, which the note is based on. */
  firstStep?: { subjectLine: string; bodyContent: string };
  postId: string;
  dealId: string | null;
  start: Date;
  senderName: string;
  ownerId: string;
}): Promise<boolean> {
  const { draft, firstStep: first, postId, dealId, start, senderName, ownerId } = params;
  let profileUrl = draft.targetContactLinkedin?.trim();
  const deal = dealId
    ? await db.deal.findUnique({ where: { id: dealId }, select: { primaryContact: { select: { id: true, linkedinUrl: true } } } })
    : null;
  if (!profileUrl) profileUrl = deal?.primaryContact?.linkedinUrl || undefined;
  if (!profileUrl || !/linkedin\.com\/in\//i.test(profileUrl)) return false;

  const id = `${draft.id}-linkedin`;
  // Already sent by hand: keep it, never ask for the same connection request twice.
  const sentBefore = await db.followUp.count({ where: { draftId: id, status: FollowUpStatus.SENT } });
  if (sentBefore) return false;

  const { note } = await draftConnectionNote({
    contactName: draft.targetContactName,
    contactTitle: draft.targetContactTitle,
    companyName: draft.companyName,
    emailSubject: first?.subjectLine,
    emailBody: first?.bodyContent,
    senderName,
  });

  await db.outreachDraft.upsert({
    where: { id },
    update: { originalAiDraft: note, editedDraft: note, status: DraftStatus.APPROVED, approvedAt: new Date(), channel: 'LINKEDIN', dealId, stoppedReason: null, autoSend: false },
    create: {
      id, postId, originalAiDraft: note, editedDraft: note, status: DraftStatus.APPROVED, approvedAt: new Date(),
      channel: 'LINKEDIN', toName: draft.targetContactName || null, ownerId, dealId, autoSend: false,
    },
  });
  await db.followUp.deleteMany({ where: { draftId: id, status: { in: [FollowUpStatus.PENDING, FollowUpStatus.CANCELLED, FollowUpStatus.FAILED] } } });
  await db.followUp.create({
    data: { draftId: id, dueDate: start, status: FollowUpStatus.PENDING, content: `${STAGE_TAG(1)}LinkedIn connection request\n\n${note}` },
  });
  // Today opens the deal contact's profile; fill it in when the contact did not have one yet.
  if (deal?.primaryContact && !deal.primaryContact.linkedinUrl) {
    await db.contact.update({ where: { id: deal.primaryContact.id }, data: { linkedinUrl: profileUrl } }).catch(() => undefined);
  }
  await db.outreachHistory.create({ data: { draftId: id, status: DraftStatus.APPROVED, notes: 'LinkedIn connection request added alongside the email sequence.' } });
  return true;
}
