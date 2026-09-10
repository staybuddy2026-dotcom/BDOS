'use client';

import { ProductCommunitySignal } from '@/features/producthunt/types';
import { MessageSquare } from 'lucide-react';

export function CommunityPanel({ community }: { community: ProductCommunitySignal }) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={18} style={{ color: '#ff6154' }} />
          <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Community Engagement & Sentiment Signals
          </h3>
        </div>

        <span style={{ fontSize: '0.65rem', background: 'rgba(255, 97, 84, 0.15)', color: '#ff6154', border: '1px solid rgba(255, 97, 84, 0.3)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
          Featured Product Hunt Launch
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Upvotes</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ff6154', marginTop: '2px' }}>
            ▲ {community.upvotesCount.toLocaleString()}
          </div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Comments & Discussions</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--accent-indigo)', marginTop: '2px' }}>
            💬 {community.commentsCount}
          </div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Trending Score</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-warning)', marginTop: '2px' }}>
            {community.trendingScore}/100
          </div>
        </div>

        <div style={{ background: 'rgba(255, 97, 84, 0.08)', border: '1px solid rgba(255, 97, 84, 0.25)', borderRadius: '8px', padding: '12px' }}>
          <div style={{ fontSize: '0.68rem', color: '#ff6154', fontWeight: 700 }}>Launch Momentum</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ff6154', marginTop: '2px' }}>
            {community.launchMomentumScore}/100
          </div>
        </div>
      </div>
    </div>
  );
}
