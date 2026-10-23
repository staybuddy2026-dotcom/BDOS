'use client';

import { useState, useMemo } from 'react';
import type { UserRole } from '@prisma/client';
import {
  KeyRound,
  Loader2,
  Mail,
  UserPlus,
  X,
  Search,
  Users,
  Trophy,
  Zap,
  ShieldCheck,
  Compass,
  LayoutGrid,
  List,
  Check,
  Copy,
  Clock,
  Sparkles,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  RotateCcw,
} from 'lucide-react';
import {
  createTeamMemberAction,
  getTeamMembersAction,
  resetTeamMemberPasswordAction,
  updateTeamMemberAction,
} from '@/features/team/actions';
import type { TeamMember } from '@/features/team/actions';
import { ROLE_LABELS } from '@/lib/roles';
import { useToast } from '@/components/ui/useToast';
import { Time } from '@/components/crm/ui';
import '@/styles/team.css';

const ROLES: UserRole[] = ['BDE', 'MANAGER', 'ADMIN'];

const ROLE_HELP: Record<UserRole, string> = {
  BDE: 'Works their own deals and can claim unassigned leads.',
  MANAGER: 'Sees and reassigns every deal in the team.',
  ADMIN: 'Everything a manager can do, plus managing team members.',
};

const emptyMember = { name: '', email: '', role: 'BDE' as UserRole, password: '' };

/** Generates deterministic gradient for member avatar */
function getAvatarGradient(name: string, role: UserRole): string {
  if (role === 'ADMIN') {
    return 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)';
  }
  if (role === 'MANAGER') {
    return 'linear-gradient(135deg, #2563eb 0%, #38bdf8 100%)';
  }
  // BDE
  const hash = (name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradients = [
    'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
    'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
    'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)',
  ];
  return gradients[hash % gradients.length];
}

/** Extracts 2-letter uppercase initials */
function getInitials(name: string): string {
  const parts = (name || '').trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Generates a secure temporary password with letters, numbers, and symbols */
function generateSecurePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let pass = '';
  for (let i = 0; i < 12; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

/**
 * Enterprise Team Workspace
 * Provides high-density KPI telemetry, visual roster cards, tabular data views,
 * role governance, and fast credential provisioning.
 */
export function TeamWorkspace({
  initialMembers,
  meId,
  canManage,
}: {
  initialMembers: TeamMember[];
  meId: string;
  canManage: boolean;
}) {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState<typeof emptyMember | null>(null);
  const [reset, setReset] = useState<{ member: TeamMember; password: string } | null>(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Interactive password visibility toggles
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const { toast, notify } = useToast();

  /** Runs an admin action, shows the outcome and reloads the list. */
  const run = async (key: string, action: () => Promise<{ error?: string }>, success: string): Promise<boolean> => {
    setBusy(key);
    try {
      const res = await action();
      if (res.error) {
        notify(res.error, true);
        return false;
      }
      notify(success);
      setMembers(await getTeamMembersAction());
      return true;
    } catch {
      notify('Something went wrong. Please try again.', true);
      return false;
    } finally {
      setBusy(null);
    }
  };

  /** Copies text to clipboard with toast feedback */
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(text);
    notify(`${label} copied to clipboard`);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = members.length;
    const active = members.filter((m) => m.isActive);
    const activeCount = active.length;
    const adminCount = members.filter((m) => m.role === 'ADMIN' && m.isActive).length;
    const managerCount = members.filter((m) => m.role === 'MANAGER' && m.isActive).length;
    const bdeCount = members.filter((m) => m.role === 'BDE' && m.isActive).length;
    const totalOpenDeals = members.reduce((sum, m) => sum + m.openDeals, 0);
    const avgDeals = activeCount > 0 ? (totalOpenDeals / activeCount).toFixed(1) : '0';
    const totalWonDeals = members.reduce((sum, m) => sum + m.wonDeals, 0);
    const mailboxesConnected = active.filter((m) => m.hasMailbox).length;
    const maxDeals = Math.max(...members.map((m) => m.openDeals), 1);
    const topPerformer = members.length > 0 ? [...members].sort((a, b) => b.wonDeals - a.wonDeals)[0] : null;

    return {
      total,
      activeCount,
      adminCount,
      managerCount,
      bdeCount,
      totalOpenDeals,
      avgDeals,
      totalWonDeals,
      mailboxesConnected,
      maxDeals,
      topPerformer,
    };
  }, [members]);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      // Role filter
      if (roleFilter !== 'ALL' && m.role !== roleFilter) return false;
      // Status filter
      if (statusFilter === 'ACTIVE' && !m.isActive) return false;
      if (statusFilter === 'INACTIVE' && m.isActive) return false;
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = m.name.toLowerCase().includes(query);
        const matchesEmail = m.email.toLowerCase().includes(query);
        const matchesRole = ROLE_LABELS[m.role].toLowerCase().includes(query);
        return matchesName || matchesEmail || matchesRole;
      }
      return true;
    });
  }, [members, roleFilter, statusFilter, searchQuery]);

  return (
    <div className="team-container">
      {toast}

      {/* Top Executive KPI Grid */}
      <section className="team-kpi-grid" aria-label="Team Overview Metrics">
        {/* KPI 1: Team Capacity */}
        <div className="team-kpi-card">
          <div className="team-kpi-top">
            <span className="team-kpi-label">Team Capacity</span>
            <div className="team-kpi-icon-wrap" style={{ background: '#eef2ff', color: '#4f46e5' }}>
              <Users size={18} />
            </div>
          </div>
          <div className="team-kpi-val-row">
            <span className="team-kpi-value">{stats.activeCount}</span>
            <span className="team-kpi-unit">/ {stats.total} Active Seats</span>
          </div>
          <div className="team-kpi-footer">
            <div className="team-kpi-pill-group">
              <span className="team-mini-pill" title="Workspace Administrators">{stats.adminCount} Admin</span>
              <span className="team-mini-pill" title="Sales Managers">{stats.managerCount} Mgr</span>
              <span className="team-mini-pill" title="Business Development Executives">{stats.bdeCount} BDE</span>
            </div>
            <span>{Math.round((stats.activeCount / (stats.total || 1)) * 100)}% online</span>
          </div>
        </div>

        {/* KPI 2: Active Pipeline Load */}
        <div className="team-kpi-card">
          <div className="team-kpi-top">
            <span className="team-kpi-label">Pipeline Load</span>
            <div className="team-kpi-icon-wrap" style={{ background: '#eff6ff', color: '#0284c7' }}>
              <Zap size={18} />
            </div>
          </div>
          <div className="team-kpi-val-row">
            <span className="team-kpi-value">{stats.totalOpenDeals}</span>
            <span className="team-kpi-unit">Active Deals</span>
          </div>
          <div className="team-kpi-footer">
            <span>~{stats.avgDeals} deals / active rep</span>
            <span style={{ color: '#0284c7', fontWeight: 600 }}>In Flight</span>
          </div>
        </div>

        {/* KPI 3: Closed Won Performance */}
        <div className="team-kpi-card">
          <div className="team-kpi-top">
            <span className="team-kpi-label">Closed & Won</span>
            <div className="team-kpi-icon-wrap" style={{ background: '#fffbeb', color: '#d97706' }}>
              <Trophy size={18} />
            </div>
          </div>
          <div className="team-kpi-val-row">
            <span className="team-kpi-value">{stats.totalWonDeals}</span>
            <span className="team-kpi-unit">Wins Closed</span>
          </div>
          <div className="team-kpi-footer">
            {stats.topPerformer && stats.topPerformer.wonDeals > 0 ? (
              <span title={`Top performer: ${stats.topPerformer.name}`}>
                🏆 Top: <strong style={{ color: '#0f172a' }}>{stats.topPerformer.name.split(' ')[0]}</strong> ({stats.topPerformer.wonDeals} won)
              </span>
            ) : (
              <span>Team conversion engine</span>
            )}
            <span style={{ color: '#d97706', fontWeight: 600 }}>Pipeline Won</span>
          </div>
        </div>

        {/* KPI 4: Mailbox Deliverability Readiness */}
        <div className="team-kpi-card">
          <div className="team-kpi-top">
            <span className="team-kpi-label">Mailbox Readiness</span>
            <div className="team-kpi-icon-wrap" style={{ background: '#ecfdf5', color: '#059669' }}>
              <Mail size={18} />
            </div>
          </div>
          <div className="team-kpi-val-row">
            <span className="team-kpi-value">{stats.mailboxesConnected}</span>
            <span className="team-kpi-unit">/ {stats.activeCount} Connected</span>
          </div>
          <div className="team-kpi-footer">
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              Direct SMTP Outbound
            </span>
            <span style={{ color: '#059669', fontWeight: 600 }}>Active</span>
          </div>
        </div>
      </section>

      {/* Control Bar: Search, Filters, View Modes & Add Action */}
      <section className="team-control-bar" aria-label="Team Controls">
        <div className="team-controls-left">
          {/* Search Input */}
          <div className="team-search-box">
            <Search size={15} className="team-search-icon" />
            <input
              type="text"
              className="team-search-input"
              placeholder="Search by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="team-search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Role Filter Tabs */}
          <div className="team-filter-tabs" role="tablist" aria-label="Filter by role">
            <button
              type="button"
              className={`team-filter-tab ${roleFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setRoleFilter('ALL')}
            >
              All ({members.length})
            </button>
            <button
              type="button"
              className={`team-filter-tab ${roleFilter === 'ADMIN' ? 'active' : ''}`}
              onClick={() => setRoleFilter('ADMIN')}
            >
              Admins ({stats.adminCount})
            </button>
            <button
              type="button"
              className={`team-filter-tab ${roleFilter === 'MANAGER' ? 'active' : ''}`}
              onClick={() => setRoleFilter('MANAGER')}
            >
              Managers ({stats.managerCount})
            </button>
            <button
              type="button"
              className={`team-filter-tab ${roleFilter === 'BDE' ? 'active' : ''}`}
              onClick={() => setRoleFilter('BDE')}
            >
              BDEs ({stats.bdeCount})
            </button>
          </div>
        </div>

        <div className="team-controls-right">
          {/* Status Filter Toggle */}
          <div className="team-filter-tabs">
            <button
              type="button"
              className={`team-filter-tab ${statusFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setStatusFilter('ALL')}
            >
              All Status
            </button>
            <button
              type="button"
              className={`team-filter-tab ${statusFilter === 'ACTIVE' ? 'active' : ''}`}
              onClick={() => setStatusFilter('ACTIVE')}
            >
              Active
            </button>
            {members.some((m) => !m.isActive) && (
              <button
                type="button"
                className={`team-filter-tab ${statusFilter === 'INACTIVE' ? 'active' : ''}`}
                onClick={() => setStatusFilter('INACTIVE')}
              >
                Deactivated
              </button>
            )}
          </div>

          {/* View Mode Switcher */}
          <div className="team-view-switcher" role="group" aria-label="View mode">
            <button
              type="button"
              className={`team-view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
              aria-label="Table View"
            >
              <List size={16} />
            </button>
            <button
              type="button"
              className={`team-view-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Cards Roster View"
              aria-label="Cards Roster View"
            >
              <LayoutGrid size={16} />
            </button>
          </div>

          {/* Add Team Member CTA */}
          {canManage && (
            <button
              type="button"
              className="team-btn-primary"
              onClick={() => setAdding({ ...emptyMember, password: generateSecurePassword() })}
            >
              <UserPlus size={16} />
              Add Team Member
            </button>
          )}
        </div>
      </section>

      {/* Main Content: Table or Grid */}
      {filteredMembers.length === 0 ? (
        <div className="team-table-card">
          <div className="team-empty-state">
            <div className="team-empty-icon">
              <Search size={22} />
            </div>
            <div className="team-empty-title">No team members match your criteria</div>
            <div className="team-empty-desc">
              Try adjusting your search terms, role filters, or status toggles to view team members.
            </div>
            <button
              type="button"
              className="team-btn-action"
              style={{ marginTop: 8 }}
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('ALL');
                setStatusFilter('ALL');
              }}
            >
              <RotateCcw size={13} />
              Reset Filters
            </button>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="team-table-card">
          <div className="team-table-scroll">
            <table className="team-table">
              <thead>
                <tr>
                  <th>Team Member</th>
                  <th>Role & Access</th>
                  <th>Workload (Open Deals)</th>
                  <th>Deals Won</th>
                  <th>Mailbox Sync</th>
                  <th>Last Sign-In</th>
                  <th>Status</th>
                  {canManage && <th className="team-action-col">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((m) => {
                  const isMe = m.id === meId;
                  const workloadPct = Math.min(Math.round((m.openDeals / stats.maxDeals) * 100), 100);

                  return (
                    <tr key={m.id} className={m.isActive ? undefined : 'team-table-inactive'}>
                      {/* Member Cell with Avatar */}
                      <td>
                        <div className="team-member-cell">
                          <div
                            className="team-avatar"
                            style={{ background: getAvatarGradient(m.name, m.role) }}
                          >
                            {getInitials(m.name)}
                            <span
                              className={`team-status-dot ${m.isActive ? 'active' : 'inactive'}`}
                              title={m.isActive ? 'Active Member' : 'Deactivated Member'}
                            />
                          </div>
                          <div className="team-member-info">
                            <div className="team-member-name-row">
                              <span className="team-member-name">{m.name}</span>
                              {isMe && <span className="team-you-badge">YOU</span>}
                            </div>
                            <div className="team-member-email-row">
                              <span className="team-member-email">{m.email}</span>
                              <button
                                type="button"
                                className="team-copy-btn"
                                onClick={() => copyToClipboard(m.email, 'Email')}
                                title="Copy email address"
                              >
                                {copiedEmail === m.email ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Cell */}
                      <td>
                        {canManage ? (
                          <select
                            className="team-role-select"
                            value={m.role}
                            disabled={busy !== null}
                            title={ROLE_HELP[m.role]}
                            onChange={(e) =>
                              run(
                                m.id,
                                () => updateTeamMemberAction(m.id, { role: e.target.value as UserRole }),
                                `${m.name} is now updated to ${ROLE_LABELS[e.target.value as UserRole]}.`
                              )
                            }
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`team-role-badge ${
                              m.role === 'ADMIN'
                                ? 'role-admin'
                                : m.role === 'MANAGER'
                                ? 'role-manager'
                                : 'role-bde'
                            }`}
                          >
                            {m.role === 'ADMIN' ? (
                              <ShieldCheck size={13} />
                            ) : m.role === 'MANAGER' ? (
                              <Compass size={13} />
                            ) : (
                              <Zap size={13} />
                            )}
                            {ROLE_LABELS[m.role]}
                          </span>
                        )}
                      </td>

                      {/* Workload (Open Deals) with mini meter */}
                      <td className="team-workload-cell">
                        <div className="team-workload-val">
                          <span>{m.openDeals}</span>
                          <span className="team-workload-sub">deals</span>
                        </div>
                        <div className="team-workload-meter" title={`${m.openDeals} open deals`}>
                          <div
                            className="team-workload-fill"
                            style={{
                              width: `${workloadPct}%`,
                              background:
                                workloadPct > 75
                                  ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                                  : 'linear-gradient(90deg, #6366f1, #0ea5e9)',
                            }}
                          />
                        </div>
                      </td>

                      {/* Won Deals */}
                      <td>
                        <span style={{ fontWeight: 800, color: m.wonDeals > 0 ? '#059669' : '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
                          {m.wonDeals > 0 && <Trophy size={13} style={{ color: '#d97706' }} />}
                          {m.wonDeals} won
                        </span>
                      </td>

                      {/* Mailbox Status */}
                      <td>
                        {m.hasMailbox ? (
                          <span className="team-mailbox-badge connected">
                            <Mail size={12} />
                            Connected
                          </span>
                        ) : (
                          <span className="team-mailbox-badge shared">
                            <Mail size={12} />
                            Team Shared
                          </span>
                        )}
                      </td>

                      {/* Last Sign-in */}
                      <td>
                        {m.lastLoginAt ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#334155' }}>
                            <Clock size={12} style={{ color: '#94a3b8' }} />
                            <Time iso={m.lastLoginAt} mode="ago" />
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Never</span>
                        )}
                      </td>

                      {/* Account Status */}
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '999px',
                            background: m.isActive ? '#ecfdf5' : '#f1f5f9',
                            color: m.isActive ? '#047857' : '#64748b',
                            border: `1px solid ${m.isActive ? '#a7f3d0' : '#e2e8f0'}`,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: m.isActive ? '#10b981' : '#94a3b8',
                            }}
                          />
                          {m.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>

                      {/* Action Group */}
                      {canManage && (
                        <td className="team-action-col">
                          <div className="team-action-group">
                            <button
                              type="button"
                              className="team-btn-action"
                              disabled={busy !== null}
                              onClick={() => setReset({ member: m, password: generateSecurePassword() })}
                              title="Reset Password"
                            >
                              <KeyRound size={13} />
                              Reset Password
                            </button>

                            <button
                              type="button"
                              className={`team-btn-action ${m.isActive ? 'btn-danger' : ''}`}
                              disabled={busy !== null || isMe}
                              title={isMe ? 'You cannot deactivate your own account' : undefined}
                              onClick={() =>
                                run(
                                  m.id,
                                  () => updateTeamMemberAction(m.id, { isActive: !m.isActive }),
                                  m.isActive
                                    ? `${m.name} can no longer sign in. Deals remain intact.`
                                    : `${m.name} can now sign in again.`
                                )
                              }
                            >
                              {busy === m.id ? (
                                <Loader2 size={13} className="spin" />
                              ) : m.isActive ? (
                                <UserX size={13} />
                              ) : (
                                <UserCheck size={13} />
                              )}
                              {m.isActive ? 'Deactivate' : 'Reactivate'}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID CARDS VIEW */
        <div className="team-roster-grid">
          {filteredMembers.map((m) => {
            const isMe = m.id === meId;

            return (
              <div key={m.id} className={`team-card ${m.isActive ? '' : 'inactive'}`}>
                {/* Card Header */}
                <div className="team-card-header">
                  <div className="team-card-profile">
                    <div
                      className="team-avatar-lg"
                      style={{ background: getAvatarGradient(m.name, m.role) }}
                    >
                      {getInitials(m.name)}
                      <span
                        className={`team-status-dot ${m.isActive ? 'active' : 'inactive'}`}
                        style={{ width: 12, height: 12, bottom: -1, right: -1 }}
                      />
                    </div>
                    <div>
                      <div className="team-member-name-row">
                        <span className="team-member-name" style={{ fontSize: '0.94rem' }}>
                          {m.name}
                        </span>
                        {isMe && <span className="team-you-badge">YOU</span>}
                      </div>
                      <div className="team-member-email-row" style={{ marginTop: 2 }}>
                        <span className="team-member-email">{m.email}</span>
                        <button
                          type="button"
                          className="team-copy-btn"
                          onClick={() => copyToClipboard(m.email, 'Email')}
                        >
                          {copiedEmail === m.email ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`team-role-badge ${
                      m.role === 'ADMIN'
                        ? 'role-admin'
                        : m.role === 'MANAGER'
                        ? 'role-manager'
                        : 'role-bde'
                    }`}
                  >
                    {m.role === 'ADMIN' ? (
                      <ShieldCheck size={12} />
                    ) : m.role === 'MANAGER' ? (
                      <Compass size={12} />
                    ) : (
                      <Zap size={12} />
                    )}
                    {ROLE_LABELS[m.role]}
                  </span>
                </div>

                {/* 3 Metric Mini Cards */}
                <div className="team-card-metrics">
                  <div className="team-card-metric-item">
                    <span className="team-card-metric-label">Open Deals</span>
                    <span className="team-card-metric-val">{m.openDeals}</span>
                  </div>
                  <div className="team-card-metric-item">
                    <span className="team-card-metric-label">Won Deals</span>
                    <span className="team-card-metric-val" style={{ color: m.wonDeals > 0 ? '#059669' : '#0f172a' }}>
                      {m.wonDeals}
                    </span>
                  </div>
                  <div className="team-card-metric-item">
                    <span className="team-card-metric-label">Mailbox</span>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        marginTop: 4,
                        color: m.hasMailbox ? '#059669' : '#64748b',
                      }}
                    >
                      {m.hasMailbox ? 'Connected' : 'Team Shared'}
                    </span>
                  </div>
                </div>

                {/* Footer with activity and actions */}
                <div className="team-card-footer">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.74rem', color: '#64748b' }}>
                    <Clock size={12} />
                    {m.lastLoginAt ? (
                      <span>Active <Time iso={m.lastLoginAt} mode="ago" /></span>
                    ) : (
                      <span>Never signed in</span>
                    )}
                  </div>

                  {canManage && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        className="team-btn-action"
                        onClick={() => setReset({ member: m, password: generateSecurePassword() })}
                        title="Reset Password"
                      >
                        <KeyRound size={12} />
                        Password
                      </button>

                      <button
                        type="button"
                        className={`team-btn-action ${m.isActive ? 'btn-danger' : ''}`}
                        disabled={busy !== null || isMe}
                        onClick={() =>
                          run(
                            m.id,
                            () => updateTeamMemberAction(m.id, { isActive: !m.isActive }),
                            m.isActive ? `${m.name} deactivated.` : `${m.name} reactivated.`
                          )
                        }
                      >
                        {busy === m.id ? (
                          <Loader2 size={12} className="spin" />
                        ) : m.isActive ? (
                          'Deactivate'
                        ) : (
                          'Reactivate'
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Role & Permissions Architecture Guide */}
      <section className="team-roles-guide" aria-label="Role Permissions Architecture">
        <div className="team-roles-header">
          <div>
            <h3 className="team-roles-title">
              <ShieldCheck size={18} style={{ color: '#6366f1' }} />
              Role & Permissions Governance
            </h3>
            <p className="team-roles-subtitle">
              Every member signs in with their dedicated credentials. Access levels are strictly governed by their role.
            </p>
          </div>
        </div>

        <div className="team-roles-grid">
          {/* Card: BDE */}
          <div className="team-role-card">
            <div className="team-role-card-top">
              <span className="team-role-badge role-bde">
                <Zap size={13} />
                BDE
              </span>
              <span className="team-mini-pill">{stats.bdeCount} Active Seats</span>
            </div>
            <div className="team-role-card-desc">
              Frontline sales rep focused on prospective lead generation, cold outreach, and closing assigned pipeline deals.
            </div>
            <ul className="team-role-bullets">
              <li className="team-role-bullet-item">
                <Check size={13} style={{ color: '#10b981', flexShrink: 0, marginTop: 2 }} />
                <span>Works deals assigned exclusively to them</span>
              </li>
              <li className="team-role-bullet-item">
                <Check size={13} style={{ color: '#10b981', flexShrink: 0, marginTop: 2 }} />
                <span>Can claim unassigned leads from the discovery hub</span>
              </li>
              <li className="team-role-bullet-item">
                <Check size={13} style={{ color: '#10b981', flexShrink: 0, marginTop: 2 }} />
                <span>Connects personal SMTP mailbox for direct outreach</span>
              </li>
            </ul>
          </div>

          {/* Card: Sales Manager */}
          <div className="team-role-card">
            <div className="team-role-card-top">
              <span className="team-role-badge role-manager">
                <Compass size={13} />
                Sales Manager
              </span>
              <span className="team-mini-pill">{stats.managerCount} Active Seats</span>
            </div>
            <div className="team-role-card-desc">
              Sales leadership with 360° visibility across all team pipelines, deal allocations, and performance tracking.
            </div>
            <ul className="team-role-bullets">
              <li className="team-role-bullet-item">
                <Check size={13} style={{ color: '#0284c7', flexShrink: 0, marginTop: 2 }} />
                <span>Sees all deals and customer engagements across the team</span>
              </li>
              <li className="team-role-bullet-item">
                <Check size={13} style={{ color: '#0284c7', flexShrink: 0, marginTop: 2 }} />
                <span>Can reassign deal owners and balance pipeline capacity</span>
              </li>
              <li className="team-role-bullet-item">
                <Check size={13} style={{ color: '#0284c7', flexShrink: 0, marginTop: 2 }} />
                <span>Accesses team-wide revenue reports & funnel analytics</span>
              </li>
            </ul>
          </div>

          {/* Card: Workspace Admin */}
          <div className="team-role-card">
            <div className="team-role-card-top">
              <span className="team-role-badge role-admin">
                <ShieldCheck size={13} />
                Admin
              </span>
              <span className="team-mini-pill">{stats.adminCount} Active Seats</span>
            </div>
            <div className="team-role-card-desc">
              Full workspace administrator with team provisioning, role delegation, security credentials, and integration settings.
            </div>
            <ul className="team-role-bullets">
              <li className="team-role-bullet-item">
                <Check size={13} style={{ color: '#7c3aed', flexShrink: 0, marginTop: 2 }} />
                <span>Add, update roles, or deactivate team members</span>
              </li>
              <li className="team-role-bullet-item">
                <Check size={13} style={{ color: '#7c3aed', flexShrink: 0, marginTop: 2 }} />
                <span>Issue instant password resets for any team member</span>
              </li>
              <li className="team-role-bullet-item">
                <Check size={13} style={{ color: '#7c3aed', flexShrink: 0, marginTop: 2 }} />
                <span>Full manager superpowers plus workspace governance</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Modal: Add Team Member */}
      {adding && (
        <div className="team-modal-backdrop" onClick={() => busy === null && setAdding(null)}>
          <form
            className="team-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-member-title"
            onClick={(e) => e.stopPropagation()}
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await run(
                  'add',
                  () => createTeamMemberAction(adding),
                  `${adding.name} added. Share the email and password with them.`
                )
              ) {
                setAdding(null);
              }
            }}
          >
            <div className="team-modal-header">
              <div>
                <h3 className="team-modal-title" id="add-member-title">
                  <UserPlus size={20} style={{ color: '#4f46e5' }} />
                  Add Team Member
                </h3>
                <p className="team-modal-subtitle">
                  Provision a new team seat. Share their email and initial password with them.
                </p>
              </div>
              <button
                type="button"
                className="team-modal-close"
                onClick={() => setAdding(null)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            {/* Full Name */}
            <div className="team-form-field">
              <label className="team-label" htmlFor="member-name">
                Full Name
              </label>
              <input
                id="member-name"
                className="team-input"
                placeholder="e.g. Sarah Jenkins"
                required
                autoFocus
                value={adding.name}
                onChange={(e) => setAdding({ ...adding, name: e.target.value })}
              />
            </div>

            {/* Email Address */}
            <div className="team-form-field">
              <label className="team-label" htmlFor="member-email">
                Work Email Address
              </label>
              <input
                id="member-email"
                type="email"
                className="team-input"
                placeholder="sarah@yourcompany.com"
                required
                value={adding.email}
                onChange={(e) => setAdding({ ...adding, email: e.target.value })}
              />
            </div>

            {/* Role Selection Tiles */}
            <div className="team-form-field">
              <label className="team-label">Select Role</label>
              <div className="team-role-selector-grid">
                {ROLES.map((role) => (
                  <div
                    key={role}
                    className={`team-role-tile ${adding.role === role ? 'selected' : ''}`}
                    onClick={() => setAdding({ ...adding, role })}
                  >
                    <span className="team-role-tile-name">{ROLE_LABELS[role]}</span>
                    <span className="team-role-tile-badge">
                      {role === 'ADMIN' ? 'Full Access' : role === 'MANAGER' ? 'Team Lead' : 'Sales Rep'}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 4 }}>
                {ROLE_HELP[adding.role]}
              </div>
            </div>

            {/* Temporary Password */}
            <div className="team-form-field">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label className="team-label" htmlFor="member-password">
                  Temporary Password
                </label>
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#4f46e5',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  onClick={() => setAdding({ ...adding, password: generateSecurePassword() })}
                >
                  <Sparkles size={11} /> Generate Secure
                </button>
              </div>

              <div className="team-password-row">
                <input
                  id="member-password"
                  type={showAddPassword ? 'text' : 'password'}
                  className="team-input"
                  style={{ paddingRight: 64 }}
                  required
                  minLength={8}
                  autoComplete="off"
                  value={adding.password}
                  onChange={(e) => setAdding({ ...adding, password: e.target.value })}
                />
                <div className="team-password-actions">
                  <button
                    type="button"
                    className="team-password-icon-btn"
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    title={showAddPassword ? 'Hide password' : 'Show password'}
                  >
                    {showAddPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                At least 8 characters. They can change it under Profile after signing in.
              </span>
            </div>

            {/* Modal Actions */}
            <div className="team-modal-actions">
              <button
                type="button"
                className="team-btn-secondary"
                onClick={() => setAdding(null)}
                disabled={busy !== null}
              >
                Cancel
              </button>
              <button type="submit" className="team-btn-primary" disabled={busy !== null}>
                {busy === 'add' && <Loader2 size={15} className="spin" />}
                Add Member
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Reset Password */}
      {reset && (
        <div className="team-modal-backdrop" onClick={() => busy === null && setReset(null)}>
          <form
            className="team-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
            onClick={(e) => e.stopPropagation()}
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await run(
                  'reset',
                  () => resetTeamMemberPasswordAction(reset.member.id, reset.password),
                  `Password reset for ${reset.member.name}. Share the new password with them.`
                )
              ) {
                setReset(null);
              }
            }}
          >
            <div className="team-modal-header">
              <div>
                <h3 className="team-modal-title" id="reset-title">
                  <KeyRound size={20} style={{ color: '#4f46e5' }} />
                  Reset Password
                </h3>
                <p className="team-modal-subtitle">
                  Provision a replacement password for <strong>{reset.member.name}</strong> ({reset.member.email}).
                </p>
              </div>
              <button
                type="button"
                className="team-modal-close"
                onClick={() => setReset(null)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="team-form-field">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label className="team-label" htmlFor="reset-password-input">
                  New Password
                </label>
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#4f46e5',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  onClick={() => setReset({ ...reset, password: generateSecurePassword() })}
                >
                  <Sparkles size={11} /> Generate Secure
                </button>
              </div>

              <div className="team-password-row">
                <input
                  id="reset-password-input"
                  type={showResetPassword ? 'text' : 'password'}
                  className="team-input"
                  style={{ paddingRight: 64 }}
                  required
                  minLength={8}
                  autoComplete="off"
                  value={reset.password}
                  onChange={(e) => setReset({ ...reset, password: e.target.value })}
                />
                <div className="team-password-actions">
                  <button
                    type="button"
                    className="team-password-icon-btn"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    title={showResetPassword ? 'Hide password' : 'Show password'}
                  >
                    {showResetPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Their old password will stop working immediately. Share this new password securely.
              </span>
            </div>

            <div className="team-modal-actions">
              <button
                type="button"
                className="team-btn-secondary"
                onClick={() => setReset(null)}
                disabled={busy !== null}
              >
                Cancel
              </button>
              <button type="submit" className="team-btn-primary" disabled={busy !== null}>
                {busy === 'reset' && <Loader2 size={15} className="spin" />}
                Confirm Password Reset
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
