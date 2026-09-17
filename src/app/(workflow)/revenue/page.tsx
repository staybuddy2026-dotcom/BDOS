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
    <div className="dashboard-page" style={{ 
      display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', boxSizing: 'border-box',
      backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.6), rgba(248, 250, 252, 0.6)), url(${blob.src})`,
      backgroundSize: 'cover', backgroundPosition: 'top right', backgroundRepeat: 'no-repeat', backgroundAttachment: 'fixed'
    }}>
      <style>{`
        .premium-kpi-card { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 1); border-radius: 12px; padding: 16px; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.04), inset 0 0 0 1px rgba(255, 255, 255, 0.5); position: relative; overflow: hidden; cursor: default; display: flex; flex-direction: column; gap: 4px; min-width: 0; box-sizing: border-box; }
        .premium-kpi-card::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(135deg, var(--glow-color) 0%, transparent 50%); opacity: 0.3; transition: opacity 0.4s ease; pointer-events: none; }
        .premium-kpi-card:hover { transform: translateY(-4px) scale(1.02); box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.08), inset 0 0 0 1px rgba(255, 255, 255, 0.8); border-color: transparent; }
        .premium-kpi-card:hover::before { opacity: 0.6; }
        .kpi-glow { position: absolute; bottom: -30px; right: -30px; width: 100px; height: 100px; border-radius: 50%; background: var(--glow-color); filter: blur(30px); opacity: 0.5; transition: all 0.5s ease; pointer-events: none; }
        .premium-kpi-card:hover .kpi-glow { transform: scale(1.3); opacity: 0.8; }
      `}</style>

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
          <div style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)', padding: '8px', borderRadius: '8px', boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)' }}>
            <DollarSign size={20} style={{ color: '#ffffff' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, background: 'linear-gradient(135deg, #0f172a, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
              AI Revenue Operating System
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#8ba0cb', fontWeight: 600, letterSpacing: '0.03em', marginTop: '4px', margin: 0 }}>
              Complete enterprise revenue lifecycle: lead discovery to project handover
            </p>
          </div>
        </div>

        {/* Live Engine Status Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.76rem', background: 'var(--color-success-bg)', color: 'var(--color-success)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 14px', borderRadius: '20px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-success)' }} /> Forecast Accuracy {telemetry.forecastAccuracyPercent}%
          </span>
          <span style={{ fontSize: '0.72rem', background: 'var(--accent-indigo-glow)', color: 'var(--accent-indigo)', border: '1px solid var(--border-focus)', padding: '4px 12px', borderRadius: '20px', fontWeight: 800 }}>
            FY Target {telemetry.annualSalesTargetInr}
          </span>
        </div>
      </div>
      
      <WorkflowGuide activeStep={7} />

      {/* SCROLLABLE MAIN CONTENT */}
      <div
        className="dashboard-scrollable-content"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 28px 40px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          position: 'relative'
        }}
      >
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
  );
}
