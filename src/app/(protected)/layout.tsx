import { Sidebar } from '@/components/Sidebar';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/jwt';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  let user = null;
  if (session) {
    user = await decrypt(session);
  }

  return (
    <div className="app-shell">
      <Sidebar user={user} />
      <main className="main-content">
        <div className="page-container animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
