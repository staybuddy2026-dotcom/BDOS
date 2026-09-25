import { AuthService } from '@/lib/auth';
import { generateOutreachDraftAction, getEngagementTelemetryAction } from '@/features/outreach/actions';
import { EngagementWorkspace } from '@/components/outreach/EngagementWorkspace';
import { OutreachCampaignDashboard } from '@/components/outreach/OutreachCampaignDashboard';
import { BreadcrumbHeader } from '@/components/navigation/BreadcrumbHeader';
import { Send } from 'lucide-react';
import blob from '@/assets/blob.png';
import { WorkflowGuide } from '@/components/WorkflowGuide';
import '@/styles/globals.css';

export default async function SalesEngagementPage({ searchParams }: { searchParams: Promise<{ domain?: string }> | { domain?: string } }) {
  await AuthService.verifySession();

  const resolvedParams = await Promise.resolve(searchParams);
  const targetDomain = resolvedParams?.domain || '';

  const telemetry = await getEngagementTelemetryAction();
  const initialDraft = await generateOutreachDraftAction(targetDomain, 'EMAIL', 'COLD_OUTREACH', 'EXECUTIVE', false);

  return (
    <div className="dashboard-page" style={{ 
      display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden',
      backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.6), rgba(248, 250, 252, 0.6)), url(${blob.src})`,
      backgroundSize: 'cover',
      backgroundPosition: 'top right',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed'
    }}>
      {/* FIXED TOP HEADER */}
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
            <Send size={18} style={{ color: '#ffffff' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, background: 'linear-gradient(135deg, #0f172a, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
              AI Sales Engagement Workspace & Outreach Generator
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#8ba0cb', fontWeight: 600, letterSpacing: '0.03em', marginTop: '4px', margin: 0 }}>
              Automated multi-channel outreach generation, personalized AI copywriting & sequence scheduling
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '0.76rem', background: 'var(--color-success-bg, #ecfdf5)', color: 'var(--color-success, #047857)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 10px', borderRadius: '20px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-success, #10b981)' }} /> Response Rate {telemetry.responseRatePercent}% • {telemetry.meetingsBookedCount} Meetings Booked This Month 🚀
          </div>
        </div>
      </div>

      {/* SCROLLABLE MAIN CONTENT */}
      <div
        className="dashboard-scrollable-content"
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
      >
        <WorkflowGuide activeStep={4} />

        <div style={{ padding: '16px 28px 40px 28px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
        <BreadcrumbHeader
          currentTitle="AI Outreach Generator"
          stepNumber={4}
          totalSteps={7}
          badge="Omnichannel Engagement"
        />

        {/* Client Workspace Component */}
        <EngagementWorkspace initialDraft={initialDraft} telemetry={telemetry} />

        {/* Campaigns Dashboard */}
        <OutreachCampaignDashboard />
        </div>
      </div>
    </div>
  );
}
