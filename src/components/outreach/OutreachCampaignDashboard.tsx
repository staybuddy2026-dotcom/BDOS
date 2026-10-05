'use client';

import { useCallback, useEffect, useState } from 'react';
import { getActiveOutreachCampaignsAction, sendFollowUpNowAction, setSequencePausedAction } from '@/features/outreach/actions';
import type { OutreachCampaignRow } from '@/features/outreach/actions';
import { AlertTriangle, BarChart3, Loader2, Mail, PauseCircle, PlayCircle, RefreshCw, RotateCcw, Zap } from 'lucide-react';
import s from '@/components/ui/ui.module.css';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

function StatusBadge({ row }: { row: OutreachCampaignRow }) {
  if (row.failedStage) return <span className={`${s.badge} ${s.badgeRed}`} title={row.failedStage.error || undefined}><AlertTriangle size={11} /> Stage {row.failedStage.stage} failed</span>;
  if (row.stoppedReason) return <span className={`${s.badge} ${s.badgeGray}`} title={row.stoppedReason}>Stopped</span>;
  if (row.paused) return <span className={`${s.badge} ${s.badgeAmber}`}>Paused</span>;
  if (row.stagesTotal > 0 && row.stagesSent >= row.stagesTotal) return <span className={`${s.badge} ${s.badgeGreen}`}>Completed</span>;
  if (row.stagesSent > 0) return <span className={`${s.badge} ${s.badgeIndigo}`}>Running</span>;
  return <span className={`${s.badge} ${s.badgeGray}`}>Scheduled</span>;
}

export function OutreachCampaignDashboard({
  version = 0,
  notify,
}: {
  version?: number;
  notify?: (msg: string, isError?: boolean) => void;
}) {
  const [campaigns, setCampaigns] = useState<OutreachCampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCampaigns(await getActiveOutreachCampaignsAction());
    } catch {
      notify?.('Could not load campaigns.', true);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load, version]);

  const togglePause = async (row: OutreachCampaignRow) => {
    setPendingId(row.id);
    try {
      await setSequencePausedAction(row.id, !row.paused);
      setCampaigns((list) => list.map((c) => (c.id === row.id ? { ...c, paused: !row.paused } : c)));
      notify?.(row.paused ? `Resumed sequence for ${row.companyName}` : `Paused sequence for ${row.companyName}`);
    } catch {
      notify?.('Could not update the sequence. Please try again.', true);
    } finally {
      setPendingId(null);
    }
  };

  const retry = async (row: OutreachCampaignRow) => {
    if (!row.failedStage) return;
    setPendingId(row.id);
    try {
      const res = await sendFollowUpNowAction(row.failedStage.id);
      notify?.(res.error || res.message || 'Sent.', !!res.error);
      await load();
    } catch {
      notify?.('Could not send this stage. Please try again.', true);
    } finally {
      setPendingId(null);
    }
  };

  const isDone = (row: OutreachCampaignRow) => row.stagesTotal > 0 && row.stagesSent >= row.stagesTotal;

  return (
    <section className={s.card} aria-label="Active outreach campaigns">
      <div className={s.cardHeader}>
        <div>
          <h3 className={s.cardTitle}>
            <span className={s.iconTile}><BarChart3 size={16} /></span>
            Active sequences
          </h3>
          <p className={s.cardSubtitle}>
            {loading ? 'Loading…' : `${campaigns.length} approved sequence${campaigns.length === 1 ? '' : 's'} with their stage progress`}
          </p>
        </div>
        <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? s.spin : undefined} /> Refresh
        </button>
      </div>

      {loading && campaigns.length === 0 ? (
        <div className={s.empty}><Loader2 size={22} className={s.spin} /></div>
      ) : campaigns.length === 0 ? (
        <div className={s.empty}>
          <Mail size={26} style={{ opacity: 0.5 }} />
          <div className={s.emptyTitle}>No active sequences yet</div>
          Approve and schedule a sequence above to start tracking it here.
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Prospect</th>
                <th>Company</th>
                <th>Progress</th>
                <th>Next stage</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className={s.cellStrong}>{row.targetContactName}</div>
                    <div className={s.cellSub}>{row.targetContactTitle}</div>
                  </td>
                  <td>
                    <div className={s.cellStrong}>{row.companyName}</div>
                    <div className={s.cellSub}>{row.domain}</div>
                  </td>
                  <td>
                    <div className={s.cellSub} style={{ marginTop: 0 }}>{row.stagesSent} of {row.stagesTotal || 4} sent</div>
                    <div className={s.progress} aria-hidden>
                      {Array.from({ length: row.stagesTotal || 4 }).map((_, i) => (
                        <span key={i} className={`${s.progressDot} ${i < row.stagesSent ? s.progressDotDone : ''}`} />
                      ))}
                    </div>
                  </td>
                  <td>
                    {row.nextStage && row.nextDueDate ? (
                      <>
                        <div className={s.cellStrong}>Stage {row.nextStage}</div>
                        <div className={s.cellSub}>{row.stoppedReason || (row.paused ? 'On hold' : `Due ${formatDate(row.nextDueDate)}`)}</div>
                        {!row.paused && (
                          <div className={s.cellSub}>{row.autoSend && row.channel === 'EMAIL' ? <><Zap size={11} style={{ verticalAlign: -1 }} /> Sent automatically</> : 'You send it (reminder in Today)'}</div>
                        )}
                      </>
                    ) : (
                      <span className={s.cellSub}>—</span>
                    )}
                  </td>
                  <td>
                    <StatusBadge row={row} />
                    {row.failedStage?.error && <div className={s.cellSub} style={{ maxWidth: 260, whiteSpace: 'normal', color: 'var(--o-danger)' }}>{row.failedStage.error}</div>}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {row.failedStage && (
                      <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnPrimary}`} style={{ marginRight: 6 }} onClick={() => retry(row)} disabled={pendingId === row.id} title="Send this stage now from your mailbox">
                        {pendingId === row.id ? <Loader2 size={13} className={s.spin} /> : <RotateCcw size={13} />} Retry
                      </button>
                    )}
                    {!isDone(row) && (
                      <button
                        type="button"
                        className={`${s.btn} ${s.btnSm} ${row.paused ? s.btnSuccess : s.btnSecondary}`}
                        onClick={() => togglePause(row)}
                        disabled={pendingId === row.id}
                      >
                        {pendingId === row.id ? <Loader2 size={13} className={s.spin} /> : row.paused ? <PlayCircle size={13} /> : <PauseCircle size={13} />}
                        {row.paused ? 'Resume' : 'Pause'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
