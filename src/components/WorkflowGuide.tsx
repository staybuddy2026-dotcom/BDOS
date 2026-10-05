'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';

/**
 * Slim step bar for the guided BDE flow. Shows where this page sits in the day's work and
 * links to every other step; earlier steps are ticked, the current one is highlighted.
 */
export function WorkflowGuide({ activeStep, stepOverrides }: { activeStep: number, stepOverrides?: Record<number, { name?: string, hint?: string }> }) {
  // The BDE flow: decide who to work on, find and research them, write and send outreach,
  // then run the deal in the CRM until it closes. Pages pass the same step number to BreadcrumbHeader.
  const defaultSteps = [
    { step: 1, name: 'Priorities', link: '/priorities', hint: 'Accounts showing buying signals today' },
    { step: 2, name: 'Find leads', link: '/apollo-search', hint: 'Apollo, LinkedIn or the Marketplace' },
    { step: 3, name: 'Research', link: '/company', hint: 'Company 360: stack, growth and fit' },
    { step: 4, name: 'Write outreach', link: '/engagement', hint: 'AI-written email and LinkedIn sequences' },
    { step: 5, name: 'Review & send', link: '/review', hint: 'Check, edit and approve every message' },
    { step: 6, name: 'CRM', link: '/crm', hint: 'Meetings, proposals, won or lost' },
    { step: 7, name: 'Forecast', link: '/revenue', hint: 'Expected revenue from open deals' },
  ];

  const steps = defaultSteps.map(s => {
    if (stepOverrides && stepOverrides[s.step]) {
      return { ...s, ...stepOverrides[s.step] };
    }
    return s;
  });

  return (
    <nav aria-label="BDE workflow" className="px-7 pt-4 max-[768px]:px-4">
      <ol className="m-0 flex list-none items-center gap-1.5 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-xl p-2 shadow-[0_4px_20px_rgba(15,23,42,0.05)] transition-all duration-300 hover:shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
        {steps.map((s, index) => {
          const isActive = activeStep === s.step;
          const isPast = s.step < activeStep;
          return (
            <li key={s.step} className="flex shrink-0 items-center gap-1.5">
              <Link
                href={s.link}
                title={s.hint}
                aria-current={isActive ? 'step' : undefined}
                className={`group flex items-center gap-2 rounded-xl px-3 py-1.5 text-[0.8rem] font-bold whitespace-nowrap no-underline transition-all duration-300 ease-out ${
                  isActive ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 !text-white shadow-[0_4px_14px_rgba(99,102,241,0.4)] scale-105 mx-1 ring-2 ring-indigo-600/20 ring-offset-1' : isPast ? 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:-translate-y-0.5 hover:shadow-[0_4px_10px_rgba(99,102,241,0.1)]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 hover:-translate-y-0.5 hover:shadow-[0_4px_10px_rgba(15,23,42,0.04)]'
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[0.68rem] font-bold transition-all duration-300 group-hover:scale-110 ${
                    isActive ? 'bg-white/25 !text-white shadow-inner' : isPast ? 'bg-indigo-100 text-indigo-700 group-hover:bg-indigo-200' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                  }`}
                >
                  {isPast ? <Check size={12} strokeWidth={3} className="transition-transform group-hover:scale-110" /> : s.step}
                </span>
                {s.name}
              </Link>
              {index < steps.length - 1 && <span aria-hidden className={`h-[2px] w-4 rounded-full transition-colors duration-300 ${isPast ? 'bg-indigo-400/60' : 'bg-slate-200'}`} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
