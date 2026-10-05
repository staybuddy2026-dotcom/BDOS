'use client';

import c from './charts.module.css';

/**
 * Horizontal bars for one measure across categories (e.g. lost deals by reason), longest first.
 * Every value is printed at the bar tip, so nothing depends on hovering.
 */
export function BarList({ items, unit }: { items: { label: string; value: number }[]; unit: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className={`${c.viz} ${c.bars}`} role="list">
      {items.map((item) => (
        <div key={item.label} className={c.barRow} role="listitem">
          <span className={c.barLabel} title={item.label}>{item.label}</span>
          <span className={c.barTrack}>
            <span
              className={c.bar}
              style={{ width: `calc(${(item.value / max) * 100}% - 40px)` }}
              tabIndex={0}
              title={`${item.label}: ${item.value} ${unit}`}
              aria-label={`${item.label}: ${item.value} ${unit}`}
            />
            <span className={c.barValue}>{item.value}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
