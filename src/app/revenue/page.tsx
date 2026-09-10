import { AuthService } from '@/lib/auth';
import { getRevenueDealsAction, getRevenueTelemetryAction } from '@/features/revenue/actions';
import { calculateRevenueForecast } from '@/features/revenue/forecasting';
import { RevenueDashboard } from '@/components/revenue/RevenueDashboard';
import { BreadcrumbHeader } from '@/components/navigation/BreadcrumbHeader';
import { DollarSign } from 'lucide-react';
import '@/styles/globals.css';

export default async function RevenueOSPage() {
  await AuthService.verifySession();

  const [deals, telemetry] = await Promise.all([
    getRevenueDealsAction(),
    getRevenueTelemetryAction(),
  ]);

  const forecast = calculateRevenueForecast(deals);

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <BreadcrumbHeader
        currentTitle="Revenue Pipeline & Forecasting"
        stepNumber={7}
        totalSteps={7}
        badge="Manage CRM Deals"
      />

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DollarSign size={24} style={{ color: 'var(--accent-indigo)' }} />
            <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
              AI Revenue Operating System (RevenueOS)
            </h1>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Complete enterprise revenue lifecycle management from lead discovery to project handover
          </p>
        </div>

        <div style={{ fontSize: '0.72rem', background: 'var(--accent-indigo-glow)', color: 'var(--accent-indigo)', border: '1px solid var(--border-focus)', padding: '6px 12px', borderRadius: '8px', fontWeight: 800 }}>
          Forecast Accuracy {telemetry.forecastAccuracyPercent}% • FY Target {telemetry.annualSalesTargetInr} 🚀
        </div>
      </div>

      {/* RevenueOS Dashboard */}
      <RevenueDashboard initialDeals={deals} telemetry={telemetry} forecast={forecast} />
    </div>
  );
}
