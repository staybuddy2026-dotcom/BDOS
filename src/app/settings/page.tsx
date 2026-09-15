'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getAppSettings,
  updateAppSettings
} from '@/features/learning/actions';
import {
  Save,
  CheckCircle,
  AlertTriangle,
  Settings,
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
  X,
  Check
} from 'lucide-react';
import {
  getMarketplaceConnectors,
  getMarketplaceSettings,
  testConnectorConnection,
  ConnectorCardItem,
  MarketplaceSettingsConfig
} from '@/features/connectors/actions';
import { BreadcrumbHeader } from '@/components/navigation/BreadcrumbHeader';
import { CustomDropdown } from '@/components/CustomDropdown';
import blob from '@/assets/blob.png';
import '@/styles/globals.css';
import '@/styles/settings.css';

export interface ServiceItem {
  id: string;
  name: string;
  minInr: string;
  minUsd: string;
  stack: string;
  model: string;
  threshold: number;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'connectors' | 'service-catalog' | 'apollo' | 'github' | 'crunchbase' | 'linkedin' | 'prioritization' | 'outreach' | 'general'>('connectors');

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

  // Secret Key Configuration Modal State
  const [keyModalConnector, setKeyModalConnector] = useState<{ id: string; name: string } | null>(null);
  const [secretKeyInput, setSecretKeyInput] = useState('');

  // Service Catalog CRUD State
  const [services, setServices] = useState<ServiceItem[]>([
    { id: '1', name: 'AI, Machine Learning & LLM Systems', minInr: '₹35,00,000', minUsd: '$45,000', stack: 'TensorFlow, PyTorch, Python, OpenCV, Hugging Face, LangChain, LLAMA, Pandas, Scikit-learn, Numpy, AWS SageMaker, Google Vertex AI', model: 'AI Consulting', threshold: 85 },
    { id: '2', name: 'Native & Cross-Platform Mobile Applications', minInr: '₹25,00,000', minUsd: '$30,000', stack: 'Swift, SwiftUI, Kotlin, Jetpack, Flutter, React Native, Firebase, GraphQL, Xcode, Android Studio, App Store, Google Play', model: 'Dedicated Team', threshold: 80 },
    { id: '3', name: 'Modern Web Architecture & Web Platforms', minInr: '₹25,00,000', minUsd: '$30,000', stack: 'HTML5, CSS3, JavaScript, React, Next.js, Vue.js, TypeScript, Node.js, Express, MongoDB, PostgreSQL, WordPress, Shopify', model: 'Dedicated Team', threshold: 80 },
    { id: '4', name: 'Enterprise Backend, Cloud & DevOps Infrastructure', minInr: '₹30,00,000', minUsd: '$38,000', stack: 'Python, Django, C#, C++, .NET, AWS, Azure, Docker, Kubernetes, PostgreSQL, MongoDB', model: 'Fixed Price', threshold: 80 },
    { id: '5', name: 'E-Commerce Platforms & Headless Digital Retail', minInr: '₹20,00,000', minUsd: '$25,000', stack: 'Shopify, WooCommerce, BigCommerce, Magento, React', model: 'Staff Augmentation', threshold: 75 },
    { id: '6', name: 'UI/UX Design Systems & Product Prototyping', minInr: '₹15,00,000', minUsd: '$18,000', stack: 'Figma, Adobe XD, HTML5, CSS3', model: 'Fixed Price', threshold: 70 },
  ]);

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

  // Connector Manager State
  const [connectors, setConnectors] = useState<ConnectorCardItem[]>([]);
  const [, setMarketplaceSettings] = useState<MarketplaceSettingsConfig | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [dbWarning, setDbWarning] = useState(false);

  const triggerNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

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
      setApolloApiKey(data.apolloApiKey || 'ap_live_98a7f432194b2');

      const connList = await getMarketplaceConnectors();
      setConnectors(connList);

      const mSettings = await getMarketplaceSettings();
      setMarketplaceSettings(mSettings);
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
        apolloApiKey
      });

      if (res.success) {
        triggerNotification('success', 'Application settings & API credentials updated successfully!');
      } else {
        triggerNotification('error', 'Failed to save settings.');
      }
    } catch {
      triggerNotification('success', 'Configuration settings updated locally.');
    } finally {
      setActionLoading(false);
    }
  };

  // Secret Key Save Modal Handler
  const handleSaveSecretKey = async () => {
    if (!keyModalConnector || !secretKeyInput.trim()) return;
    if (keyModalConnector.id !== 'apollo') {
      triggerNotification('error', `${keyModalConnector.name} is coming soon and does not accept credentials yet.`);
      setKeyModalConnector(null);
      setSecretKeyInput('');
      return;
    }
    setActionLoading(true);
    try {
      setApolloApiKey(secretKeyInput);
      await updateAppSettings({
        primaryTone, secondaryTone, tertiaryTone, activeModel, weeklyLimit,
        apolloEnabled, apolloConfirmRequired, apolloMaxEnrich, apolloAllowPersonalEmail,
        apolloAllowPhone, apolloCreditWarningThreshold, apolloApiKey: secretKeyInput
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
    setServiceModalOpen(true);
  };

  const handleSaveService = () => {
    if (!serviceForm.name.trim()) {
      triggerNotification('error', 'Please enter a valid service name.');
      return;
    }

    if (editingServiceId) {
      setServices(prev => prev.map(s => s.id === editingServiceId ? { ...s, ...serviceForm } : s));
      triggerNotification('success', `Updated service: ${serviceForm.name}`);
    } else {
      const newSrv: ServiceItem = {
        id: `srv_${Date.now()}`,
        ...serviceForm
      };
      setServices(prev => [...prev, newSrv]);
      triggerNotification('success', `Added new service: ${serviceForm.name}`);
    }
    setServiceModalOpen(false);
  };

  const handleDeleteService = (id: string, name: string) => {
    setServices(prev => prev.filter(s => s.id !== id));
    triggerNotification('success', `Deleted service: ${name}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc', overflow: 'hidden' }}>
      {/* Notifications */}
      {notification && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 999999, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: `2px solid ${notification.type === 'success' ? 'var(--accent-indigo)' : 'var(--color-warning)'}`, padding: '14px 22px', borderRadius: '12px', boxShadow: '0 12px 32px rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', fontWeight: 700 }}>
          {notification.type === 'success' ? <CheckCircle size={20} style={{ color: 'var(--accent-indigo)' }} /> : <AlertTriangle size={20} style={{ color: 'var(--color-warning)' }} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Database Warning */}
      {dbWarning && (
        <div style={{ background: '#fef3c7', color: '#d97706', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 600, borderBottom: '1px solid #fde68a' }}>
          <Info size={16} />
          <span>Local database warning: Running settings under offline fallback modes.</span>
        </div>
      )}

      {/* FULL WIDTH STICKY HEADER */}
      {/* FULL WIDTH STICKY HEADER */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        borderBottom: '1px solid #e2e8f0',
        height: '65px',
        flexShrink: 0,
        padding: '0 28px',
        background: '#ffffff',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: 'linear-gradient(135deg, #4f46e5, #2563eb)', padding: '10px', borderRadius: '8px', boxShadow: '0 4px 16px rgba(37, 99, 235, 0.3)' }}>
            <Settings size={18} style={{ color: '#ffffff' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, background: 'linear-gradient(135deg, #0f172a, #2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
              Application & Core Provider Settings
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#8ba0cb', fontWeight: 600, letterSpacing: '0.03em', marginTop: '4px', margin: 0 }}>
              Manage Apollo.io, LinkedIn, Crunchbase, and GitHub Integrations, API Keys, Service Catalog & AI Models.
            </p>
          </div>
        </div>
      </div>

      {/* SCROLLABLE MAIN CONTENT */}
      <div 
        className="dashboard-scrollable-content" 
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          boxSizing: 'border-box', 
          position: 'relative', 
          padding: '20px 28px 40px 28px',
          backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.6), rgba(248, 250, 252, 0.6)), url(${blob.src})`,
          backgroundSize: 'cover',
          backgroundPosition: 'top right',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
        <div style={{ paddingBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <BreadcrumbHeader
            currentTitle="Settings & Provider Configuration"
            badge="Integrations & AI Setup"
          />
        </div>

      {/* TAB NAVIGATION */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '14px 0 20px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
        <button
          onClick={() => setActiveTab('connectors')}
          style={{
            padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700,
            border: activeTab === 'connectors' ? '1px solid #3b82f6' : '1px solid transparent',
            background: activeTab === 'connectors' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
            color: activeTab === 'connectors' ? '#2563eb' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
          }}
        >
          <Activity size={15} /> V1 Core Providers ({connectors.length})
        </button>

        <button
          onClick={() => setActiveTab('service-catalog')}
          style={{
            padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700,
            border: activeTab === 'service-catalog' ? '1px solid #3b82f6' : '1px solid transparent',
            background: activeTab === 'service-catalog' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
            color: activeTab === 'service-catalog' ? '#2563eb' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
          }}
        >
          <Layers size={15} /> Service Catalog (CRUD)
        </button>

        <button
          onClick={() => setActiveTab('apollo')}
          style={{
            padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700,
            border: activeTab === 'apollo' ? '1px solid #3b82f6' : '1px solid transparent',
            background: activeTab === 'apollo' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
            color: activeTab === 'apollo' ? '#2563eb' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
          }}
        >
          <Key size={15} /> Apollo.io Secret Key & Settings
        </button>

        <button
          onClick={() => setActiveTab('linkedin')}
          style={{
            padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700,
            border: activeTab === 'linkedin' ? '1px solid #3b82f6' : '1px solid transparent',
            background: activeTab === 'linkedin' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
            color: activeTab === 'linkedin' ? '#2563eb' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
          }}
        >
          <Share2 size={15} /> LinkedIn Settings
        </button>

        <button
          onClick={() => setActiveTab('crunchbase')}
          style={{
            padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700,
            border: activeTab === 'crunchbase' ? '1px solid #3b82f6' : '1px solid transparent',
            background: activeTab === 'crunchbase' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
            color: activeTab === 'crunchbase' ? '#2563eb' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
          }}
        >
          <TrendingUp size={15} /> Crunchbase Settings
        </button>

        <button
          onClick={() => setActiveTab('github')}
          style={{
            padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700,
            border: activeTab === 'github' ? '1px solid #3b82f6' : '1px solid transparent',
            background: activeTab === 'github' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
            color: activeTab === 'github' ? '#2563eb' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
          }}
        >
          <Activity size={15} /> GitHub Settings
        </button>

        <button
          onClick={() => setActiveTab('prioritization')}
          style={{
            padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700,
            border: activeTab === 'prioritization' ? '1px solid #3b82f6' : '1px solid transparent',
            background: activeTab === 'prioritization' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
            color: activeTab === 'prioritization' ? '#2563eb' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
          }}
        >
          <Flame size={15} /> AI Account Prioritization
        </button>

        <button
          onClick={() => setActiveTab('outreach')}
          style={{
            padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700,
            border: activeTab === 'outreach' ? '1px solid #3b82f6' : '1px solid transparent',
            background: activeTab === 'outreach' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
            color: activeTab === 'outreach' ? '#2563eb' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
          }}
        >
          <Send size={15} /> Outreach Templates
        </button>

        <button
          onClick={() => setActiveTab('general')}
          style={{
            padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700,
            border: activeTab === 'general' ? '1px solid #3b82f6' : '1px solid transparent',
            background: activeTab === 'general' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
            color: activeTab === 'general' ? '#2563eb' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
          }}
        >
          <Sliders size={15} /> AI Tone & Model
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px auto', display: 'block', color: 'var(--accent-violet)' }} />
          Loading Provider Configurations...
        </div>
      ) : (
        <div>
          {/* V1 CORE PROVIDERS TAB */}
          {activeTab === 'connectors' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} style={{ color: '#2563eb' }} /> Production V1 Core Provider Registry & Secret Keys
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                {connectors.map((c) => (
                  <div
                    key={c.id}
                    style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                          {c.name}
                        </span>
                        <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '6px', background: c.status === 'Connected' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: c.status === 'Connected' ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                          {c.status}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.82rem', color: '#2563eb', fontWeight: 700, marginBottom: '6px' }}>
                        Masked Key: <span style={{ fontFamily: 'monospace', color: '#64748b' }}>{c.apiKeyMasked}</span>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <span>⏱️ Latency: <strong style={{ color: '#0f172a' }}>{c.responseMs}ms</strong></span>
                        <span>📦 Ingested Today: <strong style={{ color: '#10b981' }}>{c.importedToday}</strong></span>
                      </div>

                      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '6px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Capabilities Matrix</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {c.capabilities.liveSync && <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', fontWeight: 700 }}>Live Sync</span>}
                          {c.capabilities.aiQualification && <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 700 }}>AI Qualify</span>}
                          {c.capabilities.contactEnrichment && <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontWeight: 700 }}>Contact Enrich</span>}
                          {c.capabilities.techExtraction && <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', fontWeight: 700 }}>Tech Stack</span>}
                        </div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button
                        onClick={() => {
                          setKeyModalConnector({ id: c.id, name: c.name });
                          setSecretKeyInput(c.id === 'apollo' ? apolloApiKey : '');
                        }}
                        disabled={c.id !== 'apollo'}
                        title={c.id !== 'apollo' ? `${c.name} is coming soon` : undefined}
                        style={{ padding: '6px 12px', fontSize: '0.82rem', background: c.id !== 'apollo' ? 'rgba(100, 116, 139, 0.1)' : 'rgba(37, 99, 235, 0.1)', color: c.id !== 'apollo' ? '#94a3b8' : '#2563eb', border: c.id !== 'apollo' ? '1px solid rgba(100, 116, 139, 0.15)' : '1px solid rgba(37, 99, 235, 0.2)', borderRadius: '6px', cursor: c.id !== 'apollo' ? 'not-allowed' : 'pointer', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Key size={14} /> Configure Key
                      </button>

                      <button
                        onClick={() => handleTestConnector(c.id)}
                        disabled={testingId === c.id}
                        style={{ padding: '6px 12px', fontSize: '0.82rem', background: 'transparent', color: '#2563eb', border: '1px solid rgba(37, 99, 235, 0.3)', borderRadius: '6px', cursor: 'pointer', fontWeight: 800 }}
                      >
                        {testingId === c.id ? 'Testing...' : 'Test Connection'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SERVICE CATALOG TAB (WITH FULL CRUD EDIT & DELETE) */}
          {activeTab === 'service-catalog' && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={18} style={{ color: '#3b82f6' }} /> Configurable Service Catalog & AI ICP Engine Matcher
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: '#64748b', margin: '4px 0 0 0' }}>
                    Manage Tiny Script Soft Tech service offerings. The AI ICP Matcher dynamically evaluates incoming leads against these services.
                  </p>
                </div>
                <button onClick={handleOpenAddService} style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.76rem', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', color: '#ffffff', fontWeight: 800, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)' }}>
                  <Plus size={15} /> Add Custom Service
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
                {services.map((srv) => (
                  <div key={srv.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>{srv.name}</span>
                        <span style={{ fontSize: '0.68rem', background: '#eff6ff', color: '#3b82f6', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, whiteSpace: 'nowrap', border: '1px solid #bfdbfe' }}>
                          Min: {srv.minInr} ({srv.minUsd})
                        </span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '6px' }}><strong style={{ color: '#334155' }}>Tech Stack:</strong> {srv.stack}</div>
                      <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700, marginTop: '4px' }}>Model: {srv.model} • ICP Confidence: {srv.threshold}%</div>
                    </div>

                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button onClick={() => handleOpenEditService(srv)} style={{ padding: '6px 12px', fontSize: '0.72rem', background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Edit2 size={12} /> Edit
                      </button>
                      <button onClick={() => handleDeleteService(srv.id, srv.name)} style={{ padding: '6px 12px', fontSize: '0.72rem', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: APOLLO.IO SECRET KEY & PROVIDER SETTINGS */}
          {activeTab === 'apollo' && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={18} style={{ color: '#3b82f6' }} /> Apollo.io Direct API Secret Key & Enrichment Rules
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Apollo API Secret Key (`APOLLO_API_KEY`)</label>
                  <input
                    type="password"
                    value={apolloApiKey}
                    onChange={(e) => setApolloApiKey(e.target.value)}
                    placeholder="ap_live_xxxxxxxxxxxxxxxx"
                    style={{ width: '100%', padding: '8px 12px', fontSize: '0.82rem', fontFamily: 'monospace', background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                  />
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>Update your live Apollo B2B REST API Key here. Saved securely to database.</span>
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Apollo Integration Status</label>
                  <CustomDropdown
                    value={apolloEnabled}
                    onChange={(value) => setApolloEnabled(value)}
                    options={[
                      { value: 'true', label: 'Enabled (Active B2B Enrichment)' },
                      { value: 'false', label: 'Disabled' }
                    ]}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Max Auto-Enrichment Batch Limit</label>
                  <input
                    type="number"
                    value={apolloMaxEnrich}
                    onChange={(e) => setApolloMaxEnrich(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Credit Warning Safety Threshold</label>
                  <input
                    type="number"
                    value={apolloCreditWarningThreshold}
                    onChange={(e) => setApolloCreditWarningThreshold(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0' }}
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {(() => {
                  const apolloConnector = connectors.find(c => c.id === 'apollo');
                  const isConnected = apolloConnector?.status === 'Connected';
                  return (
                    <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      Status: <strong style={{ color: isConnected ? '#10b981' : '#d97706' }}>
                        {isConnected ? 'Apollo Direct API Connected' : (apolloConnector?.status || 'Not Connected')}
                      </strong>
                    </span>
                  );
                })()}
                <button
                  onClick={() => handleSaveConfig()}
                  disabled={actionLoading}
                  className="btn-primary"
                  style={{ padding: '8px 18px', fontSize: '0.78rem', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', color: '#ffffff', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 800, boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)' }}
                >
                  <Save size={14} /> Save Apollo API Credentials
                </button>
              </div>
            </div>
          )}

          {/* TAB: LINKEDIN SETTINGS */}
          {activeTab === 'linkedin' && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Share2 size={18} style={{ color: '#3b82f6' }} /> LinkedIn Social Intelligence Configuration
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '14px 16px', borderRadius: '8px', background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                <div style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
                  <strong>Coming Soon.</strong> LinkedIn is not yet a live integration in this release — no credentials are configured and no data is fetched from LinkedIn. Use <strong>Apollo.io</strong> for live prospecting today.
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Status: <strong style={{ color: '#d97706' }}>Coming Soon</strong></span>
              </div>
            </div>
          )}

          {/* TAB: CRUNCHBASE SETTINGS */}
          {activeTab === 'crunchbase' && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} style={{ color: '#3b82f6' }} /> Crunchbase Growth Intelligence Configuration
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '14px 16px', borderRadius: '8px', background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                <div style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
                  <strong>Coming Soon.</strong> Crunchbase is not yet a live integration in this release — no credentials are configured and no data is fetched from Crunchbase. Use <strong>Apollo.io</strong> for live prospecting today.
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Status: <strong style={{ color: '#d97706' }}>Coming Soon</strong></span>
              </div>
            </div>
          )}

          {/* TAB: GITHUB SETTINGS */}
          {activeTab === 'github' && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} style={{ color: '#3b82f6' }} /> GitHub Engineering Intelligence Provider Configuration
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '14px 16px', borderRadius: '8px', background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                <div style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
                  <strong>Coming Soon.</strong> GitHub is not yet a live integration in this release — no credentials are configured and no data is fetched from GitHub. Use <strong>Apollo.io</strong> for live prospecting today.
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Status: <strong style={{ color: '#d97706' }}>Coming Soon</strong></span>
              </div>
            </div>
          )}

          {/* TAB: ACCOUNT PRIORITIZATION SETTINGS */}
          {activeTab === 'prioritization' && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Flame size={18} style={{ color: '#3b82f6' }} /> AI Account Prioritization Engine & Weighting Model
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Intelligence Weighting Model</label>
                  <div style={{ fontSize: '0.76rem', color: '#64748b', background: '#ffffff', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '6px' }}>
                    Apollo (100%) — Crunchbase, GitHub & LinkedIn signals coming soon
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Immediate Action Threshold</label>
                  <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', fontSize: '0.82rem', fontWeight: 700 }}>
                    Score &ge; 90 (🔥 Immediate Contact Today Tier)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: OUTREACH SETTINGS */}
          {activeTab === 'outreach' && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={18} style={{ color: '#3b82f6' }} /> AI Outreach Generation, Branding & Email Signatures
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Default BDE Email Signature</label>
                <input
                  type="text"
                  defaultValue="Akash | BD Owner | Tiny Script Soft Tech Pvt. Ltd. (akash@tinyscript.com)"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', fontSize: '0.8rem', background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0' }}
                />
              </div>
            </div>
          )}

          {/* TAB: GENERAL SETTINGS */}
          {activeTab === 'general' && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={18} style={{ color: '#3b82f6' }} /> Campaign & AI Model Parameters
              </div>

              <form onSubmit={handleSaveConfig} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Active Gemini Model</label>
                  <CustomDropdown
                    value={activeModel}
                    onChange={(value) => setActiveModel(value)}
                    options={[
                      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Fast, Cost-Effective)' },
                      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Deep Reasoning)' },
                    ]}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Primary Outreach Tone</label>
                  <input
                    type="text"
                    value={primaryTone}
                    onChange={(e) => setPrimaryTone(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0' }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #e2e8f0', paddingTop: '14px', marginTop: '4px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" disabled={actionLoading} className="btn-primary" style={{ padding: '8px 18px', fontSize: '0.78rem', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', color: '#ffffff', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 800, boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)' }}>
                    <Save size={14} /> Save Configuration
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* CONFIGURE SECRET KEY MODAL */}
      {keyModalConnector && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Key size={16} style={{ color: '#3b82f6' }} /> Configure API Secret Key: {keyModalConnector.name}
              </h3>
              <button onClick={() => setKeyModalConnector(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div>
              <label style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                New API Secret Key
              </label>
              <input
                type="password"
                value={secretKeyInput}
                onChange={(e) => setSecretKeyInput(e.target.value)}
                placeholder="Enter live API secret key..."
                style={{ width: '100%', padding: '10px', borderRadius: '6px', fontSize: '0.85rem', fontFamily: 'monospace', background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setKeyModalConnector(null)} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.78rem' }}>Cancel</button>
              <button onClick={handleSaveSecretKey} disabled={actionLoading} className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.78rem', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', color: '#ffffff', fontWeight: 800, border: 'none' }}>
                <Check size={14} /> Update Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SERVICE CATALOG ADD/EDIT MODAL */}
      {serviceModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={20} style={{ color: '#3b82f6' }} /> {editingServiceId ? 'Edit Service Offering' : 'Add New Service Offering'}
              </h3>
              <button onClick={() => setServiceModalOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Service Name</label>
                <input
                  type="text"
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                  placeholder="e.g. AI Copilot Integration & Fullstack Dev"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', outline: 'none', transition: 'border-color 0.2s' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Min Budget (INR)</label>
                  <input
                    type="text"
                    value={serviceForm.minInr}
                    onChange={(e) => setServiceForm({ ...serviceForm, minInr: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Min Budget (USD)</label>
                  <input
                    type="text"
                    value={serviceForm.minUsd}
                    onChange={(e) => setServiceForm({ ...serviceForm, minUsd: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Target Tech Stack (Comma Separated)</label>
                <input
                  type="text"
                  value={serviceForm.stack}
                  onChange={(e) => setServiceForm({ ...serviceForm, stack: e.target.value })}
                  placeholder="React 19, Python, Node.js, AWS"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Delivery Model</label>
                  <CustomDropdown
                    value={serviceForm.model}
                    onChange={(value) => setServiceForm({ ...serviceForm, model: value })}
                    options={[
                      { value: 'Fixed Price', label: 'Fixed Price' },
                      { value: 'Dedicated Team', label: 'Dedicated Team' },
                      { value: 'Staff Augmentation', label: 'Staff Augmentation' },
                      { value: 'AI Consulting', label: 'AI Consulting' }
                    ]}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 700, display: 'block', marginBottom: '6px' }}>ICP Match Confidence (%)</label>
                  <input
                    type="number"
                    value={serviceForm.threshold}
                    onChange={(e) => setServiceForm({ ...serviceForm, threshold: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button onClick={() => setServiceModalOpen(false)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.86rem', fontWeight: 600, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSaveService} className="btn-primary" style={{ padding: '8px 18px', fontSize: '0.86rem', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', color: '#ffffff', fontWeight: 800, border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)' }}>
                <Save size={16} /> Save Service
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
