import { Filter, Lock, RotateCcw, Search } from 'lucide-react';
import { CustomDropdown } from '@/components/CustomDropdown';

export type ApolloSearchFiltersProps = {
  searchMode: 'people' | 'companies';
  handleResetFilters: () => void;
  
  jobTitle: string; setJobTitle: (val: string) => void;
  seniority: string; setSeniority: (val: string) => void;
  personLocation: string; setPersonLocation: (val: string) => void;
  personCompanyName: string; setPersonCompanyName: (val: string) => void;
  domain: string; setDomain: (val: string) => void;
  keywords: string; setKeywords: (val: string) => void;
  techUsage: string; setTechUsage: (val: string) => void;
  executePeopleSearch: (page: number) => void;
  
  companyName: string; setCompanyName: (val: string) => void;
  companyDomain: string; setCompanyDomain: (val: string) => void;
  companyKeywords: string; setCompanyKeywords: (val: string) => void;
  companyLocation: string; setCompanyLocation: (val: string) => void;
  employeeCountRange: string; setEmployeeCountRange: (val: string) => void;
  companyTechUsage: string; setCompanyTechUsage: (val: string) => void;
  companyHiringKeywords: string; setCompanyHiringKeywords: (val: string) => void;
  fundingPresetDays: number | undefined; setFundingPresetDays: (val: number | undefined) => void;
  executeCompanySearch: (page: number) => void;
  
  loading: boolean;
  selectedProviderId: string;
  /** false when the Apollo plan has no advanced filters (technology, hiring, funding date). */
  advancedAvailable: boolean;
};

export function ApolloSearchFilters(props: ApolloSearchFiltersProps) {
  const {
    searchMode, handleResetFilters,
    jobTitle, setJobTitle, seniority, setSeniority, personLocation, setPersonLocation,
    personCompanyName, setPersonCompanyName, domain, setDomain, keywords, setKeywords,
    techUsage, setTechUsage, executePeopleSearch,
    companyName, setCompanyName, companyDomain, setCompanyDomain, companyKeywords, setCompanyKeywords,
    companyLocation, setCompanyLocation, employeeCountRange, setEmployeeCountRange,
    companyTechUsage, setCompanyTechUsage,
    companyHiringKeywords, setCompanyHiringKeywords, fundingPresetDays, setFundingPresetDays,
    executeCompanySearch, loading, selectedProviderId, advancedAvailable
  } = props;
  const paidOnly = !advancedAvailable;

  return (
    <div className="apollo-filter-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
          <Filter size={15} style={{ color: 'var(--accent-indigo)' }} />
          {searchMode === 'people' ? 'Find People Filters' : 'Find Companies Filters'}
        </h3>
        <button
          onClick={handleResetFilters}
          className="btn-secondary"
          style={{ padding: '4px 10px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}
          title="Clear all filters and the results on screen (saved contacts are kept)"
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>

      {searchMode === 'people' ? (
        /* FIND PEOPLE FILTERS */
        <>
          <div className="text-[0.72rem] font-extrabold tracking-[0.08em] text-(--accent-indigo) uppercase pb-1.5 border-b border-(--border-subtle) mt-2">SECTION A — PERSON</div>
          <div className="flex flex-col gap-1.5">
            <label>Person Job Title</label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && executePeopleSearch(1)}
              placeholder="e.g. Founder, CTO, CEO, VP Engineering"
            />
            <span className="text-[0.68rem] text-(--text-muted) leading-[1.3]">Target executive job titles.</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label>Person Seniority</label>
            <CustomDropdown
              value={seniority}
              onChange={setSeniority}
              placeholder="Any Seniority"
              options={[
                { value: '', label: 'Any Seniority' },
                { value: 'owner,founder', label: 'Founder / Owner' },
                { value: 'c_suite', label: 'C-Suite Executive' },
                { value: 'vp', label: 'VP / Vice President' },
                { value: 'head', label: 'Head of …' },
                { value: 'director', label: 'Director' },
                { value: 'manager', label: 'Manager' }
              ]}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label>Person Location</label>
            <input
              type="text"
              value={personLocation}
              onChange={(e) => setPersonLocation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && executePeopleSearch(1)}
              placeholder="e.g. United States, Remote, UK"
            />
          </div>

          <div className="text-[0.72rem] font-extrabold tracking-[0.08em] text-(--accent-indigo) uppercase pb-1.5 border-b border-(--border-subtle) mt-2">SECTION B — COMPANY</div>
          <div className="flex flex-col gap-1.5">
            <label>Target Company Name</label>
            <input
              type="text"
              value={personCompanyName}
              onChange={(e) => setPersonCompanyName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && executePeopleSearch(1)}
              placeholder="e.g. Microsoft, Stripe, Cloudflare"
            />
            <span className="text-[0.68rem] text-(--text-muted) leading-[1.3]">Filter decision makers by company name.</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label>Target Company Domain</label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && executePeopleSearch(1)}
              placeholder="e.g. microsoft.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label>Company Keywords / Industry</label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && executePeopleSearch(1)}
              placeholder="SaaS, fintech, healthtech, ecommerce"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label>Company Uses Technology <PaidBadge show={paidOnly} /></label>
            <input
              type="text"
              value={paidOnly ? '' : techUsage}
              onChange={(e) => setTechUsage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && executePeopleSearch(1)}
              placeholder={paidOnly ? 'Needs a paid Apollo plan' : 'e.g. React, Node.js, AWS'}
              disabled={paidOnly}
            />
          </div>

          <button
            onClick={() => executePeopleSearch(1)}
            disabled={loading || selectedProviderId !== 'apollo'}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '12px', background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', height: '38px' }}
            title={selectedProviderId !== 'apollo' ? 'Switch to Apollo.io to run a live search' : undefined}
          >
            <Search size={15} /> Execute People Search
          </button>
        </>
      ) : (
        /* FIND COMPANIES FILTERS */
        <>
          <div className="text-[0.72rem] font-extrabold tracking-[0.08em] text-(--accent-indigo) uppercase pb-1.5 border-b border-(--border-subtle) mt-2">GROUP 1 — COMPANY IDENTITY</div>
          <div className="flex flex-col gap-1.5">
            <label>Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && executeCompanySearch(1)}
              placeholder="e.g. Acme Tech"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label>Company Domain</label>
            <input
              type="text"
              value={companyDomain}
              onChange={(e) => setCompanyDomain(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && executeCompanySearch(1)}
              placeholder="e.g. acme.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label>Industry / Keywords</label>
            <input
              type="text"
              value={companyKeywords}
              onChange={(e) => setCompanyKeywords(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && executeCompanySearch(1)}
              placeholder="SaaS, fintech, healthtech, edtech"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label>Company Location</label>
            <input
              type="text"
              value={companyLocation}
              onChange={(e) => setCompanyLocation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && executeCompanySearch(1)}
              placeholder="e.g. San Francisco, CA, USA"
            />
          </div>

          <div className="text-[0.72rem] font-extrabold tracking-[0.08em] text-(--accent-indigo) uppercase pb-1.5 border-b border-(--border-subtle) mt-2">GROUP 2 — COMPANY SIZE</div>
          <div className="flex flex-col gap-1.5">
            <label>Employee Count Range</label>
            <CustomDropdown
              value={employeeCountRange}
              onChange={setEmployeeCountRange}
              placeholder="Any Size"
              options={[
                { value: '', label: 'Any Size' },
                { value: '1,10', label: '1 – 10 employees' },
                { value: '11,50', label: '11 – 50 employees' },
                { value: '51,200', label: '51 – 200 employees' },
                { value: '201,500', label: '201 – 500 employees' },
                { value: '501,1000', label: '501 – 1000 employees' },
                { value: '1001,5000', label: '1001 – 5000 employees' },
                { value: '5001', label: '5000+ employees' }
              ]}
            />
          </div>

          <div className="text-[0.72rem] font-extrabold tracking-[0.08em] text-(--accent-indigo) uppercase pb-1.5 border-b border-(--border-subtle) mt-2">GROUP 3 — TECHNOLOGY STACK</div>
          <div className="flex flex-col gap-1.5">
            <label>Technology Used <PaidBadge show={paidOnly} /></label>
            <input
              type="text"
              value={paidOnly ? '' : companyTechUsage}
              onChange={(e) => setCompanyTechUsage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && executeCompanySearch(1)}
              placeholder={paidOnly ? 'Needs a paid Apollo plan' : 'React, Node.js, Python, Flutter, AWS'}
              disabled={paidOnly}
            />
          </div>

          <div className="text-[0.72rem] font-extrabold tracking-[0.08em] text-(--accent-indigo) uppercase pb-1.5 border-b border-(--border-subtle) mt-2">GROUP 4 — HIRING & FUNDING</div>
          <div className="flex flex-col gap-1.5">
            <label>Hiring For (open job titles) <PaidBadge show={paidOnly} /></label>
            <input
              type="text"
              value={paidOnly ? '' : companyHiringKeywords}
              onChange={(e) => setCompanyHiringKeywords(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && executeCompanySearch(1)}
              placeholder={paidOnly ? 'Needs a paid Apollo plan' : 'Software Engineer, React Developer'}
              disabled={paidOnly}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label>Funded Within <PaidBadge show={paidOnly} /></label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button
                className={`btn-secondary ${fundingPresetDays === 30 ? 'active' : ''}`}
                onClick={() => setFundingPresetDays(fundingPresetDays === 30 ? undefined : 30)}
                disabled={paidOnly}
                aria-pressed={fundingPresetDays === 30}
                style={{ fontSize: '0.7rem', padding: '6px 8px', borderColor: fundingPresetDays === 30 ? '#06b6d4' : undefined, background: fundingPresetDays === 30 ? 'rgba(6,182,212,0.15)' : undefined }}
              >
                Last 30 Days
              </button>
              <button
                className={`btn-secondary ${fundingPresetDays === 90 ? 'active' : ''}`}
                onClick={() => setFundingPresetDays(fundingPresetDays === 90 ? undefined : 90)}
                disabled={paidOnly}
                aria-pressed={fundingPresetDays === 90}
                style={{ fontSize: '0.7rem', padding: '6px 8px', borderColor: fundingPresetDays === 90 ? '#06b6d4' : undefined, background: fundingPresetDays === 90 ? 'rgba(6,182,212,0.15)' : undefined }}
              >
                Last 90 Days
              </button>
              <button
                className={`btn-secondary ${fundingPresetDays === 180 ? 'active' : ''}`}
                onClick={() => setFundingPresetDays(fundingPresetDays === 180 ? undefined : 180)}
                disabled={paidOnly}
                aria-pressed={fundingPresetDays === 180}
                style={{ fontSize: '0.7rem', padding: '6px 8px', borderColor: fundingPresetDays === 180 ? '#06b6d4' : undefined, background: fundingPresetDays === 180 ? 'rgba(6,182,212,0.15)' : undefined }}
              >
                Last 180 Days
              </button>
              <button
                className={`btn-secondary ${fundingPresetDays === 365 ? 'active' : ''}`}
                onClick={() => setFundingPresetDays(fundingPresetDays === 365 ? undefined : 365)}
                disabled={paidOnly}
                aria-pressed={fundingPresetDays === 365}
                style={{ fontSize: '0.7rem', padding: '6px 8px', borderColor: fundingPresetDays === 365 ? '#06b6d4' : undefined, background: fundingPresetDays === 365 ? 'rgba(6,182,212,0.15)' : undefined }}
              >
                Last 12 Months
              </button>
            </div>
          </div>

          <button
            onClick={() => executeCompanySearch(1)}
            disabled={loading || selectedProviderId !== 'apollo'}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '12px', background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', height: '38px' }}
            title={selectedProviderId !== 'apollo' ? 'Switch to Apollo.io to run a live search' : undefined}
          >
            <Search size={15} /> Execute Company Search
          </button>
        </>
      )}
    </div>
  );
}

/** Small lock label for filters the connected Apollo plan does not include. */
function PaidBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span title="This filter needs a paid Apollo plan" style={{ marginLeft: 6, fontSize: '0.66rem', fontWeight: 700, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', padding: '1px 6px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 3, verticalAlign: 'middle' }}>
      <Lock size={9} /> Paid plan
    </span>
  );
}
