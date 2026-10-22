import { Suspense } from 'react';
import { Compass } from 'lucide-react';
import { AuthService } from '@/lib/auth';
import { getSalesNavEnrichmentAvailableAction } from '@/features/linkedin/salesnavActions';
import { SalesNavigatorBridge } from '@/components/linkedin/SalesNavigatorBridge';
import { PageShell } from '@/components/ui/PageShell';
import '@/styles/globals.css';

export const dynamic = 'force-dynamic';

export default async function SalesNavigatorPage() {
  await AuthService.verifySession();
  const enrichAvailable = await getSalesNavEnrichmentAvailableAction().catch(() => false);

  return (
    <PageShell icon={Compass} title="Sales Navigator" subtitle="Send leads from LinkedIn Sales Navigator to your CRM, and jump back to them from any contact" badge="LinkedIn">
      <Suspense fallback={null}>
        <SalesNavigatorBridge enrichAvailable={enrichAvailable} />
      </Suspense>
    </PageShell>
  );
}
