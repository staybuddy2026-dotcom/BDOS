'use client';

import { useState, useCallback, useEffect } from 'react';
import { 
  Briefcase, 
  Filter, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle,
  Zap,
  Sparkles,
  Clock,
  Send,
  FileText,
  Copy,
  ExternalLink,
  RefreshCw,
  Building,
  XCircle,
  FileSpreadsheet,
  Radio,
  Upload,
  BarChart3,
  Bookmark,
  DollarSign,
  Target,
  Trash2
} from 'lucide-react';
import { 
  collectMarketplaceOpportunities, 
  getProviderHealthList, 
  syncMarketplaceProvider,
  dismissOpportunity,
  ingestInboundWebhookOpportunity,
  previewCsvImport,
  importCsvOpportunities,
  refreshRssFeeds,
  UniversalOpportunity, 
  ProviderHealthTelemetry 
} from '@/features/marketplace/ingestion';
import { 
  analyzeProjectOpportunity, 
  generateMarketplaceProposal, 
  sendMarketplaceProjectToReviewQueue,
  ProjectAiAnalysis 
} from '@/features/marketplace/actions';
import { createCrmDealFromMarketplaceOpportunity } from '@/features/crm/actions';
import { 
  getOpportunityIntelligence, 
  getProviderAnalytics, 
  getSearchHistory, 
  addSearchHistory, 
  deleteSearchHistory,
  getSavedSearches, 
  createSavedSearch, 
  deleteSavedSearch,
  OpportunityIntelligenceReport,
  ProviderAnalyticsItem,
  SearchHistoryItem,
  SavedSearchItem
} from '@/features/marketplace/intelligence';

import blob from '@/assets/blob.png';
import '@/styles/globals.css';
import '@/styles/dashboard.css';

const PRESET_SEARCHES = [
  { id: 'm_preset_react', name: 'React 19 & Next.js', tech: 'React', badge: 'High Intent' },
  { id: 'm_preset_node', name: 'Node.js Microservices', tech: 'Node.js', badge: 'Backend' },
  { id: 'm_preset_flutter', name: 'Flutter Mobile Apps', tech: 'Flutter', badge: 'Mobile' },
  { id: 'm_preset_ai', name: 'Python AI & LLMs', tech: 'Python', badge: 'AI / ML' },
  { id: 'm_preset_mvp', name: 'Startup MVP Builds', tech: 'TypeScript', badge: 'Startup' },
  { id: 'm_preset_healthcare', name: 'Healthcare SaaS', tech: 'PostgreSQL', badge: 'HIPAA' },
  { id: 'm_preset_fintech', name: 'FinTech Platforms', tech: 'Next.js', badge: 'FinTech' },
  { id: 'm_preset_usa', name: 'USA High Budget', tech: 'AWS', badge: '$20k+' },
];

export default function ProjectMarketplacePage() {
  const [activeTab, setActiveTab] = useState<'opportunities' | 'analytics' | 'history' | 'saved-searches'>('opportunities');
  const [selectedProviderId, setSelectedProviderId] = useState<string>('all');
  const [providersHealth, setProvidersHealth] = useState<ProviderHealthTelemetry[]>([]);
  
  // Dynamic Filters
  const [keywords, setKeywords] = useState('');
  const [technology, setTechnology] = useState('');
  const [budgetType, setBudgetType] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // Ingestion Results
  const [opportunities, setOpportunities] = useState<UniversalOpportunity[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [duplicatesFiltered, setDuplicatesFiltered] = useState(0);
  const [loading, setLoading] = useState(false);
  const [syncingProviderId, setSyncingProviderId] = useState<string | null>(null);

  // Intelligence Drawer & Report Modal State
  const [selectedOpportunity, setSelectedOpportunity] = useState<UniversalOpportunity | null>(null);
  const [intelligenceReport, setIntelligenceReport] = useState<OpportunityIntelligenceReport | null>(null);
  const [showIntelligenceModal, setShowIntelligenceModal] = useState(false);
  const [intelLoading, setIntelLoading] = useState(false);

  // Modals
  const [aiAnalysis, setAiAnalysis] = useState<ProjectAiAnalysis | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const [showProposalModal, setShowProposalModal] = useState(false);
  const [proposalType, setProposalType] = useState<'short' | 'professional' | 'enterprise' | 'technical' | 'startup' | 'discovery'>('professional');
  const [generatedProposalText, setGeneratedProposalText] = useState('');
  const [proposalLoading, setProposalLoading] = useState(false);

  // CSV Import Modal State
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvPreview, setCsvPreview] = useState<{ headers: string[]; totalRows: number; sampleRows: Record<string, string>[] } | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);

  // Webhook Tester Modal State
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [webhookSampleTitle, setWebhookSampleTitle] = useState('Senior React 19 & Node.js Agency Project');
  const [webhookSampleDesc, setWebhookSampleDesc] = useState('Inbound lead from Zapier. Client seeks full-stack development team for HIPAA SaaS migration.');
  const [webhookSampleBudget, setWebhookSampleBudget] = useState('$25,000');

  // Analytics, History & Saved Searches State
  const [analyticsList, setAnalyticsList] = useState<ProviderAnalyticsItem[]>([]);
  const [searchHistory, setSearchHistoryState] = useState<SearchHistoryItem[]>([]);
  const [savedSearches, setSavedSearchesState] = useState<SavedSearchItem[]>([]);
  const [newPresetName, setNewPresetName] = useState('');

  // Toast Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const triggerNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Ingestion Collection Pipeline Execution
  const runIngestionPipeline = useCallback(async () => {
    setLoading(true);
    const startTime = Date.now();
    try {
      const healthList = await getProviderHealthList();
      setProvidersHealth(healthList);

      const res = await collectMarketplaceOpportunities({
        providerId: selectedProviderId,
        technology,
        keywords,
        budgetType,
        experienceLevel,
      });

      setOpportunities(res.opportunities);
      setTotalCount(res.totalCount);
      setDuplicatesFiltered(res.duplicatesFiltered);

      // Log search history entry if keywords/tech provided
      if (keywords || technology || selectedProviderId !== 'all') {
        await addSearchHistory({
          providerId: selectedProviderId,
          keywords: keywords || 'All Keywords',
          country: 'Global',
          budget: budgetType || 'Any Budget',
          technology: technology || 'All Tech',
          resultsCount: res.opportunities.length,
          executionTimeMs: Date.now() - startTime,
        });
      }

      // Load analytics, history, saved searches
      const [analyticsData, historyData, savedData] = await Promise.all([
        getProviderAnalytics(),
        getSearchHistory(),
        getSavedSearches(),
      ]);
      setAnalyticsList(analyticsData);
      setSearchHistoryState(historyData);
      setSavedSearchesState(savedData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Marketplace opportunity collection failed.';
      triggerNotification('error', msg);
    } finally {
      setLoading(false);
    }
  }, [selectedProviderId, technology, keywords, budgetType, experienceLevel]);

  useEffect(() => {
    let active = true;
    async function run() {
      if (!active) return;
      await runIngestionPipeline();
    }
    run();
    return () => { active = false; };
  }, [runIngestionPipeline]);

  // Open AI Intelligence Report Drawer
  const handleOpenIntelligence = async (opp: UniversalOpportunity) => {
    setSelectedOpportunity(opp);
    setShowIntelligenceModal(true);
    setIntelLoading(true);
    try {
      const report = await getOpportunityIntelligence(opp);
      setIntelligenceReport(report);
    } catch {
      triggerNotification('error', 'Failed to generate AI Opportunity Intelligence Report.');
    } finally {
      setIntelLoading(false);
    }
  };

  // Manual Trigger Provider Sync
  const handleManualSync = async (providerId: string) => {
    setSyncingProviderId(providerId);
    try {
      const res = await syncMarketplaceProvider(providerId);
      if (res.success) {
        triggerNotification('success', res.message);
        await runIngestionPipeline();
      } else {
        triggerNotification('error', res.message);
      }
    } catch {
      triggerNotification('error', 'Sync failed.');
    } finally {
      setSyncingProviderId(null);
    }
  };

  // Refresh RSS Feeds Trigger
  const handleRefreshRss = async () => {
    setLoading(true);
    try {
      const res = await refreshRssFeeds('tech');
      triggerNotification('success', `RSS Polled: Parsed ${res.totalParsed} items, ingested ${res.newOpportunities} new opportunities.`);
      await runIngestionPipeline();
    } catch {
      triggerNotification('error', 'RSS feed refresh failed.');
    } finally {
      setLoading(false);
    }
  };

  // Save Search Preset
  const handleSaveSearchPreset = async () => {
    if (!newPresetName.trim()) return;
    try {
      await createSavedSearch({
        name: newPresetName,
        providerId: selectedProviderId,
        keywords: keywords || 'General',
        country: 'Global',
        budget: budgetType || 'All',
        technology: technology || 'All',
        category: 'Custom BDE Target',
        isShared: true,
      });
      triggerNotification('success', `Saved Search Preset "${newPresetName}" created!`);
      setNewPresetName('');
      const updated = await getSavedSearches();
      setSavedSearchesState(updated);
    } catch {
      triggerNotification('error', 'Failed to create saved search.');
    }
  };

  // Delete Saved Search Preset
  const handleDeleteSavedSearch = async (id: string) => {
    try {
      await deleteSavedSearch(id);
      setSavedSearchesState(prev => prev.filter(s => s.id !== id));
      triggerNotification('success', 'Saved Search preset deleted.');
    } catch {
      triggerNotification('error', 'Failed to delete saved search.');
    }
  };

  // Delete Search History Item
  const handleDeleteHistoryItem = async (id: string) => {
    try {
      await deleteSearchHistory(id);
      setSearchHistoryState(prev => prev.filter(s => s.id !== id));
      triggerNotification('success', 'Search history log entry deleted.');
    } catch {
      triggerNotification('error', 'Failed to delete history item.');
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setKeywords('');
    setTechnology('');
    setBudgetType('');
    setExperienceLevel('');
    setActivePresetId(null);
    setSelectedProviderId('all');
  };

  // Open AI Analysis Modal
  const handleOpenAiAnalysis = async (opp: UniversalOpportunity) => {
    setSelectedOpportunity(opp);
    setShowAnalysisModal(true);
    setAnalysisLoading(true);
    try {
      const analysis = await analyzeProjectOpportunity(opp.id, opp.projectTitle, {
        budget: opp.budget,
        technologyStack: opp.technologyStack,
        urgency: opp.urgency,
        estimatedValueNumber: opp.estimatedValueNumber,
      });
      setAiAnalysis(analysis);
    } catch {
      triggerNotification('error', 'AI Opportunity Analysis failed.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Open Proposal Generator Modal
  const handleOpenProposalModal = async (opp: UniversalOpportunity) => {
    setSelectedOpportunity(opp);
    setShowProposalModal(true);
    setProposalLoading(true);
    try {
      const res = await generateMarketplaceProposal({
        projectId: opp.id,
        projectTitle: opp.projectTitle,
        clientName: opp.clientCountry,
        type: proposalType,
        techStack: opp.technologyStack,
      });
      setGeneratedProposalText(res.proposalText);
    } catch {
      triggerNotification('error', 'Proposal generation failed.');
    } finally {
      setProposalLoading(false);
    }
  };

  // Change Proposal Type
  const handleChangeProposalType = async (type: 'short' | 'professional' | 'enterprise' | 'technical' | 'startup' | 'discovery') => {
    setProposalType(type);
    if (!selectedOpportunity) return;
    setProposalLoading(true);
    try {
      const res = await generateMarketplaceProposal({
        projectId: selectedOpportunity.id,
        projectTitle: selectedOpportunity.projectTitle,
        clientName: selectedOpportunity.clientCountry,
        type,
        techStack: selectedOpportunity.technologyStack,
      });
      setGeneratedProposalText(res.proposalText);
    } catch {
      triggerNotification('error', 'Failed to update proposal style.');
    } finally {
      setProposalLoading(false);
    }
  };

  // Send Project to Review Queue
  const handleSendToReviewQueue = async (opp: UniversalOpportunity) => {
    try {
      const res = await sendMarketplaceProjectToReviewQueue({
        title: opp.projectTitle,
        clientName: opp.clientCountry,
        postUrl: opp.projectUrl,
        budget: opp.budget,
        techStack: opp.technologyStack,
        description: opp.projectDescription,
      });
      if (res.created) {
        triggerNotification('success', `Opportunity "${opp.projectTitle.slice(0, 30)}..." sent to Review Queue!`);
      } else {
        triggerNotification('success', `Opportunity already exists in Review Queue.`);
      }
    } catch {
      triggerNotification('error', 'Failed to send opportunity to Review Queue.');
    }
  };

  // Create CRM Deal Action
  const handleCreateCrmDeal = async (opp: UniversalOpportunity) => {
    try {
      const res = await createCrmDealFromMarketplaceOpportunity({
        projectTitle: opp.projectTitle,
        clientCountry: opp.clientCountry,
        budget: opp.budget,
        technologyStack: opp.technologyStack,
        projectUrl: opp.projectUrl,
      });
      triggerNotification('success', res.message);
    } catch {
      triggerNotification('error', 'Failed to create CRM deal.');
    }
  };

  // Dismiss / Archive Opportunity Action
  const handleDismissOpportunity = async (oppId: string) => {
    try {
      await dismissOpportunity(oppId);
      setOpportunities(prev => prev.filter(o => o.id !== oppId));
      triggerNotification('success', 'Opportunity dismissed & archived.');
    } catch {
      triggerNotification('error', 'Failed to dismiss opportunity.');
    }
  };

  // Handle CSV Preview
  const handlePreviewCsv = async (text: string) => {
    setCsvText(text);
    if (!text.trim()) {
      setCsvPreview(null);
      return;
    }
    try {
      const prev = await previewCsvImport(text);
      setCsvPreview(prev);
    } catch {
      setCsvPreview(null);
    }
  };

  // Handle Bulk CSV Import Execution
  const handleExecuteCsvImport = async () => {
    if (!csvText.trim()) return;
    setCsvImporting(true);
    try {
      const res = await importCsvOpportunities(csvText);
      triggerNotification('success', `CSV Import complete! Ingested ${res.importedCount} items, skipped ${res.duplicatesCount} duplicates.`);
      setShowCsvModal(false);
      setCsvText('');
      setCsvPreview(null);
      await runIngestionPipeline();
    } catch {
      triggerNotification('error', 'CSV import failed.');
    } finally {
      setCsvImporting(false);
    }
  };

  // Handle Test Inbound Webhook Trigger
  const handleSendTestWebhook = async () => {
    try {
      const res = await ingestInboundWebhookOpportunity({
        projectTitle: webhookSampleTitle,
        projectDescription: webhookSampleDesc,
        budget: webhookSampleBudget,
        budgetType: 'Fixed-Price',
        clientCountry: 'United States 🇺🇸',
        technologyStack: ['React 19', 'Node.js', 'PostgreSQL'],
        projectUrl: 'https://zapier.com/webhook/test-rfp',
        providerName: 'Zapier Inbound Webhook',
      });
      triggerNotification('success', `Test Webhook Triggered! Opportunity ID: ${res.opportunity.id} (Score: ${res.opportunity.aiOpportunityScore})`);
      setShowWebhookModal(false);
      await runIngestionPipeline();
    } catch {
      triggerNotification('error', 'Failed to send test webhook.');
    }
  };

  return (
    <div className="dashboard-page" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', gap: 0, paddingBottom: 0, boxSizing: 'border-box' }}>
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
        borderBottom: '1px solid rgba(255,255,255,0.4)',
        height: '65px',
        flexShrink: 0,
        padding: '0 28px',
        background: 'rgba(255, 255, 255, 0.4)',
        backdropFilter: 'blur(16px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)', padding: '10px', borderRadius: '8px', boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)' }}>
            <Briefcase size={18} style={{ color: 'var(--bg-primary)' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, background: 'linear-gradient(135deg, #0f172a, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
              Marketplace RFPs & Proposals
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#8ba0cb', fontWeight: 600, letterSpacing: '0.03em', marginTop: '4px', margin: 0 }}>
              AI Opportunity Intelligence & Bid Decision Platform
            </p>
          </div>
        </div>

        {/* Global Tool Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setShowCsvModal(true)}
            style={{ padding: '8px 14px', fontSize: '0.76rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
          >
            <FileSpreadsheet size={14} /> Import CSV
          </button>
          <button 
            onClick={() => setShowWebhookModal(true)}
            style={{ padding: '8px 14px', fontSize: '0.76rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
          >
            <Zap size={14} /> Webhook Endpoint
          </button>
          <button 
            onClick={handleRefreshRss}
            style={{ padding: '8px 14px', fontSize: '0.76rem', color: '#6366f1', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
          >
            <Radio size={14} /> Refresh RSS
          </button>
          <button 
            onClick={runIngestionPipeline}
            style={{ padding: '8px 16px', fontSize: '0.76rem', color: '#ffffff', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Run Collection
          </button>
        </div>
      </div>

      {/* SCROLLABLE MAIN CONTENT */}
      <div
        className="dashboard-scrollable-content"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 28px 24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          position: 'relative',
          backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.6), rgba(248, 250, 252, 0.6)), url(${blob.src})`,
          backgroundSize: 'cover',
          backgroundPosition: 'top right',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >

      {/* TOP AI OPPORTUNITY INTELLIGENCE DASHBOARD BAR */}
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
        .market-tab {
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
          border: none;
        }
        .market-tab.active {
          background: #ffffff;
          color: var(--accent-indigo);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
          border: 1px solid rgba(99, 102, 241, 0.2);
        }
        .market-tab.inactive {
          background: transparent;
          color: var(--text-muted);
          border: 1px solid transparent;
        }
        .market-tab.inactive:hover {
          background: rgba(255, 255, 255, 0.5);
          color: var(--text-secondary);
        }
        .market-tabs-container {
          display: flex;
          gap: 6px;
          background: rgba(241, 245, 249, 0.6);
          padding: 6px;
          border-radius: 12px;
          border: 1px solid var(--border-subtle);
          margin-bottom: 20px;
          backdrop-filter: blur(10px);
        }
      `}</style>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        {/* Card 1 */}
        <div className="premium-kpi-card" style={{ '--glow-color': 'rgba(59, 130, 246, 0.15)' } as React.CSSProperties}>
          <div className="kpi-glow"></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '50%', color: '#3b82f6', display: 'flex' }}>
                <FileText size={16} strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Today's RFPs</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{totalCount}</div>
              <div style={{ fontSize: '0.8rem', color: '#3b82f6', marginTop: '8px', fontWeight: 600 }}>Active project listings</div>
            </div>
            <div style={{ border: '1px solid #dbeafe', borderRadius: '50%', padding: '6px', color: '#3b82f6', display: 'flex', background: '#eff6ff' }}>
              <ExternalLink size={14} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="premium-kpi-card" style={{ '--glow-color': 'rgba(16, 185, 129, 0.15)' } as React.CSSProperties}>
          <div className="kpi-glow"></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#ecfdf5', padding: '10px', borderRadius: '50%', color: '#10b981', display: 'flex' }}>
                <Target size={16} strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Recommended BID</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{opportunities.filter(o => o.aiOpportunityScore >= 85).length}</div>
              <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '8px', fontWeight: 600 }}>High win probability</div>
            </div>
            <div style={{ border: '1px solid #d1fae5', borderRadius: '50%', padding: '6px', color: '#10b981', display: 'flex', background: '#ecfdf5' }}>
              <CheckCircle size={14} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="premium-kpi-card" style={{ '--glow-color': 'rgba(245, 158, 11, 0.15)' } as React.CSSProperties}>
          <div className="kpi-glow"></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#fffbeb', padding: '10px', borderRadius: '50%', color: '#f59e0b', display: 'flex' }}>
                <AlertTriangle size={16} strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Consider / Caution</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{opportunities.filter(o => o.aiOpportunityScore < 85).length}</div>
              <div style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '8px', fontWeight: 600 }}>Requires manual review</div>
            </div>
            <div style={{ border: '1px solid #fef3c7', borderRadius: '50%', padding: '6px', color: '#f59e0b', display: 'flex', background: '#fffbeb' }}>
              <AlertTriangle size={14} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="premium-kpi-card" style={{ '--glow-color': 'rgba(139, 92, 246, 0.15)' } as React.CSSProperties}>
          <div className="kpi-glow"></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#f3e8ff', padding: '10px', borderRadius: '50%', color: '#8b5cf6', display: 'flex' }}>
                <DollarSign size={16} strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Expected Revenue</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>${(opportunities.reduce((sum, o) => sum + (o.estimatedValueNumber || 0), 0) / 1000).toFixed(1)}k</div>
              <div style={{ fontSize: '0.8rem', color: '#8b5cf6', marginTop: '8px', fontWeight: 600 }}>Across {opportunities.length} opportunities</div>
            </div>
            <div style={{ border: '1px solid #e9d5ff', borderRadius: '50%', padding: '6px', color: '#8b5cf6', display: 'flex', background: '#f3e8ff' }}>
              <DollarSign size={14} strokeWidth={2.5} />
            </div>
          </div>
        </div>
      </div>

      {/* TAB NAVIGATION BAR */}
      <div className="market-tabs-container">
        <button
          onClick={() => setActiveTab('opportunities')}
          className={`market-tab ${activeTab === 'opportunities' ? 'active' : 'inactive'}`}
        >
          <Briefcase size={14} /> Opportunity Ranking Feed ({opportunities.length})
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`market-tab ${activeTab === 'analytics' ? 'active' : 'inactive'}`}
        >
          <BarChart3 size={14} /> Provider Analytics & Success Rates ({analyticsList.length})
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`market-tab ${activeTab === 'history' ? 'active' : 'inactive'}`}
        >
          <Clock size={14} /> Search History Audit ({searchHistory.length})
        </button>

        <button
          onClick={() => setActiveTab('saved-searches')}
          className={`market-tab ${activeTab === 'saved-searches' ? 'active' : 'inactive'}`}
        >
          <Bookmark size={14} /> Saved Search Presets ({savedSearches.length})
        </button>
      </div>

      {/* TAB 1: OPPORTUNITIES RANKING & FEED */}
      {activeTab === 'opportunities' && (
        <div>
          {/* PRESET SEARCH TOOLBAR */}
          <div style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.8)', borderRadius: '16px', padding: '16px 20px', marginBottom: '20px', boxShadow: '0 4px 24px rgba(15, 23, 42, 0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Sparkles size={18} style={{ color: '#6366f1' }} />
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>
                BDE Opportunity Presets
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {PRESET_SEARCHES.map((preset) => {
                const isSelected = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setActivePresetId(preset.id);
                      setTechnology(preset.tech);
                      triggerNotification('success', `Applied Preset: ${preset.name}`);
                    }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '24px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      border: isSelected ? '1px solid #818cf8' : '1px solid #e2e8f0',
                      background: isSelected ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#475569',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: isSelected ? '0 4px 12px rgba(99, 102, 241, 0.3)' : '0 2px 4px rgba(15, 23, 42, 0.02)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span>{preset.name}</span>
                    <span style={{ fontSize: '0.65rem', background: isSelected ? 'rgba(255, 255, 255, 0.2)' : '#f1f5f9', color: isSelected ? '#ffffff' : '#64748b', padding: '2px 6px', borderRadius: '8px', fontWeight: 800 }}>
                      {preset.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* MAIN WORKSPACE GRID */}
          <div className="apollo-workspace-layout" style={{ gap: '20px' }}>
            {/* LEFT COLUMN: Dynamic Filter Sidebar */}
            <div style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.8)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 24px rgba(15, 23, 42, 0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(15, 23, 42, 0.05)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Filter size={18} style={{ color: '#6366f1' }} />
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Ingestion Filters</h3>
                </div>
                <button 
                  onClick={handleResetFilters}
                  style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', color: '#6366f1', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px' }}
                >
                  <RotateCcw size={12} /> Reset
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Keywords / RFP Title
                  </label>
                  <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="e.g. React 19, Flutter..."
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.85rem', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', boxShadow: 'inset 0 2px 4px rgba(15, 23, 42, 0.02)', outline: 'none', transition: 'border-color 0.2s' }}
                    onFocus={(e) => e.target.style.borderColor = '#818cf8'}
                    onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Technology Stack
                  </label>
                  <input
                    type="text"
                    value={technology}
                    onChange={(e) => setTechnology(e.target.value)}
                    placeholder="e.g. React, Node.js..."
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.85rem', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', boxShadow: 'inset 0 2px 4px rgba(15, 23, 42, 0.02)', outline: 'none', transition: 'border-color 0.2s' }}
                    onFocus={(e) => e.target.style.borderColor = '#818cf8'}
                    onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Save Current Preset
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      placeholder="Preset Name..."
                      className="input-field"
                      style={{ fontSize: '0.85rem', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', flex: 1, boxShadow: 'inset 0 2px 4px rgba(15, 23, 42, 0.02)', outline: 'none', transition: 'border-color 0.2s' }}
                      onFocus={(e) => e.target.style.borderColor = '#818cf8'}
                      onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                    />
                    <button 
                      onClick={handleSaveSearchPreset}
                      style={{ padding: '10px 14px', fontSize: '0.78rem', fontWeight: 700, background: '#f1f5f9', color: '#6366f1', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* CENTER MAIN GRID: Opportunity Cards Container */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ background: 'transparent', padding: '0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', padding: '0 4px' }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>
                    Collected Opportunities <span style={{ color: '#6366f1', background: 'rgba(99, 102, 241, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>{opportunities.length}</span> <span style={{ color: '#94a3b8', margin: '0 8px', fontWeight: 400 }}>|</span> Filtered Duplicates: <span style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>{duplicatesFiltered}</span>
                  </div>
                </div>

                {loading ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <RotateCcw size={24} className="animate-spin" style={{ margin: '0 auto 10px auto', display: 'block', color: 'var(--accent-violet)' }} />
                    Executing Bid Decision Engine & Intelligence Analysis...
                  </div>
                ) : opportunities.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No active opportunities found. Try resetting filters or running RSS/CSV/Webhook import.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {opportunities.map((opp) => (
                      <div 
                        key={opp.id}
                        className="priority-account-row"
                        style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)' }}
                      >
                        {/* Header Row with AI Recommendation Verdict Badge */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                              {/* Bid Recommendation Badge */}
                              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', fontWeight: 900, background: opp.aiOpportunityScore >= 88 ? 'linear-gradient(135deg, #10b981, #059669)' : opp.aiOpportunityScore >= 70 ? 'rgba(234, 179, 8, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: opp.aiOpportunityScore >= 88 ? '#ffffff' : opp.aiOpportunityScore >= 70 ? 'var(--color-warning)' : '#fca5a5', border: '1px solid rgba(255,255,255,0.1)' }}>
                                {opp.aiOpportunityScore >= 88 ? '✅ BID RECOMMENDATION' : opp.aiOpportunityScore >= 70 ? '⚠️ CONSIDER' : '❌ DO NOT BID'}
                              </span>

                              <span style={{ fontSize: '0.65rem', background: 'rgba(129, 140, 248, 0.2)', color: 'var(--accent-violet)', border: '1px solid rgba(129, 140, 248, 0.3)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                                {opp.providerName}
                              </span>
                              <span 
                                onClick={() => handleOpenIntelligence(opp)}
                                title="Click to view AI Opportunity Intelligence Report"
                                style={{ fontSize: '0.65rem', background: 'var(--color-success-bg)', color: 'var(--color-success)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                              >
                                AI Score: {opp.aiOpportunityScore}/100
                              </span>
                              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                <Clock size={11} style={{ display: 'inline', marginRight: '3px' }} /> {opp.postedDate}
                              </span>
                            </div>

                            <h4 
                              onClick={() => handleOpenIntelligence(opp)}
                              style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: '1.3', cursor: 'pointer' }}
                            >
                              {opp.projectTitle}
                            </h4>
                          </div>

                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-success)' }}>
                              {opp.budget}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              AI Score: <strong style={{ color: 'var(--color-success)' }}>{opp.aiOpportunityScore}/100</strong>
                            </div>
                          </div>
                        </div>

                        {/* Description */}
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.45', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {opp.projectDescription}
                        </p>

                        {/* Tech Stack & Telemetry */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                            {opp.technologyStack.map((tech, idx) => (
                              <span key={idx} style={{ fontSize: '0.66rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5', border: '1px solid rgba(99, 102, 241, 0.2)', fontWeight: 700 }}>
                                {tech}
                              </span>
                            ))}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            <span>📍 {opp.clientCountry}</span>
                            <span>⏱️ Risk: <strong style={{ color: 'var(--color-success)' }}>{opp.deliveryRisk}</strong></span>
                          </div>
                        </div>

                        {/* Card Action Toolbar */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '4px' }}>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {/* 1. AI Bid Intelligence */}
                            <button 
                              onClick={() => handleOpenIntelligence(opp)}
                              style={{ padding: '8px 14px', fontSize: '0.75rem', borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', color: '#ffffff', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}
                            >
                              <Zap size={14} /> AI Intelligence
                            </button>

                            {/* 2. AI Qualify Breakdown */}
                            <button 
                              onClick={() => handleOpenAiAnalysis(opp)}
                              style={{ padding: '8px 14px', fontSize: '0.75rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                            >
                              <Sparkles size={14} /> AI Qualify
                            </button>

                            {/* 3. View Original */}
                            <a 
                              href={opp.projectUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ padding: '8px 14px', fontSize: '0.75rem', borderRadius: '8px', background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                            >
                              <ExternalLink size={14} /> View Original
                            </a>

                            {/* 4. Generate Proposal */}
                            <button 
                              onClick={() => handleOpenProposalModal(opp)}
                              style={{ padding: '8px 14px', fontSize: '0.75rem', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', border: '1px solid rgba(139, 92, 246, 0.2)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                            >
                              <FileText size={14} /> Proposal Generator
                            </button>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button 
                              onClick={() => handleSendToReviewQueue(opp)}
                              style={{ padding: '8px 14px', fontSize: '0.75rem', borderRadius: '8px', background: '#f8fafc', color: '#1e293b', border: '1px solid #cbd5e1', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                            >
                              <Send size={14} /> Review Queue
                            </button>

                            <button 
                              onClick={() => handleCreateCrmDeal(opp)}
                              style={{ padding: '8px 14px', fontSize: '0.75rem', borderRadius: '8px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
                            >
                              <Building size={14} /> Create CRM Deal
                            </button>

                            <button 
                              onClick={() => handleDismissOpportunity(opp.id)}
                              style={{ padding: '8px 14px', fontSize: '0.75rem', borderRadius: '8px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                              title="Dismiss Opportunity"
                            >
                              <XCircle size={14} /> Dismiss
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: AI Ingestion Telemetry & Recommendation Panel */}
            <div style={{ background: 'var(--bg-primary)', backdropFilter: 'blur(12px)', border: '1px solid var(--border-subtle)', borderRight: '4px solid var(--accent-indigo)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 24px rgba(15,23,42,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
                <Sparkles size={20} style={{ color: 'var(--accent-indigo)' }} />
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>AI Qualification Telemetry</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ingestion Signal Intelligence</span>
                </div>
              </div>

              <div style={{ background: 'var(--accent-indigo-glow)', border: '1px solid rgba(99, 102, 241, 0.25)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700 }}>Average Pipeline Deal Size</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-violet)', marginTop: '2px' }}>
                  ${opportunities.length > 0 ? Math.round(opportunities.reduce((sum, o) => sum + (o.estimatedValueNumber || 0), 0) / opportunities.length).toLocaleString() : '0'}
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Deduplication:</span>
                  <strong style={{ color: 'var(--accent-indigo)' }}>MD5 Hash Match</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Duplicates Filtered:</span>
                  <strong style={{ color: 'var(--color-success)' }}>{duplicatesFiltered}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Avg AI Score:</span>
                  <strong style={{ color: 'var(--color-warning)' }}>{opportunities.length > 0 ? Math.round(opportunities.reduce((sum, o) => sum + o.aiOpportunityScore, 0) / opportunities.length) : 0}/100</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROVIDER ANALYTICS & SUCCESS RATES */}
      {activeTab === 'analytics' && (
        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={18} style={{ color: 'var(--accent-violet)' }} /> Provider Performance & Success Rate Analytics Grid
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {analyticsList.map((item) => (
              <div key={item.providerId} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{item.providerName}</h4>
                  <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--color-success-bg)', color: 'var(--color-success)', fontWeight: 700 }}>
                    {item.successRatePercent}% Success
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  <div>📦 Imported: <strong>{item.projectsImported}</strong></div>
                  <div>✅ Qualified: <strong style={{ color: 'var(--accent-indigo)' }}>{item.qualifiedCount}</strong></div>
                  <div>💵 Avg Budget: <strong>{item.averageBudget}</strong></div>
                  <div>💰 Avg Net Profit: <strong style={{ color: 'var(--color-success)' }}>{item.averageProfit}</strong></div>
                  <div>🏆 Deals Won: <strong style={{ color: 'var(--color-warning)' }}>{item.dealsWon}</strong></div>
                  <div>⭐ Avg Score: <strong>{item.averageAiScore}/100</strong></div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                    Status: <strong style={{ color: 'var(--color-success)' }}>{providersHealth.find(p => p.providerId === item.providerId)?.status || 'Connected'}</strong>
                  </span>
                  <button
                    onClick={() => handleManualSync(item.providerId)}
                    disabled={syncingProviderId === item.providerId}
                    style={{ background: 'var(--accent-indigo-glow)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#a5b4fc', fontSize: '0.68rem', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <RefreshCw size={10} className={syncingProviderId === item.providerId ? 'animate-spin' : ''} /> {syncingProviderId === item.providerId ? 'Syncing...' : 'Sync Provider'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SEARCH HISTORY AUDIT */}
      {activeTab === 'history' && (
        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} style={{ color: 'var(--accent-violet)' }} /> Search Audit Log History
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {searchHistory.map((item) => (
              <div key={item.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Query: &quot;{item.keywords}&quot; • Tech: {item.technology} • Provider: {item.providerId}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Timestamp: {item.timestamp} • Execution: {item.executionTimeMs}ms • Found: {item.resultsCount} RFPs
                  </div>
                </div>

                <button 
                  onClick={() => handleDeleteHistoryItem(item.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}
                  title="Delete log"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SAVED SEARCH PRESETS */}
      {activeTab === 'saved-searches' && (
        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bookmark size={18} style={{ color: 'var(--accent-violet)' }} /> Saved Search Target Presets ({savedSearches.length})
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {savedSearches.map((item) => (
              <div key={item.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{item.name}</h4>
                    <span style={{ fontSize: '0.62rem', background: 'var(--accent-indigo-glow)', color: '#a5b4fc', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                      {item.category}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Keywords: &quot;{item.keywords}&quot; • Country: {item.country} • Budget: {item.budget}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button 
                    onClick={() => {
                      setTechnology(item.technology);
                      setKeywords(item.keywords);
                      setActiveTab('opportunities');
                      triggerNotification('success', `Executing Saved Search: ${item.name}`);
                    }}
                    className="btn-primary"
                    style={{ padding: '4px 10px', fontSize: '0.72rem', background: 'linear-gradient(135deg, #6366f1, #3b82f6)' }}
                  >
                    Run Search
                  </button>

                  <button 
                    onClick={() => handleDeleteSavedSearch(item.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI OPPORTUNITY INTELLIGENCE REPORT DRAWER / MODAL */}
      {showIntelligenceModal && selectedOpportunity && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '16px', width: '100%', maxWidth: '780px', padding: '26px', boxShadow: '0 12px 40px rgba(0,0,0,0.6)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Zap size={22} style={{ color: 'var(--accent-violet)' }} />
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                    AI Opportunity Intelligence & Bid Report
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Target: {selectedOpportunity.projectTitle}</span>
                </div>
              </div>
              <button onClick={() => setShowIntelligenceModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.4rem' }}>×</button>
            </div>

            {intelLoading || !intelligenceReport ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RotateCcw size={26} className="animate-spin" style={{ margin: '0 auto 12px auto', display: 'block', color: 'var(--accent-violet)' }} />
                Analyzing opportunity parameters, margins, team costs & risk factors...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* 1. BID VERDICT BANNER */}
                <div style={{ background: intelligenceReport.recommendation === 'BID' ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.15))' : 'var(--color-warning-bg)', border: '1px solid #10b981', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-success)' }}>AI Recommendation Verdict</span>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', margin: '2px 0 0 0' }}>
                      {intelligenceReport.recommendation === 'BID' ? '✅ HIGHLY RECOMMENDED TO BID' : '⚠️ CONSIDER AFTER REVIEW'}
                    </h3>
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                      Overall Score: <strong style={{ color: 'var(--color-success)' }}>{intelligenceReport.overallScore}/100</strong> • Win Probability: <strong style={{ color: 'var(--accent-indigo)' }}>{intelligenceReport.winProbability}%</strong>
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Expected Net Margin</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-success)' }}>{intelligenceReport.estimatedGrossMargin}%</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Profit: {intelligenceReport.estimatedProfit}</div>
                  </div>
                </div>

                {/* 2. PROJECT COST ESTIMATION TABLE */}
                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px' }}>
                  <h4 style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <DollarSign size={15} style={{ color: 'var(--color-success)' }} /> Project Cost & Team Estimation
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '12px', fontSize: '0.76rem' }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '6px' }}>
                      <div style={{ color: 'var(--text-muted)' }}>Dev Hours:</div>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{intelligenceReport.costEstimation.estimatedDevHours} Hours</strong>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '6px' }}>
                      <div style={{ color: 'var(--text-muted)' }}>Timeline:</div>
                      <strong style={{ color: 'var(--accent-indigo)', fontSize: '0.9rem' }}>{intelligenceReport.costEstimation.estimatedTimeline}</strong>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '6px' }}>
                      <div style={{ color: 'var(--text-muted)' }}>Internal Cost:</div>
                      <strong style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{intelligenceReport.costEstimation.formattedInternalCost}</strong>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '6px' }}>
                      <div style={{ color: 'var(--text-muted)' }}>Suggested Bid:</div>
                      <strong style={{ color: 'var(--color-success)', fontSize: '0.9rem' }}>{intelligenceReport.costEstimation.formattedSuggestedBid}</strong>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Suggested Squad: <strong>1 Tech Lead, 2 Senior Full-Stack Engineers, 1 QA Engineer</strong>
                  </div>
                </div>

                {/* 3. CLIENT INTELLIGENCE REPORT */}
                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px' }}>
                  <h4 style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Target size={15} style={{ color: 'var(--accent-indigo)' }} /> Client Intelligence & Risk Indicators
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                    <div>🏢 <strong>Client Type:</strong> {intelligenceReport.clientIntelligence.clientType}</div>
                    <div>⚡ <strong>Decision Speed:</strong> {intelligenceReport.clientIntelligence.decisionSpeed}</div>
                    <div>🤝 <strong>Future Business:</strong> {intelligenceReport.clientIntelligence.futureBusinessPotential}</div>
                    <div>⚠️ <strong>Risk Factors:</strong> {intelligenceReport.clientIntelligence.riskIndicators.join(', ')}</div>
                  </div>
                </div>

                {/* 4. AI EXPLANATION & PITCH STRATEGY */}
                <div style={{ background: 'var(--accent-indigo-glow)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '10px', padding: '14px' }}>
                  <h4 style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--accent-indigo)', margin: '0 0 6px 0' }}>
                    AI Pitch Strategy & Positioning
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-primary)', margin: 0, lineHeight: '1.45' }}>
                    {intelligenceReport.whyBdosShouldBid}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      {showCsvModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '14px', width: '100%', maxWidth: '640px', padding: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileSpreadsheet size={20} style={{ color: 'var(--color-success)' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Bulk Import CSV Opportunities
                </h3>
              </div>
              <button onClick={() => setShowCsvModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Paste Raw CSV Data or Drop File Content</label>
              <textarea
                value={csvText}
                onChange={(e) => handlePreviewCsv(e.target.value)}
                placeholder="Title,Description,Budget,Country,Technology&#10;React Native Mobile App,Seeking React Native agency,$15,000,United States,React Native"
                rows={6}
                style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px', color: 'var(--text-primary)', fontSize: '0.78rem', fontFamily: 'monospace' }}
              />

              {csvPreview && (
                <div style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-success)', marginBottom: '6px' }}>
                    CSV Preview ({csvPreview.totalRows} Rows Detected)
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    Headers: {csvPreview.headers.join(', ')}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button onClick={() => setShowCsvModal(false)} className="btn-secondary" style={{ padding: '7px 14px', fontSize: '0.78rem' }}>Cancel</button>
                <button 
                  onClick={handleExecuteCsvImport} 
                  disabled={csvImporting || !csvText.trim()}
                  className="btn-primary" 
                  style={{ padding: '7px 14px', fontSize: '0.78rem', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Upload size={14} /> {csvImporting ? 'Importing...' : 'Execute Bulk Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WEBHOOK SETUP MODAL */}
      {showWebhookModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '14px', width: '100%', maxWidth: '640px', padding: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={20} style={{ color: 'var(--color-warning)' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Inbound Webhook Endpoint & Tester
                </h3>
              </div>
              <button onClick={() => setShowWebhookModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'var(--accent-indigo-glow)', border: '1px solid rgba(99, 102, 241, 0.25)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--accent-indigo)', fontWeight: 700 }}>Live Inbound HTTP POST Endpoint</div>
                <div style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--text-primary)', marginTop: '4px' }}>
                  POST /api/marketplace/webhook
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Test Payload Title</label>
                <input 
                  type="text"
                  value={webhookSampleTitle}
                  onChange={(e) => setWebhookSampleTitle(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.8rem', padding: '8px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Test Payload Description</label>
                <textarea 
                  value={webhookSampleDesc}
                  onChange={(e) => setWebhookSampleDesc(e.target.value)}
                  rows={3}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.8rem', padding: '8px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Test Payload Budget</label>
                <input 
                  type="text"
                  value={webhookSampleBudget}
                  onChange={(e) => setWebhookSampleBudget(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.8rem', padding: '8px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button onClick={() => setShowWebhookModal(false)} className="btn-secondary" style={{ padding: '7px 14px', fontSize: '0.78rem' }}>Close</button>
                <button onClick={handleSendTestWebhook} className="btn-primary" style={{ padding: '7px 14px', fontSize: '0.78rem', background: 'linear-gradient(135deg, #6366f1, #3b82f6)' }}>
                  <Send size={13} /> Send Test Webhook Trigger
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI OPPORTUNITY ANALYSIS MODAL */}
      {showAnalysisModal && selectedOpportunity && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '14px', width: '100%', maxWidth: '640px', padding: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={20} style={{ color: 'var(--accent-violet)' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  AI Ingestion Qualification: {selectedOpportunity.projectTitle.slice(0, 35)}...
                </h3>
              </div>
              <button onClick={() => setShowAnalysisModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
            </div>

            {analysisLoading || !aiAnalysis ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RotateCcw size={24} className="animate-spin" style={{ margin: '0 auto 10px auto', display: 'block', color: 'var(--accent-violet)' }} />
                Evaluating opportunity parameters & delivery risk...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ background: 'var(--color-success-bg)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Opportunity Score</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '2px' }}>{selectedOpportunity.aiOpportunityScore} / 100</div>
                  </div>
                  <div style={{ background: 'var(--accent-indigo-glow)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Delivery Risk</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-violet)', marginTop: '2px' }}>{selectedOpportunity.deliveryRisk}</div>
                  </div>
                </div>

                <div style={{ background: 'var(--accent-indigo-glow)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '12px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-indigo)', textTransform: 'uppercase' }}>Winning Strategy</div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-primary)', marginTop: '4px', margin: 0, lineHeight: '1.4' }}>
                    {selectedOpportunity.winningStrategy}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PROPOSAL GENERATOR MODAL */}
      {showProposalModal && selectedOpportunity && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '14px', width: '100%', maxWidth: '700px', padding: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} style={{ color: 'var(--accent-violet)' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Generate Proposal Draft
                </h3>
              </div>
              <button onClick={() => setShowProposalModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {[
                { type: 'professional', label: 'Professional' },
                { type: 'technical', label: 'Technical Architecture' },
                { type: 'short', label: 'Short / Direct' },
                { type: 'discovery', label: 'Discovery Call Pitch' },
              ].map((tab) => (
                <button
                  key={tab.type}
                  onClick={() => handleChangeProposalType(tab.type as 'short' | 'professional' | 'enterprise' | 'technical' | 'startup' | 'discovery')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    border: proposalType === tab.type ? '1px solid var(--accent-indigo)' : '1px solid var(--border-subtle)',
                    background: proposalType === tab.type ? 'var(--accent-indigo)' : 'var(--bg-secondary)',
                    color: proposalType === tab.type ? '#ffffff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {proposalLoading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RotateCcw size={24} className="animate-spin" style={{ margin: '0 auto 10px auto', display: 'block', color: 'var(--accent-violet)' }} />
                Writing Tiny Script proposal draft...
              </div>
            ) : (
              <div>
                <textarea
                  value={generatedProposalText}
                  onChange={(e) => setGeneratedProposalText(e.target.value)}
                  rows={12}
                  style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px', color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'monospace', lineHeight: '1.45' }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedProposalText);
                      triggerNotification('success', 'Proposal copied to clipboard!');
                    }}
                    className="btn-secondary"
                    style={{ padding: '7px 14px', fontSize: '0.78rem', color: 'var(--accent-violet)', borderColor: 'rgba(129,140,248,0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Copy size={13} /> Copy Proposal
                  </button>

                  <button
                    onClick={() => {
                      handleSendToReviewQueue(selectedOpportunity);
                      setShowProposalModal(false);
                    }}
                    className="btn-primary"
                    style={{ padding: '7px 14px', fontSize: '0.78rem', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Send size={13} /> Save to Review Queue
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
