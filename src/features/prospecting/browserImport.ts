'use client';

import { importBrowserListsAction } from './actions';

/**
 * Before Phase B these lists lived in each browser's localStorage. The first page that loads in a browser
 * sends whatever is still there to the database once, then clears it. Safe to call from several pages:
 * a key is only cleared after the server confirmed the import.
 */
const KEYS = {
  shortlist: ['bdos_company360_migrated_leads', 'bdos_company360_migrated_ids', 'bdos_company360_removed_ids'],
  savedPeople: ['bdos_apollo_saved_people_map'],
  watchlist: ['bdos_watchlist_leads', 'bdos_watchlist_ids'],
  notes: ['bdos_outreach_research_notes'],
  // No longer used: deals are looked up in the CRM.
  obsolete: ['bdos_created_deals'],
} as const;

let running: Promise<number> | null = null;

function read<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

export function importBrowserListsOnce(): Promise<number> {
  if (typeof window === 'undefined') return Promise.resolve(0);
  if (running) return running;
  running = (async () => {
    try {
      const all = Object.values(KEYS).flat();
      if (!all.some((k) => localStorage.getItem(k) !== null)) return 0;
      const res = await importBrowserListsAction({
        shortlist: read(KEYS.shortlist[0]),
        shortlistRemoved: read(KEYS.shortlist[2]),
        savedPeople: read(KEYS.savedPeople[0]),
        watchlist: read(KEYS.watchlist[0]),
        notes: read(KEYS.notes[0]),
      });
      if (res.error) return 0;
      all.forEach((k) => { try { localStorage.removeItem(k); } catch { /* storage unavailable */ } });
      return res.imported;
    } catch {
      return 0;
    }
  })();
  return running;
}
