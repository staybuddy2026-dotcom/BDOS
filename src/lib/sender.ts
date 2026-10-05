import { AuthService } from '@/lib/auth';
import { db } from '@/lib/db';
import { SettingsService } from '@/lib/settings';

export type SenderIdentity = {
  /** How the person signs: their "from" name in Profile, else their account name. */
  name: string;
  /** Their email signature from Profile, else name and company on two lines. */
  signature: string;
  company: string;
};

const DEFAULT_COMPANY = 'Tiny Script Soft Tech';

/**
 * Who is writing: used to sign generated emails, proposals and replies so each team member's outreach
 * carries their own name rather than a fixed one.
 */
export async function getSenderIdentity(): Promise<SenderIdentity> {
  const company = (await SettingsService.get('companyName', DEFAULT_COMPANY).catch(() => DEFAULT_COMPANY)) || DEFAULT_COMPANY;
  const session = await AuthService.getCurrentUser().catch(() => null);
  const user = session ? await db.user.findUnique({ where: { id: session.id }, select: { name: true, fromName: true, signature: true } }).catch(() => null) : null;
  const name = user?.fromName?.trim() || user?.name?.trim() || session?.name || `The ${company} team`;
  return { name, company, signature: user?.signature?.trim() || `${name}\n${company}` };
}
