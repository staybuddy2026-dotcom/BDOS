import { KeywordStatus } from '@prisma/client';
import { Share2 } from 'lucide-react';
import { AuthService } from '@/lib/auth';
import { db } from '@/lib/db';
import { getLinkedInInboxAction, getLinkedInStatusAction } from '@/features/linkedin/actions';
import { LinkedInWorkspace } from '@/components/linkedin/LinkedInWorkspace';
import { BreadcrumbHeader } from '@/components/navigation/BreadcrumbHeader';
import blob from '@/assets/blob.png';
import '@/styles/globals.css';

export const dynamic = 'force-dynamic';

export default async function LinkedInPage() {
  await AuthService.verifySession();

  const [status, inbox, activeKeywordCount] = await Promise.all([
    getLinkedInStatusAction(),
    getLinkedInInboxAction().catch(() => []),
    db.keyword.count({ where: { status: KeywordStatus.ACTIVE } }).catch(() => 0),
  ]);

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
          <div style={{ background: 'linear-gradient(135deg, #0a66c2, #3b82f6)', padding: '10px', borderRadius: '8px', boxShadow: '0 4px 16px rgba(10, 102, 194, 0.3)' }}>
            <Share2 size={18} style={{ color: '#ffffff' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, background: 'linear-gradient(135deg, #0f172a, #0a66c2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
              LinkedIn Prospecting
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#8ba0cb', fontWeight: 600, letterSpacing: '0.03em', margin: 0 }}>
              Buying-signal posts, decision makers and keyword scans, feeding your Review Queue and CRM
            </p>
          </div>
        </div>
      </div>

      {/* SCROLLABLE MAIN CONTENT */}
      <div className="dashboard-scrollable-content" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ padding: '16px 28px 40px 28px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
          <BreadcrumbHeader currentTitle="LinkedIn" badge="Social Prospecting" />
          <LinkedInWorkspace initialStatus={status} initialInbox={inbox} activeKeywordCount={activeKeywordCount} />
        </div>
      </div>
    </div>
  );
}
