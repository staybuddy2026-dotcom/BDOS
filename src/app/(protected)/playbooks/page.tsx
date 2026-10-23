'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Inbox,
  CheckCircle2,
  AlertCircle,
  Plus,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  BookOpen,
  RefreshCw,
  FolderPlus,
  Eye,
  EyeOff,
  Search,
  X,
  Sparkles,
  Clock,
  Layers,
  Activity,
  Zap,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';

import { 
  getPlaybooks, 
  savePlaybook, 
  duplicatePlaybook, 
  deletePlaybook, 
  togglePlaybookStatus,
  PlaybookData
} from '@/features/playbooks/actions';
import { CustomDropdown } from '@/components/CustomDropdown';
import { BreadcrumbHeader } from '@/components/navigation/BreadcrumbHeader';
import blob from '@/assets/blob.png';
import '@/styles/globals.css';
import '@/styles/playbooks.css';

type LocalStep = {
  id?: string;
  stepName: string;
  delay: number;
  objective: string;
  tone: string;
  aiInstructions: string;
  enabled: boolean;
};

// Curated Sequence Starter Templates
const CURATED_TEMPLATES = [
  {
    name: 'C-Suite Consultative Outbound',
    description: 'Executive 3-touch sequence focusing on enterprise pain points and high-level ROI audits.',
    defaultTone: 'Professional',
    steps: [
      {
        stepName: 'Executive Connection & Context Hook',
        delay: 0,
        objective: 'Establish peer credibility and connection without any aggressive sales pitching.',
        tone: 'Professional',
        aiInstructions: 'Mention author recent post or company milestone. Reference their current industry scaling challenges. Keep message under 50 words.',
        enabled: true,
      },
      {
        stepName: 'Value Insight & Teardown Teaser',
        delay: 3,
        objective: 'Share an actionable perspective or teardown relevant to their department priorities.',
        tone: 'Insightful',
        aiInstructions: 'Highlight 1 high-impact inefficiency typical in their tech stack. Offer to send a 2-page brief if interested. No meeting ask yet.',
        enabled: true,
      },
      {
        stepName: 'Low-Friction 15-Min Briefing Offer',
        delay: 4,
        objective: 'Propose a quick 15-minute introductory alignment session or executive benchmark.',
        tone: 'Direct',
        aiInstructions: 'Reference previous touchpoint. Offer 2 specific times next week. Emphasize zero-obligation consultative value.',
        enabled: true,
      }
    ]
  },
  {
    name: 'Hyper-Personalized LinkedIn Cadence',
    description: 'Warm social cadence combining profile engagement hooks with contextual InMail teardowns.',
    defaultTone: 'Insightful',
    steps: [
      {
        stepName: 'Warm Profile Engagement & Connect',
        delay: 0,
        objective: 'Connect based on mutual interest in their recent LinkedIn content.',
        tone: 'Casual',
        aiInstructions: 'Quote one specific idea from their latest post or experience headline. Express genuine appreciation for their perspective.',
        enabled: true,
      },
      {
        stepName: 'Personalized Problem-Solution Note',
        delay: 3,
        objective: 'Demonstrate how peer companies resolved their exact bottleneck.',
        tone: 'Insightful',
        aiInstructions: 'Name drop 1-2 relevant case studies in the same vertical. Mention specific metrics (e.g. 3.2x response rates, 40% time saved).',
        enabled: true,
      },
      {
        stepName: 'Friendly Check-in & Resource Link',
        delay: 5,
        objective: 'Gentle nudge offering a free interactive checklist or benchmark calculator.',
        tone: 'Casual',
        aiInstructions: 'Keep under 40 words. Ask if this is a top priority for Q3/Q4 or if timing is better later.',
        enabled: true,
      }
    ]
  },
  {
    name: 'Post-Event & Demo Lead Blitz',
    description: 'Rapid 3-touch follow-up designed to convert warm webinar attendees and demo request leads.',
    defaultTone: 'Direct',
    steps: [
      {
        stepName: 'Immediate Recap & Slide Deck Delivery',
        delay: 0,
        objective: 'Deliver promised materials and anchor positive event experience.',
        tone: 'Professional',
        aiInstructions: 'Thank them for attending. Share key takeaway summary bullet points and link to presentation replay.',
        enabled: true,
      },
      {
        stepName: 'Implementation Deep-Dive Offer',
        delay: 2,
        objective: 'Offer tailored implementation mapping based on their company size.',
        tone: 'Direct',
        aiInstructions: 'Ask which specific topic discussed during the session resonated most with their current team workflow.',
        enabled: true,
      },
      {
        stepName: 'Executive Calendar Invitation',
        delay: 4,
        objective: 'Final friendly invitation to lock in personalized demo trial access.',
        tone: 'Professional',
        aiInstructions: 'State that complimentary pilot slots for this month are filling up. Provide seamless calendar booking link.',
        enabled: true,
      }
    ]
  }
];

export default function PlaybooksPage() {
  const [playbooks, setPlaybooks] = useState<PlaybookData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [showStarterHub, setShowStarterHub] = useState(false);

  // Form Fields
  const [playbookName, setPlaybookName] = useState('');
  const [playbookDescription, setPlaybookDescription] = useState('');
  const [playbookStatus, setPlaybookStatus] = useState('ACTIVE');
  const [playbookDefaultTone, setPlaybookDefaultTone] = useState('Professional');
  const [steps, setSteps] = useState<LocalStep[]>([]);

  // Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const triggerNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Populate form fields with active playbook
  const populateForm = useCallback((pb: PlaybookData) => {
    setPlaybookName(pb.name);
    setPlaybookDescription(pb.description || '');
    setPlaybookStatus(pb.status);
    setPlaybookDefaultTone(pb.defaultTone || 'Professional');
    setSteps(pb.steps.map(step => ({
      id: step.id,
      stepName: step.stepName,
      delay: step.delay,
      objective: step.objective || '',
      tone: step.tone || '',
      aiInstructions: step.aiInstructions || '',
      enabled: step.enabled,
    })));
  }, []);

  // Setup form parameters for a fresh playbook
  const resetFormForNew = useCallback(() => {
    setSelectedId(null);
    setPlaybookName('');
    setPlaybookDescription('');
    setPlaybookStatus('ACTIVE');
    setPlaybookDefaultTone('Professional');
    setSteps([
      {
        stepName: 'Initial Connection & Hook',
        delay: 0,
        objective: 'Establish peer credibility and connect on LinkedIn',
        tone: 'Professional',
        aiInstructions: 'Personalize based on author headline and recent post. Mention company growth. Keep under 50 words.',
        enabled: true,
      },
      {
        stepName: 'Value Insight Teardown',
        delay: 3,
        objective: 'Provide high-value case study benchmark',
        tone: 'Insightful',
        aiInstructions: 'Reference specific ROI metric. Highlight common bottlenecks in their sector.',
        enabled: true,
      }
    ]);
  }, []);

  // Load template helper
  const handleApplyTemplate = (templateIndex: number) => {
    const tmpl = CURATED_TEMPLATES[templateIndex];
    setSelectedId(null);
    setPlaybookName(tmpl.name);
    setPlaybookDescription(tmpl.description);
    setPlaybookStatus('ACTIVE');
    setPlaybookDefaultTone(tmpl.defaultTone);
    setSteps(tmpl.steps.map(s => ({ ...s })));
    setShowStarterHub(false);
    triggerNotification('success', `Applied template: "${tmpl.name}". Review and click Save Configuration.`);
  };

  // Load playbooks data
  const loadData = useCallback(async (selectId?: string) => {
    try {
      const data = await getPlaybooks();
      setPlaybooks(data);
      
      // Auto-select playbook
      if (data.length > 0) {
        const idToSelect = selectId || data[0].id;
        setSelectedId(idToSelect);
        const pb = data.find(p => p.id === idToSelect) || data[0];
        populateForm(pb);
      } else {
        resetFormForNew();
      }
      setDbError(null);
    } catch (err) {
      console.error(err);
      setDbError('Database Connection Warning: Unable to connect to PostgreSQL. Run database migrations to initialize tables.');
    } finally {
      setPageLoading(false);
    }
  }, [populateForm, resetFormForNew]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const handleSelectPlaybook = (id: string) => {
    setSelectedId(id);
    const pb = playbooks.find(p => p.id === id);
    if (pb) {
      populateForm(pb);
    }
  };

  // Filtered Playbooks
  const filteredPlaybooks = useMemo(() => {
    return playbooks.filter(pb => {
      const matchesSearch = 
        pb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pb.description && pb.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        pb.steps.some(s => s.stepName.toLowerCase().includes(searchQuery.toLowerCase()) || (s.objective && s.objective.toLowerCase().includes(searchQuery.toLowerCase())));
      
      const matchesStatus = 
        statusFilter === 'ALL' || 
        pb.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [playbooks, searchQuery, statusFilter]);

  // Overall Statistics Metrics
  const stats = useMemo(() => {
    const total = playbooks.length;
    const active = playbooks.filter(p => p.status === 'ACTIVE').length;
    const totalSteps = playbooks.reduce((acc, p) => acc + p.steps.length, 0);
    const avgSteps = total > 0 ? (totalSteps / total).toFixed(1) : '0';
    return { total, active, totalSteps, avgSteps };
  }, [playbooks]);

  // Playbook Level Actions
  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await togglePlaybookStatus(id, nextStatus);
      setPlaybooks(prev => prev.map(p => p.id === id ? { ...p, status: nextStatus } : p));
      if (selectedId === id) setPlaybookStatus(nextStatus);
      triggerNotification('success', `Playbook status set to ${nextStatus}.`);
    } catch {
      triggerNotification('error', 'Failed to toggle status.');
    }
  };

  const handleDuplicatePlaybook = async (id: string) => {
    setActionLoading(true);
    try {
      const copy = await duplicatePlaybook(id);
      triggerNotification('success', 'Playbook duplicated successfully.');
      await loadData(copy.id);
    } catch {
      triggerNotification('error', 'Failed to duplicate playbook.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePlaybook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this playbook? All steps will be deleted.')) return;
    setActionLoading(true);
    try {
      await deletePlaybook(id);
      triggerNotification('success', 'Playbook deleted.');
      
      const remaining = playbooks.filter(p => p.id !== id);
      setPlaybooks(remaining);
      if (remaining.length > 0) {
        handleSelectPlaybook(remaining[0].id);
      } else {
        resetFormForNew();
      }
    } catch {
      triggerNotification('error', 'Failed to delete playbook.');
    } finally {
      setActionLoading(false);
    }
  };

  // Step Level Actions
  const handleAddStep = () => {
    const newStep: LocalStep = {
      stepName: `Outreach Touch ${steps.length + 1}`,
      delay: steps.length === 0 ? 0 : 3,
      objective: '',
      tone: playbookDefaultTone,
      aiInstructions: '',
      enabled: true,
    };
    setSteps(prev => [...prev, newStep]);
  };

  const handleDuplicateStep = (index: number) => {
    const sourceStep = steps[index];
    const clonedStep: LocalStep = {
      stepName: `${sourceStep.stepName} (Copy)`,
      delay: sourceStep.delay,
      objective: sourceStep.objective,
      tone: sourceStep.tone,
      aiInstructions: sourceStep.aiInstructions,
      enabled: sourceStep.enabled,
    };
    
    setSteps(prev => {
      const list = [...prev];
      list.splice(index + 1, 0, clonedStep);
      return list;
    });
    triggerNotification('success', 'Step cloned.');
  };

  const handleDeleteStep = (index: number) => {
    if (steps.length === 1) {
      triggerNotification('error', 'A playbook must contain at least one step.');
      return;
    }
    setSteps(prev => prev.filter((_, idx) => idx !== index));
    triggerNotification('success', 'Step deleted.');
  };

  const handleToggleStepEnabled = (index: number) => {
    setSteps(prev => prev.map((s, idx) => idx === index ? { ...s, enabled: !s.enabled } : s));
  };

  const handleUpdateStepField = (index: number, field: keyof LocalStep, value: string | number | boolean) => {
    setSteps(prev => prev.map((s, idx) => idx === index ? { ...s, [field]: value } : s));
  };

  // Reordering steps (swap index logic)
  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === steps.length - 1) return;

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    setSteps(prev => {
      const list = [...prev];
      const temp = list[index];
      list[index] = list[swapIndex];
      list[swapIndex] = temp;
      return list;
    });
  };

  // Append instruction chip helper
  const handleAppendInstructionChip = (index: number, chipText: string) => {
    setSteps(prev => prev.map((s, idx) => {
      if (idx !== index) return s;
      const current = s.aiInstructions ? s.aiInstructions.trim() : '';
      const updated = current ? `${current} ${chipText}` : chipText;
      return { ...s, aiInstructions: updated };
    }));
  };

  // Total Cadence Duration
  const totalCadenceDays = useMemo(() => {
    return steps.reduce((sum, s) => sum + (s.enabled ? s.delay : 0), 0);
  }, [steps]);

  // Save changes Server Action
  const handleSavePlaybook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playbookName.trim()) {
      triggerNotification('error', 'Playbook name cannot be empty.');
      return;
    }

    setActionLoading(true);
    try {
      const saved = await savePlaybook(
        selectedId,
        {
          name: playbookName,
          description: playbookDescription,
          status: playbookStatus,
          defaultTone: playbookDefaultTone,
        },
        steps
      );

      triggerNotification('success', 'Playbook configuration saved successfully.');
      await loadData(saved.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save playbook configuration.';
      triggerNotification('error', message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="playbooks-page-root">
      {/* EXECUTIVE HEADER BANNER */}
      <div className="playbooks-header-bar">
        <div className="playbooks-header-left">
          <div className="playbooks-icon-badge">
            <BookOpen size={22} />
          </div>
          <div className="playbooks-header-titles">
            <h1 className="playbooks-header-title">
              Outreach Playbooks & Cadences
            </h1>
            <span className="playbooks-header-subtitle">
              Configure multi-step outreach schedules, automated touchpoints, and generative AI guidelines
            </span>
          </div>
        </div>

        <div className="playbooks-header-actions">
          <button
            type="button"
            onClick={() => setShowStarterHub(prev => !prev)}
            className="pb-btn-secondary"
            title="Browse pre-built sequence templates"
          >
            <Sparkles size={15} style={{ color: '#8b5cf6' }} />
            <span>{showStarterHub ? 'Hide Templates' : 'Starter Templates'}</span>
          </button>

          <button
            type="button"
            onClick={resetFormForNew}
            className="pb-btn-primary"
            disabled={pageLoading}
          >
            <FolderPlus size={16} />
            <span>Create Playbook</span>
          </button>
        </div>
      </div>

      {/* SCROLLABLE MAIN BODY */}
      <div
        className="playbooks-main-scroll"
        style={{
          backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.75), rgba(248, 250, 252, 0.75)), url(${blob.src})`,
          backgroundSize: 'cover',
          backgroundPosition: 'top right',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
        {/* Floating Notifications */}
        {notification && (
          <div className={`pb-toast-notification ${notification.type}`}>
            {notification.type === 'success' ? (
              <CheckCircle2 size={18} style={{ color: '#10b981', flexShrink: 0 }} />
            ) : (
              <AlertCircle size={18} style={{ color: '#f87171', flexShrink: 0 }} />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Database Warning */}
        {dbError && (
          <div className="pb-stat-card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(254, 242, 242, 0.9)' }}>
            <AlertCircle size={24} style={{ color: '#ef4444' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: '#991b1b', fontSize: '0.88rem' }}>Database Connectivity Warning</div>
              <div style={{ fontSize: '0.78rem', color: '#b91c1c' }}>{dbError}</div>
            </div>
            <button onClick={() => loadData(selectedId || undefined)} className="pb-action-btn" title="Retry">
              <RefreshCw size={15} />
            </button>
          </div>
        )}

        {/* BREADCRUMB */}
        <BreadcrumbHeader
          currentTitle="Outreach Playbooks & Cadences"
          badge="Multi-Step Sequence Templates"
        />

        {/* EXECUTIVE KPI STATS CARDS */}
        <div className="playbooks-stats-grid">
          <div className="pb-stat-card">
            <div className="pb-stat-icon-wrapper pb-stat-icon-indigo">
              <BookOpen size={20} />
            </div>
            <div className="pb-stat-info">
              <span className="pb-stat-label">Total Playbooks</span>
              <span className="pb-stat-value">{stats.total}</span>
              <span className="pb-stat-subtext">Library Cadences</span>
            </div>
          </div>

          <div className="pb-stat-card">
            <div className="pb-stat-icon-wrapper pb-stat-icon-emerald">
              <Activity size={20} />
            </div>
            <div className="pb-stat-info">
              <span className="pb-stat-label">Active Sequences</span>
              <span className="pb-stat-value" style={{ color: '#059669' }}>{stats.active}</span>
              <span className="pb-stat-subtext">
                <span className="pb-pulse-dot" /> Live Automated Touchpoints
              </span>
            </div>
          </div>

          <div className="pb-stat-card">
            <div className="pb-stat-icon-wrapper pb-stat-icon-violet">
              <Layers size={20} />
            </div>
            <div className="pb-stat-info">
              <span className="pb-stat-label">Total Cadence Steps</span>
              <span className="pb-stat-value">{stats.totalSteps}</span>
              <span className="pb-stat-subtext">Avg {stats.avgSteps} steps / sequence</span>
            </div>
          </div>

          <div className="pb-stat-card">
            <div className="pb-stat-icon-wrapper pb-stat-icon-amber">
              <Clock size={20} />
            </div>
            <div className="pb-stat-info">
              <span className="pb-stat-label">Active Sequence Span</span>
              <span className="pb-stat-value">{totalCadenceDays} Days</span>
              <span className="pb-stat-subtext">Multi-touch execution schedule</span>
            </div>
          </div>
        </div>

        {/* CURATED STARTER PACK HUB */}
        {showStarterHub && (
          <div className="pb-templates-hub">
            <div className="pb-templates-hub-header">
              <div className="pb-templates-title">
                <Sparkles size={18} style={{ color: '#8b5cf6' }} />
                <span>Curated Multi-Touch Sequence Starter Packs</span>
              </div>
              <button 
                type="button" 
                onClick={() => setShowStarterHub(false)}
                className="pb-action-btn"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="pb-templates-grid">
              {CURATED_TEMPLATES.map((tmpl, idx) => (
                <div key={idx} className="pb-template-card" onClick={() => handleApplyTemplate(idx)}>
                  <div className="pb-template-name">{tmpl.name}</div>
                  <p className="pb-template-desc">{tmpl.description}</p>
                  <div className="pb-template-meta">
                    <span>{tmpl.steps.length} Sequence Steps • {tmpl.defaultTone}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      Apply <ChevronRight size={13} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2-COLUMN WORKSPACE LAYOUT */}
        <div className="playbooks-workspace-layout">
          
          {/* LEFT PANEL: SEQUENCE LIBRARY */}
          <div className="playbooks-left-panel">
            <div className="playbooks-panel-header">
              <div className="playbooks-panel-title-wrap">
                <SlidersHorizontal size={16} style={{ color: '#6366f1' }} />
                <h3 className="playbooks-panel-title">Sequence Library</h3>
                <span className="playbooks-counter-pill">{filteredPlaybooks.length}</span>
              </div>
            </div>

            {/* 44px Executive Searchbar */}
            <div className="playbooks-search-container">
              <div className="playbooks-search-icon-badge">
                <Search size={15} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search playbooks, steps, or objective..."
                className="playbooks-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="playbooks-search-clear"
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Quick Status Filter Tabs */}
            <div className="playbooks-filter-tabs">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`playbooks-filter-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
              >
                All ({playbooks.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ACTIVE')}
                className={`playbooks-filter-btn ${statusFilter === 'ACTIVE' ? 'active' : ''}`}
              >
                Active ({playbooks.filter(p => p.status === 'ACTIVE').length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('INACTIVE')}
                className={`playbooks-filter-btn ${statusFilter === 'INACTIVE' ? 'active' : ''}`}
              >
                Drafts ({playbooks.filter(p => p.status === 'INACTIVE').length})
              </button>
            </div>

            {/* Playbooks Scrollable List */}
            <div className="playbooks-card-list">
              {pageLoading ? (
                <div className="playbooks-sidebar-empty">
                  <RefreshCw className="animate-spin" size={24} style={{ color: '#6366f1' }} />
                  <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Loading Playbooks...</span>
                </div>
              ) : filteredPlaybooks.length === 0 ? (
                <div className="playbooks-sidebar-empty">
                  <div className="playbooks-sidebar-empty-icon">
                    <Inbox size={22} />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                    {searchQuery ? 'No matching playbooks' : 'No Playbooks found'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {searchQuery ? 'Try clearing your search query' : 'Click "Starter Templates" or "Create Playbook" to start'}
                  </span>
                </div>
              ) : (
                filteredPlaybooks.map((pb) => {
                  const isSelected = pb.id === selectedId;
                  const activeSteps = pb.steps.filter(s => s.enabled).length;

                  return (
                    <div
                      key={pb.id}
                      onClick={() => handleSelectPlaybook(pb.id)}
                      className={`playbook-item-card ${isSelected ? 'active' : ''}`}
                    >
                      <div className="playbook-item-header">
                        <span className="playbook-item-name">{pb.name}</span>
                        <span className={`playbook-badge-status ${pb.status === 'ACTIVE' ? 'playbook-badge-active' : 'playbook-badge-inactive'}`}>
                          {pb.status === 'ACTIVE' && <span className="pb-pulse-dot" style={{ width: 5, height: 5 }} />}
                          {pb.status}
                        </span>
                      </div>

                      <p className="playbook-item-desc">
                        {pb.description || 'No description provided for this cadence.'}
                      </p>

                      <div className="playbook-item-meta">
                        <div className="playbook-item-chips">
                          <span className="playbook-chip">
                            <Layers size={11} /> {activeSteps} of {pb.steps.length} Steps
                          </span>
                          {pb.defaultTone && (
                            <span className="playbook-chip playbook-chip-tone">
                              <Sparkles size={10} /> {pb.defaultTone}
                            </span>
                          )}
                        </div>

                        <div className="playbook-item-actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleDuplicatePlaybook(pb.id)}
                            className="pb-action-btn"
                            title="Duplicate playbook"
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePlaybook(pb.id)}
                            className="pb-action-btn delete"
                            title="Delete playbook"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT PANEL: PLAYBOOK SEQUENCE EDITOR */}
          <div className="playbooks-editor-card">
            <form onSubmit={handleSavePlaybook} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Editor Top Bar */}
              <div className="editor-top-bar">
                <div className="editor-title-group">
                  <div className="editor-icon-badge">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h2 className="editor-heading">
                      {selectedId ? (playbookName || 'Edit Playbook') : 'New Playbook Configuration'}
                    </h2>
                    <span className="editor-subheading">
                      {selectedId ? `Cadence ID: ${selectedId.slice(0, 12)}...` : 'Build a custom multi-step outreach schedule'}
                    </span>
                  </div>
                </div>

                <div className="editor-actions-group">
                  {selectedId && (
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(selectedId, playbookStatus)}
                      className={`pb-btn-status-toggle ${playbookStatus === 'ACTIVE' ? 'active-mode' : 'inactive-mode'}`}
                    >
                      {playbookStatus === 'ACTIVE' ? (
                        <>
                          <EyeOff size={14} /> Disable Sequence
                        </>
                      ) : (
                        <>
                          <Eye size={14} /> Enable Sequence
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="pb-btn-secondary"
                  >
                    <Plus size={14} /> Add Step
                  </button>

                  <button
                    type="submit"
                    disabled={actionLoading || !playbookName.trim()}
                    className="pb-btn-primary"
                  >
                    {actionLoading ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={15} /> Save Configuration
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Playbook Metadata Fields */}
              <div className="playbook-meta-grid">
                <div className="pb-field-group">
                  <label className="pb-field-label">
                    <span>Playbook Name *</span>
                    <span className="pb-field-hint">e.g. Enterprise Pitch</span>
                  </label>
                  <input
                    type="text"
                    value={playbookName}
                    onChange={(e) => setPlaybookName(e.target.value)}
                    placeholder="e.g., Enterprise Software Consultative Pitch"
                    className="pb-text-input"
                    required
                  />
                </div>

                <div className="pb-field-group" style={{ position: 'relative', zIndex: 60 }}>
                  <label className="pb-field-label">
                    <span>Default AI Generation Tone</span>
                    <span className="pb-field-hint">Global default</span>
                  </label>
                  <CustomDropdown
                    buttonHeight={44}
                    value={playbookDefaultTone}
                    onChange={(val) => setPlaybookDefaultTone(val)}
                    options={[
                      { value: 'Professional', label: 'Professional (Consultative)' },
                      { value: 'Casual', label: 'Casual (Friendly & Warm)' },
                      { value: 'Insightful', label: 'Insightful (Expert / Teardown)' },
                      { value: 'Direct', label: 'Direct (Short & Action-Oriented)' }
                    ]}
                  />
                </div>
              </div>

              <div className="pb-field-group">
                <label className="pb-field-label">
                  <span>Cadence Objective & Campaign Description</span>
                  <span className="pb-field-hint">Context provided to AI copywriting engine</span>
                </label>
                <textarea
                  value={playbookDescription}
                  onChange={(e) => setPlaybookDescription(e.target.value)}
                  placeholder="Describe when and how to apply this multi-step campaign playbook (e.g. Used for Series A-C CTOs experiencing high cloud compute bills)..."
                  className="pb-textarea-input"
                />
              </div>

              {/* STEPS SEQUENCE SECTION */}
              <div className="playbook-steps-section">
                <div className="steps-section-header">
                  <div className="steps-heading-wrap">
                    <Zap size={16} style={{ color: '#6366f1' }} />
                    <h4 className="steps-heading-title">Multi-Touch Sequence Timeline</h4>
                    <span className="steps-pill-counter">{steps.length} Steps</span>
                  </div>

                  <div className="steps-duration-pill">
                    <Clock size={13} style={{ color: '#f59e0b' }} />
                    <span>Total Sequence Span: <strong>{totalCadenceDays} Days</strong></span>
                  </div>
                </div>

                {/* Steps Flow Cards */}
                <div className="pb-steps-flow">
                  {steps.map((step, index) => (
                    <div
                      key={index}
                      className={`pb-step-card ${!step.enabled ? 'disabled-step' : ''}`}
                    >
                      {/* Step Header */}
                      <div className="pb-step-card-header">
                        <div className="pb-step-title-left">
                          <span className="pb-step-number-badge">{index + 1}</span>
                          <input
                            type="text"
                            value={step.stepName}
                            onChange={(e) => handleUpdateStepField(index, 'stepName', e.target.value)}
                            placeholder="Step Name (e.g. Initial InMail)"
                            className="pb-step-name-input"
                            required
                          />
                          <span className="pb-step-delay-badge">
                            <Clock size={11} /> {step.delay === 0 ? 'Day 0 (Initial)' : `+${step.delay} Days delay`}
                          </span>
                        </div>

                        <div className="pb-step-header-actions">
                          <button
                            type="button"
                            onClick={() => handleToggleStepEnabled(index)}
                            className="pb-step-icon-btn"
                            title={step.enabled ? 'Disable Step' : 'Enable Step'}
                          >
                            {step.enabled ? <Eye size={14} /> : <EyeOff size={14} style={{ color: '#ef4444' }} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveStep(index, 'up')}
                            disabled={index === 0}
                            className="pb-step-icon-btn"
                            title="Move Up"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveStep(index, 'down')}
                            disabled={index === steps.length - 1}
                            className="pb-step-icon-btn"
                            title="Move Down"
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateStep(index)}
                            className="pb-step-icon-btn"
                            title="Clone Step"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStep(index)}
                            className="pb-step-icon-btn delete"
                            title="Delete Step"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Step Fields Row */}
                      <div className="pb-step-fields-row">
                        <div className="pb-field-group">
                          <label className="pb-field-label">
                            <span>Delay (Days after previous touch)</span>
                            <span className="pb-field-hint">0 = Send immediately</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="90"
                            value={step.delay}
                            onChange={(e) => handleUpdateStepField(index, 'delay', parseInt(e.target.value) || 0)}
                            className="pb-text-input"
                            required
                          />
                        </div>

                        <div className="pb-field-group" style={{ position: 'relative', zIndex: 40 - index }}>
                          <label className="pb-field-label">
                            <span>AI Writing Tone Override</span>
                            <span className="pb-field-hint">Leave blank for default</span>
                          </label>
                          <CustomDropdown
                            buttonHeight={44}
                            value={step.tone || ''}
                            onChange={(val) => handleUpdateStepField(index, 'tone', val)}
                            options={[
                              { value: '', label: `Use Playbook Default (${playbookDefaultTone})` },
                              { value: 'Professional', label: 'Professional (Consultative)' },
                              { value: 'Casual', label: 'Casual (Friendly & Warm)' },
                              { value: 'Insightful', label: 'Insightful (Expert / Teardown)' },
                              { value: 'Direct', label: 'Direct (Short & Action-Oriented)' }
                            ]}
                          />
                        </div>
                      </div>

                      {/* AI Objective Field */}
                      <div className="pb-field-group">
                        <label className="pb-field-label">
                          <span>AI Step Objective</span>
                          <span className="pb-field-hint">Core outcome desired</span>
                        </label>
                        <input
                          type="text"
                          value={step.objective}
                          onChange={(e) => handleUpdateStepField(index, 'objective', e.target.value)}
                          placeholder="e.g., Pitch a 15 min review audit call or request connection."
                          className="pb-text-input"
                        />
                      </div>

                      {/* AI Prompt Instructions Field */}
                      <div className="pb-field-group">
                        <label className="pb-field-label">
                          <span>AI Prompt Instructions & Guardrails</span>
                          <span className="pb-field-hint">Specific copywriting rules</span>
                        </label>
                        <textarea
                          value={step.aiInstructions}
                          onChange={(e) => handleUpdateStepField(index, 'aiInstructions', e.target.value)}
                          placeholder="e.g., Do not mention pricing details. Focus strictly on their scaling issues and mention their company name explicitly."
                          className="pb-textarea-input"
                        />
                        
                        {/* Quick Prompt Helper Chips */}
                        <div className="pb-prompt-chips-wrap">
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Quick Prompt Additions:</span>
                          <button
                            type="button"
                            onClick={() => handleAppendInstructionChip(index, 'Mention prospect pain points explicitly.')}
                            className="pb-prompt-chip"
                          >
                            + Pain Points
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAppendInstructionChip(index, 'Keep length strictly under 60 words.')}
                            className="pb-prompt-chip"
                          >
                            + Under 60 words
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAppendInstructionChip(index, 'Reference their recent LinkedIn post or industry news.')}
                            className="pb-prompt-chip"
                          >
                            + Post Reference
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAppendInstructionChip(index, 'Use a low-friction soft call-to-action.')}
                            className="pb-prompt-chip"
                          >
                            + Soft CTA
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAppendInstructionChip(index, 'Do not mention pricing or contractual commitments.')}
                            className="pb-prompt-chip"
                          >
                            + No Pricing
                          </button>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>

                {/* Add Step Button */}
                <div className="pb-add-step-bottom">
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="pb-btn-secondary"
                    style={{ borderStyle: 'dashed', padding: '10px 24px', width: '100%', justifyContent: 'center' }}
                  >
                    <Plus size={15} /> Add Another Cadence Touchpoint
                  </button>
                </div>

              </div>

            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
