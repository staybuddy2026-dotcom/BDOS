import { BarChart3 } from 'lucide-react';
import { AuthService } from '@/lib/auth';
import { getReport, REPORT_RANGES } from '@/features/reports/service';
import type { ReportRange } from '@/features/reports/service';
import { ReportsWorkspace } from '@/components/reports/ReportsWorkspace';
import { PageShell } from '@/components/ui/PageShell';
import '@/styles/globals.css';

export const dynamic = 'force-dynamic';

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const user = await AuthService.verifySession();
  const { range: requested } = await searchParams;
  const range: ReportRange = REPORT_RANGES.some((r) => r.id === requested) ? (requested as ReportRange) : '90d';
  const report = await getReport(user, range);

  return (
    <PageShell icon={BarChart3} title="Reports" subtitle="Where deals come from, how far they get, and the outreach behind them" badge={report.scope === 'team' ? 'Team' : 'My numbers'}>
      <ReportsWorkspace report={report} />
    </PageShell>
  );
}
