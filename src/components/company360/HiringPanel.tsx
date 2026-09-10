'use client';

import { LinkedInJobOpeningItem } from '@/features/linkedin/types';
import { Briefcase, Calendar, MapPin } from 'lucide-react';

export function HiringPanel({ jobOpenings }: { jobOpenings: LinkedInJobOpeningItem[] }) {
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Briefcase size={18} style={{ color: '#0a66c2' }} />
          <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Active Engineering Job Openings ({jobOpenings.length})
          </h3>
        </div>

        <span style={{ fontSize: '0.65rem', background: 'rgba(10, 102, 194, 0.15)', color: '#0a66c2', border: '1px solid rgba(10, 102, 194, 0.3)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
          High Outsourcing Signals
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
        {jobOpenings.map((job) => (
          <div 
            key={job.id}
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{job.title}</h4>
                <span style={{ fontSize: '0.62rem', background: 'var(--accent-indigo-glow)', color: 'var(--accent-indigo)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {job.urgencyLevel}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '12px', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={11} /> {job.location}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={11} /> Posted {job.postedDate}
                </span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>Required Technologies:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {job.technologiesRequired.map((tech, idx) => (
                  <span key={idx} style={{ fontSize: '0.66rem', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', padding: '1px 6px', borderRadius: '3px' }}>
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
