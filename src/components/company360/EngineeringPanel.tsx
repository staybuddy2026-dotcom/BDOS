'use client';

import { EngineeringIntelligenceData } from '@/features/company360/types';
import { GitBranch, Star, GitFork, ExternalLink, Code2, Cpu } from 'lucide-react';

export function EngineeringPanel({ engineering }: { engineering: EngineeringIntelligenceData }) {
  const { categorizedTechStack } = engineering;

  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid rgba(88, 166, 255, 0.2)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GitBranch size={20} style={{ color: '#58a6ff' }} />
          <div>
            <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              GitHub Engineering Intelligence: {engineering.githubOrgLogin}
            </h3>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              Live Repository activity, framework stack & technical maturity evaluation
            </span>
          </div>
        </div>

        <a 
          href={engineering.githubOrgUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ fontSize: '0.72rem', color: '#58a6ff', textDecoration: 'none', background: 'rgba(88, 166, 255, 0.15)', border: '1px solid rgba(88, 166, 255, 0.3)', padding: '4px 10px', borderRadius: '6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          View GitHub Organization <ExternalLink size={11} />
        </a>
      </div>

      {/* KPI Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 600 }}>Public Repositories</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#58a6ff', marginTop: '2px' }}>{engineering.publicReposCount} Repos</div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Stars</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-warning)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Star size={15} fill="#fef08a" /> {engineering.totalStarsCount.toLocaleString()}
          </div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Forks</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#a5b4fc', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <GitFork size={14} /> {engineering.totalForksCount.toLocaleString()}
          </div>
        </div>

        <div style={{ background: 'var(--color-success-bg)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.66rem', color: 'var(--color-success)', fontWeight: 700 }}>Engineering Maturity</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--color-success)', marginTop: '2px' }}>
            {engineering.engineeringMaturityScore}/100
          </div>
        </div>
      </div>

      {/* CATEGORIZED TECH STACK BADGES */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Cpu size={14} style={{ color: 'var(--accent-indigo)' }} /> Categorized Technology Stack & Frameworks
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '0.74rem' }}>
          {categorizedTechStack.frontend.length > 0 && (
            <div>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Frontend:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {categorizedTechStack.frontend.map((t, idx) => (
                  <span key={idx} style={{ background: 'var(--accent-indigo-glow)', color: 'var(--accent-indigo)', border: '1px solid var(--border-focus)', padding: '2px 7px', borderRadius: '4px', fontWeight: 600 }}>{t}</span>
                ))}
              </div>
            </div>
          )}

          {categorizedTechStack.backend.length > 0 && (
            <div>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Backend & APIs:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {categorizedTechStack.backend.map((t, idx) => (
                  <span key={idx} style={{ background: 'var(--accent-indigo-glow)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '2px 7px', borderRadius: '4px', fontWeight: 600 }}>{t}</span>
                ))}
              </div>
            </div>
          )}

          {categorizedTechStack.devopsCloud.length > 0 && (
            <div>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>DevOps & Cloud:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {categorizedTechStack.devopsCloud.map((t, idx) => (
                  <span key={idx} style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 7px', borderRadius: '4px', fontWeight: 600 }}>{t}</span>
                ))}
              </div>
            </div>
          )}

          {categorizedTechStack.aiMl.length > 0 && (
            <div>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>AI / ML:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {categorizedTechStack.aiMl.map((t, idx) => (
                  <span key={idx} style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '2px 7px', borderRadius: '4px', fontWeight: 600 }}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TOP REPOSITORIES */}
      <div>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Code2 size={14} style={{ color: '#58a6ff' }} /> Top Indexed Repositories
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {engineering.topRepositories.map((repo, idx) => (
            <div key={idx} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <a href={repo.htmlUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#58a6ff', textDecoration: 'none' }}>
                  {repo.fullName}
                </a>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Primary Language: <strong style={{ color: 'var(--text-secondary)' }}>{repo.language}</strong> • Updated {repo.updatedAt}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--color-warning)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <Star size={12} fill="#fef08a" /> {repo.stars}
                </span>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-success)', fontWeight: 700 }}>AI Match: {repo.aiScore}/100</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
