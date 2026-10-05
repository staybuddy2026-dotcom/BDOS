'use server';

import { AuthService } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { DiscoveryLeadItem } from '@/features/discovery/types';
import type { ApolloPersonMatch } from '@/features/apollo/provider';
import {
  getSavedPeople, getShortlist, getWatchlist, personKey, removeFromShortlist, savePeople, shortlistKey, upsertShortlist, watchCompanies,
  type ShortlistState,
} from './service';

type Result<T> = T & { error?: string };

async function guard<T extends object>(label: string, fallback: T, fn: () => Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await fn();
  } catch (err) {
    logger.error(`Prospecting action failed: ${label}`, err);
    return { ...fallback, error: 'Could not save. Please try again.' };
  }
}

const EMPTY_SHORTLIST: ShortlistState = { leads: {}, ids: [] };

// ---------- Company 360 shortlist (shared by the team) ----------

export async function getShortlistAction(): Promise<ShortlistState> {
  await AuthService.verifySession();
  return getShortlist();
}

export async function addToShortlistAction(lead: DiscoveryLeadItem): Promise<Result<ShortlistState>> {
  const user = await AuthService.verifySession();
  if (!lead?.companyName || !shortlistKey(lead)) return { ...EMPTY_SHORTLIST, error: 'This company has no website or id, so it cannot be shortlisted.' };
  return guard('addToShortlist', EMPTY_SHORTLIST, async () => {
    await upsertShortlist(lead, user.id);
    return getShortlist();
  });
}

export async function removeFromShortlistAction(domain: string, companyId: string): Promise<Result<ShortlistState>> {
  await AuthService.verifySession();
  return guard('removeFromShortlist', EMPTY_SHORTLIST, async () => {
    await removeFromShortlist(domain, companyId);
    return getShortlist();
  });
}

// ---------- Saved Apollo contacts (per person) ----------

export async function getSavedPeopleAction(): Promise<Record<string, ApolloPersonMatch>> {
  const user = await AuthService.verifySession();
  return getSavedPeople(user);
}

/** Saves a contact, or updates the saved copy (e.g. after their email was revealed). */
export async function savePersonAction(person: ApolloPersonMatch): Promise<{ error?: string }> {
  const user = await AuthService.verifySession();
  return guard('savePerson', {}, async () => {
    if (!(await savePeople(user.id, [person]))) return { error: 'This contact has no name, so it cannot be saved.' };
    return {};
  });
}

export async function unsavePersonAction(key: string): Promise<{ error?: string }> {
  const user = await AuthService.verifySession();
  return guard('unsavePerson', {}, async () => {
    await db.savedProspect.deleteMany({ where: { userId: user.id, personKey: key.toLowerCase().trim() } });
    return {};
  });
}

// ---------- Universal Search watchlist (per person) ----------

export async function getWatchlistAction(): Promise<DiscoveryLeadItem[]> {
  const user = await AuthService.verifySession();
  return getWatchlist(user.id);
}

export async function setWatchedAction(lead: DiscoveryLeadItem, watched: boolean): Promise<{ error?: string }> {
  const user = await AuthService.verifySession();
  if (!lead?.companyId) return { error: 'This company has no id, so it cannot be watched.' };
  return guard('setWatched', {}, async () => {
    if (watched) await watchCompanies(user.id, [lead]);
    else await db.watchedCompany.deleteMany({ where: { userId: user.id, key: lead.companyId } });
    return {};
  });
}

// ---------- Research notes per company (shared by the team) ----------

const cleanDomain = (d: string) => d.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0];

export async function getResearchNotesAction(domain: string): Promise<{ notes: string; updatedBy: string | null; updatedAt: string | null }> {
  await AuthService.verifySession();
  const key = cleanDomain(domain || '');
  if (!key) return { notes: '', updatedBy: null, updatedAt: null };
  const row = await db.companyResearchNote.findUnique({ where: { domain: key }, include: { updatedBy: { select: { name: true } } } });
  return { notes: row?.notes || '', updatedBy: row?.updatedBy?.name ?? null, updatedAt: row?.updatedAt.toISOString() ?? null };
}

export async function saveResearchNotesAction(domain: string, notes: string): Promise<{ error?: string }> {
  const user = await AuthService.verifySession();
  const key = cleanDomain(domain || '');
  if (!key) return { error: 'Pick a company first.' };
  return guard('saveResearchNotes', {}, async () => {
    const text = (notes || '').slice(0, 20000);
    if (!text.trim()) await db.companyResearchNote.deleteMany({ where: { domain: key } });
    else await db.companyResearchNote.upsert({ where: { domain: key }, update: { notes: text, updatedById: user.id }, create: { domain: key, notes: text, updatedById: user.id } });
    return {};
  });
}

// ---------- One-time move of lists kept in this browser ----------

/**
 * Lists used to be kept in each browser's localStorage. Pages send what they find there once; it is merged
 * into the database (nothing already saved is overwritten) and the page then clears the browser copy.
 */
export async function importBrowserListsAction(payload: {
  shortlist?: Record<string, DiscoveryLeadItem>;
  /** Companies this browser had removed from the shortlist: never brought back. */
  shortlistRemoved?: string[];
  savedPeople?: Record<string, ApolloPersonMatch>;
  watchlist?: Record<string, DiscoveryLeadItem>;
  notes?: Record<string, string>;
}): Promise<{ imported: number; error?: string }> {
  const user = await AuthService.verifySession();
  return guard('importBrowserLists', { imported: 0 }, async () => {
    let imported = 0;
    const current = await getShortlist();
    const serverRemoved = await db.applicationSettings.findUnique({ where: { key: 'bdos_company360_removed_ids' } });
    let removedOnServer: string[] = [];
    try { removedOnServer = serverRemoved?.value ? JSON.parse(serverRemoved.value) : []; } catch { /* ignore */ }
    const removed = new Set([...removedOnServer, ...(payload.shortlistRemoved || [])].map((x) => String(x).toLowerCase().trim()));
    for (const lead of Object.values(payload.shortlist || {}).slice(0, 500)) {
      const key = lead?.companyName ? shortlistKey(lead) : '';
      if (!key || current.leads[key] || removed.has(key) || removed.has((lead.companyId || '').toLowerCase().trim())) continue;
      await upsertShortlist(lead, user.id);
      imported++;
    }
    const saved = await getSavedPeople(user);
    const newPeople = Object.values(payload.savedPeople || {}).slice(0, 2000).filter((p) => p?.personName && !saved[personKey(p)]);
    imported += await savePeople(user.id, newPeople);
    const watched = Object.values(payload.watchlist || {}).slice(0, 500).filter((l) => l?.companyId);
    await watchCompanies(user.id, watched);
    imported += watched.length;
    for (const [domain, text] of Object.entries(payload.notes || {}).slice(0, 500)) {
      const key = cleanDomain(domain);
      if (!key || !text?.trim()) continue;
      const exists = await db.companyResearchNote.findUnique({ where: { domain: key }, select: { domain: true } });
      if (!exists) { await db.companyResearchNote.create({ data: { domain: key, notes: text.slice(0, 20000), updatedById: user.id } }); imported++; }
    }
    if (imported) logger.info(`Moved ${imported} browser-stored list item(s) to the database for ${user.email}.`);
    return { imported };
  });
}
