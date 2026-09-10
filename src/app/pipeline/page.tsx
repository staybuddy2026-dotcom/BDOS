'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  getPipelineOutreaches, 
  updateOutreachDraftStatus, 
  createFollowUp, 
  progressToNextStep, 
  simulateProspectReply, 
  generateAiReplySuggestion,
  saveOutreachDraftChanges
} from '@/features/review/actions';
import { 
  TrendingUp, 
  Calendar, 
  CheckCircle, 
  MessageSquare, 
  AlertTriangle, 
  Send, 
  ChevronRight, 
  FolderPlus, 
  Info
} from 'lucide-react';
import { DraftStatus } from '@prisma/client';
import { BreadcrumbHeader } from '@/components/navigation/BreadcrumbHeader';
import '@/styles/globals.css';

interface PipelineDraft {
  id: string;
  postId: string;
  post: {
    id: string;
    postUrl: string;
    authorName: string;
    authorHeadline: string | null;
    companyName: string | null;
    postPreview: string;
    opportunityScore: number | null;
    analysis?: {
      id: string;
      summary: string;
      buyingSignals: string[];
      suggestedOutreachAngle: string | null;
      valueReason: string | null;
    } | null;
  };
  playbookId: string | null;
  playbook?: {
    id: string;
    name: string;
  } | null;
  stepId: string | null;
  step?: {
    id: string;
    stepName: string;
    order: number;
    delay: number;
  } | null;
  originalAiDraft: string;
  editedDraft: string | null;
  status: DraftStatus;
  generatedAt: Date;
  approvedAt: Date | null;
  sentAt: Date | null;
  history: {
    id: string;
    status: DraftStatus;
    notes: string | null;
    timestamp: Date;
  }[];
  followUps: {
    id: string;
    dueDate: Date;
    status: string;
    content: string | null;
  }[];
}

export default function PipelinePage() {
  const [items, setItems] = useState<PipelineDraft[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbWarning, setDbWarning] = useState(false);

  // Form parameters
  const [draftText, setDraftText] = useState('');
  const [replyTextSimulation, setReplyTextSimulation] = useState('');
  const [followUpDateInput, setFollowUpDateInput] = useState('');
  const [aiSuggestionOutput, setAiSuggestionOutput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Status mapping colors & labels
  const allStatuses: DraftStatus[] = [
    DraftStatus.DRAFT,
    DraftStatus.PENDING_REVIEW,
    DraftStatus.APPROVED,
    DraftStatus.SENT,
    DraftStatus.FOLLOW_UP_DUE,
    DraftStatus.COMPLETED,
    DraftStatus.REPLIED,
    DraftStatus.MEETING,
    DraftStatus.PROPOSAL,
    DraftStatus.WON,
    DraftStatus.LOST,
  ];

  // Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const triggerNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Load pipeline data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPipelineOutreaches();
      // Ensure date objects are correctly casted
      const casted: PipelineDraft[] = data.map(item => ({
        ...item,
        generatedAt: new Date(item.generatedAt),
        approvedAt: item.approvedAt ? new Date(item.approvedAt) : null,
        sentAt: item.sentAt ? new Date(item.sentAt) : null,
        history: (item.history || []).map(h => ({
          ...h,
          timestamp: new Date(h.timestamp)
        })),
        followUps: (item.followUps || []).map(fu => ({
          ...fu,
          dueDate: new Date(fu.dueDate)
        }))
      }));

      setItems(casted);
      if (casted.length > 0) {
        setSelectedId(casted[0].id);
        setDraftText(casted[0].editedDraft || casted[0].originalAiDraft);
      }
      setDbWarning(false);
    } catch (err) {
      console.error(err);
      setDbWarning(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const activeItem = items.find(i => i.id === selectedId) || null;

  const handleSelectCard = (id: string) => {
    setSelectedId(id);
    const selected = items.find(i => i.id === id);
    if (selected) {
      setDraftText(selected.editedDraft || selected.originalAiDraft);
      setAiSuggestionOutput('');
      setReplyTextSimulation('');
      setFollowUpDateInput('');
    }
  };

  // 1. Update Status manually
  const handleUpdateStatus = async (status: DraftStatus) => {
    if (!activeItem) return;
    setActionLoading(true);
    try {
      await updateOutreachDraftStatus(activeItem.id, status);
      
      // Update state locally (supporting sandbox verification)
      setItems(prev => prev.map(item => {
        if (item.id === activeItem.id) {
          const updatedHistory = [
            {
              id: Math.random().toString(),
              status,
              notes: `Status updated manually to ${status}.`,
              timestamp: new Date()
            },
            ...item.history
          ];
          return { ...item, status, history: updatedHistory };
        }
        return item;
      }));

      triggerNotification('success', `Status updated to ${status}.`);
    } catch {
      // Local fallback logic in case DB is sandbox warned
      setItems(prev => prev.map(item => {
        if (item.id === activeItem.id) {
          const updatedHistory = [
            {
              id: Math.random().toString(),
              status,
              notes: `Sandbox Local State Update: status changed to ${status}.`,
              timestamp: new Date()
            },
            ...item.history
          ];
          return { ...item, status, history: updatedHistory };
        }
        return item;
      }));
      triggerNotification('success', `Status updated locally (Postgres connection warning).`);
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Save text composer edits
  const handleSaveComposerEdits = async () => {
    if (!activeItem) return;
    setActionLoading(true);
    try {
      await saveOutreachDraftChanges(activeItem.id, draftText);
      setItems(prev => prev.map(item => {
        if (item.id === activeItem.id) {
          return { ...item, editedDraft: draftText };
        }
        return item;
      }));
      triggerNotification('success', 'Composer text changes saved.');
    } catch {
      setItems(prev => prev.map(item => {
        if (item.id === activeItem.id) {
          return { ...item, editedDraft: draftText };
        }
        return item;
      }));
      triggerNotification('success', 'Composer edits saved locally (Postgres Warning).');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Mark draft manually confirmed as SENT
  const handleConfirmSent = async () => {
    if (!activeItem) return;
    setActionLoading(true);
    try {
      const notes = 'Marked as manually sent by user.';
      await updateOutreachDraftStatus(activeItem.id, DraftStatus.SENT, notes);
      setItems(prev => prev.map(item => {
        if (item.id === activeItem.id) {
          return {
            ...item,
            status: DraftStatus.SENT,
            sentAt: new Date(),
            history: [
              { id: Math.random().toString(), status: DraftStatus.SENT, notes, timestamp: new Date() },
              ...item.history
            ]
          };
        }
        return item;
      }));
      triggerNotification('success', 'Message confirmed sent. sequence shifted to SENT.');
    } catch {
      setItems(prev => prev.map(item => {
        if (item.id === activeItem.id) {
          return {
            ...item,
            status: DraftStatus.SENT,
            sentAt: new Date(),
            history: [
              { id: Math.random().toString(), status: DraftStatus.SENT, notes: 'Sandbox: Sent confirmed.', timestamp: new Date() },
              ...item.history
            ]
          };
        }
        return item;
      }));
      triggerNotification('success', 'Sent status updated locally.');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Schedule Follow Up Date
  const handleScheduleFollowUp = async () => {
    if (!activeItem || !followUpDateInput) {
      triggerNotification('error', 'Select a valid calendar date.');
      return;
    }
    setActionLoading(true);
    const dueDate = new Date(followUpDateInput);
    try {
      await createFollowUp(activeItem.id, dueDate);
      setItems(prev => prev.map(item => {
        if (item.id === activeItem.id) {
          return {
            ...item,
            status: DraftStatus.FOLLOW_UP_DUE,
            followUps: [
              { id: Math.random().toString(), dueDate, status: 'PENDING', content: 'Follow up on campaign' }
            ],
            history: [
              { id: Math.random().toString(), status: DraftStatus.FOLLOW_UP_DUE, notes: `Follow-up scheduled for ${dueDate.toLocaleDateString()}`, timestamp: new Date() },
              ...item.history
            ]
          };
        }
        return item;
      }));
      triggerNotification('success', `Follow-up date scheduled.`);
      setFollowUpDateInput('');
    } catch {
      setItems(prev => prev.map(item => {
        if (item.id === activeItem.id) {
          return {
            ...item,
            status: DraftStatus.FOLLOW_UP_DUE,
            followUps: [
              { id: Math.random().toString(), dueDate, status: 'PENDING', content: 'Follow up on campaign' }
            ],
            history: [
              { id: Math.random().toString(), status: DraftStatus.FOLLOW_UP_DUE, notes: `Sandbox: Follow-up set for ${dueDate.toLocaleDateString()}`, timestamp: new Date() },
              ...item.history
            ]
          };
        }
        return item;
      }));
      triggerNotification('success', 'Follow-up set locally.');
      setFollowUpDateInput('');
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Progress sequence to next Step
  const handleProgressSequence = async () => {
    if (!activeItem) return;
    setActionLoading(true);
    try {
      const res = await progressToNextStep(activeItem.id);
      if (res.completed) {
        setItems(prev => prev.map(item => {
          if (item.id === activeItem.id) {
            return {
              ...item,
              status: DraftStatus.COMPLETED,
              history: [
                { id: Math.random().toString(), status: DraftStatus.COMPLETED, notes: 'Playbook steps completed.', timestamp: new Date() },
                ...item.history
              ]
            };
          }
          return item;
        }));
        triggerNotification('success', 'Sequence completed! No more playbook steps left.');
      } else if (res.draft) {
        // Reload all data to reflect new draft in columns
        await loadData();
        triggerNotification('success', 'Progressed to next step. New AI draft created.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to progress sequence.';
      triggerNotification('error', message);
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Simulate Prospect Reply (Mandatory Stop Rule)
  const handleSimulateReply = async () => {
    if (!activeItem || !replyTextSimulation.trim()) {
      triggerNotification('error', 'Type a mock reply text first.');
      return;
    }
    setActionLoading(true);
    try {
      await simulateProspectReply(activeItem.id, replyTextSimulation);
      
      // Update state locally
      setItems(prev => prev.map(item => {
        if (item.id === activeItem.id) {
          const cancelledFollowups = item.followUps.map(fu => ({ ...fu, status: 'CANCELLED' }));
          return {
            ...item,
            status: DraftStatus.REPLIED,
            followUps: cancelledFollowups,
            history: [
              {
                id: Math.random().toString(),
                status: DraftStatus.REPLIED,
                notes: `Simulated Reply Received: "${replyTextSimulation}". Sequence stopped.`,
                timestamp: new Date()
              },
              ...item.history
            ]
          };
        }
        return item;
      }));

      triggerNotification('success', 'Reply registered. Sequence stopped, follow-ups cancelled.');
      setReplyTextSimulation('');
    } catch {
      setItems(prev => prev.map(item => {
        if (item.id === activeItem.id) {
          const cancelledFollowups = item.followUps.map(fu => ({ ...fu, status: 'CANCELLED' }));
          return {
            ...item,
            status: DraftStatus.REPLIED,
            followUps: cancelledFollowups,
            history: [
              {
                id: Math.random().toString(),
                status: DraftStatus.REPLIED,
                notes: `Sandbox Simulated Reply: "${replyTextSimulation}". Stopped sequence.`,
                timestamp: new Date()
              },
              ...item.history
            ]
          };
        }
        return item;
      }));
      triggerNotification('success', 'Reply registered locally.');
      setReplyTextSimulation('');
    } finally {
      setActionLoading(false);
    }
  };

  // 7. Request Manual AI Reply Suggestion (Only on demand)
  const handleRequestReplySuggestion = async () => {
    if (!activeItem) return;
    setActionLoading(true);
    try {
      const text = await generateAiReplySuggestion(activeItem.id, 'Are you free for next Tuesday?');
      setAiSuggestionOutput(text);
      triggerNotification('success', 'AI reply suggestion generated.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI reply generation failed.';
      triggerNotification('error', message);
    } finally {
      setActionLoading(false);
    }
  };

  // Helper selectors to filter cards into Kanban columns
  const getColItems = (column: 'drafts' | 'outbound' | 'chats' | 'outcomes') => {
    return items.filter(item => {
      if (column === 'drafts') {
        return ( [DraftStatus.DRAFT, DraftStatus.PENDING_REVIEW, DraftStatus.APPROVED] as DraftStatus[] ).includes(item.status);
      }
      if (column === 'outbound') {
        return ( [DraftStatus.SENT, DraftStatus.FOLLOW_UP_DUE] as DraftStatus[] ).includes(item.status);
      }
      if (column === 'chats') {
        return ( [DraftStatus.REPLIED, DraftStatus.MEETING, DraftStatus.PROPOSAL] as DraftStatus[] ).includes(item.status);
      }
      if (column === 'outcomes') {
        return ( [DraftStatus.COMPLETED, DraftStatus.WON, DraftStatus.LOST, DraftStatus.REJECTED] as DraftStatus[] ).includes(item.status);
      }
      return false;
    });
  };

  const getColIcon = (col: string) => {
    if (col === 'drafts') return <FolderPlus size={14} style={{ color: 'var(--accent-indigo)' }} />;
    if (col === 'outbound') return <Send size={14} style={{ color: 'var(--accent-cyan)' }} />;
    if (col === 'chats') return <MessageSquare size={14} style={{ color: 'var(--color-success)' }} />;
    return <CheckCircle size={14} style={{ color: 'var(--color-warning)' }} />;
  };

  // Check if active draft has follow-up due alert
  const getFollowUpStatusLabel = (item: PipelineDraft) => {
    const activeFu = item.followUps.find(f => f.status === 'PENDING');
    if (!activeFu) return null;
    const diff = activeFu.dueDate.getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    if (days < 0) return { label: `Overdue by ${Math.abs(days)}d`, style: 'overdue' };
    if (days === 0) return { label: 'Due Today', style: 'due' };
    return { label: `Follow-up in ${days}d`, style: '' };
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-full m-0 box-border min-h-[calc(100vh-120px)]">
      {/* Notifications */}
      {notification && (
        <div className={`notification ${notification.type === 'success' ? 'success' : 'error'}`}>
          {notification.type === 'success' ? <CheckCircle className="notif-icon" /> : <AlertTriangle className="notif-icon" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Connection Warning */}
      {dbWarning && (
        <div className="db-warning-banner">
          <Info size={16} />
          <span>Local database warning: No Postgres server on localhost. Running application under offline sandbox mode with simulated list states.</span>
        </div>
      )}

      {/* Top Navigation & Breadcrumb */}
      <BreadcrumbHeader
        currentTitle="Pipeline Stages & Outbound Sequences"
        badge="Deal Tracking"
      />

      {/* Stat Bubbles */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        <div className="bg-[#111726] border border-white/10 rounded-[10px] py-4 px-5 flex flex-col gap-1 card-glass">
          <span className="text-[1.6rem] font-bold text-[var(--text-primary)]">{items.length}</span>
          <span className="text-[0.72rem] text-slate-500 uppercase tracking-wider font-semibold">Active Leas</span>
        </div>
        <div className="bg-[#111726] border border-white/10 rounded-[10px] py-4 px-5 flex flex-col gap-1 card-glass">
          <span className="text-[1.6rem] font-bold text-[var(--text-primary)]">{items.filter(i => ([DraftStatus.REPLIED, DraftStatus.MEETING, DraftStatus.PROPOSAL] as DraftStatus[]).includes(i.status)).length}</span>
          <span className="text-[0.72rem] text-slate-500 uppercase tracking-wider font-semibold">Conversations</span>
        </div>
        <div className="bg-[#111726] border border-white/10 rounded-[10px] py-4 px-5 flex flex-col gap-1 card-glass">
          <span className="text-[1.6rem] font-bold text-[var(--text-primary)]">{items.filter(i => i.followUps.some(f => f.status === 'PENDING')).length}</span>
          <span className="text-[0.72rem] text-slate-500 uppercase tracking-wider font-semibold">Scheduled Tasks</span>
        </div>
        <div className="bg-[#111726] border border-white/10 rounded-[10px] py-4 px-5 flex flex-col gap-1 card-glass">
          <span className="text-[1.6rem] font-bold text-[var(--text-primary)]">{items.filter(i => i.status === DraftStatus.WON).length}</span>
          <span className="text-[0.72rem] text-slate-500 uppercase tracking-wider font-semibold">Deals Closed</span>
        </div>
      </div>

      {loading ? (
        <div className="loader-spinner-wrapper" style={{ margin: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '12px' }}>
          <div className="pulse-loader" style={{ borderColor: 'var(--accent-indigo)' }} />
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading pipeline stages...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 flex-1 min-h-0">
        {/* Kanban Board Grid */}
        <div className="grid grid-cols-4 gap-3.5 overflow-x-auto content-start h-full min-h-0">
          {(['drafts', 'outbound', 'chats', 'outcomes'] as const).map(column => {
            const list = getColItems(column);
            return (
              <div key={column} className="flex flex-col gap-3 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[10px] p-3.5 min-h-0 max-h-full">
                <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2.5">
                  <span className="text-[0.85rem] font-semibold text-[var(--text-primary)] flex items-center gap-2" style={{ textTransform: 'capitalize' }}>
                    {getColIcon(column)} {column}
                  </span>
                  <span className="text-[0.72rem] bg-white/5 py-0.5 px-2 rounded text-slate-400 font-semibold">{list.length}</span>
                </div>

                <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-0.5">
                  {list.map(item => {
                    const activeAlert = getFollowUpStatusLabel(item);
                    return (
                      <div 
                        key={item.id} 
                        onClick={() => handleSelectCard(item.id)}
                        className={`bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg p-3 cursor-pointer flex flex-col gap-2 transition-all duration-150 hover:border-[var(--accent-indigo)] hover:bg-[var(--bg-card-hover)] hover:-translate-y-px card-glass ${item.id === selectedId ? 'border-[var(--accent-indigo)] bg-[var(--accent-indigo-glow)] shadow-[0_0_12px_rgba(0,208,156,0.15)]' : ''}`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-[0.85rem] font-semibold text-[var(--text-primary)]">{item.post.authorName}</span>
                          <span className="text-[0.72rem] font-bold py-0.5 px-1.5 rounded bg-emerald-500/10 text-emerald-500">{item.post.opportunityScore || 'N/A'}</span>
                        </div>
                        <span className="text-[0.75rem] text-slate-400 whitespace-nowrap overflow-hidden text-ellipsis">{item.post.authorHeadline || 'LinkedIn Member'}</span>
                        
                        {item.step && (
                          <span className="text-[0.7rem] text-indigo-400 bg-indigo-500/10 py-0.5 px-2 rounded w-fit">Step {item.step.order}: {item.step.stepName}</span>
                        )}

                        <div className="flex justify-between items-center border-t border-white/5 pt-2 mt-1">
                          <span className="text-[0.7rem] flex items-center gap-1 text-slate-500" style={{ fontSize: '0.62rem', background: 'var(--bg-secondary)', padding: '1px 4px', borderRadius: '2px' }}>
                            {item.status}
                          </span>
                          
                          {activeAlert && (
                            <span className={`text-[0.7rem] flex items-center gap-1 text-slate-500 ${activeAlert.style}`}>
                              <Calendar size={10} /> {activeAlert.label}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {list.length === 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px', color: 'var(--text-muted)', fontSize: '0.75rem', border: '1px dashed rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)' }}>
                      Empty stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Card Drawer Workspace */}
        <div className="bg-[#111726] border border-white/10 rounded-[10px] p-5 flex flex-col gap-4 min-h-0 overflow-y-auto card-glass" style={{ padding: '20px' }}>
          {activeItem ? (
            <div className="bg-[#111726] border border-white/10 rounded-[10px] p-5 flex flex-col gap-4 min-h-0 overflow-y-auto-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', height: '100%', minHeight: 0 }}>
              <div className="border-b border-white/5 pb-3">
                <span className="author-name" style={{ fontSize: '1.1rem', fontWeight: 700, display: 'block' }}>
                  {activeItem.post.authorName}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {activeItem.post.authorHeadline}
                </span>

                {/* Status Switcher modifier */}
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Status:</span>
                  <select 
                    value={activeItem.status}
                    onChange={(e) => handleUpdateStatus(e.target.value as DraftStatus)}
                    className="pipeline-select-field"
                  >
                    {allStatuses.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="drawer-scroll-body">
                {/* Stop Sequence Indicator Banner */}
                {activeItem.status === DraftStatus.REPLIED && (
                  <div className="stop-sequence-banner">
                    <AlertTriangle size={18} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
                    <div className="stop-banner-text">
                      <h5>Sequence Halted (Prospect Replied)</h5>
                      <p>Automated AI campaign triggers and future sequence follow-ups are cancelled. Any scheduled dates have been disabled.</p>
                    </div>
                  </div>
                )}

                {/* Post Preview details */}
                <div className="analysis-field">
                  <span className="label">Prospect LinkedIn Post</span>
                  <p style={{ fontSize: '0.78rem', background: 'rgba(0,0,0,0.15)', padding: '8px', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
                    {activeItem.post.postPreview}
                  </p>
                </div>

                {/* AI suggested outreach angle details */}
                {activeItem.post.analysis && (
                  <div className="analysis-field">
                    <span className="label">Suggested outreach angle</span>
                    <p style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)' }}>
                      {activeItem.post.analysis.suggestedOutreachAngle}
                    </p>
                  </div>
                )}

                {/* Outreach message editor composer */}
                <div className="analysis-field">
                  <span className="label">Outreach Message (Fully Editable)</span>
                  <textarea 
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    className="outreach-editor-textarea"
                    style={{ minHeight: '110px', fontSize: '0.8rem' }}
                  />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <button 
                      onClick={handleSaveComposerEdits}
                      disabled={actionLoading}
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.75rem', flex: 1, justifyContent: 'center' }}
                    >
                      Save Message Changes
                    </button>
                    {activeItem.status !== DraftStatus.SENT && activeItem.status !== DraftStatus.COMPLETED && (
                      <button 
                        onClick={handleConfirmSent}
                        disabled={actionLoading}
                        className="btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.75rem', flex: 1, justifyContent: 'center', background: 'var(--accent-indigo)' }}
                      >
                        Confirm Message Sent
                      </button>
                    )}
                  </div>
                </div>

                {/* Playbook step progression */}
                <div className="analysis-field" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                  <span className="label">Campaign Sequence Actions</span>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Current playbook: {activeItem.playbook?.name || 'Custom Sequence'}. 
                    {activeItem.step ? ` Step ${activeItem.step.order}: ${activeItem.step.stepName}` : ' No active campaign steps mapped.'}
                  </p>
                  
                  <button 
                    onClick={handleProgressSequence}
                    disabled={actionLoading || activeItem.status === DraftStatus.REPLIED}
                    className="btn-secondary"
                    style={{ width: '100%', justifyContent: 'center', fontSize: '0.78rem', padding: '8px' }}
                    title={activeItem.status === DraftStatus.REPLIED ? "Disabled: Sequence stopped because prospect replied." : "Generate outreach draft for the next step in this playbook"}
                  >
                    Progress to Next Step <ChevronRight size={14} />
                  </button>
                </div>

                {/* Schedule follow up date picker */}
                {activeItem.status !== DraftStatus.REPLIED && (
                  <div className="analysis-field" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                    <span className="label">Schedule Follow-Up Task</span>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <input 
                        type="date"
                        value={followUpDateInput}
                        onChange={(e) => setFollowUpDateInput(e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-[var(--text-primary)] text-[0.82rem] outline-none transition-all duration-200 w-full box-border placeholder:text-slate-400 focus:border-[var(--accent-indigo)] focus:shadow-[0_0_0_3px_rgba(0,208,156,0.15)] focus:bg-white"
                        style={{ fontSize: '0.8rem', padding: '4px 8px', flex: 1 }}
                      />
                      <button 
                        onClick={handleScheduleFollowUp}
                        disabled={actionLoading || !followUpDateInput}
                        className="btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                      >
                        Set Date
                      </button>
                    </div>
                    {activeItem.followUps.length > 0 && activeItem.followUps.some(f => f.status === 'PENDING') && (
                      <p style={{ fontSize: '0.7rem', color: 'var(--color-warning)', marginTop: '4px' }}>
                        📅 Task due on: {activeItem.followUps.find(f => f.status === 'PENDING')?.dueDate.toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
                {/* Google Meet Integration */}
                <div className="analysis-field" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                  <span className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} style={{ color: 'var(--accent-cyan)' }} /> Schedule Google Meet
                  </span>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Quickly generate a calendar invite pre-filled with the prospect's details.
                  </p>
                  <button 
                    onClick={() => {
                      const subject = encodeURIComponent(`Sync: Tiny Script & ${activeItem.post.companyName || activeItem.post.authorName}`);
                      const details = encodeURIComponent(`Meeting with ${activeItem.post.authorName}\n\nGenerated via BDOS Pipeline.`);
                      window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${subject}&details=${details}`, '_blank');
                    }}
                    className="btn-primary"
                    style={{ width: '100%', justifyContent: 'center', fontSize: '0.78rem', padding: '8px', background: 'var(--accent-cyan)' }}
                  >
                    Open Google Calendar & Meet
                  </button>
                </div>

                {/* Stop sequence manual reply simulation & AI Manual suggestions triggers */}
                <div className="analysis-field" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                  <span className="label">Simulate Prospect Reply (Test Rule)</span>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <input 
                      type="text"
                      placeholder="e.g. Yes, send it over next week."
                      value={replyTextSimulation}
                      onChange={(e) => setReplyTextSimulation(e.target.value)}
                      className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-[var(--text-primary)] text-[0.82rem] outline-none transition-all duration-200 w-full box-border placeholder:text-slate-400 focus:border-[var(--accent-indigo)] focus:shadow-[0_0_0_3px_rgba(0,208,156,0.15)] focus:bg-white"
                      style={{ fontSize: '0.8rem', padding: '4px 8px', flex: 1 }}
                    />
                    <button 
                      onClick={handleSimulateReply}
                      disabled={actionLoading || !replyTextSimulation.trim()}
                      className="btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '6px 12px', background: 'var(--color-danger-bg)', color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.2)' }}
                    >
                      Mock Reply
                    </button>
                  </div>

                  {activeItem.status === DraftStatus.REPLIED && (
                    <div style={{ marginTop: '10px' }}>
                      <button 
                        onClick={handleRequestReplySuggestion}
                        disabled={actionLoading}
                        className="btn-secondary"
                        style={{ width: '100%', justifyContent: 'center', fontSize: '0.75rem', padding: '6px' }}
                      >
                        Request AI Reply Suggestion (Explicit Command)
                      </button>

                      {aiSuggestionOutput && (
                        <div style={{ marginTop: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', padding: '8px', borderRadius: '4px' }}>
                          <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--accent-indigo)', display: 'block', marginBottom: '4px' }}>Suggested AI Response:</span>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{aiSuggestionOutput}</p>
                          <button 
                            onClick={() => {
                              setDraftText(aiSuggestionOutput);
                              setAiSuggestionOutput('');
                              triggerNotification('success', 'Response copied to editor composer.');
                            }}
                            className="btn-secondary"
                            style={{ padding: '2px 8px', fontSize: '0.65rem', marginTop: '6px' }}
                          >
                            Copy to Composer
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Audit history timeline logs list */}
                <div className="analysis-field" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                  <span className="label">Outreach Timeline Audit Trail</span>
                  <div className="history-timeline">
                    {activeItem.history.map((h, idx) => (
                      <div key={h.id || idx} className="timeline-event">
                        <div className={`timeline-dot ${idx === 0 ? 'active' : ''}`} />
                        <div className="event-top">
                          <span className="event-status">{h.status}</span>
                          <span className="event-time">{h.timestamp.toLocaleString()}</span>
                        </div>
                        {h.notes && <p className="event-notes">{h.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: '8px' }}>
              <TrendingUp size={32} style={{ strokeWidth: 1.2 }} />
              <p style={{ fontSize: '0.85rem' }}>Select a lead card from columns to check logs and perform sequence actions.</p>
            </div>
          )}
        </div>
        </div>
      )}
    </div>
  );
}
