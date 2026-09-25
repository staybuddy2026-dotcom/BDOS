import { AuthService } from '@/lib/auth';
import { getPrioritizedAccountsAction, getPrioritizationTelemetryAction } from '@/features/prioritization/actions';
import { PriorityDashboard } from '@/components/prioritization/PriorityDashboard';
import { BreadcrumbHeader } from '@/components/navigation/BreadcrumbHeader';
import { Sparkles } from 'lucide-react';
import blob from '@/assets/blob.png';
import { WorkflowGuide } from '@/components/WorkflowGuide';
import '@/styles/globals.css';

export const dynamic = 'force-dynamic';

export default async function DailyPrioritiesPage() {
  await AuthService.verifySession();

  const [accounts, telemetry] = await Promise.all([
    getPrioritizedAccountsAction(),
    getPrioritizationTelemetryAction(),
  ]);

  return (
    <div 
      className="flex flex-col h-screen overflow-hidden box-border bg-cover bg-right-top bg-no-repeat bg-fixed"
      style={{ backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.6), rgba(248, 250, 252, 0.6)), url(${blob.src})` }}
    >
      {/* HEADER BANNER - CLEAN DESIGN */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-200 h-[65px] shrink-0 px-7 bg-white">
        <div className="flex items-center gap-3.5">
          <div className="bg-gradient-to-br from-indigo-500 to-blue-500 p-2.5 rounded-lg shadow-[0_4px_16px_rgba(99,102,241,0.3)]">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-[1.3rem] font-extrabold bg-gradient-to-br from-slate-900 to-blue-500 bg-clip-text text-transparent m-0">
              AI Sales Command Center & Daily Priorities
            </h1>
            <p className="text-[0.8rem] text-slate-400 font-semibold tracking-wide mt-1 m-0">
              Automated multi-provider buying readiness scoring, priority ranking & next best sales actions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-[0.72rem] bg-indigo-50/50 text-indigo-600 border border-indigo-200/50 px-3 py-1.5 rounded-lg font-extrabold">
            {telemetry.companiesToContactToday} Accounts Requiring Immediate Contact Today 🚀
          </div>
        </div>
      </div>
      
      {/* SCROLLABLE MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto flex flex-col relative">
        <WorkflowGuide activeStep={1} />
        
        <div className="px-7 pt-4 pb-6 flex flex-col gap-5 flex-1">
          <BreadcrumbHeader
            currentTitle="AI Daily Priorities"
            stepNumber={1}
            totalSteps={7}
            badge="Daily Prospect Queue"
          />

          {/* Priority Dashboard Component */}
          <PriorityDashboard initialAccounts={accounts} telemetry={telemetry} />
        </div>
      </div>
    </div>
  );
}
