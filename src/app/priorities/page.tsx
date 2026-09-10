import { AuthService } from '@/lib/auth';
import { getPrioritizedAccountsAction, getPrioritizationTelemetryAction } from '@/features/prioritization/actions';
import { PriorityDashboard } from '@/components/prioritization/PriorityDashboard';
import { BreadcrumbHeader } from '@/components/navigation/BreadcrumbHeader';
import { Flame } from 'lucide-react';
import '@/styles/globals.css';

export default async function DailyPrioritiesPage() {
  await AuthService.verifySession();

  const [accounts, telemetry] = await Promise.all([
    getPrioritizedAccountsAction(),
    getPrioritizationTelemetryAction(),
  ]);

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <BreadcrumbHeader
        currentTitle="AI Daily Priorities"
        stepNumber={1}
        totalSteps={7}
        badge="Daily Prospect Queue"
      />

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Flame size={24} style={{ color: 'var(--color-danger)' }} />
            <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
              AI Sales Command Center & Daily Priorities
            </h1>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Automated multi-provider buying readiness scoring, priority ranking & next best sales actions
          </p>
        </div>

        <div style={{ fontSize: '0.72rem', background: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '6px 12px', borderRadius: '8px', fontWeight: 800 }}>
          {telemetry.companiesToContactToday} Accounts Requiring Immediate Contact Today 🔥
        </div>
      </div>

      {/* Priority Dashboard Component */}
      <PriorityDashboard initialAccounts={accounts} telemetry={telemetry} />
    </div>
  );
}
