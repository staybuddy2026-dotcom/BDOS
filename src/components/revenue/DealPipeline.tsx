'use client';

import { useState } from 'react';
import { RevenueDeal, RevenueStage } from '@/features/revenue/types';
import { ChevronRight, Trash2, Check, CheckSquare } from 'lucide-react';

export function DealPipeline({ 
  deals: initialDeals, 
  onSelectDeal,
  onDeleteDeal
}: { 
  deals: RevenueDeal[]; 
  onSelectDeal: (deal: RevenueDeal) => void;
  onStageChange?: (dealId: string, stage: RevenueStage) => void;
  onDeleteDeal?: (dealId: string) => void;
}) {
  const deals = initialDeals;
  const [completedTaskDealIds, setCompletedTaskDealIds] = useState<Record<string, boolean>>({});

  const stages: { id: RevenueStage; label: string }[] = [
    { id: 'NEW_LEAD', label: 'New Lead' },
    { id: 'QUALIFIED', label: 'Qualified' },
    { id: 'DISCOVERY_CALL', label: 'Discovery Call' },
    { id: 'TECHNICAL_DISCUSSION', label: 'Technical' },
    { id: 'PROPOSAL_SENT', label: 'Proposal Sent' },
    { id: 'NEGOTIATION', label: 'Negotiation' },
    { id: 'CONTRACT_SENT', label: 'Contract Sent' },
    { id: 'CONTRACT_SIGNED', label: 'Signed' },
    { id: 'WON', label: 'Won Deal' },
  ];

  const handleToggleCardTask = (e: React.MouseEvent, dealId: string) => {
    e.stopPropagation();
    setCompletedTaskDealIds(prev => ({
      ...prev,
      [dealId]: !prev[dealId]
    }));
  };

  return (
    <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '16px' }}>
      {stages.map((stg) => {
        const stageDeals = deals.filter((d) => d.stage === stg.id);
        return (
          <div 
            key={stg.id}
            style={{
              minWidth: '285px',
              maxWidth: '305px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {stg.label}
              </span>
              <span style={{ fontSize: '0.68rem', background: 'var(--accent-indigo-glow)', color: 'var(--accent-indigo)', padding: '2px 8px', borderRadius: '10px', fontWeight: 800 }}>
                {stageDeals.length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stageDeals.map((deal) => {
                const isTaskDone = Boolean(completedTaskDealIds[deal.id]);
                const firstTask = deal.tasks?.[0] || { title: `Stage Task for ${deal.companyName}` };

                return (
                  <div
                    key={deal.id}
                    onClick={() => onSelectDeal(deal)}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      padding: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {deal.companyName}
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--color-success)', padding: '2px 8px', borderRadius: '6px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                          {deal.winProbability.currentWinPercent}% Win
                        </span>
                        {onDeleteDeal && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteDeal(deal.id);
                            }}
                            title="Remove deal from pipeline"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              padding: '4px',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 600 }}>🌐 {deal.domain}</span>
                    </div>

                    {/* Quick Stage Task Control on Kanban Card */}
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: isTaskDone ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: isTaskDone ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <CheckSquare size={11} style={{ color: isTaskDone ? '#10b981' : 'var(--accent-indigo)', marginRight: '4px' }} />
                        {firstTask.title}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleToggleCardTask(e, deal.id)}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '5px',
                          fontSize: '0.66rem',
                          fontWeight: 800,
                          background: isTaskDone ? '#064e3b' : 'var(--color-success)',
                          color: '#ffffff',
                          border: 'none',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        <Check size={10} /> {isTaskDone ? 'Completed' : 'Mark Done'}
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', fontSize: '0.76rem' }}>
                      <span style={{ color: 'var(--color-warning)', fontWeight: 800 }}>{deal.dealValueInr}</span>
                      <span style={{ color: 'var(--accent-indigo)', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                        Workspace <ChevronRight size={13} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
