import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { CommandPalette } from '@/components/navigation/CommandPalette';
import { AuthService } from '@/lib/auth';
import { getTodayCount } from '@/features/today/service';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await AuthService.getCurrentUser();
  // The cookie can outlive its account (deleted or deactivated): clear it and return to sign-in.
  if (!user) redirect('/api/auth/logout');
  const todayCount = await getTodayCount(user).catch(() => 0);

  return (
    <div className="app-shell">
      <Sidebar user={user} todayCount={todayCount} />
      <CommandPalette role={user.role} />
      <main className="main-content">
        <div className="page-container animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
