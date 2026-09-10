'use client';

import { PitchStrategyGuide } from '@/features/icp/pitchStrategy';
import { Compass } from 'lucide-react';

export function PitchStrategyPanel({ 
  strategy 
}: { 
  strategy: PitchStrategyGuide;
}) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-focus)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Compass size={16} style={{ color: 'var(--accent-indigo)' }} /> AI Pitch Strategy & BDE Conversation Guide
        </h4>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--accent-indigo)', fontWeight: 800 }}>Recommended Opening Angle</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', marginTop: '4px', fontWeight: 600 }}>{strategy.recommendedOpening}</div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--color-success)', fontWeight: 800 }}>Recommended Conversation Topic</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', marginTop: '4px', fontWeight: 600 }}>{strategy.recommendedConversation}</div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--color-danger)', fontWeight: 800 }}>Predicted Key Pain Point</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', marginTop: '4px', fontWeight: 600 }}>{strategy.recommendedPainPoint}</div>
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '0.72rem', color: '#eab308', fontWeight: 800 }}>Recommended Offer Progression</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--color-success)', fontWeight: 800 }}>
          Primary Offer: {strategy.recommendedFirstService}
        </div>

        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Recommended Future Upsell Options:</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {strategy.recommendedUpsellServices.map((upsell, i) => (
            <span key={i} style={{ fontSize: '0.68rem', background: 'var(--accent-indigo-glow)', color: 'var(--accent-indigo)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
              + {upsell}
            </span>
          ))}
        </div>
      </div>

      <div style={{ fontSize: '0.74rem', color: 'var(--text-primary)', fontWeight: 800, background: 'var(--color-success-bg)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
        🎯 Discovery Call Goal: {strategy.discoveryCallGoal}
      </div>
    </div>
  );
}
