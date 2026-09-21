'use client';

import { CompanyOverviewData, DataSourceOrigin } from '@/features/company360/types';
import { Building, Globe, MapPin, Users, DollarSign, Award, ExternalLink, ShieldCheck } from 'lucide-react';

export function CompanyOverviewPanel({ overview, provenance }: { overview: CompanyOverviewData; provenance?: Record<string, DataSourceOrigin> }) {
  const sources = Array.from(new Set(['Apollo', ...Object.values(provenance || {})]));
  const sourceStyle = (source: DataSourceOrigin): { background: string; color: string } => {
    if (source === 'CRM') return { background: 'var(--color-success-bg)', color: 'var(--color-success)' };
    if (source === 'AI') return { background: 'rgba(234, 179, 8, 0.2)', color: 'var(--color-warning)' };
    return { background: 'var(--accent-indigo-glow)', color: 'var(--accent-indigo)' };
  };

  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(15,23,42,0.05)' }}>
            <Building size={26} style={{ color: 'var(--accent-indigo)' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                {overview.companyName}
              </h2>
              <span style={{ fontSize: '0.65rem', background: 'var(--accent-indigo-glow)', color: 'var(--accent-indigo)', border: '1px solid var(--border-focus)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={11} /> Unified Company 360 Profile
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <a href={overview.websiteUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-indigo)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                <Globe size={13} /> {overview.domain} <ExternalLink size={11} />
              </a>
              <span>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={13} /> {overview.headquarters}
              </span>
            </div>
          </div>
        </div>

        {/* Data Provenance Badge */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Fused Data Sources:</span>
          {sources.map((source) => (
            <span key={source} style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, ...sourceStyle(source as DataSourceOrigin) }}>{source}</span>
          ))}
        </div>
      </div>

      {/* Description */}
      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
        {overview.companyDescription}
      </p>

      {/* 4 Core Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <Users size={13} /> Employees
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '3px' }}>
            {overview.employeeRange}
          </div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <DollarSign size={13} /> Estimated Revenue
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '3px' }}>
            {overview.estimatedRevenue}
          </div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <Award size={13} /> Funding Stage
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-indigo)', marginTop: '3px' }}>
            {overview.fundingStage}
          </div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <Building size={13} /> Industry Category
          </div>
          <div style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--accent-indigo)', marginTop: '3px' }}>
            {overview.industry}
          </div>
        </div>
      </div>
    </div>
  );
}
