'use client';

import { OutreachChannelRecommendation } from '@/features/playbook/types';
import { Send } from 'lucide-react';

export function OutreachChannelTable({ 
  channels = [
    { decisionMakerRole: 'Chief Technology Officer (CTO)', bestChannel: 'LinkedIn InMail', confidencePercent: 96, reasoning: 'Highly active on LinkedIn and technical owner of AI initiatives.', firstTouchStrategy: 'Send personalized InMail congratulating on Series A funding and offering React 19 squad extension.' },
    { decisionMakerRole: 'VP of Engineering', bestChannel: 'Cold Email', confidencePercent: 91, reasoning: 'Corporate email verified and manages engineering team expansion deadlines.', firstTouchStrategy: 'Send technical cold email detailing 48-hour onboarding for React + Node senior developers.' },
    { decisionMakerRole: 'Founder & Head of Product', bestChannel: 'LinkedIn + Email', confidencePercent: 93, reasoning: 'Active on both channels and involved in feature release velocity.', firstTouchStrategy: 'Dual-touch message sharing Healthcare SaaS patient portal case study video.' },
    { decisionMakerRole: 'Chief Executive Officer (CEO)', bestChannel: 'Warm Introduction', confidencePercent: 82, reasoning: 'Executive-level engagement preferred for large multi-year squad contracts.', firstTouchStrategy: 'Request mutual advisor or investor warm introduction.' },
  ]
}: { 
  channels?: OutreachChannelRecommendation[];
}) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-focus)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Send size={16} style={{ color: 'var(--accent-indigo)' }} /> Recommended Outreach Channel & First-Touch Strategy Table
        </h4>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
          <thead>
            <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
              <th style={{ padding: '8px 10px', color: 'var(--accent-indigo)', fontWeight: 800 }}>Decision Maker</th>
              <th style={{ padding: '8px 10px', color: 'var(--accent-indigo)', fontWeight: 800 }}>Best Channel</th>
              <th style={{ padding: '8px 10px', color: 'var(--accent-indigo)', fontWeight: 800 }}>Confidence</th>
              <th style={{ padding: '8px 10px', color: 'var(--accent-indigo)', fontWeight: 800 }}>Business Reasoning</th>
              <th style={{ padding: '8px 10px', color: 'var(--accent-indigo)', fontWeight: 800 }}>First-Touch Strategy</th>
            </tr>
          </thead>
          <tbody>
            {channels.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)', background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                <td style={{ padding: '10px', color: 'var(--text-primary)', fontWeight: 800 }}>{row.decisionMakerRole}</td>
                <td style={{ padding: '10px' }}>
                  <span style={{ fontSize: '0.7rem', background: 'var(--accent-indigo-glow)', color: 'var(--accent-indigo)', padding: '3px 8px', borderRadius: '4px', fontWeight: 800 }}>
                    {row.bestChannel}
                  </span>
                </td>
                <td style={{ padding: '10px', color: 'var(--color-success)', fontWeight: 900 }}>{row.confidencePercent}%</td>
                <td style={{ padding: '10px' }}>{row.reasoning}</td>
                <td style={{ padding: '10px', color: 'var(--text-primary)' }}>{row.firstTouchStrategy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
