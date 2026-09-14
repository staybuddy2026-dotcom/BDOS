'use client';

import { AiOpportunityScoreDetails, RecommendedServiceItem, ExecutiveAiBriefing } from '@/features/company360/types';
import { Sparkles, TrendingUp, Send, Briefcase, CheckCircle } from 'lucide-react';

export function AIInsightsPanel({
  scoring,
  recommendedServices,
  briefing,
  hasDeal,
  onCreateCrmDeal,
  onSendToReviewQueue
}: {
  scoring: AiOpportunityScoreDetails;
  recommendedServices: RecommendedServiceItem[];
  briefing: ExecutiveAiBriefing;
  hasDeal?: boolean;
  onCreateCrmDeal: (serviceName?: string) => void;
  onSendToReviewQueue: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Executive AI Briefing Box */}
      <div style={{ background: 'var(--accent-indigo-glow)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} style={{ color: '#a5b4fc' }} />
            <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              AI Executive Briefing & Account Strategy
            </h3>
          </div>
          <span style={{ fontSize: '0.68rem', background: 'var(--color-success-bg)', color: 'var(--color-success)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
            Confidence: {briefing.confidencePercent}%
          </span>
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
          {briefing.summary}
        </p>

        <div style={{ background: 'var(--bg-primary)', borderRadius: '8px', padding: '12px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a5b4fc', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Key Intelligence Signals
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {briefing.keyHighlights.map((hl, idx) => (
              <li key={idx}>{hl}</li>
            ))}
          </ul>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', background: 'var(--color-success-bg)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '10px 14px', borderRadius: '8px' }}>
          <div>
            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Recommended First Pitch Engagement</div>
            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--bg-primary)', marginTop: '2px' }}>{briefing.recommendedFirstEngagement}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Est. Potential Budget</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-success)' }}>{briefing.estimatedProjectPotentialInr}</div>
          </div>
        </div>
      </div>

      {/* Opportunity Scoring & Scoring Factors Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
        {/* Score Card */}
        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>AI Opportunity Score</span>
            <span style={{ fontSize: '0.68rem', background: 'var(--color-warning-bg)', color: 'var(--color-warning)', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
              Priority: {scoring.salesPriority}
            </span>
          </div>

          <div style={{ textAlign: 'center', margin: '8px 0' }}>
            <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#58a6ff', lineHeight: '1' }}>
              {scoring.overallScore}<span style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>/100</span>
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--color-success)', fontWeight: 700, marginTop: '4px' }}>
              Win Probability: {scoring.winProbabilityPercent}%
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
            <span>Target Deal Size:</span>
            <strong style={{ color: 'var(--color-success)' }}>{scoring.estimatedDealSizeInr}</strong>
          </div>
        </div>

        {/* Factors Breakdown */}
        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={14} style={{ color: 'var(--color-success)' }} /> Opportunity Impact Factors
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {scoring.scoringFactors.map((factor, idx) => (
              <div key={idx} style={{ fontSize: '0.72rem', background: 'var(--bg-secondary)', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{factor.factorName}</span>
                <strong style={{ color: 'var(--color-success)' }}>+{factor.impactScore}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RECOMMENDED TINY SCRIPT SERVICES */}
      <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Briefcase size={18} style={{ color: 'var(--accent-indigo)' }} />
            <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              AI Recommended Tiny Script Services ({recommendedServices.length})
            </h3>
          </div>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Tailored to tech stack & hiring signals</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {recommendedServices.map((service) => (
            <div key={service.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{service.serviceName}</h4>
                  <div style={{ fontSize: '0.72rem', color: 'var(--accent-indigo)', fontWeight: 600, marginTop: '2px' }}>Category: {service.category}</div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.96rem', fontWeight: 900, color: 'var(--color-success)' }}>{service.estimatedEngagementInr}</div>
                  <span style={{ fontSize: '0.62rem', color: '#a5b4fc', fontWeight: 700 }}>Fit Score: {service.fitScore}%</span>
                </div>
              </div>

              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.45' }}>{service.reasoning}</p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Suggested Squad: <strong style={{ color: 'var(--text-primary)' }}>{service.suggestedSquad}</strong>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  {hasDeal ? (
                    <button 
                      className="btn-primary"
                      style={{ padding: '5px 11px', fontSize: '0.74rem', background: '#94a3b8', color: '#ffffff', border: '1px solid #94a3b8', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'default' }}
                      disabled
                    >
                      <CheckCircle size={12} /> Deal Created
                    </button>
                  ) : (
                    <button 
                      onClick={() => onCreateCrmDeal(service.serviceName)}
                      className="btn-primary"
                      style={{ padding: '5px 11px', fontSize: '0.74rem', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Briefcase size={12} /> Create CRM Deal
                    </button>
                  )}
                  <button 
                    onClick={onSendToReviewQueue}
                    className="btn-secondary"
                    style={{ padding: '5px 9px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Send size={12} /> Review Queue
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
