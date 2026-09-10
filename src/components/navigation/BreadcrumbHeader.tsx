'use client';

import Link from 'next/link';
import { Home, ChevronRight } from 'lucide-react';

interface BreadcrumbHeaderProps {
  currentTitle: string;
  stepNumber?: number;
  totalSteps?: number;
  badge?: string;
}

export function BreadcrumbHeader({
  currentTitle,
  stepNumber,
  totalSteps = 7,
  badge,
}: BreadcrumbHeaderProps) {

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>




        {/* Breadcrumb Path */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          fontSize: '0.82rem', 
          background: '#ffffff',
          padding: '6px 16px',
          borderRadius: '100px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
          fontWeight: 600 
        }}>
          <Link
            href="/"
            style={{
              color: '#64748b',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#3b82f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#64748b';
            }}
          >
            <Home size={14} style={{ color: '#94a3b8' }} /> Dashboard
          </Link>
          <ChevronRight size={14} style={{ color: '#cbd5e1' }} />
          <span style={{
            color: '#4f46e5', // Premium Indigo
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            {currentTitle}
          </span>
        </div>
      </div>

      {/* Step Badge / Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {stepNumber && (
          <span
            style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              background: 'rgba(79, 70, 229, 0.1)',
              color: '#4f46e5',
              border: '1.5px solid rgba(79, 70, 229, 0.25)',
              padding: '4px 10px',
              borderRadius: '20px',
            }}
          >
            Step {stepNumber} of {totalSteps} in Guided Sales Flow
          </span>
        )}
        {badge && (
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              background: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              padding: '4px 10px',
              borderRadius: '20px',
            }}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
