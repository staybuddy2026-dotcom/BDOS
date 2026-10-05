'use client';

import { useEffect, useRef, useState } from 'react';
import type { ActivityBucket } from '@/features/reports/types';
import c from './charts.module.css';

const SERIES = [
  { key: 'emails', label: 'Emails sent', short: 'Emails', color: 'var(--series-1)' },
  { key: 'linkedin', label: 'LinkedIn touches', short: 'LinkedIn', color: 'var(--series-2)' },
  { key: 'conversations', label: 'Calls & meetings', short: 'Calls', color: 'var(--series-3)' },
] as const;

const H = 240;
const MARGIN = { top: 12, bottom: 28, left: 40 };

/** Rounds the axis top up to a clean number (5, 10, 20, 25, 50, 100…) with ~4 ticks. */
function niceMax(max: number) {
  if (max <= 4) return 4;
  const step = Math.pow(10, Math.floor(Math.log10(max / 4)));
  for (const m of [1, 2, 2.5, 5, 10]) if (step * m * 4 >= max) return step * m * 4;
  return max;
}

/**
 * Outreach activity per week or month as three lines (one axis, counts). Hover or arrow keys
 * move a crosshair that lists every series at that point; the table view shows every number.
 */
export function ActivityChart({ buckets, unit }: { buckets: ActivityBucket[]; unit: 'week' | 'month' }) {
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  // Drawn at the container's real width, so text and lines keep their size on every screen.
  const [W, setW] = useState(720);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setW(Math.max(320, Math.round(entry.contentRect.width))));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const max = niceMax(Math.max(1, ...buckets.flatMap((b) => SERIES.map((s) => b[s.key]))));
  const innerH = H - MARGIN.top - MARGIN.bottom;
  const yOf = (v: number) => MARGIN.top + innerH - (v / max) * innerH;

  // Every line is named at its end. Where ends sit close together the labels are spread apart and joined to
  // their line by a short leader, so a label never covers another or drifts away from its line.
  const last = buckets.length - 1;
  const compact = W < 560;
  const LABEL_GAP = 15;
  const ends = SERIES.map((s) => {
    const value = buckets[last]?.[s.key] ?? 0;
    return { ...s, value, y: yOf(value), labelY: yOf(value), text: `${compact ? s.short : s.label} ${value}` };
  }).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) ends[i].labelY = Math.max(ends[i].labelY, ends[i - 1].labelY + LABEL_GAP);
  const overflow = ends.length ? ends[ends.length - 1].labelY - (MARGIN.top + innerH) : 0;
  if (overflow > 0) {
    // Pushed below the plot: shift the stack back up, keeping the spacing.
    ends.forEach((e) => { e.labelY -= overflow; });
    for (let i = ends.length - 2; i >= 0; i--) ends[i].labelY = Math.min(ends[i].labelY, ends[i + 1].labelY - LABEL_GAP);
  }
  const LEADER = 14;
  const M = { ...MARGIN, right: (compact ? 76 : 128) + LEADER };
  const innerW = W - M.left - M.right;
  const x = (i: number) => M.left + (buckets.length <= 1 ? innerW / 2 : (i / (buckets.length - 1)) * innerW);
  const y = yOf;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
  // About one date label per 80px.
  const labelEvery = Math.max(1, Math.ceil(buckets.length / Math.max(2, Math.floor(innerW / 80))));


  const pick = (clientX: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || !buckets.length) return;
    const svgX = ((clientX - rect.left) / rect.width) * W;
    const i = buckets.length <= 1 ? 0 : Math.round(((svgX - M.left) / innerW) * (buckets.length - 1));
    setActive(Math.max(0, Math.min(buckets.length - 1, i)));
  };

  const activeBucket = active !== null ? buckets[active] : null;
  const tooltipLeftPct = active !== null ? (x(active) / W) * 100 : 0;

  if (!buckets.length) return <div className={c.viz} style={{ color: 'var(--ink-muted)', fontSize: 13 }}>No activity in this period.</div>;

  return (
    <div className={c.viz} ref={boxRef}>
      <div className={c.legend} aria-hidden>
        {SERIES.map((s) => (
          <span key={s.key} className={c.legendItem}><span className={c.legendLine} style={{ background: s.color }} /> {s.label}</span>
        ))}
      </div>

      <svg
        ref={svgRef}
        className={c.svg}
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        role="img"
        aria-label={`Outreach activity per ${unit}: emails sent, LinkedIn touches, and calls and meetings. Use the arrow keys to read each ${unit}.`}
        tabIndex={0}
        onPointerMove={(e) => pick(e.clientX)}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive((a) => a ?? last)}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') { e.preventDefault(); setActive((a) => Math.max(0, (a ?? last) - 1)); }
          if (e.key === 'ArrowRight') { e.preventDefault(); setActive((a) => Math.min(last, (a ?? last) + 1)); }
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className={t === 0 ? c.baseline : c.gridLine} x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} />
            <text className={c.tick} x={M.left - 8} y={y(t) + 4} textAnchor="end">{t.toLocaleString('en-US')}</text>
          </g>
        ))}
        {buckets.map((b, i) => ((i % labelEvery === 0 && last - i >= labelEvery) || i === last) && (
          <text key={b.start} className={c.tick} x={x(i)} y={H - 8} textAnchor="middle">{b.label}</text>
        ))}

        {active !== null && <line className={c.crosshair} x1={x(active)} x2={x(active)} y1={M.top} y2={M.top + innerH} />}

        {SERIES.map((s) => (
          <polyline key={s.key} className={c.line} stroke={s.color} points={buckets.map((b, i) => `${x(i)},${y(b[s.key])}`).join(' ')} />
        ))}

        {/* End markers; on hover, markers at the crosshair instead */}
        {SERIES.map((s) => {
          const i = active ?? last;
          return <circle key={s.key} className={c.dot} cx={x(i)} cy={y(buckets[i][s.key])} r={4.5} fill={s.color} />;
        })}

        {ends.map((e) => (
          <g key={e.key}>
            {Math.abs(e.labelY - e.y) > 1 && <path className={c.leader} d={`M${x(last) + 6},${e.y} L${x(last) + LEADER},${e.labelY}`} />}
            <text className={c.endLabel} x={x(last) + LEADER + 4} y={e.labelY + 4}>{e.text}</text>
          </g>
        ))}

        {/* Hit area: the whole plot, so the pointer only needs to be near a date */}
        <rect x={M.left} y={M.top} width={innerW} height={innerH} fill="transparent" />
      </svg>

      {activeBucket && (
        <div className={c.tooltip} style={{ left: `calc(${tooltipLeftPct}% + 12px)`, top: 36, transform: tooltipLeftPct > 60 ? 'translateX(calc(-100% - 24px))' : undefined }} role="status">
          <div className={c.tooltipTitle}>{unit === 'week' ? `Week of ${activeBucket.label}` : activeBucket.label}</div>
          {SERIES.map((s) => (
            <div key={s.key} className={c.tooltipRow}>
              <span className={c.legendLine} style={{ background: s.color }} />
              <span className={c.tooltipValue}>{activeBucket[s.key]}</span>
              <span>{s.label}</span>
            </div>
          ))}
          <div className={c.tooltipRow} style={{ marginTop: 4 }}>
            <span className={c.legendLine} style={{ background: 'transparent' }} />
            <span className={c.tooltipValue}>{activeBucket.replies}</span>
            <span>Replies received</span>
          </div>
        </div>
      )}

      <button type="button" className={c.tableToggle} onClick={() => setShowTable((v) => !v)} aria-expanded={showTable}>
        {showTable ? 'Hide the numbers' : 'Show as a table'}
      </button>
      {showTable && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>
          <thead>
            <tr style={{ color: 'var(--ink-muted)', textAlign: 'right' }}>
              <th style={{ textAlign: 'left', padding: '4px 6px' }}>{unit === 'week' ? 'Week of' : 'Month'}</th>
              {SERIES.map((s) => <th key={s.key} style={{ padding: '4px 6px' }}>{s.label}</th>)}
              <th style={{ padding: '4px 6px' }}>Replies</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((b) => (
              <tr key={b.start} style={{ borderTop: '1px solid var(--grid)', textAlign: 'right', color: 'var(--ink-2)' }}>
                <td style={{ textAlign: 'left', padding: '4px 6px' }}>{b.label}</td>
                {SERIES.map((s) => <td key={s.key} style={{ padding: '4px 6px' }}>{b[s.key]}</td>)}
                <td style={{ padding: '4px 6px' }}>{b.replies}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
