'use client';

import { LinkedInPostItem } from '@/features/linkedin/types';
import { Share2, ExternalLink, ThumbsUp, MessageSquare } from 'lucide-react';

export function SocialActivityPanel({ posts }: { posts: LinkedInPostItem[] }) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Share2 size={18} style={{ color: '#0a66c2' }} />
          <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Executive & Organization LinkedIn Feed ({posts.length})
          </h3>
        </div>

        <span style={{ fontSize: '0.65rem', background: 'rgba(10, 102, 194, 0.15)', color: '#0a66c2', border: '1px solid rgba(10, 102, 194, 0.3)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
          Social Signals Active
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {posts.map((post) => (
          <div 
            key={post.id}
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '0.66rem', background: 'rgba(10, 102, 194, 0.15)', color: '#0a66c2', padding: '2px 7px', borderRadius: '4px', fontWeight: 700 }}>
                  {post.postType}
                </span>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
                  {post.authorName} <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 500 }}>({post.authorTitle})</span>
                </h4>
              </div>

              <a 
                href={post.postUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ fontSize: '0.7rem', color: '#0a66c2', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}
              >
                View Post <ExternalLink size={11} />
              </a>
            </div>

            <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.45' }}>
              {post.contentSnippet}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#0a66c2', fontWeight: 700 }}>
                  <ThumbsUp size={12} /> {post.likesCount} likes
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--accent-indigo)', fontWeight: 700 }}>
                  <MessageSquare size={12} /> {post.commentsCount} comments
                </span>
                <span>Shares: <strong style={{ color: 'var(--text-primary)' }}>{post.sharesCount}</strong></span>
              </div>

              <span style={{ fontSize: '0.65rem', color: 'var(--color-success)', fontWeight: 700 }}>
                Published: {post.publishedDate}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
