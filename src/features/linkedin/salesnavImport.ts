import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { createLead, logActivity } from '@/features/crm/service';
import { isLinkedInConfigured, linkedinProvider } from './provider';
import { isLinkedInEnabledSetting } from './settings';
import { cleanUrl, isPublicProfileUrl, isSalesNavLeadUrl, MAX_SALESNAV_IMPORT } from './salesnav';
import type { SalesNavLead } from './salesnav';

/** Timeline title of the import entry; the CRM reads the Sales Navigator link back from it. */
export const SALESNAV_IMPORT_TITLE = 'Imported from Sales Navigator';
const IMPORT_TITLE = SALESNAV_IMPORT_TITLE;

export type SalesNavImportRow = {
  name: string;
  company: string;
  status: 'created' | 'added' | 'claimed' | 'error';
  message: string;
  dealId?: string;
};

/**
 * Brings Sales Navigator leads into the CRM. Each lead becomes a contact on a deal owned by the
 * signed-in user (or joins the company's open deal), and keeps a link back to its Sales Navigator
 * lead page. With `enrich`, missing title/company are read from the person's public LinkedIn profile.
 */
export async function importSalesNavLeads(
  user: { id: string },
  leads: SalesNavLead[],
  options: { enrich?: boolean } = {}
): Promise<{ rows: SalesNavImportRow[]; created: number; error?: string }> {
  const list = (Array.isArray(leads) ? leads : []).slice(0, MAX_SALESNAV_IMPORT);
  if (!list.length) return { rows: [], created: 0, error: 'Add at least one lead to import.' };

  const canEnrich = !!options.enrich && (await isLinkedInConfigured()) && (await isLinkedInEnabledSetting());
  const rows: SalesNavImportRow[] = [];
  let created = 0;

  for (const raw of list) {
    const url = cleanUrl(typeof raw?.url === 'string' ? raw.url : undefined);
    const profileUrl = isPublicProfileUrl(url) ? url : undefined;
    const salesNavUrl = isSalesNavLeadUrl(url) ? url : undefined;
    let name = String(raw?.name || '').trim().slice(0, 120);
    let title = String(raw?.title || '').trim().slice(0, 200) || undefined;
    let company = String(raw?.company || '').trim().slice(0, 120) || undefined;

    // Fill gaps from the public profile (one paid scraper run per lead, so only when asked).
    if (canEnrich && profileUrl && (!name || !title || !company)) {
      const res = await linkedinProvider.getProfile(profileUrl);
      if (res.profile) {
        name ||= res.profile.fullName;
        title ||= res.profile.jobTitle || res.profile.headline;
        company ||= res.profile.companyName;
      }
    }

    if (!name) {
      rows.push({ name: url || 'Unknown', company: company || '', status: 'error', message: 'No name: add the person\'s name and import again.' });
      continue;
    }
    const companyName = company || `${name} (independent)`;

    try {
      const result = await createLead({
        company: { name: companyName },
        contact: { name, title, linkedinUrl: profileUrl },
        source: 'LINKEDIN_PEOPLE',
        ownerId: user.id,
        actorId: user.id,
        note: { title: IMPORT_TITLE, details: title },
      });

      // Link the contact to their Sales Navigator lead page (read back as "Open in Sales Navigator").
      // Same matching as createLead: by name (any case) or profile URL, within the deal's company.
      const deal = await db.deal.findUnique({ where: { id: result.dealId }, select: { companyId: true } });
      const contact = deal
        ? await db.contact.findFirst({
            where: { companyId: deal.companyId, OR: [{ name: { equals: name, mode: 'insensitive' } }, ...(profileUrl ? [{ linkedinUrl: profileUrl }] : [])] },
            orderBy: { createdAt: 'desc' },
            select: { id: true, linkedinUrl: true },
          })
        : null;
      if (contact) {
        if (profileUrl && !contact.linkedinUrl) await db.contact.update({ where: { id: contact.id }, data: { linkedinUrl: profileUrl } });
        await logActivity(db, {
          dealId: result.dealId,
          type: 'LINKEDIN',
          title: `${IMPORT_TITLE}: ${name}`,
          details: salesNavUrl || profileUrl || undefined,
          userId: user.id,
          contactId: contact.id,
        });
      }

      if (result.created) created++;
      rows.push({
        name,
        company: result.companyName,
        dealId: result.dealId,
        status: result.created ? 'created' : result.claimed ? 'claimed' : 'added',
        message: result.created
          ? 'New deal in your pipeline.'
          : result.claimed
            ? 'Joined an unassigned deal, which is now yours.'
            : `Added to the company's open deal${result.ownerName ? ` (owner: ${result.ownerName})` : ''}.`,
      });
    } catch (err) {
      logger.error(`Sales Navigator import failed for ${name}`, err);
      rows.push({ name, company: companyName, status: 'error', message: 'Could not be saved. Please try again.' });
    }
  }

  return { rows, created };
}
