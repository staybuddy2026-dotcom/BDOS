'use server';

import { AuthService } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { safeRevalidatePath } from '@/lib/revalidate';
import { db } from '@/lib/db';
import { PostStatus } from '@prisma/client';
import { getUniversalLeadDiscoveryDataAction } from '@/features/discovery/actions';

export type CrmStage = 
  | 'Lead' 
  | 'Contacted' 
  | 'Meeting Scheduled' 
  | 'Proposal Sent' 
  | 'Negotiation' 
  | 'Won' 
  | 'Lost' 
  | 'Repeat Client';

export type DecisionMakerContact = {
  name: string;
  title: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
};

export type CrmMeeting = {
  id: string;
  date: string;
  title: string;
  attendees: string[];
  outcome: string;
  actionItems: string[];
  googleMeetUrl?: string;
  zoomUrl?: string;
};

export type CrmProposal = {
  id: string;
  version: string;
  value: string;
  date: string;
  status: 'Draft' | 'Sent' | 'Viewed' | 'Downloaded' | 'Accepted' | 'Rejected';
  expiryDate: string;
};

export type CrmTask = {
  id: string;
  title: string;
  priority: 'HIGH' | 'NORMAL' | 'LOW';
  dueDate: string;
  completed: boolean;
  assignedUser: string;
};

export type CrmActivity = {
  id: string;
  type: 'Apollo Research' | 'LinkedIn Discovery' | 'Marketplace RFP' | 'Proposal' | 'Meeting' | 'Call' | 'Email' | 'Task' | 'Status Change' | 'Note';
  title: string;
  timeAgo: string;
  details: string;
};

export type CrmAccount = {
  id: string;
  company360Id?: string;
  name: string;
  domain: string;
  industry: string;
  location: string;
  revenue: string;
  employeeCount: number;
  stage: CrmStage;
  dealValue: string;
  dealValueNumber: number;
  winProbability: number;
  owner: string;
  technologies: string[];
  decisionMakers: DecisionMakerContact[];
  meetings: CrmMeeting[];
  proposals: CrmProposal[];
  tasks: CrmTask[];
  timeline: CrmActivity[];
  tags: string[];
  createdDate: string;
};

export type CrmKpis = {
  totalAccounts: number;
  qualifiedAccounts: number;
  meetingsScheduled: number;
  proposalsSent: number;
  inNegotiation: number;
  wonDeals: number;
  lostDeals: number;
  pipelineRevenue: string;
  averageDealSize: string;
  winRate: string;
};

export type CrmAiBriefing = {
  companySummary: string;
  buyingSignals: string[];
  recommendedServices: string[];
  discoveryQuestions: string[];
  riskAnalysis: string[];
  probabilityToClose: number;
  competitorSignals: string[];
  recommendedNextAction: string;
  upsellSuggestions: string[];
};

// Clean Live In-Memory Store
let crmAccountsStore: CrmAccount[] = [];

async function loadCrmStoreFromDb() {
  try {
    const record = await db.applicationSettings.findUnique({ where: { key: 'crm_accounts_store' } }).catch(() => null);
    if (record && record.value) {
      const parsed = JSON.parse(record.value) as CrmAccount[];
      // Sanitize deal values for any existing corrupted records (ranges parsed as billions)
      for (const acc of parsed) {
        if (acc.dealValueNumber > 10000000) {
          const match = acc.dealValue.match(/[0-9][0-9,.]*/);
          acc.dealValueNumber = match ? parseInt(match[0].replace(/[^0-9]/g, ''), 10) : 50000;
        }
      }
      crmAccountsStore = parsed;
    }
  } catch (err) {
    logger.error('Failed to load CRM store from DB', err);
  }
}

async function saveCrmStoreToDb() {
  try {
    const val = JSON.stringify(crmAccountsStore);
    await db.applicationSettings.upsert({
      where: { key: 'crm_accounts_store' },
      update: { value: val },
      create: { key: 'crm_accounts_store', value: val }
    });
  } catch (err) {
    logger.error('Failed to save CRM store to DB', err);
  }
}

/**
 * Fetch all Enterprise CRM Accounts with filtering and recalculated KPIs.
 */
export async function getCrmAccounts(params?: {
  search?: string;
  stage?: string;
  industry?: string;
  owner?: string;
}): Promise<{ accounts: CrmAccount[]; kpis: CrmKpis }> {
  try {
    await AuthService.verifySession();
    logger.info('Querying Enterprise CRM Accounts & LifeCycle Data...');
    await loadCrmStoreFromDb();

    // 1. Fetch real approved outreach posts from PostgreSQL Database
    const dbPosts = await db.linkedInPost.findMany({
      where: {
        AND: [
          { status: { not: PostStatus.DISMISSED } },
          {
            OR: [
              { status: PostStatus.APPROVED },
              { status: PostStatus.REVIEW_QUEUE },
              { drafts: { some: {} } }
            ]
          }
        ]
      },
      include: {
        analysis: true,
        drafts: { orderBy: { generatedAt: 'desc' } }
      },
      orderBy: { discoveredAt: 'desc' }
    }).catch(() => []);

    // 2. Deduplicate existing store accounts
    const uniqueMap = new Map<string, CrmAccount>();
    for (const acc of crmAccountsStore) {
      const key = acc.id || (acc.domain || acc.name).toLowerCase().trim();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, acc);
      }
    }

    // 3. Merge Database Posts into CRM automatically
    let updatedStore = false;
    for (const post of dbPosts) {
      const key = post.id;
      if (!uniqueMap.has(key)) {
        const score = post.opportunityScore || 85;
        const baseValInr = Math.round((score * score) * 650);

        let companyClean = post.companyName || 'Enterprise Lead';
        if (companyClean.toUpperCase() === 'ENTERPRISE.COM') {
          companyClean = 'Enterprise Lead';
        }

        let domainClean = companyClean.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
        if (post.postUrl) {
          const parts = post.postUrl.split('/').filter(Boolean);
          const slug = parts[parts.length - 1] || '';
          if (slug && !slug.startsWith('urn:')) {
            domainClean = slug.replace(/\.com$/i, '') + '.com';
          }
        }

        const newAccount: CrmAccount = {
          id: key,
          name: companyClean,
          domain: domainClean,
          industry: post.analysis?.industry || 'Technology & B2B SaaS',
          location: 'Global',
          revenue: 'Active Prospect',
          employeeCount: 150,
          stage: 'Lead',
          dealValue: `$${Math.round(baseValInr / 83).toLocaleString()}`,
          dealValueNumber: Math.round(baseValInr / 83),
          winProbability: 50,
          owner: 'Akash (BD Owner)',
          technologies: post.analysis?.technologyStack || ['React', 'TypeScript', 'Node.js'],
          decisionMakers: [{
            name: post.authorName || 'Key Contact',
            title: post.authorHeadline || 'Decision Maker',
            linkedinUrl: post.postUrl || undefined
          }],
          meetings: [],
          proposals: [],
          tasks: [{
            id: `task_db_${key}`,
            title: `Review automated outreach for ${companyClean}`,
            priority: 'HIGH',
            dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
            completed: false,
            assignedUser: 'Akash'
          }],
          timeline: [{
            id: `act_db_${key}`,
            type: 'LinkedIn Discovery',
            title: 'Auto-synced from Pipeline',
            timeAgo: 'Just now',
            details: `Opportunity Score: ${score}/100. Matched keyword: ${post.matchedKeyword}`
          }],
          tags: ['Pipeline-Auto-Sync', 'Outreach'],
          createdDate: post.discoveredAt ? new Date(post.discoveredAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        };
        uniqueMap.set(key, newAccount);
        updatedStore = true;
      }
    }

    crmAccountsStore.length = 0;
    crmAccountsStore.push(...uniqueMap.values());

    if (updatedStore) {
      await saveCrmStoreToDb();
    }

    let filtered = [...crmAccountsStore];
    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter(a => 
        a.name.toLowerCase().includes(q) || 
        a.domain.toLowerCase().includes(q) ||
        a.industry.toLowerCase().includes(q) ||
        a.technologies.some(t => t.toLowerCase().includes(q)) ||
        a.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    if (params?.stage) {
      filtered = filtered.filter(a => a.stage === params.stage);
    }

    const totalAccounts = crmAccountsStore.length;
    const qualifiedAccounts = crmAccountsStore.filter(a => a.winProbability >= 60).length;
    
    // Count actual meetings and proposals instead of just accounts in those stages
    const meetingsScheduled = crmAccountsStore.reduce((sum, a) => sum + (a.meetings?.length || 0), 0);
    const proposalsSent = crmAccountsStore.reduce((sum, a) => sum + (a.proposals?.length || 0), 0);
    
    const inNegotiation = crmAccountsStore.filter(a => a.stage === 'Negotiation').length;
    const wonDeals = crmAccountsStore.filter(a => a.stage === 'Won' || a.stage === 'Repeat Client').length;
    const lostDeals = crmAccountsStore.filter(a => a.stage === 'Lost').length;
    
    const pipelineSum = crmAccountsStore.reduce((acc, a) => acc + a.dealValueNumber, 0);

    const kpis: CrmKpis = {
      totalAccounts,
      qualifiedAccounts,
      meetingsScheduled,
      proposalsSent,
      inNegotiation,
      wonDeals,
      lostDeals,
      pipelineRevenue: `$${pipelineSum.toLocaleString()}`,
      averageDealSize: totalAccounts > 0 ? `$${Math.round(pipelineSum / totalAccounts).toLocaleString()}` : '$0',
      winRate: totalAccounts > 0 ? `${Math.round(((wonDeals) / totalAccounts) * 100)}%` : '0%',
    };

    return { accounts: filtered, kpis };
  } catch (err: unknown) {
    logger.error('Failed to query CRM accounts', err);
    throw new AppError('CRM query failed.', 500);
  }
}

/**
 * Clear all accounts in CRM store.
 */
export async function clearAllCrmAccounts() {
  try {
    await AuthService.verifySession();
    crmAccountsStore = [];
    await saveCrmStoreToDb();
    safeRevalidatePath('/crm');
    return { success: true, message: 'All CRM accounts cleared.' };
  } catch (err: unknown) {
    logger.error('Failed to clear CRM accounts', err);
    throw new AppError('Failed to clear CRM accounts.', 500);
  }
}

/**
 * Create a New CRM Account / Lead.
 */
export async function createCrmAccount(data: {
  name: string;
  domain: string;
  industry: string;
  location?: string;
  dealValueNumber: number;
  stage?: CrmStage;
  contactName?: string;
  contactTitle?: string;
  contactEmail?: string;
  contactPhone?: string;
  technologies?: string[];
}): Promise<CrmAccount> {
  try {
    await AuthService.verifySession();
    logger.info(`Creating new CRM Account '${data.name}' (${data.domain})...`);

    const newAccount: CrmAccount = {
      id: `crm_acc_${Date.now()}`,
      name: data.name,
      domain: data.domain,
      industry: data.industry || 'Technology',
      location: data.location || 'Global Remote',
      revenue: 'Active Prospect',
      employeeCount: 50,
      stage: data.stage || 'Lead',
      dealValue: `$${data.dealValueNumber.toLocaleString()}`,
      dealValueNumber: data.dealValueNumber,
      winProbability: data.stage === 'Won' ? 100 : 60,
      owner: 'Akash (BD Owner)',
      technologies: data.technologies || ['React', 'Node.js', 'TypeScript'],
      decisionMakers: data.contactName ? [
        {
          name: data.contactName,
          title: data.contactTitle || 'Key Stakeholder',
          email: data.contactEmail,
          phone: data.contactPhone,
        }
      ] : [],
      meetings: [],
      proposals: [],
      tasks: [
        {
          id: `task_${Date.now()}`,
          title: `Initiate introductory engagement with ${data.name}`,
          priority: 'HIGH',
          dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
          completed: false,
          assignedUser: 'Akash',
        }
      ],
      timeline: [
        {
          id: `act_${Date.now()}`,
          type: 'Apollo Research',
          title: 'Account Created',
          timeAgo: 'Just now',
          details: `Added ${data.name} to CRM pipeline under ${data.stage || 'Lead'} stage.`,
        }
      ],
      tags: ['New-Account', 'Target-Prospect'],
      createdDate: new Date().toISOString().split('T')[0],
    };

    await loadCrmStoreFromDb();
    crmAccountsStore.unshift(newAccount);
    await saveCrmStoreToDb();
    safeRevalidatePath('/crm');
    return newAccount;
  } catch (err: unknown) {
    logger.error('Failed to create CRM account', err);
    throw new AppError('Failed to create account.', 500);
  }
}

/**
 * Move account stage.
 */
export async function updateAccountStage(accountId: string, newStage: CrmStage): Promise<CrmAccount> {
  try {
    await AuthService.verifySession();
    logger.info(`Updating CRM Account #${accountId} stage to '${newStage}'...`);
    await loadCrmStoreFromDb();

    const acc = crmAccountsStore.find(a => a.id === accountId);
    if (!acc) throw new AppError('Account not found', 404);

    const prevStage = acc.stage;
    acc.stage = newStage;
    
    // Auto update win probability based on stage
    if (newStage === 'Won' || newStage === 'Repeat Client') acc.winProbability = 100;
    else if (newStage === 'Negotiation') acc.winProbability = 85;
    else if (newStage === 'Proposal Sent') acc.winProbability = 70;
    else if (newStage === 'Meeting Scheduled') acc.winProbability = 60;
    else if (newStage === 'Contacted') acc.winProbability = 40;
    else if (newStage === 'Lost') acc.winProbability = 0;
    else acc.winProbability = 30;

    acc.timeline.unshift({
      id: `act_${Date.now()}`,
      type: 'Status Change',
      title: `Stage Updated: ${prevStage} ➔ ${newStage}`,
      timeAgo: 'Just now',
      details: `Account transitioned from ${prevStage} to ${newStage} in CRM pipeline.`,
    });

    await saveCrmStoreToDb();
    safeRevalidatePath('/crm');
    return acc;
  } catch (err: unknown) {
    logger.error(`Failed to update stage for ${accountId}`, err);
    throw new AppError('Stage update failed.', 500);
  }
}

/**
 * Add a meeting to an account.
 */
export async function addAccountMeeting(accountId: string, meetingData: Omit<CrmMeeting, 'id'>): Promise<CrmAccount> {
  try {
    await AuthService.verifySession();
    logger.info(`Logging meeting for account #${accountId}...`);
    await loadCrmStoreFromDb();

    const acc = crmAccountsStore.find(a => a.id === accountId);
    if (!acc) throw new AppError('Account not found', 404);

    const newMeeting: CrmMeeting = {
      ...meetingData,
      id: `meet_${Date.now()}`,
    };

    acc.meetings.unshift(newMeeting);
    acc.timeline.unshift({
      id: `act_${Date.now()}`,
      type: 'Meeting',
      title: `Meeting Logged: ${meetingData.title}`,
      timeAgo: 'Just now',
      details: `Date: ${meetingData.date}. Attendees: ${meetingData.attendees.join(', ')}. Outcome: ${meetingData.outcome}`,
    });

    await saveCrmStoreToDb();
    safeRevalidatePath('/crm');
    return acc;
  } catch (err: unknown) {
    logger.error(`Failed to add meeting for ${accountId}`, err);
    throw new AppError('Failed to add meeting.', 500);
  }
}

/**
 * Add a proposal to an account.
 */
export async function addAccountProposal(accountId: string, proposalData: Omit<CrmProposal, 'id'>): Promise<CrmAccount> {
  try {
    await AuthService.verifySession();
    logger.info(`Attaching proposal to account #${accountId}...`);
    await loadCrmStoreFromDb();

    const acc = crmAccountsStore.find(a => a.id === accountId);
    if (!acc) throw new AppError('Account not found', 404);

    const newProposal: CrmProposal = {
      ...proposalData,
      id: `prop_${Date.now()}`,
    };

    acc.proposals.unshift(newProposal);
    acc.timeline.unshift({
      id: `act_${Date.now()}`,
      type: 'Proposal',
      title: `Proposal Generated: ${proposalData.version}`,
      timeAgo: 'Just now',
      details: `Value: ${proposalData.value}, Status: ${proposalData.status}, Valid Until: ${proposalData.expiryDate}`,
    });

    await saveCrmStoreToDb();
    safeRevalidatePath('/crm');
    return acc;
  } catch (err: unknown) {
    logger.error(`Failed to add proposal for ${accountId}`, err);
    throw new AppError('Failed to add proposal.', 500);
  }
}

/**
 * Add a task to an account.
 */
export async function addAccountTask(accountId: string, taskData: Omit<CrmTask, 'id' | 'completed'>): Promise<CrmAccount> {
  try {
    await AuthService.verifySession();
    logger.info(`Adding task for account #${accountId}...`);
    await loadCrmStoreFromDb();

    const acc = crmAccountsStore.find(a => a.id === accountId);
    if (!acc) throw new AppError('Account not found', 404);

    const newTask: CrmTask = {
      ...taskData,
      id: `task_${Date.now()}`,
      completed: false,
    };

    acc.tasks.unshift(newTask);
    acc.timeline.unshift({
      id: `act_${Date.now()}`,
      type: 'Task',
      title: `Task Created: ${taskData.title}`,
      timeAgo: 'Just now',
      details: `Priority: ${taskData.priority}, Due: ${taskData.dueDate}`,
    });

    await saveCrmStoreToDb();
    safeRevalidatePath('/crm');
    return acc;
  } catch (err: unknown) {
    logger.error(`Failed to add task for ${accountId}`, err);
    throw new AppError('Failed to add task.', 500);
  }
}

/**
 * Toggle task completion status.
 */
export async function toggleAccountTask(accountId: string, taskId: string): Promise<CrmAccount> {
  try {
    await AuthService.verifySession();
    logger.info(`Toggling task #${taskId} for account #${accountId}...`);
    await loadCrmStoreFromDb();

    const acc = crmAccountsStore.find(a => a.id === accountId);
    if (!acc) throw new AppError('Account not found', 404);

    const task = acc.tasks.find(t => t.id === taskId);
    if (!task) throw new AppError('Task not found', 404);

    task.completed = !task.completed;
    acc.timeline.unshift({
      id: `act_${Date.now()}`,
      type: 'Task',
      title: task.completed ? `Task Completed: ${task.title}` : `Task Reopened: ${task.title}`,
      timeAgo: 'Just now',
      details: `Marked by Akash.`,
    });

    await saveCrmStoreToDb();
    safeRevalidatePath('/crm');
    return acc;
  } catch (err: unknown) {
    logger.error(`Failed to toggle task for ${accountId}`, err);
    throw new AppError('Failed to toggle task.', 500);
  }
}

/**
 * Add a quick note to an account's timeline.
 */
export async function addAccountNote(accountId: string, noteContent: string): Promise<CrmAccount> {
  try {
    await AuthService.verifySession();
    logger.info(`Adding quick note to account #${accountId}...`);
    await loadCrmStoreFromDb();

    const acc = crmAccountsStore.find(a => a.id === accountId);
    if (!acc) throw new AppError('Account not found', 404);

    acc.timeline.unshift({
      id: `act_${Date.now()}`,
      type: 'Note',
      title: 'Manual Activity Note',
      timeAgo: 'Just now',
      details: noteContent,
    });

    await saveCrmStoreToDb();
    safeRevalidatePath('/crm');
    return acc;
  } catch (err: unknown) {
    logger.error(`Failed to add note for ${accountId}`, err);
    throw new AppError('Failed to add note.', 500);
  }
}

/**
 * AI CRM Assistant briefing generator.
 */
export async function getAccountAiBriefing(accountId: string, companyName: string, industry: string): Promise<CrmAiBriefing> {
  try {
    await AuthService.verifySession();
    logger.info(`Generating AI CRM Briefing for account #${accountId} (${companyName})...`);

    const fallbackMock: CrmAiBriefing = {
      companySummary: `${companyName} is an active prospect in the ${industry} domain.`,
      buyingSignals: [
        'Active expansion in engineering & digital transformation',
        'High intent for dedicated software development squads',
        'Strong technology stack alignment with React & Cloud',
      ],
      recommendedServices: [
        'Dedicated 3-Engineer Agile Engineering Squad',
        'Custom Architecture & Performance Optimization',
        'HIPAA / SOC-2 Compliance Cloud Integration',
      ],
      discoveryQuestions: [
        'What are your primary technical debt roadblocks for Q3/Q4?',
        'Do you currently have in-house bandwidth for new feature sprints?',
        'What is your target timeline for launching the next milestone?',
      ],
      riskAnalysis: [
        'Decision maker review cycle typically requires 7-10 business days.',
      ],
      probabilityToClose: 75,
      competitorSignals: [
        'Evaluating 2 competing agency proposals.',
      ],
      recommendedNextAction: 'Schedule a 25-min technical alignment call to demonstrate squad velocity case studies.',
      upsellSuggestions: [
        'Quarterly DevOps & SRE monitoring add-on.',
        'Continuous automated QA testing package.',
      ],
    };

    const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
    if (!apiKey) {
      logger.warn('No AI API Key found, using mock briefing.');
      return fallbackMock;
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const systemPrompt = `You are an expert Enterprise CRM Intelligence Assistant.
Analyze the company: ${companyName} in the ${industry} industry.
Generate a JSON structured AI briefing predicting their buying signals, recommended services, discovery questions, and next actions.
Use realistic enterprise sales terminology. Ensure the data feels highly personalized to their industry.
Output ONLY valid JSON matching this exact schema:
{
  "companySummary": "string",
  "buyingSignals": ["string"],
  "recommendedServices": ["string"],
  "discoveryQuestions": ["string"],
  "riskAnalysis": ["string"],
  "probabilityToClose": number,
  "competitorSignals": ["string"],
  "recommendedNextAction": "string",
  "upsellSuggestions": ["string"]
}`;

    const requestBody = {
      contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    };

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Gemini HTTP Error: ${response.status}`);
      }

      const data = await response.json();
      const textPart = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textPart) {
        return JSON.parse(textPart.trim()) as CrmAiBriefing;
      }
    } catch (apiErr) {
      logger.error('Gemini API failed for CRM briefing, falling back to mock.', apiErr);
    }

    return fallbackMock;
  } catch (err: unknown) {
    logger.error(`Failed to generate AI CRM briefing for ${accountId}`, err);
    throw new AppError('AI CRM briefing failed.', 500);
  }
}

/**
 * Import and Sync High-Intent Apollo & Discovery Leads into CRM with Deduplication.
 */
export async function importLeadsFromDiscovery() {
  try {
    await AuthService.verifySession();
    logger.info('Syncing high-intent Discovery & Apollo leads into CRM...');

    // Fetch verified leads from Discovery engine (Apollo & database providers)
    const discoveryData = await getUniversalLeadDiscoveryDataAction(
      '',
      { apollo: true, github: true, crunchbase: true, producthunt: true, reddit: true, linkedin: true },
      1,
      25
    );
    const rawLeads = discoveryData.leads || [];

    await loadCrmStoreFromDb();

    // Filter out leads that already exist in CRM by domain or company name (case-insensitive deduplication)
    const existingDomains = new Set(crmAccountsStore.map(a => a.domain.toLowerCase().trim()));
    const existingNames = new Set(crmAccountsStore.map(a => a.name.toLowerCase().trim()));

    const newLeadsToImport = rawLeads.filter(lead => {
      const dom = (lead.domain || '').toLowerCase().trim();
      const nm = (lead.companyName || '').toLowerCase().trim();
      return dom && !existingDomains.has(dom) && !existingNames.has(nm);
    });

    if (newLeadsToImport.length === 0) {
      return {
        success: true,
        count: 0,
        message: `All ${rawLeads.length} discovered Apollo leads are already synced in your CRM pipeline.`,
      };
    }

    // Limit to top batch of up to 6 unique leads per sync click for clean manageable intake
    const batchToImport = newLeadsToImport.slice(0, 6);

    const newlyCreated: CrmAccount[] = batchToImport.map((lead, idx) => {
      let numericBudget = lead.buyingScore >= 90 ? 75000 : 50000;
      if (lead.estimatedBudgetUsd && lead.estimatedBudgetUsd !== 'N/A') {
        const match = lead.estimatedBudgetUsd.match(/[0-9][0-9,.]*/);
        if (match) {
          numericBudget = parseInt(match[0].replace(/[^0-9]/g, ''), 10);
        }
      }
      
      const estArr = lead.fundingSummary || `$${Math.max(4, Math.floor((lead.employeeCount || 80) * 0.14))}M ARR`;

      return {
        id: `crm_acc_${lead.domain.replace(/[^a-z0-9]/g, '_')}_${Date.now()}_${idx}`,
        name: lead.companyName,
        domain: lead.domain,
        industry: lead.industry || 'Technology & B2B SaaS',
        location: lead.country || 'United States',
        revenue: estArr,
        employeeCount: lead.employeeCount || 120,
        stage: 'Lead',
        dealValue: lead.estimatedBudgetUsd || `$${numericBudget.toLocaleString()}`,
        dealValueNumber: numericBudget,
        winProbability: lead.conversionProbabilityPercent || Math.min(95, Math.floor(lead.buyingScore * 0.85)),
        owner: 'Akash (BD Owner)',
        technologies: lead.primaryTechStack && lead.primaryTechStack.length > 0 ? lead.primaryTechStack : ['React 19', 'TypeScript', 'Node.js', 'AWS'],
        decisionMakers: lead.recommendedContactName ? [
          {
            name: lead.recommendedContactName,
            title: lead.recommendedContactTitle || 'Head of Engineering',
            email: lead.contactEmail || `contact@${lead.domain}`,
            phone: lead.contactPhone || undefined,
            linkedinUrl: lead.contactLinkedinUrl || undefined,
          }
        ] : [],
        meetings: [],
        proposals: [],
        tasks: [
          {
            id: `task_${Date.now()}_${idx}`,
            title: `Review Apollo verified buying signals for ${lead.companyName} & schedule intro`,
            priority: 'HIGH',
            dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
            completed: false,
            assignedUser: 'Akash (BD Owner)',
          }
        ],
        timeline: [
          {
            id: `act_${Date.now()}_${idx}`,
            type: 'Apollo Research',
            title: 'Imported from Apollo Discovery Engine',
            timeAgo: 'Just now',
            details: lead.whyContactReason || `Verified Apollo B2B Lead with Buying Intent Score: ${lead.buyingScore}/100.`,
          }
        ],
        tags: ['Apollo-Sync', lead.tier || 'HIGH', ...(lead.matchedProviders || ['apollo'])],
        createdDate: new Date().toISOString().split('T')[0],
      };
    });

    crmAccountsStore = [...newlyCreated, ...crmAccountsStore];
    await saveCrmStoreToDb();
    safeRevalidatePath('/crm');

    return {
      success: true,
      count: newlyCreated.length,
      message: `Successfully synced ${newlyCreated.length} verified Apollo leads into your CRM pipeline!`,
    };
  } catch (err: unknown) {
    logger.error('Failed to import leads from discovery', err);
    throw new AppError('Failed to import leads.', 500);
  }
}

/**
 * Create a new CRM Deal / Account directly from a Marketplace Opportunity.
 */
export async function createCrmDealFromMarketplaceOpportunity(data: {
  projectTitle: string;
  clientCountry: string;
  budget: string;
  technologyStack: string[];
  projectUrl: string;
}) {
  try {
    await AuthService.verifySession();
    logger.info(`Creating CRM Deal from Marketplace RFP: '${data.projectTitle}' (${data.budget})...`);
    
    // Parse numeric budget safely
    const budgetStr = data.budget || '$50,000';
    const numericBudget = parseInt(String(budgetStr).replace(/[^0-9]/g, ''), 10) || 50000;
    const titleStr = data.projectTitle || 'Enterprise RFP Opportunity';
    
    const newDeal: CrmAccount = {
      id: `crm_deal_${Date.now()}`,
      name: titleStr.length > 35 ? `${titleStr.slice(0, 35)}...` : titleStr,
      domain: `${titleStr.toLowerCase().replace(/[^a-z0-9]/g, '') || 'client'}.com`,
      industry: 'Marketplace RFP Prospect',
      location: data.clientCountry || 'Global Client',
      revenue: 'Inbound Project',
      employeeCount: 20,
      stage: 'Lead',
      dealValue: budgetStr,
      dealValueNumber: numericBudget,
      winProbability: 50,
      owner: 'Akash (BD Owner)',
      technologies: (data.technologyStack && data.technologyStack.length > 0) ? data.technologyStack : ['Full-Stack Engineering'],
      decisionMakers: [],
      meetings: [],
      proposals: [],
      tasks: [
        {
          id: `task_${Date.now()}`,
          title: `Prepare technical proposal for RFP: ${titleStr.slice(0, 30)}`,
          priority: 'HIGH',
          dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
          completed: false,
          assignedUser: 'Akash',
        }
      ],
      timeline: [
        {
          id: `act_${Date.now()}`,
          type: 'Marketplace RFP',
          title: 'Imported from Marketplace Opportunity',
          timeAgo: 'Just now',
          details: `Source: ${data.projectUrl}. Budget: ${data.budget}`,
        }
      ],
      tags: ['Marketplace-RFP', 'Inbound'],
      createdDate: new Date().toISOString().split('T')[0],
    };

    await loadCrmStoreFromDb();
    crmAccountsStore.unshift(newDeal);
    await saveCrmStoreToDb();
    safeRevalidatePath('/crm');
    return {
      success: true,
      dealId: newDeal.id,
      message: `Created CRM Deal for '${data.projectTitle.slice(0, 30)}...' with stage 'Lead' and budget ${data.budget}`,
    };
  } catch (err: unknown) {
    logger.error('Failed to create CRM deal from marketplace opportunity', err);
    throw new AppError('Failed to create CRM deal.', 500);
  }
}

/**
 * Link AI Outreach Message record directly to CRM Account timeline.
 */
export async function linkOutreachToCrmActivity(data: {
  companyDomain: string;
  draftId: string;
  channel: string;
  subjectLine: string;
}) {
  try {
    await AuthService.verifySession();
    logger.info(`CRM Activity Integration: Linking outreach draft #${data.draftId} (${data.channel}) to account '${data.companyDomain}'...`);
    await loadCrmStoreFromDb();
    
    const acc = crmAccountsStore.find(a => a.domain.toLowerCase() === data.companyDomain.toLowerCase() || a.name.toLowerCase().includes(data.companyDomain.toLowerCase()));
    if (acc) {
      acc.timeline.unshift({
        id: `act_${Date.now()}`,
        type: 'Email',
        title: `Outreach Sent: ${data.subjectLine.slice(0, 40)}`,
        timeAgo: 'Just now',
        details: `Channel: ${data.channel}. Draft ID: #${data.draftId}`,
      });
    }
    
    await saveCrmStoreToDb();
    safeRevalidatePath('/crm');
    return { success: true, message: `Linked outreach draft #${data.draftId} to CRM activity timeline.` };
  } catch (err: unknown) {
    logger.error('Failed to link outreach to CRM activity', err);
    throw new AppError('Outreach CRM linking failed.', 500);
  }
}
