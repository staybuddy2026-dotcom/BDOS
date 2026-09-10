'use client';

import { LinkedInIntelligenceData } from '@/features/linkedin/types';
import { Share2, Users, Briefcase, Sparkles } from 'lucide-react';

export function LinkedInPanel({ linkedin }: { linkedin: LinkedInIntelligenceData }) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid rgba(14, 118, 168, 0.3)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Share2 size={20} style={{ color: '#0a66c2' }} />
          <div>
            <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              LinkedIn Organic Intelligence: {linkedin.companyName}
            </h3>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              Official LinkedIn API: Executive posts, hiring announcements & social buying intent
            </span>
          </div>
        </div>

        <span style={{ fontSize: '0.65rem', background: 'rgba(10, 102, 194, 0.15)', color: '#0a66c2', border: '1px solid rgba(10, 102, 194, 0.3)', padding: '4px 10px', borderRadius: '6px', fontWeight: 700 }}>
          {linkedin.outsourcingProbabilityPercent}% Outsourcing Probability
        </span>
      </div>

      {/* KPI Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 600 }}>LinkedIn Employees</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0a66c2', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Users size={15} /> {linkedin.totalEmployeesOnLinkedin}
          </div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Job Openings</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-indigo)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Briefcase size={15} /> {linkedin.activeJobOpeningsCount} Roles
          </div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 600 }}>Social Engagement Score</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-warning)', marginTop: '2px' }}>
            {linkedin.socialEngagementScore}/100
          </div>
        </div>

        <div style={{ background: 'rgba(10, 102, 194, 0.08)', border: '1px solid rgba(10, 102, 194, 0.25)', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.66rem', color: '#0a66c2', fontWeight: 700 }}>Engineering Expansion Index</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0a66c2', marginTop: '2px' }}>
            {linkedin.engineeringExpansionIndex}/100
          </div>
        </div>
      </div>

      {/* Recommended Pitch */}
      <div style={{ background: 'rgba(10, 102, 194, 0.06)', border: '1px solid rgba(10, 102, 194, 0.2)', borderRadius: '10px', padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Sparkles size={18} style={{ color: '#0a66c2', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: '0.72rem', color: '#0a66c2', fontWeight: 700 }}>BDE Recommended LinkedIn Outreach Strategy</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{linkedin.recommendedPitch}</div>
        </div>
      </div>
    </div>
  );
}
