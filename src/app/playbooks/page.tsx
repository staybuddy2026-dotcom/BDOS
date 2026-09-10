'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Inbox,
  CheckCircle,
  AlertCircle,
  Plus,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  BookOpen,
  RefreshCw,
  FolderPlus,
  Eye,
  EyeOff,
  Settings
} from 'lucide-react';

import { 
  getPlaybooks, 
  savePlaybook, 
  duplicatePlaybook, 
  deletePlaybook, 
  togglePlaybookStatus,
  PlaybookData
} from '@/features/playbooks/actions';
import { BreadcrumbHeader } from '@/components/navigation/BreadcrumbHeader';
import '@/styles/globals.css';
import '@/styles/playbooks.css';

type LocalStep = {
  id?: string;
  stepName: string;
  delay: number;
  objective: string;
  tone: string;
  aiInstructions: string;
  enabled: boolean;
};

export default function PlaybooksPage() {
  const [playbooks, setPlaybooks] = useState<PlaybookData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Form Fields
  const [playbookName, setPlaybookName] = useState('');
  const [playbookDescription, setPlaybookDescription] = useState('');
  const [playbookStatus, setPlaybookStatus] = useState('ACTIVE');
  const [playbookDefaultTone, setPlaybookDefaultTone] = useState('Professional');
  const [steps, setSteps] = useState<LocalStep[]>([]);

  // Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const triggerNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Populate form fields with active playbook
  const populateForm = useCallback((pb: PlaybookData) => {
    setPlaybookName(pb.name);
    setPlaybookDescription(pb.description || '');
    setPlaybookStatus(pb.status);
    setPlaybookDefaultTone(pb.defaultTone || 'Professional');
    setSteps(pb.steps.map(step => ({
      id: step.id,
      stepName: step.stepName,
      delay: step.delay,
      objective: step.objective || '',
      tone: step.tone || '',
      aiInstructions: step.aiInstructions || '',
      enabled: step.enabled,
    })));
  }, []);

  // Setup form parameters for a fresh playbook
  const resetFormForNew = useCallback(() => {
    setSelectedId(null);
    setPlaybookName('');
    setPlaybookDescription('');
    setPlaybookStatus('ACTIVE');
    setPlaybookDefaultTone('Professional');
    setSteps([
      {
        stepName: 'Connection Request',
        delay: 0,
        objective: 'Connect with target prospect on LinkedIn',
        tone: 'Professional',
        aiInstructions: 'Personalize based on author headline and post preview.',
        enabled: true,
      }
    ]);
  }, []);

  // Load playbooks data
  const loadData = useCallback(async (selectId?: string) => {
    try {
      const data = await getPlaybooks();
      setPlaybooks(data);
      
      // Auto-select playbook
      if (data.length > 0) {
        const idToSelect = selectId || data[0].id;
        setSelectedId(idToSelect);
        const pb = data.find(p => p.id === idToSelect) || data[0];
        populateForm(pb);
      } else {
        resetFormForNew();
      }
      setDbError(null);
    } catch (err) {
      console.error(err);
      setDbError('Database Connection Warning: Unable to connect to PostgreSQL. Run database migrations to initialize tables.');
    } finally {
      setPageLoading(false);
    }
  }, [populateForm, resetFormForNew]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const handleSelectPlaybook = (id: string) => {
    setSelectedId(id);
    const pb = playbooks.find(p => p.id === id);
    if (pb) {
      populateForm(pb);
    }
  };

  // Playbook Level Actions
  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await togglePlaybookStatus(id, nextStatus);
      setPlaybooks(prev => prev.map(p => p.id === id ? { ...p, status: nextStatus } : p));
      if (selectedId === id) setPlaybookStatus(nextStatus);
      triggerNotification('success', `Playbook status toggled to ${nextStatus}.`);
    } catch {
      triggerNotification('error', 'Failed to toggle status.');
    }
  };

  const handleDuplicatePlaybook = async (id: string) => {
    setActionLoading(true);
    try {
      const copy = await duplicatePlaybook(id);
      triggerNotification('success', 'Playbook duplicated successfully.');
      await loadData(copy.id);
    } catch {
      triggerNotification('error', 'Failed to duplicate playbook.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePlaybook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this playbook? All steps will be deleted.')) return;
    setActionLoading(true);
    try {
      await deletePlaybook(id);
      triggerNotification('success', 'Playbook deleted.');
      
      const remaining = playbooks.filter(p => p.id !== id);
      setPlaybooks(remaining);
      if (remaining.length > 0) {
        handleSelectPlaybook(remaining[0].id);
      } else {
        resetFormForNew();
      }
    } catch {
      triggerNotification('error', 'Failed to delete playbook.');
    } finally {
      setActionLoading(false);
    }
  };

  // Step Level Actions
  const handleAddStep = () => {
    const newStep: LocalStep = {
      stepName: `Outreach Step ${steps.length + 1}`,
      delay: 3,
      objective: '',
      tone: playbookDefaultTone,
      aiInstructions: '',
      enabled: true,
    };
    setSteps(prev => [...prev, newStep]);
  };

  const handleDuplicateStep = (index: number) => {
    const sourceStep = steps[index];
    const clonedStep: LocalStep = {
      stepName: `${sourceStep.stepName} (Copy)`,
      delay: sourceStep.delay,
      objective: sourceStep.objective,
      tone: sourceStep.tone,
      aiInstructions: sourceStep.aiInstructions,
      enabled: sourceStep.enabled,
    };
    
    setSteps(prev => {
      const list = [...prev];
      list.splice(index + 1, 0, clonedStep);
      return list;
    });
    triggerNotification('success', 'Step cloned.');
  };

  const handleDeleteStep = (index: number) => {
    if (steps.length === 1) {
      triggerNotification('error', 'A playbook must contain at least one step.');
      return;
    }
    setSteps(prev => prev.filter((_, idx) => idx !== index));
    triggerNotification('success', 'Step deleted.');
  };

  const handleToggleStepEnabled = (index: number) => {
    setSteps(prev => prev.map((s, idx) => idx === index ? { ...s, enabled: !s.enabled } : s));
  };

  const handleUpdateStepField = (index: number, field: keyof LocalStep, value: string | number | boolean) => {
    setSteps(prev => prev.map((s, idx) => idx === index ? { ...s, [field]: value } : s));
  };

  // Reordering steps (swap index logic)
  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === steps.length - 1) return;

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    setSteps(prev => {
      const list = [...prev];
      const temp = list[index];
      list[index] = list[swapIndex];
      list[swapIndex] = temp;
      return list;
    });
  };

  // Save changes Server Action
  const handleSavePlaybook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playbookName.trim()) {
      triggerNotification('error', 'Playbook name cannot be empty.');
      return;
    }

    setActionLoading(true);
    try {
      const saved = await savePlaybook(
        selectedId,
        {
          name: playbookName,
          description: playbookDescription,
          status: playbookStatus,
          defaultTone: playbookDefaultTone,
        },
        steps
      );

      triggerNotification('success', 'Playbook configuration saved successfully.');
      await loadData(saved.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save playbook configuration.';
      triggerNotification('error', message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="playbooks-page">
      {/* Notifications */}
      {notification && (
        <div className={`notification ${notification.type === 'success' ? 'success' : 'error'}`}>
          {notification.type === 'success' ? <CheckCircle className="notif-icon" /> : <AlertCircle className="notif-icon" />}
          <span>{notification.message}</span>
          <style jsx>{`
            .notification {
              position: fixed;
              top: 24px;
              right: 24px;
              display: flex;
              align-items: center;
              gap: 12px;
              padding: 14px 20px;
              border-radius: 'var(--radius-md)';
              box-shadow: 0 10px 30px rgba(0,0,0,0.5);
              z-index: 1000;
              color: white;
              font-size: 0.9rem;
              animation: fadeIn 0.2s forwards;
            }
            .notification.success { background: 'var(--color-success)'; }
            .notification.error { background: 'var(--color-danger)'; }
            :global(.notif-icon) { width: 18px; height: 18px; }
          `}</style>
        </div>
      )}

      {/* Database connection warnings */}
      {dbError && (
        <div className="db-warning-banner card-glass">
          <AlertCircle className="warning-icon" />
          <div className="warning-content">
            <h4>Database Connectivity Warning</h4>
            <p>{dbError}</p>
          </div>
          <button onClick={() => loadData(selectedId || undefined)} className="icon-btn">
            <RefreshCw className="refresh-icon" />
          </button>
          <style jsx>{`
            .db-warning-banner {
              display: flex;
              align-items: center;
              gap: 'var(--space-md)';
              border-color: rgba(239, 68, 68, 0.2);
              background: rgba(239, 68, 68, 0.05);
            }
            .warning-icon { color: 'var(--color-danger)'; width: 28px; height: 28px; }
            .warning-content h4 { color: 'var(--color-danger)'; margin-bottom: 2px; }
            .warning-content p { font-size: 0.85rem; color: 'var(--text-secondary)'; }
            .refresh-icon { width: 16px; height: 16px; }
          `}</style>
        </div>
      )}

      {/* Top Navigation & Breadcrumb */}
      <BreadcrumbHeader
        currentTitle="Outreach Playbooks & Cadences"
        badge="Multi-Step Sequence Templates"
      />

      <div className="page-header">
        <div className="header-title">
          <h2>Outreach Playbooks</h2>
          <p>Configure multi-step outreach schedules and AI guidelines matching target tones.</p>
        </div>
        <button 
          onClick={resetFormForNew} 
          className="btn-primary" 
          style={{ gap: '6px' }}
          disabled={pageLoading}
        >
          <FolderPlus size={16} /> Add Playbook
        </button>
      </div>

      <div className="playbooks-workspace">
        
        {/* Left Side List */}
        <div className="playbooks-list-panel">
          <div className="playbooks-scroll">
            {pageLoading ? (
              <div className="empty-state card-glass">
                <RefreshCw className="empty-icon animate-spin" />
                <p>Loading Playbooks...</p>
              </div>
            ) : playbooks.length === 0 ? (
              <div className="empty-state card-glass">
                <Inbox className="empty-icon" />
                <h4>No Playbooks found</h4>
                <p>Click Add Playbook on the top right to start building outreach templates.</p>
              </div>
            ) : (
              playbooks.map((pb) => {
                const isActive = pb.id === selectedId;
                const activeStepsCount = pb.steps.filter(s => s.enabled).length;

                return (
                  <div 
                    key={pb.id} 
                    onClick={() => handleSelectPlaybook(pb.id)}
                    className={`playbook-list-card card-glass ${isActive ? 'border-[var(--accent-indigo)] bg-[var(--accent-indigo-glow)] shadow-[0_0_12px_rgba(0,208,156,0.15)]' : ''}`}
                  >
                    <div className="playbook-card-header">
                      <span className="playbook-text-[0.85rem] font-semibold text-[var(--text-primary)]">{pb.name}</span>
                      <span 
                        className={`badge ${pb.status === 'ACTIVE' ? 'badge-indigo' : 'badge-danger'}`}
                        style={{ fontSize: '0.65rem', padding: '1px 5px' }}
                      >
                        {pb.status}
                      </span>
                    </div>

                    <p className="playbook-card-desc">{pb.description || 'No description provided.'}</p>

                    <div className="playbook-card-footer">
                      <span>{activeStepsCount} of {pb.steps.length} Steps Active</span>
                      <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => handleDuplicatePlaybook(pb.id)} 
                          className="icon-btn" 
                          title="Duplicate playbook"
                        >
                          <Copy size={12} />
                        </button>
                        <button 
                          onClick={() => handleDeletePlaybook(pb.id)} 
                          className="icon-btn text-danger" 
                          title="Delete playbook"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Detailed Playbook config editor */}
        <div className="playbook-editor-panel card-glass" style={{ background: 'rgba(15, 22, 38, 0.25)' }}>
          <form onSubmit={handleSavePlaybook} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            
            <div className="editor-form-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={20} style={{ color: 'var(--accent-indigo)' }} /> 
                {selectedId ? 'Edit Playbook' : 'New Playbook'}
              </h3>
              
              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                {selectedId && (
                  <button 
                    type="button"
                    onClick={() => handleToggleStatus(selectedId, playbookStatus)}
                    className={playbookStatus === 'ACTIVE' ? 'btn-danger-outline' : 'btn-primary'}
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    {playbookStatus === 'ACTIVE' ? 'Disable Playbook' : 'Enable Playbook'}
                  </button>
                )}
                <button 
                  type="submit" 
                  disabled={actionLoading || !playbookName.trim()} 
                  className="btn-primary"
                  style={{ padding: '6px 16px', fontSize: '0.8rem' }}
                >
                  {actionLoading ? 'Saving config...' : 'Save Configuration'}
                </button>
              </div>
            </div>

            {/* Playbook info fields */}
            <div className="step-fields-grid">
              <div className="form-group">
                <label>Playbook Name</label>
                <input 
                  type="text" 
                  value={playbookName}
                  onChange={(e) => setPlaybookName(e.target.value)}
                  placeholder="e.g., Enterprise Software Pitch"
                  className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-[var(--text-primary)] text-[0.82rem] outline-none transition-all duration-200 w-full box-border placeholder:text-slate-400 focus:border-[var(--accent-indigo)] focus:shadow-[0_0_0_3px_rgba(0,208,156,0.15)] focus:bg-white"
                  required
                />
              </div>

              <div className="form-group">
                <label>Default AI Generation Tone</label>
                <select 
                  value={playbookDefaultTone}
                  onChange={(e) => setPlaybookDefaultTone(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-[var(--text-primary)] text-[0.82rem] outline-none transition-all duration-200 w-full box-border placeholder:text-slate-400 focus:border-[var(--accent-indigo)] focus:shadow-[0_0_0_3px_rgba(0,208,156,0.15)] focus:bg-white text-[var(--text-primary)] cursor-pointer"
                >
                  <option value="Professional">Professional (Consultative)</option>
                  <option value="Casual">Casual (Friendly)</option>
                  <option value="Insightful">Insightful (Expert/Teardown)</option>
                  <option value="Direct">Direct (Short Pitch)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea 
                value={playbookDescription}
                onChange={(e) => setPlaybookDescription(e.target.value)}
                placeholder="Describe when and how to apply this multi-step campaign playbook..."
                className="step-textarea"
                style={{ minHeight: '60px' }}
              />
            </div>

            {/* Steps Section */}
            <div style={{ marginTop: 'var(--space-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Settings size={16} /> Campaign Sequence ({steps.length} Steps)
                </h4>
                <button 
                  type="button" 
                  onClick={handleAddStep}
                  className="btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '4px' }}
                >
                  <Plus size={12} /> Add Sequence Step
                </button>
              </div>

              {/* Dynamic steps cards list */}
              <div className="steps-container">
                {steps.map((step, index) => (
                  <div 
                    key={index} 
                    className={`step-edit-card ${!step.enabled ? 'disabled-step' : ''}`}
                  >
                    
                    {/* Step Card Header */}
                    <div className="step-card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="step-badge">{index + 1}</span>
                        <input 
                          type="text" 
                          value={step.stepName}
                          onChange={(e) => handleUpdateStepField(index, 'stepName', e.target.value)}
                          placeholder="Step Name (e.g. InMail pitch)"
                          className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-[var(--text-primary)] text-[0.82rem] outline-none transition-all duration-200 w-full box-border placeholder:text-slate-400 focus:border-[var(--accent-indigo)] focus:shadow-[0_0_0_3px_rgba(0,208,156,0.15)] focus:bg-white"
                          style={{ border: 'none', background: 'transparent', padding: 0, fontSize: '0.95rem', fontWeight: 600, width: '220px', boxShadow: 'none' }}
                          required
                        />
                      </div>

                      <div className="step-header-actions">
                        <button 
                          type="button" 
                          onClick={() => handleToggleStepEnabled(index)} 
                          className="icon-btn"
                          title={step.enabled ? 'Disable Step' : 'Enable Step'}
                        >
                          {step.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                        <button 
                          type="button" 
                          onClick={() => handleMoveStep(index, 'up')}
                          disabled={index === 0}
                          className="icon-btn"
                          title="Move up"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => handleMoveStep(index, 'down')}
                          disabled={index === steps.length - 1}
                          className="icon-btn"
                          title="Move down"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => handleDuplicateStep(index)}
                          className="icon-btn"
                          title="Duplicate Step"
                        >
                          <Copy size={14} />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => handleDeleteStep(index)}
                          className="icon-btn text-danger"
                          title="Delete Step"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Step Details Form Fields */}
                    <div className="step-fields-grid">
                      <div className="form-group">
                        <label>Delay (Days after previous action)</label>
                        <input 
                          type="number" 
                          min="0"
                          value={step.delay}
                          onChange={(e) => handleUpdateStepField(index, 'delay', parseInt(e.target.value) || 0)}
                          className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-[var(--text-primary)] text-[0.82rem] outline-none transition-all duration-200 w-full box-border placeholder:text-slate-400 focus:border-[var(--accent-indigo)] focus:shadow-[0_0_0_3px_rgba(0,208,156,0.15)] focus:bg-white"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>AI Writing Tone Override</label>
                        <select 
                          value={step.tone || ''}
                          onChange={(e) => handleUpdateStepField(index, 'tone', e.target.value)}
                          className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-[var(--text-primary)] text-[0.82rem] outline-none transition-all duration-200 w-full box-border placeholder:text-slate-400 focus:border-[var(--accent-indigo)] focus:shadow-[0_0_0_3px_rgba(0,208,156,0.15)] focus:bg-white text-[var(--text-primary)] cursor-pointer"
                        >
                          <option value="">Use Playbook default ({playbookDefaultTone})</option>
                          <option value="Professional">Professional</option>
                          <option value="Casual">Casual</option>
                          <option value="Insightful">Insightful</option>
                          <option value="Direct">Direct</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>AI Objective (Describe what this step accomplishes)</label>
                      <input 
                        type="text" 
                        value={step.objective}
                        onChange={(e) => handleUpdateStepField(index, 'objective', e.target.value)}
                        placeholder="e.g. Pitch a 15 min review audit call or request connection."
                        className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-[var(--text-primary)] text-[0.82rem] outline-none transition-all duration-200 w-full box-border placeholder:text-slate-400 focus:border-[var(--accent-indigo)] focus:shadow-[0_0_0_3px_rgba(0,208,156,0.15)] focus:bg-white"
                      />
                    </div>

                    <div className="form-group">
                      <label>AI Prompt Instructions (Specific copy guidelines/rules)</label>
                      <textarea 
                        value={step.aiInstructions}
                        onChange={(e) => handleUpdateStepField(index, 'aiInstructions', e.target.value)}
                        placeholder="e.g., Do not mention pricing details. Focus strictly on their scaling issues and mention their company name explicitly."
                        className="step-textarea"
                      />
                    </div>

                  </div>
                ))}
              </div>

              {steps.length > 0 && (
                <div className="add-step-btn-container">
                  <button 
                    type="button" 
                    onClick={handleAddStep}
                    className="btn-secondary"
                    style={{ gap: '6px' }}
                  >
                    <Plus size={14} /> Add Sequence Step
                  </button>
                </div>
              )}
            </div>

          </form>
        </div>

      </div>

    </div>
  );
}
