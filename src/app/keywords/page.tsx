'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Search
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
import { BreadcrumbHeader } from '@/components/navigation/BreadcrumbHeader';
import '@/styles/keywords.css';

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
  const handleOpenCreateModal = () => {
    setEditId(null);
    setKeywordText('');
    setCategoryText('');
    setPriorityValue(Priority.MEDIUM);
    setIsFavoriteCheck(false);
    setFormError(null);
    setShowCreateModal(true);
  };

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [favoriteFilter, setFavoriteFilter] = useState('all');

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
      setDbError('Database Connection Warning: Unable to connect to PostgreSQL. Run database migrations to initialize tables.');
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        // Update
        await updateKeyword(editId, {
          keyword: keywordText,
          category: categoryText,
          priority: priorityValue,
          isFavorite: isFavoriteCheck,
        });
        triggerNotification('success', 'Keyword updated successfully.');
      } else {
        // Create
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
        // Refresh keywords list
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

  return (
    <div className="keywords-page">
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

      {/* Database Warning */}
      {dbError && (
        <div className="db-warning-banner card-glass">
          <AlertCircle className="warning-icon" />
          <div className="warning-content">
            <h4>Database Connectivity Warning</h4>
            <p>{dbError}</p>
          </div>
          <button onClick={loadKeywords} className="icon-btn">
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
        currentTitle="Keyword Library & Boolean Queries"
        badge="Signal Filters"
      />

      {/* Page Title Header */}
      <div className="page-header">
        <div className="header-title">
          <h2>Keyword Library</h2>
          <p>Configure search keywords and Boolean queries to scan LinkedIn for buying signals.</p>
        </div>
        <div className="header-actions">
          <button onClick={handleOpenCreateModal} className="btn-primary">
            <Plus size={16} /> Create Search Term
          </button>
          <a href="/api/keywords/export" download className="btn-secondary">
            <Download size={16} /> Export
          </a>
          <button onClick={() => { setShowCsvModal(true); setCsvFile(null); setCsvErrorList([]); setImportSuccess(null); }} className="btn-secondary">
            <Upload size={16} /> Import CSV
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card card-glass">
          <div className="stat-content">
            <div className="stat-info">
              <span className="stat-label">Total Keywords</span>
              <span className="text-[1.6rem] font-bold text-[var(--text-primary)]">{pageLoading ? '...' : totalCount}</span>
            </div>
            <div className="stat-icon-wrapper">
              <FileSpreadsheet className="stat-icon" />
            </div>
          </div>
        </div>

        <div className="stat-card border-[var(--accent-indigo)] bg-[var(--accent-indigo-glow)] shadow-[0_0_12px_rgba(0,208,156,0.15)] card-glass">
          <div className="stat-content">
            <div className="stat-info">
              <span className="stat-label">Active (Discovery)</span>
              <span className="text-[1.6rem] font-bold text-[var(--text-primary)]">{pageLoading ? '...' : activeCount}</span>
            </div>
            <div className="stat-icon-wrapper">
              <CheckCircle className="stat-icon" style={{ color: 'var(--color-success)' }} />
            </div>
          </div>
        </div>

        <div className="stat-card fav-card card-glass">
          <div className="stat-content">
            <div className="stat-info">
              <span className="stat-label">Starred Terms</span>
              <span className="text-[1.6rem] font-bold text-[var(--text-primary)]">{pageLoading ? '...' : favoriteCount}</span>
            </div>
            <div className="stat-icon-wrapper">
              <Star className="stat-icon" style={{ color: 'var(--color-warning)', fill: '#fbbf24' }} />
            </div>
          </div>
        </div>

        <div className="stat-card card-glass">
          <div className="stat-content">
            <div className="stat-info">
              <span className="stat-label">Discovery Matches</span>
              <span className="text-[1.6rem] font-bold text-[var(--text-primary)]">{pageLoading ? '...' : totalMatches}</span>
            </div>
            <div className="stat-icon-wrapper">
              <Search className="stat-icon" style={{ color: 'var(--accent-cyan)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Workspace */}
      <div className="table-workspace">
        
        {/* Filter Toolbar */}
        <div className="filter-bar card-glass">
          <div className="filter-left" style={{ flex: 1 }}>
            {/* Premium Search */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', width: '100%', maxWidth: '400px' }}>
              <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid var(--border-subtle)' }}>
                <Search size={16} style={{ color: 'var(--accent-indigo)', flexShrink: 0 }} />
                <input 
                  type="text" 
                  placeholder="Search keywords or categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600, outline: 'none', padding: '10px 0' }}
                />
              </div>
            </div>
          </div>
          <div className="filter-right">
            {/* Category Filter */}
            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-[var(--text-primary)] text-[0.82rem] outline-none transition-all duration-200 w-full box-border placeholder:text-slate-400 focus:border-[var(--accent-indigo)] focus:shadow-[0_0_0_3px_rgba(0,208,156,0.15)] focus:bg-white text-[var(--text-primary)] cursor-pointer filter-select"
            >
              <option value="">All Categories</option>
              {categoriesList.map(cat => (
                <option key={cat} value={cat}>{cat.toUpperCase()}</option>
              ))}
            </select>

            {/* Priority Filter */}
            <select 
              value={priorityFilter} 
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-[var(--text-primary)] text-[0.82rem] outline-none transition-all duration-200 w-full box-border placeholder:text-slate-400 focus:border-[var(--accent-indigo)] focus:shadow-[0_0_0_3px_rgba(0,208,156,0.15)] focus:bg-white text-[var(--text-primary)] cursor-pointer filter-select"
            >
              <option value="">All Priorities</option>
              <option value={Priority.LOW}>Low</option>
              <option value={Priority.MEDIUM}>Medium</option>
              <option value={Priority.HIGH}>High</option>
            </select>

            {/* Status Filter */}
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-[var(--text-primary)] text-[0.82rem] outline-none transition-all duration-200 w-full box-border placeholder:text-slate-400 focus:border-[var(--accent-indigo)] focus:shadow-[0_0_0_3px_rgba(0,208,156,0.15)] focus:bg-white text-[var(--text-primary)] cursor-pointer filter-select"
            >
              <option value="">All Statuses</option>
              <option value={KeywordStatus.ACTIVE}>Active Only</option>
              <option value={KeywordStatus.INACTIVE}>Inactive Only</option>
            </select>

            {/* Starred Filter */}
            <select 
              value={favoriteFilter} 
              onChange={(e) => setFavoriteFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-[var(--text-primary)] text-[0.82rem] outline-none transition-all duration-200 w-full box-border placeholder:text-slate-400 focus:border-[var(--accent-indigo)] focus:shadow-[0_0_0_3px_rgba(0,208,156,0.15)] focus:bg-white text-[var(--text-primary)] cursor-pointer filter-select"
            >
              <option value="all">All Stars</option>
              <option value="favorite">Starred Only</option>
              <option value="regular">Regular Only</option>
            </select>
          </div>
        </div>

        {/* Table Container */}
        <div className="table-card card-glass">
          
          {/* Bulk actions banner */}
          {selectedIds.length > 0 && (
            <div className="bulk-actions-banner">
              <div className="bulk-left">
                <span className="selected-count">{selectedIds.length} terms selected</span>
              </div>
              <div className="bulk-btns">
                <button 
                  onClick={() => handleBulkStatusChange(KeywordStatus.ACTIVE)} 
                  className="btn-secondary" 
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  Activate Selected
                </button>
                <button 
                  onClick={() => handleBulkStatusChange(KeywordStatus.INACTIVE)} 
                  className="btn-secondary" 
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
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
            {pageLoading ? (
              <div className="empty-state">
                <RefreshCw className="empty-icon animate-spin" />
                <p>Loading keyword database...</p>
              </div>
            ) : filteredKeywords.length === 0 ? (
              <div className="empty-state">
                <Search className="empty-icon" />
                <h4>No search terms match</h4>
                <p>Try resetting filters or creating a new search keyword.</p>
                <button onClick={handleOpenCreateModal} className="btn-primary" style={{ marginTop: '12px' }}>
                  <Plus size={16} /> Create Search Term
                </button>
              </div>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th className="td-checkbox">
                      <input 
                        type="checkbox" 
                        checked={filteredKeywords.every(k => selectedIds.includes(k.id))}
                        onChange={(e) => handleSelectAll(e, filteredKeywords)}
                        className="checkbox-glow"
                      />
                    </th>
                    <th style={{ width: '40px' }}>Starred</th>
                    <th>Query Keyword</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Matches</th>
                    <th>Last Searched</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
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
                          >
                            <Star size={16} fill={kw.isFavorite ? '#fbbf24' : 'none'} />
                          </button>
                        </td>
                        <td className="td-keyword">
                          {/* Render logical operators with styling */}
                          {kw.keyword.split(/(\s+AND\s+|\s+OR\s+|\s+NOT\s+)/i).map((part, index) => {
                            const upperPart = part.toUpperCase();
                            if ([' AND ', ' OR ', ' NOT '].includes(upperPart)) {
                              return (
                                <span key={index} className="boolean-token">
                                  {part}
                                </span>
                              );
                            }
                            return <span key={index}>{part}</span>;
                          })}
                        </td>
                        <td>
                          <span className="badge badge-indigo">{kw.category}</span>
                        </td>
                        <td>
                          <span className="td-priority-badge">
                            <span className={`priority-dot ${kw.priority.toLowerCase()}`} />
                            {kw.priority}
                          </span>
                        </td>
                        <td>
                          <button 
                            onClick={() => handleToggleStatus(kw.id, kw.status)}
                            className={`badge ${kw.status === KeywordStatus.ACTIVE ? 'badge-success' : 'badge-danger'}`}
                            style={{ cursor: 'pointer', border: 'none', font: 'inherit' }}
                          >
                            {kw.status}
                          </button>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: kw.matchesFound > 0 ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                          {kw.matchesFound}
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {kw.lastSearchedAt ? new Date(kw.lastSearchedAt).toLocaleDateString() : 'Never'}
                        </td>
                        <td>
                          <div className="action-btns">
                            <button onClick={() => handleEditClick(kw)} className="icon-btn" title="Edit">
                              <Edit size={14} />
                            </button>
                            <button onClick={() => handleDelete(kw.id)} className="icon-btn delete" title="Delete">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Create / Edit Search Term Modal */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={handleCancelEdit}>
          <div className="create-modal card-glass" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Plus size={18} /> {editId ? 'Edit Keyword' : 'Create Search Term'}
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
                  placeholder='("AI Development" OR "Machine Learning") AND ("looking for" OR "need help")'
                  value={keywordText}
                  onChange={handleKeywordChange}
                  className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-[var(--text-primary)] text-[0.82rem] outline-none transition-all duration-200 w-full box-border placeholder:text-slate-400 focus:border-[var(--accent-indigo)] focus:shadow-[0_0_0_3px_rgba(0,208,156,0.15)] focus:bg-white"
                  autoFocus
                />
                <span className="helper-text">
                  Supports boolean operators: <b>AND</b>, <b>OR</b>, <b>NOT</b>, and brackets.
                </span>
              </div>

              <div className="form-group">
                <label>Category</label>
                <input 
                  type="text" 
                  placeholder="e.g. Sales, Recruiting, HR"
                  value={categoryText}
                  onChange={(e) => setCategoryText(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-[var(--text-primary)] text-[0.82rem] outline-none transition-all duration-200 w-full box-border placeholder:text-slate-400 focus:border-[var(--accent-indigo)] focus:shadow-[0_0_0_3px_rgba(0,208,156,0.15)] focus:bg-white"
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
                <select 
                  value={priorityValue} 
                  onChange={(e) => setPriorityValue(e.target.value as Priority)}
                  className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-[var(--text-primary)] text-[0.82rem] outline-none transition-all duration-200 w-full box-border placeholder:text-slate-400 focus:border-[var(--accent-indigo)] focus:shadow-[0_0_0_3px_rgba(0,208,156,0.15)] focus:bg-white text-[var(--text-primary)] cursor-pointer"
                >
                  <option value={Priority.LOW}>Low Priority</option>
                  <option value={Priority.MEDIUM}>Medium Priority</option>
                  <option value={Priority.HIGH}>High Priority</option>
                </select>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={isFavoriteCheck}
                    onChange={(e) => setIsFavoriteCheck(e.target.checked)}
                    className="checkbox-glow"
                  />
                  Mark as Starred / Favorite
                </label>
              </div>

              {formError && (
                <div className="error-text">
                  {formError}
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

      {/* CSV Import Modal */}
      {showCsvModal && (
        <div className="modal-backdrop" onClick={() => setShowCsvModal(false)}>
          <div className="create-modal card-glass" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Import Keywords CSV</h3>
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
                  CSV headers should be: <b>keyword, category, priority, isFavorite</b>
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
                    <FileSpreadsheet size={16} style={{ color: 'var(--color-success)' }} />
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
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'red' }}>Parsing errors found:</span>
                  {csvErrorList.map((err, idx) => (
                    <span key={idx} className="csv-error-line">• {err}</span>
                  ))}
                </div>
              )}

              {/* Success message */}
              {importSuccess && (
                <div className="selected-file-banner" style={{ background: 'var(--color-success-bg)', borderColor: 'var(--color-success-bg)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-success)' }}>{importSuccess}</span>
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

