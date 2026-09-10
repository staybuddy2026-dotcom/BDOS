'use client';

import { RedditIntelligenceData } from '@/features/reddit/types';
import { Cpu, Hash } from 'lucide-react';

export function TechnologyDiscussionPanel({ reddit }: { reddit: RedditIntelligenceData }) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cpu size={18} style={{ color: 'var(--accent-indigo)' }} />
          <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Technology Discussions & Subreddit Analytics
          </h3>
        </div>

        <span style={{ fontSize: '0.65rem', background: 'var(--accent-indigo-glow)', color: 'var(--accent-indigo)', border: '1px solid var(--border-focus)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
          {reddit.activeSubreddits.length} Subreddits Tracked
        </span>
      </div>

      {/* Active Subreddits Badges */}
      <div>
        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
          Monitored Developer & Founder Communities:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {reddit.activeSubreddits.map((sub, idx) => (
            <span key={idx} style={{ fontSize: '0.74rem', background: 'rgba(255, 69, 0, 0.15)', color: '#ff4500', border: '1px solid rgba(255, 69, 0, 0.3)', padding: '3px 9px', borderRadius: '6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Hash size={12} /> {sub}
            </span>
          ))}
        </div>
      </div>

      {/* Primary Discussion Tech Stack */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
          Mentioned Technologies & Frameworks in Discussions:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {reddit.primaryDiscussion.technologiesMentioned.map((tech, idx) => (
            <span key={idx} style={{ fontSize: '0.72rem', background: 'var(--accent-indigo-glow)', color: 'var(--accent-indigo)', border: '1px solid var(--border-focus)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
              {tech}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
