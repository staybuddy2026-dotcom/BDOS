import { AuthService } from '@/lib/auth';
import { getPrioritizedAccountsAction, getPrioritizationTelemetryAction } from '@/features/prioritization/actions';
import { PriorityDashboard } from '@/components/prioritization/PriorityDashboard';
import { BreadcrumbHeader } from '@/components/navigation/BreadcrumbHeader';
import { Sparkles } from 'lucide-react';
import blob from '@/assets/blob.png';
import '@/styles/globals.css';

export default async function DailyPrioritiesPage() {
  await AuthService.verifySession();

  const [accounts, telemetry] = await Promise.all([
    getPrioritizedAccountsAction(),
    getPrioritizationTelemetryAction(),
  ]);

  return (
    <div className="dashboard-page" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', gap: 0, paddingBottom: 0, boxSizing: 'border-box' }}>
      
      {/* HEADER BANNER */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        borderBottom: '1px solid var(--border-subtle)',
        height: '65px',
        flexShrink: 0,
        padding: '0 28px',
        background: 'var(--bg-primary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)', padding: '10px', borderRadius: '8px', boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)' }}>
            <Sparkles size={18} style={{ color: 'var(--bg-primary)' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, background: 'linear-gradient(135deg, #0f172a, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
              AI Sales Command Center & Daily Priorities
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#8ba0cb', fontWeight: 600, letterSpacing: '0.03em', marginTop: '4px', margin: 0 }}>
              Automated multi-provider buying readiness scoring, priority ranking & next best sales actions
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '0.72rem', background: 'var(--accent-indigo-glow)', color: 'var(--accent-indigo)', border: '1px solid var(--border-focus)', padding: '6px 12px', borderRadius: '8px', fontWeight: 800 }}>
            {telemetry.companiesToContactToday} Accounts Requiring Immediate Contact Today 🚀
          </div>
        </div>
      </div>

      {/* SCROLLABLE MAIN CONTENT */}
      <div
        className="dashboard-scrollable-content"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 28px 24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          position: 'relative',
          backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.6), rgba(248, 250, 252, 0.6)), url(${blob.src})`,
          backgroundSize: 'cover',
          backgroundPosition: 'top right',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
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
  );
}
