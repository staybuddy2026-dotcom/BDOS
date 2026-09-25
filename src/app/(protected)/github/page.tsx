import { AuthService } from '@/lib/auth';
import { BreadcrumbHeader } from '@/components/navigation/BreadcrumbHeader';
import { GitBranch, AlertTriangle, Sparkles } from 'lucide-react';
import blob from '@/assets/blob.png';
import '@/styles/globals.css';

export default async function GitHubProviderWorkspacePage() {
  await AuthService.verifySession();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', boxSizing: 'border-box' }}>
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
            <GitBranch size={20} style={{ color: '#ffffff' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, background: 'linear-gradient(135deg, #0f172a, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
              GitHub Engineering Intelligence
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#8ba0cb', fontWeight: 600, letterSpacing: '0.03em', marginTop: '4px', margin: 0 }}>
              Repository & organization prospecting intelligence
            </p>
          </div>
        </div>

        <span style={{ fontSize: '0.72rem', background: 'var(--color-warning-bg)', color: 'var(--color-warning)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '4px 14px', borderRadius: '20px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-warning)' }} /> Coming Soon
        </span>
      </div>

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
          position: 'relative',
          backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.6), rgba(248, 250, 252, 0.6)), url(${blob.src})`,
          backgroundSize: 'cover',
          backgroundPosition: 'top right',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
        <BreadcrumbHeader
          currentTitle="GitHub Engineering Intelligence"
          badge="Coming Soon"
        />

        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          padding: '60px 24px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)'
        }}>
          <div style={{ background: 'var(--color-warning-bg)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '16px', borderRadius: '50%', color: 'var(--color-warning)', marginBottom: '16px' }}>
            <Sparkles size={32} />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            GitHub Integration Coming Soon
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px', maxWidth: '480px', lineHeight: '1.6' }}>
            Direct live GitHub API integration for repository & engineering intelligence prospecting is currently under active development.
            Use <strong style={{ color: 'var(--accent-indigo)' }}>Apollo.io</strong> for live, verified executive lead discovery and enrichment today.
          </p>
          <a
            href="/apollo-search"
            className="btn-primary"
            style={{ marginTop: '20px', textDecoration: 'none', background: 'linear-gradient(135deg, #6366f1, #3b82f6)', padding: '10px 20px', fontSize: '0.84rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            Switch to Apollo.io Live Search
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '24px', fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '8px 14px', borderRadius: '20px' }}>
            <AlertTriangle size={13} />
            No repositories, organizations, or analytics are fetched on this page while GitHub is in development.
          </div>
        </div>
      </div>
    </div>
  );
}
