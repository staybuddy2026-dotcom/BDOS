'use server';

import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { geminiGenerate, hasGeminiKey } from '@/lib/gemini';
import { AppError } from '@/lib/errors';
import { SettingsService } from '@/lib/settings';
import { ApprovalStatus } from '@prisma/client';
import { safeRevalidatePath } from '@/lib/revalidate';
import { AuthService } from '@/lib/auth';
import { scanLinkedInReEngagements } from './linkedin';

export type ReEngagementData = {
  id: string;
  outreachDraftId: string | null;
  outreachDraft?: {
    id: string;
    originalAiDraft: string;
    editedDraft: string | null;
    status: string;
    playbook?: { name: string } | null;
    post: {
      authorName: string;
      authorHeadline: string | null;
      postPreview: string;
    };
  } | null;
  prospectName: string;
  newBuyingSignal: string;
  detectionDate: Date;
  analysis: string;
  generatedDraft: string | null;
  approvalStatus: ApprovalStatus;
};



/**
 * Fetch all re-engagement events (an empty list when the database cannot be reached).
 */
export async function getReEngagementEvents(): Promise<ReEngagementData[]> {
  try {
    const events = await db.reEngagementEvent.findMany({
      include: {
        outreachDraft: {
          include: {
            post: true,
            playbook: true
          }
        }
      },
      orderBy: { detectionDate: 'desc' }
    });
    return events as unknown as ReEngagementData[];
  } catch (error) {
    logger.warn('Failed to query database for re-engagement events.', { error: String(error) });
    return [];
  }
}

/**
 * Looks for new reasons to re-contact prospects we already reached out to: new LinkedIn posts with
 * buying intent (when LinkedIn is connected) and company funding or hiring found through Apollo.
 * Generates contextual re-engagement follow-ups.
 */
export async function scanForReEngagements(): Promise<{ count: number; linkedin?: { checked: number; created: number; message?: string } }> {
  await AuthService.verifySession();
  // LinkedIn first: a failure there must not stop the Apollo scan, and vice versa.
  const li = await scanLinkedInReEngagements().catch((err) => {
    logger.error('LinkedIn re-engagement scan failed', err);
    return { checked: 0, created: 0, skipped: 'The LinkedIn check failed. Please try again.' } as { checked: number; created: number; skipped?: string; error?: { message: string } };
  });
  const linkedin = { checked: li.checked, created: li.created, message: li.error?.message || li.skipped };
  const apollo = await scanApolloReEngagements();
  if (li.created) safeRevalidatePath('/re-engagement');
  return { count: apollo.count + li.created, linkedin };
}

/** Company funding / hiring signals from Apollo for contacted prospects. */
async function scanApolloReEngagements(): Promise<{ count: number }> {
  try {
    // 1. Load contacted outreach drafts from database
    const contactedDrafts = await db.outreachDraft.findMany({
      where: {
        status: { in: ['APPROVED', 'SENT', 'FOLLOW_UP_DUE', 'COMPLETED'] }
      },
      include: {
        post: true,
        playbook: true
      }
    });

    if (contactedDrafts.length === 0) {
      return { count: 0 };
    }

    const { DefaultApolloProvider } = await import('@/features/apollo/provider');
    const apolloProvider = new DefaultApolloProvider();

    let newEventsCount = 0;
    
    // Group by company name to minimize org searches
    const companyToDrafts = new Map<string, typeof contactedDrafts>();
    for (const draft of contactedDrafts) {
      // Assuming post.authorHeadline contains company or we use post.authorName as search fallback
      // In a real app we'd have company domain linked to draft, but here we can try to extract from headline
      const headline = draft.post.authorHeadline || '';
      const companyMatch = headline.match(/at\s+(.+)/i);
      const company = draft.post.companyName || (companyMatch ? companyMatch[1].trim() : 'Organization');
      
      // Let's use Apollo searchPeopleAdvanced as well to find person signals, 
      // but to match the plan let's search orgs
      
      if (!companyToDrafts.has(company)) {
        companyToDrafts.set(company, []);
      }
      companyToDrafts.get(company)!.push(draft);
    }

    for (const [companyName, drafts] of companyToDrafts.entries()) {
      if (companyName === 'Organization') continue; // skip generic

      // 2. Query Apollo for organization signals (funding in last 30 days or open jobs)
      let orgSearchRes;
      try {
        orgSearchRes = await apolloProvider.searchOrganizationsAdvanced({
          name: companyName,
          fundingPresetDays: 30, // Last 30 days
          perPage: 1
        });
      } catch {
        orgSearchRes = { organizations: [], totalCount: 0 };
      }

      let newSignal = null;
      
      if (orgSearchRes.organizations.length > 0) {
        const org = orgSearchRes.organizations[0];
        if (org.latestFundingDate) {
          const fundingDate = new Date(org.latestFundingDate);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          if (fundingDate >= thirtyDaysAgo) {
            newSignal = `${companyName} recently raised ${org.latestFundingStage || 'funding'} on ${org.latestFundingDate}.`;
          }
        }
        if (!newSignal && org.openJobsCount && org.openJobsCount > 0) {
          newSignal = `${companyName} is currently hiring for ${org.openJobsCount} open roles.`;
        }
      }

      // No real signal (or Apollo unavailable): skip. An invented "expansion" would produce outreach built on a false claim.
      if (!newSignal) {
        if ('error' in orgSearchRes && orgSearchRes.error) {
          logger.warn(`Re-engagement: Apollo lookup unavailable for '${companyName}': ${orgSearchRes.error.message}`);
        }
        continue;
      }

      for (const matchedDraft of drafts) {
        // Duplicate Check
        const existing = await db.reEngagementEvent.findFirst({
          where: {
            prospectName: matchedDraft.post.authorName,
            newBuyingSignal: newSignal
          }
        });
        if (existing) continue;

        // Run AI generation for a completely new contextual draft
        const primary = await SettingsService.get('primaryTone', 'Professional');
        const secondary = await SettingsService.get('secondaryTone', 'Casual');
        const tertiary = await SettingsService.get('tertiaryTone', 'Insightful');

        const systemPrompt = `You are a personalized sales assistant writing a re-engagement follow-up.
The prospect replied or was contacted in the past. They just posted a new buying signal.
Your goal is to write a follow-up referencing both their new post and the context of our previous conversation.

Tones constraint: Incorporate styles matching ${primary}, ${secondary}, and ${tertiary}.

CRITICAL Guidelines:
- Write a completely new note. Do NOT reuse or replicate the first outreach note.
- Sound human and direct. No pressure.
- Reference their new signal: "${newSignal}".
- Connect it back to the past theme: "${matchedDraft.editedDraft || matchedDraft.originalAiDraft}".
- Output in structured JSON format matching the schema requested.`;

        const requestBody = {
          contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                draft: { type: 'STRING', description: 'Contextual re-engagement draft note.' }
              },
              required: ['draft']
            }
          }
        };

        // Without the AI, the draft names the real signal that was found (funding or hiring), nothing vaguer.
        let draftText = `Hi ${matchedDraft.post.authorName.split(' ')[0]},\n\nI noticed that ${newSignal.replace(/\.$/, '')}. Since we last spoke, I wanted to check whether that changes your plans.\n\nWould it be worth a short call?`;

        if (hasGeminiKey()) {
          try {
            const result = await geminiGenerate(requestBody, { label: `re-engagement draft for ${companyName}` });
            const parsed = JSON.parse(result.text) as { draft?: unknown };
            if (typeof parsed.draft === 'string' && parsed.draft.trim()) draftText = parsed.draft.trim();
          } catch (err: unknown) {
            logger.warn(`Re-engagement draft for ${companyName}: AI unavailable, using the signal-based draft`, { error: err instanceof Error ? err.message : String(err) });
          }
        }

        // Create re-engagement event
        await db.reEngagementEvent.create({
          data: {
            outreachDraftId: matchedDraft.id,
            prospectName: matchedDraft.post.authorName,
            newBuyingSignal: newSignal,
            analysis: `Prospect Company Signal: "${newSignal}". Previous context: "${matchedDraft.editedDraft || matchedDraft.originalAiDraft}"`,
            generatedDraft: draftText,
            approvalStatus: ApprovalStatus.PENDING
          }
        });

        newEventsCount++;
      }
    }

    logger.info(`Re-engagement scan completed. Created ${newEventsCount} new events.`);
    safeRevalidatePath('/re-engagement');
    return { count: newEventsCount };
  } catch (error: unknown) {
    logger.error('Failed to run scan for re-engagements', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && (error.message === 'RATE_LIMIT' || error.message.toLowerCase().includes('rate limit'))) {
      throw new AppError('APOLLO_RATE_LIMIT', 429);
    }
    throw new AppError('Failed to scan for re-engagements.', 500);
  }
}

/**
 * Approve, Dismiss, or Edit re-engagement suggested draft.
 */
export async function updateReEngagementStatus(
  eventId: string,
  status: ApprovalStatus,
  draftText?: string
) {
  try {
    const updated = await db.reEngagementEvent.update({
      where: { id: eventId },
      data: {
        approvalStatus: status,
        ...(draftText ? { generatedDraft: draftText } : {})
      }
    });

    logger.info(`Re-engagement event ID ${eventId} status updated to ${status}.`);
    safeRevalidatePath('/re-engagement');
    return updated;
  } catch (error) {
    logger.error(`Failed to update re-engagement event ID: ${eventId}`, error);
    throw new AppError('Failed to update re-engagement event status.', 500);
  }
}
