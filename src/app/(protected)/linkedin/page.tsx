import { KeywordStatus } from '@prisma/client';
import { Share2 } from 'lucide-react';
import { AuthService } from '@/lib/auth';
import { db } from '@/lib/db';
import { getLinkedInInboxAction, getLinkedInStatusAction } from '@/features/linkedin/actions';
import { LinkedInWorkspace } from '@/components/linkedin/LinkedInWorkspace';
import { PageShell } from '@/components/ui/PageShell';
import { WorkflowGuide } from '@/components/WorkflowGuide';
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
    <PageShell icon={Share2} title="LinkedIn" subtitle="Buying-signal posts, decision makers and keyword scans, feeding your Review Queue and CRM" badge="Social Prospecting" beforeContent={<WorkflowGuide activeStep={2} />}>
      <LinkedInWorkspace initialStatus={status} initialInbox={inbox} activeKeywordCount={activeKeywordCount} />
    </PageShell>
  );
}
