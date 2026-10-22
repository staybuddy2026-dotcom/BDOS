import { Lock, Zap } from 'lucide-react';

export type SearchPreset = {
  id: string;
  label: string;
  mode: 'people' | 'companies';
  filters: {
    jobTitle?: string;
    seniority?: string;
    keywords?: string;
    techUsage?: string;
    hiringActivity?: string;
    companyKeywords?: string;
    companyLocation?: string;
    fundingPresetDays?: number;
    employeeCountRange?: string;
    companyHiringKeywords?: string;
    companyTechUsage?: string;
  };
  notification: string;
};

/** Presets using technology, hiring or funding-date filters only work on paid Apollo plans. */
export const presetNeedsPaidPlan = (p: SearchPreset) =>
  !!(p.filters.techUsage || p.filters.hiringActivity || p.filters.companyTechUsage || p.filters.companyHiringKeywords || p.filters.fundingPresetDays);

// Every filter here is one Apollo applies. (Apollo has no funding-stage filter, so there are no stage presets.)
export const PRESETS: SearchPreset[] = [
  { id: 'people_1', label: '👑 Founders & C-Suite', mode: 'people', filters: { jobTitle: 'Founder, Co-Founder, CEO, CTO', seniority: 'owner,founder,c_suite' }, notification: 'Founders, CEOs and CTOs' },
  { id: 'people_2', label: '💻 Engineering leaders', mode: 'people', filters: { jobTitle: 'VP Engineering, Director of Engineering, Head of Engineering', seniority: 'vp,head,director' }, notification: 'VPs, heads and directors of engineering' },
  { id: 'people_3', label: '🚀 SaaS founders', mode: 'people', filters: { jobTitle: 'Founder, Co-Founder, CEO', seniority: 'owner,founder', keywords: 'SaaS' }, notification: 'Founders of SaaS companies' },
  { id: 'people_4', label: '📈 Product leaders', mode: 'people', filters: { jobTitle: 'Chief Product Officer, VP Product, Head of Product' }, notification: 'Product leaders' },
  { id: 'people_5', label: '🛡 Security leaders', mode: 'people', filters: { jobTitle: 'CISO, Chief Information Security Officer, VP Security' }, notification: 'Security leaders' },
  { id: 'people_6', label: '⚡ React/Node tech leads', mode: 'people', filters: { jobTitle: 'CTO, VP Engineering, Engineering Manager', techUsage: 'React, Node.js' }, notification: 'Tech leaders at companies using React and Node.js' },
  { id: 'people_7', label: '🤖 Leaders hiring AI engineers', mode: 'people', filters: { jobTitle: 'CTO, Head of AI, VP Engineering', hiringActivity: 'Machine Learning Engineer, AI Engineer' }, notification: 'Tech leaders at companies hiring AI engineers' },

  { id: 'company_1', label: '☁️ SaaS, 11–200 people', mode: 'companies', filters: { companyKeywords: 'SaaS', employeeCountRange: '11,200' }, notification: 'SaaS companies with 11–200 employees' },
  { id: 'company_2', label: '🏥 HealthTech', mode: 'companies', filters: { companyKeywords: 'healthtech', employeeCountRange: '11,500' }, notification: 'HealthTech companies with 11–500 employees' },
  { id: 'company_3', label: '💳 FinTech', mode: 'companies', filters: { companyKeywords: 'fintech', employeeCountRange: '11,500' }, notification: 'FinTech companies with 11–500 employees' },
  { id: 'company_4', label: '🛒 E-commerce', mode: 'companies', filters: { companyKeywords: 'ecommerce', employeeCountRange: '11,500' }, notification: 'E-commerce companies with 11–500 employees' },
  { id: 'company_5', label: '📈 Hiring engineers', mode: 'companies', filters: { companyHiringKeywords: 'Software Engineer, Full Stack Developer, Backend Developer', employeeCountRange: '11,1000' }, notification: 'Companies hiring engineers' },
  { id: 'company_6', label: '💰 Funded in last 6 months', mode: 'companies', filters: { fundingPresetDays: 180, employeeCountRange: '11,500' }, notification: 'Companies funded in the last 6 months' },
  { id: 'company_7', label: '💻 Using React or Node.js', mode: 'companies', filters: { companyTechUsage: 'React, Node.js' }, notification: 'Companies using React or Node.js' },
];

export function BdeFastStartPresets({
  searchMode,
  activePresetKey,
  onApplyPreset,
  advancedAvailable,
}: {
  searchMode: 'people' | 'companies';
  activePresetKey: string | null;
  onApplyPreset: (preset: SearchPreset | null) => void;
  /** false when the Apollo plan has no advanced filters: those presets are shown but switched off. */
  advancedAvailable: boolean;
}) {
  const visiblePresets = PRESETS.filter((p) => p.mode === searchMode);

  return (
    <div className="apollo-section-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Zap size={18} style={{ color: '#6366f1' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>Quick searches</h3>
          <span style={{ fontSize: '0.79rem', color: '#64748b' }}>Click to fill the filters and search Apollo.</span>
        </div>
        {activePresetKey && (
          <span style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 800, background: 'rgba(99, 102, 241, 0.1)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            ✓ Quick search active (click again to clear)
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingBottom: '4px', marginTop: '12px' }}>
        {visiblePresets.map((p) => {
          const locked = !advancedAvailable && presetNeedsPaidPlan(p);
          const active = activePresetKey === p.id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={locked}
              title={locked ? 'Uses technology, hiring or funding filters, which need a paid Apollo plan' : p.notification}
              onClick={() => onApplyPreset(active ? null : p)}
              style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600,
                background: active ? 'var(--accent-indigo)' : '#f8fafc',
                color: active ? '#fff' : locked ? '#94a3b8' : '#334155',
                border: active ? 'none' : '1px solid #e2e8f0',
                cursor: locked ? 'not-allowed' : 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 5,
                boxShadow: active ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none',
              }}
            >
              {locked && <Lock size={11} />} {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
