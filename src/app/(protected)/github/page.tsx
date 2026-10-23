import { Code } from 'lucide-react';
import { AuthService } from '@/lib/auth';
import { getGitHubRate } from '@/features/github/client';
import { GitHubWorkspace } from '@/components/github/GitHubWorkspace';
import { PageShell } from '@/components/ui/PageShell';
import '@/styles/globals.css';

export const dynamic = 'force-dynamic';

export default async function GitHubPage() {
  await AuthService.verifySession();
  const rate = (await getGitHubRate()) ?? null;

  return (
    <PageShell icon={Code} title="GitHub Signals" subtitle="What a company builds and how active its engineers are, from its public GitHub" badge="Engineering signals">
      <GitHubWorkspace initialRate={rate} />
    </PageShell>
  );
}
