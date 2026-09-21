'use client';

import Link from 'next/link';
import { Target, ChevronRight, CheckCircle2, ArrowRight } from 'lucide-react';

export function WorkflowGuide({ activeStep }: { activeStep: number }) {
  const steps = [
    { step: 1, name: 'AI Priorities', link: '/priorities', hint: 'Daily Queue' },
    { step: 2, name: 'Apollo B2B Search', link: '/apollo-search', hint: 'Find Decision Makers' },
    { step: 3, name: 'Research Company 360', link: '/company', hint: 'Tech Stack & Profiles' },
    { step: 4, name: 'AI Outreach Generator', link: '/engagement', hint: 'Personalized Copies' },
    { step: 5, name: 'Review Queue', link: '/review', hint: 'Approve & Dispatch' },
    { step: 6, name: 'Automated Sequences', link: '/re-engagement', hint: 'Follow-up Schedules' },
    { step: 7, name: 'Revenue Pipeline', link: '/revenue', hint: 'Manage CRM Deals' },
  ];

  return (
    <div className="px-7 pt-4">
      <div className="bg-white backdrop-blur-xl border border-slate-200/60 rounded-[16px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-500 hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)] relative overflow-hidden group/container">
        {/* Subtle decorative background gradient */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none transition-transform duration-1000 group-hover/container:scale-110" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-blue-500/5 blur-3xl pointer-events-none transition-transform duration-1000 group-hover/container:scale-110" />

        <div className="relative z-10">
          <div className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2.5">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-1.5 rounded-lg text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]">
              <Target size={18} strokeWidth={2.5} className="animate-[pulse_3s_ease-in-out_infinite]" />
            </div>
            Daily BDE Guided Sales Execution Flow
          </div>

          <div className="flex items-center justify-between w-full gap-2 overflow-x-auto pt-3 pb-4 custom-scrollbar px-1 -mx-1">
            {steps.map((s, index) => {
              const isActive = activeStep === s.step;
              const isPast = s.step < activeStep;

              let cardStyle = '';
              let badgeStyle = '';
              let titleStyle = '';
              let hintStyle = '';

              if (isActive) {
                cardStyle = 'bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 border-transparent shadow-[0_10px_30px_rgba(99,102,241,0.4)] -translate-y-1.5 ring-2 ring-indigo-500/30 ring-offset-2';
                badgeStyle = 'bg-white/20 text-white shadow-sm';
                titleStyle = 'text-white';
                hintStyle = 'text-indigo-100/90';
              } else if (isPast) {
                cardStyle = 'bg-slate-50 border-slate-200 hover:bg-white hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300';
                badgeStyle = 'bg-indigo-100/80 text-indigo-700';
                titleStyle = 'text-slate-700';
                hintStyle = 'text-slate-500';
              } else {
                cardStyle = 'bg-indigo-50 border-slate-200 opacity-80 hover:opacity-100 hover:border-indigo-200 hover:bg-indigo-50/30 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300';
                badgeStyle = 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors duration-300';
                titleStyle = 'text-slate-600 group-hover:text-slate-800 transition-colors duration-300';
                hintStyle = 'text-slate-400 group-hover:text-slate-500 transition-colors duration-300';
              }

              return (
                <div key={s.step} className="flex items-center gap-2 min-w-[150px] flex-1">
                  <Link
                    href={s.link}
                    className={`flex-1 flex flex-col gap-2 p-4 rounded-[12px] border transition-all duration-300 ease-out cursor-pointer group relative overflow-hidden ${cardStyle}`}
                  >
                    {/* Animated shine effect on hover for active card */}
                    {isActive && (
                      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
                    )}

                    <div className="flex items-center justify-between relative z-10">
                      <div className={`text-[0.65rem] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full w-fit flex items-center gap-1.5 transition-all duration-300 ${badgeStyle}`}>
                        {isPast && <CheckCircle2 size={12} strokeWidth={3} className="text-indigo-600" />}
                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                        STEP {s.step}
                      </div>
                      {!isActive && (
                        <ArrowRight size={14} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-indigo-400" />
                      )}
                    </div>
                    <div className="relative z-10 mt-1">
                      <div className={`text-[0.9rem] font-bold leading-tight ${titleStyle}`}>{s.name}</div>
                      <div className={`text-[0.75rem] font-medium mt-1 ${hintStyle}`}>{s.hint}</div>
                    </div>
                  </Link>

                  {index < steps.length - 1 && (
                    <div className="flex-shrink-0 hidden md:flex items-center justify-center w-6 relative">
                      <div className={`h-[2px] w-full rounded-full ${isPast ? 'bg-indigo-300' : 'bg-slate-200'}`} />
                      <ChevronRight
                        size={20}
                        strokeWidth={2.5}
                        className={`absolute bg-white/80 rounded-full ${isPast ? 'text-indigo-400' : 'text-slate-300'}`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(226, 232, 240, 0.4);
          border-radius: 8px;
          margin: 0 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 8px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background: #94a3b8;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
      `}} />
    </div>
  );
}

