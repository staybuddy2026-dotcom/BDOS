'use client';

import { useState, useCallback, useEffect } from 'react';
import blob from '@/assets/blob.png';
import {
  getBdeCommandCenterData,
  BdeCommandCenterData
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
  Activity
} from 'lucide-react';
import Link from 'next/link';
import '@/styles/globals.css';
import '@/styles/dashboard.css';

export default function BdeCommandCenterHome() {
  const [data, setData] = useState<BdeCommandCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTaskTab, setActiveTaskTab] = useState<'Today' | 'Overdue' | 'Upcoming' | 'Completed'>('Today');
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<number>(1);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [morningMetrics, setMorningMetrics] = useState<MorningCommandMetrics | null>(null);

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

  // Handle task status toggle
  const handleToggleTaskStatus = (taskId: string) => {
    if (!data) return;
    const updatedTasks = data.tasks.map(t => {
      if (t.id === taskId) {
        const nextStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' = t.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
        return { ...t, status: nextStatus };
      }
      return t;
    });
    setData({ ...data, tasks: updatedTasks });
    triggerNotification('success', 'Task status updated.');
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

  const filteredTasks = data.tasks.filter(t => t.dueCategory === activeTaskTab || (activeTaskTab === 'Completed' && t.status === 'COMPLETED'));

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

        {/* DAILY BDE GUIDED WORKFLOW BAR */}
        <style>{`
          .workflow-container {
            background: #ffffff;
            border: 1px solid rgba(226, 232, 240, 0.8);
            border-radius: 12px;
            padding: 20px 24px;
            box-shadow: 0 4px 20px rgba(15, 23, 42, 0.02);
            transition: all 0.3s ease;
          }
          .workflow-container:hover {
            box-shadow: 0 8px 30px rgba(15, 23, 42, 0.05);
            border-color: #cbd5e1;
          }
          .workflow-step {
            display: flex;
            flex-direction: column;
            gap: 2px;
            padding: 14px 8px;
            border-radius: 10px;
            text-align: center;
            text-decoration: none;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
            border: 1px solid transparent;
          }
          .workflow-step:not(.active) {
            background: #ffffff;
            border-color: #e2e8f0;
          }
          .workflow-step:not(.active):hover {
            border-color: #a78bfa;
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(139, 92, 246, 0.1);
          }
          .workflow-step.active {
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            border-color: transparent;
            box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
            transform: translateY(-2px);
          }
        `}</style>
        <div className="workflow-container">
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', display: 'flex', alignItems: 'start', gap: '8px' }}>
            <div style={{ color: '#8b5cf6' }}>
              <Target size={20} strokeWidth={2.5} />
            </div>
            Daily BDE Guided Sales Execution Flow
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
            {[
              { step: 1, name: 'AI Priorities', link: '/priorities', hint: 'Daily Queue' },
              { step: 2, name: 'Research Company 360', link: '/company', hint: 'Tech Stack & Profiles' },
              { step: 3, name: 'Apollo B2B Search', link: '/apollo-search', hint: 'Find Decision Makers' },
              { step: 4, name: 'AI Outreach Generator', link: '/engagement', hint: 'Personalized Copies' },
              { step: 5, name: 'Review Queue', link: '/review', hint: 'Approve & Dispatch' },
              { step: 6, name: 'Automated Sequences', link: '/re-engagement', hint: 'Follow-up Schedules' },
              { step: 7, name: 'Revenue Pipeline', link: '/revenue', hint: 'Manage CRM Deals' },
            ].map((s) => {
              const isActive = activeWorkflowStep === s.step;
              return (
                <Link
                  key={s.step}
                  href={s.link}
                  onClick={() => setActiveWorkflowStep(s.step)}
                  className={`workflow-step ${isActive ? 'active' : ''}`}
                >
                  <div style={{ fontSize: '0.68rem', color: isActive ? '#e0e7ff' : '#8b5cf6', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>STEP {s.step}</div>
                  <div style={{ fontSize: '0.9rem', color: isActive ? '#ffffff' : '#0f172a', fontWeight: 800, marginTop: '2px' }}>{s.name}</div>
                  <div style={{ fontSize: '0.7rem', color: isActive ? '#c7d2fe' : '#64748b', fontWeight: 600 }}>{s.hint}</div>
                </Link>
              );
            })}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', background: '#f0fdf4', borderRadius: '8px', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #bbf7d0' }}>
                  <CheckCircle size={20} strokeWidth={2.5} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>My Execution Tasks</h2>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, fontWeight: 500 }}>Organize and track your daily sales activities.</p>
                </div>
              </div>
            </div>
            <div style={{ height: '1px', background: 'linear-gradient(to right, #cbd5e1 0%, rgba(203, 213, 225, 0.1) 100%)', width: '100%', marginBottom: '4px' }}></div>

            {/* Task Category Tabs */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['Today', 'Overdue', 'Upcoming', 'Completed'] as const).map((tab) => (
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
                  }}
                >
                  {tab}
                </button>
              ))}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', background: '#eff6ff', borderRadius: '8px', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #bfdbfe' }}>
                  <Calendar size={20} strokeWidth={2.5} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Today&apos;s Calendar & Meetings ({data.calendarEvents.length})</h2>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, fontWeight: 500 }}>Your scheduled engagements for today.</p>
                </div>
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
                    style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #3b82f6', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
                  >
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                        {evt.title}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#4f46e5', marginTop: '4px', fontWeight: 700 }}>
                        🕒 {evt.time}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>
                        Client: <strong style={{ color: '#334155' }}>{evt.clientName}</strong> ({evt.companyName})
                      </div>
                    </div>

                    <span style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: '6px', background: '#dcfce7', color: '#16a34a', fontWeight: 800, textTransform: 'uppercase' }}>
                      {evt.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ROW 5 — PROPOSAL TRACKER STAGE FUNNEL */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', background: '#f5f3ff', borderRadius: '8px', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ede9fe' }}>
                  <FileText size={20} strokeWidth={2.5} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Active Proposal Tracker ({data.proposals.length})</h2>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, fontWeight: 500 }}>Monitor the status of your sent proposals and active RFPs.</p>
                </div>
              </div>
              <Link href="/marketplace" style={{ fontSize: '0.8rem', color: '#ffffff', background: '#8b5cf6', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.25)', transition: 'all 0.2s ease' }}>
                Open Generator <ChevronRight size={14} />
              </Link>
            </div>
          </div>
          <div style={{ height: '1px', background: 'linear-gradient(to right, #cbd5e1 0%, rgba(203, 213, 225, 0.1) 100%)', width: '100%', marginBottom: '4px' }}></div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {data.proposals.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', padding: '32px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                <FileText size={32} style={{ color: '#cbd5e1' }} />
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#475569' }}>No Active Proposals</div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>You don't have any pending proposals. Generate one!</div>
              </div>
            ) : (
              data.proposals.map((prop) => (
                <div
                  key={prop.id}
                  style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '6px', background: '#f3e8ff', color: '#7e22ce', fontWeight: 800, textTransform: 'uppercase' }}>
                      {prop.stage}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 800 }}>
                      {prop.budget}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                    {prop.clientName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                    Company: <span style={{ color: '#334155', fontWeight: 700 }}>{prop.companyName}</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Win Prob: <strong style={{ color: '#8b5cf6' }}>{prop.probability}%</strong></span>
                    <span>Updated {prop.lastUpdated}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ROW 6 — UNIFIED ACTIVITY TIMELINE & REVENUE FORECAST (2 COLUMNS) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* Unified Timeline */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', background: '#fff7ed', borderRadius: '8px', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ffedd5' }}>
                  <Clock size={20} strokeWidth={2.5} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Unified Activity Timeline</h2>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, fontWeight: 500 }}>Recent system and team activity log.</p>
                </div>
              </div>
            </div>
            <div style={{ height: '1px', background: 'linear-gradient(to right, #cbd5e1 0%, rgba(203, 213, 225, 0.1) 100%)', width: '100%', marginBottom: '4px' }}></div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {data.timeline.map((item) => (
                <div key={item.id} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '50%', color: '#f97316', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                    <Sparkles size={14} />
                  </div>
                  <div style={{ paddingBottom: '16px', borderBottom: '1px solid #f1f5f9', width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>
                        {item.timeAgo}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', lineHeight: '1.4' }}>
                      {item.details}
                    </div>
                  </div>
                </div>
              ))}
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
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#15803d', margin: '8px 0', letterSpacing: '-0.02em' }}>
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
    </div>
  );
}
