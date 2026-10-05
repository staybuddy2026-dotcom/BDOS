'use server';

import { UserRole } from '@prisma/client';
import { AuthService } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { hashPassword, verifyPassword, MIN_PASSWORD_LENGTH } from '@/lib/password';
import { encryptSecret } from '@/lib/secrets';
import { isValidEmail, resolveMailbox, sendMail, verifyMailbox, MailError } from '@/lib/mailer';
import { safeRevalidatePath } from '@/lib/revalidate';

// Actions here return `{ error }` instead of throwing, so the real reason reaches the UI
// (thrown server-action errors are redacted in production).

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  openDeals: number;
  wonDeals: number;
  hasMailbox: boolean;
};

const ROLES: UserRole[] = ['ADMIN', 'MANAGER', 'BDE'];

// ---------------------------------------------------------------------------
// Team management
// ---------------------------------------------------------------------------

export async function getTeamMembersAction(): Promise<TeamMember[]> {
  await AuthService.requireRole('ADMIN', 'MANAGER');
  const [users, dealCounts] = await Promise.all([
    db.user.findMany({ orderBy: [{ isActive: 'desc' }, { name: 'asc' }] }),
    db.deal.groupBy({ by: ['ownerId', 'stage'], _count: { _all: true }, where: { ownerId: { not: null } } }),
  ]);
  return users.map((u) => {
    const mine = dealCounts.filter((c) => c.ownerId === u.id);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
      openDeals: mine.filter((c) => c.stage !== 'WON' && c.stage !== 'LOST').reduce((sum, c) => sum + c._count._all, 0),
      wonDeals: mine.filter((c) => c.stage === 'WON').reduce((sum, c) => sum + c._count._all, 0),
      hasMailbox: !!(u.smtpHost && u.smtpUser && u.smtpPassEnc),
    };
  });
}

export async function createTeamMemberAction(input: { name: string; email: string; role: UserRole; password: string }): Promise<{ error?: string }> {
  await AuthService.requireRole('ADMIN');
  const name = input.name?.trim();
  const email = input.email?.trim().toLowerCase();
  if (!name) return { error: 'Enter the team member\'s name.' };
  if (!isValidEmail(email || '')) return { error: 'Enter a valid email address.' };
  if (!ROLES.includes(input.role)) return { error: 'Choose a role.' };
  if ((input.password || '').length < MIN_PASSWORD_LENGTH) return { error: `The password needs at least ${MIN_PASSWORD_LENGTH} characters.` };
  if (await db.user.findUnique({ where: { email } })) return { error: 'Someone with this email is already on the team.' };

  try {
    await db.user.create({ data: { name, email, role: input.role, passwordHash: await hashPassword(input.password) } });
    safeRevalidatePath('/team');
    return {};
  } catch (err) {
    logger.error('Could not create team member', err);
    return { error: 'Could not add this team member. Please try again.' };
  }
}

export async function updateTeamMemberAction(userId: string, patch: { name?: string; role?: UserRole; isActive?: boolean }): Promise<{ error?: string }> {
  const me = await AuthService.requireRole('ADMIN');
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { error: 'Team member not found.' };
  if (patch.role && !ROLES.includes(patch.role)) return { error: 'Choose a role.' };
  if (patch.name !== undefined && !patch.name.trim()) return { error: 'The name cannot be empty.' };

  // Never leave the workspace without an active admin.
  const losesAdmin = target.role === 'ADMIN' && target.isActive && ((patch.role && patch.role !== 'ADMIN') || patch.isActive === false);
  if (losesAdmin) {
    if (target.id === me.id) return { error: 'You cannot remove your own admin access. Ask another admin to do it.' };
    const otherAdmins = await db.user.count({ where: { role: 'ADMIN', isActive: true, id: { not: target.id } } });
    if (otherAdmins === 0) return { error: 'The workspace needs at least one active admin.' };
  }

  try {
    await db.user.update({
      where: { id: userId },
      data: { name: patch.name?.trim(), role: patch.role, isActive: patch.isActive },
    });
    safeRevalidatePath('/team');
    return {};
  } catch (err) {
    logger.error(`Could not update team member ${userId}`, err);
    return { error: 'Could not save the change. Please try again.' };
  }
}

export async function resetTeamMemberPasswordAction(userId: string, newPassword: string): Promise<{ error?: string }> {
  await AuthService.requireRole('ADMIN');
  if ((newPassword || '').length < MIN_PASSWORD_LENGTH) return { error: `The password needs at least ${MIN_PASSWORD_LENGTH} characters.` };
  try {
    await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(newPassword) } });
    return {};
  } catch (err) {
    logger.error(`Could not reset password for ${userId}`, err);
    return { error: 'Could not reset the password. Please try again.' };
  }
}

// ---------------------------------------------------------------------------
// My account
// ---------------------------------------------------------------------------

export type MyAccount = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  signature: string;
  /** Morning email listing what is due today. */
  digestEnabled: boolean;
  mailbox: { host: string; port: number; secure: boolean; user: string; fromName: string; hasPassword: boolean };
  /** Which mailbox outgoing email uses right now; null when nothing is connected. */
  sendingFrom: { address: string; source: 'personal' | 'team' } | null;
};

export async function getMyAccountAction(): Promise<MyAccount> {
  const me = await AuthService.verifySession();
  const [user, mailbox] = await Promise.all([db.user.findUnique({ where: { id: me.id } }), resolveMailbox(me.id)]);
  return {
    id: me.id,
    name: me.name,
    email: me.email,
    role: me.role,
    createdAt: (user?.createdAt || new Date()).toISOString(),
    signature: user?.signature || '',
    digestEnabled: user?.digestEnabled ?? true,
    mailbox: {
      host: user?.smtpHost || '',
      port: user?.smtpPort || 465,
      secure: user?.smtpSecure ?? true,
      user: user?.smtpUser || '',
      fromName: user?.fromName || '',
      hasPassword: !!user?.smtpPassEnc,
    },
    sendingFrom: mailbox ? { address: mailbox.config.fromEmail, source: mailbox.source } : null,
  };
}

export async function updateMyProfileAction(input: { name: string; signature: string; digestEnabled?: boolean }): Promise<{ error?: string }> {
  const me = await AuthService.verifySession();
  if (!input.name?.trim()) return { error: 'Your name cannot be empty.' };
  await db.user.update({ where: { id: me.id }, data: { name: input.name.trim(), signature: input.signature?.trim() || null, digestEnabled: input.digestEnabled } });
  safeRevalidatePath('/profile');
  return {};
}

export async function changeMyPasswordAction(currentPassword: string, newPassword: string): Promise<{ error?: string }> {
  const me = await AuthService.verifySession();
  if ((newPassword || '').length < MIN_PASSWORD_LENGTH) return { error: `The new password needs at least ${MIN_PASSWORD_LENGTH} characters.` };
  const user = await db.user.findUnique({ where: { id: me.id } });
  if (!user || !(await verifyPassword(currentPassword || '', user.passwordHash))) return { error: 'Your current password is not correct.' };
  await db.user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(newPassword) } });
  return {};
}

/**
 * Connects the user's own mailbox. The credentials are checked against the mail server
 * first, so a mailbox that cannot send is never saved.
 */
export async function saveMyMailboxAction(input: { host: string; port: number; secure: boolean; user: string; password?: string; fromName?: string }): Promise<{ error?: string; message?: string }> {
  const me = await AuthService.verifySession();
  const host = input.host?.trim();
  const user = input.user?.trim();
  const port = Number(input.port);
  if (!host) return { error: 'Enter the SMTP host, e.g. smtp.gmail.com.' };
  if (!Number.isInteger(port) || port < 1 || port > 65535) return { error: 'Enter a valid SMTP port (usually 465 or 587).' };
  if (!isValidEmail(user || '')) return { error: 'The mailbox username must be your full email address.' };

  const existing = await db.user.findUnique({ where: { id: me.id }, select: { smtpPassEnc: true } });
  const passEnc = input.password ? encryptSecret(input.password) : existing?.smtpPassEnc;
  if (!passEnc) return { error: 'Enter the mailbox password (an App Password for Gmail or Outlook).' };

  if (input.password) {
    const check = await verifyMailbox({ host, port, secure: input.secure, user, pass: input.password, fromEmail: user });
    if (!check.ok) return { error: check.message };
  }

  await db.user.update({
    where: { id: me.id },
    data: { smtpHost: host, smtpPort: port, smtpSecure: input.secure, smtpUser: user, smtpPassEnc: passEnc, fromName: input.fromName?.trim() || null },
  });
  safeRevalidatePath('/profile');
  return { message: `Mailbox connected. Outreach emails now go out from ${user}.` };
}

export async function removeMyMailboxAction(): Promise<{ error?: string }> {
  const me = await AuthService.verifySession();
  await db.user.update({ where: { id: me.id }, data: { smtpHost: null, smtpPort: null, smtpUser: null, smtpPassEnc: null, fromName: null } });
  safeRevalidatePath('/profile');
  return {};
}

/** Sends a short test email to the signed-in user's own address. */
export async function sendMyTestEmailAction(): Promise<{ error?: string; message?: string }> {
  const me = await AuthService.verifySession();
  try {
    const res = await sendMail(me.id, {
      to: me.email,
      subject: 'BDOS test email',
      body: `Hi ${me.name},\n\nThis is a test email from BDOS. Your mailbox is connected and outreach emails will be sent from this address.`,
    });
    return { message: `Test email sent to ${me.email} from ${res.from}.` };
  } catch (err) {
    if (err instanceof MailError) return { error: err.message };
    logger.error('Test email failed', err);
    return { error: 'The test email could not be sent.' };
  }
}
