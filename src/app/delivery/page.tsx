import { AuthService } from '@/lib/auth';
import { getDeliveryProjectsAction, getDeliveryTelemetryAction } from '@/features/delivery/actions';
import { DeliveryDashboard } from '@/components/delivery/DeliveryDashboard';
import { BreadcrumbHeader } from '@/components/navigation/BreadcrumbHeader';
import { Layers } from 'lucide-react';
import '@/styles/globals.css';

export default async function DeliveryOSPage() {
  await AuthService.verifySession();

  const [projects, telemetry] = await Promise.all([
    getDeliveryProjectsAction(),
    getDeliveryTelemetryAction(),
  ]);

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <BreadcrumbHeader
        currentTitle="Delivery Handoff Engine"
        badge="Project Delivery & Squads"
      />

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={24} style={{ color: 'var(--color-success)' }} />
            <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
              AI Project Delivery Handoff Engine (DeliveryOS)
            </h1>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Zero manual copy-paste: Won Sales Deals automatically provision squad allocation, sprint plans, milestones & GitHub repos
          </p>
        </div>

        <div style={{ fontSize: '0.72rem', background: 'var(--color-success-bg)', color: 'var(--color-success)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '6px 12px', borderRadius: '8px', fontWeight: 800 }}>
          Delivery Health {telemetry.deliveryHealthPercent}% • Revenue in Delivery {telemetry.revenueInDeliveryInr} 🚀
        </div>
      </div>

      {/* DeliveryOS Dashboard */}
      <DeliveryDashboard initialProjects={projects} telemetry={telemetry} />
    </div>
  );
}
