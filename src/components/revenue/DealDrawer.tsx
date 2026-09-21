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
          maxWidth: '600px', 
          height: '100vh', 
          background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.85))',
          backdropFilter: 'blur(40px)', 
          borderLeft: '1px solid rgba(255, 255, 255, 0.9)', 
          zIndex: 100000, 
          overflowY: 'auto', 
          overflowX: 'hidden',
          padding: '0', 
          display: 'flex', 
          flexDirection: 'column', 
          boxShadow: '-20px 0 60px rgba(15, 23, 42, 0.15), inset 1px 0 0 rgba(255, 255, 255, 0.5)',
          pointerEvents: 'auto',
          boxSizing: 'border-box'
        }}
      >
        {/* Premium Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid rgba(226, 232, 240, 0.8)', padding: '32px 28px', background: 'url("https://www.transparenttextures.com/patterns/cubes.png"), linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(248,250,252,0.9) 100%)', gap: '16px', zIndex: 10, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #6366f1, #ec4899, #f59e0b)' }} />
          <div>
            <span style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 12px #6366f1' }} />
              RevenueOS Workspace
            </span>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              {deal.companyName} <ShieldCheck size={24} style={{ color: '#3b82f6', flexShrink: 0, filter: 'drop-shadow(0 2px 4px rgba(59,130,246,0.4))' }} />
            </h2>
            <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'inline-flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', fontWeight: 500, background: 'rgba(241, 245, 249, 0.6)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ opacity: 0.7 }}>🌐</span> <span style={{ color: '#334155', fontWeight: 600 }}>{deal.domain}</span></span>
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#cbd5e1' }} />
              <span>Assigned BDE: <strong style={{ color: '#0f172a', fontWeight: 700 }}>{deal.assignedBde}</strong></span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {onDeleteDeal && (
              <button
                type="button"
                onClick={onDeleteDeal}
                title="Remove Deal from Pipeline"
                style={{
                  background: 'rgba(254, 226, 226, 0.5)',
                  border: '1px solid rgba(252, 165, 165, 0.8)',
                  color: '#dc2626',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.05)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fee2e2';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.15)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(254, 226, 226, 0.5)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(220, 38, 38, 0.05)';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <Trash2 size={15} /> Remove
              </button>
            )}

            <button 
              type="button"
              onClick={onClose} 
              style={{ 
                background: '#ffffff', 
                border: '1px solid #e2e8f0', 
                color: '#64748b', 
                padding: '8px', 
                borderRadius: '10px', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.color = '#0f172a';
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.08)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.color = '#64748b';
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.04)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Scrollable Content Wrapper */}
        <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Pipeline Stage Stepper Bar */}
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Deal Stage Progression</div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '14px', display: 'flex', alignItems: 'center', gap: '10px', overflowX: 'auto', flexWrap: 'nowrap', WebkitOverflowScrolling: 'touch', boxShadow: '0 4px 20px rgba(15, 23, 42, 0.03)' }}>
              <style dangerouslySetInnerHTML={{__html: `
                .stage-container::-webkit-scrollbar { height: 6px; }
                .stage-container::-webkit-scrollbar-track { background: transparent; }
                .stage-container::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                .stage-container::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
              `}} />
              <div className="stage-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 'min-content', paddingBottom: '4px' }}>
                {stages.map((stg) => {
                  const isCurrent = deal.stage === stg;
                  return (
                    <button
                      key={stg}
                      type="button"
                      onClick={() => onStageChange(deal.id, stg)}
                      style={{
                        padding: '8px 18px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        border: isCurrent ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid #f1f5f9',
                        background: isCurrent ? 'linear-gradient(135deg, #4f46e5, #3b82f6)' : '#f8fafc',
                        color: isCurrent ? '#ffffff' : '#64748b',
                        cursor: 'pointer',
                        boxShadow: isCurrent ? '0 6px 16px rgba(79, 70, 229, 0.25), inset 0 1px 1px rgba(255,255,255,0.2)' : '0 2px 4px rgba(0,0,0,0.01)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        textShadow: isCurrent ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={(e) => {
                        if (!isCurrent) {
                          e.currentTarget.style.background = '#ffffff';
                          e.currentTarget.style.borderColor = '#cbd5e1';
                          e.currentTarget.style.color = '#334155';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(15, 23, 42, 0.06)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isCurrent) {
                          e.currentTarget.style.background = '#f8fafc';
                          e.currentTarget.style.borderColor = '#f1f5f9';
                          e.currentTarget.style.color = '#64748b';
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.01)';
                        }
                      }}
                    >
                      {stg.replace(/_/g, ' ')}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

        {/* Key Deal Metrics Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'linear-gradient(145deg, #ffffff, #fffbeb)', border: '1px solid #fde68a', borderRadius: '16px', padding: '16px 20px', boxShadow: '0 8px 24px rgba(245, 158, 11, 0.08)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '50px', height: '50px', background: '#f59e0b', filter: 'blur(30px)', opacity: 0.2 }} />
            <div style={{ fontSize: '0.7rem', color: '#92400e', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Target Deal Budget</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#b45309', marginTop: '4px', textShadow: '0 2px 4px rgba(245, 158, 11, 0.15)' }}>{deal.dealValueInr}</div>
          </div>

          <div style={{ background: 'linear-gradient(145deg, #ffffff, #f0fdf4)', border: '1px solid #bbf7d0', borderRadius: '16px', padding: '16px 20px', boxShadow: '0 8px 24px rgba(16, 185, 129, 0.08)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '50px', height: '50px', background: '#10b981', filter: 'blur(30px)', opacity: 0.2 }} />
            <div style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Win Probability</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#15803d', marginTop: '4px', textShadow: '0 2px 4px rgba(16, 185, 129, 0.15)' }}>{deal.winProbability.currentWinPercent}%</div>
          </div>

          <div style={{ background: 'linear-gradient(145deg, #ffffff, #eff6ff)', border: '1px solid #bfdbfe', borderRadius: '16px', padding: '16px 20px', boxShadow: '0 8px 24px rgba(59, 130, 246, 0.08)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '50px', height: '50px', background: '#3b82f6', filter: 'blur(30px)', opacity: 0.2 }} />
            <div style={{ fontSize: '0.7rem', color: '#1e40af', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Buying Score</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1d4ed8', marginTop: '4px', textShadow: '0 2px 4px rgba(59, 130, 246, 0.15)' }}>{deal.buyingScore}/100</div>
          </div>
        </div>

        {/* Workspace Tabs - Segmented Control Design */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '8px' }}>
          <div style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '6px', display: 'flex', gap: '4px', overflowX: 'auto', flexWrap: 'nowrap', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none', boxShadow: 'inset 0 2px 6px rgba(15, 23, 42, 0.04)' }}>
            {(['tasks', 'meetings', 'proposals', 'contracts', 'timeline'] as const).map((tb) => {
              const isActive = activeTab === tb;
              return (
                <button
                  key={tb}
                  type="button"
                  onClick={() => setActiveTab(tb)}
                  style={{
                    flex: '1 1 auto',
                    padding: '10px 16px',
                    borderRadius: '12px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    border: 'none',
                    background: isActive ? '#ffffff' : 'transparent',
                    color: isActive ? '#0f172a' : '#64748b',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    boxShadow: isActive ? '0 4px 12px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)' : 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = '#334155';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = '#64748b';
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {tb}
                </button>
              );
            })}
          </div>

          {/* Active Tab Panel */}
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 24px rgba(15, 23, 42, 0.04)' }}>
            {activeTab === 'tasks' && <TasksPanel tasks={deal.tasks} />}
            {activeTab === 'meetings' && <MeetingPanel meetings={deal.meetings} />}
            {activeTab === 'proposals' && <ProposalPanel proposals={deal.proposals} />}
            {activeTab === 'contracts' && <ContractPanel contracts={deal.contracts} />}
            {activeTab === 'timeline' && <ActivityTimeline events={deal.timeline} />}
          </div>
        </div>
      </div>
    </div>
    </div>,
    document.body
  );
}
