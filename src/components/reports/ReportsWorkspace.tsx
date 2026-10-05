'use client';

import { useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { REPORT_RANGES } from '@/features/reports/types';
import type { FunnelRow, Report, ReportRange } from '@/features/reports/types';
import { SOURCE_LABELS, formatUsd } from '@/features/crm/types';
import s from '@/components/ui/ui.module.css';
import { StatTile } from '@/components/ui/StatTile';
import c from './charts.module.css';
import { ActivityChart } from './ActivityChart';
import { BarList } from './BarList';

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

/** A count with the share of the source's leads that got this far, and a meter of that share. */
function ReachCell({ value, leads }: { value: number; leads: number }) {
  const share = pct(value, leads);
  return (
    <td style={{ minWidth: 92 }}>
      <span className={s.cellStrong} style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      <span className={s.cellSub} style={{ display: 'inline', marginLeft: 6 }}>{share}%</span>
      <div className={c.meter} aria-hidden><div className={c.meterFill} style={{ width: `${share}%` }} /></div>
    </td>
  );
}

/**
 * Sales reports for the chosen period. The period filter sits above everything and every
 * number on the page follows it; while a new period loads, the current figures stay dimmed.
 */
export function ReportsWorkspace({ report }: { report: Report }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const { kpis } = report;
  const who = report.scope === 'team' ? 'the team' : 'you';

  const setRange = (range: ReportRange) => startTransition(() => router.replace(`${pathname}?range=${range}`, { scroll: false }));

  const funnelTotal: FunnelRow = report.funnel.reduce(
    (t, r) => ({ ...t, leads: t.leads + r.leads, contacted: t.contacted + r.contacted, meeting: t.meeting + r.meeting, proposal: t.proposal + r.proposal, won: t.won + r.won, lost: t.lost + r.lost, wonValue: t.wonValue + r.wonValue }),
    { source: 'MANUAL', leads: 0, contacted: 0, meeting: 0, proposal: 0, won: 0, lost: 0, wonValue: 0 },
  );

  return (
    <div className={s.root}>
      {/* Period filter: scopes everything below */}
      <div className={s.chipRow} role="group" aria-label="Report period" style={{ alignItems: 'center' }}>
        {REPORT_RANGES.map((r) => (
          <button key={r.id} type="button" className={`${s.chip} ${report.range === r.id ? s.chipActive : ''}`} aria-pressed={report.range === r.id} disabled={pending} onClick={() => setRange(r.id)}>
            {r.label}
          </button>
        ))}
        {pending && <Loader2 size={16} className={s.spin} style={{ color: 'var(--o-muted)' }} />}
        <span className={s.cellSub} style={{ marginLeft: 'auto' }}>{report.scope === 'team' ? 'Whole team' : 'Your own deals and activity'}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, opacity: pending ? 0.55 : 1, transition: 'opacity 0.15s ease' }}>
        <div className={s.kpiGrid}>
          <StatTile label="New leads" value={kpis.leads.toLocaleString('en-US')} foot={`Added to the CRM by ${who}`} />
          <StatTile label="Won" value={formatUsd(kpis.wonValue)} foot={`${kpis.wonDeals} deal${kpis.wonDeals === 1 ? '' : 's'} closed won`} />
          <StatTile label="Win rate" value={kpis.winRate === null ? '—' : `${kpis.winRate}%`} foot={kpis.winRate === null ? 'No deals closed in this period' : 'Won out of all deals closed'} />
          <StatTile label="Days to win" value={kpis.avgDaysToWin === null ? '—' : kpis.avgDaysToWin} foot="Average, from lead to won" />
          <StatTile label="Reply rate" value={kpis.replyRate === null ? '—' : `${kpis.replyRate}%`} foot={`${kpis.sequencesStarted} sequence${kpis.sequencesStarted === 1 ? '' : 's'} started · ${kpis.emailsSent} emails sent`} />
        </div>

        {/* Funnel by source */}
        <section className={s.card} aria-label="Funnel by lead source">
          <div>
            <h3 className={s.cardTitle}>Which sources turn into deals</h3>
            <p className={s.cardSubtitle}>Leads added in this period, by where they came from. Each column counts the leads that were moved to that stage; Won and Lost are where they ended. The percentage is the share of that source&apos;s leads.</p>
          </div>
          {report.funnel.length === 0 ? (
            <div className={s.empty}>No leads were added in this period.</div>
          ) : (
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr><th>Source</th><th>Leads</th><th>Contacted</th><th>Meeting</th><th>Proposal</th><th>Won</th><th>Lost</th><th>Won value</th></tr>
                </thead>
                <tbody>
                  {[...report.funnel, ...(report.funnel.length > 1 ? [{ ...funnelTotal, source: null }] : [])].map((row) => (
                    <tr key={row.source ?? 'total'} style={row.source ? undefined : { background: 'var(--o-surface)' }}>
                      <td className={s.cellStrong}>{row.source ? SOURCE_LABELS[row.source] : 'All sources'}</td>
                      <td className={s.cellStrong} style={{ fontVariantNumeric: 'tabular-nums' }}>{row.leads}</td>
                      <ReachCell value={row.contacted} leads={row.leads} />
                      <ReachCell value={row.meeting} leads={row.leads} />
                      <ReachCell value={row.proposal} leads={row.leads} />
                      <ReachCell value={row.won} leads={row.leads} />
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{row.lost}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{row.wonValue ? formatUsd(row.wonValue) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Activity over time */}
        <section className={s.card} aria-label="Outreach activity over time">
          <div>
            <h3 className={s.cardTitle}>Outreach activity per {report.activity.unit}</h3>
            <p className={s.cardSubtitle}>Emails sent (by hand and automatically), LinkedIn touches logged, and calls and meetings, by {who}.</p>
          </div>
          <ActivityChart buckets={report.activity.buckets} unit={report.activity.unit} />
        </section>

          {/* Team */}
          <section className={s.card} aria-label={report.scope === 'team' ? 'Team performance' : 'Your performance'}>
            <div>
              <h3 className={s.cardTitle}>{report.scope === 'team' ? 'Team' : 'Your numbers'}</h3>
              <p className={s.cardSubtitle}>Open pipeline today; won, lost and activity in this period.</p>
            </div>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr><th>Person</th><th>Open</th><th>Won</th><th>Win rate</th><th>Emails</th><th>LinkedIn</th><th>Calls & meetings</th></tr>
                </thead>
                <tbody>
                  {report.team.map((t) => {
                    const closed = t.wonDeals + t.lostDeals;
                    return (
                      <tr key={t.userId}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div className={s.cellStrong}>{t.name}</div>
                          <div className={s.cellSub}>{formatUsd(t.pipelineValue)} open pipeline</div>
                        </td>
                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>{t.openDeals}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                          <div className={s.cellStrong}>{t.wonDeals}</div>
                          {t.wonValue > 0 && <div className={s.cellSub}>{formatUsd(t.wonValue)}</div>}
                        </td>
                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>{closed ? `${pct(t.wonDeals, closed)}%` : '—'}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>{t.emails}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>{t.linkedin}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>{t.conversations}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Lost reasons */}
          <section className={s.card} aria-label="Why deals were lost">
            <div>
              <h3 className={s.cardTitle}>Why deals were lost</h3>
              <p className={s.cardSubtitle}>Reasons given when deals were marked lost in this period.</p>
            </div>
            {report.lostReasons.length === 0
              ? <div className={s.empty}>No deals were lost in this period.</div>
              : <div style={{ maxWidth: 720 }}><BarList items={report.lostReasons.map((r) => ({ label: r.reason, value: r.count }))} unit="deals" /></div>}
          </section>
      </div>
    </div>
  );
}
