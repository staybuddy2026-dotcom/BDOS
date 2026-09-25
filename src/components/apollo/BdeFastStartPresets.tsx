import { Zap } from 'lucide-react';

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
    fundingPresetDays?: number;
    employeeCountRange?: string;
    companyHiringKeywords?: string;
    companyTechUsage?: string;
    fundingStage?: string;
  };
  notification: string;
};

export const PRESETS: SearchPreset[] = [
  { id: 'people_1', label: '👑 Founders & C-Suite', mode: 'people', filters: { jobTitle: 'Founder, Co-Founder, CEO, CTO', seniority: 'c_suite', keywords: 'SaaS, IT Services' }, notification: 'Applied People Preset: 👑 Founders, CEOs & CTOs' },
  { id: 'people_2', label: '💻 VPs of Engineering', mode: 'people', filters: { jobTitle: 'VP Engineering, Director of Engineering, Head of Tech', seniority: 'vp' }, notification: 'Applied People Preset: 💻 VPs & Directors of Engineering' },
  { id: 'people_3', label: '⚡ Tech Leads (React/Node)', mode: 'people', filters: { jobTitle: 'CTO, VP Engineering, Engineering Manager', techUsage: 'React, Node.js', hiringActivity: 'Hiring Developers' }, notification: 'Applied People Preset: ⚡ Tech Leaders Hiring React & Node' },
  { id: 'people_4', label: '🌱 Seed/Pre-Seed Founders', mode: 'people', filters: { jobTitle: 'Founder, CEO', seniority: 'owner', keywords: 'Startup, SaaS' }, notification: 'Applied People Preset: 🌱 Seed & Pre-Seed Startup Founders' },
  { id: 'people_5', label: '🤖 AI & ML Heads', mode: 'people', filters: { jobTitle: 'Head of AI, VP Artificial Intelligence, Director Machine Learning', techUsage: 'Python, OpenAI, PyTorch' }, notification: 'Applied People Preset: 🤖 AI & ML Engineering Heads' },
  { id: 'people_6', label: '🛡 CISOs (Security)', mode: 'people', filters: { jobTitle: 'CISO, Chief Information Security Officer, VP Cybersecurity', seniority: 'c_suite' }, notification: 'Applied People Preset: 🛡 Chief Information Security Officers' },
  { id: 'people_7', label: '📈 Product VPs (CPO)', mode: 'people', filters: { jobTitle: 'Chief Product Officer, VP Product, Head of Product' }, notification: 'Applied People Preset: 📈 Chief Product Officers & Product VPs' },
  { id: 'people_8', label: '💼 Sales Execs (CRO)', mode: 'people', filters: { jobTitle: 'Chief Revenue Officer, VP Sales, Head of Business Development' }, notification: 'Applied People Preset: 💼 Sales Executives & CROs' },
  
  { id: 'company_1', label: '🚀 Recently Funded SaaS', mode: 'companies', filters: { companyKeywords: 'SaaS', fundingPresetDays: 180, employeeCountRange: '11,500' }, notification: 'Applied Company Preset: 🚀 Recently Funded SaaS' },
  { id: 'company_2', label: '📈 Hiring Engineers', mode: 'companies', filters: { companyHiringKeywords: 'Software Engineer, Frontend, Backend, Full Stack, AI Engineer', employeeCountRange: '11,1000' }, notification: 'Applied Company Preset: 📈 Companies Hiring Engineers' },
  { id: 'company_3', label: '💻 Modern Tech Stack', mode: 'companies', filters: { companyTechUsage: 'React, Node.js, Python, Flutter, AWS, Azure' }, notification: 'Applied Company Preset: 💻 Modern Tech Stack' },
  { id: 'company_4', label: '💰 Funded + Active Hiring', mode: 'companies', filters: { fundingPresetDays: 180, companyHiringKeywords: 'Developer, Engineer', employeeCountRange: '11,1000' }, notification: 'Applied Company Preset: 💰 Funded + Active Hiring' },
  { id: 'company_5', label: '🌱 Seed & Pre-Seed', mode: 'companies', filters: { fundingStage: 'seed,pre_seed', employeeCountRange: '1,50' }, notification: 'Applied Company Preset: 🌱 Seed & Pre-Seed Startups' },
  { id: 'company_6', label: '🚀 Series A & B', mode: 'companies', filters: { fundingStage: 'series_a,series_b', fundingPresetDays: 180, employeeCountRange: '11,200' }, notification: 'Applied Company Preset: 🚀 Series A & B Venture-Backed' },
  { id: 'company_7', label: '👼 Angel/Family Office', mode: 'companies', filters: { fundingStage: 'angel,family_office', employeeCountRange: '1,50' }, notification: 'Applied Company Preset: 👼 Angel & Family Office' },
  { id: 'company_8', label: '⚡ Newly Founded', mode: 'companies', filters: { companyHiringKeywords: 'Developer, Engineer, CTO, Product Manager', employeeCountRange: '1,50' }, notification: 'Applied Company Preset: ⚡ Newly Founded Startups' }
];

export function BdeFastStartPresets({ 
  searchMode, 
  activePresetKey, 
  onApplyPreset 
}: { 
  searchMode: 'people' | 'companies';
  activePresetKey: string | null;
  onApplyPreset: (preset: SearchPreset | null) => void;
}) {
  const visiblePresets = PRESETS.filter(p => p.mode === searchMode);

  return (
    <div className="apollo-section-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={18} style={{ color: '#6366f1' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
            BDE Fast-Start Presets
          </h3>
          <span style={{ fontSize: '0.79rem', color: '#64748b' }}>
            — High-intent research templates. Click to auto-search.
          </span>
        </div>
        {activePresetKey && (
          <span style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 800, background: 'rgba(99, 102, 241, 0.1)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            ✓ Preset Active
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginTop: '12px' }}>
        {visiblePresets.map(p => (
          <button
            key={p.id}
            onClick={() => onApplyPreset(activePresetKey === p.id ? null : p)}
            style={{
              flexShrink: 0, padding: '6px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600,
              background: activePresetKey === p.id ? 'var(--accent-indigo)' : '#f8fafc',
              color: activePresetKey === p.id ? '#fff' : '#334155',
              border: activePresetKey === p.id ? 'none' : '1px solid #e2e8f0',
              cursor: 'pointer', transition: 'all 0.2s ease',
              boxShadow: activePresetKey === p.id ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
