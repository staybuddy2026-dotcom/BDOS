import { CalendarCheck } from 'lucide-react';
import { AuthService } from '@/lib/auth';
import { getTodaySummary } from '@/features/today/service';
import { TodayWorkspace } from '@/components/today/TodayWorkspace';
import { PageShell } from '@/components/ui/PageShell';
import '@/styles/globals.css';

export const dynamic = 'force-dynamic';

export default async function TodayPage() {
  const user = await AuthService.verifySession();
  const data = await getTodaySummary(user);

  return (
    <PageShell
      icon={CalendarCheck}
      title="Today"
      subtitle="Your follow-ups, deal actions, tasks and meetings for the day"
      badge={new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}
    >
      <TodayWorkspace initialData={data} name={user.name} />
    </PageShell>
  );
}
