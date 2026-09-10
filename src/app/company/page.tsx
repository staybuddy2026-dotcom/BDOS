'use client';

import { useState, useCallback, useEffect } from 'react';
import blob from '@/assets/blob.png';
import {
  Building,
  Search,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Briefcase,
  Send,
  Trash2,
  X,
  ArrowRight
} from 'lucide-react';
import {
  getCompany360Profile,
  searchCompanies360,
  createCrmDealFromCompany360,
  sendCompany360ToReviewQueue
} from '@/features/company360/actions';
import { removeMigratedCompanyAction, getMigratedCompaniesFromDbAction } from '@/features/discovery/actions';
import {
  Company360Profile,
  Company360SearchResult
} from '@/features/company360/types';
import { CompanyOverviewPanel } from '@/components/company360/CompanyOverview';
import { IcpFitCard } from '@/components/icp/IcpFitCard';
import { calculateIcpMatchScore } from '@/features/icp/engine';
import { WhyNotThisCompany } from '@/components/company360/WhyNotThisCompany';
import { ProjectValueCard } from '@/components/company360/ProjectValueCard';
import { CompetitiveFitPanel } from '@/components/company360/CompetitiveFitPanel';
import { AICopilotPanel } from '@/components/company360/AICopilotPanel';
import { OpportunityPlaybook } from '@/components/company360/OpportunityPlaybook';
import { generateOpportunityPlaybook } from '@/features/playbook/generator';
import { evaluateNegativeQualification } from '@/features/icp/negativeQualification';
import { estimateProjectValue } from '@/features/icp/valueEngine';
import { analyzeCompetitiveFit } from '@/features/icp/competitiveFit';
import { DecisionMakerPanel } from '@/components/company360/DecisionMakerPanel';
import { EngineeringPanel } from '@/components/company360/EngineeringPanel';
import { AIInsightsPanel } from '@/components/company360/AIInsightsPanel';
import { GrowthPanel } from '@/components/company360/GrowthPanel';
import { FundingTimeline } from '@/components/company360/FundingTimeline';
import { InvestorPanel } from '@/components/company360/InvestorPanel';
import { ProductLaunchPanel } from '@/components/company360/ProductLaunchPanel';
import { MakerPanel } from '@/components/company360/MakerPanel';
import { CommunityPanel } from '@/components/company360/CommunityPanel';
import { RedditPanel } from '@/components/company360/RedditPanel';
import { BuyingIntentPanel } from '@/components/company360/BuyingIntentPanel';
import { TechnologyDiscussionPanel } from '@/components/company360/TechnologyDiscussionPanel';
import { LinkedInPanel } from '@/components/company360/LinkedInPanel';
import { HiringPanel } from '@/components/company360/HiringPanel';
import { SocialActivityPanel } from '@/components/company360/SocialActivityPanel';
import { EngagementPanel } from '@/components/company360/EngagementPanel';
import { BreadcrumbHeader } from '@/components/navigation/BreadcrumbHeader';
import '@/styles/globals.css';

interface MigratedLeadRecord {
  companyId: string;
  companyName: string;
  domain: string;
  industry?: string;
  country?: string;
  employeeCount?: number;
  buyingScore?: number;
  icpScore?: number;
}

const DEFAULT_MIGRATED_LEADS: Record<string, MigratedLeadRecord> = {};

const DEFAULT_MIGRATED_IDS: string[] = [];

export default function Company360WorkspacePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Company360SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Selected Profile for 360 Drawer
  const [selectedProfile, setSelectedProfile] = useState<Company360Profile | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'overview' | 'decision-makers' | 'engineering' | 'growth' | 'producthunt' | 'reddit' | 'linkedin' | 'ai-insights' | 'playbook' | 'timeline'>('overview');
  const [profileLoading, setProfileLoading] = useState(false);

  // Notification Toast
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const triggerNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Migrated Company 360 IDs persistent state
  const [migratedCompanyIds, setMigratedCompanyIds] = useState<string[]>(DEFAULT_MIGRATED_IDS);

  const [migratedLeadsMap, setMigratedLeadsMap] = useState<Record<string, MigratedLeadRecord>>(DEFAULT_MIGRATED_LEADS);

  const syncFromLocalStorage = useCallback(() => {
    if (typeof window === 'undefined') return;

    let removedList: string[] = [];
    const savedRemoved = localStorage.getItem('bdos_company360_removed_ids');
    if (savedRemoved) {
      try {
        removedList = (JSON.parse(savedRemoved) as string[]).map((x) => String(x).toLowerCase().trim());
      } catch { }
    }

    const savedLeads = localStorage.getItem('bdos_company360_migrated_leads');
    let userLeadsMap: Record<string, MigratedLeadRecord> = {};
    if (savedLeads) {
      try { userLeadsMap = JSON.parse(savedLeads); } catch { }
    }

    const combinedMap: Record<string, MigratedLeadRecord> = { ...DEFAULT_MIGRATED_LEADS };
    Object.entries(userLeadsMap).forEach(([k, item]) => {
      if (item && typeof item === 'object') {
        const key = (item.domain || item.companyId || k).toLowerCase().trim();
        if (key) combinedMap[key] = item;
      }
    });

    const finalMap: Record<string, MigratedLeadRecord> = {};
    const finalIdsSet = new Set<string>();

    Object.entries(combinedMap).forEach(([k, lead]) => {
      const key = k.toLowerCase().trim();
      const dom = (lead.domain || '').toLowerCase().trim();
      const id = (lead.companyId || '').toLowerCase().trim();

      const isExplicitUserMigration = Boolean(userLeadsMap[dom] || userLeadsMap[id] || userLeadsMap[key]);
      const isRemoved = !isExplicitUserMigration && (removedList.includes(key) || removedList.includes(dom) || removedList.includes(id));

      if (!isRemoved) {
        finalMap[dom || key] = lead;
        if (dom) finalIdsSet.add(dom);
        if (id) finalIdsSet.add(id);
        if (key) finalIdsSet.add(key);
      }
    });

    setMigratedCompanyIds(Array.from(finalIdsSet));
    setMigratedLeadsMap(finalMap);
  }, []);

  useEffect(() => {
    setTimeout(() => {
      syncFromLocalStorage();
    }, 0);
    getMigratedCompaniesFromDbAction().then((dbRes) => {
      if (dbRes && dbRes.migratedLeadsMap && Object.keys(dbRes.migratedLeadsMap).length > 0) {
        if (typeof window !== 'undefined') {
          const savedLeads = localStorage.getItem('bdos_company360_migrated_leads');
          let localMap: Record<string, MigratedLeadRecord> = {};
          if (savedLeads) { try { localMap = JSON.parse(savedLeads); } catch { } }
          const mergedLeads = { ...dbRes.migratedLeadsMap, ...localMap };
          localStorage.setItem('bdos_company360_migrated_leads', JSON.stringify(mergedLeads));
          const savedIds = localStorage.getItem('bdos_company360_migrated_ids');
          let localIds: string[] = [];
          if (savedIds) { try { localIds = JSON.parse(savedIds); } catch { } }
          const mergedIds = Array.from(new Set([...localIds, ...dbRes.migratedCompanyIds]));
          localStorage.setItem('bdos_company360_migrated_ids', JSON.stringify(mergedIds));
          syncFromLocalStorage();
        }
      }
    }).catch(() => null);

    window.addEventListener('storage', syncFromLocalStorage);
    window.addEventListener('focus', syncFromLocalStorage);
    return () => {
      window.removeEventListener('storage', syncFromLocalStorage);
      window.removeEventListener('focus', syncFromLocalStorage);
    };
  }, [syncFromLocalStorage]);

  const handleRemoveFromCompany360 = async (company: Company360SearchResult) => {
    const domain = (company.domain || '').toLowerCase().trim();
    const companyId = (company.companyId || '').toLowerCase().trim();
    const removeKeys = [domain, companyId, `comp_${domain.replace(/[^a-z0-9]/g, '_')}`].filter(Boolean);

    let currentRemoved: string[] = [];
    if (typeof window !== 'undefined') {
      const savedRemoved = localStorage.getItem('bdos_company360_removed_ids');
      if (savedRemoved) {
        try { currentRemoved = JSON.parse(savedRemoved); } catch { }
      }
    }
    const nextRemoved = Array.from(new Set([...currentRemoved, ...removeKeys]));

    const nextIds = migratedCompanyIds.filter((id) => !removeKeys.includes(id.toLowerCase().trim()));
    setMigratedCompanyIds(nextIds);

    const nextMap = { ...migratedLeadsMap };
    removeKeys.forEach((k) => delete nextMap[k]);
    setMigratedLeadsMap(nextMap);

    if (typeof window !== 'undefined') {
      localStorage.setItem('bdos_company360_removed_ids', JSON.stringify(nextRemoved));
      localStorage.setItem('bdos_company360_migrated_ids', JSON.stringify(nextIds));
      localStorage.setItem('bdos_company360_migrated_leads', JSON.stringify(nextMap));
    }

    // Persist removal to PostgreSQL database ApplicationSettings
    await removeMigratedCompanyAction(domain, companyId).catch(() => null);

    triggerNotification('success', `Removed ${company.companyName} from Company 360.`);
    if (selectedProfile?.companyId === companyId || (company.domain && selectedProfile?.domain === company.domain)) {
      setShowDrawer(false);
      setSelectedProfile(null);
    }
  };

  // Run Search
  const runSearch = useCallback(async () => {
    setLoading(true);
    try {
      const results = await searchCompanies360(searchQuery);
      setSearchResults(results);
    } catch {
      triggerNotification('error', 'Company 360 search query failed.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    let active = true;
    async function run() {
      if (!active) return;
      await runSearch();
    }
    run();
    return () => { active = false; };
  }, [runSearch]);

  // Open Full Company 360 Profile
  const handleOpenCompany360 = useCallback(async (companyId: string) => {
    setShowDrawer(true);
    setProfileLoading(true);
    try {
      const profile = await getCompany360Profile(companyId);
      setSelectedProfile(profile);
    } catch {
      triggerNotification('error', 'Failed to load Company 360 profile.');
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('query') || params.get('id');
      if (q) {
        setTimeout(() => {
          if (!active) return;
          handleOpenCompany360(q);
          window.history.replaceState({}, '', window.location.pathname);
        }, 0);
      }
    }
    return () => { active = false; };
  }, [handleOpenCompany360]);

  // Confirmation Modal States
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'create_deal' | 'review_queue' | 'delete_company';
    company: Company360SearchResult | null;
    title: string;
    description: string;
  }>({
    isOpen: false,
    type: 'create_deal',
    company: null,
    title: '',
    description: '',
  });
  const [modalLoading, setModalLoading] = useState(false);

  const promptCreateCrmDeal = (company: Company360SearchResult) => {
    setConfirmModal({
      isOpen: true,
      type: 'create_deal',
      company,
      title: `Create Enterprise CRM Deal`,
      description: `Do you really wish to create an Enterprise CRM Deal for "${company.companyName}" and migrate it directly into your CRM Pipeline?`,
    });
  };

  const promptSendToReviewQueue = (company: Company360SearchResult) => {
    setConfirmModal({
      isOpen: true,
      type: 'review_queue',
      company,
      title: `Dispatch to Review Queue`,
      description: `Do you really wish to send "${company.companyName}" to the Review Queue for BDE approval?`,
    });
  };

  const promptRemoveCompany = (company: Company360SearchResult) => {
    setConfirmModal({
      isOpen: true,
      type: 'delete_company',
      company,
      title: `Confirm Delete / Removal`,
      description: `Do you really wish to delete "${company.companyName}" from Company 360?`,
    });
  };

  const handleExecuteModalAction = async () => {
    if (!confirmModal.company) return;
    const company = confirmModal.company;
    const targetId = company.domain || company.companyId;
    setModalLoading(true);

    try {
      if (confirmModal.type === 'create_deal') {
        const res = await createCrmDealFromCompany360(targetId);
        triggerNotification('success', `✓ ${res.message} Migrated to CRM Pipeline!`);
        await runSearch();
      } else if (confirmModal.type === 'review_queue') {
        const res = await sendCompany360ToReviewQueue(targetId);
        triggerNotification('success', `✓ ${res.message}`);
      } else if (confirmModal.type === 'delete_company') {
        await handleRemoveFromCompany360(company);
      }
    } catch {
      triggerNotification('error', `Failed to process action.`);
    } finally {
      setModalLoading(false);
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleCreateCrmDeal = async (companyId: string, serviceName?: string) => {
    try {
      const res = await createCrmDealFromCompany360(companyId, serviceName);
      triggerNotification('success', `✓ ${res.message} Migrated to CRM Pipeline!`);
      await runSearch();
    } catch {
      triggerNotification('error', 'Failed to create CRM deal.');
    }
  };

  const handleSendToReviewQueue = async (companyId: string) => {
    try {
      const res = await sendCompany360ToReviewQueue(companyId);
      triggerNotification('success', `✓ ${res.message}`);
    } catch {
      triggerNotification('error', 'Failed to send to Review Queue.');
    }
  };

  // Compute clean list of all companies combining server search results and migrated leads map
  const displayedCompanies = (() => {
    const map = new Map<string, Company360SearchResult>();

    searchResults.forEach((c) => {
      const key = (c.domain || c.companyId).toLowerCase().trim();
      if (migratedCompanyIds.includes(key) || migratedCompanyIds.includes(c.companyId.toLowerCase())) {
        map.set(key, c);
      }
    });

    Object.values(migratedLeadsMap).forEach((lead) => {
      if (lead) {
        const id = lead.companyId || lead.domain;
        const key = (lead.domain || id).toLowerCase().trim();
        if (key && (migratedCompanyIds.includes(key) || migratedCompanyIds.includes(id.toLowerCase()))) {
          map.set(key, {
            companyId: id,
            companyName: lead.companyName || lead.domain || 'Migrated Company',
            domain: lead.domain || key,
            industry: lead.industry || 'Technology & B2B Software',
            headquarters: lead.country || 'USA',
            employeeCount: lead.employeeCount !== undefined ? lead.employeeCount : 250,
            opportunityScore: lead.buyingScore || 88,
            engineeringMaturity: lead.icpScore || 92,
            sourcesAvailable: ['Apollo', 'GitHub', 'AI'],
          });
        }
      }
    });

    let list = Array.from(map.values());
    if (searchQuery && searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c =>
        c.companyName.toLowerCase().includes(q) ||
        c.domain.toLowerCase().includes(q) ||
        c.industry.toLowerCase().includes(q)
      );
    }
    return list;
  })();

  return (
    <div className="apollo-search-workspace" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', gap: 0, paddingBottom: 0, boxSizing: 'border-box' }}>
      <style>{`
        .premium-kpi-card {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 1);
          border-radius: 12px;
          padding: 20px;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 
            0 10px 30px -5px rgba(15, 23, 42, 0.04),
            inset 0 0 0 1px rgba(255, 255, 255, 0.5);
          position: relative;
          overflow: hidden;
          cursor: pointer;
        }
        .premium-kpi-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background: linear-gradient(135deg, var(--glow-color) 0%, transparent 50%);
          opacity: 0.3;
          transition: opacity 0.4s ease;
          pointer-events: none;
        }
        .premium-kpi-card:hover {
          transform: translateY(-6px) scale(1.02);
          box-shadow: 
            0 20px 40px -10px rgba(15, 23, 42, 0.08),
            inset 0 0 0 1px rgba(255, 255, 255, 0.8);
          border-color: transparent;
        }
        .premium-kpi-card:hover::before {
          opacity: 0.6;
        }
        .kpi-glow {
          position: absolute;
          bottom: -30px;
          right: -30px;
          width: 140px;
          height: 140px;
          border-radius: 50%;
          background: var(--glow-color);
          filter: blur(40px);
          opacity: 0.5;
          transition: all 0.5s ease;
          pointer-events: none;
        }
        .premium-kpi-card:hover .kpi-glow {
          transform: scale(1.3);
          opacity: 0.8;
        }
        .empty-queue-box {
          border: 1.5px dashed #bfdbfe;
          border-radius: 12px;
          padding: 40px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }
        .empty-queue-box:hover {
          border-color: #60a5fa;
          background: #eff6ff;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(59, 130, 246, 0.1);
        }
        .empty-queue-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #eff6ff, #dbeafe);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3b82f6;
          margin-bottom: 16px;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .empty-queue-box:hover .empty-queue-icon {
          transform: scale(1.1) rotate(15deg);
          color: #2563eb;
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.25);
        }
        .interactive-greeting {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 30px;
          border-radius: 16px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid rgba(255, 255, 255, 0.1);
          background-color: #4f46e5;
          background-image: 
            radial-gradient(at 0% 0%, #3b82f6 0px, transparent 60%),
            radial-gradient(at 100% 100%, #a855f7 0px, transparent 60%),
            radial-gradient(at 50% 100%, #6366f1 0px, transparent 50%);
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 30px -5px rgba(99, 102, 241, 0.3);
          color: white;
        }
        .greeting-icon-box {
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.25);
          padding: 16px;
          border-radius: 14px;
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
      `}</style>

      {/* Toast Notification */}
      {notification && (
        <div className={`notification-toast ${notification.type}`} style={{ zIndex: 99999 }}>
          {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          {notification.message}
        </div>
      )}

      {/* HEADER BANNER */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        borderBottom: '1px solid var(--border-subtle)',
        height: '65px',
        flexShrink: 0,
        padding: '0 28px',
        background: 'var(--bg-primary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)', padding: '8px', borderRadius: '8px', boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)' }}>
            <Building size={20} style={{ color: '#ffffff' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, background: 'linear-gradient(135deg, #0f172a, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
              Company 360 Intelligence Platform
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#8ba0cb', fontWeight: 600, letterSpacing: '0.03em', marginTop: '4px', margin: 0 }}>
              Master Company Profiles: Cross-provider data fusion from Apollo (Decision Makers) & GitHub (Engineering Intelligence).
            </p>
          </div>
        </div>

        {/* Live Engine Status Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.76rem', background: 'var(--color-success-bg)', color: 'var(--color-success)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 14px', borderRadius: '20px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-success)' }} /> Identity Resolution Engine Active
            </span>
          </div>
        </div>
      </div>

      {/* SCROLLABLE MAIN CONTENT */}
      <div
        className="dashboard-scrollable-content"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 28px 40px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          position: 'relative',
          backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.6), rgba(248, 250, 252, 0.6)), url(${blob.src})`,
          backgroundSize: 'cover',
          backgroundPosition: 'top right',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
        {/* Top Navigation & Breadcrumb */}
        <BreadcrumbHeader
          currentTitle="Company 360 Workspace"
          stepNumber={2}
          totalSteps={7}
          badge="Multi-Signal Intelligence"
        />

        {/* TOP KPI STATS BAR */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div className="premium-kpi-card" style={{ '--glow-color': 'rgba(59, 130, 246, 0.15)' } as React.CSSProperties}>
            <div className="kpi-glow"></div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '50%', color: '#2563eb', display: 'flex' }}>
                  <Building size={16} strokeWidth={2.5} />
                </div>
                <span style={{ fontSize: '1rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Fused Companies</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div>
                <div suppressHydrationWarning style={{ fontSize: '1.9rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{displayedCompanies.length}</div>
                <div style={{ fontSize: '0.8rem', color: '#2563eb', marginTop: '8px', fontWeight: 600 }}>Master AI Profiles</div>
              </div>
              <div style={{ border: '1px solid #dbeafe', borderRadius: '50%', padding: '6px', color: '#2563eb', display: 'flex', background: '#eff6ff' }}>
                <ArrowRight size={14} strokeWidth={2.5} />
              </div>
            </div>
          </div>

          <div className="premium-kpi-card" style={{ '--glow-color': 'rgba(139, 92, 246, 0.15)' } as React.CSSProperties}>
            <div className="kpi-glow"></div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: '#f3e8ff', padding: '10px', borderRadius: '50%', color: '#9333ea', display: 'flex' }}>
                  <Briefcase size={16} strokeWidth={2.5} />
                </div>
                <span style={{ fontSize: '1rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Apollo Executives</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div>
                <div suppressHydrationWarning style={{ fontSize: '1.9rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{displayedCompanies.length > 0 ? displayedCompanies.length * 3 : 0}</div>
                <div style={{ fontSize: '0.8rem', color: '#9333ea', marginTop: '8px', fontWeight: 600 }}>Identified CTOs & VPs</div>
              </div>
              <div style={{ border: '1px solid #e9d5ff', borderRadius: '50%', padding: '6px', color: '#9333ea', display: 'flex', background: '#f3e8ff' }}>
                <ArrowRight size={14} strokeWidth={2.5} />
              </div>
            </div>
          </div>

          <div className="premium-kpi-card" style={{ '--glow-color': 'rgba(14, 165, 233, 0.15)' } as React.CSSProperties}>
            <div className="kpi-glow"></div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: '#e0f2fe', padding: '10px', borderRadius: '50%', color: '#0284c7', display: 'flex' }}>
                  <Clock size={16} strokeWidth={2.5} />
                </div>
                <span style={{ fontSize: '1rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>GitHub Repos Indexed</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div>
                <div suppressHydrationWarning style={{ fontSize: '1.9rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{displayedCompanies.length > 0 ? displayedCompanies.length * 18 : 0}</div>
                <div style={{ fontSize: '0.8rem', color: '#0284c7', marginTop: '8px', fontWeight: 600 }}>Engineering Activity Signals</div>
              </div>
              <div style={{ border: '1px solid #bae6fd', borderRadius: '50%', padding: '6px', color: '#0284c7', display: 'flex', background: '#e0f2fe' }}>
                <ArrowRight size={14} strokeWidth={2.5} />
              </div>
            </div>
          </div>

          <div className="premium-kpi-card" style={{ '--glow-color': 'rgba(16, 185, 129, 0.15)' } as React.CSSProperties}>
            <div className="kpi-glow"></div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: '#ecfdf5', padding: '10px', borderRadius: '50%', color: '#059669', display: 'flex' }}>
                  <CheckCircle size={16} strokeWidth={2.5} />
                </div>
                <span style={{ fontSize: '1rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Target Deal Pipeline</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div>
                <div suppressHydrationWarning style={{ fontSize: '1.9rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{displayedCompanies.length > 0 ? `₹${(displayedCompanies.length * 2850000).toLocaleString('en-IN')}` : '₹0'}</div>
                <div style={{ fontSize: '0.8rem', color: '#059669', marginTop: '8px', fontWeight: 600 }}>Estimated Total Value</div>
              </div>
              <div style={{ border: '1px solid #a7f3d0', borderRadius: '50%', padding: '6px', color: '#059669', display: 'flex', background: '#ecfdf5' }}>
                <ArrowRight size={14} strokeWidth={2.5} />
              </div>
            </div>
          </div>
        </div>

        {/* SEARCH BAR */}
        <style>{`
          .premium-search-wrapper {
            background: #ffffff;
            border: 1.5px solid #e2e8f0;
            border-radius: 12px;
            padding: 8px 8px 8px 24px;
            display: flex;
            align-items: center;
            gap: 16px;
            box-shadow: 0 10px 40px -10px rgba(15, 23, 42, 0.08);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .premium-search-wrapper:hover {
            border-color: #cbd5e1;
            box-shadow: 0 14px 45px -10px rgba(15, 23, 42, 0.12);
          }
          .premium-search-wrapper:focus-within {
            border-color: #6366f1;
            box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15), 0 10px 40px -10px rgba(15, 23, 42, 0.08);
            transform: translateY(-1px);
          }
          input#premium-search-input {
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
            font-size: 1.15rem !important;
            padding: 12px 0 !important;
            color: #0f172a !important;
            flex: 1;
            outline: none !important;
          }
          input#premium-search-input:focus {
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
          }
          input#premium-search-input::placeholder {
            color: #94a3b8 !important;
            font-weight: 500 !important;
            font-size: 1.05rem !important;
          }
        `}</style>
        <div className="premium-search-wrapper">
          <Search size={24} style={{ color: '#6366f1' }} />
          <input
            id="premium-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company by name, domain, industry (e.g. Acme Healthcare)..."
          />
          <button
            onClick={runSearch}
            style={{
              padding: '14px 32px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.95rem',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(99, 102, 241, 0.5)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(99, 102, 241, 0.4)'; }}
          >
            <Search size={18} strokeWidth={2.5} /> Search 360
          </button>
        </div>

        {/* COMPANY RESULTS LIST */}
        <div style={{ background: '#ffffff', border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.03)' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e3a8a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: '#e0e7ff', color: '#4338ca' }}>
              <Building size={16} strokeWidth={2.5} />
            </div>
            Master Company 360 Profiles (<span suppressHydrationWarning style={{ color: '#6366f1' }}>{displayedCompanies.length}</span>)
          </div>

          {loading ? (
            <div className="empty-queue-box">
              <RotateCcw size={32} className="animate-spin" style={{ marginBottom: '12px', color: '#6366f1' }} />
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e40af' }}>
                Correlating cross-provider company identity...
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '6px' }}>
                Fusing data from Apollo & GitHub.
              </div>
            </div>
          ) : displayedCompanies.length === 0 ? (
            <div className="empty-queue-box">
              <div className="empty-queue-icon">
                <Search size={24} strokeWidth={2.5} />
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e40af', marginBottom: '6px' }}>
                No fused companies found.
              </div>
              <div style={{ fontSize: '0.85rem', color: '#60a5fa', fontWeight: 500 }}>
                Try adjusting your search criteria or domain.
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 460px))', gap: '16px' }}>
              {displayedCompanies.map((company) => {
                const displayDomainBadge = (company.domain && !company.domain.startsWith('apollo_live_'))
                  ? company.domain
                  : (company.companyName && company.companyName !== 'Organization' ? `${company.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com` : 'Apollo Prospecting Lead');

                const displayCompanyName = (company.companyName && company.companyName !== 'Organization')
                  ? company.companyName
                  : 'Apollo Enterprise Account';

                return (
                  <div
                    key={company.companyId}
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px', transition: 'all 0.15s ease', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}
                  >
                    <div>
                      {/* Top Row */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div>
                          <span style={{ fontSize: '0.68rem', background: 'var(--accent-indigo-glow)', border: '1px solid var(--border-focus)', color: 'var(--accent-indigo)', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                            {displayDomainBadge}
                          </span>
                          <h3
                            onClick={() => handleOpenCompany360(company.domain || company.companyId)}
                            style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)', margin: '6px 0 0 0', cursor: 'pointer' }}
                          >
                            {displayCompanyName}
                          </h3>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--color-success)' }}>
                            Score: {company.opportunityScore}/100
                          </span>
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Eng Maturity: {company.engineeringMaturity}/100
                          </div>
                        </div>
                      </div>

                      {/* Dynamic Company Meta Tag Sub-line */}
                      {(() => {
                        const metaParts: string[] = [];
                        if (company.industry && company.industry !== 'Software & Tech') metaParts.push(company.industry);
                        if (company.headquarters && company.headquarters !== 'USA') metaParts.push(company.headquarters);
                        if (company.employeeCount && company.employeeCount > 0) metaParts.push(`${company.employeeCount.toLocaleString()} employees`);

                        if (metaParts.length === 0) return null;

                        return (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                            {metaParts.join(' • ')}
                          </div>
                        );
                      })()}

                      {/* Fused Provenance Pills */}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                        <span style={{ fontSize: '0.64rem', background: 'var(--accent-indigo-glow)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', padding: '2px 7px', borderRadius: '4px', fontWeight: 700 }}>Apollo Executives</span>
                        <span style={{ fontSize: '0.64rem', background: 'var(--accent-indigo-glow)', border: '1px solid var(--border-focus)', color: 'var(--accent-indigo)', padding: '2px 7px', borderRadius: '4px', fontWeight: 700 }}>GitHub Engineering</span>
                        <span style={{ fontSize: '0.64rem', background: 'var(--color-success-bg)', border: '1px solid rgba(16,185,129,0.3)', color: 'var(--color-success)', padding: '2px 7px', borderRadius: '4px', fontWeight: 700 }}>AI Opportunity Engine</span>
                      </div>
                    </div>

                    {/* Actions Bar Grid (2x2 Clean Layout) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenCompany360(company.domain || company.companyId)}
                        style={{ padding: '8px 10px', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-indigo-hover))', color: '#ffffff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}
                      >
                        <Building size={13} /> Open 360
                      </button>

                      <button
                        type="button"
                        onClick={() => promptCreateCrmDeal(company)}
                        style={{ padding: '8px 10px', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 800, background: 'rgba(16, 185, 129, 0.12)', border: '1px solid #10b981', color: '#047857', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                      >
                        <Briefcase size={13} /> Create Deal
                      </button>

                      <button
                        type="button"
                        onClick={() => promptSendToReviewQueue(company)}
                        style={{ padding: '8px 10px', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 800, background: 'rgba(99, 102, 241, 0.12)', border: '1px solid #6366f1', color: '#4338ca', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                      >
                        <Send size={13} /> Review Queue
                      </button>

                      <button
                        type="button"
                        onClick={() => promptRemoveCompany(company)}
                        style={{ padding: '8px 10px', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 800, background: 'rgba(239, 68, 68, 0.12)', border: '1px solid #ef4444', color: '#b91c1c', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FULL UNIFIED COMPANY 360 MODAL / DRAWER */}
        {showDrawer && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-focus)', borderRadius: '16px', width: '100%', maxWidth: '960px', padding: '24px', boxShadow: '0 12px 40px rgba(0,0,0,0.7)', maxHeight: '92vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Building size={24} style={{ color: 'var(--accent-indigo)' }} />
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                      {selectedProfile ? selectedProfile.overview.companyName : 'Loading Company 360...'}
                    </h3>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      {selectedProfile ? `Domain: ${selectedProfile.domain} • ID: ${selectedProfile.companyId}` : ''}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {selectedProfile && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFromCompany360({ companyId: selectedProfile.companyId, companyName: selectedProfile.overview.companyName, domain: selectedProfile.domain, industry: '', headquarters: '', employeeCount: 0, opportunityScore: 0, engineeringMaturity: 0, sourcesAvailable: [] })}
                      style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '0.76rem', background: 'var(--color-danger-bg)', border: '1px solid rgba(239, 68, 68, 0.35)', color: 'var(--color-danger)', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Trash2 size={13} /> Remove Company
                    </button>
                  )}
                  <button onClick={() => setShowDrawer(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                    <X size={20} />
                  </button>
                </div>
              </div>

              {profileLoading || !selectedProfile ? (
                <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <RotateCcw size={26} className="animate-spin" style={{ margin: '0 auto 12px auto', display: 'block', color: 'var(--accent-indigo)' }} />
                  Loading cross-provider data fusion from Apollo & GitHub...
                </div>
              ) : (
                <div>
                  {/* DRAWER TAB BAR */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                    <button
                      onClick={() => setDrawerTab('overview')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        border: drawerTab === 'overview' ? '1px solid #38bdf8' : '1px solid transparent',
                        background: drawerTab === 'overview' ? 'var(--accent-indigo-glow)' : 'transparent',
                        color: drawerTab === 'overview' ? '#ffffff' : '#94a3b8',
                        cursor: 'pointer',
                      }}
                    >
                      🏢 Company Overview
                    </button>

                    <button
                      onClick={() => setDrawerTab('decision-makers')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        border: drawerTab === 'decision-makers' ? '1px solid #38bdf8' : '1px solid transparent',
                        background: drawerTab === 'decision-makers' ? 'var(--accent-indigo-glow)' : 'transparent',
                        color: drawerTab === 'decision-makers' ? '#ffffff' : '#94a3b8',
                        cursor: 'pointer',
                      }}
                    >
                      👥 Decision Makers ({selectedProfile.decisionMakers.length})
                    </button>

                    <button
                      onClick={() => setDrawerTab('engineering')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        border: drawerTab === 'engineering' ? '1px solid #38bdf8' : '1px solid transparent',
                        background: drawerTab === 'engineering' ? 'var(--accent-indigo-glow)' : 'transparent',
                        color: drawerTab === 'engineering' ? '#ffffff' : '#94a3b8',
                        cursor: 'pointer',
                      }}
                    >
                      ⚡ Engineering Intelligence
                    </button>

                    <button
                      onClick={() => setDrawerTab('growth')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        border: drawerTab === 'growth' ? '1px solid #fef08a' : '1px solid transparent',
                        background: drawerTab === 'growth' ? 'rgba(234, 179, 8, 0.2)' : 'transparent',
                        color: drawerTab === 'growth' ? '#ffffff' : '#94a3b8',
                        cursor: 'pointer',
                      }}
                    >
                      📈 Growth & Funding
                    </button>

                    {/* Product Hunt & Reddit tabs commented out for lightweight V1 release:
                  <button onClick={() => setDrawerTab('producthunt')}>🚀 Product Launch</button>
                  <button onClick={() => setDrawerTab('reddit')}>💬 Reddit Buying Intent</button>
                  */}

                    <button
                      onClick={() => setDrawerTab('linkedin')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        border: drawerTab === 'linkedin' ? '1px solid #0a66c2' : '1px solid transparent',
                        background: drawerTab === 'linkedin' ? 'rgba(10, 102, 194, 0.2)' : 'transparent',
                        color: drawerTab === 'linkedin' ? '#ffffff' : '#94a3b8',
                        cursor: 'pointer',
                      }}
                    >
                      🔗 LinkedIn Activity
                    </button>

                    <button
                      onClick={() => setDrawerTab('ai-insights')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        border: drawerTab === 'ai-insights' ? '1px solid #38bdf8' : '1px solid transparent',
                        background: drawerTab === 'ai-insights' ? 'var(--accent-indigo-glow)' : 'transparent',
                        color: drawerTab === 'ai-insights' ? '#ffffff' : '#94a3b8',
                        cursor: 'pointer',
                      }}
                    >
                      🤖 AI Sales Insights & Pitch
                    </button>

                    <button
                      onClick={() => setDrawerTab('playbook')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        border: drawerTab === 'playbook' ? '1px solid #38bdf8' : '1px solid transparent',
                        background: drawerTab === 'playbook' ? 'var(--accent-indigo-glow)' : 'transparent',
                        color: drawerTab === 'playbook' ? '#ffffff' : '#94a3b8',
                        cursor: 'pointer',
                      }}
                    >
                      📘 Opportunity Playbook
                    </button>

                    <button
                      onClick={() => setDrawerTab('timeline')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        border: drawerTab === 'timeline' ? '1px solid #38bdf8' : '1px solid transparent',
                        background: drawerTab === 'timeline' ? 'var(--accent-indigo-glow)' : 'transparent',
                        color: drawerTab === 'timeline' ? '#ffffff' : '#94a3b8',
                        cursor: 'pointer',
                      }}
                    >
                      📜 Cross-Provider Timeline
                    </button>
                  </div>

                  {/* TAB CONTENT PANELS */}
                  {drawerTab === 'overview' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <IcpFitCard result={calculateIcpMatchScore(
                        selectedProfile.companyId,
                        selectedProfile.overview.companyName,
                        selectedProfile.overview.domain,
                        selectedProfile.opportunityScoring.overallScore,
                        selectedProfile.engineering.primaryLanguages?.length ? selectedProfile.engineering.primaryLanguages : ['React', 'Node.js'],
                        selectedProfile.overview.headquarters || 'United States',
                        selectedProfile.overview.employeeCount || 100,
                        selectedProfile.overview.fundingStage || 'Bootstrapped',
                        selectedProfile.overview.industry || 'Technology'
                      )} />
                      <AICopilotPanel companyName={selectedProfile.overview.companyName} />
                      <CompanyOverviewPanel overview={selectedProfile.overview} provenance={selectedProfile.provenance} />
                      <ProjectValueCard estimate={estimateProjectValue(
                        selectedProfile.overview.companyName,
                        selectedProfile.overview.employeeCount || 100,
                        selectedProfile.opportunityScoring.overallScore
                      )} />
                      <CompetitiveFitPanel analysis={analyzeCompetitiveFit(selectedProfile.overview.companyName, selectedProfile.overview.industry)} />
                      <WhyNotThisCompany negativeSignals={evaluateNegativeQualification(selectedProfile.overview.companyName, selectedProfile.overview.employeeCount).negativeSignals} />
                    </div>
                  )}

                  {drawerTab === 'playbook' && (
                    <OpportunityPlaybook playbook={generateOpportunityPlaybook(selectedProfile)} />
                  )}

                  {drawerTab === 'decision-makers' && (
                    <DecisionMakerPanel decisionMakers={selectedProfile.decisionMakers} />
                  )}

                  {drawerTab === 'engineering' && (
                    <EngineeringPanel engineering={selectedProfile.engineering} />
                  )}

                  {drawerTab === 'growth' && selectedProfile.growth && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <GrowthPanel growth={selectedProfile.growth} />
                      <FundingTimeline timeline={selectedProfile.growth.fundingTimeline} />
                      <InvestorPanel investors={selectedProfile.growth.leadInvestors} />
                    </div>
                  )}

                  {drawerTab === 'producthunt' && selectedProfile.productHunt && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <ProductLaunchPanel productHunt={selectedProfile.productHunt} />
                      <MakerPanel makers={selectedProfile.productHunt.primaryProduct.makers} />
                      <CommunityPanel community={selectedProfile.productHunt.primaryProduct.community} />
                    </div>
                  )}

                  {drawerTab === 'reddit' && selectedProfile.reddit && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <BuyingIntentPanel reddit={selectedProfile.reddit} />
                      <RedditPanel reddit={selectedProfile.reddit} />
                      <TechnologyDiscussionPanel reddit={selectedProfile.reddit} />
                    </div>
                  )}

                  {drawerTab === 'linkedin' && selectedProfile.linkedin && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <LinkedInPanel linkedin={selectedProfile.linkedin} />
                      <HiringPanel jobOpenings={selectedProfile.linkedin.jobOpenings} />
                      <SocialActivityPanel posts={selectedProfile.linkedin.recentPosts} />
                      <EngagementPanel signals={selectedProfile.linkedin.buyingSignals} />
                    </div>
                  )}

                  {drawerTab === 'ai-insights' && (
                    <AIInsightsPanel
                      scoring={selectedProfile.opportunityScoring}
                      recommendedServices={selectedProfile.recommendedServices}
                      briefing={selectedProfile.executiveBriefing}
                      onCreateCrmDeal={(svc) => handleCreateCrmDeal(selectedProfile.companyId, svc)}
                      onSendToReviewQueue={() => handleSendToReviewQueue(selectedProfile.companyId)}
                    />
                  )}

                  {drawerTab === 'timeline' && (
                    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={18} style={{ color: 'var(--accent-indigo)' }} /> Unified Company Activity Feed
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {selectedProfile.timeline.map((event) => (
                          <div key={event.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>{event.title}</div>
                              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{event.description}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '0.65rem', background: 'var(--accent-indigo-glow)', color: '#a5b4fc', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                {event.source}
                              </span>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>{event.timestamp}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        {/* CONFIRMATION PROMPT MODAL POPUP */}
        {confirmModal.isOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
            <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '16px', maxWidth: '440px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: confirmModal.type === 'delete_company' ? '#fee2e2' : '#e0e7ff', color: confirmModal.type === 'delete_company' ? '#dc2626' : '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                {confirmModal.type === 'delete_company' ? <Trash2 size={24} /> : confirmModal.type === 'create_deal' ? <Briefcase size={24} /> : <Send size={24} />}
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                {confirmModal.title}
              </h3>
              <p style={{ fontSize: '0.86rem', color: '#64748b', marginTop: '8px', lineHeight: '1.5' }}>
                {confirmModal.description}
              </p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  style={{ padding: '9px 18px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', cursor: 'pointer' }}
                  disabled={modalLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteModalAction}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    background: confirmModal.type === 'delete_company' ? '#dc2626' : 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: confirmModal.type === 'delete_company' ? '0 4px 12px rgba(220,38,38,0.3)' : '0 4px 12px rgba(6,182,212,0.3)'
                  }}
                  disabled={modalLoading}
                >
                  {modalLoading ? 'Processing...' : confirmModal.type === 'delete_company' ? 'Yes, Delete' : confirmModal.type === 'create_deal' ? '✓ Confirm & Create Deal' : '✓ Confirm & Send'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
