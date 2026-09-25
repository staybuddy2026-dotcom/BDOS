import { AuthService } from '@/lib/auth';
import { getRevenueDealsAction, getRevenueTelemetryAction } from '@/features/revenue/actions';
import { calculateRevenueForecast } from '@/features/revenue/forecasting';
import { RevenueDashboard } from '@/components/revenue/RevenueDashboard';
import { BreadcrumbHeader } from '@/components/navigation/BreadcrumbHeader';
import { DollarSign } from 'lucide-react';
import blob from '@/assets/blob.png';
import { WorkflowGuide } from '@/components/WorkflowGuide';
import '@/styles/globals.css';

export default async function RevenueOSPage() {
  await AuthService.verifySession();

  const [deals, telemetry] = await Promise.all([
    getRevenueDealsAction(),
    getRevenueTelemetryAction(),
  ]);

  const forecast = calculateRevenueForecast(deals);

  return (
    <div 
      className="flex flex-col h-screen overflow-hidden box-border bg-cover bg-right-top bg-no-repeat bg-fixed"
      style={{ backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.6), rgba(248, 250, 252, 0.6)), url(${blob.src})` }}
    >
      {/* HEADER BANNER - CLEAN DESIGN */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-200 h-[65px] shrink-0 px-7 bg-white">
        <div className="flex items-center gap-3.5">
          <div className="bg-gradient-to-br from-indigo-500 to-blue-500 p-2.5 rounded-lg shadow-[0_4px_16px_rgba(99,102,241,0.3)]">
            <DollarSign size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-[1.3rem] font-extrabold bg-gradient-to-br from-slate-900 to-blue-500 bg-clip-text text-transparent m-0">
              AI Revenue Operating System
            </h2>
            <p className="text-[0.8rem] text-slate-400 font-semibold tracking-wide mt-1 m-0">
              Complete enterprise revenue lifecycle: lead discovery to project handover
            </p>
          </div>
        </div>

        {/* Live Engine Status Pills */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[0.76rem] bg-emerald-50 text-emerald-600 border border-emerald-200/50 px-3.5 py-1 rounded-full font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Forecast Accuracy {telemetry.forecastAccuracyPercent}%
          </span>
          <span className="text-[0.72rem] bg-indigo-50/50 text-indigo-600 border border-indigo-200/50 px-3 py-1 rounded-full font-extrabold">
            FY Target {telemetry.annualSalesTargetInr}
          </span>
        </div>
      </div>
      
      {/* SCROLLABLE MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto flex flex-col relative">
        <WorkflowGuide activeStep={7} />
        <div className="px-7 pt-4 pb-10 flex flex-col gap-4 flex-1">
          {/* Top Navigation & Breadcrumb */}
          <BreadcrumbHeader
            currentTitle="Revenue Pipeline & Forecasting"
            stepNumber={7}
            totalSteps={7}
            badge="Manage CRM Deals"
          />

          {/* RevenueOS Dashboard */}
          <RevenueDashboard initialDeals={deals} telemetry={telemetry} forecast={forecast} />
        </div>
      </div>
    </div>
  );
}
