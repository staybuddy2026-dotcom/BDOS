'use client';

import { ProductMaker } from '@/features/producthunt/types';
import { UserCheck, Globe } from 'lucide-react';

export function MakerPanel({ makers }: { makers: ProductMaker[] }) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserCheck size={18} style={{ color: '#ff6154' }} />
          <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Makers & Product Founders ({makers.length})
          </h3>
        </div>

        <span style={{ fontSize: '0.65rem', background: 'rgba(255, 97, 84, 0.15)', color: '#ff6154', border: '1px solid rgba(255, 97, 84, 0.3)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
          Sourced from Product Hunt API
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
        {makers.map((maker) => (
          <div 
            key={maker.id}
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{maker.name}</h4>
                <span style={{ fontSize: '0.62rem', background: 'var(--accent-indigo-glow)', color: 'var(--accent-indigo)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                  {maker.role}
                </span>
              </div>

              <div style={{ fontSize: '0.74rem', color: '#a5b4fc', fontWeight: 600, marginTop: '4px' }}>
                {maker.headline}
              </div>

              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Previous Launches: <strong style={{ color: 'var(--text-secondary)' }}>{maker.previousLaunchesCount} products</strong>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', display: 'flex', gap: '12px' }}>
              {maker.linkedinUrl && (
                <a 
                  href={maker.linkedinUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.72rem', color: 'var(--accent-indigo)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                >
                  <Globe size={12} /> LinkedIn Profile →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
