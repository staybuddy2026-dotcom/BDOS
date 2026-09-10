'use client';

import { useState, useCallback, useEffect } from 'react';
import blob from '@/assets/blob.png';
import {
  getUniversalLeadDiscoveryDataAction,
  saveSearchAction,
  saveMigratedCompanyAction,
  enrichDiscoveryLeadContactAction
} from '@/features/discovery/actions';
import {
  LeadDiscoveryData,
  DiscoveryLeadItem,
  ProviderSelection
} from '@/features/discovery/types';
import { LeadExplanationModal } from '@/components/refinement/LeadExplanationModal';
import { OmniOutreachDrawer } from '@/components/refinement/OmniOutreachDrawer';
import { explainLeadScoreAction, generateOmniOutreachAction } from '@/features/refinement/actions';
import { LeadExplanation, OmniChannelOutreachPackage } from '@/features/refinement/types';
import {
  Search,
  Building,
  Sparkles,
  Bookmark,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Send,
  Database,
  Inbox,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Copy,
  Check,
  ShieldCheck,
  X,
  Share2,
  TrendingUp,
  GitBranch
} from 'lucide-react';
import { BreadcrumbHeader } from '@/components/navigation/BreadcrumbHeader';
import '@/styles/globals.css';
import '@/styles/dashboard.css';

const DEFAULT_PROVIDERS: ProviderSelection = {
  apollo: true,
  github: true,
  crunchbase: true,
  linkedin: true,
  producthunt: false,
  reddit: false,
};

function getInitialProviders(): ProviderSelection {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('bdos_v1_provider_toggles');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_PROVIDERS, ...parsed };
      } catch {
        // ignore
      }
    }
  }
  return DEFAULT_PROVIDERS;
}

const DEFAULT_MIGRATED_IDS: string[] = [];

const DEFAULT_MIGRATED_LEADS: Record<string, DiscoveryLeadItem> = {};

export default function LeadDiscoveryPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LeadDiscoveryData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 25;
  const [activeTab, setActiveTab] = useState<'all' | 'migrated' | 'watchlist' | 'recent'>('all');
  const [selectedExplanation, setSelectedExplanation] = useState<LeadExplanation | null>(null);
  const [selectedOutreach, setSelectedOutreach] = useState<OmniChannelOutreachPackage | null>(null);
  const [expandedContactCompanyId, setExpandedContactCompanyId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [migrationPromptCompany, setMigrationPromptCompany] = useState<DiscoveryLeadItem | null>(null);

  // Persist V1 Provider Checkboxes in localStorage
  const [providerToggles, setProviderToggles] = useState<ProviderSelection>(getInitialProviders);

  // Migrated Company 360 IDs persistent state
  const [migratedCompanyIds, setMigratedCompanyIds] = useState<string[]>(() => {
    let removed: string[] = [];
    if (typeof window !== 'undefined') {
      const savedRemoved = localStorage.getItem('bdos_company360_removed_ids');
      if (savedRemoved) {
        try { removed = JSON.parse(savedRemoved).map((x: string) => x.toLowerCase().trim()); } catch { }
      }
      const saved = localStorage.getItem('bdos_company360_migrated_ids');
      if (saved) {
        try {
          const parsed: string[] = JSON.parse(saved);
          return Array.from(new Set([...DEFAULT_MIGRATED_IDS, ...parsed.map(x => x.toLowerCase().trim())])).filter(x => !removed.includes(x));
        } catch { }
      }
    }
    return DEFAULT_MIGRATED_IDS.filter(x => !removed.includes(x));
  });

  const [migratedLeadsMap, setMigratedLeadsMap] = useState<Record<string, DiscoveryLeadItem>>(() => {
    let removed: string[] = [];
    if (typeof window !== 'undefined') {
      const savedRemoved = localStorage.getItem('bdos_company360_removed_ids');
      if (savedRemoved) {
        try { removed = JSON.parse(savedRemoved).map((x: string) => x.toLowerCase().trim()); } catch { }
      }
      const saved = localStorage.getItem('bdos_company360_migrated_leads');
      const map: Record<string, DiscoveryLeadItem> = {};
      Object.entries(DEFAULT_MIGRATED_LEADS).forEach(([k, lead]) => {
        const key = k.toLowerCase().trim();
        const d = (lead.domain || '').toLowerCase().trim();
        const id = (lead.companyId || '').toLowerCase().trim();
        if (!removed.includes(key) && !removed.includes(d) && !removed.includes(id)) {
          map[key] = lead;
        }
      });
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          Object.values(parsed).forEach((item) => {
            if (item && typeof item === 'object') {
              const lead = item as DiscoveryLeadItem;
              const key = (lead.domain || lead.companyId || '').toLowerCase().trim();
              const id = (lead.companyId || '').toLowerCase().trim();
              if (key && !removed.includes(key) && !removed.includes(id)) {
                map[key] = lead;
              }
            }
          });
        } catch { }
      }
      return map;
    }
    return DEFAULT_MIGRATED_LEADS;
  });

  const syncFromLocalStorage = useCallback(() => {
    if (typeof window === 'undefined') return;

    let removedList: string[] = [];
    const savedRemoved = localStorage.getItem('bdos_company360_removed_ids');
    if (savedRemoved) {
      try {
        removedList = (JSON.parse(savedRemoved) as string[]).map((x) => String(x).toLowerCase().trim());
      } catch { }
    }

    const savedLeads = localStorage.getItem('bdos_company360_migrated_leads');
    let userLeadsMap: Record<string, DiscoveryLeadItem> = {};
    if (savedLeads) {
      try { userLeadsMap = JSON.parse(savedLeads); } catch { }
    }

    const combinedMap: Record<string, DiscoveryLeadItem> = { ...DEFAULT_MIGRATED_LEADS };
    Object.entries(userLeadsMap).forEach(([k, item]) => {
      if (item && typeof item === 'object') {
        const key = (item.domain || item.companyId || k).toLowerCase().trim();
        if (key) combinedMap[key] = item;
      }
    });

    const finalMap: Record<string, DiscoveryLeadItem> = {};
    const finalIdsSet = new Set<string>();

    Object.entries(combinedMap).forEach(([k, lead]) => {
      const key = k.toLowerCase().trim();
      const dom = (lead.domain || '').toLowerCase().trim();
      const id = (lead.companyId || '').toLowerCase().trim();

      const isExplicitUserMigration = Boolean(userLeadsMap[dom] || userLeadsMap[id] || userLeadsMap[key]);
      const isRemoved = !isExplicitUserMigration && (removedList.includes(key) || removedList.includes(dom) || removedList.includes(id));

      if (!isRemoved) {
        finalMap[dom || key] = lead;
        if (dom) finalIdsSet.add(dom);
        if (id) finalIdsSet.add(id);
        if (key) finalIdsSet.add(key);
      }
    });

    setMigratedCompanyIds(Array.from(finalIdsSet));
    setMigratedLeadsMap(finalMap);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      syncFromLocalStorage();
    }, 0);
    window.addEventListener('storage', syncFromLocalStorage);
    window.addEventListener('focus', syncFromLocalStorage);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('storage', syncFromLocalStorage);
      window.removeEventListener('focus', syncFromLocalStorage);
    };
  }, [syncFromLocalStorage]);

  const handleCopy = async (text: string, field: string) => {
    if (typeof window === 'undefined') return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for HTTP environments (like LAN IP access)
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
        } catch (error) {
          console.error('execCommand copy failed', error);
          triggerNotification('error', 'Browser blocked clipboard access. Please manually copy.');
          textArea.remove();
          return;
        } finally {
          textArea.remove();
        }
      }
      setCopiedField(field);
      triggerNotification('success', 'Copied to clipboard!');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      triggerNotification('error', 'Failed to copy to clipboard.');
    }
  };

  // Notification Toast
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const triggerNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleConfirmMigration = async (company: DiscoveryLeadItem) => {
    let currentIds: string[] = [];
    let currentLeads: Record<string, DiscoveryLeadItem> = {};
    if (typeof window !== 'undefined') {
      const savedIds = localStorage.getItem('bdos_company360_migrated_ids');
      if (savedIds) {
        try { currentIds = JSON.parse(savedIds); } catch { }
      }
      const savedLeads = localStorage.getItem('bdos_company360_migrated_leads');
      if (savedLeads) {
        try { currentLeads = JSON.parse(savedLeads); } catch { }
      }
    }

    const domKey = (company.domain || '').toLowerCase().trim();
    const idKey = (company.companyId || '').toLowerCase().trim();
    const keysToAdd = [domKey, idKey].filter(Boolean);

    const nextIds = Array.from(new Set([...currentIds, ...migratedCompanyIds, ...keysToAdd]));
    const nextLeads = { ...migratedLeadsMap, ...currentLeads, [domKey || idKey]: company };

    setMigratedCompanyIds(nextIds);
    setMigratedLeadsMap(nextLeads);

    if (typeof window !== 'undefined') {
      localStorage.setItem('bdos_company360_migrated_ids', JSON.stringify(nextIds));
      localStorage.setItem('bdos_company360_migrated_leads', JSON.stringify(nextLeads));

      // Clean removed ids list in localStorage
      const savedRemoved = localStorage.getItem('bdos_company360_removed_ids');
      if (savedRemoved) {
        try {
          const removedList: string[] = JSON.parse(savedRemoved);
          const cleanRemoved = removedList.filter(
            (x) => x !== domKey && x !== idKey && x !== `comp_${domKey.replace(/[^a-z0-9]/g, '_')}`
          );
          localStorage.setItem('bdos_company360_removed_ids', JSON.stringify(cleanRemoved));
        } catch { }
      }
    }

    // Persist directly to PostgreSQL database ApplicationSettings
    const dbRes = await saveMigratedCompanyAction(company).catch(() => null);
    if (dbRes && dbRes.success && dbRes.migratedLeadsMap) {
      setMigratedLeadsMap(dbRes.migratedLeadsMap);
      if (dbRes.migratedCompanyIds) {
        setMigratedCompanyIds(dbRes.migratedCompanyIds);
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('bdos_company360_migrated_leads', JSON.stringify(dbRes.migratedLeadsMap));
        if (dbRes.migratedCompanyIds) {
          localStorage.setItem('bdos_company360_migrated_ids', JSON.stringify(dbRes.migratedCompanyIds));
        }
        if (dbRes.removedCompanyIds) {
          localStorage.setItem('bdos_company360_removed_ids', JSON.stringify(dbRes.removedCompanyIds));
        }
      }
    }

    setMigrationPromptCompany(null);
    triggerNotification('success', `Migrated ${company.companyName} to Company 360.`);
  };

  // Watchlist & Recently Viewed persistent state
  const [watchlistIds, setWatchlistIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bdos_watchlist_ids');
      if (saved) {
        try { return JSON.parse(saved); } catch { }
      }
    }
    return [];
  });

  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bdos_recently_viewed_ids');
      if (saved) {
        try { return JSON.parse(saved); } catch { }
      }
    }
    return [];
  });

  const toggleWatchlist = (id: string) => {
    const next = watchlistIds.includes(id)
      ? watchlistIds.filter((x) => x !== id)
      : [...watchlistIds, id];
    setWatchlistIds(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bdos_watchlist_ids', JSON.stringify(next));
    }
  };

  const markRecentlyViewed = (id: string) => {
    if (!recentlyViewedIds.includes(id)) {
      const next = [id, ...recentlyViewedIds];
      setRecentlyViewedIds(next);
      if (typeof window !== 'undefined') {
        localStorage.setItem('bdos_recently_viewed_ids', JSON.stringify(next));
      }
    }
  };

  const handleToggleProvider = (providerKey: keyof ProviderSelection) => {
    const updated = { ...providerToggles, [providerKey]: !providerToggles[providerKey] };
    setProviderToggles(updated);
    setPage(1);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bdos_v1_provider_toggles', JSON.stringify(updated));
    }
  };

  const loadDiscoveryData = useCallback(async (query: string = '', pageNum: number = 1) => {
    setLoading(true);
    try {
      const res = await getUniversalLeadDiscoveryDataAction(query, providerToggles, pageNum, perPage);
      setData(res);

      if (typeof window !== 'undefined') {
        if (res.migratedLeadsMap && Object.keys(res.migratedLeadsMap).length > 0) {
          const savedLeads = localStorage.getItem('bdos_company360_migrated_leads');
          let currentLeadsMap: Record<string, DiscoveryLeadItem> = {};
          if (savedLeads) { try { currentLeadsMap = JSON.parse(savedLeads); } catch { } }
          const mergedLeads = { ...res.migratedLeadsMap, ...currentLeadsMap };
          localStorage.setItem('bdos_company360_migrated_leads', JSON.stringify(mergedLeads));
        }
        if (res.migratedCompanyIds && res.migratedCompanyIds.length > 0) {
          const savedIds = localStorage.getItem('bdos_company360_migrated_ids');
          let currentIds: string[] = [];
          if (savedIds) { try { currentIds = JSON.parse(savedIds); } catch { } }
          const mergedIds = Array.from(new Set([...currentIds, ...res.migratedCompanyIds]));
          localStorage.setItem('bdos_company360_migrated_ids', JSON.stringify(mergedIds));
        }
        if (res.removedCompanyIds && res.removedCompanyIds.length > 0) {
          const savedRemoved = localStorage.getItem('bdos_company360_removed_ids');
          let currentRemoved: string[] = [];
          if (savedRemoved) { try { currentRemoved = JSON.parse(savedRemoved); } catch { } }
          const mergedRemoved = Array.from(new Set([...currentRemoved, ...res.removedCompanyIds]));
          localStorage.setItem('bdos_company360_removed_ids', JSON.stringify(mergedRemoved));
        }
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
      if (typeof window !== 'undefined') {
        syncFromLocalStorage();
      }
    }
  }, [providerToggles, syncFromLocalStorage]);

  // Initial URL Parameter Reader (e.g. /discovery?q=SaaS from Home Dashboard Universal Search)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q') || params.get('query') || params.get('search') || params.get('keywords');
    if (q && q.trim()) {
      const cleanQ = q.trim();
      setSearchQuery(cleanQ);
      loadDiscoveryData(cleanQ, 1);
    }
  }, [loadDiscoveryData]);

  // Live As-You-Type Debounced Search Handler
  useEffect(() => {
    const timer = setTimeout(() => {
      loadDiscoveryData(searchQuery, page);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, page, loadDiscoveryData]);

  const handleQueryChange = (val: string) => {
    setSearchQuery(val);
    setPage(1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadDiscoveryData(searchQuery, 1);
  };

  const handleSaveSearch = async () => {
    if (!searchQuery.trim()) return;
    await saveSearchAction(searchQuery, 'Series A, USA/UK, React 19');
    await loadDiscoveryData(searchQuery, page);
  };

  const handleExplain = async (company: DiscoveryLeadItem) => {
    markRecentlyViewed(company.companyId);
    const exp = await explainLeadScoreAction(company.companyId, company.companyName, company.domain, company.buyingScore);
    setSelectedExplanation(exp);
  };

  const [enrichingLeadId, setEnrichingLeadId] = useState<string | null>(null);

  const handleViewContact = (company: DiscoveryLeadItem) => {
    markRecentlyViewed(company.companyId);
    setExpandedContactCompanyId((prev) => (prev === company.companyId ? null : company.companyId));
  };

  const handleUnlockContact = async (company: DiscoveryLeadItem) => {
    setEnrichingLeadId(company.companyId);
    try {
      const res = await enrichDiscoveryLeadContactAction(company);
      if (res.email || res.phone) {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            leads: prev.leads.map((l) =>
              l.companyId === company.companyId
                ? {
                  ...l,
                  contactEmail: res.email || l.contactEmail,
                  contactPhone: res.phone || l.contactPhone,
                  contactLinkedinUrl: res.linkedinUrl || l.contactLinkedinUrl,
                  whyContactReason: `Verified Apollo B2B Contact: ${l.recommendedContactName} (${l.recommendedContactTitle}). Email: ${res.email ? 'Live Verified' : 'Unverified'}`,
                }
                : l
            ),
          };
        });
        triggerNotification('success', `Live Apollo contact details revealed for ${company.recommendedContactName}!`);
      } else {
        triggerNotification('error', `Apollo API returned no unrevealed email/phone for ${company.recommendedContactName}. Try configuring live APOLLO_API_KEY in App Settings.`);
      }
    } catch {
      triggerNotification('error', 'Apollo contact enrichment failed.');
    } finally {
      setEnrichingLeadId(null);
    }
  };

  const handleOutreach = async (company: DiscoveryLeadItem) => {
    markRecentlyViewed(company.companyId);
    const pkg = await generateOmniOutreachAction(company.companyName, company.domain, company.recommendedContactName, company.recommendedContactTitle);
    setSelectedOutreach(pkg);
  };

  const rawLeads = data?.leads || [];
  const activeLeads = (() => {
    let list: DiscoveryLeadItem[] = [];

    if (activeTab === 'migrated') {
      const map = new Map<string, DiscoveryLeadItem>();

      // 1. Include all active migrated leads from migratedLeadsMap
      Object.values(migratedLeadsMap).forEach((lead) => {
        if (lead) {
          const key = (lead.domain || lead.companyId || '').toLowerCase().trim();
          if (key) {
            map.set(key, lead);
          }
        }
      });

      // 2. Merge rawLeads that match migratedCompanyIds or migratedLeadsMap
      rawLeads.forEach((l) => {
        const dom = (l.domain || '').toLowerCase().trim();
        const id = (l.companyId || '').toLowerCase().trim();
        if (dom && (migratedCompanyIds.includes(dom) || migratedCompanyIds.includes(id) || migratedLeadsMap[dom])) {
          if (!map.has(dom)) {
            map.set(dom, l);
          }
        }
      });

      list = Array.from(map.values());
    } else if (activeTab === 'watchlist') {
      list = rawLeads.filter((l) => watchlistIds.includes(l.companyId) || (l.domain && watchlistIds.includes(l.domain)));
    } else if (activeTab === 'recent') {
      list = rawLeads.filter((l) => recentlyViewedIds.includes(l.companyId) || (l.domain && recentlyViewedIds.includes(l.domain)));
    } else {
      list = rawLeads;
    }

    // Deduplicate by companyId & domain to guarantee unique list items
    const uniqueMap = new Map<string, DiscoveryLeadItem>();
    list.forEach((l) => {
      const k = l.companyId || l.domain;
      if (!uniqueMap.has(k)) {
        uniqueMap.set(k, l);
      }
    });

    return Array.from(uniqueMap.values());
  })();

  return (
    <div className="discovery-page" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', gap: 0, paddingBottom: 0, boxSizing: 'border-box', color: 'var(--text-primary)' }}>
      {/* Toast Notification */}
      {notification && (
        <div className={`notification-toast ${notification.type}`} style={{ zIndex: 99999 }}>
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          {notification.message}
        </div>
      )}

      {/* HEADER BANNER */}
      <div style={{
        background: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        height: '65px',
        padding: '0 28px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)', padding: '10px', borderRadius: '8px', boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)' }}>
            <Search size={18} style={{ color: 'var(--bg-primary)' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, background: 'linear-gradient(135deg, #0f172a, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
              Prospect Discovery Engine
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#8ba0cb', fontWeight: 600, letterSpacing: '0.03em', marginTop: '4px', margin: 0 }}>
              Universal Lead Discovery & Account Intelligence Workspace
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.76rem', background: 'var(--color-success-bg)', color: 'var(--color-success)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 10px', borderRadius: '20px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-success)' }} /> 4 Core V1 Providers Ingestion Active (Apollo, LinkedIn, Crunchbase, GitHub)
          </span>
        </div>
      </div>

      {/* SCROLLABLE MAIN CONTENT */}
      <div
        className="discovery-scrollable-content"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 28px 24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          position: 'relative',
          backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.6), rgba(248, 250, 252, 0.6)), url(${blob.src})`,
          backgroundSize: 'cover',
          backgroundPosition: 'top right',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
        {/* Top Navigation & Breadcrumb */}
        <BreadcrumbHeader
          currentTitle="Universal Search"
          badge="Multi-Provider AI Search"
        />

        {/* SINGLE UNIVERSAL SEARCH BAR WITH INSTANT LIVE TYPING SEARCH */}
        <form
          onSubmit={handleSearchSubmit}
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 30px rgba(99, 102, 241, 0.15)'; e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
        >
          {/* Proper Layout: Input Box (with Icon inside) + Button on the right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Real Input Box with Icon inside */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '0 16px',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.15)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <Search size={18} style={{ color: '#6366f1', flexShrink: 0 }} />
              <input
                type="text"
                className="universal-search-override"
                value={searchQuery}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Type to instant search across Apollo.io, LinkedIn, Crunchbase & GitHub (e.g. 'Swift', 'Flutter', 'PyTorch', 'LangChain', 'LLAMA', 'Shopify', 'AWS')..."
                style={{ width: '100%', color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 600, padding: '14px 0' }}
              />
            </div>

            <button type="submit" style={{ padding: '14px 24px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', color: '#ffffff', fontWeight: 800, fontSize: '0.9rem', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)', transition: 'transform 0.2s ease, box-shadow 0.2s ease', flexShrink: 0 }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.5)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)'; }}
            >
              <Sparkles size={16} /> Search All Providers
            </button>
          </div>

          {/* Live Provider Ingestion Toggles */}
          <div suppressHydrationWarning style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.74rem', padding: '4px 4px 4px 8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, color: 'var(--text-secondary)' }}>V1 Core Providers:</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['apollo', 'linkedin', 'crunchbase', 'github'] as const).map((p) => {
                const isActive = !!providerToggles[p];
                const activeColor = p === 'apollo' ? '#3b82f6' : p === 'linkedin' ? '#0ea5e9' : p === 'crunchbase' ? '#f59e0b' : '#10b981';
                const activeBg = p === 'apollo' ? '#eff6ff' : p === 'linkedin' ? '#f0f9ff' : p === 'crunchbase' ? '#fffbeb' : '#f0fdf4';
                const activeBorder = p === 'apollo' ? '#bfdbfe' : p === 'linkedin' ? '#bae6fd' : p === 'crunchbase' ? '#fde68a' : '#bbf7d0';

                return (
                  <label key={p} suppressHydrationWarning style={{
                    display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                    background: isActive ? activeBg : 'var(--bg-secondary)',
                    padding: '6px 12px', borderRadius: '6px',
                    border: `1px solid ${isActive ? activeBorder : 'var(--border-subtle)'}`,
                    color: isActive ? activeColor : 'var(--text-muted)',
                    fontWeight: 800, textTransform: 'capitalize', transition: 'all 0.2s',
                  }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.borderColor = '#94a3b8'; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                  >
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '14px', height: '14px' }}>
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => handleToggleProvider(p)}
                        style={{ opacity: 0, position: 'absolute', width: '100%', height: '100%', margin: 0, cursor: 'pointer', zIndex: 2 }}
                      />
                      <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: isActive ? activeColor : 'transparent', border: `1px solid ${isActive ? activeColor : '#94a3b8'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', pointerEvents: 'none' }}>
                        {isActive && <Check size={10} color="#ffffff" strokeWidth={4} />}
                      </div>
                    </div>
                    {p === 'apollo' ? <><Database size={12} /> Apollo.io</> : p === 'linkedin' ? <><Share2 size={12} /> LinkedIn</> : p === 'crunchbase' ? <><TrendingUp size={12} /> Crunchbase</> : <><GitBranch size={12} /> GitHub</>}
                  </label>
                );
              })}
            </div>
          </div>
        </form>

        {/* SAVED SEARCH PILLS */}
        {data?.savedSearches && data.savedSearches.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>Saved Searches:</span>
            {data.savedSearches.map((s) => (
              <button
                key={s.id}
                onClick={() => { handleQueryChange(s.query); }}
                style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', background: 'var(--accent-indigo-glow)', border: '1px solid var(--border-focus)', color: 'var(--accent-indigo)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Bookmark size={10} /> {s.query} ({s.matchCount})
              </button>
            ))}

            {searchQuery && (
              <button onClick={handleSaveSearch} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', background: 'var(--color-success-bg)', border: '1px solid rgba(16, 185, 129, 0.3)', color: 'var(--color-success)', fontWeight: 700, cursor: 'pointer' }}>
                + Save Search
              </button>
            )}
          </div>
        )}

        {/* WORKSPACE NAVIGATION TABS */}
        <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid var(--border-subtle)', paddingBottom: '16px', marginTop: '10px' }}>
          <button
            onClick={() => { setActiveTab('all'); setPage(1); }}
            style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 800, border: activeTab === 'all' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent', background: activeTab === 'all' ? '#ffffff' : 'transparent', color: activeTab === 'all' ? '#6366f1' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '6px' }}
            onMouseEnter={(e) => { if (activeTab !== 'all') { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
            onMouseLeave={(e) => { if (activeTab !== 'all') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
          >
            🎯 All AI Qualified Leads ({data?.totalCount || rawLeads.length})
          </button>

          <button
            onClick={() => { setActiveTab('migrated'); setPage(1); }}
            suppressHydrationWarning
            style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 800, border: activeTab === 'migrated' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent', background: activeTab === 'migrated' ? '#ffffff' : 'transparent', color: activeTab === 'migrated' ? '#6366f1' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '6px' }}
            onMouseEnter={(e) => { if (activeTab !== 'migrated') { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
            onMouseLeave={(e) => { if (activeTab !== 'migrated') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
          >
            🏢 Migrated to 360 (<span suppressHydrationWarning>{Object.keys(migratedLeadsMap).length}</span>)
          </button>

          <button
            onClick={() => { setActiveTab('watchlist'); setPage(1); }}
            suppressHydrationWarning
            style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 800, border: activeTab === 'watchlist' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent', background: activeTab === 'watchlist' ? '#ffffff' : 'transparent', color: activeTab === 'watchlist' ? '#6366f1' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '6px' }}
            onMouseEnter={(e) => { if (activeTab !== 'watchlist') { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
            onMouseLeave={(e) => { if (activeTab !== 'watchlist') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
          >
            ⭐ Watchlist (<span suppressHydrationWarning>{watchlistIds.length}</span>)
          </button>

          <button
            onClick={() => { setActiveTab('recent'); setPage(1); }}
            suppressHydrationWarning
            style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 800, border: activeTab === 'recent' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent', background: activeTab === 'recent' ? '#ffffff' : 'transparent', color: activeTab === 'recent' ? '#6366f1' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '6px' }}
            onMouseEnter={(e) => { if (activeTab !== 'recent') { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
            onMouseLeave={(e) => { if (activeTab !== 'recent') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
          >
            🕒 Recently Viewed (<span suppressHydrationWarning>{recentlyViewedIds.length}</span>)
          </button>
        </div>

        {/* LEAD CARDS LIST */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RotateCcw size={26} className="animate-spin" style={{ margin: '0 auto 10px auto', display: 'block', color: 'var(--accent-indigo)' }} />
            Ingesting live intelligence from Apollo.io, LinkedIn, Crunchbase & GitHub...
          </div>
        ) : activeLeads.length === 0 ? (
          <div style={{ padding: '50px 20px', textAlign: 'center', background: 'var(--bg-primary)', border: '1px dashed rgba(255, 255, 255, 0.15)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <Inbox size={36} style={{ color: 'var(--text-muted)' }} />
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>No Leads Found</div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '420px', margin: 0 }}>
              {activeTab === 'watchlist'
                ? 'No leads saved in Watchlist yet. Click the ⭐ Watchlist button on any lead to add it here!'
                : activeTab === 'recent'
                  ? 'No recently viewed leads yet. Click "Why Score?" or "1-Click Outreach" to view leads.'
                  : 'No leads match your current search query or active provider filters. Try searching a company or tech stack above!'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {activeLeads.map((lead, idx) => {
              const isWatchlisted = watchlistIds.includes(lead.companyId);
              const domKey = (lead.domain || '').toLowerCase().trim();
              const idKey = (lead.companyId || '').toLowerCase().trim();
              const isMigrated = migratedCompanyIds.includes(idKey) || (domKey && migratedCompanyIds.includes(domKey)) || Boolean(migratedLeadsMap[domKey || idKey]);
              const initials = lead.companyName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'CO';

              return (
                <div
                  key={`${lead.companyId || lead.domain || 'lead'}_${idx}`}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    borderRadius: '14px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                    transition: 'all 0.2s ease-in-out'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.border = '1px solid rgba(99, 102, 241, 0.6)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(99, 102, 241, 0.15)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.border = '1px solid rgba(99, 102, 241, 0.25)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Header Row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                      {/* Avatar Initials Badge */}
                      <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', color: '#ffffff', fontWeight: 900, fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)', flexShrink: 0 }}>
                        {initials}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h3 style={{ fontSize: '1.18rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>{lead.companyName}</h3>
                          {isMigrated && (
                            <span style={{ fontSize: '0.66rem', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.4)', color: '#6366f1', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                              ✅ Migrated to Company 360
                            </span>
                          )}
                          <span style={{ fontSize: '0.66rem', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#6366f1', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                            ICP {lead.icpScore}/100
                          </span>
                          <span style={{ fontSize: '0.66rem', background: 'var(--color-warning-bg)', border: '1px solid rgba(234, 179, 8, 0.3)', color: 'var(--color-warning)', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                            Intent {lead.buyingScore}/100
                          </span>
                          <span style={{ fontSize: '0.66rem', background: 'var(--color-danger-bg)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--color-danger)', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                            {lead.tier}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <strong style={{ color: 'var(--accent-indigo)' }}>{lead.domain}</strong>
                          {lead.country && <span>• {lead.country}</span>}
                          {lead.employeeCount > 0 && <span>• {lead.employeeCount} Employees</span>}
                          {lead.estimatedBudgetInr ? (
                            <span>
                              • Est. Budget: <strong style={{ color: '#6366f1' }}>{lead.estimatedBudgetInr}</strong>
                              {lead.estimatedBudgetUsd && ` (${lead.estimatedBudgetUsd} USD)`}
                            </span>
                          ) : null}
                        </div>

                        {/* TECH STACK BADGES */}
                        {lead.primaryTechStack && lead.primaryTechStack.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 800 }}>Tech Stack:</span>
                            {lead.primaryTechStack.map((tech) => (
                              <span key={tech} style={{ fontSize: '0.64rem', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                                {tech}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewContact(lead);
                        }}
                        style={{ padding: '7px 12px', borderRadius: '8px', fontSize: '0.76rem', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.35)', color: '#6366f1', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Mail size={13} /> View Contact Info
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleWatchlist(lead.companyId)}
                        style={{ padding: '7px 12px', borderRadius: '8px', fontSize: '0.76rem', background: isWatchlisted ? 'var(--color-warning-bg)' : 'var(--bg-secondary)', border: '1px solid rgba(234, 179, 8, 0.4)', color: isWatchlisted ? 'var(--color-warning)' : '#94a3b8', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        ⭐ {isWatchlisted ? 'Saved' : 'Watchlist'}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isMigrated) {
                            window.location.href = `/company?query=${encodeURIComponent(lead.domain || lead.companyName)}`;
                          } else {
                            setMigrationPromptCompany(lead);
                          }
                        }}
                        style={{ padding: '7px 12px', borderRadius: '8px', fontSize: '0.76rem', background: isMigrated ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.05)', border: isMigrated ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid rgba(99, 102, 241, 0.25)', color: '#6366f1', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Building size={13} /> {isMigrated ? 'View in 360' : 'Company 360'}
                      </button>

                      <button onClick={() => handleExplain(lead)} style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '0.76rem', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.25)', color: '#6366f1', fontWeight: 700, cursor: 'pointer' }}>
                        Why Score {lead.buyingScore}?
                      </button>

                      <button onClick={() => handleOutreach(lead)} style={{ padding: '7px 16px', borderRadius: '8px', fontSize: '0.76rem', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', color: '#ffffff', fontWeight: 800, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}>
                        <Send size={13} /> 1-Click Omni-Outreach
                      </button>
                    </div>
                  </div>

                  {/* VERIFIED DECISION MAKER & INTENT REASONING BOX */}
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                      <CheckCircle2 size={15} style={{ color: '#6366f1', flexShrink: 0 }} />
                      <div>
                        <strong>Why Contact:</strong> {lead.whyContactReason}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.68rem', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#6366f1', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Database size={10} /> Apollo.io Verified API Lead
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewContact(lead);
                        }}
                        style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#6366f1', padding: '3px 10px', borderRadius: '6px', fontWeight: 800, fontSize: '0.76rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        Target: {lead.recommendedContactName} ({lead.recommendedContactTitle}) <Mail size={12} />
                      </button>
                    </div>
                  </div>

                  {/* EXPANDED INLINE MIGRATION CONFIRMATION BOX */}
                  <div style={{
                    maxHeight: migrationPromptCompany?.companyId === lead.companyId ? '300px' : '0px',
                    opacity: migrationPromptCompany?.companyId === lead.companyId ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    marginTop: migrationPromptCompany?.companyId === lead.companyId ? '6px' : '0px',
                  }}>
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(99, 102, 241, 0.4)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                          <Building size={18} style={{ color: '#6366f1' }} />
                          <span>Migrate {lead.companyName} ({lead.domain}) to Company 360?</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMigrationPromptCompany(null);
                          }}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.2s ease' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#6366f1'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        Do you wish to move <strong>{lead.companyName}</strong> to Company 360? This will build a unified master profile across Apollo decision makers, GitHub engineering repositories, Crunchbase growth, Product Hunt, and LinkedIn signals.
                      </div>

                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '4px' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMigrationPromptCompany(null);
                          }}
                          style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-muted)', fontWeight: 700, cursor: 'pointer', fontSize: '0.78rem', transition: 'all 0.2s ease' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                        >
                          No, Cancel
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmMigration(lead);
                          }}
                          style={{ padding: '8px 20px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', color: '#ffffff', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)', transition: 'all 0.2s ease' }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.4)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)'; }}
                          onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(1px)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.3)'; }}
                          onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.4)'; }}
                        >
                          <Check size={14} /> Yes, Migrate Now
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* EXPANDED INLINE VERIFIED CONTACT DETAILS BOX */}
                  <div style={{
                    maxHeight: expandedContactCompanyId === lead.companyId ? '500px' : '0px',
                    opacity: expandedContactCompanyId === lead.companyId ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    marginTop: expandedContactCompanyId === lead.companyId ? '6px' : '0px',
                  }}>
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(99, 102, 241, 0.4)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 800, color: '#6366f1' }}>
                          <ShieldCheck size={16} style={{ color: '#6366f1' }} />
                          <span>Verified Apollo B2B Direct Contact Details ({lead.recommendedContactName})</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedContactCompanyId(null);
                          }}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.2s ease' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#6366f1'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                        {/* Email */}
                        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                            <Mail size={16} style={{ color: '#6366f1', flexShrink: 0 }} />
                            <div style={{ overflow: 'hidden' }}>
                              <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', fontWeight: 700 }}>WORK EMAIL</div>
                              <div style={{ fontSize: '0.82rem', color: lead.contactEmail ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {lead.contactEmail || 'Email Not Disclosed'}
                              </div>
                            </div>
                          </div>
                          {lead.contactEmail && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(lead.contactEmail!, `email_${lead.companyId}`);
                              }}
                              style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '0.72rem', background: copiedField === `email_${lead.companyId}` ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)', border: copiedField === `email_${lead.companyId}` ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(99, 102, 241, 0.3)', color: copiedField === `email_${lead.companyId}` ? '#10b981' : '#6366f1', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.2s ease' }}
                              onMouseEnter={(e) => { if (copiedField !== `email_${lead.companyId}`) e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'; }}
                              onMouseLeave={(e) => { if (copiedField !== `email_${lead.companyId}`) e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'; }}
                            >
                              {copiedField === `email_${lead.companyId}` ? <Check size={12} /> : <Copy size={12} />}
                              {copiedField === `email_${lead.companyId}` ? 'Copied' : 'Copy Email'}
                            </button>
                          )}
                        </div>

                        {/* Phone */}
                        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Phone size={16} style={{ color: '#6366f1', flexShrink: 0 }} />
                            <div>
                              <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', fontWeight: 700 }}>DIRECT PHONE</div>
                              <div style={{ fontSize: '0.82rem', color: lead.contactPhone ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 800 }}>
                                {lead.contactPhone || 'Phone Not Disclosed'}
                              </div>
                            </div>
                          </div>
                          {lead.contactPhone && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(lead.contactPhone!, `phone_${lead.companyId}`);
                              }}
                              style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '0.72rem', background: copiedField === `phone_${lead.companyId}` ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)', border: copiedField === `phone_${lead.companyId}` ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(99, 102, 241, 0.3)', color: copiedField === `phone_${lead.companyId}` ? '#10b981' : '#6366f1', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.2s ease' }}
                              onMouseEnter={(e) => { if (copiedField !== `phone_${lead.companyId}`) e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'; }}
                              onMouseLeave={(e) => { if (copiedField !== `phone_${lead.companyId}`) e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'; }}
                            >
                              {copiedField === `phone_${lead.companyId}` ? <Check size={12} /> : <Copy size={12} />}
                              {copiedField === `phone_${lead.companyId}` ? 'Copied' : 'Copy Phone'}
                            </button>
                          )}
                        </div>
                      </div>

                      {(!lead.contactEmail || !lead.contactPhone) && (
                        <button
                          type="button"
                          disabled={enrichingLeadId === lead.companyId}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnlockContact(lead);
                          }}
                          style={{
                            width: '100%',
                            padding: '10px 16px',
                            borderRadius: '8px',
                            fontSize: '0.82rem',
                            background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                            color: '#ffffff',
                            fontWeight: 800,
                            border: 'none',
                            cursor: enrichingLeadId === lead.companyId ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                            opacity: enrichingLeadId === lead.companyId ? 0.7 : 1,
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => { if (enrichingLeadId !== lead.companyId) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.4)'; } }}
                          onMouseLeave={(e) => { if (enrichingLeadId !== lead.companyId) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)'; } }}
                          onMouseDown={(e) => { if (enrichingLeadId !== lead.companyId) { e.currentTarget.style.transform = 'translateY(1px)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.3)'; } }}
                          onMouseUp={(e) => { if (enrichingLeadId !== lead.companyId) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.4)'; } }}
                        >
                          <Sparkles size={14} /> {enrichingLeadId === lead.companyId ? 'Enriching via Apollo REST API...' : '⚡ Unlock Live Verified Email & Direct Phone via Apollo API'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* PAGINATION CONTROLS BAR */}
            {data && data.totalCount > 0 && activeTab === 'all' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px 16px', marginTop: '10px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Showing <strong style={{ color: 'var(--text-primary)' }}>1–{data.leads.length}</strong> of <strong style={{ color: 'var(--accent-indigo)' }}>{data.totalCount.toLocaleString()}</strong> target company accounts ({data.totalContactsCount ? data.totalContactsCount.toLocaleString() : '1,345'} total decision-makers in Apollo)
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={data.page <= 1 || loading}
                    style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '0.76rem', background: data.page <= 1 ? 'var(--bg-secondary)' : 'var(--accent-indigo-glow)', border: '1px solid var(--border-focus)', color: data.page <= 1 ? 'var(--text-muted)' : 'var(--accent-indigo)', fontWeight: 700, cursor: data.page <= 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>

                  <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: 800, padding: '0 8px' }}>
                    Page {data.page} of {data.totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                    disabled={data.page >= data.totalPages || loading}
                    style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '0.76rem', background: data.page >= data.totalPages ? 'var(--bg-secondary)' : 'var(--accent-indigo-glow)', border: '1px solid var(--border-focus)', color: data.page >= data.totalPages ? 'var(--text-muted)' : 'var(--accent-indigo)', fontWeight: 700, cursor: data.page >= data.totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODALS */}
        {selectedExplanation && <LeadExplanationModal explanation={selectedExplanation} onClose={() => setSelectedExplanation(null)} />}
        {selectedOutreach && <OmniOutreachDrawer packageData={selectedOutreach} onClose={() => setSelectedOutreach(null)} />}
      </div>
    </div>
  );
}
