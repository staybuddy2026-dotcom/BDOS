'use client';

import { ProjectValueEstimate } from '@/features/icp/valueEngine';
import { DollarSign } from 'lucide-react';

export function ProjectValueCard({ 
  estimate 
}: { 
  estimate: ProjectValueEstimate;
}) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DollarSign size={16} style={{ color: '#eab308' }} /> Estimated Project Value & Commercial Potential
        </h4>
        <span style={{ fontSize: '0.72rem', background: 'var(--color-success-bg)', color: 'var(--color-success)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
          {estimate.confidencePercent}% Confidence ({estimate.confidenceLevel})
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Expected Budget</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-success)', marginTop: '2px' }}>{estimate.budgetRangeInr}</div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-secondary)' }}>{estimate.dealSizeUsd}</div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Estimated Team Size</div>
          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>{estimate.estimatedTeamSize}</div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Estimated Duration</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--accent-indigo)', marginTop: '2px' }}>{estimate.estimatedDuration}</div>
        </div>
      </div>

      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontStyle: 'italic', background: 'var(--bg-secondary)', padding: '8px', borderRadius: '6px' }}>
        💡 {estimate.explanation}
      </div>
    </div>
  );
}
