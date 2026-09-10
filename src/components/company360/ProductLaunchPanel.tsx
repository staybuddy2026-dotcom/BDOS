'use client';

import { ProductHuntIntelligenceData } from '@/features/producthunt/types';
import { Zap, ExternalLink, Award, Sparkles } from 'lucide-react';

export function ProductLaunchPanel({ productHunt }: { productHunt: ProductHuntIntelligenceData }) {
  const { primaryProduct } = productHunt;

  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid rgba(234, 88, 12, 0.3)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={20} style={{ color: '#ff6154' }} />
          <div>
            <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Product Hunt Launch Intelligence: {primaryProduct.name}
            </h3>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              Official Product Hunt GraphQL API: Product traction, launch momentum & post-MVP intent
            </span>
          </div>
        </div>

        <a 
          href={primaryProduct.productUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ fontSize: '0.72rem', color: '#ff6154', textDecoration: 'none', background: 'rgba(255, 97, 84, 0.15)', border: '1px solid rgba(255, 97, 84, 0.3)', padding: '4px 10px', borderRadius: '6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          View Product Hunt Post <ExternalLink size={11} />
        </a>
      </div>

      {/* KPI Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 600 }}>Community Upvotes</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ff6154', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            ▲ {primaryProduct.community.upvotesCount.toLocaleString()}
          </div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 600 }}>Product of the Day</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-warning)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Award size={15} fill="#fef08a" /> #{primaryProduct.community.productOfTheDayRank || 1} Rank
          </div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 600 }}>Launch Date</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-indigo)', marginTop: '2px' }}>
            {primaryProduct.launchDate}
          </div>
        </div>

        <div style={{ background: 'rgba(255, 97, 84, 0.08)', border: '1px solid rgba(255, 97, 84, 0.25)', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.66rem', color: '#ff6154', fontWeight: 700 }}>Buying Intent Score</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ff6154', marginTop: '2px' }}>
            {productHunt.postMvpBuyingIntentScore}/100
          </div>
        </div>
      </div>

      {/* Tagline & Description */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          &quot;{primaryProduct.tagline}&quot;
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
          {primaryProduct.description}
        </p>
      </div>

      {/* BUYING INTENT SIGNALS */}
      <div>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={14} style={{ color: '#ff6154' }} /> Post-MVP Buying Intent Signals
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {primaryProduct.buyingIntentSignals.map((signal, idx) => (
            <div key={idx} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>{signal.title}</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{signal.description}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--color-success)', fontWeight: 800 }}>{signal.confidenceScore}% Confidence</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
