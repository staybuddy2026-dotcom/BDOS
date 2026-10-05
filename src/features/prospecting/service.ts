import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { UserSession } from '@/lib/auth';
import type { DiscoveryLeadItem } from '@/features/discovery/types';
import type { ApolloPersonMatch } from '@/features/apollo/provider';

/**
 * Prospecting lists kept in the database, so every device and (for the shortlist) every team member
 * sees the same thing:
 *  - the Company 360 shortlist, shared by the team;
 *  - each person's saved Apollo contacts and Universal Search watchlist.
 * Lists that used to live in one JSON setting are imported once, on first use.
 */

const norm = (v?: string | null) => (v || '').toLowerCase().trim();

// ---------------------------------------------------------------------------
// Company 360 shortlist
// ---------------------------------------------------------------------------

export type ShortlistState = {
  /** Shortlisted leads by key (domain, or company id when there is none). */
  leads: Record<string, DiscoveryLeadItem>;
  /** Every domain, company id and key of a shortlisted lead, lower-cased, for quick "is it shortlisted?" checks. */
  ids: string[];
};

export const shortlistKey = (lead: Pick<DiscoveryLeadItem, 'domain' | 'companyId'>) => norm(lead.domain) || norm(lead.companyId);

const LEGACY_SHORTLIST_KEY = 'bdos_company360_migrated_leads';
const LEGACY_SHORTLIST_REMOVED_KEY = 'bdos_company360_removed_ids';
const SHORTLIST_IMPORTED_KEY = 'prospecting_shortlist_imported_at';

async function importLegacyShortlist() {
  if (await db.applicationSettings.findUnique({ where: { key: SHORTLIST_IMPORTED_KEY } })) return;
  const [leadsRow, removedRow] = await Promise.all([
    db.applicationSettings.findUnique({ where: { key: LEGACY_SHORTLIST_KEY } }),
    db.applicationSettings.findUnique({ where: { key: LEGACY_SHORTLIST_REMOVED_KEY } }),
  ]);
  let leads: Record<string, DiscoveryLeadItem> = {};
  let removed: string[] = [];
  try { leads = leadsRow?.value ? JSON.parse(leadsRow.value) : {}; } catch { /* unreadable: nothing to import */ }
  try { removed = removedRow?.value ? (JSON.parse(removedRow.value) as string[]).map(norm) : []; } catch { /* ignore */ }

  let imported = 0;
  for (const lead of Object.values(leads)) {
    if (!lead || typeof lead !== 'object' || !lead.companyName) continue;
    const key = shortlistKey(lead);
    if (!key || removed.includes(key) || removed.includes(norm(lead.companyId))) continue;
    await upsertShortlist(lead, null);
    imported++;
  }
  const value = new Date().toISOString();
  await db.applicationSettings.upsert({ where: { key: SHORTLIST_IMPORTED_KEY }, update: { value }, create: { key: SHORTLIST_IMPORTED_KEY, value } });
  if (imported) logger.info(`Imported ${imported} shortlisted compan${imported === 1 ? 'y' : 'ies'} from the old settings store.`);
}

export async function getShortlist(): Promise<ShortlistState> {
  await importLegacyShortlist();
  const rows = await db.shortlistedCompany.findMany({ orderBy: { createdAt: 'desc' }, take: 1000 });
  const leads: Record<string, DiscoveryLeadItem> = {};
  const ids = new Set<string>();
  for (const row of rows) {
    leads[row.key] = row.data as unknown as DiscoveryLeadItem;
    [row.key, norm(row.domain), norm(row.companyId)].filter(Boolean).forEach((id) => ids.add(id));
  }
  return { leads, ids: [...ids] };
}

export async function upsertShortlist(lead: DiscoveryLeadItem, userId: string | null) {
  const key = shortlistKey(lead);
  if (!key) throw new Error('A company needs a domain or an id to be shortlisted.');
  const data = lead as unknown as Prisma.InputJsonValue;
  await db.shortlistedCompany.upsert({
    where: { key },
    update: { name: lead.companyName, domain: norm(lead.domain) || null, companyId: lead.companyId || null, data },
    create: { key, name: lead.companyName, domain: norm(lead.domain) || null, companyId: lead.companyId || null, data, addedById: userId },
  });
}

export async function removeFromShortlist(domain?: string | null, companyId?: string | null) {
  const d = norm(domain);
  const id = norm(companyId);
  const or: Prisma.ShortlistedCompanyWhereInput[] = [];
  if (d) or.push({ key: d }, { domain: d });
  if (id) or.push({ key: id }, { companyId: { equals: companyId!, mode: 'insensitive' } });
  if (!or.length) return 0;
  return (await db.shortlistedCompany.deleteMany({ where: { OR: or } })).count;
}

// ---------------------------------------------------------------------------
// Saved Apollo contacts (per person)
// ---------------------------------------------------------------------------

export const personKey = (person: Pick<ApolloPersonMatch, 'apolloPersonId' | 'personName' | 'organizationDomain'>) =>
  norm(person.apolloPersonId || `${person.personName}_${person.organizationDomain || ''}`);

const LEGACY_SAVED_PEOPLE_KEY = 'bdos_apollo_saved_people_map';
const savedImportedKey = (userId: string) => `prospecting_saved_people_imported:${userId}`;

async function importLegacySavedPeople(user: UserSession) {
  if (await db.applicationSettings.findUnique({ where: { key: savedImportedKey(user.id) } })) return;
  // Each person's list was stored under their own key; the list from before user accounts belongs to the admin.
  const keys = [`${LEGACY_SAVED_PEOPLE_KEY}:${user.id}`, ...(user.role === 'ADMIN' ? [LEGACY_SAVED_PEOPLE_KEY] : [])];
  const rows = await db.applicationSettings.findMany({ where: { key: { in: keys } } });
  const people: ApolloPersonMatch[] = [];
  for (const row of rows) {
    try { people.push(...Object.values(JSON.parse(row.value) as Record<string, ApolloPersonMatch>)); } catch { /* ignore */ }
  }
  const imported = await savePeople(user.id, people);
  const value = new Date().toISOString();
  await db.applicationSettings.upsert({ where: { key: savedImportedKey(user.id) }, update: { value }, create: { key: savedImportedKey(user.id), value } });
  if (imported) logger.info(`Imported ${imported} saved Apollo contact(s) for ${user.email}.`);
}

export async function getSavedPeople(user: UserSession): Promise<Record<string, ApolloPersonMatch>> {
  await importLegacySavedPeople(user);
  const rows = await db.savedProspect.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 5000 });
  return Object.fromEntries(rows.map((r) => [r.personKey, r.data as unknown as ApolloPersonMatch]));
}

/** Saves (or updates) people for one user. Returns how many were written. */
export async function savePeople(userId: string, people: ApolloPersonMatch[]): Promise<number> {
  let written = 0;
  for (const person of people) {
    if (!person || typeof person !== 'object' || !person.personName) continue;
    const key = personKey(person);
    if (!key) continue;
    const data = person as unknown as Prisma.InputJsonValue;
    await db.savedProspect.upsert({ where: { userId_personKey: { userId, personKey: key } }, update: { data }, create: { userId, personKey: key, data } });
    written++;
  }
  return written;
}

// ---------------------------------------------------------------------------
// Universal Search watchlist (per person)
// ---------------------------------------------------------------------------

export async function getWatchlist(userId: string): Promise<DiscoveryLeadItem[]> {
  const rows = await db.watchedCompany.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 1000 });
  return rows.map((r) => r.data as unknown as DiscoveryLeadItem);
}

export async function watchCompanies(userId: string, leads: DiscoveryLeadItem[]) {
  for (const lead of leads) {
    if (!lead?.companyId) continue;
    const data = lead as unknown as Prisma.InputJsonValue;
    await db.watchedCompany.upsert({ where: { userId_key: { userId, key: lead.companyId } }, update: { data }, create: { userId, key: lead.companyId, data } });
  }
}
