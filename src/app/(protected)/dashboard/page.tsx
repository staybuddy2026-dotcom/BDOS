'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import blob from '@/assets/blob.png';
import {
  getBdeCommandCenterData,
  BdeCommandCenterData,
  updateBdeTaskStatus,
  updateMeetingStatus,
  scheduleNewMeeting,
  updateProposalStage,
  createProposal,
  createBdeTask
} from '@/features/command-center/actions';
import { getMorningCommandCenterAction } from '@/features/refinement/actions';
import { MorningDashboard } from '@/components/refinement/MorningDashboard';
import { MorningCommandMetrics } from '@/features/refinement/types';
import {
  Sparkles,
  Search,
  Briefcase,
  Inbox,
  Calendar,
  FileText,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Clock,
  ArrowRight,
  Zap,
  RotateCcw,
  Target,
  Trophy,
  DollarSign,
  ChevronRight,
  Bell,
  Activity,
  Video,
  Plus,
  X,
  Mail
} from 'lucide-react';
import { CustomDropdown } from '@/components/CustomDropdown';
import Link from 'next/link';
import '@/styles/globals.css';
import '@/styles/dashboard.css';

function getActivityVisuals(type: string) {
  switch (type) {
    case 'Deal Won':
      return {
        icon: <Trophy size={14} />,
        bg: '#ecfdf5',
        color: '#10b981',
        borderColor: '#a7f3d0',
        badgeBg: '#d1fae5',
        badgeColor: '#065f46',
      };
    case 'Proposal Sent':
      return {
        icon: <FileText size={14} />,
        bg: '#f5f3ff',
        color: '#8b5cf6',
        borderColor: '#ddd6fe',
        badgeBg: '#ede9fe',
        badgeColor: '#5b21b6',
      };
    case 'Meeting Scheduled':
      return {
        icon: <Calendar size={14} />,
        bg: '#eff6ff',
        color: '#2563eb',
        borderColor: '#bfdbfe',
        badgeBg: '#dbeafe',
        badgeColor: '#1e40af',
      };
    case 'Email Sent':
      return {
        icon: <Mail size={14} />,
        bg: '#fffbeb',
        color: '#f59e0b',
        borderColor: '#fde68a',
        badgeBg: '#fef3c7',
        badgeColor: '#92400e',
      };
    case 'Task Completed':
      return {
        icon: <CheckCircle size={14} />,
        bg: '#f0fdfa',
        color: '#0d9488',
        borderColor: '#99f6e4',
        badgeBg: '#ccfbf1',
        badgeColor: '#115e59',
      };
    case 'Apollo Research':
      return {
        icon: <Sparkles size={14} />,
        bg: '#fdf4ff',
        color: '#d946ef',
        borderColor: '#f5d0fe',
        badgeBg: '#fae8ff',
        badgeColor: '#86198f',
      };
    case 'LinkedIn Discovery':
    default:
      return {
        icon: <Search size={14} />,
        bg: '#eef2ff',
        color: '#4f46e5',
        borderColor: '#c7d2fe',
        badgeBg: '#e0e7ff',
        badgeColor: '#3730a3',
      };
  }
}

function ProposalStageDropdown({ 
  currentStage, 
  currentStyle, 
  onChange 
}: { 
  currentStage: string, 
  currentStyle: { bg: string, text: string, border: string },
  onChange: (newStage: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const stages = ['Draft', 'Sent', 'Viewed', 'Negotiation', 'Won', 'Lost'];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          fontSize: '0.72rem',
          padding: '4px 10px',
          borderRadius: '6px',
          background: currentStyle.bg,
          color: currentStyle.text,
          border: currentStyle.border,
          fontWeight: 800,
          textTransform: 'uppercase',
          cursor: 'pointer',
          outline: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'all 0.3s ease'
        }}
      >
        {currentStage}
        <ChevronRight size={12} style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }} />
      </button>

      <div style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        marginTop: '6px',
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        zIndex: 50,
        opacity: isOpen ? 1 : 0,
        visibility: isOpen ? 'visible' : 'hidden',
        transform: isOpen ? 'translateY(0)' : 'translateY(-8px)',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        minWidth: '130px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {stages.map(stage => (
          <div
            key={stage}
            onClick={() => {
              onChange(stage);
              setIsOpen(false);
            }}
            style={{
              padding: '8px 12px',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: currentStage === stage ? currentStyle.text : '#475569',
              background: currentStage === stage ? currentStyle.bg : 'transparent',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => { if(currentStage !== stage) e.currentTarget.style.background = '#f8fafc' }}
            onMouseLeave={(e) => { if(currentStage !== stage) e.currentTarget.style.background = 'transparent' }}
          >
            {stage}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BdeCommandCenterHome() {
  const [data, setData] = useState<BdeCommandCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTaskTab, setActiveTaskTab] = useState<'Today' | 'Overdue' | 'Upcoming' | 'Completed'>('Today');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [morningMetrics, setMorningMetrics] = useState<MorningCommandMetrics | null>(null);

  // Activity Timeline Filter State
  const [timelineFilter, setTimelineFilter] = useState<'All' | 'Deals' | 'Meetings' | 'Proposals' | 'Leads' | 'Outreach'>('All');

  // Task Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'HIGH' | 'NORMAL' | 'LOW'>('NORMAL');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskLinkedOpportunity, setNewTaskLinkedOpportunity] = useState('');
  const [newTaskAssignedOwner, _setNewTaskAssignedOwner] = useState('Akash (Lead BDE)');

  // Schedule Meeting Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingClient, setNewMeetingClient] = useState('');
  const [newMeetingCompany, setNewMeetingCompany] = useState('');
  const [newMeetingEmail, setNewMeetingEmail] = useState('');
  const [newMeetingType, setNewMeetingType] = useState<'Discovery Call' | 'Demo' | 'Proposal Review' | 'Follow-up Reminder'>('Discovery Call');
  const [newMeetingTime, setNewMeetingTime] = useState('14:00');

  // Proposal Modal State
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [newPropTitle, setNewPropTitle] = useState('');
  const [newPropClient, setNewPropClient] = useState('');
  const [newPropCompany, setNewPropCompany] = useState('');
  const [newPropBudget, setNewPropBudget] = useState('$50,000');
  const [newPropStage, setNewPropStage] = useState<'Draft' | 'Sent' | 'Viewed' | 'Negotiation' | 'Won' | 'Lost'>('Draft');

  const triggerNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadCommandCenter = useCallback(async () => {
    setLoading(true);
    try {
      const [telemetry, morning] = await Promise.all([
        getBdeCommandCenterData(),
        getMorningCommandCenterAction(),
      ]);
      setData(telemetry);
      setMorningMetrics(morning);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load Command Center telemetry.';
      triggerNotification('error', msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function run() {
      if (!active) return;
      await loadCommandCenter();
    }
    run();
    return () => { active = false; };
  }, [loadCommandCenter]);

  // Handle task status toggle with live DB persistence & optimistic UI
  const handleToggleTaskStatus = async (taskId: string) => {
    if (!data) return;
    const targetTask = data.tasks.find(t => t.id === taskId);
    if (!targetTask) return;

    const previousStatus = targetTask.status;
    const nextStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' = previousStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';

    // Optimistic UI state update
    const updatedTasks = data.tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          status: nextStatus,
          dueCategory: nextStatus === 'COMPLETED' ? ('Completed' as const) : t.dueCategory,
        };
      }
      return t;
    });
    setData({ ...data, tasks: updatedTasks });

    try {
      const result = await updateBdeTaskStatus(taskId, nextStatus);
      if (result.success) {
        triggerNotification(
          'success',
          nextStatus === 'COMPLETED' ? 'Task completed and saved to database.' : 'Task reopened and updated in database.'
        );
        if (result.task) {
          setData(prev => {
            if (!prev) return null;
            return {
              ...prev,
              tasks: prev.tasks.map(t => (t.id === taskId ? result.task! : t)),
            };
          });
        }
      } else {
        throw new Error(result.error || 'Database rejected task update.');
      }
    } catch (err: unknown) {
      // Revert optimistic update on database error
      setData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          tasks: prev.tasks.map(t => (t.id === taskId ? { ...t, status: previousStatus } : t)),
        };
      });
      const msg = err instanceof Error ? err.message : 'Failed to save task update to database.';
      triggerNotification('error', msg);
    }
  };

  // Handle meeting status toggle (Scheduled -> Confirmed -> Completed)
  const handleToggleMeetingStatus = async (meetingId: string) => {
    if (!data) return;
    const target = data.calendarEvents.find(e => e.id === meetingId);
    if (!target) return;

    const nextStatus: 'Scheduled' | 'Confirmed' | 'Completed' =
      target.status === 'Scheduled' ? 'Confirmed' : target.status === 'Confirmed' ? 'Completed' : 'Scheduled';

    // Optimistic UI update
    setData({
      ...data,
      calendarEvents: data.calendarEvents.map(e =>
        e.id === meetingId ? { ...e, status: nextStatus } : e
      ),
    });

    try {
      const res = await updateMeetingStatus(meetingId, nextStatus);
      if (res.success) {
        triggerNotification('success', `Meeting status updated to ${nextStatus}.`);
      } else {
        throw new Error(res.error || 'Failed to update meeting status.');
      }
    } catch (err: unknown) {
      // Revert on error
      setData({
        ...data,
        calendarEvents: data.calendarEvents.map(e =>
          e.id === meetingId ? { ...e, status: target.status } : e
        ),
      });
      const msg = err instanceof Error ? err.message : 'Error updating meeting status.';
      triggerNotification('error', msg);
    }
  };

  // Handle schedule new meeting
  const handleScheduleMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeetingTitle || !newMeetingClient || !newMeetingCompany) {
      triggerNotification('error', 'Please enter Title, Client Name, and Company.');
      return;
    }

    try {
      const now = new Date();
      let startTime = new Date();
      if (newMeetingTime) {
        const [hours, mins] = newMeetingTime.split(':').map(Number);
        startTime.setHours(hours || 12, mins || 0, 0, 0);
      } else {
        startTime.setHours(now.getHours() + 1, 0, 0, 0);
      }

      const res = await scheduleNewMeeting({
        title: newMeetingTitle,
        clientName: newMeetingClient,
        companyName: newMeetingCompany,
        clientEmail: newMeetingEmail || undefined,
        startTime,
        meetingType: newMeetingType,
      });

      if (res.success && res.event) {
        setData(prev => {
          if (!prev) return null;
          return {
            ...prev,
            calendarEvents: [res.event!, ...prev.calendarEvents],
          };
        });
        triggerNotification('success', 'New meeting scheduled and synced to Google Meet!');
        setIsScheduleModalOpen(false);
        setNewMeetingTitle('');
        setNewMeetingClient('');
        setNewMeetingCompany('');
        setNewMeetingEmail('');
        setNewMeetingTime('14:00');
      } else {
        throw new Error(res.error || 'Failed to schedule meeting.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error scheduling meeting.';
      triggerNotification('error', msg);
    }
  };

  // Handle Proposal Stage Transition
  const handleProposalStageChange = async (
    proposalId: string,
    nextStage: 'Draft' | 'Sent' | 'Viewed' | 'Negotiation' | 'Won' | 'Lost'
  ) => {
    if (!data) return;
    const previousProposals = [...data.proposals];

    // Optimistic UI update
    setData({
      ...data,
      proposals: data.proposals.map(p =>
        p.id === proposalId
          ? {
            ...p,
            stage: nextStage,
            probability: nextStage === 'Won' ? 100 : nextStage === 'Negotiation' ? 85 : nextStage === 'Viewed' ? 70 : nextStage === 'Sent' ? 60 : nextStage === 'Draft' ? 30 : 0,
            lastUpdated: 'Just now',
          }
          : p
      ),
    });

    try {
      const res = await updateProposalStage(proposalId, nextStage);
      if (res.success && res.proposal) {
        triggerNotification('success', `Proposal stage updated to ${nextStage}.`);
      } else {
        throw new Error(res.error || 'Failed to update proposal stage.');
      }
    } catch (err: unknown) {
      // Revert on failure
      setData({ ...data, proposals: previousProposals });
      const msg = err instanceof Error ? err.message : 'Error updating proposal stage.';
      triggerNotification('error', msg);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle) return;
    try {
      await createBdeTask({
        title: newTaskTitle,
        priority: newTaskPriority,
        dueDate: newTaskDueDate || new Date().toISOString(),
        linkedOpportunity: newTaskLinkedOpportunity,
        assignedOwner: newTaskAssignedOwner,
      });
      triggerNotification('success', 'Task created successfully!');
      setIsTaskModalOpen(false);
      setNewTaskTitle('');
      setNewTaskDueDate('');
      setNewTaskLinkedOpportunity('');
      await loadCommandCenter();
    } catch (err: any) {
      triggerNotification('error', err.message || 'Failed to create task');
    }
  };

  // Handle Create Proposal Submit
  const handleCreateProposalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropTitle || !newPropClient || !newPropCompany || !newPropBudget) {
      triggerNotification('error', 'Please fill in all required proposal fields.');
      return;
    }

    try {
      const res = await createProposal({
        title: newPropTitle,
        clientName: newPropClient,
        companyName: newPropCompany,
        budget: newPropBudget,
        stage: newPropStage,
      });

      if (res.success && res.proposal) {
        setData(prev => {
          if (!prev) return null;
          return {
            ...prev,
            proposals: [res.proposal!, ...prev.proposals],
          };
        });
        triggerNotification('success', 'New proposal created and saved to database!');
        setIsProposalModalOpen(false);
        setNewPropTitle('');
        setNewPropClient('');
        setNewPropCompany('');
        setNewPropBudget('$50,000');
        setNewPropStage('Draft');
      } else {
        throw new Error(res.error || 'Failed to create proposal.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating proposal.';
      triggerNotification('error', msg);
    }
  };

  if (loading || !data) {
    return (
      <div className="dashboard-page" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RotateCcw size={28} className="animate-spin" style={{ margin: '0 auto 12px auto', display: 'block', color: 'var(--accent-violet)' }} />
        <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Initializing BDE Command Center...</div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>Loading pipeline telemetry, priority leads, calendar events & AI Coach briefing...</p>
      </div>
    );
  }

  const filteredTasks = data.tasks.filter(t =>
    activeTaskTab === 'Completed'
      ? t.status === 'COMPLETED'
      : (t.status !== 'COMPLETED' && t.dueCategory === activeTaskTab)
  );

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
        borderBottom: '1px solid var(--border-subtle)',
        height: '65px',
        flexShrink: 0,
        padding: '0 28px',
        background: 'var(--bg-primary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)', padding: '10px', borderRadius: '8px', boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)' }}>
            <Sparkles size={18} style={{ color: 'var(--bg-primary)' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, background: 'linear-gradient(135deg, #0f172a, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
              BDE Command Center & Sales OS
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#8ba0cb', fontWeight: 600, letterSpacing: '0.03em', marginTop: '4px', margin: 0 }}>
              Daily Sales Operating System for Business Development Executives • Active Pipeline Value: <strong style={{ color: 'var(--color-success)' }}>{data.kpis.pipelineValue}</strong>
            </p>
          </div>
        </div>

        {/* Live System Status Badges & Notifications */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.76rem', background: 'var(--color-success-bg)', color: 'var(--color-success)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 10px', borderRadius: '20px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-success)' }} /> Apollo REST: Healthy
            </span>
            <span style={{ fontSize: '0.76rem', background: 'var(--color-success-bg)', color: 'var(--color-success)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 10px', borderRadius: '20px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-success)' }} /> Marketplace Hub: 19 Active
            </span>
          </div>

          <div style={{ width: '1px', height: '28px', backgroundColor: 'var(--border-subtle)' }}></div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Bell size={22} strokeWidth={2.5} style={{ color: '#334155' }} />
            <span style={{ position: 'absolute', top: '-1px', right: '0px', width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%', border: '2px solid var(--bg-primary)' }}></span>
          </div>
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

        {/* MORNING COMMAND CENTER (Phase 48 Optimization) */}
        {morningMetrics && <MorningDashboard metrics={morningMetrics} />}

        {/* AI DAILY COACH BRIEFING ASSISTANT CARD */}
        <style>{`
          .coach-card-container {
            background: #ffffff;
            border: 1px solid rgba(226, 232, 240, 0.8);
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(15, 23, 42, 0.02);
            display: flex;
            flex-direction: column;
            gap: 16px;
            transition: all 0.3s ease;
          }
          .coach-card-container:hover {
            box-shadow: 0 8px 30px rgba(15, 23, 42, 0.06);
            border-color: #cbd5e1;
          }
          .coach-action-box {
            display: flex;
            align-items: center;
            padding: 14px 16px;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
            gap: 16px;
          }
          .coach-action-box.focus {
            background: #eff6ff;
            border: 1px solid #bfdbfe;
          }
          .coach-action-box.urgent {
            background: #faf5ff;
            border: 1px solid #e9d5ff;
          }
          .coach-action-box:hover {
            transform: translateY(-2px);
          }
          .coach-action-box.focus:hover {
            box-shadow: 0 6px 20px rgba(59, 130, 246, 0.15);
            border-color: #93c5fd;
          }
          .coach-action-box.urgent:hover {
            box-shadow: 0 6px 20px rgba(168, 85, 247, 0.15);
            border-color: #d8b4fe;
          }
          .coach-action-arrow {
            margin-left: auto;
            transition: transform 0.3s ease;
          }
          .coach-action-box:hover .coach-action-arrow {
            transform: translateX(4px);
          }
        `}</style>
        <div className="coach-card-container">
          {/* Header Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}>
                <Zap size={24} color="#ffffff" strokeWidth={2.5} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e3a8a', margin: 0 }}>
                  {data.aiCoach.greeting} — AI Sales Coach Briefing
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
                  Real-time Daily Execution Priorities & Pipeline Guidance
                </div>
              </div>
            </div>

            <div style={{
              background: '#f0fdf4',
              border: '1.5px solid #bbf7d0',
              padding: '10px 16px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              boxShadow: '0 2px 10px rgba(22, 163, 74, 0.05)'
            }}>
              <TrendingUp size={20} color="#16a34a" strokeWidth={2.5} />
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#16a34a', fontWeight: 800, letterSpacing: '0.06em' }}>Est. Active Pipeline</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#15803d', lineHeight: 1, marginTop: '4px' }}>{data.aiCoach.pipelineEstimate}</div>
              </div>
            </div>
          </div>

          {/* Action Boxes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {/* Primary Focus */}
            <div className="coach-action-box focus">
              <div style={{ color: '#3b82f6' }}>
                <Target size={22} strokeWidth={2.5} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Today's Primary Focus
                </div>
                <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 500 }}>
                  {data.aiCoach.todayFocus}
                </div>
              </div>
              <div className="coach-action-arrow" style={{ color: '#3b82f6' }}>
                <ArrowRight size={16} strokeWidth={2.5} />
              </div>
            </div>

            {/* Urgent Attention */}
            <div className="coach-action-box urgent">
              <div style={{ color: '#a855f7' }}>
                <AlertTriangle size={22} strokeWidth={2.5} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9333ea', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Urgent Attention Needed
                </div>
                <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 500 }}>
                  • {data.aiCoach.urgentRisks[0]}
                </div>
              </div>
              <div className="coach-action-arrow" style={{ color: '#a855f7' }}>
                <ArrowRight size={16} strokeWidth={2.5} />
              </div>
            </div>
          </div>
        </div>

        {/* ROW 1 — COMPREHENSIVE KPI DASHBOARD GRID (12 METRICS) */}
        {(() => {
          const Sparkline = ({ color, pattern = 1 }: { color: string, pattern?: number }) => {
            const path1 = "M0 30 C 30 10, 50 35, 80 15 C 100 5, 110 20, 120 10";
            const path2 = "M0 35 C 25 25, 45 5, 75 25 C 95 35, 110 15, 120 10";
            const path3 = "M0 20 C 30 -5, 50 30, 80 15 C 100 5, 110 25, 120 5";
            const p = pattern === 1 ? path1 : pattern === 2 ? path2 : path3;
            const id = `grad-${color.replace(/[^\w\d]/g, '')}-${pattern}`;
            return (
              <svg
                className="kpi-sparkline"
                width="45%"
                height="45"
                viewBox="0 0 120 40"
                preserveAspectRatio="none"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ position: 'absolute', bottom: 0, right: 0, zIndex: 0, opacity: 0.85, pointerEvents: 'none' }}
              >
                <path d={p} stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
                <path d={`${p} L 120 40 L 0 40 Z`} fill={`url(#${id})`} />
                <defs>
                  <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            );
          };

          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ padding: '8px', background: '#eff6ff', borderRadius: '8px', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #bfdbfe' }}>
                  <Activity size={24} strokeWidth={2.5} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Sales Performance Telemetry
                  </h2>
                  <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0, fontWeight: 500 }}>
                    Real-time monitoring of core KPIs, pipeline velocity, and team conversion metrics.
                  </p>
                </div>
              </div>
              <div style={{ height: '1px', background: 'linear-gradient(to right, #cbd5e1 0%, rgba(203, 213, 225, 0.1) 100%)', width: '100%', marginBottom: '20px' }}></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px' }}>
                {[
                  { label: "Today's New Leads", value: data.kpis.newLeadsToday, color: "#3b82f6", pattern: 1, icon: Search, footerText: "High-intent matches" },
                  { label: "Marketplace RFPs", value: data.kpis.projectsToday, color: "#8b5cf6", pattern: 2, icon: Briefcase, footerText: "Active RFPs today" },
                  { label: "Follow-ups Due", value: data.kpis.followUpsDue, color: "#f59e0b", pattern: 3, icon: Clock, footerText: "Requires action today" },
                  { label: "Meetings Today", value: data.kpis.meetingsToday, color: "#14b8a6", pattern: 1, icon: Calendar, footerText: "Scheduled discovery" },
                  { label: "Proposals Sent", value: data.kpis.proposalsSent, color: "#ec4899", pattern: 2, icon: FileText, footerText: "Delivered to clients" },
                  { label: "Replies Received", value: data.kpis.repliesReceived, color: "#0ea5e9", pattern: 3, icon: CheckCircle, footerText: "Client responses" },
                  { label: "Deals Won Month", value: data.kpis.dealsWonMonth, color: "#22c55e", pattern: 1, icon: Trophy, footerText: "Closed contracts" },
                  { label: "Active Pipeline Value", value: data.kpis.pipelineValue, color: "#6366f1", pattern: 2, icon: DollarSign, footerText: "Open deal pipeline" },
                  { label: "Close Win Rate", value: data.kpis.winRate, color: "#d946ef", pattern: 3, icon: TrendingUp, footerText: "Win probability %" },
                  { label: "Avg Deal Size", value: data.kpis.averageDealSize, color: "#84cc16", pattern: 1, icon: DollarSign, footerText: "Per project contract" },
                  { label: "Expected Revenue", value: data.kpis.expectedRevenue, color: "#06b6d4", pattern: 2, icon: TrendingUp, footerText: "Weighted forecast" },
                  { label: "Monthly Target", value: `${data.kpis.targetProgress}%`, color: "#eab308", pattern: 3, icon: Target, footerText: "Target quota" }
                ].map((card, idx) => {
                  const Icon = card.icon;
                  return (
                    <div key={idx} className="metric-card-summary" style={{ '--glow-color': card.color } as React.CSSProperties}>
                      <Sparkline color={card.color} pattern={card.pattern} />
                      <span className="m-label">{card.label}</span>
                      <span className="m-value" style={{ color: card.color }}>{card.value}</span>
                      <span className="m-footer"><Icon size={12} /> {card.footerText}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ROW 2 — TODAY'S PRIORITY QUEUE GRID */}
        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', background: '#fffbeb', borderRadius: '8px', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fde68a' }}>
                  <Zap size={22} strokeWidth={2.5} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', margin: 0, letterSpacing: '-0.02em' }}>
                    Today&apos;s Priority Execution Queue ({data.priorityQueue.length})
                  </h2>
                  <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0, fontWeight: 500 }}>
                    Focus on these AI-curated high-intent targets to maximize your conversion velocity.
                  </p>
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, background: '#f8fafc', padding: '6px 12px', borderRadius: '20px', border: '1px solid #e2e8f0', letterSpacing: '0.02em' }}>
                AI Rank-Ordered Leads
              </span>
            </div>
          </div>

          <div style={{ height: '1px', background: 'linear-gradient(to right, #cbd5e1 0%, rgba(203, 213, 225, 0.1) 100%)', width: '100%', marginBottom: '22px' }}></div>

          {data.priorityQueue.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', background: 'var(--bg-primary)', border: '1px dashed rgba(255, 255, 255, 0.1)', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <Inbox size={32} style={{ color: 'var(--text-muted)' }} />
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>No Priority Queue Items</div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0, maxWidth: '400px' }}>
                Execution queue is clean. Run Universal AI Search or Apollo B2B Search to populate new target accounts!
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {data.priorityQueue.map((item) => (
                <div
                  key={item.id}
                  className="priority-card"
                  style={{ '--card-accent': item.priority === 'URGENT' ? '#ef4444' : '#f59e0b' } as React.CSSProperties}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        fontSize: '0.65rem', padding: '4px 10px', borderRadius: '20px',
                        background: item.priority === 'URGENT' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: item.priority === 'URGENT' ? '#ef4444' : '#d97706',
                        fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em'
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.priority === 'URGENT' ? '#ef4444' : '#f59e0b', boxShadow: `0 0 8px ${item.priority === 'URGENT' ? '#ef4444' : '#f59e0b'}` }}></span>
                        {item.priority}
                      </span>
                      <span style={{
                        fontSize: '0.7rem', color: '#10b981', fontWeight: 600,
                        background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: '20px'
                      }}>
                        AI Score: {item.aiScore}/100
                      </span>
                    </div>
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#0f172a', margin: '0 0 6px 0', lineHeight: '1.3' }}>
                      {item.title}
                    </h4>
                    <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0, lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.reason}
                    </p>
                    {item.budget && (
                      <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600, marginTop: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <DollarSign size={14} style={{ color: '#10b981' }} /> Deal Value: <span style={{ color: '#0f172a', fontWeight: 800 }}>{item.budget}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: '20px' }}>
                    <Link
                      href={item.actionUrl}
                      className="priority-btn"
                    >
                      {item.nextAction} <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ROW 3 & 4 — TASKS & CALENDAR SCHEDULE (2 COLUMNS) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {/* ROW 3: My Tasks Queue */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '8px', background: '#f0fdf4', borderRadius: '8px', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #bbf7d0' }}>
                    <CheckCircle size={20} strokeWidth={2.5} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>My Execution Tasks</h2>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, fontWeight: 500 }}>Organize and track your daily sales activities.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsTaskModalOpen(true)}
                  style={{
                    background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
                  }}
                >
                  <Plus size={16} /> Add Task
                </button>
              </div>
            </div>
            <div style={{ height: '1px', background: 'linear-gradient(to right, #cbd5e1 0%, rgba(203, 213, 225, 0.1) 100%)', width: '100%', marginBottom: '4px' }}></div>

            {/* Task Category Tabs */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(['Today', 'Overdue', 'Upcoming', 'Completed'] as const).map((tab) => {
                const count = data.tasks.filter(t =>
                  tab === 'Completed'
                    ? t.status === 'COMPLETED'
                    : (t.status !== 'COMPLETED' && t.dueCategory === tab)
                ).length;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTaskTab(tab)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      border: activeTaskTab === tab ? '1px solid #818cf8' : '1px solid #e2e8f0',
                      background: activeTaskTab === tab ? '#eef2ff' : '#f8fafc',
                      color: activeTaskTab === tab ? '#4f46e5' : '#64748b',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>{tab}</span>
                    <span style={{
                      fontSize: '0.68rem',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      background: activeTaskTab === tab ? '#c7d2fe' : '#e2e8f0',
                      color: activeTaskTab === tab ? '#3730a3' : '#475569',
                      fontWeight: 800,
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
              {filteredTasks.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                  <CheckCircle size={32} style={{ color: '#cbd5e1' }} />
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#475569' }}>No tasks found</div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>You have no tasks listed under '{activeTaskTab}'</div>
                </div>
              ) : (
                filteredTasks.map((t) => (
                  <div
                    key={t.id}
                    style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input
                        type="checkbox"
                        checked={t.status === 'COMPLETED'}
                        onChange={() => handleToggleTaskStatus(t.id)}
                        style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: '#4f46e5' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: t.status === 'COMPLETED' ? '#94a3b8' : '#0f172a', textDecoration: t.status === 'COMPLETED' ? 'line-through' : 'none' }}>
                          {t.title}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>
                          Due: <span style={{ color: t.dueCategory === 'Overdue' ? '#ef4444' : '#64748b', fontWeight: t.dueCategory === 'Overdue' ? 700 : 500 }}>{t.dueDate}</span> • {t.linkedOpportunity}
                        </div>
                      </div>
                    </div>

                    <span style={{ fontSize: '0.65rem', padding: '4px 8px', borderRadius: '6px', background: '#eef2ff', color: '#4f46e5', fontWeight: 800, flexShrink: 0, textTransform: 'uppercase' }}>
                      {t.priority}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ROW 4: Calendar & Meetings Today */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '8px', background: '#eff6ff', borderRadius: '8px', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #bfdbfe' }}>
                    <Calendar size={20} strokeWidth={2.5} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Today&apos;s Calendar & Meetings ({data.calendarEvents.length})</h2>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, fontWeight: 500 }}>Your scheduled engagements for today.</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsScheduleModalOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    background: '#eff6ff',
                    color: '#2563eb',
                    border: '1px solid #bfdbfe',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Plus size={14} /> Schedule Meeting
                </button>
              </div>
            </div>
            <div style={{ height: '1px', background: 'linear-gradient(to right, #cbd5e1 0%, rgba(203, 213, 225, 0.1) 100%)', width: '100%', marginBottom: '4px' }}></div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.calendarEvents.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                  <Calendar size={32} style={{ color: '#cbd5e1' }} />
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#475569' }}>Clear Schedule</div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>No meetings scheduled for today.</div>
                </div>
              ) : (
                data.calendarEvents.map((evt) => (
                  <div
                    key={evt.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderLeft: evt.status === 'Completed' ? '4px solid #10b981' : evt.status === 'Confirmed' ? '4px solid #3b82f6' : '4px solid #f59e0b',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '220px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: evt.status === 'Completed' ? '#64748b' : '#0f172a', textDecoration: evt.status === 'Completed' ? 'line-through' : 'none' }}>
                          {evt.title}
                        </span>
                        <span style={{
                          fontSize: '0.68rem',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: '#f1f5f9',
                          color: '#475569',
                          fontWeight: 700,
                        }}>
                          {evt.type}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.78rem', color: '#4f46e5', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={13} /> {evt.time}
                      </div>

                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                        Client: <strong style={{ color: '#334155' }}>{evt.clientName}</strong> ({evt.companyName})
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {evt.meetingUrl && (
                        <a
                          href={evt.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: '#f0fdf4',
                            color: '#15803d',
                            border: '1px solid #bbf7d0',
                            textDecoration: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <Video size={14} /> Join Call
                        </a>
                      )}

                      <button
                        onClick={() => handleToggleMeetingStatus(evt.id)}
                        title="Click to toggle status: Scheduled -> Confirmed -> Completed"
                        style={{
                          fontSize: '0.7rem',
                          padding: '5px 12px',
                          borderRadius: '8px',
                          background: evt.status === 'Completed' ? '#dcfce7' : evt.status === 'Confirmed' ? '#dbeafe' : '#fef3c7',
                          color: evt.status === 'Completed' ? '#16a34a' : evt.status === 'Confirmed' ? '#1d4ed8' : '#d97706',
                          border: evt.status === 'Completed' ? '1px solid #86efac' : evt.status === 'Confirmed' ? '1px solid #93c5fd' : '1px solid #fde68a',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {evt.status}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ROW 5 — PROPOSAL TRACKER STAGE FUNNEL */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', background: '#f5f3ff', borderRadius: '8px', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ede9fe' }}>
                  <FileText size={20} strokeWidth={2.5} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Active Proposal Tracker ({data.proposals.length})</h2>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, fontWeight: 500 }}>Monitor live customer proposals, deal stages, and win probabilities.</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setIsProposalModalOpen(true)}
                  style={{
                    fontSize: '0.78rem',
                    color: '#6d28d9',
                    background: '#f5f3ff',
                    border: '1px solid #ddd6fe',
                    padding: '7px 14px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Plus size={14} /> New Proposal
                </button>
                <Link href="/marketplace" style={{ fontSize: '0.78rem', color: '#ffffff', background: '#8b5cf6', padding: '7px 14px', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.25)', transition: 'all 0.2s ease' }}>
                  Open Generator <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          </div>
          <div style={{ height: '1px', background: 'linear-gradient(to right, #cbd5e1 0%, rgba(203, 213, 225, 0.1) 100%)', width: '100%', marginBottom: '4px' }}></div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            {data.proposals.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', padding: '32px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                <FileText size={32} style={{ color: '#cbd5e1' }} />
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#475569' }}>No Active Proposals</div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>You don't have any pending proposals. Create one above!</div>
              </div>
            ) : (
              data.proposals.map((prop) => {
                const getStageStyle = (st: string) => {
                  switch (st) {
                    case 'Won': return { bg: '#dcfce7', text: '#15803d', border: '1px solid #86efac' };
                    case 'Negotiation': return { bg: '#fef3c7', text: '#b45309', border: '1px solid #fde68a' };
                    case 'Viewed': return { bg: '#eff6ff', text: '#1d4ed8', border: '1px solid #bfdbfe' };
                    case 'Sent': return { bg: '#f3e8ff', text: '#7e22ce', border: '1px solid #d8b4fe' };
                    case 'Lost': return { bg: '#fee2e2', text: '#b91c1c', border: '1px solid #fca5a5' };
                    default: return { bg: '#f1f5f9', text: '#475569', border: '1px solid #cbd5e1' };
                  }
                };
                const style = getStageStyle(prop.stage);

                return (
                  <div
                    key={prop.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderTop: prop.stage === 'Won' ? '3px solid #10b981' : prop.stage === 'Negotiation' ? '3px solid #f59e0b' : prop.stage === 'Sent' ? '3px solid #8b5cf6' : '3px solid #cbd5e1',
                      borderRadius: '10px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <ProposalStageDropdown
                        currentStage={prop.stage}
                        currentStyle={style}
                        onChange={(newStage) => handleProposalStageChange(prop.id, newStage as any)}
                      />
                      <span style={{ fontSize: '0.88rem', color: '#059669', fontWeight: 900 }}>
                        {prop.budget}
                      </span>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>
                        {prop.title || prop.clientName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginTop: '4px' }}>
                        Client: <strong style={{ color: '#334155' }}>{prop.clientName}</strong> • {prop.companyName}
                      </div>
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b' }}>
                        <span>Win Prob: <strong style={{ color: prop.stage === 'Won' ? '#10b981' : '#8b5cf6' }}>{prop.probability}%</strong></span>
                        <span>{prop.lastUpdated}</span>
                      </div>
                      <div style={{ width: '100%', height: '5px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden', marginTop: '6px' }}>
                        <div style={{
                          width: `${prop.probability}%`,
                          height: '100%',
                          background: prop.stage === 'Won' ? '#10b981' : prop.probability >= 70 ? '#8b5cf6' : '#f59e0b',
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ROW 6 — UNIFIED ACTIVITY TIMELINE & REVENUE FORECAST (2 COLUMNS) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {/* Unified Timeline */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', background: '#fff7ed', borderRadius: '8px', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ffedd5' }}>
                  <Clock size={20} strokeWidth={2.5} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Unified Activity Timeline</h2>
                    <span style={{ fontSize: '0.76rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: '#f1f5f9', color: '#475569' }}>
                      {data.timeline.length} Logs
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, fontWeight: 500 }}>Live sales intelligence & team execution audit log.</p>
                </div>
              </div>
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', background: '#f8fafc', padding: '6px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              {(['All', 'Deals', 'Meetings', 'Proposals', 'Leads', 'Outreach'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setTimelineFilter(tab)}
                  style={{
                    flex: 1,
                    minWidth: '60px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '0.88rem',
                    fontWeight: timelineFilter === tab ? 600 : 500,
                    border: 'none',
                    cursor: 'pointer',
                    background: timelineFilter === tab ? '#ffffff' : 'transparent',
                    color: timelineFilter === tab ? 'var(--accent-indigo)' : '#64748b',
                    boxShadow: timelineFilter === tab ? '0 2px 6px rgba(15, 23, 42, 0.08)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div style={{ height: '1px', background: 'linear-gradient(to right, #cbd5e1 0%, rgba(203, 213, 225, 0.1) 100%)', width: '100%', margin: '4px 0' }}></div>

            {/* Activity List with smooth scroll */}
            <div
              className="custom-scrollbar"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0px',
                maxHeight: '450px',
                overflowY: 'auto',
                paddingLeft: '4px',
                paddingRight: '22px',
                paddingTop: '10px',
                paddingBottom: '24px'
              }}>
              {(() => {
                const filteredTimeline = data.timeline.filter((item) => {
                  if (timelineFilter === 'All') return true;
                  if (timelineFilter === 'Deals') return item.type === 'Deal Won';
                  if (timelineFilter === 'Meetings') return item.type === 'Meeting Scheduled';
                  if (timelineFilter === 'Proposals') return item.type === 'Proposal Sent' || item.type === 'Review Queue';
                  if (timelineFilter === 'Leads') return item.type === 'LinkedIn Discovery' || item.type === 'Apollo Research';
                  if (timelineFilter === 'Outreach') return item.type === 'Email Sent' || item.type === 'Task Completed';
                  return true;
                });

                if (filteredTimeline.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                      <Activity size={32} style={{ margin: '0 auto 12px', opacity: 0.5, color: '#64748b' }} />
                      <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>No activities found for this filter.</p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem' }}>Try selecting a different tab.</p>
                    </div>
                  );
                }

                return filteredTimeline.map((item, index) => {
                  const visual = getActivityVisuals(item.type);
                  const isLast = index === filteredTimeline.length - 1;
                  return (
                    <div key={item.id} style={{ display: 'flex', gap: '16px', alignItems: 'stretch', position: 'relative' }}>
                      {/* Timeline vertical track line */}
                      {!isLast && (
                        <div style={{
                          position: 'absolute',
                          left: '17px',
                          top: '36px',
                          bottom: '-4px',
                          width: '2px',
                          background: 'linear-gradient(to bottom, #cbd5e1 0%, rgba(203, 213, 225, 0.4) 100%)',
                          zIndex: 0
                        }} />
                      )}

                      <div style={{
                        position: 'relative',
                        zIndex: 1,
                        background: visual.bg,
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        color: visual.color,
                        border: `2px solid #ffffff`,
                        boxShadow: `0 0 0 1.5px ${visual.borderColor}, 0 2px 6px rgba(0,0,0,0.06)`,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: '4px'
                      }}>
                        {visual.icon}
                      </div>

                      <div style={{
                        flex: 1,
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '16px',
                        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
                        transition: 'all 0.2s ease',
                        cursor: 'default',
                      }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(15, 23, 42, 0.06)';
                          e.currentTarget.style.borderColor = '#cbd5e1';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.02)';
                          e.currentTarget.style.borderColor = '#e2e8f0';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                              {item.title}
                            </span>
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              padding: '4px 8px',
                              borderRadius: '6px',
                              background: visual.badgeBg,
                              color: visual.badgeColor,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              border: `1px solid ${visual.borderColor}40`
                            }}>
                              {item.type}
                            </span>
                          </div>
                          <span style={{
                            fontSize: '0.72rem',
                            color: '#64748b',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#f8fafc',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            border: '1px solid #f1f5f9'
                          }}>
                            <Clock size={11} strokeWidth={2.5} /> {item.timeAgo}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.84rem', color: '#475569', margin: '0 0 12px 0', lineHeight: '1.5' }}>
                          {item.details}
                        </p>
                        {item.actor && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.72rem',
                            color: '#94a3b8',
                            fontWeight: 500,
                            paddingTop: '12px',
                            borderTop: '1px dashed #cbd5e1'
                          }}>
                            <span>Logged by</span>
                            <span style={{
                              color: 'var(--accent-indigo)',
                              fontWeight: 700,
                              background: '#eef2ff',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              border: '1px solid #e0e7ff'
                            }}>
                              {item.actor}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Revenue Forecast Widget */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', background: '#ecfdf5', borderRadius: '8px', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #d1fae5' }}>
                  <TrendingUp size={20} strokeWidth={2.5} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Revenue & Quota Forecast</h2>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, fontWeight: 500 }}>AI projections based on current pipeline velocity.</p>
                </div>
              </div>
            </div>
            <div style={{ height: '1px', background: 'linear-gradient(to right, #cbd5e1 0%, rgba(203, 213, 225, 0.1) 100%)', width: '100%', marginBottom: '4px' }}></div>

            <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1px solid #bbf7d0', padding: '20px', borderRadius: '12px', textAlign: 'center', boxShadow: 'inset 0 2px 10px rgba(22, 163, 74, 0.05)' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#16a34a', fontWeight: 800, letterSpacing: '0.05em' }}>Weighted Revenue Forecast</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-kpi)', color: '#15803d', margin: '8px 0', letterSpacing: '-0.02em' }}>
                {data.revenueForecast.weightedRevenue}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>
                Target Progress: <strong style={{ color: '#14532d', padding: '2px 6px', background: '#bbf7d0', borderRadius: '4px' }}>{data.revenueForecast.targetProgress}%</strong> of Monthly Quota
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: 'auto' }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Deals Won</div>
                <strong style={{ color: '#10b981', fontSize: '1.1rem', fontWeight: 800 }}>{data.revenueForecast.wonRevenue}</strong>
              </div>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Pending Deals</div>
                <strong style={{ color: '#3b82f6', fontSize: '1.1rem', fontWeight: 800 }}>{data.revenueForecast.pendingRevenue}</strong>
              </div>
            </div>
          </div>
        </div>

      </div> {/* End scrollable content */}

      {/* SCHEDULE MEETING MODAL */}
      {isScheduleModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '6px', background: '#eff6ff', borderRadius: '6px', color: '#2563eb' }}>
                  <Calendar size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Schedule Sales Engagement</h3>
              </div>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleScheduleMeetingSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Meeting Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Technical Discovery Call"
                  value={newMeetingTitle}
                  onChange={(e) => setNewMeetingTitle(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Client Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Alex Morgan"
                    value={newMeetingClient}
                    onChange={(e) => setNewMeetingClient(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Company Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corp"
                    value={newMeetingCompany}
                    onChange={(e) => setNewMeetingCompany(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Meeting Type
                  </label>
                  <CustomDropdown
                    value={newMeetingType}
                    onChange={(val) => setNewMeetingType(val as any)}
                    options={[
                      { value: 'Discovery Call', label: 'Discovery Call' },
                      { value: 'Demo', label: 'Product Demo' },
                      { value: 'Proposal Review', label: 'Proposal Review' },
                      { value: 'Follow-up Reminder', label: 'Follow-up Call' }
                    ]}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Time (Today)
                  </label>
                  <input
                    type="time"
                    value={newMeetingTime}
                    onChange={(e) => setNewMeetingTime(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Client Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="e.g. client@example.com"
                  value={newMeetingEmail}
                  onChange={(e) => setNewMeetingEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{
                background: '#eff6ff',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.78rem',
                color: '#1e40af',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <Video size={16} /> Auto-generates Google Meet video bridge link
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#64748b',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '9px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  Save & Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE PROPOSAL MODAL */}
      {isProposalModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[4px] flex items-center justify-center z-[99999] p-5">
          <div className="bg-white rounded-2xl w-full max-w-[500px] shadow-[0_24px_50px_rgba(0,0,0,0.2)] border border-slate-200 flex flex-col transform transition-all">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 shadow-sm border border-indigo-100/50">
                  <FileText size={20} strokeWidth={2.5} />
                </div>
                <h3 className="m-0 text-[1.1rem] font-extrabold text-slate-900 tracking-tight">Create Customer Proposal</h3>
              </div>
              <button
                onClick={() => setIsProposalModalOpen(false)}
                className="bg-transparent border-none cursor-pointer text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1.5 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateProposalSubmit} className="p-6 flex flex-col gap-5">
              <div>
                <label className="block text-[0.82rem] font-bold text-slate-700 mb-1.5">
                  Proposal / Project Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dedicated React & Node Squad Acceleration"
                  value={newPropTitle}
                  onChange={(e) => setNewPropTitle(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-[0.88rem] outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300 placeholder:text-slate-400 font-medium text-slate-800 shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[0.82rem] font-bold text-slate-700 mb-1.5">
                    Client Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Alex Morgan"
                    value={newPropClient}
                    onChange={(e) => setNewPropClient(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-[0.88rem] outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300 placeholder:text-slate-400 font-medium text-slate-800 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[0.82rem] font-bold text-slate-700 mb-1.5">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CloudScale Labs"
                    value={newPropCompany}
                    onChange={(e) => setNewPropCompany(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-[0.88rem] outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300 placeholder:text-slate-400 font-medium text-slate-800 shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[0.82rem] font-bold text-slate-700 mb-1.5">
                    Budget (USD) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. $45,000"
                    value={newPropBudget}
                    onChange={(e) => setNewPropBudget(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-[0.88rem] outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300 placeholder:text-slate-400 font-medium text-slate-800 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[0.82rem] font-bold text-slate-700 mb-1.5">
                    Initial Stage
                  </label>
                  <div className="h-[42px] relative z-20">
                    <CustomDropdown
                      value={newPropStage}
                      onChange={(val) => setNewPropStage(val as any)}
                      options={[
                        { value: 'Draft', label: 'Draft' },
                        { value: 'Sent', label: 'Sent' },
                        { value: 'Viewed', label: 'Viewed' },
                        { value: 'Negotiation', label: 'Negotiation' },
                        { value: 'Won', label: 'Won' },
                        { value: 'Lost', label: 'Lost' }
                      ]}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProposalModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-[0.85rem] font-bold cursor-pointer hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl border-none bg-indigo-600 text-white text-[0.85rem] font-bold cursor-pointer shadow-[0_4px_12px_rgba(79,70,229,0.25)] hover:bg-indigo-700 hover:shadow-[0_6px_16px_rgba(79,70,229,0.3)] transition-all hover:-translate-y-[1px]"
                >
                  Save Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {isTaskModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div style={{ background: '#ffffff', width: '100%', maxWidth: '440px', borderRadius: '16px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Add New Task</h3>
              <button onClick={() => setIsTaskModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Task Title *</label>
                <input required type="text" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="e.g. Call CEO of Stripe" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Linked Opportunity</label>
                <input type="text" value={newTaskLinkedOpportunity} onChange={(e) => setNewTaskLinkedOpportunity(e.target.value)} placeholder="e.g. Stripe Enterprise Deal" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Due Date</label>
                  <input type="date" value={newTaskDueDate} onChange={(e) => setNewTaskDueDate(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Priority</label>
                  <CustomDropdown 
                    value={newTaskPriority}
                    onChange={(val) => setNewTaskPriority(val as any)}
                    options={[
                      { value: 'HIGH', label: 'High' },
                      { value: 'NORMAL', label: 'Normal' },
                      { value: 'LOW', label: 'Low' }
                    ]}
                  />
                </div>
              </div>
              <button type="submit" style={{ marginTop: '8px', width: '100%', background: '#4f46e5', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}>
                Create Task
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
