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
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(24px)', 
          borderLeft: '1px solid rgba(255, 255, 255, 0.8)', 
          zIndex: 100000, 
          overflowY: 'auto', 
          overflowX: 'hidden',
          padding: '0', 
          display: 'flex', 
          flexDirection: 'column', 
          boxShadow: '-10px 0 40px rgba(15, 23, 42, 0.15)',
          pointerEvents: 'auto',
          boxSizing: 'border-box'
        }}
      >
        {/* Premium Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.05)', padding: '28px 24px', background: 'linear-gradient(to bottom, #ffffff, #f8fafc)', gap: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', zIndex: 10 }}>
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--accent-indigo)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-indigo)', boxShadow: '0 0 8px var(--accent-indigo)' }} />
              RevenueOS Enterprise Workspace
            </span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', margin: '6px 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', letterSpacing: '-0.02em' }}>
              {deal.companyName} <ShieldCheck size={20} style={{ color: 'var(--accent-indigo)', flexShrink: 0, filter: 'drop-shadow(0 2px 4px rgba(99,102,241,0.3))' }} />
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', fontWeight: 500 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>🌐 <span style={{ color: 'var(--text-secondary)' }}>{deal.domain}</span></span>
              <span style={{ color: 'var(--border-subtle)' }}>|</span>
              <span>Assigned BDE: <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{deal.assignedBde}</strong></span>
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
                background: 'rgba(255, 255, 255, 0.7)', 
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.6)', 
                color: 'var(--text-primary)', 
                padding: '6px', 
                borderRadius: '50%', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.15)';
                e.currentTarget.style.borderColor = 'var(--accent-indigo)';
                e.currentTarget.style.color = 'var(--accent-indigo)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Content Wrapper */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Pipeline Stage Stepper Bar */}
          <div style={{ background: 'rgba(255, 255, 255, 0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.6)', borderRadius: '14px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', flexWrap: 'nowrap', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.02)' }}>
          {stages.map((stg) => {
            const isCurrent = deal.stage === stg;
            return (
              <button
                key={stg}
                type="button"
                onClick={() => onStageChange(deal.id, stg)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '10px',
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  border: isCurrent ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(255, 255, 255, 0.6)',
                  background: isCurrent ? 'linear-gradient(135deg, var(--accent-indigo), var(--accent-violet))' : 'rgba(255, 255, 255, 0.8)',
                  color: isCurrent ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  boxShadow: isCurrent ? '0 4px 12px rgba(99, 102, 241, 0.3)' : '0 2px 4px rgba(0,0,0,0.02)',
                  transition: 'all 0.2s ease',
                  textShadow: isCurrent ? '0 1px 2px rgba(0,0,0,0.2)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isCurrent) {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                    e.currentTarget.style.color = 'var(--accent-indigo)';
                    e.currentTarget.style.boxShadow = '0 4px 10px rgba(99, 102, 241, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isCurrent) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                  }
                }}
              >
                {stg.replace(/_/g, ' ')}
              </button>
            );
          })}
        </div>

        {/* Key Deal Metrics Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.8)', borderRadius: '14px', padding: '12px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 700 }}>Target Deal Budget</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-warning)', marginTop: '2px', textShadow: '0 2px 4px rgba(245, 158, 11, 0.1)' }}>{deal.dealValueInr}</div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.8)', borderRadius: '14px', padding: '12px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 700 }}>Win Probability</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-success)', marginTop: '2px', textShadow: '0 2px 4px rgba(16, 185, 129, 0.1)' }}>{deal.winProbability.currentWinPercent}%</div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.8)', borderRadius: '14px', padding: '12px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 700 }}>Buying Score</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--accent-indigo)', marginTop: '2px', textShadow: '0 2px 4px rgba(99, 102, 241, 0.1)' }}>{deal.buyingScore}/100</div>
          </div>
        </div>

        {/* Workspace Tabs */}
        <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid rgba(255, 255, 255, 0.5)', paddingBottom: '14px', overflowX: 'auto', flexWrap: 'nowrap', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin' }}>
          {(['tasks', 'meetings', 'proposals', 'contracts', 'timeline'] as const).map((tb) => (
            <button
              key={tb}
              type="button"
              onClick={() => setActiveTab(tb)}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '0.74rem',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                border: activeTab === tb ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(255, 255, 255, 0.6)',
                background: activeTab === tb ? 'linear-gradient(135deg, var(--accent-indigo), var(--accent-violet))' : 'rgba(255, 255, 255, 0.7)',
                color: activeTab === tb ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                textTransform: 'uppercase',
                boxShadow: activeTab === tb ? '0 4px 16px rgba(99, 102, 241, 0.3)' : '0 2px 8px rgba(0,0,0,0.02)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tb) {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                  e.currentTarget.style.color = 'var(--accent-indigo)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tb) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)';
                }
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
      </div>
    </div>,
    document.body
  );
}
