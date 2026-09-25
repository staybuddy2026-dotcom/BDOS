'use client';


import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Archive,
  CheckCircle,
  RefreshCw,
  Search,
  AlertCircle,
  Star,
  ExternalLink,
  BookOpen,
  Zap,
  User,
  ShieldCheck,
  Building2,
  Briefcase
} from 'lucide-react';

import {
  getReviewPosts,
  togglePostFavorite,
  archivePost,
  submitPostAnalysis,
  createOutreachDraft,
  approveOutreachDraft,
  saveOutreachDraftChanges,
  regenerateOutreachDraft,
  markOutreachDraftAsSent,
  ReviewPostData
} from '@/features/review/actions';
import {
  enrichPostWithApollo,
  getPostApolloEnrichment,
  checkApolloCreditWarning,
  ApolloEnrichmentData
} from '@/features/apollo/actions';
import { getPlaybooks, PlaybookData } from '@/features/playbooks/actions';
import { CustomDropdown } from '@/components/CustomDropdown';
import { BreadcrumbHeader } from '@/components/navigation/BreadcrumbHeader';
import { DraftStatus } from '@prisma/client';
import blob from '@/assets/blob.png';
import { WorkflowGuide } from '@/components/WorkflowGuide';
import '@/styles/globals.css';
import '@/styles/review.css';

function SmoothDropdown({
  value,
  onChange,
  options,
  placeholder
}: {
  value: string;
  onChange: (val: string) => void;
  options: { label: string, value: string }[];
  placeholder: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find(o => o.value === value)?.label || placeholder;

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        onClick={() => setIsOpen(prev => !prev)}
        className="premium-select w-full flex justify-between items-center"
      >
        <span>{selectedLabel}</span>
      </div>

      <div
        className={`absolute top-[calc(100%+8px)] left-0 right-0 bg-white/95 backdrop-blur-md border border-white/80 rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.08)] z-[1000] overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isOpen ? 'max-h-[250px] opacity-100 pointer-events-auto translate-y-0' : 'max-h-0 opacity-0 pointer-events-none -translate-y-2.5'}`}
      >
        <div className="p-2 flex flex-col gap-1 overflow-y-auto max-h-[234px]">
          <div
            onClick={() => { onChange(''); setIsOpen(false); }}
            className={`dropdown-item-smooth ${value === '' ? 'font-extrabold text-indigo-500' : 'font-medium text-inherit'}`}
          >
            {placeholder}
          </div>
          {options.map(opt => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`dropdown-item-smooth ${value === opt.value ? 'font-extrabold text-indigo-500' : 'font-medium text-inherit'}`}
            >
              {opt.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  // Page lists & stats
  const [posts, setPosts] = useState<ReviewPostData[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Playbooks & Steps selections
  const [playbooks, setPlaybooks] = useState<PlaybookData[]>([]);
  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string>('');
  const [selectedStepId, setSelectedStepId] = useState<string>('');
  const [userInstructions, setUserInstructions] = useState('');
  const [isOriginalCollapsed, setIsOriginalCollapsed] = useState(true);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState<string>('newest');

  // Sub-modules loaders & editors
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [outreachLoading, setOutreachLoading] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [saveChangesLoading, setSaveChangesLoading] = useState(false);
  const [markSentLoading, setMarkSentLoading] = useState(false);
  const [draftText, setDraftText] = useState('');

  // Apollo Enrichment states
  const [apolloEnrichment, setApolloEnrichment] = useState<ApolloEnrichmentData | null>(null);
  const [showApolloModal, setShowApolloModal] = useState(false);
  const [apolloLoading, setApolloLoading] = useState(false);
  const [useApolloDataInAi, setUseApolloDataInAi] = useState(false);
  const [apolloOptWorkEmail, setApolloOptWorkEmail] = useState(true);
  const [apolloOptPersonalEmail, setApolloOptPersonalEmail] = useState(false);
  const [apolloOptPhone, setApolloOptPhone] = useState(false);
  const [creditWarning, setCreditWarning] = useState<{ isWarning: boolean; remainingCredits: number } | null>(null);

  // Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const triggerNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Load Review Queue items
  const loadData = useCallback(async () => {
    try {
      const data = await getReviewPosts();
      setPosts(data);

      const pbs = await getPlaybooks();
      const activePbs = pbs.filter(p => p.status === 'ACTIVE');
      setPlaybooks(activePbs);
      if (activePbs.length > 0) {
        setSelectedPlaybookId(activePbs[0].id);
        const stepsList = activePbs[0].steps.filter(s => s.enabled);
        if (stepsList.length > 0) {
          setSelectedStepId(stepsList[0].id);
        }
      }

      if (data.length > 0) {
        setSelectedPostId(data[0].id);
        const existingDraft = data[0].drafts[0];
        setDraftText(existingDraft ? (existingDraft.editedDraft || existingDraft.originalAiDraft) : '');
        if (existingDraft) {
          if (existingDraft.playbookId) setSelectedPlaybookId(existingDraft.playbookId);
          if (existingDraft.stepId) setSelectedStepId(existingDraft.stepId);
        }
      } else {
        setSelectedPostId(null);
        setDraftText('');
      }
      setDbError(null);
    } catch (err) {
      console.error(err);
      setDbError('Database Connection Warning: Unable to connect to PostgreSQL. Run database migrations to initialize tables.');
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  // Active Post selection
  const activePost = posts.find(p => p.id === selectedPostId) || null;

  const handleSelectPost = (postId: string) => {
    setSelectedPostId(postId);
    const post = posts.find(p => p.id === postId);
    if (post) {
      const existingDraft = post.drafts[0];
      setDraftText(existingDraft ? (existingDraft.editedDraft || existingDraft.originalAiDraft) : '');
      if (existingDraft) {
        if (existingDraft.playbookId) setSelectedPlaybookId(existingDraft.playbookId);
        if (existingDraft.stepId) setSelectedStepId(existingDraft.stepId);
      }
      getPostApolloEnrichment(postId).then(res => {
        setApolloEnrichment(res);
      });
    } else {
      setDraftText('');
      setApolloEnrichment(null);
    }
  };

  // Apollo handlers
  const handleOpenApolloModal = async () => {
    if (!selectedPostId) return;
    const warning = await checkApolloCreditWarning();
    setCreditWarning(warning);
    setShowApolloModal(true);
  };

  const handleConfirmEnrichment = async () => {
    if (!selectedPostId) return;
    setShowApolloModal(false);
    setApolloLoading(true);
    try {
      const enrichment = await enrichPostWithApollo(selectedPostId, {
        workEmail: apolloOptWorkEmail,
        personalEmail: apolloOptPersonalEmail,
        phone: apolloOptPhone,
      });
      setApolloEnrichment(enrichment as ApolloEnrichmentData);
      triggerNotification('success', 'Apollo enrichment completed.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Apollo enrichment failed.';
      triggerNotification('error', message);
    } finally {
      setApolloLoading(false);
    }
  };

  // Automatic navigation to next item in the list
  const selectNextPost = (currentId: string, updatedList: ReviewPostData[]) => {
    const currentIndex = updatedList.findIndex(p => p.id === currentId);
    if (updatedList.length === 0) {
      setSelectedPostId(null);
      setDraftText('');
      setApolloEnrichment(null);
      return;
    }
    // Select next item, or if it was the last item, select the previous item
    const nextIndex = currentIndex < updatedList.length ? currentIndex : updatedList.length - 1;
    const nextPost = updatedList[nextIndex];
    if (nextPost) {
      setSelectedPostId(nextPost.id);
      const existingDraft = nextPost.drafts[0];
      setDraftText(existingDraft ? (existingDraft.editedDraft || existingDraft.originalAiDraft) : '');
      if (existingDraft) {
        if (existingDraft.playbookId) setSelectedPlaybookId(existingDraft.playbookId);
        if (existingDraft.stepId) setSelectedStepId(existingDraft.stepId);
      }
      getPostApolloEnrichment(nextPost.id).then(res => {
        setApolloEnrichment(res);
      });
    }
  };

  // Actions
  const handleToggleFavorite = async (id: string, current: boolean) => {
    try {
      await togglePostFavorite(id, !current);
      setPosts(prev => prev.map(p => p.id === id ? { ...p, isFavorite: !current } : p));
      triggerNotification('success', current ? 'Post removed from starred.' : 'Post starred.');
    } catch {
      triggerNotification('error', 'Failed to toggle favorite.');
    }
  };

  // Archive/Delete Confirmation Modal State
  const [confirmDeletePost, setConfirmDeletePost] = useState<ReviewPostData | null>(null);

  const promptArchivePost = (post: ReviewPostData) => {
    setConfirmDeletePost(post);
  };

  const handleConfirmArchive = async () => {
    if (!confirmDeletePost) return;
    const targetPost = confirmDeletePost;
    setConfirmDeletePost(null);
    await handleArchivePost(targetPost.id);
  };

  const handleArchivePost = async (id: string) => {
    try {
      await archivePost(id);
      const updatedList = posts.filter(p => p.id !== id);
      setPosts(updatedList);
      triggerNotification('success', 'Post archived / deleted from Review Queue.');
      selectNextPost(id, updatedList);
    } catch {
      triggerNotification('error', 'Failed to archive post.');
    }
  };

  const handleAnalyzePost = async (id: string, force = false) => {
    setAnalysisLoading(true);
    try {
      const analysis = await submitPostAnalysis(id, force);

      // Update local state list
      setPosts(prev => prev.map(p => {
        if (p.id === id) {
          return {
            ...p,
            opportunityScore: analysis.opportunityScore,
            analysis: {
              id: analysis.id,
              summary: analysis.summary,
              buyingSignals: analysis.buyingSignals,
              opportunityScore: analysis.opportunityScore,
              suggestedOutreachAngle: analysis.suggestedOutreachAngle,
              valueReason: analysis.valueReason,
              promptTokens: analysis.promptTokens,
              completionTokens: analysis.completionTokens,
            }
          };
        }
        return p;
      }));

      triggerNotification('success', `Analysis complete. Score: ${analysis.opportunityScore}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI Analysis failed.';
      triggerNotification('error', message);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleGenerateOutreach = async (id: string) => {
    if (!selectedPlaybookId || !selectedStepId) {
      triggerNotification('error', 'Please select a Playbook and a Step.');
      return;
    }
    setOutreachLoading(true);
    try {
      const draft = await createOutreachDraft(id, selectedPlaybookId, selectedStepId, userInstructions, useApolloDataInAi);

      // Update local state list with the new draft
      setPosts(prev => prev.map(p => {
        if (p.id === id) {
          return {
            ...p,
            drafts: [
              {
                id: draft.id,
                playbookId: draft.playbookId,
                stepId: draft.stepId,
                originalAiDraft: draft.originalAiDraft,
                editedDraft: draft.editedDraft,
                status: draft.status,
                generatedAt: draft.generatedAt,
                approvedAt: draft.approvedAt,
                sentAt: draft.sentAt,
              },
              ...p.drafts
            ]
          };
        }
        return p;
      }));

      setDraftText(draft.originalAiDraft);
      setUserInstructions('');
      triggerNotification('success', 'AI outreach draft generated.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Draft generation failed.';
      triggerNotification('error', message);
    } finally {
      setOutreachLoading(false);
    }
  };

  const handleRegenerateOutreach = async (draftId: string, id: string) => {
    setOutreachLoading(true);
    try {
      const draft = await regenerateOutreachDraft(draftId, userInstructions);

      // Update local state
      setPosts(prev => prev.map(p => {
        if (p.id === id) {
          return {
            ...p,
            drafts: p.drafts.map(d => d.id === draftId ? {
              ...d,
              originalAiDraft: draft.originalAiDraft,
              editedDraft: null,
              generatedAt: draft.generatedAt,
            } : d)
          };
        }
        return p;
      }));

      setDraftText(draft.originalAiDraft);
      setUserInstructions('');
      triggerNotification('success', 'AI outreach draft regenerated.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Regeneration failed.';
      triggerNotification('error', message);
    } finally {
      setOutreachLoading(false);
    }
  };

  const handleSaveDraftChanges = async (draftId: string, id: string) => {
    setSaveChangesLoading(true);
    try {
      await saveOutreachDraftChanges(draftId, draftText);

      // Update state
      setPosts(prev => prev.map(p => {
        if (p.id === id) {
          return {
            ...p,
            drafts: p.drafts.map(d => d.id === draftId ? { ...d, editedDraft: draftText } : d)
          };
        }
        return p;
      }));

      triggerNotification('success', 'Draft edits saved.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Saving changes failed.';
      triggerNotification('error', message);
    } finally {
      setSaveChangesLoading(false);
    }
  };

  const handleApproveDraft = async (draftId: string, postId: string) => {
    if (!draftText.trim()) {
      triggerNotification('error', 'Outreach message cannot be empty.');
      return;
    }
    setApprovalLoading(true);
    try {
      await approveOutreachDraft(draftId, draftText);
      const updatedList = posts.filter(p => p.id !== postId);
      setPosts(updatedList);
      triggerNotification('success', 'Outreach draft approved! Post moved to approved list.');
      selectNextPost(postId, updatedList);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Approval failed.';
      triggerNotification('error', message);
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleMarkAsSent = async (draftId: string, id: string) => {
    setMarkSentLoading(true);
    try {
      await markOutreachDraftAsSent(draftId);

      // Update local state
      setPosts(prev => prev.map(p => {
        if (p.id === id) {
          return {
            ...p,
            drafts: p.drafts.map(d => d.id === draftId ? { ...d, status: DraftStatus.SENT, sentAt: new Date() } : d)
          };
        }
        return p;
      }));

      triggerNotification('success', 'Outreach draft marked as sent.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update sent state.';
      triggerNotification('error', message);
    } finally {
      setMarkSentLoading(false);
    }
  };

  // Keyboard Navigation hooks
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keys when user is typing in inputs or editor
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.getAttribute('contenteditable') === 'true')) {
        return;
      }

      if (posts.length === 0) return;

      const currentIndex = posts.findIndex(p => p.id === selectedPostId);

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex < posts.length - 1) {
            handleSelectPost(posts[currentIndex + 1].id);
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0) {
            handleSelectPost(posts[currentIndex - 1].id);
          }
          break;
        case 'a':
        case 'A':
          if (selectedPostId && activePost && !activePost.analysis && !analysisLoading) {
            handleAnalyzePost(selectedPostId);
          }
          break;
        case 'g':
        case 'G':
          if (selectedPostId && activePost && activePost.drafts.length === 0 && !outreachLoading) {
            handleGenerateOutreach(selectedPostId);
          }
          break;
        case 's':
        case 'S':
          if (selectedPostId) {
            handleArchivePost(selectedPostId);
          }
          break;
        case 'f':
        case 'F':
          if (selectedPostId && activePost) {
            handleToggleFavorite(selectedPostId, activePost.isFavorite);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, selectedPostId, activePost, analysisLoading, outreachLoading]);

  // Categories list
  const categoriesList = Array.from(new Set(posts.map(p => p.keywordCategory).filter(Boolean))) as string[];

  // Filters computation
  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.postPreview.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.matchedKeyword.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === '' || post.keywordCategory === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Sorting
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime();
    }
    if (sortBy === 'score') {
      const scoreA = a.opportunityScore || 0;
      const scoreB = b.opportunityScore || 0;
      return scoreB - scoreA;
    }
    if (sortBy === 'engagements') {
      return b.engagementCount - a.engagementCount;
    }
    return 0;
  });

  return (
    <div className="dashboard-page" style={{
      display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden',
      backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.6), rgba(248, 250, 252, 0.6)), url(${blob.src})`,
      backgroundSize: 'cover', backgroundPosition: 'top right', backgroundRepeat: 'no-repeat', backgroundAttachment: 'fixed'
    }}>
      {/* Toast Notification */}
      {notification && (
        <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 999999, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: `1.5px solid ${notification.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'}`, padding: '14px 22px', borderRadius: '12px', boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', fontWeight: 800 }}>
          {notification.type === 'success' ? <CheckCircle size={18} style={{ color: '#34d399' }} /> : <AlertCircle size={18} style={{ color: '#fca5a5' }} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* FIXED TOP HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[var(--border-subtle)] h-[65px] shrink-0 px-7 bg-[var(--bg-primary)]">
        <div className="flex items-center gap-3.5">
          <div className="bg-gradient-to-br from-indigo-500 to-blue-500 p-2.5 rounded-lg shadow-[0_4px_16px_rgba(99,102,241,0.3)]">
            <CheckCircle size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-[1.35rem] font-extrabold bg-gradient-to-br from-slate-900 to-blue-500 bg-clip-text text-transparent m-0">
              AI Outreach Approval & Review Queue
            </h2>
            <p className="text-[0.82rem] text-[#8ba0cb] font-semibold tracking-wide mt-1 m-0">
              Review, edit, and dispatch AI-generated personalized outreach drafts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-[0.76rem] bg-[#ecfdf5] text-[#047857] border border-emerald-500/30 px-2.5 py-1 rounded-full font-extrabold inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {posts.length} Pending Reviews
          </div>
        </div>
      </div>

      {/* FULL HEIGHT MAIN CONTENT WITH OVERALL SCROLLBAR */}
      <div className="dashboard-scrollable-content flex-1 overflow-y-auto flex flex-col relative">
        <WorkflowGuide activeStep={5} />

        <div className="px-7 py-5 flex flex-col gap-5 flex-1">

          {/* Database Warning */}
          {dbError && (
            <div className="db-warning-banner card-glass">
              <AlertCircle className="warning-icon" />
              <div className="warning-content">
                <h4>Database Connectivity Warning</h4>
                <p>{dbError}</p>
              </div>
              <button onClick={loadData} className="icon-btn">
                <RefreshCw className="refresh-icon" />
              </button>
              <style jsx>{`
            .db-warning-banner {
              display: flex;
              align-items: center;
              gap: 'var(--space-md)';
              border-color: rgba(239, 68, 68, 0.2);
              background: rgba(239, 68, 68, 0.05);
            }
            .warning-icon { color: 'var(--color-danger)'; width: 28px; height: 28px; }
            .warning-content h4 { color: 'var(--color-danger)'; margin-bottom: 2px; }
            .warning-content p { font-size: 0.85rem; color: 'var(--text-secondary)'; }
            .refresh-icon { width: 16px; height: 16px; }
          `}</style>
            </div>
          )}

          {/* Top Navigation & Breadcrumb */}
          <BreadcrumbHeader
            currentTitle="Review Queue & Outreach Approval"
            stepNumber={5}
            totalSteps={7}
            badge="Approve & Dispatch"
          />

          {/* Workspace panel split screen */}
          <div className="review-workspace">

            {/* Left Side: Post queue list */}
            <div className="queue-list-panel">
              <div className="flex flex-col gap-3">
                {/* Ultra Premium Search */}
                <div className="search-container-premium border-0 ring-0 outline-none border-transparent bg-transparent">
                  <Search size={20} className="search-icon text-indigo-500" />
                  <input
                    type="text"
                    placeholder="Search review queue..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input-ultra border-0 outline-none ring-0 focus:ring-0 focus:border-0 focus:outline-none shadow-none focus:shadow-none bg-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 w-full">
                  <SmoothDropdown
                    value={categoryFilter}
                    onChange={setCategoryFilter}
                    placeholder="All Categories"
                    options={categoriesList.map(cat => ({ label: cat.toUpperCase(), value: cat }))}
                  />

                  <SmoothDropdown
                    value={sortBy}
                    onChange={setSortBy}
                    placeholder="Sort By..."
                    options={[
                      { label: 'Discovered (Newest)', value: 'newest' },
                      { label: 'Opportunity Score', value: 'score' },
                      { label: 'Engagements', value: 'engagements' },
                    ]}
                  />
                </div>
              </div>

              {/* List items */}
              <div className="queue-items-scroll">
                {pageLoading ? (
                  <div className="empty-state card-glass">
                    <RefreshCw className="empty-icon animate-spin" />
                    <p>Loading queue...</p>
                  </div>
                ) : sortedPosts.length === 0 ? (
                  <div className="empty-state card-glass px-3.5 py-5 flex flex-col items-center gap-2.5 text-center">
                    <Zap size={28} className="text-indigo-500" />
                    <h4 className="m-0 text-[0.92rem] font-extrabold">No items in queue</h4>
                    <p className="text-[0.76rem] text-slate-500 m-0">Approved outreach leads will appear here.</p>
                    <a
                      href="/engagement"
                      className="px-3.5 py-2 rounded-lg bg-gradient-to-br from-indigo-500 to-emerald-500 text-white text-[0.76rem] font-extrabold no-underline mt-1 flex items-center gap-1.5"
                    >
                      <Zap size={14} /> Open AI Generator
                    </a>
                  </div>
                ) : (
                  sortedPosts.map((post) => {
                    const isActive = post.id === selectedPostId;
                    const score = post.opportunityScore;

                    let scoreClass = 'low-score';
                    if (score !== null) {
                      if (score >= 85) scoreClass = 'high-score';
                      else if (score >= 70) scoreClass = 'mid-score';
                    }

                    return (
                      <div
                        key={post.id}
                        onClick={() => handleSelectPost(post.id)}
                        className={`queue-card-item card-glass ${isActive ? 'active-item' : ''}`}
                      >
                        <div className="item-header">
                          <div className="item-title-meta">
                            <span className="item-author">{post.apolloEnrichment ? post.apolloEnrichment.personName : post.authorName}</span>
                            <span className="item-keyword">Query: {post.matchedKeyword}</span>
                          </div>

                          {score !== null ? (
                            <span className={`item-score-badge ${scoreClass}`}>
                              Score: {score}
                            </span>
                          ) : (
                            <span className="item-score-badge bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                              Unrated
                            </span>
                          )}
                        </div>

                        <p className="item-preview">{post.postPreview}</p>

                        <div className="item-footer">
                          <span>{post.engagementCount} Engagements</span>
                          <span>{new Date(post.discoveredAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Side: Active Workspace details */}
            <div className="workspace-detail-panel">
              {activePost ? (
                <div className="post-detailed-card">

                  {/* Premium Detailed Header */}
                  <div className="flex justify-between items-center p-6 bg-gradient-to-br from-white/90 to-slate-50/80 backdrop-blur-xl border-b border-slate-200/80 rounded-t-2xl flex-wrap gap-4 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]">
                    <div className="flex items-center gap-4.5">
                      {/* Rich Avatar */}
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_8px_24px_rgba(79,70,229,0.35),inset_0_2px_4px_rgba(255,255,255,0.3)] border-2 border-white/80 -translate-y-0.5 transition-transform duration-300">
                        <User size={26} color="#ffffff" strokeWidth={2.5} />
                      </div>

                      <div className="flex flex-col gap-1 ml-4">
                        <h2 className="text-[1.4rem] font-extrabold m-0 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent tracking-tight">
                          {activePost.apolloEnrichment ? activePost.apolloEnrichment.personName : activePost.authorName}
                        </h2>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[0.85rem] font-semibold text-slate-600 flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                            <Briefcase size={14} className="text-indigo-500" />
                            {activePost.apolloEnrichment?.jobTitle || activePost.authorHeadline || 'LinkedIn Member'}
                          </span>

                          {(activePost.apolloEnrichment?.organizationName || activePost.companyName) && (
                            <span className="text-[0.85rem] font-semibold text-slate-600 flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                              <Building2 size={14} className="text-emerald-500" />
                              {activePost.apolloEnrichment?.organizationName || activePost.companyName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                      <button
                        onClick={() => handleToggleFavorite(activePost.id, activePost.isFavorite)}
                        className={`w-[38px] h-[38px] rounded-xl flex items-center justify-center transition-all duration-200 shadow-sm ${activePost.isFavorite
                            ? 'bg-amber-100 border border-amber-200 text-amber-500'
                            : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                          }`}
                        title="Star post"
                      >
                        <Star size={18} fill={activePost.isFavorite ? '#f59e0b' : 'none'} />
                      </button>

                      <button
                        type="button"
                        onClick={() => promptArchivePost(activePost)}
                        className="px-3.5 py-2 rounded-xl text-[0.82rem] font-semibold flex items-center gap-1.5 bg-white border border-slate-200 text-red-500 hover:bg-red-50 hover:border-red-200 transition-all duration-200 shadow-sm group"
                        title="Dismiss/Archive post"
                      >
                        <Archive size={16} className="group-hover:text-red-600" /> Delete / Archive
                      </button>

                      <button
                        onClick={handleOpenApolloModal}
                        disabled={apolloLoading}
                        className={`px-4 py-2 rounded-xl text-[0.82rem] font-bold flex items-center gap-2 bg-gradient-to-br from-sky-500 to-blue-500 text-white transition-all duration-200 shadow-[0_4px_12px_rgba(14,165,233,0.3)] hover:-translate-y-[1px] ${apolloLoading ? 'opacity-70 cursor-wait' : 'cursor-pointer'
                          }`}
                        title="Enrich with Apollo"
                      >
                        <ShieldCheck size={16} /> Enrich with Apollo
                      </button>

                      <a
                        href={activePost.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-xl text-[0.82rem] font-bold flex items-center gap-2 bg-gradient-to-br from-[#0077b5] to-blue-700 text-white! no-underline transition-all duration-300 shadow-[0_4px_12px_rgba(0,119,181,0.3)] hover:-translate-y-[1px] hover:shadow-[0_6px_16px_rgba(0,119,181,0.4)]"
                      >
                        <ExternalLink size={16} /> View LinkedIn
                      </a>
                    </div>
                  </div>

                  {/* Detailed Post content preview */}
                  <div className="detail-body-text card-glass" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                    {activePost.postPreview}
                  </div>

                  {/* Workspace sub-modules */}
                  <div className="workspace-modules">

                    {/* Module 1: AI Post Analysis */}
                    <div className="module-card card-glass">
                      <div className="module-header">
                        <h4 className="module-title">
                          <Zap size={16} className="text-indigo-500" /> AI Analysis
                        </h4>
                        {activePost.analysis ? (
                          <button
                            onClick={() => handleAnalyzePost(activePost.id, true)}
                            disabled={analysisLoading}
                            className="btn-secondary px-2.5 py-1 text-[0.75rem] flex items-center gap-1"
                            title="Re-run analysis with live AI provider"
                          >
                            <RefreshCw size={12} className={analysisLoading ? 'animate-spin' : ''} /> Re-analyze
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAnalyzePost(activePost.id)}
                            disabled={analysisLoading}
                            className="btn-primary px-2.5 py-1 text-[0.75rem] flex items-center gap-1"
                          >
                            <Zap size={12} className={analysisLoading ? 'animate-spin' : ''} /> Run Analysis
                          </button>
                        )}
                      </div>

                      <div className="module-content">
                        {activePost.analysis ? (
                          <div className="flex flex-col gap-[var(--space-md)]">
                            <div className="analysis-field flex flex-row justify-between items-center">
                              <span className="label">Opportunity Rating</span>
                              <span
                                className={`badge text-[0.85rem] font-bold ${activePost.analysis.opportunityScore >= 85 ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]'}`}
                              >
                                {activePost.analysis.opportunityScore} / 100
                              </span>
                            </div>

                            <div className="analysis-field">
                              <span className="label">Buying Signals</span>
                              <div className="signals-list">
                                {activePost.analysis.buyingSignals.map(sig => (
                                  <span key={sig} className="signal-tag">{sig}</span>
                                ))}
                              </div>
                            </div>

                            <div className="analysis-field">
                              <span className="label">Summary Insights</span>
                              <p>{activePost.analysis.summary}</p>
                            </div>

                            <div className="analysis-field">
                              <span className="label">Value Proposition / Context</span>
                              <p>{activePost.analysis.valueReason}</p>
                            </div>

                            <div className="analysis-field">
                              <span className="label">Suggested Angle</span>
                              <p className="text-[var(--accent-cyan)]">{activePost.analysis.suggestedOutreachAngle}</p>
                            </div>

                            {(activePost.analysis.promptTokens !== null || activePost.analysis.completionTokens !== null) && (
                              <div className="border-t border-[var(--border-subtle)] pt-2 flex justify-between text-[0.7rem] text-slate-500">
                                <span>Prompt Tokens: {activePost.analysis.promptTokens ?? 0}</span>
                                <span>Completion Tokens: {activePost.analysis.completionTokens ?? 0}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-[180px] text-slate-500 gap-2">
                            <Zap size={24} className="stroke-[1.5]" />
                            <p className="text-[0.85rem]">No AI Analysis records. Click run to generate signals.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Module 1.5: Apollo Data Enrichment Panel */}
                    <div className="module-card card-glass border-l-[3px] border-l-teal-500">
                      <div className="module-header">
                        <h4 className="module-title">
                          <ShieldCheck size={16} className="text-teal-500" /> Apollo.io Data Enrichment Panel
                        </h4>
                        <button
                          onClick={handleOpenApolloModal}
                          disabled={apolloLoading}
                          className="btn-secondary px-2.5 py-1 text-[0.75rem] flex items-center gap-1"
                        >
                          <RefreshCw size={12} className={apolloLoading ? 'animate-spin' : ''} /> {apolloEnrichment ? 'Re-Enrich' : 'Enrich with Apollo'}
                        </button>
                      </div>

                      <div className="module-content">
                        {apolloEnrichment ? (
                          <div className="flex flex-col gap-2.5">
                            <div className="flex justify-between items-center">
                              <span className="badge badge-indigo text-[0.68rem] uppercase">
                                Status: {apolloEnrichment.enrichmentStatus}
                              </span>
                              <span className="text-[0.68rem] text-slate-500">
                                Credits used: {apolloEnrichment.creditsUsed}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5 text-[0.78rem]">
                              <div>
                                <span className="text-slate-500 block text-[0.68rem]">Contact & Title:</span>
                                <span className="font-semibold">{apolloEnrichment.personName}</span>
                                <span className="block text-slate-600 text-[0.72rem]">{apolloEnrichment.jobTitle || 'N/A'}</span>
                              </div>

                              <div>
                                <span className="text-slate-500 block text-[0.68rem]">Organization & Domain:</span>
                                <span className="font-semibold">{apolloEnrichment.organizationName || 'N/A'}</span>
                                <span className="block text-teal-600 text-[0.72rem]">{apolloEnrichment.organizationDomain || 'N/A'}</span>
                              </div>
                            </div>

                            {apolloEnrichment.workEmail && (
                              <div className="text-[0.75rem] text-slate-600">
                                Work Email: <span className="text-slate-900 font-semibold">{apolloEnrichment.workEmail}</span>
                              </div>
                            )}

                            {apolloEnrichment.personalEmail && (
                              <div className="text-[0.75rem] text-slate-600">
                                Personal Email: <span className="text-emerald-600 font-semibold">{apolloEnrichment.personalEmail}</span>
                              </div>
                            )}

                            {apolloEnrichment.phone && (
                              <div className="text-[0.75rem] text-slate-600">
                                Phone: <span className="text-amber-500 font-semibold">{apolloEnrichment.phone}</span>
                              </div>
                            )}

                            <div className="border-t border-[var(--border-subtle)] pt-2 mt-1">
                              <label className="text-[0.75rem] flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={useApolloDataInAi}
                                  onChange={(e) => setUseApolloDataInAi(e.target.checked)}
                                />
                                Use Apollo Enrichment Data for AI Outreach Generation
                              </label>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center p-2 bg-[var(--bg-secondary)] rounded">
                            <span className="text-[0.75rem] text-slate-500">Status: Not Enriched</span>
                            <button
                              onClick={handleOpenApolloModal}
                              className="btn-secondary px-2.5 py-1 text-[0.75rem]"
                            >
                              Enrich Person
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Module 2: Personalized Outreach Creator */}
                    <div className="module-card card-glass">
                      <div className="module-header">
                        <h4 className="module-title">
                          <BookOpen size={16} className="text-teal-500" /> Outreach Draft
                        </h4>
                        {activePost.drafts.length > 0 && (
                          <span className="badge badge-indigo text-[0.75rem] px-1.5 py-0.5 font-bold">
                            {activePost.drafts[0].status}
                          </span>
                        )}
                      </div>

                      <div className="module-content">
                        {outreachLoading ? (
                          <div className="loader-spinner-wrapper">
                            <div className="pulse-loader border-teal-500" />
                            <p className="text-[0.8rem]">Generating personalized message draft...</p>
                          </div>
                        ) : activePost.drafts.length === 0 ? (
                          /* Playbooks and steps selection form before generation */
                          <div className="flex flex-col gap-[var(--space-sm)]">
                            <div className="form-group">
                              <label className="text-[0.75rem]">Select Outreach Playbook</label>
                              <div className="min-w-[220px]">
                                <CustomDropdown
                                  value={selectedPlaybookId}
                                  onChange={(val) => {
                                    setSelectedPlaybookId(val);
                                    const pb = playbooks.find(p => p.id === val);
                                    if (pb && pb.steps.length > 0) {
                                      setSelectedStepId(pb.steps[0].id);
                                    }
                                  }}
                                  options={playbooks.map(pb => ({ value: pb.id, label: pb.name }))}
                                />
                              </div>
                            </div>

                            <div className="form-group">
                              <label className="text-[0.75rem]">Select Sequence Step</label>
                              <div className="min-w-[220px]">
                                <CustomDropdown
                                  value={selectedStepId}
                                  onChange={(val) => setSelectedStepId(val)}
                                  options={(() => {
                                    const steps = playbooks.find(p => p.id === selectedPlaybookId)?.steps.filter(s => s.enabled);
                                    if (!steps || steps.length === 0) return [{ value: '', label: 'No steps available' }];
                                    return steps.map(step => ({ value: step.id, label: `Step ${step.order}: ${step.stepName} (${step.delay}d delay)` }));
                                  })()}
                                />
                              </div>
                            </div>

                            <div className="form-group">
                              <label className="text-[0.75rem]">Custom AI Instructions (Optional)</label>
                              <textarea
                                value={userInstructions}
                                onChange={(e) => setUserInstructions(e.target.value)}
                                placeholder="e.g., Focus strictly on their API latency, keep it under 3 sentences."
                                className="step-textarea min-h-[60px] text-[0.8rem]"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleGenerateOutreach(activePost.id)}
                              disabled={!selectedPlaybookId || !selectedStepId || playbooks.length === 0}
                              className="btn-primary mt-[var(--space-sm)] w-full justify-center"
                            >
                              Generate AI Draft
                            </button>
                          </div>
                        ) : (
                          /* Editable draft composer panel */
                          <div className="flex flex-col gap-[var(--space-sm)] h-full">
                            <div className="analysis-field">
                              <div className="flex justify-between items-center mb-3">
                                <span className="label text-[0.85rem] font-bold text-[var(--text-primary)]">Draft Composer</span>
                                <span className="text-[0.72rem] text-slate-500">
                                  Campaign: {playbooks.find(p => p.id === activePost.drafts[0].playbookId)?.name || 'Custom'}
                                </span>
                              </div>
                              <textarea
                                value={draftText}
                                onChange={(e) => setDraftText(e.target.value)}
                                className="draft-editor-ultra"
                                placeholder="Your personalized outreach message..."
                              />
                            </div>

                            {/* Accordion original AI Draft */}
                            <div className="border border-[var(--glass-border)] rounded-[var(--radius-sm)] px-2.5 py-1.5 bg-black/10">
                              <button
                                type="button"
                                onClick={() => setIsOriginalCollapsed(!isOriginalCollapsed)}
                                className="btn-secondary w-full bg-transparent border-none p-0 justify-between text-[0.75rem] text-[var(--text-secondary)] hover:bg-transparent focus:ring-0"
                              >
                                <span>Original AI Draft Reference</span>
                                <span>{isOriginalCollapsed ? 'Show' : 'Hide'}</span>
                              </button>

                              {!isOriginalCollapsed && (
                                <div className="mt-1.5 flex flex-col gap-1.5">
                                  <p className="text-[0.78rem] text-slate-500 whitespace-pre-wrap border-l-2 border-[var(--glass-border)] pl-2">
                                    {activePost.drafts[0].originalAiDraft}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDraftText(activePost.drafts[0].originalAiDraft);
                                      triggerNotification('success', 'Original draft restored.');
                                    }}
                                    className="btn-secondary px-2 py-0.5 text-[0.7rem] w-fit"
                                  >
                                    Restore Original
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Optional custom instructions override for regeneration */}
                            <div className="form-group" style={{ marginTop: '4px' }}>
                              <input
                                type="text"
                                placeholder="Add regeneration notes (e.g. make it shorter)..."
                                value={userInstructions}
                                onChange={(e) => setUserInstructions(e.target.value)}
                                className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-[var(--text-primary)] text-[0.82rem] outline-none transition-all duration-200 w-full box-border placeholder:text-slate-400 focus:border-[var(--accent-indigo)] focus:shadow-[0_0_0_3px_rgba(0,208,156,0.15)] focus:bg-white"
                                style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                              />
                            </div>

                            {/* Composer actions */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: 'var(--space-xs)' }}>
                              <button
                                type="button"
                                onClick={() => handleSaveDraftChanges(activePost.drafts[0].id, activePost.id)}
                                disabled={saveChangesLoading}
                                className="btn-secondary justify-center text-[0.8rem] p-2"
                              >
                                {saveChangesLoading ? 'Saving...' : 'Save Edits'}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRegenerateOutreach(activePost.drafts[0].id, activePost.id)}
                                disabled={outreachLoading}
                                className="btn-secondary justify-center text-[0.8rem] p-2"
                              >
                                Regenerate
                              </button>
                            </div>

                            <div className="flex gap-2 mt-1">
                              {activePost.drafts[0].status === DraftStatus.DRAFT && (
                                <button
                                  type="button"
                                  onClick={() => handleApproveDraft(activePost.drafts[0].id, activePost.id)}
                                  disabled={approvalLoading}
                                  className="btn-primary flex-1 justify-center text-[0.8rem] p-2.5"
                                >
                                  Approve Draft
                                </button>
                              )}

                              {activePost.drafts[0].status === DraftStatus.APPROVED && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkAsSent(activePost.drafts[0].id, activePost.id)}
                                  disabled={markSentLoading}
                                  className="btn-primary flex-1 justify-center text-[0.8rem] p-2.5 bg-indigo-500 border-indigo-500"
                                >
                                  {markSentLoading ? 'Updating...' : 'Mark as Manually Sent'}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                </div>
              ) : (
                <div className="py-10 px-6 flex flex-col items-center gap-5 text-center bg-[var(--bg-card)] border border-dashed border-[var(--border-focus)] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                  <div className="w-16 h-16 rounded-full bg-[var(--accent-indigo-glow)] flex items-center justify-center text-indigo-500">
                    <Zap size={32} />
                  </div>
                  <div>
                    <h3 className="text-[1.25rem] font-black text-[var(--text-primary)] m-0">No Outreach Messages in Review Queue</h3>
                    <p className="text-[0.84rem] text-[var(--text-muted)] max-w-[480px] mx-auto mt-2 leading-relaxed">
                      Open the <strong>AI Sales Engagement Workspace</strong> or <strong>Lead Discovery</strong>, select a qualified lead, and click <strong>&quot;Approve & Schedule Outreach&quot;</strong> to automatically import your real lead campaigns here.
                    </p>
                  </div>

                  <div className="flex gap-3 flex-wrap justify-center mt-1">
                    <a
                      href="/engagement"
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 text-white font-extrabold text-[0.85rem] border-none no-underline flex items-center gap-2 shadow-[0_4px_14px_rgba(0,208,156,0.3)]"
                    >
                      <Zap size={16} /> Open AI Outreach Generator (/engagement)
                    </a>

                    <a
                      href="/discovery"
                      className="px-5 py-2.5 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] font-bold text-[0.85rem] border border-[var(--border-subtle)] no-underline flex items-center gap-2"
                    >
                      <Search size={16} /> Lead Discovery (/discovery)
                    </a>
                  </div>
                </div>
              )}

              {/* Key shortcut guidelines panel at bottom */}
              <div className="hotkeys-footer">
                <span>Navigate: <kbd className="hotkey-badge">↑</kbd> <kbd className="hotkey-badge">↓</kbd></span>
                <span>Analyze: <kbd className="hotkey-badge">A</kbd></span>
                <span>Outreach: <kbd className="hotkey-badge">G</kbd></span>
                <span>Star: <kbd className="hotkey-badge">F</kbd></span>
                <span>Skip/Archive: <kbd className="hotkey-badge">S</kbd></span>
              </div>
            </div>

            {/* Apollo Confirmation Modal */}
            {showApolloModal && (
              <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-5">
                <div className="card-glass w-full max-w-[480px] p-6 flex flex-col gap-4">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck size={20} className="text-teal-500" />
                    <h3 className="text-[1rem] font-bold m-0">Enrich with Apollo.io</h3>
                  </div>

                  <p className="text-[0.78rem] text-slate-500 leading-snug m-0">
                    Enrichment may consume Apollo credits depending on requested data. Confirm your target options below:
                  </p>

                  {creditWarning && creditWarning.isWarning && (
                    <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded text-[0.72rem] text-red-500 flex items-center gap-1.5">
                      <AlertCircle size={14} /> Credit Warning: Remaining Apollo credits ({creditWarning.remainingCredits}) are below threshold.
                    </div>
                  )}

                  <div className="flex flex-col gap-2 text-[0.78rem]">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={apolloOptWorkEmail}
                        onChange={(e) => setApolloOptWorkEmail(e.target.checked)}
                      />
                      Work Email & Basic Business Info (Default: 1 Credit)
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={apolloOptPersonalEmail}
                        onChange={(e) => setApolloOptPersonalEmail(e.target.checked)}
                      />
                      Personal Email (Requires explicit permission setting)
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={apolloOptPhone}
                        onChange={(e) => setApolloOptPhone(e.target.checked)}
                      />
                      Phone Number (Requires explicit permission setting)
                    </label>
                  </div>

                  <div className="flex gap-2.5 mt-2">
                    <button
                      onClick={() => setShowApolloModal(false)}
                      className="btn-secondary flex-1 justify-center"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmEnrichment}
                      className="btn-primary flex-1 justify-center bg-teal-500 border-teal-500 text-white"
                    >
                      Confirm & Enrich
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* CONFIRMATION PROMPT MODAL POPUP */}
            {confirmDeletePost && (
              <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                <div className="bg-white border border-slate-300 rounded-2xl max-w-[440px] w-full p-6 shadow-[0_20px_40px_rgba(0,0,0,0.2)] text-center">
                  <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                    <Archive size={24} />
                  </div>
                  <h3 className="text-[1.15rem] font-extrabold text-slate-900 m-0">
                    Confirm Delete / Archive
                  </h3>
                  <p className="text-[0.86rem] text-slate-500 mt-2 leading-relaxed m-0">
                    Do you really wish to delete / archive <strong>"{confirmDeletePost.authorName}"</strong> from the Review Queue?
                  </p>
                  <div className="flex gap-2.5 mt-5 justify-center">
                    <button
                      type="button"
                      onClick={() => setConfirmDeletePost(null)}
                      className="px-4 py-2 rounded-lg text-[0.82rem] font-bold bg-slate-100 border border-slate-300 text-slate-600 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmArchive}
                      className="px-5 py-2 rounded-lg text-[0.82rem] font-extrabold bg-red-600 text-white border-none cursor-pointer shadow-[0_4px_12px_rgba(220,38,38,0.3)]"
                    >
                      Yes, Delete / Archive
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
