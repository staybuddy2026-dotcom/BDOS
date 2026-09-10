'use client';

import { AdvancedFilterParams } from '@/features/refinement/types';
import { Filter } from 'lucide-react';

export function AdvancedFiltersPanel({ 
  onApplyFilters 
}: { 
  onApplyFilters: (filters: AdvancedFilterParams) => void;
}) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} style={{ color: 'var(--accent-indigo)' }} />
          <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Multi-Faceted Intent & Firmographic Filters
          </h4>
        </div>

        <button 
          onClick={() => onApplyFilters({ tierFilter: 'TIER_A', hiringOnly: true })}
          style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', background: 'var(--accent-indigo-glow)', border: '1px solid #38bdf8', color: 'var(--bg-primary)', fontWeight: 700, cursor: 'pointer' }}
        >
          Apply Tier A Hiring Filters
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', fontSize: '0.74rem' }}>
        <div style={{ background: 'var(--bg-card)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
          <span style={{ color: 'var(--text-muted)' }}>Target Countries:</span>
          <div style={{ color: 'var(--text-primary)', fontWeight: 700, marginTop: '2px' }}>USA, Germany, UK</div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
          <span style={{ color: 'var(--text-muted)' }}>Employee Range:</span>
          <div style={{ color: 'var(--text-primary)', fontWeight: 700, marginTop: '2px' }}>20 - 500 Employees</div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
          <span style={{ color: 'var(--text-muted)' }}>Technology Stack Criteria:</span>
          <div style={{ color: 'var(--accent-indigo)', fontWeight: 700, marginTop: '2px' }}>AI/ML, Mobile, Web, Cloud, E-Commerce</div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
          <span style={{ color: 'var(--text-muted)' }}>Min Project Budget:</span>
          <div style={{ color: 'var(--color-warning)', fontWeight: 700, marginTop: '2px' }}>$25,000 USD</div>
        </div>
      </div>
    </div>
  );
}
