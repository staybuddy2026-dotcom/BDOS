import { redirect } from 'next/navigation';
import { Users } from 'lucide-react';
import { AuthService } from '@/lib/auth';
import { canManageTeam, canSeeAllDeals } from '@/lib/roles';
import { getTeamMembersAction } from '@/features/team/actions';
import { TeamWorkspace } from '@/components/team/TeamWorkspace';
import { PageShell } from '@/components/ui/PageShell';
import '@/styles/globals.css';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const user = await AuthService.verifySession();
  if (!canSeeAllDeals(user.role)) redirect('/dashboard');

  const members = await getTeamMembersAction();

  return (
    <PageShell icon={Users} title="Team" subtitle="Who can sign in, what they can see, and how much each person is carrying" badge={canManageTeam(user.role) ? 'Admin' : 'View only'}>
      <TeamWorkspace initialMembers={members} meId={user.id} canManage={canManageTeam(user.role)} />
    </PageShell>
  );
}
