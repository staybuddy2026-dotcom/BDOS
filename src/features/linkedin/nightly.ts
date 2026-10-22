import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { SettingsService } from '@/lib/settings';
import { scanLinkedInReEngagements } from '@/features/reengagement/linkedin';
import { isLinkedInConfigured } from './provider';
import { isLinkedInEnabledSetting } from './settings';
import { runKeywordScan } from './scan';

/**
 * The overnight LinkedIn job: scans the keyword library for new posts (scored for buying intent,
 * waiting in the LinkedIn inbox in the morning) and checks contacted leads for new posts worth a
 * re-engagement. Runs once a day from the automation pass (features/automation/run.ts).
 *
 * Every run spends Apify credit, so it is OFF until someone turns it on: Settings > LinkedIn
 * ("Scan every night"), or LINKEDIN_NIGHTLY_SCAN=true in .env (LINKEDIN_NIGHTLY_SCAN=false always wins).
 * LINKEDIN_NIGHTLY_HOUR (default 2, server time) and LINKEDIN_NIGHTLY_MAX_KEYWORDS (default 10) tune it.
 */

// New key on purpose: the old "linkedinNightlyScan" row was saved as "true" by default on every Settings save,
// so it does not show that anyone actually chose to pay for nightly runs.
export const NIGHTLY_SETTING = 'linkedinNightlyScanOptIn';
const LAST_RUN_KEY = 'linkedinNightlyLastRun';
const LAST_RESULT_KEY = 'linkedinNightlyLastResult';

export type NightlyLinkedInSummary = {
  ranAt: string;
  postsFound: number;
  keywordsScanned: number;
  reEngagements: number;
  profilesChecked: number;
  error?: string;
};

const localDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export async function isNightlyScanEnabled(): Promise<boolean> {
  const env = (process.env.LINKEDIN_NIGHTLY_SCAN || '').toLowerCase();
  if (env === 'false') return false;
  if (env === 'true') return true;
  return (await SettingsService.get(NIGHTLY_SETTING, 'false')) === 'true';
}

export async function getLastNightlySummary(): Promise<NightlyLinkedInSummary | null> {
  try {
    const raw = await SettingsService.get(LAST_RESULT_KEY, '');
    return raw ? (JSON.parse(raw) as NightlyLinkedInSummary) : null;
  } catch {
    return null;
  }
}

/** Runs the job if it is due today; otherwise does nothing. Safe to call every automation pass. */
export async function runNightlyLinkedIn(now = new Date()): Promise<NightlyLinkedInSummary | null> {
  const hour = Math.min(23, Math.max(0, Number(process.env.LINKEDIN_NIGHTLY_HOUR ?? 2) || 0));
  if (now.getHours() < hour) return null;
  if (!(await isNightlyScanEnabled())) return null;
  if (!(await isLinkedInConfigured()) || !(await isLinkedInEnabledSetting())) return null;

  // Claim today's run first, so two automation passes (or two server processes) cannot both pay for it.
  const today = localDay(now);
  const claimed = await db.applicationSettings.updateMany({ where: { key: LAST_RUN_KEY, NOT: { value: today } }, data: { value: today } });
  if (claimed.count === 0) {
    const existing = await db.applicationSettings.findUnique({ where: { key: LAST_RUN_KEY } });
    if (existing) return null; // already ran today
    try {
      await db.applicationSettings.create({ data: { key: LAST_RUN_KEY, value: today } });
    } catch {
      return null; // another process created it a moment ago
    }
  }

  const maxKeywords = Math.min(15, Math.max(1, Number(process.env.LINKEDIN_NIGHTLY_MAX_KEYWORDS) || 10));
  const summary: NightlyLinkedInSummary = { ranAt: now.toISOString(), postsFound: 0, keywordsScanned: 0, reEngagements: 0, profilesChecked: 0 };

  try {
    const scan = await runKeywordScan({ timeframe: '7d', maxKeywords, maxPostsPerKeyword: 15 });
    summary.postsFound = scan.created;
    summary.keywordsScanned = scan.scanned;
    if (scan.error) summary.error = scan.error.message;

    // Without credit the re-engagement checks would fail the same way.
    if (!scan.error) {
      const re = await scanLinkedInReEngagements(now);
      summary.reEngagements = re.created;
      summary.profilesChecked = re.checked;
      if (re.error) summary.error = re.error.message;
    }
  } catch (err) {
    logger.error('Nightly LinkedIn job failed', err);
    summary.error = 'The nightly LinkedIn job failed. See the server log.';
  }

  await SettingsService.set(LAST_RESULT_KEY, JSON.stringify(summary)).catch(() => undefined);
  logger.info(
    `Nightly LinkedIn job: ${summary.postsFound} new post${summary.postsFound === 1 ? '' : 's'} from ${summary.keywordsScanned} keyword${summary.keywordsScanned === 1 ? '' : 's'}, ` +
      `${summary.reEngagements} re-engagement${summary.reEngagements === 1 ? '' : 's'}${summary.error ? ` (${summary.error})` : ''}.`
  );
  return summary;
}
