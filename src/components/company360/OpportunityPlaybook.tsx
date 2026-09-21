'use client';

import { OpportunityPlaybookModel } from '@/features/playbook/types';
import { generateOpportunityPlaybook } from '@/features/playbook/generator';
import { WhyTinyScriptPanel } from './WhyTinyScriptPanel';
import { RecommendedServices } from './RecommendedServices';
import { OutreachChannelTable } from './OutreachChannelTable';
import { DiscoveryPrepPanel } from './DiscoveryPrepPanel';
import { ConversationGuide } from './ConversationGuide';
import { ObjectionPanel } from './ObjectionPanel';
import { BookOpen, AlertTriangle, Users, Award, ArrowRight } from 'lucide-react';

export function OpportunityPlaybook({ 
  playbook = generateOpportunityPlaybook()
}: { 
  playbook?: OpportunityPlaybookModel;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-focus)', borderRadius: '14px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 24px rgba(15,23,42,0.03)' }}>
        <div>
          <span style={{ fontSize: '0.7rem', color: 'var(--accent-indigo)', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <BookOpen size={12} /> AI Sales Copilot • Opportunity Playbook Refinement
          </span>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
            Sales Opportunity Playbook for {playbook.companyName}
          </h2>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {playbook.overview.summary}
          </div>
        </div>

        <div style={{ textAlign: 'right', background: 'var(--color-success-bg)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '10px 16px', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--color-success)', fontWeight: 800, textTransform: 'uppercase' }}>Win Probability</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-success)' }}>{playbook.overallWinProbabilityPercent}%</div>
        </div>
      </div>

      {/* Next Best Action Banner */}
      <div style={{ background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(16, 185, 129, 0.15))', border: '1px solid var(--border-focus)', borderRadius: '10px', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--accent-indigo)', fontWeight: 800, textTransform: 'uppercase' }}>AI Recommended Next Best Sales Action</div>
          <div style={{ fontSize: '0.86rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '2px' }}>{playbook.nextBestAction}</div>
        </div>

        <a
          href="/review"
          style={{
            background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-indigo-hover))',
            color: 'var(--bg-primary)',
            padding: '8px 14px',
            borderRadius: '6px',
            fontSize: '0.78rem',
            fontWeight: 800,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          Generate Outreach <ArrowRight size={14} />
        </a>
      </div>

      {/* Business Challenges & Decision Maker Rankings */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(234, 179, 8, 0.25)', borderRadius: '10px', padding: '14px' }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--color-warning)', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={14} style={{ color: '#eab308' }} /> Predicted Business Challenges
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {playbook.businessChallenges.map((ch, idx) => (
              <div key={idx} style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>• {ch.challenge}:</strong> {ch.description} ({ch.confidencePercent}% Confidence)
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-focus)', borderRadius: '10px', padding: '14px' }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--accent-indigo)', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={14} style={{ color: 'var(--accent-indigo)' }} /> Decision Maker Star Rankings
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {playbook.decisionMakerRankings.map((dm, idx) => (
              <div key={idx} style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>#{dm.rank} {dm.role} ({dm.starRating}★)</span>
                <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>{dm.responseProbabilityPercent}% Response Prob.</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Refinement 2: "Why Tiny Script?" Recommendation Engine */}
      <WhyTinyScriptPanel whyFit={playbook.whyTinyScript} />

      {/* Recommended Tiny Script Services */}
      <RecommendedServices services={playbook.serviceRecommendations} />

      {/* Refinement 1: Recommended Outreach Channel Table */}
      <OutreachChannelTable channels={playbook.outreachChannelTable} />

      {/* Refinement 3: AI Discovery Meeting Preparation Panel */}
      <DiscoveryPrepPanel prep={playbook.discoveryMeetingPrep} />

      {/* AI Conversation Strategy & Questions */}
      <ConversationGuide companyName={playbook.companyName} />

      {/* Objection Handling Panel */}
      <ObjectionPanel />

      {/* Recommended Case Studies */}
      <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-focus)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Award size={16} style={{ color: 'var(--accent-indigo)' }} /> Recommended Tiny Script Case Studies for Pitch
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
          {playbook.caseStudyRecommendations.map((cs, idx) => (
            <div key={idx} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>{cs.title}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-success)', fontWeight: 900, background: 'var(--color-success-bg)', padding: '2px 6px', borderRadius: '4px' }}>
                  {cs.relevanceScorePercent}% Match
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{cs.description}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--accent-indigo)' }}>Tech Stack: {cs.techStack.join(', ')}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
