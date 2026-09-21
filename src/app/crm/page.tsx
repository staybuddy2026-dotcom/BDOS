'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Building2,
  Search,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Globe,
  Sparkles,
  Video,
  Kanban,
  List,
  Plus,
  RefreshCw,
  FileText,
  CheckSquare,
  Square,
  Phone,
  Mail,
  Calendar,
  Send,
  Loader2,
  Trash2
} from 'lucide-react';
import {
  getCrmAccounts,
  createCrmAccount,
  clearAllCrmAccounts,
  updateAccountStage,
  addAccountMeeting,
  addAccountProposal,
  addAccountTask,
  toggleAccountTask,
  addAccountNote,
  getAccountAiBriefing,
  importLeadsFromDiscovery,
  CrmAccount,
  CrmKpis,
  CrmStage,
  CrmAiBriefing
} from '@/features/crm/actions';
import { BreadcrumbHeader } from '@/components/navigation/BreadcrumbHeader';
import { CustomDropdown } from '@/components/CustomDropdown';
import blob from '@/assets/blob.png';
import '@/styles/dashboard.css';
import '@/styles/globals.css';

const CRM_STAGES: CrmStage[] = [
  'Lead',
  'Contacted',
  'Meeting Scheduled',
  'Proposal Sent',
  'Negotiation',
  'Won',
  'Lost',
  'Repeat Client',
];

export default function EnterpriseCrmPage() {
  const [viewMode, setViewMode] = useState<'kanban' | 'detail'>('detail');
  const [search, setSearch] = useState('');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('');

  const [accounts, setAccounts] = useState<CrmAccount[]>([]);
  const [kpis, setKpis] = useState<CrmKpis | null>(null);
  const [loading, setLoading] = useState(false);

  // Selected Account in 3-Pane View
  const [selectedAccount, setSelectedAccount] = useState<CrmAccount | null>(null);
  const [activeCenterTab, setActiveCenterTab] = useState<'overview' | 'meetings' | 'proposals' | 'tasks' | 'timeline'>('overview');

  // AI Briefing
  const [aiBriefing, setAiBriefing] = useState<CrmAiBriefing | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Modals
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);

  // Add Account Form State
  const [newAccName, setNewAccName] = useState('');
  const [newAccDomain, setNewAccDomain] = useState('');
  const [newAccIndustry, setNewAccIndustry] = useState('Technology & SaaS');
  const [newAccLocation, setNewAccLocation] = useState('United States');
  const [newAccDealValue, setNewAccDealValue] = useState('45000');
  const [newAccStage, setNewAccStage] = useState<CrmStage>('Lead');
  const [newAccContactName, setNewAccContactName] = useState('');
  const [newAccContactTitle, setNewAccContactTitle] = useState('Chief Technology Officer');
  const [newAccContactEmail, setNewAccContactEmail] = useState('');
  const [newAccContactPhone, setNewAccContactPhone] = useState('');

  // Add Meeting Form State
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [meetingAttendees, setMeetingAttendees] = useState('');
  const [meetingOutcome, setMeetingOutcome] = useState('');
  const [googleMeetUrl, setGoogleMeetUrl] = useState('');

  // Add Proposal Form State
  const [proposalVersion, setProposalVersion] = useState('v1.0-Commercial');
  const [proposalValue, setProposalValue] = useState('$50,000');
  const [proposalExpiry, setProposalExpiry] = useState('2026-08-31');

  // Add Task Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<'HIGH' | 'NORMAL' | 'LOW'>('HIGH');
  const [taskDueDate, setTaskDueDate] = useState('2026-08-10');

  // Quick Note in Timeline
  const [noteInput, setNoteInput] = useState('');

  // Toast Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const triggerNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadCrmData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCrmAccounts({
        search,
        stage: selectedStageFilter,
      });
      setAccounts(res.accounts);
      setKpis(res.kpis);

      if (res.accounts.length > 0) {
        setSelectedAccount(prev => {
          if (!prev) return res.accounts[0];
          const matched = res.accounts.find(a => a.id === prev.id);
          return matched || res.accounts[0];
        });
      } else {
        setSelectedAccount(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load CRM accounts.';
      triggerNotification('error', msg);
    } finally {
      setLoading(false);
    }
  }, [search, selectedStageFilter]);

  useEffect(() => {
    let active = true;
    async function run() {
      if (!active) return;
      await loadCrmData();
    }
    run();
    return () => { active = false; };
  }, [loadCrmData]);

  // Load AI Briefing when selected account changes
  useEffect(() => {
    let active = true;
    if (!selectedAccount) {
      setTimeout(() => {
        if (active) setAiBriefing(null);
      }, 0);
      return () => { active = false; };
    }
    async function fetchAi() {
      setAiLoading(true);
      try {
        const briefing = await getAccountAiBriefing(selectedAccount!.id, selectedAccount!.name, selectedAccount!.industry);
        if (active) setAiBriefing(briefing);
      } catch {
        // Fallback
      } finally {
        if (active) setAiLoading(false);
      }
    }
    fetchAi();
    return () => { active = false; };
  }, [selectedAccount]);

  // Stage Update Handler
  const handleStageChange = async (account: CrmAccount, newStage: CrmStage) => {
    try {
      await updateAccountStage(account.id, newStage);
      await loadCrmData();
      triggerNotification('success', `Moved "${account.name}" to ${newStage}`);
    } catch {
      triggerNotification('error', 'Stage update failed.');
    }
  };

  // Sync Apollo Leads Handler
  const handleSyncApollo = async () => {
    try {
      const res = await importLeadsFromDiscovery();
      await loadCrmData();
      triggerNotification('success', res.message);
    } catch {
      triggerNotification('error', 'Failed to sync leads from Apollo.');
    }
  };

  // Add Account Handler
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim() || !newAccDomain.trim()) return;
    try {
      const created = await createCrmAccount({
        name: newAccName.trim(),
        domain: newAccDomain.trim(),
        industry: newAccIndustry,
        location: newAccLocation,
        dealValueNumber: parseInt(newAccDealValue, 10) || 45000,
        stage: newAccStage,
        contactName: newAccContactName.trim() || undefined,
        contactTitle: newAccContactTitle.trim() || undefined,
        contactEmail: newAccContactEmail.trim() || undefined,
        contactPhone: newAccContactPhone.trim() || undefined,
      });

      setShowAddAccountModal(false);
      setNewAccName('');
      setNewAccDomain('');
      setNewAccContactName('');
      setNewAccContactEmail('');
      setSelectedAccount(created);
      await loadCrmData();
      triggerNotification('success', `Created CRM Account "${created.name}"`);
    } catch {
      triggerNotification('error', 'Failed to create account.');
    }
  };

  // Add Meeting Handler
  const handleAddMeeting = async () => {
    if (!selectedAccount || !meetingTitle.trim()) return;
    try {
      await addAccountMeeting(selectedAccount.id, {
        date: meetingDate || new Date().toISOString().split('T')[0],
        title: meetingTitle,
        attendees: meetingAttendees.split(',').map(s => s.trim()).filter(Boolean),
        outcome: meetingOutcome || 'Meeting logged successfully.',
        actionItems: ['Follow up on discussed requirements'],
        googleMeetUrl: googleMeetUrl || undefined,
      });

      setShowMeetingModal(false);
      setMeetingTitle('');
      setMeetingOutcome('');
      setGoogleMeetUrl('');
      await loadCrmData();
      triggerNotification('success', `Meeting logged for ${selectedAccount.name}`);
    } catch {
      triggerNotification('error', 'Failed to log meeting.');
    }
  };

  // Add Proposal Handler
  const handleAddProposal = async () => {
    if (!selectedAccount || !proposalVersion.trim()) return;
    try {
      await addAccountProposal(selectedAccount.id, {
        version: proposalVersion,
        value: proposalValue,
        date: new Date().toISOString().split('T')[0],
        status: 'Sent',
        expiryDate: proposalExpiry,
      });

      setShowProposalModal(false);
      await loadCrmData();
      triggerNotification('success', `Proposal "${proposalVersion}" added for ${selectedAccount.name}`);
    } catch {
      triggerNotification('error', 'Failed to create proposal.');
    }
  };

  // Add Task Handler
  const handleAddTask = async () => {
    if (!selectedAccount || !taskTitle.trim()) return;
    try {
      await addAccountTask(selectedAccount.id, {
        title: taskTitle,
        priority: taskPriority,
        dueDate: taskDueDate,
        assignedUser: 'Akash (BD Owner)',
      });

      setShowTaskModal(false);
      setTaskTitle('');
      await loadCrmData();
      triggerNotification('success', `Task added for ${selectedAccount.name}`);
    } catch {
      triggerNotification('error', 'Failed to create task.');
    }
  };

  // Toggle Task Handler
  const handleToggleTask = async (taskId: string) => {
    if (!selectedAccount) return;
    try {
      await toggleAccountTask(selectedAccount.id, taskId);
      await loadCrmData();
    } catch {
      triggerNotification('error', 'Failed to update task.');
    }
  };

  // Add Quick Note Handler
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount || !noteInput.trim()) return;
    try {
      await addAccountNote(selectedAccount.id, noteInput.trim());
      setNoteInput('');
      await loadCrmData();
      triggerNotification('success', 'Note saved to timeline');
    } catch {
      triggerNotification('error', 'Failed to add note.');
    }
  };

  // Clear All Accounts Handler
  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all CRM accounts?')) return;
    try {
      await clearAllCrmAccounts();
      setSelectedAccount(null);
      await loadCrmData();
      triggerNotification('success', 'Cleared all CRM accounts.');
    } catch {
      triggerNotification('error', 'Failed to clear accounts.');
    }
  };

  return (
    <div className="crm-workspace" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', boxSizing: 'border-box' }}>
      <style>{`
        .premium-kpi-card { background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(20px); border: 1px solid rgba(226, 232, 240, 0.8); border-radius: 16px; padding: 18px 20px; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-shadow: 0 4px 15px rgba(15, 23, 42, 0.02), inset 0 0 0 1px rgba(255, 255, 255, 0.5); position: relative; overflow: hidden; cursor: pointer; display: flex; flex-direction: column; gap: 6px; min-width: 0; box-sizing: border-box; }
        .premium-kpi-card::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(135deg, var(--glow-color) 0%, transparent 50%); opacity: 0.15; transition: opacity 0.4s ease; pointer-events: none; }
        .premium-kpi-card:hover { transform: translateY(-4px) scale(1.02); box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.08), inset 0 0 0 1px rgba(255, 255, 255, 0.8); border-color: transparent; }
        .premium-kpi-card:hover::before { opacity: 0.3; }
        .kpi-glow { position: absolute; bottom: -30px; right: -30px; width: 100px; height: 100px; border-radius: 50%; background: var(--glow-color); filter: blur(30px); opacity: 0.3; transition: all 0.5s ease; pointer-events: none; }
        .premium-kpi-card:hover .kpi-glow { transform: scale(1.3); opacity: 0.6; }
      `}</style>
      {/* Toast Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '32px',
          zIndex: 10000,
          background: notification.type === 'success' ? '#0f172a' : '#ef4444',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.84rem',
          fontWeight: 700,
        }}>
          {notification.type === 'success' ? <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} /> : <AlertTriangle size={16} />}
          {notification.message}
        </div>
      )}

      {/* FULL WIDTH STICKY HEADER (Matches Dashboard) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-subtle)',
        minHeight: '72px',
        flexWrap: 'wrap',
        gap: '16px',
        flexShrink: 0,
        padding: '12px 16px',
        background: 'var(--bg-primary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 400px', minWidth: '400px' }}>
          <div style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)', padding: '10px', borderRadius: '10px', boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Building2 size={20} style={{ color: '#ffffff' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 900, background: 'linear-gradient(135deg, #0f172a, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0, letterSpacing: '0.02em' }}>
              Enterprise CRM Workspace
            </h1>
            <p style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, margin: '2px 0 0 0' }}>
              Manage your end-to-end sales lifecycle and pipeline velocity.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Mode Switcher */}
          <div className="apollo-toggle-bg" style={{ margin: 0 }}>
            <div className="apollo-toggle-slider" data-mode={viewMode === 'kanban' ? 'companies' : 'people'} />
            <button
              className={`apollo-toggle-btn ${viewMode === 'detail' ? 'active' : ''}`}
              onClick={() => setViewMode('detail')}
              style={{ fontSize: '0.78rem', padding: '6px 14px' }}
            >
              <List size={14} /> 3-Pane View
            </button>
            <button
              className={`apollo-toggle-btn ${viewMode === 'kanban' ? 'active' : ''}`}
              onClick={() => setViewMode('kanban')}
              style={{ fontSize: '0.78rem', padding: '6px 14px' }}
            >
              <Kanban size={14} /> Stage Funnel
            </button>
          </div>

          {/* Clear All Accounts Button */}
          {accounts.length > 0 && (
            <button
              onClick={handleClearAll}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', background: '#ffffff', color: '#ef4444', fontWeight: 700, fontSize: '0.78rem', border: '1px solid rgba(239, 68, 68, 0.3)', cursor: 'pointer', transition: 'all 0.15s ease', whiteSpace: 'nowrap', boxShadow: '0 2px 4px rgba(239,68,68,0.05)' }}
              title="Clear all CRM accounts"
            >
              <Trash2 size={14} /> Clear All
            </button>
          )}
        </div>
      </div>

      {/* SCROLLABLE MAIN CONTENT */}
      <div
        className="dashboard-scrollable-content"
        style={{
          flex: 1,
          overflowY: 'auto',
          boxSizing: 'border-box',
          position: 'relative',
          backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.7), rgba(248, 250, 252, 0.7)), url(${blob.src})`,
          backgroundSize: 'cover',
          backgroundPosition: 'top right',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
          padding: '16px'
        }}
      >
        {/* Top Navigation & Actions Row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <BreadcrumbHeader
            currentTitle="Activity & CRM Lifecycle Workspace"
            badge="Revenue Pipeline & Follow-ups"
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Sync Apollo Leads Button */}
            <button
              onClick={handleSyncApollo}
              className="apollo-preset-btn"
              style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}
              title="Import top scored leads from Apollo Discovery into CRM"
            >
              <RefreshCw size={14} style={{ color: '#0ea5e9' }} /> <span>Sync Apollo Leads</span>
            </button>

            {/* Add Account / Lead Button */}
            <button
              onClick={() => setShowAddAccountModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 18px', borderRadius: '8px', background: 'linear-gradient(135deg, #4f46e5, #2563eb)', color: '#ffffff', fontWeight: 800, fontSize: '0.84rem', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)', transition: 'all 0.15s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.3)'; }}
            >
              <Plus size={16} /> Add Account / Lead
            </button>
          </div>
        </div>

        {/* TOP CRM KPI DASHBOARD */}
        {kpis && (() => {
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', width: '100%', boxSizing: 'border-box', marginTop: '12px' }}>
              {[
                { label: 'Total Accounts', value: `${kpis.totalAccounts}`, color: '#3b82f6', pattern: 1, footerText: 'Accts' },
                { label: 'Meetings', value: `${kpis.meetingsScheduled}`, color: '#059669', pattern: 2, footerText: 'Calls' },
                { label: 'Proposals Sent', value: `${kpis.proposalsSent}`, color: '#0284c7', pattern: 3, footerText: 'Sent' },
                { label: 'Negotiation', value: `${kpis.inNegotiation}`, color: '#d97706', pattern: 1, footerText: 'Deals' },
                { label: 'Won Deals', value: `${kpis.wonDeals}`, color: '#047857', pattern: 2, footerText: 'Won' },
                { label: 'Pipeline Revenue', value: `${kpis.pipelineRevenue}`, color: '#4f46e5', pattern: 3, footerText: '' },
                { label: 'Close Win Rate', value: `${kpis.winRate}`, color: '#7c3aed', pattern: 1, footerText: '' },
              ].map((card, idx) => (
                <div key={idx} className="metric-card-summary" style={{ '--glow-color': card.color } as React.CSSProperties}>
                  <Sparkline color={card.color} pattern={card.pattern} />
                  <span className="m-label">{card.label}</span>
                  <span className="m-value" style={{ color: card.color }}>{card.value}</span>
                  <span className="m-footer">
                    {card.footerText}
                  </span>
                </div>
              ))}
            </div>
          );
        })()}

        {/* VIEW MODE 1: KANBAN STAGE FUNNEL VIEW */}
        {viewMode === 'kanban' ? (
          <div style={{ display: 'flex', overflowX: 'auto', gap: '12px', paddingBottom: '20px', width: '100%', boxSizing: 'border-box', marginTop: '16px' }}>
            {CRM_STAGES.map((stg) => {
              const stageAccounts = accounts.filter(a => a.stage === stg);
              const totalStageValue = stageAccounts.reduce((sum, a) => sum + a.dealValueNumber, 0);

              return (
                <div key={stg} style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '270px', flex: '0 0 auto', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', boxSizing: 'border-box' }}>
                  {/* Stage Header */}
                  <div style={{ borderBottom: '1.5px solid var(--border-subtle)', paddingBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        {stg}
                      </h4>
                      <span style={{ fontSize: '0.94rem', color: '#2563eb', fontWeight: 700 }}>
                        ${totalStageValue.toLocaleString()}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.8rem', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', padding: '3px 10px', borderRadius: '6px', fontWeight: 800 }}>
                      {stageAccounts.length}
                    </span>
                  </div>

                  {/* Account Cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {stageAccounts.length === 0 ? (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '28px 0', textAlign: 'center', border: '1.5px dashed var(--border-subtle)', borderRadius: '8px' }}>
                        No accounts in {stg}
                      </div>
                    ) : (
                      stageAccounts.map((acc) => (
                        <div
                          key={acc.id}
                          onClick={() => { setSelectedAccount(acc); setViewMode('detail'); }}
                          className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg p-3 cursor-pointer flex flex-col gap-1.5 transition-all duration-150 box-border hover:border-[var(--accent-indigo)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.05)] hover:-translate-y-0.5"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                              {acc.name}
                            </span>
                            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-success)', background: 'var(--color-success-bg)', padding: '3px 8px', borderRadius: '4px' }}>
                              {acc.dealValue}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {acc.industry} • {acc.location}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)', marginTop: '4px' }}>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                              Win: <strong style={{ color: 'var(--accent-indigo)' }}>{acc.winProbability}%</strong>
                            </span>

                            <div onClick={(e) => e.stopPropagation()} style={{ minWidth: '140px' }}>
                              <CustomDropdown
                                value={acc.stage}
                                onChange={(val) => handleStageChange(acc, val as CrmStage)}
                                options={CRM_STAGES.map((s) => ({ value: s, label: s }))}
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* VIEW MODE 2: 3-PANE ACCOUNT DETAIL VIEW */
          <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '16px', alignItems: 'flex-start', width: '100%', boxSizing: 'border-box', marginTop: '16px' }}>
            {/* LEFT PANEL: Account List & Search */}
            <div style={{ flex: '0 0 250px', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', boxSizing: 'border-box', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.01em' }}>
                  <Building2 size={18} style={{ color: '#2563eb' }} /> Accounts ({accounts.length})
                </h3>
                <button
                  onClick={() => setShowAddAccountModal(true)}
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #2563eb)', color: '#ffffff', border: 'none', cursor: 'pointer', fontSize: '0.86rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px', borderRadius: '4px', transition: 'all 0.15s ease', boxShadow: '0 3px 8px rgba(37, 99, 235, 0.25)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 5px 12px rgba(37, 99, 235, 0.35)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 3px 8px rgba(37, 99, 235, 0.25)'; }}
                >
                  <Plus size={14} /> Add
                </button>
              </div>

              {/* Universal Search Bar */}
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: '#64748b' }} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search accounts, tech, tags..."
                  style={{ width: '100%', height: '40px', padding: '0 12px 0 36px', borderRadius: '8px', background: '#f8fafc', color: '#0f172a', border: '1.5px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 600, outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s' }}
                  onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = '#ffffff'; e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              {/* Stage Filter Dropdown */}
              <div style={{ minWidth: '220px' }}>
                <CustomDropdown
                  value={selectedStageFilter}
                  onChange={(val) => setSelectedStageFilter(val)}
                  options={[
                    { value: '', label: 'All Lifecycle Stages' },
                    ...CRM_STAGES.map((s) => ({ value: s, label: s }))
                  ]}
                />
              </div>

              {/* Account List Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: 'calc(100vh - 300px)', paddingRight: '2px' }}>
                {loading ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Loader2 size={16} className="spin-anim" /> Loading CRM accounts...
                  </div>
                ) : accounts.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', background: '#f8fafc', borderRadius: '12px', border: '1.5px dashed #cbd5e1', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem' }}>No accounts in CRM</div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: '1.5' }}>
                      Add an account or sync top leads from Apollo.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                      <button onClick={() => setShowAddAccountModal(true)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 16px', borderRadius: '8px', background: 'linear-gradient(135deg, #4f46e5, #2563eb)', color: '#ffffff', fontWeight: 800, fontSize: '0.85rem', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)', transition: 'all 0.15s ease' }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.35)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.25)'; }}
                      >
                        <Plus size={16} /> Add Account
                      </button>
                      <button onClick={handleSyncApollo} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 16px', borderRadius: '8px', background: '#ffffff', color: '#0f172a', fontWeight: 700, fontSize: '0.85rem', border: '1.5px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.15s ease', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                      >
                        <RefreshCw size={16} style={{ color: '#0ea5e9' }} /> Sync Apollo Leads
                      </button>
                    </div>
                  </div>
                ) : (
                  accounts.map((acc) => {
                    const isSelected = selectedAccount?.id === acc.id;
                    return (
                      <div
                        key={acc.id}
                        onClick={() => setSelectedAccount(acc)}
                        className={`transition-all duration-200 box-border cursor-pointer flex flex-col gap-1.5`}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '10px',
                          border: isSelected ? '1.5px solid #6366f1' : '1.5px solid #e2e8f0',
                          background: isSelected ? 'linear-gradient(to right, #f8faff, #ffffff)' : '#ffffff',
                          boxShadow: isSelected ? '0 4px 14px rgba(99, 102, 241, 0.12)' : '0 2px 4px rgba(0,0,0,0.01)',
                          transform: isSelected ? 'translateX(2px)' : 'none',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = '#cbd5e1';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.04)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = '#e2e8f0';
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.01)';
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', lineHeight: '1.2' }}>
                            {acc.name}
                          </span>
                          <span style={{ fontSize: '0.72rem', background: '#ecfdf5', color: '#059669', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, whiteSpace: 'nowrap', border: '1px solid #d1fae5' }}>
                            {acc.dealValue}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                          <span style={{ fontSize: '0.74rem', color: '#4f46e5', fontWeight: 700, background: '#e0e7ff', padding: '2px 6px', borderRadius: '4px' }}>
                            {acc.stage}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
                            Win: <strong style={{ color: '#0f172a', fontWeight: 700 }}>{acc.winProbability}%</strong>
                          </span>
                        </div>

                        <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Building2 size={12} style={{ opacity: 0.6 }} />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {acc.industry}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* CENTER WORKSPACE: Account Details & Tabs */}
            {selectedAccount ? (
              <div style={{ flex: '1 1 0%', minWidth: '400px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', boxSizing: 'border-box', overflow: 'hidden' }}>
                {/* Account Header */}
                <div style={{ borderBottom: '1.5px solid var(--border-subtle)', paddingBottom: '16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                        {selectedAccount.name}
                      </h2>
                      <a
                        href={`https://${selectedAccount.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.78rem', color: 'var(--accent-indigo)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}
                      >
                        <Globe size={13} /> {selectedAccount.domain}
                      </a>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginTop: '6px' }}>
                      <span>📍 {selectedAccount.location}</span>
                      <span>🏢 {selectedAccount.industry}</span>
                      <span>💰 ARR: <strong style={{ color: 'var(--text-primary)' }}>{selectedAccount.revenue}</strong></span>
                      <span>👤 Owner: <strong style={{ color: 'var(--text-primary)' }}>{selectedAccount.owner}</strong></span>
                    </div>
                  </div>

                  {/* Quick Stage Mover & Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', padding: '14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 180px', minWidth: '180px', maxWidth: '280px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stage</span>
                      <div style={{ flex: 1 }}>
                        <CustomDropdown
                          value={selectedAccount.stage}
                          onChange={(val) => handleStageChange(selectedAccount, val as CrmStage)}
                          options={CRM_STAGES.map(s => ({ value: s, label: s }))}
                        />
                      </div>
                    </div>

                    <div style={{ width: '1.5px', height: '28px', background: '#cbd5e1', margin: '0 4px' }} />

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => setShowMeetingModal(true)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 18px',
                          fontSize: '0.85rem',
                          background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                          color: '#ffffff',
                          fontWeight: 800,
                          border: 'none',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25), inset 0 1px 0 rgba(255,255,255,0.2)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 18px rgba(79, 70, 229, 0.35), inset 0 1px 0 rgba(255,255,255,0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.25), inset 0 1px 0 rgba(255,255,255,0.2)';
                        }}
                      >
                        <Video size={16} style={{ color: '#ffffff' }} /> Log Meeting
                      </button>

                      <button
                        onClick={() => setShowProposalModal(true)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.82rem', background: '#ffffff', color: '#0f172a', fontWeight: 700, border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0284c7'; e.currentTarget.style.color = '#0284c7'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.transform = 'none'; }}
                      >
                        <FileText size={15} style={{ color: '#0284c7' }} /> Proposal
                      </button>

                      <button
                        onClick={() => setShowTaskModal(true)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.82rem', background: '#ffffff', color: '#0f172a', fontWeight: 700, border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-success)'; e.currentTarget.style.color = 'var(--color-success)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.transform = 'none'; }}
                      >
                        <Plus size={15} style={{ color: 'var(--color-success)' }} /> Task
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tabs Navigation */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', paddingBottom: '16px', borderBottom: '1.5px solid #e2e8f0', marginTop: '28px' }}>
                  {[
                    { id: 'overview', label: 'Overview & Contacts', count: selectedAccount.decisionMakers.length },
                    { id: 'meetings', label: 'Meetings', count: selectedAccount.meetings.length },
                    { id: 'proposals', label: 'Proposals', count: selectedAccount.proposals.length },
                    { id: 'tasks', label: 'Tasks', count: selectedAccount.tasks.length },
                    { id: 'timeline', label: 'Activity Timeline', count: selectedAccount.timeline.length },
                  ].map((t) => {
                    const isActive = activeCenterTab === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setActiveCenterTab(t.id as any)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 18px',
                          borderRadius: '9999px',
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          transition: 'all 0.2s ease',
                          background: isActive ? '#eef2ff' : '#ffffff',
                          color: isActive ? '#4f46e5' : '#64748b',
                          border: isActive ? '1px solid #c7d2fe' : '1px solid #e2e8f0',
                          boxShadow: isActive ? '0 4px 12px rgba(79, 70, 229, 0.1)' : '0 2px 4px rgba(0,0,0,0.02)'
                        }}
                        onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#334155'; } }}
                        onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#64748b'; } }}
                      >
                        {t.label}
                        <span style={{
                          fontSize: '0.7rem',
                          background: isActive ? '#4f46e5' : '#f1f5f9',
                          color: isActive ? '#ffffff' : '#64748b',
                          padding: '2px 10px',
                          borderRadius: '12px',
                          fontWeight: 900
                        }}>
                          {t.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* TAB 1: OVERVIEW & CONTACTS */}
                {activeCenterTab === 'overview' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {/* Decision Makers Section */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                          Key Decision Makers & Stakeholders
                        </h4>
                        <span style={{ fontSize: '0.75rem', background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                          {selectedAccount.decisionMakers.length} Contacts
                        </span>
                      </div>

                      {selectedAccount.decisionMakers.length === 0 ? (
                        <div style={{ background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: '12px', padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '2rem', marginBottom: '4px' }}>👥</span>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>No contacts linked yet</span>
                          <span style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', maxWidth: '300px' }}>Sync leads from Apollo Discovery to automatically populate decision makers here.</span>
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                          {selectedAccount.decisionMakers.map((dm, idx) => (
                            <div key={idx} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default' }}
                              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.02)'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                            >
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                <div>
                                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{dm.name}</div>
                                  <div style={{ fontSize: '0.8rem', color: '#4f46e5', fontWeight: 700, marginTop: '2px' }}>{dm.title}</div>
                                </div>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800, color: '#4338ca' }}>
                                  {dm.name.charAt(0)}
                                </div>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                                {dm.email && (
                                  <a href={`mailto:${dm.email}`} style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                                    <Mail size={14} style={{ color: '#10b981' }} /> {dm.email}
                                  </a>
                                )}
                                {dm.phone && (
                                  <div style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Phone size={14} style={{ color: '#64748b' }} /> {dm.phone}
                                  </div>
                                )}
                                {dm.linkedinUrl && (
                                  <a href={dm.linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#0ea5e9', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none', marginTop: '2px' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                                    LinkedIn Profile ➔
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Tech Stack & Enterprise Signals */}
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                          Technologies & Enterprise Signals
                        </h4>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        {selectedAccount.technologies.length === 0 && selectedAccount.tags.length === 0 && (
                          <span style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>No technical signals recorded.</span>
                        )}
                        {selectedAccount.technologies.map((tech, idx) => (
                          <span key={`tech-${idx}`} style={{ fontSize: '0.8rem', padding: '6px 12px', borderRadius: '8px', background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 4px rgba(67, 56, 202, 0.05)' }}>
                            <Zap size={12} /> {tech}
                          </span>
                        ))}
                        {selectedAccount.tags.map((tag, idx) => (
                          <span key={`tag-${idx}`} style={{ fontSize: '0.8rem', padding: '6px 12px', borderRadius: '8px', background: '#dcfce7', color: '#059669', border: '1px solid #a7f3d0', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 4px rgba(5, 150, 105, 0.05)' }}>
                            <Sparkles size={12} /> #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: MEETINGS */}
                {activeCenterTab === 'meetings' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        Scheduled & Logged Meetings ({selectedAccount.meetings.length})
                      </h4>
                      <button
                        onClick={() => setShowMeetingModal(true)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 16px',
                          fontSize: '0.8rem',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: '#ffffff',
                          fontWeight: 800,
                          border: 'none',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25), inset 0 1px 0 rgba(255,255,255,0.2)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.35), inset 0 1px 0 rgba(255,255,255,0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.25), inset 0 1px 0 rgba(255,255,255,0.2)';
                        }}
                      >
                        <Plus size={15} style={{ color: '#ffffff' }} /> Log Meeting
                      </button>
                    </div>

                    {selectedAccount.meetings.length === 0 ? (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '30px 0', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '10px' }}>
                        No meetings logged yet for this account. Click &quot;+ Log Meeting&quot; above to record a discovery session.
                      </div>
                    ) : (
                      selectedAccount.meetings.map((m) => (
                        <div key={m.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h5 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{m.title}</h5>
                            <span style={{ fontSize: '0.75rem', color: 'var(--accent-indigo)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Calendar size={13} /> {m.date}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <strong>Attendees:</strong> {m.attendees.join(', ')}
                          </div>
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-primary)', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '6px', margin: 0 }}>
                            {m.outcome}
                          </p>
                          {m.googleMeetUrl && (
                            <a href={m.googleMeetUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: 'var(--accent-indigo)', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                              <Video size={14} /> Join Google Meet Link ➔
                            </a>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* TAB 3: PROPOSALS */}
                {activeCenterTab === 'proposals' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        Commercial Proposals & Scopes ({selectedAccount.proposals.length})
                      </h4>
                      <button
                        onClick={() => setShowProposalModal(true)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'linear-gradient(135deg, #4f46e5, #2563eb)', color: '#ffffff', fontWeight: 800, fontSize: '0.8rem', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s ease', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)', whiteSpace: 'nowrap' }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.4)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.3)'; }}
                      >
                        <Plus size={14} /> New Proposal
                      </button>
                    </div>

                    {selectedAccount.proposals.length === 0 ? (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '30px 0', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '10px' }}>
                        No proposals recorded for this account. Click &quot;+ New Proposal&quot; to attach an estimate.
                      </div>
                    ) : (
                      selectedAccount.proposals.map((p) => (
                        <div key={p.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                              Proposal {p.version} — Value: <strong style={{ color: 'var(--color-success)' }}>{p.value}</strong>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Issued: {p.date} • Expiry: {p.expiryDate}
                            </div>
                          </div>

                          <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px', background: p.status === 'Accepted' ? 'var(--color-success-bg)' : 'var(--accent-indigo-glow)', color: p.status === 'Accepted' ? 'var(--color-success)' : 'var(--accent-indigo)', fontWeight: 800 }}>
                            {p.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* TAB 4: TASKS */}
                {activeCenterTab === 'tasks' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        Action Items & Next Steps ({selectedAccount.tasks.length})
                      </h4>
                      <button
                        onClick={() => setShowTaskModal(true)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'linear-gradient(135deg, #4f46e5, #2563eb)', color: '#ffffff', fontWeight: 800, fontSize: '0.8rem', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s ease', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)', whiteSpace: 'nowrap' }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.4)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.3)'; }}
                      >
                        <Plus size={14} /> Add Task
                      </button>
                    </div>

                    {selectedAccount.tasks.length === 0 ? (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '30px 0', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '10px' }}>
                        No open tasks. Click &quot;+ Add Task&quot; to set an action item.
                      </div>
                    ) : (
                      selectedAccount.tasks.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => handleToggleTask(t.id)}
                          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', opacity: t.completed ? 0.6 : 1 }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {t.completed ? (
                              <CheckSquare size={18} style={{ color: 'var(--color-success)' }} />
                            ) : (
                              <Square size={18} style={{ color: 'var(--text-muted)' }} />
                            )}
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', textDecoration: t.completed ? 'line-through' : 'none' }}>
                                {t.title}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                Due: {t.dueDate} • Assigned: {t.assignedUser}
                              </div>
                            </div>
                          </div>

                          <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '4px', background: t.priority === 'HIGH' ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-secondary)', color: t.priority === 'HIGH' ? '#ef4444' : 'var(--text-muted)', fontWeight: 800 }}>
                            {t.priority}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* TAB 5: TIMELINE & NOTE LOGGER */}
                {activeCenterTab === 'timeline' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Quick Note Input Form */}
                    <form onSubmit={handleAddNote} style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="Add a quick note, call summary or stage update..."
                        style={{ flex: 1, height: '40px', padding: '0 14px', borderRadius: '8px', background: '#ffffff', color: '#0f172a', border: '1.5px solid var(--border-subtle)', fontSize: '0.84rem', fontWeight: 600, outline: 'none' }}
                      />
                      <button type="submit" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0 20px', height: '40px', background: 'linear-gradient(135deg, #4f46e5, #2563eb)', color: '#ffffff', fontWeight: 800, fontSize: '0.8rem', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s ease', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)', whiteSpace: 'nowrap' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.4)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.3)'; }}>
                        <Send size={14} /> Log Note
                      </button>
                    </form>

                    {/* Chronological Activity Feed */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {selectedAccount.timeline.map((item) => (
                        <div key={item.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px' }}>
                          <div style={{ background: 'var(--accent-indigo-glow)', padding: '8px', borderRadius: '50%', color: 'var(--accent-indigo)', flexShrink: 0 }}>
                            <Sparkles size={14} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                {item.title}
                              </div>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                {item.timeAgo}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
                              {item.details}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ flex: '1 1 0%', minWidth: '400px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '60px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '20px', borderRadius: '50%', color: '#3b82f6', boxShadow: '0 0 30px rgba(59, 130, 246, 0.2)' }}>
                  <Building2 size={42} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
                    CRM Sales & Customer Lifecycle Pipeline
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: '500px', margin: '12px auto 0 auto', lineHeight: '1.5', fontWeight: 500 }}>
                    Track and nurture enterprise accounts through every sales stage: Lead ➔ Meeting Scheduled ➔ Proposal Sent ➔ Negotiation ➔ Closed Deals.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button
                    onClick={() => setShowAddAccountModal(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 18px', borderRadius: '8px', background: 'linear-gradient(135deg, #4f46e5, #2563eb)', color: '#ffffff', fontWeight: 800, fontSize: '0.84rem', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)', transition: 'all 0.15s ease' }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.4)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.3)'; }}
                  >
                    <Plus size={16} /> Add Account / Lead
                  </button>
                  <button onClick={handleSyncApollo} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 18px', borderRadius: '8px', background: '#ffffff', color: 'var(--text-primary)', fontWeight: 800, fontSize: '0.84rem', border: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'all 0.15s ease', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                    <RefreshCw size={16} style={{ color: '#0ea5e9' }} /> Sync Apollo Leads
                  </button>
                </div>
              </div>
            )}

            {/* RIGHT PANEL: AI CRM Assistant */}
            <div style={{ flex: '0 0 280px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', borderTop: '4px solid #3b82f6', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', boxSizing: 'border-box', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1.5px solid var(--border-subtle)', paddingBottom: '12px' }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '8px', borderRadius: '8px' }}>
                  <Zap size={18} style={{ color: '#3b82f6' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>AI CRM Assistant</h3>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Account Intelligence & Pitch Strategy</span>
                </div>
              </div>

              {!selectedAccount ? (
                <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <Sparkles size={24} style={{ color: 'var(--accent-indigo)' }} />
                  <p style={{ margin: 0, lineHeight: '1.4' }}>
                    Select or add an account to generate real-time deal closing probability, buying signals, and custom discovery recommendations.
                  </p>
                </div>
              ) : aiLoading || !aiBriefing ? (
                <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <Loader2 size={18} className="spin-anim" /> Analyzing account signals...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Closing Probability */}
                  <div style={{ background: 'var(--color-success-bg)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800 }}>Probability To Close</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-success)', marginTop: '2px' }}>
                      {aiBriefing.probabilityToClose}% <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>High Intent</span>
                    </div>
                  </div>

                  {/* Buying Signals */}
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-primary)', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                      Detected Buying Signals
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {aiBriefing.buyingSignals.map((sig, idx) => (
                        <span key={idx} style={{ fontSize: '0.72rem', background: 'var(--color-success-bg)', color: 'var(--color-success)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '5px 8px', borderRadius: '6px', fontWeight: 600 }}>
                          {sig}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Recommended Next Action */}
                  <div style={{ background: 'var(--accent-indigo-glow)', border: '1px solid var(--border-subtle)', padding: '12px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-indigo)', textTransform: 'uppercase' }}>Recommended Next Action</div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-primary)', marginTop: '4px', margin: 0, lineHeight: '1.4', fontWeight: 600 }}>
                      {aiBriefing.recommendedNextAction}
                    </p>
                  </div>

                  {/* Discovery Questions */}
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-primary)', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                      Suggested Discovery Questions
                    </label>
                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {aiBriefing.discoveryQuestions.map((q, idx) => (
                        <li key={idx}>{q}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL 1: ADD ACCOUNT / LEAD */}
        {showAddAccountModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowAddAccountModal(false)}>
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', width: '100%', maxWidth: '580px', padding: '28px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)', display: 'flex', flexDirection: 'column', gap: '24px', boxSizing: 'border-box' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #f1f5f9', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: 'linear-gradient(135deg, #4f46e5, #2563eb)', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}>
                    <Building2 size={20} style={{ color: '#ffffff' }} />
                  </div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>Add New CRM Account / Lead</h3>
                </div>
                <button onClick={() => setShowAddAccountModal(false)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', padding: 0 }} onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b'; }}>
                  <span style={{ fontSize: '1.35rem', lineHeight: '1' }}>×</span>
                </button>
              </div>

              <form onSubmit={handleCreateAccount} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>Company Name *</label>
                    <input type="text" required value={newAccName} onChange={(e) => setNewAccName(e.target.value)} placeholder="e.g. Apex BioTech"
                      style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#0f172a', fontSize: '0.96rem', fontWeight: 600, outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                      onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = '#ffffff'; e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>Domain *</label>
                    <input type="text" required value={newAccDomain} onChange={(e) => setNewAccDomain(e.target.value)} placeholder="e.g. apexbio.com"
                      style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#0f172a', fontSize: '0.96rem', fontWeight: 600, outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                      onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = '#ffffff'; e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>Industry</label>
                    <input type="text" value={newAccIndustry} onChange={(e) => setNewAccIndustry(e.target.value)} placeholder="e.g. HealthTech / FinTech"
                      style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#0f172a', fontSize: '0.96rem', fontWeight: 600, outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                      onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = '#ffffff'; e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>Target Deal Value ($)</label>
                    <input type="number" value={newAccDealValue} onChange={(e) => setNewAccDealValue(e.target.value)} placeholder="50000"
                      style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#0f172a', fontSize: '0.96rem', fontWeight: 600, outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                      onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = '#ffffff'; e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>Lifecycle Stage</label>
                    <CustomDropdown
                      value={newAccStage}
                      onChange={(val) => setNewAccStage(val as CrmStage)}
                      options={CRM_STAGES.map((s) => ({ value: s, label: s }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>Location</label>
                    <input type="text" value={newAccLocation} onChange={(e) => setNewAccLocation(e.target.value)} placeholder="e.g. San Francisco, CA"
                      style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#0f172a', fontSize: '0.96rem', fontWeight: 600, outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                      onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = '#ffffff'; e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>

                <div style={{ borderTop: '1.5px solid #f1f5f9', paddingTop: '20px', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#2563eb', display: 'block', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Primary Decision Maker Contact</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ fontSize: '0.88rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '6px' }}>Contact Name</label>
                      <input type="text" value={newAccContactName} onChange={(e) => setNewAccContactName(e.target.value)} placeholder="e.g. Jane Doe"
                        style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontSize: '0.96rem', fontWeight: 600, outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                        onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
                        onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.88rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '6px' }}>Contact Title / Role</label>
                      <input type="text" value={newAccContactTitle} onChange={(e) => setNewAccContactTitle(e.target.value)} placeholder="e.g. Chief Technology Officer"
                        style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontSize: '0.96rem', fontWeight: 600, outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                        onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
                        onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '0.88rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '6px' }}>Work Email</label>
                      <input type="email" value={newAccContactEmail} onChange={(e) => setNewAccContactEmail(e.target.value)} placeholder="jane@company.com"
                        style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontSize: '0.96rem', fontWeight: 600, outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                        onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
                        onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.88rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '6px' }}>Phone (Optional)</label>
                      <input type="text" value={newAccContactPhone} onChange={(e) => setNewAccContactPhone(e.target.value)} placeholder="+1 (555) 019-2834"
                        style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontSize: '0.96rem', fontWeight: 600, outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                        onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
                        onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', paddingTop: '20px', borderTop: '1.5px solid #f1f5f9' }}>
                  <button type="button" onClick={() => setShowAddAccountModal(false)} style={{ padding: '10px 18px', borderRadius: '8px', background: '#ffffff', color: '#475569', fontWeight: 700, fontSize: '0.96rem', border: '1px solid #cbd5e1', cursor: 'pointer', transition: 'all 0.15s ease' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#0f172a'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#475569'; }}>
                    Cancel
                  </button>
                  <button type="submit" style={{ padding: '10px 22px', borderRadius: '8px', background: 'linear-gradient(135deg, #4f46e5, #2563eb)', color: '#ffffff', fontWeight: 800, fontSize: '0.96rem', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)', transition: 'all 0.15s ease' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.4)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.3)'; }}>
                    Create Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: LOG MEETING */}
        {showMeetingModal && selectedAccount && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowMeetingModal(false)}>
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', width: '100%', maxWidth: '540px', padding: '28px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)', display: 'flex', flexDirection: 'column', gap: '24px', boxSizing: 'border-box' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #f1f5f9', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)' }}>
                    <Video size={20} style={{ color: '#ffffff' }} />
                  </div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
                    Log Meeting for {selectedAccount.name}
                  </h3>
                </div>
                <button onClick={() => setShowMeetingModal(false)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', padding: 0 }} onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b'; }}>
                  <span style={{ fontSize: '1.35rem', lineHeight: '1' }}>×</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>Meeting Title *</label>
                  <input type="text" value={meetingTitle} onChange={(e) => setMeetingTitle(e.target.value)} placeholder="e.g. Technical Discovery & Architecture Alignment"
                    style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#0f172a', fontSize: '0.96rem', fontWeight: 600, outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                    onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.background = '#ffffff'; e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>Meeting Date</label>
                    <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)}
                      style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#0f172a', fontSize: '0.96rem', fontWeight: 600, outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                      onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.background = '#ffffff'; e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>Meet / Zoom URL</label>
                    <input type="text" value={googleMeetUrl} onChange={(e) => setGoogleMeetUrl(e.target.value)} placeholder="https://meet.google.com/abc-xyz"
                      style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#0f172a', fontSize: '0.96rem', fontWeight: 600, outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                      onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.background = '#ffffff'; e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>Attendees (comma separated)</label>
                  <input type="text" value={meetingAttendees} onChange={(e) => setMeetingAttendees(e.target.value)} placeholder="Dr. Sarah Jenkins, Akash (BD Owner)"
                    style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#0f172a', fontSize: '0.96rem', fontWeight: 600, outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                    onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.background = '#ffffff'; e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>Outcome & Action Items</label>
                  <textarea value={meetingOutcome} onChange={(e) => setMeetingOutcome(e.target.value)} placeholder="Summarize meeting discussions, budget confirmation, and next steps..." rows={4}
                    style={{ width: '100%', padding: '14px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#0f172a', fontSize: '0.96rem', fontWeight: 600, outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box', resize: 'vertical', minHeight: '100px' }}
                    onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.background = '#ffffff'; e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', paddingTop: '20px', borderTop: '1.5px solid #f1f5f9' }}>
                  <button onClick={() => setShowMeetingModal(false)} style={{ padding: '10px 18px', borderRadius: '8px', background: '#ffffff', color: '#475569', fontWeight: 700, fontSize: '0.96rem', border: '1px solid #cbd5e1', cursor: 'pointer', transition: 'all 0.15s ease' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#0f172a'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#475569'; }}>
                    Cancel
                  </button>
                  <button onClick={handleAddMeeting} style={{ padding: '10px 22px', borderRadius: '8px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: '#ffffff', fontWeight: 800, fontSize: '0.96rem', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)', transition: 'all 0.15s ease' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(139, 92, 246, 0.4)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)'; }}>
                    Save Meeting
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: ADD PROPOSAL */}
        {showProposalModal && selectedAccount && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowProposalModal(false)}>
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', width: '100%', maxWidth: '520px', padding: '28px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)', display: 'flex', flexDirection: 'column', gap: '24px', boxSizing: 'border-box' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #f1f5f9', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)' }}>
                    <FileText size={20} style={{ color: '#ffffff' }} />
                  </div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
                    Generate Proposal for {selectedAccount.name}
                  </h3>
                </div>
                <button onClick={() => setShowProposalModal(false)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', padding: 0 }} onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b'; }}>
                  <span style={{ fontSize: '1.35rem', lineHeight: '1' }}>×</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>Proposal Version / Title *</label>
                  <input type="text" value={proposalVersion} onChange={(e) => setProposalVersion(e.target.value)} placeholder="e.g. v1.0-Squad Modernization Proposal"
                    style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#0f172a', fontSize: '0.96rem', fontWeight: 600, outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                    onFocus={(e) => { e.target.style.borderColor = '#f59e0b'; e.target.style.background = '#ffffff'; e.target.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.1)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>Contract Value ($)</label>
                    <input type="text" value={proposalValue} onChange={(e) => setProposalValue(e.target.value)} placeholder="$65,000"
                      style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#0f172a', fontSize: '0.96rem', fontWeight: 600, outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                      onFocus={(e) => { e.target.style.borderColor = '#f59e0b'; e.target.style.background = '#ffffff'; e.target.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.1)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>Expiry Date</label>
                    <input type="date" value={proposalExpiry} onChange={(e) => setProposalExpiry(e.target.value)}
                      style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#0f172a', fontSize: '0.96rem', fontWeight: 600, outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                      onFocus={(e) => { e.target.style.borderColor = '#f59e0b'; e.target.style.background = '#ffffff'; e.target.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.1)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', paddingTop: '20px', borderTop: '1.5px solid #f1f5f9' }}>
                  <button onClick={() => setShowProposalModal(false)} style={{ padding: '10px 18px', borderRadius: '8px', background: '#ffffff', color: '#475569', fontWeight: 700, fontSize: '0.96rem', border: '1px solid #cbd5e1', cursor: 'pointer', transition: 'all 0.15s ease' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#0f172a'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#475569'; }}>
                    Cancel
                  </button>
                  <button onClick={handleAddProposal} style={{ padding: '10px 22px', borderRadius: '8px', background: 'linear-gradient(135deg, #f59e0b, #ea580c)', color: '#ffffff', fontWeight: 800, fontSize: '0.96rem', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)', transition: 'all 0.15s ease' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(245, 158, 11, 0.4)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)'; }}>
                    Attach Proposal
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 4: ADD TASK */}
        {showTaskModal && selectedAccount && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowTaskModal(false)}>
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', width: '100%', maxWidth: '520px', padding: '28px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)', display: 'flex', flexDirection: 'column', gap: '24px', boxSizing: 'border-box' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #f1f5f9', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}>
                    <CheckSquare size={20} style={{ color: '#ffffff' }} />
                  </div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
                    Add Action Item for {selectedAccount.name}
                  </h3>
                </div>
                <button onClick={() => setShowTaskModal(false)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', padding: 0 }} onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b'; }}>
                  <span style={{ fontSize: '1.35rem', lineHeight: '1' }}>×</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>Task Title *</label>
                  <input type="text" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="e.g. Send technical architecture blueprint to CTO"
                    style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#0f172a', fontSize: '0.96rem', fontWeight: 600, outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                    onFocus={(e) => { e.target.style.borderColor = '#10b981'; e.target.style.background = '#ffffff'; e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>Priority</label>
                    <CustomDropdown
                      value={taskPriority}
                      onChange={(val) => setTaskPriority(val as 'HIGH' | 'NORMAL' | 'LOW')}
                      options={[
                        { value: 'HIGH', label: 'HIGH Priority' },
                        { value: 'NORMAL', label: 'NORMAL' },
                        { value: 'LOW', label: 'LOW' }
                      ]}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>Due Date</label>
                    <input type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)}
                      style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#0f172a', fontSize: '0.96rem', fontWeight: 600, outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                      onFocus={(e) => { e.target.style.borderColor = '#10b981'; e.target.style.background = '#ffffff'; e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', paddingTop: '20px', borderTop: '1.5px solid #f1f5f9' }}>
                  <button onClick={() => setShowTaskModal(false)} style={{ padding: '10px 18px', borderRadius: '8px', background: '#ffffff', color: '#475569', fontWeight: 700, fontSize: '0.96rem', border: '1px solid #cbd5e1', cursor: 'pointer', transition: 'all 0.15s ease' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#0f172a'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#475569'; }}>
                    Cancel
                  </button>
                  <button onClick={handleAddTask} style={{ padding: '10px 22px', borderRadius: '8px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff', fontWeight: 800, fontSize: '0.96rem', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)', transition: 'all 0.15s ease' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)'; }}>
                    Create Task
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
