'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  CheckCircle,
  AlertCircle,
  Star,
  ExternalLink,
  RefreshCw,
  Search,
  BookOpen,
  Zap,
  Archive,
  User,
  ShieldCheck
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
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => setIsOpen(prev => !prev)}
        className="premium-select"
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span>{selectedLabel}</span>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: 0,
          right: 0,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
          zIndex: 1000,
          maxHeight: isOpen ? '250px' : '0px',
          opacity: isOpen ? 1 : 0,
          overflow: 'hidden',
          transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: isOpen ? 'auto' : 'none',
          transform: isOpen ? 'translateY(0)' : 'translateY(-10px)'
        }}
      >
        <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', maxHeight: '234px' }}>
          <div
            onClick={() => { onChange(''); setIsOpen(false); }}
            className="dropdown-item-smooth"
            style={{ fontWeight: value === '' ? 800 : 500, color: value === '' ? 'var(--accent-indigo)' : 'inherit' }}
          >
            {placeholder}
          </div>
          {options.map(opt => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className="dropdown-item-smooth"
              style={{ fontWeight: value === opt.value ? 800 : 500, color: value === opt.value ? 'var(--accent-indigo)' : 'inherit' }}
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
        <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 999999, background: notification.type === 'success' ? '#064e3b' : '#7f1d1d', color: '#ffffff', border: `1.5px solid ${notification.type === 'success' ? '#10b981' : '#ef4444'}`, padding: '14px 22px', borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', fontWeight: 800 }}>
          {notification.type === 'success' ? <CheckCircle size={18} style={{ color: '#34d399' }} /> : <AlertCircle size={18} style={{ color: '#fca5a5' }} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* FIXED TOP HEADER */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
        borderBottom: '1px solid var(--border-subtle)', height: '65px', flexShrink: 0, padding: '0 28px', background: 'var(--bg-primary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)', padding: '10px', borderRadius: '8px', boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)' }}>
            <CheckCircle size={18} style={{ color: '#ffffff' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, background: 'linear-gradient(135deg, #0f172a, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
              AI Outreach Approval & Review Queue
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#8ba0cb', fontWeight: 600, letterSpacing: '0.03em', marginTop: '4px', margin: 0 }}>
              Review, edit, and dispatch AI-generated personalized outreach drafts
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '0.76rem', background: 'var(--color-success-bg, #ecfdf5)', color: 'var(--color-success, #047857)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 10px', borderRadius: '20px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-success, #10b981)' }} /> {posts.length} Pending Reviews
          </div>
        </div>
      </div>
      
      <WorkflowGuide activeStep={5} />

      {/* FULL HEIGHT MAIN CONTENT WITH OVERALL SCROLLBAR */}
      <div
        className="dashboard-scrollable-content"
        style={{
          flex: 1, overflowY: 'auto', padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative'
        }}
      >

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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Ultra Premium Search */}
              <div className="search-container-premium border-0 ring-0 outline-none" style={{ border: '0px solid transparent', outline: 'none' }}>
                <Search size={20} className="search-icon" style={{ color: 'var(--accent-indigo)' }} />
                <input
                  type="text"
                  placeholder="Search review queue..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input-ultra border-0 outline-none ring-0 focus:ring-0 focus:border-0 focus:outline-none shadow-none focus:shadow-none"
                  style={{ border: '0px solid transparent', outline: 'none', boxShadow: 'none', background: 'transparent' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%' }}>
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
                <div className="empty-state card-glass" style={{ padding: '20px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', textAlign: 'center' }}>
                  <Zap size={28} style={{ color: 'var(--accent-indigo)' }} />
                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800 }}>No items in queue</h4>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0 }}>Approved outreach leads will appear here.</p>
                  <a
                    href="/engagement"
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, var(--accent-indigo), #00b386)',
                      color: '#ffffff',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      textDecoration: 'none',
                      marginTop: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
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
                          <span className="item-score-badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
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

                {/* Detailed Header */}
                <div className="detail-header">
                  <div className="detail-author-box">
                    <div className="author-pic-placeholder" style={{ width: '48px', height: '48px' }}>
                      <User className="author-icon" style={{ width: '22px', height: '22px' }} />
                    </div>
                    <div className="author-details">
                      <span className="author-name" style={{ fontSize: '1.1rem' }}>{activePost.apolloEnrichment ? activePost.apolloEnrichment.personName : activePost.authorName}</span>
                      <span className="detail-headline">
                        {activePost.apolloEnrichment?.jobTitle || activePost.authorHeadline || 'LinkedIn Member'}
                        {activePost.apolloEnrichment?.organizationName ? ` • ${activePost.apolloEnrichment.organizationName}` : activePost.companyName ? ` • ${activePost.companyName}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="detail-actions">
                    <button
                      onClick={() => handleToggleFavorite(activePost.id, activePost.isFavorite)}
                      className={`btn-action-glass ${activePost.isFavorite ? 'active' : ''}`}
                      title="Star post"
                    >
                      <Star size={16} fill={activePost.isFavorite ? '#fbbf24' : 'none'} color={activePost.isFavorite ? '#fbbf24' : 'currentColor'} />
                    </button>
                    <button
                      type="button"
                      onClick={() => promptArchivePost(activePost)}
                      className="btn-action-glass danger"
                      title="Dismiss/Archive post"
                    >
                      <Archive size={16} /> Delete / Archive
                    </button>
                    <button
                      onClick={handleOpenApolloModal}
                      disabled={apolloLoading}
                      className="btn-action-glass"
                      title="Enrich with Apollo"
                    >
                      <ShieldCheck size={16} /> Enrich with Apollo
                    </button>
                    <a
                      href={activePost.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                      style={{ padding: '10px 14px', gap: '6px' }}
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
                        <Zap size={16} style={{ color: 'var(--accent-indigo)' }} /> AI Analysis
                      </h4>
                      {activePost.analysis ? (
                        <button
                          onClick={() => handleAnalyzePost(activePost.id, true)}
                          disabled={analysisLoading}
                          className="btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          title="Re-run analysis with live AI provider"
                        >
                          <RefreshCw size={12} className={analysisLoading ? 'animate-spin' : ''} /> Re-analyze
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAnalyzePost(activePost.id)}
                          disabled={analysisLoading}
                          className="btn-primary"
                          style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Zap size={12} className={analysisLoading ? 'animate-spin' : ''} /> Run Analysis
                        </button>
                      )}
                    </div>

                    <div className="module-content">
                      {activePost.analysis ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                          <div className="analysis-field" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="label">Opportunity Rating</span>
                            <span
                              className="badge"
                              style={{
                                background: activePost.analysis.opportunityScore >= 85 ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                                color: activePost.analysis.opportunityScore >= 85 ? 'var(--color-success)' : 'var(--color-warning)',
                                fontSize: '0.85rem',
                                fontWeight: 'bold'
                              }}
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
                            <p style={{ color: 'var(--accent-cyan)' }}>{activePost.analysis.suggestedOutreachAngle}</p>
                          </div>

                          {(activePost.analysis.promptTokens !== null || activePost.analysis.completionTokens !== null) && (
                            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              <span>Prompt Tokens: {activePost.analysis.promptTokens ?? 0}</span>
                              <span>Completion Tokens: {activePost.analysis.completionTokens ?? 0}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '180px', color: 'var(--text-muted)', gap: '8px' }}>
                          <Zap size={24} style={{ strokeWidth: 1.5 }} />
                          <p style={{ fontSize: '0.85rem' }}>No AI Analysis records. Click run to generate signals.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Module 1.5: Apollo Data Enrichment Panel */}
                  <div className="module-card card-glass" style={{ borderLeft: '3px solid var(--accent-cyan)' }}>
                    <div className="module-header">
                      <h4 className="module-title">
                        <ShieldCheck size={16} style={{ color: 'var(--accent-cyan)' }} /> Apollo.io Data Enrichment Panel
                      </h4>
                      <button
                        onClick={handleOpenApolloModal}
                        disabled={apolloLoading}
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <RefreshCw size={12} className={apolloLoading ? 'animate-spin' : ''} /> {apolloEnrichment ? 'Re-Enrich' : 'Enrich with Apollo'}
                      </button>
                    </div>

                    <div className="module-content">
                      {apolloEnrichment ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="badge badge-indigo" style={{ fontSize: '0.68rem', textTransform: 'uppercase' }}>
                              Status: {apolloEnrichment.enrichmentStatus}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              Credits used: {apolloEnrichment.creditsUsed}
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.78rem' }}>
                            <div>
                              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.68rem' }}>Contact & Title:</span>
                              <span style={{ fontWeight: 600 }}>{apolloEnrichment.personName}</span>
                              <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.72rem' }}>{apolloEnrichment.jobTitle || 'N/A'}</span>
                            </div>

                            <div>
                              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.68rem' }}>Organization & Domain:</span>
                              <span style={{ fontWeight: 600 }}>{apolloEnrichment.organizationName || 'N/A'}</span>
                              <span style={{ display: 'block', color: 'var(--accent-cyan)', fontSize: '0.72rem' }}>{apolloEnrichment.organizationDomain || 'N/A'}</span>
                            </div>
                          </div>

                          {apolloEnrichment.workEmail && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Work Email: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{apolloEnrichment.workEmail}</span>
                            </div>
                          )}

                          {apolloEnrichment.personalEmail && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Personal Email: <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{apolloEnrichment.personalEmail}</span>
                            </div>
                          )}

                          {apolloEnrichment.phone && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Phone: <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>{apolloEnrichment.phone}</span>
                            </div>
                          )}

                          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', marginTop: '4px' }}>
                            <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'var(--bg-secondary)', borderRadius: '4px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status: Not Enriched</span>
                          <button
                            onClick={handleOpenApolloModal}
                            className="btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
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
                        <BookOpen size={16} style={{ color: 'var(--accent-cyan)' }} /> Outreach Draft
                      </h4>
                      {activePost.drafts.length > 0 && (
                        <span className="badge badge-indigo" style={{ fontSize: '0.75rem', padding: '2px 6px', fontWeight: 'bold' }}>
                          {activePost.drafts[0].status}
                        </span>
                      )}
                    </div>

                    <div className="module-content">
                      {outreachLoading ? (
                        <div className="loader-spinner-wrapper">
                          <div className="pulse-loader" style={{ borderColor: 'var(--accent-cyan)' }} />
                          <p style={{ fontSize: '0.8rem' }}>Generating personalized message draft...</p>
                        </div>
                      ) : activePost.drafts.length === 0 ? (
                        /* Playbooks and steps selection form before generation */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                          <div className="form-group">
                            <label style={{ fontSize: '0.75rem' }}>Select Outreach Playbook</label>
                            <select
                              value={selectedPlaybookId}
                              onChange={(e) => {
                                setSelectedPlaybookId(e.target.value);
                                const pb = playbooks.find(p => p.id === e.target.value);
                                if (pb && pb.steps.length > 0) {
                                  setSelectedStepId(pb.steps[0].id);
                                }
                              }}
                              className="premium-select"
                              style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                            >
                              {playbooks.map(pb => (
                                <option key={pb.id} value={pb.id}>{pb.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="form-group">
                            <label style={{ fontSize: '0.75rem' }}>Select Sequence Step</label>
                            <select
                              value={selectedStepId}
                              onChange={(e) => setSelectedStepId(e.target.value)}
                              className="premium-select"
                              style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                            >
                              {playbooks.find(p => p.id === selectedPlaybookId)?.steps.filter(s => s.enabled).map(step => (
                                <option key={step.id} value={step.id}>Step {step.order}: {step.stepName} ({step.delay}d delay)</option>
                              )) || <option value="">No steps available</option>}
                            </select>
                          </div>

                          <div className="form-group">
                            <label style={{ fontSize: '0.75rem' }}>Custom AI Instructions (Optional)</label>
                            <textarea
                              value={userInstructions}
                              onChange={(e) => setUserInstructions(e.target.value)}
                              placeholder="e.g., Focus strictly on their API latency, keep it under 3 sentences."
                              className="step-textarea"
                              style={{ minHeight: '60px', fontSize: '0.8rem' }}
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleGenerateOutreach(activePost.id)}
                            disabled={!selectedPlaybookId || !selectedStepId || playbooks.length === 0}
                            className="btn-primary"
                            style={{ marginTop: 'var(--space-sm)', width: '100%', justifyContent: 'center' }}
                          >
                            Generate AI Draft
                          </button>
                        </div>
                      ) : (
                        /* Editable draft composer panel */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', height: '100%' }}>
                          <div className="analysis-field">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <span className="label" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Draft Composer</span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
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
                          <div style={{ border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '6px 10px', background: 'rgba(0,0,0,0.1)' }}>
                            <button
                              type="button"
                              onClick={() => setIsOriginalCollapsed(!isOriginalCollapsed)}
                              className="btn-secondary"
                              style={{ width: '100%', background: 'transparent', border: 'none', padding: 0, justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}
                            >
                              <span>Original AI Draft Reference</span>
                              <span>{isOriginalCollapsed ? 'Show' : 'Hide'}</span>
                            </button>

                            {!isOriginalCollapsed && (
                              <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', borderLeft: '2px solid var(--glass-border)', paddingLeft: '8px' }}>
                                  {activePost.drafts[0].originalAiDraft}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDraftText(activePost.drafts[0].originalAiDraft);
                                    triggerNotification('success', 'Original draft restored.');
                                  }}
                                  className="btn-secondary"
                                  style={{ padding: '2px 8px', fontSize: '0.7rem', width: 'fit-content' }}
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
                              className="btn-secondary"
                              style={{ justifyContent: 'center', fontSize: '0.8rem', padding: '8px' }}
                            >
                              {saveChangesLoading ? 'Saving...' : 'Save Edits'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRegenerateOutreach(activePost.drafts[0].id, activePost.id)}
                              disabled={outreachLoading}
                              className="btn-secondary"
                              style={{ justifyContent: 'center', fontSize: '0.8rem', padding: '8px' }}
                            >
                              Regenerate
                            </button>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            {activePost.drafts[0].status === DraftStatus.DRAFT && (
                              <button
                                type="button"
                                onClick={() => handleApproveDraft(activePost.drafts[0].id, activePost.id)}
                                disabled={approvalLoading}
                                className="btn-primary"
                                style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', padding: '10px' }}
                              >
                                Approve Draft
                              </button>
                            )}

                            {activePost.drafts[0].status === DraftStatus.APPROVED && (
                              <button
                                type="button"
                                onClick={() => handleMarkAsSent(activePost.drafts[0].id, activePost.id)}
                                disabled={markSentLoading}
                                className="btn-primary"
                                style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', padding: '10px', background: 'var(--accent-indigo)' }}
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
              <div style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center', background: 'var(--bg-card)', border: '1px dashed var(--border-focus)', borderRadius: '16px', boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--accent-indigo-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-indigo)' }}>
                  <Zap size={32} />
                </div>              <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>No Outreach Messages in Review Queue</h3>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', maxWidth: '480px', margin: '8px auto 0', lineHeight: 1.5 }}>
                    Open the <strong>AI Sales Engagement Workspace</strong> or <strong>Lead Discovery</strong>, select a qualified lead, and click <strong>&quot;Approve & Schedule Outreach&quot;</strong> to automatically import your real lead campaigns here.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '4px' }}>
                  <a
                    href="/engagement"
                    style={{
                      padding: '10px 22px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, var(--accent-indigo), #00b386)',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      border: 'none',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(0, 208, 156, 0.3)',
                    }}
                  >
                    <Zap size={16} /> Open AI Outreach Generator (/engagement)
                  </a>

                  <a
                    href="/discovery"
                    style={{
                      padding: '10px 22px',
                      borderRadius: '10px',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      border: '1px solid var(--border-subtle)',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
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
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <div className="card-glass" style={{ width: '100%', maxWidth: '480px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldCheck size={20} style={{ color: 'var(--accent-cyan)' }} />
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Enrich with Apollo.io</h3>
                </div>

                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  Enrichment may consume Apollo credits depending on requested data. Confirm your target options below:
                </p>

                {creditWarning && creditWarning.isWarning && (
                  <div style={{ padding: '8px 12px', background: 'var(--color-danger-bg)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '4px', fontSize: '0.72rem', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertCircle size={14} /> Credit Warning: Remaining Apollo credits ({creditWarning.remainingCredits}) are below threshold.
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={apolloOptWorkEmail}
                      onChange={(e) => setApolloOptWorkEmail(e.target.checked)}
                    />
                    Work Email & Basic Business Info (Default: 1 Credit)
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={apolloOptPersonalEmail}
                      onChange={(e) => setApolloOptPersonalEmail(e.target.checked)}
                    />
                    Personal Email (Requires explicit permission setting)
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={apolloOptPhone}
                      onChange={(e) => setApolloOptPhone(e.target.checked)}
                    />
                    Phone Number (Requires explicit permission setting)
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button
                    onClick={() => setShowApolloModal(false)}
                    className="btn-secondary"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmEnrichment}
                    className="btn-primary"
                    style={{ flex: 1, justifyContent: 'center', background: 'var(--accent-cyan)' }}
                  >
                    Confirm & Enrich
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CONFIRMATION PROMPT MODAL POPUP */}
          {confirmDeletePost && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
              <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '16px', maxWidth: '440px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', textAlign: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                  <Archive size={24} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  Confirm Delete / Archive
                </h3>
                <p style={{ fontSize: '0.86rem', color: '#64748b', marginTop: '8px', lineHeight: '1.5' }}>
                  Do you really wish to delete / archive <strong>"{confirmDeletePost.authorName}"</strong> from the Review Queue?
                </p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setConfirmDeletePost(null)}
                    style={{ padding: '9px 18px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmArchive}
                    style={{ padding: '9px 20px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 800, background: '#dc2626', color: '#ffffff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(220,38,38,0.3)' }}
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
  );
}
