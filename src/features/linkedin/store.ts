import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Small persistent side-store for LinkedIn post metadata that the LinkedInPost table has no
 * columns for (author profile URL, engagement split). Kept in ApplicationSettings like the
 * app's other JSON stores, so no schema migration is needed.
 */

export type LinkedInPostMeta = {
  authorProfileUrl?: string;
  authorType?: 'profile' | 'company';
  likes?: number;
  comments?: number;
  shares?: number;
  /** Buying-intent score given when the post was saved (see features/linkedin/intent.ts). */
  intentScore?: number;
  intentReason?: string;
  savedAt: string;
};

const KEY = 'linkedin_post_meta';
const MAX_ENTRIES = 1500;

async function readAll(): Promise<Record<string, LinkedInPostMeta>> {
  try {
    const row = await db.applicationSettings.findUnique({ where: { key: KEY } });
    return row?.value ? (JSON.parse(row.value) as Record<string, LinkedInPostMeta>) : {};
  } catch (err) {
    logger.warn('Could not read LinkedIn post metadata', { error: String(err) });
    return {};
  }
}

export async function getPostMetaMap(): Promise<Record<string, LinkedInPostMeta>> {
  return readAll();
}

export async function savePostMeta(entries: Record<string, Omit<LinkedInPostMeta, 'savedAt'>>): Promise<void> {
  const urls = Object.keys(entries);
  if (!urls.length) return;
  try {
    const all = await readAll();
    const now = new Date().toISOString();
    // Merge, so adding an intent score later keeps the author link saved earlier.
    for (const url of urls) all[url] = { ...all[url], ...entries[url], savedAt: now };
    // Keep the newest entries only.
    const trimmed = Object.entries(all)
      .sort((a, b) => b[1].savedAt.localeCompare(a[1].savedAt))
      .slice(0, MAX_ENTRIES);
    const value = JSON.stringify(Object.fromEntries(trimmed));
    await db.applicationSettings.upsert({ where: { key: KEY }, update: { value }, create: { key: KEY, value } });
  } catch (err) {
    logger.warn('Could not save LinkedIn post metadata', { error: String(err) });
  }
}
