'use client';

import { RedditIntelligenceData } from '@/features/reddit/types';
import { MessageSquare, ExternalLink, ThumbsUp, MessageCircle } from 'lucide-react';

export function RedditPanel({ reddit }: { reddit: RedditIntelligenceData }) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid rgba(255, 69, 0, 0.25)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={20} style={{ color: '#ff4500' }} />
          <div>
            <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Reddit Real-Time Buying Discussions ({reddit.recentDiscussions.length})
            </h3>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              Official Reddit API: Subreddit post mentions, technical pain points & outsourcing requests
            </span>
          </div>
        </div>

        <span style={{ fontSize: '0.65rem', background: 'rgba(255, 69, 0, 0.15)', color: '#ff4500', border: '1px solid rgba(255, 69, 0, 0.3)', padding: '4px 10px', borderRadius: '6px', fontWeight: 700 }}>
          {reddit.outsourcingUrgency} Intent
        </span>
      </div>

      {/* Discussions List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {reddit.recentDiscussions.map((post) => (
          <div 
            key={post.id}
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '0.66rem', background: 'rgba(255, 69, 0, 0.15)', color: '#ff4500', padding: '2px 7px', borderRadius: '4px', fontWeight: 700 }}>
                  {post.subreddit}
                </span>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
                  {post.title}
                </h4>
              </div>

              <a 
                href={post.permalinkUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ fontSize: '0.7rem', color: '#ff4500', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}
              >
                View on Reddit <ExternalLink size={11} />
              </a>
            </div>

            <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.45' }}>
              {post.bodySnippet}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ff4500', fontWeight: 700 }}>
                  <ThumbsUp size={12} /> {post.upvotesCount} upvotes
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--accent-indigo)', fontWeight: 700 }}>
                  <MessageCircle size={12} /> {post.commentsCount} comments
                </span>
                <span>By: <strong style={{ color: 'var(--text-primary)' }}>{post.author}</strong></span>
              </div>

              <span style={{ fontSize: '0.65rem', color: 'var(--color-success)', fontWeight: 700 }}>
                Intent Score: {post.buyingIntentScore}/100
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
