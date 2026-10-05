import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { MailError, sendMail } from '@/lib/mailer';
import { runDueFollowUps } from '@/features/outreach/sequence';
import { dayBounds, getTodaySummary } from '@/features/today/service';
import type { TodayData } from '@/features/today/service';

/**
 * Background work the app does on its own: sending due outreach emails and the morning
 * summary. Run by the in-process scheduler (see scheduler.ts) and by POST /api/cron/run.
 */

/** Hour of the day (server time) from which the morning summary goes out. */
const DIGEST_HOUR = 9;

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/** Plain-text summary of what is due today. Returns null when there is nothing worth an email. */
export function buildDigest(name: string, data: TodayData, appUrl?: string): { subject: string; body: string } | null {
  const failed = data.followUps.filter((f) => f.status === 'FAILED');
  const manual = data.followUps.filter((f) => f.mode === 'MANUAL' && f.status !== 'FAILED');
  const automatic = data.followUps.filter((f) => f.mode === 'AUTO' && f.status === 'PENDING');
  if (!data.actionCount && !data.meetings.length && !automatic.length) return null;

  const lines: string[] = [`Hi ${name.split(/\s+/)[0]},`, '', 'Here is your day:'];
  const section = (title: string, items: string[]) => { if (items.length) lines.push('', `${title} (${items.length})`, ...items.map((i) => `  - ${i}`)); };

  section('Meetings today', data.meetings.map((m) => `${formatTime(m.startTime)} ${m.title} (${m.company})`));
  section('Emails that could not be sent', failed.map((f) => `${f.company}: stage ${f.stage ?? ''} - ${f.error || 'unknown error'}`));
  section('Follow-ups to send yourself', manual.map((f) => `${f.company}: ${f.channel === 'LINKEDIN' ? 'LinkedIn' : 'email'} stage ${f.stage ?? ''}${f.overdue ? ' (overdue)' : ''}`));
  section('Next actions on your deals', data.nextActions.map((a) => `${a.company}: ${a.nextAction}${a.overdue ? ' (overdue)' : ''}`));
  section('Tasks', data.tasks.map((t) => `${t.title}${t.deal ? ` (${t.deal.company})` : ''}${t.overdue ? ' (overdue)' : ''}`));
  section('Going out automatically today', automatic.map((f) => `${f.company}: stage ${f.stage ?? ''} to ${f.toEmail} at ${formatTime(f.dueDate)}`));
  if (data.staleDeals.length) lines.push('', `${data.staleDeals.length} of your deals had no activity for a week: ${data.staleDeals.slice(0, 5).map((d) => d.company).join(', ')}${data.staleDeals.length > 5 ? '…' : ''}`);
  if (data.unassignedLeads) lines.push('', `${data.unassignedLeads} unassigned lead${data.unassignedLeads === 1 ? ' is' : 's are'} waiting to be claimed.`);
  if (appUrl) lines.push('', `Open your day: ${appUrl.replace(/\/$/, '')}/today`);
  lines.push('', 'You can turn this email off under Profile.');

  const todo = data.actionCount;
  return { subject: `Your day: ${todo} to do${data.meetings.length ? `, ${data.meetings.length} meeting${data.meetings.length === 1 ? '' : 's'}` : ''}`, body: lines.join('\n') };
}

/** Sends each team member their morning summary, once a day, to their own address. */
export async function runDailyDigests(now = new Date()): Promise<{ sent: number }> {
  if (now.getHours() < DIGEST_HOUR) return { sent: 0 };
  const { start } = dayBounds(now);
  const users = await db.user.findMany({
    where: { isActive: true, digestEnabled: true, OR: [{ lastDigestAt: null }, { lastDigestAt: { lt: start } }] },
    select: { id: true, name: true, email: true, role: true },
  });

  let sent = 0;
  for (const user of users) {
    // Claim today's summary first, so two runs at the same moment cannot both send it.
    const claimed = await db.user.updateMany({ where: { id: user.id, OR: [{ lastDigestAt: null }, { lastDigestAt: { lt: start } }] }, data: { lastDigestAt: now } });
    if (claimed.count !== 1) continue;
    try {
      const digest = buildDigest(user.name, await getTodaySummary(user, now), process.env.APP_URL);
      if (!digest) continue;
      await sendMail(user.id, { to: user.email, subject: digest.subject, body: digest.body });
      sent++;
    } catch (err) {
      // No mailbox connected is normal for someone who has not set one up: skip quietly.
      if (!(err instanceof MailError)) logger.error(`Morning summary for ${user.email} failed`, err);
    }
  }
  if (sent) logger.info(`Morning summary sent to ${sent} team member${sent === 1 ? '' : 's'}.`);
  return { sent };
}

export type AutomationResult = { followUps: { sent: number; failed: number; skipped: number }; digests: { sent: number }; skipped?: boolean };

const state = globalThis as typeof globalThis & { __bdosAutomationRunning?: boolean };

/** One automation pass. Overlapping calls in the same process are skipped; across processes the jobs claim rows themselves. */
export async function runAutomation(now = new Date()): Promise<AutomationResult> {
  if (state.__bdosAutomationRunning) return { followUps: { sent: 0, failed: 0, skipped: 0 }, digests: { sent: 0 }, skipped: true };
  state.__bdosAutomationRunning = true;
  try {
    const followUps = await runDueFollowUps(now).catch((err) => { logger.error('Follow-up automation failed', err); return { sent: 0, failed: 0, skipped: 0 }; });
    const digests = await runDailyDigests(now).catch((err) => { logger.error('Morning summary job failed', err); return { sent: 0 }; });
    return { followUps, digests };
  } finally {
    state.__bdosAutomationRunning = false;
  }
}
