'use client';

import { useState } from 'react';
import { AlertTriangle, CalendarClock, CheckSquare, Clock, Hand } from 'lucide-react';
import { DEAL_STAGES, SOURCE_LABELS, formatUsd } from '@/features/crm/types';
import type { CrmUser, DealStage, DealSummary } from '@/features/crm/types';
import s from '@/components/ui/ui.module.css';
import c from './crm.module.css';
import { OwnerChip, STAGE_COLORS, Time } from './ui';

/**
 * Kanban view of the pipeline. Cards are dragged between columns to change stage;
 * a BDE can drag only their own deals and must claim an unassigned lead first.
 */
export function DealBoard({ deals, me, canSeeAll, selectedId, onOpen, onMove, onClaim }: {
  deals: DealSummary[];
  me: CrmUser;
  canSeeAll: boolean;
  selectedId: string | null;
  onOpen: (dealId: string) => void;
  onMove: (deal: DealSummary, stage: DealStage) => void;
  onClaim: (deal: DealSummary) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<DealStage | null>(null);

  const canEdit = (deal: DealSummary) => canSeeAll || deal.owner?.id === me.id;
  const dragging = draggingId ? deals.find((d) => d.id === draggingId) : undefined;

  return (
    <div className={c.board} role="list" aria-label="Pipeline stages">
      {DEAL_STAGES.map((stage) => {
        const stageDeals = deals.filter((d) => d.stage === stage.id);
        const total = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
        return (
          <section
            key={stage.id}
            role="listitem"
            aria-label={`${stage.label}, ${stageDeals.length} deals`}
            className={`${c.column} ${overStage === stage.id && dragging && dragging.stage !== stage.id ? c.columnOver : ''}`}
            onDragOver={(e) => { if (dragging) { e.preventDefault(); setOverStage(stage.id); } }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverStage(null); }}
            onDrop={(e) => {
              e.preventDefault();
              setOverStage(null);
              setDraggingId(null);
              if (dragging && dragging.stage !== stage.id) onMove(dragging, stage.id);
            }}
          >
            <div className={c.columnHead}>
              <div>
                <div className={c.columnTitle}><span className={c.columnDot} style={{ background: STAGE_COLORS[stage.id] }} /> {stage.label}</div>
                <div className={c.columnValue}>{total ? formatUsd(total) : 'No value yet'}</div>
              </div>
              <span className={c.columnCount}>{stageDeals.length}</span>
            </div>

            <div className={c.columnBody}>
              {stageDeals.length === 0 ? (
                <div className={c.columnEmpty}>{dragging ? 'Drop here' : 'No deals'}</div>
              ) : (
                stageDeals.map((deal) => {
                  const editable = canEdit(deal);
                  return (
                    <div
                      key={deal.id}
                      role="button"
                      tabIndex={0}
                      draggable={editable}
                      onDragStart={(e) => { e.dataTransfer.setData('text/plain', deal.id); e.dataTransfer.effectAllowed = 'move'; setDraggingId(deal.id); }}
                      onDragEnd={() => { setDraggingId(null); setOverStage(null); }}
                      onClick={() => onOpen(deal.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(deal.id); } }}
                      className={`${c.card} ${editable ? c.cardDraggable : ''} ${draggingId === deal.id ? c.cardDragging : ''} ${selectedId === deal.id ? c.cardSelected : ''}`}
                    >
                      <div className={c.cardTop}>
                        <span className={c.cardName}>{deal.company.name}</span>
                        <span className={`${c.cardValue} ${deal.value == null ? c.cardValueEmpty : ''}`}>{deal.value == null ? '—' : formatUsd(deal.value)}</span>
                      </div>
                      {deal.title !== deal.company.name && <div className={c.cardSub}>{deal.title}</div>}
                      {deal.primaryContact && (
                        <div className={c.cardSub}>{deal.primaryContact.name}{deal.primaryContact.title ? ` · ${deal.primaryContact.title}` : ''}</div>
                      )}

                      {deal.nextAction ? (
                        <div className={`${c.cardNext} ${deal.isOverdue ? c.cardNextOverdue : ''}`}>
                          <CalendarClock size={13} style={{ flexShrink: 0, marginTop: 2 }} />
                          <span>{deal.nextAction}{deal.nextActionDate && <> · <Time iso={deal.nextActionDate} /></>}</span>
                        </div>
                      ) : stage.id !== 'WON' && stage.id !== 'LOST' ? (
                        <div className={c.cardNext} style={{ color: 'var(--o-subtle)' }}><CalendarClock size={13} style={{ flexShrink: 0, marginTop: 2 }} /> No next action set</div>
                      ) : null}

                      <div className={s.badgeRow}>
                        <span className={`${s.badge} ${s.badgeGray}`}>{SOURCE_LABELS[deal.source]}</span>
                        {deal.isOverdue && <span className={`${s.badge} ${s.badgeRed}`}><AlertTriangle size={11} /> Overdue</span>}
                        {deal.isStale && !deal.isOverdue && <span className={`${s.badge} ${s.badgeAmber}`}><Clock size={11} /> Stale</span>}
                        {deal.openTasks > 0 && <span className={`${s.badge} ${s.badgeIndigo}`}><CheckSquare size={11} /> {deal.openTasks}</span>}
                      </div>

                      <div className={c.cardFoot}>
                        <OwnerChip owner={deal.owner} />
                        {!deal.owner ? (
                          <button type="button" className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} onClick={(e) => { e.stopPropagation(); onClaim(deal); }}>
                            <Hand size={12} /> Claim
                          </button>
                        ) : (
                          <Time iso={deal.lastActivityAt} mode="ago" className={c.itemMeta} />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
