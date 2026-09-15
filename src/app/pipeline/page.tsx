'use client';

import { createPortal } from 'react-dom';

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
  Calendar, 
  CheckCircle, 
  MessageSquare, 
  AlertTriangle, 
  Send, 
  ChevronRight, 
  FolderPlus, 
  Info,
  Sparkles,
  Copy,
  X
} from 'lucide-react';
import { DraftStatus } from '@prisma/client';
import { BreadcrumbHeader } from '@/components/navigation/BreadcrumbHeader';
import blob from '@/assets/blob.png';
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
        backgroundAttachment: 'fixed',
        minHeight: 'calc(100vh - 120px)'
      }}
    >
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
        .glass-panel {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 4px 24px -6px rgba(15, 23, 42, 0.05);
          border-radius: 12px;
        }
        .kanban-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px -2px rgba(15, 23, 42, 0.04);
        }
        .kanban-card:hover {
          border-color: #cbd5e1;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px -4px rgba(15, 23, 42, 0.08);
        }
        .kanban-card.active-card {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15), 0 8px 20px -4px rgba(15, 23, 42, 0.08);
        }
        .premium-input {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #0f172a;
          border-radius: 8px;
          font-size: 0.88rem;
          transition: all 0.2s ease;
          outline: none;
        }
        .premium-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
        }
        .modal-card {
          background: #ffffff;
          border-radius: 24px;
          box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.4), 0 0 0 1px rgba(15, 23, 42, 0.05);
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
        }
        .modal-header-accent {
          background: #ffffff;
          border-bottom: 1px solid #f1f5f9;
          padding: 32px 40px 24px 40px;
          position: relative;
        }
        .modal-body {
          padding: 32px 40px 40px 40px;
          gap: 32px;
          background: #fafaf9;
        }
        .section-label {
          font-size: 0.72rem;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .info-block {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px 20px;
          font-size: 0.88rem;
          color: #334155;
          line-height: 1.6;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.02);
        }
        .info-block.accent {
          background: linear-gradient(to right, #f0fdf4, #ffffff);
          border-left: 4px solid #10b981;
          color: #065f46;
        }
        .composer-box {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 12px -4px rgba(0,0,0,0.05);
        }
        .btn-gradient-primary {
          background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
          color: white;
          border: none;
          padding: 10px 24px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px -2px rgba(79, 70, 229, 0.3);
        }
        .btn-gradient-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px -4px rgba(79, 70, 229, 0.4);
        }
        .btn-gradient-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        .btn-elegant-secondary {
          background: #ffffff;
          color: #475569;
          border: 1px solid #cbd5e1;
          padding: 10px 24px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 1px 2px 0 rgba(15, 23, 42, 0.05);
        }
        .btn-elegant-secondary:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #94a3b8;
          color: #0f172a;
        }
        .btn-elegant-secondary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>

      {/* Notifications */}
      {notification && (
        <div className={`notification ${notification.type === 'success' ? 'success' : 'error'}`} style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '8px', background: notification.type === 'success' ? '#ecfdf5' : '#fef2f2', color: notification.type === 'success' ? '#059669' : '#dc2626', border: `1px solid ${notification.type === 'success' ? '#a7f3d0' : '#fecaca'}`, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}>
          {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{notification.message}</span>
        </div>
      )}

      {/* Connection Warning */}
      {dbWarning && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 500 }}>
          <Info size={18} />
          <span>Local database warning: No Postgres server on localhost. Running application under offline sandbox mode with simulated list states.</span>
        </div>
      )}

      {/* Top Navigation & Breadcrumb */}
      <BreadcrumbHeader
        currentTitle="Pipeline Stages & Outbound Sequences"
        badge="Deal Tracking"
      />

      {/* Stat Bubbles (Premium KPI Cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="premium-kpi-card" style={{ '--glow-color': 'rgba(59, 130, 246, 0.15)' } as React.CSSProperties}>
          <div className="kpi-glow"></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '50%', color: '#3b82f6', display: 'flex' }}>
                <FolderPlus size={16} strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Leads</span>
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{items.length}</div>
        </div>

        <div className="premium-kpi-card" style={{ '--glow-color': 'rgba(16, 185, 129, 0.15)' } as React.CSSProperties}>
          <div className="kpi-glow"></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#ecfdf5', padding: '10px', borderRadius: '50%', color: '#059669', display: 'flex' }}>
                <MessageSquare size={16} strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Conversations</span>
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{items.filter(i => ([DraftStatus.REPLIED, DraftStatus.MEETING, DraftStatus.PROPOSAL] as DraftStatus[]).includes(i.status)).length}</div>
        </div>

        <div className="premium-kpi-card" style={{ '--glow-color': 'rgba(245, 158, 11, 0.15)' } as React.CSSProperties}>
          <div className="kpi-glow"></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#fef3c7', padding: '10px', borderRadius: '50%', color: '#d97706', display: 'flex' }}>
                <Calendar size={16} strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Scheduled Tasks</span>
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{items.filter(i => i.followUps.some(f => f.status === 'PENDING')).length}</div>
        </div>

        <div className="premium-kpi-card" style={{ '--glow-color': 'rgba(139, 92, 246, 0.15)' } as React.CSSProperties}>
          <div className="kpi-glow"></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#f3e8ff', padding: '10px', borderRadius: '50%', color: '#9333ea', display: 'flex' }}>
                <CheckCircle size={16} strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Deals Closed</span>
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{items.filter(i => i.status === DraftStatus.WON).length}</div>
        </div>
      </div>

      {loading ? (
        <div style={{ margin: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '12px' }}>
          <div className="pulse-loader" style={{ borderColor: '#6366f1', width: '30px', height: '30px', borderRadius: '50%', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Loading pipeline stages...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, minHeight: 0 }}>
          
          {/* Selected Card Modal overlay */}
                    {activeItem && typeof document !== 'undefined' && createPortal(
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }} onClick={(e) => { if (e.target === e.currentTarget) setSelectedId(null) }}>
              <div className="modal-card" style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '1100px', height: '85vh' }}>
                <button onClick={() => setSelectedId(null)} style={{ position: 'absolute', top: '24px', right: '24px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <X size={18} color="#475569" />
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto' }}>
                  
                  {/* Premium Header */}
                  <div className="modal-header-accent" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
                        {activeItem.post.authorName}
                      </h3>
                      <p style={{ fontSize: '1rem', color: '#64748b', margin: 0, fontWeight: 500 }}>
                        {activeItem.post.authorHeadline}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '6px 16px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</span>
                      <select 
                        value={activeItem.status}
                        onChange={(e) => handleUpdateStatus(e.target.value as DraftStatus)}
                        style={{ padding: '4px 8px', fontWeight: 700, border: 'none', background: 'transparent', color: '#0f172a', cursor: 'pointer', outline: 'none', fontSize: '0.85rem' }}
                      >
                        {allStatuses.map(st => (
                          <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Main Content Body */}
                  <div className="modal-body" style={{ display: 'flex', flexDirection: 'column' }}>
                    
                    {activeItem.status === DraftStatus.REPLIED && (
                      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '20px', borderRadius: '12px', display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '24px' }}>
                        <div style={{ background: '#fee2e2', padding: '10px', borderRadius: '50%' }}>
                          <AlertTriangle size={24} style={{ color: '#dc2626' }} />
                        </div>
                        <div>
                          <h5 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#991b1b', margin: '0 0 6px 0' }}>Sequence Halted (Prospect Replied)</h5>
                          <p style={{ fontSize: '0.9rem', color: '#b91c1c', margin: 0, lineHeight: 1.5 }}>Automated AI campaign triggers and future sequence follow-ups are cancelled. Any scheduled dates have been disabled.</p>
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '40px' }}>
                      {/* Left Column: Context & Intelligence */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div>
                          <span className="section-label"><Info size={14} /> Prospect LinkedIn Post</span>
                          <div className="info-block">
                            {activeItem.post.postPreview}
                          </div>
                        </div>

                        {activeItem.post.analysis?.suggestedOutreachAngle && (
                          <div>
                            <span className="section-label"><Sparkles size={14} color="#10b981" /> Suggested Outreach Angle</span>
                            <div className="info-block accent">
                              {activeItem.post.analysis.suggestedOutreachAngle}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right Column: Actions & Communication */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        <div className="composer-box">
                          <span className="section-label"><MessageSquare size={14} /> Outreach Composer</span>
                          <textarea 
                            value={draftText}
                            onChange={(e) => setDraftText(e.target.value)}
                            className="premium-input"
                            style={{ minHeight: '160px', width: '100%', padding: '16px', resize: 'vertical', lineHeight: 1.6, fontSize: '0.9rem', marginBottom: '16px', background: '#ffffff', border: '1px solid #e2e8f0' }}
                          />
                          <div style={{ display: 'flex', gap: '12px' }}>
                            <button 
                              onClick={handleSaveComposerEdits}
                              disabled={actionLoading}
                              className="btn-elegant-secondary"
                              style={{ flex: 1 }}
                            >
                              Save Draft
                            </button>
                            {activeItem.status !== DraftStatus.SENT && activeItem.status !== DraftStatus.COMPLETED && (
                              <button 
                                onClick={handleConfirmSent}
                                disabled={actionLoading}
                                className="btn-gradient-primary"
                                style={{ flex: 1.5 }}
                              >
                                <Send size={16} style={{ display: 'inline', marginRight: '6px' }} /> Confirm Sent
                              </button>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <span className="section-label"><CheckCircle size={14} /> Campaign Sequence</span>
                            <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '16px', lineHeight: 1.5 }}>
                              Playbook: <strong style={{ color: '#0f172a' }}>{activeItem.playbook?.name || 'Custom'}</strong>. 
                              <br />
                              {activeItem.step ? `Step ${activeItem.step.order}: ${activeItem.step.stepName}` : 'No active steps.'}
                            </p>
                            
                            <button 
                              onClick={handleProgressSequence}
                              disabled={actionLoading || activeItem.status === DraftStatus.REPLIED}
                              className="btn-elegant-secondary"
                              style={{ width: '100%', fontSize: '0.85rem' }}
                            >
                              Next Step <ChevronRight size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
                            </button>
                          </div>

                          {activeItem.status !== DraftStatus.REPLIED && (
                            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                              <span className="section-label"><Calendar size={14} /> Schedule Follow-Up</span>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <input 
                                  type="date"
                                  value={followUpDateInput}
                                  onChange={(e) => setFollowUpDateInput(e.target.value)}
                                  className="premium-input"
                                  style={{ padding: '8px 12px' }}
                                />
                                <button 
                                  onClick={handleScheduleFollowUp}
                                  disabled={actionLoading || !followUpDateInput}
                                  className="btn-elegant-secondary"
                                  style={{ fontSize: '0.85rem' }}
                                >
                                  Set Date
                                </button>
                              </div>
                              {activeItem.followUps.length > 0 && activeItem.followUps.some(f => f.status === 'PENDING') && (
                                <p style={{ fontSize: '0.8rem', color: '#d97706', marginTop: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Calendar size={14} /> Due: {activeItem.followUps.find(f => f.status === 'PENDING')?.dueDate.toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', borderTop: '1px solid #e2e8f0', paddingTop: '40px' }}>
                      {/* Google Meet & Reply Sim */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        <div>
                          <span className="section-label"><Calendar size={14} style={{ color: '#0ea5e9' }} /> Quick Actions</span>
                          <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '16px', lineHeight: 1.5 }}>
                            Instantly generate a Google Calendar invite pre-filled with {activeItem.post.authorName}'s details for a quick sync.
                          </p>
                          <button 
                            onClick={() => {
                              const subject = encodeURIComponent(`Sync: Tiny Script & ${activeItem.post.companyName || activeItem.post.authorName}`);
                              const details = encodeURIComponent(`Meeting with ${activeItem.post.authorName}\n\nGenerated via BDOS Pipeline.`);
                              window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${subject}&details=${details}`, '_blank');
                            }}
                            className="btn-gradient-primary"
                            style={{ width: '100%', background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)' }}
                          >
                            Open Google Calendar & Meet
                          </button>
                        </div>

                        <div>
                          <span className="section-label"><Info size={14} /> Testing & Simulation</span>
                          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '12px' }}>Test the sequence halting rule by simulating a reply.</p>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <input 
                                type="text"
                                placeholder="e.g. Yes, let's talk next week."
                                value={replyTextSimulation}
                                onChange={(e) => setReplyTextSimulation(e.target.value)}
                                className="premium-input"
                                style={{ padding: '8px 12px', flex: 1 }}
                              />
                              <button 
                                onClick={handleSimulateReply}
                                disabled={actionLoading || !replyTextSimulation.trim()}
                                style={{ padding: '8px 16px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: actionLoading || !replyTextSimulation.trim() ? 'not-allowed' : 'pointer', opacity: actionLoading || !replyTextSimulation.trim() ? 0.6 : 1, transition: 'all 0.2s' }}
                              >
                                Mock Reply
                              </button>
                            </div>
                          </div>

                          {activeItem.status === DraftStatus.REPLIED && (
                            <div style={{ marginTop: '20px' }}>
                              <button 
                                onClick={handleRequestReplySuggestion}
                                disabled={actionLoading}
                                className="btn-elegant-secondary"
                                style={{ width: '100%' }}
                              >
                                <Sparkles size={16} style={{ color: '#8b5cf6', marginRight: '6px', display: 'inline', verticalAlign: 'middle' }} /> Request AI Reply Suggestion
                              </button>

                              {aiSuggestionOutput && (
                                <div style={{ marginTop: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '12px' }}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#6366f1', display: 'block', marginBottom: '12px' }}>AI Suggested Response:</span>
                                  <p style={{ fontSize: '0.9rem', color: '#334155', whiteSpace: 'pre-wrap', margin: '0 0 16px 0', lineHeight: 1.6 }}>{aiSuggestionOutput}</p>
                                  <button 
                                    onClick={() => {
                                      setDraftText(aiSuggestionOutput);
                                      setAiSuggestionOutput('');
                                      triggerNotification('success', 'Response copied to editor composer.');
                                    }}
                                    className="btn-elegant-secondary"
                                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                  >
                                    <Copy size={16} /> Copy to Composer
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Timeline */}
                      <div>
                        <span className="section-label">Outreach Timeline Audit Trail</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                          {activeItem.history.map((h, idx) => (
                            <div key={h.id || idx} style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: idx === 0 ? '#6366f1' : '#cbd5e1', border: '2px solid #ffffff', boxShadow: '0 0 0 1px #e2e8f0', zIndex: 2 }} />
                                {idx !== activeItem.history.length - 1 && <div style={{ width: '2px', flex: 1, background: '#e2e8f0', margin: '4px 0' }} />}
                              </div>
                              <div style={{ paddingBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>{h.status.replace(/_/g, ' ')}</span>
                                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>{h.timestamp.toLocaleString()}</span>
                                </div>
                                {h.notes && <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>{h.notes}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Kanban Board Grid (Bottom) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', overflowX: 'auto', alignContent: 'stretch', alignItems: 'stretch', flex: 1, minHeight: 0 }}>
            {(['drafts', 'outbound', 'chats', 'outcomes'] as const).map(column => {
              const list = getColItems(column);
              return (
                <div key={column} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', height: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(148,163,184,0.3)', paddingBottom: '12px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'capitalize' }}>
                      {getColIcon(column)} {column}
                    </span>
                    <span style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                      {list.length}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
                    {list.map(item => {
                      const activeAlert = getFollowUpStatusLabel(item);
                      return (
                        <div 
                          key={item.id} 
                          onClick={() => handleSelectCard(item.id)}
                          className={`kanban-card ${item.id === selectedId ? 'active-card' : ''}`}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>{item.post.authorName}</span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: '#ecfdf5', color: '#059669' }}>
                              {item.post.opportunityScore || 'N/A'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '8px' }}>
                            {item.post.authorHeadline || 'LinkedIn Member'}
                          </div>
                          
                          {item.step && (
                            <div style={{ fontSize: '0.7rem', color: '#4f46e5', background: '#e0e7ff', padding: '3px 8px', borderRadius: '4px', display: 'inline-block', fontWeight: 600, marginBottom: '8px' }}>
                              Step {item.step.order}: {item.step.stepName}
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#475569', background: '#f8fafc', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0', textTransform: 'uppercase' }}>
                              {item.status.replace(/_/g, ' ')}
                            </span>
                            
                            {activeAlert && (
                              <span style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', color: activeAlert.style === 'overdue' ? '#dc2626' : (activeAlert.style === 'due' ? '#d97706' : '#64748b'), fontWeight: 600 }}>
                                <Calendar size={12} /> {activeAlert.label}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {list.length === 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px', color: '#94a3b8', fontSize: '0.8rem', border: '1px dashed #cbd5e1', borderRadius: '8px', fontWeight: 500 }}>
                        Empty stage
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
