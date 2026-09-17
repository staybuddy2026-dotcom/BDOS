'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  getReEngagementEvents, 
  scanForReEngagements, 
  updateReEngagementStatus,
  ReEngagementData
} from '@/features/reengagement/actions';
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  ArrowRight,
  Calendar,
  Sparkles
} from 'lucide-react';
import { ApprovalStatus } from '@prisma/client';
import { BreadcrumbHeader } from '@/components/navigation/BreadcrumbHeader';
import blob from '@/assets/blob.png';
import { WorkflowGuide } from '@/components/WorkflowGuide';
import '@/styles/globals.css';
import '@/styles/re-engagement.css';

export default function ReEngagementPage() {
  const [events, setEvents] = useState<ReEngagementData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [scanLoading, setScanLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Composer fields
  const [draftText, setDraftText] = useState('');

  // Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const triggerNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Load list
  const loadData = useCallback(async (selectFirst = true) => {
    try {
      const data = await getReEngagementEvents();
      // Cast dates
      const casted: ReEngagementData[] = data.map(ev => ({
        ...ev,
        detectionDate: new Date(ev.detectionDate)
      }));

      setEvents(casted);
      if (casted.length > 0) {
        if (selectFirst) {
          setSelectedId(casted[0].id);
          setDraftText(casted[0].generatedDraft || '');
        } else {
          // Keep active selected if it exists
          const stillExists = casted.find(c => c.id === selectedId);
          if (stillExists) {
            setDraftText(stillExists.generatedDraft || '');
          } else {
            setSelectedId(casted[0].id);
            setDraftText(casted[0].generatedDraft || '');
          }
        }
      } else {
        setSelectedId(null);
        setDraftText('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPageLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const activeEvent = events.find(e => e.id === selectedId) || null;

  const handleSelectCard = (id: string) => {
    setSelectedId(id);
    const ev = events.find(e => e.id === id);
    if (ev) {
      setDraftText(ev.generatedDraft || '');
    } else {
      setDraftText('');
    }
  };

  // 1. Scan trigger
  const handleRunScan = async () => {
    setScanLoading(true);
    try {
      const res = await scanForReEngagements();
      triggerNotification('success', `Scan complete. Found ${res.count} potential buying signal opportunities.`);
      await loadData(false);
    } catch (err: any) {
      if (err.message === 'APOLLO_RATE_LIMIT') {
        triggerNotification('error', 'Apollo API rate limit reached. Try again later.');
      } else {
        triggerNotification('error', 'Failed to scan for signals. Check API config.');
      }
    } finally {
      setScanLoading(false);
    }
  };

  // 2. Action: Approve Draft
  const handleApproveReEngagement = async () => {
    if (!activeEvent) return;
    setActionLoading(true);
    try {
      await updateReEngagementStatus(activeEvent.id, ApprovalStatus.APPROVED, draftText);
      setEvents(prev => prev.map(ev => {
        if (ev.id === activeEvent.id) {
          return { ...ev, approvalStatus: ApprovalStatus.APPROVED, generatedDraft: draftText };
        }
        return ev;
      }));
      triggerNotification('success', 'Re-engagement outreach draft approved.');
    } catch {
      // Local fallback
      setEvents(prev => prev.map(ev => {
        if (ev.id === activeEvent.id) {
          return { ...ev, approvalStatus: ApprovalStatus.APPROVED, generatedDraft: draftText };
        }
        return ev;
      }));
      triggerNotification('success', 'Approved locally (Database Connection Warning).');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Action: Dismiss/Reject Event
  const handleDismissReEngagement = async () => {
    if (!activeEvent) return;
    setActionLoading(true);
    try {
      await updateReEngagementStatus(activeEvent.id, ApprovalStatus.DISMISSED);
      setEvents(prev => prev.map(ev => {
        if (ev.id === activeEvent.id) {
          return { ...ev, approvalStatus: ApprovalStatus.DISMISSED };
        }
        return ev;
      }));
      triggerNotification('success', 'Opportunity dismissed.');
    } catch {
      setEvents(prev => prev.map(ev => {
        if (ev.id === activeEvent.id) {
          return { ...ev, approvalStatus: ApprovalStatus.DISMISSED };
        }
        return ev;
      }));
      triggerNotification('success', 'Dismissed locally.');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Action: Save Edits
  const handleSaveEdits = async () => {
    if (!activeEvent) return;
    setActionLoading(true);
    try {
      await updateReEngagementStatus(activeEvent.id, activeEvent.approvalStatus, draftText);
      setEvents(prev => prev.map(ev => {
        if (ev.id === activeEvent.id) {
          return { ...ev, generatedDraft: draftText };
        }
        return ev;
      }));
      triggerNotification('success', 'Changes saved.');
    } catch {
      setEvents(prev => prev.map(ev => {
        if (ev.id === activeEvent.id) {
          return { ...ev, generatedDraft: draftText };
        }
        return ev;
      }));
      triggerNotification('success', 'Edits saved locally.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="dashboard-page" style={{ 
      display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', gap: 0, paddingBottom: 0, boxSizing: 'border-box',
      backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.6), rgba(248, 250, 252, 0.6)), url(${blob.src})`,
      backgroundSize: 'cover', backgroundPosition: 'top right', backgroundRepeat: 'no-repeat', backgroundAttachment: 'fixed'
    }}>
      
      {/* Notifications */}
      {notification && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 999999, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: `2px solid ${notification.type === 'success' ? 'var(--accent-indigo)' : 'var(--color-warning)'}`, padding: '14px 22px', borderRadius: '12px', boxShadow: '0 12px 32px rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', fontWeight: 700 }}>
          {notification.type === 'success' ? <CheckCircle size={20} style={{ color: 'var(--accent-indigo)' }} /> : <AlertTriangle size={20} style={{ color: 'var(--color-warning)' }} />}
          <span>{notification.message}</span>
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
          <div style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)', padding: '10px', borderRadius: '8px', boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)' }}>
            <Calendar size={18} style={{ color: 'var(--bg-primary)' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, background: 'linear-gradient(135deg, #0f172a, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
              Automated Re-engagement Sequences
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#8ba0cb', fontWeight: 600, letterSpacing: '0.03em', marginTop: '4px', margin: 0 }}>
              Scan social feeds, track buying intent, and orchestrate automated multi-channel follow-ups
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '0.72rem', background: 'var(--accent-indigo-glow)', color: 'var(--accent-indigo)', border: '1px solid var(--border-focus)', padding: '6px 12px', borderRadius: '8px', fontWeight: 800 }}>
            {events.filter(e => e.approvalStatus === ApprovalStatus.PENDING).length} Follow-ups Pending Review 🔔
          </div>
        </div>
      </div>
      
      <WorkflowGuide activeStep={6} />

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
          position: 'relative'
        }}
      >
        {/* Top Navigation & Breadcrumb */}
        <BreadcrumbHeader
          currentTitle="Automated Re-engagement Sequences"
          stepNumber={6}
          totalSteps={7}
          badge="Follow-up Schedules"
        />

        <div className="reengagement-workspace">
        {/* Left Opportunity Master Panel */}
        <div className="reengagement-list-panel">
          <div className="panel-header card-glass" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Re-engagement Alerts</h3>
              <span className="text-[0.72rem] bg-white/5 py-0.5 px-2 rounded text-slate-400 font-semibold" style={{ background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>
                {events.filter(e => e.approvalStatus === ApprovalStatus.PENDING).length} pending
              </span>
            </div>
            
            <button 
              onClick={handleRunScan}
              disabled={scanLoading}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', gap: '8px' }}
            >
              <RefreshCw size={14} className={scanLoading ? 'animate-spin' : ''} />
              {scanLoading ? 'Checking Feeds...' : 'Scan Feeds for Buying Signals'}
            </button>
          </div>

          <div className="reengagement-items-scroll">
            {pageLoading ? (
              <div className="loader-spinner-wrapper" style={{ margin: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '150px' }}>
                <div className="pulse-loader" style={{ borderColor: 'var(--accent-indigo)' }} />
              </div>
            ) : events.map(ev => (
              <div 
                key={ev.id}
                onClick={() => handleSelectCard(ev.id)}
                className={`reengagement-card-item card-glass ${ev.id === selectedId ? 'active-item' : ''}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{ev.prospectName}</span>
                  <span className={`badge-reengage ${ev.approvalStatus.toLowerCase()}`}>
                    {ev.approvalStatus}
                  </span>
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {ev.newBuyingSignal}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  <span>Detected: {ev.detectionDate.toLocaleDateString()}</span>
                  <span style={{ color: 'var(--accent-cyan)' }}>Signal match</span>
                </div>
              </div>
            ))}

            {!pageLoading && events.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-muted)', gap: '8px', border: '2px dashed var(--border-subtle)', borderRadius: '12px', background: 'var(--bg-card)' }}>
                <Sparkles size={24} style={{ strokeWidth: 1.5, color: 'var(--accent-indigo)' }} />
                <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>No re-engagement events found. Run a new scan.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Detail Workspace Drawer */}
        <div className="reengagement-detail-panel card-glass" style={{ padding: '20px' }}>
          {activeEvent ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', height: '100%', minHeight: 0 }}>
              <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                <span className="author-name" style={{ fontSize: '1.1rem', fontWeight: 700, display: 'block' }}>
                  {activeEvent.prospectName}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {activeEvent.outreachDraft?.post.authorHeadline || 'Previously Contacted Lead'}
                </span>
              </div>

              <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', paddingRight: '4px' }}>
                
                {/* 1. Comparison Box: Old Context vs New signal */}
                <div className="comparison-box">
                  <div className="comparison-card">
                    <span className="card-title-lbl">Previous Outreach Draft</span>
                    <p style={{ fontStyle: 'italic' }}>
                      &quot;{activeEvent.outreachDraft?.editedDraft || activeEvent.outreachDraft?.originalAiDraft || 'No record'}&quot;
                    </p>
                    {activeEvent.outreachDraft && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--accent-indigo)', marginTop: 'auto' }}>
                        Playbook: {activeEvent.outreachDraft.playbook?.name || 'Sequence'}
                      </span>
                    )}
                  </div>

                  <div className="comparison-card highlight">
                    <span className="card-title-lbl" style={{ color: 'var(--accent-cyan)' }}>New Detected Buying Signal</span>
                    <p>{activeEvent.newBuyingSignal}</p>
                    <span style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: 'auto' }}>
                      <Calendar size={10} /> whitelisted alert matched
                    </span>
                  </div>
                </div>

                {/* 2. Analysis of contexts */}
                <div className="analysis-field">
                  <span className="label">Re-Engagement Signal Analysis</span>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {activeEvent.analysis}
                  </p>
                </div>

                {/* 3. Suggested Draft (Composer) */}
                <div className="analysis-field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span className="label">Suggested Re-Engagement Follow-Up Draft</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-warning)' }}>
                      Never automatically sent (Human approval required)
                    </span>
                  </div>
                  <textarea 
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    className="outreach-editor-textarea"
                    style={{ minHeight: '130px', fontSize: '0.8rem' }}
                  />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '10px', marginTop: 'var(--space-xs)' }}>
                  <button 
                    onClick={handleSaveEdits}
                    disabled={actionLoading}
                    className="btn-secondary"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Save Draft Edits
                  </button>

                  {activeEvent.approvalStatus === ApprovalStatus.PENDING && (
                    <>
                      <button 
                        onClick={handleDismissReEngagement}
                        disabled={actionLoading}
                        className="btn-danger-outline"
                        style={{ justifyContent: 'center', gap: '6px' }}
                      >
                        <XCircle size={14} /> Dismiss Opportunity
                      </button>

                      <button 
                        onClick={handleApproveReEngagement}
                        disabled={actionLoading || !draftText.trim()}
                        className="btn-primary"
                        style={{ flex: 1, justifyContent: 'center', gap: '6px' }}
                      >
                        <CheckCircle size={14} /> Approve Draft
                      </button>
                    </>
                  )}
                </div>

              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: '8px' }}>
              <ArrowRight size={32} style={{ strokeWidth: 1.2 }} />
              <p style={{ fontSize: '0.85rem' }}>Select an alert from the left column to check history and approve follow-up draft notes.</p>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
