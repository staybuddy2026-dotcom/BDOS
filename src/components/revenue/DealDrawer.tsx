'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RevenueDeal, RevenueStage } from '@/features/revenue/types';
import { MeetingPanel } from './MeetingPanel';
import { ProposalPanel } from './ProposalPanel';
import { ContractPanel } from './ContractPanel';
import { TasksPanel } from './TasksPanel';
import { ActivityTimeline } from './ActivityTimeline';
import { ShieldCheck, X, Trash2 } from 'lucide-react';

export function DealDrawer({ 
  deal, 
  onClose, 
  onStageChange,
  onDeleteDeal
}: { 
  deal: RevenueDeal; 
  onClose: () => void; 
  onStageChange: (dealId: string, stage: RevenueStage) => void;
  onDeleteDeal?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'meetings' | 'proposals' | 'contracts' | 'tasks' | 'timeline'>('tasks');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const stages: RevenueStage[] = [
    'NEW_LEAD',
    'QUALIFIED',
    'DISCOVERY_CALL',
    'TECHNICAL_DISCUSSION',
    'PROPOSAL_SENT',
    'NEGOTIATION',
    'CONTRACT_SENT',
    'CONTRACT_SIGNED',
    'PROJECT_STARTED',
    'WON',
  ];

  if (!mounted) return null;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', justifyContent: 'flex-end', pointerEvents: 'none' }}>
      {/* Dimmed Backdrop */}
      <div 
        onClick={onClose} 
        style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(0, 0, 0, 0.45)', 
          backdropFilter: 'blur(3px)',
          zIndex: 99999,
          pointerEvents: 'auto'
        }} 
      />

      {/* Drawer Container */}
      <div 
        style={{ 
          position: 'relative', 
          width: '100%', 
          maxWidth: '560px', 
          height: '100vh', 
          background: 'var(--bg-card)', 
          borderLeft: '1px solid var(--border-subtle)', 
          zIndex: 100000, 
          overflowY: 'auto', 
          overflowX: 'hidden',
          padding: '24px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '18px', 
          boxShadow: '-10px 0 35px rgba(0,0,0,0.2)',
          pointerEvents: 'auto',
          boxSizing: 'border-box'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '0.68rem', color: 'var(--accent-indigo)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              RevenueOS Enterprise Deal Workspace
            </span>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)', margin: '2px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {deal.companyName} <ShieldCheck size={18} style={{ color: 'var(--accent-indigo)', flexShrink: 0 }} />
            </h2>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              <span>🌐 {deal.domain}</span>
              <span>•</span>
              <span>Assigned BDE: <strong style={{ color: 'var(--text-primary)' }}>{deal.assignedBde}</strong></span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onDeleteDeal && (
              <button
                type="button"
                onClick={onDeleteDeal}
                title="Remove Deal from Pipeline"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Trash2 size={14} /> Remove Deal
              </button>
            )}

            <button 
              type="button"
              onClick={onClose} 
              style={{ 
                background: 'var(--bg-secondary)', 
                border: '1px solid var(--border-subtle)', 
                color: 'var(--text-primary)', 
                padding: '6px', 
                borderRadius: '50%', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Pipeline Stage Stepper Bar */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', flexWrap: 'nowrap', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin' }}>
          {stages.map((stg) => {
            const isCurrent = deal.stage === stg;
            return (
              <button
                key={stg}
                type="button"
                onClick={() => onStageChange(deal.id, stg)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  border: isCurrent ? 'none' : '1px solid var(--border-subtle)',
                  background: isCurrent ? 'var(--accent-indigo)' : 'var(--bg-card)',
                  color: isCurrent ? '#ffffff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  boxShadow: isCurrent ? '0 2px 8px rgba(99, 102, 241, 0.3)' : 'none',
                }}
              >
                {stg.replace(/_/g, ' ')}
              </button>
            );
          })}
        </div>

        {/* Key Deal Metrics Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '10px 12px' }}>
            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 700 }}>Target Deal Budget</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-warning)', marginTop: '2px' }}>{deal.dealValueInr}</div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '10px 12px' }}>
            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 700 }}>Win Probability</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-success)', marginTop: '2px' }}>{deal.winProbability.currentWinPercent}%</div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '10px 12px' }}>
            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 700 }}>Buying Score</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--accent-indigo)', marginTop: '2px' }}>{deal.buyingScore}/100</div>
          </div>
        </div>

        {/* Workspace Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px', overflowX: 'auto', flexWrap: 'nowrap', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin' }}>
          {(['tasks', 'meetings', 'proposals', 'contracts', 'timeline'] as const).map((tb) => (
            <button
              key={tb}
              type="button"
              onClick={() => setActiveTab(tb)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.74rem',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                border: activeTab === tb ? 'none' : '1px solid var(--border-subtle)',
                background: activeTab === tb ? 'linear-gradient(135deg, var(--accent-indigo), #00b386)' : 'var(--bg-secondary)',
                color: activeTab === tb ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              {tb}
            </button>
          ))}
        </div>

        {/* Active Tab Panel */}
        {activeTab === 'tasks' && <TasksPanel tasks={deal.tasks} />}
        {activeTab === 'meetings' && <MeetingPanel meetings={deal.meetings} />}
        {activeTab === 'proposals' && <ProposalPanel proposals={deal.proposals} />}
        {activeTab === 'contracts' && <ContractPanel contracts={deal.contracts} />}
        {activeTab === 'timeline' && <ActivityTimeline events={deal.timeline} />}
      </div>
    </div>,
    document.body
  );
}
