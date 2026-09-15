'use client';

import { useState } from 'react';
import { RevenueDeal, RevenueStage, RevenueTelemetry } from '@/features/revenue/types';
import { ForecastProjections } from '@/features/revenue/forecasting';
import { DealPipeline } from './DealPipeline';
import { DealDrawer } from './DealDrawer';
import { RevenueForecast } from './RevenueForecast';
import { updateDealStageAction, deleteRevenueDealAction } from '@/features/revenue/actions';
import { AlertTriangle } from 'lucide-react';

export function RevenueDashboard({ 
  initialDeals, 
  telemetry, 
  forecast 
}: { 
  initialDeals: RevenueDeal[]; 
  telemetry: RevenueTelemetry; 
  forecast: ForecastProjections;
}) {
  const [deals, setDeals] = useState<RevenueDeal[]>(initialDeals);
  const [selectedDeal, setSelectedDeal] = useState<RevenueDeal | null>(null);
  const [dealToDelete, setDealToDelete] = useState<RevenueDeal | null>(null);

  const handleStageChange = async (dealId: string, newStage: RevenueStage) => {
    try {
      const updated = await updateDealStageAction(dealId, newStage);
      setDeals((prev) => prev.map((d) => (d.id === dealId ? updated : d)));
      if (selectedDeal && selectedDeal.id === dealId) {
        setSelectedDeal(updated);
      }
    } catch {
      // fallback
    }
  };

  const handleDeleteDeal = async (dealId: string) => {
    try {
      await deleteRevenueDealAction(dealId);
      setDeals((prev) => prev.filter((d) => d.id !== dealId));
      if (selectedDeal && selectedDeal.id === dealId) {
        setSelectedDeal(null);
      }
    } catch {
      setDeals((prev) => prev.filter((d) => d.id !== dealId));
      setSelectedDeal(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top RevenueOS KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
        <div className="premium-kpi-card" style={{ '--glow-color': 'rgba(99, 102, 241, 0.15)' } as React.CSSProperties}>
          <div style={{ fontSize: '0.68rem', color: 'var(--accent-indigo)', fontWeight: 700, textTransform: 'uppercase' }}>Total Pipeline Value</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--accent-indigo)', marginTop: '2px' }}>{telemetry.pipelineValueInr}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{telemetry.pipelineValueUsd} USD</div>
          <div className="kpi-glow" />
        </div>

        <div className="premium-kpi-card" style={{ '--glow-color': 'rgba(234, 179, 8, 0.15)' } as React.CSSProperties}>
          <div style={{ fontSize: '0.68rem', color: 'var(--color-warning)', fontWeight: 700, textTransform: 'uppercase' }}>Weighted Expected Revenue</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#eab308', marginTop: '2px' }}>{telemetry.expectedRevenueInr}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{telemetry.expectedRevenueUsd} USD</div>
          <div className="kpi-glow" />
        </div>

        <div className="premium-kpi-card" style={{ '--glow-color': 'rgba(16, 185, 129, 0.15)' } as React.CSSProperties}>
          <div style={{ fontSize: '0.68rem', color: 'var(--color-success)', fontWeight: 700, textTransform: 'uppercase' }}>Deals Closing This Month</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-success)', marginTop: '2px' }}>{telemetry.dealsClosingThisMonthCount} Deals</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Avg Sales Cycle {telemetry.salesVelocityDays} Days</div>
          <div className="kpi-glow" />
        </div>

        <div className="premium-kpi-card" style={{ '--glow-color': 'rgba(139, 92, 246, 0.15)' } as React.CSSProperties}>
          <div style={{ fontSize: '0.68rem', color: 'var(--accent-violet)', fontWeight: 700, textTransform: 'uppercase' }}>Target Achievement</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-violet)', marginTop: '2px' }}>{telemetry.targetAchievementPercent}%</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Forecast Accuracy {telemetry.forecastAccuracyPercent}%</div>
          <div className="kpi-glow" />
        </div>
      </div>

      {/* Revenue Forecast Component */}
      <RevenueForecast projections={forecast} />

      {/* Enterprise Multi-Stage Kanban Pipeline */}
      <div>
        <div style={{ fontSize: '0.94rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Enterprise Revenue Pipeline ({deals.length} Active Deals)</span>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Click any deal to open Deal Workspace Drawer</span>
        </div>

        <DealPipeline 
          deals={deals} 
          onSelectDeal={(deal) => setSelectedDeal(deal)} 
          onStageChange={handleStageChange} 
          onDeleteDeal={(dealId) => {
            const found = deals.find((d) => d.id === dealId);
            if (found) setDealToDelete(found);
          }}
        />
      </div>

      {/* Deal Workspace Drawer */}
      {selectedDeal && (
        <DealDrawer 
          deal={selectedDeal} 
          onClose={() => setSelectedDeal(null)} 
          onStageChange={handleStageChange} 
          onDeleteDeal={() => setDealToDelete(selectedDeal)}
        />
      )}

      {/* Delete Deal Confirmation Modal Popup */}
      {dealToDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card-glass" style={{ width: '100%', maxWidth: '440px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '18px', border: '1px solid rgba(239, 68, 68, 0.4)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px', borderRadius: '10px' }}>
                <AlertTriangle size={24} style={{ color: '#ef4444' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Confirm Deal Removal</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>Permanent Pipeline Action</p>
              </div>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
              Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{dealToDelete.companyName}</strong> ({dealToDelete.dealValueInr}) from the RevenueOS pipeline? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button 
                onClick={() => setDealToDelete(null)}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.8rem' }}
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  const targetId = dealToDelete.id;
                  setDealToDelete(null);
                  await handleDeleteDeal(targetId);
                }}
                className="btn-primary"
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', padding: '8px 18px', fontSize: '0.8rem', border: 'none' }}
              >
                Delete Deal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
