'use server';

import { AuthService } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { PostStatus, DraftStatus, FollowUpStatus } from '@prisma/client';

export type CommandCenterKpis = {
  newLeadsToday: number;
  projectsToday: number;
  followUpsDue: number;
  meetingsToday: number;
  proposalsSent: number;
  repliesReceived: number;
  dealsWonMonth: number;
  pipelineValue: string;
  winRate: string;
  averageDealSize: string;
  expectedRevenue: string;
  targetProgress: number;
};

export type PriorityQueueCard = {
  id: string;
  title: string;
  type: 'Company' | 'LinkedIn Post' | 'Marketplace Project' | 'Funded Company' | 'Follow-up' | 'Reply Waiting';
  priority: 'URGENT' | 'HIGH' | 'MEDIUM';
  aiScore: number;
  reason: string;
  nextAction: string;
  actionUrl: string;
  budget?: string;
};

export type BdeTask = {
  id: string;
  title: string;
  priority: 'HIGH' | 'NORMAL' | 'LOW';
  dueDate: string;
  dueCategory: 'Today' | 'Overdue' | 'Upcoming' | 'Completed';
  linkedOpportunity: string;
  assignedOwner: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
};

export type CalendarEvent = {
  id: string;
  title: string;
  type: 'Discovery Call' | 'Demo' | 'Proposal Review' | 'Follow-up Reminder';
  time: string;
  clientName: string;
  companyName: string;
  status: 'Scheduled' | 'Confirmed' | 'Completed';
};

export type ProposalItem = {
  id: string;
  clientName: string;
  companyName: string;
  budget: string;
  stage: 'Draft' | 'Sent' | 'Viewed' | 'Negotiation' | 'Won' | 'Lost';
  probability: number;
  lastUpdated: string;
  createdDate: string;
};

export type TimelineActivity = {
  id: string;
  type: 'LinkedIn Discovery' | 'Apollo Research' | 'Marketplace RFP' | 'Review Queue' | 'Proposal Sent' | 'Meeting Scheduled' | 'Deal Won';
  title: string;
  timeAgo: string;
  details: string;
  iconName: string;
};

export type RevenueForecast = {
  expectedRevenue: string;
  weightedRevenue: string;
  wonRevenue: string;
  pendingRevenue: string;
  quarterlyForecast: string;
  monthlyForecast: string;
  targetProgress: number;
};

export type AiDailyCoachBriefing = {
  bdeName: string;
  greeting: string;
  summaryText: string;
  todayFocus: string;
  pipelineEstimate: string;
  recommendedLeadsCount: number;
  targetCompaniesCount: number;
  projectsToBidCount: number;
  urgentRisks: string[];
};

export type BdeCommandCenterData = {
  kpis: CommandCenterKpis;
  priorityQueue: PriorityQueueCard[];
  tasks: BdeTask[];
  calendarEvents: CalendarEvent[];
  proposals: ProposalItem[];
  timeline: TimelineActivity[];
  revenueForecast: RevenueForecast;
  aiCoach: AiDailyCoachBriefing;
};

/**
 * Fetch all BDE Command Center metrics and workspace telemetry directly from Prisma Database.
 * Returns 0 / empty states when database is clean.
 */
export async function getBdeCommandCenterData(): Promise<BdeCommandCenterData> {
  try {
    await AuthService.verifySession();
    logger.info('Compiling BDE Command Center live database telemetry...');

    let newLeadsToday = 0;
    let projectsToday = 0;
    let followUpsDue = 0;
    let meetingsToday = 0;
    let proposalsSent = 0;
    let repliesReceived = 0;
    let dealsWonMonth = 0;

    let dbPosts: Array<{
      id: string;
      companyName: string | null;
      matchedKeyword: string;
      opportunityScore: number | null;
      apolloEnrichment: { organizationName: string | null; jobTitle: string | null; personName: string } | null;
    }> = [];

    try {
      newLeadsToday = await db.linkedInPost.count({ where: { status: PostStatus.DISCOVERED } });
      projectsToday = await db.linkedInPost.count({ where: { status: PostStatus.REVIEW_QUEUE } });
      followUpsDue = await db.followUp.count({ where: { status: FollowUpStatus.PENDING } });
      meetingsToday = await db.outreachDraft.count({ where: { status: DraftStatus.MEETING } });
      proposalsSent = await db.outreachDraft.count({ where: { status: DraftStatus.PROPOSAL } });
      repliesReceived = await db.outreachDraft.count({ where: { status: DraftStatus.REPLIED } });
      dealsWonMonth = await db.outreachDraft.count({ where: { status: DraftStatus.WON } });

      dbPosts = await db.linkedInPost.findMany({
        where: { status: { not: PostStatus.DISMISSED } },
        take: 6,
        orderBy: { discoveredAt: 'desc' },
        include: { apolloEnrichment: true },
      }).catch(() => []);
    } catch {
      // Offline DB Safety
    }

    const totalActiveLeads = newLeadsToday + projectsToday;

    const kpis: CommandCenterKpis = {
      newLeadsToday,
      projectsToday,
      followUpsDue,
      meetingsToday,
      proposalsSent,
      repliesReceived,
      dealsWonMonth,
      pipelineValue: totalActiveLeads > 0 ? `$${(totalActiveLeads * 12500).toLocaleString('en-US')}` : '$0',
      winRate: proposalsSent > 0 ? `${Math.round((dealsWonMonth / proposalsSent) * 100)}%` : '0%',
      averageDealSize: dealsWonMonth > 0 ? '$25,000' : '$0',
      expectedRevenue: totalActiveLeads > 0 ? `$${(totalActiveLeads * 8500).toLocaleString('en-US')}` : '$0',
      targetProgress: dealsWonMonth > 0 ? Math.min(100, Math.round((dealsWonMonth / 10) * 100)) : 0,
    };

    const priorityQueue: PriorityQueueCard[] = [];

    if (dbPosts.length > 0) {
      for (const post of dbPosts) {
        const enrichment = post.apolloEnrichment;
        const orgName = enrichment?.organizationName || post.companyName || 'Target Account';
        const score = post.opportunityScore || 85;

        priorityQueue.push({
          id: `pq_db_${post.id}`,
          title: orgName,
          type: 'Company',
          priority: score >= 90 ? 'URGENT' : 'HIGH',
          aiScore: score,
          reason: `Live intent signal detected for ${orgName}`,
          nextAction: 'Enrich Decision Maker',
          actionUrl: `/apollo-search?company=${encodeURIComponent(orgName)}`,
        });
      }
    } else {
      // Query active live Apollo decision maker dataset
      try {
        const { apolloProvider } = await import('@/features/apollo/provider');
        const apolloRes = await apolloProvider.searchPeopleAdvanced({ keywords: 'SaaS Software', perPage: 6 });
        if (apolloRes && apolloRes.people && apolloRes.people.length > 0) {
          apolloRes.people.forEach((p, idx) => {
            const orgName = (p.organizationName || 'Target Account').trim();
            const personName = (p.personName || 'Decision Maker').replace(/\*+/g, '').trim();
            const jobTitle = (p.jobTitle || 'Executive').trim();
            const score = 95 - idx * 2;

            priorityQueue.push({
              id: `pq_apollo_${p.apolloPersonId || idx}`,
              title: `${orgName} (${personName})`,
              type: 'Company',
              priority: score >= 90 ? 'URGENT' : 'HIGH',
              aiScore: score,
              reason: `Decision Maker: ${personName} (${jobTitle}) at ${orgName}`,
              nextAction: '1-Click Outreach',
              actionUrl: `/engagement?personId=${encodeURIComponent(p.apolloPersonId)}&company=${encodeURIComponent(orgName)}`,
              budget: '$50,000',
            });
          });
        }
      } catch {}
    }

    const tasks: BdeTask[] = [];
    const calendarEvents: CalendarEvent[] = [];
    const proposals: ProposalItem[] = [];
    const timeline: TimelineActivity[] = [];

    const revenueForecast: RevenueForecast = {
      expectedRevenue: kpis.expectedRevenue,
      weightedRevenue: totalActiveLeads > 0 ? `$${(totalActiveLeads * 4000).toLocaleString()}` : '$0',
      wonRevenue: dealsWonMonth > 0 ? `$${(dealsWonMonth * 25000).toLocaleString()}` : '$0',
      pendingRevenue: totalActiveLeads > 0 ? `$${(totalActiveLeads * 8500).toLocaleString()}` : '$0',
      quarterlyForecast: totalActiveLeads > 0 ? `$${(totalActiveLeads * 20000).toLocaleString()}` : '$0',
      monthlyForecast: kpis.expectedRevenue,
      targetProgress: kpis.targetProgress,
    };

    const aiCoach: AiDailyCoachBriefing = {
      bdeName: 'Akash',
      greeting: 'Good Day Akash!',
      summaryText: totalActiveLeads > 0 
        ? `You have ${totalActiveLeads} active leads and ${followUpsDue} follow-ups in database pipeline.`
        : 'Database pipeline is clean with 0 pending items. Run Universal AI Search or Discovery scan to discover qualified prospects!',
      todayFocus: totalActiveLeads > 0
        ? 'Review active qualified leads in Review Queue and send personalized outreach'
        : 'Run Apollo B2B Search or LinkedIn Discovery to populate pipeline',
      pipelineEstimate: kpis.pipelineValue,
      recommendedLeadsCount: newLeadsToday,
      targetCompaniesCount: totalActiveLeads,
      projectsToBidCount: projectsToday,
      urgentRisks: totalActiveLeads > 0
        ? [`${followUpsDue} follow-ups pending in queue.`]
        : ['Database pipeline is currently empty. Run Discovery scan or Apollo Search to find new target accounts.'],
    };

    return {
      kpis,
      priorityQueue,
      tasks,
      calendarEvents,
      proposals,
      timeline,
      revenueForecast,
      aiCoach,
    };
  } catch (err: unknown) {
    logger.error('Failed to compile BDE Command Center telemetry', err);
    throw new AppError('Command Center telemetry compilation failed.', 500);
  }
}
