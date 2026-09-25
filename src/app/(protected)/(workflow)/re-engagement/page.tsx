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
    <div 
      className="flex flex-col h-screen overflow-hidden box-border bg-cover bg-right-top bg-no-repeat bg-fixed"
      style={{ backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.6), rgba(248, 250, 252, 0.6)), url(${blob.src})` }}
    >
      
      {/* Notifications */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-[999999] bg-white text-slate-800 border-2 px-5 py-3.5 rounded-xl shadow-[0_12px_32px_rgba(99,102,241,0.2)] flex items-center gap-2.5 text-[0.9rem] font-bold ${notification.type === 'success' ? 'border-indigo-500' : 'border-amber-500'}`}>
          {notification.type === 'success' ? <CheckCircle size={20} className="text-indigo-500" /> : <AlertTriangle size={20} className="text-amber-500" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* HEADER BANNER - CLEAN DESIGN */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-200 h-[65px] shrink-0 px-7 bg-white">
        <div className="flex items-center gap-3.5">
          <div className="bg-gradient-to-br from-indigo-500 to-blue-500 p-2.5 rounded-lg shadow-[0_4px_16px_rgba(99,102,241,0.3)]">
            <Calendar size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-[1.3rem] font-extrabold bg-gradient-to-br from-slate-900 to-blue-500 bg-clip-text text-transparent m-0">
              Automated Re-engagement Sequences
            </h1>
            <p className="text-[0.8rem] text-slate-400 font-semibold tracking-wide mt-1 m-0">
              Scan social feeds, track buying intent, and orchestrate automated multi-channel follow-ups
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-[0.72rem] bg-indigo-50/50 text-indigo-600 border border-indigo-200/50 px-3 py-1.5 rounded-lg font-extrabold">
            {events.filter(e => e.approvalStatus === ApprovalStatus.PENDING).length} Follow-ups Pending Review 🔔
          </div>
        </div>
      </div>
      
      {/* SCROLLABLE MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto flex flex-col relative">
      <WorkflowGuide activeStep={6} />
      
      <div className="px-7 pt-4 pb-6 flex flex-col gap-5 flex-1">
        {/* Top Navigation & Breadcrumb */}
        <BreadcrumbHeader
          currentTitle="Automated Re-engagement Sequences"
          stepNumber={6}
          totalSteps={7}
          badge="Follow-up Schedules"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0 flex-1">
        {/* Left Opportunity Master Panel */}
        <div className="lg:col-span-4 flex flex-col gap-4 min-h-0">
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h3 className="text-[0.95rem] font-bold text-slate-800 m-0">Re-engagement Alerts</h3>
              <span className="text-[0.72rem] bg-slate-100 text-slate-500 font-bold py-1 px-2.5 rounded-lg border border-slate-200">
                {events.filter(e => e.approvalStatus === ApprovalStatus.PENDING).length} pending
              </span>
            </div>
            
            <button 
              onClick={handleRunScan}
              disabled={scanLoading}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm hover:bg-slate-800 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={14} className={scanLoading ? 'animate-spin' : ''} />
              {scanLoading ? 'Checking Feeds...' : 'Scan Feeds for Buying Signals'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 custom-scrollbar">
            {pageLoading ? (
              <div className="m-auto flex flex-col items-center justify-center h-[150px]">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              </div>
            ) : events.map(ev => (
              <div 
                key={ev.id}
                onClick={() => handleSelectCard(ev.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  ev.id === selectedId 
                    ? 'bg-indigo-50/50 border-indigo-300 shadow-[0_4px_16px_rgba(99,102,241,0.1)]' 
                    : 'bg-white/70 border-slate-200/80 hover:border-indigo-200 hover:shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start mb-1.5">
                  <span className={`text-[0.85rem] font-bold ${ev.id === selectedId ? 'text-indigo-900' : 'text-slate-800'}`}>{ev.prospectName}</span>
                  <span className={`text-[0.65rem] font-black px-2 py-0.5 rounded-md uppercase tracking-wide border ${
                    ev.approvalStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                    ev.approvalStatus === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                    'bg-slate-50 text-slate-500 border-slate-200'
                  }`}>
                    {ev.approvalStatus}
                  </span>
                </div>
                <p className="text-[0.72rem] text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis m-0">
                  {ev.newBuyingSignal}
                </p>
                <div className="flex justify-between items-center text-[0.65rem] mt-2.5">
                  <span className="text-slate-400 font-medium">Detected: {ev.detectionDate.toLocaleDateString()}</span>
                  <span className="text-blue-500 font-bold flex items-center gap-1"><Sparkles size={10} /> Signal match</span>
                </div>
              </div>
            ))}

            {!pageLoading && events.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[200px] text-slate-400 gap-2 border-2 border-dashed border-slate-200 rounded-2xl bg-white/40">
                <Sparkles size={24} className="text-indigo-400 stroke-[1.5]" />
                <p className="text-[0.8rem] font-bold m-0">No re-engagement events found. Run a new scan.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Detail Workspace Drawer */}
        <div className="lg:col-span-8 bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col min-h-0">
          {activeEvent ? (
            <div className="flex flex-col gap-5 h-full min-h-0">
              <div className="border-b border-slate-100 pb-4 shrink-0">
                <span className="text-[1.2rem] font-extrabold text-slate-900 block mb-1">
                  {activeEvent.prospectName}
                </span>
                <span className="text-[0.8rem] text-slate-500 font-medium flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div> {activeEvent.outreachDraft?.post.authorHeadline || 'Previously Contacted Lead'}
                </span>
              </div>

              <div className="flex-1 flex flex-col gap-5 min-h-0">
                <div className="overflow-y-auto flex-1 flex flex-col gap-5 pr-2 custom-scrollbar">
                
                {/* 1. Comparison Box: Old Context vs New signal */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-2">
                    <span className="text-[0.65rem] uppercase tracking-wider font-bold text-slate-400 mb-1">Previous Outreach Draft</span>
                    <p className="text-[0.8rem] text-slate-600 italic m-0 flex-1">
                      &quot;{activeEvent.outreachDraft?.editedDraft || activeEvent.outreachDraft?.originalAiDraft || 'No record'}&quot;
                    </p>
                    {activeEvent.outreachDraft && (
                      <span className="text-[0.65rem] font-bold text-indigo-500 mt-2 block">
                        Playbook: {activeEvent.outreachDraft.playbook?.name || 'Sequence'}
                      </span>
                    )}
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200/60 rounded-xl p-4 flex flex-col gap-2 shadow-[inset_0_0_20px_rgba(59,130,246,0.03)]">
                    <span className="text-[0.65rem] uppercase tracking-wider font-bold text-blue-500 mb-1 flex items-center gap-1.5">
                      <Sparkles size={12} /> New Detected Buying Signal
                    </span>
                    <p className="text-[0.85rem] font-bold text-slate-800 m-0 flex-1 leading-snug">
                      {activeEvent.newBuyingSignal}
                    </p>
                    <span className="text-[0.65rem] font-extrabold text-blue-600 mt-2 flex items-center gap-1">
                      <Calendar size={11} /> Live Intent Match
                    </span>
                  </div>
                </div>

                {/* 2. Analysis of contexts */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                  <span className="block text-[0.7rem] font-black text-slate-500 mb-2.5 uppercase tracking-wider">Signal Analysis & Context</span>
                  <p className="text-[0.82rem] text-slate-600 m-0 leading-relaxed">
                    {activeEvent.analysis}
                  </p>
                </div>

                {/* 3. Suggested Draft (Composer) */}
                <div className="flex flex-col flex-1 min-h-[200px]">
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="text-[0.85rem] font-extrabold text-slate-800">AI Re-Engagement Follow-Up Draft</span>
                    <span className="text-[0.7rem] bg-amber-50 text-amber-600 border border-amber-200 px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5">
                      <AlertTriangle size={12} /> Human approval required
                    </span>
                  </div>
                  <textarea 
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    className="flex-1 min-h-[150px] text-[0.9rem] p-4 rounded-xl border border-slate-200 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] resize-none leading-relaxed bg-white text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10 transition-all custom-scrollbar"
                  />
                </div>
                </div>

                {/* Actions - Pinned to bottom */}
                <div className="flex gap-3 pt-4 border-t border-slate-100 mt-auto shrink-0 flex-wrap">
                  <button 
                    onClick={handleSaveEdits}
                    disabled={actionLoading}
                    className="flex-1 bg-white text-slate-700 font-bold border border-slate-200 py-2.5 px-4 rounded-xl hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Draft Edits
                  </button>

                  {activeEvent.approvalStatus === ApprovalStatus.PENDING && (
                    <>
                      <button 
                        onClick={handleDismissReEngagement}
                        disabled={actionLoading}
                        className="flex items-center justify-center gap-2 bg-red-50 text-red-500 font-bold border border-red-200 py-2.5 px-5 rounded-xl hover:bg-red-100 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <XCircle size={16} /> Dismiss
                      </button>

                      <button 
                        onClick={handleApproveReEngagement}
                        disabled={actionLoading || !draftText.trim()}
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-bold py-2.5 px-5 rounded-xl shadow-[0_4px_14px_rgba(16,185,129,0.3)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        <CheckCircle size={16} /> Approve & Queue Dispatch
                      </button>
                    </>
                  )}
                </div>

              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
              <ArrowRight size={36} className="text-slate-300 stroke-[1.5]" />
              <p className="text-[0.9rem] font-medium m-0 text-center max-w-[250px]">Select an alert from the left column to check history and approve follow-up draft notes.</p>
            </div>
          )}
        </div>
        </div>
      </div>
      </div>
    </div>
  );
}
