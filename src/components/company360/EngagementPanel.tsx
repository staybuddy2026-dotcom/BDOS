'use client';

import { LinkedInBuyingSignalItem } from '@/features/linkedin/types';
import { Sparkles } from 'lucide-react';

export function EngagementPanel({ signals }: { signals: LinkedInBuyingSignalItem[] }) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} style={{ color: '#0a66c2' }} />
          <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Detected Social Buying Signals ({signals.length})
          </h3>
        </div>

        <span style={{ fontSize: '0.65rem', background: 'rgba(10, 102, 194, 0.15)', color: '#0a66c2', border: '1px solid rgba(10, 102, 194, 0.3)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
          AI Post Analysis
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {signals.map((sig) => (
          <div key={sig.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>{sig.title}</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{sig.description}</div>
              <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '2px' }}>Detected from: <strong style={{ color: 'var(--accent-indigo)' }}>{sig.detectedFrom}</strong></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.76rem', color: 'var(--color-success)', fontWeight: 800 }}>{sig.confidenceScore}% Confidence</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
