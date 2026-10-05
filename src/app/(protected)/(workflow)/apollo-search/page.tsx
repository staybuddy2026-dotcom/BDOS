'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Link as LinkIcon,
  Loader2,
  Building2,
  Users,
  Zap,
  Sparkles,
  UserPlus,
  Download
} from 'lucide-react';
import {
  searchApolloPeople,
  searchApolloOrganizations,
  linkApolloEnrichmentToPost,
  checkApolloCreditWarning,
  enrichApolloPersonDirect,
} from '@/features/apollo/actions';
import { addToShortlistAction, getSavedPeopleAction, savePersonAction, unsavePersonAction } from '@/features/prospecting/actions';
import { importBrowserListsOnce } from '@/features/prospecting/browserImport';
import '@/styles/dashboard.css';
import { addApolloCompanyToCrmAction, addApolloPeopleToCrmAction, lookupCrmStatusAction } from '@/features/crm/actions';
import type { CrmMatch } from '@/features/crm/types';
import { getReviewPosts, ReviewPostData } from '@/features/review/actions';
import type { ApolloPersonMatch, ApolloOrganizationMatch } from '@/features/apollo/provider';
import {
  getAllProvidersList,
  searchLeadHub,
  getProviderStats,
  getSavedSearchPresets,
  ProviderCardData,
  FrameworkStats
} from '@/features/providers/actions';
import { LeadItem, SavedSearchPreset } from '@/features/providers/types';
import { DiscoveryLeadItem } from '@/features/discovery/types';
import { ActiveHiringFilterPanel } from '@/components/apollo/ActiveHiringFilterPanel';
import { ApolloSearchFilters } from '@/components/apollo/ApolloSearchFilters';
import { ProviderRegistryPanel } from '@/components/apollo/ProviderRegistryPanel';
import { SavedSearchPresetsPanel } from '@/components/apollo/SavedSearchPresetsPanel';
import { BdeFastStartPresets, SearchPreset } from '@/components/apollo/BdeFastStartPresets';
import { UniversalResultRenderer } from '@/components/UniversalResultRenderer';
import { BreadcrumbHeader } from '@/components/navigation/BreadcrumbHeader';
import { WorkflowGuide } from '@/components/WorkflowGuide';
import { PageShell, StatTile, Modal, useToast } from '@/components/ui';
import s from '@/components/ui/ui.module.css';

// Helper to format Apollo masked names cleanly (e.g., "Mike Br***m" -> "Mike B.")
function formatPersonName(rawName: string): string {
  if (!rawName) return 'Executive Lead';
  return rawName.replace(/(\b[A-Za-z]+)\s+([A-Za-z])[a-zA-Z]*\*\*\*[a-zA-Z]*/g, '$1 $2.');
}

const companyKey = (org: ApolloOrganizationMatch) => (org.domain || org.apolloOrganizationId || org.name).toLowerCase().trim();

// Downloads the given contacts as a CSV file (opens cleanly in Excel and Google Sheets).
function downloadPeopleCsv(people: ApolloPersonMatch[]) {
  const cell = (value?: string | number) => {
    const text = value == null ? '' : String(value);
    // Excel treats cells starting with = + - @ as formulas; a leading quote keeps them as text.
    const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const header = ['Name', 'Job title', 'Company', 'Website', 'Industry', 'Work email', 'Personal email', 'Phone', 'LinkedIn', 'Location'];
  const rows = people.map((p) => [formatPersonName(p.personName), p.jobTitle, p.organizationName, p.organizationDomain, p.organizationIndustry, p.workEmail, p.personalEmail, p.phone, p.linkedinUrl, p.location].map(cell).join(','));
  const blob = new Blob([`\uFEFF${[header.join(','), ...rows].join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `apollo-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ApolloSearchPage() {
  const router = useRouter();

  // Mode Switcher: 'people' | 'companies'
  const { toast, notify } = useToast();
  const triggerNotification = useCallback((type: 'success' | 'error', message: string) => notify(message, type === 'error'), [notify]);

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
  const [autoSearchTrigger, setAutoSearchTrigger] = useState(0);

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
  const [creditWarning, setCreditWarning] = useState<{ isWarning: boolean; remainingCredits: number; threshold: number; message?: string } | null>(null);
  const [apolloError, setApolloError] = useState<string | null>(null);

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

  // The signed-in person's saved contacts, kept in the database (features/prospecting).
  const [savedPeopleMap, setSavedPeopleMap] = useState<Record<string, ApolloPersonMatch>>({});

  // On mount: read search filters from the URL, then load saved contacts.
  useEffect(() => {
    let isMounted = true;

    let hasSearchParams = false;

    if (typeof window !== 'undefined') {
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
      // Run one search once the URL filters above have been applied to state.
      if (hasSearchParams) setAutoSearchTrigger((n) => n + 1);
    }

    // Lists this browser kept before they moved to the database are sent up once first.
    importBrowserListsOnce()
      .then(() => getSavedPeopleAction())
      .then((saved) => {
        if (!isMounted || !Object.keys(saved).length) return;
        setSavedPeopleMap((prev) => ({ ...saved, ...prev }));
        if (!hasSearchParams) setActiveDataTab('saved');
      })
      .catch(() => { /* the Saved tab stays empty; saving still works */ });
    return () => { isMounted = false; };
  }, []);

  const [savingPersonId, setSavingPersonId] = useState<string | null>(null);

  // CRM link: which results already have a deal, row selection for bulk add, and the add in progress.
  const [crmPeople, setCrmPeople] = useState<Record<string, CrmMatch>>({});
  const [crmCompanies, setCrmCompanies] = useState<Record<string, CrmMatch>>({});
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [crmBusyKey, setCrmBusyKey] = useState<string | null>(null);

  const getPersonKey = useCallback((person: ApolloPersonMatch): string => {
    return String(person.apolloPersonId || (person.personName + '_' + (person.organizationDomain || ''))).toLowerCase().trim();
  }, []);

  const handleSavePerson = useCallback(async (person: ApolloPersonMatch) => {
    const key = getPersonKey(person);
    if (!key) return;
    setSavingPersonId(key);

    try {
      const res = await savePersonAction(person);
      if (res.error) { triggerNotification('error', res.error); return; }
      setSavedPeopleMap((prev) => ({ ...prev, [key]: person }));
      triggerNotification('success', `Saved ${formatPersonName(person.personName)}.`);
    } catch {
      triggerNotification('error', `Failed to save ${formatPersonName(person.personName)}.`);
    } finally {
      setSavingPersonId(null);
    }
  }, [getPersonKey, triggerNotification]);

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
      return next;
    });
    unsavePersonAction(key).then((res) => res.error && triggerNotification('error', res.error)).catch(() => triggerNotification('error', 'Could not remove the saved contact.'));

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
  }, [getPersonKey, savedPeopleMap, triggerNotification]);

  const handleResearchInCompany360 = async (org: ApolloOrganizationMatch) => {
    try {
      const leadItem: DiscoveryLeadItem = {
        companyId: org.apolloOrganizationId || `comp_${Date.now()}`,
        companyName: org.name,
        domain: org.domain || '',
        // Only what Apollo returned; Company 360 scores the company when its profile is built.
        industry: org.industry || '',
        country: org.location || '',
        employeeCount: org.employeeCount || 0,
        fundingSummary: org.latestFundingStage || '',
        buyingScore: 0,
        icpScore: 0,
        tier: 'MEDIUM',
        primaryTechStack: org.technologies || [],
        hiringSummary: org.openJobsCount ? `${org.openJobsCount} open roles` : '',
        matchedProviders: ['apollo'],
        whyContactReason: org.whyThisCompanySummary || '',
        recommendedContactName: '',
        recommendedContactTitle: '',
        bestOutreachChannel: 'EMAIL',
        estimatedBudgetInr: '',
        estimatedBudgetUsd: '',
        conversionProbabilityPercent: 0,
        recommendedServices: [],
      };

      // Shortlist it for the team, then open its profile.
      const res = await addToShortlistAction(leadItem);
      if (res.error) { triggerNotification('error', res.error); return; }

      // Redirect to Company 360 Workspace
      router.push(`/company?query=${encodeURIComponent(org.domain || org.apolloOrganizationId)}`);
      triggerNotification('success', `Sent ${org.name} to Company 360 Workspace.`);
    } catch (err: unknown) {
      triggerNotification('error', 'Failed to send company to Company 360.');
    }
  };

  const hasPeopleFilters = !!(jobTitle.trim() || seniority || personLocation.trim() || orgLocation.trim() || keywords.trim() || domain.trim() || personCompanyName.trim() || techUsage.trim() || hiringActivity.trim());
  const hasCompanyFilters = !!(companyName.trim() || companyDomain.trim() || companyKeywords.trim() || companyLocation.trim() || employeeCountRange || companyTechUsage.trim() || companyHiringKeywords.trim() || fundingPresetDays || fundingStage);

  // Run People Search
  const executePeopleSearch = useCallback(async (targetPage = 1) => {
    if (!hasPeopleFilters) {
      // An unfiltered Apollo search returns random people from 200M+ profiles and wastes daily quota.
      setPeopleResults([]);
      setTotalCount(0);
      setApolloError(null);
      return;
    }
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
      setApolloError(res.error?.message || null);
      if (res.error) triggerNotification('error', res.error.message);

      checkApolloCreditWarning().then(setCreditWarning).catch(() => { });
    } catch {
      setApolloError('Apollo people search failed. Please try again.');
      triggerNotification('error', 'Apollo people search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [hasPeopleFilters, jobTitle, seniority, personLocation, orgLocation, keywords, domain, personCompanyName, techUsage, hiringActivity, triggerNotification]);

  // Run Company Search
  const executeCompanySearch = useCallback(async (targetPage = 1, overrideHiringKeywords?: string) => {
    if (!hasCompanyFilters && !overrideHiringKeywords) {
      setCompanyResults([]);
      setTotalCount(0);
      setApolloError(null);
      return;
    }
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

      // Technology filtering happens in Apollo (technology UIDs), so results are used as returned.
      setCompanyResults(res.organizations);
      setTotalCount(res.totalCount);
      setPage(res.page);
      setApolloError(res.error?.message || null);
      if (res.error) triggerNotification('error', res.error.message);

      checkApolloCreditWarning().then(setCreditWarning).catch(() => { });
    } catch {
      setApolloError('Apollo company search failed. Please try again.');
      triggerNotification('error', 'Apollo company search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [hasCompanyFilters, companyName, companyDomain, companyKeywords, companyLocation, employeeCountRange, companyTechUsage, companyHiringKeywords, fundingPresetDays, fundingStage, triggerNotification]);

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
  }, [searchMode, executePeopleSearch, executeCompanySearch, keywords, companyKeywords, companyName, personLocation, companyLocation, employeeCountRange, techUsage, companyTechUsage, hiringActivity, companyHiringKeywords, jobTitle, seniority, triggerNotification]);

  // Latest search runner in a ref, so the effect below re-runs only when the mode or provider
  // changes. (Depending on the search callbacks made every keystroke in a filter fire a live Apollo call.)
  const runSearchRef = useRef<(p: number) => void>(() => { });
  // Declared before the search effect, so the ref is current when that effect runs in the same commit.
  useEffect(() => {
    runSearchRef.current = (p: number) => {
      if (selectedProviderId !== 'apollo') executeHubSearch(selectedProviderId, p);
      else if (searchMode === 'people') executePeopleSearch(p);
      else executeCompanySearch(p);
    };
  });

  useEffect(() => {
    runSearchRef.current(1);
  }, [searchMode, selectedProviderId]);

  useEffect(() => {
    let active = true;
    getReviewPosts()
      .then((posts) => {
        if (!active) return;
        setReviewPosts(posts);
        if (posts.length > 0) setSelectedPostIdForLink(posts[0].id);
      })
      .catch(() => { });
    return () => { active = false; };
  }, []);

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
  const applyBdePreset = (preset: SearchPreset | null) => {
    if (!preset) {
      handleResetFilters();
      triggerNotification('success', 'Preset unselected. Filters cleared.');
      return;
    }

    handleResetFilters();
    setActivePresetKey(preset.id);
    setSearchMode(preset.mode);

    if (preset.filters.jobTitle !== undefined) setJobTitle(preset.filters.jobTitle);
    if (preset.filters.seniority !== undefined) setSeniority(preset.filters.seniority);
    if (preset.filters.keywords !== undefined) setKeywords(preset.filters.keywords);
    if (preset.filters.techUsage !== undefined) setTechUsage(preset.filters.techUsage);
    if (preset.filters.hiringActivity !== undefined) setHiringActivity(preset.filters.hiringActivity);
    if (preset.filters.companyKeywords !== undefined) setCompanyKeywords(preset.filters.companyKeywords);
    if (preset.filters.fundingPresetDays !== undefined) setFundingPresetDays(preset.filters.fundingPresetDays);
    if (preset.filters.employeeCountRange !== undefined) setEmployeeCountRange(preset.filters.employeeCountRange);
    if (preset.filters.companyHiringKeywords !== undefined) setCompanyHiringKeywords(preset.filters.companyHiringKeywords);
    if (preset.filters.companyTechUsage !== undefined) setCompanyTechUsage(preset.filters.companyTechUsage);
    if (preset.filters.fundingStage !== undefined) setFundingStage(preset.filters.fundingStage);

    triggerNotification('success', preset.notification);

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

  useEffect(() => {
    if (autoSearchTrigger > 0) {
      if (searchMode === 'people') {
        executePeopleSearch(1);
      } else {
        executeCompanySearch(1);
      }
    }
  }, [autoSearchTrigger]); // eslint-disable-line react-hooks/exhaustive-deps


  // Company-First to People-First Workflow: "Find Decision Makers"
  const handleFindDecisionMakers = (org: ApolloOrganizationMatch) => {
    handleResetFilters();
    setSearchMode('people');
    if (org.domain) setDomain(org.domain);
    if (org.name) setPersonCompanyName(org.name);
    setJobTitle('Founder, Co-Founder, CEO, CTO, Chief Technology Officer, VP Engineering, VP Technology, Head of Engineering, Director of Engineering, Head of Product');
    setAutoSearchTrigger(prev => prev + 1);
    triggerNotification('success', `Switched to Find People for ${org.name}. Pre-populated decision maker criteria.`);
  };

  // Add one or many people to the signed-in user's CRM pipeline.
  const handleAddPeopleToCrm = async (people: ApolloPersonMatch[], busyKey: string) => {
    if (!people.length || crmBusyKey) return;
    setCrmBusyKey(busyKey);
    try {
      const res = await addApolloPeopleToCrmAction(people.map((person) => ({ key: getPersonKey(person), person })));
      if (res.error) return triggerNotification('error', res.error);
      setCrmPeople((prev) => ({ ...prev, ...(res.matches || {}) }));
      setSelectedKeys(new Set());
      triggerNotification('success', res.message || 'Added to the CRM.');
    } catch {
      triggerNotification('error', 'Could not add to the CRM. Please try again.');
    } finally {
      setCrmBusyKey(null);
    }
  };

  const handleAddCompanyToCrm = async (org: ApolloOrganizationMatch) => {
    if (crmBusyKey) return;
    const key = companyKey(org);
    setCrmBusyKey(key);
    try {
      const res = await addApolloCompanyToCrmAction(org);
      if (res.error) return triggerNotification('error', res.error);
      if (res.match) setCrmCompanies((prev) => ({ ...prev, [key]: res.match! }));
      triggerNotification('success', res.message || 'Added to the CRM.');
    } catch {
      triggerNotification('error', 'Could not add to the CRM. Please try again.');
    } finally {
      setCrmBusyKey(null);
    }
  };

  const toggleSelectPerson = (person: ApolloPersonMatch) => {
    const key = getPersonKey(person);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
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
      const { person: enriched, error } = await enrichApolloPersonDirect({
        apolloPersonId: personToEnrich.apolloPersonId,
        personName: personToEnrich.personName,
        organizationDomain: personToEnrich.organizationDomain,
        organizationName: personToEnrich.organizationName,
      });

      // Only real Apollo data is saved; nothing is guessed when Apollo cannot reveal contact details.
      if (!enriched || (!enriched.workEmail && !enriched.personalEmail && !enriched.phone)) {
        setShowEnrichModal(false);
        triggerNotification('error', error || 'Apollo has no contact details for this person.');
        checkApolloCreditWarning().then(setCreditWarning).catch(() => { });
        return;
      }

      const finalWorkEmail = enriched.workEmail || personToEnrich.workEmail;
      const key = getPersonKey(personToEnrich);

      const enrichedPersonObj: ApolloPersonMatch = {
        ...personToEnrich,
        // The reveal returns the full (unobfuscated) name and profile links.
        personName: enriched.personName || personToEnrich.personName,
        linkedinUrl: enriched.linkedinUrl || personToEnrich.linkedinUrl,
        organizationDomain: enriched.organizationDomain || personToEnrich.organizationDomain,
        workEmail: finalWorkEmail,
        personalEmail: enriched.personalEmail || personToEnrich.personalEmail,
        phone: enriched.phone || personToEnrich.phone,
        creditsUsed: 1,
      };

      // Update in peopleResults so email and phone display immediately in the current tab
      setPeopleResults(prev => prev.map(p => getPersonKey(p) === key ? enrichedPersonObj : p));

      // If already in savedPeopleMap, update saved record too
      if (savedPeopleMap[key]) {
        setSavedPeopleMap((prev) => ({ ...prev, [key]: enrichedPersonObj }));
        savePersonAction(enrichedPersonObj).catch(() => { /* the revealed details stay on screen */ });
      }

      checkApolloCreditWarning().then(setCreditWarning).catch(() => { });

      setShowEnrichModal(false);
      const revealed = [finalWorkEmail && `email ${finalWorkEmail}`, enrichedPersonObj.phone && `phone ${enrichedPersonObj.phone}`].filter(Boolean).join(', ');
      triggerNotification('success', `Enriched ${formatPersonName(enrichedPersonObj.personName)}: ${revealed || 'personal email found'}.`);
    } catch {
      triggerNotification('error', 'Apollo enrichment failed. Please try again.');
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

  // Mark results that are already in the CRM (and who owns them) whenever the visible rows change.
  const visiblePeopleKey = displayPeopleList.map(getPersonKey).join('|');
  useEffect(() => {
    if (!visiblePeopleKey) return;
    let active = true;
    lookupCrmStatusAction({
      people: displayPeopleList.map((p) => ({ key: getPersonKey(p), apolloPersonId: p.apolloPersonId, linkedinUrl: p.linkedinUrl, email: p.workEmail || p.personalEmail })),
    }).then((res) => { if (active) setCrmPeople((prev) => ({ ...prev, ...res.people })); }).catch(() => { });
    return () => { active = false; };
  }, [visiblePeopleKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleCompaniesKey = companyResults.map(companyKey).join('|');
  useEffect(() => {
    if (!visibleCompaniesKey) return;
    let active = true;
    lookupCrmStatusAction({
      companies: companyResults.map((o) => ({ key: companyKey(o), domain: o.domain, name: o.name })),
    }).then((res) => { if (active) setCrmCompanies((prev) => ({ ...prev, ...res.companies })); }).catch(() => { });
    return () => { active = false; };
  }, [visibleCompaniesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedPeople = displayPeopleList.filter((p) => selectedKeys.has(getPersonKey(p)));
  const selectablePeople = displayPeopleList.filter((p) => !crmPeople[getPersonKey(p)]);
  const allSelected = selectablePeople.length > 0 && selectablePeople.every((p) => selectedKeys.has(getPersonKey(p)));

  const activeProviderName = selectedProviderId === 'apollo'
    ? 'Apollo B2B'
    : (providersList.find(p => p.id === selectedProviderId)?.name || 'Provider');

  const emptyState = (icon: React.ReactNode, title: string, text: React.ReactNode, action?: React.ReactNode) => (
    <div className={s.empty} style={{ border: 'none', padding: '48px 20px' }}>
      {icon}
      <div className={s.emptyTitle}>{title}</div>
      <div style={{ maxWidth: 460, margin: '0 auto' }}>{text}</div>
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );

  return (
    <PageShell
      icon={User}
      title={`${activeProviderName} Search`}
      subtitle="Find decision makers and target companies, then save them or add them to the CRM"
      actions={
        <div className={s.tabs} role="tablist" aria-label="Search for">
          <button type="button" role="tab" aria-selected={searchMode === 'people'} className={`${s.tab} ${searchMode === 'people' ? s.tabActive : ''}`} onClick={() => { setSearchMode('people'); setPage(1); }}>
            <Users size={14} /> People
          </button>
          <button type="button" role="tab" aria-selected={searchMode === 'companies'} className={`${s.tab} ${searchMode === 'companies' ? s.tabActive : ''}`} onClick={() => { setSearchMode('companies'); setPage(1); }}>
            <Building2 size={14} /> Companies
          </button>
        </div>
      }
      beforeContent={<WorkflowGuide activeStep={2} />}
      breadcrumb={<BreadcrumbHeader currentTitle={`${activeProviderName} Search`} stepNumber={2} totalSteps={7} badge="Executive Prospecting" />}
    >
      <div className={s.root}>
        {toast}

        {(apolloError || (creditWarning && creditWarning.isWarning)) && (
          <div className={`${s.notice} ${s.noticeWarn}`} role="alert">
            <AlertTriangle size={16} className={s.noticeIcon} />
            <span><strong>Apollo:</strong> {apolloError || creditWarning?.message || `${creditWarning?.remainingCredits} Apollo people searches left today.`}</span>
          </div>
        )}

        {frameworkStats && (
          <div className={s.kpiGrid}>
            <StatTile label="Providers" value={frameworkStats.totalProviders} foot="Registered lead sources" />
            <StatTile label="Connected" value={frameworkStats.connectedProviders} foot="Ready to search" tone="good" />
            <StatTile label="Saved contacts" value={savedPeopleList.length} foot="Your saved list" />
            <StatTile label="Apollo searches left" value={creditWarning && creditWarning.remainingCredits >= 0 ? creditWarning.remainingCredits : '—'} foot="Today, from Apollo" />
          </div>
        )}

        <SavedSearchPresetsPanel
          savedPresets={savedPresets}
          selectedPresetId={selectedPresetId}
          setSelectedPresetId={setSelectedPresetId}
          setSelectedProviderId={setSelectedProviderId}
          setCompanyKeywords={setCompanyKeywords}
          setCompanyTechUsage={setCompanyTechUsage}
          setCompanyHiringKeywords={setCompanyHiringKeywords}
          setCompanyLocation={setCompanyLocation}
          setEmployeeCountRange={setEmployeeCountRange}
          triggerNotification={triggerNotification}
        />

        <ProviderRegistryPanel
          providersList={providersList}
          selectedProviderId={selectedProviderId}
          setSelectedProviderId={setSelectedProviderId}
          setPage={setPage}
          triggerNotification={triggerNotification}
        />

        <BdeFastStartPresets
          searchMode={searchMode}
          activePresetKey={activePresetKey}
          onApplyPreset={applyBdePreset}
        />

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
            triggerNotification('success', `Hiring filter applied: "${keyword || 'All openings'}"`);
          }}
          searchMode={searchMode}
        />

        <div className="apollo-grid-layout">
          <ApolloSearchFilters
            searchMode={searchMode}
            handleResetFilters={handleResetFilters}
            jobTitle={jobTitle} setJobTitle={setJobTitle}
            seniority={seniority} setSeniority={setSeniority}
            personLocation={personLocation} setPersonLocation={setPersonLocation}
            personCompanyName={personCompanyName} setPersonCompanyName={setPersonCompanyName}
            domain={domain} setDomain={setDomain}
            keywords={keywords} setKeywords={setKeywords}
            techUsage={techUsage} setTechUsage={setTechUsage}
            executePeopleSearch={executePeopleSearch}
            companyName={companyName} setCompanyName={setCompanyName}
            companyDomain={companyDomain} setCompanyDomain={setCompanyDomain}
            companyKeywords={companyKeywords} setCompanyKeywords={setCompanyKeywords}
            companyLocation={companyLocation} setCompanyLocation={setCompanyLocation}
            employeeCountRange={employeeCountRange} setEmployeeCountRange={setEmployeeCountRange}
            companyTechUsage={companyTechUsage} setCompanyTechUsage={setCompanyTechUsage}
            fundingStage={fundingStage} setFundingStage={setFundingStage}
            companyHiringKeywords={companyHiringKeywords} setCompanyHiringKeywords={setCompanyHiringKeywords}
            fundingPresetDays={fundingPresetDays} setFundingPresetDays={setFundingPresetDays}
            executeCompanySearch={executeCompanySearch}
            loading={loading}
            selectedProviderId={selectedProviderId}
          />

          <section className="apollo-results-workspace" aria-label="Results">
            <div className={s.card}>
              <div className={s.cardHeader} style={{ flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 className={s.cardTitle}>{searchMode === 'people' ? 'People found' : 'Companies found'}</h3>
                  <p className={s.cardSubtitle}>
                    <strong className={s.good}>{(selectedProviderId === 'apollo' ? totalCount : 0).toLocaleString()}</strong> {searchMode === 'people' ? 'people match these filters' : 'companies match these filters'}
                  </p>
                </div>
                <div className={s.badgeRow}>
                  <span className={`${s.badge} ${s.badgeGray}`} title="Apollo people searches left today (from Apollo usage API)">
                    <Zap size={12} /> Search is free{creditWarning && creditWarning.remainingCredits >= 0 ? ` · ${creditWarning.remainingCredits} left today` : ''}
                  </span>
                  <span className={`${s.badge} ${s.badgeAmber}`}><ShieldCheck size={12} /> Contact reveal asks first</span>
                </div>
              </div>

              {searchMode === 'people' && (
                <div className={s.tabs} role="tablist" aria-label="Which people" style={{ width: 'fit-content' }}>
                  {([['fresh', 'New results', freshPeopleList.length], ['saved', 'Saved', savedPeopleList.length]] as const).map(([id, label, count]) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={activeDataTab === id}
                      className={`${s.tab} ${activeDataTab === id ? s.tabActive : ''}`}
                      onClick={() => { setActiveDataTab(id); setPage(1); setSelectedKeys(new Set()); }}
                    >
                      {label} <span className={s.tabCount}>{count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {searchMode === 'people' && selectedProviderId === 'apollo' && displayPeopleList.length > 0 && (
              <div role="region" aria-label="Bulk actions" className={`${s.notice} ${selectedPeople.length ? s.noticeInfo : ''}`} style={{ alignItems: 'center', flexWrap: 'wrap', ...(selectedPeople.length ? {} : { background: 'var(--o-surface)', borderColor: 'var(--o-border)', color: 'var(--o-muted)' }) }}>
                <span style={{ fontWeight: 600 }}>{selectedPeople.length ? `${selectedPeople.length} selected` : 'Select people to add them to the CRM together'}</span>
                <button type="button" className={`${s.btn} ${s.btnSuccess} ${s.btnSm}`} disabled={!selectedPeople.length || crmBusyKey !== null} onClick={() => handleAddPeopleToCrm(selectedPeople, 'bulk')}>
                  {crmBusyKey === 'bulk' ? <Loader2 size={13} className={s.spin} /> : <UserPlus size={13} />} {crmBusyKey === 'bulk' ? 'Adding…' : `Add ${selectedPeople.length || ''} to CRM`}
                </button>
                <button
                  type="button"
                  className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`}
                  onClick={() => downloadPeopleCsv(selectedPeople.length ? selectedPeople : activeDataTab === 'saved' ? savedPeopleList : displayPeopleList)}
                  title="Download as a CSV file"
                >
                  <Download size={13} /> Export {selectedPeople.length ? `${selectedPeople.length} selected` : activeDataTab === 'saved' ? `all ${savedPeopleList.length} saved` : 'this page'}
                </button>
                {selectedPeople.length > 0 && (
                  <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} style={{ marginLeft: 'auto' }} onClick={() => setSelectedKeys(new Set())}>Clear</button>
                )}
              </div>
            )}

            <div className="apollo-table-container">
              {selectedProviderId !== 'apollo' ? (
                emptyState(
                  <Sparkles size={26} style={{ color: 'var(--o-warn)' }} />,
                  selectedProviderId === 'linkedin' ? 'LinkedIn has its own workspace' : `${providersList.find((p) => p.id === selectedProviderId)?.name || selectedProviderId} is coming soon`,
                  selectedProviderId === 'linkedin'
                    ? <>Search LinkedIn posts and people, scan your keywords and send leads to the Review Queue from the <a href="/linkedin" className={s.link}>LinkedIn page</a>.</>
                    : <>A live connection to <strong>{providersList.find((p) => p.id === selectedProviderId)?.name}</strong> is not ready yet. Use Apollo.io for live search and contact details.</>,
                  <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => setSelectedProviderId('apollo')}>Switch to Apollo.io</button>,
                )
              ) : loading ? (
                emptyState(<Loader2 size={22} className={s.spin} style={{ color: 'var(--o-accent)' }} />, 'Searching Apollo…', 'This usually takes a few seconds.')
              ) : searchMode === 'people' ? (
                (activeDataTab === 'saved' ? savedPeopleList.length === 0 : freshPeopleList.length === 0) ? (
                  emptyState(
                    <User size={26} style={{ color: 'var(--o-accent)' }} />,
                    activeDataTab === 'saved' ? 'No saved contacts yet' : apolloError ? 'Apollo could not run this search' : !hasPeopleFilters ? 'Set your filters to search Apollo' : 'No contacts matched these filters',
                    activeDataTab === 'saved'
                      ? 'Save contacts from New results to see them here.'
                      : apolloError
                        ? apolloError
                        : !hasPeopleFilters
                          ? 'Add a job title, company domain, location or keyword, then press Search. Empty searches are skipped to save your Apollo quota.'
                          : (peopleResults.length > 0
                            ? `All ${peopleResults.length} contacts on this page are already in Saved.`
                            : 'Try a broader job title, location or keyword.'),
                    activeDataTab === 'fresh' && savedPeopleList.length > 0
                      ? <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={() => setActiveDataTab('saved')}>View {savedPeopleList.length} saved contacts <ChevronRight size={14} /></button>
                      : undefined,
                  )
                ) : (
                  <>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="w-full border-collapse text-[0.82rem] text-left table-fixed" style={{ minWidth: 900 }}>
                        <thead>
                          <tr>
                            <th style={{ width: '4%', paddingLeft: '16px' }}>
                              <input
                                type="checkbox"
                                aria-label="Select everyone on this page who is not in the CRM yet"
                                checked={allSelected}
                                disabled={selectablePeople.length === 0}
                                onChange={() => setSelectedKeys(allSelected ? new Set() : new Set(selectablePeople.map(getPersonKey)))}
                                style={{ width: 15, height: 15, cursor: selectablePeople.length ? 'pointer' : 'not-allowed', accentColor: 'var(--o-accent)' }}
                              />
                            </th>
                            <th style={{ width: '19%', textAlign: 'left', paddingLeft: '4px' }}>Person</th>
                            <th style={{ width: '17%', textAlign: 'left' }}>Company</th>
                            <th style={{ width: '13%', textAlign: 'left' }}>Growth signals</th>
                            <th style={{ width: '32%', textAlign: 'left' }}>Contact details</th>
                            <th style={{ width: '15%', textAlign: 'center' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayPeopleList.map((person) => {
                            const key = getPersonKey(person);
                            return (
                              <UniversalResultRenderer
                                key={person.apolloPersonId || key}
                                person={person}
                                searchMode="people"
                                isSaved={Boolean(savedPeopleMap[key])}
                                isSaving={savingPersonId === key}
                                onSavePerson={handleSavePerson}
                                onUnsavePerson={handleUnsavePerson}
                                onEnrichPerson={handleOpenEnrichModal}
                                onLinkToPost={handleOpenLinkModal}
                                formatPersonName={formatPersonName}
                                crmMatch={crmPeople[key]}
                                isSelected={selectedKeys.has(key)}
                                onToggleSelect={toggleSelectPerson}
                                isAddingToCrm={crmBusyKey === key || (crmBusyKey === 'bulk' && selectedKeys.has(key))}
                                onAddToCrm={(p) => handleAddPeopleToCrm([p], key)}
                              />
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {activeDataTab === 'saved' ? (
                      <div className={s.pager}>
                        <span>
                          Showing <strong>{savedPeopleList.length > 0 ? (savedPage - 1) * perPage + 1 : 0}–{Math.min(savedPage * perPage, savedPeopleList.length)}</strong> of <strong>{savedPeopleList.length}</strong> saved contacts
                        </span>
                        <div className={s.badgeRow}>
                          <button type="button" className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} onClick={() => setSavedPage((p) => Math.max(1, p - 1))} disabled={savedPage <= 1}><ChevronLeft size={14} /> Previous</button>
                          <button type="button" className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} onClick={() => setSavedPage((p) => Math.min(savedTotalPages, p + 1))} disabled={savedPage >= savedTotalPages}>Next <ChevronRight size={14} /></button>
                        </div>
                      </div>
                    ) : (
                      <div className={s.pager}>
                        <span>
                          Page <strong>{page}</strong> of <strong>{freshTotalPages}</strong> · {freshPeopleList.length} new on this page · {totalCount.toLocaleString()} matches in Apollo
                        </span>
                        <div className={s.badgeRow}>
                          <button type="button" className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} onClick={() => executePeopleSearch(page - 1)} disabled={page <= 1 || loading}><ChevronLeft size={14} /> Previous</button>
                          <button type="button" className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} onClick={() => executePeopleSearch(page + 1)} disabled={page >= freshTotalPages || loading}>Next <ChevronRight size={14} /></button>
                        </div>
                      </div>
                    )}
                  </>
                )
              ) : companyResults.length === 0 ? (
                emptyState(
                  <Building2 size={26} style={{ color: 'var(--o-accent)' }} />,
                  apolloError ? 'Apollo could not run this search' : !hasCompanyFilters ? 'Set your filters to search Apollo' : 'No companies matched these filters',
                  apolloError || (!hasCompanyFilters
                    ? 'Add an industry keyword, location, size or technology, then press Search. Empty searches are skipped to save your Apollo quota.'
                    : 'Try a wider employee range or fewer technology filters.'),
                )
              ) : (
                <>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="w-full border-collapse text-[0.82rem] text-left table-fixed" style={{ minWidth: 900 }}>
                      <thead>
                        <tr>
                          <th style={{ width: '22%', textAlign: 'left', paddingLeft: '20px' }}>Company</th>
                          <th style={{ width: '18%', textAlign: 'left' }}>Size</th>
                          <th style={{ width: '18%', textAlign: 'left' }}>Technology</th>
                          <th style={{ width: '26%', textAlign: 'left' }}>Growth signals</th>
                          <th style={{ width: '16%', textAlign: 'right', paddingRight: '20px' }}>Actions</th>
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
                            crmMatch={crmCompanies[companyKey(org)]}
                            isAddingToCrm={crmBusyKey === companyKey(org)}
                            onAddCompanyToCrm={handleAddCompanyToCrm}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className={s.pager}>
                    <span>Page <strong>{page}</strong> of <strong>{companyTotalPages}</strong> · {totalCount.toLocaleString()} companies</span>
                    <div className={s.badgeRow}>
                      <button type="button" className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} onClick={() => executeCompanySearch(page - 1)} disabled={page <= 1 || loading}><ChevronLeft size={14} /> Previous</button>
                      <button type="button" className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} onClick={() => executeCompanySearch(page + 1)} disabled={page >= companyTotalPages || loading}>Next <ChevronRight size={14} /></button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      </div>

      {showEnrichModal && personToEnrich && (
        <Modal
          title="Reveal contact details?"
          icon={<ShieldCheck size={18} />}
          onClose={() => setShowEnrichModal(false)}
          busy={enrichLoading}
          actions={
            <>
              <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={() => setShowEnrichModal(false)} disabled={enrichLoading}>Cancel</button>
              <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={handleConfirmEnrichment} disabled={enrichLoading}>
                {enrichLoading && <Loader2 size={14} className={s.spin} />} {enrichLoading ? 'Revealing…' : 'Reveal (1 credit)'}
              </button>
            </>
          }
        >
          <p className={s.modalText}>
            This reveals the verified work email and phone number of <strong>{formatPersonName(personToEnrich.personName)}</strong> ({personToEnrich.jobTitle || 'Executive'} at {personToEnrich.organizationName || 'Company'}).
          </p>
          <div className={`${s.notice} ${s.noticeWarn}`}>
            <AlertTriangle size={15} className={s.noticeIcon} />
            <span>1 Apollo credit is taken from your organisation&apos;s balance.</span>
          </div>
        </Modal>
      )}

      {showLinkModal && selectedPersonForLink && (
        <Modal
          title="Link to a Review Queue post"
          icon={<LinkIcon size={18} />}
          onClose={() => setShowLinkModal(false)}
          wide
          actions={
            <>
              <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={() => setShowLinkModal(false)}>Cancel</button>
              <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={handleConfirmLink} disabled={reviewPosts.length === 0 || !selectedPostIdForLink}>Link</button>
            </>
          }
        >
          <p className={s.modalText}>
            Attach <strong>{formatPersonName(selectedPersonForLink.personName)}</strong> ({selectedPersonForLink.organizationName || 'Company'}) to a post waiting in the Review Queue.
          </p>
          {reviewPosts.length === 0 ? (
            <div className={`${s.notice} ${s.noticeWarn}`}>
              <AlertTriangle size={15} className={s.noticeIcon} />
              <span>The Review Queue is empty. Scan your keywords on the LinkedIn page first.</span>
            </div>
          ) : (
            <label className={s.field}>
              <span className={s.label}>Post</span>
              <select className={s.select} value={selectedPostIdForLink} onChange={(e) => setSelectedPostIdForLink(e.target.value)}>
                <option value="">Choose a post…</option>
                {reviewPosts.map((post) => (
                  <option key={post.id} value={post.id}>{`${post.authorName} (${post.companyName || 'Company'}) – ${(post.postContent || '').slice(0, 45)}…`}</option>
                ))}
              </select>
            </label>
          )}
        </Modal>
      )}
    </PageShell>
  );
}
