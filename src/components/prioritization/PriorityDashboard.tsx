'use client';

import { useState } from 'react';
import { BuyingReadinessDetails, PriorityTier, PrioritizationDashboardTelemetry } from '@/features/prioritization/types';
import { PriorityCard } from './PriorityCard';
import { RecommendationPanel } from './RecommendationPanel';
import { Flame, Filter, CheckCircle2, TrendingUp, DollarSign, Target } from 'lucide-react';

export function PriorityDashboard({ 
  initialAccounts, 
  telemetry 
}: { 
  initialAccounts: BuyingReadinessDetails[]; 
  telemetry: PrioritizationDashboardTelemetry;
}) {
  const [accounts, setAccounts] = useState<BuyingReadinessDetails[]>(initialAccounts);
  const [selectedFilter, setSelectedFilter] = useState<PriorityTier | 'ALL'>('ALL');
  const [selectedAccount, setSelectedAccount] = useState<BuyingReadinessDetails | null>(
    initialAccounts.length > 0 ? initialAccounts[0] : null
  );
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleTierChange = (companyId: string, newTier: PriorityTier) => {
    const updated = accounts.map(acc => {
      if (acc.companyId === companyId) {
        return { ...acc, priorityTier: newTier };
      }
      return acc;
    });

    setAccounts(updated);

    const changedAcc = updated.find(a => a.companyId === companyId);
    if (changedAcc) {
      if (selectedAccount && selectedAccount.companyId === companyId) {
        setSelectedAccount(changedAcc);
      }
      setToastMsg(`Migrated ${changedAcc.companyName || changedAcc.domain} to ${newTier} Priority Tier 🔥`);
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  const filteredAccounts = accounts.filter(acc => {
    if (selectedFilter === 'ALL') return true;
    return acc.priorityTier === selectedFilter;
  });

  const handleFilterSelect = (tier: PriorityTier | 'ALL') => {
    setSelectedFilter(tier);
    const nextFiltered = accounts.filter(acc => {
      if (tier === 'ALL') return true;
      return acc.priorityTier === tier;
    });
    if (nextFiltered.length > 0) {
      setSelectedAccount(nextFiltered[0]);
    } else {
      setSelectedAccount(null);
    }
  };

  // Tier counts
  const counts = {
    ALL: accounts.length,
    IMMEDIATE: accounts.filter(a => a.priorityTier === 'IMMEDIATE').length,
    HIGH: accounts.filter(a => a.priorityTier === 'HIGH').length,
    MEDIUM: accounts.filter(a => a.priorityTier === 'MEDIUM').length,
    MONITOR: accounts.filter(a => a.priorityTier === 'MONITOR').length,
    ARCHIVE: accounts.filter(a => a.priorityTier === 'ARCHIVE').length,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {toastMsg && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 999999, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '2px solid var(--accent-indigo)', padding: '14px 22px', borderRadius: '12px', boxShadow: '0 12px 32px rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', fontWeight: 700 }}>
          <CheckCircle2 size={20} style={{ color: 'var(--accent-indigo)' }} /> {toastMsg}
        </div>
      )}

      {/* Sales Command Center KPI Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderTop: '3px solid var(--accent-indigo)', borderRadius: '14px', padding: '16px', boxShadow: 'var(--glass-shadow)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Contact Today</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-indigo)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Flame size={22} /> {telemetry.companiesToContactToday} Accounts
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '3px', fontWeight: 600 }}>Immediate 95+ score tier</div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderTop: '3px solid var(--accent-violet)', borderRadius: '14px', padding: '16px', boxShadow: 'var(--glass-shadow)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>High-Priority Accounts</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-violet)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Target size={20} /> {telemetry.highPriorityAccountsCount} Companies
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '3px', fontWeight: 600 }}>Contact within 24 hours</div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderTop: '3px solid var(--accent-cyan)', borderRadius: '14px', padding: '16px', boxShadow: 'var(--glass-shadow)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pipeline Value</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--accent-cyan)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <DollarSign size={18} /> {telemetry.estimatedPipelineValueInr}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '3px', fontWeight: 600 }}>{telemetry.estimatedPipelineValueUsd}</div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderTop: '3px solid var(--text-primary)', borderRadius: '14px', padding: '16px', boxShadow: 'var(--glass-shadow)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Predicted Revenue</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={18} /> {telemetry.predictedMonthlyRevenue} / Mo
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '3px', fontWeight: 600 }}>AI Win Prob {telemetry.aiWinProbabilityPercent}%</div>
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '12px 18px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={17} style={{ color: 'var(--accent-indigo)' }} />
          <span style={{ fontSize: '0.84rem', fontWeight: 900, color: 'var(--text-primary)' }}>Filter Priority Tier:</span>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL' as const, label: 'All Accounts', badgeColor: 'var(--text-primary)', count: counts.ALL },
            { id: 'IMMEDIATE' as const, label: '🚀 Immediate (95+)', badgeColor: 'var(--accent-indigo)', count: counts.IMMEDIATE },
            { id: 'HIGH' as const, label: '⚡ High (85-94)', badgeColor: 'var(--accent-violet)', count: counts.HIGH },
            { id: 'MEDIUM' as const, label: '✨ Medium (70-84)', badgeColor: 'var(--accent-cyan)', count: counts.MEDIUM },
            { id: 'MONITOR' as const, label: '👀 Monitor (<70)', badgeColor: 'var(--text-muted)', count: counts.MONITOR },
            { id: 'ARCHIVE' as const, label: '⚪ Archive', badgeColor: '#64748b', count: counts.ARCHIVE },
          ].map(tier => {
            const isSelected = selectedFilter === tier.id;
            return (
              <button
                key={tier.id}
                onClick={() => handleFilterSelect(tier.id)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  border: isSelected ? `1.5px solid ${tier.badgeColor}` : '1px solid var(--border-subtle)',
                  background: isSelected ? `${tier.badgeColor}18` : 'var(--bg-secondary)',
                  color: isSelected ? tier.badgeColor : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? `0 2px 10px ${tier.badgeColor}33` : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{tier.label}</span>
                <span style={{
                  fontSize: '0.68rem',
                  background: isSelected ? tier.badgeColor : 'var(--border-subtle)',
                  color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                  padding: '2px 6px',
                  borderRadius: '12px',
                  fontWeight: 900,
                }}>
                  {tier.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 2-Column Workspace Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Account Priority Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontSize: '0.86rem', fontWeight: 900, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Ranked Priority Accounts ({filteredAccounts.length})</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Real-time AI Readiness Score</span>
          </div>

          {filteredAccounts.length === 0 ? (
            <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-subtle)', borderRadius: '14px', padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              No accounts currently categorized under the <strong style={{ color: 'var(--text-primary)' }}>{selectedFilter}</strong> tier.
            </div>
          ) : (
            filteredAccounts.map((acc, idx) => (
              <PriorityCard 
                key={acc.companyId} 
                account={acc} 
                rank={idx + 1}
                isSelected={selectedAccount?.companyId === acc.companyId}
                onSelect={(account) => setSelectedAccount(account)} 
                onTierChange={handleTierChange}
              />
            ))
          )}
        </div>

        {/* Selected Account AI Recommendation Detail Panel */}
        <div>
          {selectedAccount ? (
            <RecommendationPanel 
              account={selectedAccount} 
              onTierChange={handleTierChange}
            />
          ) : (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Select an account from the left list to view AI Recommendations & Next Best Actions
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
