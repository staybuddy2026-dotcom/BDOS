import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { parseUsdAmount } from '@/features/crm/service';
import type { UniversalOpportunity } from './ingestion';

/**
 * Marketplace listings in the database (they used to live in server memory and vanished on every restart).
 * Shared by the in-app actions and the inbound webhook, which has no signed-in user.
 */

export type NewListing = {
  providerId: 'manual' | 'webhook';
  providerName: string;
  title: string;
  description: string;
  budget?: string;
  budgetType?: 'Fixed-Price' | 'Hourly';
  country?: string;
  technologyStack?: string[];
  /** The listing's real page, when the source gave one. */
  projectUrl?: string;
  tags: string[];
};

const clean = (v?: string | null) => (v || '').trim();

/** The same title, country and budget (and page, when there is a real one) is the same listing. */
export function listingHash(title: string, country: string, budget: string, url?: string) {
  const normalized = [title, country, budget, url || ''].map((x) => x.trim().toLowerCase()).join('_');
  return crypto.createHash('md5').update(normalized).digest('hex');
}

/** Whole USD for a fixed-price budget; hourly rates are not a project value. */
export const listingValue = (budget: string, budgetType?: string) =>
  budgetType === 'Hourly' || /\/\s*h(ou)?r|per hour|hourly/i.test(budget) ? null : parseUsdAmount(budget);

/**
 * Fit score from the listing's real fields: budget size, whether a stack is stated, urgency. The same rule
 * drives the "Qualify" check, so a card and its qualification always agree.
 */
export function scoreListing(value: number | null | undefined, stack: string[], urgency?: string) {
  return Math.min(98, 70 + ((value || 0) >= 25000 ? 15 : 5) + (stack.length ? 10 : 0) + (urgency === 'Immediate' ? 5 : 0));
}

/**
 * Saves a listing unless the same one is already stored. Only what the source said is kept: unknown
 * budget, country or stack stay empty instead of being filled with defaults.
 */
export async function saveListing(input: NewListing): Promise<{ opportunity: UniversalOpportunity; isDuplicate: boolean }> {
  const title = clean(input.title).slice(0, 300);
  const budget = clean(input.budget);
  const country = clean(input.country);
  const url = clean(input.projectUrl);
  const hash = listingHash(title, country, budget, url);

  const existing = await db.marketplaceOpportunity.findUnique({ where: { duplicateHash: hash } });
  if (existing) return { opportunity: toOpportunity(existing), isDuplicate: true };

  const stack = (input.technologyStack || []).map(clean).filter(Boolean).slice(0, 20);
  const value = listingValue(budget, input.budgetType);
  const data: Omit<UniversalOpportunity, 'id' | 'status'> = {
    providerId: input.providerId,
    providerName: input.providerName,
    projectTitle: title,
    projectDescription: clean(input.description).slice(0, 10000),
    budget: budget || 'Not stated',
    budgetCurrency: 'USD',
    estimatedValueNumber: value ?? 0,
    budgetType: input.budgetType || (/\/\s*h(ou)?r|per hour|hourly/i.test(budget) ? 'Hourly' : 'Fixed-Price'),
    clientCountry: country || 'Not stated',
    clientTimezone: '',
    technologyStack: stack,
    skills: stack,
    industry: '',
    projectType: input.providerId === 'webhook' ? 'Inbound webhook' : 'CSV import',
    experienceLevel: 'Intermediate',
    engagementModel: 'Project Basis',
    urgency: 'Normal',
    postedDate: new Date().toISOString().slice(0, 10),
    proposalDeadline: '',
    projectUrl: url,
    sourceUrl: url,
    aiOpportunityScore: scoreListing(value, stack),
    duplicateHash: hash,
    tags: input.tags,
    revenuePotential: budget || 'Not stated',
    complexity: 'Medium',
    deliveryRisk: 'Not assessed',
    estimatedTeamSize: '',
    estimatedTimeline: '',
    winningStrategy: '',
  };
  try {
    const row = await db.marketplaceOpportunity.create({
      data: { providerId: input.providerId, title, projectUrl: url, duplicateHash: hash, status: 'QUALIFIED', estimatedValue: value, data: data as unknown as Prisma.InputJsonValue },
    });
    return { opportunity: toOpportunity(row), isDuplicate: false };
  } catch (err) {
    // Two requests with the same listing at once: the other one stored it.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const row = await db.marketplaceOpportunity.findUniqueOrThrow({ where: { duplicateHash: hash } });
      return { opportunity: toOpportunity(row), isDuplicate: true };
    }
    throw err;
  }
}

type Row = { id: string; status: string; data: Prisma.JsonValue };
export const toOpportunity = (row: Row): UniversalOpportunity => ({ ...(row.data as unknown as UniversalOpportunity), id: row.id, status: row.status as UniversalOpportunity['status'] });

export async function listListings(): Promise<UniversalOpportunity[]> {
  const rows = await db.marketplaceOpportunity.findMany({ where: { status: { not: 'ARCHIVED' } }, orderBy: { createdAt: 'desc' }, take: 1000 });
  return rows.map(toOpportunity);
}

export async function countListingsByProvider(): Promise<Record<string, number>> {
  const groups = await db.marketplaceOpportunity.groupBy({ by: ['providerId'], _count: { _all: true } });
  return Object.fromEntries(groups.map((g) => [g.providerId, g._count._all]));
}

/**
 * Splits CSV text into rows of fields. Handles quoted fields, so "$15,000" or a description with commas
 * stays one field, and "" inside quotes is a literal quote.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field.trim()); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field.trim()); field = '';
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
