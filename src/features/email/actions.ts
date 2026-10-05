'use server';

import { AuthService } from '@/lib/auth';
import { AppError } from '@/lib/errors';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { isValidEmail, MailError, resolveMailbox, sendMail } from '@/lib/mailer';
import { safeRevalidatePath } from '@/lib/revalidate';
import { advanceDealStage, createLead, getAccessibleDeal, logActivity } from '@/features/crm/service';
import { markStageSentAction } from '@/features/outreach/actions';
import type { OutreachMessageDraft } from '@/features/outreach/types';

// These actions return `{ error }` instead of throwing, so the real reason (wrong mailbox
// password, rejected recipient) reaches the UI; thrown errors are redacted in production.

export type MailboxStatus = {
  connected: boolean;
  /** Address outgoing email is sent from. */
  address?: string;
  source?: 'personal' | 'team';
  signature: string;
};

/** Whether the signed-in user can send email right now, and from which address. */
export async function getMailboxStatusAction(): Promise<MailboxStatus> {
  const me = await AuthService.verifySession();
  const [mailbox, user] = await Promise.all([resolveMailbox(me.id), db.user.findUnique({ where: { id: me.id }, select: { signature: true } })]);
  return { connected: !!mailbox, address: mailbox?.config.fromEmail, source: mailbox?.source, signature: user?.signature || '' };
}

const emailDetails = (to: string, subject: string, body: string) => `To: ${to}\nSubject: ${subject}\n\n${body}`.slice(0, 8000);

/** Sends an email to a deal's contact from the user's mailbox and records it on the deal timeline. */
export async function sendDealEmailAction(input: { dealId: string; contactId: string; subject: string; body: string }): Promise<{ error?: string; message?: string }> {
  try {
    const user = await AuthService.verifySession();
    const deal = await getAccessibleDeal(user, input.dealId);
    const contact = await db.contact.findFirst({ where: { id: input.contactId, companyId: deal.companyId } });
    if (!contact) return { error: 'Contact not found.' };
    if (!contact.email) return { error: `${contact.name} has no email address. Add one first.` };

    const sent = await sendMail(user.id, { to: contact.email, subject: input.subject, body: input.body });

    await db.$transaction(async (tx) => {
      await logActivity(tx, { dealId: deal.id, type: 'EMAIL', title: `Email sent to ${contact.name}: ${input.subject.trim()}`, details: emailDetails(contact.email!, input.subject.trim(), input.body), userId: user.id, contactId: contact.id });
      await advanceDealStage(tx, deal, 'CONTACTED', { userId: user.id, reason: 'First email sent.' });
    });
    safeRevalidatePath('/crm');
    return { message: `Email sent to ${contact.email} from ${sent.from}.` };
  } catch (err) {
    if (err instanceof MailError || err instanceof AppError) return { error: err.message };
    logger.error('Failed to send deal email', err);
    return { error: 'The email could not be sent. Please try again.' };
  }
}

/**
 * Sends the active stage of an outreach sequence straight from the user's mailbox, marks the
 * stage as sent and records the email on the company's CRM deal (creating the deal if needed).
 */
export async function sendOutreachEmailAction(draft: OutreachMessageDraft): Promise<{ error?: string; message?: string; draft?: OutreachMessageDraft }> {
  try {
    const user = await AuthService.verifySession();
    if (draft.channel === 'LINKEDIN') return { error: 'LinkedIn messages are sent by hand from LinkedIn.' };
    const to = draft.targetContactEmail?.trim() || '';
    if (!isValidEmail(to)) return { error: 'This contact has no valid email address. Enrich the contact with Apollo first.' };
    if (draft.sentStages?.includes(draft.followupStage)) return { error: 'This stage was already sent.' };

    const sent = await sendMail(user.id, { to, subject: draft.subjectLine, body: draft.bodyContent });

    // From here on the email is out: never report a failure that would tempt a second send.
    let marked: OutreachMessageDraft | undefined;
    try {
      marked = (await markStageSentAction(draft, draft.followupStage)).draft;
    } catch (err) {
      logger.error(`Outreach email to ${to} was sent but the stage could not be marked as sent`, err);
    }

    // Keep the CRM in step. A CRM problem must not report the (already sent) email as failed.
    try {
      const lead = await createLead({
        company: { name: draft.companyName, domain: draft.domain },
        contact: draft.targetContactName ? { name: draft.targetContactName, title: draft.targetContactTitle, email: to, linkedinUrl: draft.targetContactLinkedin } : null,
        source: 'COMPANY360',
        ownerId: user.id,
        actorId: user.id,
        note: { title: 'Created from the AI Outreach Generator' },
      });
      const deal = await db.deal.findUnique({ where: { id: lead.dealId } });
      // Linked to the deal, a reply or a booked meeting stops the remaining stages.
      await db.outreachDraft.updateMany({ where: { id: draft.id, dealId: null }, data: { dealId: lead.dealId } });
      if (deal) {
        await db.$transaction(async (tx) => {
          // Whoever starts the conversation owns the lead.
          if (!deal.ownerId) await tx.deal.update({ where: { id: deal.id }, data: { ownerId: user.id } });
          await logActivity(tx, { dealId: deal.id, type: 'EMAIL', title: `Outreach email sent to ${draft.targetContactName || to}: ${draft.subjectLine.trim()}`, details: emailDetails(to, draft.subjectLine.trim(), draft.bodyContent), userId: user.id });
          await advanceDealStage(tx, deal, 'CONTACTED', { userId: user.id, reason: 'First outreach email sent.' });
        });
      }
      safeRevalidatePath('/crm');
    } catch (err) {
      logger.error(`Outreach email to ${to} was sent but could not be recorded in the CRM`, err);
    }

    return {
      message: marked ? `Email sent to ${to} from ${sent.from}.` : `Email sent to ${to}, but it could not be recorded. Click "Mark as sent" so it is not sent twice.`,
      draft: marked,
    };
  } catch (err) {
    if (err instanceof MailError || err instanceof AppError) return { error: err.message };
    logger.error('Failed to send outreach email', err);
    return { error: 'The email could not be sent. Please try again.' };
  }
}

/** Sends the current outreach stage to the user's own address, so they can see how it reads. */
export async function sendOutreachTestEmailAction(to: string, subject: string, body: string): Promise<{ error?: string; message?: string }> {
  try {
    const user = await AuthService.verifySession();
    const sent = await sendMail(user.id, { to, subject: `[TEST] ${subject}`, body });
    return { message: `Test email sent to ${to.trim()} from ${sent.from}.` };
  } catch (err) {
    if (err instanceof MailError || err instanceof AppError) return { error: err.message };
    logger.error('Failed to send outreach test email', err);
    return { error: 'The test email could not be sent. Please try again.' };
  }
}
