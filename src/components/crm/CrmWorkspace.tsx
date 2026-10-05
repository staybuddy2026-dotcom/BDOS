'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Briefcase, Building2, DollarSign, Download, Globe, Hand, Info, Kanban, List, Loader2, Mail, MapPin, Phone, Plus, Search, Trash2, Trophy, User, UserPlus, Users, X,
} from 'lucide-react';
import {
  assignDealsAction,
  bulkUpdateStageAction,
  createDealAction,
  deleteDealsAction,
  getCrmBoard,
  getDealDetail,
  importLeadsFromDiscovery,
  markDealWonAction,
  updateDealStageAction,
} from '@/features/crm/actions';
import type { MailboxStatus } from '@/features/email/actions';
import { DEAL_STAGES, LOST_REASONS, SOURCE_LABELS, STALE_AFTER_DAYS, formatUsd } from '@/features/crm/types';
import type { CrmBoard, DealDetail, DealStage, DealSummary, LeadSource } from '@/features/crm/types';
import s from '@/components/ui/ui.module.css';
import { useToast } from '@/components/ui/useToast';
import c from './crm.module.css';
import { DealBoard } from './DealBoard';
import { DealTable } from './DealTable';
import { CrmDealDrawer } from './CrmDealDrawer';

type View = 'board' | 'table';
type LostRequest = { deals: DealSummary[]; bulk: boolean };
type WonHandoff = { deal: DealSummary; value: string; startDate: string; clientContact: string; scope: string };

const emptyLead = {
  companyName: '', domain: '', industry: '', location: '',
  contactName: '', contactTitle: '', contactEmail: '', contactPhone: '', contactLinkedin: '',
  value: '', stage: 'LEAD' as DealStage, ownerId: '',
};

/**
 * The team's pipeline: one list of deals shown as a board or a table, with a drawer for the selected deal.
 * The whole visible pipeline is loaded once and filtered in the browser, so search and filters are instant.
 */
export function CrmWorkspace({ initialBoard, mailbox, initialDealId }: { initialBoard: CrmBoard; mailbox: MailboxStatus; initialDealId?: string }) {
  const [board, setBoard] = useState(initialBoard);
  const { me, team, canSeeAll, kpis } = board;

  const [view, setView] = useState<View>('board');
  const [search, setSearch] = useState('');
  const [owner, setOwner] = useState('');
  const [source, setSource] = useState<LeadSource | ''>('');
  const [attentionOnly, setAttentionOnly] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(initialDealId || null);
  const [detail, setDetail] = useState<DealDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(!!initialDealId);
  const selectedRef = useRef<string | null>(selectedId);

  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [bulkOwner, setBulkOwner] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [lead, setLead] = useState<typeof emptyLead | null>(null);
  const [lost, setLost] = useState<LostRequest | null>(null);
  const [lostReason, setLostReason] = useState(LOST_REASONS[0]);
  const [lostNote, setLostNote] = useState('');
  const [won, setWon] = useState<WonHandoff | null>(null);

  const { toast, notify: showToast } = useToast();
  const notify = useCallback((type: 'success' | 'error', msg: string) => showToast(msg, type === 'error'), [showToast]);

  const loadDetail = useCallback(async (dealId: string) => {
    try {
      const next = await getDealDetail(dealId);
      // Ignore the answer if another deal was opened (or the drawer closed) in the meantime.
      if (selectedRef.current === dealId) setDetail(next);
    } catch {
      if (selectedRef.current === dealId) setDetail(null);
    } finally {
      if (selectedRef.current === dealId) setDetailLoading(false);
    }
  }, []);

  const reload = useCallback(async () => {
    try {
      const [next] = await Promise.all([getCrmBoard(), selectedRef.current ? loadDetail(selectedRef.current) : null]);
      setBoard(next);
      setSelection((prev) => new Set([...prev].filter((id) => next.deals.some((d) => d.id === id))));
    } catch {
      notify('error', 'Could not refresh the pipeline. Please reload the page.');
    }
  }, [loadDetail, notify]);

  // Deep link (?deal=<id>) opens that deal's drawer on arrival.
  useEffect(() => {
    if (!initialDealId) return;
    getDealDetail(initialDealId)
      .then((next) => { if (selectedRef.current === initialDealId) setDetail(next); })
      .catch(() => { /* the drawer shows "not found" */ })
      .finally(() => { if (selectedRef.current === initialDealId) setDetailLoading(false); });
  }, [initialDealId]);

  const openDeal = (dealId: string) => {
    selectedRef.current = dealId;
    setSelectedId(dealId);
    setDetail(null);
    setDetailLoading(true);
    loadDetail(dealId);
  };
  const closeDeal = useCallback(() => {
    selectedRef.current = null;
    setSelectedId(null);
    setDetail(null);
  }, []);

  const deals = useMemo(() => {
    const q = search.trim().toLowerCase();
    return board.deals.filter((d) => {
      if (owner === 'unassigned' ? d.owner : owner && d.owner?.id !== owner) return false;
      if (source && d.source !== source) return false;
      if (attentionOnly && !d.isOverdue && !d.isStale) return false;
      if (!q) return true;
      return [d.title, d.company.name, d.company.domain, d.company.industry, d.primaryContact?.name, d.primaryContact?.email, d.nextAction, d.owner?.name]
        .some((v) => v?.toLowerCase().includes(q));
    });
  }, [board.deals, search, owner, source, attentionOnly]);

  const filtered = !!(search.trim() || owner || source || attentionOnly);
  const selectedDeals = board.deals.filter((d) => selection.has(d.id));

  /** Runs a server action, shows the outcome and reloads the pipeline. */
  const run = async (key: string, action: () => Promise<{ error?: string; message?: string }>, success?: string | ((res: { message?: string }) => string)): Promise<boolean> => {
    setBusy(key);
    try {
      const res = await action();
      if (res.error) { notify('error', res.error); await reload(); return false; }
      const text = typeof success === 'function' ? success(res) : success || res.message;
      if (text) notify('success', text);
      await reload();
      return true;
    } catch {
      notify('error', 'Something went wrong. Please try again.');
      return false;
    } finally {
      setBusy(null);
    }
  };

  const moveDeal = (deal: DealSummary, stage: DealStage) => {
    if (deal.stage === stage) return;
    if (stage === 'LOST') { setLostReason(LOST_REASONS[0]); setLostNote(''); return setLost({ deals: [deal], bulk: false }); }
    if (stage === 'WON') {
      const contact = deal.primaryContact;
      return setWon({
        deal,
        value: deal.value != null ? String(deal.value) : '',
        startDate: '',
        clientContact: contact ? [contact.name, contact.email].filter(Boolean).join(' · ') : '',
        scope: '',
      });
    }
    // Show the card in its new column straight away; the reload confirms (or reverts) it.
    setBoard((prev) => ({ ...prev, deals: prev.deals.map((d) => (d.id === deal.id ? { ...d, stage } : d)) }));
    run('move', () => updateDealStageAction(deal.id, stage), `${deal.company.name} moved to ${DEAL_STAGES.find((st) => st.id === stage)?.label}.`);
  };

  const confirmLost = async () => {
    if (!lost) return;
    const reason = [lostReason, lostNote.trim()].filter(Boolean).join(': ');
    const ok = lost.bulk
      ? await run('lost', () => bulkUpdateStageAction(lost.deals.map((d) => d.id), 'LOST', reason), `${lost.deals.length} deal${lost.deals.length === 1 ? '' : 's'} marked as lost.`)
      : await run('lost', () => updateDealStageAction(lost.deals[0].id, 'LOST', reason), `${lost.deals[0].company.name} marked as lost.`);
    if (ok) { setLost(null); if (lost.bulk) setSelection(new Set()); }
  };

  const confirmWon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!won) return;
    const value = won.value.trim() ? Number(won.value.replace(/[$,\s]/g, '')) : null;
    if (value !== null && (!Number.isFinite(value) || value < 0)) return notify('error', 'Enter the final value as a number, e.g. 25000.');
    const ok = await run('won', () => markDealWonAction(won.deal.id, { value, startDate: won.startDate || null, clientContact: won.clientContact, scope: won.scope }));
    if (ok) setWon(null);
  };

  const claim = (deal: DealSummary) => run('claim', () => assignDealsAction([deal.id], me.id), `${deal.company.name} is now yours.`);

  const deleteDeals = async (targets: { id: string; company: { name: string } }[]) => {
    if (!targets.length) return;
    const label = targets.length === 1 ? `the deal for ${targets[0].company.name}` : `${targets.length} deals`;
    if (!window.confirm(`Delete ${label}? Its notes, tasks, meetings and proposals are deleted too. This cannot be undone.`)) return;
    const ids = targets.map((t) => t.id);
    if (selectedId && ids.includes(selectedId)) closeDeal();
    if (await run('delete', () => deleteDealsAction(ids), (res) => `${(res as { count?: number }).count ?? ids.length} deal(s) deleted.`)) setSelection(new Set());
  };

  const bulkStage = (stage: DealStage) => {
    if (stage === 'LOST') { setLostReason(LOST_REASONS[0]); setLostNote(''); return setLost({ deals: selectedDeals, bulk: true }); }
    run('bulk', () => bulkUpdateStageAction([...selection], stage), (res) => `${(res as { count?: number }).count ?? 0} deal(s) moved to ${DEAL_STAGES.find((st) => st.id === stage)?.label}.`)
      .then((ok) => ok && setSelection(new Set()));
  };

  const bulkAssign = (ownerId: string | null) =>
    run('bulk', () => assignDealsAction([...selection], ownerId), (res) => `${(res as { count?: number }).count ?? 0} deal(s) ${ownerId ? 'assigned' : 'returned to the unassigned pool'}.`)
      .then((ok) => { if (ok) { setSelection(new Set()); setBulkOwner(''); } });

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;
    const value = lead.value.trim() ? Number(lead.value.replace(/[$,\s]/g, '')) : null;
    if (value !== null && (!Number.isFinite(value) || value < 0)) return notify('error', 'Enter the deal value as a number, e.g. 25000.');
    const ok = await run('lead', () => createDealAction({
      ...lead,
      value,
      ownerId: canSeeAll ? lead.ownerId || null : undefined,
    }));
    if (ok) setLead(null);
  };

  const attention = kpis.overdueActions + kpis.staleDeals;

  return (
    <div className={s.root}>
      {toast}

      {/* KPIs */}
      <div className={s.kpiGrid}>
        <div className={s.kpi}>
          <div className={s.kpiHead}>Open deals</div>
          <div className={s.kpiValue}>{kpis.openDeals}</div>
          <div className={s.kpiFoot}>{kpis.unassigned ? `${kpis.unassigned} unassigned` : 'All assigned'}</div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiHead}>Open pipeline</div>
          <div className={s.kpiValue}>{formatUsd(kpis.pipelineValue)}</div>
          <div className={s.kpiFoot}>{formatUsd(kpis.weightedValue)} weighted by win chance</div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiHead}>Won</div>
          <div className={s.kpiValue}>{formatUsd(kpis.wonValue)}</div>
          <div className={s.kpiFoot}>{kpis.wonDeals} won · {kpis.lostDeals} lost</div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiHead}>Win rate</div>
          <div className={s.kpiValue}>{kpis.winRate === null ? '—' : `${kpis.winRate}%`}</div>
          <div className={s.kpiFoot}>{kpis.winRate === null ? 'No closed deals yet' : 'Won out of all closed deals'}</div>
        </div>
        <button type="button" className={`${s.kpi} ${c.kpiButton} ${attentionOnly ? c.kpiButtonActive : ''}`} aria-pressed={attentionOnly} onClick={() => setAttentionOnly((v) => !v)} title="Show only deals that need attention">
          <div className={s.kpiHead}>Needs attention</div>
          <div className={`${s.kpiValue} ${attention ? c.kpiAlert : ''}`}>{attention}</div>
          <div className={s.kpiFoot}>{kpis.overdueActions} overdue · {kpis.staleDeals} quiet for {STALE_AFTER_DAYS}+ days</div>
        </button>
      </div>

      {/* Toolbar */}
      <div className={c.toolbar}>
        <div className={c.toolbarSearch}>
          <Search size={16} />
          <input className={s.input} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company, contact, email or next action" aria-label="Search deals" />
        </div>
        <select className={s.select} value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Filter by owner">
          <option value="">{canSeeAll ? 'All owners' : 'Mine + unassigned'}</option>
          <option value={me.id}>My deals</option>
          <option value="unassigned">Unassigned</option>
          {canSeeAll && team.filter((u) => u.id !== me.id).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select className={s.select} value={source} onChange={(e) => setSource(e.target.value as LeadSource | '')} aria-label="Filter by source">
          <option value="">All sources</option>
          {(Object.keys(SOURCE_LABELS) as LeadSource[]).map((src) => <option key={src} value={src}>{SOURCE_LABELS[src]}</option>)}
        </select>
        <div className={s.chipRow} role="group" aria-label="View">
          <button type="button" className={`${s.chip} ${view === 'board' ? s.chipActive : ''}`} style={{ height: 42 }} aria-pressed={view === 'board'} onClick={() => setView('board')}><Kanban size={15} /> Board</button>
          <button type="button" className={`${s.chip} ${view === 'table' ? s.chipActive : ''}`} style={{ height: 42 }} aria-pressed={view === 'table'} onClick={() => setView('table')}><List size={15} /> Table</button>
        </div>
        <span className={c.spacer} />
        <button type="button" className={`${s.btn} ${s.btnSecondary}`} style={{ height: 42 }} disabled={busy !== null} onClick={() => run('import', () => importLeadsFromDiscovery())} title="Imports up to 6 new leads from Universal Search into your pipeline">
          {busy === 'import' ? <Loader2 size={15} className={s.spin} /> : <Download size={15} />} Import leads
        </button>
        <button type="button" className={`${s.btn} ${s.btnPrimary}`} style={{ height: 42 }} onClick={() => setLead({ ...emptyLead, ownerId: me.id })}>
          <Plus size={16} /> Add lead
        </button>
      </div>

      {/* Bulk actions */}
      {view === 'table' && selection.size > 0 && (
        <div className={c.bulkBar} role="region" aria-label="Bulk actions">
          <span>{selection.size} selected</span>
          <select className={`${s.select} ${s.selectSm}`} aria-label="Move selected deals to stage" value="" disabled={busy !== null} onChange={(e) => e.target.value && bulkStage(e.target.value as DealStage)}>
            <option value="">Move to stage…</option>
            {DEAL_STAGES.map((st) => <option key={st.id} value={st.id}>{st.label}</option>)}
          </select>
          {canSeeAll ? (
            <>
              <select className={`${s.select} ${s.selectSm}`} aria-label="Assign selected deals to" value={bulkOwner} disabled={busy !== null} onChange={(e) => setBulkOwner(e.target.value)}>
                <option value="">Assign to…</option>
                <option value="unassigned">Unassigned pool</option>
                {team.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} disabled={!bulkOwner || busy !== null} onClick={() => bulkAssign(bulkOwner === 'unassigned' ? null : bulkOwner)}><Users size={13} /> Assign</button>
            </>
          ) : (
            <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} disabled={busy !== null} onClick={() => bulkAssign(me.id)}><Hand size={13} /> Claim for me</button>
          )}
          <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm} ${c.dangerBtn}`} disabled={busy !== null} onClick={() => deleteDeals(selectedDeals)}><Trash2 size={13} /> Delete</button>
          <span className={c.spacer} />
          <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={() => setSelection(new Set())}>Clear</button>
        </div>
      )}

      {/* Pipeline */}
      {board.deals.length === 0 ? (
        <div className={s.empty} style={{ padding: '56px 20px' }}>
          <Kanban size={28} style={{ opacity: 0.5 }} />
          <div className={s.emptyTitle}>Your pipeline is empty</div>
          Add a lead by hand, import leads from Universal Search, or send people to the CRM from the Apollo and LinkedIn pages.
          <div className={s.actionGroup} style={{ justifyContent: 'center', marginTop: 16 }}>
            <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => setLead({ ...emptyLead, ownerId: me.id })}><Plus size={15} /> Add lead</button>
          </div>
        </div>
      ) : deals.length === 0 ? (
        <div className={s.empty}>
          <div className={s.emptyTitle}>No deals match these filters</div>
          <button type="button" className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} style={{ marginTop: 10 }} onClick={() => { setSearch(''); setOwner(''); setSource(''); setAttentionOnly(false); }}>Clear filters</button>
        </div>
      ) : view === 'board' ? (
        <DealBoard deals={deals} me={me} canSeeAll={canSeeAll} selectedId={selectedId} onOpen={openDeal} onMove={moveDeal} onClaim={claim} />
      ) : (
        <DealTable
          deals={deals}
          me={me}
          canSeeAll={canSeeAll}
          selected={selection}
          onToggle={(id) => setSelection((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; })}
          onToggleAll={() => setSelection((prev) => (deals.every((d) => prev.has(d.id)) ? new Set() : new Set(deals.map((d) => d.id))))}
          onOpen={openDeal}
          onMove={moveDeal}
        />
      )}
      {filtered && deals.length > 0 && <div className={s.cellSub}>Showing {deals.length} of {board.deals.length} deals.</div>}

      {/* Deal drawer */}
      {selectedId && (
        <CrmDealDrawer
          deal={detail}
          loading={detailLoading}
          me={me}
          team={team}
          canSeeAll={canSeeAll}
          mailbox={mailbox}
          onClose={closeDeal}
          onChanged={reload}
          onMove={(stage) => { const d = board.deals.find((x) => x.id === selectedId); if (d) moveDeal(d, stage); }}
          onDelete={() => detail && deleteDeals([detail])}
          notify={notify}
        />
      )}

      {/* Add lead */}
      {lead && (
        <div className={s.backdrop} onClick={() => busy === null && setLead(null)}>
          <form className={c.leadModal} role="dialog" aria-modal="true" aria-labelledby="lead-title" onClick={(e) => e.stopPropagation()} onSubmit={submitLead}>
            <div className={c.leadModalTopStripe} />
            <div className={c.leadModalHeader}>
              <div className={c.leadModalHeaderLeft}>
                <div className={c.leadModalIcon}>
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className={c.leadModalTitle} id="lead-title">Add a lead</h3>
                  <p className={c.leadModalSubtitle}>Create a new deal and attach primary contact details</p>
                </div>
              </div>
              <button type="button" className={c.leadModalCloseBtn} onClick={() => setLead(null)} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className={c.leadModalBody}>
              <div className={c.leadModalNotice}>
                <Info size={16} className={c.leadModalNoticeIcon} />
                <div>
                  <strong>Duplicate protection:</strong> If this company already has an open deal, the contact will be added to that deal instead of creating a duplicate.
                </div>
              </div>

              {/* Company Details */}
              <div className={c.formSection}>
                <div className={c.formSectionHead}>
                  <Building2 size={13} className={c.formSectionIcon} /> Company Details
                </div>
                <div className={c.fieldGrid}>
                  <div className={c.field}>
                    <label className={c.fieldLabel} htmlFor="lead-company">
                      Company <span className={c.fieldRequired}>*</span>
                    </label>
                    <div className={c.inputWithIcon}>
                      <Building2 size={14} className={c.inputIconPrefix} />
                      <input
                        id="lead-company"
                        className={`${s.input} ${c.inputSm} ${c.inputPrefixed}`}
                        required
                        autoFocus
                        placeholder="e.g. Acme Corp"
                        value={lead.companyName}
                        onChange={(e) => setLead({ ...lead, companyName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className={c.field}>
                    <label className={c.fieldLabel} htmlFor="lead-domain">Website</label>
                    <div className={c.inputWithIcon}>
                      <Globe size={14} className={c.inputIconPrefix} />
                      <input
                        id="lead-domain"
                        className={`${s.input} ${c.inputSm} ${c.inputPrefixed}`}
                        placeholder="acme.com"
                        value={lead.domain}
                        onChange={(e) => setLead({ ...lead, domain: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className={c.field}>
                    <label className={c.fieldLabel} htmlFor="lead-industry">Industry</label>
                    <div className={c.inputWithIcon}>
                      <Briefcase size={14} className={c.inputIconPrefix} />
                      <input
                        id="lead-industry"
                        className={`${s.input} ${c.inputSm} ${c.inputPrefixed}`}
                        placeholder="e.g. SaaS, Fintech"
                        value={lead.industry}
                        onChange={(e) => setLead({ ...lead, industry: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className={c.field}>
                    <label className={c.fieldLabel} htmlFor="lead-location">Location</label>
                    <div className={c.inputWithIcon}>
                      <MapPin size={14} className={c.inputIconPrefix} />
                      <input
                        id="lead-location"
                        className={`${s.input} ${c.inputSm} ${c.inputPrefixed}`}
                        placeholder="e.g. San Francisco, CA"
                        value={lead.location}
                        onChange={(e) => setLead({ ...lead, location: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Primary Contact */}
              <div className={c.formSection}>
                <div className={c.formSectionHead}>
                  <User size={13} className={c.formSectionIcon} /> Primary Contact
                </div>
                <div className={c.fieldGrid}>
                  <div className={c.field}>
                    <label className={c.fieldLabel} htmlFor="lead-contact">Contact name</label>
                    <div className={c.inputWithIcon}>
                      <User size={14} className={c.inputIconPrefix} />
                      <input
                        id="lead-contact"
                        className={`${s.input} ${c.inputSm} ${c.inputPrefixed}`}
                        placeholder="e.g. Jane Doe"
                        value={lead.contactName}
                        onChange={(e) => setLead({ ...lead, contactName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className={c.field}>
                    <label className={c.fieldLabel} htmlFor="lead-contact-title">Job title</label>
                    <input
                      id="lead-contact-title"
                      className={`${s.input} ${c.inputSm}`}
                      placeholder="e.g. VP of Sales"
                      value={lead.contactTitle}
                      onChange={(e) => setLead({ ...lead, contactTitle: e.target.value })}
                    />
                  </div>

                  <div className={c.field}>
                    <label className={c.fieldLabel} htmlFor="lead-email">Email</label>
                    <div className={c.inputWithIcon}>
                      <Mail size={14} className={c.inputIconPrefix} />
                      <input
                        id="lead-email"
                        type="email"
                        className={`${s.input} ${c.inputSm} ${c.inputPrefixed}`}
                        placeholder="jane@acme.com"
                        value={lead.contactEmail}
                        onChange={(e) => setLead({ ...lead, contactEmail: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className={c.field}>
                    <label className={c.fieldLabel} htmlFor="lead-phone">Phone</label>
                    <div className={c.inputWithIcon}>
                      <Phone size={14} className={c.inputIconPrefix} />
                      <input
                        id="lead-phone"
                        className={`${s.input} ${c.inputSm} ${c.inputPrefixed}`}
                        placeholder="+1 (555) 000-0000"
                        value={lead.contactPhone}
                        onChange={(e) => setLead({ ...lead, contactPhone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className={`${c.field} ${c.fieldWide}`}>
                    <label className={c.fieldLabel} htmlFor="lead-linkedin">LinkedIn profile URL</label>
                    <input
                      id="lead-linkedin"
                      className={`${s.input} ${c.inputSm}`}
                      placeholder="https://www.linkedin.com/in/username"
                      value={lead.contactLinkedin}
                      onChange={(e) => setLead({ ...lead, contactLinkedin: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Deal & Pipeline */}
              <div className={c.formSection}>
                <div className={c.formSectionHead}>
                  <Kanban size={13} className={c.formSectionIcon} /> Deal & Pipeline
                </div>
                <div className={c.fieldGrid}>
                  <div className={c.field}>
                    <label className={c.fieldLabel} htmlFor="lead-value">Deal value (USD)</label>
                    <div className={c.inputWithIcon}>
                      <DollarSign size={14} className={c.inputIconPrefix} />
                      <input
                        id="lead-value"
                        className={`${s.input} ${c.inputSm} ${c.inputPrefixed}`}
                        inputMode="numeric"
                        placeholder="Leave empty if unknown"
                        value={lead.value}
                        onChange={(e) => setLead({ ...lead, value: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className={c.field}>
                    <label className={c.fieldLabel} htmlFor="lead-stage">Stage</label>
                    <select
                      id="lead-stage"
                      className={s.select}
                      style={{ height: 36 }}
                      value={lead.stage}
                      onChange={(e) => setLead({ ...lead, stage: e.target.value as DealStage })}
                    >
                      {DEAL_STAGES.filter((st) => st.id !== 'LOST').map((st) => (
                        <option key={st.id} value={st.id}>{st.label}</option>
                      ))}
                    </select>
                  </div>

                  {canSeeAll && (
                    <div className={`${c.field} ${c.fieldWide}`}>
                      <label className={c.fieldLabel} htmlFor="lead-owner">Owner</label>
                      <select
                        id="lead-owner"
                        className={s.select}
                        style={{ height: 36 }}
                        value={lead.ownerId}
                        onChange={(e) => setLead({ ...lead, ownerId: e.target.value })}
                      >
                        <option value="">Unassigned pool</option>
                        {team.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={c.leadModalFooter}>
              <button
                type="button"
                className={c.btnCancel}
                onClick={() => setLead(null)}
                disabled={busy !== null}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={c.btnSubmitLead}
                disabled={busy !== null}
              >
                {busy === 'lead' ? <Loader2 size={15} className={s.spin} /> : <Plus size={15} />}
                Add to pipeline
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Won: handoff to delivery */}
      {won && (
        <div className={s.backdrop} style={{ zIndex: 9500 }} onClick={() => busy === null && setWon(null)}>
          <form className={`${s.modal} ${c.modalWide}`} role="dialog" aria-modal="true" aria-labelledby="won-title" onClick={(e) => e.stopPropagation()} onSubmit={confirmWon}>
            <h3 className={s.modalTitle} id="won-title"><Trophy size={17} /> {won.deal.company.name} is won</h3>
            <p className={s.modalText}>Fill in the handoff for the delivery team. It is saved on the deal&apos;s timeline.</p>
            <div className={c.fieldGrid}>
              <div className={c.field}>
                <label className={c.fieldLabel} htmlFor="won-value">Final value (USD)</label>
                <input id="won-value" className={`${s.input} ${c.inputSm}`} inputMode="numeric" placeholder="e.g. 25000" value={won.value} onChange={(e) => setWon({ ...won, value: e.target.value })} />
              </div>
              <div className={c.field}>
                <label className={c.fieldLabel} htmlFor="won-start">Work starts</label>
                <input id="won-start" type="date" className={`${s.input} ${c.inputSm}`} value={won.startDate} onChange={(e) => setWon({ ...won, startDate: e.target.value })} />
              </div>
              <div className={`${c.field} ${c.fieldWide}`}>
                <label className={c.fieldLabel} htmlFor="won-contact">Client contact</label>
                <input id="won-contact" className={`${s.input} ${c.inputSm}`} placeholder="Name and email of the person delivery will work with" value={won.clientContact} onChange={(e) => setWon({ ...won, clientContact: e.target.value })} />
              </div>
              <div className={`${c.field} ${c.fieldWide}`}>
                <label className={c.fieldLabel} htmlFor="won-scope">What was sold *</label>
                <textarea id="won-scope" className={s.textarea} rows={4} required autoFocus placeholder="Services, team size, key deliverables, anything promised to the client" value={won.scope} onChange={(e) => setWon({ ...won, scope: e.target.value })} maxLength={4000} />
              </div>
            </div>
            <div className={s.modalActions}>
              <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={() => setWon(null)} disabled={busy !== null}>Cancel</button>
              <button type="submit" className={`${s.btn} ${s.btnSuccess}`} disabled={busy !== null}>
                {busy === 'won' ? <Loader2 size={15} className={s.spin} /> : <Trophy size={15} />} Mark as won
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lost reason */}
      {lost && (
        <div className={s.backdrop} style={{ zIndex: 9500 }} onClick={() => busy === null && setLost(null)}>
          <div className={s.modal} role="dialog" aria-modal="true" aria-labelledby="lost-title" onClick={(e) => e.stopPropagation()}>
            <h3 className={s.modalTitle} id="lost-title">Why was {lost.deals.length === 1 ? lost.deals[0].company.name : `these ${lost.deals.length} deals`} lost?</h3>
            <p className={s.modalText}>The reason is saved on the deal, so the team can see what to improve.</p>
            <div className={s.chipRow} role="group" aria-label="Lost reason">
              {LOST_REASONS.map((r) => (
                <button key={r} type="button" className={`${s.chip} ${lostReason === r ? s.chipActive : ''}`} aria-pressed={lostReason === r} onClick={() => setLostReason(r)}>{r}</button>
              ))}
            </div>
            <input className={s.input} placeholder="Details (optional)" aria-label="Details" value={lostNote} onChange={(e) => setLostNote(e.target.value)} maxLength={300} />
            <div className={s.modalActions}>
              <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={() => setLost(null)} disabled={busy !== null}>Cancel</button>
              <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={confirmLost} disabled={busy !== null}>
                {busy === 'lost' && <Loader2 size={15} className={s.spin} />} Mark as lost
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
