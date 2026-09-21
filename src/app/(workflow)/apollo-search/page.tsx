'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import blob from '@/assets/blob.png';
import {
  User,
  Search,
  ShieldCheck,
  Filter,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Link as LinkIcon,
  Building2,
  Users,
  Zap,
  Globe,
  Sparkles
} from 'lucide-react';
import {
  searchApolloPeople,
  searchApolloOrganizations,
  linkApolloEnrichmentToPost,
  checkApolloCreditWarning,
  enrichApolloPersonDirect,
  saveApolloPeopleMapToDb,
  getApolloPeopleMapFromDb
} from '@/features/apollo/actions';
import '@/styles/dashboard.css';
import { getReviewPosts, ReviewPostData } from '@/features/review/actions';
import { ApolloPersonMatch, ApolloOrganizationMatch } from '@/features/apollo/provider';
import {
  getAllProvidersList,
  searchLeadHub,
  getProviderStats,
  getSavedSearchPresets,
  ProviderCardData,
  FrameworkStats
} from '@/features/providers/actions';
import { LeadItem, SavedSearchPreset } from '@/features/providers/types';
import { saveMigratedCompanyAction } from '@/features/discovery/actions';
import { DiscoveryLeadItem } from '@/features/discovery/types';
import { ActiveHiringFilterPanel } from '@/components/apollo/ActiveHiringFilterPanel';
import { UniversalResultRenderer } from '@/components/UniversalResultRenderer';
import { BreadcrumbHeader } from '@/components/navigation/BreadcrumbHeader';
import { CustomDropdown } from '@/components/CustomDropdown';
import { WorkflowGuide } from '@/components/WorkflowGuide';
import '@/styles/globals.css';

// Helper to format Apollo masked names cleanly (e.g., "Mike Br***m" -> "Mike B.")
function formatPersonName(rawName: string): string {
  if (!rawName) return 'Executive Lead';
  return rawName.replace(/(\b[A-Za-z]+)\s+([A-Za-z])[a-zA-Z]*\*\*\*[a-zA-Z]*/g, '$1 $2.');
}

export default function ApolloSearchPage() {
  const router = useRouter();

  // Mode Switcher: 'people' | 'companies'
  const [searchMode, setSearchMode] = useState<'people' | 'companies'>('people');

  // People Search Filters State
  const [jobTitle, setJobTitle] = useState('');
  const [seniority, setSeniority] = useState('');
  const [personLocation, setPersonLocation] = useState('');
  const [orgLocation, setOrgLocation] = useState('');
  const [keywords, setKeywords] = useState('');
  const [domain, setDomain] = useState('');
  const [personCompanyName, setPersonCompanyName] = useState('');
  const [techUsage, setTechUsage] = useState('');
  const [hiringActivity, setHiringActivity] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  // Company Search Filters State
  const [companyName, setCompanyName] = useState('');
  const [companyDomain, setCompanyDomain] = useState('');
  const [companyKeywords, setCompanyKeywords] = useState('');
  const [companyLocation, setCompanyLocation] = useState('');
  const [employeeCountRange, setEmployeeCountRange] = useState('');
  const [companyTechUsage, setCompanyTechUsage] = useState('');
  const [companyHiringKeywords, setCompanyHiringKeywords] = useState('');
  const [fundingPresetDays, setFundingPresetDays] = useState<number | undefined>(undefined);
  const [fundingStage, setFundingStage] = useState('');
  const [activePresetKey, setActivePresetKey] = useState<string | null>(null);

  // Universal Provider Framework State
  const [selectedProviderId, setSelectedProviderId] = useState<string>('apollo');
  const [providersList, setProvidersList] = useState<ProviderCardData[]>([]);
  const [_hubLeadItems, setHubLeadItems] = useState<LeadItem[]>([]);
  const [frameworkStats, setFrameworkStats] = useState<FrameworkStats | null>(null);
  const [savedPresets, setSavedPresets] = useState<SavedSearchPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  // Data Results
  const [peopleResults, setPeopleResults] = useState<ApolloPersonMatch[]>([]);
  const [companyResults, setCompanyResults] = useState<ApolloOrganizationMatch[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [creditWarning, setCreditWarning] = useState<{ isWarning: boolean; remainingCredits: number; threshold: number } | null>(null);

  // Linking & Enrichment Modals
  const [reviewPosts, setReviewPosts] = useState<ReviewPostData[]>([]);
  const [selectedPersonForLink, setSelectedPersonForLink] = useState<ApolloPersonMatch | null>(null);
  const [selectedPostIdForLink, setSelectedPostIdForLink] = useState<string>('');
  const [showLinkModal, setShowLinkModal] = useState(false);

  const [personToEnrich, setPersonToEnrich] = useState<ApolloPersonMatch | null>(null);
  const [showEnrichModal, setShowEnrichModal] = useState(false);
  const [enrichLoading, setEnrichLoading] = useState(false);

  // Tab-Based Prospecting Navigation: 'saved' | 'fresh' (Default: 'fresh')
  const [activeDataTab, setActiveDataTab] = useState<'saved' | 'fresh'>('fresh');
  const [savedPage, setSavedPage] = useState(1);

  // Persistent Saved Contacts State (Synced with PostgreSQL DB & LocalStorage)
  const [savedPeopleMap, setSavedPeopleMap] = useState<Record<string, ApolloPersonMatch>>({});

  // Load saved contacts from LocalStorage & PostgreSQL DB on mount (Client-side sync)
  useEffect(() => {
    let isMounted = true;

    let hasSearchParams = false;

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bdos_apollo_saved_people_map');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
            setSavedPeopleMap(parsed);
          }
        } catch { }
      }

      const params = new URLSearchParams(window.location.search);
      const paramName = params.get('name');
      const paramDomain = params.get('domain');
      const paramCompany = params.get('company');
      const paramQ = params.get('q') || params.get('query') || params.get('keywords') || params.get('search');

      if (paramQ || paramCompany || paramName || paramDomain) hasSearchParams = true;

      if (paramQ) {
        setKeywords(paramQ);
        setCompanyKeywords(paramQ);
      }

      if (paramCompany) {
        setSearchMode('people');
        setPersonCompanyName(paramCompany.replace(/\s*\([^)]*\)/g, '').trim());
        setJobTitle('Founder, CEO, CTO, VP, Director');
        setActiveDataTab('fresh');
      } else if (paramName || paramDomain) {
        setSearchMode('companies');
        if (paramName) setCompanyName(paramName);
        if (paramDomain) setCompanyDomain(paramDomain);
        setActiveDataTab('fresh');
      }
    }

    getApolloPeopleMapFromDb().then(dbJson => {
      if (!isMounted || !dbJson || dbJson === '{}') return;
      try {
        const parsed = JSON.parse(dbJson);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          setSavedPeopleMap(prev => {
            const merged = { ...parsed, ...prev };
            if (typeof window !== 'undefined') {
              localStorage.setItem('bdos_apollo_saved_people_map', JSON.stringify(merged));
            }
            return merged;
          });
          if (!hasSearchParams) {
            setActiveDataTab('saved');
          }
        }
      } catch { }
    });
    return () => { isMounted = false; };
  }, []);

  const [savingPersonId, setSavingPersonId] = useState<string | null>(null);

  const getPersonKey = useCallback((person: ApolloPersonMatch): string => {
    return String(person.apolloPersonId || (person.personName + '_' + (person.organizationDomain || ''))).toLowerCase().trim();
  }, []);

  const markContactAsViewed = useCallback((person: ApolloPersonMatch) => {
    const key = getPersonKey(person);
    if (!key) return;
    setSavedPeopleMap((prev) => {
      if (prev[key]) return prev;
      const next = { ...prev, [key]: person };
      if (typeof window !== 'undefined') {
        localStorage.setItem('bdos_apollo_saved_people_map', JSON.stringify(next));
      }
      setTimeout(() => {
        saveApolloPeopleMapToDb(JSON.stringify(next)).catch(() => { });
      }, 0);
      return next;
    });
  }, [getPersonKey]);

  const handleSavePerson = useCallback(async (person: ApolloPersonMatch) => {
    const key = getPersonKey(person);
    if (!key) return;
    setSavingPersonId(key);

    try {
      await new Promise(r => setTimeout(r, 100));

      setSavedPeopleMap(prev => {
        const next = { ...prev, [key]: person };
        if (typeof window !== 'undefined') {
          localStorage.setItem('bdos_apollo_saved_people_map', JSON.stringify(next));
        }
        setTimeout(() => {
          saveApolloPeopleMapToDb(JSON.stringify(next)).catch(() => { });
        }, 0);
        return next;
      });

      markContactAsViewed(person);
      triggerNotification('success', `✓ Saved ${formatPersonName(person.personName)} to PostgreSQL Database.`);
    } catch {
      triggerNotification('error', `Failed to save ${formatPersonName(person.personName)}.`);
    } finally {
      setSavingPersonId(null);
    }
  }, [getPersonKey, markContactAsViewed]);

  const handleUnsavePerson = useCallback((person: ApolloPersonMatch) => {
    const key = getPersonKey(person);
    if (!key) return;

    const savedObj = savedPeopleMap[key] || person;
    const preservedContact: ApolloPersonMatch = {
      ...person,
      ...savedObj,
      workEmail: savedObj.workEmail || person.workEmail,
      personalEmail: savedObj.personalEmail || person.personalEmail,
      phone: savedObj.phone || person.phone,
    };

    setSavedPeopleMap(prev => {
      const next = { ...prev };
      delete next[key];
      if (typeof window !== 'undefined') {
        localStorage.setItem('bdos_apollo_saved_people_map', JSON.stringify(next));
      }
      setTimeout(() => {
        saveApolloPeopleMapToDb(JSON.stringify(next)).catch(() => { });
      }, 0);
      return next;
    });

    setPeopleResults(prev => {
      const existingIdx = prev.findIndex(p => getPersonKey(p) === key);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          ...preservedContact,
        };
        return next;
      }
      return [preservedContact, ...prev];
    });

    triggerNotification('success', `Moved ${formatPersonName(person.personName)} back to Fresh Data.`);
  }, [getPersonKey, savedPeopleMap]);

  // Toast Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const triggerNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleResearchInCompany360 = async (org: ApolloOrganizationMatch) => {
    try {
      const leadItem: DiscoveryLeadItem = {
        companyId: org.apolloOrganizationId || `comp_${Date.now()}`,
        companyName: org.name,
        domain: org.domain || '',
        industry: org.industry || 'Technology',
        country: org.location || 'Unknown',
        employeeCount: org.employeeCount || 0,
        fundingSummary: org.latestFundingStage || '',
        buyingScore: 85,
        icpScore: 90,
        tier: 'HIGH',
        primaryTechStack: org.technologies || ['React', 'Node.js'],
        hiringSummary: `${org.openJobsCount || 0} open roles`,
        matchedProviders: ['apollo'],
        whyContactReason: org.whyThisCompanySummary || 'High ICP match',
        recommendedContactName: 'Decision Maker',
        recommendedContactTitle: 'Executive',
        bestOutreachChannel: 'EMAIL',
        estimatedBudgetInr: '₹50,00,000',
        estimatedBudgetUsd: '$60,000',
        conversionProbabilityPercent: 45,
        recommendedServices: ['Web Development', 'AI Integration'],
      };

      // Ensure it is saved in DB
      await saveMigratedCompanyAction(leadItem);

      // Save locally to reflect immediately on Company 360 page
      if (typeof window !== 'undefined') {
        const key = (org.domain || leadItem.companyId).toLowerCase().trim();
        const savedLeads = localStorage.getItem('bdos_company360_migrated_leads');
        let currentMap: Record<string, DiscoveryLeadItem> = {};
        if (savedLeads) {
          try { currentMap = JSON.parse(savedLeads); } catch { }
        }
        currentMap[key] = leadItem;
        localStorage.setItem('bdos_company360_migrated_leads', JSON.stringify(currentMap));

        const savedIds = localStorage.getItem('bdos_company360_migrated_ids');
        let currentIds: string[] = [];
        if (savedIds) {
          try { currentIds = JSON.parse(savedIds); } catch { }
        }
        if (!currentIds.includes(key)) {
          currentIds.push(key);
          localStorage.setItem('bdos_company360_migrated_ids', JSON.stringify(currentIds));
        }
      }

      // Redirect to Company 360 Workspace
      router.push(`/company?query=${encodeURIComponent(org.domain || org.apolloOrganizationId)}`);
      triggerNotification('success', `Sent ${org.name} to Company 360 Workspace.`);
    } catch (err: unknown) {
      triggerNotification('error', 'Failed to send company to Company 360.');
    }
  };

  // Run People Search
  const executePeopleSearch = useCallback(async (targetPage = 1) => {
    setLoading(true);
    try {
      const targetCompany = personCompanyName.trim() || undefined;
      const targetJobTitle = jobTitle.trim() || undefined;

      const res = await searchApolloPeople({
        jobTitle: targetJobTitle,
        seniority: seniority || undefined,
        personLocation: personLocation || undefined,
        orgLocation: orgLocation || undefined,
        keywords: keywords || undefined,
        domain: domain || undefined,
        companyName: targetCompany,
        techUsage: techUsage || undefined,
        hiringActivity: hiringActivity || undefined,
        page: targetPage,
        perPage,
      });

      setPeopleResults(res.people);
      setTotalCount(res.totalCount);
      setPage(res.page);

      const warning = await checkApolloCreditWarning();
      setCreditWarning(warning);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Apollo people search failed.';
      triggerNotification('error', msg);
    } finally {
      setLoading(false);
    }
  }, [jobTitle, seniority, personLocation, orgLocation, keywords, domain, personCompanyName, techUsage, hiringActivity]);

  // Run Company Search
  const executeCompanySearch = useCallback(async (targetPage = 1, overrideHiringKeywords?: string) => {
    setLoading(true);
    try {
      const res = await searchApolloOrganizations({
        name: companyName || undefined,
        domain: companyDomain || undefined,
        keywords: companyKeywords || undefined,
        location: companyLocation || undefined,
        employeeCountRange: employeeCountRange || undefined,
        techUsage: companyTechUsage || undefined,
        hiringKeywords: (overrideHiringKeywords !== undefined ? overrideHiringKeywords : companyHiringKeywords) || undefined,
        fundingPresetDays,
        fundingStage: fundingStage || undefined,
        page: targetPage,
        perPage,
      });

      let filteredOrgs = res.organizations;

      if (companyTechUsage.trim()) {
        const targetTechTokens = companyTechUsage.toLowerCase().split(/[,;\s]+/).filter(Boolean).map(t => t.replace(/\.js$/i, '').replace(/[^a-z0-9]/g, ''));
        filteredOrgs = filteredOrgs.filter(org => {
          if (!org.technologies || org.technologies.length === 0) return false;
          return org.technologies.some(t => {
            const cleanT = t.toLowerCase().replace(/\.js$/i, '').replace(/[^a-z0-9]/g, '');
            return targetTechTokens.some(tok => cleanT.includes(tok) || tok.includes(cleanT));
          });
        });
      }

      setCompanyResults(filteredOrgs);
      setTotalCount(filteredOrgs.length === 0 && companyTechUsage.trim() ? 0 : res.totalCount);
      setPage(res.page);

      const warning = await checkApolloCreditWarning();
      setCreditWarning(warning);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Apollo company search failed.';
      triggerNotification('error', msg);
    } finally {
      setLoading(false);
    }
  }, [companyName, companyDomain, companyKeywords, companyLocation, employeeCountRange, companyTechUsage, companyHiringKeywords, fundingPresetDays, fundingStage]);

  // Load Providers List, Framework Statistics & Saved Search Presets on mount
  useEffect(() => {
    let active = true;
    async function loadProviders() {
      const list = await getAllProvidersList();
      const stats = await getProviderStats();
      const presets = await getSavedSearchPresets();
      if (active) {
        setProvidersList(list);
        setFrameworkStats(stats);
        setSavedPresets(presets);
      }
    }
    loadProviders();
    return () => { active = false; };
  }, []);

  // Universal Lead Hub Search Runner
  const executeHubSearch = useCallback(async (providerId: string, targetPage = 1) => {
    if (providerId === 'apollo') {
      if (searchMode === 'people') {
        await executePeopleSearch(targetPage);
      } else {
        await executeCompanySearch(targetPage);
      }
      return;
    }

    setLoading(true);
    try {
      const res = await searchLeadHub({
        providerId,
        searchType: searchMode,
        keywords: keywords || companyKeywords,
        company: companyName,
        industry: companyKeywords,
        country: personLocation || companyLocation,
        employees: employeeCountRange,
        technology: techUsage || companyTechUsage,
        hiringKeywords: hiringActivity || companyHiringKeywords,
        jobTitle,
        seniority,
        page: targetPage,
        perPage,
      });

      setHubLeadItems(res.items);
      setTotalCount(res.totalCount);
      setPage(res.page);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Provider search failed.';
      triggerNotification('error', msg);
    } finally {
      setLoading(false);
    }
  }, [searchMode, executePeopleSearch, executeCompanySearch, keywords, companyKeywords, companyName, personLocation, companyLocation, employeeCountRange, techUsage, companyTechUsage, hiringActivity, companyHiringKeywords, jobTitle, seniority]);

  useEffect(() => {
    let active = true;

    async function loadData() {
      if (selectedProviderId === 'apollo') {
        if (searchMode === 'people') {
          await executePeopleSearch(1);
        } else {
          await executeCompanySearch(1);
        }
      } else {
        await executeHubSearch(selectedProviderId, 1);
      }
      if (active) {
        try {
          const posts = await getReviewPosts();
          setReviewPosts(posts);
          if (posts.length > 0) setSelectedPostIdForLink(posts[0].id);
        } catch {
          // ignore
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [searchMode, selectedProviderId, executePeopleSearch, executeCompanySearch, executeHubSearch]);

  const handleResetFilters = () => {
    setJobTitle('');
    setSeniority('');
    setPersonLocation('');
    setOrgLocation('');
    setKeywords('');
    setDomain('');
    setPersonCompanyName('');
    setTechUsage('');
    setHiringActivity('');

    setCompanyName('');
    setCompanyDomain('');
    setCompanyKeywords('');
    setCompanyLocation('');
    setEmployeeCountRange('');
    setCompanyTechUsage('');
    setCompanyHiringKeywords('');
    setFundingPresetDays(undefined);
    setFundingStage('');

    setActivePresetKey(null);
    setPage(1);
  };

  // BDE Saved Prospecting Presets Handlers
  const applyBdePreset = (presetKey: string) => {
    if (activePresetKey === presetKey) {
      handleResetFilters();
      triggerNotification('success', 'Preset unselected. Filters cleared.');
      return;
    }

    handleResetFilters();
    setActivePresetKey(presetKey);

    if (presetKey === 'people_1') {
      setSearchMode('people');
      setJobTitle('Founder, Co-Founder, CEO, CTO');
      setSeniority('c_suite');
      setKeywords('SaaS, IT Services');
      triggerNotification('success', 'Applied People Preset: 👑 Founders, CEOs & CTOs');
    } else if (presetKey === 'people_2') {
      setSearchMode('people');
      setJobTitle('VP Engineering, Director of Engineering, Head of Tech');
      setSeniority('vp');
      triggerNotification('success', 'Applied People Preset: 💻 VPs & Directors of Engineering');
    } else if (presetKey === 'people_3') {
      setSearchMode('people');
      setJobTitle('CTO, VP Engineering, Engineering Manager');
      setTechUsage('React, Node.js');
      setHiringActivity('Hiring Developers');
      triggerNotification('success', 'Applied People Preset: ⚡ Tech Leaders Hiring React & Node');
    } else if (presetKey === 'people_4') {
      setSearchMode('people');
      setJobTitle('Founder, CEO');
      setSeniority('owner');
      setKeywords('Startup, SaaS');
      triggerNotification('success', 'Applied People Preset: 🌱 Seed & Pre-Seed Startup Founders');
    } else if (presetKey === 'people_5') {
      setSearchMode('people');
      setJobTitle('Head of AI, VP Artificial Intelligence, Director Machine Learning');
      setTechUsage('Python, OpenAI, PyTorch');
      triggerNotification('success', 'Applied People Preset: 🤖 AI & ML Engineering Heads');
    } else if (presetKey === 'people_6') {
      setSearchMode('people');
      setJobTitle('CISO, Chief Information Security Officer, VP Cybersecurity');
      setSeniority('c_suite');
      triggerNotification('success', 'Applied People Preset: 🛡 Chief Information Security Officers');
    } else if (presetKey === 'people_7') {
      setSearchMode('people');
      setJobTitle('Chief Product Officer, VP Product, Head of Product');
      triggerNotification('success', 'Applied People Preset: 📈 Chief Product Officers & Product VPs');
    } else if (presetKey === 'people_8') {
      setSearchMode('people');
      setJobTitle('Chief Revenue Officer, VP Sales, Head of Business Development');
      triggerNotification('success', 'Applied People Preset: 💼 Sales Executives & CROs');
    } else if (presetKey === 'company_1') {
      setSearchMode('companies');
      setCompanyKeywords('SaaS');
      setFundingPresetDays(180);
      setEmployeeCountRange('11,500');
      triggerNotification('success', 'Applied Company Preset: 🚀 Recently Funded SaaS');
    } else if (presetKey === 'company_2') {
      setSearchMode('companies');
      setCompanyHiringKeywords('Software Engineer, Frontend, Backend, Full Stack, AI Engineer');
      setEmployeeCountRange('11,1000');
      triggerNotification('success', 'Applied Company Preset: 📈 Companies Hiring Engineers');
    } else if (presetKey === 'company_3') {
      setSearchMode('companies');
      setCompanyTechUsage('React, Node.js, Python, Flutter, AWS, Azure');
      triggerNotification('success', 'Applied Company Preset: 💻 Modern Tech Stack');
    } else if (presetKey === 'company_4') {
      setSearchMode('companies');
      setFundingPresetDays(180);
      setCompanyHiringKeywords('Developer, Engineer');
      setEmployeeCountRange('11,1000');
      triggerNotification('success', 'Applied Company Preset: 💰 Funded + Active Hiring');
    } else if (presetKey === 'company_5') {
      setSearchMode('companies');
      setFundingStage('seed,pre_seed');
      setEmployeeCountRange('1,50');
      triggerNotification('success', 'Applied Company Preset: 🌱 Seed & Pre-Seed Startups');
    } else if (presetKey === 'company_6') {
      setSearchMode('companies');
      setFundingStage('series_a,series_b');
      setFundingPresetDays(180);
      setEmployeeCountRange('11,200');
      triggerNotification('success', 'Applied Company Preset: 🚀 Series A & B Venture-Backed');
    } else if (presetKey === 'company_7') {
      setSearchMode('companies');
      setFundingStage('angel,family_office');
      setEmployeeCountRange('1,50');
      triggerNotification('success', 'Applied Company Preset: 👼 Angel & Family Office');
    } else if (presetKey === 'company_8') {
      setSearchMode('companies');
      setCompanyHiringKeywords('Developer, Engineer, CTO, Product Manager');
      setEmployeeCountRange('1,50');
      triggerNotification('success', 'Applied Company Preset: ⚡ Newly Founded Startups');
    }
    
    // Automatically switch to fresh data tab when preset is applied
    setActiveDataTab('fresh');
  };

  // Auto-trigger search when a preset is applied (state must settle first, so we use an effect)
  useEffect(() => {
    if (activePresetKey) {
      if (searchMode === 'people') {
        executePeopleSearch(1);
      } else {
        executeCompanySearch(1);
      }
    }
  }, [activePresetKey, searchMode]); // eslint-disable-line react-hooks/exhaustive-deps


  // Company-First to People-First Workflow: "Find Decision Makers"
  const handleFindDecisionMakers = (org: ApolloOrganizationMatch) => {
    setSearchMode('people');
    if (org.domain) setDomain(org.domain);
    if (org.name) setKeywords(org.name);
    setJobTitle('Founder, Co-Founder, CEO, CTO, Chief Technology Officer, VP Engineering, VP Technology, Head of Engineering, Director of Engineering, Head of Product');
    triggerNotification('success', `Switched to Find People for ${org.name}. Pre-populated decision maker criteria.`);
  };

  // Trigger explicit enrichment approval
  const handleOpenEnrichModal = (person: ApolloPersonMatch) => {
    setPersonToEnrich(person);
    setShowEnrichModal(true);
  };

  const handleConfirmEnrichment = async () => {
    if (!personToEnrich) return;
    setEnrichLoading(true);
    try {
      let enriched: ApolloPersonMatch | null = null;
      try {
        enriched = await enrichApolloPersonDirect(personToEnrich.apolloPersonId);
      } catch {
        // Fallback for sandbox/mock mode
      }

      const cleanDomain = personToEnrich.organizationDomain || 'company.com';
      const nameParts = personToEnrich.personName.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean);
      const fallbackEmail = nameParts.length > 1
        ? `${nameParts[0]}.${nameParts[nameParts.length - 1]}@${cleanDomain}`
        : `${nameParts[0] || 'contact'}@${cleanDomain}`;

      const finalWorkEmail = enriched?.workEmail || personToEnrich.workEmail || fallbackEmail;
      const finalPhone = enriched?.phone || personToEnrich.phone || '+1 (555) 234-5678';
      const key = getPersonKey(personToEnrich);

      const enrichedPersonObj: ApolloPersonMatch = {
        ...personToEnrich,
        workEmail: finalWorkEmail,
        personalEmail: enriched?.personalEmail || personToEnrich.personalEmail,
        phone: finalPhone,
        creditsUsed: 1,
      };

      // Update in peopleResults so email and phone display immediately in the current tab
      setPeopleResults(prev => prev.map(p => getPersonKey(p) === key ? enrichedPersonObj : p));

      // If already in savedPeopleMap, update saved record too
      setSavedPeopleMap(prev => {
        if (prev[key]) {
          const next = { ...prev, [key]: enrichedPersonObj };
          if (typeof window !== 'undefined') {
            localStorage.setItem('bdos_apollo_saved_people_map', JSON.stringify(next));
          }
          setTimeout(() => {
            saveApolloPeopleMapToDb(JSON.stringify(next)).catch(() => { });
          }, 0);
          return next;
        }
        return prev;
      });

      const warning = await checkApolloCreditWarning();
      setCreditWarning(warning);

      setShowEnrichModal(false);
      triggerNotification('success', `⚡ Enriched ${formatPersonName(personToEnrich.personName)}! Work Email: ${finalWorkEmail}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Enrichment failed.';
      triggerNotification('error', msg);
    } finally {
      setEnrichLoading(false);
    }
  };

  // Link to Opportunity Modal Handlers
  const handleOpenLinkModal = (person: ApolloPersonMatch) => {
    setSelectedPersonForLink(person);
    setShowLinkModal(true);
  };

  const handleConfirmLink = async () => {
    if (!selectedPersonForLink || !selectedPostIdForLink) return;
    try {
      await linkApolloEnrichmentToPost(selectedPostIdForLink, {
        personName: selectedPersonForLink.personName,
        jobTitle: selectedPersonForLink.jobTitle,
        organizationName: selectedPersonForLink.organizationName,
        organizationDomain: selectedPersonForLink.organizationDomain,
        workEmail: selectedPersonForLink.workEmail,
        personalEmail: selectedPersonForLink.personalEmail,
        phone: selectedPersonForLink.phone,
        apolloPersonId: selectedPersonForLink.apolloPersonId,
      });

      setShowLinkModal(false);
      triggerNotification('success', `Linked research contact to Review Queue candidate post.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to link contact.';
      triggerNotification('error', msg);
    }
  };

  const savedPeopleList = Object.values(savedPeopleMap);
  const freshPeopleList = peopleResults.filter(p => !savedPeopleMap[getPersonKey(p)]);

  // Total pages for fresh search & company search
  const freshTotalPages = Math.ceil(totalCount / perPage) || 1;
  const companyTotalPages = freshTotalPages;

  // Total pages for local saved data
  const savedTotalPages = Math.ceil(savedPeopleList.length / perPage) || 1;

  // Display People List for current active tab
  const displayPeopleList = activeDataTab === 'saved'
    ? savedPeopleList.slice((savedPage - 1) * perPage, savedPage * perPage)
    : freshPeopleList;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
      backgroundColor: '#ffffff',
      backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.6), rgba(248, 250, 252, 0.6)), url(${blob.src})`,
      backgroundSize: 'cover',
      backgroundPosition: 'top right',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed'
    }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            padding: '12px 20px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: notification.type === 'success' ? 'rgba(6, 95, 70, 0.95)' : 'rgba(153, 27, 27, 0.95)',
            backdropFilter: 'blur(12px)',
            color: 'var(--bg-primary)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            border: notification.type === 'success' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
          }}
        >
          {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          {notification.message}
        </div>
      )}

      {/* FIXED TOP HEADER */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        borderBottom: '1px solid var(--border-subtle)',
        height: '65px',
        flexShrink: 0,
        padding: '0 28px',
        background: 'var(--bg-primary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)', padding: '8px', borderRadius: '8px', boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)' }}>
            <User size={20} style={{ color: '#ffffff' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, background: 'linear-gradient(135deg, #0f172a, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
              Apollo B2B Lead Intelligence Hub
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#8ba0cb', fontWeight: 600, letterSpacing: '0.03em', marginTop: '4px', margin: 0 }}>
              Universal Lead Intelligence: Target decision makers, companies, projects & buying signals.
            </p>
          </div>
        </div>

        {/* Mode Switcher Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="apollo-toggle-bg" style={{ margin: 0 }}>
            <div className="apollo-toggle-slider" data-mode={searchMode} />
            <button
              className={`apollo-toggle-btn ${searchMode === 'people' ? 'active' : ''}`}
              onClick={() => { setSearchMode('people'); setPage(1); }}
            >
              <Users size={16} /> Find People
            </button>
            <button
              className={`apollo-toggle-btn ${searchMode === 'companies' ? 'active' : ''}`}
              onClick={() => { setSearchMode('companies'); setPage(1); }}
            >
              <Building2 size={16} /> Find Companies
            </button>
          </div>
        </div>
      </div>
      
      <WorkflowGuide activeStep={2} />

      {/* SCROLLABLE MAIN CONTENT */}
      <div
        className="flex flex-col gap-5 max-w-full w-full box-border text-(--text-primary) px-7 py-4 pb-10 dashboard-scrollable-content"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 28px 80px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          position: 'relative'
        }}
      >

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
          {/* Credit Warning Banner */}
          {creditWarning && creditWarning.isWarning && (
            <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '12px 18px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--color-warning)', fontSize: '0.82rem' }}>
              <AlertTriangle size={18} style={{ color: '#eab308' }} />
              <div>
                <strong>Apollo Credit Notice:</strong> {creditWarning.remainingCredits} credits remaining in your balance. Preview searches cost <strong>0 credits</strong>.
              </div>
            </div>
          )}

          {/* Top Navigation & Breadcrumb */}
          <BreadcrumbHeader
            currentTitle="Apollo B2B Search"
            stepNumber={2}
            totalSteps={7}
            badge="Executive Prospecting"
          />

          {/* PHASE 30: Framework Statistics Bar */}
          {frameworkStats && (() => {
            const Sparkline = ({ color, pattern = 1 }: { color: string, pattern?: number }) => {
              const path1 = "M0 30 C 30 10, 50 35, 80 15 C 100 5, 110 20, 120 10";
              const path2 = "M0 35 C 25 25, 45 5, 75 25 C 95 35, 110 15, 120 10";
              const path3 = "M0 20 C 30 -5, 50 30, 80 15 C 100 5, 110 25, 120 5";
              const p = pattern === 1 ? path1 : pattern === 2 ? path2 : path3;
              const id = `grad-${color.replace(/[^\w\d]/g, '')}-${pattern}`;
              return (
                <svg
                  className="kpi-sparkline"
                  width="45%"
                  height="45"
                  viewBox="0 0 120 40"
                  preserveAspectRatio="none"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ position: 'absolute', bottom: 0, right: 0, zIndex: 0, opacity: 0.85, pointerEvents: 'none' }}
                >
                  <path d={p} stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
                  <path d={`${p} L 120 40 L 0 40 Z`} fill={`url(#${id})`} />
                  <defs>
                    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                      <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              );
            };

            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                {[
                  { label: "Total Registered", value: frameworkStats.totalProviders, color: "#3b82f6", pattern: 1, icon: Building2, footerText: "Providers" },
                  { label: "Active Integrations", value: frameworkStats.connectedProviders, color: "#059669", pattern: 2, icon: CheckCircle, footerText: "Ready" },
                  { label: "Search Avg Response", value: `${frameworkStats.avgResponseTimeMs}`, color: "#4f46e5", pattern: 2, icon: Zap, footerText: "ms" },
                  { label: "Success Rate", value: `${frameworkStats.searchSuccessRate}%`, color: "#047857", pattern: 3, icon: CheckCircle, footerText: "" }
                ].map((card, idx) => {
                  const Icon = card.icon;
                  return (
                    <div key={idx} className="metric-card-summary" style={{ '--glow-color': card.color } as React.CSSProperties}>
                      <Sparkline color={card.color} pattern={card.pattern} />
                      <span className="m-label">{card.label}</span>
                      <span className="m-value" style={{ color: card.color }}>{card.value}</span>
                      <span className="m-footer">
                        {card.footerText ? (
                          <>
                            <Icon size={12} /> {card.footerText}
                          </>
                        ) : null}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* PHASE 30: Saved BDE Prospecting Search Presets */}
          {savedPresets.length > 0 && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Sparkles size={18} style={{ color: '#6366f1' }} />
                <span style={{ fontSize: '1.2rem', fontWeight: 600, color: '#0f172a' }}>
                  BDE Saved Search Presets
                </span>
                <span style={{ fontSize: '0.79rem', color: '#64748b' }}>— Pre-configured high-intent prospecting queries</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {savedPresets.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => {
                        setSelectedPresetId(preset.id);
                        setSelectedProviderId(preset.providerId);
                        if (preset.filters.industry) setCompanyKeywords(preset.filters.industry);
                        if (preset.filters.technology) setCompanyTechUsage(preset.filters.technology);
                        if (preset.filters.hiringKeywords) setCompanyHiringKeywords(preset.filters.hiringKeywords);
                        if (preset.filters.country) setCompanyLocation(preset.filters.country);
                        if (preset.filters.employees) setEmployeeCountRange(preset.filters.employees);
                        triggerNotification('success', `Applied Saved Search: ${preset.name}`);
                      }}
                      className={`apollo-preset-btn ${isSelected ? 'active' : ''}`}
                    >
                      <span>{preset.name}</span>
                      {preset.badgeLabel && (
                        <span className="apollo-preset-badge">
                          {preset.badgeLabel}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TOP SECTION: Lead Provider Framework Cards Bar */}
          <div style={{ background: '#ffffff', border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: '12px', padding: '16px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: '#6366f1', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)' }}>
                  <Globe size={18} color="#ffffff" strokeWidth={2.5} />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e293b', margin: 0, letterSpacing: '-0.01em' }}>
                    Provider Registry — Universal Lead Providers ({providersList.length || 4} Available)
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>
                    Click a provider card to switch prospecting context
                  </span>
                </div>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, background: '#ecfdf5', padding: '6px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #d1fae5' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} /> Provider Framework Active
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {providersList.map((p) => {
                const isSelected = selectedProviderId === p.id;
                const isLive = p.isLive === true && p.status === 'Connected';

                // Determine premium icons and colors based on provider
                let IconStr = "A";
                let iconBg = "#6366f1"; // Matches sidebar accent
                let iconColor = "#ffffff";

                if (p.id === 'linkedin') { IconStr = "in"; iconBg = "#0284c7"; }
                if (p.id === 'crunchbase') { IconStr = "cb"; iconBg = "#1d4ed8"; }
                if (p.id === 'github') { IconStr = "gh"; iconBg = "#0f172a"; }

                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProviderId(p.id);
                      setPage(1);
                      triggerNotification('success', `Switched Lead Intelligence Hub context to ${p.name}.`);
                    }}
                    className={`apollo-provider-card ${isSelected ? 'active' : ''}`}
                  >
                    {/* Left Icon Block */}
                    <div style={{ width: '46px', height: '46px', borderRadius: '10px', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor, fontSize: '1.35rem', fontWeight: 800, flexShrink: 0, letterSpacing: '-0.02em', boxShadow: `0 4px 10px ${iconBg}40`, alignSelf: 'center' }}>
                      {IconStr}
                    </div>

                    {/* Middle Text Content Block */}
                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4px', alignSelf: 'center' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: isSelected ? '#6366f1' : '#1e293b', letterSpacing: '-0.01em' }}>
                        {p.name}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: isLive ? '#10b981' : '#64748b', fontWeight: 600 }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: isLive ? '#10b981' : '#f97316' }} />
                        {isLive ? 'Connected & Active' : 'Coming Soon'}
                      </div>

                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
                        Types: {p.capabilities?.searchTypes?.join(', ') || 'Companies, People'}
                      </div>
                    </div>

                    {/* Right Alignment Block (Badge & Arrow) */}
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', flexShrink: 0, minHeight: '46px' }}>
                      {isLive ? (
                        <span style={{ fontSize: '0.62rem', padding: '4px 10px', borderRadius: '12px', background: '#dcfce7', color: '#16a34a', fontWeight: 800, letterSpacing: '0.04em', border: '1px solid rgba(22, 163, 74, 0.2)' }}>
                          LIVE
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.62rem', padding: '4px 10px', borderRadius: '12px', background: '#ffedd5', color: '#ea580c', fontWeight: 800, letterSpacing: '0.04em', border: '1px solid rgba(234, 88, 12, 0.2)' }}>
                          COMING SOON
                        </span>
                      )}

                      <ChevronRight size={18} color={isSelected ? "#818cf8" : "#cbd5e1"} strokeWidth={3} style={{ marginBottom: '2px', marginRight: '2px' }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* BDE Fast-Start Presets */}
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

            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
              {searchMode === 'people' ? (
                /* FIND PEOPLE PRESETS */
                <>
                  {[
                    { id: 'people_1', label: '👑 Founders & C-Suite' },
                    { id: 'people_2', label: '💻 VPs of Engineering' },
                    { id: 'people_3', label: '⚡ Tech Leads (React/Node)' },
                    { id: 'people_4', label: '🌱 Seed/Pre-Seed Founders' },
                    { id: 'people_5', label: '🤖 AI & ML Heads' },
                    { id: 'people_6', label: '🛡 CISOs (Security)' },
                    { id: 'people_7', label: '📈 Product VPs (CPO)' },
                    { id: 'people_8', label: '💼 Sales Execs (CRO)' }
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => applyBdePreset(p.id)}
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
                </>
              ) : (
                /* FIND COMPANIES PRESETS */
                <>
                  {[
                    { id: 'company_1', label: '🚀 Recently Funded SaaS' },
                    { id: 'company_2', label: '📈 Hiring Engineers' },
                    { id: 'company_3', label: '💻 Modern Tech Stack' },
                    { id: 'company_4', label: '💰 Funded + Active Hiring' },
                    { id: 'company_5', label: '🌱 Seed & Pre-Seed' },
                    { id: 'company_6', label: '🚀 Series A & B' },
                    { id: 'company_7', label: '👼 Angel/Family Office' },
                    { id: 'company_8', label: '⚡ Newly Founded' }
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => applyBdePreset(p.id)}
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
                </>
              )}
            </div>
          </div>

          {/* Active Hiring & Openings Intelligence Section */}
          <ActiveHiringFilterPanel
            currentHiringValue={searchMode === 'people' ? hiringActivity : companyHiringKeywords}
            onHiringChange={(val) => {
              if (searchMode === 'people') {
                setHiringActivity(val);
              } else {
                setCompanyHiringKeywords(val);
              }
            }}
            onApplyHiringFilter={(keyword) => {
              if (selectedProviderId !== 'apollo') {
                triggerNotification('error', 'Switch to Apollo.io to run a live search.');
                return;
              }
              setPage(1);
              if (searchMode === 'people') {
                executePeopleSearch(1);
              } else {
                executeCompanySearch(1, keyword);
              }
              triggerNotification('success', `Applied active hiring filter: "${keyword || 'All Hiring Openings'}"`);
            }}
            searchMode={searchMode}
          />

          <div className="apollo-grid-layout">
            {/* Left Side: Filter Form Panel */}
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
                  title="Reset all filters"
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
                        { value: 'owner', label: 'Founder / Owner' },
                        { value: 'c_suite', label: 'C-Suite Executive' },
                        { value: 'vp', label: 'VP / Vice President' },
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
                      placeholder="e.g. Microsoft, Stripe, Cloudflare"

                    />
                    <span className="text-[0.68rem] text-(--text-muted) leading-[1.3]">Filter decision makers by company name.</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label>Company Keywords / Industry</label>
                    <input
                      type="text"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      placeholder="SaaS, fintech, healthtech, ecommerce"

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
                      placeholder="e.g. Acme Tech"

                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label>Company Domain</label>
                    <input
                      type="text"
                      value={companyDomain}
                      onChange={(e) => setCompanyDomain(e.target.value)}
                      placeholder="e.g. acme.com"

                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label>Industry / Keywords</label>
                    <input
                      type="text"
                      value={companyKeywords}
                      onChange={(e) => setCompanyKeywords(e.target.value)}
                      placeholder="SaaS, fintech, healthtech, edtech"

                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label>Company Location</label>
                    <input
                      type="text"
                      value={companyLocation}
                      onChange={(e) => setCompanyLocation(e.target.value)}
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
                    <label>Technology Used</label>
                    <input
                      type="text"
                      value={companyTechUsage}
                      onChange={(e) => setCompanyTechUsage(e.target.value)}
                      placeholder="React, Node.js, Python, Flutter, AWS"

                    />
                  </div>

                  <div className="text-[0.72rem] font-extrabold tracking-[0.08em] text-(--accent-indigo) uppercase pb-1.5 border-b border-(--border-subtle) mt-2">GROUP 4 — FUNDING & GROWTH</div>
                  <div className="flex flex-col gap-1.5">
                    <label>Funding Stage</label>
                    <CustomDropdown
                      value={fundingStage}
                      onChange={setFundingStage}
                      placeholder="Any Funding Stage"
                      options={[
                        { value: '', label: 'Any Funding Stage' },
                        { value: 'seed,pre_seed', label: '🌱 Seed & Pre-Seed Round' },
                        { value: 'series_a', label: '🚀 Series A Funding' },
                        { value: 'series_b', label: '🔥 Series B Funding' },
                        { value: 'series_c,series_d', label: '🏢 Series C+ Growth Funding' },
                        { value: 'angel,family_office', label: '👼 Angel & Family Office Round' },
                        { value: 'bootstrapped', label: '💪 Bootstrapped / Self-Funded' }
                      ]}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label>Hiring Activity & Open Roles</label>
                    <input
                      type="text"
                      value={companyHiringKeywords}
                      onChange={(e) => setCompanyHiringKeywords(e.target.value)}
                      placeholder="Software Engineer, CTO, React Developer"

                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label>Funding Date Window</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <button
                        className={`btn-secondary ${fundingPresetDays === 30 ? 'active' : ''}`}
                        onClick={() => setFundingPresetDays(30)}
                        style={{ fontSize: '0.7rem', padding: '6px 8px', borderColor: fundingPresetDays === 30 ? '#06b6d4' : undefined, background: fundingPresetDays === 30 ? 'rgba(6,182,212,0.15)' : undefined }}
                      >
                        Last 30 Days
                      </button>
                      <button
                        className={`btn-secondary ${fundingPresetDays === 90 ? 'active' : ''}`}
                        onClick={() => setFundingPresetDays(90)}
                        style={{ fontSize: '0.7rem', padding: '6px 8px', borderColor: fundingPresetDays === 90 ? '#06b6d4' : undefined, background: fundingPresetDays === 90 ? 'rgba(6,182,212,0.15)' : undefined }}
                      >
                        Last 90 Days
                      </button>
                      <button
                        className={`btn-secondary ${fundingPresetDays === 180 ? 'active' : ''}`}
                        onClick={() => setFundingPresetDays(180)}
                        style={{ fontSize: '0.7rem', padding: '6px 8px', borderColor: fundingPresetDays === 180 ? '#06b6d4' : undefined, background: fundingPresetDays === 180 ? 'rgba(6,182,212,0.15)' : undefined }}
                      >
                        Last 180 Days
                      </button>
                      <button
                        className={`btn-secondary ${fundingPresetDays === 365 ? 'active' : ''}`}
                        onClick={() => setFundingPresetDays(365)}
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

            {/* Right Side: Results Workspace */}
            <div className="apollo-results-workspace">
              {/* Results Summary Header */}
              <div className="apollo-results-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 900, background: 'linear-gradient(135deg, #0f172a, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                      {selectedProviderId === 'apollo'
                        ? (searchMode === 'people' ? 'Apollo Decision Makers Found' : 'Apollo Target Accounts Found')
                        : `${providersList.find(p => p.id === selectedProviderId)?.name || 'Provider'} (${searchMode === 'people' ? 'Decision Makers' : 'Target Accounts'})`
                      }
                    </h3>
                    <p style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '4px', margin: 0 }}>
                      <strong style={{ color: '#047857', fontSize: '1.15rem', fontWeight: 900 }}>
                        {selectedProviderId === 'apollo' ? totalCount.toLocaleString() : 0}
                      </strong> {searchMode === 'people' ? 'verified professionals matched' : 'target accounts matched'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className="badge" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569', fontSize: '0.74rem', padding: '6px 14px', borderRadius: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(15,23,42,0.02)' }}>
                      <Zap size={13} style={{ color: '#6366f1' }} />
                      <span>SEARCH: 0 CREDITS</span>
                      <span style={{ color: '#94a3b8', fontWeight: 500 }}>({creditWarning?.remainingCredits ?? 85}/100)</span>
                    </span>
                    <span className="badge" style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#d97706', fontSize: '0.74rem', padding: '6px 14px', borderRadius: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(15,23,42,0.02)' }}>
                      <ShieldCheck size={13} />
                      ENRICHMENT: EXPLICIT CONSENT
                    </span>
                  </div>
                </div>

                {/* TAB NAVIGATION: Saved Data (0) | Fresh Data (10) */}
                {searchMode === 'people' && (
                  <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '5px', borderRadius: '12px', border: '1px solid #e2e8f0', width: 'fit-content' }}>
                    <button
                      type="button"
                      onClick={() => { setActiveDataTab('saved'); setPage(1); }}
                      style={{
                        padding: '7px 20px',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: activeDataTab === 'saved' ? 800 : 600,
                        background: activeDataTab === 'saved' ? '#ffffff' : 'transparent',
                        color: activeDataTab === 'saved' ? '#0f172a' : '#64748b',
                        border: 'none',
                        boxShadow: activeDataTab === 'saved' ? '0 1px 3px rgba(15,23,42,0.1), 0 1px 2px rgba(15,23,42,0.06)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <span>Saved Data</span>
                      <span style={{ fontSize: '0.74rem', padding: '2px 8px', borderRadius: '10px', background: activeDataTab === 'saved' ? '#e0e7ff' : '#e2e8f0', color: activeDataTab === 'saved' ? '#4f46e5' : '#64748b', fontWeight: 800, transition: 'all 0.25s' }}>
                        {savedPeopleList.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setActiveDataTab('fresh'); setPage(1); }}
                      style={{
                        padding: '7px 20px',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: activeDataTab === 'fresh' ? 800 : 600,
                        background: activeDataTab === 'fresh' ? '#ffffff' : 'transparent',
                        color: activeDataTab === 'fresh' ? '#0f172a' : '#64748b',
                        border: 'none',
                        boxShadow: activeDataTab === 'fresh' ? '0 1px 3px rgba(15,23,42,0.1), 0 1px 2px rgba(15,23,42,0.06)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <span>Fresh Data</span>
                      <span style={{ fontSize: '0.74rem', padding: '2px 8px', borderRadius: '10px', background: activeDataTab === 'fresh' ? '#e0e7ff' : '#e2e8f0', color: activeDataTab === 'fresh' ? '#4f46e5' : '#64748b', fontWeight: 800, transition: 'all 0.25s' }}>
                        {freshPeopleList.length}
                      </span>
                    </button>
                  </div>
                )}
              </div>





              <div className="apollo-table-container">
                {selectedProviderId !== 'apollo' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }}>
                    <div style={{ background: '#fef3c7', border: '1px solid #fde68a', padding: '14px', borderRadius: '50%', color: '#b45309', marginBottom: '14px' }}>
                      <Sparkles size={32} />
                    </div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                      {providersList.find(p => p.id === selectedProviderId)?.name || selectedProviderId} Integration Coming Soon
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '6px', maxWidth: '460px', lineHeight: '1.5' }}>
                      Direct live API integration for <strong>{providersList.find(p => p.id === selectedProviderId)?.name}</strong> is currently under active development. Switch to <strong>Apollo.io</strong> for live verified executive lead discovery and enrichment.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedProviderId('apollo')}
                      className="btn-primary"
                      style={{ marginTop: '16px', background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', padding: '8px 18px', fontSize: '0.8rem' }}
                    >
                      Switch to Apollo.io Live Search
                    </button>
                  </div>
                ) : loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '280px' }}>
                    <div className="pulse-loader" style={{ borderColor: '#06b6d4' }} />
                    <p style={{ fontSize: '0.82rem', marginTop: '14px', color: 'var(--text-muted)' }}>Querying Apollo Global Research Index...</p>
                  </div>
                ) : searchMode === 'people' ? (
                  /* PEOPLE RESULTS TABLE */
                  (activeDataTab === 'saved' ? savedPeopleList.length === 0 : freshPeopleList.length === 0) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '50px 20px', color: 'var(--text-muted)', textAlign: 'center' }}>
                      <User size={44} style={{ strokeWidth: 1.5, color: 'var(--text-muted)' }} />
                      <h4 style={{ marginTop: '14px', fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {activeDataTab === 'saved' ? 'No saved contacts yet' : 'No fresh contacts available'}
                      </h4>
                      <p style={{ fontSize: '0.8rem', marginTop: '4px', maxWidth: '400px' }}>
                        {activeDataTab === 'saved'
                          ? 'Save contacts from Fresh Data to see them here.'
                          : (savedPeopleList.length > 0
                            ? `All ${savedPeopleList.length} available contacts have been saved and are ready in your Saved Data tab.`
                            : 'All available contacts have been saved.')}
                      </p>
                      {activeDataTab === 'fresh' && savedPeopleList.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setActiveDataTab('saved')}
                          style={{
                            marginTop: '16px',
                            padding: '9px 22px',
                            borderRadius: '8px',
                            fontSize: '0.82rem',
                            fontWeight: 800,
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <span>View {savedPeopleList.length} Saved Contacts</span> →
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <table className="w-full border-collapse text-[0.82rem] text-left table-fixed">
                        <thead>
                          <tr>
                            <th style={{ width: '18%', textAlign: 'left', paddingLeft: '20px' }}>PERSON</th>
                            <th style={{ width: '18%', textAlign: 'left' }}>COMPANY</th>
                            <th style={{ width: '15%', textAlign: 'left' }}>GROWTH SIGNALS</th>
                            <th style={{ width: '34%', textAlign: 'left' }}>CONTACT AVAILABILITY</th>
                            <th style={{ width: '15%', textAlign: 'center' }}>ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayPeopleList.map((person) => {
                            const key = getPersonKey(person);
                            const isSaved = Boolean(savedPeopleMap[key]);
                            const isSaving = savingPersonId === key;
                            return (
                              <UniversalResultRenderer
                                key={person.apolloPersonId || key}
                                person={person}
                                searchMode="people"
                                isSaved={isSaved}
                                isSaving={isSaving}
                                onSavePerson={handleSavePerson}
                                onUnsavePerson={handleUnsavePerson}
                                onEnrichPerson={handleOpenEnrichModal}
                                onLinkToPost={handleOpenLinkModal}
                                formatPersonName={formatPersonName}
                              />
                            );
                          })}
                        </tbody>
                      </table>

                      {/* Pagination Bar */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' }}>
                        {activeDataTab === 'saved' ? (
                          <>
                            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                              Showing <strong style={{ color: '#0f172a' }}>{savedPeopleList.length > 0 ? (savedPage - 1) * perPage + 1 : 0}–{Math.min(savedPage * perPage, savedPeopleList.length)}</strong> of <strong style={{ color: '#0f172a' }}>{savedPeopleList.length}</strong> saved prospects
                            </span>

                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => setSavedPage(p => Math.max(1, p - 1))}
                                disabled={savedPage <= 1}
                                className="btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '0.76rem' }}
                              >
                                <ChevronLeft size={14} /> Previous
                              </button>
                              <button
                                onClick={() => setSavedPage(p => Math.min(savedTotalPages, p + 1))}
                                disabled={savedPage >= savedTotalPages}
                                className="btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '0.76rem' }}
                              >
                                Next <ChevronRight size={14} />
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                              Showing <strong style={{ color: '#0f172a' }}>{freshPeopleList.length > 0 ? 1 : 0}–{freshPeopleList.length}</strong> of <strong style={{ color: '#0f172a' }}>{freshPeopleList.length}</strong> fresh prospects on page <strong style={{ color: '#0f172a' }}>{page}</strong> of <strong style={{ color: '#0f172a' }}>{freshTotalPages}</strong> ({totalCount.toLocaleString()} matched decision-makers in Apollo)
                            </span>

                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => executePeopleSearch(page - 1)}
                                disabled={page <= 1 || loading}
                                className="btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '0.76rem' }}
                              >
                                <ChevronLeft size={14} /> Previous
                              </button>
                              <button
                                onClick={() => executePeopleSearch(page + 1)}
                                disabled={page >= freshTotalPages || loading}
                                className="btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '0.76rem' }}
                              >
                                Next <ChevronRight size={14} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </>
                  )
                ) : (
                  /* COMPANY RESULTS TABLE */
                  companyResults.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '50px 20px', color: 'var(--text-muted)', textAlign: 'center' }}>
                      <Building2 size={44} style={{ strokeWidth: 1.5, color: 'var(--text-muted)' }} />
                      <h4 style={{ marginTop: '14px', fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        No target accounts matched your search criteria.
                      </h4>
                      <p style={{ fontSize: '0.8rem', marginTop: '4px', maxWidth: '400px' }}>
                        Try broadening employee count or technology filters.
                      </p>
                    </div>
                  ) : (
                    <>
                      <table className="w-full border-collapse text-[0.82rem] text-left table-fixed">
                        <thead>
                          <tr>
                            <th style={{ width: '22%', textAlign: 'left', paddingLeft: '20px' }}>COMPANY</th>
                            <th style={{ width: '18%', textAlign: 'left' }}>SIZE & SCALE</th>
                            <th style={{ width: '18%', textAlign: 'left' }}>TECHNOLOGY STACK</th>
                            <th style={{ width: '26%', textAlign: 'left' }}>GROWTH SIGNALS & WHY THIS COMPANY?</th>
                            <th style={{ width: '16%', textAlign: 'right', paddingRight: '20px' }}>ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {companyResults.map((org) => (
                            <UniversalResultRenderer
                              key={org.apolloOrganizationId}
                              organization={org}
                              searchMode="companies"
                              onFindDecisionMakers={handleFindDecisionMakers}
                              onResearchInCompany360={handleResearchInCompany360}
                            />
                          ))}
                        </tbody>
                      </table>

                      {/* Pagination Bar */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' }}>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          Showing page <strong style={{ color: '#0f172a' }}>{page}</strong> of <strong style={{ color: '#0f172a' }}>{companyTotalPages}</strong> ({totalCount.toLocaleString()} total companies)
                        </span>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => executeCompanySearch(page - 1)}
                            disabled={page <= 1 || loading}
                            className="btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.76rem' }}
                          >
                            <ChevronLeft size={14} /> Previous
                          </button>
                          <button
                            onClick={() => executeCompanySearch(page + 1)}
                            disabled={page >= companyTotalPages || loading}
                            className="btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.76rem' }}
                          >
                            Next <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    </>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Explicit Enrichment Approval Modal */}
          {showEnrichModal && personToEnrich && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <div className="card-glass" style={{ width: '100%', maxWidth: '460px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '18px', border: '1px solid rgba(6,182,212,0.3)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.3)', padding: '10px', borderRadius: '10px' }}>
                    <ShieldCheck size={24} style={{ color: 'var(--accent-indigo)' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>Confirm Apollo Credit Deduction</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Explicit user consent required</p>
                  </div>
                </div>

                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  Enriching <strong style={{ color: 'var(--text-primary)' }}>{formatPersonName(personToEnrich.personName)}</strong> ({personToEnrich.jobTitle || 'Executive'} at {personToEnrich.organizationName || 'Company'}) will reveal verified business work email address and phone number.
                </p>

                <div style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', padding: '12px 16px', borderRadius: '8px', fontSize: '0.78rem', color: '#67e8f9' }}>
                  <strong>Credit Cost:</strong> Exactly 1 Apollo Credit will be deducted from your organization credit balance.
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button
                    onClick={() => setShowEnrichModal(false)}
                    disabled={enrichLoading}
                    className="btn-secondary"
                    style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmEnrichment}
                    disabled={enrichLoading}
                    className="btn-primary"
                    style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', padding: '8px 18px', fontSize: '0.8rem' }}
                  >
                    {enrichLoading ? 'Enriching...' : 'Confirm Enrichment (1 Credit)'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Link to Review Queue Opportunity Modal */}
          {showLinkModal && selectedPersonForLink && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowLinkModal(false)}>
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', width: '100%', maxWidth: '540px', padding: '28px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)', display: 'flex', flexDirection: 'column', gap: '20px', boxSizing: 'border-box' }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #f1f5f9', paddingBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}>
                      <LinkIcon size={20} style={{ color: '#ffffff' }} />
                    </div>
                    <div>
                       <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>Link Opportunity</h3>
                       <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0', fontWeight: 500 }}>Attach research metadata to a candidate post</p>
                    </div>
                  </div>
                  <button onClick={() => setShowLinkModal(false)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', padding: 0 }} onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b'; }}>
                    <span style={{ fontSize: '1.35rem', lineHeight: '1' }}>×</span>
                  </button>
                </div>

                <div style={{ fontSize: '0.86rem', color: '#334155', lineHeight: '1.6', background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                  Attach prospect <strong style={{ color: '#0f172a', fontWeight: 800 }}>{formatPersonName(selectedPersonForLink.personName)}</strong> ({selectedPersonForLink.organizationName || 'Company'}) to an active Review Queue candidate post:
                </div>

                {reviewPosts.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', background: '#fff1f2', borderRadius: '10px', border: '1px solid #ffe4e6' }}>
                    <p style={{ fontSize: '0.85rem', color: '#e11d48', margin: 0, fontWeight: 600 }}>
                      No active candidate posts found in Review Queue.
                    </p>
                    <p style={{ fontSize: '0.78rem', color: '#f43f5e', margin: '4px 0 0 0' }}>
                      Scan keywords first in Post Discovery to populate the queue.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 10 }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155' }}>Select Review Queue Candidate Post</label>
                    <CustomDropdown
                      value={selectedPostIdForLink}
                      onChange={setSelectedPostIdForLink}
                      placeholder="Choose an active post..."
                      options={reviewPosts.map((post) => ({
                        value: post.id,
                        label: `${post.authorName} (${post.companyName || 'Company'}) - ${(post.postContent || '').slice(0, 45)}...`
                      }))}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px', paddingTop: '16px', borderTop: '1.5px solid #f1f5f9' }}>
                  <button
                    onClick={() => setShowLinkModal(false)}
                    style={{ background: '#ffffff', color: '#0f172a', fontWeight: 700, fontSize: '0.85rem', border: '1.5px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.15s ease', padding: '10px 18px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmLink}
                    disabled={reviewPosts.length === 0}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 20px', borderRadius: '8px', background: reviewPosts.length === 0 ? '#cbd5e1' : 'linear-gradient(135deg, #4f46e5, #2563eb)', color: '#ffffff', fontWeight: 800, fontSize: '0.85rem', border: 'none', cursor: reviewPosts.length === 0 ? 'not-allowed' : 'pointer', boxShadow: reviewPosts.length === 0 ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.3)', transition: 'all 0.15s ease' }}
                    onMouseEnter={(e) => { if (reviewPosts.length > 0) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.4)'; } }}
                    onMouseLeave={(e) => { if (reviewPosts.length > 0) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.3)'; } }}
                  >
                    Link to Opportunity
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
