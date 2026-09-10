'use server';

import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { DraftStatus, PostStatus } from '@prisma/client';

export interface DashboardSummary {
  todayPostsCount: number;
  highOpportunityCount: number;
  reviewQueueCount: number;
  draftsReadyCount: number;
  followUpsCount: number;
  reEngagementsCount: number;
  replyRate: number;
  keywordPerformance: {
    keyword: string;
    category: string;
    matchesFound: number;
  }[];
  playbookPerformance: {
    name: string;
    sent: number;
    replied: number;
    won: number;
  }[];
  recentHighOppPosts: {
    id: string;
    authorName: string;
    authorHeadline: string | null;
    opportunityScore: number | null;
    matchedKeyword: string | null;
  }[];
}

/**
 * Fetch main dashboard analytics metrics from the database.
 * Falls back to high-fidelity mock summaries if PostgreSQL is offline.
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Today's posts count
    const todayPostsCount = await db.linkedInPost.count({
      where: { discoveredAt: { gte: startOfToday } }
    });

    // High opportunity posts
    const highOpportunityCount = await db.linkedInPost.count({
      where: { opportunityScore: { gte: 75 } }
    });

    // Review Queue count (Unanalyzed/pending review)
    const reviewQueueCount = await db.linkedInPost.count({
      where: { status: PostStatus.REVIEW_QUEUE }
    });

    // Drafts Ready count
    const draftsReadyCount = await db.outreachDraft.count({
      where: {
        status: {
          in: [DraftStatus.DRAFT, DraftStatus.PENDING_REVIEW, DraftStatus.APPROVED]
        }
      }
    });

    // Pending Follow-ups due
    const followUpsCount = await db.followUp.count({
      where: { status: 'PENDING' }
    });

    // Re-engagement alerts count
    const reEngagementsCount = await db.reEngagementEvent.count({
      where: { approvalStatus: 'PENDING' }
    });

    // Calculate reply rate (Replies / Sends)
    const sentCount = await db.outreachDraft.count({
      where: {
        status: {
          in: [
            DraftStatus.SENT,
            DraftStatus.FOLLOW_UP_DUE,
            DraftStatus.COMPLETED,
            DraftStatus.REPLIED,
            DraftStatus.MEETING,
            DraftStatus.PROPOSAL,
            DraftStatus.WON,
            DraftStatus.LOST
          ]
        }
      }
    });

    const repliedCount = await db.outreachDraft.count({
      where: {
        status: {
          in: [
            DraftStatus.REPLIED,
            DraftStatus.MEETING,
            DraftStatus.PROPOSAL,
            DraftStatus.WON
          ]
        }
      }
    });

    const replyRate = sentCount > 0 ? Math.round((repliedCount / sentCount) * 100) : 0;

    // Keyword Performance (matches count)
    const keywords = await db.keyword.findMany({
      take: 5,
      orderBy: { matchesFound: 'desc' }
    });
    const keywordPerformance = keywords.map(k => ({
      keyword: k.keyword,
      category: k.category,
      matchesFound: k.matchesFound
    }));

    // Playbook Performance
    const playbooks = await db.outreachPlaybook.findMany({
      take: 4,
      include: {
        drafts: true
      }
    });
    const playbookPerformance = playbooks.map(p => {
      const pSent = p.drafts.filter(d => 
        ([DraftStatus.SENT, DraftStatus.FOLLOW_UP_DUE, DraftStatus.COMPLETED, DraftStatus.REPLIED, DraftStatus.MEETING, DraftStatus.PROPOSAL, DraftStatus.WON, DraftStatus.LOST] as DraftStatus[]).includes(d.status)
      ).length;
      
      const pReplied = p.drafts.filter(d => 
        ([DraftStatus.REPLIED, DraftStatus.MEETING, DraftStatus.PROPOSAL, DraftStatus.WON] as DraftStatus[]).includes(d.status)
      ).length;

      const pWon = p.drafts.filter(d => d.status === DraftStatus.WON).length;

      return {
        name: p.name,
        sent: pSent,
        replied: pReplied,
        won: pWon
      };
    });

    // Recent high opportunity posts
    const recentOppPosts = await db.linkedInPost.findMany({
      where: { opportunityScore: { gte: 75 } },
      take: 5,
      orderBy: { discoveredAt: 'desc' }
    });
    const recentHighOppPosts = recentOppPosts.map(p => ({
      id: p.id,
      authorName: p.authorName,
      authorHeadline: p.authorHeadline,
      opportunityScore: p.opportunityScore,
      matchedKeyword: p.matchedKeyword
    }));

    return {
      todayPostsCount,
      highOpportunityCount,
      reviewQueueCount,
      draftsReadyCount,
      followUpsCount,
      reEngagementsCount,
      replyRate,
      keywordPerformance,
      playbookPerformance,
      recentHighOppPosts
    };
  } catch {
    logger.warn('Failed to compile dashboard metrics from database. Returning zero metrics.');
    
    return {
      todayPostsCount: 0,
      highOpportunityCount: 0,
      reviewQueueCount: 0,
      draftsReadyCount: 0,
      followUpsCount: 0,
      reEngagementsCount: 0,
      replyRate: 0,
      keywordPerformance: [],
      playbookPerformance: [],
      recentHighOppPosts: []
    };
  }
}
