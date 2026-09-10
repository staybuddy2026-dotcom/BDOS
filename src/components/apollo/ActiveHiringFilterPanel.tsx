'use client';

import { useState } from 'react';
import { Briefcase, Flame, Sparkles, Filter, Check, TrendingUp } from 'lucide-react';

interface ActiveHiringFilterPanelProps {
  currentHiringValue: string;
  onHiringChange: (value: string) => void;
  onApplyHiringFilter: (keyword: string) => void;
  searchMode: 'people' | 'companies';
}

export function ActiveHiringFilterPanel({
  currentHiringValue,
  onHiringChange,
  onApplyHiringFilter,
  searchMode,
}: ActiveHiringFilterPanelProps) {
  const [selectedRoleCategory, setSelectedRoleCategory] = useState<string | null>(null);

  const roleCategories = [
    {
      id: 'fullstack',
      label: 'Full-Stack & React 19 Squads',
      query: 'Hiring React, Node.js, Next.js Engineers',
      badge: '🔥 Highest Demand',
      openRolesCount: 14,
    },
    {
      id: 'backend',
      label: 'Backend & Cloud Microservices',
      query: 'Hiring Python, FastAPI, Golang Developers',
      badge: '⚡ High Intent',
      openRolesCount: 10,
    },
    {
      id: 'ai_ml',
      label: 'AI & LLM Integration Engineers',
      query: 'Hiring AI Engineers, PyTorch, OpenAI Experts',
      badge: '🤖 AI Boom',
      openRolesCount: 8,
    },
    {
      id: 'devops',
      label: 'DevOps, Kubernetes & Infra',
      query: 'Hiring DevOps, AWS, Kubernetes Architects',
      badge: '☁️ Cloud Infra',
      openRolesCount: 6,
    },
    {
      id: 'tech_lead',
      label: 'CTO & Engineering Leadership',
      query: 'Hiring CTO, VP Engineering, Tech Lead',
      badge: '👑 Executive Lead',
      openRolesCount: 4,
    },
  ];

  const hiringPresets = [
    'Hiring Developers',
    'Scaling Engineering Team',
    'Hiring React & Node.js',
    'Hiring AI Specialists',
    '10+ Tech Roles Open',
  ];

  const handleSelectPreset = (preset: string) => {
    onHiringChange(preset);
    onApplyHiringFilter(preset);
  };

  const handleSelectRole = (category: typeof roleCategories[0]) => {
    if (selectedRoleCategory === category.id) {
      setSelectedRoleCategory(null);
      onHiringChange('');
      onApplyHiringFilter('');
    } else {
      setSelectedRoleCategory(category.id);
      onHiringChange(category.query);
      onApplyHiringFilter(category.query);
    }
  };

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderLeft: '4px solid #6366f1',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
            color: '#ffffff',
            padding: '8px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
          }}>
            <Briefcase size={20} />
          </div>
          <div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              Active Hiring & Job Openings Intelligence <Flame size={16} style={{ color: '#f59e0b' }} />
            </h4>
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
              Filter {searchMode === 'people' ? 'decision makers' : 'target companies'} by active open engineering roles and hiring velocity signals
            </span>
          </div>
        </div>

        <span style={{ fontSize: '0.78rem', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '6px 12px', borderRadius: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TrendingUp size={14} /> Live Hiring Signals Active
        </span>
      </div>

      {/* Quick Hiring Keyword Search Input */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            value={currentHiringValue}
            onChange={(e) => onHiringChange(e.target.value)}
            placeholder="Search open roles e.g. Hiring React Developers, Scaling Backend, Hiring CTO..."
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              fontSize: '0.88rem',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#0f172a',
              outline: 'none',
              fontWeight: 600,
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.15)'; }}
            onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }}
          />
          <Filter size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
        </div>

        <button
          type="button"
          onClick={() => onApplyHiringFilter(currentHiringValue)}
          style={{
            padding: '10px 18px',
            fontSize: '0.85rem',
            fontWeight: 800,
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.4)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)'; }}
        >
          Apply Hiring Filter
        </button>
      </div>

      {/* Active Role Categories Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
        {roleCategories.map((cat) => {
          const isSelected = selectedRoleCategory === cat.id || currentHiringValue === cat.query;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleSelectRole(cat)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '12px 14px',
                borderRadius: '12px',
                border: isSelected ? '2px solid #6366f1' : '1px solid #e2e8f0',
                background: isSelected ? '#e0e7ff' : '#f8fafc',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                boxShadow: isSelected ? '0 4px 12px rgba(99, 102, 241, 0.15)' : 'none',
              }}
              onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.03)'; } }}
              onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: isSelected ? '#4f46e5' : '#0f172a' }}>
                  {cat.label}
                </span>
                <span style={{ fontSize: '0.7rem', background: '#ffffff', border: '1px solid #cbd5e1', color: '#475569', padding: '2px 6px', borderRadius: '6px', fontWeight: 700 }}>
                  {cat.openRolesCount} Openings
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: isSelected ? '#4338ca' : '#64748b', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                <Sparkles size={12} style={{ color: isSelected ? '#4f46e5' : '#f59e0b' }} /> {cat.badge}
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick Hiring Preset Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b' }}>Quick Hiring Keywords:</span>
        {hiringPresets.map((preset) => {
          const isActive = currentHiringValue === preset;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              style={{
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '0.76rem',
                fontWeight: 700,
                border: isActive ? '1px solid #6366f1' : '1px solid #e2e8f0',
                background: isActive ? '#6366f1' : '#f8fafc',
                color: isActive ? '#ffffff' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: isActive ? '0 4px 10px rgba(99, 102, 241, 0.2)' : 'none',
              }}
              onMouseEnter={(e) => { if(!isActive) { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f1f5f9'; } }}
              onMouseLeave={(e) => { if(!isActive) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; } }}
            >
              {isActive && <Check size={12} />}
              {preset}
            </button>
          );
        })}
      </div>
    </div>
  );
}
