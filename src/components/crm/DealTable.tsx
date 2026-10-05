'use client';

import { AlertTriangle, Clock } from 'lucide-react';
import { DEAL_STAGES, SOURCE_LABELS, formatUsd } from '@/features/crm/types';
import type { CrmUser, DealStage, DealSummary } from '@/features/crm/types';
import s from '@/components/ui/ui.module.css';
import c from './crm.module.css';
import { OwnerChip, Time } from './ui';

/** List view of the pipeline with row selection for bulk actions. */
export function DealTable({ deals, me, canSeeAll, selected, onToggle, onToggleAll, onOpen, onMove }: {
  deals: DealSummary[];
  me: CrmUser;
  canSeeAll: boolean;
  selected: Set<string>;
  onToggle: (dealId: string) => void;
  onToggleAll: () => void;
  onOpen: (dealId: string) => void;
  onMove: (deal: DealSummary, stage: DealStage) => void;
}) {
  const allSelected = deals.length > 0 && deals.every((d) => selected.has(d.id));

  return (
    <div className={s.tableWrap} style={{ margin: 0, border: '1px solid var(--o-border)', borderRadius: 'var(--o-radius)', background: 'var(--o-bg)' }}>
      <table className={s.table}>
        <thead>
          <tr>
            <th style={{ width: 44 }}>
              <input type="checkbox" className={c.checkbox} aria-label="Select all deals" checked={allSelected} onChange={onToggleAll} />
            </th>
            <th>Company</th>
            <th>Contact</th>
            <th>Stage</th>
            <th>Value</th>
            <th>Owner</th>
            <th>Next action</th>
            <th>Last activity</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {deals.map((deal) => {
            const editable = canSeeAll || deal.owner?.id === me.id;
            return (
              <tr key={deal.id} className={c.rowClickable} onClick={() => onOpen(deal.id)}>
                <td onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" className={c.checkbox} aria-label={`Select ${deal.company.name}`} checked={selected.has(deal.id)} onChange={() => onToggle(deal.id)} />
                </td>
                <td>
                  <div className={s.cellStrong}>{deal.company.name}</div>
                  <div className={s.cellSub}>{deal.title !== deal.company.name ? deal.title : deal.company.domain || deal.company.industry || ''}</div>
                </td>
                <td>
                  {deal.primaryContact ? (
                    <>
                      <div>{deal.primaryContact.name}</div>
                      <div className={s.cellSub}>{deal.primaryContact.email || deal.primaryContact.title || ''}</div>
                    </>
                  ) : <span className={s.cellSub}>No contact</span>}
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <select
                    className={`${s.select} ${s.selectSm}`}
                    aria-label={`Stage for ${deal.company.name}`}
                    value={deal.stage}
                    disabled={!editable}
                    title={editable ? undefined : 'Claim this lead to change its stage'}
                    onChange={(e) => onMove(deal, e.target.value as DealStage)}
                  >
                    {DEAL_STAGES.map((st) => <option key={st.id} value={st.id}>{st.label}</option>)}
                  </select>
                </td>
                <td className={c.nowrap} style={{ fontVariantNumeric: 'tabular-nums' }}>{deal.value == null ? <span className={s.cellSub}>Not estimated</span> : formatUsd(deal.value)}</td>
                <td><OwnerChip owner={deal.owner} /></td>
                <td style={{ maxWidth: 240 }}>
                  {deal.nextAction ? (
                    <>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deal.nextAction}</div>
                      <div className={s.cellSub} style={deal.isOverdue ? { color: 'var(--o-danger)', fontWeight: 600 } : undefined}>
                        {deal.isOverdue && <AlertTriangle size={11} style={{ verticalAlign: -1, marginRight: 4 }} />}
                        <Time iso={deal.nextActionDate} />
                      </div>
                    </>
                  ) : <span className={s.cellSub}>Not set</span>}
                </td>
                <td className={c.nowrap}>
                  <Time iso={deal.lastActivityAt} mode="ago" />
                  {deal.isStale && <span className={`${s.badge} ${s.badgeAmber}`} style={{ marginLeft: 6 }}><Clock size={11} /> Stale</span>}
                </td>
                <td className={c.nowrap}><span className={`${s.badge} ${s.badgeGray}`}>{SOURCE_LABELS[deal.source]}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
