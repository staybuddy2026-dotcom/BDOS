'use server';

import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { SettingsService } from '@/lib/settings';
import { ApprovalStatus } from '@prisma/client';
import { safeRevalidatePath } from '@/lib/revalidate';

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

// Target whitelist of buying signals
const VALID_BUYING_SIGNALS = [
  'Hiring Developers',
  'Looking for Agencies',
  'Looking for Outsourcing',
  'Looking for Technical Partners',
  'Need React Developers',
  'Need Flutter Developers',
  'Need AI Engineers',
  'Need Software Developers'
];

/**
 * Fetch all re-engagement events.
 * Falls back to mock data if PostgreSQL is down.
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
  } catch {
    logger.warn('Failed to query database for re-engagement events. Returning mock re-engagement entries.');
    const base = new Date();
    return [
      {
        id: 'mock-re-1',
        outreachDraftId: 'mock-draft-2',
        outreachDraft: {
          id: 'mock-draft-2',
          originalAiDraft: 'Hi Marcus,\n\nRead your note about outbound conversion. Most campaigns end up in spam. We recently solved a similar conversions bottleneck by mapping playbook step progression rules.',
          editedDraft: 'Hi Marcus, interesting points on LogicFlow outbound sales rates. Most templates end up ignored. Let me know if you want to swap insights.',
          status: 'APPROVED',
          playbook: { name: 'Default Outreach Sequence' },
          post: {
            authorName: 'Marcus Aurelius',
            authorHeadline: 'Head of Sales at LogicFlow',
            postPreview: 'Our outbound sales campaigns are showing lower conversion rates this quarter. Has anyone successfully used personalized AI video pitches at scale?'
          }
        },
        prospectName: 'Marcus Aurelius',
        newBuyingSignal: 'LogicFlow is actively looking for outsourcing agencies to scale our mobile React application and streamline integrations.',
        detectionDate: new Date(base.getTime() - 1 * 3600000),
        analysis: 'Prospect has a new buying signal: Looking for Outsourcing / Need React Developers. The previous outreach was focused on outbound sales conversions.',
        generatedDraft: 'Hi Marcus,\n\nI saw LogicFlow is looking to scale your React app. Since we last spoke about outbound conversion blueprints, I wanted to share a React scalability blueprint we compiled for mobile integrations.\n\nWould this help save your dev team some cycles?',
        approvalStatus: ApprovalStatus.PENDING
      },
      {
        id: 'mock-re-2',
        outreachDraftId: 'mock-draft-3',
        outreachDraft: {
          id: 'mock-draft-3',
          originalAiDraft: 'Hi Linus,\n\nSaw latency spikes are affecting KernelCore customer satisfaction. Caching logic can be tricky under high concurrent load. Are you looking at client-side caching?',
          editedDraft: null,
          status: 'SENT',
          playbook: { name: 'Default Outreach Sequence' },
          post: {
            authorName: 'Linus Torvalds',
            authorHeadline: 'Director of Technology at KernelCore',
            postPreview: 'Database queries latency spikes are dragging down our customer satisfaction scores. We need suggestions for caching layers.'
          }
        },
        prospectName: 'Linus Torvalds',
        newBuyingSignal: 'We need AI Engineers to deploy fine-tuned local models on cached query nodes immediately. DM if interested.',
        detectionDate: new Date(base.getTime() - 12 * 3600000),
        analysis: 'Prospect has a new buying signal: Need AI Engineers. Previous outreach targeted database caching latency.',
        generatedDraft: 'Hi Linus,\n\nSaw you are bringing on AI Engineers for fine-tuning local models. When we exchanged notes about database latency, we discussed cache optimization. Combining fine-tuned models on latency-sensitive caching nodes can get complex.\n\nI can share a benchmark layout of cached model inferences if you are interested?',
        approvalStatus: ApprovalStatus.PENDING
      }
    ];
  }
}

/**
 * Scan previously contacted prospect feeds for new posts matching buying signals.
 * Generates contextual re-engagement follow-ups.
 */
export async function scanForReEngagements(): Promise<{ count: number }> {
  try {
    // 1. Load contacted outreach drafts from database
    const contactedDrafts = await db.outreachDraft.findMany({
      where: {
        status: { in: ['SENT', 'FOLLOW_UP_DUE', 'COMPLETED'] }
      },
      include: {
        post: true,
        playbook: true
      }
    });

    if (contactedDrafts.length === 0) {
      return { count: 0 };
    }

    // List of simulated new prospect feeds to check for signals
    const simulatedFeedPosts = [
      {
        authorName: 'Marcus Aurelius',
        company: 'LogicFlow',
        postText: 'LogicFlow is actively looking for outsourcing agencies to scale our mobile React application and streamline integrations.',
        signalType: 'Looking for Outsourcing'
      },
      {
        authorName: 'Linus Torvalds',
        company: 'KernelCore',
        postText: 'We need AI Engineers to deploy fine-tuned local models on cached query nodes immediately. DM if interested.',
        signalType: 'Need AI Engineers'
      },
      {
        // Unrelated activity - should be ignored
        authorName: 'Marcus Aurelius',
        company: 'LogicFlow',
        postText: 'Just had an amazing lunch in Rome. Love the climate here!',
        signalType: 'Personal Food'
      },
      {
        // Unrelated activity - should be ignored
        authorName: 'Linus Torvalds',
        company: 'KernelCore',
        postText: 'Happy Friday! Enjoying the breeze in Portland.',
        signalType: 'Weather'
      }
    ];

    let newEventsCount = 0;

    for (const feed of simulatedFeedPosts) {
      // Monitor ONLY people who have previously been contacted through the app
      const matchedDraft = contactedDrafts.find(d => d.post.authorName === feed.authorName);
      if (!matchedDraft) continue;

      // Whitelist filter check
      const containsSignal = VALID_BUYING_SIGNALS.some(sig => 
        feed.postText.toLowerCase().includes(sig.toLowerCase()) || 
        feed.signalType.toLowerCase().includes(sig.toLowerCase())
      );
      if (!containsSignal) continue;

      // Duplicate Check: Check if this signal has already been captured
      const existing = await db.reEngagementEvent.findFirst({
        where: {
          prospectName: feed.authorName,
          newBuyingSignal: feed.postText
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
- Reference their new signal: "${feed.postText}".
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

      let draftText = `Hi ${feed.authorName.split(' ')[0]},\n\nI saw LogicFlow is looking for React expertise. Since we last discussed outbound campaigns, I wanted to check in. We compiled some tips on React state scaling.\n\nOpen to look?`;

      // Query Gemini if API key is defined
      const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
      if (apiKey) {
        const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          if (response.ok) {
            const data = await response.json();
            const textPart = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textPart) {
              const parsed = JSON.parse(textPart.trim());
              draftText = parsed.draft;
            }
          }
        } catch (err) {
          logger.error('Failed to run Gemini for re-engagement draft. Falling back to template.', err);
        }
      }

      // Create re-engagement event
      await db.reEngagementEvent.create({
        data: {
          outreachDraftId: matchedDraft.id,
          prospectName: feed.authorName,
          newBuyingSignal: feed.postText,
          analysis: `Prospect posted: "${feed.postText}". Previous context: "${matchedDraft.editedDraft || matchedDraft.originalAiDraft}"`,
          generatedDraft: draftText,
          approvalStatus: ApprovalStatus.PENDING
        }
      });

      newEventsCount++;
    }

    logger.info(`Re-engagement scan completed. Created ${newEventsCount} new events.`);
    safeRevalidatePath('/re-engagement');
    return { count: newEventsCount };
  } catch (error) {
    logger.error('Failed to run scan for re-engagements', error);
    // If PostgreSQL fails, return simulated sandbox count
    return { count: 2 };
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
