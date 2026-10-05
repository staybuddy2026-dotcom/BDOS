import nodemailer from 'nodemailer';
import { db } from './db';
import { logger } from './logger';
import { decryptSecret } from './secrets';

export type MailboxConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName?: string;
  fromEmail: string;
};

export type ResolvedMailbox = {
  config: MailboxConfig;
  /** 'personal' = the team member's own mailbox, 'team' = the shared SMTP_* mailbox from the environment. */
  source: 'personal' | 'team';
  replyTo?: string;
};

export class MailError extends Error {}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isValidEmail = (value: string) => EMAIL_RE.test(value.trim());

function teamMailbox(): MailboxConfig | null {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  const port = parseInt(process.env.SMTP_PORT || '465', 10) || 465;
  return {
    host: SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
    user: SMTP_USER,
    pass: SMTP_PASS,
    fromName: process.env.SMTP_FROM_NAME || undefined,
    fromEmail: process.env.SMTP_FROM || SMTP_USER,
  };
}

/** The mailbox a user sends from: their own if connected, otherwise the team mailbox. */
export async function resolveMailbox(userId: string): Promise<ResolvedMailbox | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, smtpHost: true, smtpPort: true, smtpSecure: true, smtpUser: true, smtpPassEnc: true, fromName: true },
  });

  if (user?.smtpHost && user.smtpUser && user.smtpPassEnc) {
    const pass = decryptSecret(user.smtpPassEnc);
    if (pass) {
      const port = user.smtpPort || 465;
      return {
        source: 'personal',
        config: { host: user.smtpHost, port, secure: user.smtpSecure, user: user.smtpUser, pass, fromName: user.fromName || user.name, fromEmail: user.smtpUser },
      };
    }
    logger.warn(`Saved mailbox password for user ${userId} could not be decrypted; falling back to the team mailbox.`);
  }

  const team = teamMailbox();
  if (!team) return null;
  // Replies to mail sent from the shared mailbox should still reach the person who sent it.
  return { source: 'team', config: { ...team, fromName: user?.name ? `${user.name}${team.fromName ? ` (${team.fromName})` : ''}` : team.fromName }, replyTo: user?.email };
}

function createTransport(config: MailboxConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });
}

function friendlyError(err: unknown): string {
  const e = err as { code?: string; responseCode?: number; message?: string };
  switch (e?.code) {
    case 'EAUTH':
      return 'The mail server rejected the username or password. For Gmail and Outlook use an App Password, not your normal password.';
    case 'ECONNECTION':
    case 'ETIMEDOUT':
    case 'ESOCKET':
    case 'EDNS':
    case 'ENOTFOUND':
    case 'ECONNREFUSED':
      return 'Could not reach the mail server. Check the SMTP host, port and SSL setting.';
    case 'EENVELOPE':
      return 'The mail server rejected the recipient address.';
    default:
      return e?.message ? `The mail server returned an error: ${e.message}` : 'The email could not be sent.';
  }
}

/** Checks that the mailbox accepts the credentials, without sending anything. */
export async function verifyMailbox(config: MailboxConfig): Promise<{ ok: boolean; message: string }> {
  try {
    await createTransport(config).verify();
    return { ok: true, message: `Connected to ${config.host} as ${config.user}.` };
  } catch (err) {
    return { ok: false, message: friendlyError(err) };
  }
}

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Sends a plain-text email from the user's mailbox. Throws MailError with a message that is safe to show.
 */
export async function sendMail(userId: string, mail: { to: string; subject: string; body: string }): Promise<{ messageId: string; from: string; source: ResolvedMailbox['source'] }> {
  const to = mail.to.trim();
  if (!isValidEmail(to)) throw new MailError('The recipient email address is not valid.');
  if (!mail.subject.trim()) throw new MailError('Add a subject line.');
  if (!mail.body.trim()) throw new MailError('The email body is empty.');

  const mailbox = await resolveMailbox(userId);
  if (!mailbox) throw new MailError('No mailbox is connected. Add your SMTP details under Profile, or ask your admin to set the team SMTP_* settings.');

  const { config, replyTo } = mailbox;
  const from = config.fromName ? { name: config.fromName, address: config.fromEmail } : config.fromEmail;
  try {
    const info = await createTransport(config).sendMail({
      from,
      to,
      replyTo,
      subject: mail.subject.trim(),
      text: mail.body,
      html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#111">${escapeHtml(mail.body).replace(/\r?\n/g, '<br>')}</div>`,
    });
    if (info.rejected?.length) throw new MailError(`The mail server rejected ${info.rejected.join(', ')}.`);
    logger.info(`Email sent to ${to} via ${mailbox.source} mailbox (${info.messageId}).`);
    return { messageId: info.messageId, from: config.fromEmail, source: mailbox.source };
  } catch (err) {
    if (err instanceof MailError) throw err;
    logger.error(`Failed to send email to ${to}`, err);
    throw new MailError(friendlyError(err));
  }
}
