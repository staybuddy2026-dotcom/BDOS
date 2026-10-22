'use client';

import { Briefcase, Check, Lock, Search, X } from 'lucide-react';

interface ActiveHiringFilterPanelProps {
  currentHiringValue: string;
  onHiringChange: (value: string) => void;
  /** Runs the search with this hiring filter ('' clears it). */
  onApplyHiringFilter: (jobTitles: string) => void;
  searchMode: 'people' | 'companies';
  /** false when the Apollo plan has no advanced filters; the filter is then shown but switched off. */
  available: boolean;
}

/**
 * "Hiring for" filter: companies with open job postings for these roles (Apollo's job-posting data).
 * Each group is a list of real job titles; nothing here is a count or a claim, the results show what matches.
 */
const ROLE_GROUPS: { id: string; label: string; titles: string }[] = [
  { id: 'web', label: 'Web & full-stack developers', titles: 'Full Stack Developer, React Developer, Node.js Developer, Frontend Developer' },
  { id: 'backend', label: 'Backend & cloud', titles: 'Backend Developer, Python Developer, Java Developer, Golang Developer' },
  { id: 'mobile', label: 'Mobile apps', titles: 'Android Developer, iOS Developer, Flutter Developer, React Native Developer' },
  { id: 'ai', label: 'AI & data', titles: 'Machine Learning Engineer, AI Engineer, Data Engineer, Data Scientist' },
  { id: 'devops', label: 'DevOps & infrastructure', titles: 'DevOps Engineer, Site Reliability Engineer, Cloud Engineer' },
  { id: 'leaders', label: 'Engineering leaders', titles: 'CTO, VP Engineering, Engineering Manager, Head of Engineering' },
];

export function ActiveHiringFilterPanel({ currentHiringValue, onHiringChange, onApplyHiringFilter, searchMode, available }: ActiveHiringFilterPanelProps) {
  const active = ROLE_GROUPS.find((g) => g.titles === currentHiringValue)?.id;

  const pick = (titles: string) => {
    const next = currentHiringValue === titles ? '' : titles;
    onHiringChange(next);
    onApplyHiringFilter(next);
  };

  return (
    <div className="apollo-section-card" style={{ display: 'flex', flexDirection: 'column', gap: 12, opacity: available ? 1 : 0.85 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Briefcase size={18} style={{ color: '#6366f1' }} />
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Hiring for</h3>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              {searchMode === 'people' ? 'People at companies' : 'Companies'} with open job postings for these roles (from Apollo job data)
            </span>
          </div>
        </div>
        {!available && (
          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', padding: '4px 10px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Lock size={12} /> Needs a paid Apollo plan
          </span>
        )}
      </div>

      {available ? (
        <>
          <form
            onSubmit={(e) => { e.preventDefault(); onApplyHiringFilter(currentHiringValue); }}
            style={{ display: 'flex', gap: 8, alignItems: 'center' }}
          >
            <input
              type="text"
              value={currentHiringValue}
              onChange={(e) => onHiringChange(e.target.value)}
              placeholder="Job titles, comma separated, e.g. React Developer, DevOps Engineer"
              aria-label="Hiring for job titles"
              style={{ flex: 1, padding: '9px 12px', fontSize: '0.86rem', borderRadius: 10, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a' }}
            />
            <button type="submit" className="btn-primary" style={{ padding: '9px 16px', fontSize: '0.84rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Search size={14} /> Apply
            </button>
            {currentHiringValue && (
              <button type="button" className="btn-secondary" onClick={() => pick(currentHiringValue)} style={{ padding: '9px 12px', fontSize: '0.84rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <X size={14} /> Clear
              </button>
            )}
          </form>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ROLE_GROUPS.map((g) => {
              const isActive = active === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => pick(g.titles)}
                  title={g.titles}
                  aria-pressed={isActive}
                  style={{
                    padding: '6px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                    border: isActive ? '1px solid #6366f1' : '1px solid #e2e8f0',
                    background: isActive ? '#6366f1' : '#f8fafc',
                    color: isActive ? '#ffffff' : '#334155',
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                  }}
                >
                  {isActive && <Check size={12} />} {g.label}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>
          Your Apollo plan does not include job-posting filters, so this filter is off. Search by job title, location, size and keywords instead.
          It switches on by itself within a day of upgrading Apollo.
        </p>
      )}
    </div>
  );
}
