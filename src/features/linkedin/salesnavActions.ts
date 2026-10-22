'use server';

import { AuthService } from '@/lib/auth';
import { safeRevalidatePath } from '@/lib/revalidate';
import { isLinkedInConfigured } from './provider';
import { isLinkedInEnabledSetting } from './settings';
import { importSalesNavLeads } from './salesnavImport';
import type { SalesNavImportRow } from './salesnavImport';
import type { SalesNavLead } from './salesnav';

export type { SalesNavImportRow } from './salesnavImport';

/** Whether "fill in missing details from LinkedIn" can be offered (needs the Apify token). */
export async function getSalesNavEnrichmentAvailableAction(): Promise<boolean> {
  await AuthService.verifySession();
  return (await isLinkedInConfigured()) && (await isLinkedInEnabledSetting());
}

/** Imports Sales Navigator leads (from the bookmark or a pasted list) into the signed-in user's pipeline. */
export async function importSalesNavLeadsAction(
  leads: SalesNavLead[],
  options: { enrich?: boolean } = {}
): Promise<{ rows: SalesNavImportRow[]; created: number; error?: string }> {
  const user = await AuthService.verifySession();
  const result = await importSalesNavLeads(user, leads, options);
  safeRevalidatePath('/crm');
  safeRevalidatePath('/today');
  return result;
}
