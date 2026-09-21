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
    <div className="flex items-center justify-between flex-wrap gap-3 w-full">
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Breadcrumb Path */}
        <div className="flex items-center gap-2 text-[0.82rem] bg-white px-4 py-1.5 rounded-full border border-[#e2e8f0] shadow-[0_2px_8px_rgba(15,23,42,0.04)] font-semibold">
          <Link
            href="/"
            className="flex items-center gap-1.5 no-underline text-[#64748b] transition-colors duration-200 hover:text-[#3b82f6]"
          >
            <Home size={14} className="text-[#94a3b8]" /> Dashboard
          </Link>
          <ChevronRight size={14} className="text-[#cbd5e1]" />
          <span className="flex items-center gap-1.5 text-[#4f46e5] font-extrabold">
            {currentTitle}
          </span>
        </div>
      </div>

      {/* Step Badge / Status */}
      <div className="flex items-center gap-2">
        {stepNumber && (
          <span className="text-[0.74rem] font-extrabold bg-[rgba(79,70,229,0.1)] text-[#4f46e5] border-[1.5px] border-[rgba(79,70,229,0.25)] px-2.5 py-1 rounded-full">
            Step {stepNumber} of {totalSteps} in Guided Sales Flow
          </span>
        )}
        {badge && (
          <span className="text-[0.75rem] font-bold bg-[#f1f5f9] text-[#334155] border border-[#cbd5e1] px-2.5 py-1 rounded-full">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
