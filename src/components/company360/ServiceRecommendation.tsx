'use client';

import { ServiceRecommendationItem } from '@/features/icp/recommendations';
import { Layers, ChevronRight } from 'lucide-react';

export function ServiceRecommendation({ 
  recommendations 
}: { 
  recommendations: ServiceRecommendationItem[];
}) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={16} style={{ color: 'var(--accent-indigo)' }} /> Recommended Tiny Script Services & Fit Confidence
        </h4>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {recommendations.map((rec, idx) => (
          <div key={idx} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ChevronRight size={14} style={{ color: 'var(--accent-indigo)' }} /> {rec.serviceName}
              </span>
              <span style={{ fontSize: '0.74rem', color: 'var(--color-success)', fontWeight: 900, background: 'var(--color-success-bg)', padding: '2px 8px', borderRadius: '4px' }}>
                {rec.confidencePercent}% Confidence
              </span>
            </div>

            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{rec.reasoning}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--accent-indigo)', fontWeight: 700 }}>Squad Structure: {rec.suggestedSquad}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
