'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  getAppSettings,
  updateAppSettings,
  getServiceCatalog,
  updateServiceCatalog
} from '@/features/learning/actions';
import {
  Save,
  Settings,
  Loader2,
  Info,
  Sliders,
  Activity,
  RefreshCw,
  Zap,
  TrendingUp,
  Share2,
  Flame,
  Send,
  Layers,
  Key,
  Edit2,
  Trash2,
  Plus,
  Check
} from 'lucide-react';
import { z } from 'zod';
import {
  getMarketplaceConnectors,
  getMarketplaceSettings,
  testConnectorConnection,
  ConnectorCardItem,
  MarketplaceSettingsConfig
} from '@/features/connectors/actions';
import { PageShell } from '@/components/ui/PageShell';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/useToast';
import s from '@/components/ui/ui.module.css';
import '@/styles/globals.css';

type SettingsTab = 'connectors' | 'service-catalog' | 'apollo' | 'github' | 'crunchbase' | 'linkedin' | 'prioritization' | 'outreach' | 'general';

export interface ServiceItem {
  id: string;
  name: string;
  minInr: string;
  minUsd: string;
  stack: string;
  model: string;
  threshold: number;
}

const ServiceItemSchema = z.object({
  name: z.string().min(3, "Service name must be at least 3 characters").max(100, "Service name is too long"),
  minInr: z.string().regex(/^₹?[0-9,]+$/, "Must be a valid INR amount (e.g. ₹20,00,000)"),
  minUsd: z.string().regex(/^\$?[0-9,]+$/, "Must be a valid USD amount (e.g. $25,000)"),
  stack: z.string().min(3, "Please provide at least one technology in the stack"),
  model: z.string().min(1, "Please select a delivery model"),
  threshold: z.number().min(0, "Threshold cannot be negative").max(100, "Threshold cannot exceed 100")
});

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('connectors');

  // General Settings State
  const [primaryTone, setPrimaryTone] = useState('');
  const [secondaryTone, setSecondaryTone] = useState('');
  const [tertiaryTone, setTertiaryTone] = useState('');
  const [activeModel, setActiveModel] = useState('');
  const [weeklyLimit, setWeeklyLimit] = useState('');

  // Apollo Settings State
  const [apolloEnabled, setApolloEnabled] = useState('true');
  const [apolloConfirmRequired, setApolloConfirmRequired] = useState('true');
  const [apolloMaxEnrich, setApolloMaxEnrich] = useState('5');
  const [apolloAllowPersonalEmail, setApolloAllowPersonalEmail] = useState('false');
  const [apolloAllowPhone, setApolloAllowPhone] = useState('false');
  const [apolloCreditWarningThreshold, setApolloCreditWarningThreshold] = useState('20');
  const [apolloApiKey, setApolloApiKey] = useState('ap_live_98a7f432194b2');

  // Other Providers State
  const [linkedinEnabled, setLinkedinEnabled] = useState('true');
  const [linkedinApiKey, setLinkedinApiKey] = useState('');
  const [crunchbaseEnabled, setCrunchbaseEnabled] = useState('false');
  const [crunchbaseApiKey, setCrunchbaseApiKey] = useState('');
  const [githubEnabled, setGithubEnabled] = useState('false');
  const [githubApiKey, setGithubApiKey] = useState('');

  // AI & Outreach State
  const [immediateActionThreshold, setImmediateActionThreshold] = useState('90');
  const [defaultSignature, setDefaultSignature] = useState('');
  const [annualSalesTargetInr, setAnnualSalesTargetInr] = useState('');

  // Secret Key Configuration Modal State
  const [keyModalConnector, setKeyModalConnector] = useState<{ id: string; name: string } | null>(null);
  const [secretKeyInput, setSecretKeyInput] = useState('');

  // Service Catalog CRUD State
  const [services, setServices] = useState<ServiceItem[]>([]);

  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState<Omit<ServiceItem, 'id'>>({
    name: '',
    minInr: '₹20,00,000',
    minUsd: '$25,000',
    stack: 'TypeScript, React, Node.js',
    model: 'Fixed Price',
    threshold: 80
  });
  const [serviceFormErrors, setServiceFormErrors] = useState<Record<string, string>>({});

  // Connector Manager State
  const [connectors, setConnectors] = useState<ConnectorCardItem[]>([]);
  const [, setMarketplaceSettings] = useState<MarketplaceSettingsConfig | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [dbWarning, setDbWarning] = useState(false);

  const { toast, notify } = useToast();
  const triggerNotification = (type: 'success' | 'error', message: string) => notify(message, type === 'error');

  const loadConfigData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAppSettings();
      setPrimaryTone(data.primaryTone || 'Consultative & Professional');
      setSecondaryTone(data.secondaryTone || 'Direct & Solution-Focused');
      setTertiaryTone(data.tertiaryTone || 'Concise Enterprise SaaS');
      setActiveModel(data.activeModel || 'gemini-1.5-flash');
      setWeeklyLimit(String(data.weeklyLimit || 500));

      setApolloEnabled(String(data.apolloEnabled ?? true));
      setApolloConfirmRequired(String(data.apolloConfirmRequired ?? true));
      setApolloMaxEnrich(String(data.apolloMaxEnrich ?? 5));
      setApolloAllowPersonalEmail(String(data.apolloAllowPersonalEmail ?? false));
      setApolloAllowPhone(String(data.apolloAllowPhone ?? false));
      setApolloCreditWarningThreshold(String(data.apolloCreditWarningThreshold ?? 20));
      setApolloApiKey(data.apolloApiKey === 'ap_live_98a7f432194b2' ? '' : (data.apolloApiKey || ''));
      
      setLinkedinEnabled(String(data.linkedinEnabled ?? 'true'));
      setLinkedinApiKey(data.linkedinApiKey || '');
      setCrunchbaseEnabled(String(data.crunchbaseEnabled ?? 'false'));
      setCrunchbaseApiKey(data.crunchbaseApiKey || '');
      setGithubEnabled(String(data.githubEnabled ?? 'false'));
      setGithubApiKey(data.githubApiKey || '');
      setImmediateActionThreshold(String(data.immediateActionThreshold ?? '90'));
      setDefaultSignature(data.defaultSignature || '');
      setAnnualSalesTargetInr(data.annualSalesTargetInr || '');

      const connList = await getMarketplaceConnectors();
      setConnectors(connList);

      const mSettings = await getMarketplaceSettings();
      setMarketplaceSettings(mSettings);
      
      const catalog = await getServiceCatalog();
      setServices(catalog);
    } catch {
      setDbWarning(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function run() {
      if (!active) return;
      await loadConfigData();
    }
    run();
    return () => { active = false; };
  }, [loadConfigData]);

  // Handle Connector Test Connection
  const handleTestConnector = async (id: string) => {
    setTestingId(id);
    try {
      const res = await testConnectorConnection(id);
      if (res.success) {
        triggerNotification('success', res.message);
      } else {
        triggerNotification('error', res.message);
      }
    } catch {
      triggerNotification('error', 'Connection test failed.');
    } finally {
      setTestingId(null);
    }
  };

  // Form Save Action
  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActionLoading(true);
    try {
      const res = await updateAppSettings({
        primaryTone,
        secondaryTone,
        tertiaryTone,
        activeModel,
        weeklyLimit,
        apolloEnabled,
        apolloConfirmRequired,
        apolloMaxEnrich,
        apolloAllowPersonalEmail,
        apolloAllowPhone,
        apolloCreditWarningThreshold,
        apolloApiKey,
        linkedinEnabled,
        linkedinApiKey,
        crunchbaseEnabled,
        crunchbaseApiKey,
        githubEnabled,
        githubApiKey,
        immediateActionThreshold,
        defaultSignature,
        annualSalesTargetInr
      });

      if (res.success) {
        triggerNotification('success', 'Settings saved.');
      } else {
        triggerNotification('error', 'Failed to save settings.');
      }
    } catch {
      triggerNotification('error', 'The settings could not be saved. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Secret Key Save Modal Handler
  const handleSaveSecretKey = async () => {
    if (!keyModalConnector || !secretKeyInput.trim()) return;
    setActionLoading(true);
    try {
      if (keyModalConnector.id === 'apollo') setApolloApiKey(secretKeyInput);
      else if (keyModalConnector.id === 'linkedin') setLinkedinApiKey(secretKeyInput);
      else if (keyModalConnector.id === 'crunchbase') setCrunchbaseApiKey(secretKeyInput);
      else if (keyModalConnector.id === 'github') setGithubApiKey(secretKeyInput);

      await updateAppSettings({
        primaryTone, secondaryTone, tertiaryTone, activeModel, weeklyLimit,
        apolloEnabled, apolloConfirmRequired, apolloMaxEnrich, apolloAllowPersonalEmail,
        apolloAllowPhone, apolloCreditWarningThreshold,
        apolloApiKey: keyModalConnector.id === 'apollo' ? secretKeyInput : apolloApiKey,
        linkedinEnabled, linkedinApiKey: keyModalConnector.id === 'linkedin' ? secretKeyInput : linkedinApiKey,
        crunchbaseEnabled, crunchbaseApiKey: keyModalConnector.id === 'crunchbase' ? secretKeyInput : crunchbaseApiKey,
        githubEnabled, githubApiKey: keyModalConnector.id === 'github' ? secretKeyInput : githubApiKey,
        immediateActionThreshold, defaultSignature, annualSalesTargetInr
      });
      setConnectors(prev => prev.map(c => c.id === keyModalConnector.id ? { ...c, apiKeyMasked: `${secretKeyInput.slice(0, 7)}••••••••${secretKeyInput.slice(-4)}` } : c));
      triggerNotification('success', `Updated Secret Key for ${keyModalConnector.name}!`);
      setKeyModalConnector(null);
      setSecretKeyInput('');
    } catch {
      triggerNotification('error', 'Failed to update key.');
    } finally {
      setActionLoading(false);
    }
  };

  // Service Catalog CRUD Handlers
  const handleOpenAddService = () => {
    setEditingServiceId(null);
    setServiceForm({
      name: '',
      minInr: '₹20,00,000',
      minUsd: '$25,000',
      stack: 'TypeScript, React 19, Node.js',
      model: 'Fixed Price',
      threshold: 80
    });
    setServiceFormErrors({});
    setServiceModalOpen(true);
  };

  const handleOpenEditService = (srv: ServiceItem) => {
    setEditingServiceId(srv.id);
    setServiceForm({
      name: srv.name,
      minInr: srv.minInr,
      minUsd: srv.minUsd,
      stack: srv.stack,
      model: srv.model,
      threshold: srv.threshold
    });
    setServiceFormErrors({});
    setServiceModalOpen(true);
  };

  const handleSaveService = async () => {
    try {
      ServiceItemSchema.parse(serviceForm);
      setServiceFormErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setServiceFormErrors(fieldErrors);
        triggerNotification('error', 'Please fix the errors in the form.');
      }
      return;
    }

    let updatedList = [...services];
    if (editingServiceId) {
      updatedList = updatedList.map(s => s.id === editingServiceId ? { ...s, ...serviceForm } : s);
      triggerNotification('success', `Updated service: ${serviceForm.name}`);
    } else {
      const newSrv: ServiceItem = {
        id: `srv_${Date.now()}`,
        ...serviceForm
      };
      updatedList = [...updatedList, newSrv];
      triggerNotification('success', `Added new service: ${serviceForm.name}`);
    }
    
    setServices(updatedList);
    setServiceModalOpen(false);
    
    // Persist to DB
    await updateServiceCatalog(updatedList);
  };

  const handleDeleteService = async (id: string, name: string) => {
    const updatedList = services.filter(s => s.id !== id);
    setServices(updatedList);
    triggerNotification('success', `Deleted service: ${name}`);
    
    // Persist to DB
    await updateServiceCatalog(updatedList);
  };

  const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'connectors', label: `Providers (${connectors.length})`, icon: Activity },
    { id: 'service-catalog', label: 'Service catalog', icon: Layers },
    { id: 'apollo', label: 'Apollo.io', icon: Key },
    { id: 'linkedin', label: 'LinkedIn', icon: Share2 },
    { id: 'crunchbase', label: 'Crunchbase', icon: TrendingUp },
    { id: 'github', label: 'GitHub', icon: Zap },
    { id: 'prioritization', label: 'Prioritization', icon: Flame },
    { id: 'outreach', label: 'Outreach', icon: Send },
    { id: 'general', label: 'AI tone & model', icon: Sliders },
  ];

  const saveButton = (label = 'Save settings') => (
    <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => handleSaveConfig()} disabled={actionLoading}>
      {actionLoading ? <Loader2 size={15} className={s.spin} /> : <Save size={15} />} {label}
    </button>
  );

  const enabledSelect = (id: string, value: string, onChange: (v: string) => void, onLabel = 'Enabled') => (
    <select id={id} className={s.select} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="true">{onLabel}</option>
      <option value="false">Disabled</option>
    </select>
  );

  /** API key + on/off switch for one data provider. */
  const providerTab = (opts: {
    icon: React.ElementType;
    title: string;
    description: string;
    keyLabel: string;
    keyValue: string;
    setKey: (v: string) => void;
    keyPlaceholder: string;
    keyHint?: React.ReactNode;
    enabled: string;
    setEnabled: (v: string) => void;
    extra?: React.ReactNode;
    footerLeft?: React.ReactNode;
  }) => {
    const Icon = opts.icon;
    return (
      <section className={s.card}>
        <div>
          <h3 className={s.cardTitle}><span className={s.iconTile}><Icon size={16} /></span> {opts.title}</h3>
          <p className={s.cardSubtitle}>{opts.description}</p>
        </div>
        <div className={s.formGrid}>
          <div className={s.field}>
            <label className={s.label} htmlFor={`${opts.title}-key`}>{opts.keyLabel}</label>
            <input id={`${opts.title}-key`} type="password" autoComplete="off" className={`${s.input} ${s.mono}`} value={opts.keyValue} onChange={(e) => opts.setKey(e.target.value)} placeholder={opts.keyPlaceholder} />
            {opts.keyHint && <span className={s.fieldHint}>{opts.keyHint}</span>}
          </div>
          <div className={s.field}>
            <label className={s.label} htmlFor={`${opts.title}-enabled`}>Integration status</label>
            {enabledSelect(`${opts.title}-enabled`, opts.enabled, opts.setEnabled)}
          </div>
          {opts.extra}
        </div>
        <div className={s.cardFooter}>
          <span className={s.cellSub}>{opts.footerLeft}</span>
          {saveButton()}
        </div>
      </section>
    );
  };

  const apolloConnector = connectors.find((c) => c.id === 'apollo');

  return (
    <PageShell icon={Settings} title="Settings" subtitle="Provider API keys, the service catalog and the AI model used across the workspace" badge="Admin">
      <div className={s.root}>
        {toast}

        {dbWarning && (
          <div className={`${s.notice} ${s.noticeWarn}`} role="alert">
            <Info size={16} className={s.noticeIcon} />
            <span>Some settings could not be loaded from the database. Check the database connection before saving.</span>
          </div>
        )}

        <div className={s.chipRow} role="tablist" aria-label="Settings sections">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} type="button" role="tab" aria-selected={activeTab === t.id} className={`${s.chip} ${activeTab === t.id ? s.chipActive : ''}`} onClick={() => setActiveTab(t.id)}>
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className={s.empty}><Loader2 size={22} className={s.spin} /><div className={s.emptyTitle}>Loading settings…</div></div>
        ) : (
          <>
            {/* PROVIDERS */}
            {activeTab === 'connectors' && (
              <section className={s.card}>
                <div>
                  <h3 className={s.cardTitle}><span className={s.iconTile}><Activity size={16} /></span> Data providers and API keys</h3>
                  <p className={s.cardSubtitle}>Keys saved here are used when the matching key is not set in the server&apos;s .env file.</p>
                </div>
                <div className={s.grid}>
                  {connectors.map((c) => (
                    <div key={c.id} className={s.tile}>
                      <div className={s.tileHead}>
                        <h4 className={s.tileTitle}>{c.name}</h4>
                        <span className={`${s.badge} ${c.status === 'Connected' ? s.badgeGreen : s.badgeAmber}`}>{c.status}</span>
                      </div>
                      <div className={s.cellSub} style={{ marginTop: 0 }}>Key: <span className={s.mono}>{c.apiKeyMasked}</span></div>
                      <div className={s.badgeRow}>
                        {c.capabilities.liveSync && <span className={`${s.badge} ${s.badgeIndigo}`}>Live sync</span>}
                        {c.capabilities.aiQualification && <span className={`${s.badge} ${s.badgeIndigo}`}>AI qualification</span>}
                        {c.capabilities.contactEnrichment && <span className={`${s.badge} ${s.badgeIndigo}`}>Contact enrichment</span>}
                        {c.capabilities.techExtraction && <span className={`${s.badge} ${s.badgeIndigo}`}>Tech stack</span>}
                      </div>
                      <div className={s.cardFooter} style={{ marginTop: 'auto' }}>
                        <button
                          type="button"
                          className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`}
                          onClick={() => {
                            setKeyModalConnector({ id: c.id, name: c.name });
                            if (c.id === 'apollo') setSecretKeyInput(apolloApiKey);
                            else if (c.id === 'linkedin') setSecretKeyInput(linkedinApiKey);
                            else if (c.id === 'crunchbase') setSecretKeyInput(crunchbaseApiKey);
                            else if (c.id === 'github') setSecretKeyInput(githubApiKey);
                            else setSecretKeyInput('');
                          }}
                        >
                          <Key size={13} /> Set key
                        </button>
                        <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={() => handleTestConnector(c.id)} disabled={testingId === c.id}>
                          {testingId === c.id ? <Loader2 size={13} className={s.spin} /> : <RefreshCw size={13} />} {testingId === c.id ? 'Testing…' : 'Test connection'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* SERVICE CATALOG */}
            {activeTab === 'service-catalog' && (
              <section className={s.card}>
                <div className={s.cardHeader}>
                  <div>
                    <h3 className={s.cardTitle}><span className={s.iconTile}><Layers size={16} /></span> Service catalog</h3>
                    <p className={s.cardSubtitle}>The services you sell. Lead scoring and outreach match prospects against these.</p>
                  </div>
                  <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={handleOpenAddService}><Plus size={15} /> Add service</button>
                </div>
                {services.length === 0 ? (
                  <div className={s.empty}><div className={s.emptyTitle}>No services yet</div>Add the services you offer so leads can be matched to them.</div>
                ) : (
                  <div className={s.grid}>
                    {services.map((srv) => (
                      <div key={srv.id} className={s.tile}>
                        <div className={s.tileHead}>
                          <h4 className={s.tileTitle}>{srv.name}</h4>
                          <span className={`${s.badge} ${s.badgeIndigo}`}>From {srv.minUsd}</span>
                        </div>
                        <div className={s.cellSub} style={{ marginTop: 0 }}><strong>Stack:</strong> {srv.stack}</div>
                        <div className={s.cellSub} style={{ marginTop: 0 }}>{srv.model} · min {srv.minInr} · ICP match from {srv.threshold}%</div>
                        <div className={s.actionGroup} style={{ justifyContent: 'flex-end', marginTop: 'auto' }}>
                          <button type="button" className={`${s.btn} ${s.btnSecondary} ${s.btnSm}`} onClick={() => handleOpenEditService(srv)}><Edit2 size={12} /> Edit</button>
                          <button type="button" className={`${s.btn} ${s.btnDanger} ${s.btnSm}`} onClick={() => window.confirm(`Delete "${srv.name}" from the catalog?`) && handleDeleteService(srv.id, srv.name)}><Trash2 size={12} /> Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeTab === 'apollo' && providerTab({
              icon: Key,
              title: 'Apollo.io',
              description: 'People and company search, and contact enrichment (email and phone).',
              keyLabel: 'Apollo API key',
              keyValue: apolloApiKey,
              setKey: setApolloApiKey,
              keyPlaceholder: 'ap_live_…',
              keyHint: 'Used only when APOLLO_API_KEY is not set in .env (the .env key always wins).',
              enabled: apolloEnabled,
              setEnabled: setApolloEnabled,
              extra: (
                <>
                  <div className={s.field}>
                    <label className={s.label} htmlFor="apollo-max">Results per page limit (×5)</label>
                    <input id="apollo-max" type="number" min={1} className={s.input} value={apolloMaxEnrich} onChange={(e) => setApolloMaxEnrich(e.target.value)} />
                  </div>
                  <div className={s.field}>
                    <label className={s.label} htmlFor="apollo-warn">Warn when daily searches left drop below</label>
                    <input id="apollo-warn" type="number" min={1} className={s.input} value={apolloCreditWarningThreshold} onChange={(e) => setApolloCreditWarningThreshold(e.target.value)} />
                  </div>
                  <div className={s.field}>
                    <label className={s.label} htmlFor="apollo-personal">Reveal personal emails</label>
                    {enabledSelect('apollo-personal', apolloAllowPersonalEmail, setApolloAllowPersonalEmail, 'Allowed')}
                  </div>
                  <div className={s.field}>
                    <label className={s.label} htmlFor="apollo-phone">Reveal phone numbers</label>
                    {enabledSelect('apollo-phone', apolloAllowPhone, setApolloAllowPhone, 'Allowed')}
                    <span className={s.fieldHint}>Phone reveals also need APOLLO_WEBHOOK_URL on the server.</span>
                  </div>
                </>
              ),
              footerLeft: <>Status: <strong className={apolloConnector?.status === 'Connected' ? s.good : s.warn}>{apolloConnector?.status || 'Not connected'}</strong></>,
            })}

            {activeTab === 'linkedin' && providerTab({
              icon: Share2,
              title: 'LinkedIn',
              description: 'Post and people search through Apify\'s LinkedIn scrapers.',
              keyLabel: 'Apify API token',
              keyValue: linkedinApiKey,
              setKey: setLinkedinApiKey,
              keyPlaceholder: 'apify_api_…',
              keyHint: <>Used only when LINKEDIN_SCRAPER_API_KEY is not set in .env. Check the live connection on the <Link className={s.link} href="/linkedin">LinkedIn page</Link>.</>,
              enabled: linkedinEnabled,
              setEnabled: setLinkedinEnabled,
            })}

            {activeTab === 'crunchbase' && providerTab({
              icon: TrendingUp,
              title: 'Crunchbase',
              description: 'Funding rounds and company growth signals.',
              keyLabel: 'Crunchbase API key',
              keyValue: crunchbaseApiKey,
              setKey: setCrunchbaseApiKey,
              keyPlaceholder: 'Crunchbase API key',
              enabled: crunchbaseEnabled,
              setEnabled: setCrunchbaseEnabled,
            })}

            {activeTab === 'github' && providerTab({
              icon: Zap,
              title: 'GitHub',
              description: 'Engineering activity signals from public repositories.',
              keyLabel: 'GitHub token',
              keyValue: githubApiKey,
              setKey: setGithubApiKey,
              keyPlaceholder: 'ghp_…',
              enabled: githubEnabled,
              setEnabled: setGithubEnabled,
            })}

            {/* PRIORITIZATION */}
            {activeTab === 'prioritization' && (
              <section className={s.card}>
                <div>
                  <h3 className={s.cardTitle}><span className={s.iconTile}><Flame size={16} /></span> Account prioritization</h3>
                  <p className={s.cardSubtitle}>How AI Priorities ranks accounts. Signals currently come from Apollo; Crunchbase and GitHub signals are not used yet.</p>
                </div>
                <div className={s.formGrid}>
                  <div className={s.field}>
                    <label className={s.label} htmlFor="prio-threshold">&quot;Act now&quot; score threshold (0-100)</label>
                    <input id="prio-threshold" type="number" min={0} max={100} className={s.input} value={immediateActionThreshold} onChange={(e) => setImmediateActionThreshold(e.target.value)} />
                    <span className={s.fieldHint}>Accounts scoring at or above this are marked for immediate action.</span>
                  </div>
                </div>
                <div className={s.cardFooter}><span />{saveButton()}</div>
              </section>
            )}

            {/* OUTREACH */}
            {activeTab === 'outreach' && (
              <section className={s.card}>
                <div>
                  <h3 className={s.cardTitle}><span className={s.iconTile}><Send size={16} /></span> Outreach</h3>
                  <p className={s.cardSubtitle}>Workspace defaults for AI-written outreach. Each person&apos;s own email signature is set under Profile.</p>
                </div>
                <div className={s.field}>
                  <label className={s.label} htmlFor="default-signature">Default sender line (Name | Role | Company)</label>
                  <input id="default-signature" type="text" className={s.input} value={defaultSignature} onChange={(e) => setDefaultSignature(e.target.value)} />
                  <span className={s.fieldHint}>Used to sign AI sequences written by an admin. Other team members sign with their own name.</span>
                </div>
                <div className={s.field}>
                  <label className={s.label} htmlFor="sales-target">Yearly sales target (₹)</label>
                  <input id="sales-target" type="text" inputMode="numeric" className={s.input} placeholder="e.g. 25000000" value={annualSalesTargetInr} onChange={(e) => setAnnualSalesTargetInr(e.target.value)} />
                  <span className={s.fieldHint}>Shown on the Revenue page as progress against won deals. Leave empty if the team has no target.</span>
                </div>
                <div className={s.cardFooter}><span />{saveButton()}</div>
              </section>
            )}

            {/* AI */}
            {activeTab === 'general' && (
              <section className={s.card}>
                <div>
                  <h3 className={s.cardTitle}><span className={s.iconTile}><Sliders size={16} /></span> AI tone and model</h3>
                  <p className={s.cardSubtitle}>The voice AI drafts are written in, and limits for outreach volume.</p>
                </div>
                <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className={s.formGrid}>
                    <div className={s.field}>
                      <label className={s.label} htmlFor="ai-model">Gemini model</label>
                      <select id="ai-model" className={s.select} value={activeModel} onChange={(e) => setActiveModel(e.target.value)}>
                        {!['gemini-1.5-flash', 'gemini-1.5-pro'].includes(activeModel) && activeModel && <option value={activeModel}>{activeModel}</option>}
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash (fast, low cost)</option>
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro (deeper reasoning)</option>
                      </select>
                      <span className={s.fieldHint}>GEMINI_MODEL in .env takes priority for outreach and analysis.</span>
                    </div>
                    <div className={s.field}>
                      <label className={s.label} htmlFor="tone-1">Primary tone</label>
                      <input id="tone-1" type="text" className={s.input} value={primaryTone} onChange={(e) => setPrimaryTone(e.target.value)} />
                    </div>
                    <div className={s.field}>
                      <label className={s.label} htmlFor="tone-2">Secondary tone</label>
                      <input id="tone-2" type="text" className={s.input} value={secondaryTone} onChange={(e) => setSecondaryTone(e.target.value)} />
                    </div>
                    <div className={s.field}>
                      <label className={s.label} htmlFor="tone-3">Third tone</label>
                      <input id="tone-3" type="text" className={s.input} value={tertiaryTone} onChange={(e) => setTertiaryTone(e.target.value)} />
                    </div>
                    <div className={s.field}>
                      <label className={s.label} htmlFor="weekly-limit">Weekly outreach limit</label>
                      <input id="weekly-limit" type="number" min={0} className={s.input} value={weeklyLimit} onChange={(e) => setWeeklyLimit(e.target.value)} />
                    </div>
                  </div>
                  <div className={s.cardFooter}>
                    <span />
                    <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={actionLoading}>
                      {actionLoading ? <Loader2 size={15} className={s.spin} /> : <Save size={15} />} Save settings
                    </button>
                  </div>
                </form>
              </section>
            )}
          </>
        )}

        {/* API KEY */}
        {keyModalConnector && (
          <Modal
            title={`API key for ${keyModalConnector.name}`}
            icon={<Key size={17} />}
            onClose={() => setKeyModalConnector(null)}
            busy={actionLoading}
            actions={
              <>
                <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={() => setKeyModalConnector(null)} disabled={actionLoading}>Cancel</button>
                <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={handleSaveSecretKey} disabled={actionLoading || !secretKeyInput.trim()}>
                  {actionLoading ? <Loader2 size={15} className={s.spin} /> : <Check size={15} />} Save key
                </button>
              </>
            }
          >
            <div className={s.field}>
              <label className={s.label} htmlFor="secret-key">API key</label>
              <input id="secret-key" type="password" autoComplete="off" autoFocus className={`${s.input} ${s.mono}`} value={secretKeyInput} onChange={(e) => setSecretKeyInput(e.target.value)} placeholder="Paste the key" />
              <span className={s.fieldHint}>Stored in the workspace settings and used when no key is set in .env.</span>
            </div>
          </Modal>
        )}

        {/* SERVICE */}
        {serviceModalOpen && (
          <Modal
            title={editingServiceId ? 'Edit service' : 'Add a service'}
            icon={<Layers size={17} />}
            onClose={() => setServiceModalOpen(false)}
            wide
            actions={
              <>
                <button type="button" className={`${s.btn} ${s.btnSecondary}`} onClick={() => setServiceModalOpen(false)}>Cancel</button>
                <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={handleSaveService}><Save size={15} /> Save service</button>
              </>
            }
          >
            <div className={s.field}>
              <label className={s.label} htmlFor="srv-name">Service name</label>
              <input id="srv-name" type="text" autoFocus className={`${s.input} ${serviceFormErrors.name ? s.inputError : ''}`} value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} placeholder="e.g. AI copilot integration" />
              {serviceFormErrors.name && <span className={s.fieldError}>{serviceFormErrors.name}</span>}
            </div>
            <div className={s.formGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div className={s.field}>
                <label className={s.label} htmlFor="srv-inr">Minimum budget (INR)</label>
                <input id="srv-inr" type="text" className={`${s.input} ${serviceFormErrors.minInr ? s.inputError : ''}`} value={serviceForm.minInr} onChange={(e) => setServiceForm({ ...serviceForm, minInr: e.target.value })} />
                {serviceFormErrors.minInr && <span className={s.fieldError}>{serviceFormErrors.minInr}</span>}
              </div>
              <div className={s.field}>
                <label className={s.label} htmlFor="srv-usd">Minimum budget (USD)</label>
                <input id="srv-usd" type="text" className={`${s.input} ${serviceFormErrors.minUsd ? s.inputError : ''}`} value={serviceForm.minUsd} onChange={(e) => setServiceForm({ ...serviceForm, minUsd: e.target.value })} />
                {serviceFormErrors.minUsd && <span className={s.fieldError}>{serviceFormErrors.minUsd}</span>}
              </div>
            </div>
            <div className={s.field}>
              <label className={s.label} htmlFor="srv-stack">Tech stack (comma separated)</label>
              <input id="srv-stack" type="text" className={`${s.input} ${serviceFormErrors.stack ? s.inputError : ''}`} value={serviceForm.stack} onChange={(e) => setServiceForm({ ...serviceForm, stack: e.target.value })} placeholder="React, Python, Node.js, AWS" />
              {serviceFormErrors.stack && <span className={s.fieldError}>{serviceFormErrors.stack}</span>}
            </div>
            <div className={s.formGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div className={s.field}>
                <label className={s.label} htmlFor="srv-model">Delivery model</label>
                <select id="srv-model" className={s.select} value={serviceForm.model} onChange={(e) => setServiceForm({ ...serviceForm, model: e.target.value })}>
                  {['Fixed Price', 'Dedicated Team', 'Staff Augmentation', 'AI Consulting'].map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                {serviceFormErrors.model && <span className={s.fieldError}>{serviceFormErrors.model}</span>}
              </div>
              <div className={s.field}>
                <label className={s.label} htmlFor="srv-threshold">ICP match threshold (%)</label>
                <input id="srv-threshold" type="number" min={0} max={100} className={`${s.input} ${serviceFormErrors.threshold ? s.inputError : ''}`} value={serviceForm.threshold} onChange={(e) => setServiceForm({ ...serviceForm, threshold: Number(e.target.value) })} />
                {serviceFormErrors.threshold && <span className={s.fieldError}>{serviceFormErrors.threshold}</span>}
              </div>
            </div>
          </Modal>
        )}
      </div>
    </PageShell>
  );
}
