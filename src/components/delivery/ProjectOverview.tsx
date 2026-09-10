'use client';

import { DeliveryProject } from '@/features/delivery/types';
import { ShieldCheck, GitBranch, Cloud, Layers } from 'lucide-react';

export function ProjectOverview({ project }: { project: DeliveryProject }) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span style={{ fontSize: '0.68rem', color: 'var(--color-success)', fontWeight: 800, textTransform: 'uppercase' }}>Active Delivery Workspace</span>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)', margin: '2px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {project.companyName} <ShieldCheck size={18} style={{ color: 'var(--color-success)' }} />
          </h2>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{project.domain} • Contract Budget: <strong style={{ color: '#eab308' }}>{project.contractValueInr}</strong></span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{ fontSize: '0.72rem', background: 'var(--color-success-bg)', color: 'var(--color-success)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 10px', borderRadius: '6px', fontWeight: 800 }}>
            Health: {project.health.deliveryScore}/100 ({project.health.timelineHealth.replace(/_/g, ' ')})
          </span>
        </div>
      </div>

      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px' }}>
        <strong style={{ color: 'var(--text-primary)' }}>Approved Technical Scope:</strong> {project.scopeSummary}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={14} style={{ color: 'var(--accent-indigo)' }} /> Technology Framework Stack
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: 800 }}>
            {project.techStack.join(', ')}
          </div>
        </div>

        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <GitBranch size={14} style={{ color: 'var(--color-success)' }} /> GitHub Code Repository
          </div>
          <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.76rem', color: 'var(--accent-indigo)', textDecoration: 'none', fontWeight: 800 }}>
            {project.repoUrl.replace('https://github.com/', '')}
          </a>
        </div>

        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Cloud size={14} style={{ color: '#eab308' }} /> Cloud Infrastructure Target
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: 800 }}>
            {project.cloudInfra}
          </div>
        </div>
      </div>
    </div>
  );
}
