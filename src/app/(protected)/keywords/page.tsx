'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePageState } from '@/lib/usePageState';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Star, 
  Download, 
  Upload, 
  AlertCircle, 
  CheckCircle,
  FileSpreadsheet,
  X,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Zap,
  HelpCircle,
  Home,
  ChevronRight,
  RotateCcw,
  Layers,
  Tag,
  Activity
} from 'lucide-react';

import { 
  getKeywords, 
  addKeyword, 
  updateKeyword, 
  deleteKeyword, 
  bulkToggleStatus, 
  bulkDeleteKeywords,
  KeywordData 
} from '@/features/keywords/actions';
import { validateBooleanQuery } from '@/features/keywords/validation';
import { Priority, KeywordStatus } from '@prisma/client';
import { CustomDropdown } from '@/components/CustomDropdown';
import blob from '@/assets/blob.png';
import '@/styles/keywords.css';

// Curated high-intent starter packs for B2B discovery
const STARTER_PACKS = [
  {
    icon: '🚀',
    name: 'B2B SaaS & Tech Intent',
    category: 'Sales Intent',
    priority: Priority.HIGH,
    query: '("AI SaaS" OR "B2B Software") AND ("looking for" OR "recommendations")',
    description: 'Catches LinkedIn posts asking for software recommendations and tools.'
  },
  {
    icon: '💼',
    name: 'Executive Decision Makers',
    category: 'Leadership',
    priority: Priority.HIGH,
    query: '("VP of Sales" OR "Head of Growth" OR "Chief Revenue Officer") NOT "Intern"',
    description: 'Finds key sales & growth executives announcing role transitions or team scale.'
  },
  {
    icon: '📈',
    name: 'Sales Hiring & Expansion',
    category: 'Growth Signals',
    priority: Priority.HIGH,
    query: '("Expanding sales team" OR "Hiring BDE" OR "Outbound lead generation")',
    description: 'Pinpoints companies actively building outbound infrastructure.'
  },
  {
    icon: '🏥',
    name: 'HealthTech & MedTech Niche',
    category: 'Industry Niche',
    priority: Priority.MEDIUM,
    query: '("HealthTech" OR "Digital Health") AND ("Series A" OR "Seed funding")',
    description: 'Monitors early-stage healthcare software rounds and scaling signals.'
  }
];

export default function KeywordsPage() {
  // Database state
  const [keywords, setKeywords] = useState<KeywordData[]>([]);
  const [dbError, setDbError] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  // Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [keywordText, setKeywordText] = useState('');
  const [categoryText, setCategoryText] = useState('');
  const [priorityValue, setPriorityValue] = useState<Priority>(Priority.MEDIUM);
  const [isFavoriteCheck, setIsFavoriteCheck] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Open modal for new creation
  const handleOpenCreateModal = (initialQuery?: string, initialCat?: string, initialPriority?: Priority) => {
    setEditId(null);
    setKeywordText(initialQuery || '');
    setCategoryText(initialCat || '');
    setPriorityValue(initialPriority || Priority.MEDIUM);
    setIsFavoriteCheck(false);
    setFormError(null);
    setShowCreateModal(true);
  };

  // Filters State
  const [searchQuery, setSearchQuery] = usePageState('keywords.searchQuery', '');
  const [categoryFilter, setCategoryFilter] = usePageState('keywords.categoryFilter', '');
  const [priorityFilter, setPriorityFilter] = usePageState('keywords.priorityFilter', '');
  const [statusFilter, setStatusFilter] = usePageState('keywords.statusFilter', '');
  const [favoriteFilter, setFavoriteFilter] = usePageState('keywords.favoriteFilter', 'all');

  // Quick preset pills
  const [quickFilter, setQuickFilter] = useState<'all' | 'active' | 'starred' | 'high'>('all');

  // Search input ref & keyboard shortcut
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '/' || (e.ctrlKey && e.key.toLowerCase() === 'k')) && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // CSV Modal
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvErrorList, setCsvErrorList] = useState<string[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Alert Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const triggerNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Fetch keywords
  const loadKeywords = useCallback(async () => {
    try {
      const data = await getKeywords();
      setKeywords(data);
      setDbError(null);
    } catch (err) {
      console.error(err);
      setDbError('Database Connection Warning: Unable to connect to PostgreSQL.');
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeywords();
  }, [loadKeywords]);

  // Form validations on change
  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setKeywordText(val);
    if (val.trim()) {
      const check = validateBooleanQuery(val);
      if (!check.isValid) {
        setFormError(check.error || 'Invalid Boolean search expression.');
      } else {
        setFormError(null);
      }
    } else {
      setFormError(null);
    }
  };

  // Insert Boolean token into modal form input
  const insertOperator = (op: string) => {
    setKeywordText(prev => {
      const trimmed = prev.trim();
      const updated = trimmed ? `${trimmed} ${op} ` : `${op} `;
      const check = validateBooleanQuery(updated.trim());
      if (!check.isValid) {
        setFormError(check.error || 'Invalid Boolean query.');
      } else {
        setFormError(null);
      }
      return updated;
    });
  };

  // Submit form (Create / Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keywordText.trim()) {
      setFormError('Keyword text is required.');
      return;
    }
    if (!categoryText.trim()) {
      setFormError('Category is required.');
      return;
    }

    const check = validateBooleanQuery(keywordText);
    if (!check.isValid) {
      setFormError(check.error || 'Invalid Boolean search expression.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editId) {
        await updateKeyword(editId, {
          keyword: keywordText,
          category: categoryText,
          priority: priorityValue,
          isFavorite: isFavoriteCheck,
        });
        triggerNotification('success', 'Keyword updated successfully.');
      } else {
        await addKeyword(keywordText, categoryText, priorityValue, isFavoriteCheck);
        triggerNotification('success', 'Keyword created successfully.');
      }
      
      // Reset form
      setKeywordText('');
      setCategoryText('');
      setPriorityValue(Priority.MEDIUM);
      setIsFavoriteCheck(false);
      setEditId(null);
      setFormError(null);
      setShowCreateModal(false);

      // Refresh list
      const data = await getKeywords();
      setKeywords(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Operation failed.';
      triggerNotification('error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick 1-click add starter term
  const handleAddStarterTerm = async (pack: typeof STARTER_PACKS[0]) => {
    try {
      await addKeyword(pack.query, pack.category, pack.priority, true);
      triggerNotification('success', `Added "${pack.name}" to keyword library!`);
      const updated = await getKeywords();
      setKeywords(updated);
    } catch (err: any) {
      triggerNotification('error', err.message || 'Could not add keyword.');
    }
  };

  // Edit action
  const handleEditClick = (kw: KeywordData) => {
    setEditId(kw.id);
    setKeywordText(kw.keyword);
    setCategoryText(kw.category);
    setPriorityValue(kw.priority);
    setIsFavoriteCheck(kw.isFavorite);
    setFormError(null);
    setShowCreateModal(true);
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditId(null);
    setKeywordText('');
    setCategoryText('');
    setPriorityValue(Priority.MEDIUM);
    setIsFavoriteCheck(false);
    setFormError(null);
    setShowCreateModal(false);
  };

  // Toggle favorite
  const handleToggleFavorite = async (id: string, current: boolean) => {
    try {
      await updateKeyword(id, { isFavorite: !current });
      setKeywords(prev => prev.map(kw => kw.id === id ? { ...kw, isFavorite: !current } : kw));
      triggerNotification('success', current ? 'Removed from favorites.' : 'Added to favorites.');
    } catch {
      triggerNotification('error', 'Failed to toggle favorite.');
    }
  };

  // Toggle status
  const handleToggleStatus = async (id: string, current: KeywordStatus) => {
    const nextStatus = current === KeywordStatus.ACTIVE ? KeywordStatus.INACTIVE : KeywordStatus.ACTIVE;
    try {
      await updateKeyword(id, { status: nextStatus });
      setKeywords(prev => prev.map(kw => kw.id === id ? { ...kw, status: nextStatus } : kw));
      triggerNotification('success', `Keyword is now ${nextStatus.toLowerCase()}.`);
    } catch {
      triggerNotification('error', 'Failed to toggle status.');
    }
  };

  // Delete keyword
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this keyword?')) return;
    try {
      await deleteKeyword(id);
      setKeywords(prev => prev.filter(kw => kw.id !== id));
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
      triggerNotification('success', 'Keyword deleted.');
    } catch {
      triggerNotification('error', 'Failed to delete keyword.');
    }
  };

  // Bulk toggles
  const handleBulkStatusChange = async (status: KeywordStatus) => {
    if (selectedIds.length === 0) return;
    try {
      await bulkToggleStatus(selectedIds, status);
      setKeywords(prev => prev.map(kw => selectedIds.includes(kw.id) ? { ...kw, status } : kw));
      setSelectedIds([]);
      triggerNotification('success', `Bulk updated status of ${selectedIds.length} keywords.`);
    } catch {
      triggerNotification('error', 'Failed to update status.');
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete the ${selectedIds.length} selected keywords?`)) return;
    try {
      await bulkDeleteKeywords(selectedIds);
      setKeywords(prev => prev.filter(kw => !selectedIds.includes(kw.id)));
      setSelectedIds([]);
      triggerNotification('success', 'Selected keywords deleted.');
    } catch {
      triggerNotification('error', 'Failed to delete selected keywords.');
    }
  };

  // Select all checkbox handler
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>, visibleKeywords: KeywordData[]) => {
    if (e.target.checked) {
      const allVisibleIds = visibleKeywords.map(kw => kw.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...allVisibleIds])));
    } else {
      const allVisibleIds = visibleKeywords.map(kw => kw.id);
      setSelectedIds(prev => prev.filter(id => !allVisibleIds.includes(id)));
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('');
    setPriorityFilter('');
    setStatusFilter('');
    setFavoriteFilter('all');
    setQuickFilter('all');
  };

  // Quick preset button click
  const handleQuickPreset = (mode: 'all' | 'active' | 'starred' | 'high') => {
    setQuickFilter(mode);
    if (mode === 'all') {
      setStatusFilter('');
      setFavoriteFilter('all');
      setPriorityFilter('');
    } else if (mode === 'active') {
      setStatusFilter(KeywordStatus.ACTIVE);
      setFavoriteFilter('all');
      setPriorityFilter('');
    } else if (mode === 'starred') {
      setFavoriteFilter('favorite');
      setStatusFilter('');
      setPriorityFilter('');
    } else if (mode === 'high') {
      setPriorityFilter(Priority.HIGH);
      setStatusFilter('');
      setFavoriteFilter('all');
    }
  };

  // Active filter count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (categoryFilter) count++;
    if (priorityFilter) count++;
    if (statusFilter) count++;
    if (favoriteFilter !== 'all') count++;
    return count;
  }, [searchQuery, categoryFilter, priorityFilter, statusFilter, favoriteFilter]);

  // CSV Import handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCsvFile(e.target.files[0]);
      setCsvErrorList([]);
      setImportSuccess(null);
    }
  };

  const handleCsvImportSubmit = async () => {
    if (!csvFile) return;
    setImportLoading(true);
    setCsvErrorList([]);
    setImportSuccess(null);

    const formData = new FormData();
    formData.append('file', csvFile);

    try {
      const response = await fetch('/api/keywords/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (!result.success) {
        if (result.error && result.error.errors && result.error.errors.csv) {
          setCsvErrorList(result.error.errors.csv);
        } else {
          setCsvErrorList([result.error?.message || 'Import failed. Check file format.']);
        }
      } else {
        setImportSuccess(`Import successful! Created: ${result.data.created}, Skipped duplicate: ${result.data.skipped}`);
        setCsvFile(null);
        const updated = await getKeywords();
        setKeywords(updated);
        triggerNotification('success', 'Keywords imported successfully.');
      }
    } catch {
      setCsvErrorList(['Server error importing CSV file.']);
    } finally {
      setImportLoading(false);
    }
  };

  // Categories list for auto selection
  const categoriesList = Array.from(new Set(keywords.map(kw => kw.category)));

  // Filter computation
  const filteredKeywords = keywords.filter((kw) => {
    const matchesSearch = 
      kw.keyword.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kw.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === '' || kw.category === categoryFilter;
    const matchesPriority = priorityFilter === '' || kw.priority === priorityFilter;
    const matchesStatus = statusFilter === '' || kw.status === statusFilter;
    const matchesFavorite = 
      favoriteFilter === 'all' || 
      (favoriteFilter === 'favorite' && kw.isFavorite) || 
      (favoriteFilter === 'regular' && !kw.isFavorite);

    return matchesSearch && matchesCategory && matchesPriority && matchesStatus && matchesFavorite;
  });

  // Calculate statistics
  const totalCount = keywords.length;
  const activeCount = keywords.filter(k => k.status === KeywordStatus.ACTIVE).length;
  const favoriteCount = keywords.filter(k => k.isFavorite).length;
  const totalMatches = keywords.reduce((sum, k) => sum + k.matchesFound, 0);

  // Helper to render Boolean tokens
  const renderBooleanTokens = (text: string) => {
    return text.split(/(\s+AND\s+|\s+OR\s+|\s+NOT\s+)/i).map((part, index) => {
      const upperPart = part.toUpperCase();
      if ([' AND ', ' OR ', ' NOT '].includes(upperPart)) {
        const tokenType = upperPart.trim().toLowerCase();
        return (
          <span key={index} className={`boolean-token token-${tokenType}`}>
            {part.trim()}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', boxSizing: 'border-box' }}>
      
      {/* EXECUTIVE HEADER BANNER */}
      <header className="kw-header">
        <div className="kw-header-left">
          <div className="kw-header-icon">
            <Search size={20} />
          </div>
          <div className="kw-header-title-box">
            <div className="kw-header-title-row">
              <h1 className="kw-header-title">Keyword Library & Boolean Queries</h1>
              <span className="kw-header-badge">Signal Scanner</span>
            </div>
            <p className="kw-header-subtitle">
              Configure Boolean search queries to continuously scan LinkedIn and Apollo for high-intent buyer signals
            </p>
          </div>
        </div>

        <div className="header-actions">
          <button onClick={() => handleOpenCreateModal()} className="btn-primary">
            <Plus size={16} /> Create Search Term
          </button>
          <a href="/api/keywords/export" download className="btn-secondary">
            <Download size={15} /> Export
          </a>
          <button onClick={() => { setShowCsvModal(true); setCsvFile(null); setCsvErrorList([]); setImportSuccess(null); }} className="btn-secondary">
            <Upload size={15} /> Import CSV
          </button>
        </div>
      </header>

      {/* SCROLLABLE MAIN CONTENT */}
      <div
        className="dashboard-scrollable-content keywords-page"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '18px 28px 36px 28px',
          backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.65), rgba(248, 250, 252, 0.65)), url(${blob.src})`,
          backgroundSize: 'cover',
          backgroundPosition: 'top right',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
        {/* Floating Notifications */}
        {notification && (
          <div className={`notification ${notification.type === 'success' ? 'success' : 'error'}`}>
            {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Database Warning */}
        {dbError && (
          <div className="error-text" style={{ padding: '14px 18px', borderRadius: '14px' }}>
            <AlertCircle size={20} />
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block', fontSize: '0.88rem' }}>Database Connectivity Notice</strong>
              <span style={{ fontSize: '0.82rem', opacity: 0.9 }}>{dbError}</span>
            </div>
            <button onClick={loadKeywords} className="icon-btn" title="Retry">
              <RefreshCw size={14} />
            </button>
          </div>
        )}

        {/* BREADCRUMB & STATUS STRIP */}
        <div className="kw-breadcrumb-bar">
          <div className="kw-breadcrumb-pill">
            <Link href="/" className="kw-breadcrumb-link">
              <Home size={13} /> Dashboard
            </Link>
            <ChevronRight size={13} className="kw-breadcrumb-sep" />
            <span className="kw-breadcrumb-current">Keyword Library</span>
          </div>

          <div className="kw-engine-pill">
            <span className="kw-engine-dot" />
            <span>{activeCount} Active Discovery Scanners</span>
          </div>
        </div>

        {/* 4 KPI METRIC STAT CARDS */}
        <div className="stats-grid">
          <div className="stat-card stat-total">
            <div className="stat-content">
              <div className="stat-info">
                <div className="stat-label-wrap">
                  <span className="stat-label">Total Keywords</span>
                </div>
                <div className="stat-val">{pageLoading ? '...' : totalCount}</div>
                <div className="stat-subtext">Library Index</div>
              </div>
              <div className="stat-icon-wrapper">
                <FileSpreadsheet size={22} />
              </div>
            </div>
          </div>

          <div className="stat-card stat-active">
            <div className="stat-content">
              <div className="stat-info">
                <div className="stat-label-wrap">
                  <span className="stat-label">Active (Discovery)</span>
                </div>
                <div className="stat-val">{pageLoading ? '...' : activeCount}</div>
                <div className="stat-subtext">Automated Scans</div>
              </div>
              <div className="stat-icon-wrapper">
                <CheckCircle size={22} />
              </div>
            </div>
          </div>

          <div className="stat-card stat-favorite">
            <div className="stat-content">
              <div className="stat-info">
                <div className="stat-label-wrap">
                  <span className="stat-label">Starred Terms</span>
                </div>
                <div className="stat-val">{pageLoading ? '...' : favoriteCount}</div>
                <div className="stat-subtext">Priority Watchlist</div>
              </div>
              <div className="stat-icon-wrapper">
                <Star size={22} fill={favoriteCount > 0 ? '#f59e0b' : 'none'} />
              </div>
            </div>
          </div>

          <div className="stat-card stat-matches">
            <div className="stat-content">
              <div className="stat-info">
                <div className="stat-label-wrap">
                  <span className="stat-label">Discovery Matches</span>
                </div>
                <div className="stat-val">{pageLoading ? '...' : totalMatches}</div>
                <div className="stat-subtext">Signals Found</div>
              </div>
              <div className="stat-icon-wrapper">
                <Search size={22} />
              </div>
            </div>
          </div>
        </div>

        {/* COMMAND & FILTER TOOLBAR */}
        <div className="filter-bar">
          <div className="filter-main-row">
            {/* Enhanced Search Input */}
            <div className="filter-search-box">
              <div className="filter-search-input-wrap">
                <div className="search-icon-badge">
                  <Search size={14} />
                </div>
                <input 
                  ref={searchInputRef}
                  type="text" 
                  placeholder="Search keywords or categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="filter-search-input"
                />
                {searchQuery ? (
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="filter-search-clear"
                    title="Clear search"
                  >
                    <X size={12} />
                  </button>
                ) : (
                  <kbd className="search-kbd-chip" title="Press Ctrl+K or / to search">Ctrl + K</kbd>
                )}
              </div>
            </div>

            {/* Perfect Dropdowns */}
            <div className="filter-dropdowns-row">
              <div className="filter-dropdown-item">
                <CustomDropdown
                  buttonHeight={44}
                  value={categoryFilter}
                  onChange={(val) => setCategoryFilter(val)}
                  options={[
                    { value: '', label: 'All Categories', icon: <Layers size={14} className="text-slate-400" /> },
                    ...categoriesList.map(cat => ({ 
                      value: cat, 
                      label: cat.toUpperCase(), 
                      icon: <Tag size={13} className="text-indigo-500" /> 
                    }))
                  ]}
                />
              </div>

              <div className="filter-dropdown-item">
                <CustomDropdown
                  buttonHeight={44}
                  value={priorityFilter}
                  onChange={(val) => setPriorityFilter(val)}
                  options={[
                    { value: '', label: 'All Priorities', icon: <SlidersHorizontal size={14} className="text-slate-400" /> },
                    { 
                      value: Priority.HIGH, 
                      label: 'High Priority', 
                      icon: <span style={{ width: 8, height: 8, borderRadius: 9999, background: '#ef4444', boxShadow: '0 0 6px rgba(239, 68, 68, 0.6)', display: 'inline-block' }} /> 
                    },
                    { 
                      value: Priority.MEDIUM, 
                      label: 'Medium Priority', 
                      icon: <span style={{ width: 8, height: 8, borderRadius: 9999, background: '#f59e0b', display: 'inline-block' }} /> 
                    },
                    { 
                      value: Priority.LOW, 
                      label: 'Low Priority', 
                      icon: <span style={{ width: 8, height: 8, borderRadius: 9999, background: '#94a3b8', display: 'inline-block' }} /> 
                    }
                  ]}
                />
              </div>

              <div className="filter-dropdown-item">
                <CustomDropdown
                  buttonHeight={44}
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val)}
                  options={[
                    { value: '', label: 'All Statuses', icon: <Activity size={14} className="text-slate-400" /> },
                    { 
                      value: KeywordStatus.ACTIVE, 
                      label: 'Active Scanners', 
                      icon: <span style={{ width: 8, height: 8, borderRadius: 9999, background: '#10b981', boxShadow: '0 0 6px rgba(16, 185, 129, 0.7)', display: 'inline-block' }} /> 
                    },
                    { 
                      value: KeywordStatus.INACTIVE, 
                      label: 'Inactive (Paused)', 
                      icon: <span style={{ width: 8, height: 8, borderRadius: 9999, background: '#94a3b8', display: 'inline-block' }} /> 
                    }
                  ]}
                />
              </div>

              <div className="filter-dropdown-item">
                <CustomDropdown
                  buttonHeight={44}
                  value={favoriteFilter}
                  onChange={(val) => setFavoriteFilter(val)}
                  options={[
                    { value: 'all', label: 'All Stars', icon: <Star size={14} className="text-slate-400" /> },
                    { 
                      value: 'favorite', 
                      label: 'Starred Watchlist', 
                      icon: <Star size={14} fill="#f59e0b" className="text-amber-500" /> 
                    },
                    { 
                      value: 'regular', 
                      label: 'Regular Terms', 
                      icon: <Star size={14} className="text-slate-400" /> 
                    }
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Quick Filter Pills Row */}
          <div className="filter-pills-row">
            <div className="quick-pills-group">
              <button 
                onClick={() => handleQuickPreset('all')}
                className={`quick-pill-btn ${quickFilter === 'all' && !activeFiltersCount ? 'active' : ''}`}
              >
                All Terms ({totalCount})
              </button>
              <button 
                onClick={() => handleQuickPreset('active')}
                className={`quick-pill-btn ${quickFilter === 'active' || statusFilter === KeywordStatus.ACTIVE ? 'active' : ''}`}
              >
                Active Only ({activeCount})
              </button>
              <button 
                onClick={() => handleQuickPreset('starred')}
                className={`quick-pill-btn ${quickFilter === 'starred' || favoriteFilter === 'favorite' ? 'active' : ''}`}
              >
                ★ Starred ({favoriteCount})
              </button>
              <button 
                onClick={() => handleQuickPreset('high')}
                className={`quick-pill-btn ${quickFilter === 'high' || priorityFilter === Priority.HIGH ? 'active' : ''}`}
              >
                🔥 High Priority
              </button>
            </div>

            {activeFiltersCount > 0 && (
              <button onClick={handleResetFilters} className="clear-filters-btn">
                <RotateCcw size={12} /> Clear all filters ({activeFiltersCount})
              </button>
            )}
          </div>
        </div>

        {/* MAIN BODY: EMPTY ONBOARDING HUB vs TABLE RESULTS */}
        {pageLoading ? (
          <div className="table-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <RefreshCw size={28} className="animate-spin" style={{ color: '#6366f1', margin: '0 auto 12px auto' }} />
            <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>Loading keyword library...</p>
          </div>
        ) : totalCount === 0 ? (
          /* ================================================================
             EXECUTIVE EMPTY STATE ONBOARDING & STARTER PACKS HUB
             ================================================================ */
          <div className="empty-hub-container">
            {/* Hero Card */}
            <div className="empty-hero-card">
              <div className="empty-radar-wrap">
                <Sparkles size={32} />
              </div>
              <h2 className="empty-hero-title">Build Your High-Intent Discovery Radar</h2>
              <p className="empty-hero-desc">
                Define Boolean search queries with <code>AND</code>, <code>OR</code>, and <code>NOT</code> to automatically scan LinkedIn posts and Apollo for buyer triggers, hiring surges, and active software RFPs.
              </p>
              <div className="empty-hero-actions">
                <button onClick={() => handleOpenCreateModal()} className="btn-primary" style={{ padding: '11px 24px', fontSize: '0.92rem' }}>
                  <Plus size={17} /> Create Search Term
                </button>
                <button 
                  onClick={() => { setShowCsvModal(true); setCsvFile(null); setCsvErrorList([]); setImportSuccess(null); }} 
                  className="btn-secondary"
                  style={{ padding: '10px 20px', fontSize: '0.9rem' }}
                >
                  <Upload size={16} /> Import from CSV
                </button>
              </div>
            </div>

            {/* Curated 1-Click Starter Packs */}
            <div className="starter-packs-box">
              <div className="starter-header">
                <div>
                  <div className="starter-header-left">
                    <Zap size={18} style={{ color: '#f59e0b' }} />
                    <h3 className="starter-header-title">Curated High-Yield Starter Packs</h3>
                    <span className="starter-badge">1-Click Install</span>
                  </div>
                  <p className="starter-header-desc">
                    Battle-tested Boolean templates designed to catch active commercial opportunities immediately.
                  </p>
                </div>
              </div>

              <div className="starter-cards-grid">
                {STARTER_PACKS.map((pack, idx) => (
                  <div key={idx} className="starter-card">
                    <div>
                      <div className="starter-card-top">
                        <div className="starter-card-name-row">
                          <span className="starter-card-icon">{pack.icon}</span>
                          <span className="starter-card-name">{pack.name}</span>
                        </div>
                        <div className="starter-meta-pills">
                          <span className="starter-meta-pill">{pack.category}</span>
                          <span className={`starter-meta-pill ${pack.priority === Priority.HIGH ? 'high' : ''}`}>
                            {pack.priority}
                          </span>
                        </div>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '6px 0 10px 0' }}>
                        {pack.description}
                      </p>
                      <div className="starter-query-preview">
                        {renderBooleanTokens(pack.query)}
                      </div>
                    </div>
                    <div className="starter-card-bottom">
                      <button 
                        onClick={() => handleAddStarterTerm(pack)}
                        className="starter-add-btn"
                      >
                        <Plus size={14} /> Add to Library
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Boolean Syntax Guide */}
            <div className="boolean-guide-box">
              <h4 className="boolean-guide-title">
                <HelpCircle size={16} style={{ color: '#6366f1' }} /> Boolean Syntax Quick Cheatsheet
              </h4>
              <div className="boolean-guide-grid">
                <div className="boolean-guide-card">
                  <span className="boolean-guide-tag and">AND</span>
                  <p className="boolean-guide-desc">Requires both signals to appear in the content.</p>
                  <code className="boolean-guide-eg">"SaaS" AND "Hiring"</code>
                </div>
                <div className="boolean-guide-card">
                  <span className="boolean-guide-tag or">OR</span>
                  <p className="boolean-guide-desc">Matches if either signal or alternative is found.</p>
                  <code className="boolean-guide-eg">"VP Sales" OR "CRO"</code>
                </div>
                <div className="boolean-guide-card">
                  <span className="boolean-guide-tag not">NOT</span>
                  <p className="boolean-guide-desc">Excludes noisy posts containing irrelevant terms.</p>
                  <code className="boolean-guide-eg">"Sales" NOT "Intern"</code>
                </div>
                <div className="boolean-guide-card">
                  <span className="boolean-guide-tag quotes">"QUOTES"</span>
                  <p className="boolean-guide-desc">Matches the exact multi-word phrase in order.</p>
                  <code className="boolean-guide-eg">"Looking for agency"</code>
                </div>
              </div>
            </div>
          </div>
        ) : filteredKeywords.length === 0 ? (
          /* When keywords exist in DB, but filter returns 0 */
          <div className="table-card">
            <div className="filter-empty-state">
              <div className="filter-empty-icon">
                <Search size={24} />
              </div>
              <h4>No search terms match your filters</h4>
              <p>There are {totalCount} keywords in your library, but none match the active search or filters.</p>
              <button onClick={handleResetFilters} className="btn-secondary" style={{ padding: '8px 18px' }}>
                <RotateCcw size={14} /> Reset Filters
              </button>
            </div>
          </div>
        ) : (
          /* ================================================================
             KEYWORD TABLE VIEW
             ================================================================ */
          <div className="table-card">
            {/* Bulk actions banner */}
            {selectedIds.length > 0 && (
              <div className="bulk-actions-banner">
                <div className="selected-count">
                  {selectedIds.length} terms selected
                </div>
                <div className="bulk-btns">
                  <button 
                    onClick={() => handleBulkStatusChange(KeywordStatus.ACTIVE)} 
                    className="btn-secondary" 
                    style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                  >
                    Activate Selected
                  </button>
                  <button 
                    onClick={() => handleBulkStatusChange(KeywordStatus.INACTIVE)} 
                    className="btn-secondary" 
                    style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                  >
                    Deactivate Selected
                  </button>
                  <button onClick={handleBulkDelete} className="btn-danger-outline">
                    Delete Selected
                  </button>
                </div>
              </div>
            )}

            <div className="table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th className="td-checkbox">
                      <input 
                        type="checkbox" 
                        checked={filteredKeywords.length > 0 && filteredKeywords.every(k => selectedIds.includes(k.id))}
                        onChange={(e) => handleSelectAll(e, filteredKeywords)}
                        className="checkbox-glow"
                      />
                    </th>
                    <th style={{ width: '45px' }}>Starred</th>
                    <th>Query Keyword / Boolean Syntax</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Matches</th>
                    <th>Last Searched</th>
                    <th style={{ width: '90px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKeywords.map((kw) => {
                    const isSelected = selectedIds.includes(kw.id);
                    return (
                      <tr key={kw.id} className={isSelected ? 'row-selected' : ''}>
                        <td className="td-checkbox">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={(e) => handleSelectRow(kw.id, e.target.checked)}
                            className="checkbox-glow"
                          />
                        </td>
                        <td>
                          <button 
                            onClick={() => handleToggleFavorite(kw.id, kw.isFavorite)}
                            className={`star-btn ${kw.isFavorite ? 'active' : ''}`}
                            title={kw.isFavorite ? 'Remove from favorites' : 'Star this term'}
                          >
                            <Star size={16} fill={kw.isFavorite ? '#f59e0b' : 'none'} />
                          </button>
                        </td>
                        <td className="td-keyword">
                          {renderBooleanTokens(kw.keyword)}
                        </td>
                        <td>
                          <span className="badge badge-indigo">{kw.category}</span>
                        </td>
                        <td>
                          <span className={`td-priority-badge priority-${kw.priority.toLowerCase()}`}>
                            <span className={`priority-dot ${kw.priority.toLowerCase()}`} />
                            {kw.priority}
                          </span>
                        </td>
                        <td>
                          <button 
                            onClick={() => handleToggleStatus(kw.id, kw.status)}
                            className={`badge ${kw.status === KeywordStatus.ACTIVE ? 'badge-success' : 'badge-danger'}`}
                            style={{ cursor: 'pointer', border: 'none', font: 'inherit' }}
                            title="Click to toggle status"
                          >
                            {kw.status}
                          </button>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '28px',
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            fontSize: '0.82rem',
                            fontWeight: 800,
                            fontVariantNumeric: 'tabular-nums',
                            background: kw.matchesFound > 0 ? 'rgba(14, 165, 233, 0.12)' : 'rgba(241, 245, 249, 0.8)',
                            color: kw.matchesFound > 0 ? '#0284c7' : '#94a3b8',
                            border: kw.matchesFound > 0 ? '1px solid rgba(14, 165, 233, 0.25)' : '1px solid #e2e8f0'
                          }}>
                            {kw.matchesFound}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                          {kw.lastSearchedAt ? new Date(kw.lastSearchedAt).toLocaleDateString() : 'Never'}
                        </td>
                        <td>
                          <div className="action-btns">
                            <button onClick={() => handleEditClick(kw)} className="icon-btn" title="Edit Search Term">
                              <Edit size={14} />
                            </button>
                            <button onClick={() => handleDelete(kw.id)} className="icon-btn delete" title="Delete Search Term">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* CREATE / EDIT SEARCH TERM MODAL */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={handleCancelEdit}>
          <div className="create-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Search size={18} style={{ color: '#6366f1' }} /> {editId ? 'Edit Search Term' : 'Create Search Term'}
              </h3>
              <button onClick={handleCancelEdit} className="icon-btn">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label>Search Keyword / Boolean Query</label>
                <input 
                  type="text" 
                  placeholder='("AI Development" OR "Machine Learning") AND "looking for"'
                  value={keywordText}
                  onChange={handleKeywordChange}
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    color: '#0f172a',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                  autoFocus
                />
                
                {/* Operator Insertion Chips */}
                <div className="operator-chips-bar">
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Quick insert:</span>
                  <button type="button" onClick={() => insertOperator('AND')} className="operator-chip">+ AND</button>
                  <button type="button" onClick={() => insertOperator('OR')} className="operator-chip">+ OR</button>
                  <button type="button" onClick={() => insertOperator('NOT')} className="operator-chip">+ NOT</button>
                  <button type="button" onClick={() => insertOperator('"Phrase"')} className="operator-chip">+ "" Quotes</button>
                  <button type="button" onClick={() => insertOperator('( )')} className="operator-chip">+ ( )</button>
                </div>

                {/* Live Preview */}
                {keywordText.trim() && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, marginBottom: '3px' }}>Syntax Preview:</div>
                    <div className="query-preview-box">
                      {renderBooleanTokens(keywordText)}
                    </div>
                  </div>
                )}

                <span className="helper-text" style={{ marginTop: '4px' }}>
                  Combine keywords using <b>AND</b>, <b>OR</b>, <b>NOT</b>, parentheses and quotes.
                </span>
              </div>

              <div className="form-group">
                <label>Category</label>
                <input 
                  type="text" 
                  placeholder="e.g. Sales Intent, Hiring, Executives, Tech"
                  value={categoryText}
                  onChange={(e) => setCategoryText(e.target.value)}
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    color: '#0f172a',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                  list="existing-categories-modal"
                />
                <datalist id="existing-categories-modal">
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div className="form-group">
                <label>Priority Level</label>
                <CustomDropdown
                  value={priorityValue}
                  onChange={(val) => setPriorityValue(val as Priority)}
                  options={[
                    { value: Priority.LOW, label: 'Low Priority' },
                    { value: Priority.MEDIUM, label: 'Medium Priority' },
                    { value: Priority.HIGH, label: 'High Priority' }
                  ]}
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={isFavoriteCheck}
                    onChange={(e) => setIsFavoriteCheck(e.target.checked)}
                    className="checkbox-glow"
                  />
                  Mark as Starred / Favorite Watchlist
                </label>
              </div>

              {formError && (
                <div className="error-text">
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="modal-footer">
                <button 
                  type="button" 
                  onClick={handleCancelEdit} 
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting || formError !== null}
                  className="btn-primary"
                >
                  {isSubmitting ? 'Saving...' : editId ? 'Update Term' : 'Add to Library'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      {showCsvModal && (
        <div className="modal-backdrop" onClick={() => setShowCsvModal(false)}>
          <div className="create-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Upload size={18} style={{ color: '#6366f1' }} /> Import Keywords from CSV
              </h3>
              <button onClick={() => setShowCsvModal(false)} className="icon-btn">
                <X size={18} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="dropzone" onClick={() => document.getElementById('csv-file-input')?.click()}>
                <FileSpreadsheet className="upload-icon" />
                <div className="dropzone-label">
                  Click to browse CSV file
                </div>
                <div className="dropzone-sublabel">
                  Expected CSV headers: <b>keyword, category, priority, isFavorite</b>
                </div>
                <input 
                  id="csv-file-input"
                  type="file" 
                  accept=".csv"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>

              {csvFile && (
                <div className="selected-file-banner">
                  <div className="file-info">
                    <FileSpreadsheet size={16} style={{ color: '#10b981' }} />
                    <span>{csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button onClick={() => setCsvFile(null)} className="icon-btn delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}

              {/* Error notifications */}
              {csvErrorList.length > 0 && (
                <div className="csv-errors-box">
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#dc2626' }}>Parsing errors found:</span>
                  {csvErrorList.map((err, idx) => (
                    <span key={idx} className="csv-error-line">• {err}</span>
                  ))}
                </div>
              )}

              {/* Success message */}
              {importSuccess && (
                <div className="selected-file-banner" style={{ background: '#ecfdf5', borderColor: '#a7f3d0' }}>
                  <span style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 600 }}>{importSuccess}</span>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowCsvModal(false)} className="btn-secondary">
                Close
              </button>
              <button 
                onClick={handleCsvImportSubmit} 
                disabled={!csvFile || importLoading}
                className="btn-primary"
              >
                {importLoading ? 'Importing...' : 'Upload & Import'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
