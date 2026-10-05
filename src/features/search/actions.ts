'use server';

import { AuthService } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { dealScope } from '@/features/crm/service';
import type { DealStage } from '@prisma/client';

export type DealHit = { id: string; company: string; title: string; stage: DealStage; contact: string | null; ownerName: string | null };

/** Deals the user may open whose company, title, domain or contact matches the query (command palette). */
export async function searchDealsAction(query: string): Promise<DealHit[]> {
  const user = await AuthService.verifySession();
  const q = query.trim().slice(0, 100);
  if (q.length < 2) return [];
  try {
    const contains = { contains: q, mode: 'insensitive' as const };
    const deals = await db.deal.findMany({
      where: {
        AND: [
          dealScope(user),
          {
            OR: [
              { title: contains },
              { company: { name: contains } },
              { company: { domain: contains } },
              { company: { contacts: { some: { OR: [{ name: contains }, { email: contains }] } } } },
            ],
          },
        ],
      },
      include: { company: { select: { name: true } }, primaryContact: { select: { name: true } }, owner: { select: { name: true } } },
      orderBy: { lastActivityAt: 'desc' },
      take: 8,
    });
    return deals.map((d) => ({ id: d.id, company: d.company.name, title: d.title, stage: d.stage, contact: d.primaryContact?.name ?? null, ownerName: d.owner?.name ?? null }));
  } catch (err) {
    logger.error('Command palette search failed', err);
    return [];
  }
}
