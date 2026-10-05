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
  Target,
  Trash2,
  Loader2
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

import { PageShell, StatTile, Modal, useToast } from '@/components/ui';
import s from '@/components/ui/ui.module.css';
import m from './marketplace.module.css';

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

  const { toast, notify } = useToast();
  const triggerNotification = (type: 'success' | 'error', message: string) => notify(message, type === 'error');

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
      notify(msg, true);
    } finally {
      setLoading(false);
    }
  }, [selectedProviderId, technology, keywords, budgetType, experienceLevel, notify]);

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
      triggerNotification(res.importedCount ? 'success' : 'error', `Imported ${res.importedCount} listing${res.importedCount === 1 ? '' : 's'}${res.duplicatesCount ? `, ${res.duplicatesCount} already stored` : ''}${res.errorsCount ? `, ${res.errorsCount} row${res.errorsCount === 1 ? '' : 's'} without a title skipped` : ''}.`);
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

  const avgScore = opportunities.length ? Math.round(opportunities.reduce((sum, o) => sum + o.aiOpportunityScore, 0) / opportunities.length) : 0;
  const totalValue = opportunities.reduce((sum, o) => sum + (o.estimatedValueNumber || 0), 0);
  const avgValue = opportunities.length ? Math.round(totalValue / opportunities.length) : 0;
  const verdict = (score: number) =>
    score >= 88
      ? <span className={`${s.badge} ${s.badgeGreen}`}><CheckCircle size={12} /> Bid</span>
      : score >= 70
        ? <span className={`${s.badge} ${s.badgeAmber}`}><AlertTriangle size={12} /> Consider</span>
        : <span className={`${s.badge} ${s.badgeRed}`}><XCircle size={12} /> Do not bid</span>;

  const TABS = [
    { id: 'opportunities', label: 'Opportunities', icon: Briefcase, count: opportunities.length },
    { id: 'analytics', label: 'Provider analytics', icon: BarChart3, count: analyticsList.length },
    { id: 'history', label: 'Search history', icon: Clock, count: searchHistory.length },
    { id: 'saved-searches', label: 'Saved searches', icon: Bookmark, count: savedSearches.length },
  ] as const;

  return (
    <PageShell
      icon={Briefcase}
      title="Marketplace RFPs & Proposals"
      subtitle="Collect project listings, score them and decide where to bid"
      actions={
        <>
          <button type="button" className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} onClick={() => setShowCsvModal(true)}><FileSpreadsheet size={14} /> Import CSV</button>
          <button type="button" className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} onClick={() => setShowWebhookModal(true)}><Zap size={14} /> Webhook</button>
          <button type="button" className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} onClick={handleRefreshRss}><Radio size={14} /> Refresh RSS</button>
          <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} onClick={runIngestionPipeline} disabled={loading}>
            <RefreshCw size={14} className={loading ? s.spin : ''} /> {loading ? 'Collecting…' : 'Run collection'}
          </button>
        </>
      }
    >
      <div className={s.root}>
        {toast}

        <div className={s.kpiGrid}>
          <StatTile label="Listings collected" value={totalCount} foot="Shared with the team" />
          <StatTile label="Recommended to bid" value={opportunities.filter((o) => o.aiOpportunityScore >= 88).length} foot="Fit score 88 or more" tone="good" />
          <StatTile label="Needs a closer look" value={opportunities.filter((o) => o.aiOpportunityScore < 88).length} foot="Fit score below 88" />
          <StatTile label="Estimated value" value={`$${(totalValue / 1000).toFixed(1)}k`} foot={`Across ${opportunities.length} listings`} />
        </div>

        <div className={s.tabs} role="tablist" aria-label="Marketplace views">
          {TABS.map((tab) => (
            <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} className={`${s.tab} ${activeTab === tab.id ? s.tabActive : ''}`} onClick={() => setActiveTab(tab.id)}>
              <tab.icon size={14} /> {tab.label} <span className={s.tabCount}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Opportunities */}
        {activeTab === 'opportunities' && (
          <>
            <div className={s.card} style={{ gap: 10 }}>
              <div className={s.sectionLabel} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Sparkles size={13} /> Quick presets</div>
              <div className={s.chipRow}>
                {PRESET_SEARCHES.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`${s.chip} ${activePresetId === preset.id ? s.chipActive : ''}`}
                    onClick={() => {
                      setActivePresetId(preset.id);
                      setTechnology(preset.tech);
                      triggerNotification('success', `Preset applied: ${preset.name}`);
                    }}
                  >
                    {preset.name} <span className={s.chipMeta}>{preset.badge}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={m.workspace}>
              {/* Filters */}
              <aside className={`${s.card} ${m.sticky}`} aria-label="Filters">
                <div className={s.cardHeader}>
                  <h3 className={s.cardTitle}><Filter size={15} /> Filters</h3>
                  <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={handleResetFilters}><RotateCcw size={13} /> Reset</button>
                </div>
                <label className={s.field}>
                  <span className={s.label}>Keywords or title</span>
                  <input type="text" className={s.input} value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="e.g. React 19, Flutter" />
                </label>
                <label className={s.field}>
                  <span className={s.label}>Technology</span>
                  <input type="text" className={s.input} value={technology} onChange={(e) => setTechnology(e.target.value)} placeholder="e.g. React, Node.js" />
                </label>
                <div className={s.field} style={{ borderTop: '1px solid var(--o-border)', paddingTop: 14 }}>
                  <span className={s.label}>Save these filters</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="text" className={s.input} value={newPresetName} onChange={(e) => setNewPresetName(e.target.value)} placeholder="Name" aria-label="Saved search name" />
                    <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={handleSaveSearchPreset}>Save</button>
                  </div>
                </div>
              </aside>

              {/* Listings */}
              <section style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }} aria-label="Listings">
                <div className={m.listHead}>
                  Listings <span className={`${s.badge} ${s.badgeIndigo}`}>{opportunities.length}</span>
                </div>

                {loading ? (
                  <div className={s.empty}><Loader2 size={20} className={s.spin} /><div className={s.emptyTitle}>Collecting and scoring listings…</div></div>
                ) : opportunities.length === 0 ? (
                  <div className={s.empty}>
                    <Briefcase size={24} style={{ color: 'var(--o-accent)' }} />
                    <div className={s.emptyTitle}>No listings found</div>
                    Reset the filters, or bring listings in with RSS, CSV or the webhook.
                  </div>
                ) : (
                  opportunities.map((opp) => (
                    <article key={opp.id} className={`${s.card} ${m.opp}`}>
                      <div className={m.oppHead}>
                        <div style={{ minWidth: 0 }}>
                          <div className={s.badgeRow}>
                            {verdict(opp.aiOpportunityScore)}
                            <span className={`${s.badge} ${s.badgeIndigo}`}>{opp.providerName}</span>
                            <span className={`${s.badge} ${s.badgeGray}`}>Score {opp.aiOpportunityScore}</span>
                            <span className={s.cellSub} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {opp.postedDate}</span>
                          </div>
                          <button type="button" className={m.oppTitle} onClick={() => handleOpenIntelligence(opp)}>{opp.projectTitle}</button>
                        </div>
                        <div className={m.budget}>{opp.budget}</div>
                      </div>

                      <p className={m.desc}>{opp.projectDescription}</p>

                      <div className={m.meta}>
                        <div className={s.badgeRow}>
                          {opp.technologyStack.map((tech, idx) => <span key={idx} className={`${s.badge} ${s.badgeGray}`}>{tech}</span>)}
                        </div>
                        <div className={m.metaItems}>
                          <span>{opp.clientCountry}</span>
                          <span>Delivery risk: <strong style={{ color: 'var(--o-text)' }}>{opp.deliveryRisk}</strong></span>
                        </div>
                      </div>

                      <div className={s.cardFooter}>
                        <div className={s.badgeRow}>
                          <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} onClick={() => handleOpenIntelligence(opp)}><Zap size={13} /> Bid report</button>
                          <button type="button" className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} onClick={() => handleOpenAiAnalysis(opp)}><Sparkles size={13} /> Qualify</button>
                          <button type="button" className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} onClick={() => handleOpenProposalModal(opp)}><FileText size={13} /> Proposal</button>
                          <a href={opp.projectUrl} target="_blank" rel="noopener noreferrer" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`}><ExternalLink size={13} /> Original</a>
                        </div>
                        <div className={s.badgeRow}>
                          <button type="button" className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} onClick={() => handleSendToReviewQueue(opp)}><Send size={13} /> Review Queue</button>
                          <button type="button" className={`${s.btn} ${s.btnSuccess} ${s.btnSm}`} onClick={() => handleCreateCrmDeal(opp)}><Building size={13} /> Add to CRM</button>
                          <button type="button" className={s.iconBtn} onClick={() => handleDismissOpportunity(opp.id)} title="Dismiss" aria-label="Dismiss listing"><XCircle size={16} /></button>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </section>

              {/* Telemetry */}
              <aside className={`${s.card} ${m.telemetry}`} aria-label="Collection summary">
                <h3 className={s.cardTitle}><BarChart3 size={15} /> Collection summary</h3>
                <div className={s.metric}>
                  <div className={s.metricLabel}>Average listing value</div>
                  <div className={s.metricValue}>${avgValue.toLocaleString()}</div>
                </div>
                <div className={m.statList}>
                  <div className={m.statRow}>Repeat listings <strong>Skipped on import</strong></div>
                  <div className={m.statRow}>Average AI score <strong>{avgScore}/100</strong></div>
                </div>
              </aside>
            </div>
          </>
        )}

        {/* Provider analytics */}
        {activeTab === 'analytics' && (
          analyticsList.length === 0 ? (
            <div className={s.empty}><BarChart3 size={24} style={{ color: 'var(--o-accent)' }} /><div className={s.emptyTitle}>No provider data yet</div>Run a collection to see how each source performs.</div>
          ) : (
            <div className={m.cards}>
              {analyticsList.map((item) => (
                <div key={item.providerId} className={s.card}>
                  <div className={s.cardHeader}>
                    <h3 className={s.cardTitle}>{item.providerName}</h3>
                    <span className={`${s.badge} ${s.badgeGreen}`}>{item.successRatePercent}% won</span>
                  </div>
                  <div className={m.factGrid}>
                    <div>Imported: <strong>{item.projectsImported}</strong></div>
                    <div>In feed: <strong>{item.qualifiedCount}</strong></div>
                    <div>Avg budget: <strong>{item.averageBudget}</strong></div>
                    <div>In CRM: <strong>{item.dealsInCrm}</strong></div>
                    <div>Deals won: <strong>{item.dealsWon}</strong></div>
                    <div>Avg score: <strong>{item.averageAiScore}/100</strong></div>
                  </div>
                  <div className={s.cardFooter}>
                    <span className={s.cellSub}>Status: <strong className={s.good}>{providersHealth.find((p) => p.providerId === item.providerId)?.status || 'Connected'}</strong></span>
                    <button type="button" className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} onClick={() => handleManualSync(item.providerId)} disabled={syncingProviderId === item.providerId}>
                      <RefreshCw size={13} className={syncingProviderId === item.providerId ? s.spin : ''} /> {syncingProviderId === item.providerId ? 'Syncing…' : 'Sync'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Search history */}
        {activeTab === 'history' && (
          searchHistory.length === 0 ? (
            <div className={s.empty}><Clock size={24} style={{ color: 'var(--o-accent)' }} /><div className={s.emptyTitle}>No searches yet</div>Every collection run is logged here.</div>
          ) : (
            <div className={s.card}>
              <h3 className={s.cardTitle}><Clock size={15} /> Search history</h3>
              <div>
                {searchHistory.map((item) => (
                  <div key={item.id} className={m.historyRow}>
                    <div style={{ minWidth: 0 }}>
                      <div className={s.cellStrong}>&ldquo;{item.keywords}&rdquo; · {item.technology} · {item.providerId}</div>
                      <div className={s.cellSub}>{item.timestamp} · {item.executionTimeMs} ms · {item.resultsCount} listings</div>
                    </div>
                    <button type="button" className={s.iconBtn} onClick={() => handleDeleteHistoryItem(item.id)} title="Delete" aria-label="Delete search log"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {/* Saved searches */}
        {activeTab === 'saved-searches' && (
          savedSearches.length === 0 ? (
            <div className={s.empty}><Bookmark size={24} style={{ color: 'var(--o-accent)' }} /><div className={s.emptyTitle}>No saved searches</div>Set the filters on Opportunities and save them with a name.</div>
          ) : (
            <div className={m.cards}>
              {savedSearches.map((item) => (
                <div key={item.id} className={s.card}>
                  <div className={s.cardHeader}>
                    <h3 className={s.cardTitle}>{item.name}</h3>
                    <span className={`${s.badge} ${s.badgeIndigo}`}>{item.category}</span>
                  </div>
                  <div className={s.cellSub}>&ldquo;{item.keywords}&rdquo; · {item.country} · {item.budget}</div>
                  <div className={s.cardFooter}>
                    <button
                      type="button"
                      className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`}
                      onClick={() => {
                        setTechnology(item.technology);
                        setKeywords(item.keywords);
                        setActiveTab('opportunities');
                        triggerNotification('success', `Running saved search: ${item.name}`);
                      }}
                    >
                      Run search
                    </button>
                    <button type="button" className={s.iconBtn} onClick={() => handleDeleteSavedSearch(item.id)} title="Delete" aria-label="Delete saved search"><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Bid report */}
      {showIntelligenceModal && selectedOpportunity && (
        <Modal title="Bid report" icon={<Zap size={18} />} onClose={() => setShowIntelligenceModal(false)} wide>
          <p className={s.modalText}>{selectedOpportunity.projectTitle}</p>
          {intelLoading || !intelligenceReport ? (
            <div className={s.empty}><Loader2 size={20} className={s.spin} /><div className={s.emptyTitle}>Working out cost, margin and risk…</div></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className={`${m.verdict} ${intelligenceReport.recommendation === 'BID' ? '' : m.verdictWarn}`}>
                <div>
                  <div className={s.sectionLabel}>Recommendation</div>
                  <h4 className={m.verdictTitle}>{intelligenceReport.recommendation === 'BID' ? 'Bid on this project' : intelligenceReport.recommendation === 'CONSIDER' ? 'Consider after a closer look' : 'Probably skip this one'}</h4>
                  <div className={s.cellSub}>Fit score {intelligenceReport.overallScore}/100</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className={s.sectionLabel}>Budget</div>
                  <div className={s.kpiValue} style={{ marginTop: 2, fontSize: 20 }}>{intelligenceReport.budget}</div>
                  <div className={s.cellSub}>{intelligenceReport.budgetType}</div>
                </div>
              </div>

              <div className={m.factGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', alignItems: 'start' }}>
                <div>
                  <div className={s.sectionLabel} style={{ marginBottom: 6 }}>In favour</div>
                  {intelligenceReport.reasons.length ? intelligenceReport.reasons.map((r) => <div key={r} style={{ display: 'flex', gap: 6, marginBottom: 4 }}><CheckCircle size={13} style={{ color: 'var(--o-success)', flexShrink: 0, marginTop: 3 }} /> {r}</div>) : <div className={s.cellSub}>Nothing yet.</div>}
                </div>
                <div>
                  <div className={s.sectionLabel} style={{ marginBottom: 6 }}>Check before bidding</div>
                  {intelligenceReport.risks.length ? intelligenceReport.risks.map((r) => <div key={r} style={{ display: 'flex', gap: 6, marginBottom: 4 }}><AlertTriangle size={13} style={{ color: 'var(--o-warn)', flexShrink: 0, marginTop: 3 }} /> {r}</div>) : <div className={s.cellSub}>Nothing found.</div>}
                </div>
              </div>

              <div>
                <div className={s.sectionLabel} style={{ marginBottom: 8 }}>Matching services from your catalog</div>
                {intelligenceReport.services.length === 0 ? (
                  <div className={s.cellSub}>None. Admins can add services and their stacks in Settings &gt; Service catalog.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {intelligenceReport.services.map((svc) => (
                      <div key={svc.name} className={s.metric} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{svc.name} <span className={s.cellSub}>· {svc.matchedTech.slice(0, 4).join(', ')}</span></span>
                        <span className={`${s.badge} ${svc.budgetFits === false ? s.badgeAmber : svc.budgetFits ? s.badgeGreen : s.badgeGray}`}>
                          From {svc.startingPriceUsd}{svc.budgetFits === false ? ' · above budget' : svc.budgetFits ? ' · within budget' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={`${s.notice} ${s.noticeInfo}`}>
                <Sparkles size={15} className={s.noticeIcon} />
                <span><strong>How to pitch it.</strong> {intelligenceReport.pitch}</span>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* CSV import */}
      {showCsvModal && (
        <Modal
          title="Import listings from CSV"
          icon={<FileSpreadsheet size={18} />}
          onClose={() => setShowCsvModal(false)}
          busy={csvImporting}
          wide
          actions={
            <>
              <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={() => setShowCsvModal(false)} disabled={csvImporting}>Cancel</button>
              <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={handleExecuteCsvImport} disabled={csvImporting || !csvText.trim()}>
                {csvImporting ? <Loader2 size={14} className={s.spin} /> : <Upload size={14} />} {csvImporting ? 'Importing…' : 'Import'}
              </button>
            </>
          }
        >
          <label className={s.field}>
            <span className={s.label}>CSV content</span>
            <textarea
              className={`${s.textarea} ${s.mono}`}
              rows={7}
              value={csvText}
              onChange={(e) => handlePreviewCsv(e.target.value)}
              placeholder={'Title,Description,Budget,Country,Technology\nReact Native Mobile App,Seeking React Native agency,$15000,United States,React Native'}
            />
            <span className={s.fieldHint}>First row is the header: Title, Description, Budget, Country, Technology.</span>
          </label>
          {csvPreview && (
            <div className={`${s.notice} ${s.noticeInfo}`}>
              <CheckCircle size={15} className={s.noticeIcon} />
              <span>{csvPreview.totalRows} rows found. Columns: {csvPreview.headers.join(', ')}</span>
            </div>
          )}
        </Modal>
      )}

      {/* Webhook */}
      {showWebhookModal && (
        <Modal
          title="Inbound webhook"
          icon={<Zap size={18} />}
          onClose={() => setShowWebhookModal(false)}
          wide
          actions={
            <>
              <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={() => setShowWebhookModal(false)}>Close</button>
              <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={handleSendTestWebhook}><Send size={14} /> Send test</button>
            </>
          }
        >
          <div className={s.metric}>
            <div className={s.metricLabel}>Endpoint</div>
            <div className={`${s.metricValue} ${s.mono}`}>POST /api/marketplace/webhook</div>
          </div>
          <p className={s.fieldHint} style={{ margin: 0 }}>
            Zapier, Make or n8n must send the header <span className={s.mono}>Authorization: Bearer &lt;MARKETPLACE_WEBHOOK_SECRET&gt;</span>. The webhook stays off until an admin sets that secret on the server. The test below saves a listing without it.
          </p>
          <label className={s.field}>
            <span className={s.label}>Test title</span>
            <input type="text" className={s.input} value={webhookSampleTitle} onChange={(e) => setWebhookSampleTitle(e.target.value)} />
          </label>
          <label className={s.field}>
            <span className={s.label}>Test description</span>
            <textarea className={s.textarea} rows={3} value={webhookSampleDesc} onChange={(e) => setWebhookSampleDesc(e.target.value)} />
          </label>
          <label className={s.field}>
            <span className={s.label}>Test budget</span>
            <input type="text" className={s.input} value={webhookSampleBudget} onChange={(e) => setWebhookSampleBudget(e.target.value)} />
          </label>
        </Modal>
      )}

      {/* Qualification */}
      {showAnalysisModal && selectedOpportunity && (
        <Modal title="Qualification" icon={<Sparkles size={18} />} onClose={() => setShowAnalysisModal(false)}>
          <p className={s.modalText}>{selectedOpportunity.projectTitle}</p>
          {analysisLoading || !aiAnalysis ? (
            <div className={s.empty}><Loader2 size={20} className={s.spin} /><div className={s.emptyTitle}>Checking fit and delivery risk…</div></div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div className={s.metric}><div className={s.metricLabel}>Score</div><div className={`${s.metricValue} ${s.good}`}>{selectedOpportunity.aiOpportunityScore}/100</div></div>
                <div className={s.metric}><div className={s.metricLabel}>Delivery risk</div><div className={s.metricValue}>{selectedOpportunity.deliveryRisk}</div></div>
              </div>
              <div className={`${s.notice} ${s.noticeInfo}`}>
                <Target size={15} className={s.noticeIcon} />
                <span><strong>How to win it.</strong> {selectedOpportunity.winningStrategy}</span>
              </div>
            </>
          )}
        </Modal>
      )}

      {/* Proposal */}
      {showProposalModal && selectedOpportunity && (
        <Modal
          title="Proposal draft"
          icon={<FileText size={18} />}
          onClose={() => setShowProposalModal(false)}
          wide
          actions={
            !proposalLoading && (
              <>
                <button
                  type="button"
                  className={`${s.btn} ${s.btnSecondary}`}
                  onClick={() => {
                    navigator.clipboard.writeText(generatedProposalText);
                    triggerNotification('success', 'Proposal copied.');
                  }}
                >
                  <Copy size={14} /> Copy
                </button>
                <button
                  type="button"
                  className={`${s.btn} ${s.btnPrimary}`}
                  onClick={() => {
                    handleSendToReviewQueue(selectedOpportunity);
                    setShowProposalModal(false);
                  }}
                >
                  <Send size={14} /> Save to Review Queue
                </button>
              </>
            )
          }
        >
          <div className={s.chipRow} role="radiogroup" aria-label="Proposal style">
            {([
              { type: 'professional', label: 'Professional' },
              { type: 'technical', label: 'Technical' },
              { type: 'short', label: 'Short' },
              { type: 'discovery', label: 'Discovery call' },
            ] as const).map((tab) => (
              <button key={tab.type} type="button" role="radio" aria-checked={proposalType === tab.type} className={`${s.chip} ${proposalType === tab.type ? s.chipActive : ''}`} onClick={() => handleChangeProposalType(tab.type)}>
                {tab.label}
              </button>
            ))}
          </div>
          {proposalLoading ? (
            <div className={s.empty}><Loader2 size={20} className={s.spin} /><div className={s.emptyTitle}>Writing the draft…</div></div>
          ) : (
            <textarea className={`${s.textarea} ${m.proposal}`} rows={12} value={generatedProposalText} onChange={(e) => setGeneratedProposalText(e.target.value)} aria-label="Proposal text" />
          )}
        </Modal>
      )}
    </PageShell>
  );
}
