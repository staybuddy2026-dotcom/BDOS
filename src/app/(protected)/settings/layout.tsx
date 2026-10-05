import { redirect } from 'next/navigation';
import { AuthService } from '@/lib/auth';

/** Workspace settings hold the provider API keys and AI configuration, so they are admin-only. */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await AuthService.verifySession();
  if (user.role !== 'ADMIN') redirect('/dashboard');
  return children;
}
