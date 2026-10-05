'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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
  Briefcase,
  Loader2
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
import { WorkflowGuide } from '@/components/WorkflowGuide';
import { PageShell } from '@/components/ui/PageShell';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/useToast';
import s from '@/components/ui/ui.module.css';
import r from './review.module.css';
import '@/styles/globals.css';

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
  const { toast, notify } = useToast();
  const triggerNotification = (type: 'success' | 'error', message: string) => notify(message, type === 'error');

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

  const scoreBadge = (score: number | null) =>
    score === null
      ? <span className={`${s.badge} ${s.badgeGray}`}>Not scored</span>
      : <span className={`${s.badge} ${score >= 85 ? s.badgeGreen : score >= 70 ? s.badgeAmber : s.badgeGray}`}>Score {score}</span>;

  const activeDraft = activePost?.drafts[0];
  const activeSteps = playbooks.find((p) => p.id === selectedPlaybookId)?.steps.filter((st) => st.enabled) || [];

  return (
    <PageShell
      icon={CheckCircle}
      title="Review Queue"
      subtitle="Analyse saved leads, then write, edit and approve their outreach"
      actions={<span className={`${s.badge} ${s.badgeGreen}`}>{posts.length} waiting for review</span>}
      beforeContent={<WorkflowGuide activeStep={5} />}
      breadcrumb={<BreadcrumbHeader currentTitle="Review Queue" stepNumber={5} totalSteps={7} badge="Approve & Dispatch" />}
    >
      <div className={s.root}>
        {toast}

        {dbError && (
          <div className={`${s.notice} ${s.noticeWarn}`} role="alert" style={{ alignItems: 'center' }}>
            <AlertCircle size={16} className={s.noticeIcon} />
            <span style={{ flex: 1 }}>{dbError}</span>
            <button type="button" className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} onClick={loadData}><RefreshCw size={13} /> Retry</button>
          </div>
        )}

        <div className={r.workspace}>
          {/* Queue */}
          <aside className={r.queue} aria-label="Review queue">
            <div className={s.card} style={{ padding: 14, gap: 10 }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--o-subtle)' }} />
                <input type="search" className={s.input} style={{ paddingLeft: 36 }} placeholder="Search the queue" aria-label="Search the queue" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <select className={s.select} aria-label="Filter by category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="">All categories</option>
                  {categoriesList.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <select className={s.select} aria-label="Sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="newest">Newest first</option>
                  <option value="score">Highest score</option>
                  <option value="engagements">Most engagement</option>
                </select>
              </div>
            </div>

            <div className={r.queueList}>
              {pageLoading ? (
                <div className={s.empty}><Loader2 size={20} className={s.spin} /><div className={s.emptyTitle}>Loading the queue…</div></div>
              ) : sortedPosts.length === 0 ? (
                <div className={s.empty}>
                  <Zap size={24} style={{ color: 'var(--o-accent)' }} />
                  <div className={s.emptyTitle}>{posts.length ? 'Nothing matches these filters' : 'The queue is empty'}</div>
                  {posts.length ? 'Clear the search or category filter.' : 'Posts you send from LinkedIn or the Outreach generator appear here.'}
                </div>
              ) : (
                sortedPosts.map((post) => (
                  <button key={post.id} type="button" onClick={() => handleSelectPost(post.id)} className={`${r.item} ${post.id === selectedPostId ? r.itemActive : ''}`} aria-current={post.id === selectedPostId}>
                    <span className={r.itemHead}>
                      <span style={{ minWidth: 0 }}>
                        <span className={r.itemName}>{post.apolloEnrichment ? post.apolloEnrichment.personName : post.authorName}</span>
                        <span className={s.cellSub} style={{ display: 'block' }}>{post.matchedKeyword}</span>
                      </span>
                      {scoreBadge(post.opportunityScore)}
                    </span>
                    <span className={r.itemPreview}>{post.postPreview}</span>
                    <span className={r.itemFoot}>
                      <span>{post.engagementCount} engagements</span>
                      <span>{new Date(post.discoveredAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </aside>

          {/* Detail */}
          <div className={r.detail}>
            {activePost ? (
              <>
                <section className={s.card}>
                  <div className={s.cardHeader} style={{ alignItems: 'center' }}>
                    <div className={r.person}>
                      <span className={r.avatar}><User size={22} /></span>
                      <div style={{ minWidth: 0 }}>
                        <h2 className={r.personName}>{activePost.apolloEnrichment ? activePost.apolloEnrichment.personName : activePost.authorName}</h2>
                        <div className={s.badgeRow} style={{ marginTop: 4 }}>
                          <span className={`${s.badge} ${s.badgeGray}`}><Briefcase size={11} /> {activePost.apolloEnrichment?.jobTitle || activePost.authorHeadline || 'LinkedIn member'}</span>
                          {(activePost.apolloEnrichment?.organizationName || activePost.companyName) && (
                            <span className={`${s.badge} ${s.badgeGray}`}><Building2 size={11} /> {activePost.apolloEnrichment?.organizationName || activePost.companyName}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={s.actionGroup}>
                      <button type="button" className={`${s.iconBtn} ${activePost.isFavorite ? s.iconBtnDone : ''}`} onClick={() => handleToggleFavorite(activePost.id, activePost.isFavorite)} aria-pressed={activePost.isFavorite} aria-label={activePost.isFavorite ? 'Remove star' : 'Star this lead'} title="Star (F)">
                        <Star size={17} fill={activePost.isFavorite ? 'currentColor' : 'none'} />
                      </button>
                      <button type="button" className={`${s.btn} ${s.btnDanger} ${s.btnSm}`} onClick={() => promptArchivePost(activePost)} title="Archive (S)"><Archive size={13} /> Archive</button>
                      <button type="button" className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} onClick={handleOpenApolloModal} disabled={apolloLoading}><ShieldCheck size={13} /> Enrich with Apollo</button>
                      <a className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} href={activePost.postUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} /> Open on LinkedIn</a>
                    </div>
                  </div>
                  <p className={r.postText}>{activePost.postPreview}</p>
                </section>

                <div className={r.modules}>
                  {/* AI analysis */}
                  <section className={s.card}>
                    <div className={s.cardHeader}>
                      <h3 className={s.cardTitle}><span className={s.iconTile}><Zap size={16} /></span> AI analysis</h3>
                      <button type="button" className={`${s.btn} ${activePost.analysis ? s.btnSecondary : s.btnPrimary} ${s.btnSm}`} onClick={() => handleAnalyzePost(activePost.id, !!activePost.analysis)} disabled={analysisLoading} title="Analyse (A)">
                        {analysisLoading ? <Loader2 size={13} className={s.spin} /> : activePost.analysis ? <RefreshCw size={13} /> : <Zap size={13} />} {activePost.analysis ? 'Analyse again' : 'Analyse'}
                      </button>
                    </div>
                    {activePost.analysis ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className={r.fieldLabel} style={{ margin: 0 }}>Opportunity score</span>
                          {scoreBadge(activePost.analysis.opportunityScore)}
                        </div>
                        <div>
                          <div className={r.fieldLabel}>Buying signals</div>
                          <div className={s.badgeRow}>{activePost.analysis.buyingSignals.map((sig) => <span key={sig} className={`${s.badge} ${s.badgeIndigo}`}>{sig}</span>)}</div>
                        </div>
                        <div><div className={r.fieldLabel}>Summary</div><p className={r.fieldText}>{activePost.analysis.summary}</p></div>
                        <div><div className={r.fieldLabel}>Why it fits</div><p className={r.fieldText}>{activePost.analysis.valueReason}</p></div>
                        <div><div className={r.fieldLabel}>Suggested angle</div><p className={r.fieldText}>{activePost.analysis.suggestedOutreachAngle}</p></div>
                        {(activePost.analysis.promptTokens !== null || activePost.analysis.completionTokens !== null) && (
                          <div className={s.cellSub}>{activePost.analysis.promptTokens ?? 0} prompt + {activePost.analysis.completionTokens ?? 0} completion tokens</div>
                        )}
                      </div>
                    ) : (
                      <div className={s.empty}>Not analysed yet. Run the analysis to find buying signals and an outreach angle.</div>
                    )}
                  </section>

                  {/* Apollo */}
                  <section className={s.card}>
                    <div className={s.cardHeader}>
                      <h3 className={s.cardTitle}><span className={s.iconTile}><ShieldCheck size={16} /></span> Apollo contact data</h3>
                      <button type="button" className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} onClick={handleOpenApolloModal} disabled={apolloLoading}>
                        {apolloLoading ? <Loader2 size={13} className={s.spin} /> : <RefreshCw size={13} />} {apolloEnrichment ? 'Enrich again' : 'Enrich'}
                      </button>
                    </div>
                    {apolloEnrichment ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div className={s.badgeRow}>
                          <span className={`${s.badge} ${apolloEnrichment.enrichmentStatus === 'ENRICHED' ? s.badgeGreen : s.badgeAmber}`}>{apolloEnrichment.enrichmentStatus.replace(/_/g, ' ').toLowerCase()}</span>
                          <span className={s.cellSub} style={{ marginTop: 0 }}>{apolloEnrichment.creditsUsed} credit{apolloEnrichment.creditsUsed === 1 ? '' : 's'} used</span>
                        </div>
                        <div className={s.contactGrid}>
                          <div className={s.contactItem}>
                            <div className={s.contactLabel}>Person</div>
                            <div className={s.contactValue}>{apolloEnrichment.personName}</div>
                            <div className={s.cellSub}>{apolloEnrichment.jobTitle || 'No title'}</div>
                          </div>
                          <div className={s.contactItem}>
                            <div className={s.contactLabel}>Company</div>
                            <div className={s.contactValue}>{apolloEnrichment.organizationName || 'Unknown'}</div>
                            <div className={s.cellSub}>{apolloEnrichment.organizationDomain || 'No website'}</div>
                          </div>
                        </div>
                        {apolloEnrichment.workEmail && <div className={s.cellSub} style={{ marginTop: 0 }}>Work email: <strong>{apolloEnrichment.workEmail}</strong></div>}
                        {apolloEnrichment.personalEmail && <div className={s.cellSub} style={{ marginTop: 0 }}>Personal email: <strong>{apolloEnrichment.personalEmail}</strong></div>}
                        {apolloEnrichment.phone && <div className={s.cellSub} style={{ marginTop: 0 }}>Phone: <strong>{apolloEnrichment.phone}</strong></div>}
                        <label className={r.checkRow}>
                          <input type="checkbox" checked={useApolloDataInAi} onChange={(e) => setUseApolloDataInAi(e.target.checked)} />
                          Use this contact data when writing the outreach
                        </label>
                      </div>
                    ) : (
                      <div className={s.empty}>Not enriched. Apollo can find this person&apos;s work email and title (uses credits).</div>
                    )}
                  </section>
                </div>

                {/* Outreach draft */}
                <section className={s.card}>
                  <div className={s.cardHeader}>
                    <h3 className={s.cardTitle}><span className={s.iconTile}><BookOpen size={16} /></span> Outreach draft</h3>
                    {activeDraft && <span className={`${s.badge} ${s.badgeIndigo}`}>{activeDraft.status.replace(/_/g, ' ').toLowerCase()}</span>}
                  </div>

                  {outreachLoading ? (
                    <div className={s.empty}><Loader2 size={20} className={s.spin} /><div className={s.emptyTitle}>Writing the message…</div></div>
                  ) : !activeDraft ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div className={s.formGrid}>
                        <div className={s.field}>
                          <label className={s.label} htmlFor="review-playbook">Playbook</label>
                          <select
                            id="review-playbook"
                            className={s.select}
                            value={selectedPlaybookId}
                            onChange={(e) => {
                              setSelectedPlaybookId(e.target.value);
                              const pb = playbooks.find((p) => p.id === e.target.value);
                              if (pb && pb.steps.length > 0) setSelectedStepId(pb.steps[0].id);
                            }}
                          >
                            {playbooks.length === 0 && <option value="">No active playbooks</option>}
                            {playbooks.map((pb) => <option key={pb.id} value={pb.id}>{pb.name}</option>)}
                          </select>
                        </div>
                        <div className={s.field}>
                          <label className={s.label} htmlFor="review-step">Sequence step</label>
                          <select id="review-step" className={s.select} value={selectedStepId} onChange={(e) => setSelectedStepId(e.target.value)}>
                            {activeSteps.length === 0 && <option value="">No steps available</option>}
                            {activeSteps.map((step) => <option key={step.id} value={step.id}>Step {step.order}: {step.stepName} ({step.delay}d delay)</option>)}
                          </select>
                        </div>
                      </div>
                      <div className={s.field}>
                        <label className={s.label} htmlFor="review-instructions">Extra instructions for the AI (optional)</label>
                        <textarea id="review-instructions" className={s.textarea} style={{ minHeight: 70 }} value={userInstructions} onChange={(e) => setUserInstructions(e.target.value)} placeholder="e.g. focus on their API latency, keep it under 3 sentences" />
                      </div>
                      {playbooks.length === 0 && <div className={s.cellSub}>Create an active playbook under Playbooks to write drafts here.</div>}
                      <div>
                        <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => handleGenerateOutreach(activePost.id)} disabled={!selectedPlaybookId || !selectedStepId || playbooks.length === 0} title="Write draft (G)">
                          <Zap size={15} /> Write AI draft
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div className={s.field}>
                        <div className={s.fieldHead} style={{ marginBottom: 0 }}>
                          <label className={s.label} htmlFor="review-draft">Message</label>
                          <span className={s.cellSub} style={{ marginTop: 0 }}>Playbook: {playbooks.find((p) => p.id === activeDraft.playbookId)?.name || 'Custom'}</span>
                        </div>
                        <textarea id="review-draft" className={`${s.textarea} ${r.draftEditor}`} value={draftText} onChange={(e) => setDraftText(e.target.value)} placeholder="Your personalised outreach message" />
                      </div>

                      <div>
                        <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={() => setIsOriginalCollapsed(!isOriginalCollapsed)} aria-expanded={!isOriginalCollapsed}>
                          {isOriginalCollapsed ? 'Show the original AI draft' : 'Hide the original AI draft'}
                        </button>
                        {!isOriginalCollapsed && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                            <p className={r.original}>{activeDraft.originalAiDraft}</p>
                            <div>
                              <button type="button" className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} onClick={() => { setDraftText(activeDraft.originalAiDraft); triggerNotification('success', 'Original draft restored.'); }}>Restore the original</button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className={s.searchRow}>
                        <input type="text" className={s.input} placeholder="Notes for a rewrite, e.g. make it shorter" aria-label="Notes for a rewrite" value={userInstructions} onChange={(e) => setUserInstructions(e.target.value)} />
                      </div>

                      <div className={s.actionBar}>
                        <div className={s.actionGroup}>
                          <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={() => handleSaveDraftChanges(activeDraft.id, activePost.id)} disabled={saveChangesLoading}>
                            {saveChangesLoading ? <Loader2 size={15} className={s.spin} /> : null} Save edits
                          </button>
                          <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={() => handleRegenerateOutreach(activeDraft.id, activePost.id)} disabled={outreachLoading}>
                            <RefreshCw size={15} /> Rewrite
                          </button>
                        </div>
                        <div className={s.actionGroup}>
                          {activeDraft.status === DraftStatus.DRAFT && (
                            <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => handleApproveDraft(activeDraft.id, activePost.id)} disabled={approvalLoading}>
                              {approvalLoading ? <Loader2 size={15} className={s.spin} /> : <CheckCircle size={15} />} Approve
                            </button>
                          )}
                          {activeDraft.status === DraftStatus.APPROVED && (
                            <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => handleMarkAsSent(activeDraft.id, activePost.id)} disabled={markSentLoading}>
                              {markSentLoading ? <Loader2 size={15} className={s.spin} /> : <CheckCircle size={15} />} Mark as sent
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </section>

                <div className={r.hotkeys} aria-label="Keyboard shortcuts">
                  <span>Move <kbd className={r.kbd}>↑</kbd><kbd className={r.kbd}>↓</kbd></span>
                  <span>Analyse <kbd className={r.kbd}>A</kbd></span>
                  <span>Write draft <kbd className={r.kbd}>G</kbd></span>
                  <span>Star <kbd className={r.kbd}>F</kbd></span>
                  <span>Archive <kbd className={r.kbd}>S</kbd></span>
                </div>
              </>
            ) : (
              <div className={s.empty} style={{ padding: '48px 20px' }}>
                <Zap size={28} style={{ color: 'var(--o-accent)' }} />
                <div className={s.emptyTitle}>Nothing to review</div>
                Send posts from LinkedIn, or approve a sequence in the Outreach generator, and they appear here.
                <div className={s.actionGroup} style={{ justifyContent: 'center', marginTop: 14 }}>
                  <Link className={`${s.btn} ${s.btnPrimary}`} href="/linkedin"><Search size={15} /> Find posts on LinkedIn</Link>
                  <Link className={`${s.btn} ${s.btnSecondary}`} href="/engagement"><Zap size={15} /> Open Outreach</Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Apollo confirmation */}
        {showApolloModal && (
          <Modal
            title="Enrich with Apollo"
            icon={<ShieldCheck size={17} />}
            onClose={() => setShowApolloModal(false)}
            actions={
              <>
                <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={() => setShowApolloModal(false)}>Cancel</button>
                <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={handleConfirmEnrichment}><ShieldCheck size={15} /> Enrich</button>
              </>
            }
          >
            <p className={s.modalText}>Looking a person up uses Apollo credits. Choose what to reveal:</p>
            {creditWarning?.isWarning && (
              <div className={`${s.notice} ${s.noticeWarn}`}><AlertCircle size={15} className={s.noticeIcon} /> Only {creditWarning.remainingCredits} Apollo searches left today.</div>
            )}
            <label className={r.checkRow}><input type="checkbox" checked={apolloOptWorkEmail} onChange={(e) => setApolloOptWorkEmail(e.target.checked)} /> Work email and title (1 credit)</label>
            <label className={r.checkRow}><input type="checkbox" checked={apolloOptPersonalEmail} onChange={(e) => setApolloOptPersonalEmail(e.target.checked)} /> Personal email (must be allowed in Settings)</label>
            <label className={r.checkRow}><input type="checkbox" checked={apolloOptPhone} onChange={(e) => setApolloOptPhone(e.target.checked)} /> Phone number (must be allowed in Settings)</label>
          </Modal>
        )}

        {/* Archive confirmation */}
        {confirmDeletePost && (
          <Modal
            title="Archive this lead?"
            icon={<Archive size={17} />}
            onClose={() => setConfirmDeletePost(null)}
            actions={
              <>
                <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={() => setConfirmDeletePost(null)}>Cancel</button>
                <button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={handleConfirmArchive}><Archive size={15} /> Archive</button>
              </>
            }
          >
            <p className={s.modalText}><strong>{confirmDeletePost.authorName}</strong> will leave the Review Queue.</p>
          </Modal>
        )}
      </div>
    </PageShell>
  );
}
