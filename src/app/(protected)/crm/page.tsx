import { Kanban } from 'lucide-react';
import { AuthService } from '@/lib/auth';
import { getCrmBoard } from '@/features/crm/actions';
import { getMailboxStatusAction } from '@/features/email/actions';
import { CrmWorkspace } from '@/components/crm/CrmWorkspace';
import { PageShell } from '@/components/ui/PageShell';
import { WorkflowGuide } from '@/components/WorkflowGuide';
import { BreadcrumbHeader } from '@/components/navigation/BreadcrumbHeader';
import '@/styles/globals.css';

export const dynamic = 'force-dynamic';

export default async function CrmPage({ searchParams }: { searchParams: Promise<{ deal?: string }> }) {
  await AuthService.verifySession();

  const [board, mailbox, params] = await Promise.all([getCrmBoard(), getMailboxStatusAction(), searchParams]);

  return (
    <PageShell
      icon={Kanban}
      title="CRM Pipeline"
      subtitle="Every lead from Apollo, LinkedIn and the marketplace in one pipeline: claim, contact, meet, propose, close"
      beforeContent={<WorkflowGuide activeStep={6} />}
      breadcrumb={<BreadcrumbHeader currentTitle="CRM Pipeline" stepNumber={6} totalSteps={7} badge={board.canSeeAll ? 'Team pipeline' : 'My pipeline'} />}
    >
      <CrmWorkspace initialBoard={board} mailbox={mailbox} initialDealId={params.deal} />
    </PageShell>
  );
}
