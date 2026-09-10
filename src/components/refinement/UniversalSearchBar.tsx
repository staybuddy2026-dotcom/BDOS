'use client';

import { useState } from 'react';
import { Search, Sparkles, Database, GitBranch, TrendingUp, Share2 } from 'lucide-react';

export function UniversalSearchBar({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState('');

  const handleExecuteSearch = () => {
    const trimmed = query.trim();
    if (onSearch) {
      onSearch(trimmed);
    }
    if (trimmed) {
      window.location.href = `/discovery?q=${encodeURIComponent(trimmed)}`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleExecuteSearch();
    }
  };

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '0', boxShadow: '0 12px 40px rgba(0,0,0,0.08)' }}>
      {/* Premium Inner Search Pill */}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '8px 8px 8px 24px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid var(--border-subtle)' }}>
        <Search size={22} style={{ color: 'var(--accent-indigo)' }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Single Universal Search (e.g. 'SAAS', 'React AI startup in USA', 'Healthtech migrating Angular to Node')..."
          style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 600, outline: 'none', padding: '10px 0' }}
        />

        <button
          onClick={handleExecuteSearch}
          style={{
            padding: '12px 32px',
            borderRadius: '10px',
            fontSize: '0.9rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-violet))',
            color: 'var(--bg-primary)',
            border: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
          }}
        >
          <Sparkles size={18} /> Universal AI Search
        </button>
      </div>

      {/* Provider Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.72rem', color: 'var(--text-muted)', padding: '14px 20px 8px 20px', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 800, color: 'var(--text-secondary)' }}>Simultaneous Live Ingestion:</span>
        <div style={{ display: 'flex', gap: '12px' }}>
          <span style={{ background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: '6px', color: 'var(--accent-indigo)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, border: '1px solid var(--border-subtle)' }}><Database size={12} /> Apollo.io</span>
          <span style={{ background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: '6px', color: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, border: '1px solid var(--border-subtle)' }}><Share2 size={12} /> LinkedIn</span>
          <span style={{ background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: '6px', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, border: '1px solid var(--border-subtle)' }}><TrendingUp size={12} /> Crunchbase</span>
          <span style={{ background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: '6px', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, border: '1px solid var(--border-subtle)' }}><GitBranch size={12} /> GitHub</span>
        </div>
      </div>
    </div>
  );
}
